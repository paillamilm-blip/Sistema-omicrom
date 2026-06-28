// src/theme.ts
// Sistema Ómicrom — Design System · Industrial 5.0 / Cyberpunk

export const C = {
  cyan:         '#00f5ff',
  cyanDim:      'rgba(0,245,255,0.35)',
  cyanFaint:    'rgba(0,245,255,0.12)',
  cyanGhost:    'rgba(0,245,255,0.06)',
  gold:         '#ffd700',
  goldDim:      'rgba(255,215,0,0.35)',
  goldFaint:    'rgba(255,215,0,0.08)',
  purple:       '#2f6bff',
  purpleDim:    'rgba(47,107,255,0.35)',
  purpleFaint:  'rgba(47,107,255,0.08)',
  green:        '#39ff14',
  greenDim:     'rgba(57,255,20,0.35)',
  greenFaint:   'rgba(57,255,20,0.08)',
  red:          '#ff3b5c',
  redDim:       'rgba(255,59,92,0.35)',
  redFaint:     'rgba(255,59,92,0.08)',
  bg:           '#060a12',
  surface:      'rgba(10,17,32,0.97)',
  surfaceLight: 'rgba(13,22,40,0.95)',
  overlay:      'rgba(6,10,18,0.99)',
  locked:       'rgba(255,255,255,0.12)',
  lockedBg:     'rgba(255,255,255,0.04)',
  grid:         'rgba(0,245,255,0.04)',
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

export const FONT_STYLE = {
  label:    { fontFamily: "'Share Tech Mono', 'Courier New', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  mono:     { fontFamily: "'Share Tech Mono', 'Courier New', monospace" },
  title:    { fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 as const },
  subtitle: { fontFamily: "'Share Tech Mono', 'Courier New', monospace", fontSize: 10, letterSpacing: 0.5 },
} as const;

export const KEYFRAMES = `
@keyframes cp-pulse { 0%,100% { opacity:1; box-shadow:0 0 6px #00f5ff; } 50% { opacity:0.3; box-shadow:none; } }
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
  default: '1px solid rgba(0,245,255,0.12)',
  faint:   '1px solid rgba(0,245,255,0.06)',
  gold:    '1px solid rgba(255,215,0,0.2)',
  purple:  '1px solid rgba(47,107,255,0.2)',
  green:   '1px solid rgba(57,255,20,0.2)',
  red:     '1px solid rgba(255,59,92,0.2)',
  locked:  '1px solid rgba(255,255,255,0.08)',
} as const;

export const GLOW = {
  cyan: '0 0 8px rgba(0,245,255,0.5)', gold: '0 0 8px rgba(255,215,0,0.5)',
  purple: '0 0 8px rgba(47,107,255,0.5)', green: '0 0 8px rgba(57,255,20,0.5)',
  red: '0 0 8px rgba(255,59,92,0.5)', toast: '0 4px 24px rgba(255,215,0,0.4)',
} as const;

export const BASE: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: '#060a12', overflow: 'hidden', position: 'relative' },
  scrollArea: { flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, WebkitOverflowScrolling: 'touch' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', flexShrink: 0, borderBottom: '1px solid rgba(0,245,255,0.1)', background: 'rgba(0,245,255,0.02)', position: 'relative', zIndex: 2 },
  card: { padding: '12px 14px', borderRadius: 10, background: 'rgba(10,17,32,0.97)', border: '1px solid rgba(0,245,255,0.12)' },
  detailPanel: { flexShrink: 0, borderTop: '1px solid rgba(0,245,255,0.1)', padding: '14px 16px', background: 'rgba(6,10,18,0.99)', maxHeight: '38vh', overflowY: 'auto', position: 'relative', zIndex: 2 },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  statCard: { padding: '8px 10px', borderRadius: 6, background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.08)' },
  btnPrimary: { width: '100%', padding: '10px 0', background: '#ffd700', border: 'none', borderRadius: 8, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, color: '#060a12', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.5 },
  btnSecondary: { width: '100%', padding: '10px 0', background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.3)', borderRadius: 8, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, color: '#00f5ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.5 },
  btnDanger: { width: '100%', padding: '10px 0', background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.3)', borderRadius: 8, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, color: '#ff3b5c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.5 },
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
