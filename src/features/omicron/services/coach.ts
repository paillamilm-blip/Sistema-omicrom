// src/features/omicron/services/coach.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICROM · Motor de mejora en tiempo real (FASE 3)
//
// Lee los datos REALES del usuario (skills del CV, 4 ejes del Gemelo, PE,
// reputación, credenciales) y produce una RUTA priorizada de pasos
// concretos y accionables, con sinergia entre nodos:
//   Gemelo/CV → Academia → Habilidades → Bóveda → Empleos/Mercado.
//
// Es 100% determinista (sin depender de la IA/backend), así que SIEMPRE
// entrega un próximo paso útil. La IA (coach) se usa aparte como bonus.
// ═══════════════════════════════════════════════════════════════════════
import { C } from '@/theme';
import type { TabId, Profile, GemeloDigital } from '@/types';

// Re-export desde shared para que consumidores existentes no rompan.
export { levelInfo, nodeGuidance } from '@/shared/utils/guidance';

export interface NextStep {
  id: string;
  title: string;        // Imperativo corto: qué hacer
  why: string;          // El porqué, con tus números reales
  tab: TabId;           // A dónde te lleva
  actionLabel: string;  // Texto del botón
  accent: string;       // Color de acento
  metric?: string;      // Ej. "Ejecución 42"
  cv?: boolean;         // Si abre la convalidación de CV/credenciales
}

const r = (n: number) => Math.round(n);

/**
 * Calcula la ruta de mejora priorizada según los datos reales del usuario.
 * Devuelve los pasos ordenados por impacto (el primero es el más importante).
 */
export function computeSteps(profile: Profile | null, gemelo: GemeloDigital | null): NextStep[] {
  const steps: (NextStep & { score: number })[] = [];
  const skills = profile?.skills ?? [];
  const topSkill = skills[0] || 'tu especialidad';

  // 1) Sin CV / sin skills → base de todo. Máxima prioridad.
  if (skills.length === 0) {
    steps.push({
      id: 'cv', score: 100, tab: 'perfil', accent: C.cyan, cv: true, metric: 'Fundamento',
      title: 'Convalida tu CV real',
      actionLabel: 'Subir mi CV',
      why: 'Ómicrom todavía no conoce tu experiencia. Sube tu CV (PDF o Word) y calculo tu nivel, tus habilidades y tus 4 ejes al instante.',
    });
  }

  // 2) Eje más débil del Gemelo → paso concreto en el nodo correcto.
  if (gemelo) {
    const axes: { key: string; val: number; tab: TabId; accent: string; label: string; title: string; actionLabel: string; why: string; cv?: boolean }[] = [
      {
        key: 'execution', val: gemelo.execution, tab: 'maxskill', accent: C.cyan, label: 'Ejecución',
        title: 'Valida tu próximo nodo de habilidad',
        actionLabel: 'Ir a Habilidades',
        why: `Tu Ejecución está en ${r(gemelo.execution)}. Supera un reto en Habilidades para demostrar tu velocidad — cada nodo que validas abre el siguiente.`,
      },
      {
        key: 'quality', val: gemelo.quality, tab: 'academia', accent: C.purple, label: 'Calidad',
        title: 'Rinde un examen en Academia',
        actionLabel: 'Ir a Academia',
        why: `Tu Calidad está en ${r(gemelo.quality)}. Aprueba un curso y su examen para validar un nodo con evidencia real y subir tu calidad técnica.`,
      },
      {
        key: 'transcendence', val: gemelo.transcendence, tab: 'vault', accent: C.gold, label: 'Trascendencia',
        title: 'Sube un aporte a la Bóveda',
        actionLabel: 'Ir a la Bóveda',
        why: `Tu Trascendencia está en ${r(gemelo.transcendence)}. Compartir conocimiento multiplica tu impacto en la red y te genera regalías.`,
      },
      {
        key: 'foundation', val: gemelo.foundation, tab: 'perfil', accent: C.green, label: 'Fundamento', cv: true,
        title: 'Refuerza tu Fundamento',
        actionLabel: 'Convalidar credenciales',
        why: `Tu Fundamento está en ${r(gemelo.foundation)}. Convalida tu título y tus años de experiencia para reforzar tu base teórica.`,
      },
    ];
    axes.forEach((a) => steps.push({
      id: a.key, score: 90 - a.val * 0.7, tab: a.tab, accent: a.accent, cv: a.cv,
      metric: `${a.label} ${r(a.val)}`, title: a.title, actionLabel: a.actionLabel, why: a.why,
    }));
  }

  // 3) Credenciales verificadas bajas (el 20% que pondera la confianza).
  if (profile && profile.traditional_score < 40 && skills.length > 0) {
    steps.push({
      id: 'trad', score: 58, tab: 'perfil', accent: C.green, cv: true, metric: `Credenciales ${r(profile.traditional_score)}`,
      title: 'Convalida tus credenciales',
      actionLabel: 'Convalidar',
      why: `Tus credenciales verificadas están en ${r(profile.traditional_score)}/100. Convalida CV, título y años para subir el 20% que pondera tu confianza.`,
    });
  }

  // 4) Sinergia: si ya tienes reputación suficiente, monetiza / postula.
  if (gemelo && gemelo.overallReputation >= 45 && skills.length > 0) {
    steps.push({
      id: 'jobs', score: 42, tab: 'empleos', accent: C.cyan, metric: `Reputación ${r(gemelo.overallReputation)}`,
      title: 'Postula a una oportunidad',
      actionLabel: 'Ver Empleos',
      why: `Con reputación ${r(gemelo.overallReputation)} ya eres candidato real. Apunta a vacantes que pidan ${topSkill} — deja que el trabajo te encuentre.`,
    });
    steps.push({
      id: 'market', score: 38, tab: 'market', accent: C.purple, metric: 'Capital intelectual',
      title: `Publica un servicio de ${topSkill}`,
      actionLabel: 'Ir al Mercado',
      why: `Monetiza tu experticia en ${topSkill}: publica un servicio en el Mercado y empieza a ganar tokens en la red.`,
    });
  }

  steps.sort((a, b) => b.score - a.score);

  // Garantía: SIEMPRE al menos un paso de mejora
  if (steps.length === 0) {
    steps.push({
      id: 'explore', score: 10, tab: 'maxskill', accent: C.cyan,
      title: 'Explora tu siguiente nodo',
      actionLabel: 'Ir a Habilidades',
      why: 'Tu Gemelo Digital siempre puede mejorar. Valida una habilidad para subir tu Ejecución y desbloquear oportunidades.',
    });
  }

  return steps.map(({ score: _score, ...s }) => s);
}

/** El paso de mayor impacto (o null si no hay datos). */
export function topStep(profile: Profile | null, gemelo: GemeloDigital | null): NextStep | null {
  return computeSteps(profile, gemelo)[0] ?? null;
}
