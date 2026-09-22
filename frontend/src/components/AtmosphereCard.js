import React, { useState, useEffect } from 'react';
import { HUDCard } from './HUDCard';
import './AtmosphereCard.css';

// Futuristic Cyber Cloud Weather Icon
const CyberCloudIcon = ({ condition = '' }) => {
  const condUpper = condition.toUpperCase();
  const isRain = condUpper.includes('DRIZZLE') || condUpper.includes('RAIN') || condUpper.includes('SHOWER');
  const isStorm = condUpper.includes('THUNDER');
  const isSnow = condUpper.includes('SNOW');

  return (
    <div className="atmo-cloud-symbol-box" title={condition}>
      <svg className="atmo-cloud-svg" viewBox="0 0 36 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cyberCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0066cc" stopOpacity="0.3" />
          </linearGradient>
          <filter id="cyberCloudGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="1.8" result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
        </defs>

        {/* Cloud Body Shape */}
        <path
          d="M10.5 21h15a5 5 0 0 0 1.5-9.8 6.8 6.8 0 0 0-12.8-2A5.2 5.2 0 0 0 10.5 21z"
          fill="url(#cyberCloudGrad)"
          stroke="#00f0ff"
          strokeWidth="1.4"
          filter="url(#cyberCloudGlow)"
        />

        {/* High-tech internal circuitry points */}
        <circle cx="16" cy="14" r="1.3" fill="#ffffff" />
        <circle cx="21" cy="15.5" r="1.1" fill="#00ffaa" />
        <line x1="16" y1="14" x2="21" y2="15.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" strokeDasharray="1 1" />

        {/* Neon rain streams if rainy/drizzle */}
        {isRain && (
          <g className="atmo-rain-streaks" stroke="#00f0ff" strokeWidth="1.3" strokeLinecap="round">
            <line x1="13" y1="23" x2="11" y2="27" />
            <line x1="18" y1="23" x2="16" y2="27" />
            <line x1="23" y1="23" x2="21" y2="27" />
          </g>
        )}

        {/* Cyber lightning bolt if thunderstorm */}
        {isStorm && (
          <polygon points="19,20 16,24 19,24 17,28 22,23 19,23" fill="#ffea00" filter="url(#cyberCloudGlow)" />
        )}

        {/* Snow dots if snowing */}
        {isSnow && (
          <g fill="#ffffff">
            <circle cx="13" cy="24" r="0.9" />
            <circle cx="18" cy="26" r="0.9" />
            <circle cx="23" cy="24" r="0.9" />
          </g>
        )}
      </svg>
    </div>
  );
};

