// components/tabs/PerfilTab.tsx
// Sistema Ómicron — Perfil · Industrial 5.0 / Cyberpunk

import { useState, useEffect, useCallback } from 'react';
import { LogOut, Edit3, Shield, TrendingUp, Award, AlertTriangle, Lock, MapPin, Zap, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp, useGemeloDigital } from '../../store/AppContext';
import { EditProfileModal } from '../perfil/EditProfileModal';
import { CredentialsPanel } from '../perfil/CredentialsPanel';
import { ProgressRadar } from '../shared/ProgressRadar';
import { SimulatorChallenge } from '../shared/SimulatorChallenge';
import {
  ScanlineOverlay, CyberHeader, PeBar, CyberCard,
  StatGrid, StatCard, SectionLabel, CyberButton,
  LoadingScreen, NodeBadge, ProgressBar, CyberToast, Divider,
} from '../shared/CyberComponents';
import { C, FONT, FONT_STYLE, BASE, ANIM, GLOW, RADIUS, cx } from '../../theme';
import type { SkillTest } from '../../types';

// ─── Constantes ──────────────────────────────────────────────────────────────
const NODE_COLOR: Record<string, string> = {
  'Nodo Operativo': C.cyan,
  'Nodo Core':      C.gold,
  'Nodo Arquitecto':C.green,
  'Nodo Fundador':  C.purple,
};
const TIERS = [
  { name: 'N1 · OPERATIVO',  min: 0    },
  { name: 'N2 · CORE',       min: 500  },
  { name: 'N3 · ARQUITECTO', min: 2000 },
];
const CAPABILITIES = [
  { lvl: 1, name: 'ESTUDIANTE',  tag: 'N1', scope: 'Nivelación · micro-trabajos · dudas rápidas', col: C.cyan   },
  { lvl: 2, name: 'TÉCNICO',     tag: 'N2', scope: 'Docencia · pasantías · contratos empresa',    col: C.gold   },
  { lvl: 3, name: 'ARQUITECTO',  tag: 'N3', scope: 'Proyectos críticos · arbitraje · staking',    col: C.purple },
];

// ─── Corners animados ─────────────────────────────────────────────────────────
function Corners({ color, size = 14 }: { color: string; size?: number }) {
  const b: React.CSSProperties = {
    position: 'absolute', width: size, height: size, pointerEvents: 'none',
    transition: 'opacity 0.3s',
  };
  return (
    <>
      <span style={{ ...b, top: -1, left: -1,  borderTop:    `2px solid ${color}`, borderLeft:  `2px solid ${color}` }} />
      <span style={{ ...b, top: -1, right: -1, borderTop:    `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
      <span style={{ ...b, bottom: -1, left: -1,  borderBottom:`2px solid ${color}`, borderLeft:  `2px solid ${color}` }} />
      <span style={{ ...b, bottom: -1, right: -1, borderBottom:`2px solid ${color}`, borderRight: `2px solid ${color}` }} />
    </>
  );
}

// ─── Decorative hex badge ─────────────────────────────────────────────────────
function HexBadge({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 14px', borderRadius: 24,
      border: `1px solid ${color}55`,
      background: `${color}12`,
    }}>
      <Shield size={12} style={{ color }} />
      <span style={{ fontFamily: FONT.mono, fontSize: 10, color, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
        {label}
      </span>
    </div>
  );
}

// ─── Audit warning banner ─────────────────────────────────────────────────────
function AuditBanner({ audit, onStart }: { audit: { reason: string }; onStart: () => void }) {
  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.lg,
      padding: 16, marginBottom: 14,
      background: 'rgba(255,59,92,0.06)',
      border: `1px solid ${C.red}`,
      animation: ANIM.breathe,
    }}>
      <Corners color={C.red} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.red}, transparent)` }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <AlertTriangle size={18} style={{ color: C.red }} />
        <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.red, letterSpacing: 2, textTransform: 'uppercase' }}>
          PROTOCOLO DE RESGUARDO TÉCNICO
        </span>
      </div>
      <p style={{ margin: '0 0 4px', fontFamily: FONT.body, fontSize: 14, color: '#fca5a5' }}>
        Tu nodo está <strong style={{ color: C.red }}>CONGELADO</strong>. {audit.reason}
      </p>
      <p style={{ margin: '0 0 12px', fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, letterSpacing: 0.5 }}>
        Supera el reto de redención para recuperar tu estatus.
      </p>
      <CyberButton variant="danger" onClick={onStart}>
        <Shield size={15} />
        RENDIR RETO DE REDENCIÓN
      </CyberButton>
    </div>
  );
}

