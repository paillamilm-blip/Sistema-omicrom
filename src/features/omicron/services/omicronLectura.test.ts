import { describe, expect, it } from 'vitest';
import { buildRedViva, type NodoRed } from '@/features/redviva/services/redViva';
import { resumenRed, textoEstado } from '@/features/redviva/services/redViva';
import { tabParaNodo, textoLecturaOmicron } from './omicronLectura';

describe('textoLecturaOmicron — Ómicrom lee la red con textos reales', () => {
  it('sin nodo enfocado, lee el resumen global de la red (resumenRed)', () => {
    const model = buildRedViva({
      skillsDetail: [{ name: 'Excel', pct: 80 }],
      jobs: [],
    });
    // Debe COINCIDIR con resumenRed, no un string inventado.
    expect(textoLecturaOmicron(model, null)).toBe(resumenRed(model));
  });

  it('con un nodo enfocado, lee la línea concreta de ese nodo (textoEstado)', () => {
    const model = buildRedViva({
      skillsDetail: [{ name: 'Excel', pct: 80 }],
      jobs: [],
    });
    const nodo = model.nodos[0];
    expect(textoLecturaOmicron(model, nodo)).toBe(textoEstado(nodo));
  });

  it('en una red vacía, el resumen invita a subir el CV (sin inventar números)', () => {
    const model = buildRedViva({ skillsDetail: [], skills: [], jobs: [] });
    expect(textoLecturaOmicron(model, null)).toBe(resumenRed(model));
    expect(textoLecturaOmicron(model, null)).toMatch(/CV/i);
  });
});

describe('tabParaNodo — cablea un nodo de la Red Viva a su tab de acción', () => {
  const base: NodoRed = {
    id: 'x', label: 'X', estado: 'hueco', declaredPct: 50, provenScore: null,
    tokensEarned: 0, demand: 0, unlocks: 0, x: 0, y: 0, angulo: 0, r: 0.5, anillo: 1,
  };

  it('una habilidad ausente lleva a Empleos (donde el puente apunta)', () => {
    expect(tabParaNodo({ ...base, estado: 'ausente', anillo: 2 })).toBe('empleos');
  });

  it('una habilidad tuya (probada/declarada/en prueba) lleva a Habilidades', () => {
    expect(tabParaNodo({ ...base, estado: 'solido' })).toBe('maxskill');
    expect(tabParaNodo({ ...base, estado: 'hueco' })).toBe('maxskill');
    expect(tabParaNodo({ ...base, estado: 'latiendo' })).toBe('maxskill');
  });
});
