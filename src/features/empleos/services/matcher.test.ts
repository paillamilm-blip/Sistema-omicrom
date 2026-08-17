// lib/jobMatcher.test.ts
// Tests unitarios del motor de matching de empleos (función pura, sin red/DB).
// Ejecutar:  npm run test

import { describe, it, expect } from 'vitest';
import {
  calculateJobScore,
  getTopJobs,
  getJobsByType,
  getGapSkills,
  jobTypeLabel,
  JOBS,
} from './matcher';
import type { AnalyzedProfile } from '@/features/perfil/services/cvAnalyzer';

function makeProfile(overrides: Partial<AnalyzedProfile> = {}): AnalyzedProfile {
  return {
    name: '',
    seniorLabel: 'Desarrollador Mid',
    seniorLevel: 2,
    years: 3,
    skills: ['react', 'frontend', 'javascript'],
    labels: ['React', 'Frontend', 'JavaScript'],
    skillsDetail: [],
    summary: '',
    creativity: 0.4,
    arch: 'mid',
    axes: { exec: 50, qual: 50, trans: 50, fund: 50 },
    ...overrides,
  };
}

describe('calculateJobScore — rango y forma', () => {
  it('el success siempre está en el rango documentado [34, 98]', () => {
    const profile = makeProfile();
    for (const job of JOBS) {
      const { success } = calculateJobScore(job, profile, 50);
      expect(success).toBeGreaterThanOrEqual(34);
      expect(success).toBeLessThanOrEqual(98);
    }
  });

  it('match cuenta cuántas skills requeridas tiene el perfil', () => {
    const job = JOBS.find((j) => j.id === 'senior-frontend')!;
    const profile = makeProfile({ skills: ['react', 'typescript', 'frontend'] });
    const { match } = calculateJobScore(job, profile, 50);
    expect(match).toBe(3);
  });

  it('0 skills en común da match = 0', () => {
    const job = JOBS.find((j) => j.id === 'backend-eng')!;
    const profile = makeProfile({ skills: ['react', 'frontend'] });
    const { match } = calculateJobScore(job, profile, 50);
    expect(match).toBe(0);
  });
});

describe('calculateJobScore — fit de seniority', () => {
  it('perfil junior en un job que requiere seniority alta obtiene menor score que uno senior', () => {
    const job = JOBS.find((j) => j.id === 'tech-lead')!; // seniorMin: 5
    const junior = makeProfile({ seniorLevel: 1, skills: ['react', 'architecture', 'typescript'] });
    const senior = makeProfile({ seniorLevel: 5, skills: ['react', 'architecture', 'typescript'] });
    const scoreJunior = calculateJobScore(job, junior, 50).success;
    const scoreSenior = calculateJobScore(job, senior, 50).success;
    expect(scoreSenior).toBeGreaterThan(scoreJunior);
  });

  it('perfil sobre-calificado (3+ niveles arriba) recibe penalización', () => {
    const job = JOBS.find((j) => j.id === 'trainee')!; // seniorMin: 1
    const overqualified = makeProfile({ seniorLevel: 5, skills: ['react', 'frontend', 'javascript'] });
    const justRight = makeProfile({ seniorLevel: 1, skills: ['react', 'frontend', 'javascript'] });
    const scoreOver = calculateJobScore(job, overqualified, 50).success;
    const scoreRight = calculateJobScore(job, justRight, 50).success;
    expect(scoreOver).toBeLessThan(scoreRight);
  });
});

describe('calculateJobScore — bonus de reputación', () => {
  it('mayor reputación (todo lo demás igual) nunca da un score menor', () => {
    const job = JOBS.find((j) => j.id === 'fullstack')!;
    const profile = makeProfile({ skills: ['react', 'node', 'backend'] });
    const scoreLowRep = calculateJobScore(job, profile, 10).success;
    const scoreHighRep = calculateJobScore(job, profile, 90).success;
    expect(scoreHighRep).toBeGreaterThanOrEqual(scoreLowRep);
  });
});

describe('getTopJobs', () => {
  it('devuelve resultados ordenados de mayor a menor éxito', () => {
    const top = getTopJobs(makeProfile(), 50, 5);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].success).toBeGreaterThanOrEqual(top[i].success);
    }
  });

  it('respeta el límite solicitado', () => {
    const top = getTopJobs(makeProfile(), 50, 2);
    expect(top.length).toBe(2);
  });

  it('límite por defecto es 3', () => {
    const top = getTopJobs(makeProfile(), 50);
    expect(top.length).toBe(3);
  });
});

describe('getJobsByType', () => {
  it('solo devuelve trabajos del tipo solicitado', () => {
    const freelance = getJobsByType('freelance', makeProfile(), 50);
    expect(freelance.every((r) => r.job.type === 'freelance')).toBe(true);
  });

  it('devuelve resultados ordenados de mayor a menor éxito', () => {
    const empresa = getJobsByType('empresa', makeProfile(), 50);
    for (let i = 1; i < empresa.length; i++) {
      expect(empresa[i - 1].success).toBeGreaterThanOrEqual(empresa[i].success);
    }
  });
});

describe('getGapSkills', () => {
  it('no incluye skills que el perfil ya tiene', () => {
    const gaps = getGapSkills(makeProfile({ skills: ['typescript', 'testing', 'node'] }));
    expect(gaps).not.toContain('typescript');
    expect(gaps).not.toContain('testing');
    expect(gaps).not.toContain('node');
  });

  it('siempre devuelve al menos 3 gaps aunque el perfil tenga casi todas las skills del pool', () => {
    const gaps = getGapSkills(
      makeProfile({ skills: ['typescript', 'testing', '3d', 'node', 'python', 'design', 'product'] })
    );
    expect(gaps.length).toBeGreaterThanOrEqual(3);
  });

  it('nunca devuelve más de 5 gaps', () => {
    const gaps = getGapSkills(makeProfile({ skills: [] }));
    expect(gaps.length).toBeLessThanOrEqual(5);
  });
});

describe('jobTypeLabel', () => {
  it.each([
    ['empresa', 'Contrato de empresa'],
    ['freelance', 'Freelance'],
    ['mentoria', 'Mentoría'],
  ] as const)('%s → %s', (type, label) => {
    expect(jobTypeLabel(type)).toBe(label);
  });
});
