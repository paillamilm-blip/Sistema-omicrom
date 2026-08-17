// components/omicron/OrbContextLabel.tsx
// ═══════════════════════════════════════════════════════════════════════
// ORB CONTEXT LABEL — Texto flotante sobre el orbe que da contexto.
// Cambia según el estado: empleos nuevos, skill top, racha, hint.
// "Sin texto, el orbe es arte abstracto. Con texto, es herramienta."
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { C, FONT } from '@/theme';
import { useApp } from '@/store/AppContext';
import { streakDays } from '@/lib/gemeloProfile';

interface Props {
  visible?: boolean;
}

export function OrbContextLabel({ visible = true }: Props) {
  const { profile } = useApp();

  const label = useMemo(() => {
    const hasSkills = profile?.skills && profile.skills.length > 0;
    const streak = streakDays();
    const rep = profile?.reputation_score ?? 0;
    const hour = new Date().getHours();

    // Sin perfil
    if (!hasSkills) {
      return { text: '↓ toca un nodo para empezar', highlight: false };
    }

    // Frases rotativas basadas en hora + estado
    const seed = new Date().getDate() + hour; // Cambia cada hora
    const options: { text: string; highlight: boolean }[] = [];

    if (streak > 0) {
      options.push({ text: `🔥 ${streak} días seguidos · toca un nodo`, highlight: true });
    }
    if (rep > 0) {
      options.push({ text: `Reputación: ${rep.toFixed(0)} · toca para explorar`, highlight: false });
    }

    const topSkill = profile?.skills_detail?.[0];
    if (topSkill) {
      options.push({ text: `${topSkill.name} ${topSkill.pct}% · toca para mejorar`, highlight: false });
    }

    options.push({ text: '↓ toca un nodo para explorar tu ADN', highlight: false });
    options.push({ text: '↓ desliza o toca · pregúntame algo', highlight: false });

    return options[seed % options.length] ?? options[0];
  }, [profile]);

  if (!visible) return null;

  return (
    <div style={{
      ...S.container,
      color: label.highlight ? C.gold : C.mut,
      textShadow: label.highlight ? `0 0 8px ${C.gold}44` : 'none',
    }}>
      {label.text}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 'calc(env(safe-area-inset-top, 12px) + 52px)',
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: FONT.mono,
    fontSize: 10,
    letterSpacing: 1,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    zIndex: 3,
    pointerEvents: 'none',
    animation: 'fadeInDown 0.3s cubic-bezier(0.32, 0.72, 0, 1) both',
  },
};
