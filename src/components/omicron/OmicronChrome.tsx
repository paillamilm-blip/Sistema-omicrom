// components/omicron/OmicronChrome.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · Chrome compartido para TODAS las pestañas (Industria 5.0).
//
// El fondo holográfico (radial + grilla + halo) ya lo entrega UnifiedLayout,
// así que aquí las pantallas son TRANSPARENTES y dejan ver ese fondo unificado
// (sin repetir fondos ni grillas por pestaña). Provee:
//   - oc.root / oc.scroll  → scaffold de pantalla (transparente, columna)
//   - oc.card              → tarjeta glass premium redondeada
//   - <OmicronHeader/>      → header glass unificado (back + ícono + título + acción)
//   - <OmicronEyebrow/>     → etiqueta de sección mono
// ═══════════════════════════════════════════════════════════════════════
import { ReactNode, CSSProperties } from 'react';
import { ArrowLeft } from 'lucide-react';
import { C, FONT, RADIUS } from '../../theme';

export const oc: Record<string, CSSProperties> = {
  // Pantalla transparente: deja ver el fondo Ómicron de UnifiedLayout.
  root: {
    display: 'flex', flexDirection: 'column', height: '100%',
    position: 'relative', overflow: 'hidden', background: 'transparent',
  },
  scroll: {
    flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0,
    WebkitOverflowScrolling: 'touch',
  },
  // Tarjeta glass premium (mismo lenguaje que el Perfil Ómicron).
  card: {
    borderRadius: RADIUS.xl, padding: 16,
    background: C.glass, border: `1px solid ${C.line}`,
    backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
  },
};

interface OmicronHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onBack?: () => void;
  action?: ReactNode;
  accent?: string;
}

// Header glass unificado. `onBack` muestra la flecha de volver (integrada,
// no un segundo bar) y `action` es el slot derecho (ej. botón "Publicar").
export function OmicronHeader({ title, subtitle, icon, onBack, action, accent = C.cyan }: OmicronHeaderProps) {
  return (
    <div style={S.header}>
      {onBack && (
        <button onClick={onBack} aria-label="Volver" style={S.back}>
          <ArrowLeft size={18} />
        </button>
      )}
      {icon && (
        <div style={{ ...S.iconBadge, background: `linear-gradient(135deg, ${accent}, ${C.purple})`, boxShadow: `0 0 16px ${accent}55` }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {subtitle && (
          <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', color: C.mut }}>
            {subtitle}
          </div>
        )}
        <div style={S.title}>{title}</div>
      </div>
      {action && <div style={S.action}>{action}</div>}
    </div>
  );
}

// Botón de acción compacto para el slot derecho del header (look unificado).
export function OmicronAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={S.actionBtn}>
      {children}
    </button>
  );
}

// Etiqueta de sección (eyebrow) mono, consistente en toda la app.
export function OmicronEyebrow({ children, color = C.mut, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return (
    <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color, padding: '4px 2px 8px', ...style }}>
      {children}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: {
    display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0,
    padding: '12px 14px', marginBottom: 4,
    borderRadius: RADIUS.lg,
    background: 'rgba(255,255,255,0.045)',
    border: `1px solid ${C.line}`,
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  },
  back: {
    flexShrink: 0, width: 36, height: 36, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(92,200,255,0.10)', border: `1px solid ${C.cyanDim}`,
    color: C.cyan, cursor: 'pointer',
  },
  iconBadge: {
    flexShrink: 0, width: 38, height: 38, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#02030a',
  },
  title: {
    fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: C.ink,
    letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  action: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  actionBtn: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12,
    background: 'linear-gradient(135deg,#5cc8ff,#5e5ce6)', border: 'none', color: '#fff',
    cursor: 'pointer', fontFamily: FONT.display, fontWeight: 700, fontSize: 13,
    boxShadow: '0 8px 20px rgba(10,132,255,0.34)',
  },
};


// ═══════════════════════════════════════════════════════════════════════
// PRIMITIVOS DE CONTENIDO PREMIUM (Industria 5.0) — reutilizables en tabs.
// ═══════════════════════════════════════════════════════════════════════

// Inyecta (una vez) los estados interactivos que no se pueden hacer inline.
function injectOcStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('omicron-chrome-css')) return;
  const s = document.createElement('style');
  s.id = 'omicron-chrome-css';
  s.textContent = `
    .oc-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
    .oc-pressable { cursor: pointer; }
    .oc-pressable:hover { transform: translateY(-2px); border-color: rgba(150,180,255,0.30) !important; }
    .oc-pressable:active { transform: scale(0.985); }
    @keyframes ocRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    .oc-rise { animation: ocRise .32s ease both; }
  `;
  document.head.appendChild(s);
}
injectOcStyles();

