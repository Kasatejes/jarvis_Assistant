import React, { useState, useEffect, useRef } from 'react';
import './MediaCard.css';
import { playChimeSFX } from '../utils/soundFX';

const PRESET_STATIONS = [
  { id: 'synthwave', name: 'Cyberpunk Synthwave', query: 'cyberpunk synthwave radio mix', icon: '⚡', target: 'youtube' },
  { id: 'lofi', name: 'Lofi Focus Beats', query: 'lofi hip hop radio beats to relax study to', icon: '☕', target: 'youtube' },
  { id: 'rock', name: 'AC/DC Classic Rock', query: 'ac dc back in black highway to hell', icon: '🎸', target: 'youtube' },
  { id: 'scifi', name: 'Hans Zimmer Sci-Fi', query: 'hans zimmer interstellar soundtrack', icon: '🌌', target: 'youtube' },
  { id: 'hits', name: 'Top Hits', query: 'top hits music playlist', icon: '🎧', target: 'spotify' }
];

const MediaCard = ({ onOpen, isExpanded = false }) => {
  const [media, setMedia] = useState({
    isPlaying: false,
    title: 'Media Deck Standby',
    artist: 'Ready for Playback',
    source: 'Spotify'
  });
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTarget, setSearchTarget] = useState('youtube');
  const [searchFeedback, setSearchFeedback] = useState('');
  const [searching, setSearching] = useState(false);
  const volDebounceRef = useRef(null);

  const fetchMedia = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/media');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMedia({
            isPlaying: !!data.isPlaying,
            title: data.title || 'Media Deck Standby',
            artist: data.artist || 'Ready for Playback',
            source: data.source || 'Spotify'
          });
        }
      }
    } catch (e) {
      // Backend polling error silently suppressed
    }
  };

  const fetchVolume = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/volume');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.volume === 'number') {
          setVolume(data.volume);
          setIsMuted(!!data.muted);
        }
      }
    } catch (e) {
      // Ignore volume fetch errors
    }
  };

  useEffect(() => {
    fetchMedia();
    fetchVolume();
    const interval = setInterval(() => {
      fetchMedia();
    }, 2500);

    const handleSync = () => {
      fetchMedia();
      fetchVolume();
    };

    window.addEventListener('focus', handleSync);
    window.addEventListener('jarvis_media_updated', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('jarvis_media_updated', handleSync);
    };
  }, []);

  const handleControl = async (action, extraParams = {}) => {
    // Optimistic UI updates
    if (action === 'playpause') {
      setMedia(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    } else if (action === 'stop') {
      setMedia(prev => ({ ...prev, isPlaying: false }));
    } else if (action === 'next' || action === 'prev') {
      setMedia(prev => ({ ...prev, isPlaying: true }));
    }

    setLoading(true);
    playChimeSFX();

    try {
      const res = await fetch('http://localhost:5000/api/media/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraParams })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setMedia(prev => ({
            ...prev,
            isPlaying: !!data.status.isPlaying,
            title: data.status.title || prev.title,
            artist: data.status.artist || prev.artist,
            source: data.status.source || prev.source
          }));
        }
        window.dispatchEvent(new CustomEvent('jarvis_media_updated'));
        setTimeout(fetchMedia, 500);
      }
    } catch (e) {
      console.error('Media control failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleVolumeChange = (newVol) => {
    const val = parseInt(newVol, 10);
    setVolume(val);
    if (isMuted && val > 0) setIsMuted(false);

    if (volDebounceRef.current) clearTimeout(volDebounceRef.current);
    volDebounceRef.current = setTimeout(async () => {
      try {
        await fetch('http://localhost:5000/api/volume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set', level: val })
        });
      } catch (e) {}
    }, 120);
  };

  const handleToggleMute = async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    playChimeSFX();
    try {
      await fetch('http://localhost:5000/api/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextMuted ? 'mute' : 'unmute' })
      });
      fetchVolume();
    } catch (e) {}
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearching(true);
    setSearchFeedback(`Initiating playback for "${query}" on ${searchTarget === 'spotify' ? 'Spotify' : 'YouTube'}...`);
    playChimeSFX();

    try {
      const res = await fetch('http://localhost:5000/api/media/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'play_query', query, target: searchTarget })
      });
      if (res.ok) {
        const data = await res.json();
        setSearchFeedback(data.message || `Playing "${query}"`);
        setMedia(prev => ({
          ...prev,
          isPlaying: true,
          title: query,
          artist: searchTarget === 'spotify' ? 'Spotify Playback' : 'YouTube Playback',
          source: searchTarget === 'spotify' ? 'Spotify' : 'YouTube'
        }));
        setTimeout(fetchMedia, 1500);
      } else {
        setSearchFeedback('Unable to start media playback.');
      }
    } catch (err) {
      setSearchFeedback('Error connecting to media service.');
    } finally {
      setSearching(false);
    }
  };

  const handlePresetPlay = (station) => {
    setSearchQuery(station.query);
    setSearchTarget(station.target);
    setSearching(true);
    setSearchFeedback(`Tuning into ${station.name}...`);
    playChimeSFX();

    fetch('http://localhost:5000/api/media/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'play_query', query: station.query, target: station.target })
    })
      .then(res => res.json())
      .then(data => {
        setSearchFeedback(data.message || `Station active: ${station.name}`);
        setMedia(prev => ({
          ...prev,
          isPlaying: true,
          title: station.name,
          artist: station.target === 'spotify' ? 'Spotify Radio' : 'YouTube Live',
          source: station.target === 'spotify' ? 'Spotify' : 'YouTube'
        }));
        setTimeout(fetchMedia, 1500);
      })
      .catch(() => {
        setSearchFeedback('Failed to activate radio station.');
      })
      .finally(() => {
        setSearching(false);
      });
  };

  // If in Expanded Mode (Modal View)
  if (isExpanded) {
    return (
      <div className="media-card-container is-expanded">
        {/* Top Hero Showcase */}
        <div className="media-expanded-hero">
          <div
            className={`media-disc-visualizer large-disc ${media.isPlaying ? 'playing' : ''}`}
            onClick={() => handleControl('playpause')}
            title="Click to Toggle Play/Pause"
            style={{ cursor: 'pointer' }}
          >
            <div className="media-disc-center large" />
            <div className="media-disc-grooves large" />
            <div className="media-disc-laser-glow" />
          </div>

          <div className="media-expanded-track-details">
            <div className="media-expanded-meta-row">
              <span className={`media-status-indicator ${media.isPlaying ? 'live' : 'paused'}`}>
                {media.isPlaying ? '● LIVE AUDIO DECK' : '⏸ PLAYBACK PAUSED'}
              </span>
              <span className={`media-source-pill ${media.source.toLowerCase().includes('spotify') ? 'spotify' : 'youtube'}`}>
                {media.source.toLowerCase().includes('spotify') ? '🎧 SPOTIFY' : '🔴 YOUTUBE'}
              </span>
            </div>

            <h2 className="media-expanded-title" title={media.title}>
              {media.title}
            </h2>
            <div className="media-expanded-artist" title={media.artist}>
              {media.artist}
            </div>

            {/* Dynamic Multi-bar Equalizer Visualizer */}
            <div className={`media-equalizer-bars expanded ${media.isPlaying ? 'playing' : ''}`}>
              {Array.from({ length: 16 }).map((_, idx) => (
                <div key={idx} className="media-bar" style={{ animationDelay: `${(idx % 6) * 0.12}s` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Master Playback Transport Deck */}
        <div className="media-expanded-transport">
          <button
            type="button"
            className="media-expanded-btn"
            title="Previous Track"
            onClick={() => handleControl('prev')}
            disabled={loading}
          >
            ⏮ Prev
          </button>

          <button
            type="button"
            className="media-expanded-btn play-pause-master"
            title={media.isPlaying ? 'Pause Playback' : 'Resume Playback'}
            onClick={() => handleControl('playpause')}
            disabled={loading}
          >
            {media.isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
          </button>

          <button
            type="button"
            className="media-expanded-btn"
            title="Next Track"
            onClick={() => handleControl('next')}
            disabled={loading}
          >
            Next ⏭
          </button>

          <button
            type="button"
            className="media-expanded-btn stop-btn"
            title="Stop Playback"
            onClick={() => handleControl('stop')}
            disabled={loading}
          >
            ⏹ Stop
          </button>
        </div>

        {/* Master Volume Studio */}
        <div className="media-volume-studio">
          <div className="media-volume-header">
            <button
              type="button"
              className={`media-mute-toggle ${isMuted ? 'muted' : ''}`}
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? '🔇 MUTED' : '🔊 MASTER VOL'}
            </button>
            <span className="media-volume-percent-badge">{isMuted ? '0%' : `${volume}%`}</span>
          </div>

          <div className="media-volume-slider-row">
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(e.target.value)}
              className="media-volume-slider"
            />
            <div className="media-volume-presets">
              {[25, 50, 75, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`volume-preset-btn ${volume === preset && !isMuted ? 'active' : ''}`}
                  onClick={() => handleVolumeChange(preset)}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Direct Search & Playback Console */}
        <div className="media-search-console">
          <div className="media-section-header">
            <span>⚡ DIRECT STREAM LAUNCHER</span>
            <div className="media-target-selector">
              <button
                type="button"
                className={`target-pill ${searchTarget === 'youtube' ? 'active' : ''}`}
                onClick={() => setSearchTarget('youtube')}
              >
                🔴 YouTube
              </button>
              <button
                type="button"
                className={`target-pill ${searchTarget === 'spotify' ? 'active' : ''}`}
                onClick={() => setSearchTarget('spotify')}
              >
                🎧 Spotify
              </button>
            </div>
          </div>

          <form className="media-search-form" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="media-search-input"
              placeholder={`Enter song, artist, playlist, or topic on ${searchTarget === 'spotify' ? 'Spotify' : 'YouTube'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="media-stream-btn"
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? 'STREAMING...' : '▶ STREAM'}
            </button>
          </form>

          {searchFeedback && (
            <div className="media-feedback-alert">
              <span>◈</span> {searchFeedback}
            </div>
          )}
        </div>

        {/* Tactical Preset Radio Stations */}
        <div className="media-stations-section">
          <div className="media-section-header">
            <span>📻 TACTICAL RADIO PRESETS & CHANNELS</span>
          </div>

          <div className="media-stations-grid">
            {PRESET_STATIONS.map((st) => (
              <button
                key={st.id}
                type="button"
                className="station-card-btn"
                onClick={() => handlePresetPlay(st)}
                disabled={searching}
                title={`Play ${st.name}`}
              >
                <span className="station-icon">{st.icon}</span>
                <div className="station-info">
                  <div className="station-name">{st.name}</div>
                  <div className="station-target">{st.target.toUpperCase()}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* External Service Quick Launchers */}
        <div className="media-expanded-footer-apps">
          <button
            type="button"
            className="media-expanded-app-btn yt"
            onClick={() => handleControl('launch_youtube')}
          >
            <span>🔴</span> OPEN YOUTUBE IN BROWSER
          </button>
          <button
            type="button"
            className="media-expanded-app-btn spotify"
            onClick={() => handleControl('launch_spotify')}
          >
            <span>🎧</span> LAUNCH SPOTIFY DESKTOP APP
          </button>
        </div>
      </div>
    );
  }

  // Compact Mode (Sidebar Wings & Dashboard)
  return (
    <div className="media-card-container">
      {/* Centered HUD Header with Expand Button */}
      <div
        className="media-card-header"
        onClick={() => onOpen && onOpen()}
        title="Click to open Media Hub Studio Matrix"
      >
        <div className="media-header-left">
          <span className="media-icon-symbol">🎵</span>
          <h3 className="media-card-title">MEDIA HUB</h3>
        </div>

        <div className="media-header-right">
          <span className={`media-status-indicator ${media.isPlaying ? 'live' : 'paused'}`}>
            {media.isPlaying ? '● LIVE' : '⏸ PAUSED'}
          </span>
          <button
            type="button"
            className="widget-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpen && onOpen();
            }}
            title="Open Full Media Hub Matrix"
            aria-label="Open Media Hub Widget"
          >
            ⤢
          </button>
        </div>
      </div>

      {/* Main Track Info & Visualizer */}
      <div className="media-content-main">
        <div
          className={`media-disc-visualizer ${media.isPlaying ? 'playing' : ''}`}
          onClick={() => handleControl('playpause')}
          title="Click to Play/Pause"
          style={{ cursor: 'pointer' }}
        >
          <div className="media-disc-center" />
          <div className="media-disc-grooves" />
        </div>

        <div className="media-track-info" onClick={() => onOpen && onOpen()} style={{ cursor: 'pointer' }}>
          <div className="media-track-title" title={media.title}>
            {media.title}
          </div>
          <div className="media-track-artist" title={media.artist}>
            {media.artist}
          </div>

          <div className={`media-equalizer-bars ${media.isPlaying ? 'playing' : ''}`}>
            <div className="media-bar" />
            <div className="media-bar" />
            <div className="media-bar" />
            <div className="media-bar" />
            <div className="media-bar" />
            <div className="media-bar" />
            <div className="media-bar" />
          </div>
        </div>
      </div>

      {/* Controls Row */}
      <div className="media-controls-row">
        <div className="media-buttons-group">
          <button
            type="button"
            className="media-ctrl-btn"
            title="Previous Track"
            onClick={() => handleControl('prev')}
            disabled={loading}
          >
            ⏮
          </button>

          <button
            type="button"
            className="media-ctrl-btn play-pause-btn"
            title={media.isPlaying ? 'Pause Playback' : 'Resume Playback'}
            onClick={() => handleControl('playpause')}
            disabled={loading}
          >
            {media.isPlaying ? '⏸' : '▶'}
          </button>

          <button
            type="button"
            className="media-ctrl-btn"
            title="Next Track"
            onClick={() => handleControl('next')}
            disabled={loading}
          >
            ⏭
          </button>

          <button
            type="button"
            className="media-ctrl-btn stop-btn"
            title="Stop Playback"
            onClick={() => handleControl('stop')}
            disabled={loading}
          >
            ⏹
          </button>
        </div>

        <div className="media-external-apps-group">
          <button
            type="button"
            className="media-app-btn app-youtube-btn"
            onClick={() => handleControl('launch_youtube')}
            title="Open YouTube"
          >
            <span>🔴</span> YT
          </button>

          <button
            type="button"
            className="media-app-btn app-spotify-btn"
            onClick={() => handleControl('launch_spotify')}
            title="Open Spotify Client"
          >
            <span>🎧</span> SPOTIFY
          </button>
        </div>
      </div>

      {/* Mini Volume Bar & Matrix Expand Quicklink */}
      <div className="media-mini-volume-row">
        <button
          type="button"
          className={`mini-vol-mute-btn ${isMuted ? 'muted' : ''}`}
          onClick={handleToggleMute}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => handleVolumeChange(e.target.value)}
          className="media-mini-slider"
          title={`Volume: ${isMuted ? 0 : volume}%`}
        />
        <span className="mini-vol-val">{isMuted ? '0%' : `${volume}%`}</span>
        <button
          type="button"
          className="media-mini-matrix-btn"
          onClick={() => onOpen && onOpen()}
          title="Open Media Matrix Studio"
        >
          MATRIX ↗
        </button>
      </div>
    </div>
  );
};

export default MediaCard;
