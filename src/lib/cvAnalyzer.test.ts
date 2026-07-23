// src/lib/cvAnalyzer.test.ts
// Tests del motor de análisis de CV. Usamos invariantes de estructura y
// aserciones relativas (no palabras clave frágiles) para que sean estables.
import { describe, it, expect } from 'vitest';
import { analyzeCV, DEMO_CV, type AnalyzedProfile } from './cvAnalyzer';

// Verifica que un perfil respete los rangos y tipos esperados.
function expectValidProfile(p: AnalyzedProfile) {
  expect(Array.isArray(p.skills)).toBe(true);
  expect(p.skills.length).toBeGreaterThan(0); // siempre hay al menos defaults
  expect(p.skills.length).toBe(p.labels.length);
  expect(p.seniorLevel).toBeGreaterThanOrEqual(1);
  expect(p.seniorLevel).toBeLessThanOrEqual(5);
  expect(p.creativity).toBeGreaterThanOrEqual(0);
  expect(p.creativity).toBeLessThanOrEqual(1);
  // Ejes dentro de sus rangos de clamp.
  expect(p.axes.exec).toBeGreaterThanOrEqual(20);
  expect(p.axes.exec).toBeLessThanOrEqual(96);
  expect(p.axes.qual).toBeGreaterThanOrEqual(20);
  expect(p.axes.qual).toBeLessThanOrEqual(95);
  expect(p.axes.trans).toBeGreaterThanOrEqual(8);
  expect(p.axes.trans).toBeLessThanOrEqual(92);
  expect(p.axes.fund).toBeGreaterThanOrEqual(20);
  expect(p.axes.fund).toBeLessThanOrEqual(97);
}

describe('analyzeCV · invariantes', () => {
  it('texto vacío devuelve un perfil válido con skills por defecto', () => {
    const p = analyzeCV('');
    expectValidProfile(p);
    expect(p.name).toBe('');
    expect(p.skills).toContain('frontend');
  });

  it('texto nulo/indefinido no rompe (defensivo)', () => {
    // @ts-expect-error probamos entrada inválida a propósito
    const p = analyzeCV(undefined);
    expectValidProfile(p);
  });
});

describe('analyzeCV · detección real', () => {
  it('un CV rico detecta más skills que uno vacío', () => {
    const rico = analyzeCV(DEMO_CV);
    const vacio = analyzeCV('');
    expectValidProfile(rico);
    expect(rico.skills.length).toBeGreaterThan(vacio.skills.length);
  });

  it('detecta seniority alta y más años en un CV senior/lead', () => {
    const rico = analyzeCV(DEMO_CV);
    expect(rico.years).toBeGreaterThanOrEqual(5);
    expect(rico.seniorLevel).toBeGreaterThanOrEqual(4);
    expect(['senior', 'lead', 'pro']).toContain(rico.arch);
  });

  it('extrae el nombre de la primera línea cuando es válido', () => {
    const cv = 'María González\nDesarrolladora Senior con 6 años en React y Node.js.';
    const p = analyzeCV(cv);
    expect(p.name).toBe('María González');
  });

  it('más experiencia produce mayor eje de Ejecución', () => {
    const junior = analyzeCV('Desarrollador con 1 año de experiencia en React.');
    const senior = analyzeCV('Desarrollador con 10 años de experiencia en React.');
    expect(senior.axes.exec).toBeGreaterThan(junior.axes.exec);
  });

  it('detecta perfil de estudiante y limita el fundamento', () => {
    const p = analyzeCV('Estudiante de ingeniería, recién egresado, aprendiendo React.');
    expect(p.arch).toBe('estudiante');
    expect(p.axes.fund).toBeLessThanOrEqual(60);
  });
});
