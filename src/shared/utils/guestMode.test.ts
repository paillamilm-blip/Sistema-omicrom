// src/shared/utils/guestMode.test.ts
// Pruebas del puente localStorage para el análisis de CV pendiente.
// Ejercitan los helpers reales: fallarían si la lógica fuera revertida.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  savePendingCvAnalysis,
  getPendingCvAnalysis,
  clearPendingCvAnalysis,
  hasPendingCvAnalysis,
} from './guestMode';
import type { AnalyzedProfile } from '@/features/gemelo/services/cvAnalyzer';

const PENDING_KEY = 'omicron_pending_cv_analysis';

function makeProfile(): AnalyzedProfile {
  return {
    name: 'Matías Alonso',
    seniorLabel: 'Profesional Senior',
    seniorLevel: 4,
    years: 6,
    skills: ['react', 'typescript'],
    labels: ['React', 'TypeScript'],
    skillsDetail: [
      { name: 'React', pct: 80 },
      { name: 'TypeScript', pct: 70 },
    ],
    summary: 'Resumen del profesional.',
    creativity: 0.5,
    arch: 'senior',
    axes: { exec: 70, qual: 65, trans: 40, fund: 55 },
    avatar: { type: 'grad', v: 0 },
  };
}

describe('puente CV analizado (guestMode)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trip preserva axes, labels, skillsDetail, name y years', () => {
    const profile = makeProfile();
    savePendingCvAnalysis(profile);
    const restored = getPendingCvAnalysis();
    expect(restored).not.toBeNull();
    expect(restored!.name).toBe('Matías Alonso');
    expect(restored!.years).toBe(6);
    expect(restored!.labels).toEqual(['React', 'TypeScript']);
    expect(restored!.skillsDetail).toEqual([
      { name: 'React', pct: 80 },
      { name: 'TypeScript', pct: 70 },
    ]);
    expect(restored!.axes).toEqual({ exec: 70, qual: 65, trans: 40, fund: 55 });
  });

  it('tras save hasPendingCvAnalysis() es true; tras clear es false', () => {
    expect(hasPendingCvAnalysis()).toBe(false);
    savePendingCvAnalysis(makeProfile());
    expect(hasPendingCvAnalysis()).toBe(true);
    clearPendingCvAnalysis();
    expect(hasPendingCvAnalysis()).toBe(false);
    expect(getPendingCvAnalysis()).toBeNull();
  });

  it('JSON inválido en la clave -> getPendingCvAnalysis() retorna null sin lanzar', () => {
    localStorage.setItem(PENDING_KEY, '{ no es json valido');
    expect(() => getPendingCvAnalysis()).not.toThrow();
    expect(getPendingCvAnalysis()).toBeNull();
  });

  it('objeto sin axes -> getPendingCvAnalysis() retorna null', () => {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ name: 'Sin ejes', labels: ['React'] }),
    );
    expect(getPendingCvAnalysis()).toBeNull();
  });
});
