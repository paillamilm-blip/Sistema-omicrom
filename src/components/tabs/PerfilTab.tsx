// components/tabs/PerfilTab.tsx
// Sistema Ómicrom — Perfil · Credencial Digital
// Rediseño: el perfil es una TARJETA DE PRESENTACIÓN que cabe en el celular,
// con el radar del Gemelo Digital como protagonista y un certificado claro
// de "para qué contratos califica" el nodo.

import { useState, useEffect, useCallback } from 'react';
import {
  LogOut, Edit3, Shield, TrendingUp, Award, AlertTriangle, Lock,
  MapPin, Zap, Camera, GraduationCap, BadgeCheck, Briefcase, Share2, Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp, useGemeloDigital } from '../../store/AppContext';
import { EditProfileModal } from '../perfil/EditProfileModal';
import { CredentialsPanel } from '../perfil/CredentialsPanel';
import { CredentialReview } from '../perfil/CredentialReview';
import { ShareCredentialModal, RedPanel } from '../perfil/RedSocial';
import { ProgressRadar } from '../shared/ProgressRadar';
import { DossierEvidencia } from '../perfil/DossierEvidencia';
import { SimulatorChallenge } from '../shared/SimulatorChallenge';
import {
  ScanlineOverlay, CyberButton,
  CyberToast, Divider, ProgressBar,
} from '../shared/CyberComponents';
import { C, FONT, BASE, ANIM, GLOW, RADIUS, cx } from '../../theme';
import type { SkillTest } from '../../types';

// ─── Constantes ──────────────────────────────────────────────────────────────
const NODE_COLOR: Record<string, string> = {
  'Nodo Operativo':  C.cyan,
  'Nodo Core':       C.gold,
  'Nodo Arquitecto': C.green,
  'Nodo Fundador':   C.purple,
};
const TIERS = [
  { name: 'N1',  min: 0    },
  { name: 'N2',  min: 500  },
  { name: 'N3',  min: 2000 },
];
const CAPABILITIES = [
  { lvl: 1, name: 'ESTUDIANTE',  tag: 'N1', scope: 'Nivelación · micro-trabajos · dudas rápidas', col: C.cyan   },
  { lvl: 2, name: 'TÉCNICO',     tag: 'N2', scope: 'Docencia · pasantías · contratos empresa',    col: C.gold   },
  { lvl: 3, name: 'ARQUITECTO',  tag: 'N3', scope: 'Proyectos críticos · arbitraje · staking',    col: C.purple },
];

// Los 4 ejes explicados en lenguaje simple (anti-jerga)
const EJES = [
  { key: 'execution'    as const, label: 'Ejecución',    desc: 'Qué tan rápido y bien entregas tus contratos',          color: '#00F0FF' },
  { key: 'quality'      as const, label: 'Calidad',      desc: 'Las calificaciones con estrellas de tus clientes',       color: '#0a8ba3' },
  { key: 'transcendence'as const, label: 'Trascendencia',desc: 'El conocimiento que compartes (Bóveda y mentorías)',    color: '#F59E0B' },
  { key: 'foundation'   as const, label: 'Fundamento',   desc: 'Tu dominio teórico y los cursos de la Academia',         color: '#39FF14' },
];

// ─── Rango + para qué contratos califica (la "certificación") ───────────────────
function getRango(rep: number) {
  if (rep >= 80) return {
    label: 'SENIOR', emoji: '🏆', color: C.green,
    califica: 'Contratos de alto rango · proyectos críticos · arbitraje · staking',
  };
  if (rep >= 70) return {
    label: 'AVANZADO', emoji: '⚡', color: C.cyan,
    califica: 'Contratos de empresa · pasantías · docencia',
  };
  if (rep >= 50) return {
    label: 'INTERMEDIO', emoji: '🔷', color: C.gold,
    califica: 'Contratos estándar · micro-trabajos · colaboraciones',
  };
  return {
    label: 'EN FORMACIÓN', emoji: '🌱', color: C.purple,
    califica: 'Nivelación · micro-trabajos · dudas rápidas',
  };
}

