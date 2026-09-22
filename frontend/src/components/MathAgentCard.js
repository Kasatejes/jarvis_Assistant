import React, { useState, useEffect, useRef } from 'react';
import { playChimeSFX } from '../utils/soundFX';
import './MathAgentCard.css';

const DEFAULT_HISTORY = [
  { expression: '15% of 850', result: '127.5', category: 'PERCENTAGE', steps: '(15 / 100) × 850 = 127.5' },
  { expression: 'sqrt(256)', result: '16', category: 'SCIENTIFIC', steps: 'sqrt(256) = 16' },
  { expression: '100 km to miles', result: '62.13712 miles', category: 'CONVERSION', steps: '100 km × 0.621371 = 62.14 miles' }
];

export const MathAgentCard = ({ onOpen, isExpanded = false }) => {
  const [expression, setExpression] = useState('');
  const [currentCalculation, setCurrentCalculation] = useState({
    expression: '15% of 850',
    formattedResult: '127.5',
    category: 'PERCENTAGE',
    steps: '(15 / 100) × 850 = 127.5'
  });
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' | 'scientific' | 'convert' | 'algebra'
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_math_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_HISTORY;
  });
  const [isSolving, setIsSolving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncPulse, setSyncPulse] = useState(false);
  const inputRef = useRef(null);

  // Sync with global voice/chat calculation events
  useEffect(() => {
    const handleGlobalMath = (e) => {
      const detail = e?.detail;
      if (detail && detail.result) {
        setCurrentCalculation({
          expression: detail.expression || '',
          formattedResult: detail.result || '',
          category: detail.category || 'CALCULATION',
          steps: detail.steps || ''
        });
        setExpression(detail.expression || '');
        setSyncPulse(true);
        setTimeout(() => setSyncPulse(false), 1200);

        // Add to history
        setHistory((prev) => {
          const updated = [
            {
              expression: detail.expression || '',
              result: detail.result || '',
              category: detail.category || 'CALCULATION',
              steps: detail.steps || ''
            },
            ...prev.filter((item) => item.expression !== detail.expression)
          ].slice(0, 10);
          localStorage.setItem('jarvis_math_history', JSON.stringify(updated));
          return updated;
        });
      }
    };

    window.addEventListener('jarvis_math_calculated', handleGlobalMath);
    return () => window.removeEventListener('jarvis_math_calculated', handleGlobalMath);
  }, []);

  const calculateExpression = async (exprToRun) => {
    const targetExpr = (exprToRun !== undefined ? exprToRun : expression).trim();
    if (!targetExpr) return;

    setIsSolving(true);
    playChimeSFX();

    try {
      const res = await fetch('http://localhost:5000/api/math/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: targetExpr })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const newCalc = {
            expression: data.expression || targetExpr,
            formattedResult: data.formattedResult || String(data.result),
            category: data.category || 'CALCULATION',
            steps: data.steps || ''
          };
          setCurrentCalculation(newCalc);

          setHistory((prev) => {
            const nextHist = [
              {
                expression: newCalc.expression,
                result: newCalc.formattedResult,
                category: newCalc.category,
                steps: newCalc.steps
              },
              ...prev.filter((i) => i.expression !== newCalc.expression)
            ].slice(0, 10);
            localStorage.setItem('jarvis_math_history', JSON.stringify(nextHist));
            return nextHist;
          });
        } else {
          setCurrentCalculation((prev) => ({
            ...prev,
            formattedResult: data.error || 'Syntax Error',
            steps: 'Unable to evaluate expression'
          }));
        }
      }
    } catch (e) {
      console.warn('[MathAgent] Evaluation request error:', e);
      setCurrentCalculation((prev) => ({
        ...prev,
        formattedResult: 'Offline Calc Error',
        steps: e.message
      }));
    } finally {
      setIsSolving(false);
    }
  };

  const handleKeyPress = (key) => {
    playChimeSFX();
    if (key === 'AC') {
      setExpression('');
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    if (key === 'DEL') {
      setExpression((prev) => prev.slice(0, -1));
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    if (key === '=') {
      calculateExpression(expression);
      return;
    }
    setExpression((prev) => prev + key);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleCopyResult = () => {
    if (currentCalculation.formattedResult) {
      navigator.clipboard.writeText(currentCalculation.formattedResult);
      playChimeSFX();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const loadFromHistory = (item) => {
    playChimeSFX();
    setExpression(item.expression);
    setCurrentCalculation({
      expression: item.expression,
      formattedResult: item.result,
      category: item.category || 'HISTORY',
      steps: item.steps || ''
    });
  };

  const handleQuickConvert = (val, fromUnit, toUnit) => {
    const q = `${val} ${fromUnit} to ${toUnit}`;
    setExpression(q);
    calculateExpression(q);
  };

  const handleQuickTemplate = (tpl) => {
    setExpression(tpl);
    calculateExpression(tpl);
  };

  return (
    <div className={`math-agent-card-container ${isExpanded ? 'math-expanded-mode' : ''} ${syncPulse ? 'sync-active' : ''}`}>
      <div className="math-agent-inner">
          {/* Header */}
          <div
            className="math-agent-header"
            onClick={() => onOpen && onOpen()}
            title="Click to expand Tactical Math Matrix"
          >
            <div className="math-agent-title">
              <span className="math-pulse-icon">∑</span>
              <span>MATH INTELLIGENCE AGENT</span>
            </div>
            <div className="math-agent-actions">
              <span className="math-category-badge">{currentCalculation.category}</span>
              <button
                className="widget-expand-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpen) onOpen();
                }}
                title="Expand Math Matrix"
                aria-label="Expand Math Matrix"
              >
                ⤢
              </button>
            </div>
          </div>

          {/* LCD Digital Telemetry Screen */}
          <div className="math-lcd-display">
            <div className="math-lcd-top">
              <input
                ref={inputRef}
                type="text"
                className="math-expression-input"
                placeholder="Enter formula, %, or algebra..."
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') calculateExpression(expression);
                }}
              />
              <button
                className="math-solve-trigger-btn"
                onClick={() => calculateExpression(expression)}
                disabled={isSolving}
                title="Calculate"
              >
                {isSolving ? '...' : 'EXEC'}
              </button>
            </div>

            <div className="math-lcd-main" onClick={handleCopyResult} title="Click to copy result">
              <div className="math-result-readout">
                {currentCalculation.formattedResult || '0'}
              </div>
              <div className="math-copy-indicator">
                {copied ? 'COPIED' : 'COPY'}
              </div>
            </div>

            <div className="math-lcd-steps">
              <span className="math-steps-label">◈ TELEMETRY:</span>{' '}
              <span className="math-steps-text">{currentCalculation.steps || 'Ready for calculation directive'}</span>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="math-mode-tabs">
            <button
              className={`math-tab-btn ${activeTab === 'quick' ? 'active' : ''}`}
              onClick={() => { playChimeSFX(); setActiveTab('quick'); }}
            >
              BASIC
            </button>
            <button
              className={`math-tab-btn ${activeTab === 'scientific' ? 'active' : ''}`}
              onClick={() => { playChimeSFX(); setActiveTab('scientific'); }}
            >
              SCIENTIFIC
            </button>
            <button
              className={`math-tab-btn ${activeTab === 'convert' ? 'active' : ''}`}
              onClick={() => { playChimeSFX(); setActiveTab('convert'); }}
            >
              CONVERT
            </button>
            <button
              className={`math-tab-btn ${activeTab === 'algebra' ? 'active' : ''}`}
              onClick={() => { playChimeSFX(); setActiveTab('algebra'); }}
            >
              ALGEBRA
            </button>
          </div>

          {/* Keypad & Matrix Panels */}
          <div className="math-panel-container">
            {activeTab === 'quick' && (
              <div className="math-keypad-grid">
                <button className="math-key-fn" onClick={() => handleKeyPress('AC')}>AC</button>
                <button className="math-key-fn" onClick={() => handleKeyPress('DEL')}>⌫</button>
                <button className="math-key-op" onClick={() => handleKeyPress('%')}>%</button>
                <button className="math-key-op" onClick={() => handleKeyPress('/')}>÷</button>

                <button className="math-key-num" onClick={() => handleKeyPress('7')}>7</button>
                <button className="math-key-num" onClick={() => handleKeyPress('8')}>8</button>
                <button className="math-key-num" onClick={() => handleKeyPress('9')}>9</button>
                <button className="math-key-op" onClick={() => handleKeyPress('*')}>×</button>

                <button className="math-key-num" onClick={() => handleKeyPress('4')}>4</button>
                <button className="math-key-num" onClick={() => handleKeyPress('5')}>5</button>
                <button className="math-key-num" onClick={() => handleKeyPress('6')}>6</button>
                <button className="math-key-op" onClick={() => handleKeyPress('-')}>-</button>

                <button className="math-key-num" onClick={() => handleKeyPress('1')}>1</button>
                <button className="math-key-num" onClick={() => handleKeyPress('2')}>2</button>
                <button className="math-key-num" onClick={() => handleKeyPress('3')}>3</button>
                <button className="math-key-op" onClick={() => handleKeyPress('+')}>+</button>

                <button className="math-key-num math-key-zero" onClick={() => handleKeyPress('0')}>0</button>
                <button className="math-key-num" onClick={() => handleKeyPress('.')}>.</button>
                <button className="math-key-equal" onClick={() => handleKeyPress('=')}>=</button>
              </div>
            )}

            {activeTab === 'scientific' && (
              <div className="math-sci-grid">
                <button className="math-key-sci" onClick={() => handleKeyPress('sqrt(')}>√x</button>
                <button className="math-key-sci" onClick={() => handleKeyPress('^2')}>x²</button>
                <button className="math-key-sci" onClick={() => handleKeyPress('^')}>xʸ</button>
                <button className="math-key-sci" onClick={() => handleKeyPress('!')}>n!</button>
                <button className="math-key-sci" onClick={() => handleKeyPress('sin(')}>sin</button>
                <button className="math-key-sci" onClick={() => handleKeyPress('cos(')}>cos</button>
                <button className="math-key-sci" onClick={() => handleKeyPress('tan(')}>tan</button>
                <button className="math-key-sci" onClick={() => handleKeyPress('log(')}>log₁₀</button>
                <button className="math-key-sci" onClick={() => handleKeyPress('ln(')}>ln</button>
                <button className="math-key-sci" onClick={() => handleKeyPress('pi')}>π</button>
                <button className="math-key-sci" onClick={() => handleKeyPress('e')}>e</button>
                <button className="math-key-sci" onClick={() => handleKeyPress('(')}>(</button>
                <button className="math-key-sci" onClick={() => handleKeyPress(')')}>)</button>
                <button className="math-key-sci math-key-equal" onClick={() => handleKeyPress('=')}>CALC</button>
              </div>
            )}

            {activeTab === 'convert' && (
              <div className="math-convert-grid">
                <button className="math-convert-chip" onClick={() => handleQuickConvert('100', 'km', 'miles')}>
                  100 km ➔ mi
                </button>
                <button className="math-convert-chip" onClick={() => handleQuickConvert('50', 'miles', 'km')}>
                  50 mi ➔ km
                </button>
                <button className="math-convert-chip" onClick={() => handleQuickConvert('100', 'f', 'c')}>
                  100°F ➔ °C
                </button>
                <button className="math-convert-chip" onClick={() => handleQuickConvert('37', 'c', 'f')}>
                  37°C ➔ °F
                </button>
                <button className="math-convert-chip" onClick={() => handleQuickConvert('10', 'kg', 'lbs')}>
                  10 kg ➔ lbs
                </button>
                <button className="math-convert-chip" onClick={() => handleQuickConvert('150', 'lbs', 'kg')}>
                  150 lbs ➔ kg
                </button>
                <button className="math-convert-chip" onClick={() => handleQuickConvert('4', 'gb', 'mb')}>
                  4 GB ➔ MB
                </button>
                <button className="math-convert-chip" onClick={() => handleQuickConvert('1024', 'mb', 'gb')}>
                  1024 MB ➔ GB
                </button>
              </div>
            )}

            {activeTab === 'algebra' && (
              <div className="math-algebra-grid">
                <button className="math-algebra-chip" onClick={() => handleQuickTemplate('solve 2x + 10 = 50')}>
                  <span>2x + 10 = 50</span>
                  <small>Linear Equation</small>
                </button>
                <button className="math-algebra-chip" onClick={() => handleQuickTemplate('solve 3x - 15 = 45')}>
                  <span>3x - 15 = 45</span>
                  <small>Linear Equation</small>
                </button>
                <button className="math-algebra-chip" onClick={() => handleQuickTemplate('solve x^2 - 5x + 6 = 0')}>
                  <span>x² - 5x + 6 = 0</span>
                  <small>Quadratic Roots</small>
                </button>
                <button className="math-algebra-chip" onClick={() => handleQuickTemplate('average of 12, 24, 36, 48')}>
                  <span>avg(12, 24, 36, 48)</span>
                  <small>Statistical Mean</small>
                </button>
              </div>
            )}
          </div>

          {/* History Tape Drawer */}
          {history.length > 0 && (
            <div className="math-history-tape">
              <span className="math-tape-title">HISTORY:</span>
              <div className="math-tape-scroll">
                {history.slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    className="math-tape-item"
                    onClick={() => loadFromHistory(item)}
                    title={`Reload "${item.expression}" = ${item.result}`}
                  >
                    <span className="math-tape-expr">{item.expression}</span>
                    <span className="math-tape-res">= {item.result}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
    </div>
  );
};

export default MathAgentCard;
