// src/lib/dailyChallenge.ts
// ═══════════════════════════════════════════════════════════════════════
// DAILY CHALLENGE — Reto diario rotativo que da razón para volver.
// "El Wordle de tu carrera" — 2 minutos, cada día uno nuevo.
// Combinado con streak: completar reto mantiene la racha.
// ═══════════════════════════════════════════════════════════════════════

export type ChallengeType =
  | 'reflection'    // Lunes: reflexión
  | 'self_eval'     // Martes: auto-evaluación skill
  | 'job_review'    // Miércoles: revisar un empleo
  | 'connect'       // Jueves: conectar con alguien
  | 'share'         // Viernes: compartir un tip
  | 'quiz'          // Sábado: speed quiz
  | 'review';       // Domingo: resumen semanal

export interface DailyChallenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  peReward: number;
  emoji: string;
  action: string; // Texto del botón CTA
  estimatedMinutes: number;
}

/** Challenges por día de la semana (0=Domingo, 1=Lunes...) */
const CHALLENGE_TEMPLATES: Record<number, () => DailyChallenge> = {
  1: () => ({
    id: `challenge-${todayKey()}`,
    type: 'reflection',
    title: 'Reflexión del lunes',
    description: '¿Qué aprendiste la semana pasada que puedas aplicar hoy? Escríbelo en una frase.',
    peReward: 5,
    emoji: '🧠',
    action: 'Escribir reflexión',
    estimatedMinutes: 2,
  }),
  2: () => ({
    id: `challenge-${todayKey()}`,
    type: 'self_eval',
    title: 'Auto-evaluación rápida',
    description: 'Evalúa tu skill principal: ¿básico, intermedio o avanzado? Sé honesto — tu Gemelo se ajusta.',
    peReward: 8,
    emoji: '🎯',
    action: 'Evaluar skill',
    estimatedMinutes: 1,
  }),
  3: () => ({
    id: `challenge-${todayKey()}`,
    type: 'job_review',
    title: 'Oportunidad del día',
    description: 'Revisa una oferta de empleo nueva. ¿Te postularías? Si sí, tu Gemelo te arma la carta.',
    peReward: 10,
    emoji: '💼',
    action: 'Ver oferta',
    estimatedMinutes: 2,
  }),
  4: () => ({
    id: `challenge-${todayKey()}`,
    type: 'connect',
    title: 'Conexión del jueves',
    description: 'Mira quién está en línea en la red. Conecta con 1 persona — un saludo basta.',
    peReward: 12,
    emoji: '🤝',
    action: 'Ver red',
    estimatedMinutes: 2,
  }),
  5: () => ({
    id: `challenge-${todayKey()}`,
    type: 'share',
    title: 'Comparte un tip',
    description: 'Escribe un consejo profesional de tu experiencia. Ayudas a otros y sube tu Trascendencia.',
    peReward: 15,
    emoji: '💡',
    action: 'Escribir tip',
    estimatedMinutes: 3,
  }),
  6: () => ({
    id: `challenge-${todayKey()}`,
    type: 'quiz',
    title: 'Speed quiz',
    description: '3 preguntas rápidas de tu área. Responde bien → +PE directo. Sin presión.',
    peReward: 20,
    emoji: '⚡',
    action: 'Empezar quiz',
    estimatedMinutes: 2,
  }),
  0: () => ({
    id: `challenge-${todayKey()}`,
    type: 'review',
    title: 'Tu semana en 30 segundos',
    description: 'Mira cuánto avanzaste esta semana: PE ganados, reputación, racha. Descansa — lo mereces.',
    peReward: 5,
    emoji: '📊',
    action: 'Ver resumen',
    estimatedMinutes: 1,
  }),
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Obtiene el reto del día actual */
export function getTodayChallenge(): DailyChallenge {
  const dayOfWeek = new Date().getDay();
  const generator = CHALLENGE_TEMPLATES[dayOfWeek] ?? CHALLENGE_TEMPLATES[1];
  return generator();
}

/** Verifica si el reto de hoy ya se completó */
export function isChallengeCompleted(): boolean {
  const key = `omicron_challenge_${todayKey()}`;
  return localStorage.getItem(key) === 'done';
}

/** Marca el reto de hoy como completado */
export function completeChallenge(): number {
  const key = `omicron_challenge_${todayKey()}`;
  localStorage.setItem(key, 'done');

  // Registrar en historial para streak
  const histKey = 'omicron_challenge_history';
  const history: string[] = JSON.parse(localStorage.getItem(histKey) ?? '[]');
  history.push(todayKey());
  // Mantener solo últimos 60 días
  localStorage.setItem(histKey, JSON.stringify(history.slice(-60)));

  return getTodayChallenge().peReward;
}

/** Racha de challenges completados consecutivos */
export function challengeStreak(): number {
  const histKey = 'omicron_challenge_history';
  const history: string[] = JSON.parse(localStorage.getItem(histKey) ?? '[]');
  if (history.length === 0) return 0;

  const today = todayKey();
  const dates = new Set(history);
  let streak = 0;
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);

  // Si hoy no completó, empieza desde ayer
  if (!dates.has(today)) {
    cur.setDate(cur.getDate() - 1);
    if (!dates.has(cur.toISOString().slice(0, 10))) return 0;
  }

  while (dates.has(cur.toISOString().slice(0, 10))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}
