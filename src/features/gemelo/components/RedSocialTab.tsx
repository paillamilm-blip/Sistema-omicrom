// components/tabs/RedSocialTab.tsx
// ═══════════════════════════════════════════════════════════════════════
// RED SOCIAL — Hub de toda la experiencia multiplayer.
// Feed en vivo + Presencia + Ranking + DMs + Sugerencias de conexión.
// Reemplaza el viejo ChatTab como nodo "Red Social" del orbe.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { Users, MessageCircle, Trophy, Zap, UserPlus, Radio } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { useRealtime } from '@/store/RealtimeContext';
import { supabase } from '@/infrastructure/supabase/client';
import { C, FONT } from '@/theme';
import { oc, OmicronHeader } from '@/shared/components/OmicronChrome';
import { GemeloGuidance } from '@/features/gemelo/components/Guidance';
import { RedPanel, DirectChatModal, PublicCredentialModal } from '@/features/gemelo/components/RedSocial';
import type { LiveEvent } from '@/hooks/useRealtimeNetwork';

type Section = 'feed' | 'online' | 'ranking' | 'dms' | 'sugerencias';

export function RedSocialTab() {
  const { profile, setActiveTab } = useApp();
  const { nodes, events, onlineCount, connected } = useRealtime();
  const [section, setSection] = useState<Section>('feed');
  const [viewUser, setViewUser] = useState<string | null>(null);
  const [dmWith, setDmWith] = useState<{ id: string; name: string; username: string; avatar: string | null } | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);

  // Cargar sugerencias de conexión
  useEffect(() => {
    if (section === 'sugerencias' && profile?.id) void loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, profile?.id]);

  async function loadSuggestions() {
    if (!profile) return;
    setLoadingSug(true);
    try {
      // Buscar perfiles que NO están conectados y tienen skills complementarias
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, node_type, reputation_score, skills, cv_summary')
        .neq('id', profile.id)
        .neq('is_ghost', true)
        .order('reputation_score', { ascending: false })
        .limit(15);

      if (data) {
        const mySkills = (profile.skills ?? []).map(s => s.toLowerCase());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scored = data.map((p: any) => {
          const theirSkills = (p.skills ?? []).map((s: string) => s.toLowerCase());
          // Complementariedad: skills que ellos tienen y tú no
          const complementary = theirSkills.filter((s: string) => !mySkills.includes(s));
          // Overlap: skills en común (afinidad)
          const overlap = theirSkills.filter((s: string) => mySkills.includes(s));
          const score = complementary.length * 2 + overlap.length;
          const reason = overlap.length > 0
            ? `Comparten: ${overlap.slice(0, 2).join(', ')}${complementary.length > 0 ? ` · Te complementa en: ${complementary.slice(0, 2).join(', ')}` : ''}`
            : complementary.length > 0
              ? `Te complementa en: ${complementary.slice(0, 3).join(', ')}`
              : 'Profesional activo en la red';
          return { ...p, score, reason };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }).sort((a: any, b: any) => b.score - a.score).slice(0, 8);
        setSuggestions(scored);
      }
    } catch { /* ignore */ }
    setLoadingSug(false);
  }

  const peers = useMemo(() => nodes.filter(n => n.id !== profile?.id), [nodes, profile?.id]);

  const tabs: { id: Section; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'feed', label: 'Feed', icon: <Radio size={13} />, count: events.length },
    { id: 'online', label: 'En línea', icon: <Zap size={13} />, count: onlineCount },
    { id: 'ranking', label: 'Ranking', icon: <Trophy size={13} /> },
    { id: 'dms', label: 'Red', icon: <MessageCircle size={13} /> },
    { id: 'sugerencias', label: 'Conectar', icon: <UserPlus size={13} /> },
  ];

  return (
    <div style={oc.root}>
      <OmicronHeader
        onBack={() => setActiveTab('perfil')}
        icon={<Users size={17} />}
        title="Red Social"
        subtitle={connected ? `${onlineCount} nodos en línea` : 'Conectando...'}
      />
      <GemeloGuidance tab="chat" />

      {/* Tabs */}
      <div style={S.tabRow}>
        {tabs.map(t => {
          const active = section === t.id;
          return (
            <button key={t.id} onClick={() => setSection(t.id)} style={{
              ...S.tab,
              background: active ? 'rgba(160,174,192,0.1)' : 'transparent',
              borderColor: active ? C.cyan : 'rgba(160,174,192,0.15)',
              color: active ? C.cyan : C.mut,
            }}>
              {t.icon}
              <span>{t.label}</span>
              {t.count != null && t.count > 0 && (
                <span style={S.badge}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={S.scroll}>
        {section === 'feed' && <FeedSection events={events} onViewUser={setViewUser} />}
        {section === 'online' && <OnlineSection peers={peers} profile={profile} onViewUser={setViewUser} onDm={setDmWith} />}
        {section === 'ranking' && <RankingSection onViewUser={setViewUser} />}
        {section === 'dms' && <RedPanel />}
        {section === 'sugerencias' && <SugerenciasSection suggestions={suggestions} loading={loadingSug} onViewUser={setViewUser} onConnect={loadSuggestions} />}
      </div>

      {/* Modals */}
      {viewUser && <PublicCredentialModal username={viewUser} onClose={() => setViewUser(null)} />}
      {dmWith && <DirectChatModal other={dmWith} onClose={() => setDmWith(null)} />}
    </div>
  );
}

// ── FEED SECTION ─────────────────────────────────────────────────────
function FeedSection({ events, onViewUser: _onViewUser }: { events: LiveEvent[]; onViewUser: (u: string) => void }) {
  if (events.length === 0) {
    return (
      <div style={S.empty}>
        <Radio size={28} style={{ color: C.cyan, opacity: 0.5 }} />
        <p style={S.emptyTitle}>La red está tranquila</p>
        <p style={S.emptyHint}>Cuando alguien suba de nivel, complete un curso o entre a la red, aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={S.sectionLabel}>🌐 ACTIVIDAD EN VIVO</div>
      {events.map(e => (
        <div key={e.id} style={S.feedItem}>
          <span style={{ ...S.feedDot, background: e.kind === 'level' ? C.gold : e.kind === 'join' ? C.green : C.cyan }} />
          <span style={S.feedText}>{e.text}</span>
          <span style={S.feedTime}>{timeAgo(e.ts)}</span>
        </div>
      ))}
    </div>
  );
}

// ── ONLINE SECTION ───────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
function OnlineSection({ peers, profile, onViewUser, onDm }: {
  peers: any[]; profile: any;
  onViewUser: (u: string) => void;
  onDm: (u: any) => void;
}) {
/* eslint-enable @typescript-eslint/no-explicit-any */
  return (
    <div>
      <div style={S.sectionLabel}>◉ {peers.length + 1} NODOS EN LÍNEA AHORA</div>
      {/* Self */}
      <div style={S.peerRow}>
        <div style={S.avatar}>{(profile?.username ?? 'T')[0].toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div style={S.peerName}>{profile?.username} (tú)</div>
          <div style={S.peerMeta}>{profile?.node_type ?? 'Nodo Operativo'}</div>
        </div>
        <span style={{ ...S.onlineDot, background: C.green }} />
      </div>
      {/* Peers */}
      {peers.map(n => (
        <div key={n.id} style={S.peerRow}>
          <button onClick={() => onViewUser(n.username)} style={{ ...S.avatar, cursor: 'pointer', border: 'none' }}>
            {(n.username ?? 'N')[0].toUpperCase()}
          </button>
          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => onViewUser(n.username)}>
            <div style={S.peerName}>{n.username}</div>
            <div style={S.peerMeta}>{n.node_type} · N{n.node_level}</div>
          </div>
          <button onClick={() => onDm({ id: n.id, name: n.username, username: n.username, avatar: null })} style={S.dmBtn}>
            💬
          </button>
        </div>
      ))}
      {peers.length === 0 && (
        <p style={S.emptyHint}>Eres el único en línea ahora. Cuando otros entren, los verás aquí.</p>
      )}
    </div>
  );
}

// ── RANKING SECTION ──────────────────────────────────────────────────
function RankingSection({ onViewUser }: { onViewUser: (u: string) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [top, setTop] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('get_leaderboard', { p_limit: 20 });
      setTop(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p style={S.emptyHint}>Cargando ranking...</p>;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div>
      <div style={S.sectionLabel}>🏆 RANKING DE REPUTACIÓN</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {top.map((t: any, i: number) => (
        <button key={t.user_id} onClick={() => onViewUser(t.username)} style={S.rankRow}>
          <span style={{ ...S.rankPos, color: i < 3 ? C.gold : C.mut }}>
            {i < 3 ? medals[i] : `#${i + 1}`}
          </span>
          <div style={{ flex: 1 }}>
            <div style={S.peerName}>{t.full_name || t.username}</div>
            <div style={S.peerMeta}>@{t.username}</div>
          </div>
          <span style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, color: C.green }}>
            {Number(t.reputation_score ?? 0).toFixed(0)}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── SUGERENCIAS SECTION ──────────────────────────────────────────────
interface SuggestionItem {
  id: string; username: string; full_name: string; avatar_url: string | null;
  node_type: string; reputation_score: number; reason: string; score: number;
}

function SugerenciasSection({ suggestions, loading, onViewUser, onConnect }: {
  suggestions: SuggestionItem[]; loading: boolean;
  onViewUser: (u: string) => void; onConnect: () => void;
}) {
  const [connecting, setConnecting] = useState<string | null>(null);

  async function handleConnect(userId: string) {
    // Check auth via supabase directly
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { import('@/shared/utils/guestMode').then(m => m.requestAuth()); return; }
    setConnecting(userId);
    try {
      await supabase.rpc('send_connection_request', { p_addressee: userId });
    } catch { /* ignore */ }
    setConnecting(null);
    onConnect(); // refresh
  }

  if (loading) return <p style={S.emptyHint}>Buscando conexiones para ti...</p>;

  if (suggestions.length === 0) {
    return (
      <div style={S.empty}>
        <UserPlus size={28} style={{ color: C.cyan, opacity: 0.5 }} />
        <p style={S.emptyTitle}>Sin sugerencias por ahora</p>
        <p style={S.emptyHint}>Cuando haya más profesionales en la red, te sugeriremos conexiones complementarias.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={S.sectionLabel}>💡 CONEXIONES SUGERIDAS</div>
      <p style={{ ...S.emptyHint, marginBottom: 12 }}>Basadas en complementariedad de skills y afinidad profesional.</p>
      {suggestions.map(s => (
        <div key={s.id} style={S.sugCard}>
          <button onClick={() => onViewUser(s.username)} style={{ ...S.avatar, cursor: 'pointer', border: 'none' }}>
            {(s.full_name || s.username || 'N')[0].toUpperCase()}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.peerName}>{s.full_name || s.username}</div>
            <div style={S.peerMeta}>@{s.username} · {s.node_type} · Rep {s.reputation_score.toFixed(0)}</div>
            <div style={S.sugReason}>{s.reason}</div>
          </div>
          <button
            onClick={() => handleConnect(s.id)}
            disabled={connecting === s.id}
            style={S.connectBtn}
          >
            {connecting === s.id ? '...' : '+ Conectar'}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────
function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// ── Styles ───────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  tabRow: { display: 'flex', gap: 8, padding: '10px 0', overflowX: 'auto', flexShrink: 0 },
  tab: {
    display: 'flex', alignItems: 'center', gap: 4, padding: '7px 11px', borderRadius: 8,
    border: '1px solid', cursor: 'pointer', fontFamily: FONT.mono, fontSize: 11,
    letterSpacing: 0.5, whiteSpace: 'nowrap',
  },
  badge: {
    background: 'rgba(160,174,192,0.2)', borderRadius: 8, padding: '1px 5px',
    fontFamily: FONT.mono, fontSize: 9, fontWeight: 700,
  },
  scroll: { flex: 1, overflowY: 'auto', padding: '4px 0 20px' },
  sectionLabel: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: C.cyan, marginBottom: 10, textTransform: 'uppercase' },
  feedItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: `1px solid rgba(160,174,192,0.08)` },
  feedDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0, boxShadow: '0 0 6px currentColor' },
  feedText: { flex: 1, fontFamily: FONT.body, fontSize: 12.5, color: C.ink, lineHeight: 1.4 },
  feedTime: { fontFamily: FONT.mono, fontSize: 9, color: C.mut, flexShrink: 0 },
  peerRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: `1px solid rgba(160,174,192,0.06)` },
  avatar: {
    width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(63,208,201,0.1)', border: `1px solid ${C.green}44`,
    color: '#c9ffd0', fontFamily: FONT.display, fontWeight: 700, fontSize: 13, flexShrink: 0,
  },
  peerName: { fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: C.ink },
  peerMeta: { fontFamily: FONT.mono, fontSize: 9, color: C.mut, marginTop: 2 },
  onlineDot: { width: 8, height: 8, borderRadius: '50%', boxShadow: `0 0 6px ${C.green}` },
  dmBtn: {
    width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(160,174,192,0.08)', border: `1px solid ${C.cyan}33`, cursor: 'pointer', fontSize: 13,
  },
  rankRow: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 4px',
    borderBottom: `1px solid rgba(160,174,192,0.06)`,
    background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left',
  },
  rankPos: { fontFamily: FONT.display, fontWeight: 700, fontSize: 13, width: 28, textAlign: 'center' },
  sugCard: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', borderBottom: `1px solid rgba(160,174,192,0.06)` },
  sugReason: { fontFamily: FONT.body, fontSize: 11, color: '#8bb8d4', marginTop: 4, lineHeight: 1.3 },
  connectBtn: {
    padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.green}66`,
    background: 'rgba(63,208,201,0.08)', color: C.green,
    fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  empty: { textAlign: 'center', padding: '40px 20px' },
  emptyTitle: { fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: C.ink, margin: '12px 0 4px' },
  emptyHint: { fontFamily: FONT.body, fontSize: 12, color: C.mut, lineHeight: 1.4, margin: 0 },
};