const SECTIONS = [
  { id: 'gemelo'       as const, label: 'GEMELO',       icon: TrendingUp },
  { id: 'red'          as const, label: 'MI RED',       icon: Users },
  { id: 'credenciales' as const, label: 'CV / TÍTULOS', icon: GraduationCap },
  { id: 'capacidades'  as const, label: 'CAPACIDADES',  icon: Shield },
];
type Section = (typeof SECTIONS)[number]['id'];

// ─── Corners animados ───────────────────────────────────────────────────────────
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

// ─── Banner de auditoría (nodo congelado) ───────────────────────────────────────
function AuditBanner({ audit, onStart }: { audit: { reason: string }; onStart: () => void }) {
  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.lg,
      padding: 16, marginBottom: 14,
      background: 'rgba(255,80,102,0.06)',
      border: `1px solid ${C.red}`,
      animation: ANIM.breathe,
    }}>
      <Corners color={C.red} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <AlertTriangle size={18} style={{ color: C.red }} />
        <span style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 13, color: C.red }}>
          Tu nodo está en pausa de resguardo
        </span>
      </div>
      <p style={{ margin: '0 0 12px', fontFamily: FONT.body, fontSize: 13, color: '#fca5a5', lineHeight: 1.4 }}>
        {audit.reason} Supera el reto de redención para recuperar tu estatus.
      </p>
      <CyberButton variant="danger" onClick={onStart}>
        <Shield size={15} />
        RENDIR RETO DE REDENCIÓN
      </CyberButton>
    </div>
  );
}

