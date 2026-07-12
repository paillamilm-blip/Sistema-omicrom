// components/shared/EmptyState.tsx
// Estado vacío holográfico reutilizable, con llamada a la acción opcional.
// Pensado para que un usuario nuevo (beta) sepa SIEMPRE qué hacer a continuación.
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;        // ícono lucide, ej. <BookOpen size={30} />
  title: string;
  hint?: string;
  ctaLabel?: string;
  onCta?: () => void;
  accent?: string;        // color de acento (default cyan)
}

export function EmptyState({ icon, title, hint, ctaLabel, onCta, accent = '#5cc8ff' }: EmptyStateProps) {
  return (
    <div style={S.wrap}>
      <div style={{ ...S.ring, borderColor: `${accent}66`, color: accent, boxShadow: `0 0 26px ${accent}33` }}>
        {icon}
      </div>
      <div style={S.title}>{title}</div>
      {hint && <p style={S.hint}>{hint}</p>}
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          style={{ ...S.cta, background: `linear-gradient(90deg, ${accent}, ${accent}aa)`, boxShadow: `0 0 18px ${accent}55` }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

const MONO = "'SF Mono', monospace";
const RAJ = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif";

const S: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', padding: '48px 28px', gap: 4,
  },
  ring: {
    width: 72, height: 72, borderRadius: '50%', marginBottom: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid', background: 'rgba(92, 200, 255,0.04)',
    animation: 'floatY 5s ease-in-out infinite',
  },
  title: { fontFamily: RAJ, fontWeight: 700, fontSize: 18, color: '#eaf0fb', letterSpacing: 0.5 },
  hint: { fontFamily: MONO, fontSize: 11, lineHeight: 1.6, color: '#6b7590', margin: '6px 0 0', maxWidth: 260 },
  cta: {
    marginTop: 18, padding: '11px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
    color: '#000206', fontFamily: RAJ, fontWeight: 700, fontSize: 14, letterSpacing: 0.5,
  },
};
