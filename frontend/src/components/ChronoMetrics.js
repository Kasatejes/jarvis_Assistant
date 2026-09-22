import React, { useState, useEffect } from 'react';
import { HUDCard } from './HUDCard';
import './ChronoMetrics.css';

const ChronoMetrics = ({ onOpen }) => {
  const [timeStr, setTimeStr] = useState('');
  const [ampm, setAmpm] = useState('AM');
  const [telemetry, setTelemetry] = useState({
    cpu: 24,
    ramPercent: 52,
    cores: 16,
    uptime: '1h 00m'
  });

  // Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const currentAmpm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const hStr = String(hours).padStart(2, '0');
      const mStr = String(now.getMinutes()).padStart(2, '0');
      const sStr = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${hStr}:${mStr}:${sStr}`);
      setAmpm(currentAmpm);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live hardware telemetry from backend
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/system_stats');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTelemetry({
              cpu: typeof data.cpu === 'number' ? data.cpu : 24,
              ramPercent: typeof data.ramPercent === 'number' ? data.ramPercent : 52,
              cores: data.cores || 8,
              uptime: data.uptime || 'Active'
            });
          }
        }
      } catch (e) {
        // Backend polling fallback
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 4000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthStr = monthNames[now.getMonth()];
  const yearStr = now.getFullYear();

  // Dynamic sci-fi stardate calculation
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
  const stardateDecimal = Math.floor(now.getHours() / 2.4);
  const stardate = `${yearStr % 100}${String(dayOfYear).padStart(3, '0')}.${stardateDecimal}`;

  return (
    <div className="chrono-metrics-card">
      <HUDCard
        tl={true}
        tr={true}
        bl={true}
        br={true}
        cornerSize={8}
        filterWidth={260}
        filterHeight={145}
      >
        <div className="chrono-metrics-inner">
          {/* Header with Expand Button */}
          <div 
            className="chrono-metrics-header" 
            onClick={() => onOpen && onOpen()} 
            title="Click to open system metrics widget"
          >
            <span>CHRONO // SYSTEM METRICS</span>
            <button 
              className="widget-expand-btn" 
              onClick={(e) => { e.stopPropagation(); onOpen && onOpen(); }} 
              title="Open System Metrics Widget"
              aria-label="Open Chrono Widget"
            >
              ⤢
            </button>
          </div>

          {/* Clock Display */}
          <div className="clock-large-row">
            <span className="clock-large-time">{timeStr || '11:51:33'}</span>
            <span className="clock-large-ampm">{ampm}</span>
          </div>

          {/* Stardate / Calendar Row */}
          <div className="metrics-date-row">
            <span className="date-left">ST/T // {dayStr} {monthStr} {yearStr}</span>
            <span className="date-right">SD // {stardate}</span>
          </div>

          {/* 3 Live Telemetry Progress Bars */}
          <div className="metrics-bars-list">
            <div className="metric-bar-item">
              <span className="metric-bar-label">CPU LOAD</span>
              <div className="metric-bar-track">
                <div 
                  className="metric-bar-fill fill-cyan" 
                  style={{ width: `${Math.min(100, Math.max(4, telemetry.cpu))}%` }} 
                />
              </div>
              <span className="metric-bar-val">{telemetry.cpu}%</span>
            </div>

            <div className="metric-bar-item">
              <span className="metric-bar-label">RAM USAGE</span>
              <div className="metric-bar-track">
                <div 
                  className="metric-bar-fill fill-cyan" 
                  style={{ width: `${Math.min(100, Math.max(4, telemetry.ramPercent))}%` }} 
                />
              </div>
              <span className="metric-bar-val">{telemetry.ramPercent}%</span>
            </div>

            <div className="metric-bar-item">
              <span className="metric-bar-label">ACTIVE CORES</span>
              <div className="metric-bar-track">
                <div 
                  className="metric-bar-fill fill-cyan" 
                  style={{ width: '100%' }} 
                />
              </div>
              <span className="metric-bar-val">{telemetry.cores} THREADS</span>
            </div>
          </div>
        </div>
      </HUDCard>
    </div>
  );
};

export default ChronoMetrics;
