// components/tabs/PerfilTab.tsx
// ═══════════════════════════════════════════════════════════════════════
// PERFIL ÓMICRON — Credencial del Gemelo Digital (look unificado).
// Usa datos REALES (useApp: profile + gemelo). Muestra tu experticia
// convalidada (skills del CV), reputación, nivel y los 4 ejes. Una sola
// convalidación real (ConvalidaOmicron), sin duplicar flujos.
// ═══════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { Edit3, Share2, Camera, Shield, BadgeCheck, MapPin, Sparkles, Award, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp, useGemeloDigital } from '../../store/AppContext';
import { EditProfileModal } from '../perfil/EditProfileModal';
import { ShareCredentialModal } from '../perfil/RedSocial';
import ParticleOrb from '../omicron/ParticleOrb';
import ConvalidaOmicron from '../omicron/ConvalidaOmicron';
import { C, FONT, RADIUS } from '../../theme';

const NODE_COLOR: Record<string, string> = {
  'Nodo Operativo': C.cyan, 'Nodo Core': C.gold, 'Nodo Arquitecto': C.green, 'Nodo Fundador': C.purple,
};

const AXES: [string, 'execution' | 'quality' | 'transcendence' | 'foundation', string][] = [
  ['Ejecución', 'execution', C.cyan],
  ['Calidad', 'quality', C.purple],
  ['Trascendencia', 'transcendence', C.gold],
  ['Fundamento', 'foundation', C.green],
];

