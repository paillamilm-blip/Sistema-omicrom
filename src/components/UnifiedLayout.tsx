// src/components/UnifiedLayout.tsx
// ═══════════════════════════════════════════════════════════════════════
// UNIFIED LAYOUT — Wrapper cohesivo para toda la app
// Background holográfico unificado, header contextual, navegación fluida.
// ═══════════════════════════════════════════════════════════════════════
import { ReactNode } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { C, FONT } from '../theme';

// Inyecta (una sola vez) el keyframe del barrido holográfico "Industria 5.0".
function injectHudStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('omi-hud-css')) return;
  const s = document.createElement('style');
  s.id = 'omi-hud-css';
  s.textContent = `
    @keyframes omiScan { 0%{transform:translateY(-160px);opacity:0} 12%{opacity:.55} 88%{opacity:.55} 100%{transform:translateY(100vh);opacity:0} }
    .omi-scan { animation: omiScan 7.5s linear infinite; }
    @media (prefers-reduced-motion: reduce){ .omi-scan{ animation:none; opacity:0; } }
  `;
  document.head.appendChild(s);
}
injectHudStyles();

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
  showBackButton = true,
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
      {/* Fondo Ómicron: grilla + halo (continuidad visual con la orbe) */}
      <div style={S.bgGrid} />
      <div style={S.bgGlow} />

      {/* Ambiente Industria 5.0: scanlines + barrido holográfico + esquinas HUD */}
      <div style={S.scanlines} />
      <div className="omi-scan" style={S.scanSweep} />
      <div style={{ ...S.hudCorner, ...S.hudTL }} />
      <div style={{ ...S.hudCorner, ...S.hudTR }} />
      <div style={{ ...S.hudCorner, ...S.hudBL }} />
      <div style={{ ...S.hudCorner, ...S.hudBR }} />

      {/* Header contextual (siempre muestra botón de volver) */}
      {(title || showBackButton) && (
        <div style={S.header}>
          <div style={S.headerContent}>
            {showBackButton && (
              <button onClick={handleBack} style={S.backBtn} aria-label="Volver">
                <ArrowLeft size={18} />
              </button>
            )}
            
            {title && (
              <div style={S.titleSection}>
                <Sparkles size={16} style={{ color: C.cyan, opacity: 0.7 }} />
                <h1 style={S.title}>{title}</h1>
              </div>
            )}

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
    background: 'radial-gradient(130% 95% at 50% 6%, #061024 0%, #02030a 52%, #000003 100%)',
  },
  bgGrid: {
    position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
    backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
    backgroundSize: '44px 44px',
    maskImage: 'radial-gradient(circle at 50% 16%, #000, transparent 72%)',
    WebkitMaskImage: 'radial-gradient(circle at 50% 16%, #000, transparent 72%)',
  },
  bgGlow: {
    position: 'absolute', top: '-28%', left: '50%', transform: 'translateX(-50%)',
    width: '120%', height: '70%', zIndex: 0, pointerEvents: 'none',
    background: 'radial-gradient(circle at 50% 30%, rgba(94,92,230,0.16), transparent 60%)',
  },

  // Líneas de escaneo tenues (textura de pantalla holográfica), detrás del contenido.
  scanlines: {
    position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.5,
    backgroundImage: 'repeating-linear-gradient(to bottom, rgba(92,200,255,0.035) 0px, rgba(92,200,255,0.035) 1px, transparent 1px, transparent 3px)',
  },
  // Barrido holográfico que recorre la consola (encima, muy sutil).
  scanSweep: {
    position: 'absolute', left: 0, right: 0, top: 0, height: 150, zIndex: 4, pointerEvents: 'none',
    background: 'linear-gradient(180deg, transparent, rgba(92,200,255,0.07), transparent)',
    mixBlendMode: 'screen',
  },
  // Esquinas HUD (marco de consola industrial) en las 4 esquinas del viewport.
  hudCorner: { position: 'absolute', width: 20, height: 20, zIndex: 3, pointerEvents: 'none', opacity: 0.6 },
  hudTL: { top: 8, left: 8, borderTop: `1.5px solid ${C.cyan}`, borderLeft: `1.5px solid ${C.cyan}` },
  hudTR: { top: 8, right: 8, borderTop: `1.5px solid ${C.cyan}`, borderRight: `1.5px solid ${C.cyan}` },
  hudBL: { bottom: 8, left: 8, borderBottom: `1.5px solid ${C.cyan}`, borderLeft: `1.5px solid ${C.cyan}` },
  hudBR: { bottom: 8, right: 8, borderBottom: `1.5px solid ${C.cyan}`, borderRight: `1.5px solid ${C.cyan}` },

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
