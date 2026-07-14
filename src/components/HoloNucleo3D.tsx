// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON CORE · HoloNucleo3D — EXPERIENCIA 3D PREMIUM BRUTAL
// Matching EXACTO del prototipo holo-gemelo.html: orbe ENORME brillante,
// nodos con GLOWS pulsantes, líneas VIVAS con energía, métricas flotantes
// con blur, rotación orbital suave, parallax, nodos tocables con fichas.
// IMPACTO PREMIUM MÁXIMO: oscuro, tecnológico, moderno.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState, memo, type ReactNode } from 'react';
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
  variant?: string;          // compat: PerfilTab pasa "identity"
  orbSize?: string;          // compat: PerfilTab pasa "md"
  center?: ReactNode;        // contenido central superpuesto (nº reputación)
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
  onNavigate,
  className = '',
  center,
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

    // ⭐ ORBE PREMIUM: esfera luminosa con volumen, bloom aditivo (neón real),
    // anillo creciente azul y anillos orbitales. El número lo pinta el overlay `center`.
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

      // ── BLOOM sutil (profesional, sin neón exagerado) ──
      ctx.save();
      const halo = ctx.createRadialGradient(p.sx, p.sy, Rp * 0.3, p.sx, p.sy, Rp * 2.8);
      halo.addColorStop(0, hexA(orbColors.core, 0.18));
      halo.addColorStop(0.4, hexA(orbColors.accent, 0.06));
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p.sx, p.sy, Rp * 2.8, 0, 6.2832); ctx.fill();

      // Un solo anillo orbital sutil
      ctx.translate(p.sx, p.sy);
      ctx.save(); ctx.rotate(t * 0.15);
      ctx.strokeStyle = hexA('#8aa0c0', 0.12); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(0, 0, Rp * 1.4, Rp * 0.5, 0, 0, 6.2832); ctx.stroke(); ctx.restore();
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

      // ── Arco de progreso (indicador profesional, no anillo lunar) ──
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(3, Rp * 0.06);
      ctx.strokeStyle = hexA('#4a7090', 0.3);
      ctx.beginPath(); ctx.arc(p.sx, p.sy, Rp * 1.08, 0, 6.2832); ctx.stroke();
      // Arco de progreso (porcentaje de reputación)
      ctx.strokeStyle = hexA(orbColors.core, 0.7);
      ctx.beginPath(); ctx.arc(p.sx, p.sy, Rp * 1.08, -Math.PI / 2, -Math.PI / 2 + (rep / 100) * 6.2832); ctx.stroke();
      ctx.restore();

      // Highlight interno sutil
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.ellipse(p.sx - Rp * 0.28, p.sy - Rp * 0.32, Rp * 0.18, Rp * 0.10, -0.5, 0, 6.2832); ctx.fill();
      ctx.restore();

      return p;
    }

    // NODOS PROFESIONALES (sin glow excesivo, sólidos y legibles)
    function glow(x: number, y: number, r: number, color: string, alpha: number, _pulse: number) {
      const rr = r;
      // Halo sutil (no exagerado)
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 2.2);
      g.addColorStop(0, hexA(color, 0.5 * alpha));
      g.addColorStop(0.5, hexA(color, 0.15 * alpha));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr * 2.2, 0, 6.2832); ctx.fill();
      // Nodo sólido con borde
      ctx.fillStyle = hexA(color, 0.85 * alpha); ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.2832); ctx.fill();
      // Borde fino blanco
      ctx.strokeStyle = hexA('#ffffff', 0.3 * alpha); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.2832); ctx.stroke();
    }

    const start = performance.now();
    function frame(now: number) {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);

      // ── Fondo: oscuro profesional con grid sutil ──
      const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.72);
      bg.addColorStop(0, 'rgba(12,20,40,0.18)');
      bg.addColorStop(0.5, 'rgba(4,8,20,0.08)');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // Grid muy sutil (profesional, no sci-fi)
      ctx.strokeStyle = 'rgba(60,80,120,0.03)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      const gstep = 50;
      for (let gx = CX % gstep; gx < W; gx += gstep) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
      for (let gy = CY % gstep; gy < H; gy += gstep) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
      ctx.stroke();

      // Partículas muy sutiles (datos en movimiento, no polvo estelar)
      for (const d of dust) {
        if (!reduce) { 
          d.x += d.vx * 0.001; 
          d.y += d.vy * 0.001; 
        }
        if (d.x < 0) d.x = 1; if (d.x > 1) d.x = 0; if (d.y < 0) d.y = 1; if (d.y > 1) d.y = 0;
        const tw = 0.3 + 0.3 * Math.sin(t * 0.8 + d.tw);
        ctx.fillStyle = hexA('#6080a0', d.a * tw * 0.4);
        ctx.beginPath(); ctx.arc(d.x * W, d.y * H, d.r * 0.6, 0, 6.2832); ctx.fill();
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

      // ═══ SINERGIAS ENTRE NODOS (conexiones nodo↔nodo) ═══
      // Cada nodo se conecta con sus vecinos más cercanos en la esfera (profesional, no solo centro)
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      const synergyPairs: [number, number][] = [];
      // Conectar nodos adyacentes (vecindad por distancia 3D) 
      for (let a = 0; a < nodes.length; a++) {
        for (let b = a + 1; b < nodes.length; b++) {
          const dx = nodes[a].bx - nodes[b].bx;
          const dy = nodes[a].by - nodes[b].by;
          const dz = nodes[a].bz - nodes[b].bz;
          const dist3d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          // Conectar si están relativamente cerca (< 1.1 en esfera unitaria)
          if (dist3d < 1.1) synergyPairs.push([a, b]);
        }
      }
      // Dibujar sinergias como líneas sutiles profesionales
      for (const [a, b] of synergyPairs) {
        const nA = nodes[a], nB = nodes[b];
        const mA = meta[a], mB = meta[b];
        const avgZ = (nA.zz + nB.zz) / 2;
        const depthAlpha = Math.max(0.08, Math.min(0.35, 0.25 + avgZ * 0.15));
        const isAnyHovered = a === hovered || b === hovered;
        const lineAlpha = isAnyHovered ? 0.55 : depthAlpha;
        
        // Gradiente de color entre ambos nodos
        const grad = ctx.createLinearGradient(nA.sx, nA.sy, nB.sx, nB.sy);
        grad.addColorStop(0, hexA(mA.color, lineAlpha * 0.7));
        grad.addColorStop(0.5, hexA('#8aa0c0', lineAlpha * 0.4));
        grad.addColorStop(1, hexA(mB.color, lineAlpha * 0.7));
        ctx.strokeStyle = grad;
        ctx.lineWidth = isAnyHovered ? 1.6 : 0.8;
        ctx.beginPath();
        ctx.moveTo(nA.sx, nA.sy);
        // Curva suave (bezier) en vez de línea recta para look profesional
        const cpx = (nA.sx + nB.sx) / 2 + (nA.sy - nB.sy) * 0.08;
        const cpy = (nA.sy + nB.sy) / 2 + (nB.sx - nA.sx) * 0.08;
        ctx.quadraticCurveTo(cpx, cpy, nB.sx, nB.sy);
        ctx.stroke();
      }
      ctx.restore();

      // LÍNEAS del centro a cada nodo (profesional: sutiles, sin dash)
      ctx.save();
      for (const i of sortIdx) {
        const n = nodes[i];
        const m = meta[i];
        const isHov = i === hovered;
        const depthAlpha = n.zz > 0 ? 0.12 : 0.22;
        const alpha = isHov ? 0.5 : depthAlpha;
        ctx.strokeStyle = hexA(m.color, alpha);
        ctx.lineWidth = isHov ? 1.5 : 0.7;
        ctx.beginPath(); ctx.moveTo(coreP.sx, coreP.sy); ctx.lineTo(n.sx, n.sy); ctx.stroke();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, height, orbState, reputation]);

  const selectedMeta = sel !== null && sel >= 0 && sel < meta.length ? meta[sel] : null;

  return (
    <div ref={wrapRef} className={className} style={{ position: 'relative', width: '100%', height, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', cursor: sel !== null ? 'pointer' : 'default' }} aria-label={ariaLabel} />
      {center && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
          {center}
        </div>
      )}
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
