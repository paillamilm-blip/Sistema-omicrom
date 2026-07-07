// src/theme.ts
// Sistema Ómicrom — Design System · Industria 5.0
// Paleta armónica: AZUL héroe (#00F0FF) + ÁMBAR acento (#F59E0B) + neutros acero.
// Nota: las claves históricas (cyan/gold/purple) se conservan por compatibilidad,
// pero ahora apuntan a la nueva identidad azul/ámbar.

// ♿ Accesibilidad: colores base oscurecidos ~10-15% respecto a la versión
// original para subir el contraste sobre el fondo oscuro (#020613) y reducir
// la necesidad de hacer zoom / forzar la vista en pantallas pequeñas.
export const C = {
  cyan:         '#00D6E6',   // AZUL HÉROE (oscurecido desde #00F0FF)
  cyanDim:      'rgba(0,214,230,0.44)',
  cyanFaint:    'rgba(0,214,230,0.16)',
  cyanGhost:    'rgba(0,214,230,0.08)',
  gold:         '#E08A00',   // ÁMBAR ACENTO (oscurecido desde #F59E0B)
  goldDim:      'rgba(224,138,0,0.44)',
  goldFaint:    'rgba(224,138,0,0.12)',
  purple:       '#0977a3',   // azul claro (tiers / destacados)
  purpleDim:    'rgba(9,119,163,0.38)',
  purpleFaint:  'rgba(9,119,163,0.12)',
  green:        '#2FE014',   // estado OK (oscurecido desde #39FF14)
  greenDim:     'rgba(47,224,20,0.38)',
  greenFaint:   'rgba(47,224,20,0.12)',
  red:          '#FF3D57',   // estado peligro (oscurecido desde #ff5066)
  redDim:       'rgba(255,61,87,0.38)',
  redFaint:     'rgba(255,61,87,0.12)',
  bg:           '#020613',
  surface:      'rgba(10,20,40,0.97)',
  surfaceLight: 'rgba(20,28,40,0.95)',
  overlay:      'rgba(2,6,19,0.99)',
  locked:       'rgba(255,255,255,0.12)',
  lockedBg:     'rgba(255,255,255,0.04)',
  grid:         'rgba(0,214,230,0.05)',
} as const;

export function statusColor(status: string, options?: { master?: boolean; depth?: number }): string {
  if (status === 'VALIDATED' || status === 'MASTERED') return C.green;
  if (status === 'IN_PROGRESS') return C.cyan;
  if (status === 'ACTIVE') return C.cyan;
  if (options?.master) return C.gold;
  const depth = options?.depth ?? 0;
  if (depth === 0) return C.cyan;
  if (depth === 1) return C.cyanDim;
  if (depth === 2) return C.gold;
  return C.purple;
}

export const CATEGORY_COLOR: Record<string, string> = {
  FOUNDATION: C.cyan, SPECIALIZATION: C.gold, MAESTRÍA: C.purple,
  ADVANCED: C.purple, GOVERNANCE: C.red, ECONOMY: C.green, DEFAULT: C.cyan,
};

export function categoryColor(cat: string): string {
  return CATEGORY_COLOR[cat?.toUpperCase()] ?? CATEGORY_COLOR.DEFAULT;
}

export const FONT = {
  mono:    "'Share Tech Mono', 'Courier New', monospace",
  display: "'Rajdhani', sans-serif",
  body:    "'Rajdhani', sans-serif",
} as const;

