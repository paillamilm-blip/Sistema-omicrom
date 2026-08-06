import { useState, lazy, Suspense, useCallback, useRef, useEffect } from 'react';
import OrbNeuronal, { type OrbNode } from './OrbNeuronal';
import { OraculoBar } from '../OraculoBar';
import { useApp } from '../../store/AppContext';
import { C, FONT } from '../../theme';
import type { TabId } from '../../types';

// =====================================================================
// <OrbShell /> — La shell completa de la app.
//
// Flujo:
//   1. IDLE → solo el orbe flotando sobre negro. Oráculo abajo.
//   2. TAP NODO → el orbe gira, aparece preview flotante del nodo.
//   3. CLICK PREVIEW → fullscreen (se renderiza la tab completa).
//   4. BACK → contrae de vuelta al orbe.
//
// Reemplaza: AppShell + NavigationStack + BottomNav + UnifiedLayout
// =====================================================================

// ── Lazy tab components ─────────────────────────────────────────────
const WalletTab     = lazy(() => import('../tabs/WalletTab').then(m => ({ default: m.WalletTab })));
const ChatTab       = lazy(() => import('../tabs/ChatTab').then(m => ({ default: m.ChatTab })));
const EmpleosTab    = lazy(() => import('../tabs/EmpleosTab').then(m => ({ default: m.EmpleosTab })));
const MarketTab     = lazy(() => import('../tabs/MarketTab').then(m => ({ default: m.MarketTab })));
const PerfilTab     = lazy(() => import('../tabs/PerfilTab').then(m => ({ default: m.PerfilTab })));
const MaxSkillTab   = lazy(() => import('../tabs/MaxSkillTab').then(m => ({ default: m.MaxSkillTab })));
const AcademiaTab   = lazy(() => import('../tabs/AcademiaTab').then(m => ({ default: m.AcademiaTab })));
const GobernanzaTab = lazy(() => import('../tabs/GobernanzaTab').then(m => ({ default: m.GobernanzaTab })));
const VaultTab      = lazy(() => import('../tabs/VaultTab').then(m => ({ default: m.VaultTab })));

// ── Orb node definitions (the app sections) ─────────────────────────
const ORB_NODES: OrbNode[] = [
  { id: 'inicio',     label: 'Inicio',      tab: 'perfil',     icon: '⬡' },
  { id: 'academia',   label: 'Academia',    tab: 'academia',   icon: '◈' },
  { id: 'empleos',    label: 'Empleos',     tab: 'empleos',    icon: '◇' },
  { id: 'mercado',    label: 'Mercado',     tab: 'market',     icon: '⬢' },
  { id: 'mensajes',   label: 'Mensajes',    tab: 'chat',       icon: '○' },
  { id: 'gobernanza', label: 'Gobernanza',  tab: 'gobernanza', icon: '△' },
  { id: 'habilidades', label: 'Habilidades', tab: 'maxskill',  icon: '◎' },
  { id: 'billetera',  label: 'Billetera',   tab: 'wallet',     icon: '▽' },
  { id: 'boveda',     label: 'Bóveda',      tab: 'vault',      icon: '⊡' },
];

// ── States ──────────────────────────────────────────────────────────
type ShellState = 'orb' | 'preview' | 'fullscreen';

