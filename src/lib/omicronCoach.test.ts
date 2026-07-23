// src/lib/omicronCoach.test.ts
// Tests del motor de ruta de mejora (determinista, sin backend).
import { describe, it, expect } from 'vitest';
import { computeSteps, topStep, levelInfo, nodeGuidance } from './omicronCoach';
import type { Profile, GemeloDigital } from '../types';

// Constructores mínimos: las funciones solo leen unos pocos campos, así que
// construimos objetos parciales y los tratamos como el tipo completo.
function makeProfile(over: Partial<Profile>): Profile {
  return {
    skills: [],
    traditional_score: 60,
    pe_points: 0,
    ...over,
  } as unknown as Profile;
}
function makeGemelo(over: Partial<GemeloDigital>): GemeloDigital {
  return {
    execution: 50,
    quality: 50,
    transcendence: 50,
    foundation: 50,
    overallReputation: 30,
    ...over,
  } as unknown as GemeloDigital;
}

describe('levelInfo', () => {
  it('en 0 PE es Nodo Operativo y apunta a Nodo Core', () => {
    const li = levelInfo(0);
    expect(li.tier).toBe('Nodo Operativo');
    expect(li.next).toBe('Nodo Core');
    expect(li.toNext).toBe(500);
  });

  it('en 500 PE sube a Nodo Core', () => {
    const li = levelInfo(500);
    expect(li.tier).toBe('Nodo Core');
    expect(li.next).toBe('Nodo Arquitecto');
  });

  it('en 2000+ PE es Nodo Arquitecto (nivel máximo, sin siguiente)', () => {
    const li = levelInfo(2500);
    expect(li.tier).toBe('Nodo Arquitecto');
    expect(li.next).toBeNull();
    expect(li.pct).toBe(100);
  });
});

describe('computeSteps', () => {
  it('sin datos, el primer paso es convalidar el CV', () => {
    const steps = computeSteps(null, null);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].id).toBe('cv');
    expect(steps[0].tab).toBe('perfil');
    expect(steps[0].cv).toBe(true);
  });

  it('prioriza el eje más débil del Gemelo (Trascendencia baja → Bóveda)', () => {
    const profile = makeProfile({ skills: ['react'], traditional_score: 70 });
    const gemelo = makeGemelo({
      execution: 80,
      quality: 80,
      transcendence: 10, // el más débil
      foundation: 80,
      overallReputation: 30, // < 45: sin pasos de empleos/mercado
    });
    const top = topStep(profile, gemelo);
    expect(top).not.toBeNull();
    expect(top?.id).toBe('transcendence');
    expect(top?.tab).toBe('vault');
  });

  it('los pasos vienen ordenados por impacto (score) descendente', () => {
    const profile = makeProfile({ skills: ['react'], traditional_score: 30 });
    const gemelo = makeGemelo({ overallReputation: 60 });
    const steps = computeSteps(profile, gemelo);
    // Cada paso tiene los campos esperados para renderizar.
    steps.forEach((s) => {
      expect(typeof s.id).toBe('string');
      expect(typeof s.title).toBe('string');
      expect(typeof s.actionLabel).toBe('string');
      expect(typeof s.why).toBe('string');
    });
    // No hay ids duplicados.
    const ids = steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('nodeGuidance', () => {
  it('en Billetera menciona los PE y el siguiente nivel', () => {
    const g = nodeGuidance('wallet', makeProfile({ pe_points: 0 }), null);
    expect(g).toContain('PE');
    expect(g).toContain('Nodo Core');
  });

  it('en Bóveda habla de Trascendencia', () => {
    const g = nodeGuidance('vault', null, makeGemelo({ transcendence: 40 }));
    expect(g.toLowerCase()).toContain('trascendencia');
  });

  it('devuelve texto no vacío para nodos conocidos', () => {
    expect(nodeGuidance('academia', null, null).length).toBeGreaterThan(0);
    expect(nodeGuidance('maxskill', null, null).length).toBeGreaterThan(0);
  });
});
