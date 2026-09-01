// src/features/omicron/utils/homeStatus.ts
// ═══════════════════════════════════════════════════════════════════════
// Helper PURO para el ribbon "estado del día" / próximo paso del Home.
//
// Compone UNA sola línea calma y sin jerga (español neutro latinoamericano,
// SIN voseo) que le dice a la persona su próximo movimiento: el toque de
// "cockpit de tu carrera".
//
// Este módulo NO importa React, framer-motion, Supabase ni nada que toque
// window / matchMedia, así puede probarse con Vitest sin mocks pesados (un
// test previo se rompió al importar transitivamente un componente que usaba
// window.matchMedia vía useReducedMotion). Solo importa el TIPO NextStep.
// ═══════════════════════════════════════════════════════════════════════

import type { NextStep } from '../services/coach';

// ── Entrada laxa: solo los datos que ya existen en el cliente ────────
export interface HomeStatusInput {
  /** Racha de días consecutivos con actividad (0 si no hay historial). */
  streak: number;
  /** El próximo paso de mayor impacto (o null si aún no hay datos). */
  nextStep: NextStep | null;
  /** Reputación 0..100 del perfil (opcional). */
  reputation?: number | null;
  /**
   * Nombre HUMANO del eje que subió desde la última visita (ej. "Ejecución"),
   * o null/undefined si nada subió. La DETECCIÓN del alza vive fuera de este
   * módulo puro (el caller compara contra el último valor cacheado); aquí solo
   * COMPONEMOS la línea. Cuando está presente, la voz del núcleo abre con
   * "Hoy tu {eje} subió" antes del próximo paso.
   */
  axisRose?: string | null;
}

export interface HomeStatus {
  /** La línea única a mostrar en el ribbon. */
  label: string;
}

/** Redondea a entero seguro para números a escala completa (ej. "65/100"). */
function fullScale(n: number): number {
  return Math.max(0, Math.round(n));
}

/**
 * Compone el "estado del día" a partir de datos ya presentes en el cliente.
 * Determinista y sin efectos secundarios.
 *
 * Es UNA sola voz calma del núcleo (consolidación "Matar el Escritorio"):
 * cuando hay próximo paso, la línea termina con una invitación breve
 * ("¿Seguimos o quieres hacer otra cosa?") para que el Home hable con una única
 * voz que ORIENTA e INVITA, en vez de repartir el mensaje en varias
 * tarjetas/etiquetas que compiten.
 *
 * Prioridad de la línea:
 *   1) Si un eje subió desde la última visita Y hay próximo paso:
 *      "Hoy tu {eje} subió · Tu próximo paso: {title}. ¿Seguimos o quieres
 *      hacer otra cosa?" — qué se movió + qué sigue + invitación, en UNA línea.
 *   2) Si hay próximo paso (sin alza detectada): lo destacamos
 *      ("Tu próximo paso: {title}. ¿Seguimos o quieres hacer otra cosa?"),
 *      anteponiendo la racha como contexto breve cuando streak > 0.
 *   3) Si no hay próximo paso pero sí racha: reflejamos la racha
 *      (singular/plural correcto: "1 día" vs "N días").
 *   4) Si no hay próximo paso ni racha pero sí reputación > 0: la
 *      mostramos a escala completa ("Reputación 65/100").
 *   5) Sin datos: una línea genérica calma (fallback no nulo).
 *
 * Devuelve siempre un objeto { label } (nunca null): el fallback es una
 * invitación tranquila para que el ribbon nunca quede vacío cuando se
 * decide mostrarlo.
 */
// Invitación breve en español LatAm, cero jerga (texto exacto del plan del
// incremento). Cierra la voz del núcleo cuando hay un próximo paso que ofrecer.
const INVITATION = '¿Seguimos o quieres hacer otra cosa?';

export function pickHomeStatus(input: HomeStatusInput): HomeStatus {
  const streak = Number.isFinite(input.streak) ? Math.max(0, Math.trunc(input.streak)) : 0;
  const rachaText =
    streak > 0 ? `racha de ${streak} ${streak === 1 ? 'día' : 'días'}` : '';
  const axisRose = typeof input.axisRose === 'string' ? input.axisRose.trim() : '';

  // 1) Alza de un eje + próximo paso → la voz del núcleo abre con lo que se
  //    movió, ofrece el siguiente paso e invita, todo en UNA línea.
  if (axisRose && input.nextStep && input.nextStep.title.trim()) {
    const title = input.nextStep.title.trim();
    return { label: `Hoy tu ${axisRose} subió · Tu próximo paso: ${title}. ${INVITATION}` };
  }

  // 2) Próximo paso presente → es lo más útil que puede leer la persona;
  //    cierra con la invitación (misma voz del núcleo).
  if (input.nextStep && input.nextStep.title.trim()) {
    const title = input.nextStep.title.trim();
    return {
      label: rachaText
        ? `${rachaText.charAt(0).toUpperCase()}${rachaText.slice(1)} · Tu próximo paso: ${title}. ${INVITATION}`
        : `Tu próximo paso: ${title}. ${INVITATION}`,
    };
  }

  // 3) Sin paso pero con racha → reflejamos la constancia.
  if (rachaText) {
    return { label: `Llevas una ${rachaText}. Sigue así.` };
  }

  // 4) Sin paso ni racha pero con reputación → número a escala completa.
  const rep = input.reputation;
  if (typeof rep === 'number' && Number.isFinite(rep) && rep > 0) {
    return { label: `Reputación ${fullScale(rep)}/100` };
  }

  // 5) Fallback calmo, sin jerga, con la marca escrita "Ómicrom".
  return { label: 'Ómicrom sigue tu carrera. Da tu próximo paso cuando quieras.' };
}