// ─── ID Holográfica ────────────────────────────────────────────────────────────
function HoloID({
  initials, name, username, location, nodeType, nodeLevel,
  pe, nextPe, tierProgress, nodeColor, paused, onTogglePause,
  avatarUrl, uploading, onPickFile,
}: {
  initials: string; name: string; username: string; location?: string;
  nodeType: string; nodeLevel: string;
  pe: number; nextPe: number | null; tierProgress: number;
  nodeColor: string; paused: boolean; onTogglePause: () => void;
  avatarUrl?: string; uploading: boolean; onPickFile: (f: File) => void;
}) {
  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.xl,
      padding: 18, marginBottom: 14, overflow: 'hidden',
      background: 'rgba(10,17,32,0.98)',
      border: `1px solid ${nodeColor}33`,
    }}>
      <Corners color={nodeColor} size={16} />

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${nodeColor}, transparent)`,
        animation: ANIM.breathe,
      }} />

      <svg style={{ position: 'absolute', top: 8, right: 8, opacity: 0.15 }} width="60" height="40">
        <path d="M60 5 L40 5 L30 15 L10 15" fill="none" stroke={nodeColor} strokeWidth="1"/>
        <path d="M60 20 L50 20 L40 30 L20 30" fill="none" stroke={nodeColor} strokeWidth="0.5" strokeDasharray="3,3"/>
        <circle cx="10" cy="15" r="2" fill={nodeColor}/>
        <circle cx="20" cy="30" r="2" fill={nodeColor}/>
      </svg>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Avatar (clic para subir foto) */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <label style={{ cursor: 'pointer', display: 'block', position: 'relative' }} title="Cambiar foto de perfil">
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickFile(f);
                e.currentTarget.value = '';
              }}
            />
            <div style={{
              width: 72, height: 72, borderRadius: 16, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: avatarUrl ? '#0a1120' : `linear-gradient(135deg, ${nodeColor}cc, ${C.purple}cc)`,
              color: '#060a12', fontWeight: 700, fontSize: 26,
              fontFamily: FONT.display,
              boxShadow: `0 0 20px ${nodeColor}55`,
              animation: ANIM.breathe,
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </div>
            <div style={{
              position: 'absolute', bottom: -3, left: -3,
              width: 24, height: 24, borderRadius: '50%',
              background: '#0a1120', border: `1px solid ${C.cyanDim}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 6px ${C.cyanFaint}`,
            }}>
              {uploading
                ? <div style={{ width: 11, height: 11, borderRadius: '50%', border: `2px solid ${C.cyan}`, borderTopColor: 'transparent', animation: 'cp-spin 0.8s linear infinite' }} />
                : <Camera size={11} style={{ color: C.cyan }} />}
            </div>
          </label>
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 16, height: 16, borderRadius: '50%',
            background: paused ? C.red : C.green,
            border: '2px solid #060a12',
            boxShadow: `0 0 8px ${paused ? C.red : C.green}`,
            cursor: 'pointer', zIndex: 2,
          }} onClick={onTogglePause} title={paused ? 'Reanudar' : 'Pausar'} />
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT.display, fontWeight: 700,
            fontSize: 22, color: '#e2f3ff', lineHeight: 1.1,
            textShadow: `0 0 16px ${nodeColor}55`,
          }}>
            {name}
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 12, color: C.cyanDim, marginTop: 2 }}>
            @{username}
          </div>
          {location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim }}>
              <MapPin size={10} /> {location}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <HexBadge label={`${nodeType} · ${nodeLevel}`} color={nodeColor} />
          </div>
        </div>
      </div>

      {/* PE Progress */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            PROGRESO DE RANGO
          </span>
          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: nodeColor }}>
            {nextPe ? `${pe} / ${nextPe} PE` : 'RANGO MÁXIMO'}
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: C.cyanFaint, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${tierProgress}%`,
            background: `linear-gradient(90deg, ${nodeColor}, ${C.cyan})`,
            boxShadow: GLOW.cyan, borderRadius: 3,
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {TIERS.map(t => (
            <span key={t.name} style={{ fontFamily: FONT.mono, fontSize: 8, color: 'rgba(0,245,255,0.2)', letterSpacing: 0.5 }}>
              {t.name.split(' ')[0]}
            </span>
          ))}
        </div>
      </div>

      {/* Pause toggle row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 14, paddingTop: 12,
        borderTop: '1px solid rgba(0,245,255,0.08)',
      }}>
        <div>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: '#e2f3ff' }}>
            MODO PAUSA
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, marginTop: 1, letterSpacing: 0.5 }}>
            Suspende tu disponibilidad en el marketplace
          </div>
        </div>
        <button onClick={onTogglePause} style={{
          width: 52, height: 26, borderRadius: 13,
          cursor: 'pointer', position: 'relative',
          background: paused ? `${C.red}44` : C.cyanFaint,
          border: `1px solid ${paused ? C.red : C.cyanDim}`,
          transition: 'background 0.2s, border-color 0.2s',
        }}>
          <span style={{
            position: 'absolute', top: 3,
            left: paused ? 28 : 3,
            width: 18, height: 18, borderRadius: '50%',
            background: paused ? C.red : C.cyan,
            transition: 'left 0.25s ease, background 0.2s',
            boxShadow: `0 0 6px ${paused ? C.red : C.cyan}`,
          }} />
        </button>
      </div>
    </div>
  );
}

// ─── Gemelo Digital panel ──────────────────────────────────────────────────────
function GemeloPanel({ gemelo }: { gemelo: NonNullable<ReturnType<typeof useGemeloDigital>> }) {
  const reputacion = gemelo.overallReputation ?? 0;
  const desempeno =
    ((gemelo.execution ?? 0) +
      (gemelo.quality ?? 0) +
      (gemelo.transcendence ?? 0) +
      (gemelo.foundation ?? 0)) / 4;

  const rankLabel =
    reputacion >= 80 ? 'SENIOR' :
    reputacion >= 70 ? 'AVANZADO' :
    reputacion >= 50 ? 'INTERMEDIO' : 'NOVATO';
  const rankColor =
    reputacion >= 80 ? C.green :
    reputacion >= 70 ? C.cyan :
    reputacion >= 50 ? C.gold : C.purple;
  const rankEmoji =
    reputacion >= 80 ? '🏆' :
    reputacion >= 70 ? '⚡' :
    reputacion >= 50 ? '🔷' : '🌱';

  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.xl,
      padding: '16px 16px 20px', marginBottom: 14,
      background: 'rgba(10,17,32,0.98)',
      border: `1px solid rgba(0,245,255,0.15)`,
      overflow: 'hidden',
    }}>
      <Corners color={C.cyan} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.cyan}, transparent)` }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <TrendingUp size={14} style={{ color: C.cyan }} />
        <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyan, letterSpacing: 2, textTransform: 'uppercase' }}>
          AUDITORÍA · GEMELO DIGITAL
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={{
          padding: '12px 14px', borderRadius: RADIUS.lg,
          background: `${rankColor}0e`, border: `1px solid ${rankColor}33`,
        }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 8, color: rankColor, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
            REPUTACIÓN
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: rankColor, textShadow: `0 0 14px ${rankColor}66` }}>
              {reputacion.toFixed(1)}
            </span>
            <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim }}>/100</span>
          </div>
          <div style={{
            display: 'inline-block', marginTop: 6,
            padding: '2px 10px', borderRadius: 20,
            background: `${rankColor}18`, border: `1px solid ${rankColor}44`,
            fontFamily: FONT.mono, fontSize: 9, color: rankColor, letterSpacing: 1,
          }}>
            {rankEmoji} {rankLabel}
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 8, color: C.cyanDim, marginTop: 6, letterSpacing: 0.3 }}>
            Oficial · define tu rango
          </div>
        </div>

        <div style={{
          padding: '12px 14px', borderRadius: RADIUS.lg,
          background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)',
        }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 8, color: C.cyan, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
            DESEMPEÑO GEMELO
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: C.cyan, textShadow: `0 0 14px ${C.cyan}66` }}>
              {desempeno.toFixed(1)}
            </span>
            <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim }}>/100</span>
          </div>
          <ProgressBar value={desempeno} color={C.cyan} height={4} style={{ marginTop: 10 }} />
          <div style={{ fontFamily: FONT.mono, fontSize: 8, color: C.cyanDim, marginTop: 6, letterSpacing: 0.3 }}>
            Promedio de tus 4 ejes
          </div>
        </div>
      </div>

      <ProgressRadar gemelo={gemelo} size="md" showHeader={false} />
    </div>
  );
}

// ─── Capacidades de nodo ───────────────────────────────────────────────────────
function CapabilidadesPanel({ userRank }: { userRank: number }) {
  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.xl,
      padding: '14px 16px', marginBottom: 14,
      background: 'rgba(10,17,32,0.98)',
      border: '1px solid rgba(0,245,255,0.12)',
      overflow: 'hidden',
    }}>
      <Corners color={C.cyanDim} />
      <div style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyan, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
        CAPACIDADES DE NODO
      </div>
      {CAPABILITIES.map((r, i) => {
        const unlocked = userRank >= r.lvl;
        return (
          <div key={r.lvl}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0',
              opacity: unlocked ? 1 : 0.4,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${unlocked ? r.col : C.cyanDim}`,
                background: unlocked ? `${r.col}14` : 'transparent',
                fontFamily: FONT.display, fontWeight: 700, fontSize: 13,
                color: unlocked ? r.col : C.cyanDim,
                boxShadow: unlocked ? `0 0 8px ${r.col}44` : 'none',
              }}>
                {r.tag}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: 11, color: unlocked ? r.col : C.cyanDim, letterSpacing: 1 }}>
                    {r.name}
                  </span>
                  {unlocked && (
                    <span style={{ fontFamily: FONT.mono, fontSize: 8, color: C.green, letterSpacing: 1, background: C.greenFaint, padding: '1px 6px', borderRadius: 10, border: `1px solid ${C.greenDim}` }}>
                      ACTIVO
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, marginTop: 2, letterSpacing: 0.3 }}>
                  {r.scope}
                </div>
              </div>
              {!unlocked
                ? <Lock size={13} style={{ color: C.cyanDim, flexShrink: 0 }} />
                : <Zap  size={13} style={{ color: r.col,    flexShrink: 0 }} />
              }
            </div>
            {i < CAPABILITIES.length - 1 && (
              <div style={{ height: 1, background: 'rgba(0,245,255,0.06)', marginLeft: 44 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Audit { id: string; reason: string; reputation_at_trigger: number | null; }

export function PerfilTab() {
  const { profile, refreshProfile } = useApp();
  const gemelo = useGemeloDigital();
  const [paused,    setPaused]    = useState(false);
  const [showEdit,  setShowEdit]  = useState(false);
  const [audit,     setAudit]     = useState<Audit | null>(null);
  const [redTest,   setRedTest]   = useState<SkillTest | null>(null);
  const [redNode,   setRedNode]   = useState('');
  const [toast,     setToast]     = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const nodeColor = NODE_COLOR[profile?.node_type ?? 'Nodo Operativo'] ?? C.cyan;
  const initials  = (profile?.full_name ?? profile?.username ?? 'U')
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const avatarUrl = (profile as any)?.avatar_url as string | undefined;
  const pe = profile?.pe_points ?? 0;
  const userRank = (profile?.node_type === 'Nodo Arquitecto' || profile?.node_type === 'Nodo Fundador') ? 3
    : profile?.node_type === 'Nodo Core' ? 2 : 1;

  let tierIdx = 0;
  if (pe >= 2000) tierIdx = 2; else if (pe >= 500) tierIdx = 1;
  const curMin      = TIERS[tierIdx].min;
  const nextMin     = TIERS[tierIdx + 1]?.min ?? null;
  const tierProgress = nextMin ? Math.min(100, ((pe - curMin) / (nextMin - curMin)) * 100) : 100;

  const loadAudit = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('rank_audits').select('id,reason,reputation_at_trigger')
      .eq('user_id', profile.id).eq('status', 'PENDING')
      .order('triggered_at', { ascending: false }).maybeSingle();
    setAudit((data as Audit) ?? null);
  }, [profile]);

  useEffect(() => { loadAudit(); }, [loadAudit]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAvatarUpload(file: File) {
    if (!profile) return;
    if (file.size > 5 * 1024 * 1024) { showToast('LA FOTO SUPERA 5 MB'); return; }
    setUploadingAvatar(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from('profiles').update({ avatar_url: url }).eq('id', profile.id);
      if (dbErr) throw dbErr;

      await refreshProfile();
      showToast('FOTO DE PERFIL ACTUALIZADA');
    } catch (e: any) {
      showToast('ERROR AL SUBIR LA FOTO');
      console.error('avatar upload', e);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function startRedemption() {
    const { data } = await supabase
      .from('skill_tests').select('*')
      .order('difficulty_multiplier', { ascending: false })
      .limit(1).maybeSingle();
    if (!data) return;
    setRedTest(data as SkillTest);
    setRedNode((data as SkillTest).node_id);
  }

  async function onRedemptionPass() {
    if (audit) await supabase.rpc('resolve_audit', { p_audit_id: audit.id, p_passed: true });
    await refreshProfile();
    setRedTest(null); setRedNode('');
    loadAudit();
    showToast('NODO REACTIVADO · ESTATUS RECUPERADO');
  }

  async function togglePause() {
    if (!profile) return;
    const next = !paused;
    setPaused(next);
    await supabase.from('user_status').upsert(
      { user_id: profile.id, is_paused: next, availability: next ? 'paused' : 'available' },
      { onConflict: 'user_id' }
    );
  }

  return (
    <div style={BASE.root}>
      <ScanlineOverlay />

      <CyberHeader
        title="MI PERFIL"
        subtitle="IDENTIDAD DE NODO // VERIFICADO"
        dotColor={nodeColor}
        badge={
          <button
            onClick={() => setShowEdit(true)}
            style={{
              background: C.cyanGhost, border: `1px solid ${C.cyanDim}`,
              borderRadius: 8, padding: 8, color: C.cyan,
              cursor: 'pointer', display: 'flex',
            }}
          >
            <Edit3 size={16} />
          </button>
        }
      />

      <PeBar current={pe} max={nextMin ?? pe} color={nodeColor} label={`${pe} PE ACUMULADOS`} />

      <div style={cx(BASE.scrollArea, { padding: 14 })}>

        {audit && <AuditBanner audit={audit} onStart={startRedemption} />}

        <HoloID
          initials={initials}
          name={profile?.full_name ?? profile?.username ?? 'Usuario'}
          username={profile?.username ?? 'nodo'}
          location={profile?.location}
          nodeType={profile?.node_type ?? 'Nodo Operativo'}
          nodeLevel={profile?.node_level ?? 'N1'}
          pe={pe}
          nextPe={nextMin}
          tierProgress={tierProgress}
          nodeColor={nodeColor}
          paused={paused}
          onTogglePause={togglePause}
          avatarUrl={avatarUrl}
          uploading={uploadingAvatar}
          onPickFile={handleAvatarUpload}
        />

        <StatGrid cols={3} style={{ marginBottom: 14 }}>
          <StatCard label="TOKENS"     value={(profile?.token_balance ?? 0).toLocaleString()} color={C.gold}   />
          <StatCard label="PE"         value={pe.toLocaleString()}                             color={C.cyan}   />
          <StatCard label="CONTRATOS"  value={String(profile?.total_contracts_completed ?? 0)} color={C.green}  />
        </StatGrid>

        {gemelo && <GemeloPanel gemelo={gemelo} />}

        <CapabilidadesPanel userRank={userRank} />

        <CredentialsPanel />

        {profile?.is_pioneer && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: RADIUS.lg, marginBottom: 14,
            background: C.goldFaint, border: `1px solid ${C.goldDim}`,
          }}>
            <Award size={20} style={{ color: C.gold, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: FONT.mono, fontSize: 10, color: C.gold, letterSpacing: 1.5 }}>ESTATUS PIONEER</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.goldDim, marginTop: 2 }}>Beneficio fundacional vitalicio</div>
            </div>
            <div style={{ marginLeft: 'auto', fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.gold }}>⬡</div>
          </div>
        )}

        <Divider glow style={{ margin: '4px 0 14px' }} />

        <CyberButton variant="danger" onClick={() => supabase.auth.signOut()}>
          <LogOut size={15} />
          CERRAR SESIÓN
        </CyberButton>

        <div style={{ height: 16 }} />
      </div>

      {toast && <CyberToast variant="cyan">{toast}</CyberToast>}

      {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} />}
      {redTest && (
        <SimulatorChallenge
          test={redTest} nodeId={redNode}
          onClose={() => { setRedTest(null); setRedNode(''); }}
          onSuccess={onRedemptionPass}
        />
      )}
    </div>
  );
}
