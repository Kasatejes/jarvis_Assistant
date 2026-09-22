import React, { useState, useEffect } from 'react';
import { HUDCard } from './HUDCard';
import './SystemStatsCard.css';

const SystemStatsCard = ({ onOpen }) => {
  const [stats, setStats] = useState({
    cpu: 18,
    ramPercent: 42,
    ramUsedGB: '6.7',
    ramTotalGB: '16.0',
    uptime: '4h 12m',
    cores: 8
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/system_stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data);
        }
      }
    } catch (e) {
      console.warn('[SystemStatsCard] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate SVG dashoffset for CPU Gauge
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.cpu / 100) * circumference;

  return (
    <div className="system-stats-card-wrapper">
      <HUDCard
        tl={true}
        tr={true}
        bl={true}
        br={true}
        cornerSize={8}
        filterWidth={260}
        filterHeight={118}
      >
        <div className="system-stats-inner">
          <div 
            className="system-stats-header" 
            onClick={() => onOpen && onOpen()}
            title="Click to open system telemetry"
          >
            <div className="system-stats-title">
              <span className="pulse-icon"></span>
              SYSTEM TELEMETRY
            </div>
            <div className="system-stats-actions">
              <span className="system-stats-badge">LIVE</span>
              <button 
                className="widget-expand-btn" 
                onClick={(e) => { e.stopPropagation(); onOpen && onOpen(); }} 
                title="Open Telemetry Details"
                aria-label="Open Telemetry Widget"
              >
                ⤢
              </button>
            </div>
          </div>

      <div className="stats-container">
        {/* CPU Circular Gauge */}
        <div className="stat-gauge-wrapper">
          <svg className="gauge-svg" width="58" height="58" viewBox="0 0 100 100">
            <circle className="gauge-bg" cx="50" cy="50" r={radius} />
            <circle
              className="gauge-fill"
              cx="50"
              cy="50"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="gauge-text">
            <span className="gauge-value">{stats.cpu}%</span>
            <span className="gauge-label">CPU</span>
          </div>
        </div>

        {/* RAM & Uptime metrics */}
        <div className="stat-details">
          <div className="stat-row">
            <div className="stat-label">
              <span>RAM USAGE</span>
              <span>{stats.ramUsedGB} / {stats.ramTotalGB} G</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${stats.ramPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="stat-row dual-stat">
            <div className="mini-stat">
              <span className="mini-label">UPTIME</span>
              <span className="mini-val">{stats.uptime}</span>
            </div>
            <div className="mini-stat">
              <span className="mini-label">CORES</span>
              <span className="mini-val">{stats.cores} THREADS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </HUDCard>
</div>
);
};

export default SystemStatsCard;
