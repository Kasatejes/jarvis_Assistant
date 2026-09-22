import React, { useEffect, useRef } from 'react';
import './AnimatedBackground.css';
import bgVideo from '../images/WhatsAppVideo.mp4';

const AnimatedBackground = () => {
  const videoWrapperRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Smooth mouse parallax on the video background wrapper
  useEffect(() => {
    let animationFrameId;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      targetX = (e.clientX / innerWidth - 0.5) * 2;
      targetY = (e.clientY / innerHeight - 0.5) * 2;
    };

    const animateParallax = () => {
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;

      if (videoWrapperRef.current) {
        const moveX = -currentX * 14;
        const moveY = -currentY * 14;
        const rotateX = currentY * 0.8;
        const rotateY = -currentX * 0.8;

        videoWrapperRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(${moveX}px, ${moveY}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(animateParallax);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    animationFrameId = requestAnimationFrame(animateParallax);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Ensure video plays continuously across all browsers
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback: muted autoplay is allowed
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, []);

  // Cybernetic Canvas Particle Field Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Generate floating digital particles
    const particleCount = Math.min(Math.floor(window.innerWidth / 40), 45);
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.2 - Math.random() * 0.4, // gentle upward drift
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        pulseSpeed: 0.015 + Math.random() * 0.02,
        hue: Math.random() > 0.3 ? 185 : 210 // cyan or electric blue
      });
    }

    let time = 0;
    const render = () => {
      time += 0.03;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connecting holographic lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 90) {
            const lineAlpha = (1 - dist / 90) * 0.12;
            ctx.strokeStyle = `rgba(0, 240, 255, ${lineAlpha})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw and update each particle
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges seamlessly
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        const dynamicAlpha = Math.max(0.1, p.alpha + Math.sin(time + i) * 0.2);

        // Particle Glow
        ctx.shadowBlur = 6;
        ctx.shadowColor = `hsl(${p.hue}, 100%, 65%)`;

        ctx.fillStyle = `hsla(${p.hue}, 100%, 75%, ${dynamicAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="animated-bg-container" aria-hidden="true">
      {/* Moving Looping Video Layer with 3D Parallax */}
      <div ref={videoWrapperRef} className="animated-bg-video-wrapper">
        <video
          ref={videoRef}
          className="animated-bg-video"
          src={bgVideo}
          autoPlay
          loop
          muted
          playsInline
        />
      </div>

      {/* Cyber Circuit Pulsing Aura */}
      <div className="animated-bg-aurora" />

      {/* Cyber Particle Field */}
      <canvas ref={canvasRef} className="animated-bg-canvas" />

      {/* Hologram Scanline Sweeper */}
      <div className="animated-bg-scanline" />

      {/* Vignette Layer */}
      <div className="animated-bg-vignette" />
    </div>
  );
};

export default AnimatedBackground;
