import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// --- GLSL noise / fbm (shared by the plasma shader) ---
const noiseFunctions = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec3 p) {
    float total = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 3; i++) {
      total += snoise(p * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return total;
  }
`;

export default function VoiceReactiveBlob({ color, glowColor = '#00f0ff', size = 340 }) {
  const activeColor = color || glowColor || '#00f0ff';
  const mountRef = useRef(null);
  const audioStateRef = useRef({ analyser: null, dataArray: null, audioCtx: null, stream: null, volume: 0 });
  const [micStatus, setMicStatus] = useState('idle'); // idle | requesting | active | denied

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('jarvis_mic_status', { detail: micStatus }));
  }, [micStatus]);

  // References to update uniforms dynamically
  const shellBackMatRef = useRef();
  const shellFrontMatRef = useRef();
  const plasmaMatRef = useRef();
  const pointLightRef = useRef();

  // Dynamic Color Prop Effect
  useEffect(() => {
    if (!activeColor) return;
    try {
      const baseColor = new THREE.Color(activeColor);
      const colorDeep = baseColor.clone().multiplyScalar(0.12);
      const colorMid = baseColor.clone().multiplyScalar(0.65);

      const colorAccent = new THREE.Color();
      const hsl = {};
      baseColor.getHSL(hsl);
      colorAccent.setHSL((hsl.h + 0.15) % 1.0, hsl.s, hsl.l);

      if (shellBackMatRef.current) {
        shellBackMatRef.current.uniforms.uColor.value.copy(colorDeep);
      }
      if (shellFrontMatRef.current) {
        shellFrontMatRef.current.uniforms.uColor.value.copy(colorMid);
      }
      if (plasmaMatRef.current) {
        plasmaMatRef.current.uniforms.uColorDeep.value.copy(colorDeep);
        plasmaMatRef.current.uniforms.uColorMid.value.copy(colorMid);
        plasmaMatRef.current.uniforms.uColorBright.value.copy(colorAccent);
      }
      if (pointLightRef.current) {
        pointLightRef.current.color.copy(baseColor);
      }
    } catch (e) {
      console.error('Error updating Three.js colors:', e);
    }
  }, [activeColor]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const currentAudioState = audioStateRef.current;

    let width = mount.clientWidth || 400;
    let height = mount.clientHeight || 400;

    // --- SCENE ---
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.z = 2.4;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    mount.appendChild(renderer.domElement);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Initial Color Calculations
    const baseColor = new THREE.Color(activeColor);
    const colorDeep = baseColor.clone().multiplyScalar(0.12);
    const colorMid = baseColor.clone().multiplyScalar(0.65);
    const colorAccent = new THREE.Color();
    const hsl = {};
    baseColor.getHSL(hsl);
    colorAccent.setHSL((hsl.h + 0.15) % 1.0, hsl.s, hsl.l);

    const pointLight = new THREE.PointLight(baseColor, 2.0, 10);
    pointLightRef.current = pointLight;
    mainGroup.add(pointLight);

    // --- SHELL ---
    const shellGeo = new THREE.SphereGeometry(1.0, 64, 64);
    const shellShader = {
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        uniform vec3 uColor;
        uniform float uOpacity;
        void main() {
          float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(vViewPosition)), 2.5);
          gl_FragColor = vec4(uColor, fresnel * uOpacity);
        }
      `
    };

    const shellBackMat = new THREE.ShaderMaterial({
      vertexShader: shellShader.vertexShader,
      fragmentShader: shellShader.fragmentShader,
      uniforms: { uColor: { value: colorDeep }, uOpacity: { value: 0.3 } },
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false
    });
    shellBackMatRef.current = shellBackMat;

    const shellFrontMat = new THREE.ShaderMaterial({
      vertexShader: shellShader.vertexShader,
      fragmentShader: shellShader.fragmentShader,
      uniforms: { uColor: { value: colorMid }, uOpacity: { value: 0.41 } },
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.FrontSide, depthWrite: false
    });
    shellFrontMatRef.current = shellFrontMat;

    mainGroup.add(new THREE.Mesh(shellGeo, shellBackMat));
    mainGroup.add(new THREE.Mesh(shellGeo, shellFrontMat));

    // --- PLASMA ---
    const plasmaGeo = new THREE.SphereGeometry(0.998, 128, 128);
    const plasmaMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 0.2 },
        uBrightness: { value: 1.31 },
        uThreshold: { value: 0.09 },
        uColorDeep: { value: colorDeep },
        uColorMid: { value: colorMid },
        uColorBright: { value: colorAccent }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uScale;
        uniform float uBrightness;
        uniform float uThreshold;
        uniform vec3 uColorDeep;
        uniform vec3 uColorMid;
        uniform vec3 uColorBright;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        ${noiseFunctions}
        void main() {
          vec3 p = vPosition * uScale;
          vec3 q = vec3(
            fbm(p + vec3(0.0, uTime * 0.05, 0.0)),
            fbm(p + vec3(5.2, 1.3, 2.8) + uTime * 0.05),
            fbm(p + vec3(2.2, 8.4, 0.5) - uTime * 0.02)
          );
          float density = fbm(p + 2.0 * q);
          float t = (density + 0.4) * 0.8;
          float alpha = smoothstep(uThreshold, 0.7, t);
          vec3 cWhite = vec3(1.0, 1.0, 1.0);
          vec3 color = mix(uColorDeep, uColorMid, smoothstep(uThreshold, 0.5, t));
          color = mix(color, uColorBright, smoothstep(0.5, 0.8, t));
          color = mix(color, cWhite, smoothstep(0.8, 1.0, t));
          float facing = dot(normalize(vNormal), normalize(vViewPosition));
          float depthFactor = (facing + 1.0) * 0.5;
          float finalAlpha = alpha * (0.02 + 0.98 * depthFactor);
          gl_FragColor = vec4(color * uBrightness, finalAlpha);
        }
      `,
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
    });
    plasmaMatRef.current = plasmaMat;

    const plasmaMesh = new THREE.Mesh(plasmaGeo, plasmaMat);
    mainGroup.add(plasmaMesh);

    // --- PARTICLES ---
    const pCount = 500;
    const pPos = new Float32Array(pCount * 3);
    const pSizes = new Float32Array(pCount);
    const sphereRadius = 0.95;
    for (let i = 0; i < pCount; i++) {
      const r = sphereRadius * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = r * Math.cos(phi);
      pSizes[i] = Math.random();
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));

    const pMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xffffff) } },
      vertexShader: `
        uniform float uTime;
        attribute float aSize;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          pos.y += sin(uTime * 0.2 + pos.x) * 0.02;
          pos.x += cos(uTime * 0.15 + pos.z) * 0.02;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          float baseSize = 8.0 * aSize + 4.0;
          gl_PointSize = baseSize * (1.0 / -mvPosition.z);
          vAlpha = 0.8 + 0.2 * sin(uTime + aSize * 10.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;
          float glow = 1.0 - (dist * 2.0);
          glow = pow(glow, 1.8);
          gl_FragColor = vec4(uColor, glow * vAlpha);
        }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });

    const particles = new THREE.Points(pGeo, pMat);
    mainGroup.add(particles);

    // --- RESIZE HANDLING (container-based) ---
    const resizeObserver = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(mount);

    // --- ANIMATION LOOP (mic-reactive) ---
    const clock = new THREE.Clock();
    let rafId;
    let smoothedVolume = 0;
    let displayScale = 1;

    function getVolume() {
      const a = audioStateRef.current;
      if (!a.analyser || !a.dataArray) {
        return 0; // Handled directly in animate breathing
      }
      a.analyser.getByteTimeDomainData(a.dataArray);
      let maxVal = 0;
      for (let i = 0; i < a.dataArray.length; i++) {
        const val = Math.abs(a.dataArray[i] - 128); // 128 is center silence
        if (val > maxVal) maxVal = val;
      }
      return maxVal / 128.0; // Peak amplitude 0..1
    }

    // Track speech state for voice-reactive pulsation
    const isUserSpeakingRef = { current: false };
    const isAssistantSpeakingRef = { current: false };

    const handleUserSpeaking = (e) => {
      isUserSpeakingRef.current = !!e?.detail?.isSpeaking;
    };
    const handleAssistantSpeaking = (e) => {
      isAssistantSpeakingRef.current = !!e?.detail?.isSpeaking;
    };

    window.addEventListener('jarvis_user_speaking', handleUserSpeaking);
    window.addEventListener('jarvis_assistant_speaking', handleAssistantSpeaking);

    function animate() {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      const rawVolume = getVolume();
      // smooth the volume so scale changes feel organic, not jittery
      smoothedVolume += (rawVolume - smoothedVolume) * 0.22;
      audioStateRef.current.volume = smoothedVolume;

      let targetScale = 1.0;

      if (isUserSpeakingRef.current) {
        // Active speaking swell & pulse: orb dynamically expands bigger and smaller
        // Multi-frequency wave creates an organic, pulsating vocal cadence
        const voiceRhythm = 
          Math.sin(t * 6.5) * 0.16 + 
          Math.cos(t * 12.0) * 0.08 + 
          Math.sin(t * 3.2) * 0.06;
        
        // Target scale swells rhythmically between ~1.0x and 1.38x+
        const volumeFactor = Math.max(smoothedVolume * 2.0, 0);
        targetScale = 1.18 + voiceRhythm + volumeFactor;

        // Core plasma & lights pulse dynamically in sync
        plasmaMat.uniforms.uTime.value = t * 2.8;
        plasmaMat.uniforms.uBrightness.value = 1.5 + Math.sin(t * 6.5) * 0.45;
        plasmaMat.uniforms.uThreshold.value = 0.04;
        
        if (pointLightRef.current) {
          pointLightRef.current.intensity = 3.2 + Math.sin(t * 6.5) * 1.5;
        }

        plasmaMesh.rotation.y = t * 0.18;
        mainGroup.rotation.x += 0.005;
        mainGroup.rotation.y += 0.009;
      } else if (isAssistantSpeakingRef.current) {
        // Assistant TTS cadence
        const assistantPulse = Math.sin(t * 5.5) * 0.10 + Math.sin(t * 10.0) * 0.05;
        targetScale = 1.10 + assistantPulse;
        plasmaMat.uniforms.uTime.value = t * 1.8;
        plasmaMat.uniforms.uBrightness.value = 1.35 + Math.sin(t * 5.5) * 0.25;
        if (pointLightRef.current) {
          pointLightRef.current.intensity = 2.4 + Math.sin(t * 5.5) * 0.8;
        }
        plasmaMesh.rotation.y = t * 0.12;
        mainGroup.rotation.x += 0.003;
        mainGroup.rotation.y += 0.005;
      } else if (audioStateRef.current.analyser) {
        // Listening pulse when microphone is active but silent
        targetScale = 1.0 + 0.03 * Math.sin(t * 2.8) + smoothedVolume * 1.2;
        plasmaMat.uniforms.uTime.value = t * (1.0 + smoothedVolume * 1.5);
        plasmaMat.uniforms.uBrightness.value = 1.1 + smoothedVolume * 1.8;
        plasmaMat.uniforms.uThreshold.value = Math.max(0.02, 0.14 - smoothedVolume * 0.15);
        if (pointLightRef.current) {
          pointLightRef.current.intensity = 2.0;
        }
        plasmaMesh.rotation.y = t * 0.08;
        mainGroup.rotation.x += 0.0018 + smoothedVolume * 0.008;
        mainGroup.rotation.y += 0.0035 + smoothedVolume * 0.01;
      } else {
        // Idle heartbeat pulse
        targetScale = 0.96 + 0.05 * Math.sin(t * 1.6);
        plasmaMat.uniforms.uTime.value = t;
        plasmaMat.uniforms.uBrightness.value = 1.1;
        plasmaMat.uniforms.uThreshold.value = 0.09;
        if (pointLightRef.current) {
          pointLightRef.current.intensity = 2.0;
        }
        plasmaMesh.rotation.y = t * 0.08;
        mainGroup.rotation.x += 0.0018;
        mainGroup.rotation.y += 0.0035;
      }

      displayScale += (targetScale - displayScale) * 0.25;
      mainGroup.scale.setScalar(displayScale);

      pMat.uniforms.uTime.value = t;

      renderer.render(scene, camera);
    }
    animate();

    // --- CLEANUP ---
    return () => {
      window.removeEventListener('jarvis_user_speaking', handleUserSpeaking);
      window.removeEventListener('jarvis_assistant_speaking', handleAssistantSpeaking);

      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      mount.removeChild(renderer.domElement);

      shellGeo.dispose();
      shellBackMat.dispose();
      shellFrontMat.dispose();
      plasmaGeo.dispose();
      plasmaMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      renderer.dispose();

      const a = currentAudioState;
      if (a.stream) a.stream.getTracks().forEach((track) => track.stop());
      if (a.audioCtx && a.audioCtx.state !== 'closed') a.audioCtx.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enableMicrophone = async () => {
    setMicStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioStateRef.current.analyser = analyser;
      audioStateRef.current.dataArray = new Uint8Array(analyser.fftSize);
      audioStateRef.current.audioCtx = audioCtx;
      audioStateRef.current.stream = stream;

      setMicStatus('active');
    } catch (err) {
      setMicStatus('denied');
    }
  };

  // Attempt auto-activation of Web Audio mic on mount or on first interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      enableMicrophone();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });

    enableMicrophone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: '50%' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      {/* Central Holographic J.A.R.V.I.S. Emblem Overlay */}
      <div
        className="core-jarvis-emblem"
        style={{
          color: activeColor,
          textShadow: `0 0 16px ${activeColor}`,
          fontSize: '18px',
          fontWeight: 900,
          letterSpacing: '4px'
        }}
      >
        J.A.R.V.I.S
      </div>
    </div>
  );
}
