// src/components/HubCentral.tsx
// ═══════════════════════════════════════════════════════════════════════
// HUB CENTRAL — Dashboard unificado y cohesivo
// Galaxia 3D como centro, cards de módulos accesibles, métricas en vivo.
// Experiencia fluida sin pestañas fragmentadas.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { 
  Brain, Briefcase, Lock, Scale, Target, TrendingUp, 
  Users, Sparkles, Zap, Trophy, ArrowRight, MessageCircle,
  Wallet, Store, Boxes
} from 'lucide-react';
import { useGemeloProfile } from '../hooks/useGemeloProfile';
import { useApp } from '../store/AppContext';
import { useRealtime } from '../store/RealtimeContext';
import { HoloNucleo3D } from './HoloNucleo3D';
import type { NucleoChip, OrbEmotion } from './HoloNucleo3D';
import { speak } from '../lib/voiceEngine';
import { evaluateProactiveEvents, getDaysSinceLastLogin } from '../lib/proactiveEngine';
import { GemeloProactive } from './GemeloProactive';
import { C, FONT } from '../theme';
import type { TabId } from '../types';

export function HubCentral() {
  const { profile, tier, next, actions } = useGemeloProfile();
  const { setActiveTab, profile: sb } = useApp();
  const { onlineCount } = useRealtime();
  
  const [emotion, setEmotion] = useState<OrbEmotion>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [proactiveEvent, setProactiveEvent] = useState<any>(null);
  const [lastOnlineCount, setLastOnlineCount] = useState(onlineCount);

  const rep = profile.rep;
  const pe = profile.pe;
  const ax = profile.axes;
  const level = rep >= 80 ? 3 : rep >= 50 ? 2 : 1;
  const tokens = sb?.token_balance ?? 0;
  const nodos = onlineCount > 0 ? onlineCount : 1;

  // Evaluación proactiva al montar
  useEffect(() => {
    const daysSinceLastLogin = getDaysSinceLastLogin();
    const now = new Date();
    
    const context = {
      currentHour: now.getHours(),
      dayOfWeek: now.getDay(),
      reputation: rep,
      pe,
      onlineCount,
      lastOnlineCount,
      daysSinceLastLogin,
      currentTab: 'perfil',
      userName: sb?.display_name,
    };
    
    const event = evaluateProactiveEvents(context);
    if (event) {
      setProactiveEvent(event);
      setEmotion(event.emotion);
      speak(event.message);
    }
  }, []); // eslint-disable-line

  // Detectar network surge
  useEffect(() => {
    if (onlineCount !== lastOnlineCount && onlineCount - lastOnlineCount >= 3) {
      setEmotion('excited');
      const now = new Date();
      const event = evaluateProactiveEvents({
        currentHour: now.getHours(),
        dayOfWeek: now.getDay(),
        reputation: rep,
        pe,
        onlineCount,
        lastOnlineCount,
        daysSinceLastLogin: 0,
        currentTab: 'perfil',
        userName: sb?.display_name,
      });
      if (event?.type === 'network_surge') {
        setProactiveEvent(event);
        speak(event.message);
      }
    }
    setLastOnlineCount(onlineCount);
  }, [onlineCount]); // eslint-disable-line

  // Chips del núcleo 3D
  const chips: NucleoChip[] = [
    { label: 'Nodo', value: `N${level}`, color: C.purple, x: 0.18, y: 0.22 },
    { label: 'PE', value: String(pe), color: C.gold, x: 0.82, y: 0.22 },
    { label: 'REP', value: String(rep), color: C.cyan, x: 0.18, y: 0.78 },
    { label: 'Tokens', value: tokens.toLocaleString(), color: C.green, x: 0.82, y: 0.78 },
  ];

  return (
    <div style={S.container}>
      {/* Header simple con identidad */}
      <div style={S.header}>
        <div style={S.omega}>
          <span style={S.omegaGlyph}>Ω</span>
        </div>
        <div style={S.identity}>
          <div style={S.name}>{sb?.display_name || 'Operador'}</div>
          <div style={S.badge}>
            <span style={S.liveDot} />
            {tier.name} · REP {rep}
          </div>
        </div>
      </div>

      {/* Galaxia 3D - Centro del hub */}
      <div style={S.galaxySection}>
        <HoloNucleo3D
          reputation={rep}
          axes={ax}
          chips={chips}
          livePeers={Math.max(0, nodos - 1)}
          onNavigate={(tab) => setActiveTab(tab as TabId)}
          height={380}
          emotion={emotion}
          audioLevel={audioLevel}
        />
        
        {/* Overlay con red en vivo */}
        <div style={S.liveOverlay}>
          <Users size={14} />
          <span>{nodos} nodos activos</span>
        </div>
      </div>

      {/* Notificación proactiva */}
      <GemeloProactive
        event={proactiveEvent}
        onDismiss={() => setProactiveEvent(null)}
        onAction={(index) => {
          if (proactiveEvent?.actions?.[index]) {
            proactiveEvent.actions[index].action();
          }
        }}
      />

      {/* Mejora continua (si hay próximo paso) */}
      {next && (
        <div style={S.actionCard}>
          <div style={S.cardHeader}>
            <Sparkles size={16} style={{ color: C.gold }} />
            <span style={S.cardTitle}>Mejora Continua</span>
          </div>
          <div style={S.cardBody}>
            <p style={S.cardText}>
              {next.label} subiría tu match ~{Math.max(3, Math.round(next.dRep))}%
            </p>
            <button
              onClick={() => {
                if (next.action === 'cv') setActiveTab('perfil');
                else if (next.action === 'title') setActiveTab('academia');
                else if (next.action === 'year') setActiveTab('maxskill');
                else if (next.action === 'vault') setActiveTab('vault');
              }}
              style={S.actionBtn}
            >
              Ejecutar ahora
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Módulos principales - Grid fluido */}
      <div style={S.modulesGrid}>
        <ModuleCard
          icon={Brain}
          label="Academia"
          description="Aprende y certifícate"
          color={C.gold}
          metric={`${profile.titles ?? 0} títulos`}
          onClick={() => setActiveTab('academia')}
        />
        <ModuleCard
          icon={Briefcase}
          label="Oportunidades"
          description="Encuentra contratos"
          color={C.cyan}
          metric="3 activas"
          badge="Nuevo"
          onClick={() => setActiveTab('empleos')}
        />
        <ModuleCard
          icon={Lock}
          label="Bóveda"
          description="Capitaliza conocimiento"
          color={C.purple}
          metric={`${profile.vault ?? 0} docs`}
          onClick={() => setActiveTab('vault')}
        />
        <ModuleCard
          icon={Scale}
          label="Gobernanza"
          description="Participa en decisiones"
          color={C.green}
          metric="1 caso activo"
          onClick={() => setActiveTab('gobernanza')}
        />
      </div>

      {/* Accesos rápidos secundarios */}
      <div style={S.quickAccess}>
        <QuickBtn icon={Boxes} label="Habilidades" onClick={() => setActiveTab('maxskill')} />
        <QuickBtn icon={Store} label="Servicios" onClick={() => setActiveTab('market')} />
        <QuickBtn icon={Wallet} label="Billetera" onClick={() => setActiveTab('wallet')} />
        <QuickBtn icon={MessageCircle} label="Mensajes" onClick={() => setActiveTab('chat')} />
      </div>

      {/* Espaciador inferior para FAB */}
      <div style={{ height: 100 }} />
    </div>
  );
}

// Componente ModuleCard
interface ModuleCardProps {
  icon: typeof Brain;
  label: string;
  description: string;
  color: string;
  metric?: string;
  badge?: string;
  onClick: () => void;
}

function ModuleCard({ icon: Icon, label, description, color, metric, badge, onClick }: ModuleCardProps) {
  return (
    <button onClick={onClick} style={{ ...S.moduleCard, borderColor: `${color}22` }}>
      {badge && (
        <div style={{ ...S.moduleBadge, background: color }}>
          {badge}
        </div>
      )}
      
      <div style={{ ...S.moduleIcon, background: `${color}18`, borderColor: `${color}44` }}>
        <Icon size={24} style={{ color }} />
      </div>
      
      <div style={S.moduleContent}>
        <div style={S.moduleLabel}>{label}</div>
        <div style={S.moduleDesc}>{description}</div>
        {metric && (
          <div style={{ ...S.moduleMetric, color }}>
            <TrendingUp size={12} />
            {metric}
          </div>
        )}
      </div>
      
      <ArrowRight size={18} style={{ color: C.mut, marginLeft: 'auto' }} />
    </button>
  );
}

// Componente QuickBtn
interface QuickBtnProps {
  icon: typeof Brain;
  label: string;
  onClick: () => void;
}

function QuickBtn({ icon: Icon, label, onClick }: QuickBtnProps) {
  return (
    <button onClick={onClick} style={S.quickBtn}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: '16px',
    paddingTop: '12px',
    overflowY: 'auto',
    overflowX: 'hidden',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  omega: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(140deg, #5cc8ff, #5e5ce6)',
    boxShadow: '0 8px 20px rgba(94,92,230,0.5)',
  },
  omegaGlyph: {
    fontFamily: FONT.display,
    fontWeight: 700,
    fontSize: 26,
    color: '#fff',
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: FONT.display,
    fontSize: 18,
    fontWeight: 700,
    color: C.ink,
    letterSpacing: -0.3,
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: FONT.mono,
    fontSize: 11,
    color: C.mut,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: C.green,
    boxShadow: `0 0 8px ${C.green}`,
    animation: 'cp-pulse 1.5s ease-in-out infinite',
  },

  // Galaxia
  galaxySection: {
    position: 'relative',
    width: '100%',
    minHeight: 380,
    borderRadius: 20,
    overflow: 'hidden',
    background: 'linear-gradient(180deg, rgba(6,12,26,0.6), rgba(4,6,14,0.8))',
    border: `1px solid ${C.line}`,
    marginBottom: 8,
  },
  liveOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 10,
    background: 'rgba(6,12,26,0.85)',
    backdropFilter: 'blur(10px)',
    border: `1px solid ${C.green}66`,
    fontFamily: FONT.mono,
    fontSize: 11,
    color: C.green,
    boxShadow: `0 0 16px ${C.green}44`,
  },

  // Action card
  actionCard: {
    padding: '14px',
    borderRadius: 16,
    background: 'linear-gradient(135deg, rgba(255,210,122,0.1), rgba(255,176,46,0.08))',
    border: `1px solid ${C.gold}44`,
    marginBottom: 8,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: FONT.display,
    fontSize: 14,
    fontWeight: 600,
    color: C.gold,
  },
  cardBody: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  cardText: {
    flex: 1,
    fontFamily: FONT.body,
    fontSize: 13,
    color: C.ink,
    margin: 0,
    minWidth: 200,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 10,
    background: C.gold,
    border: 'none',
    color: '#04121f',
    fontFamily: FONT.display,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },

  // Modules grid
  modulesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
    marginBottom: 12,
  },
  moduleCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px',
    borderRadius: 16,
    background: 'rgba(11,14,26,0.6)',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  moduleBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: '4px 8px',
    borderRadius: 6,
    fontFamily: FONT.mono,
    fontSize: 9,
    fontWeight: 700,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moduleIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid',
  },
  moduleContent: {
    flex: 1,
    minWidth: 0,
  },
  moduleLabel: {
    fontFamily: FONT.display,
    fontSize: 15,
    fontWeight: 600,
    color: C.ink,
    marginBottom: 4,
  },
  moduleDesc: {
    fontFamily: FONT.body,
    fontSize: 12,
    color: C.mut,
    marginBottom: 6,
  },
  moduleMetric: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: 600,
  },

  // Quick access
  quickAccess: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    paddingBottom: 4,
  },
  quickBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.line}`,
    color: C.ink,
    fontFamily: FONT.mono,
    fontSize: 11,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
};
