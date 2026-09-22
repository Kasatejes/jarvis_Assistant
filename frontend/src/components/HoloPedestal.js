import React, { useEffect, useRef } from 'react';
import './HoloPedestal.css';

const HoloPedestal = () => {
  const canvasRef = useRef(null);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    const handleSpeak = (e) => {
      isSpeakingRef.current = !!e.detail?.isSpeaking;
    };
    window.addEventListener('jarvis_user_speaking', handleSpeak);
    window.addEventListener('jarvis_assistant_speaking', handleSpeak);
    return () => {
      window.removeEventListener('jarvis_user_speaking', handleSpeak);
      window.removeEventListener('jarvis_assistant_speaking', handleSpeak);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let phase = 0;

    const renderWave = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      const active = isSpeakingRef.current;
      const ampMult = active ? 1.6 : 1.0;
      const speedMult = active ? 0.08 : 0.04;

      // Draw subtle vertical audio equalizer bars
      const numBars = 48;
      const barWidth = 3;
      const spacing = w / numBars;

      for (let i = 0; i < numBars; i++) {
        const x = i * spacing;
        // Central bell curve envelope
        const distFromCenter = Math.abs(i - numBars / 2) / (numBars / 2);
        const envelope = Math.max(0, 1 - distFromCenter * distFromCenter);

        // Sinusoidal oscillation with voice amplification
        const barH = ((Math.sin(i * 0.4 + phase) * 0.5 + 0.5) * (Math.cos(i * 0.2 - phase * 0.8) * 0.5 + 0.5) * 24 * envelope + 2) * ampMult;

        const grad = ctx.createLinearGradient(x, cy - barH, x, cy + barH);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.85)');
        grad.addColorStop(0.5, active ? 'rgba(0, 255, 204, 1.0)' : 'rgba(0, 255, 170, 0.9)');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0.85)');

        ctx.fillStyle = grad;
        ctx.fillRect(x, cy - barH / 2, barWidth, barH);
      }

      // Draw glowing central frequency wave line
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const normX = (x / w - 0.5) * 2;
        const envelope = Math.exp(-normX * normX * 2);
        const wave = ((Math.sin(x * 0.08 + phase * 2) * 7 + Math.sin(x * 0.16 - phase * 3) * 4) * envelope) * ampMult;
        const y = cy + wave;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = active ? '#00ffcc' : '#00f0ff';
      ctx.lineWidth = active ? 2.0 : 1.6;
      ctx.shadowColor = active ? '#00ffcc' : '#00f0ff';
      ctx.shadowBlur = active ? 12 : 8;
      ctx.stroke();

      phase += speedMult;
      animId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="holo-pedestal-container">
      {/* 3D Glass Platform Surface mounted to top of HUD box */}
      <div className="holo-pedestal-plate">
        <div className="plate-grid-lines" />
        <canvas ref={canvasRef} width={340} height={44} className="holo-waveform-canvas" />
        <div className="plate-front-lip" />
      </div>
    </div>
  );
};

export default HoloPedestal;