interface OmicronCardProps {
  children: ReactNode;
  onClick?: () => void;
  accent?: string;
  glow?: boolean;
  style?: CSSProperties;
  className?: string;
}

// Tarjeta glass premium con barra de acento opcional, glow y estado "pressable".
export function OmicronCard({ children, onClick, accent, glow, style, className }: OmicronCardProps) {
  const clickable = !!onClick;
  return (
    <div
      className={`oc-card${clickable ? ' oc-pressable' : ''}${className ? ' ' + className : ''}`}
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: RADIUS.xl,
        padding: 15,
        background: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        border: `1px solid ${C.line}`,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        boxShadow: glow && accent
          ? `0 10px 34px rgba(0,0,0,0.42), 0 0 22px ${accent}22`
          : '0 10px 30px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {accent && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${accent}, transparent)` }} />
      )}
      {children}
    </div>
  );
}

// Chip / etiqueta tipo pill (relleno o contorno).
export function Chip({ children, color = C.cyan, filled, icon }: { children: ReactNode; color?: string; filled?: boolean; icon?: ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
      borderRadius: RADIUS.pill, fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.4,
      color: filled ? '#02030a' : color, background: filled ? color : `${color}1c`,
      border: `1px solid ${filled ? color : `${color}55`}`, whiteSpace: 'nowrap', fontWeight: 600,
    }}>
      {icon}{children}
    </span>
  );
}

// Bloque de métrica (label + valor grande).
export function Stat({ label, value, color = C.ink, icon }: { label: string; value: ReactNode; color?: string; icon?: ReactNode }) {
  return (
    <div style={{ padding: '11px 12px', borderRadius: RADIUS.lg, background: C.glass, border: `1px solid ${C.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.mut, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>{icon}{label}</div>
      <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 20, color, marginTop: 3, letterSpacing: -0.5 }}>{value}</div>
    </div>
  );
}

// Barra de progreso con glow.
export function ProgressBar({ pct, color = C.cyan, height = 7 }: { pct: number; color?: string; height?: number }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ height, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${p}%`, borderRadius: 999, background: `linear-gradient(90deg, ${color}, ${C.purple})`, boxShadow: `0 0 12px ${color}66`, transition: 'width .5s ease' }} />
    </div>
  );
}

// Anillo de progreso (SVG) con contenido central.
export function ProgressRing({ pct, size = 46, stroke = 4, color = C.cyan, children }: { pct: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (circ * p) / 100} style={{ transition: 'stroke-dashoffset .6s ease', filter: `drop-shadow(0 0 4px ${color}88)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, color }}>{children}</div>
    </div>
  );
}

// Título de sección con ícono y slot derecho.
export function SectionTitle({ children, icon, right, color = C.cyan }: { children: ReactNode; icon?: ReactNode; right?: ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 2px 9px' }}>
      {icon && <span style={{ color, display: 'flex' }}>{icon}</span>}
      <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: C.ink, letterSpacing: -0.2 }}>{children}</span>
      {right && <span style={{ marginLeft: 'auto' }}>{right}</span>}
    </div>
  );
}
