import { useEffect, useRef } from 'react';

// =====================================================================
// <ParticleOrb /> — ADN Digital vivo, en Canvas puro (sin Three.js).
//
// Doble hélice de ADN digital que rota y VIBRA con el sonido (voz del
// Oráculo o micrófono). Núcleo vivo de Ómicron. Cero dependencias
// externas, limpieza estricta (sin fugas) y responsividad (devicePixelRatio).
//
// Estructura visual:
//   - 2 cadenas helicoidales (strand A / strand B) con partículas que fluyen
//   - Puentes entre cadenas (base pairs) que brillan con la energía de audio
//   - Partículas de datos flotando alrededor de la estructura
//   - Halo central que respira con la voz
// =====================================================================

export interface ParticleOrbProps {
  audioStream?: MediaStream | null;
  enableMic?: boolean;
  colorA?: [number, number, number]; // strand A color (RGB) — SKY cyan
  colorB?: [number, number, number]; // strand B color (RGB) — INDIGO purple
  className?: string;
}

type FreqArg = Parameters<AnalyserNode['getByteFrequencyData']>[0];

export default function ParticleOrb({
  audioStream = null,
  enableMic = false,
  colorA = [92, 200, 255],   // SKY cyan
  colorB = [94, 92, 230],    // INDIGO purple
  className,
}: ParticleOrbProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // ── Render del ADN digital + animación + resize + cleanup ──────────
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

    // ── Configuración del ADN ──────────────────────────────────────────
    const STRAND_PARTICLES = 120;  // partículas por cadena
    const HELIX_TURNS = 3.5;      // vueltas completas de la hélice
    const BRIDGE_COUNT = 24;       // puentes entre cadenas (base pairs)
    const FLOAT_PARTICLES = 200;   // partículas de datos flotantes
    const BRIDGE_DOTS = 5;         // puntos por puente

    // Pre-calcular posiciones flotantes (datos ambientales)
    const floaters: { angle: number; yOff: number; dist: number; speed: number; size: number }[] = [];
    for (let i = 0; i < FLOAT_PARTICLES; i++) {
      floaters.push({
        angle: Math.random() * Math.PI * 2,
        yOff: (Math.random() - 0.5) * 2,
        dist: 0.6 + Math.random() * 0.9,
        speed: 0.3 + Math.random() * 0.7,
        size: 0.3 + Math.random() * 1.2,
      });
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
      t += 0.008;

      // ── Nivel de audio (0..1) ──────────────────────────────────────
      let level = 0.10 + Math.sin(t * 1.2) * 0.04; // latido base
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
      const baseR = Math.min(W, H) * 0.28; // radio de la hélice
      const helixH = Math.min(W, H) * 0.72; // altura total de la hélice
      const fov = 3.5;

      // ── Halo central que respira ────────────────────────────────────
      const glowR = baseR * (2.2 + level * 1.2);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glow.addColorStop(0, `rgba(${colorA[0]},${colorA[1]},${colorA[2]},${(0.06 + level * 0.15).toFixed(3)})`);
      glow.addColorStop(0.5, `rgba(${colorB[0]},${colorB[1]},${colorB[2]},${(0.03 + level * 0.08).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // ── Rotación global del ADN ─────────────────────────────────────
      const rotY = t * 0.4;
      const rotX = 0.3 + Math.sin(t * 0.2) * 0.1; // leve cabeceo
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      // Función de proyección 3D → 2D
      const project = (x: number, y: number, z: number): { sx: number; sy: number; scale: number; depth: number } => {
        // Rotar en Y
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        // Rotar en X
        const y1 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        // Perspectiva
        const scale = fov / (fov - z2 * 0.6);
        return {
          sx: cx + x1 * baseR * scale,
          sy: cy + y1 * baseR * scale,
          scale,
          depth: (z2 + 1.5) / 3,
        };
      };

      // ── Colección de todos los puntos para ordenar por profundidad ──
      type DrawPoint = {
        x: number; y: number; z: number;
        type: 'strandA' | 'strandB' | 'bridge' | 'float';
        energy: number; // 0..1 para brillo
        idx: number;
      };
      const points: DrawPoint[] = [];

      // ── Generar puntos de las dos cadenas helicoidales ──────────────
      for (let i = 0; i < STRAND_PARTICLES; i++) {
        const progress = i / (STRAND_PARTICLES - 1); // 0..1 a lo largo de la hélice
        const angle = progress * Math.PI * 2 * HELIX_TURNS + t * 2; // scroll continuo
        const yPos = (progress - 0.5) * 2; // -1..1 normalizado

        // Onda de energía que recorre la hélice
        const wave = Math.sin(progress * Math.PI * 4 - t * 3) * 0.5 + 0.5;
        const energy = wave * (0.4 + level * 0.6);

        // Strand A
        const radiusA = 1 + energy * 0.3 * level;
        points.push({
          x: Math.cos(angle) * radiusA,
          y: yPos * (helixH / baseR / 2),
          z: Math.sin(angle) * radiusA,
          type: 'strandA',
          energy,
          idx: i,
        });

        // Strand B (desfasada 180°)
        const radiusB = 1 + energy * 0.3 * level;
        points.push({
          x: Math.cos(angle + Math.PI) * radiusB,
          y: yPos * (helixH / baseR / 2),
          z: Math.sin(angle + Math.PI) * radiusB,
          type: 'strandB',
          energy,
          idx: i,
        });
      }

      // ── Puentes entre cadenas (base pairs del ADN) ──────────────────
      for (let i = 0; i < BRIDGE_COUNT; i++) {
        const progress = (i + 0.5) / BRIDGE_COUNT;
        const angle = progress * Math.PI * 2 * HELIX_TURNS + t * 2;
        const yPos = (progress - 0.5) * 2;

        // Energía pulsante por puente
        const bridgeWave = Math.sin(i * 1.3 + t * 4) * 0.5 + 0.5;
        const bridgeEnergy = bridgeWave * (0.3 + level * 0.7);

        for (let d = 0; d < BRIDGE_DOTS; d++) {
          const lerp = d / (BRIDGE_DOTS - 1); // 0..1 de strand A a strand B
          const bridgeAngle = angle + lerp * Math.PI; // interpolar ángulo
          const bridgeRadius = 1 + bridgeEnergy * 0.15;

          points.push({
            x: Math.cos(bridgeAngle) * bridgeRadius,
            y: yPos * (helixH / baseR / 2),
            z: Math.sin(bridgeAngle) * bridgeRadius,
            type: 'bridge',
            energy: bridgeEnergy * (1 - Math.abs(lerp - 0.5) * 1.5), // más brillante en el centro
            idx: i * BRIDGE_DOTS + d,
          });
        }
      }

      // ── Partículas flotantes de datos ───────────────────────────────
      for (let i = 0; i < FLOAT_PARTICLES; i++) {
        const f = floaters[i];
        const angle = f.angle + t * f.speed;
        const yOsc = Math.sin(t * 0.8 + f.yOff * 3) * 0.3;

        points.push({
          x: Math.cos(angle) * f.dist,
          y: f.yOff * (helixH / baseR / 2) + yOsc,
          z: Math.sin(angle) * f.dist,
          type: 'float',
          energy: 0.15 + level * 0.3,
          idx: i,
        });
      }

      // ── Proyectar y ordenar por profundidad (painter's algorithm) ───
      const projected = points.map(p => {
        const proj = project(p.x, p.y, p.z);
        return { ...p, ...proj };
      });
      projected.sort((a, b) => a.depth - b.depth);

      // ── Dibujar ─────────────────────────────────────────────────────
      ctx.globalCompositeOperation = 'lighter';

      for (const p of projected) {
        let rC: number, gC: number, bC: number, alpha: number, size: number;

        switch (p.type) {
          case 'strandA': {
            // Color cyan con variación por energía
            const mix = p.energy;
            rC = colorA[0];
            gC = colorA[1];
            bC = colorA[2];
            alpha = 0.35 + p.depth * 0.5 + mix * 0.3;
            size = (1.0 + p.energy * 2.5 + level * 1.5) * p.scale;
            break;
          }
          case 'strandB': {
            // Color púrpura/indigo
            rC = colorB[0];
            gC = colorB[1];
            bC = colorB[2];
            alpha = 0.35 + p.depth * 0.5 + p.energy * 0.3;
            size = (1.0 + p.energy * 2.5 + level * 1.5) * p.scale;
            break;
          }
          case 'bridge': {
            // Color mezcla (más blanco/brillante) — los "peldaños" del ADN
            const goldR = 255, goldG = 176, goldB = 46; // gold/ámbar para puentes
            const bMix = p.energy;
            rC = Math.round(colorA[0] + (goldR - colorA[0]) * bMix);
            gC = Math.round(colorA[1] + (goldG - colorA[1]) * bMix);
            bC = Math.round(colorA[2] + (goldB - colorA[2]) * bMix);
            alpha = 0.15 + p.energy * 0.7 + level * 0.3;
            size = (0.6 + p.energy * 2.0 + level * 1.0) * p.scale;
            break;
          }
          case 'float':
          default: {
            // Partículas ambientales — muy tenues
            rC = Math.round(colorA[0] * 0.7 + colorB[0] * 0.3);
            gC = Math.round(colorA[1] * 0.7 + colorB[1] * 0.3);
            bC = Math.round(colorA[2] * 0.7 + colorB[2] * 0.3);
            alpha = 0.08 + p.depth * 0.15 + level * 0.1;
            size = floaters[p.idx]?.size * p.scale * (0.5 + level * 0.5) || 0.5;
            break;
          }
        }

        // Clamp
        alpha = Math.min(1, Math.max(0, alpha));
        size = Math.max(0.3, size);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${rC},${gC},${bC},${alpha.toFixed(3)})`;
        ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
        ctx.fill();

        // Glow extra para partículas energizadas de las cadenas principales
        if ((p.type === 'strandA' || p.type === 'strandB') && p.energy > 0.6) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(${rC},${gC},${bC},${(alpha * 0.3).toFixed(3)})`;
          ctx.arc(p.sx, p.sy, size * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Glow extra para puentes energizados
        if (p.type === 'bridge' && p.energy > 0.5) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(${rC},${gC},${bC},${(alpha * 0.2).toFixed(3)})`;
          ctx.arc(p.sx, p.sy, size * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Líneas de conexión entre partículas de la misma cadena (trail) ──
      ctx.globalCompositeOperation = 'lighter';
      const strandA = projected.filter(p => p.type === 'strandA').sort((a, b) => a.idx - b.idx);
      const strandB = projected.filter(p => p.type === 'strandB').sort((a, b) => a.idx - b.idx);

      const drawStrandTrail = (strand: typeof strandA, color: [number, number, number]) => {
        if (strand.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(strand[0].sx, strand[0].sy);
        for (let i = 1; i < strand.length; i++) {
          ctx.lineTo(strand[i].sx, strand[i].sy);
        }
        ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${(0.06 + level * 0.12).toFixed(3)})`;
        ctx.lineWidth = 0.5 + level * 0.8;
        ctx.stroke();
      };

      drawStrandTrail(strandA, colorA);
      drawStrandTrail(strandB, colorB);

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
