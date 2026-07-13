// src/components/OmicronOracle.tsx
// ═══════════════════════════════════════════════════════════════════════
// 🔮 ORÁCULO ÓMICRON — Herramienta que cambia vidas, no es juego
// Oscuro, premium, tecnológico. Tu guía en la red.
// ═══════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { Brain, Briefcase, Lock, Scale, User, Bell, Settings } from 'lucide-react';
import { useGemeloProfile } from '../hooks/useGemeloProfile';
import { useApp } from '../store/AppContext';
import { useRealtime } from '../store/RealtimeContext';
import { OracleCore3D } from './OracleCore3D';
import { C, FONT } from '../theme';
import type { TabId } from '../types';

type ViewMode = 'desempeno' | 'economia' | 'crecimiento';

export function OmicronOracle() {
  const { profile, tier, next } = useGemeloProfile();
  const { setActiveTab, profile: sb } = useApp();
  const { onlineCount } = useRealtime();
  const [viewMode, setViewMode] = useState<ViewMode>('economia');

  const rep = profile.rep;
  const nodos = onlineCount > 0 ? onlineCount : 1344;

  return (
    <div style={S.container}>
      {/* Núcleo 3D interactivo */}
      <OracleCore3D />

      {/* Overlay UI oscura premium */}
      <div style={S.overlay}>
        {/* Header minimalista superior */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            <div style={S.omegaBadge}>Ω</div>
            <div style={S.headerInfo}>
              <div style={S.username}>Ómicron</div>
              <div style={S.stats}>
                {nodos} nodos activos · N1 · REP {rep}
              </div>
            </div>
          </div>
          <div style={S.headerIcons}>
            <button style={S.iconBtn} onClick={() => setActiveTab('perfil')}>
              <User size={18} />
            </button>
            <button style={S.iconBtn}>
              <Bell size={18} />
            </button>
            <button style={S.iconBtn}>
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Tabs de vista */}
        <div style={S.tabs}>
          {(['desempeno', 'economia', 'crecimiento'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                ...S.tab,
                ...(viewMode === mode && S.tabActive),
              }}
            >
              {mode === 'desempeno' ? 'Desempeño' : mode === 'economia' ? 'Economía' : 'Crecimiento'}
            </button>
          ))}
        </div>

        {/* Espacio central para orbe 3D (no obstruir) */}
        <div style={S.centralSpace} />

        {/* Indicador "3 activas OPORTUNIDADES" */}
        <div style={S.activeIndicator}>
          <div style={S.activeNumber}>3 activas</div>
          <div style={S.activeLabel}>OPORTUNIDADES</div>
        </div>

        {/* Card "MEJORA CONTINUA" oscura premium */}
        {next && (
          <div style={S.improveCard}>
            <div style={S.improveHeader}>
              <div style={S.improveBadge}>🎯 MEJORA CONTINUA</div>
            </div>
            <div style={S.improveBody}>
              {next.label} subiría tu match ~{Math.max(3, Math.round(next.dRep))}%
            </div>
            <div style={S.improveActions}>
              <button
                onClick={() => {
                  if (next.action === 'cv') setActiveTab('perfil');
                  else if (next.action === 'title') setActiveTab('academia');
                  else if (next.action === 'year') setActiveTab('maxskill');
                  else if (next.action === 'vault') setActiveTab('vault');
                }}
                style={S.btnAprender}
              >
                Aprender
              </button>
              <button style={S.btnLuego}>Luego</button>
            </div>
          </div>
        )}

        {/* Card "RED EN VIVO" */}
        <div style={S.liveCard}>
          <div style={S.liveHeader}>
            <div style={S.liveBadge}>
              <div style={S.liveDot} />
              RED EN VIVO · {nodos} NODOS
            </div>
          </div>
          <div style={S.liveBody}>
            <div style={S.liveAvatar}>
              <Brain size={18} />
            </div>
            <div style={S.liveText}>
              Un nodo evolucionó a Pioneer ahora. Entrena. Te acerca a Creative Technologist y a Nodo Core.
            </div>
          </div>
        </div>

        {/* Bottom navigation oscura */}
        <div style={S.bottomNav}>
          <button onClick={() => setActiveTab('academia')} style={S.bottomBtn}>
            <div style={{ ...S.bottomIcon, background: 'linear-gradient(135deg, #ffd27a 0%, #ff9500 100%)' }}>
              <Brain size={20} />
            </div>
            <span style={S.bottomLabel}>Entrena</span>
          </button>
          <button onClick={() => setActiveTab('empleos')} style={S.bottomBtn}>
            <div style={{ ...S.bottomIcon, background: 'linear-gradient(135deg, #ff9500 0%, #ff5252 100%)' }}>
              <Briefcase size={20} />
            </div>
            <span style={S.bottomLabel}>Ejecuta</span>
          </button>
          <button onClick={() => setActiveTab('vault')} style={S.bottomBtn}>
            <div style={{ ...S.bottomIcon, background: 'linear-gradient(135deg, #5cc8ff 0%, #5e5ce6 100%)' }}>
              <Lock size={20} />
            </div>
            <span style={S.bottomLabel}>Capitaliza</span>
          </button>
          <button onClick={() => setActiveTab('gobernanza')} style={S.bottomBtn}>
            <div style={{ ...S.bottomIcon, background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}>
              <Scale size={20} />
            </div>
            <span style={S.bottomLabel}>Gobierna</span>
          </button>
        </div>

        {/* Input flotante "¿Qué me conviene decidir?" */}
        <div style={S.oracleInput}>
          <input
            type="text"
            placeholder="¿Qué me conviene decidir?"
            style={S.input}
            onFocus={() => {
              // TODO: Abrir chat con oráculo
            }}
          />
          <button style={S.sendBtn}>
            <div style={S.sendIcon}>👆</div>
          </button>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100vh',
    background: '#000000',
    overflow: 'hidden',
  },

  overlay: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10,
  },

  // Header oscuro minimalista
  header: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(92, 200, 255, 0.08)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  omegaBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #5cc8ff, #5e5ce6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: FONT.display,
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    boxShadow: '0 2px 12px rgba(94, 92, 230, 0.4)',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  username: {
    fontFamily: FONT.display,
    fontSize: 14,
    fontWeight: 600,
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  stats: {
    fontFamily: FONT.mono,
    fontSize: 9,
    color: 'rgba(92, 200, 255, 0.7)',
    letterSpacing: 0.3,
  },
  headerIcons: {
    display: 'flex',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  // Tabs oscuros
  tabs: {
    pointerEvents: 'auto',
    display: 'flex',
    gap: 8,
    padding: '0 14px',
    marginTop: 12,
  },
  tab: {
    padding: '6px 16px',
    borderRadius: 16,
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    fontFamily: FONT.body,
    fontSize: 12,
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backdropFilter: 'blur(10px)',
  },
  tabActive: {
    background: 'rgba(92, 200, 255, 0.12)',
    border: '1px solid rgba(92, 200, 255, 0.3)',
    color: '#5cc8ff',
    boxShadow: '0 0 12px rgba(92, 200, 255, 0.2)',
  },

  // Espacio central (dejar libre para orbe 3D)
  centralSpace: {
    flex: 1,
    minHeight: 300,
  },

  // "3 activas OPORTUNIDADES"
  activeIndicator: {
    pointerEvents: 'none',
    position: 'absolute',
    bottom: '38%',
    left: '50%',
    transform: 'translateX(-50%)',
    textAlign: 'center',
  },
  activeNumber: {
    fontFamily: FONT.display,
    fontSize: 16,
    fontWeight: 700,
    color: '#ffffff',
    textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
  },
  activeLabel: {
    fontFamily: FONT.mono,
    fontSize: 9,
    color: 'rgba(92, 200, 255, 0.7)',
    letterSpacing: 1,
    marginTop: 2,
  },

  // Card "MEJORA CONTINUA" oscura premium
  improveCard: {
    pointerEvents: 'auto',
    margin: '0 14px 10px',
    padding: '12px',
    borderRadius: 14,
    background: 'rgba(255, 210, 122, 0.06)',
    border: '1px solid rgba(255, 210, 122, 0.2)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  },
  improveHeader: {
    marginBottom: 8,
  },
  improveBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 6,
    background: 'rgba(255, 210, 122, 0.15)',
    fontFamily: FONT.mono,
    fontSize: 9,
    fontWeight: 700,
    color: '#ffd27a',
    letterSpacing: 0.5,
  },
  improveBody: {
    fontFamily: FONT.body,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 1.5,
    marginBottom: 10,
  },
  improveActions: {
    display: 'flex',
    gap: 8,
  },
  btnAprender: {
    padding: '7px 18px',
    borderRadius: 8,
    background: '#ffd27a',
    border: 'none',
    fontFamily: FONT.display,
    fontSize: 12,
    fontWeight: 600,
    color: '#000',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(255, 210, 122, 0.3)',
  },
  btnLuego: {
    padding: '7px 18px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    fontFamily: FONT.display,
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
  },

  // Card "RED EN VIVO"
  liveCard: {
    pointerEvents: 'auto',
    margin: '0 14px 10px',
    padding: '12px',
    borderRadius: 14,
    background: 'rgba(92, 200, 255, 0.06)',
    border: '1px solid rgba(92, 200, 255, 0.2)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  },
  liveHeader: {
    marginBottom: 8,
  },
  liveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 8px',
    borderRadius: 6,
    background: 'rgba(92, 200, 255, 0.15)',
    fontFamily: FONT.mono,
    fontSize: 9,
    fontWeight: 700,
    color: '#5cc8ff',
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#5cc8ff',
    boxShadow: '0 0 6px #5cc8ff',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  liveBody: {
    display: 'flex',
    gap: 10,
  },
  liveAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #5cc8ff, #5e5ce6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(94, 92, 230, 0.3)',
  },
  liveText: {
    flex: 1,
    fontFamily: FONT.body,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 1.5,
  },

  // Bottom nav oscura
  bottomNav: {
    pointerEvents: 'auto',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '10px 14px 16px',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(92, 200, 255, 0.08)',
  },
  bottomBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  bottomIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    boxShadow: '0 3px 12px rgba(0, 0, 0, 0.4)',
  },
  bottomLabel: {
    fontFamily: FONT.body,
    fontSize: 11,
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Input oráculo flotante
  oracleInput: {
    pointerEvents: 'auto',
    position: 'absolute',
    bottom: 90,
    left: 14,
    right: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 14,
    background: 'rgba(5, 5, 5, 0.95)',
    border: '1px solid rgba(92, 200, 255, 0.25)',
    backdropFilter: 'blur(30px)',
    boxShadow: '0 6px 28px rgba(0, 0, 0, 0.7)',
  },
  input: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    fontFamily: FONT.body,
    fontSize: 13,
    color: '#ffffff',
    placeholder: 'rgba(255, 255, 255, 0.4)',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #5cc8ff, #5e5ce6)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 3px 12px rgba(94, 92, 230, 0.4)',
  },
  sendIcon: {
    fontSize: 18,
  },
};
