// src/features/omicron/utils/orbPulse.ts
// ═══════════════════════════════════════════════════════════════════════
// ORB PULSE — Helper PURO para el "latido" del orbe al ritmo de la respuesta.
//
// "El orbe late al ritmo de la respuesta": hoy el orbe ya pulsa con la voz
// (TTS), pero NO durante la fase de "pensando…" ni durante la revelación
// palabra por palabra. Este módulo calcula SOLO un NÚMERO (nivel 0..1) para
// esas dos fases. Nada más.
//
// Reglas del contrato (muy importante):
//  • Este helper NO importa React/framer/window/Supabase — es puro y
//    determinista, unit-testeable sin mocks (mismo patrón que typewriter.ts /
//    nodeUnlock.ts).
//  • El gating de prefers-reduced-motion y la emisión del evento viven en el
//    LLAMADOR (FEAT-002, ProactiveMessage). Aquí no hay efectos ni eventos.
//  • El número se alimenta al canal EXISTENTE voiceLevel / 'oracle:voice' que
//    OrbNeuronal ya consume, de modo que NO hace falta tocar el archivo 3D.
//
// Las bandas se exportan como constantes para que las pruebas afirmen los
// límites exactos y FEAT-002 reutilice los mismos números (sin duplicar
// magia). Se eligen bajas a propósito: el orbe respira (min de escala 0.16 en
// OrbNeuronal), no grita.
// ═══════════════════════════════════════════════════════════════════════

/** Piso del pulso calmo de "pensando…" (búsqueda serena). */
export const THINKING_MIN = 0.06;
/** Techo del pulso calmo de "pensando…". */
export const THINKING_MAX = 0.16;
/** Periodo (ms) del seno de búsqueda: lento, tipo latido sereno. */
export const THINKING_PERIOD_MS = 1800;

/** Pico del tick por palabra en la revelación (nunca un grito). */
export const REVEAL_PEAK = 0.22;
/** Piso calmo al que decae el tick conforme avanza la revelación. */
export const REVEAL_FLOOR = 0.06;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Pulso calmo de "búsqueda" para la fase "Ómicrom está pensando…".
 * Seno determinista del tiempo transcurrido, mapeado a la banda
 * [THINKING_MIN, THINKING_MAX]. Sin azar. Siempre en [0,1].
 *
 * Al ser un seno, VARÍA con el tiempo (dos instantes distintos dan valores
 * distintos), lo que da la sensación de latido vivo y no de constante.
 */
export function thinkingPulseLevel(elapsedMs: number): number {
  const t = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  const mid = (THINKING_MIN + THINKING_MAX) / 2;
  const amp = (THINKING_MAX - THINKING_MIN) / 2;
  // sin oscila en [-1,1]; lo llevamos a [MIN,MAX]. Empieza en el medio y sube.
  const level = mid + amp * Math.sin((2 * Math.PI * t) / THINKING_PERIOD_MS);
  return clamp01(level);
}

/**
 * Tick por palabra para la revelación (typewriter). Cada palabra revelada
 * produce un pequeño golpe que DECAE: el orbe se siente "vivo con sus
 * palabras" sin estroboscopio. La amplitud del pico se atenúa conforme la
 * revelación se acerca al final (wordIndex → totalWords), regresando hacia
 * REVEAL_FLOOR.
 *
 * Determinista: función de los contadores (NO de Date.now). Se invoca una vez
 * por palabra, y ese instante representa el golpe justo tras aparecer la
 * palabra, cerca de REVEAL_PEAK al inicio y bajando hacia REVEAL_FLOOR.
 *
 * Casos borde: totalWords<=0 o wordIndex>=totalWords → sin NaN/Infinity,
 * devuelve el piso (revelación terminada / vacía = orbe calmo).
 */
export function revealPulseLevel(wordIndex: number, totalWords: number): number {
  const total = Number.isFinite(totalWords) ? Math.floor(totalWords) : 0;
  const idx = Number.isFinite(wordIndex) ? Math.floor(wordIndex) : 0;

  // Revelación vacía o ya completada: orbe en calma (piso).
  if (total <= 0 || idx < 0 || idx >= total) {
    return clamp01(REVEAL_FLOOR);
  }

  // Progreso 0..1 (0 en la primera palabra, →1 al acercarse al final).
  const progress = total > 1 ? idx / (total - 1) : 0;
  // La altura del golpe decae linealmente desde el pico completo hacia 0
  // conforme avanza la revelación, siempre sobre el piso calmo.
  const decay = 1 - progress; // 1 al inicio, 0 al final
  const level = REVEAL_FLOOR + (REVEAL_PEAK - REVEAL_FLOOR) * decay;
  return clamp01(level);
}
