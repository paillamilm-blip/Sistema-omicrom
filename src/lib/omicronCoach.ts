// src/lib/omicronCoach.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · Motor de mejora en tiempo real (FASE 3)
//
// Lee los datos REALES del usuario (skills del CV, 4 ejes del Gemelo, PE,
// reputación, credenciales) y produce una RUTA priorizada de pasos
// concretos y accionables, con sinergia entre nodos:
//   Perfil/CV → Academia → Habilidades → Bóveda → Empleos/Mercado.
//
// Es 100% determinista (sin depender de la IA/backend), así que SIEMPRE
// entrega un próximo paso útil. La IA (coach) se usa aparte como bonus.
// ═══════════════════════════════════════════════════════════════════════
import { C } from '../theme';
import type { TabId, Profile, GemeloDigital } from '../types';

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

// Umbrales de nivel por PE (alineado con la Billetera: Operativo/Core/Arquitecto).
export function levelInfo(pe: number): { tier: string; next: string | null; toNext: number; pct: number } {
  if (pe >= 2000) return { tier: 'Nodo Arquitecto', next: null, toNext: 0, pct: 100 };
  if (pe >= 500) return { tier: 'Nodo Core', next: 'Nodo Arquitecto', toNext: 2000 - pe, pct: ((pe - 500) / 1500) * 100 };
  return { tier: 'Nodo Operativo', next: 'Nodo Core', toNext: 500 - pe, pct: (pe / 500) * 100 };
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
      title: 'Convalidá tu CV real',
      actionLabel: 'Subir mi CV',
      why: 'Ómicron todavía no conoce tu experiencia. Subí tu CV (PDF o Word) y calculo tu nivel, tus habilidades y tus 4 ejes al instante.',
    });
  }

  // 2) Eje más débil del Gemelo → paso concreto en el nodo correcto.
  if (gemelo) {
    const axes: { key: string; val: number; tab: TabId; accent: string; label: string; title: string; actionLabel: string; why: string; cv?: boolean }[] = [
      {
        key: 'execution', val: gemelo.execution, tab: 'maxskill', accent: C.cyan, label: 'Ejecución',
        title: 'Validá tu próximo nodo de habilidad',
        actionLabel: 'Ir a Habilidades',
        why: `Tu Ejecución está en ${r(gemelo.execution)}. Superá un reto en Habilidades para demostrar tu velocidad — cada nodo que validás abre el siguiente.`,
      },
      {
        key: 'quality', val: gemelo.quality, tab: 'academia', accent: C.purple, label: 'Calidad',
        title: 'Rendí un examen en Academia',
        actionLabel: 'Ir a Academia',
        why: `Tu Calidad está en ${r(gemelo.quality)}. Aprobá un curso y su examen para validar un nodo con evidencia real y subir tu calidad técnica.`,
      },
      {
        key: 'transcendence', val: gemelo.transcendence, tab: 'vault', accent: C.gold, label: 'Trascendencia',
        title: 'Subí un aporte a la Bóveda',
        actionLabel: 'Ir a la Bóveda',
        why: `Tu Trascendencia está en ${r(gemelo.transcendence)}. Compartir conocimiento multiplica tu impacto en la red y te genera regalías.`,
      },
      {
        key: 'foundation', val: gemelo.foundation, tab: 'perfil', accent: C.green, label: 'Fundamento', cv: true,
        title: 'Reforzá tu Fundamento',
        actionLabel: 'Convalidar credenciales',
        why: `Tu Fundamento está en ${r(gemelo.foundation)}. Convalidá tu título y tus años de experiencia para reforzar tu base teórica.`,
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
      title: 'Convalidá tus credenciales',
      actionLabel: 'Convalidar',
      why: `Tus credenciales verificadas están en ${r(profile.traditional_score)}/100. Convalidá CV, título y años para subir el 20% que pondera tu confianza.`,
    });
  }

  // 4) Sinergia: si ya tenés reputación suficiente, monetizá / postulá.
  if (gemelo && gemelo.overallReputation >= 45 && skills.length > 0) {
    steps.push({
      id: 'jobs', score: 42, tab: 'empleos', accent: C.cyan, metric: `Reputación ${r(gemelo.overallReputation)}`,
      title: 'Postulá a una oportunidad',
      actionLabel: 'Ver Empleos',
      why: `Con reputación ${r(gemelo.overallReputation)} ya sos candidato real. Apuntá a vacantes que pidan ${topSkill} — dejá que el trabajo te encuentre.`,
    });
    steps.push({
      id: 'market', score: 38, tab: 'market', accent: C.purple, metric: 'Capital intelectual',
      title: `Publicá un servicio de ${topSkill}`,
      actionLabel: 'Ir al Mercado',
      why: `Monetizá tu experticia en ${topSkill}: publicá un servicio en el Mercado y empezá a ganar tokens en la red.`,
    });
  }

  steps.sort((a, b) => b.score - a.score);
  return steps.map(({ score: _score, ...s }) => s);
}

/** El paso de mayor impacto (o null si no hay datos). */
export function topStep(profile: Profile | null, gemelo: GemeloDigital | null): NextStep | null {
  return computeSteps(profile, gemelo)[0] ?? null;
}

/**
 * Empuje contextual al ABRIR un nodo: cada nodo es una "puerta de mejora".
 * Devuelve una frase concreta con los números reales del usuario.
 */
export function nodeGuidance(tab: TabId, profile: Profile | null, gemelo: GemeloDigital | null): string {
  const pe = profile?.pe_points ?? 0;
  const skills = profile?.skills ?? [];
  const topSkill = skills[0] || 'tu especialidad';
  const rep = gemelo ? r(gemelo.overallReputation) : 0;

  switch (tab) {
    case 'academia':
      return `Cada curso valida un nodo real. Aprobá su examen para subir tu Calidad${gemelo ? ` (hoy ${r(gemelo.quality)})` : ''} con evidencia.`;
    case 'maxskill':
      return `Validá tu próximo nodo para subir tu Ejecución${gemelo ? ` (hoy ${r(gemelo.execution)})` : ''}. Cada nodo que superás abre el siguiente.`;
    case 'empleos':
      return rep >= 45
        ? `Con reputación ${rep} ya podés postular. Buscá vacantes que pidan ${topSkill}.`
        : 'Subí tu reputación validando nodos y pronto el trabajo te va a encontrar.';
    case 'market':
      return `Publicá un servicio con tu experticia en ${topSkill} y empezá a ganar tokens.`;
    case 'vault':
      return `Subí un aporte para subir tu Trascendencia${gemelo ? ` (hoy ${r(gemelo.transcendence)})` : ''} y ganar regalías.`;
    case 'wallet': {
      const li = levelInfo(pe);
      return li.next
        ? `Tenés ${pe} PE. Te faltan ${li.toNext} PE para llegar a ${li.next}.`
        : `Sos ${li.tier}: nivel máximo. Seguí ganando tokens con tu experticia.`;
    }
    case 'gobernanza':
      return 'Participá como árbitro o votá propuestas: la gobernanza refuerza tu reputación en la red.';
    case 'chat':
      return 'Coordiná tus contratos acá. Cada acuerdo queda protegido en la caja negra.';
    default:
      return '';
  }
}
