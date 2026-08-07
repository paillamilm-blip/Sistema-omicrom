// lib/omicronCoach.test.ts
// Tests unitarios del motor de mejora en tiempo real (100% determinista,
// sin llamadas a Supabase ni a la IA). Ejecutar: npm run test

import { describe, it, expect } from 'vitest';
import { computeSteps, topStep, nodeGuidance, levelInfo } from './omicronCoach';
import type { Profile, GemeloDigital } from '../types';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'test-user',
    skills: ['react', 'typescript'],
    traditional_score: 60,
    pe_points: 100,
    ...overrides,
  } as Profile;
}

function makeGemelo(overrides: Partial<GemeloDigital> = {}): GemeloDigital {
  return {
    execution: 50,
    quality: 50,
    transcendence: 50,
    foundation: 50,
    overallReputation: 50,
    ...overrides,
  };
}

describe('levelInfo — umbrales de nivel por PE', () => {
  it('0 PE → Nodo Operativo, avanzando hacia Nodo Core', () => {
    const li = levelInfo(0);
    expect(li.tier).toBe('Nodo Operativo');
    expect(li.next).toBe('Nodo Core');
    expect(li.toNext).toBe(500);
    expect(li.pct).toBe(0);
  });

  it('500 PE → cruza a Nodo Core con 0% de progreso hacia el siguiente', () => {
    const li = levelInfo(500);
    expect(li.tier).toBe('Nodo Core');
    expect(li.next).toBe('Nodo Arquitecto');
    expect(li.pct).toBe(0);
  });

  it('2000 PE → Nodo Arquitecto, nivel máximo (sin next)', () => {
    const li = levelInfo(2000);
    expect(li.tier).toBe('Nodo Arquitecto');
    expect(li.next).toBeNull();
    expect(li.pct).toBe(100);
  });

  it('1250 PE (punto medio de Nodo Core) → 50% de progreso', () => {
    const li = levelInfo(1250);
    expect(li.pct).toBe(50);
  });
});

describe('computeSteps — prioridad sin CV', () => {
  it('sin skills, el primer paso es siempre subir el CV (score 100)', () => {
    const steps = computeSteps(makeProfile({ skills: [] }), null);
    expect(steps[0].id).toBe('cv');
    expect(steps[0].cv).toBe(true);
  });

  it('con skills, no se sugiere subir CV', () => {
    const steps = computeSteps(makeProfile({ skills: ['react'] }), makeGemelo());
    expect(steps.some((s) => s.id === 'cv')).toBe(false);
  });
});

describe('computeSteps — eje más débil primero', () => {
  it('el eje con menor valor produce el paso de mayor prioridad entre los 4 ejes', () => {
    const gemelo = makeGemelo({ execution: 10, quality: 90, transcendence: 90, foundation: 90 });
    const steps = computeSteps(makeProfile(), gemelo);
    const axisSteps = steps.filter((s) => ['execution', 'quality', 'transcendence', 'foundation'].includes(s.id));
    expect(axisSteps[0].id).toBe('execution');
  });

  it('cada eje bajo apunta al tab correcto', () => {
    const gemelo = makeGemelo();
    const steps = computeSteps(makeProfile(), gemelo);
    const byId = new Map(steps.map((s) => [s.id, s]));
    expect(byId.get('execution')?.tab).toBe('maxskill');
    expect(byId.get('quality')?.tab).toBe('academia');
    expect(byId.get('transcendence')?.tab).toBe('vault');
    expect(byId.get('foundation')?.tab).toBe('perfil');
  });
});

