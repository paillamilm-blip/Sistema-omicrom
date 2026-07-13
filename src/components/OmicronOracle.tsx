// src/components/OmicronOracle.tsx
// ═══════════════════════════════════════════════════════════════════════
// 🔮 ÓRÁCULO ÓMICRON — Dashboard profesional todo-en-uno, oscuro y premium.
// Rueda de reputación orbital · estado del nodo · mejor match · acciones.
// ═══════════════════════════════════════════════════════════════════════
import {
  User, Bell, Settings, Palette, FileText, Briefcase,
  LayoutDashboard, Network, Search, Share2, Scale,
} from 'lucide-react';
import { useGemeloProfile } from '../hooks/useGemeloProfile';
import { useApp } from '../store/AppContext';
import { ReputationWheel } from './ReputationWheel';
import { C, FONT } from '../theme';
import type { TabId } from '../types';

// Medidor circular (gauge) para el % de match
function MatchGauge({ pct }: { pct: number }) {
  const r = 26, circ = 2 * Math.PI * r;
  const off = circ * (1 - pct / 100);
  return (
    <svg width="68" height="68" viewBox="0 0 68 68">
      <defs>
        <linearGradient id="mg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd27a" /><stop offset="100%" stopColor="#ff9f45" />
        </linearGradient>
      </defs>
      <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <circle cx="34" cy="34" r={r} fill="none" stroke="url(#mg)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 34 34)" />
      <text x="34" y="35" textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 16, fill: '#ffd27a' }}>{pct}%</text>
    </svg>
  );
}


