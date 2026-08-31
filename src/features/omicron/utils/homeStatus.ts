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
 * Prioridad de la línea:
 *   1) Si hay próximo paso: lo destacamos ("Tu próximo paso: {title}"),
 *      añadiendo la racha como contexto breve cuando streak > 0.
 *   2) Si no hay próximo paso pero sí racha: reflejamos la racha
 *      (singular/plural correcto: "1 día" vs "N días").
 *   3) Si no hay próximo paso ni racha pero sí reputación > 0: la
 *      mostramos a escala completa ("Reputación 65/100").
 *   4) Sin datos: una línea genérica calma (fallback no nulo).
 *
 * Devuelve siempre un objeto { label } (nunca null): el fallback es una
 * invitación tranquila para que el ribbon nunca quede vacío cuando se
 * decide mostrarlo.
 */
export function pickHomeStatus(input: HomeStatusInput): HomeStatus {
  const streak = Number.isFinite(input.streak) ? Math.max(0, Math.trunc(input.streak)) : 0;
  const rachaText =
    streak > 0 ? `racha de ${streak} ${streak === 1 ? 'día' : 'días'}` : '';

  // 1) Próximo paso presente → es lo más útil que puede leer la persona.
  if (input.nextStep && input.nextStep.title.trim()) {
    const title = input.nextStep.title.trim();
    return {
      label: rachaText
        ? `${rachaText.charAt(0).toUpperCase()}${rachaText.slice(1)} · Tu próximo paso: ${title}`
        : `Tu próximo paso: ${title}`,
    };
  }

  // 2) Sin paso pero con racha → reflejamos la constancia.
  if (rachaText) {
    return { label: `Llevas una ${rachaText}. Sigue así.` };
  }

  // 3) Sin paso ni racha pero con reputación → número a escala completa.
  const rep = input.reputation;
  if (typeof rep === 'number' && Number.isFinite(rep) && rep > 0) {
    return { label: `Reputación ${fullScale(rep)}/100` };
  }

  // 4) Fallback calmo, sin jerga, con la marca escrita "Ómicrom".
  return { label: 'Ómicrom sigue tu carrera. Da tu próximo paso cuando quieras.' };
}
