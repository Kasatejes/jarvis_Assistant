import React, { useState, useEffect, useRef } from 'react';
import { HUDCard } from './HUDCard';
import './TacticalChrono.css';

const TacticalChrono = () => {
  const [time, setTime] = useState(new Date());
  const [millis, setMillis] = useState('000');
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [tempUnit, setTempUnit] = useState('C'); // 'C' or 'F'
  const [coords, setCoords] = useState({
    lat: '28.6139° N',
    lon: '77.2090° E',
    alt: '216M',
    city: 'STARK TOWER // SECTOR-07'
  });
  const [weather, setWeather] = useState({
    tempC: 28,
    tempF: 82,
    condition: 'ATMOSPHERE STABLE',
    subCondition: 'CLEAR SKY // VISIBILITY 10KM',
    humidity: 52,
    pressure: '1013 HPA',
    wind: '14 KM/H NW',
    uvIndex: '4.2 MOD'
  });

  const startTimeRef = useRef(Date.now());

  // High-precision clock & millisecond ticker
  useEffect(() => {
    let animFrameId;
    const updateTime = () => {
      const now = new Date();
      setTime(now);
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      setMillis(ms);
      
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setUptimeSeconds(elapsed);

      animFrameId = requestAnimationFrame(updateTime);
    };

    animFrameId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  // Geolocation & Weather probe
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
          const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
          const altStr = pos.coords.altitude ? `${Math.round(pos.coords.altitude)}M` : '185M';

          setCoords({
            lat: latStr,
            lon: lonStr,
            alt: altStr,
            city: `GRID SECTOR [${Math.abs(Math.round(lat))}.${Math.abs(Math.round(lon))}]`
          });

          // Fetch real open-meteo weather if available
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
            .then(res => res.json())
            .then(data => {
              if (data && data.current_weather) {
                const c = Math.round(data.current_weather.temperature);
                const f = Math.round((c * 9/5) + 32);
                const wind = `${Math.round(data.current_weather.windspeed)} KM/H`;
                setWeather(prev => ({
                  ...prev,
                  tempC: c,
                  tempF: f,
                  wind: wind,
                  condition: 'METEOROLOGICAL SCAN ACTIVE',
                  subCondition: 'ATMOSPHERIC SCAN VERIFIED'
                }));
              }
            })
            .catch(() => {
              // Graceful fallback to default telemetry
            });
        },
        () => {
          // Geolocation denied/unavailable: use default Stark telemetry
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Format uptime HH:MM:SS
  const formatUptime = (totalSeconds) => {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // Format date & stardate
  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');
  
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  const dayOfWeek = dayNames[time.getDay()];
  const dayNum = String(time.getDate()).padStart(2, '0');
  const monthStr = monthNames[time.getMonth()];
  const year = time.getFullYear();

  // Calculated Sci-Fi Stardate
  const dayOfYear = Math.floor((time - new Date(year, 0, 0)) / 1000 / 60 / 60 / 24);
  const stardate = `${year % 100}${String(dayOfYear).padStart(3, '0')}.${Math.floor(time.getHours() / 2.4)}`;

  return (
    <div className="tactical-chrono-panel">
      <HUDCard
        tl={true}
        tr={true}
        bl={true}
        br={true}
        cornerSize={10}
        filterWidth={260}
        filterHeight={310}
      >
        <div className="chrono-inner">
          {/* Header */}
          <div className="chrono-header">
            <span className="chrono-header-badge">CHRONO // ATMOSPHERE</span>
            <span className="chrono-ping-indicator" />
          </div>

          {/* Sci-Fi Digital Clock */}
          <div className="chrono-clock-display">
            <div className="clock-digits-row">
              <span className="clock-main">{hours}:{minutes}:{seconds}</span>
              <span className="clock-millis">.{millis}</span>
            </div>
            <div className="clock-sub-row">
              <span className="chrono-tag">{dayOfWeek} // {dayNum} {monthStr} {year}</span>
              <span className="chrono-stardate">SD {stardate}</span>
            </div>
          </div>

          {/* Telemetry Row: Mission Uptime & Timezone */}
          <div className="chrono-telemetry-strip">
            <div className="telemetry-item">
              <span className="telemetry-label">UPTIME</span>
              <span className="telemetry-val val-cyan">T+ {formatUptime(uptimeSeconds)}</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">TIMEZONE</span>
              <span className="telemetry-val">UTC{time.getTimezoneOffset() <= 0 ? '+' : '-'}{String(Math.abs(Math.floor(time.getTimezoneOffset() / 60))).padStart(2, '0')}:{String(Math.abs(time.getTimezoneOffset() % 60)).padStart(2, '0')}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="chrono-divider" />

          {/* Atmosphere & Weather Section */}
          <div className="atmosphere-section">
            <div className="atmosphere-title-row">
              <span className="atmosphere-title">ATMOSPHERIC SCAN</span>
              <button 
                className="unit-toggle-btn"
                onClick={() => setTempUnit(u => u === 'C' ? 'F' : 'C')}
                title="Toggle Temperature Unit"
              >
                °{tempUnit}
              </button>
            </div>

            <div className="atmosphere-main-grid">
              <div className="temp-badge">
                <span className="temp-number">
                  {tempUnit === 'C' ? weather.tempC : weather.tempF}
                </span>
                <span className="temp-unit">°{tempUnit}</span>
              </div>
              <div className="atmosphere-status">
                <span className="condition-highlight">{weather.condition}</span>
                <span className="condition-sub">{weather.subCondition}</span>
              </div>
            </div>

            {/* Micro atmospheric stats grid */}
            <div className="atmosphere-stats-grid">
              <div className="atmo-stat">
                <span className="atmo-stat-label">HUMIDITY</span>
                <span className="atmo-stat-val">{weather.humidity}%</span>
              </div>
              <div className="atmo-stat">
                <span className="atmo-stat-label">WIND</span>
                <span className="atmo-stat-val">{weather.wind}</span>
              </div>
              <div className="atmo-stat">
                <span className="atmo-stat-label">PRESSURE</span>
                <span className="atmo-stat-val">{weather.pressure}</span>
              </div>
              <div className="atmo-stat">
                <span className="atmo-stat-label">UV INDEX</span>
                <span className="atmo-stat-val">{weather.uvIndex}</span>
              </div>
            </div>
          </div>

          {/* Coordinates Footer */}
          <div className="chrono-coords-footer">
            <span className="coords-icon">⌖</span>
            <span className="coords-text">{coords.lat} // {coords.lon} // {coords.alt}</span>
          </div>
        </div>
      </HUDCard>
    </div>
  );
};

export default TacticalChrono;
