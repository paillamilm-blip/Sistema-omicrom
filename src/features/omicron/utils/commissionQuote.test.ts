// src/features/omicron/utils/commissionQuote.test.ts
// Pruebas del helper PURO de la Comisión Ómicrom (Etapa 1, solo display).
// Ejercitan la SALIDA REAL del helper: las bandas por reputación (0/49/50/79/
// 80/100 -> bps 100/100/80/80/50/50), el redondeo FLOOR (incluido el caso que
// redondea a 0) y casos normales con neto exacto. Fallarían si la tabla de bps
// o la regla de floor fueran revertidas. No tocan window / Supabase ni React.

import { describe, it, expect } from 'vitest';
import { commissionQuote, COMMISSION_BPS } from './commissionQuote';

describe('commissionQuote — bps por reputación del vendedor (bordes 0/49/50/79/80/100)', () => {
  it('0 y 49 (Estudiante) -> 100 bps · 1 %', () => {
    for (const rep of [0, 49]) {
      const q = commissionQuote(1000, rep);
      expect(q.bps).toBe(100);
      expect(q.ratePct).toBe(1);
      expect(q.band).toBe('Estudiante');
    }
  });

  it('50 y 79 (Técnico) -> 80 bps · 0.8 %', () => {
    for (const rep of [50, 79]) {
      const q = commissionQuote(1000, rep);
      expect(q.bps).toBe(80);
      expect(q.ratePct).toBe(0.8);
      expect(q.band).toBe('Técnico');
    }
  });

  it('80 y 100 (Arquitecto) -> 50 bps · 0.5 %', () => {
    for (const rep of [80, 100]) {
      const q = commissionQuote(1000, rep);
      expect(q.bps).toBe(50);
      expect(q.ratePct).toBe(0.5);
      expect(q.band).toBe('Arquitecto');
    }
  });

  it('la tabla COMMISSION_BPS es exactamente 100 / 80 / 50', () => {
    expect(COMMISSION_BPS.Estudiante).toBe(100);
    expect(COMMISSION_BPS.Técnico).toBe(80);
    expect(COMMISSION_BPS.Arquitecto).toBe(50);
  });
});

describe('commissionQuote — redondeo FLOOR (a favor del vendedor)', () => {
  it('Arquitecto (rep 90) sobre 100 tokens redondea a comisión 0, neto 100', () => {
    const q = commissionQuote(100, 90);
    expect(q.commission).toBe(0); // floor(100 * 50 / 10000) = floor(0.5) = 0
    expect(q.net).toBe(100);
  });

  it('Estudiante (rep 10) sobre 1000 tokens -> comisión 10, neto 990', () => {
    const q = commissionQuote(1000, 10);
    expect(q.commission).toBe(10); // floor(1000 * 100 / 10000) = 10
    expect(q.net).toBe(990);
  });

  it('Técnico (rep 60) sobre 1000 tokens -> comisión 8, neto 992', () => {
    const q = commissionQuote(1000, 60);
    expect(q.commission).toBe(8); // floor(1000 * 80 / 10000) = 8
    expect(q.net).toBe(992);
  });
});

describe('commissionQuote — guardas de monto no válido', () => {
  it('monto no finito -> comisión 0, neto 0', () => {
    expect(commissionQuote(Number.NaN, 10)).toMatchObject({ commission: 0, net: 0 });
    expect(commissionQuote(Number.POSITIVE_INFINITY, 10)).toMatchObject({ commission: 0, net: 0 });
  });

  it('monto negativo -> comisión 0, neto 0', () => {
    expect(commissionQuote(-500, 10)).toMatchObject({ commission: 0, net: 0 });
  });

  it('conserva tokens: commission + net = monto para montos enteros', () => {
    for (const [amount, rep] of [[1000, 10], [1000, 60], [500, 90], [12345, 55]] as const) {
      const q = commissionQuote(amount, rep);
      expect(q.commission + q.net).toBe(amount);
    }
  });
});


describe('commissionQuote — piso GANADO (0.5 % permanente)', () => {
  it('quien ganó el piso y es Estudiante paga 0.5 %, no 1 %', () => {
    const q = commissionQuote(1000, 10, { floorEarned: true });
    expect(q.bps).toBe(50);
    expect(q.ratePct).toBe(0.5);
    expect(q.commission).toBe(5);
    expect(q.net).toBe(995);
    expect(q.floorEarned).toBe(true);
  });

  it('quien ganó el piso y es Técnico paga 0.5 %, no 0.8 %', () => {
    expect(commissionQuote(1000, 60, { floorEarned: true })).toMatchObject({ bps: 50, ratePct: 0.5 });
  });

  it('conserva la BANDA real del usuario (el nivel no se falsea)', () => {
    expect(commissionQuote(1000, 10, { floorEarned: true }).band).toBe('Estudiante');
    expect(commissionQuote(1000, 60, { floorEarned: true }).band).toBe('Técnico');
  });

  it('a un Arquitecto que ganó el piso no lo empeora: sigue en 0.5 %', () => {
    expect(commissionQuote(1000, 90, { floorEarned: true })).toMatchObject({ bps: 50, commission: 5, net: 995 });
  });

  it('omitir opts mantiene EXACTAMENTE la tasa por banda (retrocompatible)', () => {
    expect(commissionQuote(1000, 10)).toMatchObject({ bps: 100, floorEarned: false });
    expect(commissionQuote(1000, 60)).toMatchObject({ bps: 80, floorEarned: false });
    expect(commissionQuote(1000, 90)).toMatchObject({ bps: 50, floorEarned: false });
  });

  it('floorEarned:false explícito se comporta como omitirlo', () => {
    expect(commissionQuote(1000, 10, { floorEarned: false }).bps).toBe(100);
  });

  it('sigue conservando tokens: commission + net = monto', () => {
    for (const [amount, rep] of [[1000, 10], [12345, 55], [777, 90]] as const) {
      const q = commissionQuote(amount, rep, { floorEarned: true });
      expect(q.commission + q.net).toBe(amount);
    }
  });
});
