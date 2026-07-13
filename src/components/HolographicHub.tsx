// src/components/HolographicHub.tsx
// ═══════════════════════════════════════════════════════════════════════
// 🔥 HOLOGRAPHIC HUB BRUTAL — Vista principal inspirada en imagen referencia
// Orbe holográfico masivo + red orbital + estética cyber brutal
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import { Brain, Briefcase, Lock, Scale, User, Bell, Settings } from 'lucide-react';
import { useGemeloProfile } from '../hooks/useGemeloProfile';
import { useApp } from '../store/AppContext';
import { useRealtime } from '../store/RealtimeContext';
import { C, FONT } from '../theme';
import type { TabId } from '../types';

type ViewMode = 'desempeno' | 'economia' | 'crecimiento';

export function HolographicHub() {
  const { profile, tier } = useGemeloProfile();
  const { setActiveTab, profile: sb } = useApp();
  const { onlineCount } = useRealtime();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('economia');
  const [rotation, setRotation] = useState(0);

  const rep = profile.rep;
  const tokens = sb?.token_balance ?? 0;
  const experiencia = profile.axes.execution ?? 0;
  const nodos = onlineCount > 0 ? onlineCount : 1344;

  // Animación orbital
  useEffect(() => {
    let frame: number;
    const animate = () => {
      setRotation(r => (r + 0.3) % 360);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Canvas: partículas de fondo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; opacity: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }

    let frame: number;
    const render = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.fillStyle = `rgba(92, 200, 255, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => cancelAnimationFrame(frame);
  }, []);

  // Nodos orbitales (posiciones calculadas)
  const orbitalNodes = [
    { id: 'n1', label: 'N1', value: 'NODO', angle: 0, distance: 180, color: C.cyan },
    { id: 'tokens', label: String(tokens), value: 'TOKENS', angle: 270, distance: 200, color: C.gold },
    { id: 'exp', label: String(experiencia), value: 'EXPERIENCIA', angle: 90, distance: 200, color: C.green },
    { id: 'ejecuta', label: 'Ejecuta', value: '', angle: 45, distance: 160, color: '#ff9500' },
    { id: 'aprende', label: 'Aprende', value: '', angle: 135, distance: 160, color: '#ff5252' },
    { id: 'g3', label: 'G3', value: '', angle: 180, distance: 160, color: C.purple },
  ];

  const centerX = 50; // % del container
  const centerY = 45; // %

  return (
    <div style={S.container}>
      {/* Canvas partículas fondo */}
      <canvas ref={canvasRef} style={S.canvas} />

      {/* Header superior */}
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
        <div style={S.headerRight}>
          <button style={S.iconBtn}><User size={20} /></button>
          <button style={S.iconBtn}><Bell size={20} /></button>
          <button style={S.iconBtn}><Settings size={20} /></button>
        </div>
      </div>

      {/* Tabs de vista */}
      <div style={S.tabs}>
        <button
          onClick={() => setViewMode('desempeno')}
          style={{
            ...S.tab,
            ...(viewMode === 'desempeno' && S.tabActive),
          }}
        >
          Desempeño
        </button>
        <button
          onClick={() => setViewMode('economia')}
          style={{
            ...S.tab,
            ...(viewMode === 'economia' && S.tabActive),
          }}
        >
          Economía
        </button>
        <button
          onClick={() => setViewMode('crecimiento')}
          style={{
            ...S.tab,
            ...(viewMode === 'crecimiento' && S.tabActive),
          }}
        >
          Crecimiento
        </button>
      </div>

      {/* Orbe holográfico central */}
      <div style={S.orbitalSpace}>
        {/* Líneas de conexión */}
        <svg style={S.svg} viewBox="0 0 100 100" preserveAspectRatio="none">
          {orbitalNodes.map(node => {
            const angle = (node.angle + rotation) * (Math.PI / 180);
            const x = centerX + Math.cos(angle) * (node.distance / 10);
            const y = centerY + Math.sin(angle) * (node.distance / 10);
            return (
              <line
                key={node.id}
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke={node.color}
                strokeWidth="0.15"
                opacity="0.3"
              />
            );
          })}
        </svg>

        {/* Orbe central */}
        <div style={S.orb}>
          <div style={S.orbGlow} />
          <div style={S.orbCore}>
            <div style={S.repNumber}>{rep}</div>
            <div style={S.repLabel}>REPUTACIÓN</div>
          </div>
        </div>

        {/* Nodos orbitales */}
        {orbitalNodes.map(node => {
          const angle = (node.angle + rotation) * (Math.PI / 180);
          const x = centerX + Math.cos(angle) * (node.distance / 4.5);
          const y = centerY + Math.sin(angle) * (node.distance / 4.5);
          
          return (
            <div
              key={node.id}
              style={{
                ...S.orbitalNode,
                left: `${x}%`,
                top: `${y}%`,
                borderColor: node.color,
                boxShadow: `0 0 20px ${node.color}80`,
              }}
            >
              <div style={{ ...S.nodeValue, color: node.color }}>
                {node.label}
              </div>
              {node.value && (
                <div style={S.nodeLabel}>{node.value}</div>
              )}
            </div>
          );
        })}

        {/* Texto "3 activas OPORTUNIDADES" */}
        <div style={S.activeOpps}>
          <span style={S.oppsNumber}>3 activas</span>
          <span style={S.oppsLabel}>OPORTUNIDADES</span>
        </div>
      </div>

      {/* Card notificación "RED EN VIVO" */}
      <div style={S.liveCard}>
        <div style={S.liveHeader}>
          <div style={S.liveBadge}>
            <div style={S.liveDot} />
            RED EN VIVO · {nodos} NODOS
          </div>
        </div>
        <div style={S.liveBody}>
          <div style={S.liveAvatar}>
            <Brain size={20} />
          </div>
          <div style={S.liveText}>
            Un nodo evolucionó a Pioneer ahora. Entrena. Te acerca a Creative Technologist y a Nodo Core.
          </div>
        </div>
      </div>

      {/* Card "MEJORA CONTINUA" */}
      <div style={S.improveCard}>
        <div style={S.improveHeader}>
          <div style={S.improveBadge}>🎯 MEJORA CONTINUA</div>
        </div>
        <div style={S.improveBody}>
          Dominar Testing / QA subiría tu match ~8%
          <div style={S.improveActions}>
            <button style={S.btnAprender}>Aprender</button>
            <button style={S.btnLuego}>Luego</button>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div style={S.bottomNav}>
        <button
          onClick={() => setActiveTab('academia')}
          style={S.bottomBtn}
        >
          <div style={{ ...S.bottomIcon, background: C.gold }}>
            <Brain size={22} />
          </div>
          <span style={S.bottomLabel}>Entrena</span>
        </button>
        <button
          onClick={() => setActiveTab('empleos')}
          style={S.bottomBtn}
        >
          <div style={{ ...S.bottomIcon, background: '#ff9500' }}>
            <Briefcase size={22} />
          </div>
          <span style={S.bottomLabel}>Ejecuta</span>
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          style={S.bottomBtn}
        >
          <div style={{ ...S.bottomIcon, background: C.cyan }}>
            <Lock size={22} />
          </div>
          <span style={S.bottomLabel}>Capitaliza</span>
        </button>
        <button
          onClick={() => setActiveTab('gobernanza')}
          style={S.bottomBtn}
        >
          <div style={{ ...S.bottomIcon, background: C.purple }}>
            <Scale size={22} />
          </div>
          <span style={S.bottomLabel}>Gobierna</span>
        </button>
      </div>

      {/* Input chat flotante */}
      <div style={S.chatInput}>
        <input
          type="text"
          placeholder="¿Qué me conviene decidir?"
          style={S.input}
        />
        <button style={S.sendBtn}>
          <div style={S.sendIcon}>👆</div>
        </button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    background: '#000000',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  canvas: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
  },

  // Header
  header: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(92,200,255,0.1)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  omegaBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(140deg, #5cc8ff, #5e5ce6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: FONT.display,
    fontSize: 20,
    fontWeight: 700,
    color: '#fff',
    boxShadow: '0 4px 16px rgba(94,92,230,0.6)',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  username: {
    fontFamily: FONT.display,
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
  },
  stats: {
    fontFamily: FONT.mono,
    fontSize: 10,
    color: C.cyanDim,
    letterSpacing: 0.5,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(92,200,255,0.08)',
    border: '1px solid rgba(92,200,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: C.cyan,
    cursor: 'pointer',
  },

  // Tabs
  tabs: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    gap: 12,
    padding: '0 16px',
    marginTop: 16,
  },
  tab: {
    padding: '8px 18px',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontFamily: FONT.body,
    fontSize: 13,
    color: C.mut,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'rgba(92,200,255,0.15)',
    border: '1px solid rgba(92,200,255,0.4)',
    color: C.cyan,
    boxShadow: '0 0 16px rgba(92,200,255,0.3)',
  },

  // Espacio orbital
  orbitalSpace: {
    position: 'relative',
    flex: 1,
    width: '100%',
    marginTop: 20,
    zIndex: 5,
  },

  svg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },

  // Orbe central
  orb: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 200,
    height: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  orbGlow: {
    position: 'absolute',
    inset: -40,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(92,200,255,0.4), transparent 70%)',
    filter: 'blur(30px)',
    animation: 'pulse 3s ease-in-out infinite',
  },
  orbCore: {
    position: 'relative',
    width: 200,
    height: 200,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 40% 40%, rgba(180,220,255,0.9), rgba(92,200,255,0.7), rgba(30,80,140,0.95))',
    border: '2px solid rgba(92,200,255,0.8)',
    boxShadow: '0 0 60px rgba(92,200,255,0.8), inset 0 0 40px rgba(255,255,255,0.2)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  repNumber: {
    fontFamily: FONT.display,
    fontSize: 72,
    fontWeight: 800,
    color: '#000',
    textShadow: '0 2px 8px rgba(255,255,255,0.5)',
    lineHeight: 1,
  },
  repLabel: {
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(0,0,0,0.7)',
    letterSpacing: 1.5,
    marginTop: 4,
  },

  // Nodos orbitales
  orbitalNode: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    padding: '8px 14px',
    borderRadius: 12,
    background: 'rgba(0,0,0,0.85)',
    border: '2px solid',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    minWidth: 60,
  },
  nodeValue: {
    fontFamily: FONT.display,
    fontSize: 16,
    fontWeight: 700,
  },
  nodeLabel: {
    fontFamily: FONT.mono,
    fontSize: 9,
    color: C.mut,
    letterSpacing: 0.5,
  },

  // "3 activas OPORTUNIDADES"
  activeOpps: {
    position: 'absolute',
    bottom: '25%',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  oppsNumber: {
    fontFamily: FONT.display,
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
  },
  oppsLabel: {
    fontFamily: FONT.mono,
    fontSize: 10,
    color: C.cyanDim,
    letterSpacing: 1,
  },

  // Card "RED EN VIVO"
  liveCard: {
    position: 'relative',
    zIndex: 10,
    margin: '0 16px 12px',
    padding: 14,
    borderRadius: 16,
    background: 'rgba(92,200,255,0.08)',
    border: '1px solid rgba(92,200,255,0.3)',
    backdropFilter: 'blur(10px)',
  },
  liveHeader: {
    marginBottom: 10,
  },
  liveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 8,
    background: 'rgba(92,200,255,0.2)',
    fontFamily: FONT.mono,
    fontSize: 10,
    fontWeight: 700,
    color: C.cyan,
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: C.cyan,
    boxShadow: `0 0 8px ${C.cyan}`,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  liveBody: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  liveAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'linear-gradient(140deg, #5cc8ff, #5e5ce6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
  },
  liveText: {
    flex: 1,
    fontFamily: FONT.body,
    fontSize: 13,
    color: '#fff',
    lineHeight: 1.5,
  },

  // Card "MEJORA CONTINUA"
  improveCard: {
    position: 'relative',
    zIndex: 10,
    margin: '0 16px 12px',
    padding: 14,
    borderRadius: 16,
    background: 'rgba(255,210,122,0.08)',
    border: '1px solid rgba(255,210,122,0.3)',
    backdropFilter: 'blur(10px)',
  },
  improveHeader: {
    marginBottom: 10,
  },
  improveBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 8,
    background: 'rgba(255,210,122,0.2)',
    fontFamily: FONT.mono,
    fontSize: 10,
    fontWeight: 700,
    color: C.gold,
    letterSpacing: 0.5,
  },
  improveBody: {
    fontFamily: FONT.body,
    fontSize: 13,
    color: '#fff',
    lineHeight: 1.5,
  },
  improveActions: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  },
  btnAprender: {
    padding: '8px 20px',
    borderRadius: 10,
    background: C.gold,
    border: 'none',
    fontFamily: FONT.display,
    fontSize: 13,
    fontWeight: 600,
    color: '#000',
    cursor: 'pointer',
  },
  btnLuego: {
    padding: '8px 20px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    fontFamily: FONT.display,
    fontSize: 13,
    fontWeight: 600,
    color: C.mut,
    cursor: 'pointer',
  },

  // Bottom nav
  bottomNav: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    justifyContent: 'space-around',
    padding: '12px 16px 20px',
    borderTop: '1px solid rgba(92,200,255,0.1)',
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(10px)',
  },
  bottomBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  bottomIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  },
  bottomLabel: {
    fontFamily: FONT.body,
    fontSize: 12,
    color: '#fff',
  },

  // Chat input
  chatInput: {
    position: 'fixed',
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 20,
    display: 'flex',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 16,
    background: 'rgba(10,10,10,0.95)',
    border: '1px solid rgba(92,200,255,0.3)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  input: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    fontFamily: FONT.body,
    fontSize: 14,
    color: '#fff',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'linear-gradient(140deg, #5cc8ff, #5e5ce6)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(94,92,230,0.4)',
  },
  sendIcon: {
    fontSize: 20,
  },
};
