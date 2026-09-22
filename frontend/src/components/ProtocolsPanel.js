import React, { useState, useEffect } from 'react';
import './ProtocolsPanel.css';
import { playChimeSFX } from '../utils/soundFX';

const ProtocolsPanel = ({ onProtocolTriggered }) => {
  const [protocols, setProtocols] = useState([]);
  const [activeExecuting, setActiveExecuting] = useState(null);
  const [statusMessage, setStatusMessage] = useState('ALL SYSTEMS NOMINAL');

  const fetchProtocols = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/protocols');
      if (res.ok) {
        const data = await res.json();
        if (data.protocols) {
          setProtocols(data.protocols);
        }
      }
    } catch (e) {
      // Fallback default protocols
      setProtocols([
        {
          id: 'focus',
          name: 'Protocol Focus',
          icon: '🎯',
          description: 'Developer immersion: launches VS Code, terminal, and sets quiet audio.',
          actions: [{ type: 'open', targets: ['Code', 'Terminal'] }, { type: 'volume', level: 25 }]
        },
        {
          id: 'chill',
          name: 'Protocol Chill',
          icon: '🎵',
          description: 'Recreation mode: opens Spotify, YouTube, and raises volume.',
          actions: [{ type: 'open', targets: ['Spotify', 'YouTube'] }, { type: 'volume', level: 65 }]
        },
        {
          id: 'clean_slate',
          name: 'Protocol Clean Slate',
          icon: '🧹',
          description: 'Closes entertainment and browser tabs, resets workstation.',
          actions: [{ type: 'close', targets: ['Spotify', 'Discord'] }, { type: 'volume', level: 40 }]
        },
        {
          id: 'nightfall',
          name: 'Protocol Nightfall',
          icon: '🌙',
          description: 'End-of-day sequence: mutes audio, closes apps, locks workstation.',
          actions: [{ type: 'volume', action: 'mute' }, { type: 'power', action: 'lock' }]
        }
      ]);
    }
  };

  useEffect(() => {
    fetchProtocols();
  }, []);

  const handleExecute = async (protocol) => {
    setActiveExecuting(protocol.id);
    playChimeSFX();
    setStatusMessage(`EXECUTING ${protocol.name.toUpperCase()}...`);

    try {
      const res = await fetch('http://localhost:5000/api/protocols/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: protocol.id })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`${protocol.name.toUpperCase()} DEPLOYED`);
        if (onProtocolTriggered) {
          onProtocolTriggered(data.message || protocol.voiceConfirmation);
        }
      }
    } catch (e) {
      console.error('Protocol execution error:', e);
      setStatusMessage('EXECUTION FAILED');
    } finally {
      setTimeout(() => {
        setActiveExecuting(null);
        setTimeout(() => setStatusMessage('ALL SYSTEMS NOMINAL'), 2500);
      }, 1000);
    }
  };

  return (
    <div className="protocols-panel-container">
      <div className="protocols-panel-header">
        <h3 className="protocols-panel-title">
          <span>🦾</span> IRON MAN PROTOCOLS HUB
        </h3>
        <span className="protocols-status-badge">{statusMessage}</span>
      </div>

      <div className="protocols-grid">
        {protocols.map((proto) => {
          const isExecuting = activeExecuting === proto.id;
          return (
            <div
              key={proto.id}
              className={`protocol-card ${isExecuting ? 'active-executing' : ''}`}
            >
              <div className="protocol-card-top">
                <div className="protocol-icon-box">{proto.icon || '⚡'}</div>
                <div className="protocol-info-box">
                  <div className="protocol-name">{proto.name}</div>
                  <div className="protocol-desc">{proto.description}</div>
                </div>
              </div>

              <div className="protocol-actions-tags">
                {(proto.actions || []).map((act, i) => (
                  <span key={i} className="protocol-action-pill">
                    {act.type === 'open' && `🚀 Open: ${act.targets?.join(', ')}`}
                    {act.type === 'close' && `🛑 Close: ${act.targets?.join(', ')}`}
                    {act.type === 'volume' && `🔊 Vol: ${act.level ? act.level + '%' : act.action}`}
                    {act.type === 'media' && `🎵 Media: ${act.action}`}
                    {act.type === 'power' && `🔒 Power: ${act.action}`}
                    {act.type === 'timer' && `⏱️ Timer: ${Math.round(act.seconds / 60)}m`}
                  </span>
                ))}
              </div>

              <button
                type="button"
                className="protocol-activate-btn"
                onClick={() => handleExecute(proto)}
                disabled={isExecuting}
              >
                {isExecuting ? 'INITIALIZING...' : '⚡ ACTIVATE'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProtocolsPanel;
