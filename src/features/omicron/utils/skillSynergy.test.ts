// src/features/omicron/utils/skillSynergy.test.ts
// Pruebas del helper PURO de sinergias entre habilidades ("Sinergia Visible"
// Inc 1). Ejercitan la detección real (2+ coincidencias por grupo, límite de
// palabra), el guard de "Google Analytics" (una sola habilidad no activa el
// grupo de datos), la ubicación de una habilidad en su grupo activo y la
// copia EXACTA del descriptor humano por grupo: fallarían si la lógica o la
// redacción fueran revertidas. No renderizan componentes ni tocan window.

import { describe, it, expect } from 'vitest';
import {
  SYNERGY_GROUPS,
  SYNERGY_GROUP_META,
  detectActiveSynergies,
  synergyGroupForSkill,
} from './skillSynergy';

describe('detectActiveSynergies — activación por 2+ coincidencias', () => {
  it('un grupo con EXACTAMENTE 2 habilidades coincidentes se activa', () => {
    // Grupo 0 (desarrollo web): react + typescript = 2 coincidencias.
    const active = detectActiveSynergies(['React', 'TypeScript']);
    expect(active.has(0)).toBe(true);
    expect(active.size).toBe(1);
  });

  it('UNA sola coincidencia NO activa el grupo', () => {
    const active = detectActiveSynergies(['React']);
    expect(active.has(0)).toBe(false);
    expect(active.size).toBe(0);
  });

  it('lista vacía o nula devuelve un set vacío', () => {
    expect(detectActiveSynergies([]).size).toBe(0);
    // @ts-expect-error — probamos robustez ante entradas nulas
    expect(detectActiveSynergies(null).size).toBe(0);
  });

  it('activa varios grupos a la vez de forma independiente', () => {
    const active = detectActiveSynergies([
      'React', 'TypeScript', // grupo 0
      'Docker', 'AWS',       // grupo 2
    ]);
    expect(active.has(0)).toBe(true);
    expect(active.has(2)).toBe(true);
    expect(active.has(1)).toBe(false);
  });
});

describe('detectActiveSynergies — guard de límite de palabra', () => {
  it('"Google Analytics" SOLO NO activa el grupo de datos (una coincidencia < 2)', () => {
    const active = detectActiveSynergies(['Google Analytics']);
    expect(active.has(1)).toBe(false);
  });

  it('"Google Analytics" + otra habilidad de datos SÍ activa el grupo', () => {
    // Con una segunda coincidencia real (python), el grupo 1 alcanza 2+.
    const active = detectActiveSynergies(['Google Analytics', 'Python']);
    expect(active.has(1)).toBe(true);
  });
});

describe('synergyGroupForSkill — ubicación de la habilidad', () => {
  it('devuelve el índice del grupo activo al que pertenece la habilidad', () => {
    const active = detectActiveSynergies(['React', 'TypeScript']);
    expect(synergyGroupForSkill('React', active)).toBe(0);
    expect(synergyGroupForSkill('TypeScript', active)).toBe(0);
  });

  it('devuelve null si la habilidad no participa de ninguna sinergia activa', () => {
    const active = detectActiveSynergies(['React', 'TypeScript']);
    // "Docker" no está en ningún grupo activo (grupo 2 no se activó).
    expect(synergyGroupForSkill('Docker', active)).toBeNull();
  });

  it('devuelve null cuando no hay grupos activos', () => {
    const active = new Set<number>();
    expect(synergyGroupForSkill('React', active)).toBeNull();
  });
});

describe('SYNERGY_GROUP_META — copia CERO JERGA por grupo', () => {
  it('hay un descriptor por cada grupo de SYNERGY_GROUPS', () => {
    expect(SYNERGY_GROUP_META.length).toBe(SYNERGY_GROUPS.length);
  });

  it('cada grupo tiene id correcto y nombre + porque no vacíos', () => {
    SYNERGY_GROUP_META.forEach((meta, i) => {
      expect(meta.id).toBe(i);
      expect(meta.nombre.trim().length).toBeGreaterThan(0);
      expect(meta.porque.trim().length).toBeGreaterThan(0);
    });
  });

  it('la copia exacta del grupo 0 no regresó', () => {
    expect(SYNERGY_GROUP_META[0].nombre).toBe('Desarrollo web');
    expect(SYNERGY_GROUP_META[0].porque).toBe(
      'Estas habilidades se potencian: juntas cubren todo el ciclo de una app web.',
    );
  });
});
