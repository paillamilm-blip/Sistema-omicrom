// services/reputationService.test.ts
// Tests unitarios de la lógica de reputación / PE (sin base de datos).
// Ejecutar:  npm run test     (o  npx vitest run)

import { describe, it, expect } from 'vitest';
import {
  calculateFinalReputation,
  calculateGemeloAverage,
  calculateGemeloDigital,
  determineNodeLevel,
  calculatePEThreshold,
  shouldTriggerAudit,
  calculateMatchScore,
  getReputationBadge,
  getReputationColor,
  formatScore,
  calculateProgressToNextLevel,
  simulateReputationUpdate,
} from './reputationService';
import type { Profile } from '../types';

// Helper: perfil mínimo con los campos de score que necesitan los tests.
function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'test-user',
    execution_score: 50,
    quality_score: 50,
    transcendence_score: 50,
    foundation_score: 50,
    traditional_score: 0,
    experience_score: 0,
    reputation_score: 40,
    ...overrides,
  } as Profile;
}

describe('calculateFinalReputation (regla 80/20)', () => {
  it('usuario nuevo: 0 tradicional + 50 experiencia = 40', () => {
    expect(calculateFinalReputation(0, 50)).toBe(40);
  });
  it('mezcla 50/50 da 50', () => {
    expect(calculateFinalReputation(50, 50)).toBe(50);
  });
  it('clamp superior a 100', () => {
    expect(calculateFinalReputation(100, 100)).toBe(100);
  });
  it('clamp inferior a 0 (valores negativos)', () => {
    expect(calculateFinalReputation(-100, 0)).toBe(0);
  });
});

describe('calculateGemeloAverage', () => {
  it('promedia los 4 ejes', () => {
    const g = { execution: 40, quality: 60, transcendence: 50, foundation: 50, overallReputation: 0 };
    expect(calculateGemeloAverage(g)).toBe(50);
  });
});

describe('canónico: reputación = 80/20 sobre el promedio del Gemelo', () => {
  it('ejes en 50 y tradicional 0 → reputación 40 (igual que el trigger SQL)', () => {
    const gemelo = calculateGemeloDigital(makeProfile());
    const exp = calculateGemeloAverage(gemelo);     // 50
    expect(calculateFinalReputation(0, exp)).toBe(40);
  });
});

describe('determineNodeLevel', () => {
  it.each([
    [0, 1], [49, 1], [50, 2], [79, 2], [80, 3], [100, 3],
  ])('reputación %i → nivel %i', (score, level) => {
    expect(determineNodeLevel(score)).toBe(level);
  });
});

describe('calculatePEThreshold', () => {
  it('N1→N2 = 1000', () => expect(calculatePEThreshold(1)).toBe(1000));
  it('N2→N3 = 2500', () => expect(calculatePEThreshold(2)).toBe(2500));
  it('nivel máximo = 9999', () => expect(calculatePEThreshold(3)).toBe(9999));
});

describe('shouldTriggerAudit (caída de reputación)', () => {
  it('caída de 20 (>=15) dispara auditoría', () => {
    expect(shouldTriggerAudit(80, 60)).toBe(true);
  });
  it('caída de 10 (<15) NO dispara', () => {
    expect(shouldTriggerAudit(80, 70)).toBe(false);
  });
  it('umbral personalizado', () => {
    expect(shouldTriggerAudit(80, 75, 5)).toBe(true);
  });
});

describe('calculateMatchScore (empleos, 80/20)', () => {
  it('tradicional 0 + experiencia 50 = 40', () => {
    expect(calculateMatchScore(makeProfile({ traditional_score: 0, experience_score: 50 }))).toBe(40);
  });
});

describe('getReputationBadge', () => {
  it.each([
    [95, 'Elite'], [85, 'Senior'], [75, 'Avanzado'], [60, 'Intermedio'], [30, 'Novato'],
  ])('score %i → %s', (score, label) => {
    expect(getReputationBadge(score).label).toBe(label);
  });
});

describe('getReputationColor', () => {
  it('80+ verde', () => expect(getReputationColor(85)).toContain('green'));
  it('<40 rojo', () => expect(getReputationColor(20)).toContain('red'));
});

describe('formatScore', () => {
  it('un decimal', () => expect(formatScore(40)).toBe('40.0'));
});

describe('calculateProgressToNextLevel', () => {
  it('N1 con 500 PE → 50% hacia N2', () => {
    const r = calculateProgressToNextLevel(1, 500);
    expect(r.nextLevelPE).toBe(1000);
    expect(r.progressPercentage).toBe(50);
  });
  it('N2 recién alcanzado (1000 PE) → 0%', () => {
    const r = calculateProgressToNextLevel(2, 1000);
    expect(r.progressPercentage).toBe(0);
  });
  it('no supera 100%', () => {
    const r = calculateProgressToNextLevel(1, 5000);
    expect(r.progressPercentage).toBe(100);
  });
});

describe('simulateReputationUpdate', () => {
  it('recalcula reputación como promedio (NO queda en 0)', () => {
    const updated = simulateReputationUpdate(makeProfile(), { execution: 50 });
    // execution 50+50 = 100 (clamp), resto 50 → (100+50+50+50)/4 = 62.5
    expect(updated.execution_score).toBe(100);
    expect(updated.reputation_score).toBe(62.5);
  });
  it('no excede 100 por eje (clamp)', () => {
    const updated = simulateReputationUpdate(makeProfile({ quality_score: 90 }), { quality: 50 });
    expect(updated.quality_score).toBe(100);
  });
});
