// theme/layout.ts
// Spacing, radii, z-index, blur, borders y base component styles

import React from 'react';
import { SANS } from './typography';

/** Spacing — grid de 4px */
export const SP = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
} as const;

/** Escala de espaciado (múltiplos de 4px). */
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  40,
  xxl: 64,
} as const;

/** Radios redondeados premium */
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

/** Capas (z-index) para profundidad espacial. */
export const Z = {
  base:    0,
  card:    10,
  orb:     20,
  overlay: 40,
  modal:   50,
  toast:   60,
} as const;

/** Desenfoques para glassmorphism. */
export const BLUR = {
  sm: '8px',
  md: '16px',
  lg: '24px',
} as const;

export const BORDER = {
  default: '1px solid rgba(150,180,255,0.14)',
  faint:   '1px solid rgba(150,180,255,0.08)',
  gold:    '1px solid rgba(255,176,46,0.30)',
  purple:  '1px solid rgba(94,92,230,0.30)',
  green:   '1px solid rgba(63,208,201,0.30)',
  red:     '1px solid rgba(255,92,122,0.30)',
  locked:  '1px solid rgba(255,255,255,0.08)',
} as const;

export const BASE: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: 'radial-gradient(130% 95% at 50% 18%, #050813 0%, #02030a 52%, #000003 100%)', overflow: 'hidden', position: 'relative' },
  scrollArea: { flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, WebkitOverflowScrolling: 'touch' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', flexShrink: 0, borderBottom: '1px solid rgba(150,180,255,0.12)', background: 'rgba(9,12,22,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', position: 'relative', zIndex: 2 },
  card: { padding: '13px 15px', borderRadius: 18, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(150,180,255,0.14)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' },
  detailPanel: { flexShrink: 0, borderTop: '1px solid rgba(150,180,255,0.12)', padding: '15px 16px', background: 'rgba(6,8,16,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', maxHeight: '38vh', overflowY: 'auto', position: 'relative', zIndex: 2 },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  statCard: { padding: '9px 11px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(150,180,255,0.12)' },
  btnPrimary: { width: '100%', padding: '13px 0', background: 'linear-gradient(135deg,#a0aec0,#5e5ce6)', border: 'none', borderRadius: 15, fontFamily: SANS, fontWeight: 700, fontSize: 15.5, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.2, boxShadow: '0 12px 32px rgba(160,174,192,0.42)' },
  btnSecondary: { width: '100%', padding: '13px 0', background: 'rgba(160,174,192,0.10)', border: '1px solid rgba(160,174,192,0.35)', borderRadius: 15, fontFamily: SANS, fontWeight: 700, fontSize: 15.5, color: '#a0aec0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.2, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' },
  btnDanger: { width: '100%', padding: '13px 0', background: 'rgba(255,92,122,0.12)', border: '1px solid rgba(255,92,122,0.35)', borderRadius: 15, fontFamily: SANS, fontWeight: 700, fontSize: 15.5, color: '#ff5c7a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.2 },
};

/** Utility: merge multiple style objects (falsy-safe). */
export function cx(...styles: Array<React.CSSProperties | false | null | undefined>): React.CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}
