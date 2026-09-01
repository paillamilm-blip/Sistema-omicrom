// src/features/omicron/utils/archetype.ts
// ═══════════════════════════════════════════════════════════════════════
// Helper PURO que deriva un ARQUETIPO con nombre + una línea de descripción
// a partir de los 4 ejes reales del Gemelo Digital (exec, qual, trans, fund).
//
// Este módulo NO importa React, framer-motion, Supabase ni nada que toque
// window / DOM, de modo que puede probarse con Vitest sin mocks. Es
// DETERMINISTA y TOTAL: mismo input → mismo output, nunca lanza, siempre
// devuelve un arquetipo. No hay aleatoriedad ni IA: es un reflejo directo
// de los ejes analizados del CV.
//
// Copy: español latinoamericano neutro (sin voseo), cero jerga, marca
// "Ómicrom" (con M) solo si se referenciara. Frases evocativas pero claras.
// ═══════════════════════════════════════════════════════════════════════

// Solo importamos el TIPO de la forma de los ejes (import de tipo puro).
import type { AnalyzedProfile } from '@/features/gemelo/services/cvAnalyzer';

/** Forma mínima de los 4 ejes (0-100 cada uno). */
export type ArchetypeAxes = AnalyzedProfile['axes'];

/** Resultado del arquetipo: nombre corto + una línea descriptiva. */
export interface Archetype {
  /** Nombre evocativo y breve del perfil. */
  name: string;
  /** Una línea de descripción, sin jerga. */
  line: string;
}

// ── Orden de PRIORIDAD fijo para desempates ─────────────────────────────
// Cuando dos o más ejes empatan como dominante, se resuelve SIEMPRE en este
// orden (el primero de la lista gana). Es un orden estable y documentado:
//   exec > trans > qual > fund
// (Ejecución primero por ser el eje más orientado a resultados; luego
// Trascendencia por su peso de liderazgo; luego Calidad; y Fundamento al
// final por ser el más estructural.) Este mismo orden se usa para el barrido
// determinista de los ejes, garantizando que reduce() elija el primero en
// caso de empate.
const AXIS_PRIORITY: (keyof ArchetypeAxes)[] = ['exec', 'trans', 'qual', 'fund'];

// ── Tabla FIJA de arquetipos por eje dominante ──────────────────────────
// Cada eje dominante mapea a un arquetipo evocativo, cero jerga, neutro.
const ARCHETYPE_BY_AXIS: Record<keyof ArchetypeAxes, Archetype> = {
  exec: {
    name: 'Perfil de Ejecución',
    line: 'Conviertes las ideas en resultados concretos, sin quedarte en la teoría.',
  },
  qual: {
    name: 'Perfil Artesano',
    line: 'Cuidas cada detalle y elevas el estándar de todo lo que entregas.',
  },
  trans: {
    name: 'Perfil Referente',
    line: 'Tu impacto se multiplica cuando guías y potencias a quienes te rodean.',
  },
  fund: {
    name: 'Perfil de Base Sólida',
    line: 'Construyes sobre cimientos firmes: método, formación y criterio.',
  },
};

// ── Arquetipo NEUTRO de reserva (fallback) ───────────────────────────────
// Se usa cuando no hay una señal clara: todos los ejes iguales, o todos bajos
// (dominante < 40), donde ningún eje destaca lo suficiente para etiquetar el
// perfil. Es un mensaje calmado y sin juicio.
const NEUTRAL_ARCHETYPE: Archetype = {
  name: 'Perfil en Formación',
  line: 'Tu Gemelo está tomando forma: cada dato nuevo afina quién eres.',
};

// Umbral por debajo del cual, aunque exista un dominante, lo tratamos como
// "sin señal clara" y devolvemos el arquetipo neutro.
const LOW_SIGNAL_THRESHOLD = 40;

/**
 * Deriva el arquetipo del perfil a partir de los 4 ejes reales.
 *
 * Reglas:
 *  1. Se elige el eje DOMINANTE (mayor valor). Los empates se resuelven por
 *     el orden fijo AXIS_PRIORITY (exec > trans > qual > fund).
 *  2. Si el eje dominante queda por debajo de LOW_SIGNAL_THRESHOLD (todos los
 *     ejes bajos) o los cuatro ejes son iguales, se devuelve el arquetipo
 *     NEUTRO de reserva.
 *  3. En caso normal, se devuelve el arquetipo de la tabla fija.
 *
 * Es puro, determinista y total: mismo input → mismo output, nunca lanza.
 */
export function deriveArchetype(axes: ArchetypeAxes): Archetype {
  const values = AXIS_PRIORITY.map(k => axes[k]);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);

  // Todos los ejes iguales → sin señal diferenciadora → neutro.
  if (maxVal === minVal) return NEUTRAL_ARCHETYPE;

  // Señal demasiado baja incluso en el dominante → neutro.
  if (maxVal < LOW_SIGNAL_THRESHOLD) return NEUTRAL_ARCHETYPE;

  // Barrido determinista: el primer eje (en orden de prioridad) que alcanza
  // el máximo es el dominante. Así los empates se resuelven por AXIS_PRIORITY.
  const dominant = AXIS_PRIORITY.find(k => axes[k] === maxVal) ?? 'exec';
  return ARCHETYPE_BY_AXIS[dominant];
}