describe('computeSteps — credenciales bajas', () => {
  it('sugiere convalidar credenciales si traditional_score < 40 y ya hay skills', () => {
    const steps = computeSteps(makeProfile({ traditional_score: 20, skills: ['react'] }), makeGemelo());
    expect(steps.some((s) => s.id === 'trad')).toBe(true);
  });

  it('no sugiere convalidar credenciales si traditional_score >= 40', () => {
    const steps = computeSteps(makeProfile({ traditional_score: 60, skills: ['react'] }), makeGemelo());
    expect(steps.some((s) => s.id === 'trad')).toBe(false);
  });

  it('no sugiere convalidar credenciales si no hay skills (prioridad es el CV)', () => {
    const steps = computeSteps(makeProfile({ traditional_score: 10, skills: [] }), makeGemelo());
    expect(steps.some((s) => s.id === 'trad')).toBe(false);
  });
});

describe('computeSteps — sinergia con reputación alta', () => {
  it('reputación >= 45 y con skills sugiere postular a empleos y publicar en el mercado', () => {
    const gemelo = makeGemelo({ overallReputation: 60 });
    const steps = computeSteps(makeProfile({ skills: ['react'] }), gemelo);
    expect(steps.some((s) => s.id === 'jobs')).toBe(true);
    expect(steps.some((s) => s.id === 'market')).toBe(true);
  });

  it('reputación baja (< 45) NO sugiere postular ni publicar', () => {
    const gemelo = makeGemelo({ overallReputation: 30 });
    const steps = computeSteps(makeProfile({ skills: ['react'] }), gemelo);
    expect(steps.some((s) => s.id === 'jobs')).toBe(false);
    expect(steps.some((s) => s.id === 'market')).toBe(false);
  });
});

describe('computeSteps — orden final', () => {
  it('los pasos siempre quedan ordenados de mayor a menor score', () => {
    const gemelo = makeGemelo({ execution: 20, quality: 80, transcendence: 40, foundation: 60 });
    const steps = computeSteps(makeProfile({ skills: ['react'], traditional_score: 20 }), gemelo);
    // No exponemos 'score' en el resultado, pero el orden debe ser estable:
    // el eje más débil (execution=20) debe ir antes que el más fuerte (quality=80).
    const execIdx = steps.findIndex((s) => s.id === 'execution');
    const qualIdx = steps.findIndex((s) => s.id === 'quality');
    expect(execIdx).toBeLessThan(qualIdx);
  });

  it('sin perfil ni gemelo, no crashea (skills vacío igual dispara el paso de subir CV)', () => {
    const steps = computeSteps(null, null);
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe('cv');
  });
});

describe('topStep', () => {
  it('devuelve el primer paso de computeSteps', () => {
    const profile = makeProfile({ skills: [] });
    expect(topStep(profile, null)?.id).toBe('cv');
  });

  it('sin perfil ni gemelo, devuelve el paso de subir CV (skills vacío siempre lo dispara)', () => {
    expect(topStep(null, null)?.id).toBe('cv');
  });
});

describe('nodeGuidance — mensajes por tab', () => {
  it('academia menciona la Calidad actual cuando hay gemelo', () => {
    const msg = nodeGuidance('academia', makeProfile(), makeGemelo({ quality: 42 }));
    expect(msg).toContain('42');
  });

  it('empleos invita a postular si la reputación es >= 45', () => {
    const msg = nodeGuidance('empleos', makeProfile(), makeGemelo({ overallReputation: 50 }));
    expect(msg).toMatch(/ya podés postular/i);
  });

  it('empleos invita a subir reputación si es < 45', () => {
    const msg = nodeGuidance('empleos', makeProfile(), makeGemelo({ overallReputation: 20 }));
    expect(msg).toMatch(/subí tu reputación/i);
  });

  it('wallet muestra cuántos PE faltan para el siguiente nivel', () => {
    const msg = nodeGuidance('wallet', makeProfile({ pe_points: 100 }), null);
    expect(msg).toContain('400'); // faltan 500 - 100 = 400
  });

  it('tab desconocido devuelve string genérico (no crashea)', () => {
    // @ts-expect-error - probamos un tab inválido a propósito
    expect(nodeGuidance('inexistente', makeProfile(), null)).toBe('Explorá este nodo para descubrir cómo mejorar tu Gemelo Digital.');
  });
});
