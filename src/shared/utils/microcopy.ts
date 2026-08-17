// shared/utils/microcopy.ts — Personalized UI text

/** Time-aware greeting */
function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'buenos días';
  if (h < 19) return 'buenas tardes';
  return 'buenas noches';
}

/** Personalized greeting */
export function greetingCopy(profile: { display_name?: string; full_name?: string; username?: string } | null): string {
  if (!profile) return `Hey, ${timeGreeting()} 👋`;
  const name = (profile.display_name || profile.full_name || profile.username || '').split(/\s+/)[0];
  if (!name) return `Hey, ${timeGreeting()} 👋`;
  return `${name}, ${timeGreeting()} 👋`;
}

/** Streak celebration */
export function streakCopy(days: number): string {
  if (days <= 0) return '';
  if (days === 1) return '¡Empezaste tu racha! 🔥';
  if (days < 7) return `${days} días seguidos 🔥`;
  if (days === 7) return '¡1 semana de racha! 🏆';
  return `${days} días · racha legendaria 🔥🔥`;
}
