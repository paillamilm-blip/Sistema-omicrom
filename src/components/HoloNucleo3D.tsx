// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON CORE · HoloNucleo3D — EXPERIENCIA 3D PREMIUM BRUTAL
// Matching EXACTO del prototipo holo-gemelo.html: orbe ENORME brillante,
// nodos con GLOWS pulsantes, líneas VIVAS con energía, métricas flotantes
// con blur, rotación orbital suave, parallax, nodos tocables con fichas.
// IMPACTO PREMIUM MÁXIMO: oscuro, tecnológico, moderno.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState, memo } from 'react';
import { C, FONT } from '../theme';

export type OrbState = 'idle' | 'loading' | 'success' | 'celebration' | 'error';
export type OrbEmotion = 'idle' | 'thinking' | 'excited' | 'alert' | 'celebrating';

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
  orbState?: OrbState;
  emotion?: OrbEmotion; // ⭐ NUEVO: estado emocional del Gemelo
  audioLevel?: number;   // ⭐ NUEVO: nivel de audio para partículas reactivas (0-1)
  height?: number;
  ariaLabel?: string;
  chips?: NucleoChip[];
  reputation?: number;
  axes?: NucleoAxes;
  livePeers?: number;
  onNavigate?: (tab: string) => void;
  className?: string;
}

interface NodeMeta {
  label: string;
  cat: string;
  value: string;
  detail: string;
  mejora: string;
  tab?: string;
  color: string;
  weight: number;
}

const TAB_LABELS: Record<string, string> = {
  perfil: 'Inicio', maxskill: 'Habilidades', academia: 'Academia', market: 'Servicios',
  empleos: 'Empleos', chat: 'Mensajes', wallet: 'Billetera', gobernanza: 'Gobernanza', vault: 'Bóveda',
};

interface GNode {
  bx: number; by: number; bz: number;
  baseR: number;
  sx: number; sy: number; sc: number; zz: number;
}

const AXES_DEF: { key: keyof NucleoAxes; label: string; color: string; detail: string; mejora: string; tab: string }[] = [
  { key: 'execution', label: 'Ejecuta', color: '#5cc8ff', detail: 'Rapidez y calidad de entrega en contratos.', mejora: 'Toma un contrato de hito corto en el Market.', tab: 'empleos' },
  { key: 'quality', label: 'Calidad', color: '#8a88f0', detail: 'Calificaciones de tus clientes.', mejora: 'Pide reseña al cerrar cada contrato.', tab: 'empleos' },
  { key: 'transcendence', label: 'Aprende', color: '#ffb02e', detail: 'Conocimiento compartido: Bóveda y mentorías.', mejora: 'Publica un aporte en la Bóveda.', tab: 'academia' },
  { key: 'foundation', label: 'Gobierna', color: '#3fd0c9', detail: 'Dominio teórico y cursos de la Academia.', mejora: 'Rinde el Examen IA de un nodo pendiente.', tab: 'gobernanza' },
];

const CHIP_DETAIL: Record<string, string> = {
  Tokens: 'Saldo disponible en tu billetera.', PE: 'Puntos de experiencia acumulados.', Contratos: 'Contratos completados.', Nodo: 'Tu nodo actual en la red.',
};
const CHIP_MEJORA: Record<string, string> = {
  Tokens: 'Cierra contratos con escrow.', PE: 'Completa cursos en la Academia.', Contratos: 'Postula a una oportunidad.', Nodo: 'Acumula PE para subir de nodo.',
};
const CHIP_TAB: Record<string, string> = {
  Tokens: 'wallet', PE: 'academia', Contratos: 'empleos', Nodo: 'perfil',
};

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
      label: a.label, cat: 'Ecosistema', color: a.color, detail: a.detail, mejora: a.mejora, tab: a.tab,
      value: v != null ? `${Math.round(v)}` : '50',
      weight: v != null ? Math.max(0.35, v / 100) : 0.5,
    });
  });
  chips.forEach((c) => {
    out.push({
      label: c.label, cat: 'Métrica', color: c.color, value: c.value,
      detail: CHIP_DETAIL[c.label] || 'Tu nodo en la red.',
      mejora: CHIP_MEJORA[c.label] || 'Acumula PE.',
      tab: CHIP_TAB[c.label] || 'wallet',
      weight: 0.6,
    });
  });
  return out;
}

