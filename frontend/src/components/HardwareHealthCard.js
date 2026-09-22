import React, { useState, useEffect } from 'react';
import './HardwareHealthCard.css';
import { playChimeSFX } from '../utils/soundFX';

const HardwareHealthCard = () => {
  const [health, setHealth] = useState({
    battery: { percent: 100, isCharging: true, isACConnected: true, status: 'AC Power' },
    drives: [
      { drive: 'C:', totalGB: 226.6, freeGB: 49.1, usedGB: 177.5, usedPercent: 78 }
    ],
    system: { cpu: 12, ramPercent: 54, ramUsedGB: '8.6', ramTotalGB: '15.8', cores: 8, uptime: '3h 42m' }
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/hardware_health');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHealth(data);
        }
      }
    } catch (e) {
      // Backend polling fallback
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    playChimeSFX();
    await fetchHealth();
    setTimeout(() => setRefreshing(false), 500);
  };

  const { battery, drives, system } = health;

  return (
    <div className="hardware-card-container">
      <div className="hardware-card-header">
        <h3 className="hardware-card-title">
          <span>⚡</span> HARDWARE DIAGNOSTICS
        </h3>
        <button
          type="button"
          className="hardware-refresh-btn"
          title="Refresh Telemetry"
          onClick={handleRefresh}
        >
          {refreshing ? '⏳' : '🔄'}
        </button>
      </div>

      <div className="hardware-hero-grid">
        {/* Battery Telemetry */}
        <div className="hardware-stat-box">
          <div className="hardware-icon-bubble">
            {battery.isCharging ? '⚡' : '🔋'}
          </div>
          <div className="hardware-stat-text">
            <span className="hardware-stat-label">BATTERY STATUS</span>
            <span className="hardware-stat-val">{battery.percent}%</span>
            <span className="hardware-stat-sub">{battery.status}</span>
          </div>
        </div>

        {/* CPU Telemetry */}
        <div className="hardware-stat-box">
          <div className="hardware-icon-bubble">
            <span>🧠</span>
          </div>
          <div className="hardware-stat-text">
            <span className="hardware-stat-label">CPU CORE LOAD</span>
            <span className="hardware-stat-val">{system.cpu}%</span>
            <span className="hardware-stat-sub">{system.cores} Logic Cores</span>
          </div>
        </div>
      </div>

      {/* Logical Storage Drives */}
      <div className="hardware-drives-section">
        {(drives || []).map((d) => (
          <div key={d.drive} className="hardware-drive-item">
            <div className="hardware-drive-header">
              <span className="hardware-drive-name">
                <span>💾</span> Local Disk ({d.drive})
              </span>
              <span className="hardware-drive-size">
                {d.freeGB} GB free of {d.totalGB} GB ({d.usedPercent}%)
              </span>
            </div>
            <div className="hardware-progress-track">
              <div
                className={`hardware-progress-bar ${d.usedPercent > 85 ? 'warning' : ''}`}
                style={{ width: `${Math.min(100, d.usedPercent)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Tags */}
      <div className="hardware-footer-tags">
        <span className="hardware-tag">RAM: {system.ramUsedGB} / {system.ramTotalGB} GB ({system.ramPercent}%)</span>
        <span className="hardware-tag">UPTIME: {system.uptime}</span>
        <span className="hardware-tag">AC FEED: {battery.isACConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
      </div>
    </div>
  );
};

export default HardwareHealthCard;
