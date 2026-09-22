import './App.css';
import Navbar from './components/Navbar';
import VoiceReactiveBlob from './components/blob';
import HUDInput from './components/HUDInput';
import Status from './components/Status';
import AnimatedBackground from './components/AnimatedBackground';
import ChronoMetrics from './components/ChronoMetrics';
import AtmosphereCard from './components/AtmosphereCard';
import SystemStatsCard from './components/SystemStatsCard';
import MediaCard from './components/MediaCard';
import HardwareHealthCard from './components/HardwareHealthCard';
import ProtocolsPanel from './components/ProtocolsPanel';
import ScreenVisionModal from './components/ScreenVisionModal';
import Holo3DViewportModal from './components/Holo3DViewportModal';
import DraggableWidget from './components/DraggableWidget';
import TacticalChrono from './components/TacticalChrono';
import MathAgentCard from './components/MathAgentCard';
import { setSFXEnabled, playChimeSFX } from './utils/soundFX';
import React, { useState, useEffect, useRef } from 'react';

function App() {
  // Load config from localStorage on init with v2 auto-migration to center
  const [blobConfig, setBlobConfig] = useState(() => {
    const saved = localStorage.getItem('jarvis_blob_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const isV2 = parsed.v === 2;
          return {
            color: parsed.color || '#00f0ff',
            size: isV2 && parsed.size ? parsed.size : 340,
            position: isV2 && parsed.position ? parsed.position : { x: null, y: null },
            isDraggable: false,
            v: 2
          };
        }
      } catch (e) {
        console.error('Error loading config:', e);
      }
    }
    return {
      color: '#00f0ff',
      size: 340,
      position: { x: null, y: null },
      isDraggable: false,
      v: 2
    };
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeReminderAlert, setActiveReminderAlert] = useState(null);
  const [activeModel, setActiveModel] = useState(() => {
    const saved = localStorage.getItem('jarvis_active_model');
    // Automatically migrate from decommissioned, rate-limited, or legacy model names
    if (!saved || saved === 'openai/gpt-oss-20b' || saved.startsWith('llama-3.1') || saved.startsWith('llama-3.3') || saved.startsWith('llama3') || saved.startsWith('gemma2') || saved.includes('compound-mini')) {
      return 'qwen/qwen3.8-27b';
    }
    return saved;
  });

  const saveActiveModel = (model) => {
    setActiveModel(model);
    localStorage.setItem('jarvis_active_model', model);
  };

  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('jarvis_theme') || 'cyan');
  const [sfxMuted, setSfxMuted] = useState(() => localStorage.getItem('jarvis_sfx_muted') === 'true');

  const handleSelectTheme = (themeId) => {
    setCurrentTheme(themeId);
    localStorage.setItem('jarvis_theme', themeId);
    let hex = '#00f0ff';
    if (themeId === 'cyberpunk') hex = '#ffb700';
    if (themeId === 'purple') hex = '#b026ff';
    if (themeId === 'crimson') hex = '#ff2a6d';
    saveBlobConfig({ ...blobConfig, color: hex });
    playChimeSFX();
  };

  const handleToggleSFX = () => {
    const nextMuted = !sfxMuted;
    setSfxMuted(nextMuted);
    setSFXEnabled(!nextMuted);
    localStorage.setItem('jarvis_sfx_muted', nextMuted ? 'true' : 'false');
    if (!nextMuted) playChimeSFX();
  };

  const [activeNav, setActiveNav] = useState('Home');
  const [expandedWidget, setExpandedWidget] = useState(null); // 'weather' | 'chrono' | 'media' | 'hardware'
  const [visionModalOpen, setVisionModalOpen] = useState(false);
  const [viewport3dOpen, setViewport3dOpen] = useState(false);
  const [viewport3dModel, setViewport3dModel] = useState(null);
  const [addDashboardWidgetPickerOpen, setAddDashboardWidgetPickerOpen] = useState(false);

  // Global event listener for 3D Viewport activation (voice or intent)
  useEffect(() => {
    const handleOpen3D = (e) => {
      if (e.detail) {
        setViewport3dModel(e.detail);
      }
      setViewport3dOpen(true);
      playChimeSFX();
    };
    window.addEventListener('jarvis_open_3d_viewport', handleOpen3D);
    return () => window.removeEventListener('jarvis_open_3d_viewport', handleOpen3D);
  }, []);

  // Drag-and-drop widget layout states
  const [leftWingWidgets, setLeftWingWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_left_wing_widgets');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['media', 'chrono', 'weather'];
  });

  const [rightWingWidgets, setRightWingWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_right_wing_widgets');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['hardware', 'status', 'stats'];
  });

  const [dashboardWidgets, setDashboardWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_dashboard_widgets');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['protocols', 'media', 'math', 'hardware', 'chrono', 'stats', 'weather', 'status'];
  });

  const handleWidgetDrop = (source, targetZone, targetIndex) => {
    if (!source || !source.id) return;
    playChimeSFX();

    const { id, zone: sourceZone, index: sourceIndex } = source;

    if (sourceZone === targetZone) {
      const updateList = (prev) => {
        const next = [...prev];
        const [moved] = next.splice(sourceIndex, 1);
        let insertIdx = targetIndex;
        if (sourceIndex < targetIndex) {
          insertIdx = targetIndex - 1;
        }
        next.splice(Math.max(0, insertIdx), 0, moved);
        return next;
      };

      if (targetZone === 'left') {
        setLeftWingWidgets(prev => {
          const res = updateList(prev);
          localStorage.setItem('jarvis_left_wing_widgets', JSON.stringify(res));
          return res;
        });
      } else if (targetZone === 'right') {
        setRightWingWidgets(prev => {
          const res = updateList(prev);
          localStorage.setItem('jarvis_right_wing_widgets', JSON.stringify(res));
          return res;
        });
      } else if (targetZone === 'dashboard') {
        setDashboardWidgets(prev => {
          const res = updateList(prev);
          localStorage.setItem('jarvis_dashboard_widgets', JSON.stringify(res));
          return res;
        });
      }
    } else {
      if (sourceZone === 'left' && targetZone === 'right') {
        setLeftWingWidgets(prevLeft => {
          const nextLeft = prevLeft.filter(item => item !== id);
          localStorage.setItem('jarvis_left_wing_widgets', JSON.stringify(nextLeft));
          return nextLeft;
        });
        setRightWingWidgets(prevRight => {
          const nextRight = [...prevRight];
          nextRight.splice(targetIndex, 0, id);
          localStorage.setItem('jarvis_right_wing_widgets', JSON.stringify(nextRight));
          return nextRight;
        });
      } else if (sourceZone === 'right' && targetZone === 'left') {
        setRightWingWidgets(prevRight => {
          const nextRight = prevRight.filter(item => item !== id);
          localStorage.setItem('jarvis_right_wing_widgets', JSON.stringify(nextRight));
          return nextRight;
        });
        setLeftWingWidgets(prevLeft => {
          const nextLeft = [...prevLeft];
          nextLeft.splice(targetIndex, 0, id);
          localStorage.setItem('jarvis_left_wing_widgets', JSON.stringify(nextLeft));
          return nextLeft;
        });
      }
    }
  };

  const handleDeleteWidget = (id, zone) => {
    playChimeSFX();
    if (zone === 'left') {
      setLeftWingWidgets(prev => {
        const next = prev.filter(wId => wId !== id);
        localStorage.setItem('jarvis_left_wing_widgets', JSON.stringify(next));
        return next;
      });
    } else if (zone === 'right') {
      setRightWingWidgets(prev => {
        const next = prev.filter(wId => wId !== id);
        localStorage.setItem('jarvis_right_wing_widgets', JSON.stringify(next));
        return next;
      });
    } else if (zone === 'dashboard') {
      setDashboardWidgets(prev => {
        const next = prev.filter(wId => wId !== id);
        localStorage.setItem('jarvis_dashboard_widgets', JSON.stringify(next));
        return next;
      });
    }
  };

  const ALL_WIDGET_CATALOG = [
    { id: 'protocols', name: 'Iron Man Protocols Hub', icon: '🦾' },
    { id: 'media', name: 'Media Hub & Audio Matrix', icon: '🎵' },
    { id: 'math', name: 'Tactical Math Intelligence Agent', icon: '∑' },
    { id: 'hardware', name: 'Hardware & Battery Diagnostics', icon: '⚡' },
    { id: 'chrono', name: 'Tactical Chrono Metrics', icon: '⏱️' },
    { id: 'stats', name: 'Host Hardware Telemetry', icon: '🧠' },
    { id: 'weather', name: 'Atmospheric Radar', icon: '🌤️' },
    { id: 'status', name: 'Security & Duplex Status', icon: '🛡️' }
  ];

  const handleAddWidget = (widgetId, targetZone) => {
    playChimeSFX();
    if (targetZone === 'left') {
      setLeftWingWidgets(prev => {
        if (prev.includes(widgetId)) return prev;
        const next = [...prev, widgetId];
        localStorage.setItem('jarvis_left_wing_widgets', JSON.stringify(next));
        return next;
      });
    } else if (targetZone === 'right') {
      setRightWingWidgets(prev => {
        if (prev.includes(widgetId)) return prev;
        const next = [...prev, widgetId];
        localStorage.setItem('jarvis_right_wing_widgets', JSON.stringify(next));
        return next;
      });
    } else if (targetZone === 'dashboard') {
      setDashboardWidgets(prev => {
        if (prev.includes(widgetId)) return prev;
        const next = [...prev, widgetId];
        localStorage.setItem('jarvis_dashboard_widgets', JSON.stringify(next));
        return next;
      });
    }
  };

  const handleClearZone = (zone) => {
    playChimeSFX();
    if (zone === 'left') {
      setLeftWingWidgets([]);
      localStorage.setItem('jarvis_left_wing_widgets', JSON.stringify([]));
    } else if (zone === 'right') {
      setRightWingWidgets([]);
      localStorage.setItem('jarvis_right_wing_widgets', JSON.stringify([]));
    } else if (zone === 'dashboard') {
      setDashboardWidgets([]);
      localStorage.setItem('jarvis_dashboard_widgets', JSON.stringify([]));
    }
  };

  const handleEmptyZoneDrop = (e, zone) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (dataStr) {
        const source = JSON.parse(dataStr);
        handleWidgetDrop(source, zone, 0);
      }
    } catch (err) {}
  };

  const resetWidgetLayouts = () => {
    playChimeSFX();
    setLeftWingWidgets(['media', 'chrono', 'weather']);
    setRightWingWidgets(['hardware', 'status', 'stats']);
    setDashboardWidgets(['protocols', 'media', 'math', 'hardware', 'chrono', 'stats', 'weather', 'status']);
    localStorage.removeItem('jarvis_left_wing_widgets');
    localStorage.removeItem('jarvis_right_wing_widgets');
    localStorage.removeItem('jarvis_dashboard_widgets');
  };

  const renderWidgetContent = (widgetId) => {
    switch (widgetId) {
      case 'media':
        return <MediaCard onOpen={() => setExpandedWidget('media')} />;
      case 'chrono':
        return <ChronoMetrics onOpen={() => setExpandedWidget('chrono')} />;
      case 'weather':
        return <AtmosphereCard onOpen={() => setExpandedWidget('weather')} />;
      case 'hardware':
        return <HardwareHealthCard />;
      case 'status':
        return <Status onOpen={() => setExpandedWidget('status')} />;
      case 'stats':
        return <SystemStatsCard onOpen={() => setExpandedWidget('stats')} />;
      case 'protocols':
        return <ProtocolsPanel onProtocolTriggered={handleSpeechAnnounce} />;
      case 'math':
        return <MathAgentCard onOpen={() => setExpandedWidget('math')} />;
      default:
        return null;
    }
  };

  const [voices, setVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState(() => {
    return localStorage.getItem('jarvis_selected_voice') || 'default';
  });

  const handleSpeechAnnounce = (text) => {
    if ('speechSynthesis' in window && !sfxMuted && text) {
      try {
        const u = new SpeechSynthesisUtterance(text);
        if (selectedVoiceName && selectedVoiceName !== 'default') {
          const v = window.speechSynthesis.getVoices().find(voice => voice.name === selectedVoiceName);
          if (v) u.voice = v;
        }
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }
  };

  useEffect(() => {
    const handleOpenWidget = (e) => {
      const target = (e?.detail?.widget || 'weather').toLowerCase();
      if (target === 'vision' || target.includes('scan') || target.includes('screen') || target.includes('optics')) {
        setVisionModalOpen(true);
      } else if (target === 'protocols' || target.includes('protocol')) {
        setActiveNav('Dashboard');
      } else if (target === 'media' || target.includes('music') || target.includes('song') || target.includes('spotify')) {
        setExpandedWidget('media');
      } else if (target === 'hardware' || target.includes('battery') || target.includes('disk') || target.includes('drive')) {
        setExpandedWidget('hardware');
      } else if (target === 'all' || target === 'dashboard' || target === 'widgets' || target === 'widget') {
        setActiveNav('Dashboard');
      } else if (target.includes('chrono') || target.includes('time') || target.includes('clock')) {
        setExpandedWidget('chrono');
      } else if (target.includes('diag') || target.includes('status') || target.includes('perm')) {
        setExpandedWidget('status');
      } else if (target.includes('stat') || target.includes('cpu') || target.includes('ram') || target.includes('telemetry')) {
        setExpandedWidget('stats');
      } else if (target === 'math' || target.includes('calc') || target.includes('maths')) {
        setExpandedWidget('math');
      } else {
        setExpandedWidget('weather');
      }
    };
    window.addEventListener('jarvis_open_widget', handleOpenWidget);
    return () => window.removeEventListener('jarvis_open_widget', handleOpenWidget);
  }, []);

  // Proactive background reminder poller for frontend HUD
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:5000/api/reminders/active');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.activeAlerts && data.activeAlerts.length > 0) {
          const alert = data.activeAlerts[0];
          if (isMounted) {
            setActiveReminderAlert(alert);
            playChimeSFX();
            handleSpeechAnnounce(`Sir, scheduled reminder: ${alert.title}. Scheduled for ${alert.timeStr || 'now'}.`);
            fetch('http://localhost:5000/api/reminders/dismiss', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: alert.id })
            }).catch(() => {});
          }
        }
      } catch (e) {}
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sfxMuted, selectedVoiceName]);

  useEffect(() => {
    document.title = "J.A.R.V.I.S. - Core System";
    if ('speechSynthesis' in window) {
      const updateVoices = () => {
        const allVoices = window.speechSynthesis.getVoices();
        const enVoices = allVoices.filter(v => v.lang.startsWith('en'));
        setVoices(enVoices.length > 0 ? enVoices : allVoices);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const previewVoice = (voiceName) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const allVoices = window.speechSynthesis.getVoices();
    let preferredVoice = null;
    if (voiceName && voiceName !== 'default') {
      preferredVoice = allVoices.find(v => v.name === voiceName || v.voiceURI === voiceName);
    }
    if (!preferredVoice) {
      const enVoices = allVoices.filter(v => v.lang.startsWith('en'));
      preferredVoice = enVoices.find(v => 
        (v.name.toLowerCase().includes('online') || v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural')) && 
        (v.name.toLowerCase().includes('guy') || v.name.toLowerCase().includes('ryan') || v.name.toLowerCase().includes('andrew') || v.name.toLowerCase().includes('brian') || v.name.toLowerCase().includes('male'))
      ) || enVoices[0] || allVoices[0];
    }

    const testText = preferredVoice 
      ? 'Voice profile initialized. System operational.'
      : 'Vocal synthesizer active.';

    const utterance = new SpeechSynthesisUtterance(testText);
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const saveSelectedVoice = (voiceName) => {
    setSelectedVoiceName(voiceName);
    localStorage.setItem('jarvis_selected_voice', voiceName);
    previewVoice(voiceName);
  };

  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tempPos, setTempPos] = useState({ x: null, y: null });

  const blobRef = useRef(null);

  // Save config helper
  const saveBlobConfig = (config) => {
    const updated = { ...config, v: 2 };
    localStorage.setItem('jarvis_blob_config', JSON.stringify(updated));
    setBlobConfig(updated);
  };

  // --- DRAG EVENT HANDLERS ---
  const handleMouseDown = (e) => {
    if (!blobConfig.isDraggable) return;
    
    // Prevent default selection text behavior
    e.preventDefault();
    
    const rect = blobRef.current.getBoundingClientRect();
    setDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Bounded coordinates within screen size
    const size = blobConfig.size;
    const boundedX = Math.max(0, Math.min(window.innerWidth - size, newX));
    const boundedY = Math.max(0, Math.min(window.innerHeight - size, newY));
    
    setBlobConfig((prev) => ({
      ...prev,
      position: { x: boundedX, y: boundedY }
    }));
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  // Mobile Touch Support
  const handleTouchStart = (e) => {
    if (!blobConfig.isDraggable) return;
    const touch = e.touches[0];
    const rect = blobRef.current.getBoundingClientRect();
    setDragging(true);
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
  };

  const handleTouchMove = (e) => {
    if (!dragging) return;
    const touch = e.touches[0];
    const newX = touch.clientX - dragOffset.x;
    const newY = touch.clientY - dragOffset.y;
    
    const size = blobConfig.size;
    const boundedX = Math.max(0, Math.min(window.innerWidth - size, newX));
    const boundedY = Math.max(0, Math.min(window.innerHeight - size, newY));
    
    setBlobConfig((prev) => ({
      ...prev,
      position: { x: boundedX, y: boundedY }
    }));
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, dragOffset]);

  // Lock and Save Position
  const handleSavePosition = () => {
    const updated = {
      ...blobConfig,
      isDraggable: false
    };
    saveBlobConfig(updated);
  };

  // Cancel Repositioning
  const handleCancelDrag = () => {
    const updated = {
      ...blobConfig,
      position: tempPos,
      isDraggable: false
    };
    setBlobConfig(updated);
  };

  // Determine dynamic placement coordinates
  const getBlobStyle = () => {
    const style = {
      width: `${blobConfig.size}px`,
      height: `${blobConfig.size}px`,
      cursor: blobConfig.isDraggable ? 'move' : 'pointer',
      position: 'fixed',
      bottom: 'auto',
      right: 'auto',
      zIndex: 900,
      '--orb-color': blobConfig.color || '#00f0ff'
    };

    if (blobConfig.position.x !== null && blobConfig.position.y !== null) {
      style.left = `${blobConfig.position.x}px`;
      style.top = `${blobConfig.position.y}px`;
      style.transform = 'none';
    } else {
      // Centered: Positioned as the heroic centerpiece above the terminal
      style.left = '50%';
      style.top = '38%';
      style.transform = 'translate(-50%, -50%)';
    }

    return style;
  };

  return (
    <div className="App">
      {/* Dynamic 3D Moving Hologram Background with Mouse Parallax & Particle Flow */}
      <AnimatedBackground />

      {/* Liquid Glass Futuristic Navbar with Settings Handler */}
      <Navbar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenVision={() => setVisionModalOpen(true)}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectTheme}
        sfxMuted={sfxMuted}
        onToggleSFX={handleToggleSFX}
        activeNav={activeNav}
        onSelectNav={setActiveNav}
      />

      {/* TACTICAL SCHEDULED REMINDER NOTIFICATION POPUP */}
      {activeReminderAlert && (
        <div className="jarvis-reminder-alert-toast" role="alert">
          <div className="jarvis-reminder-alert-glow"></div>
          <div className="jarvis-reminder-alert-header">
            <span className="jarvis-reminder-alert-icon">🔔</span>
            <span className="jarvis-reminder-alert-badge">TACTICAL REMINDER ALERT</span>
            <button
              className="jarvis-reminder-close-btn"
              onClick={() => setActiveReminderAlert(null)}
              aria-label="Dismiss alert"
            >
              ✕
            </button>
          </div>
          <div className="jarvis-reminder-alert-body">
            <div className="jarvis-reminder-alert-title">{activeReminderAlert.title}</div>
            <div className="jarvis-reminder-alert-time">SCHEDULED TIME: {activeReminderAlert.timeStr}</div>
          </div>
          <button
            className="jarvis-reminder-dismiss-action"
            onClick={() => setActiveReminderAlert(null)}
          >
            DISMISS DIRECTIVE
          </button>
        </div>
      )}

      {activeNav === 'Dashboard' ? (
        /* SINGLE PAGE ALL-WIDGETS SCROLLABLE DASHBOARD VIEW WITH DRAG-AND-DROP */
        <div className="dashboard-full-page">
          <div className="dashboard-page-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1>MAINFRAME DASHBOARD TELEMETRY</h1>
                <p>Unified real-time telemetry, atmospheric, and system diagnostic controls // Drag ⠿ to reorder or ✕ to delete</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={addDashboardWidgetPickerOpen ? 'settings-btn' : 'settings-btn-secondary'}
                  style={{ borderRadius: '8px', padding: '8px 14px', fontSize: '10px', letterSpacing: '1px' }}
                  onClick={() => setAddDashboardWidgetPickerOpen(!addDashboardWidgetPickerOpen)}
                >
                  {addDashboardWidgetPickerOpen ? '✕ CLOSE WIDGETS' : '+ ADD WIDGET'}
                </button>
                <button
                  type="button"
                  className="settings-btn-secondary"
                  style={{ borderRadius: '8px', padding: '8px 14px', fontSize: '10px', letterSpacing: '1px' }}
                  onClick={resetWidgetLayouts}
                  title="Reset widgets to default layout"
                >
                  ↺ RESET LAYOUT
                </button>
              </div>
            </div>

            {/* Quick Add Widget Bar */}
            {addDashboardWidgetPickerOpen && (
              <div className="dashboard-quick-add-bar">
                <div className="quick-add-title">DEPLOY TELEMETRY WIDGETS TO DASHBOARD</div>
                <div className="quick-add-grid">
                  {ALL_WIDGET_CATALOG.map((widget) => {
                    const isDash = dashboardWidgets.includes(widget.id);
                    return (
                      <div key={widget.id} className={`quick-add-item ${isDash ? 'already-active' : ''}`}>
                        <div className="quick-add-info">
                          <span className="quick-add-icon">{widget.icon}</span>
                          <span className="quick-add-name">{widget.name}</span>
                        </div>
                        {isDash ? (
                          <button
                            type="button"
                            className="settings-btn-delete"
                            style={{ padding: '4px 10px', fontSize: '9px', borderRadius: '5px' }}
                            onClick={() => handleDeleteWidget(widget.id, 'dashboard')}
                          >
                            ✕ Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="settings-btn"
                            style={{ padding: '4px 10px', fontSize: '9px', borderRadius: '5px' }}
                            onClick={() => handleAddWidget(widget.id, 'dashboard')}
                          >
                            + Add to Dashboard
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {dashboardWidgets.length === 0 ? (
            <div className="dashboard-empty-state">
              <div className="empty-state-icon">📡</div>
              <h3>NO TELEMETRY WIDGETS ACTIVE ON DASHBOARD</h3>
              <p>Customize your tactical dashboard by deploying modules above or restoring the mainframe defaults.</p>
              <div className="empty-state-actions">
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => setAddDashboardWidgetPickerOpen(true)}
                >
                  + DEPLOY WIDGETS
                </button>
                <button
                  type="button"
                  className="settings-btn-secondary"
                  onClick={resetWidgetLayouts}
                >
                  ↺ RESTORE DEFAULTS
                </button>
              </div>
            </div>
          ) : (
            <div className="dashboard-grid-container">
              {dashboardWidgets.map((wId, idx) => (
                <div key={wId} className="dashboard-grid-item">
                  <DraggableWidget
                    id={wId}
                    zone="dashboard"
                    index={idx}
                    onDropWidget={handleWidgetDrop}
                    onDeleteWidget={handleDeleteWidget}
                  >
                    {renderWidgetContent(wId)}
                  </DraggableWidget>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* HUD VIEW WITH HERO ORB & DRAGGABLE SIDEBAR WINGS */
        <>
          {/* Left Wing Sidebar Column */}
          <div
            className="hud-wing-column hud-left-wing"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              if (leftWingWidgets.length === 0) handleEmptyZoneDrop(e, 'left');
            }}
          >
            {leftWingWidgets.map((wId, idx) => (
              <DraggableWidget
                key={wId}
                id={wId}
                zone="left"
                index={idx}
                onDropWidget={handleWidgetDrop}
                onDeleteWidget={handleDeleteWidget}
              >
                {renderWidgetContent(wId)}
              </DraggableWidget>
            ))}
            {leftWingWidgets.length === 0 && (
              <div className="empty-drop-zone">
                + DROP WIDGETS HERE
              </div>
            )}
          </div>

          {/* Floating 3D Voice Assistant Blob with 3D Tilted Planetary Rings & J.A.R.V.I.S. Emblem */}
          <div
            ref={blobRef}
            className={`voice-assistant-fixed ${blobConfig.isDraggable ? 'draggable-active' : ''}`}
            style={getBlobStyle()}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* 3D Tilted Planetary Rings (Saturn-style perspective) */}
            <div className="hud-planetary-rings">
              <div className="planetary-ring ring-1" />
              <div className="planetary-ring ring-2" />
              <div className="planetary-ring ring-3" />
              <div className="planetary-ring ring-4" />
            </div>

            {/* Glowing Core Particle Orb */}
            <VoiceReactiveBlob
              isListening={true}
              color={blobConfig.color}
              glowColor={blobConfig.color}
              size={blobConfig.size}
            />

            {/* Center Iron Man Arc Reactor Emblem */}
            <div className="arc-reactor-emblem">
              <div className="arc-ring-outer" />
              <div className="arc-ring-segments">
                <span /><span /><span /><span />
                <span /><span /><span /><span />
              </div>
              <div className="arc-ring-inner" />
              <div className="arc-core-glow" />
            </div>

            {/* Reposition Mode Floating Controls Overlay */}
            {blobConfig.isDraggable && (
              <div className="drag-helper-panel">
                <span className="drag-text">POSITIONING CORE</span>
                <div className="drag-btn-row">
                  <button className="drag-save-btn" onClick={handleSavePosition}>SAVE</button>
                  <button 
                    className="drag-center-btn" 
                    onClick={() => setBlobConfig((prev) => ({ ...prev, position: { x: null, y: null } }))}
                  >
                    CENTER
                  </button>
                  <button className="drag-cancel-btn" onClick={handleCancelDrag}>CANCEL</button>
                </div>
              </div>
            )}
          </div>

          {/* Right Wing Sidebar Column */}
          <div
            className="hud-wing-column hud-right-wing"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              if (rightWingWidgets.length === 0) handleEmptyZoneDrop(e, 'right');
            }}
          >
            {rightWingWidgets.map((wId, idx) => (
              <DraggableWidget
                key={wId}
                id={wId}
                zone="right"
                index={idx}
                onDropWidget={handleWidgetDrop}
                onDeleteWidget={handleDeleteWidget}
              >
                {renderWidgetContent(wId)}
              </DraggableWidget>
            ))}
            {rightWingWidgets.length === 0 && (
              <div className="empty-drop-zone">
                + DROP WIDGETS HERE
              </div>
            )}
          </div>
        </>
      )}

      {/* Futuristic HUD Terminal Input Textbox at the Bottom */}
      <HUDInput 
        onSubmit={(command) => console.log('Command submitted:', command)} 
        model={activeModel} 
        voiceName={selectedVoiceName}
        onOpenVision={() => setVisionModalOpen(true)}
      />

      {/* Bottom-Left Holographic Optical Scanner HUD Trigger */}
      <button
        type="button"
        className="hud-bottom-scanner-btn"
        onClick={() => setVisionModalOpen(true)}
        title="Launch Optical Scanner & Screen Vision AI"
      >
        <div className="scanner-btn-glow-bg" />
        <div className="scanner-btn-scanline" />
        <div className="scanner-btn-content">
          <div className="scanner-btn-icon-wrapper">
            <span className="scanner-btn-icon">👁️</span>
            <span className="scanner-btn-radar" />
          </div>
          <div className="scanner-btn-text-group">
            <span className="scanner-btn-title">OPTICAL SCANNER</span>
            <span className="scanner-btn-sub">AI VISION // READY</span>
          </div>
        </div>
        <span className="scanner-btn-corner tl" />
        <span className="scanner-btn-corner br" />
      </button>

      {/* Bottom-Left 3D Holographic Viewport Trigger */}
      <button
        type="button"
        className="hud-bottom-3d-btn"
        onClick={() => {
          setViewport3dOpen(true);
          playChimeSFX();
        }}
        title="Open JARVIS 3D Holographic Viewport Canvas"
      >
        <span style={{ fontSize: '1.15rem' }}>🧊</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#00f0ff', letterSpacing: '1.2px' }}>3D VIEWPORT</span>
          <span style={{ fontSize: '0.62rem', color: '#94a3b8', letterSpacing: '0.8px' }}>HOLOGRAM CANVAS</span>
        </div>
      </button>

      {/* Liquid Glass Futuristic Settings Panel */}
      {settingsOpen && (
        <div className="settings-modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2>CORE CONFIGURATION</h2>
              <button className="close-modal-btn" onClick={() => setSettingsOpen(false)}>&times;</button>
            </div>

            <div className="settings-modal-body">
              {/* WIDGET & HUD LAYOUT RESET SECTION */}
              <div className="settings-section">
                <h3><span className="section-icon">📐</span> HUD WIDGETS & MODULAR DEPLOYMENT</h3>
                <div className="setting-item">
                  <label className="setting-label">MODULAR WIDGET CONFIGURATION & DELETION</label>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 12px', lineHeight: 1.5 }}>
                    Manage telemetry widgets across your interface. Delete or add modules to the <strong>Left Wing</strong>, <strong>Right Wing</strong>, or <strong>Dashboard</strong>.
                  </p>
                  
                  {/* Widget Management Catalog */}
                  <div className="settings-widgets-catalog">
                    {ALL_WIDGET_CATALOG.map((widget) => {
                      const isLeft = leftWingWidgets.includes(widget.id);
                      const isRight = rightWingWidgets.includes(widget.id);
                      const isDash = dashboardWidgets.includes(widget.id);
                      return (
                        <div key={widget.id} className="settings-widget-card">
                          <div className="settings-widget-header-info">
                            <span className="settings-widget-icon">{widget.icon}</span>
                            <div className="settings-widget-name-box">
                              <span className="settings-widget-name">{widget.name}</span>
                              <div className="settings-widget-badges">
                                {isLeft && <span className="widget-status-badge left">LEFT WING</span>}
                                {isRight && <span className="widget-status-badge right">RIGHT WING</span>}
                                {isDash && <span className="widget-status-badge dash">DASHBOARD</span>}
                                {!isLeft && !isRight && !isDash && (
                                  <span className="widget-status-badge idle">STANDBY</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="settings-widget-actions-matrix">
                            {/* Left Wing Actions */}
                            {isLeft ? (
                              <button
                                type="button"
                                className="settings-btn-delete"
                                onClick={() => handleDeleteWidget(widget.id, 'left')}
                                title="Delete from Left Wing"
                              >
                                ✕ Left Wing
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="settings-btn-secondary"
                                onClick={() => handleAddWidget(widget.id, 'left')}
                                title="Add to Left Wing"
                              >
                                + Left Wing
                              </button>
                            )}

                            {/* Right Wing Actions */}
                            {isRight ? (
                              <button
                                type="button"
                                className="settings-btn-delete"
                                onClick={() => handleDeleteWidget(widget.id, 'right')}
                                title="Delete from Right Wing"
                              >
                                ✕ Right Wing
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="settings-btn-secondary"
                                onClick={() => handleAddWidget(widget.id, 'right')}
                                title="Add to Right Wing"
                              >
                                + Right Wing
                              </button>
                            )}

                            {/* Dashboard Actions */}
                            {isDash ? (
                              <button
                                type="button"
                                className="settings-btn-delete"
                                onClick={() => handleDeleteWidget(widget.id, 'dashboard')}
                                title="Delete from Dashboard"
                              >
                                ✕ Dashboard
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="settings-btn-secondary"
                                onClick={() => handleAddWidget(widget.id, 'dashboard')}
                                title="Add to Dashboard"
                              >
                                + Dashboard
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bulk Zone Operations */}
                  <div className="settings-bulk-actions">
                    <button
                      type="button"
                      className="settings-btn-secondary"
                      onClick={resetWidgetLayouts}
                      title="Reset all widgets to factory default layout"
                    >
                      ↺ RESTORE DEFAULTS
                    </button>
                    <button
                      type="button"
                      className="settings-btn-delete"
                      onClick={() => handleClearZone('dashboard')}
                      title="Remove all widgets from Dashboard"
                    >
                      ✕ CLEAR DASHBOARD
                    </button>
                    <button
                      type="button"
                      className="settings-btn-delete"
                      onClick={() => {
                        handleClearZone('left');
                        handleClearZone('right');
                      }}
                      title="Remove all widgets from HUD Side Wings"
                    >
                      ✕ CLEAR HUD WINGS
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3><span className="section-icon">🔮</span> ASSISTANT ORB</h3>
                
                {/* 1. COLOR CHOICE */}
                <div className="setting-item">
                  <label className="setting-label">ORB PRIMARY HUE</label>
                  <div className="color-presets">
                    {[
                      { name: 'Cyan Reactor', hex: '#00f0ff' },
                      { name: 'Quantum Purple', hex: '#d600ff' },
                      { name: 'Nano Green', hex: '#00ff88' },
                      { name: 'Arc Gold', hex: '#ffaa00' },
                      { name: 'Infrared Rose', hex: '#ff2d55' }
                    ].map((preset) => (
                      <button
                        key={preset.hex}
                        className={`color-preset-btn ${blobConfig.color === preset.hex ? 'active' : ''}`}
                        style={{ backgroundColor: preset.hex }}
                        onClick={() => saveBlobConfig({ ...blobConfig, color: preset.hex })}
                        title={preset.name}
                      />
                    ))}
                  </div>
                  <div className="custom-color-input-wrapper">
                    <span>CUSTOM COLOR:</span>
                    <input
                      type="color"
                      value={blobConfig.color}
                      onChange={(e) => saveBlobConfig({ ...blobConfig, color: e.target.value })}
                      className="custom-color-picker"
                    />
                    <input
                      type="text"
                      value={blobConfig.color}
                      onChange={(e) => saveBlobConfig({ ...blobConfig, color: e.target.value })}
                      className="color-hex-text"
                    />
                  </div>
                </div>

                {/* 2. SIZE SLIDER */}
                <div className="setting-item">
                  <div className="setting-label-row">
                    <label className="setting-label">ORB MAGNITUDE</label>
                    <span className="setting-value">{blobConfig.size}px</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="600"
                    value={blobConfig.size}
                    onChange={(e) => saveBlobConfig({ ...blobConfig, size: parseInt(e.target.value) })}
                    className="settings-slider"
                  />
                </div>

                {/* 3. DRAGGING CONFIGURATION */}
                <div className="setting-item">
                  <label className="setting-label">POSITION MATRIX</label>
                  <p className="setting-help-text">Reposition the core orb anywhere inside your viewport, or snap to presets.</p>
                  <div className="position-actions-row">
                    <button
                      className="settings-btn"
                      onClick={() => {
                        setTempPos(blobConfig.position);
                        setBlobConfig((prev) => ({ ...prev, isDraggable: true }));
                        setSettingsOpen(false); // close to allow drag
                      }}
                    >
                      DRAG & DROP ORB
                    </button>
                    <button
                      className="settings-btn-secondary"
                      onClick={() => {
                        const resetConfig = {
                          ...blobConfig,
                          position: { x: null, y: null },
                          isDraggable: false
                        };
                        saveBlobConfig(resetConfig);
                      }}
                    >
                      SNAP TO CENTER
                    </button>
                  </div>
                  {/* Quick Preset Buttons */}
                  <div className="preset-pos-row">
                    <button
                      type="button"
                      className="preset-pos-btn"
                      onClick={() => {
                        saveBlobConfig({ ...blobConfig, position: { x: null, y: null }, isDraggable: false });
                      }}
                    >
                      CENTER CORE
                    </button>
                    <button
                      type="button"
                      className="preset-pos-btn"
                      onClick={() => {
                        saveBlobConfig({ 
                          ...blobConfig, 
                          position: { x: 50, y: Math.max(80, window.innerHeight * 0.40) }, 
                          isDraggable: false 
                        });
                      }}
                    >
                      LEFT FOCUS
                    </button>
                    <button
                      type="button"
                      className="preset-pos-btn"
                      onClick={() => {
                        saveBlobConfig({ 
                          ...blobConfig, 
                          position: { x: Math.max(100, window.innerWidth - blobConfig.size - 50), y: Math.max(80, window.innerHeight * 0.40) }, 
                          isDraggable: false 
                        });
                      }}
                    >
                      RIGHT FOCUS
                    </button>
                  </div>
                </div>

                 {/* 4. AI CORE OPERATION MODE */}
                <div className="setting-item">
                  <label className="setting-label">CORE AI MODEL MODE</label>
                  <p className="setting-help-text">Switch core intelligence between a conversational companion or a prompt safety scanner.</p>
                  <div className="custom-color-input-wrapper" style={{ marginTop: '10px' }}>
                    <select
                      value={activeModel}
                      onChange={(e) => saveActiveModel(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 12, 22, 0.95)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '6px',
                        color: '#00f0ff',
                        padding: '10px 14px',
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: '11px',
                        outline: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 0 10px rgba(0, 240, 255, 0.1)'
                      }}
                    >
                      <option value="qwen/qwen3.8-27b">Conversational Intelligence (Qwen 3.8 27B) [Recommended]</option>
                      <option value="openai/gpt-oss-120b">Advanced Reasoning (GPT-OSS 120B)</option>
                      <option value="openai/gpt-oss-20b">Lightweight Assistant (GPT-OSS 20B)</option>
                      <option value="meta-llama/llama-prompt-guard-2-86m">Security Guard (Llama Prompt Guard 2)</option>
                    </select>
                  </div>
                </div>

                {/* 5. ASSISTANT VOICE PROFILE */}
                <div className="setting-item" style={{ marginTop: '16px' }}>
                  <label className="setting-label">ASSISTANT VOICE</label>
                  <p className="setting-help-text">Choose the vocal synthesizer profile for J.A.R.V.I.S. voice feedback.</p>
                  <div className="custom-color-input-wrapper" style={{ marginTop: '10px' }}>
                    <select
                      value={selectedVoiceName}
                      onChange={(e) => saveSelectedVoice(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 12, 22, 0.95)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '6px',
                        color: '#00f0ff',
                        padding: '10px 14px',
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: '11px',
                        outline: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 0 10px rgba(0, 240, 255, 0.1)'
                      }}
                    >
                      <option value="default">(Recommended) Ultra-Realistic Neural Auto-Select</option>
                      {voices.map((v, idx) => (
                        <option key={`${v.name}-${v.lang}-${idx}`} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="settings-btn"
                      style={{
                        padding: '6px 14px',
                        fontSize: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                      onClick={() => previewVoice(selectedVoiceName)}
                    >
                      <span>🔊</span> TEST VOICE
                    </button>
                    <span style={{
                      fontSize: '10px',
                      color: 'rgba(0, 240, 255, 0.7)',
                      fontFamily: "'Orbitron', sans-serif",
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {selectedVoiceName === 'default' ? 'ACTIVE: Neural Auto-Select' : `ACTIVE: ${selectedVoiceName}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Holographic Widget Modal */}
      {expandedWidget && (
        <div className="widget-modal-overlay" onClick={() => setExpandedWidget(null)}>
          <div className="widget-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="widget-modal-header">
              <h2>
                <span style={{ color: '#00f0ff' }}>◈</span>
                {expandedWidget === 'weather' && 'ATMOSPHERIC TELEMETRY EXPANSION'}
                {expandedWidget === 'chrono' && 'CHRONO SYSTEM METRICS EXPANSION'}
                {expandedWidget === 'status' && 'SYSTEM DIAGNOSTICS & PERMISSIONS'}
                {expandedWidget === 'stats' && 'HOST HARDWARE & RESOURCE TELEMETRY'}
                {expandedWidget === 'media' && 'MEDIA HUB & AUDIO STREAMING MATRIX'}
                {expandedWidget === 'hardware' && 'HARDWARE HEALTH & STORAGE DIAGNOSTICS'}
                {expandedWidget === 'math' && 'TACTICAL MATHEMATICAL INTELLIGENCE & MATRIX'}
              </h2>
              <button 
                className="widget-modal-close-btn" 
                onClick={() => setExpandedWidget(null)}
                aria-label="Close Widget"
              >
                ✕
              </button>
            </div>

            <div className="widget-modal-body">
              {expandedWidget === 'weather' && (
                <>
                  <div className="widget-expanded-hero">
                    <div>
                      <div style={{ fontSize: '11px', color: '#00f0ff', letterSpacing: '1px' }}>LOCAL RADAR & CLIMATE TELEMETRY</div>
                      <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px' }}>
                        27°C <span style={{ fontSize: '14px', color: '#00ffaa' }}>CLEAR SKY</span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                        Atmospheric sensors active // Real-time feed nominal
                      </div>
                    </div>
                    <div style={{ fontSize: '40px', filter: 'drop-shadow(0 0 12px #00f0ff)' }}>🌤️</div>
                  </div>

                  <div className="widget-expanded-stats-grid">
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">WIND VELOCITY</span>
                      <span className="widget-stat-box-val">15 KM/H</span>
                    </div>
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">HUMIDITY</span>
                      <span className="widget-stat-box-val">69%</span>
                    </div>
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">PRESSURE</span>
                      <span className="widget-stat-box-val">952 HPA</span>
                    </div>
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">PRECIPITATION</span>
                      <span className="widget-stat-box-val">0.0 MM</span>
                    </div>
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">DEW POINT</span>
                      <span className="widget-stat-box-val">19°C</span>
                    </div>
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">AIR QUALITY</span>
                      <span className="widget-stat-box-val">OPTIMAL</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,240,255,0.03)', border: '1px solid rgba(0,240,255,0.18)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '10px', color: '#00f0ff', letterSpacing: '1.2px', marginBottom: '10px' }}>
                      7-DAY SYNOPTIC OUTLOOK
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center' }}>
                      {[
                        { day: 'Tue', t: '30°C', s: '☀️' },
                        { day: 'Wed', t: '30°C', s: '🌤️' },
                        { day: 'Thu', t: '30°C', s: '🌤️' },
                        { day: 'Fri', t: '30°C', s: '☀️' },
                        { day: 'Sat', t: '31°C', s: '☀️' },
                        { day: 'Sun', t: '31°C', s: '🌤️' },
                        { day: 'Mon', t: '27°C', s: '🌦️' }
                      ].map((item, idx) => (
                        <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 4px', borderRadius: '6px', border: '1px solid rgba(0,240,255,0.1)' }}>
                          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>{item.day}</div>
                          <div style={{ fontSize: '15px', margin: '4px 0' }}>{item.s}</div>
                          <div style={{ fontSize: '10px', color: '#00ffaa', fontWeight: 700 }}>{item.t}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {expandedWidget === 'chrono' && (
                <div className="chrono-modal-container" style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                  <TacticalChrono />
                </div>
              )}

              {expandedWidget === 'status' && (
                <>
                  <div className="widget-expanded-hero">
                    <div>
                      <div style={{ fontSize: '11px', color: '#00f0ff', letterSpacing: '1.2px' }}>CORE STATUS & SECURITY MATRIX</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#00ffaa' }}>
                        ALL SUBSYSTEMS NOMINAL
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                        Real-time link integrity verified // Audio duplex active
                      </div>
                    </div>
                    <div style={{ fontSize: '38px', filter: 'drop-shadow(0 0 12px #00ffaa)' }}>🛡️</div>
                  </div>

                  <div className="widget-expanded-stats-grid">
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">NETWORK LINK</span>
                      <span className="widget-stat-box-val">{navigator.onLine ? 'ONLINE [OK]' : 'OFFLINE'}</span>
                    </div>
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">MICROPHONE</span>
                      <span className="widget-stat-box-val">ACTIVE</span>
                    </div>
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">API BACKEND</span>
                      <span className="widget-stat-box-val">CONNECTED</span>
                    </div>
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">ENCRYPTION</span>
                      <span className="widget-stat-box-val">AES-256 GCM</span>
                    </div>
                  </div>
                </>
              )}

              {expandedWidget === 'stats' && (
                <>
                  <div className="widget-expanded-hero">
                    <div>
                      <div style={{ fontSize: '11px', color: '#00f0ff', letterSpacing: '1.2px' }}>SYSTEM HARDWARE TELEMETRY</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
                        HOST PERFORMANCE <span style={{ color: '#00f0ff' }}>OPTIMAL</span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                        Telemetry cycle rate 5000ms // Hardware monitor connected
                      </div>
                    </div>
                    <div style={{ fontSize: '38px', filter: 'drop-shadow(0 0 12px #00f0ff)' }}>⚡</div>
                  </div>

                  <div className="widget-expanded-stats-grid">
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">CPU ARCHITECTURE</span>
                      <span className="widget-stat-box-val">x86_64 MULTI</span>
                    </div>
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">AVAILABLE MEMORY</span>
                      <span className="widget-stat-box-val">10.2 GB FREE</span>
                    </div>
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">UPTIME</span>
                      <span className="widget-stat-box-val">21h 18m</span>
                    </div>
                    <div className="widget-stat-box">
                      <span className="widget-stat-box-label">CORES / THREADS</span>
                      <span className="widget-stat-box-val">16 THREADS</span>
                    </div>
                  </div>
                </>
              )}
              {expandedWidget === 'media' && (
                <div style={{ padding: '4px 0' }}>
                  <MediaCard isExpanded={true} />
                </div>
              )}

              {expandedWidget === 'hardware' && (
                <div style={{ padding: '10px 0' }}>
                  <HardwareHealthCard />
                </div>
              )}
              {expandedWidget === 'math' && (
                <div style={{ padding: '10px 0', maxWidth: '560px', margin: '0 auto' }}>
                  <MathAgentCard />
                </div>
              )}
            </div>

            <div className="widget-modal-footer">
              <button 
                className="widget-modal-action-btn"
                onClick={() => {
                  setExpandedWidget(null);
                  setActiveNav('Dashboard');
                }}
              >
                OPEN MAINFRAME DASHBOARD ↗
              </button>
              <button 
                className="widget-modal-action-btn" 
                style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
                onClick={() => setExpandedWidget(null)}
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Holographic Screen Vision Modal */}
      <ScreenVisionModal
        isOpen={visionModalOpen}
        onClose={() => setVisionModalOpen(false)}
        onSpeechResponse={handleSpeechAnnounce}
      />

      {/* Holographic 3D Viewport Canvas Modal */}
      <Holo3DViewportModal
        isOpen={viewport3dOpen}
        onClose={() => setViewport3dOpen(false)}
        initialModelData={viewport3dModel}
        themeColor={blobConfig.color}
      />
    </div>
  );
}

export default App;
