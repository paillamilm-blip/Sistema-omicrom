// features/gemelo/components/CredencialModal.tsx
// ═══════════════════════════════════════════════════════════════════════
// CREDENCIAL ÓMICRON — Tu Gemelo Digital como credencial verificable.
//
// A diferencia de GemeloTab (el "taller" interno donde trabajás tu perfil),
// este modal presenta tu Gemelo Digital como una CREDENCIAL: el equivalente
// visual a una tarjeta de presentación / documento oficial, pensada para
// mostrar y compartir con otros profesionales.
//
// El orbe actúa como RETRATO (no como asistente vivo): contenido, quieto,
// enmarcado. Es el héroe visual pero no domina la tarjeta.
//
// CERO JERGA: cada número se muestra con su escala (NN/100) y con el
// significado claro (Reputación, Ejecución, etc.).
// ═══════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Share2, Zap, Shield, Globe, TrendingUp, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp, useGemeloDigital } from '@/store/AppContext';
import { C, FONT, SIZE, RADIUS } from '@/theme';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { ShareCredentialModal } from '@/features/gemelo/components/RedSocial';

// Fondo radial de la marca Ómicron (mismo lenguaje que BASE.root del tema).
const OMICRON_BG = 'radial-gradient(130% 95% at 50% 18%, #050813 0%, #02030a 52%, #000003 100%)';

