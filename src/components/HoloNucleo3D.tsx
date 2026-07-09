// src/components/HoloNucleo3D.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON CORE · HoloNucleo3D
// Evolución del HoloOrbField: tu Gemelo Digital como una GALAXIA 3D. Tu
// capital intelectual orbita tu núcleo en 3D real (proyección en perspectiva
// propia), con autorrotación, parallax según el cursor, líneas de confianza
// con pulsos y polvo estelar. Dibujado en canvas puro (sin dependencias).
//
// DATA-DRIVEN: si recibes `axes` (los 4 ejes del Gemelo) y `reputation`, los
// 4 ejes se materializan como nodos prominentes cuyo tamaño y brillo reflejan
// su valor real, y el núcleo intensifica su color hacia el ámbar según sube
// tu reputación. Si no llegan datos, cae a una constelación decorativa.
//
// Drop-in: comparte la interfaz de props con HoloOrbField
//   (variant, orbState, orbSize, height, ariaLabel, center, chips)
// Respeta prefers-reduced-motion.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react';
import { C, FONT } from '../theme';

export type OrbState = 'idle' | 'loading' | 'success' | 'celebration' | 'error';
export type OrbSize = 'sm' | 'md' | 'lg';
export type OrbVariant = 'digital-twin' | 'learning-system' | 'identity';

export interface NucleoChip {
  label: string;
  value: string;
  color: string;
  /** Posición en porcentaje del contenedor (0-100). */
  x: number;
  y: number;
}

export interface NucleoAxes {
  execution?: number;
  quality?: number;
  transcendence?: number;
  foundation?: number;
}

interface Props {
  variant?: OrbVariant;
  orbState?: OrbState;
  orbSize?: OrbSize;
  height?: number;
  ariaLabel?: string;
  center?: React.ReactNode;
  chips?: NucleoChip[];
  /** Reputación 0-100: intensifica el núcleo hacia el ámbar. */
  reputation?: number;
  /** Los 4 ejes del Gemelo Digital: materializan nodos prominentes. */
  axes?: NucleoAxes;
  className?: string;
}

interface GNode {
  color: string;
  label?: string;
  bx: number; by: number; bz: number;
  baseR: number;
  sx: number; sy: number; sc: number; zz: number;
}

// Ejes del Gemelo con la paleta de PerfilTab (Ejecución/Calidad/Trascendencia/Fundamento).
const AXES_DEF: { key: keyof NucleoAxes; label: string; color: string }[] = [
  { key: 'execution', label: 'Ejecución', color: '#00F0FF' },
  { key: 'quality', label: 'Calidad', color: '#0a8ba3' },
  { key: 'transcendence', label: 'Trascendencia', color: '#F59E0B' },
  { key: 'foundation', label: 'Fundamento', color: '#39FF14' },
];

