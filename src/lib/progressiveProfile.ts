// src/lib/progressiveProfile.ts
// ═══════════════════════════════════════════════════════════════════════
// R2: PROGRESSIVE PROFILING — Enriquecimiento gradual del perfil.
// En vez de pedir todo de una vez, Ómicron pregunta de a poco.
// ═══════════════════════════════════════════════════════════════════════
import type { Profile } from '../types';

export interface ProfileQuestion {
  question: string;
  field: string;
  priority: number;
}

/**
 * Determina la siguiente pregunta para enriquecer el perfil.
 * Retorna null si el perfil está completo.
 */
export function getNextProfileQuestion(profile: Profile | null): ProfileQuestion | null {
  if (!profile) return null;

  const questions: ProfileQuestion[] = [
    {
      priority: 1,
      field: 'skills',
      question: '¿Cuál es tu herramienta o habilidad principal?',
    },
    {
      priority: 2,
      field: 'cv_years_experience',
      question: '¿Cuántos años llevas trabajando en lo tuyo?',
    },
    {
      priority: 3,
      field: 'cv_summary',
      question: '¿Tienes un CV digital? Te lo analizo gratis y afino tu perfil.',
    },
    {
      priority: 4,
      field: 'location',
      question: '¿Desde dónde trabajas? Así te conecto con oportunidades cercanas.',
    },
  ];

  // Filtrar preguntas cuyo campo YA tiene datos
  const pending = questions.filter(q => {
    const value = (profile as Record<string, unknown>)[q.field];
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'number') return value === 0;
    return !value;
  });

  // Retornar la de mayor prioridad
  return pending.sort((a, b) => a.priority - b.priority)[0] ?? null;
}

/**
 * Verifica si ya se preguntó hoy (no spamear).
 */
export function hasAskedToday(): boolean {
  const key = 'omicron_progressive_asked';
  const last = localStorage.getItem(key);
  const today = new Date().toISOString().slice(0, 10);
  return last === today;
}

/**
 * Marca que ya se preguntó hoy.
 */
export function markAskedToday(): void {
  const key = 'omicron_progressive_asked';
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(key, today);
}
