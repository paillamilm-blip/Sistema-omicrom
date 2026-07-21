// components/perfil/ProfileCard.tsx
// ═══════════════════════════════════════════════════════════════════════
// TARJETA DE IDENTIDAD / PERFIL: modal flotante que muestra el avatar,
// nivel, reputación, stats, skills y posicionamiento del profesional.
// Es el "pasaporte digital" del Gemelo.
// ═══════════════════════════════════════════════════════════════════════

import { X, CheckCircle } from 'lucide-react';
import type { AnalyzedProfile } from '../../lib/cvAnalyzer';
import { getTopJobs } from '../../lib/jobMatcher';
import { C, FONT } from '../../theme';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: AnalyzedProfile;
  reputation: number;
  pe: number;
  tokens: number;
  contracts?: number;
  onViewOpportunities?: () => void;
}

export function ProfileCard({
  isOpen,
  onClose,
  profile,
  reputation,
  pe,
  tokens,
  contracts = 0,
  onViewOpportunities,
}: Props) {
  const level = reputation >= 80 ? 6 : reputation >= 66 ? 4 : reputation >= 50 ? 2 : 1;
  const tierName = level >= 6 ? 'Pioneer' : level >= 4 ? 'Arquitecto' : level >= 2 ? 'Core' : 'Operativo';

  const topJob = getTopJobs(profile, reputation, 1)[0];
  const topPercent = Math.max(2, Math.min(55, Math.round(102 - reputation - (topJob?.success || 60) * 0.15)));

  const positioning = getPositioning(profile, reputation, topJob, topPercent);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          ...S.backdrop,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Tarjeta */}
      <div
        style={{
          ...S.card,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -46%) scale(0.94)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* Botón cerrar */}
        <button onClick={onClose} style={S.closeBtn} aria-label="Cerrar">
          <X size={15} />
        </button>

        {/* Avatar con anillo giratorio */}
        <div style={S.avatarWrap}>
          <div style={S.avatarRing}>
            <div style={S.avatarRingDot} />
          </div>
          <div
            style={{
              ...S.avatar,
              ...(profile.avatar?.type === 'img'
                ? {
                    backgroundImage: `url(${profile.avatar.v})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : {
                    background: getAvatarGradient(profile.avatar?.v as number),
                  }),
            }}
          >
            {profile.avatar?.type !== 'img' && (
              <span style={{ fontFamily: FONT.display, fontSize: 44, fontWeight: 700, color: '#fff' }}>
                Ω
              </span>
            )}
          </div>
        </div>

        {/* Badge de validación */}
        <div style={S.badge}>
          <CheckCircle size={12} />
          NODO VALIDADO · N{level} · {tierName}
        </div>

        {/* Nombre */}
        <h2 style={S.name}>{profile.name || 'Tu Gemelo Digital'}</h2>

        {/* Rol */}
        <div style={S.role}>
          {profile.seniorLabel}
          {profile.years > 0 && ` · ${profile.years} año${profile.years !== 1 ? 's' : ''}`}
        </div>

        {/* Posicionamiento */}
        <p style={S.summary}>{positioning}</p>

        {/* Stats */}
        <div style={S.statsGrid}>
          <div style={S.stat}>
            <div style={{ ...S.statValue, color: C.cyan }}>{reputation}</div>
            <div style={S.statLabel}>Reputación</div>
          </div>
          <div style={S.stat}>
            <div style={{ ...S.statValue, color: C.green }}>{tokens.toLocaleString()}</div>
            <div style={S.statLabel}>Tokens Ω</div>
          </div>
          <div style={S.stat}>
            <div style={{ ...S.statValue, color: C.gold }}>{contracts > 0 ? contracts : (topJob ? `${topJob.success}%` : '—')}</div>
            <div style={S.statLabel}>{contracts > 0 ? 'Contratos' : 'Mejor match'}</div>
          </div>
          <div style={S.stat}>
            <div style={{ ...S.statValue, color: C.purple }}>{pe.toLocaleString()}</div>
            <div style={S.statLabel}>PE</div>
          </div>
        </div>

        {/* Skills */}
        <div style={S.chips}>
          {profile.labels.slice(0, 8).map((label) => (
            <span key={label} style={S.chip}>
              {label}
            </span>
          ))}
        </div>

        {/* Botón CTA */}
        {onViewOpportunities && (
          <button onClick={onViewOpportunities} style={S.btnPrimary}>
            Ver las oportunidades que te buscan →
          </button>
        )}
      </div>
    </>
  );
}

function getAvatarGradient(index: number): string {
  const palettes = [
    ['#5cc8ff', '#5e5ce6'],
    ['#3fd0c9', '#5cc8ff'],
    ['#ffb02e', '#ff6a3d'],
    ['#b98bff', '#5e5ce6'],
    ['#ff8fb0', '#ff375f'],
    ['#8b9dff', '#3fd0c9'],
  ];
  const [c1, c2] = palettes[(index || 0) % palettes.length];
  return `linear-gradient(140deg, ${c1}, ${c2})`;
}

function getPositioning(
  profile: AnalyzedProfile,
  reputation: number,
  topJob: ReturnType<typeof getTopJobs>[0] | undefined,
  topPercent: number
): string {
  if (profile.arch === 'estudiante') {
    const nextSkill = profile.labels[0] || 'tu próxima habilidad';
    const base = profile.labels.slice(0, 2).join(' y ') || 'tus primeras bases';
    return `Estás en modo aprendizaje. El sistema conecta tus habilidades, retos y prácticas en una sola ruta que te lleva de aprendiz a nodo profesional validado. Hoy sumas ${base}; tu siguiente salto es ${nextSkill}.`;
  }

  const area = profile.labels.slice(0, 3).join(', ') || 'tu especialidad';
  const jobTitle = topJob?.job.title || 'tu rol';
  const afinidad = topJob?.success || 60;

  let desc = `Eres ${profile.seniorLabel}`;
  if (profile.years) desc += ` con ${profile.years} años de trayectoria`;
  desc += `, especializado en ${area}. El sistema te posiciona en el top ${topPercent}% de la red para ${jobTitle}, con ${afinidad}% de afinidad.`;

  if (profile.creativity >= 0.6) {
    desc += ' Perfil de alta creatividad y visión de producto.';
  } else {
    desc += ' Perfil técnico sólido y confiable.';
  }

  return desc;
}

// ───────────────────────────────────────────────────────────────────────
// Estilos
// ───────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 37,
    background: 'rgba(1,2,6,0.72)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    transition: 'opacity 0.3s',
  },
  card: {
    position: 'fixed',
    left: '50%',
    top: '50%',
    zIndex: 38,
    width: 'min(90%, 360px)',
    maxHeight: '88%',
    overflowY: 'auto',
    padding: '26px 22px 22px',
    borderRadius: 28,
    textAlign: 'center',
    background: 'linear-gradient(180deg, rgba(16,20,38,0.96), rgba(6,8,18,0.98))',
    border: `1px solid ${C.line}`,
    boxShadow: '0 40px 100px rgba(0,0,0,0.75), inset 0 1px 0 rgba(140,180,255,0.14)',
    transition: 'all 0.3s cubic-bezier(0.2, 0.9, 0.25, 1)',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: '50%',
    border: `1px solid ${C.line}`,
    background: 'rgba(255,255,255,0.05)',
    color: C.mut,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  avatarWrap: {
    position: 'relative',
    width: 112,
    height: 112,
    margin: '2px auto 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    position: 'absolute',
    inset: -6,
    borderRadius: '50%',
    border: '1px solid rgba(120,180,255,0.25)',
    animation: 'cp-spin 14s linear infinite',
  },
  avatarRingDot: {
    position: 'absolute',
    top: -3,
    left: '50%',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: C.cyan,
    boxShadow: `0 0 10px ${C.cyan}`,
    transform: 'translateX(-50%)',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 16px 46px rgba(92,120,255,0.5), inset 0 2px 10px rgba(255,255,255,0.25)',
    animation: 'floatY 5s ease-in-out infinite',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    margin: '4px auto 6px',
    padding: '5px 12px',
    borderRadius: 20,
    fontFamily: FONT.mono,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: '#7fffd0',
    background: 'rgba(63,208,201,0.12)',
    border: '1px solid rgba(63,208,201,0.35)',
  },
  name: {
    fontFamily: FONT.display,
    fontSize: 21,
    fontWeight: 700,
    color: C.ink,
    margin: '4px 0 0',
  },
  role: {
    fontFamily: FONT.display,
    fontSize: 12,
    color: C.cyan,
    fontWeight: 600,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  summary: {
    fontFamily: FONT.display,
    fontSize: 13.5,
    lineHeight: 1.6,
    color: '#c2cadd',
    margin: '12px 0 0',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginTop: 16,
  },
  stat: {
    padding: '11px 6px',
    borderRadius: 14,
    background: C.glass,
    border: `1px solid ${C.line}`,
  },
  statValue: {
    fontFamily: FONT.display,
    fontSize: 19,
    fontWeight: 800,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: FONT.mono,
    fontSize: 8.5,
    color: C.mut,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 14,
  },
  chip: {
    fontFamily: FONT.display,
    fontSize: 11,
    padding: '5px 10px',
    borderRadius: 11,
    border: `1px solid rgba(92,200,255,0.32)`,
    background: C.glass,
    color: C.cyan,
  },
  btnPrimary: {
    marginTop: 18,
    width: '100%',
    padding: 14,
    borderRadius: 15,
    border: 'none',
    cursor: 'pointer',
    fontFamily: FONT.display,
    fontSize: 14.5,
    fontWeight: 600,
    color: '#05060f',
    background: 'linear-gradient(135deg, #ffd27a, #ffb02e)',
    boxShadow: '0 12px 30px rgba(255,176,46,0.3)',
  },
};