export function PerfilTab() {
  const { profile, refreshProfile } = useApp();
  const gemelo = useGemeloDigital();
  const [showEdit, setShowEdit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showConvalida, setShowConvalida] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');

  if (!profile) return null;

  const initials = (profile.full_name ?? profile.username ?? 'U').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const avatarUrl = profile.avatar_url;
  const nodeColor = NODE_COLOR[profile.node_type] ?? C.cyan;
  const rep = gemelo ? Math.round(gemelo.overallReputation) : Math.round(profile.reputation_score ?? 0);
  const skills = profile.skills ?? [];

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  async function handleAvatar(file: File) {
    if (!profile) return;
    if (file.size > 5 * 1024 * 1024) { showToast('La foto supera 5 MB'); return; }
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: `${data.publicUrl}?t=${Date.now()}` }).eq('id', profile.id);
      await refreshProfile();
      showToast('Foto actualizada');
    } catch {
      showToast('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  }

  const card: React.CSSProperties = {
    borderRadius: RADIUS.xl, padding: 16, marginBottom: 14,
    background: C.glass, border: `1px solid ${C.line}`, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Orbe + reputación */}
      <div style={{ position: 'relative', height: 170, marginBottom: 6 }}>
        <ParticleOrb />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 40, color: '#fff', textShadow: `0 0 24px ${nodeColor}` }}>{rep}</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, color: C.mut, textTransform: 'uppercase' }}>Reputación / 100</div>
        </div>
      </div>

      {/* Identidad */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <label style={{ cursor: 'pointer', position: 'relative', flexShrink: 0 }} title="Cambiar foto">
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleAvatar(f); e.currentTarget.value = ''; }} />
            <div style={{ width: 68, height: 68, borderRadius: 18, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarUrl ? '#0a1120' : `linear-gradient(135deg, ${nodeColor}, ${C.purple})`, color: '#fff', fontWeight: 700, fontSize: 26, fontFamily: FONT.display, boxShadow: `0 0 18px ${nodeColor}44` }}>
              {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            <div style={{ position: 'absolute', bottom: -3, right: -3, width: 22, height: 22, borderRadius: '50%', background: '#0a1120', border: `1px solid ${C.cyanDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {uploading ? <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${C.cyan}`, borderTopColor: 'transparent', animation: 'cp-spin 0.8s linear infinite' }} /> : <Camera size={11} color={C.cyan} />}
            </div>
          </label>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: '#eaf4ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.full_name || profile.username}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 12, color: C.cyanDim }}>@{profile.username}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: `${nodeColor}14`, border: `1px solid ${nodeColor}44` }}>
                <Shield size={11} color={nodeColor} />
                <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: nodeColor, letterSpacing: 1 }}>{profile.node_type} · N{profile.node_level}</span>
              </span>
              {profile.is_verified_professional && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 20, background: C.greenFaint, border: `1px solid ${C.greenDim}` }}>
                  <BadgeCheck size={12} color={C.green} />
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.green, letterSpacing: 1 }}>VERIFICADO</span>
                </span>
              )}
            </div>
            {profile.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontFamily: FONT.body, fontSize: 11, color: C.cyanDim }}>
                <MapPin size={11} /> {profile.location}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => setShowShare(true)} title="Compartir" style={{ width: 34, height: 34, borderRadius: 11, background: C.glass2, border: `1px solid ${C.line}`, color: C.cyan, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Share2 size={15} /></button>
            <button onClick={() => setShowEdit(true)} title="Editar" style={{ width: 34, height: 34, borderRadius: 11, background: C.glass2, border: `1px solid ${C.line}`, color: C.cyan, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit3 size={15} /></button>
          </div>
        </div>
      </div>

      {/* Experto en (skills del CV) */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Sparkles size={15} color={C.gold} />
          <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: C.gold }}>Experto en</span>
        </div>
        {skills.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {skills.map((s) => (
              <span key={s} style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 13, color: '#eaf4ff', padding: '7px 13px', borderRadius: 999, background: `linear-gradient(135deg, ${C.purple}22, ${C.cyan}18)`, border: `1px solid ${C.purpleDim}`, boxShadow: `0 0 12px ${C.purple}22` }}>{s}</span>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 13, color: C.mut, lineHeight: 1.5 }}>
            Aún no convalidaste tu CV. Subilo abajo y Ómicron detectará tu experticia.
          </p>
        )}
      </div>

      {/* Los 4 ejes */}
      {gemelo && (
        <div style={card}>
          <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: C.mut, marginBottom: 12 }}>Tus 4 ejes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {AXES.map(([label, key, col]) => {
              const v = Math.round(gemelo[key]);
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 13, color: '#eaf4ff' }}>{label}</span>
                    <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: col }}>{v}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${v}%`, background: col, borderRadius: 3, transition: 'width .5s ease', boxShadow: `0 0 8px ${col}66` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Convalidar (única, real) */}
      <button onClick={() => setShowConvalida(true)}
        style={{ width: '100%', padding: '14px 0', borderRadius: RADIUS.lg, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#5cc8ff,#5e5ce6)', color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
        Convalidar mi Gemelo (CV · título · años) <ArrowRight size={17} />
      </button>

      {/* Pioneer */}
      {profile.is_pioneer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: RADIUS.lg, marginBottom: 14, background: C.goldFaint, border: `1px solid ${C.goldDim}` }}>
          <Award size={20} color={C.gold} />
          <div>
            <div style={{ fontFamily: FONT.mono, fontSize: 10, color: C.gold, letterSpacing: 1.5 }}>ESTATUS PIONEER</div>
            <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.goldDim, marginTop: 2 }}>Beneficio fundacional vitalicio</div>
          </div>
        </div>
      )}

      <div style={{ height: 12 }} />

      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 95, padding: '10px 16px', borderRadius: 10, background: 'rgba(8,16,38,0.94)', border: `1px solid ${C.cyanDim}`, color: C.ink, fontFamily: FONT.body, fontSize: 13 }}>{toast}</div>
      )}

      {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} />}
      {showShare && <ShareCredentialModal username={profile.username} fullName={profile.full_name} onClose={() => setShowShare(false)} />}
      {showConvalida && <ConvalidaOmicron onClose={() => setShowConvalida(false)} onViewProfile={() => setShowConvalida(false)} />}
    </div>
  );
}
