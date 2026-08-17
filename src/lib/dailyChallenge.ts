// src/lib/dailyChallenge.ts
// ═══════════════════════════════════════════════════════════════════════
// MICRO-RETOS DIARIOS — "Tu desafío de hoy"
//
// Cada día, Ómicron propone UN reto de 5 minutos basado en la brecha más
// débil del usuario. No es un curso largo — es una acción mínima con
// impacto medible que mueve los ejes realmente.
//
// 100% determinístico (sin IA) — funciona offline, 0 latencia.
// El reto se genera desde el perfil + fecha (mismo reto todo el día).
// ═══════════════════════════════════════════════════════════════════════

import type { GemeloDigital } from '../types';

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  action: string;       // Lo que debe hacer
  duration: string;     // "5 min", "3 min"
  reward: {
    pe: number;
    axis: 'execution' | 'quality' | 'transcendence' | 'foundation';
    delta: number;      // cuánto sube el eje
  };
  icon: string;
  targetTab?: string;   // A dónde llevarlo
}

// ── Catálogo de retos por eje ────────────────────────────────────────

const EXECUTION_CHALLENGES: Omit<DailyChallenge, 'id'>[] = [
  { title: 'Documenta un logro', description: 'Escribe 3 líneas sobre un proyecto que completaste. Cualquiera sirve.', action: 'Escribe en la Bóveda', duration: '3 min', reward: { pe: 5, axis: 'execution', delta: 2 }, icon: '🚀', targetTab: 'vault' },
  { title: 'Postula a un empleo', description: 'Elige una oferta de la pestaña Empleos y postula con carta IA.', action: 'Postula con carta IA', duration: '5 min', reward: { pe: 8, axis: 'execution', delta: 3 }, icon: '💼', targetTab: 'empleos' },
  { title: 'Conecta con alguien', description: 'Envía una solicitud de conexión a alguien con skills complementarias.', action: 'Conecta en la Red', duration: '2 min', reward: { pe: 3, axis: 'execution', delta: 1 }, icon: '🤝', targetTab: 'chat' },
  { title: 'Ofrece un servicio', description: 'Publica un micro-servicio en el Marketplace basado en tu skill más fuerte.', action: 'Publica en Mercado', duration: '5 min', reward: { pe: 10, axis: 'execution', delta: 3 }, icon: '💡', targetTab: 'market' },
];

const QUALITY_CHALLENGES: Omit<DailyChallenge, 'id'>[] = [
  { title: 'Valida una skill', description: 'Rinde un examen rápido de tu skill principal. 3 preguntas + caso práctico.', action: 'Examen en MaxSkill', duration: '5 min', reward: { pe: 10, axis: 'quality', delta: 3 }, icon: '🎯', targetTab: 'maxskill' },
  { title: 'Completa una lección', description: 'Toma una lección de la Academia y responde el quiz.', action: 'Lección en Academia', duration: '5 min', reward: { pe: 5, axis: 'quality', delta: 2 }, icon: '📚', targetTab: 'academia' },
  { title: 'Revisa tu CV', description: 'Si tu CV está desactualizado, vuelve a subirlo. Ómicron re-analiza y actualiza tus ejes.', action: 'Re-subir CV', duration: '3 min', reward: { pe: 5, axis: 'quality', delta: 2 }, icon: '📄', targetTab: 'perfil' },
];

const TRANSCENDENCE_CHALLENGES: Omit<DailyChallenge, 'id'>[] = [
  { title: 'Publica conocimiento', description: 'Comparte una solución técnica en la Bóveda. Puede ser breve — un truco, un patrón, un aprendizaje.', action: 'Publicar en Bóveda', duration: '5 min', reward: { pe: 12, axis: 'transcendence', delta: 4 }, icon: '💎', targetTab: 'vault' },
  { title: 'Responde a alguien', description: 'Busca una pregunta en la Red Social y respóndela con tu experiencia.', action: 'Ayuda en la Red', duration: '3 min', reward: { pe: 5, axis: 'transcendence', delta: 2 }, icon: '🌟', targetTab: 'chat' },
  { title: 'Comparte tu perfil', description: 'Envía tu Pasaporte Gemelo a alguien que pueda validarte.', action: 'Compartir Pasaporte', duration: '2 min', reward: { pe: 3, axis: 'transcendence', delta: 1 }, icon: '🔗', targetTab: 'perfil' },
];

