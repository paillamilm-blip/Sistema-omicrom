// components/shared/JourneyProgress.tsx
// ═══════════════════════════════════════════════════════════════════════
// "TU CAMINO" — 5 pasos visibles post-onboarding.
//
// Muestra un progress bar sutil con los pasos que el usuario necesita
// completar para estar "activado". Se oculta cuando completa los 5.
// Cada paso completado desaparece con animación. Gamificado con PE bonus.
// ═══════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { C, FONT } from '@/theme';

interface JourneyStep {
  id: string;
  label: string;
  emoji: string;
  completed: boolean;
  action?: string;
}

interface Props {
  profile: {
    skills?: string[] | null;
    cv_summary?: string | null;
    reputation_score?: number | null;
    pe_points?: number | null;
    total_contracts_completed?: number | null;
  } | null;
  hasConnections?: boolean;
  onNavigate?: (tab: string) => void;
}

export function JourneyProgress({ profile, hasConnections = false, onNavigate }: Props) {
  const steps = useMemo((): JourneyStep[] => {
    if (!profile) return [];
    const hasCv = !!profile.cv_summary;
    const hasRep = (profile.reputation_score ?? 0) > 40;
    const hasPe = (profile.pe_points ?? 0) >= 50;

    return [
      { id: 'profile', label: 'Crear perfil', emoji: '⬡', completed: true }, // Si ve esto, ya tiene perfil
      { id: 'cv', label: 'Subir CV', emoji: '📄', completed: hasCv, action: 'perfil' },
      { id: 'skill', label: 'Validar 1 skill', emoji: '🎯', completed: hasPe, action: 'maxskill' },
      { id: 'match', label: 'Primer match', emoji: '💼', completed: hasRep, action: 'empleos' },
      { id: 'connect', label: 'Conectar', emoji: '🤝', completed: hasConnections, action: 'chat' },
    ];
  }, [profile, hasConnections]);

  const completed = steps.filter(s => s.completed).length;
  const total = steps.length;

  // No mostrar si completó todo o no hay perfil
  if (completed >= total || !profile) return null;

  const pct = Math.round((completed / total) * 100);

  return (
    <div style={S.container}>
      <div style={S.header}>
        <span style={S.title}>Tu Camino</span>
        <span style={S.pct}>{pct}%</span>
      </div>

      {/* Progress bar */}
      <div style={S.bar}>
        <div style={{ ...S.barFill, width: `${pct}%` }} />
      </div>

      {/* Steps */}
      <div style={S.steps}>
        {steps.map(step => (
          <button
            key={step.id}
            onClick={() => !step.completed && step.action && onNavigate?.(step.action)}
            disabled={step.completed}
            style={{
              ...S.step,
              opacity: step.completed ? 0.5 : 1,
              cursor: step.completed ? 'default' : 'pointer',
            }}
          >
            <span style={{ fontSize: 14 }}>{step.completed ? '✅' : step.emoji}</span>
            <span style={{
              ...S.stepLabel,
              textDecoration: step.completed ? 'line-through' : 'none',
              color: step.completed ? C.mut : C.ink,
            }}>{step.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    margin: '0 0 14px',
    padding: '12px 14px',
    borderRadius: 14,
    background: 'rgba(94,92,230,0.06)',
    border: '1px solid rgba(94,92,230,0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontFamily: FONT.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: C.purple,
  },
  pct: {
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: 700,
    color: C.purple,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    background: `linear-gradient(90deg, ${C.purple}, ${C.cyan})`,
    transition: 'width 0.5s ease',
  },
  steps: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 10px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'opacity 0.3s ease',
  },
  stepLabel: {
    fontFamily: FONT.body,
    fontSize: 11,
    transition: 'color 0.3s ease',
  },
};
