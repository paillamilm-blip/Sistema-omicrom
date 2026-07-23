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
