import { useEffect, useRef } from 'react';

// =====================================================================
// <ParticleOrb /> — Orbe de partículas viva, en Canvas puro (sin Three.js).
//
// Esfera de partículas proyectada en 2.5D que rota y VIBRA con el sonido
// (voz del Oráculo o micrófono). Núcleo vivo de Ómicron. Cero dependencias
// externas, limpieza estricta (sin fugas) y responsividad (devicePixelRatio).
// =====================================================================

export interface ParticleOrbProps {
  audioStream?: MediaStream | null;
  enableMic?: boolean;
  colorA?: [number, number, number]; // zonas calmas (RGB)
  colorB?: [number, number, number]; // crestas / voz fuerte (RGB)
  className?: string;
}

// Tipo del parámetro real de getByteFrequencyData (agnóstico a la versión de TS).
type FreqArg = Parameters<AnalyserNode['getByteFrequencyData']>[0];

export default function ParticleOrb({
  audioStream = null,
  enableMic = false,
  colorA = [92, 200, 255],
  colorB = [94, 92, 230],
  className,
}: ParticleOrbProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // ── Render de partículas + animación + resize + cleanup ────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    mount.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Puntos base sobre una esfera (distribución de Fibonacci).
    const COUNT = 1600;
    const base: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = i * Math.PI * (3 - Math.sqrt(5));
      base.push({ x: Math.cos(phi) * r, y, z: Math.sin(phi) * r });
    }

    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = mount.clientWidth || 1;
      H = mount.clientHeight || 1;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    let t = 0;
    let freq: Uint8Array | null = null;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.01;

      // Nivel de audio (0..1)
      let level = 0.12 + Math.sin(t * 1.6) * 0.05; // latido base sin audio
      const analyser = analyserRef.current;
      if (analyser) {
        const bins = analyser.frequencyBinCount;
        if (!freq || freq.length !== bins) freq = new Uint8Array(new ArrayBuffer(bins));
        analyser.getByteFrequencyData(freq as unknown as FreqArg);
        let sum = 0;
        for (let i = 0; i < freq.length; i++) sum += freq[i];
        level = Math.min(1, (sum / freq.length) / 52);
      }

      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      const baseR = Math.min(W, H) * 0.36;
      const fov = 3.2;

      // Halo central que respira con la voz
      const glowR = baseR * (1.15 + level * 0.75);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glow.addColorStop(0, `rgba(${colorB[0]},${colorB[1]},${colorB[2]},${(0.10 + level * 0.30).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Rotación
      const ay = t * 0.35, ax = t * 0.16;
      const cosY = Math.cos(ay), sinY = Math.sin(ay);
      const cosX = Math.cos(ax), sinX = Math.sin(ax);

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < COUNT; i++) {
        const p = base[i];
        // Desplazamiento radial por ruido + audio (vibración)
        const noise = Math.sin(p.x * 3 + t * 2) * Math.sin(p.y * 3 + t * 2.2) * Math.sin(p.z * 3 + t * 1.8);
        const rr = 1 + level * 0.72 + noise * (0.06 + level * 0.36);
        const x = p.x * rr, y = p.y * rr, z = p.z * rr;
        // Rotar en Y
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        // Rotar en X
        const y1 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        // Proyección perspectiva
        const scale = fov / (fov - z2);
        const sx = cx + x1 * baseR * scale;
        const sy = cy + y1 * baseR * scale;

        const depth = (z2 + 1.4) / 2.8; // 0..1
        const mix = Math.min(1, Math.max(0, depth * 0.6 + level * 0.6));
        const rC = Math.round(colorA[0] + (colorB[0] - colorA[0]) * mix);
        const gC = Math.round(colorA[1] + (colorB[1] - colorA[1]) * mix);
        const bC = Math.round(colorA[2] + (colorB[2] - colorA[2]) * mix);
        const alpha = 0.28 + depth * 0.62;
        const size = Math.max(0.5, (0.7 + level * 2.6) * scale);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${rC},${gC},${bC},${alpha.toFixed(3)})`;
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      ro.disconnect();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
      freq = null;
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
          if (cancelled) { stream.getTracks().forEach((tr) => tr.stop()); return; }
          ownedMicStream = stream;
          attach(stream);
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      if (analyserRef.current === localAnalyser) analyserRef.current = null;
      try { source?.disconnect(); localAnalyser?.disconnect(); } catch { /* noop */ }
      ownedMicStream?.getTracks().forEach((tr) => tr.stop());
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close().catch(() => undefined);
      }
    };
  }, [audioStream, enableMic]);

  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100%' }} />;
}
