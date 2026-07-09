// src/components/HoloNucleo3D.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON CORE · HoloNucleo3D (interactivo)
// Tu Gemelo Digital como GALAXIA 3D. Cada punto es un dato REAL de tu perfil
// (los 4 ejes con su descripción + tus métricas). Al ACERCAR el cursor o
// TOCAR un punto, se resalta y despliega una ficha con información completa.
// Autorrotación + parallax + profundidad real. Canvas puro, sin dependencias.
//
// Drop-in de HoloOrbField (variant, orbState, orbSize, height, ariaLabel,
// center, chips) + data-driven (axes, reputation). Respeta reduced-motion.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react';
import { C, FONT } from '../theme';

export type OrbState = 'idle' | 'loading' | 'success' | 'celebration' | 'error';
export type OrbSize = 'sm' | 'md' | 'lg';
export type OrbVariant = 'digital-twin' | 'learning-system' | 'identity';

export interface NucleoChip {
  label: string;
  value: string;
  color: string;
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
  reputation?: number;
  axes?: NucleoAxes;
  /** Al tocar el CTA de un punto, navega al hub del ecosistema (TabId). */
  onNavigate?: (tab: string) => void;
  className?: string;
}

interface NodeMeta {
  label: string;
  cat: string;
  value: string;
  detail: string;
  /** Acción concreta para mejorar esta dimensión dentro del ecosistema. */
  mejora: string;
  /** Hub del ecosistema al que lleva la mejora (TabId). */
  tab?: string;
  color: string;
  weight: number; // 0-1 → tamaño del punto
}

/** Nombres legibles de cada hub para el CTA. */
const TAB_LABELS: Record<string, string> = {
  perfil: 'Inicio',
  maxskill: 'Habilidades',
  academia: 'Academia',
  market: 'Servicios',
  empleos: 'Empleos',
  chat: 'Mensajes',
  wallet: 'Billetera',
  gobernanza: 'Gobernanza',
  vault: 'Bóveda',
};

interface GNode {
  bx: number; by: number; bz: number;
  baseR: number;
  sx: number; sy: number; sc: number; zz: number;
}

const AXES_DEF: { key: keyof NucleoAxes; label: string; color: string; detail: string; mejora: string; tab: string }[] = [
  { key: 'execution', label: 'Ejecución', color: '#00F0FF', detail: 'Qué tan rápido y bien entregas tus contratos.', mejora: 'Toma un contrato de hito corto en el Market para elevar tu velocidad de entrega.', tab: 'market' },
  { key: 'quality', label: 'Calidad', color: '#0a8ba3', detail: 'Las calificaciones con estrellas de tus clientes.', mejora: 'Pide reseña al cerrar cada contrato: más estrellas suben este eje.', tab: 'empleos' },
  { key: 'transcendence', label: 'Trascendencia', color: '#F59E0B', detail: 'El conocimiento que compartes: Bóveda y mentorías.', mejora: 'Publica un aporte en la Bóveda o mentorea a un nodo junior.', tab: 'vault' },
  { key: 'foundation', label: 'Fundamento', color: '#39FF14', detail: 'Tu dominio teórico y los cursos de la Academia.', mejora: 'Rinde el Examen IA de un nodo pendiente en la Academia.', tab: 'academia' },
];

const CHIP_DETAIL: Record<string, string> = {
  Tokens: 'Saldo disponible en tu billetera Ómicron.',
  PE: 'Puntos de experiencia acumulados por tu trabajo y aprendizaje.',
  Contratos: 'Contratos completados con éxito en la red.',
};

const CHIP_MEJORA: Record<string, string> = {
  Tokens: 'Cierra contratos con escrow para liberar pagos y hacer crecer tu saldo.',
  PE: 'Completa cursos en la Academia para sumar PE y subir de nodo.',
  Contratos: 'Postula a una oportunidad en Empleos para tu próximo contrato.',
};
const CHIP_MEJORA_DEFAULT = 'Acumula PE con contratos y cursos para subir de nodo y bajar tu comisión de red.';

