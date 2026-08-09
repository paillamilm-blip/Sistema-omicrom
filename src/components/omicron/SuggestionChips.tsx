// components/omicron/SuggestionChips.tsx
// ═══════════════════════════════════════════════════════════════════════
// SUGGESTION CHIPS — Quick actions debajo del input bar.
// Contextuales: cambian según el estado del perfil, racha, empleos.
// "El blank page problem desaparece con un toque."
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { C, FONT } from '../../theme';
import { useApp } from '../../store/AppContext';
import { streakDays } from '../../lib/gemeloProfile';
import { isChallengeCompleted } from '../../lib/dailyChallenge';

interface Chip {
  emoji: string;
  label: string;
  action: string; // text to send to handleTextInput
}

interface Props {
  onChipTap: (text: string) => void;
  visible?: boolean;
}

export function SuggestionChips({ onChipTap, visible = true }: Props) {
  const { profile } = useApp();

  const chips = useMemo((): Chip[] => {
    const hasSkills = profile?.skills && profile.skills.length > 0;
    const hasCv = !!profile?.cv_summary;
    const streak = streakDays();
    const challengeDone = isChallengeCompleted();

    // Sin perfil / sin skills
    if (!hasSkills) {
      return [
        { emoji: '📄', label: 'Sube tu CV', action: 'quiero subir mi cv' },
        { emoji: '🎯', label: 'Busco trabajo', action: 'busco trabajo' },
        { emoji: '📚', label: 'Quiero aprender', action: 'quiero aprender' },
        { emoji: '❓', label: '¿Qué es esto?', action: 'explícame qué es esto' },
      ];
    }

    // Con perfil
    const result: Chip[] = [];

    // Reto del día (si no completado)
    if (!challengeDone) {
      result.push({ emoji: '🎯', label: 'Reto del día', action: 'abre mi perfil' });
    }

    // Empleos siempre relevante
    result.push({ emoji: '💼', label: 'Ver empleos', action: 'abre empleos' });

    // Reputación
    result.push({ emoji: '📈', label: 'Mi reputación', action: 'cuánta reputación tengo' });

    // Consejo IA
    result.push({ emoji: '💡', label: 'Consejo IA', action: 'dame un consejo' });

    // Si no tiene CV, sugerir
    if (!hasCv) {
      result.push({ emoji: '📄', label: 'Subir CV', action: 'quiero subir mi cv' });
    }

    // Streak
    if (streak > 0) {
      result.unshift({ emoji: '🔥', label: `Racha ${streak}d`, action: 'abre mi perfil' });
    }

    return result.slice(0, 4); // Máximo 4 chips
  }, [profile]);

  if (!visible) return null;

  return (
    <div style={S.container}>
      {chips.map((chip) => (
        <button
          key={chip.label}
          onClick={() => onChipTap(chip.action)}
          style={S.chip}
        >
          <span style={S.emoji}>{chip.emoji}</span>
          <span style={S.label}>{chip.label}</span>
        </button>
      ))}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'center',
    padding: '8px 16px 4px',
    maxWidth: 380,
    margin: '0 auto',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '7px 12px',
    borderRadius: 20,
    background: 'rgba(92,200,255,0.06)',
    border: '1px solid rgba(92,200,255,0.2)',
    color: C.ink,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    WebkitTapHighlightColor: 'transparent',
  },
  emoji: { fontSize: 13 },
  label: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.5, color: '#c8ddf0' },
};