const FOUNDATION_CHALLENGES: Omit<DailyChallenge, 'id'>[] = [
  { title: 'Micro-curso adaptativo', description: 'Toma un micro-curso generado por IA sobre tu skill más débil.', action: 'Curso en Academia', duration: '5 min', reward: { pe: 8, axis: 'foundation', delta: 3 }, icon: '🧠', targetTab: 'academia' },
  { title: 'Actualiza tu perfil', description: 'Agrega un dato nuevo: ubicación, bio, o una credencial verificable.', action: 'Editar Perfil', duration: '2 min', reward: { pe: 3, axis: 'foundation', delta: 1 }, icon: '✏️', targetTab: 'perfil' },
  { title: 'Explora la Gobernanza', description: 'Lee cómo funciona el Tribunal de Pares. Entender el sistema = fundamento.', action: 'Ver Gobernanza', duration: '3 min', reward: { pe: 3, axis: 'foundation', delta: 1 }, icon: '⚖️', targetTab: 'gobernanza' },
];

const ALL_CHALLENGES: Record<string, Omit<DailyChallenge, 'id'>[]> = {
  execution: EXECUTION_CHALLENGES,
  quality: QUALITY_CHALLENGES,
  transcendence: TRANSCENDENCE_CHALLENGES,
  foundation: FOUNDATION_CHALLENGES,
};

// ── API pública ──────────────────────────────────────────────────────

/**
 * Genera el reto del día basado en el eje más débil del usuario.
 * Determinístico: misma fecha + mismo perfil = mismo reto (estable).
 */
export function getDailyChallenge(gemelo: GemeloDigital | null): DailyChallenge | null {
  if (!gemelo) return null;

  // Encontrar eje más débil
  const axes = {
    execution: gemelo.execution,
    quality: gemelo.quality,
    transcendence: gemelo.transcendence,
    foundation: gemelo.foundation,
  };
  const weakest = Object.entries(axes).sort((a, b) => a[1] - b[1])[0][0];

  // Seleccionar reto estable para hoy (basado en fecha)
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashCode(today + weakest);
  const pool = ALL_CHALLENGES[weakest] || EXECUTION_CHALLENGES;
  const index = Math.abs(seed) % pool.length;
  const challenge = pool[index];

  return {
    ...challenge,
    id: `${today}-${weakest}-${index}`,
  };
}

/**
 * ¿El usuario ya completó el reto de hoy?
 */
export function isChallengeCompleted(challengeId: string): boolean {
  return localStorage.getItem(`challenge_done_${challengeId}`) === '1';
}

/**
 * Marca el reto como completado.
 */
export function markChallengeCompleted(challengeId: string): void {
  localStorage.setItem(`challenge_done_${challengeId}`, '1');
}

/**
 * Streak actual (días consecutivos completando retos).
 */
export function getCurrentStreak(): number {
  const raw = localStorage.getItem('omicron_challenge_streak');
  if (!raw) return 0;
  try {
    const { date, count } = JSON.parse(raw);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (date === today || date === yesterday) return count;
    return 0; // Streak broken
  } catch { return 0; }
}

/**
 * Incrementa el streak (llamar al completar el reto).
 */
export function incrementStreak(): void {
  const today = new Date().toISOString().slice(0, 10);
  const current = getCurrentStreak();
  localStorage.setItem('omicron_challenge_streak', JSON.stringify({ date: today, count: current + 1 }));
}

// ── Helpers ──────────────────────────────────────────────────────────

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