const CHIP_TAB: Record<string, string> = {
  Tokens: 'wallet',
  PE: 'academia',
  Contratos: 'empleos',
};
const CHIP_TAB_DEFAULT = 'wallet';

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function hexA(hex: string, a: number): string {
  if (hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}

function buildMeta(axes: NucleoAxes | undefined, chips: NucleoChip[]): NodeMeta[] {
  const out: NodeMeta[] = [];
  AXES_DEF.forEach((a) => {
    const raw = axes?.[a.key];
    const v = typeof raw === 'number' ? raw : null;
    out.push({
      label: a.label, cat: 'Eje del Gemelo', color: a.color, detail: a.detail, mejora: a.mejora, tab: a.tab,
      value: v != null ? `${Math.round(v)} / 100` : 'sin datos',
      weight: v != null ? Math.max(0.25, v / 100) : 0.55,
    });
  });
  chips.forEach((c) => {
    out.push({
      label: c.label, cat: 'Métrica', color: c.color, value: c.value,
      detail: CHIP_DETAIL[c.label] || 'Tu nodo actual en la red Ómicron.',
      mejora: CHIP_MEJORA[c.label] || CHIP_MEJORA_DEFAULT,
      tab: CHIP_TAB[c.label] || CHIP_TAB_DEFAULT,
      weight: 0.7,
    });
  });
  return out;
}

export function HoloNucleo3D({
  orbState = 'idle',
  height = 318,
  ariaLabel = 'Gemelo Digital',
  center,
  chips = [],
  reputation = 0,
  axes,
  onNavigate,
  className = '',
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const selRef = useRef<number>(-1);
  const [sel, setSel] = useState<number | null>(null);

  const chipsKey = JSON.stringify(chips);
  const axesKey = JSON.stringify(axes ?? {});
  const meta = useMemo(() => buildMeta(axes, chips), [axesKey, chipsKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce =
      typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, DPR = 1, CX = 0, CY = 0;
    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap!.clientWidth || 320;
      H = height;
      canvas!.width = W * DPR; canvas!.height = H * DPR;
      canvas!.style.width = W + 'px'; canvas!.style.height = H + 'px';
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      CX = W / 2; CY = H / 2;
    }
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(wrap);

    // Nodos (posiciones deterministas: mismo orden que `meta`).
    const N = Math.max(meta.length, 1);
    const nodes: GNode[] = meta.map((m, i) => {
      const y = 1 - (i / Math.max(N - 1, 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const th = GOLDEN * i;
      return {
        bx: Math.cos(th) * rad, by: y, bz: Math.sin(th) * rad,
        baseR: 4 + m.weight * 6,
        sx: 0, sy: 0, sc: 1, zz: 0,
      };
    });
    const dust = Array.from({ length: 40 }, () => ({
      x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.2,
      a: 0.05 + Math.random() * 0.3, vx: (Math.random() - 0.5) * 0.04,
      vy: (Math.random() - 0.5) * 0.04, tw: Math.random() * 6.28,
    }));

    let yaw = 0.4, pitch = -0.2;
    let ptrX = CX, ptrY = CY, active = false, isTouch = false;

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      ptrX = e.clientX - r.left; ptrY = e.clientY - r.top; active = true;
      if (e.pointerType) isTouch = e.pointerType === 'touch';
    }
    function onDown(e: PointerEvent) { onMove(e); }
    function onLeave() { if (!isTouch) active = false; }
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerleave', onLeave);

    const errorTint = orbState === 'error';
    const rep = Math.max(0, Math.min(100, reputation));
    const highRep = rep >= 75;

    function project(x: number, y: number, z: number) {
      const cy1 = Math.cos(yaw), sy1 = Math.sin(yaw);
      const x1 = x * cy1 - z * sy1, z1 = x * sy1 + z * cy1, y1 = y;
      const cx1 = Math.cos(pitch), sx1 = Math.sin(pitch);
      const y2 = y1 * cx1 - z1 * sx1, z2 = y1 * sx1 + z1 * cx1, x2 = x1;
      const R = Math.min(W, H) * 0.4, FOV = 900, persp = FOV / (FOV + z2 * R);
      return { sx: CX + x2 * R * persp, sy: CY + y2 * R * persp, sc: persp, zz: z2 };
    }
    function drawCore(t: number) {
      const p = project(0, 0, 0);
      const R = Math.min(W, H) * 0.135;
      const halo = ctx!.createRadialGradient(p.sx, p.sy, R * 0.5, p.sx, p.sy, R * 2.6);
      halo.addColorStop(0, hexA(errorTint ? C.red : highRep ? '#F59E0B' : '#22D3EE', 0.26 + (rep / 100) * 0.14));
      halo.addColorStop(1, 'rgba(34,211,238,0)');
      ctx!.fillStyle = halo; ctx!.beginPath(); ctx!.arc(p.sx, p.sy, R * 2.6, 0, 6.2832); ctx!.fill();
      const core = ctx!.createRadialGradient(p.sx - R * 0.3, p.sy - R * 0.35, R * 0.1, p.sx, p.sy, R);
      core.addColorStop(0, '#CFFAFE'); core.addColorStop(0.34, errorTint ? '#f87171' : '#22D3EE');
      core.addColorStop(0.68, errorTint ? '#7f1d2e' : highRep ? '#B45309' : '#1E40AF'); core.addColorStop(0.95, '#1E1B4B');
      ctx!.fillStyle = core; ctx!.beginPath(); ctx!.arc(p.sx, p.sy, R, 0, 6.2832); ctx!.fill();
      ctx!.save(); ctx!.translate(p.sx, p.sy);
      for (let i = 0; i < 3; i++) {
        ctx!.save(); ctx!.rotate(t * 0.2 + (i * Math.PI) / 3);
        ctx!.strokeStyle = hexA('#E0F7FF', 0.4 - i * 0.1); ctx!.lineWidth = 1;
        ctx!.beginPath(); ctx!.ellipse(0, 0, R * 1.3, R * 0.46, 0, 0, 6.2832); ctx!.stroke(); ctx!.restore();
      }
      ctx!.restore();
      ctx!.fillStyle = 'rgba(255,255,255,0.35)';
      ctx!.beginPath(); ctx!.ellipse(p.sx - R * 0.28, p.sy - R * 0.34, R * 0.26, R * 0.15, -0.5, 0, 6.2832); ctx!.fill();
      return p;
    }
    function glow(x: number, y: number, r: number, color: string, alpha: number) {
      const g = ctx!.createRadialGradient(x, y, 0, x, y, r * 3.2);
      g.addColorStop(0, hexA(color, 0.9 * alpha)); g.addColorStop(0.4, hexA(color, 0.26 * alpha)); g.addColorStop(1, hexA(color, 0));
      ctx!.fillStyle = g; ctx!.beginPath(); ctx!.arc(x, y, r * 3.2, 0, 6.2832); ctx!.fill();
      ctx!.fillStyle = hexA('#ffffff', 0.85 * alpha); ctx!.beginPath(); ctx!.arc(x, y, r * 0.5, 0, 6.2832); ctx!.fill();
      ctx!.fillStyle = hexA(color, alpha); ctx!.beginPath(); ctx!.arc(x, y, r, 0, 6.2832); ctx!.fill();
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

      // Cámara: parallax suave + autorrotación (se frena si hay punto activo).
      const nx = active ? (ptrX / W - 0.5) * 2 : 0;
      const ny = active ? (ptrY / H - 0.5) * 2 : 0;
      if (!reduce && orbState !== 'error' && selRef.current < 0) yaw += 0.0022;
      pitch = -0.2 + ny * 0.22;
      const savedYaw = yaw; yaw = yaw + nx * 0.28;

      for (const n of nodes) {
        const p = project(n.bx, n.by, n.bz);
        n.sx = p.sx; n.sy = p.sy; n.sc = p.sc; n.zz = p.zz;
      }

      // ¿A qué punto me estoy acercando?
      let hovered = -1;
      if (active) {
        let best = 30; // umbral de proximidad (px)
        nodes.forEach((n, i) => {
          const d = Math.hypot(ptrX - n.sx, ptrY - n.sy);
          if (d < best + n.baseR * n.sc) { best = d; hovered = i; }
        });
      }
      if (hovered !== selRef.current) {
        selRef.current = hovered;
        setSel(hovered >= 0 ? hovered : null);
      }

      const order = nodes.map((_, i) => i).sort((a, b) => nodes[b].zz - nodes[a].zz);
      const draw = (idxs: number[], core: { sx: number; sy: number } | null) => {
        for (const i of idxs) {
          const n = nodes[i], m = meta[i];
          const isSel = i === selRef.current;
          const dim = selRef.current >= 0 && !isSel ? 0.28 : 1;
          const alpha = (0.5 + n.sc * 0.5) * dim;
          if (core) {
            const la = (0.08 + n.sc * 0.1) * dim * (isSel ? 2.4 : 1);
            const grad = ctx!.createLinearGradient(core.sx, core.sy, n.sx, n.sy);
            grad.addColorStop(0, hexA(m.color, 0)); grad.addColorStop(1, hexA(m.color, la));
            ctx!.strokeStyle = grad; ctx!.lineWidth = isSel ? 1.8 : 1;
            ctx!.beginPath(); ctx!.moveTo(core.sx, core.sy); ctx!.lineTo(n.sx, n.sy); ctx!.stroke();
          }
          const rr = n.baseR * n.sc * (isSel ? 1.8 : 1);
          glow(n.sx, n.sy, rr, m.color, alpha);
          if (isSel) {
            // anillo de selección
            ctx!.strokeStyle = hexA(m.color, 0.9); ctx!.lineWidth = 1.5;
            ctx!.beginPath(); ctx!.arc(n.sx, n.sy, rr + 6, 0, 6.2832); ctx!.stroke();
          }
          if (isSel || (n.sc > 1.06 && dim > 0.5)) {
            ctx!.textAlign = 'center';
            ctx!.fillStyle = hexA('#eaf4ff', isSel ? 0.95 : 0.55 * alpha);
            ctx!.font = `${isSel ? 11 : 9}px ${FONT.mono}`;
            ctx!.fillText(m.label, n.sx, n.sy - rr - 6);
          }
        }
      };
      draw(order.filter((i) => nodes[i].zz > 0), null);
      const core = drawCore(t);
      draw(order.filter((i) => nodes[i].zz <= 0), core);

      yaw = savedYaw;
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (ro) ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [orbState, height, reputation, axesKey, chipsKey, meta]);

  const info = sel != null ? meta[sel] : null;

  return (
    <div
      ref={wrapRef}
      className={className}
      role="img"
      aria-label={ariaLabel}
      style={{ position: 'relative', width: '100%', height, touchAction: 'pan-y' }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height, cursor: 'pointer' }} />

      {/* Núcleo central (reputación) */}
      {center != null && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', textAlign: 'center', padding: '0 12px' }}>
          {center}
        </div>
      )}

      {/* Ficha de información completa (al acercarse / tocar un punto) */}
      {info ? (
        <div
          style={{
            position: 'absolute', left: 10, right: 10, bottom: 10, zIndex: 4, pointerEvents: 'none',
            padding: '11px 14px', borderRadius: 12,
            background: 'rgba(6,12,26,0.92)', border: `1px solid ${hexA(info.color, 0.5)}`,
            boxShadow: `0 8px 30px rgba(0,0,0,0.5), 0 0 22px ${hexA(info.color, 0.18)}`,
            backdropFilter: 'blur(10px)',
            animation: 'nucleoInfoIn 0.2s ease both',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: info.color }}>
              {info.cat}
            </span>
            <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: info.color, lineHeight: 1 }}>
              {info.value}
            </span>
          </div>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff', marginTop: 2 }}>
            {info.label}
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: 12, color: 'rgba(234,242,255,0.75)', marginTop: 3, lineHeight: 1.4 }}>
            {info.detail}
          </div>
          <div style={{ display: 'flex', gap: 7, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ flexShrink: 0, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: '#F59E0B', textTransform: 'uppercase' }}>
              ▲ Mejora
            </span>
            <span style={{ fontFamily: FONT.body, fontSize: 12, color: '#ffdd9e', lineHeight: 1.4 }}>
              {info.mejora}
            </span>
          </div>
          {info.tab && onNavigate && (
            <button
              onClick={() => onNavigate(info.tab as string)}
              style={{
                pointerEvents: 'auto', marginTop: 10, width: '100%', padding: '9px',
                borderRadius: 9, cursor: 'pointer',
                border: `1px solid ${hexA(info.color, 0.55)}`,
                background: hexA(info.color, 0.14), color: info.color,
                fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
              }}
            >
              → Ir a {TAB_LABELS[info.tab] || 'sección'}
            </button>
          )}
        </div>
      ) : (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 10, textAlign: 'center', pointerEvents: 'none', fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1, color: 'rgba(0,240,255,0.5)', textTransform: 'uppercase' }}>
          Acércate o toca un punto para ver su detalle
        </div>
      )}

      <style>{`
        @keyframes nucleoInfoIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}

export default HoloNucleo3D;
