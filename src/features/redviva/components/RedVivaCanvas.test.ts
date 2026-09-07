import { describe, expect, it } from 'vitest';
import { buildRedViva } from '../services/redViva';
import {
  canvasOverlapClusters,
  canvasTargetsAreDistinct,
  shouldAnimateEncaje,
} from './RedVivaCanvas';

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

describe('shouldAnimateEncaje — el encaje solo se dispara al PASAR a probado', () => {
  it('anima cuando un nodo pasa de hueco/latiendo/ausente a solido', () => {
    expect(shouldAnimateEncaje('hueco', 'solido', false)).toBe(true);
    expect(shouldAnimateEncaje('latiendo', 'solido', false)).toBe(true);
    expect(shouldAnimateEncaje('ausente', 'solido', false)).toBe(true);
  });

  it('no anima en el primer render (estado previo desconocido)', () => {
    expect(shouldAnimateEncaje(undefined, 'solido', false)).toBe(false);
  });

  it('no reanima si el nodo ya estaba solido', () => {
    expect(shouldAnimateEncaje('solido', 'solido', false)).toBe(false);
  });

  it('no anima cuando el estado destino no es solido', () => {
    expect(shouldAnimateEncaje('solido', 'hueco', false)).toBe(false);
    expect(shouldAnimateEncaje('hueco', 'latiendo', false)).toBe(false);
    expect(shouldAnimateEncaje('hueco', 'ausente', false)).toBe(false);
  });

  it('respeta prefers-reduced-motion: nunca anima aunque haya transición a solido', () => {
    expect(shouldAnimateEncaje('hueco', 'solido', true)).toBe(false);
    expect(shouldAnimateEncaje('latiendo', 'solido', true)).toBe(false);
  });
});