// ♿ Accesibilidad: tamaños ligeramente aumentados respecto a la versión
// original (+1px) para reducir la necesidad de hacer zoom.
export const FONT_STYLE = {
  label:    { fontFamily: "'Share Tech Mono', 'Courier New', monospace", fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  mono:     { fontFamily: "'Share Tech Mono', 'Courier New', monospace" },
  title:    { fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 as const },
  subtitle: { fontFamily: "'Share Tech Mono', 'Courier New', monospace", fontSize: 10, letterSpacing: 0.5 },
} as const;

export const KEYFRAMES = `
@keyframes cp-pulse { 0%,100% { opacity:1; box-shadow:0 0 6px #00F0FF; } 50% { opacity:0.3; box-shadow:none; } }
@keyframes cp-spin { to { transform: rotate(360deg); } }
@keyframes cp-scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
@keyframes cp-node-pop { 0% { opacity:0; transform:scale(0.9); } 100% { opacity:1; transform:scale(1); } }
@keyframes cp-trail { 0% { stroke-dashoffset:30; } 100% { stroke-dashoffset:0; } }
@keyframes cp-breathe { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
@keyframes cp-toast-in { 0% { opacity:0; transform:translateX(-50%) translateY(12px); } 100% { opacity:1; transform:translateX(-50%) translateY(0); } }
`;

export const ANIM = {
  pulse: 'cp-pulse 1.5s ease-in-out infinite',
  spin: 'cp-spin 0.8s linear infinite',
  scanline: 'cp-scanline 4s linear infinite',
  nodePop: 'cp-node-pop 0.25s ease both',
  trail: 'cp-trail 1.5s linear infinite',
  breathe: 'cp-breathe 2s ease-in-out infinite',
  toastIn: 'cp-toast-in 0.2s ease both',
} as const;

export const RADIUS = { sm: 4, md: 6, lg: 10, xl: 12, pill: 24 } as const;

export const BORDER = {
  default: '1px solid rgba(0,240,255,0.14)',
  faint:   '1px solid rgba(0,240,255,0.07)',
  gold:    '1px solid rgba(245,158,11,0.25)',
  purple:  '1px solid rgba(10,139,163,0.25)',
  green:   '1px solid rgba(57,255,20,0.25)',
  red:     '1px solid rgba(255,80,102,0.25)',
  locked:  '1px solid rgba(255,255,255,0.08)',
} as const;

export const GLOW = {
  cyan: '0 0 10px rgba(0,240,255,0.5)', gold: '0 0 10px rgba(245,158,11,0.5)',
  purple: '0 0 10px rgba(10,139,163,0.5)', green: '0 0 10px rgba(57,255,20,0.5)',
  red: '0 0 10px rgba(255,80,102,0.5)', toast: '0 4px 24px rgba(245,158,11,0.4)',
} as const;

export const BASE: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: '#020613', overflow: 'hidden', position: 'relative' },
  scrollArea: { flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, WebkitOverflowScrolling: 'touch' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', flexShrink: 0, borderBottom: '1px solid rgba(0,240,255,0.18)', background: 'rgba(0,240,255,0.03)', position: 'relative', zIndex: 2 },
  card: { padding: '12px 14px', borderRadius: 10, background: 'rgba(10,20,40,0.97)', border: '1px solid rgba(0,240,255,0.14)' },
  detailPanel: { flexShrink: 0, borderTop: '1px solid rgba(0,240,255,0.18)', padding: '14px 16px', background: 'rgba(2,6,19,0.99)', maxHeight: '38vh', overflowY: 'auto', position: 'relative', zIndex: 2 },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  statCard: { padding: '8px 10px', borderRadius: 6, background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.10)' },
  btnPrimary: { width: '100%', padding: '10px 0', background: '#E08A00', border: 'none', borderRadius: 8, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, color: '#020613', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.5 },
  btnSecondary: { width: '100%', padding: '10px 0', background: 'rgba(0,214,230,0.10)', border: '1px solid rgba(0,214,230,0.35)', borderRadius: 8, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, color: '#00D6E6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.5 },
  btnDanger: { width: '100%', padding: '10px 0', background: 'rgba(255,61,87,0.12)', border: '1px solid rgba(255,61,87,0.35)', borderRadius: 8, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, color: '#FF3D57', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.5 },
};

export function injectKeyframes(): void {
  if (typeof document === 'undefined') return;
  const id = 'omicron-keyframes';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
}

export function cx(...styles: Array<React.CSSProperties | false | null | undefined>): React.CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}
