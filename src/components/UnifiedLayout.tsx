// src/components/UnifiedLayout.tsx
// ═══════════════════════════════════════════════════════════════════════
// UNIFIED LAYOUT — Wrapper cohesivo para toda la app
// Background holográfico unificado, header contextual, navegación fluida.
// ═══════════════════════════════════════════════════════════════════════
import { ReactNode } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { C, FONT } from '../theme';

interface UnifiedLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  headerActions?: ReactNode;
  fullHeight?: boolean;
}

export function UnifiedLayout({
  children,
  title,
  showBackButton = false,
  onBack,
  headerActions,
  fullHeight = false,
}: UnifiedLayoutProps) {
  const { setActiveTab } = useApp();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setActiveTab('perfil'); // Volver al hub por defecto
    }
  };

  return (
    <div style={S.container}>
      {/* Background holográfico unificado */}
      <div style={S.background}>
        <div style={S.bgGradient1} />
        <div style={S.bgGradient2} />
        <div style={S.bgNoise} />
      </div>

      {/* Header contextual (solo si hay título) */}
      {title && (
        <div style={S.header}>
          <div style={S.headerContent}>
            {showBackButton && (
              <button onClick={handleBack} style={S.backBtn} aria-label="Volver">
                <ArrowLeft size={18} />
              </button>
            )}
            
            <div style={S.titleSection}>
              <Sparkles size={16} style={{ color: C.cyan, opacity: 0.7 }} />
              <h1 style={S.title}>{title}</h1>
            </div>

            {headerActions && (
              <div style={S.actions}>{headerActions}</div>
            )}
          </div>
        </div>
      )}

      {/* Contenido */}
      <div style={{ ...S.content, ...(fullHeight ? S.contentFull : {}) }}>
        {children}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },

  // Background holográfico compartido
  background: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 0,
  },
  bgGradient1: {
    position: 'absolute',
    top: '-50%',
    left: '-20%',
    width: '140%',
    height: '140%',
    background: 'radial-gradient(circle at 30% 20%, rgba(94,92,230,0.15), transparent 60%)',
    animation: 'slowRotate 30s linear infinite',
  },
  bgGradient2: {
    position: 'absolute',
    bottom: '-30%',
    right: '-30%',
    width: '120%',
    height: '120%',
    background: 'radial-gradient(circle at 70% 80%, rgba(92,200,255,0.12), transparent 50%)',
    animation: 'slowRotate 40s linear infinite reverse',
  },
  bgNoise: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`,
    opacity: 0.4,
  },

  // Header contextual
  header: {
    position: 'relative',
    zIndex: 2,
    flexShrink: 0,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    background: 'rgba(6,12,26,0.6)',
    borderBottom: `1px solid ${C.line}`,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(92,200,255,0.1)',
    border: `1px solid ${C.cyanDim}`,
    color: C.cyan,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  titleSection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  title: {
    fontFamily: FONT.display,
    fontSize: 18,
    fontWeight: 700,
    color: C.ink,
    margin: 0,
    letterSpacing: -0.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  // Contenido
  content: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '16px',
    maxWidth: 1200,
    width: '100%',
    margin: '0 auto',
  },
  contentFull: {
    padding: 0,
    maxWidth: 'none',
  },
};
