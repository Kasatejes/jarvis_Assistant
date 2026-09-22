import React, { useState, useEffect, useRef } from 'react';
import { HUDCard, SVGSprites } from './HUDCard';
import HoloPedestal from './HoloPedestal';
import './HUDInput.css';

const HUDInput = ({ onSubmit, model = 'qwen/qwen3.8-27b', voiceName = 'default', onSSEEvent, onOpenVision }) => {
  const [value, setValue] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [terminalStatus, setTerminalStatus] = useState('listening'); // 'listening' | 'thinking' | 'responding'
  const [isListening, setIsListening] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [popupWarning, setPopupWarning] = useState(false);
  const [blockedUrl, setBlockedUrl] = useState(null);

  // Detect incomplete phrases that should NEVER be submitted prematurely
  const isIncompleteDirective = (text) => {
    const t = (text || '').trim().toLowerCase();
    if (!t) return true;
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length === 0) return true;

    // Standalone directives that are complete on their own
    if (/^(stop|cancel|halt|quiet|exit|quit|mute|unmute|pause|resume|help|status)$/i.test(t)) {
      return false;
    }

    // Single-word action verbs that require an object/target to make sense
    const transitiveVerbs = /^(open|close|launch|start|run|search|play|find|switch|set|turn|increase|decrease|raise|lower|tell|show|reopen|look|count|list|volume|calculate|compute|solve|convert|evaluate)$/i;
    if (words.length === 1 && transitiveVerbs.test(words[0])) {
      return true; // e.g. user just said "open", "close", "play"
    }

    // Action verb + article / preposition / pronoun (e.g. "open the", "open my", "search for", "play a", "tell me")
    if (words.length === 2 && transitiveVerbs.test(words[0]) && /^(the|a|an|to|for|my|in|on|at|up|down|me|about|all|some|this)$/i.test(words[1])) {
      return true;
    }

    // Incomplete question prefixes (e.g. "what is", "where is", "how do I", "who is the")
    if (/^(what|when|where|who|how|why|is|are|can|could|would|will)\s*(is|are|the|a|an|to|my|you|we|do|i)?$/i.test(t)) {
      return true;
    }

    // Trailing preposition or conjunction at the end of the text
    if (/\b(and|or|with|to|for|in|on|at|of|the|a|an|my)$/i.test(t)) {
      return true;
    }

    return false;
  };

  // Continuous open-microphone engine — no wake word needed, speak directives directly!
  const isActionableCommand = (text) => {
    let t = (text || '').trim().toLowerCase();
    // Strip optional leading wake-word before assessing actionable intent
    t = t.replace(/^(?:hey\s+jarvis|ok\s+jarvis|okay\s+jarvis|jarvis|hey\s+travis|travis)[,.\s]*/i, '').trim();
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length === 0) return false;

    // Standalone commands that make sense as a single word
    if (/^(stop|cancel|halt|quiet|exit|quit|mute|unmute|pause|resume|help|status|news|headlines)$/i.test(t)) {
      return true;
    }

    // Direct news, headlines, and world updates intent
    if (/\b(news|headlines?|what happened today|what(?:'s|\s+is)\s+happening|world updates?|breaking news|daily briefing)\b/i.test(t)) {
      return true;
    }

    // If it's missing its object/target, it's NOT a ready actionable command
    if (isIncompleteDirective(t)) {
      return false;
    }

    // Direct mathematical expressions (e.g. "one plus one", "5 * 10", "15% of 850", "sqrt 144")
    if (words.length >= 2 && /\b(plus|minus|times|multiplied|divided|divide|modulo|percent|squared|cubed|sum|difference|product|root|sqrt|power)\b/i.test(t)) {
      return true;
    }

    // Action verbs requiring an object (with at least 2 words, e.g. "give me the news", "open spotify")
    const targetCommands = /^(open|close|launch|start|run|search|play|find|reopen|switch|volume|increase|decrease|raise|lower|reduce|turn|set|calculate|compute|solve|convert|evaluate|give|tell|show|bring|get|fetch)\b/i;
    if (targetCommands.test(t) && words.length >= 2) {
      return true;
    }

    // Question patterns requiring at least 2 words (e.g. "any news updates", "what time is it", "what happened today")
    if (/^(what|when|where|who|how|why|is|are|tell|show|any)\b/i.test(t) && words.length >= 2) {
      return true;
    }

    return false;
  };

  const recognitionRef = useRef(null);
  const submitTimerRef = useRef(null);
  const lastIncompleteTextRef = useRef('');
  const isRespondingRef = useRef(false);
  const lastSpokenIndexRef = useRef(0);
  const openedUrlsRef = useRef(new Set());
  const openedTabsRef = useRef(new Map());

  // Active speech synthesis utterances ref to prevent V8 garbage collection dropping onend callbacks
  const activeUtterancesRef = useRef([]);
  // Watchdogs to ensure terminal NEVER permanently gets stuck in busy/responding mode
  const ttsWatchdogRef = useRef(null);
  const globalWatchdogRef = useRef(null);
  const recognitionRestartTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const speechEndTimeRef = useRef(0);
  const isStreamFinishedRef = useRef(false);
  const clientLocationRef = useRef(null);


  // Obtain local GPS/Wi-Fi coordinates on load for accurate weather queries
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clientLocationRef.current = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          };
          console.log('[HUDInput] Captured user geolocation:', clientLocationRef.current);
        },
        (err) => {
          console.log('[HUDInput] Geolocation prompt skipped/denied, falling back to IP detection');
        },
        { timeout: 6000 }
      );
    }
  }, []);

  // Ref to always track latest voiceName prop without stale closure issues
  const voiceNameRef = useRef(voiceName);
  useEffect(() => {
    voiceNameRef.current = voiceName;
  }, [voiceName]);

  // Ref to track latest handleVoiceSubmit for SpeechRecognition callbacks
  const handleVoiceSubmitRef = useRef();

  // Helper to select the most realistic natural/neural English male voice available in the browser
  const getUltraRealisticVoice = (voiceList) => {
    if (!voiceList || voiceList.length === 0) return null;
    
    const enVoices = voiceList.filter(v => v.lang.startsWith('en'));
    if (enVoices.length === 0) return voiceList[0];

    // Priority 1: High quality online neural/natural English MALE voices
    const neuralMale = enVoices.find(v => 
      (v.name.toLowerCase().includes('online') || v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural')) && 
      (v.name.toLowerCase().includes('guy') || v.name.toLowerCase().includes('ryan') || v.name.toLowerCase().includes('andrew') || v.name.toLowerCase().includes('brian') || v.name.toLowerCase().includes('male'))
    );
    if (neuralMale) return neuralMale;

    // Priority 2: Standard high quality neural/natural English voices (e.g. Aria)
    const neuralAny = enVoices.find(v => 
      v.name.toLowerCase().includes('natural') || 
      v.name.toLowerCase().includes('online') || 
      v.name.toLowerCase().includes('neural')
    );
    if (neuralAny) return neuralAny;

    // Priority 3: Offline local standard English MALE voices (e.g. David)
    const standardMale = enVoices.find(v => 
      v.name.toLowerCase().includes('david') || 
      v.name.toLowerCase().includes('ryan') || 
      v.name.toLowerCase().includes('brian') ||
      v.name.toLowerCase().includes('male')
    );
    if (standardMale) return standardMale;

    // Priority 4: Standard Google US English or default English voice
    return enVoices.find(v => v.lang === 'en-US') || enVoices[0];
  };

  // Safe Debounced Recognition Starter
  const safeStartRecognition = () => {
    if (
      isRespondingRef.current ||
      ('speechSynthesis' in window && window.speechSynthesis.speaking) ||
      !recognitionRef.current
    ) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      if (recognitionRestartTimeoutRef.current) {
        clearTimeout(recognitionRestartTimeoutRef.current);
      }
      recognitionRestartTimeoutRef.current = setTimeout(() => {
        try {
          if (
            !isRespondingRef.current &&
            !('speechSynthesis' in window && window.speechSynthesis.speaking) &&
            recognitionRef.current
          ) {
            recognitionRef.current.start();
            setIsListening(true);
          }
        } catch (e) {
          // already active or starting
        }
      }, 250);
    }
  };

  // Called when an individual speech synthesis utterance completes
  const handleUtteranceDone = (utterance) => {
    activeUtterancesRef.current = activeUtterancesRef.current.filter(u => u !== utterance);
    window.dispatchEvent(new CustomEvent('jarvis_assistant_speaking', { detail: { isSpeaking: false } }));

    // If stream is finished and no more utterances are playing, finish responding
    if (isStreamFinishedRef.current && activeUtterancesRef.current.length === 0) {
      finishResponding();
    }
  };

  // Gracefully complete responding, allowing user to keep and read the response
  const finishResponding = () => {
    if (ttsWatchdogRef.current) {
      clearTimeout(ttsWatchdogRef.current);
      ttsWatchdogRef.current = null;
    }
    if (globalWatchdogRef.current) {
      clearTimeout(globalWatchdogRef.current);
      globalWatchdogRef.current = null;
    }

    speechEndTimeRef.current = Date.now();
    window.dispatchEvent(new CustomEvent('jarvis_assistant_speaking', { detail: { isSpeaking: false } }));
    window.dispatchEvent(new CustomEvent('jarvis_querying_end'));

    // Ultra-low 120ms cooldown buffer allows immediate user follow-up without dropping speech
    setTimeout(() => {
      speechEndTimeRef.current = Date.now();
      isRespondingRef.current = false;
      setTerminalStatus('listening');
      setIsVoiceActive(false);
      setIsListening(true);
      safeStartRecognition();
    }, 120);
  };

  // Text-To-Speech Synthesis helper
  const speakSentence = (text) => {
    if (!text || !text.trim()) {
      return;
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      activeUtterancesRef.current.push(utterance);

      const voices = window.speechSynthesis.getVoices();
      let preferredVoice = null;
      
      const currentVoice = voiceNameRef.current || voiceName || localStorage.getItem('jarvis_selected_voice') || 'default';
      
      if (currentVoice && currentVoice !== 'default') {
        preferredVoice = voices.find(v => v.name === currentVoice || v.voiceURI === currentVoice);
      }
      
      if (!preferredVoice) {
        preferredVoice = getUltraRealisticVoice(voices);
      }
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
        
        if (currentVoice && currentVoice !== 'default') {
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
        } else {
          const isNeural = preferredVoice.name.toLowerCase().includes('natural') || 
                           preferredVoice.name.toLowerCase().includes('online') || 
                           preferredVoice.name.toLowerCase().includes('neural');
          
          utterance.rate = isNeural ? 1.0 : 1.1; 
          utterance.pitch = isNeural ? 1.0 : 0.95;
        }
      } else {
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
      }

      utterance.onstart = () => {
        window.dispatchEvent(new CustomEvent('jarvis_assistant_speaking', { detail: { isSpeaking: true } }));
      };

      utterance.onend = () => {
        handleUtteranceDone(utterance);
      };

      utterance.onerror = () => {
        handleUtteranceDone(utterance);
      };

      // Watchdog: If audio gets stuck or onend fails to fire, force completion after generous timeout
      const maxSpeechTime = Math.max(5000, (text.length / 7) * 1000 + 4000);
      if (ttsWatchdogRef.current) clearTimeout(ttsWatchdogRef.current);
      ttsWatchdogRef.current = setTimeout(() => {
        console.warn('[JARVIS TTS WATCHDOG] Audio playback timed out. Releasing mic.');
        activeUtterancesRef.current = [];
        finishResponding();
      }, maxSpeechTime);

      window.speechSynthesis.speak(utterance);
    } else {
      // If speech synthesis not supported, finish immediately
      if (isStreamFinishedRef.current) {
        finishResponding();
      }
    }
  };

  // Full terminal reset (for Abort/Cancel directives only)
  const resetTerminal = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (ttsWatchdogRef.current) {
      clearTimeout(ttsWatchdogRef.current);
      ttsWatchdogRef.current = null;
    }
    if (globalWatchdogRef.current) {
      clearTimeout(globalWatchdogRef.current);
      globalWatchdogRef.current = null;
    }
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
      submitTimerRef.current = null;
    }
    activeUtterancesRef.current = [];
    isStreamFinishedRef.current = true;
    speechEndTimeRef.current = Date.now();

    window.dispatchEvent(new CustomEvent('jarvis_user_speaking', { detail: { isSpeaking: false } }));
    window.dispatchEvent(new CustomEvent('jarvis_assistant_speaking', { detail: { isSpeaking: false } }));
    window.dispatchEvent(new CustomEvent('jarvis_querying_end'));
    setValue('');
    setLlmResponse('');
    setTerminalStatus('listening');
    setIsVoiceActive(false);
    isRespondingRef.current = false;
    setIsListening(true);
    lastSpokenIndexRef.current = 0;
    
    safeStartRecognition();
  };

  const queryGroqLLM = async (prompt) => {
    window.dispatchEvent(new CustomEvent('jarvis_querying_start'));
    setTerminalStatus('thinking');
    setLlmResponse('');
    lastSpokenIndexRef.current = 0;
    isStreamFinishedRef.current = false;
    openedUrlsRef.current.clear();
    setPopupWarning(false);
    setBlockedUrl(null);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    activeUtterancesRef.current = [];

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Global failsafe watchdog: If LLM query or response hangs indefinitely, reset terminal after 25s
    if (globalWatchdogRef.current) clearTimeout(globalWatchdogRef.current);
    globalWatchdogRef.current = setTimeout(() => {
      console.warn('[JARVIS GLOBAL WATCHDOG] Request exceeded 25s timeout. Resetting to listening.');
      resetTerminal();
    }, 25000);

    // Instant client-side widget opener
    const widgetMatch = (prompt || '').toLowerCase().trim().match(/^(?:hey\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+)?(?:open|show|expand|launch)\s+(?:the\s+)?(widgets?|windgets?|weather(?:\s+widget)?|chrono(?:\s+widget)?|system\s+metrics|dashboard|math(?:\s+agent|\s+widget)?|calculator|calc)/i);
    if (widgetMatch) {
      const matchType = widgetMatch[1];
      if (matchType.includes('weather')) {
        window.dispatchEvent(new CustomEvent('jarvis_open_widget', { detail: { widget: 'weather' } }));
      } else if (matchType.includes('chrono') || matchType.includes('metric')) {
        window.dispatchEvent(new CustomEvent('jarvis_open_widget', { detail: { widget: 'chrono' } }));
      } else if (matchType.includes('math') || matchType.includes('calc')) {
        window.dispatchEvent(new CustomEvent('jarvis_open_widget', { detail: { widget: 'math' } }));
      } else {
        window.dispatchEvent(new CustomEvent('jarvis_open_widget', { detail: { widget: 'all' } }));
      }
    }

    const isClassifier = model.includes('prompt-guard');

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          model: model,
          location: clientLocationRef.current,
          clientTime: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) + ', ' + new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const message = errJson.error?.message || response.statusText;
        throw new Error(message);
      }

      setTerminalStatus('responding');

      if (isClassifier) {
        const result = await response.json();
        const content = result.choices[0]?.message?.content || 'NO CLASSIFICATION RESULT';
        
        let displayContent = content;
        let speakContent = content;

        const score = parseFloat(content.trim());
        if (!isNaN(score)) {
          const pct = (score * 100).toFixed(4);
          const isThreat = score > 0.5;
          if (isThreat) {
            displayContent = `THREAT DETECTED [RISK: ${pct}%]`;
            speakContent = `Warning: Malicious injection attempt detected. Threat risk is ${parseFloat(pct)} percent.`;
          } else {
            displayContent = `SAFE [INJECTION RISK: ${pct}%]`;
            speakContent = `Input check passed. Injection risk is ${parseFloat(pct)} percent.`;
          }
        }

        setLlmResponse(displayContent);
        isStreamFinishedRef.current = true;
        speakSentence(speakContent);
      } else {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let accumulatedResponse = '';

        while (!done) {
          const { value: chunkValue, done: readerDone } = await reader.read();
          done = readerDone;

          if (chunkValue) {
            const chunkStr = decoder.decode(chunkValue, { stream: true });
            const lines = chunkStr.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') break;

                try {
                  const parsed = JSON.parse(dataStr);

                  if (parsed.error) {
                    const errMsg = parsed.error.message || 'System encountered an error.';
                    console.error('[JARVIS] SSE Error payload:', errMsg);
                    let userFriendlyMsg = 'Core AI service busy or rate limited.';
                    if (errMsg.includes('Rate limit') || errMsg.includes('429')) {
                      userFriendlyMsg = 'Model rate limit reached. Switching to backup model...';
                    } else if (errMsg.length < 90) {
                      userFriendlyMsg = errMsg;
                    }
                    accumulatedResponse = userFriendlyMsg;
                    setLlmResponse(accumulatedResponse);
                    speakSentence(userFriendlyMsg);
                    continue;
                  }

                  if (parsed.action) {
                    if (onSSEEvent) onSSEEvent(parsed);
                    if (parsed.action === 'math_calculation') {
                      window.dispatchEvent(new CustomEvent('jarvis_math_calculated', { detail: parsed }));
                    }
                    if (parsed.action === 'open_3d_viewport') {
                      window.dispatchEvent(new CustomEvent('jarvis_open_3d_viewport', { detail: parsed }));
                    }
                    if (parsed.action === 'open_optical_scanner') {
                      if (onOpenVision) onOpenVision();
                    }
                  }

                  if (parsed.action === 'open_website' && parsed.url) {
                    const serviceKey = (parsed.service || parsed.url).toLowerCase().replace(/[^a-z0-9]/g, '');
                    const windowTarget = `jarvis_${serviceKey}`;
                    let tabOpened = false;

                    // --- Deduplication: if we already have an open window ref for this service, reuse it ---
                    const existingWin = openedTabsRef.current.get(serviceKey);
                    if (existingWin && !existingWin.closed) {
                      try {
                        existingWin.focus();
                        // Navigate to the new URL if it differs (e.g. new song)
                        existingWin.location.href = parsed.url;
                        tabOpened = true;
                        console.log(`[JARVIS OPEN] Reusing existing tab for: "${serviceKey}"`);
                      } catch (e) {
                        // Cross-origin navigation rejected — open fresh tab
                        openedTabsRef.current.delete(serviceKey);
                      }
                    }

                    if (!tabOpened) {
                      try {
                        const win = window.open(parsed.url, windowTarget);
                        if (win && !win.closed) {
                          openedTabsRef.current.set(serviceKey, win);
                          tabOpened = true;
                          console.log(`[JARVIS OPEN] Stored window ref for: "${serviceKey}"`);
                        } else {
                          console.log(`[JARVIS OPEN] window.open returned null/closed for: "${serviceKey}"`);
                        }
                      } catch (e) {
                        console.warn('[JARVIS OPEN] window.open failed:', e);
                      }
                    }

                    if (!tabOpened) {
                      console.log(`[JARVIS OPEN] Popup blocked, using native fallback for: "${serviceKey}"`);
                      setPopupWarning(true);
                      setBlockedUrl(parsed.url);
                      fetch('http://localhost:5000/api/open_native', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: parsed.url })
                      }).catch(() => {});
                    }
                    continue;
                  }

                  // --- Tab Close Handler ---
                  // Attempt win.close() on tracked window refs first (works for tabs opened by J.A.R.V.I.S.).
                  // Falls back to the backend PowerShell keystroke script for manually-opened tabs.
                  if (parsed.action === 'close_tab' && parsed.target) {
                    const closeKey = (parsed.target || '').toLowerCase().replace(/[^a-z0-9]/g, '');

                    if (closeKey === 'tab') {
                      // Generic "close N tabs" — close the most recently opened tracked tab
                      const keys = [...openedTabsRef.current.keys()];
                      if (keys.length > 0) {
                        const lastKey = keys[keys.length - 1];
                        const win = openedTabsRef.current.get(lastKey);
                        if (win && !win.closed) {
                          win.close();
                          console.log(`[JARVIS CLOSE] Closed tracked tab: "${lastKey}"`);
                        }
                        openedTabsRef.current.delete(lastKey);
                      }
                    } else {
                      // Named target close — try our stored ref first
                      const win = openedTabsRef.current.get(closeKey);
                      if (win && !win.closed) {
                        win.close();
                        openedTabsRef.current.delete(closeKey);
                        console.log(`[JARVIS CLOSE] Closed tracked tab for: "${closeKey}"`);
                      } else {
                        // Tab was not tracked in React session DOM refs; backend handles OS desktop tab closing natively
                        console.log(`[JARVIS CLOSE] No DOM ref found for "${closeKey}", handled by backend desktop automation.`);
                      }
                    }
                    continue;
                  }

                  if (parsed.action === 'open_optical_scanner') {
                    if (onOpenVision) {
                      onOpenVision();
                    }
                    continue;
                  }


                  const deltaContent = parsed.choices?.[0]?.delta?.content;

                  if (deltaContent) {
                    accumulatedResponse += deltaContent;
                    setLlmResponse(accumulatedResponse);

                    // Sync live VolumeWidget when assistant executes volume directive
                    if (/volume|muted|unmuted/i.test(accumulatedResponse)) {
                      const volMatch = accumulatedResponse.match(/(\d{1,3})%/);
                      const isMuted = /muted/i.test(accumulatedResponse) && !/unmuted/i.test(accumulatedResponse);
                      window.dispatchEvent(new CustomEvent('jarvis_volume_change', {
                        detail: {
                          volume: volMatch ? parseInt(volMatch[1], 10) : undefined,
                          muted: isMuted
                        }
                      }));
                    }

                    const newText = accumulatedResponse.slice(lastSpokenIndexRef.current);
                    const sentenceBoundary = /[.!?]\s/;
                    const match = newText.match(sentenceBoundary);

                    if (match) {
                      const boundaryIndex = match.index + 1;
                      const sentenceToSpeak = newText.slice(0, boundaryIndex).trim();
                      speakSentence(sentenceToSpeak);
                      lastSpokenIndexRef.current += boundaryIndex;
                    }
                  }
                } catch (e) {
                  // ignore JSON parse exceptions
                }
              }
            }
          }
        }

        isStreamFinishedRef.current = true;
        window.dispatchEvent(new CustomEvent('jarvis_media_updated'));
        const remainingText = accumulatedResponse.slice(lastSpokenIndexRef.current).trim();
        if (remainingText) {
          speakSentence(remainingText);
        } else if (!accumulatedResponse) {
          setLlmResponse('Directive processed, Sir.');
          finishResponding();
        } else if (activeUtterancesRef.current.length === 0 && (!('speechSynthesis' in window) || !window.speechSynthesis.speaking)) {
          finishResponding();
        }
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[JARVIS] LLM Query aborted by user STOP directive.');
        return;
      }
      console.error('Groq LLM streaming error:', error);
      const cleanMessage = error.message.toUpperCase();
      setLlmResponse(`ERROR: ${cleanMessage}`);
      isStreamFinishedRef.current = true;
      speakSentence('Core system connection error.');
    }
  };

  const handleStop = () => {
    console.log('[JARVIS] STOP directive triggered.');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    activeUtterancesRef.current = [];
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
      submitTimerRef.current = null;
    }
    if (ttsWatchdogRef.current) {
      clearTimeout(ttsWatchdogRef.current);
      ttsWatchdogRef.current = null;
    }
    if (globalWatchdogRef.current) {
      clearTimeout(globalWatchdogRef.current);
      globalWatchdogRef.current = null;
    }
    isRespondingRef.current = false;
    resetTerminal();
  };

  const submitDirective = (rawText, source = 'voice') => {
    const cleanedText = (rawText || '').trim();
    if (!cleanedText) return;

    // Filter out accidental micro-noises (single isolated non-number characters)
    if (cleanedText.length < 2 && !/^[0-9]$/.test(cleanedText)) {
      if (source === 'voice') {
        setValue('');
        setIsVoiceActive(false);
      }
      return;
    }

    // Immediate voice stop command interception
    if (/^(jarvis\s+)?(stop|cancel|halt|quiet)$/i.test(cleanedText)) {
      handleStop();
      return;
    }

    // Standalone greeting ("Hey Jarvis" / "Jarvis" spoken alone)
    const WAKE_ONLY_REGEX = /^\s*(hey\s+jarvis|hi\s+jarvis|ok\s+jarvis|okay\s+jarvis|jarvis|hey\s+travis|travis)\s*[.?!]?$/i;
    if (WAKE_ONLY_REGEX.test(cleanedText)) {
      setValue('');
      isRespondingRef.current = true;
      setIsListening(false);
      setIsVoiceActive(false);
      setTerminalStatus('responding');
      const wakeGreeting = 'At your service, sir. How may I assist you?';
      setLlmResponse(wakeGreeting);
      isStreamFinishedRef.current = true;
      speakSentence(wakeGreeting);
      return;
    }

    // Strip optional wake word prefix if spoken (e.g. "Hey Jarvis, open Spotify" -> "open Spotify")
    const LEADING_WAKE_REGEX = /^\s*(hey\s+jarvis|hi\s+jarvis|ok\s+jarvis|okay\s+jarvis|jarvis|hey\s+jar\s+is|jar\s+is|hey\s+jars|jars|hey\s+travis|travis|hey\s+javis|javis|jarviz)[,.\s]*/i;
    let strippedText = cleanedText.replace(LEADING_WAKE_REGEX, '').trim() || cleanedText;

    // Expanded phonetic speech recognition error correction
    let normalizedPrompt = strippedText
      .replace(/\b(jar\s+is|jars|javis|jarviz)\b/gi, 'jarvis')
      .replace(/\b(u tube|you tube|utube)\b/gi, 'youtube')
      .replace(/\b(spot if i|spotifi|spotif|spodify)\b/gi, 'spotify')
      .replace(/\b(croam|crome|chrom)\b/gi, 'chrome')
      .replace(/\b(deskonp|destop|desktp)\b/gi, 'desktop')
      .replace(/\b(what's up|what sap|whatsup)\b/gi, 'whatsapp')
      .replace(/\b(vs code|visual studio code|visual studio)\b/gi, 'vscode')
      .replace(/\b(chat gpt|chatgpt)\b/gi, 'chatgpt')
      .replace(/\b(microsoft edge|ms edge|use of edge|edge browser)\b/gi, 'edge')
      .replace(/\b(files? exploer|file exploorer|files exploorer|file explorer|files explorer)\b/gi, 'file explorer')
      .replace(/\blocation\s+axis\b/gi, 'location access');

    // Strip conversational speech artifacts (e.g. "is open Spotify" -> "open Spotify")
    normalizedPrompt = normalizedPrompt.replace(/^(?:is\s+|please\s+|can\s+you\s+|could\s+you\s+|would\s+you\s+|just\s+|i\s+want\s+to\s+)(open|launch|start|run|close|stop|exit)\s+/i, '$1 ');

    // If user speech was transcribed as "how folders in desktop", treat as "open folders in desktop"
    if (/^how folders in desktop/i.test(normalizedPrompt)) {
      normalizedPrompt = normalizedPrompt.replace(/^how folders in desktop/i, 'open folders in desktop');
    }

    // Clear any pending speech submission timers
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
      submitTimerRef.current = null;
    }
    lastIncompleteTextRef.current = '';

    setValue(normalizedPrompt);
    isRespondingRef.current = true;
    setIsListening(false);
    setIsVoiceActive(false);

    // Keep recognition warm without tearing down the browser audio stream!
    // isRespondingRef suppresses incoming transcripts while Jarvis is thinking/speaking.

    if (onSubmit) {
      onSubmit(normalizedPrompt);
    }
    queryGroqLLM(normalizedPrompt);
  };

  const handleVoiceSubmit = (text) => {
    submitDirective(text, 'voice');
  };

  const toggleOrRestartMic = () => {
    console.log('[JARVIS] Manual Mic Reset / Reconnect triggered.');
    handleStop();
  };

  // Keep latest handleVoiceSubmit fresh
  handleVoiceSubmitRef.current = handleVoiceSubmit;

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    // Auto-align with user's exact browser/system language locale (e.g. en-IN, en-GB, en-US) for minimal acoustic delay
    const userLang = (navigator.language || 'en-US').trim();
    recognition.lang = userLang.toLowerCase().startsWith('en') ? userLang : 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onspeechstart = () => {
      // If no incomplete utterance or submit timer is pending, reset the display
      if (!submitTimerRef.current && !lastIncompleteTextRef.current) {
        setValue('');
      }
      setIsVoiceActive(true);
      window.dispatchEvent(new CustomEvent('jarvis_user_speaking', { detail: { isSpeaking: true } }));
    };

    recognition.onspeechend = () => {
      window.dispatchEvent(new CustomEvent('jarvis_user_speaking', { detail: { isSpeaking: false } }));
    };

    recognition.onresult = (event) => {
      // Drop any speech recognized while assistant is actively responding, speaking, or within minimal acoustic cooldown
      if (
        isRespondingRef.current ||
        ('speechSynthesis' in window && window.speechSynthesis.speaking) ||
        Date.now() - speechEndTimeRef.current < 120
      ) {
        return;
      }

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const rawText = (finalTranscript + ' ' + interimTranscript).trim().replace(/\s+/g, ' ');
      if (!rawText) return;

      // Stitch with previous incomplete prefix if speech recognition started a new segment
      let currentText = rawText;
      if (
        lastIncompleteTextRef.current &&
        !rawText.toLowerCase().startsWith(lastIncompleteTextRef.current.toLowerCase())
      ) {
        currentText = (lastIncompleteTextRef.current + ' ' + rawText).trim().replace(/\s+/g, ' ');
      }

      const incomplete = isIncompleteDirective(currentText);
      const isActionable = isActionableCommand(currentText);
      const hasSentencePunctuation = /[.?!]$/.test(currentText);

      // Track incomplete state
      if (incomplete) {
        lastIncompleteTextRef.current = currentText;
      } else {
        lastIncompleteTextRef.current = '';
      }

      // Synchronous display update so user sees their words in real-time
      setValue(currentText);
      setIsVoiceActive(true);
      window.dispatchEvent(new CustomEvent('jarvis_user_speaking', { detail: { isSpeaking: true } }));

      if (submitTimerRef.current) {
        clearTimeout(submitTimerRef.current);
      }

      // Calibrated speech completion timing:
      // - Incomplete directive (e.g. "open" or "search for"): wait 1800ms for user to speak the target
      // - Final transcript with actionable command or punctuation: wait 600ms of natural silence
      // - Final transcript other: wait 800ms
      // - Interim transcript with actionable command: wait 1000ms
      // - Interim transcript other: wait 1400ms
      let delay;
      if (incomplete) {
        delay = 1800;
      } else if (finalTranscript) {
        delay = (isActionable || hasSentencePunctuation) ? 600 : 800;
      } else {
        delay = isActionable ? 1000 : 1400;
      }

      submitTimerRef.current = setTimeout(() => {
        lastIncompleteTextRef.current = '';
        window.dispatchEvent(new CustomEvent('jarvis_user_speaking', { detail: { isSpeaking: false } }));
        if (handleVoiceSubmitRef.current) {
          handleVoiceSubmitRef.current(currentText);
        }
      }, delay);
    };

    recognition.onerror = (event) => {
      // 'no-speech' is normal idle behavior in Web Speech API; ignore to prevent UI flicker
      if (event.error === 'no-speech') {
        return;
      }
      console.warn('Speech recognition warning:', event.error);
      window.dispatchEvent(new CustomEvent('jarvis_user_speaking', { detail: { isSpeaking: false } }));
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
      } else if (!isRespondingRef.current && !('speechSynthesis' in window && window.speechSynthesis.speaking)) {
        safeStartRecognition();
      }
    };

    recognition.onend = () => {
      // If JARVIS is not actively responding or speaking, seamlessly restart speech recognition
      if (!isRespondingRef.current && !('speechSynthesis' in window && window.speechSynthesis.speaking)) {
        safeStartRecognition();
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }

    safeStartRecognition();

    // Periodic liveness watchdog: Ensure speech recognition stays active during listening mode
    const livenessCheckInterval = setInterval(() => {
      if (
        !isRespondingRef.current &&
        !('speechSynthesis' in window && window.speechSynthesis.speaking) &&
        terminalStatus === 'listening'
      ) {
        safeStartRecognition();
      }
    }, 4000);

    // Escape key listener to trigger STOP anytime
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleStop();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      clearInterval(livenessCheckInterval);
      if (recognitionRestartTimeoutRef.current) {
        clearTimeout(recognitionRestartTimeoutRef.current);
      }
      if (ttsWatchdogRef.current) {
        clearTimeout(ttsWatchdogRef.current);
      }
      if (globalWatchdogRef.current) {
        clearTimeout(globalWatchdogRef.current);
      }
      recognitionRef.current = null;
      if (submitTimerRef.current) {
        clearTimeout(submitTimerRef.current);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      try {
        recognition.stop();
      } catch (e) {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]); // Reinitialize speech recognition when model changes

  const getJarvisDisplayText = () => {
    if (terminalStatus === 'thinking') {
      return 'Processing directive...';
    }
    if (llmResponse) {
      return llmResponse;
    }
    return 'STANDBY';
  };

  return (
    <div className="hud-input-fixed-container">
      {/* Quick Action Command Chips Bar */}
      <div className="quick-actions-bar">
        {[
          { label: '👁️ Scan Screen', action: 'vision', prompt: 'analyze my screen' },
          { label: '🦾 Protocols', action: 'protocols', prompt: 'initiate protocol focus' },
          { label: '🎵 Media Deck', action: 'media', prompt: 'toggle media playback' },
          { label: '🔋 Battery & Drives', action: 'hardware', prompt: 'what is my battery and hardware health?' },
          { label: '🌐 Web Search', prompt: 'search web for latest space news' },
          { label: '📊 System Stats', prompt: 'what are my system stats?' },
          { label: '📁 Search Files', prompt: 'find file named notes' },
          { label: '🌿 Git Status', prompt: 'check git repository status' },
          { label: '🔒 Lock PC', prompt: 'lock workstation' },
          { label: '🌤️ Weather', prompt: 'what is the weather today?' }
        ].map((chip) => (
          <button
            key={chip.label}
            type="button"
            className="quick-action-chip"
            onClick={() => {
              if (chip.action) {
                window.dispatchEvent(new CustomEvent('jarvis_open_widget', { detail: { widget: chip.action } }));
              } else {
                setValue(chip.prompt);
                handleVoiceSubmit(chip.prompt);
              }
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Holographic Waveform Pedestal directly mounted on top of the box */}
      <HoloPedestal />
      <SVGSprites />
      <div className="hud-input-form">
        <HUDCard
          tl={true}
          tr={true}
          bl={true}
          br={true}
          cornerSize={12}
          filterWidth={680}
          filterHeight={popupWarning ? 180 : 140}
        >
          <div className="jarvis-terminal-inner">
            {/* Holographic Corner Tech Accents */}
            <div className="hud-corner-accent top-left" />
            <div className="hud-corner-accent top-right" />
            <div className="hud-corner-accent bottom-left" />
            <div className="hud-corner-accent bottom-right" />

            {/* Terminal Header Bar */}
            <div className="jarvis-terminal-header">
              <div className="jarvis-header-left">
                <span className="jarvis-header-beacon">
                  <span className="beacon-core" />
                  <span className="beacon-ring" />
                </span>
                <span className="jarvis-header-text">SYSTEM_LOG // J.A.R.V.I.S.</span>
                <span
                  className="jarvis-header-status-pill wake-continuous"
                  title="Continuous Open Microphone Active — Speak Directives Directly"
                >
                  🎙️ ALWAYS LISTENING
                </span>
              </div>
              <button
                type="button"
                className={`jarvis-mic-badge ${isListening ? 'active' : 'idle'} ${isVoiceActive ? 'speaking' : ''}`}
                onClick={toggleOrRestartMic}
                title={isListening ? "Microphone active (Click to reset/reconnect)" : "Microphone idle (Click to activate)"}
              >
                <span className="mic-badge-pulse" />
                {isListening ? (
                  <svg className="mic-badge-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                ) : (
                  <svg className="mic-badge-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="2" y1="2" x2="22" y2="22" />
                    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                    <path d="M5 10v2a7 7 0 0 0 12 5" />
                    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                )}
                <span className="mic-badge-label">
                  {isListening ? (isVoiceActive ? 'HEARING' : 'LISTENING') : 'WAKE MIC'}
                </span>
                {isListening && isVoiceActive && (
                  <span className="mic-badge-equalizer">
                    <span className="eq-bar bar-1" />
                    <span className="eq-bar bar-2" />
                    <span className="eq-bar bar-3" />
                  </span>
                )}
              </button>
            </div>
            
            {/* Terminal Body with Rows */}
            <div className="jarvis-terminal-body">
              {/* User Input Line (Voice Only) */}
              <div className="jarvis-terminal-row user-row">
                <div className="hud-row-lead">
                  <span className="hud-prompt-badge user-badge">USER</span>
                  <span className="hud-prompt-arrow">❯</span>
                </div>
                <div className={`hud-terminal-field user-field ${isVoiceActive ? 'voice-typing' : ''}`}>
                  {value ? (
                    <span className="hud-user-text">{value}</span>
                  ) : isVoiceActive ? (
                    <span className="hud-transcribing-pulse">● ● ● Transcribing directive...</span>
                  ) : (
                    <span className="hud-placeholder">
                      Listening... (Speak directive directly)
                    </span>
                  )}
                </div>
                {(terminalStatus !== 'listening' || isVoiceActive) && (
                  <button
                    type="button"
                    className="hud-stop-btn"
                    onClick={handleStop}
                    title="Stop / Interrupt J.A.R.V.I.S. (Esc)"
                  >
                    <span className="hud-stop-glyph">■</span>
                    <span className="hud-stop-label">ABORT</span>
                  </button>
                )}
              </div>

              {/* J.A.R.V.I.S Response Line */}
              <div className="jarvis-terminal-row jarvis-row">
                <div className="hud-row-lead">
                  <span className={`hud-prompt-badge jarvis-badge ${terminalStatus}`}>J.A.R.V.I.S.</span>
                  <span className={`hud-prompt-arrow jarvis-arrow ${terminalStatus}`}>❯</span>
                </div>
                <div className={`hud-terminal-field responding ${terminalStatus === 'thinking' ? 'thinking' : ''}`}>
                  {getJarvisDisplayText()}
                </div>
                
                {/* Refined Glowing Laser Caret Indicator */}
                <div className={`hud-caret ${
                  isListening && terminalStatus === 'listening' ? 'active-listening' : ''
                } ${
                  isVoiceActive && terminalStatus === 'listening' ? 'active-speaking' : ''
                } ${
                  terminalStatus === 'thinking' ? 'thinking-pulse' : ''
                }`} />
              </div>

              {/* Holographic Telemetry Watermark */}
              <div className="hud-terminal-telemetry">
                <span>PROTOCOL: VOICE_v2.5</span>
                <span className="hud-telemetry-sep">•</span>
                <span>AUDIO: DUPLEX</span>
                <span className="hud-telemetry-sep">•</span>
                <span>LATENCY: 14ms</span>
              </div>

              {/* Popup Blocked Diagnostics Overlay Banner */}
              {popupWarning && (
                <div style={{
                  color: '#ff4d4d',
                  fontSize: '11px',
                  fontFamily: "'Orbitron', sans-serif",
                  marginTop: '8px',
                  textAlign: 'center',
                  background: 'rgba(255, 77, 77, 0.08)',
                  border: '1px solid rgba(255, 77, 77, 0.25)',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  boxShadow: '0 0 10px rgba(255, 77, 77, 0.1)',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <span>⚠️ POPUP BLOCKED: Allow popups in address bar, or click to open:</span>
                  <a
                    href={blockedUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cta-button"
                    style={{
                      textDecoration: 'none',
                      fontSize: '10px',
                      padding: '4px 12px',
                      borderColor: 'rgba(255, 77, 77, 0.6)',
                      background: 'rgba(255, 77, 77, 0.15)',
                      boxShadow: '0 0 8px rgba(255, 77, 77, 0.25)',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      height: 'auto'
                    }}
                  >
                    OPEN LINK
                  </a>
                </div>
              )}
            </div>
          </div>
        </HUDCard>
      </div>
    </div>
  );
};

export default HUDInput;
