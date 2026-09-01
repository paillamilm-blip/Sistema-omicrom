// src/features/omicron/utils/archetype.test.ts
// Pruebas del helper PURO que deriva el arquetipo del perfil a partir de los
// 4 ejes reales. Ejercitan la lógica real (dominante, desempate por orden de
// prioridad fijo y fallback neutro) y fallarían si esa lógica se revirtiera.
// No renderizan el componente ni tocan window / DOM.

import { describe, it, expect } from 'vitest';
import { deriveArchetype, type ArchetypeAxes } from './archetype';

// Base neutra (todos iguales) que luego alteramos por eje para forzar cada
// rama dominante.
function baseAxes(): ArchetypeAxes {
  return { exec: 50, qual: 50, trans: 50, fund: 50 };
}

describe('deriveArchetype — eje dominante', () => {
  it('exec dominante -> "Perfil de Ejecución"', () => {
    const r = deriveArchetype({ ...baseAxes(), exec: 90 });
    expect(r.name).toBe('Perfil de Ejecución');
    expect(r.line).toBe('Conviertes las ideas en resultados concretos, sin quedarte en la teoría.');
  });

  it('qual dominante -> "Perfil Artesano"', () => {
    const r = deriveArchetype({ ...baseAxes(), qual: 88 });
    expect(r.name).toBe('Perfil Artesano');
    expect(r.line).toBe('Cuidas cada detalle y elevas el estándar de todo lo que entregas.');
  });

  it('trans dominante -> "Perfil Referente"', () => {
    const r = deriveArchetype({ ...baseAxes(), trans: 82 });
    expect(r.name).toBe('Perfil Referente');
    expect(r.line).toBe('Tu impacto se multiplica cuando guías y potencias a quienes te rodean.');
  });

  it('fund dominante -> "Perfil de Base Sólida"', () => {
    const r = deriveArchetype({ ...baseAxes(), fund: 77 });
    expect(r.name).toBe('Perfil de Base Sólida');
    expect(r.line).toBe('Construyes sobre cimientos firmes: método, formación y criterio.');
  });
});

describe('deriveArchetype — desempate por orden de prioridad (exec > trans > qual > fund)', () => {
  it('empate exec/trans en el máximo -> gana exec', () => {
    const r = deriveArchetype({ exec: 80, qual: 50, trans: 80, fund: 50 });
    expect(r.name).toBe('Perfil de Ejecución');
  });

  it('empate trans/qual en el máximo (sin exec) -> gana trans', () => {
    const r = deriveArchetype({ exec: 50, qual: 80, trans: 80, fund: 50 });
    expect(r.name).toBe('Perfil Referente');
  });

  it('empate qual/fund en el máximo (sin exec ni trans) -> gana qual', () => {
    const r = deriveArchetype({ exec: 50, qual: 80, trans: 50, fund: 80 });
    expect(r.name).toBe('Perfil Artesano');
  });
});

describe('deriveArchetype — fallback neutro', () => {
  it('todos los ejes iguales -> "Perfil en Formación"', () => {
    const r = deriveArchetype({ exec: 60, qual: 60, trans: 60, fund: 60 });
    expect(r.name).toBe('Perfil en Formación');
    expect(r.line).toBe('Tu Gemelo está tomando forma: cada dato nuevo afina quién eres.');
  });

  it('todos los ejes bajos (dominante < 40) -> "Perfil en Formación"', () => {
    const r = deriveArchetype({ exec: 30, qual: 25, trans: 20, fund: 15 });
    expect(r.name).toBe('Perfil en Formación');
  });

  it('dominante justo en el umbral (40) NO cae en fallback', () => {
    const r = deriveArchetype({ exec: 40, qual: 20, trans: 20, fund: 20 });
    expect(r.name).toBe('Perfil de Ejecución');
  });
});

describe('deriveArchetype — determinismo', () => {
  it('mismo input -> mismo output', () => {
    const axes: ArchetypeAxes = { exec: 72, qual: 44, trans: 61, fund: 55 };
    expect(deriveArchetype(axes)).toEqual(deriveArchetype(axes));
  });
});
