// features/gemelo/services/orbFusion.test.ts
// Pruebas de la lógica pura de fusión de orbes.

import { describe, it, expect } from 'vitest';
import { computeOrbFusion, COMPLEMENTARY_THRESHOLD, type Skill } from './orbFusion';

describe('computeOrbFusion', () => {
  it('skills idénticas -> todo compartido, sin complementarias ni exclusivas', () => {
    const mine: Skill[] = [{ name: 'React', pct: 70 }, { name: 'Node', pct: 60 }];
    const theirs: Skill[] = [{ name: 'React', pct: 70 }, { name: 'Node', pct: 60 }];
    const r = computeOrbFusion(mine, theirs);
    expect(r.shared.map((s) => s.name).sort()).toEqual(['Node', 'React']);
    expect(r.complementary).toEqual([]);
    expect(r.onlyTheirs).toEqual([]);
  });

  it('skill que solo tiene la otra persona -> onlyTheirs', () => {
    const mine: Skill[] = [{ name: 'React', pct: 70 }];
    const theirs: Skill[] = [{ name: 'React', pct: 70 }, { name: 'Figma', pct: 55 }];
    const r = computeOrbFusion(mine, theirs);
    expect(r.onlyTheirs).toEqual([{ name: 'Figma', theirsPct: 55 }]);
    expect(r.shared.map((s) => s.name)).toEqual(['React']);
  });

  it('yo domino más (mine 80 theirs 30) -> complementaria teach', () => {
    const r = computeOrbFusion([{ name: 'SQL', pct: 80 }], [{ name: 'SQL', pct: 30 }]);
    expect(r.complementary).toEqual([
      { name: 'SQL', minePct: 80, theirsPct: 30, direction: 'teach' },
    ]);
  });

  it('ella domina más (mine 30 theirs 80) -> complementaria learn', () => {
    const r = computeOrbFusion([{ name: 'SQL', pct: 30 }], [{ name: 'SQL', pct: 80 }]);
    expect(r.complementary).toEqual([
      { name: 'SQL', minePct: 30, theirsPct: 80, direction: 'learn' },
    ]);
  });

  it('diferencias de mayúsculas/espacios ("React" vs " react ") -> se emparejan como compartida', () => {
    const r = computeOrbFusion([{ name: 'React', pct: 60 }], [{ name: ' react ', pct: 60 }]);
    expect(r.shared).toHaveLength(1);
    expect(r.shared[0].name).toBe('React'); // conserva el nombre original mío para mostrar
    expect(r.onlyTheirs).toEqual([]);
  });

  it('entradas vacías e indefinidas -> resultado vacío sin lanzar', () => {
    expect(() => computeOrbFusion([], [])).not.toThrow();
    expect(computeOrbFusion([], [])).toEqual({ shared: [], complementary: [], onlyTheirs: [] });
    expect(computeOrbFusion(undefined, undefined)).toEqual({ shared: [], complementary: [], onlyTheirs: [] });
    expect(computeOrbFusion(undefined, [{ name: 'X', pct: 40 }])).toEqual({
      shared: [],
      complementary: [],
      onlyTheirs: [{ name: 'X', theirsPct: 40 }],
    });
  });

  it('deduplica nombres repetidos en mis skills (conserva el primero)', () => {
    const mine: Skill[] = [{ name: 'Go', pct: 90 }, { name: 'go', pct: 10 }];
    const theirs: Skill[] = [{ name: 'Go', pct: 88 }];
    const r = computeOrbFusion(mine, theirs);
    expect(r.shared).toEqual([{ name: 'Go', minePct: 90, theirsPct: 88 }]);
    // Con la primera aparición (90) la brecha es 2, no complementaria.
    expect(r.complementary).toEqual([]);
  });

  it('umbral: brecha == 25 cuenta como complementaria; brecha == 24 no', () => {
    expect(COMPLEMENTARY_THRESHOLD).toBe(25);

    const atThreshold = computeOrbFusion([{ name: 'CSS', pct: 50 }], [{ name: 'CSS', pct: 75 }]);
    expect(atThreshold.complementary).toHaveLength(1);
    expect(atThreshold.complementary[0].direction).toBe('learn');

    const belowThreshold = computeOrbFusion([{ name: 'CSS', pct: 50 }], [{ name: 'CSS', pct: 74 }]);
    expect(belowThreshold.complementary).toEqual([]);
    // sigue siendo compartida aunque no complementaria
    expect(belowThreshold.shared).toHaveLength(1);
  });
});