export function HoloNucleo3D({
  orbState = 'idle',
  emotion = 'idle',      // ⭐ Emoción del orbe
  audioLevel = 0,        // ⭐ Audio reactivo
  height = 420,
  ariaLabel = 'Gemelo Digital',
  chips = [],
  reputation = 0,
  axes,
  livePeers = 0,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const meta = useMemo(() => buildMeta(axes, chips), [axesKey, chipsKey]);

  useEffect(() => {
    if (!canvasRef.current || !wrapRef.current) return;
    const canvas: HTMLCanvasElement = canvasRef.current;
    const wrap: HTMLDivElement = wrapRef.current;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    const ctx: CanvasRenderingContext2D = ctx2d;

    const reduce =
      typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, DPR = 1, CX = 0, CY = 0;
    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth || 320;
      H = height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      CX = W / 2; CY = H / 2;
    }
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(wrap);

    const N = Math.max(meta.length, 1);
    const nodes: GNode[] = meta.map((m, i) => {
      const y = 1 - (i / Math.max(N - 1, 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const th = GOLDEN * i;
      return {
        bx: Math.cos(th) * rad, by: y, bz: Math.sin(th) * rad,
        baseR: 5 + m.weight * 8,
        sx: 0, sy: 0, sc: 1, zz: 0,
      };
    });

    const dust = Array.from({ length: 50 }, () => ({
      x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.5,
      a: 0.08 + Math.random() * 0.4, vx: (Math.random() - 0.5) * 0.05,
      vy: (Math.random() - 0.5) * 0.05, tw: Math.random() * 6.28,
    }));

    let yaw = 0.4, pitch = -0.2;
    let ptrX = CX, ptrY = CY, active = false, isTouch = false;

    function onMove(e: PointerEvent) {
      const r = canvas.getBoundingClientRect();
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
    
    // ⭐ COLORES EMOCIONALES DEL ORBE (cambian según emoción)
    const emotionColors = {
      idle: { core: '#06B6D4', halo: '#22D3EE', accent: '#0E7490' },
      thinking: { core: '#8B5CF6', halo: '#A78BFA', accent: '#6D28D9' },
      excited: { core: '#F59E0B', halo: '#FCD34D', accent: '#D97706' },
      alert: { core: '#EF4444', halo: '#FCA5A5', accent: '#DC2626' },
      celebrating: { core: '#10B981', halo: '#6EE7B7', accent: '#059669' },
    };
    const orbColors = emotionColors[emotion] || emotionColors.idle;

    function project(x: number, y: number, z: number) {
      const cy1 = Math.cos(yaw), sy1 = Math.sin(yaw);
      const x1 = x * cy1 - z * sy1, z1 = x * sy1 + z * cy1, y1 = y;
      const cx1 = Math.cos(pitch), sx1 = Math.sin(pitch);
      const y2 = y1 * cx1 - z1 * sx1, z2 = y1 * sx1 + z1 * cx1, x2 = x1;
      const R = Math.min(W, H) * 0.42, FOV = 900, persp = FOV / (FOV + z2 * R);
      return { sx: CX + x2 * R * persp, sy: CY + y2 * R * persp, sc: persp, zz: z2 };
    }

    // ⭐ ORBE EMOCIONAL PREMIUM: esfera luminosa con volumen, bloom aditivo,
    // anillo creciente (crescent) y número de reputación integrado.
    function drawCore(t: number) {
      const p = project(0, 0, 0);
      const R = Math.min(W, H) * 0.185; // ENORME y dominante

      let pulseSpeed = 1.2, pulseIntensity = 0.06;
      if (emotion === 'excited') { pulseSpeed = 2.4; pulseIntensity = 0.12; }
      else if (emotion === 'thinking') { pulseSpeed = 0.6; pulseIntensity = 0.045; }
      else if (emotion === 'alert') { pulseSpeed = 3.0; pulseIntensity = 0.16; }
      else if (emotion === 'celebrating') { pulseSpeed = 1.8; pulseIntensity = 0.15; }

      const audioPulse = audioLevel > 0 ? audioLevel * 0.22 : 0;
      const pulse = 1 + Math.sin(t * pulseSpeed) * pulseIntensity + audioPulse;
      const Rp = R * pulse;

      // ── BLOOM multicapa (aditivo) → resplandor neón real ──
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(p.sx, p.sy, Rp * 0.2, p.sx, p.sy, Rp * 4.4);
      halo.addColorStop(0, hexA(errorTint ? C.red : orbColors.halo, 0.42));
      halo.addColorStop(0.26, hexA(orbColors.halo, 0.20));
      halo.addColorStop(0.58, hexA(orbColors.accent, 0.09));
      halo.addColorStop(1, hexA(orbColors.halo, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p.sx, p.sy, Rp * 4.4, 0, 6.2832); ctx.fill();

      // Anillos orbitando (elipses) — aditivos, detrás del cuerpo
      ctx.translate(p.sx, p.sy);
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.rotate(t * 0.22 + (i * Math.PI) / 3);
        ctx.strokeStyle = hexA('#CFFAFE', 0.30 - i * 0.07); ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.ellipse(0, 0, Rp * 1.52, Rp * 0.54, 0, 0, 6.2832); ctx.stroke(); ctx.restore();
      }
      ctx.restore();

      // ── CUERPO de la esfera (highlight arriba-izquierda → sombra abajo-derecha) ──
      const core = ctx.createRadialGradient(p.sx - Rp * 0.34, p.sy - Rp * 0.40, Rp * 0.04, p.sx, p.sy, Rp);
      core.addColorStop(0, '#ffffff');
      core.addColorStop(0.16, '#eafaff');
      core.addColorStop(0.40, errorTint ? '#f87171' : orbColors.core);
      core.addColorStop(0.70, errorTint ? '#7f1d2e' : highRep ? orbColors.accent : orbColors.core);
      core.addColorStop(0.90, '#12275a');
      core.addColorStop(1, '#091634');
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(p.sx, p.sy, Rp, 0, 6.2832); ctx.fill();

      // Sombra interna (volumen 3D) abajo-derecha
      const shade = ctx.createRadialGradient(p.sx + Rp * 0.42, p.sy + Rp * 0.5, Rp * 0.08, p.sx, p.sy, Rp);
      shade.addColorStop(0, 'rgba(4,10,28,0.55)');
      shade.addColorStop(0.55, 'rgba(4,10,28,0)');
      shade.addColorStop(1, 'rgba(4,10,28,0)');
      ctx.fillStyle = shade; ctx.beginPath(); ctx.arc(p.sx, p.sy, Rp, 0, 6.2832); ctx.fill();

      // ── ANILLO CRECIENTE azul (crescent moon ring) ──
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(4, Rp * 0.13);
      ctx.strokeStyle = hexA('#5cc8ff', 0.22);
      ctx.beginPath(); ctx.arc(p.sx, p.sy, Rp * 1.07, Math.PI * 1.12, Math.PI * 1.98); ctx.stroke();
      ctx.lineWidth = Math.max(2, Rp * 0.045);
      ctx.strokeStyle = hexA('#a9e6ff', 0.95);
      ctx.beginPath(); ctx.arc(p.sx, p.sy, Rp * 1.05, Math.PI * 1.12, Math.PI * 1.98); ctx.stroke();
      ctx.restore();

      // Highlight especular (brillo)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.ellipse(p.sx - Rp * 0.32, p.sy - Rp * 0.38, Rp * 0.26, Rp * 0.15, -0.5, 0, 6.2832); ctx.fill();
      ctx.restore();

      // ── Número de reputación + label dentro del orbe ──
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(6,20,44,0.92)';
      ctx.font = `800 ${Math.round(Rp * 0.6)}px ${FONT.display}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(String(Math.round(rep)), p.sx, p.sy - Rp * 0.04);
      ctx.fillStyle = 'rgba(6,20,44,0.68)';
      ctx.font = `700 ${Math.round(Rp * 0.125)}px ${FONT.mono}`;
      ctx.textBaseline = 'top';
      ctx.fillText('REPUTACIÓN', p.sx, p.sy + Rp * 0.28);

      return p;
    }

    // NODOS con GLOW PULSANTE (matching screenshot).
    function glow(x: number, y: number, r: number, color: string, alpha: number, pulse: number) {
      const rr = r * (1 + pulse * 0.15);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 4);
      g.addColorStop(0, hexA(color, 0.95 * alpha));
      g.addColorStop(0.25, hexA(color, 0.6 * alpha));
      g.addColorStop(0.5, hexA(color, 0.3 * alpha));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr * 4, 0, 6.2832); ctx.fill();
      // Núcleo blanco brillante.
      ctx.fillStyle = hexA('#ffffff', 0.9 * alpha); ctx.beginPath(); ctx.arc(x, y, rr * 0.4, 0, 6.2832); ctx.fill();
      // Nodo de color.
      ctx.fillStyle = hexA(color, alpha); ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.2832); ctx.fill();
    }

    const start = performance.now();
    function frame(now: number) {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);

      // ── Fondo: nebulosa + grid de constelación (profundidad) ──
      const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.72);
      bg.addColorStop(0, 'rgba(22,44,88,0.30)');
      bg.addColorStop(0.5, 'rgba(8,16,40,0.10)');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(92,140,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const gstep = 42;
      for (let gx = CX % gstep; gx < W; gx += gstep) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
      for (let gy = CY % gstep; gy < H; gy += gstep) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
      ctx.stroke();

      // ⭐ POLVO ESTELAR REACTIVO (partículas cambian con audio y emoción)
      for (const d of dust) {
        if (!reduce) { 
          // ⭐ Velocidad aumenta con audio y emoción excited
          const speedMultiplier = emotion === 'excited' ? 2.0 : emotion === 'alert' ? 1.5 : 1.0;
          const audioBoost = audioLevel * 0.005;
          d.x += (d.vx * 0.002 * speedMultiplier) + audioBoost; 
          d.y += (d.vy * 0.002 * speedMultiplier) + audioBoost; 
        }
        if (d.x < 0) d.x = 1; if (d.x > 1) d.x = 0; if (d.y < 0) d.y = 1; if (d.y > 1) d.y = 0;
        
        // ⭐ Brillo reactivo al audio
        const tw = 0.4 + 0.6 * Math.sin(t * 1.8 + d.tw) + audioLevel * 0.3;
        const particleColor = emotion === 'celebrating' ? orbColors.halo : '#9fdcff';
        ctx.fillStyle = hexA(particleColor, d.a * tw);
        ctx.beginPath(); ctx.arc(d.x * W, d.y * H, d.r, 0, 6.2832); ctx.fill();
      }

      // Cámara: parallax + autorrotación suave.
      const nx = active ? (ptrX / W - 0.5) * 2 : 0;
      const ny = active ? (ptrY / H - 0.5) * 2 : 0;
      if (!reduce && orbState !== 'error' && selRef.current < 0) yaw += 0.003;
      pitch = -0.2 + ny * 0.25;
      yaw = yaw + nx * 0.3;

      for (const n of nodes) {
        const p = project(n.bx, n.by, n.bz);
        n.sx = p.sx; n.sy = p.sy; n.sc = p.sc; n.zz = p.zz;
      }

      // Detectar punto cercano.
      let hovered = -1;
      if (active) {
        let best = 40;
        nodes.forEach((n, i) => {
          const d = Math.hypot(ptrX - n.sx, ptrY - n.sy);
          if (d < best + n.baseR * n.sc) { best = d; hovered = i; }
        });
      }
      if (hovered !== selRef.current) {
        selRef.current = hovered;
        setSel(hovered >= 0 ? hovered : null);
      }

      const sortIdx = Array.from({ length: nodes.length }, (_, i) => i).sort((a, b) => nodes[a].zz - nodes[b].zz);

      // LÍNEAS VIVAS con energía (del orbe a cada nodo). Aditivas → glow neón.
      const coreP = project(0, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const i of sortIdx) {
        if (nodes[i].zz > 0) continue; // solo las que van adelante
        const n = nodes[i];
        const m = meta[i];
        const isHov = i === hovered;
        const alpha = isHov ? 0.7 : (n.zz > 0 ? 0.25 : 0.4);
        const grad = ctx.createLinearGradient(coreP.sx, coreP.sy, n.sx, n.sy);
        grad.addColorStop(0, hexA('#22D3EE', alpha * 0.6));
        grad.addColorStop(0.5, hexA(m.color, alpha * 0.8));
        grad.addColorStop(1, hexA(m.color, alpha * 0.4));
        ctx.strokeStyle = grad;
        ctx.lineWidth = isHov ? 2.5 : 1.8;
        ctx.setLineDash([4, 6]);
        ctx.lineDashOffset = -t * 8; // energía fluyendo
        ctx.beginPath(); ctx.moveTo(coreP.sx, coreP.sy); ctx.lineTo(n.sx, n.sy); ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();

      // ORBE CENTRAL.
      drawCore(t);

      // NODOS con GLOW PULSANTE (delante del orbe).
      for (const i of sortIdx) {
        if (nodes[i].zz < 0) continue;
        const n = nodes[i];
        const m = meta[i];
        const isHov = i === hovered;
        const pulse = Math.sin(t * 2 + i * 0.8);
        const alpha = isHov ? 1 : (n.zz > 0 ? 0.85 : 0.65);
        glow(n.sx, n.sy, n.baseR * n.sc, m.color, alpha, pulse);
        // Etiqueta sobre el nodo.
        ctx.fillStyle = hexA(m.color, alpha);
        ctx.font = `700 ${Math.round(11 * n.sc)}px ${FONT.display}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(m.label, n.sx, n.sy + n.baseR * n.sc + 6);
      }

      // Métricas flotantes con BLUR (las cifras semi-transparentes del fondo, matching screenshot).
      ctx.save();
      ctx.filter = 'blur(1.5px)';
      ctx.fillStyle = hexA(C.ink, 0.25);
      ctx.font = `700 18px ${FONT.display}`;
      ctx.textAlign = 'center';
      meta.forEach((m, i) => {
        const n = nodes[i];
        if (n.zz > 0.3) { // solo los de atrás
          ctx.fillText(m.value, n.sx, n.sy - 12);
        }
      });
      ctx.restore();

      // Viñeta cinematográfica (profundidad + foco al centro)
      const vig = ctx.createRadialGradient(CX, CY, Math.min(W, H) * 0.34, CX, CY, Math.max(W, H) * 0.74);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,4,0.55)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (ro) ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [meta, height, orbState, reputation]);

  const selectedMeta = sel !== null && sel >= 0 && sel < meta.length ? meta[sel] : null;

  return (
    <div ref={wrapRef} className={className} style={{ position: 'relative', width: '100%', height, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', cursor: sel !== null ? 'pointer' : 'default' }} aria-label={ariaLabel} />
      {selectedMeta && (
        <div style={{
          position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
          minWidth: 280, maxWidth: '90%', padding: '14px 16px', borderRadius: 16,
          background: 'linear-gradient(180deg, rgba(11,14,26,0.96), rgba(4,6,14,0.98))',
          border: `1px solid ${hexA(selectedMeta.color, 0.5)}`,
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          boxShadow: `0 12px 40px ${hexA(selectedMeta.color, 0.35)}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: selectedMeta.color,
              boxShadow: `0 0 12px ${selectedMeta.color}`,
            }} />
            <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16, color: C.ink }}>{selectedMeta.label}</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.mut, marginLeft: 'auto' }}>{selectedMeta.cat}</span>
          </div>
          <p style={{ fontFamily: FONT.display, fontSize: 14, color: C.mut, margin: '0 0 10px', lineHeight: 1.5 }}>{selectedMeta.detail}</p>
          <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.line}`, marginBottom: 12 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1, color: C.cyanDim, textTransform: 'uppercase', marginBottom: 6 }}>▲ Mejora</div>
            <p style={{ fontFamily: FONT.display, fontSize: 13, color: C.ink, margin: 0 }}>{selectedMeta.mejora}</p>
          </div>
          {selectedMeta.tab && onNavigate && (
            <button
              onClick={() => onNavigate(selectedMeta.tab!)}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 13, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${hexA(selectedMeta.color, 0.9)}, ${hexA(selectedMeta.color, 0.7)})`,
                fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              Ir a {TAB_LABELS[selectedMeta.tab] || selectedMeta.tab}
            </button>
          )}
        </div>
      )}
    </div>
  );
}


// Export memoizado para evitar re-renders innecesarios del canvas 3D pesado.
export default memo(HoloNucleo3D);