function TabLoader() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${C.cyan}`, borderTopColor: 'transparent', animation: 'cp-spin 0.8s linear infinite' }} />
    </div>
  );
}

function renderTab(tab: TabId) {
  switch (tab) {
    case 'perfil':     return <PerfilTab />;
    case 'maxskill':   return <MaxSkillTab />;
    case 'academia':   return <AcademiaTab />;
    case 'market':     return <MarketTab />;
    case 'empleos':    return <EmpleosTab />;
    case 'chat':       return <ChatTab />;
    case 'wallet':     return <WalletTab />;
    case 'gobernanza': return <GobernanzaTab />;
    case 'vault':      return <VaultTab />;
    default:           return null;
  }
}


export function OrbShell() {
  const { setActiveTab } = useApp();
  const [state, setState] = useState<ShellState>('orb');
  const [selectedNode, setSelectedNode] = useState<OrbNode | null>(null);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [nodePositions, setNodePositions] = useState<{ id: string; x: number; y: number; depth: number }[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  // ── Handle node tap → go to preview ─────────────────────────────────
  const handleNodeTap = useCallback((node: OrbNode) => {
    setSelectedNode(node);
    setState('preview');
    setActiveTab(node.tab);
  }, [setActiveTab]);

  // ── Handle preview click → fullscreen ───────────────────────────────
  const handlePreviewClick = useCallback(() => {
    setState('fullscreen');
  }, []);

  // ── Handle back → return to orb ────────────────────────────────────
  const handleBack = useCallback(() => {
    if (state === 'fullscreen') {
      setState('preview');
    } else {
      setState('orb');
      setSelectedNode(null);
    }
  }, [state]);

  // ── Projected positions callback (from OrbNeuronal 3D → 2D) ────────
  const handleProjected = useCallback((positions: { id: string; x: number; y: number; depth: number }[]) => {
    setNodePositions(positions);
  }, []);

  // ── Simulated Jarvis breath when idle ──────────────────────────────
  useEffect(() => {
    if (state === 'orb' && !isListening) {
      const iv = setInterval(() => {
        setVoiceLevel(Math.sin(Date.now() * 0.002) * 0.05 + 0.05);
      }, 50);
      return () => clearInterval(iv);
    }
  }, [state, isListening]);

  // ── Expose voice control for OraculoBar ────────────────────────────
  // OraculoBar can call these to pulse the orb when speaking
  (OrbShell as any).__setVoiceLevel = setVoiceLevel;
  (OrbShell as any).__setIsListening = setIsListening;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: C.bg,
      overflow: 'hidden',
    }}>
      {/* ── ORB VIEW (always visible, fades when fullscreen) ─────────── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: state === 'fullscreen' ? 0 : 1,
        transform: state === 'fullscreen' ? 'scale(0.8)' : 'scale(1)',
        transition: 'opacity 0.5s cubic-bezier(0.23,1,0.32,1), transform 0.5s cubic-bezier(0.23,1,0.32,1)',
        pointerEvents: state === 'fullscreen' ? 'none' : 'auto',
        zIndex: 1,
      }}>
        <div style={{ width: '85vmin', height: '85vmin', maxWidth: 420, maxHeight: 420 }}>
          <OrbNeuronal
            nodes={ORB_NODES}
            activeNodeId={selectedNode?.id ?? null}
            onNodeTap={handleNodeTap}
            voiceLevel={voiceLevel}
            isListening={isListening}
            onProjectedPositions={handleProjected}
          />
        </div>
      </div>


      {/* ── PREVIEW PANEL (floating card when node selected) ─────────── */}
      {state === 'preview' && selectedNode && (
        <div
          ref={previewRef}
          onClick={handlePreviewClick}
          style={{
            position: 'absolute',
            bottom: '12%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '85%',
            maxWidth: 360,
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: 20,
            padding: '20px 24px',
            cursor: 'pointer',
            zIndex: 10,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 30px ${C.cyanFaint}`,
            animation: 'orbPreviewEnter 0.4s cubic-bezier(0.23,1,0.32,1) both',
          }}
        >
          {/* Node label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>{selectedNode.icon}</span>
            <div>
              <h3 style={{
                margin: 0,
                fontFamily: FONT.display,
                fontSize: 18,
                fontWeight: 700,
                color: C.ink,
                letterSpacing: -0.3,
              }}>
                {selectedNode.label}
              </h3>
              <p style={{
                margin: '2px 0 0',
                fontFamily: FONT.mono,
                fontSize: 10,
                color: C.cyan,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}>
                Toca para abrir
              </p>
            </div>
          </div>

          {/* Mini preview of the tab content (just a teaser) */}
          <div style={{
            height: 120,
            borderRadius: 12,
            background: C.bg,
            border: `1px solid ${C.line}`,
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              transform: 'scale(0.4)',
              transformOrigin: 'top left',
              width: '250%',
              height: '250%',
              pointerEvents: 'none',
              opacity: 0.7,
            }}>
              <Suspense fallback={<TabLoader />}>
                {renderTab(selectedNode.tab)}
              </Suspense>
            </div>
            {/* Gradient overlay for fade effect */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, transparent 40%, ${C.bg} 100%)`,
              pointerEvents: 'none',
            }} />
          </div>
        </div>
      )}


      {/* ── FULLSCREEN VIEW (tab expanded) ───────────────────────────── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: state === 'fullscreen' ? 20 : -1,
        opacity: state === 'fullscreen' ? 1 : 0,
        transform: state === 'fullscreen' ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.4s cubic-bezier(0.23,1,0.32,1), transform 0.4s cubic-bezier(0.23,1,0.32,1)',
        pointerEvents: state === 'fullscreen' ? 'auto' : 'none',
        display: 'flex',
        flexDirection: 'column',
        background: C.bg,
      }}>
        {/* Back button header */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)',
          borderBottom: `1px solid ${C.line}`,
          background: C.surface,
          backdropFilter: 'blur(20px)',
        }}>
          <button
            onClick={handleBack}
            aria-label="Volver al orbe"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: C.glass2,
              border: `1px solid ${C.line}`,
              color: C.cyan,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontSize: 16,
              fontWeight: 700,
              transition: 'transform 0.15s ease, background 0.15s ease',
            }}
          >
            ←
          </button>
          {selectedNode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{selectedNode.icon}</span>
              <span style={{
                fontFamily: FONT.display,
                fontSize: 15,
                fontWeight: 600,
                color: C.ink,
              }}>
                {selectedNode.label}
              </span>
            </div>
          )}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Suspense fallback={<TabLoader />}>
            {selectedNode && renderTab(selectedNode.tab)}
          </Suspense>
        </div>
      </div>

      {/* ── Orb-back tap zone (tap empty space to go back from preview) ── */}
      {state === 'preview' && (
        <div
          onClick={handleBack}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
          }}
        />
      )}

      {/* ── NODE LABELS (HTML overlay projected from 3D) ────────────── */}
      {state !== 'fullscreen' && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
          {nodePositions.map((pos: { id: string; x: number; y: number; depth: number }) => {
            const node = ORB_NODES.find(n => n.id === pos.id);
            if (!node) return null;
            const isFront = pos.depth < 0.5; // only show labels for front-facing nodes
            const isActive = node.id === selectedNode?.id;
            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  transform: 'translate(-50%, -140%)',
                  opacity: isFront ? (isActive ? 1 : 0.7) : 0,
                  transition: 'opacity 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <span style={{
                  fontFamily: FONT.mono,
                  fontSize: isActive ? 11 : 9,
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: 1,
                  color: isActive ? C.cyan : C.mut,
                  textTransform: 'uppercase',
                  textShadow: isActive ? `0 0 8px ${C.cyan}` : 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.3s ease',
                }}>
                  {node.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ORÁCULO (floating voice bar — integrated) ────────────────── */}
      {state !== 'fullscreen' && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15 }}>
          <OraculoBar />
        </div>
      )}

      {/* ── CSS Animations ──────────────────────────────────────────── */}
      <style>{`
        @keyframes orbPreviewEnter {
          from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
