import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// =====================================================================
// <ParticleOrb /> — Orbe de partículas vibrando con el sonido (Three.js).
//
// Nube de ~2600 partículas sobre una esfera; se deforman con ruido +
// el volumen del audio (voz del Oráculo o micrófono). Núcleo vivo de
// Ómicron. Encapsulado en un <div> propio, con limpieza estricta (sin
// fugas de memoria) y responsividad.
// =====================================================================

export interface ParticleOrbProps {
  audioStream?: MediaStream | null;
  enableMic?: boolean;
  colorA?: number; // color en zonas calmas
  colorB?: number; // color en crestas (voz fuerte)
  className?: string;
}

export default function ParticleOrb({
  audioStream = null,
  enableMic = false,
  colorA = 0x5cc8ff,
  colorB = 0x5e5ce6,
  className,
}: ParticleOrbProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // ── Escena WebGL + animación + resize + cleanup ────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 1;
    const height = mount.clientHeight || 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 9;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // Partículas sobre una esfera (distribución de Fibonacci).
    const COUNT = 2600;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = i * Math.PI * (3 - Math.sqrt(5));
      positions[i * 3] = Math.cos(phi) * r * 3;
      positions[i * 3 + 1] = y * 3;
      positions[i * 3 + 2] = Math.sin(phi) * r * 3;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const uniforms = {
      uTime: { value: 0 },
      uAudio: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
    };

    const vertexShader = /* glsl */ `
      uniform float uTime;
      uniform float uAudio;
      varying float vGlow;
      void main() {
        vec3 p = position;
        float n = sin(p.x * 2.2 + uTime) * sin(p.y * 2.2 + uTime * 1.1) * sin(p.z * 2.2 + uTime * 0.9);
        float disp = n * (0.18 + uAudio / 90.0);
        p += normalize(position) * disp;
        vGlow = 0.5 + 0.5 * n;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.2 + uAudio / 18.0) * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `;

    const fragmentShader = /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying float vGlow;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uColorA, uColorB, clamp(vGlow, 0.0, 1.0));
        gl_FragColor = vec4(col, alpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const clock = new THREE.Clock();
    let freqData: Uint8Array | null = null;
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      uniforms.uTime.value = clock.getElapsedTime();

      const analyser = analyserRef.current;
      if (analyser) {
        if (!freqData || freqData.length !== analyser.frequencyBinCount) {
          freqData = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) sum += freqData[i];
        uniforms.uAudio.value = sum / freqData.length;
      } else {
        uniforms.uAudio.value = 10 + Math.sin(uniforms.uTime.value * 1.6) * 7;
      }

      points.rotation.y += 0.0016;
      points.rotation.x += 0.0007;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(handleResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
      scene.remove(points);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      freqData = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Audio (Oráculo o micrófono) — seguro y limpiable ───────────────
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let localAnalyser: AnalyserNode | null = null;
    let ownedMicStream: MediaStream | null = null;
    let cancelled = false;

    const attach = (stream: MediaStream) => {
      if (cancelled) return;
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new Ctx();
      source = audioContext.createMediaStreamSource(stream);
      localAnalyser = audioContext.createAnalyser();
      localAnalyser.fftSize = 256;
      source.connect(localAnalyser);
      analyserRef.current = localAnalyser;
      void audioContext.resume().catch(() => undefined);
    };

    if (audioStream) {
      attach(audioStream);
    } else if (enableMic && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
          ownedMicStream = stream;
          attach(stream);
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      if (analyserRef.current === localAnalyser) analyserRef.current = null;
      try { source?.disconnect(); localAnalyser?.disconnect(); } catch { /* noop */ }
      ownedMicStream?.getTracks().forEach((t) => t.stop());
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close().catch(() => undefined);
      }
    };
  }, [audioStream, enableMic]);

  return (
    <div ref={mountRef} className={className} style={{ width: '100%', height: '100%' }} />
  );
}
