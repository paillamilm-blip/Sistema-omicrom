import { describe, expect, it } from 'vitest';
import { buildRedViva } from '../services/redViva';
import { canvasOverlapClusters, canvasTargetsAreDistinct } from './RedVivaCanvas';

describe('RedVivaCanvas — objetivos táctiles', () => {
  it('mantiene selección directa cuando un único nodo tiene sus 44 px libres', () => {
    const model = buildRedViva({
      skillsDetail: [{ name: 'Excel', pct: 80 }],
      jobs: [],
    });

    expect(canvasTargetsAreDistinct(model.nodos, 320, 124)).toBe(true);
  });

  it('delega a la lista cuando dos posiciones estables harían solapar 44 px', () => {
    const model = buildRedViva({
      skillsDetail: [
        { name: 'Excel', pct: 80 },
        { name: 'Kubernetes', pct: 70 },
      ],
      jobs: [],
    });

    expect(canvasTargetsAreDistinct(model.nodos, 320, 124)).toBe(false);
    expect(canvasOverlapClusters(model.nodos, 320, 124)).toEqual([
      ['excel', 'kubernetes'],
    ]);
  });

  it('agrupa según el radio visible, no por una distancia fija entre centros', () => {
    const model = buildRedViva({
      skillsDetail: [
        { name: 'TypeScript', pct: 80 },
        { name: 'Figma', pct: 70 },
      ],
      jobs: [],
    });

    expect(canvasOverlapClusters(model.nodos, 320, 152)).toEqual([
      ['figma', 'typescript'],
    ]);
  });
});
