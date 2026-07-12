// src/theme.ts
// Sistema Ómicron — Design System · "Holo-Gemelo" PREMIUM
// Identidad: negro-azulado premium (tipo Apple) + paleta sky/indigo/teal + ámbar.
// Las claves históricas (cyan/gold/purple/green/red) se CONSERVAN por
// compatibilidad, pero ahora apuntan a la identidad premium:
//   cyan  → SKY   #5cc8ff   (héroe azul cielo)
//   purple→ INDIGO #5e5ce6  (tiers / destacados)
//   green → TEAL  #3fd0c9   (estado OK / economía)
//   gold  → ÁMBAR #ffb02e   (acento cálido)
// Fuente: sistema Apple (SF Pro / Inter) para el look premium.
export const C = {
  cyan:         '#5cc8ff',   // SKY (héroe)
  cyanDim:      'rgba(92,200,255,0.46)',
  cyanFaint:    'rgba(92,200,255,0.16)',
  cyanGhost:    'rgba(92,200,255,0.08)',
  gold:         '#ffb02e',   // ÁMBAR (acento)
  goldDim:      'rgba(255,176,46,0.46)',
  goldFaint:    'rgba(255,176,46,0.14)',
  purple:       '#5e5ce6',   // INDIGO (tiers / destacados)
  purpleDim:    'rgba(94,92,230,0.44)',
  purpleFaint:  'rgba(94,92,230,0.14)',
  green:        '#3fd0c9',   // TEAL (estado OK)
  greenDim:     'rgba(63,208,201,0.44)',
  greenFaint:   'rgba(63,208,201,0.14)',
  red:          '#ff5c7a',   // ROSA-ROJO premium (peligro)
  redDim:       'rgba(255,92,122,0.44)',
  redFaint:     'rgba(255,92,122,0.14)',
  bg:           '#000206',
  surface:      'rgba(12,16,30,0.86)',
  surfaceLight: 'rgba(22,28,48,0.9)',
  overlay:      'rgba(2,3,10,0.98)',
  locked:       'rgba(255,255,255,0.12)',
  lockedBg:     'rgba(255,255,255,0.04)',
  grid:         'rgba(92,140,255,0.05)',
  // extras premium (no rompen nada; disponibles para nuevas pantallas)
  ink:          '#eaf0fb',
  mut:          '#6b7590',
  glass:        'rgba(255,255,255,0.045)',
  glass2:       'rgba(255,255,255,0.08)',
  line:         'rgba(150,180,255,0.14)',
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

// Fuente premium (sistema Apple → Inter → system-ui). Inter ya está cargada en index.css.
const SANS = "-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',system-ui,sans-serif";
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,monospace";

export const FONT = {
  mono:    MONO,
  display: SANS,
  body:    SANS,
} as const;

export const FONT_STYLE = {
  label:    { fontFamily: MONO, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' as const },
  mono:     { fontFamily: MONO },
  title:    { fontFamily: SANS, fontWeight: 700 as const, letterSpacing: -0.2 },
  subtitle: { fontFamily: MONO, fontSize: 10, letterSpacing: 0.5 },
} as const;

export const KEYFRAMES = `
@keyframes cp-pulse { 0%,100% { opacity:1; box-shadow:0 0 8px #5cc8ff; } 50% { opacity:0.3; box-shadow:none; } }
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

// Radios más redondeados → sensación premium/suave (antes 4/6/10/12/24).
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const BORDER = {
  default: '1px solid rgba(150,180,255,0.14)',
  faint:   '1px solid rgba(150,180,255,0.08)',
  gold:    '1px solid rgba(255,176,46,0.30)',
  purple:  '1px solid rgba(94,92,230,0.30)',
  green:   '1px solid rgba(63,208,201,0.30)',
  red:     '1px solid rgba(255,92,122,0.30)',
  locked:  '1px solid rgba(255,255,255,0.08)',
} as const;

export const GLOW = {
  cyan: '0 0 18px rgba(92,200,255,0.45)', gold: '0 0 18px rgba(255,176,46,0.42)',
  purple: '0 0 18px rgba(94,92,230,0.45)', green: '0 0 18px rgba(63,208,201,0.42)',
  red: '0 0 18px rgba(255,92,122,0.42)', toast: '0 10px 40px rgba(94,92,230,0.4)',
} as const;

export const BASE: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: 'radial-gradient(130% 95% at 50% 18%, #050813 0%, #02030a 52%, #000003 100%)', overflow: 'hidden', position: 'relative' },
  scrollArea: { flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, WebkitOverflowScrolling: 'touch' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', flexShrink: 0, borderBottom: '1px solid rgba(150,180,255,0.12)', background: 'rgba(9,12,22,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', position: 'relative', zIndex: 2 },
  card: { padding: '13px 15px', borderRadius: 18, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(150,180,255,0.14)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' },
  detailPanel: { flexShrink: 0, borderTop: '1px solid rgba(150,180,255,0.12)', padding: '15px 16px', background: 'rgba(6,8,16,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', maxHeight: '38vh', overflowY: 'auto', position: 'relative', zIndex: 2 },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  statCard: { padding: '9px 11px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(150,180,255,0.12)' },
  btnPrimary: { width: '100%', padding: '13px 0', background: 'linear-gradient(135deg,#5cc8ff,#5e5ce6)', border: 'none', borderRadius: 15, fontFamily: SANS, fontWeight: 700, fontSize: 15.5, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.2, boxShadow: '0 12px 32px rgba(10,132,255,0.42)' },
  btnSecondary: { width: '100%', padding: '13px 0', background: 'rgba(92,200,255,0.10)', border: '1px solid rgba(92,200,255,0.35)', borderRadius: 15, fontFamily: SANS, fontWeight: 700, fontSize: 15.5, color: '#5cc8ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.2, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' },
  btnDanger: { width: '100%', padding: '13px 0', background: 'rgba(255,92,122,0.12)', border: '1px solid rgba(255,92,122,0.35)', borderRadius: 15, fontFamily: SANS, fontWeight: 700, fontSize: 15.5, color: '#ff5c7a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.2 },
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
