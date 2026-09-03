import { describe, it, expect } from 'vitest';
import { opportunityBridge } from './opportunityBridge';

describe('opportunityBridge — honestidad primero (cero datos falsos)', () => {
  it('sin ofertas en la red lo DICE, y no culpa al usuario ni promete nada', () => {
    const b = opportunityBridge({ openJobs: 0, matchedJobs: 0, skillCount: 12 });
    expect(b.tone).toBe('empty');
    expect(b.label).toContain('Todavía no hay ofertas abiertas');
  });

  it('sin ofertas NO recomienda estudiar (ningún curso lo cambia hoy)', () => {
    const b = opportunityBridge({ openJobs: 0, matchedJobs: 0, skillCount: 0 });
    expect(b.label).not.toContain('Academia');
  });

  it('nunca reporta más matches que ofertas abiertas (dato imposible)', () => {
    const b = opportunityBridge({ openJobs: 3, matchedJobs: 99, skillCount: 5 });
    expect(b.label).toContain('3 de las 3');
  });
});

describe('opportunityBridge — el puente: aprender mueve el número', () => {
  it('con ofertas pero sin match, nombra la Academia como el paso concreto', () => {
    const b = opportunityBridge({ openJobs: 8, matchedJobs: 0, skillCount: 4 });
    expect(b.tone).toBe('invite');
    expect(b.label).toContain('8 ofertas abiertas');
    expect(b.label).toContain('4 habilidades');
    expect(b.label).toContain('Academia');
  });

  it('sin habilidades registradas, el paso es el CV (no la Academia)', () => {
    const b = opportunityBridge({ openJobs: 5, matchedJobs: 0, skillCount: 0 });
    expect(b.tone).toBe('invite');
    expect(b.label).toContain('Sube tu CV');
  });

  it('con match, celebra con el número exacto', () => {
    const b = opportunityBridge({ openJobs: 10, matchedJobs: 3, skillCount: 7 });
    expect(b.tone).toBe('win');
    expect(b.label).toContain('3 de las 10 ofertas abiertas');
  });
});

describe('opportunityBridge — números siempre con unidad y en singular/plural correcto', () => {
  it('una sola oferta no dice "1 ofertas"', () => {
    const b = opportunityBridge({ openJobs: 1, matchedJobs: 0, skillCount: 0 });
    expect(b.label).toContain('1 oferta abierta');
    expect(b.label).not.toContain('1 ofertas');
  });

  it('una sola habilidad no dice "1 habilidades"', () => {
    const b = opportunityBridge({ openJobs: 4, matchedJobs: 0, skillCount: 1 });
    expect(b.label).toContain('1 habilidad');
    expect(b.label).not.toContain('1 habilidades');
  });

  it('toda salida incluye al menos un número (nunca vaguedades)', () => {
    const casos = [
      { openJobs: 0, matchedJobs: 0, skillCount: 0 },
      { openJobs: 5, matchedJobs: 0, skillCount: 0 },
      { openJobs: 5, matchedJobs: 0, skillCount: 3 },
      { openJobs: 5, matchedJobs: 2, skillCount: 3 },
    ];
    for (const c of casos) {
      const b = opportunityBridge(c);
      expect(b.label.length).toBeGreaterThan(20);
      if (c.openJobs > 0) expect(b.label).toMatch(/\d/);
    }
  });
});

describe('opportunityBridge — defensa ante datos sucios', () => {
  it('NaN / negativos / infinito se normalizan a 0 sin romper', () => {
    expect(opportunityBridge({ openJobs: Number.NaN, matchedJobs: 0, skillCount: 0 }).tone).toBe('empty');
    expect(opportunityBridge({ openJobs: -7, matchedJobs: -2, skillCount: -1 }).tone).toBe('empty');
    expect(
      opportunityBridge({ openJobs: Number.POSITIVE_INFINITY, matchedJobs: 0, skillCount: 0 }).tone,
    ).toBe('empty');
  });

  it('conteos decimales se truncan (no muestra "2.7 ofertas")', () => {
    const b = opportunityBridge({ openJobs: 5.9, matchedJobs: 2.7, skillCount: 3.2 });
    expect(b.label).toContain('2 de las 5');
    // Sin decimales: se prohíbe el patrón dígito.dígito, NO el punto final de
    // la frase (que es puntuación legítima).
    expect(b.label).not.toMatch(/\d\.\d/);
  });
});
