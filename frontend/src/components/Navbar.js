import React, { useState, useEffect, useRef } from 'react';
import './Navbar.css';

const Navbar = ({ onOpenSettings, onOpenVision, currentTheme, onSelectTheme, sfxMuted, onToggleSFX, activeNav = 'Home', onSelectNav }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const themeRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (themeRef.current && !themeRef.current.contains(event.target)) {
        setShowThemes(false);
      }
    };
    if (showThemes) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThemes]);

  const menuItems = [
    { name: 'Home', link: '#home' },
    { name: 'Dashboard', link: '#dashboard' },
    { name: 'Settings', link: '#settings' },
    { name: 'About', link: '#about' }
  ];

  const themes = [
    { id: 'cyan', name: 'Stark Cyan', color: '#00f0ff' },
    { id: 'cyberpunk', name: 'Cyber Amber', color: '#ffb700' },
    { id: 'purple', name: 'Quantum Purple', color: '#b026ff' },
    { id: 'crimson', name: 'Emergency Crimson', color: '#ff2a6d' }
  ];

  const handleNavClick = (itemName, e) => {
    if (onSelectNav) onSelectNav(itemName);
    setIsOpen(false);
    
    if (itemName === 'Settings' && onOpenSettings) {
      e.preventDefault();
      onOpenSettings();
    }
  };

  return (
    <div className="navbar-container">
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        {/* Futuristic BRAND logo section */}
        <a href="#home" className="nav-brand" onClick={(e) => handleNavClick('Home', e)}>
          <div className="brand-icon-wrapper">
            <div className="brand-circle"></div>
            <div className="brand-circle-inner"></div>
            <div className="brand-glow-dot"></div>
          </div>
          <span className="brand-name">J.A.R.V.I.S</span>
        </a>

        {/* Hamburger toggle button for mobile */}
        <button 
          className={`mobile-toggle ${isOpen ? 'open' : ''}`} 
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Liquid Glass Navigation Menu Items */}
        <ul className={`nav-menu ${isOpen ? 'open' : ''}`}>
          {menuItems.map((item) => (
            <li className="nav-item" key={item.name}>
              <a
                href={item.link}
                className={`nav-link ${activeNav === item.name ? 'active' : ''}`}
                onClick={(e) => handleNavClick(item.name, e)}
              >
                {item.name}
              </a>
            </li>
          ))}
        </ul>

        {/* Theme and SFX controls */}
        <div className="nav-controls desktop-only">
          {/* SFX Mute/Unmute toggle */}
          <button
            className={`sfx-toggle-btn ${sfxMuted ? 'muted' : ''}`}
            onClick={onToggleSFX}
            title={sfxMuted ? 'Enable Sound FX' : 'Mute Sound FX'}
          >
            {sfxMuted ? '🔇 SFX OFF' : '🔊 SFX ON'}
          </button>

          {/* HUD Visual Theme Dropdown */}
          <div className="theme-dropdown-wrapper" ref={themeRef}>
            <button
              className="theme-select-btn"
              onClick={() => setShowThemes(!showThemes)}
              title="Change Arc Theme"
            >
              <span className="theme-dot" style={{ background: themes.find(t => t.id === currentTheme)?.color || '#00f0ff' }}></span>
              THEME
            </button>
            {showThemes && (
              <div className="theme-menu">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    className={`theme-option ${currentTheme === t.id ? 'active' : ''}`}
                    onClick={() => {
                      onSelectTheme(t.id);
                      setShowThemes(false);
                    }}
                  >
                    <span className="theme-dot" style={{ background: t.color }}></span>
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Holographic Optical Vision Scanner Toggle Button */}
          <button
            className="vision-nav-btn"
            onClick={onOpenVision}
            title="Launch Optical Scanner & Screen Vision AI"
          >
            <span className="vision-nav-dot"></span>
            <span>👁️ SCANNER</span>
          </button>

          <div className="nav-cta">
            <button className="cta-button" onClick={onOpenVision} title="Open Optical Scanner & Vision HUD">
              <span className="cta-icon"></span>
              Core Access
              <div className="cta-button-glow"></div>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
