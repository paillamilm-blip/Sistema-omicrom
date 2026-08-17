// shared/utils/microcopy.ts
// ═══════════════════════════════════════════════════════════════════════
// AI MICRO-COPY — Personalized, contextual UI text.
//
// Instead of generic static text, the UI speaks directly to the user
// using their name, time of day, streak, and profile context.
//
// "An interface that knows your name feels like it was built for you."
// ═══════════════════════════════════════════════════════════════════════

import type { Profile } from '@/types/profile';

/** Get the user's first name or a friendly fallback */
function firstName(profile: Profile | null): string {
  if (!profile) return '';
  const name = profile.display_name || profile.full_name || profile.username || '';
  return name.split(/\s+/)[0] || '';
}

/** Time-aware greeting */
function timeGreeting(): 'buenos días' | 'buenas tardes' | 'buenas noches' {
  const h = new Date().getHours();
  if (h < 12) return 'buenos días';
  if (h < 19) return 'buenas tardes';
  return 'buenas noches';
}

/** Personalized greeting for the orb/home screen */
export function greetingCopy(profile: Profile | null): string {
  const name = firstName(profile);
  const time = timeGreeting();
  if (!name) return `Hey, ${time} 👋`;
  return `${name}, ${time} 👋`;
}

/** Contextual CTA for the input placeholder */
export function inputPlaceholder(profile: Profile | null): string {
  const name = firstName(profile);
  const hasSkills = profile?.skills && profile.skills.length > 0;
  const hasCv = !!profile?.cv_summary;

  if (!hasSkills) {
    return name ? `${name}, ¿a qué te dedicas?` : '¿A qué te dedicas? Cuéntame…';
  }
  if (!hasCv) {
    return name ? `${name}, pregúntame algo o sube tu CV` : 'Pregúntame algo o sube tu CV';
  }
  return name ? `${name}, ¿en qué te ayudo?` : '¿En qué te ayudo hoy?';
}

/** Streak celebration copy */
export function streakCopy(days: number, profile: Profile | null): string {
  const name = firstName(profile);
  if (days <= 0) return '';
  if (days === 1) return name ? `${name}, empezaste tu racha 🔥` : '¡Empezaste tu racha! 🔥';
  if (days < 7) return `${days} días seguidos 🔥`;
  if (days === 7) return name ? `${name}, ¡1 semana de racha! 🏆` : '¡1 semana de racha! 🏆';
  return `${days} días · racha legendaria 🔥🔥`;
}

/** Job match notification copy */
export function jobMatchCopy(jobTitle: string, profile: Profile | null): string {
  const name = firstName(profile);
  return name ? `${name}, hay un match para ti: ${jobTitle}` : `Nuevo match: ${jobTitle}`;
}

/** Achievement unlocked copy */
export function achievementCopy(achievement: string, profile: Profile | null): string {
  const name = firstName(profile);
  return name ? `¡${name}, desbloqueaste: ${achievement}!` : `¡Logro desbloqueado: ${achievement}!`;
}

/** Empty state copy (when a tab has no content) */
export function emptyStateCopy(tab: string, profile: Profile | null): string {
  const name = firstName(profile);
  const base = name ? `${name}, ` : '';
  switch (tab) {
    case 'empleos': return `${base}tu siguiente oportunidad está por llegar`;
    case 'academia': return `${base}aquí aparecerán tus cursos y retos`;
    case 'market': return `${base}el mercado se activa cuando publiques tu primer servicio`;
    case 'chat': return `${base}tus conversaciones aparecerán aquí`;
    default: return `${base}aquí aparecerá tu contenido`;
  }
}
