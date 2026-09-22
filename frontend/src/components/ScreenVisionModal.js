import React, { useState, useRef } from 'react';
import './ScreenVisionModal.css';
import { playChimeSFX } from '../utils/soundFX';

const ScreenVisionModal = ({ isOpen, onClose, onSpeechResponse }) => {
  const [snapshot, setSnapshot] = useState(null);
  const [promptText, setPromptText] = useState('Look at the code or error message visible on screen, pinpoint the root cause, and provide the exact corrected code fix.');
  const [activeMode, setActiveMode] = useState('debug'); // 'debug' | 'summarize' | 'general'
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [detectedSnippet, setDetectedSnippet] = useState('');
  const [detectedLinesCount, setDetectedLinesCount] = useState(0);
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const canvasRef = useRef(null);

  if (!isOpen) return null;

  const handleCaptureScreen = async () => {
    playChimeSFX();
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 3840, max: 3840 },
          height: { ideal: 2160, max: 2160 },
          cursor: 'always'
        },
        audio: false
      });

      const track = stream.getVideoTracks()[0];

      // Use ImageCapture API if available in Chromium/Chrome/Edge for instant high-res snapshot
      if (window.ImageCapture) {
        try {
          const imageCapture = new window.ImageCapture(track);
          const bitmap = await imageCapture.grabFrame();
          const canvas = canvasRef.current || document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          setSnapshot(dataUrl);
          track.stop();
          return dataUrl;
        } catch (captureErr) {
          console.warn('ImageCapture fallback to video element:', captureErr);
        }
      }

      // Video element fallback for all browsers
      return await new Promise((resolve) => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        const processFrame = () => {
          setTimeout(() => {
            const canvas = canvasRef.current || document.createElement('canvas');
            canvas.width = video.videoWidth || 1920;
            canvas.height = video.videoHeight || 1080;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png');
            setSnapshot(dataUrl);
            stream.getTracks().forEach((t) => t.stop());
            resolve(dataUrl);
          }, 250);
        };

        video.onloadedmetadata = () => {
          video.play().then(processFrame).catch(processFrame);
        };

        if (video.readyState >= 1) {
          video.play().then(processFrame).catch(processFrame);
        }
      });
    } catch (err) {
      console.warn('Screen capture cancelled or blocked:', err.message);
      return null;
    }
  };

  const handleAnalyze = async (customPrompt, modeOverride) => {
    const q = customPrompt || promptText;
    const mode = modeOverride || activeMode;

    let currentImage = snapshot;
    if (!currentImage) {
      currentImage = await handleCaptureScreen();
      if (!currentImage) return;
    }

    setAnalyzing(true);
    playChimeSFX();
    setAnalysisResult('OPTICAL SCAN IN PROGRESS... SCANNING HIGH-RES PIXEL ARRAYS...');

    try {
      const res = await fetch('http://localhost:5000/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: currentImage,
          prompt: q,
          mode: mode
        })
      });

      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.analysis);
        setDetectedSnippet(data.detectedText || '');
        setDetectedLinesCount(data.detectedLinesCount || 0);

        if (onSpeechResponse) {
          // Provide an executive vocal summary to avoid reading whole code blocks aloud
          const vocalText = data.analysis.length > 250 
            ? `${data.analysis.slice(0, 200)}... Optical scan readout complete on HUD, sir.` 
            : data.analysis;
          onSpeechResponse(vocalText);
        }
      } else {
        setAnalysisResult('Visual scan could not be finalized: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      setAnalysisResult('Optical telemetry failed to reach backend server. Please verify backend is active on port 5000.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopyText = (text, index = 'all') => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleToggleSpeak = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else if (analysisResult) {
        // Strip markdown backticks for speech
        const cleanForSpeech = analysisResult.replace(/```[\s\S]*?```/g, 'Code block detailed on screen.').replace(/[#*_`]/g, '');
        const utter = new SpeechSynthesisUtterance(cleanForSpeech);
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utter);
      }
    }
  };

  // Custom Markdown & Code Block Parser
  const renderFormattedAnalysis = (content) => {
    if (!content) return null;

    // Split by code blocks
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const elements = [];
    let lastIndex = 0;
    let match;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore) {
        elements.push(
          <div key={`text-${lastIndex}`} className="vision-md-section">
            {renderMarkdownText(textBefore)}
          </div>
        );
      }

      const lang = match[1] || 'code';
      const codeSnippet = match[2].trim();
      const currentBlockIdx = blockIndex++;

      elements.push(
        <div key={`code-${match.index}`} className="vision-code-card">
          <div className="vision-code-header">
            <div className="vision-code-lang">
              <span className="vision-code-dot" />
              <span>{lang.toUpperCase()}</span>
            </div>
            <button
              type="button"
              className="vision-code-copy-btn"
              onClick={() => handleCopyText(codeSnippet, `block-${currentBlockIdx}`)}
            >
              {copiedIndex === `block-${currentBlockIdx}` ? '✓ COPIED!' : '📋 COPY FIX'}
            </button>
          </div>
          <pre className="vision-code-content">
            <code>{codeSnippet}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    const remainingText = content.slice(lastIndex);
    if (remainingText) {
      elements.push(
        <div key={`text-${lastIndex}`} className="vision-md-section">
          {renderMarkdownText(remainingText)}
        </div>
      );
    }

    return elements;
  };

  const renderMarkdownText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} style={{ height: '8px' }} />;

      // H3 or H2 Headers
      if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        const cleanHeader = trimmed.replace(/^#+\s*/, '');
        return (
          <h4 key={idx} className="vision-md-header">
            <span className="vision-header-accent">❯</span> {cleanHeader}
          </h4>
        );
      }

      // Bullet Points
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const bulletText = trimmed.replace(/^[*•-]\s*/, '');
        return (
          <div key={idx} className="vision-md-bullet">
            <span className="vision-bullet-dot">◆</span>
            <span className="vision-bullet-text">{formatInlineMarkdown(bulletText)}</span>
          </div>
        );
      }

      // Numbered items
      if (/^\d+\.\s/.test(trimmed)) {
        const numText = trimmed.replace(/^\d+\.\s*/, '');
        const numMatch = trimmed.match(/^(\d+)\./)[1];
        return (
          <div key={idx} className="vision-md-bullet">
            <span className="vision-bullet-num">[{numMatch}]</span>
            <span className="vision-bullet-text">{formatInlineMarkdown(numText)}</span>
          </div>
        );
      }

      return (
        <p key={idx} className="vision-md-paragraph">
          {formatInlineMarkdown(line)}
        </p>
      );
    });
  };

  const formatInlineMarkdown = (str) => {
    // Process bold (**text**) and inline code (`code`)
    const parts = [];
    let remaining = str;

    while (remaining) {
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      const codeMatch = remaining.match(/`([^`]+)`/);

      // Find which comes first
      const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : -1;
      const codeIdx = codeMatch ? remaining.indexOf(codeMatch[0]) : -1;

      if (boldIdx === -1 && codeIdx === -1) {
        parts.push(remaining);
        break;
      }

      if (boldIdx !== -1 && (codeIdx === -1 || boldIdx < codeIdx)) {
        if (boldIdx > 0) parts.push(remaining.slice(0, boldIdx));
        parts.push(<strong key={parts.length} className="vision-bold-highlight">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldIdx + boldMatch[0].length);
      } else {
        if (codeIdx > 0) parts.push(remaining.slice(0, codeIdx));
        parts.push(<code key={parts.length} className="vision-inline-code">{codeMatch[1]}</code>);
        remaining = remaining.slice(codeIdx + codeMatch[0].length);
      }
    }

    return parts;
  };

  return (
    <div className="vision-modal-overlay" onClick={onClose}>
      <div className="vision-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="vision-modal-header">
          <div className="vision-title-group">
            <div className="vision-pulse-orb" />
            <h2>
              <span>OPTICAL SCANNER // VISION HUD</span>
              <span className="vision-tag">OCR v2.5</span>
            </h2>
          </div>
          <button type="button" className="vision-modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Visual Scanner Stage */}
        <div className={`vision-scanner-stage ${snapshot ? 'has-image' : ''}`}>
          {snapshot ? (
            <>
              <img src={snapshot} alt="Captured Screen Frame" className="vision-snapshot-preview" />
              {analyzing && <div className="vision-scan-line" />}
              <div className="vision-reticle top-left" />
              <div className="vision-reticle top-right" />
              <div className="vision-reticle bottom-left" />
              <div className="vision-reticle bottom-right" />
            </>
          ) : (
            <div className="vision-empty-state">
              <div className="vision-empty-icon-wrap">
                <span style={{ fontSize: '32px' }}>🖥️</span>
                <div className="vision-empty-glow" />
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                Capture your entire screen or specific application window to analyze with J.A.R.V.I.S.
              </p>
              <button
                type="button"
                className="vision-capture-btn-large"
                onClick={handleCaptureScreen}
              >
                <span>📸</span> CAPTURE SCREEN FRAME
              </button>
            </div>
          )}
        </div>

        {/* Specialized Optical HUD Presets */}
        <div className="vision-presets-row">
          {[
            {
              id: 'debug',
              icon: '🐛',
              label: 'Debug Code / Error',
              prompt: 'Look at the code or error message visible on screen, pinpoint the root cause, and provide the exact corrected code fix.'
            },
            {
              id: 'summarize',
              icon: '📄',
              label: 'Summarize Window',
              prompt: 'Summarize the active application, window, document, or webpage shown on screen with a clear executive summary and key takeaways.'
            },
            {
              id: 'general',
              icon: '🔍',
              label: 'Inspect Screen',
              prompt: 'Identify active applications, visible windows, and key items currently displayed on my screen.'
            },
            {
              id: 'recapture',
              icon: '🔄',
              label: 'New Capture',
              action: 'recapture'
            }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`vision-preset-chip ${activeMode === item.id ? 'active-chip' : ''}`}
              onClick={() => {
                if (item.action === 'recapture') {
                  handleCaptureScreen();
                } else {
                  setActiveMode(item.id);
                  setPromptText(item.prompt);
                  handleAnalyze(item.prompt, item.id);
                }
              }}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </div>

        {/* Input Directive Form */}
        <div className="vision-input-row">
          <input
            type="text"
            className="vision-text-input"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Instruct J.A.R.V.I.S. regarding this screen capture..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAnalyze();
            }}
          />
          <button
            type="button"
            className="vision-submit-btn"
            onClick={() => handleAnalyze()}
            disabled={analyzing}
          >
            {analyzing ? 'SCANNING...' : (!snapshot ? '📸 SCAN SCREEN' : '⚡ EXECUTE')}
          </button>
        </div>

        {/* AI Analysis Terminal Result */}
        {analysisResult && (
          <div className="vision-response-box">
            <div className="vision-response-header">
              <div className="vision-header-title">
                <span className="vision-status-indicator" />
                <span>J.A.R.V.I.S. OPTICAL INTELLIGENCE DIAGNOSIS</span>
              </div>
              <div className="vision-header-actions">
                {detectedSnippet && (
                  <button
                    type="button"
                    className="vision-telemetry-toggle-btn"
                    onClick={() => setShowRawOcr(!showRawOcr)}
                  >
                    {showRawOcr ? 'HIDE OCR STREAM' : `OCR DATA (${detectedLinesCount} LINES)`}
                  </button>
                )}
                <button
                  type="button"
                  className="vision-telemetry-toggle-btn"
                  onClick={handleToggleSpeak}
                  title="Speak or Mute Analysis"
                >
                  {isSpeaking ? '🔇 MUTE' : '🔊 READ'}
                </button>
                <button
                  type="button"
                  className="vision-telemetry-toggle-btn"
                  onClick={() => handleCopyText(analysisResult, 'full')}
                >
                  {copiedIndex === 'full' ? '✓ COPIED!' : '📋 COPY ALL'}
                </button>
              </div>
            </div>

            {/* Collapsible Raw OCR Telemetry Viewer */}
            {showRawOcr && detectedSnippet && (
              <div className="vision-raw-ocr-drawer">
                <div className="vision-raw-ocr-bar">
                  <span>RAW EXTRACTED PIXEL TEXT TELEMETRY</span>
                  <button
                    type="button"
                    className="vision-code-copy-btn"
                    onClick={() => handleCopyText(detectedSnippet, 'ocr')}
                  >
                    {copiedIndex === 'ocr' ? '✓ COPIED!' : 'COPY OCR'}
                  </button>
                </div>
                <pre className="vision-raw-ocr-content">{detectedSnippet}</pre>
              </div>
            )}

            {/* Rendered Formatted Analysis */}
            <div className="vision-formatted-output">
              {renderFormattedAnalysis(analysisResult)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenVisionModal;
