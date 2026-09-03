// src/features/omicron/utils/orbPulse.test.ts
// Pruebas del helper PURO del "latido" del orbe ("El orbe late al ritmo de la
// respuesta"). Ejercitan el COMPORTAMIENTO real de la envolvente: fallarían si
// las funciones fueran revertidas a una constante o si las bandas se
// ensancharan. No renderizan componentes ni tocan window.matchMedia / framer /
// Supabase — el módulo es puro por diseño.

import { describe, it, expect } from 'vitest';
import {
  thinkingPulseLevel,
  revealPulseLevel,
  THINKING_MIN,
  THINKING_MAX,
  THINKING_PERIOD_MS,
  REVEAL_PEAK,
  REVEAL_FLOOR,
} from './orbPulse';

describe('thinkingPulseLevel — pulso calmo de búsqueda', () => {
  it('se mantiene dentro de [THINKING_MIN, THINKING_MAX] en un barrido de tiempo', () => {
    for (let ms = 0; ms <= 6000; ms += 37) {
      const level = thinkingPulseLevel(ms);
      expect(level).toBeGreaterThanOrEqual(THINKING_MIN - 1e-9);
      expect(level).toBeLessThanOrEqual(THINKING_MAX + 1e-9);
    }
  });

  it('nunca es negativo ni mayor que 1 (incluye entradas no finitas)', () => {
    for (const ms of [0, 100, 900, 1800, 5000, -500, Number.NaN, Number.POSITIVE_INFINITY]) {
      const level = thinkingPulseLevel(ms);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
      expect(Number.isFinite(level)).toBe(true);
    }
  });

  it('VARÍA con el tiempo: dos fases distintas dan valores distintos (no es constante)', () => {
    // Cuarto de periodo (pico) vs tres cuartos (valle) deben diferir claramente.
    const peak = thinkingPulseLevel(THINKING_PERIOD_MS / 4);
    const valley = thinkingPulseLevel((3 * THINKING_PERIOD_MS) / 4);
    expect(Math.abs(peak - valley)).toBeGreaterThan(0.05);
    expect(peak).toBeCloseTo(THINKING_MAX, 5);
    expect(valley).toBeCloseTo(THINKING_MIN, 5);
  });

  it('en t=0 arranca en el medio de la banda (transición suave desde el reposo)', () => {
    const mid = (THINKING_MIN + THINKING_MAX) / 2;
    expect(thinkingPulseLevel(0)).toBeCloseTo(mid, 5);
  });
});

describe('revealPulseLevel — tick por palabra que decae', () => {
  it('pica cerca de REVEAL_PEAK en la primera palabra y decae hacia REVEAL_FLOOR al final', () => {
    const total = 10;
    const first = revealPulseLevel(0, total);
    const last = revealPulseLevel(total - 1, total);
    expect(first).toBeCloseTo(REVEAL_PEAK, 5);
    expect(last).toBeCloseTo(REVEAL_FLOOR, 5);
    // Es monótonamente decreciente conforme avanza la revelación.
    let prev = Number.POSITIVE_INFINITY;
    for (let i = 0; i < total; i += 1) {
      const level = revealPulseLevel(i, total);
      expect(level).toBeLessThanOrEqual(prev + 1e-9);
      prev = level;
    }
  });

  it('siempre queda en [REVEAL_FLOOR, REVEAL_PEAK] ⊂ [0,1] durante la revelación', () => {
    const total = 25;
    for (let i = 0; i < total; i += 1) {
      const level = revealPulseLevel(i, total);
      expect(level).toBeGreaterThanOrEqual(REVEAL_FLOOR - 1e-9);
      expect(level).toBeLessThanOrEqual(REVEAL_PEAK + 1e-9);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    }
  });

  it('una sola palabra pica al máximo (no divide por cero)', () => {
    expect(revealPulseLevel(0, 1)).toBeCloseTo(REVEAL_PEAK, 5);
  });

  it('casos borde: totalWords=0, índices fuera de rango → piso calmo, sin NaN/Infinity', () => {
    for (const [idx, total] of [
      [0, 0],
      [5, 0],
      [10, 10],
      [11, 10],
      [-1, 10],
      [Number.NaN, 10],
      [0, Number.NaN],
      [0, Number.POSITIVE_INFINITY],
    ] as const) {
      const level = revealPulseLevel(idx, total);
      expect(Number.isFinite(level)).toBe(true);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    }
    expect(revealPulseLevel(0, 0)).toBeCloseTo(REVEAL_FLOOR, 5);
    expect(revealPulseLevel(10, 10)).toBeCloseTo(REVEAL_FLOOR, 5);
  });
});
