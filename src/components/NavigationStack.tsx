// src/components/NavigationStack.tsx
// ═══════════════════════════════════════════════════════════════════════
// NAVIGATION STACK — Sistema de navegación fluido sin pestañas
// Stack animado, transiciones nativas, breadcrumbs inteligentes.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, ReactNode } from 'react';
import { Home, ArrowLeft } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { C, FONT } from '../theme';
import type { TabId } from '../types';

interface NavigationStackProps {
  children: (currentTab: TabId) => ReactNode;
}

const TAB_LABELS: Record<TabId, string> = {
  perfil: 'Hub Central',
  maxskill: 'Habilidades',
  academia: 'Academia',
  market: 'Servicios',
  empleos: 'Oportunidades',
  chat: 'Mensajes',
  wallet: 'Billetera',
  gobernanza: 'Gobernanza',
  vault: 'Bóveda',
};

export function NavigationStack({ children }: NavigationStackProps) {
  const { activeTab, setActiveTab } = useApp();
  const [history, setHistory] = useState<TabId[]>(['perfil']);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Actualizar historial cuando cambia el tab
  useEffect(() => {
    setHistory((prev) => {
      // No duplicar el tab actual
      if (prev[prev.length - 1] === activeTab) return prev;
      // Agregar nuevo tab al historial
      return [...prev, activeTab];
    });
  }, [activeTab]);

  const handleBack = () => {
    if (history.length > 1) {
      setIsTransitioning(true);
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      setActiveTab(newHistory[newHistory.length - 1]);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handleHome = () => {
    setIsTransitioning(true);
    setHistory(['perfil']);
    setActiveTab('perfil');
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const canGoBack = history.length > 1 && activeTab !== 'perfil';

  return (
    <div style={S.container}>
      {/* Breadcrumbs flotante (solo si no estamos en el hub) */}
      {canGoBack && (
        <div style={S.breadcrumbs}>
          <button onClick={handleHome} style={S.breadcrumbBtn} aria-label="Volver al Hub">
            <Home size={14} />
          </button>
          
          <span style={S.breadcrumbSeparator}>›</span>
          
          {history.slice(1, -1).map((tab, i) => (
            <div key={`${tab}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => {
                  const targetIndex = history.indexOf(tab);
                  setHistory(history.slice(0, targetIndex + 1));
                  setActiveTab(tab);
                }}
                style={S.breadcrumbBtn}
              >
                {TAB_LABELS[tab]}
              </button>
              <span style={S.breadcrumbSeparator}>›</span>
            </div>
          ))}
          
          <span style={S.breadcrumbCurrent}>{TAB_LABELS[activeTab]}</span>
        </div>
      )}

      {/* Contenido con transición */}
      <div
        style={{
          ...S.content,
          opacity: isTransitioning ? 0.5 : 1,
          transform: isTransitioning ? 'scale(0.98)' : 'scale(1)',
        }}
      >
        {children(activeTab)}
      </div>

      {/* Floating action: volver */}
      {canGoBack && (
        <button onClick={handleBack} style={S.fab} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
      )}
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

  // Breadcrumbs flotante
  breadcrumbs: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 60,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 12,
    background: 'rgba(6,12,26,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${C.line}`,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    overflowX: 'auto',
    overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  breadcrumbBtn: {
    padding: '4px 10px',
    borderRadius: 8,
    background: 'rgba(92,200,255,0.1)',
    border: `1px solid ${C.cyanDim}`,
    color: C.cyan,
    fontFamily: FONT.mono,
    fontSize: 11,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  breadcrumbSeparator: {
    color: C.mut,
    fontSize: 13,
    opacity: 0.5,
  },
  breadcrumbCurrent: {
    fontFamily: FONT.display,
    fontSize: 12,
    fontWeight: 600,
    color: C.ink,
    whiteSpace: 'nowrap',
  },

  // Contenido
  content: {
    flex: 1,
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // FAB volver
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    zIndex: 20,
    width: 52,
    height: 52,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #5cc8ff, #5e5ce6)',
    border: `1px solid ${C.cyan}`,
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(94,92,230,0.5)',
    transition: 'all 0.3s',
  },
};