export function CredencialModal({ onClose }: { onClose: () => void }) {
  const { profile } = useApp();
  const gemelo = useGemeloDigital();
  const uc = useUserColor();
  const [showShare, setShowShare] = useState(false);

  // ── Datos derivados (mismo patrón exacto que GemeloTab) ────────────────
  const name = profile?.display_name || profile?.full_name || profile?.username || '';
  const username = profile?.username;
  const years = profile?.cv_years_experience ?? 0;
  const seniorLabel = years >= 10 ? 'Profesional Senior'
    : years >= 5 ? 'Profesional Mid-Senior'
    : years >= 2 ? 'Profesional Mid'
    : 'Profesional';

  const skillsDetail = useMemo(() => {
    const details = profile?.skills_detail ?? [];
    if (details.length > 0) return details;
    return (profile?.skills ?? []).map((s: string, i: number) => ({ name: s, pct: Math.max(30, 85 - i * 8) }));
  }, [profile?.skills_detail, profile?.skills]);

  // Ejes del Gemelo. Ejecución adopta el color del usuario (convención GemeloTab).
  const axes: { key: string; label: string; value: number; color: string; Icon: LucideIcon }[] = [
    { key: 'exec', label: 'Ejecución', value: gemelo?.execution ?? profile?.execution_score ?? 0, color: uc, Icon: Zap },
    { key: 'qual', label: 'Calidad', value: gemelo?.quality ?? profile?.quality_score ?? 0, color: C.purple, Icon: Shield },
    { key: 'trans', label: 'Trascendencia', value: gemelo?.transcendence ?? profile?.transcendence_score ?? 0, color: C.gold, Icon: Globe },
    { key: 'fund', label: 'Fundamento', value: gemelo?.foundation ?? profile?.foundation_score ?? 0, color: C.green, Icon: TrendingUp },
  ];
  const reputation = Math.round(gemelo?.overallReputation ?? profile?.reputation_score ?? 0);

  // Nodos del orbe: entre 6 y 42, proporcional a la cantidad de skills.
  const orbNodes = Math.min(42, Math.max(6, skillsDetail.length));

  return (
    <motion.div
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 95,
        background: OMICRON_BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto',
          borderRadius: RADIUS.xl,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          border: `1px solid ${C.line}`,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── Barra de acento superior (color del usuario) ── */}
        <div style={{ height: 3, borderRadius: '3px 3px 0 0', background: `linear-gradient(90deg, transparent, ${uc}, transparent)` }} />

        {/* ── Botón cerrar ── */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 2,
            width: 32, height: 32, borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.line}`, color: C.ink,
          }}
        >
          <X size={16} />
        </button>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* ── Eyebrow ── */}
          <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 2.5, color: uc, textTransform: 'uppercase' }}>
            Credencial Ómicron
          </div>

          {/* ── Orbe como RETRATO contenido ── */}
          <div
            style={{
              marginTop: 18,
              padding: 8, borderRadius: RADIUS.pill,
              border: `1px solid ${uc}4d`,
              boxShadow: `0 0 30px ${uc}33`,
              background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.04), transparent 70%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <GeodesicOrb
              size={130}
              spinning={0}
              breathing
              intensity={0.6}
              color={uc}
              nodes={orbNodes}
            />
          </div>

          {/* ── Nombre + seniority ── */}
          <h2 style={{ margin: '18px 0 0', fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.xl, color: C.ink, letterSpacing: -0.3, textAlign: 'center' }}>
            {name || 'Tu Gemelo Digital'}
          </h2>
          <p style={{ margin: '4px 0 0', fontFamily: FONT.body, fontSize: SIZE.sm, color: C.mut, textAlign: 'center' }}>
            {seniorLabel}{years > 0 ? ` · ${years} años` : ''}
          </p>

          {/* ── Reputación ── */}
          <div style={{ width: '100%', marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
              <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 1, color: C.mut, textTransform: 'uppercase', marginRight: 4 }}>
                Reputación
              </span>
              <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xxl, color: uc, letterSpacing: -0.5 }}>
                {reputation}
              </span>
              <span style={{ fontFamily: FONT.mono, fontSize: SIZE.sm, color: C.mut }}>/100</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, marginTop: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${reputation}%` }}
                transition={{ delay: 0.15, duration: 0.7, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 3, background: uc, boxShadow: `0 0 6px ${uc}66` }}
              />
            </div>
          </div>

          {/* ── 4 Ejes del Gemelo (grid 2x2, cada uno NN/100) ── */}
          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
            {axes.map(({ key, label, value, color, Icon }, i) => {
              const val = Math.round(value);
              return (
                <div
                  key={key}
                  style={{
                    padding: '12px 12px', borderRadius: RADIUS.md,
                    background: `${color}0d`, border: `1px solid ${color}33`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <Icon size={13} color={color} />
                    <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 0.5, color: C.mut, textTransform: 'uppercase' }}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: `${color}22`, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${val}%` }}
                        transition={{ delay: 0.25 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 3, background: color, boxShadow: `0 0 5px ${color}66` }}
                      />
                    </div>
                    <span style={{ fontFamily: FONT.mono, fontSize: SIZE.sm, fontWeight: 700, color, minWidth: 30, textAlign: 'right' }}>
                      {val}<span style={{ fontSize: SIZE.xxs, fontWeight: 600, color: C.mut }}>/100</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Compartir credencial ── */}
          <button
            onClick={() => username && setShowShare(true)}
            disabled={!username}
            style={{
              width: '100%', marginTop: 22, padding: '13px', borderRadius: RADIUS.lg,
              cursor: username ? 'pointer' : 'not-allowed',
              background: username ? uc : 'rgba(255,255,255,0.05)',
              border: username ? 'none' : `1px solid ${C.line}`,
              color: username ? '#021018' : C.mut,
              fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: username ? 1 : 0.6,
            }}
          >
            <Share2 size={16} /> Compartir
          </button>
          {!username && (
            <p style={{ margin: '8px 0 0', fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, textAlign: 'center' }}>
              Creá tu usuario público para poder compartir tu credencial.
            </p>
          )}

          {/* ── Sello de verificación ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16 }}>
            <CheckCircle2 size={13} color={C.green} />
            <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 0.5, color: C.mut }}>
              Verificado por Sistema Ómicron
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Modal de compartir (reutiliza QR/link existente) ── */}
      {showShare && username && (
        <ShareCredentialModal username={username} fullName={name} onClose={() => setShowShare(false)} />
      )}
    </motion.div>
  );
}