export function OmicronOracle() {
  const { profile, tier } = useGemeloProfile();
  const { setActiveTab, profile: sb } = useApp();

  const rep = profile.rep;
  const axes = profile.axes;
  const tokens = sb?.token_balance ?? 4100;
  const nodeName = sb?.node_type || tier.name || 'Nodo Validado';
  const progress = Math.min(100, Math.max(6, rep));
  const match = 96;

  const tabs: { id: TabId; label: string; Icon: typeof User }[] = [
    { id: 'perfil', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'maxskill', label: 'Habilidades', Icon: Network },
    { id: 'empleos', label: 'Oportunidades', Icon: Search },
    { id: 'market', label: 'Red', Icon: Share2 },
    { id: 'gobernanza', label: 'Gobierno', Icon: Scale },
  ];

  return (
    <div style={S.container}>
      <div style={S.grid} />
      <div style={S.nebula} />

      {/* Barra superior */}
      <header style={S.topbar}>
        <div style={S.brand}>
          <div style={S.omega}>Ω</div>
          <div>
            <div style={S.brandName}>Ómicron</div>
            <div style={S.brandSub}>{tokens.toLocaleString()} Ω · N4</div>
          </div>
        </div>
        <div style={S.topIcons}>
          <button style={S.iconBtn}><User size={18} /></button>
          <button style={S.iconBtn}><Bell size={18} /></button>
          <button style={S.iconBtn}><Settings size={18} /></button>
        </div>
      </header>

      {/* Contenido scrolleable */}
      <main style={S.scroll}>
        <div style={S.wheelWrap}>
          <ReputationWheel rep={rep} axes={axes} />
        </div>


        {/* Estado del nodo + progreso */}
        <section style={S.card}>
          <div style={S.statusTop}>
            <div>
              <div style={S.statusRole}>Tech Lead / Arquitecto</div>
              <div style={S.statusSub}>Top 25% de la Red · React | TypeScript</div>
            </div>
            <div style={S.nodeBadge}>N4 · {nodeName}</div>
          </div>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill, width: `${progress}%` }} />
          </div>
        </section>

        {/* Mejor Match */}
        <section style={S.card}>
          <div style={S.cardLabel}>MEJOR MATCH</div>
          <div style={S.matchRow}>
            <div style={S.matchIcon}><Palette size={22} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.matchTitle}>Creative Technologist</div>
              <div style={S.matchDesc}>Rol creativo de alto valor · alineado a tu perfil</div>
            </div>
            <MatchGauge pct={match} />
          </div>
          <button onClick={() => setActiveTab('empleos')} style={S.matchBtn}>Ver oportunidad</button>
        </section>

        {/* Acciones rápidas */}
        <section>
          <div style={S.sectionTitle}>Acciones Rápidas</div>
          <div style={S.actionsRow}>
            <button onClick={() => setActiveTab('perfil')} style={S.actionBtn}>
              <div style={{ ...S.actionIcon, background: 'rgba(92,200,255,0.14)', color: C.cyan }}><FileText size={20} /></div>
              <span style={S.actionLabel}>Subir CV</span>
            </button>
            <button onClick={() => setActiveTab('empleos')} style={S.actionBtn}>
              <div style={{ ...S.actionIcon, background: 'rgba(255,176,46,0.14)', color: C.gold }}><Briefcase size={20} /></div>
              <span style={S.actionLabel}>Postulaciones</span>
            </button>
          </div>
        </section>

        <div style={{ height: 96 }} />
      </main>


      {/* FAB Oráculo */}
      <button onClick={() => setActiveTab('chat')} style={S.fab} aria-label="Consultar al Oráculo">Ω</button>

      {/* Tab bar inferior */}
      <nav style={S.tabbar}>
        {tabs.map(({ id, label, Icon }) => {
          const active = id === 'perfil';
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{ ...S.tab, ...(active ? S.tabActive : {}) }}>
              <Icon size={20} />
              <span style={S.tabLabel}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: { position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'radial-gradient(130% 90% at 50% 12%, #071324 0%, #030814 55%, #01030a 100%)', overflow: 'hidden' },
  grid: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(92,200,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(92,200,255,0.045) 1px, transparent 1px)', backgroundSize: '34px 34px', maskImage: 'radial-gradient(circle at 50% 30%, #000 0%, transparent 78%)', WebkitMaskImage: 'radial-gradient(circle at 50% 30%, #000 0%, transparent 78%)', pointerEvents: 'none' },
  nebula: { position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 520, height: 520, background: 'radial-gradient(circle, rgba(63,208,201,0.12), transparent 65%)', filter: 'blur(20px)', pointerEvents: 'none' },

  topbar: { position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(150,180,255,0.08)' },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  omega: { width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontWeight: 800, fontSize: 21, color: '#eaf6ff', background: 'linear-gradient(140deg, #cfe9ff, #8fb6ff 45%, #5e7fe6)', boxShadow: '0 4px 18px rgba(94,124,230,0.5), inset 0 1px 2px rgba(255,255,255,0.6)' },
  brandName: { fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: C.ink, letterSpacing: -0.2 },
  brandSub: { fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim, letterSpacing: 0.4 },
  topIcons: { display: 'flex', gap: 7 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(150,180,255,0.12)', color: 'rgba(220,232,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  scroll: { position: 'relative', zIndex: 3, flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 16px 0', WebkitOverflowScrolling: 'touch' },
  wheelWrap: { padding: '6px 0 14px' },

  card: { padding: '14px 16px', borderRadius: 18, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(150,180,255,0.14)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', marginBottom: 12 },
  statusTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  statusRole: { fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: -0.2 },
  statusSub: { fontFamily: FONT.mono, fontSize: 10.5, color: C.mut, marginTop: 3, letterSpacing: 0.3 },
  nodeBadge: { flexShrink: 0, padding: '5px 10px', borderRadius: 9, background: 'rgba(63,208,201,0.12)', border: '1px solid rgba(63,208,201,0.3)', fontFamily: FONT.mono, fontSize: 10, fontWeight: 700, color: C.green, whiteSpace: 'nowrap' },
  progressTrack: { height: 8, borderRadius: 5, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5, background: 'linear-gradient(90deg, #3fd0c9, #5cc8ff 55%, #5e5ce6)', boxShadow: '0 0 14px rgba(92,200,255,0.6)' },

  cardLabel: { fontFamily: FONT.mono, fontSize: 9.5, fontWeight: 700, color: C.cyanDim, letterSpacing: 1.5, marginBottom: 10 },
  matchRow: { display: 'flex', alignItems: 'center', gap: 12 },
  matchIcon: { width: 46, height: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(140deg, rgba(255,210,122,0.2), rgba(255,159,69,0.14))', border: '1px solid rgba(255,176,46,0.3)', color: C.gold, flexShrink: 0 },
  matchTitle: { fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: C.ink },
  matchDesc: { fontFamily: FONT.body, fontSize: 11.5, color: C.mut, marginTop: 2 },
  matchBtn: { width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 13, border: 'none', cursor: 'pointer', fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#04121f', background: 'linear-gradient(135deg, #ffd27a, #ff9f45)', boxShadow: '0 8px 22px rgba(255,159,69,0.32)' },

  sectionTitle: { fontFamily: FONT.display, fontSize: 14, fontWeight: 700, color: C.ink, margin: '2px 2px 10px' },
  actionsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  actionBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0', borderRadius: 16, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(150,180,255,0.14)', cursor: 'pointer' },
  actionIcon: { width: 44, height: 44, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: FONT.display, fontSize: 13, fontWeight: 600, color: C.ink },

  fab: { position: 'absolute', right: 16, bottom: 86, zIndex: 12, width: 52, height: 52, borderRadius: 16, border: '1px solid rgba(120,240,225,0.4)', cursor: 'pointer', fontFamily: FONT.display, fontWeight: 800, fontSize: 24, color: '#04121f', background: 'linear-gradient(140deg, #6ff0e0, #3fd0c9 55%, #2f8fb8)', boxShadow: '0 10px 28px rgba(63,208,201,0.5)' },

  tabbar: { position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-around', padding: '9px 8px 16px', borderTop: '1px solid rgba(150,180,255,0.1)', background: 'rgba(4,8,18,0.82)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' },
  tab: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 12, background: 'none', border: 'none', cursor: 'pointer', color: C.mut },
  tabActive: { background: 'rgba(92,200,255,0.12)', color: C.cyan },
  tabLabel: { fontFamily: FONT.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: 0.2 },
};