// ─── CREDENCIAL DIGITAL (tarjeta de presentación · protagonista) ────────────────
function CredencialCard({
  initials, name, username, location, nodeType, nodeLevel, verified,
  reputacion, gemelo, tokens, pe, contratos, nextPe, tierProgress,
  paused, onTogglePause, avatarUrl, uploading, onPickFile, onEdit, onShare,
}: {
  initials: string; name: string; username: string; location?: string;
  nodeType: string; nodeLevel: number; verified: boolean;
  reputacion: number; gemelo: NonNullable<ReturnType<typeof useGemeloDigital>>;
  tokens: number; pe: number; contratos: number;
  nextPe: number | null; tierProgress: number;
  paused: boolean; onTogglePause: () => void;
  avatarUrl?: string; uploading: boolean; onPickFile: (f: File) => void;
  onEdit: () => void; onShare: () => void;
}) {
  const nodeColor = NODE_COLOR[nodeType] ?? C.cyan;
  const rango = getRango(reputacion);

  const miniStat = (label: string, value: string, color: string) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color }}>{value}</div>
      <div style={{ fontFamily: FONT.mono, fontSize: 8.5, color: C.cyanDim, letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.xl,
      padding: 18, marginBottom: 14, overflow: 'hidden',
      background: 'linear-gradient(165deg, rgba(22,34,58,0.96) 0%, rgba(12,20,38,0.98) 60%, rgba(10,17,32,0.98) 100%)',
      border: `1px solid ${rango.color}40`,
      boxShadow: `0 8px 32px rgba(0,0,0,0.35), 0 0 24px ${rango.color}1a`,
    }}>
      <Corners color={rango.color} size={16} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${rango.color}, transparent)`,
      }} />

      {/* Botones compartir + editar integrados en la tarjeta */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 3, display: 'flex', gap: 8 }}>
        <button
          onClick={onShare}
          title="Compartir mi credencial (QR / link)"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${rango.color}55`,
            color: rango.color, cursor: 'pointer',
          }}
        >
          <Share2 size={15} />
        </button>
        <button
          onClick={onEdit}
          title="Editar mi credencial"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${rango.color}55`,
            color: rango.color, cursor: 'pointer',
          }}
        >
          <Edit3 size={15} />
        </button>
      </div>

      {/* Fila identidad */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        {/* Avatar (clic = subir foto · punto = pausar) */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <label style={{ cursor: 'pointer', display: 'block', position: 'relative' }} title="Cambiar foto de perfil">
            <input
              type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); e.currentTarget.value = ''; }}
            />
            <div style={{
              width: 76, height: 76, borderRadius: 18, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: avatarUrl ? '#0a1120' : `linear-gradient(135deg, ${rango.color}, ${C.cyan})`,
              color: '#060a12', fontWeight: 700, fontSize: 28, fontFamily: FONT.display,
              boxShadow: `0 0 18px ${rango.color}44`,
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
            }}>
              {uploading
                ? <div style={{ width: 11, height: 11, borderRadius: '50%', border: `2px solid ${C.cyan}`, borderTopColor: 'transparent', animation: 'cp-spin 0.8s linear infinite' }} />
                : <Camera size={11} style={{ color: C.cyan }} />}
            </div>
          </label>
          <div
            onClick={onTogglePause}
            title={paused ? 'Pausado · clic para reanudar' : 'Disponible · clic para pausar'}
            style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 18, height: 18, borderRadius: '50%',
              background: paused ? C.red : C.green,
              border: '2px solid #060a12',
              boxShadow: `0 0 8px ${paused ? C.red : C.green}`,
              cursor: 'pointer', zIndex: 2,
            }}
          />
        </div>

        {/* Nombre + meta */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 64 }}>
          <div style={{
            fontFamily: FONT.display, fontWeight: 700, fontSize: 21,
            color: '#eaf4ff', lineHeight: 1.1, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {name}
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 12, color: C.cyanDim, marginTop: 2 }}>
            @{username}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20,
              background: `${nodeColor}14`, border: `1px solid ${nodeColor}44`,
            }}>
              <Shield size={11} style={{ color: nodeColor }} />
              <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: nodeColor, letterSpacing: 1 }}>
                {nodeType} · N{nodeLevel}
              </span>
            </span>
            {verified && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 9px', borderRadius: 20,
                background: C.greenFaint, border: `1px solid ${C.greenDim}`,
              }}>
                <BadgeCheck size={12} style={{ color: C.green }} />
                <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.green, letterSpacing: 1 }}>VERIFICADO</span>
              </span>
            )}
          </div>

          {location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontFamily: FONT.body, fontSize: 11, color: C.cyanDim }}>
              <MapPin size={11} /> {location}
            </div>
          )}
        </div>
      </div>

      {/* Certificación: para qué contratos califica */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginTop: 16, padding: '12px 14px', borderRadius: RADIUS.lg,
        background: `${rango.color}12`, border: `1px solid ${rango.color}40`,
      }}>
        <Briefcase size={20} style={{ color: rango.color, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 8.5, color: rango.color, letterSpacing: 1.5, marginBottom: 3 }}>
            TU GEMELO TE CERTIFICA PARA
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: 12.5, color: '#dbeafe', lineHeight: 1.35 }}>
            {rango.califica}
          </div>
        </div>
      </div>

      {/* Reputación (hero) + Radar protagonista */}
      <div style={{
        marginTop: 16, padding: '14px 8px 6px', borderRadius: RADIUS.lg,
        background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: FONT.body, fontSize: 12, color: C.cyanDim }}>Tu reputación</span>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 34, color: rango.color, textShadow: `0 0 16px ${rango.color}55`, lineHeight: 1 }}>
            {reputacion.toFixed(1)}
          </span>
          <span style={{ fontFamily: FONT.mono, fontSize: 12, color: C.cyanDim }}>/100</span>
          <span style={{
            padding: '3px 10px', borderRadius: 20,
            background: `${rango.color}18`, border: `1px solid ${rango.color}44`,
            fontFamily: FONT.mono, fontSize: 10, color: rango.color, letterSpacing: 1,
          }}>
            {rango.emoji} {rango.label}
          </span>
        </div>

        <ProgressRadar
          gemelo={gemelo}
          size="md"
          showHeader={false}
          showScores={false}
          showAlert={false}
          showFooter={false}
        />
      </div>

      {/* Stats clave (compactos) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        marginTop: 14, padding: '12px 6px', borderRadius: RADIUS.lg,
        background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {miniStat('TOKENS', tokens.toLocaleString(), C.gold)}
        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />
        {miniStat('PE', pe.toLocaleString(), C.cyan)}
        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />
        {miniStat('CONTRATOS', String(contratos), C.green)}
      </div>

      {/* Progreso de rango */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: FONT.body, fontSize: 11, color: C.cyanDim }}>Progreso al siguiente nivel</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: nodeColor }}>
            {nextPe ? `${pe} / ${nextPe} PE` : 'NIVEL MÁXIMO'}
          </span>
        </div>
        <div style={{ height: 7, borderRadius: 4, background: C.cyanFaint, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${tierProgress}%`,
            background: `linear-gradient(90deg, ${nodeColor}, ${C.cyan})`,
            boxShadow: GLOW.cyan, borderRadius: 4, transition: 'width 0.6s ease',
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Detalle del Gemelo: los 4 ejes en lenguaje simple ──────────────────────────
function EjesPanel({ gemelo }: { gemelo: NonNullable<ReturnType<typeof useGemeloDigital>> }) {
  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.xl,
      padding: 16, marginBottom: 14,
      background: 'rgba(12,20,38,0.95)',
      border: '1px solid rgba(0,240,255,0.14)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '10px 12px', borderRadius: RADIUS.lg, marginBottom: 14,
        background: C.cyanGhost, border: `1px solid ${C.cyanFaint}`,
      }}>
        <TrendingUp size={16} style={{ color: C.cyan, flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 12, color: '#cfe8ff', lineHeight: 1.45 }}>
          Tu reputación combina <strong style={{ color: C.gold }}>20% tus títulos validados</strong> + <strong style={{ color: C.cyan }}>80% tu desempeño real</strong>, que se mide con estos 4 ejes:
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {EJES.map((eje) => {
          const value = gemelo[eje.key] ?? 0;
          return (
            <div key={eje.key} style={{
              padding: '12px 14px', borderRadius: RADIUS.lg,
              background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: eje.color, boxShadow: `0 0 8px ${eje.color}99` }} />
                  <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#eaf4ff' }}>{eje.label}</span>
                </div>
                <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16, color: eje.color }}>{value.toFixed(0)}</span>
              </div>
              <ProgressBar value={value} color={eje.color} height={5} style={{ margin: '6px 0 8px' }} />
              <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 11, color: C.cyanDim, lineHeight: 1.4 }}>{eje.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Capacidades de nodo ─────────────────────────────────────────────────────────
function CapabilidadesPanel({ userRank }: { userRank: number }) {
  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.xl,
      padding: '14px 16px', marginBottom: 14,
      background: 'rgba(12,20,38,0.95)',
      border: '1px solid rgba(0,240,255,0.12)',
      overflow: 'hidden',
    }}>
      <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 13, color: '#eaf4ff', marginBottom: 4 }}>
        Qué puedes hacer en cada nivel
      </div>
      <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.cyanDim, marginBottom: 12 }}>
        Subes de nivel acumulando PE con tu trabajo y aprendizaje.
      </div>
      {CAPABILITIES.map((r, i) => {
        const unlocked = userRank >= r.lvl;
        return (
          <div key={r.lvl}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', opacity: unlocked ? 1 : 0.4 }}>
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
                  <span style={{ fontFamily: FONT.mono, fontSize: 11, color: unlocked ? r.col : C.cyanDim, letterSpacing: 1 }}>{r.name}</span>
                  {unlocked && (
                    <span style={{ fontFamily: FONT.mono, fontSize: 8, color: C.green, letterSpacing: 1, background: C.greenFaint, padding: '1px 6px', borderRadius: 10, border: `1px solid ${C.greenDim}` }}>ACTIVO</span>
                  )}
                </div>
                <div style={{ fontFamily: FONT.body, fontSize: 10.5, color: C.cyanDim, marginTop: 2 }}>{r.scope}</div>
              </div>
              {!unlocked
                ? <Lock size={13} style={{ color: C.cyanDim, flexShrink: 0 }} />
                : <Zap  size={13} style={{ color: r.col,    flexShrink: 0 }} />}
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
  const [showShare, setShowShare] = useState(false);
  const [audit,     setAudit]     = useState<Audit | null>(null);
  const [redTest,   setRedTest]   = useState<SkillTest | null>(null);
  const [redNode,   setRedNode]   = useState('');
  const [toast,     setToast]     = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [section,   setSection]   = useState<Section>('gemelo');

  const initials  = (profile?.full_name ?? profile?.username ?? 'U')
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const avatarUrl = (profile as any)?.avatar_url as string | undefined;
  const pe = profile?.pe_points ?? 0;
  const userRank = (profile?.node_type === 'Nodo Arquitecto' || profile?.node_type === 'Nodo Fundador') ? 3
    : profile?.node_type === 'Nodo Core' ? 2 : 1;

  let tierIdx = 0;
  if (pe >= 2000) tierIdx = 2; else if (pe >= 500) tierIdx = 1;
  const curMin       = TIERS[tierIdx].min;
  const nextMin      = TIERS[tierIdx + 1]?.min ?? null;
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

      <div style={cx(BASE.scrollArea, { padding: 14 })}>

        {audit && <AuditBanner audit={audit} onStart={startRedemption} />}

        {/* TARJETA DE PRESENTACIÓN — protagonista */}
        {gemelo && (
          <CredencialCard
            initials={initials}
            name={profile?.full_name ?? profile?.username ?? 'Usuario'}
            username={profile?.username ?? 'nodo'}
            location={profile?.location}
            nodeType={profile?.node_type ?? 'Nodo Operativo'}
            nodeLevel={profile?.node_level ?? 1}
            verified={!!profile?.is_verified_professional}
            reputacion={gemelo.overallReputation ?? 0}
            gemelo={gemelo}
            tokens={profile?.token_balance ?? 0}
            pe={pe}
            contratos={profile?.total_contracts_completed ?? 0}
            nextPe={nextMin}
            tierProgress={tierProgress}
            paused={paused}
            onTogglePause={togglePause}
            avatarUrl={avatarUrl}
            uploading={uploadingAvatar}
            onPickFile={handleAvatarUpload}
            onEdit={() => setShowEdit(true)}
            onShare={() => setShowShare(true)}
          />
        )}

        {/* Sub-secciones */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button key={s.id} onClick={() => setSection(s.id)} style={{
                position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 5, padding: '11px 6px',
                borderRadius: RADIUS.lg, cursor: 'pointer', overflow: 'hidden',
                background: active ? `${C.cyan}14` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? C.cyan : 'rgba(255,255,255,0.08)'}`,
                boxShadow: active ? `0 0 14px ${C.cyan}33` : 'none',
                transition: 'all 0.25s ease',
              }}>
                <Icon size={16} style={{ color: active ? C.cyan : C.cyanDim }} />
                <span style={{ fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: 0.8, color: active ? C.cyan : C.cyanDim }}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Contenido de la sección activa */}
        <div key={section} style={{ animation: 'sectionIn 0.35s cubic-bezier(0.22,1,0.36,1) both' }}>
          {section === 'gemelo' && gemelo && <EjesPanel gemelo={gemelo} />}
          {section === 'gemelo' && <DossierEvidencia />}

          {section === 'red' && <RedPanel />}

          {section === 'credenciales' && (
            <>
              <CredentialReview />
              <CredentialsPanel />
            </>
          )}

          {section === 'capacidades' && (
            <>
              <CapabilidadesPanel userRank={userRank} />
              {profile?.is_pioneer && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: RADIUS.lg, marginBottom: 14,
                  background: C.goldFaint, border: `1px solid ${C.goldDim}`,
                }}>
                  <Award size={20} style={{ color: C.gold, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 10, color: C.gold, letterSpacing: 1.5 }}>ESTATUS PIONEER</div>
                    <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.goldDim, marginTop: 2 }}>Beneficio fundacional vitalicio</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.gold }}>⬡</div>
                </div>
              )}
            </>
          )}
        </div>

        <style>{`
          @keyframes sectionIn {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <Divider glow margin="4px 0 14px" />

        <CyberButton variant="danger" onClick={() => supabase.auth.signOut()}>
          <LogOut size={15} />
          CERRAR SESIÓN
        </CyberButton>

        <div style={{ height: 16 }} />
      </div>

      {toast && <CyberToast variant="cyan">{toast}</CyberToast>}

      {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} />}
      {showShare && profile && (
        <ShareCredentialModal
          username={profile.username}
          fullName={profile.full_name}
          onClose={() => setShowShare(false)}
        />
      )}
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