// Satélites decorativos (capital intelectual complementario).
const SAT_COLORS = [C.cyan, C.gold, C.purple, C.green, C.cyan, C.gold, C.purple, C.green, C.cyan, C.gold, C.purple, C.green];
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function hexA(hex: string, a: number): string {
  if (hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

export function HoloNucleo3D({
  orbState = 'idle',
  height = 318,
  ariaLabel = 'Gemelo Digital',
  center,
  chips = [],
  reputation = 0,
  axes,
  className = '',
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const axesKey = JSON.stringify(axes ?? {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, DPR = 1, CX = 0, CY = 0;
    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth || 320;
      H = height;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      CX = W / 2;
      CY = H / 2;
    }
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(wrap);

    // ── Construir la galaxia ──
    const nodes: GNode[] = [];
    const parsed: NucleoAxes = axes ?? {};
    const hasAxes = AXES_DEF.some((a) => typeof parsed[a.key] === 'number');

    // 4 nodos-eje prominentes en el ecuador, tamaño ∝ valor real.
    AXES_DEF.forEach((a, i) => {
      const ang = (i / AXES_DEF.length) * Math.PI * 2 + 0.3;
      const val = typeof parsed[a.key] === 'number' ? (parsed[a.key] as number) : 60;
      nodes.push({
        color: a.color, label: a.label,
        bx: Math.cos(ang), by: 0.08 * Math.sin(ang * 2), bz: Math.sin(ang),
        baseR: 4 + (Math.max(0, Math.min(100, val)) / 100) * 7,
        sx: 0, sy: 0, sc: 1, zz: 0,
      });
    });

    // Satélites decorativos en esfera de Fibonacci.
    const S = 12;
    for (let i = 0; i < S; i++) {
      const y = 1 - (i / (S - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const th = GOLDEN * i;
      nodes.push({
        color: SAT_COLORS[i % SAT_COLORS.length],
        bx: Math.cos(th) * rad * 0.82, by: y * 0.82, bz: Math.sin(th) * rad * 0.82,
        baseR: 2.4 + (i % 3) * 0.5,
        sx: 0, sy: 0, sc: 1, zz: 0,
      });
    }

    const edges: [number, number][] = [
      [0, 4], [1, 7], [2, 10], [3, 13], [0, 1], [1, 2], [2, 3], [3, 0],
    ];
    const dust = Array.from({ length: 46 }, () => ({
      x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.3,
      a: 0.05 + Math.random() * 0.32, vx: (Math.random() - 0.5) * 0.04,
      vy: (Math.random() - 0.5) * 0.04, tw: Math.random() * 6.28,
    }));
    const pulses = nodes.map(() => Math.random());

    let yaw = 0.4, pitch = -0.2;
    let px = 0, py = 0, curPx = 0, curPy = 0;

    function onMove(e: PointerEvent) {
      const r = canvas.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      py = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }
    function onLeave() { px = 0; py = 0; }
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    const errorTint = orbState === 'error';
    // Reputación alta → núcleo tiende al ámbar (rango SENIOR).
    const rep = Math.max(0, Math.min(100, reputation));
    const highRep = rep >= 75;
    const haloCore = errorTint ? C.red : highRep ? '#F59E0B' : '#22D3EE';

    function project(x: number, y: number, z: number) {
      const cy1 = Math.cos(yaw), sy1 = Math.sin(yaw);
      const x1 = x * cy1 - z * sy1, z1 = x * sy1 + z * cy1, y1 = y;
      const cx1 = Math.cos(pitch), sx1 = Math.sin(pitch);
      const y2 = y1 * cx1 - z1 * sx1, z2 = y1 * sx1 + z1 * cx1, x2 = x1;
      const R = Math.min(W, H) * 0.42;
      const FOV = 900;
      const persp = FOV / (FOV + z2 * R);
      return { sx: CX + x2 * R * persp, sy: CY + y2 * R * persp, sc: persp, zz: z2 };
    }

    function drawCore(t: number) {
      const p = project(0, 0, 0);
      const R = Math.min(W, H) * 0.135;
      const halo = ctx!.createRadialGradient(p.sx, p.sy, R * 0.5, p.sx, p.sy, R * 2.6);
      halo.addColorStop(0, hexA(haloCore, 0.26 + (rep / 100) * 0.14));
      halo.addColorStop(1, 'rgba(34,211,238,0)');
      ctx!.fillStyle = halo;
      ctx!.beginPath(); ctx!.arc(p.sx, p.sy, R * 2.6, 0, 6.2832); ctx!.fill();
      const core = ctx!.createRadialGradient(p.sx - R * 0.3, p.sy - R * 0.35, R * 0.1, p.sx, p.sy, R);
      core.addColorStop(0, '#CFFAFE');
      core.addColorStop(0.34, errorTint ? '#f87171' : '#22D3EE');
      core.addColorStop(0.68, errorTint ? '#7f1d2e' : highRep ? '#B45309' : '#1E40AF');
      core.addColorStop(0.95, '#1E1B4B');
      ctx!.fillStyle = core;
      ctx!.beginPath(); ctx!.arc(p.sx, p.sy, R, 0, 6.2832); ctx!.fill();
      ctx!.save(); ctx!.translate(p.sx, p.sy);
      for (let i = 0; i < 3; i++) {
        ctx!.save(); ctx!.rotate(t * 0.2 + (i * Math.PI) / 3);
        ctx!.strokeStyle = hexA('#E0F7FF', 0.4 - i * 0.1); ctx!.lineWidth = 1;
        ctx!.beginPath(); ctx!.ellipse(0, 0, R * 1.3, R * 0.46, 0, 0, 6.2832); ctx!.stroke();
        ctx!.restore();
      }
      ctx!.restore();
      ctx!.fillStyle = 'rgba(255,255,255,0.35)';
      ctx!.beginPath(); ctx!.ellipse(p.sx - R * 0.28, p.sy - R * 0.34, R * 0.26, R * 0.15, -0.5, 0, 6.2832); ctx!.fill();
      return p;
    }

    function glow(x: number, y: number, r: number, color: string, alpha: number) {
      const g = ctx!.createRadialGradient(x, y, 0, x, y, r * 3.2);
      g.addColorStop(0, hexA(color, 0.9 * alpha));
      g.addColorStop(0.4, hexA(color, 0.26 * alpha));
      g.addColorStop(1, hexA(color, 0));
      ctx!.fillStyle = g; ctx!.beginPath(); ctx!.arc(x, y, r * 3.2, 0, 6.2832); ctx!.fill();
      ctx!.fillStyle = hexA('#ffffff', 0.85 * alpha);
      ctx!.beginPath(); ctx!.arc(x, y, r * 0.5, 0, 6.2832); ctx!.fill();
      ctx!.fillStyle = hexA(color, alpha);
      ctx!.beginPath(); ctx!.arc(x, y, r, 0, 6.2832); ctx!.fill();
    }

    const start = performance.now();
    function frame(now: number) {
      const t = (now - start) / 1000;
      ctx!.clearRect(0, 0, W, H);

      for (const d of dust) {
        if (!reduce) { d.x += d.vx * 0.0016; d.y += d.vy * 0.0016; }
        if (d.x < 0) d.x = 1; if (d.x > 1) d.x = 0; if (d.y < 0) d.y = 1; if (d.y > 1) d.y = 0;
        const tw = 0.5 + 0.5 * Math.sin(t * 1.5 + d.tw);
        ctx!.fillStyle = hexA('#9fdcff', d.a * tw);
        ctx!.beginPath(); ctx!.arc(d.x * W, d.y * H, d.r, 0, 6.2832); ctx!.fill();
      }

      curPx += (px - curPx) * 0.05;
      curPy += (py - curPy) * 0.05;
      if (!reduce && orbState !== 'error') yaw += 0.0022;
      pitch = -0.2 + curPy * 0.25;
      const savedYaw = yaw;
      yaw = yaw + curPx * 0.3;

      for (const n of nodes) {
        const p = project(n.bx, n.by, n.bz);
        n.sx = p.sx; n.sy = p.sy; n.sc = p.sc; n.zz = p.zz;
      }
      const order = nodes.map((_, i) => i).sort((a, b) => nodes[b].zz - nodes[a].zz);

      ctx!.lineWidth = 1;
      for (const [a, b] of edges) {
        const na = nodes[a], nb = nodes[b];
        if (!na || !nb) continue;
        ctx!.strokeStyle = hexA('#7fdfff', 0.05 + 0.05 * ((na.sc + nb.sc) / 2));
        ctx!.beginPath(); ctx!.moveTo(na.sx, na.sy); ctx!.lineTo(nb.sx, nb.sy); ctx!.stroke();
      }

      drawSet(order.filter((i) => nodes[i].zz > 0), t, null);
      const core = drawCore(t);
      drawSet(order.filter((i) => nodes[i].zz <= 0), t, core);

      yaw = savedYaw;
      rafRef.current = requestAnimationFrame(frame);
    }

    function drawSet(idxs: number[], t: number, core: { sx: number; sy: number } | null) {
      for (const i of idxs) {
        const n = nodes[i];
        const alpha = 0.5 + n.sc * 0.5;
        if (core) {
          const la = 0.08 + n.sc * 0.1;
          const grad = ctx!.createLinearGradient(core.sx, core.sy, n.sx, n.sy);
          grad.addColorStop(0, hexA(n.color, 0));
          grad.addColorStop(1, hexA(n.color, la));
          ctx!.strokeStyle = grad; ctx!.lineWidth = 1;
          ctx!.beginPath(); ctx!.moveTo(core.sx, core.sy); ctx!.lineTo(n.sx, n.sy); ctx!.stroke();
          const p = (pulses[i] + t * 0.25) % 1;
          ctx!.fillStyle = hexA(n.color, (1 - p) * alpha * 0.9);
          ctx!.beginPath();
          ctx!.arc(core.sx + (n.sx - core.sx) * p, core.sy + (n.sy - core.sy) * p, 1.6, 0, 6.2832);
          ctx!.fill();
        }
        glow(n.sx, n.sy, n.baseR * n.sc, n.color, alpha);
        // etiqueta del eje cuando está al frente
        if (n.label && n.sc > 1.02 && n.zz <= 0.1) {
          ctx!.textAlign = 'center';
          ctx!.fillStyle = hexA('#eaf4ff', 0.85 * alpha);
          ctx!.font = `9px ${FONT.mono}`;
          ctx!.fillText(n.label, n.sx, n.sy - n.baseR * n.sc - 6);
        }
      }
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (ro) ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [orbState, height, reputation, axesKey]);

  return (
    <div
      ref={wrapRef}
      className={className}
      role="img"
      aria-label={ariaLabel}
      style={{ position: 'relative', width: '100%', height }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height }} />

      {center != null && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', textAlign: 'center', padding: '0 12px',
          }}
        >
          {center}
        </div>
      )}

      {chips.map((chip, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', left: `${chip.x}%`, top: `${chip.y}%`,
            transform: 'translate(-50%, -50%)', pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '5px 10px', borderRadius: 12,
            background: 'rgba(6,12,26,0.66)',
            border: `1px solid ${hexA(chip.color, 0.4)}`,
            boxShadow: `0 0 16px ${hexA(chip.color, 0.18)}`,
            backdropFilter: 'blur(6px)',
          }}
        >
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: chip.color, lineHeight: 1 }}>
            {chip.value}
          </span>
          <span style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1, color: 'rgba(234,242,255,0.6)', textTransform: 'uppercase', marginTop: 2 }}>
            {chip.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default HoloNucleo3D;