const AtmosphereCard = ({ onOpen }) => {
  const [weather, setWeather] = useState({
    city: 'YOUR LOCATION',
    temp: 28,
    wind: '12 KM/H',
    humidity: '52%',
    pressure: '1014',
    condition: 'OPTIMAL',
    daysData: [
      { day: 'Sun', temp: 24 },
      { day: 'Mon', temp: 26 },
      { day: 'Tue', temp: 28 },
      { day: 'Wed', temp: 31 },
      { day: 'Thu', temp: 29 },
      { day: 'Fri', temp: 27 },
      { day: 'Sat', temp: 25 }
    ]
  });

  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async (coords = null) => {
      try {
        let url = 'http://localhost:5000/api/weather';
        if (coords?.lat && coords?.lon) {
          url += `?lat=${coords.lat}&lon=${coords.lon}`;
        }
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && isMounted) {
          const mappedDays = (data.forecast && data.forecast.length > 0)
            ? data.forecast.map(f => ({ day: f.day, temp: f.maxTemp }))
            : weather.daysData;

          setWeather({
            city: (data.city || 'YOUR LOCATION').toUpperCase(),
            temp: data.current.temperature,
            wind: `${data.current.windSpeed} KM/H`,
            humidity: `${data.current.humidity}%`,
            pressure: `${data.current.pressure}`,
            condition: (data.current.condition || 'CLEAR').toUpperCase(),
            daysData: mappedDays
          });
        }
      } catch (err) {
        console.warn('[AtmosphereCard] Live weather fetch error:', err);
      }
    };

    // Attempt browser geolocation first for local accuracy; fallback to IP on server
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          fetchWeather();
        },
        { timeout: 5000 }
      );
    } else {
      fetchWeather();
    }

    // Refresh every 10 minutes
    const timer = setInterval(() => {
      fetchWeather();
    }, 10 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const daysData = weather.daysData;

  // Dynamically compute min and max for responsive SVG coordinate space
  const allTemps = daysData.map(d => d.temp);
  const minT = Math.min(...allTemps, 0) - 2;
  const maxT = Math.max(...allTemps, 30) + 4;
  const svgWidth = 250;
  const svgHeight = 42;
  const padX = 14;

  const points = daysData.map((d, i) => {
    const x = padX + (i * (svgWidth - padX * 2)) / Math.max(daysData.length - 1, 1);
    const range = (maxT - minT) || 1;
    const norm = (d.temp - minT) / range;
    const y = svgHeight - 6 - norm * (svgHeight - 16);
    return { x, y, temp: d.temp, day: d.day };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`
    : '';

  return (
    <div className="atmosphere-hud-card">
      <HUDCard
        tl={true}
        tr={true}
        bl={true}
        br={true}
        cornerSize={10}
        filterWidth={290}
        filterHeight={285}
      >
        <div className="atmosphere-hud-inner">
          {/* Centered HUD Header with Expand Button */}
          <div 
            className="atmosphere-hud-header" 
            onClick={() => onOpen && onOpen()} 
            title="Click to open full weather telemetry"
          >
            <div className="atmo-header-title-wrap">
              <span className="atmo-header-dot">◈</span>
              <span className="atmo-header-text">WEATHER // {weather.city}</span>
              <span className="atmo-header-dot">◈</span>
            </div>
            <button 
              className="widget-expand-btn" 
              onClick={(e) => { e.stopPropagation(); onOpen && onOpen(); }} 
              title="Open Widget Telemetry"
              aria-label="Open Weather Widget"
            >
              ⤢
            </button>
          </div>

          {/* Hero Weather Row: Cloud Symbol on Left & Current Temp on Right */}
          <div className="atmo-hero-row">
            <div className="atmo-hero-left">
              <CyberCloudIcon condition={weather.condition} />
              <div className="atmo-condition-info">
                <span className="atmo-condition-name">{weather.condition}</span>
                <span className="atmo-condition-badge">LIVE SENSORS</span>
              </div>
            </div>

            <div className="atmo-hero-right">
              <div className="atmo-temp-display">
                <span className="atmo-temp-num">{weather.temp}</span>
                <span className="atmo-temp-unit">°C</span>
              </div>
              <span className="atmo-temp-label">CURRENT TEMP</span>
            </div>
          </div>

          {/* 3 Metric Columns */}
          <div className="atmo-tri-columns">
            <div className="atmo-col">
              <span className="atmo-col-label">WIND</span>
              <div className="atmo-col-icon">🍃</div>
              <span className="atmo-col-val">{weather.wind}</span>
              <span className="atmo-col-sub">SPEED</span>
            </div>

            <div className="atmo-col">
              <span className="atmo-col-label">HUMIDITY</span>
              <div className="atmo-col-icon">💧</div>
              <span className="atmo-col-val">{weather.humidity}</span>
              <span className="atmo-col-sub">HUM</span>
            </div>

            <div className="atmo-col">
              <span className="atmo-col-label">PRESSURE</span>
              <div className="atmo-col-icon">🧭</div>
              <span className="atmo-col-val">{weather.pressure}</span>
              <span className="atmo-col-sub">HPA</span>
            </div>
          </div>

          {/* 7-Day Temperature Chart Section */}
          <div className="atmo-chart-section">
            <div className="chart-header">
              <span className="chart-header-title">7-DAY FORECAST</span>
              <span className="chart-header-status">ATMOSPHERIC TREND</span>
            </div>

            {/* SVG Sparkline Graph */}
            <div className="svg-chart-wrapper">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="temp-sparkline-svg">
                <defs>
                  <linearGradient id="atmoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area Fill */}
                {areaD && <path d={areaD} fill="url(#atmoGrad)" />}
                {/* Connecting Line */}
                {pathD && <path d={pathD} fill="none" stroke="#00f0ff" strokeWidth="1.6" filter="drop-shadow(0 0 4px #00f0ff)" />}
                {/* Data Points and Value Text */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.y} r="2.5" fill="#ffffff" stroke="#00f0ff" strokeWidth="1.2" />
                    <text x={p.x} y={p.y - 4} textAnchor="middle" fontSize="6.5" fill="#00ffcc" fontFamily="Orbitron, monospace" fontWeight="600">
                      {p.temp}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Weekday Labels */}
            <div className="chart-days-row">
              {daysData.map((d, idx) => (
                <span key={idx} className="chart-day-label">{d.day}</span>
              ))}
            </div>
          </div>
        </div>
      </HUDCard>
    </div>
  );
};

export default AtmosphereCard;
