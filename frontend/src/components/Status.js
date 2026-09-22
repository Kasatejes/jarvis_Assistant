import React, { useState, useEffect } from 'react';
import { HUDCard, SVGSprites } from './HUDCard';
import './Status.css';

const Status = ({ onOpen }) => {
  const [sysOnline, setSysOnline] = useState(navigator.onLine);
  const [micStatus, setMicStatus] = useState('idle'); // idle | active | denied | requesting
  const [permission, setPermission] = useState('prompt'); // granted | denied | prompt
  const [isLlmQuerying, setIsLlmQuerying] = useState(false);

  useEffect(() => {
    // 1. Internet connection status
    const handleOnline = () => setSysOnline(true);
    const handleOffline = () => setSysOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Microphone status custom event from VoiceReactiveBlob
    const handleMicStatusChange = (e) => {
      if (e.detail) {
        setMicStatus(e.detail);
      }
    };
    window.addEventListener('jarvis_mic_status', handleMicStatusChange);

    // 3. Browser mic permissions
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' }).then((status) => {
        setPermission(status.state);
        status.onchange = () => {
          setPermission(status.state);
        };
      }).catch((err) => {
        console.warn("Permissions API not supported:", err);
      });
    }

    // 4. J.A.R.V.I.S LLM status custom events from HUDInput
    const handleQueryingStart = () => setIsLlmQuerying(true);
    const handleQueryingEnd = () => setIsLlmQuerying(false);
    window.addEventListener('jarvis_querying_start', handleQueryingStart);
    window.addEventListener('jarvis_querying_end', handleQueryingEnd);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('jarvis_mic_status', handleMicStatusChange);
      window.removeEventListener('jarvis_querying_start', handleQueryingStart);
      window.removeEventListener('jarvis_querying_end', handleQueryingEnd);
    };
  }, []);

  return (
    <div className="status-fixed-panel">
      <SVGSprites />
      <HUDCard
        tl={true}
        tr={true}
        bl={true}
        br={true}
        cornerSize={10}
        filterWidth={290}
        filterHeight={195}
      >
        <div className="status-inner">
          <div 
            className="status-header"
            onClick={() => onOpen && onOpen()}
            title="Click to open system diagnostics telemetry"
          >
            <span>SYSTEM DIAGNOSTICS</span>
            <button 
              className="widget-expand-btn" 
              onClick={(e) => { e.stopPropagation(); onOpen && onOpen(); }} 
              title="Open Diagnostics Telemetry"
              aria-label="Open Diagnostics Widget"
            >
              ⤢
            </button>
          </div>
          
          <div className="status-list">
            {/* System Online Status */}
            <div className="status-row">
              <span className="status-label">SYSTEM_ONLINE</span>
              <div className="status-indicator">
                <span className={`status-led ${sysOnline ? 'led-green' : 'led-red'}`} />
                <span className={`status-value ${sysOnline ? 'val-green' : 'val-red'}`}>
                  {sysOnline ? '[OK]' : '[ERR]'}
                </span>
              </div>
            </div>

            {/* J.A.R.V.I.S Core active status */}
            <div className="status-row">
              <span className="status-label">CORE_AI</span>
              <div className="status-indicator">
                <span className={`status-led ${isLlmQuerying ? 'led-blue-pulsing' : 'led-green'}`} />
                <span className={`status-value ${isLlmQuerying ? 'val-blue' : 'val-green'}`}>
                  {isLlmQuerying ? '(BUSY)' : '(OPTIMAL)'}
                </span>
              </div>
            </div>

            {/* Microphone Active Connection */}
            <div className="status-row">
              <span className="status-label">MC_STREAM</span>
              <div className="status-indicator">
                <span className={`status-led ${
                  micStatus === 'active' ? 'led-green' : 
                  micStatus === 'requesting' ? 'led-yellow-pulsing' : 'led-red'
                }`} />
                <span className={`status-value ${
                  micStatus === 'active' ? 'val-green' : 
                  micStatus === 'requesting' ? 'val-yellow' : 'val-red'
                }`}>
                  {micStatus === 'active' ? 'ACTIVE' : micStatus === 'requesting' ? 'INIT' : 'MUTED'}
                </span>
              </div>
            </div>

            {/* Microphone Permission Status */}
            <div className="status-row">
              <span className="status-label">MIC_PERM</span>
              <div className="status-indicator">
                <span className={`status-led ${
                  permission === 'granted' ? 'led-green' : 
                  permission === 'prompt' ? 'led-yellow' : 'led-red'
                }`} />
                <span className={`status-value ${
                  permission === 'granted' ? 'val-green' : 
                  permission === 'prompt' ? 'val-yellow' : 'val-red'
                }`}>
                  {permission === 'granted' ? 'GRANTED' : permission === 'prompt' ? 'PROMPT' : 'BLOCKED'}
                </span>
              </div>
            </div>

            {/* API Connection */}
            <div className="status-row">
              <span className="status-label">API_CONN</span>
              <div className="status-indicator">
                <span className="status-led led-green" />
                <span className="status-value val-green">GROQ_ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </HUDCard>
    </div>
  );
};

export default Status;
