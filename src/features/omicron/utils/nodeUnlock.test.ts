// src/features/omicron/utils/nodeUnlock.test.ts
// Pruebas del helper PURO de bloqueado/desbloqueado de los nodos hub
// ("Matar el Escritorio" Inc 4). Ejercitan las BANDAS reales (0/49/50/79/
// 80/100), el mapa CONSERVADOR de compuertas (los nodos núcleo abren desde
// Estudiante para no varar a un usuario nuevo) y la copia EXACTA de las
// pistas: fallarían si los umbrales o las pistas fueran revertidos.
// No renderizan componentes ni tocan window.matchMedia / Supabase.

import { describe, it, expect } from 'vitest';
import {
  nodeUnlock,
  levelBandFor,
  unlockHint,
  LEVEL_THRESHOLDS,
  type LevelBand,
} from './nodeUnlock';

describe('levelBandFor — bandas por reputación (escala completa 0..100)', () => {
  it('0 y 49 son Estudiante (borde inferior de la banda base)', () => {
    expect(levelBandFor(0)).toBe('Estudiante');
    expect(levelBandFor(49)).toBe('Estudiante');
  });

  it('50 y 79 son Técnico (bordes de la banda media)', () => {
    expect(levelBandFor(50)).toBe('Técnico');
    expect(levelBandFor(79)).toBe('Técnico');
  });

  it('80 y 100 son Arquitecto (bordes de la banda alta)', () => {
    expect(levelBandFor(80)).toBe('Arquitecto');
    expect(levelBandFor(100)).toBe('Arquitecto');
  });

  it('normaliza fuera de rango y no finitos a los extremos', () => {
    expect(levelBandFor(-10)).toBe('Estudiante');
    expect(levelBandFor(Number.NaN)).toBe('Estudiante');
    expect(levelBandFor(150)).toBe('Arquitecto');
  });

  it('los umbrales son exactamente 0 / 50 / 80', () => {
    expect(LEVEL_THRESHOLDS.Estudiante).toBe(0);
    expect(LEVEL_THRESHOLDS.Técnico).toBe(50);
    expect(LEVEL_THRESHOLDS.Arquitecto).toBe(80);
  });
});

describe('nodeUnlock — mapa conservador: el núcleo abre desde Estudiante', () => {
  // Un usuario recién llegado (reputación 0) NUNCA debe quedar varado.
  const CORE_NODES = ['inicio', 'academia', 'habilidades', 'empleos', 'mensajes', 'billetera'];

  it('todos los nodos núcleo están desbloqueados con reputación 0', () => {
    for (const id of CORE_NODES) {
      const state = nodeUnlock(id, 0);
      expect(state.unlocked).toBe(true);
      expect(state.hint).toBeNull();
      expect(state.requiredBand).toBe('Estudiante');
    }
  });

  it('un id desconocido se trata como desbloqueado (nunca varamos por un nodo no gateado)', () => {
    const state = nodeUnlock('nodo-inexistente', 0);
    expect(state.unlocked).toBe(true);
    expect(state.hint).toBeNull();
  });
});

describe('nodeUnlock — nodos de mayor valor gateados por banda', () => {
  it('mercado (vender) requiere Técnico: bloqueado en 49, abierto en 50', () => {
    expect(nodeUnlock('mercado', 49).unlocked).toBe(false);
    expect(nodeUnlock('mercado', 50).unlocked).toBe(true);
    expect(nodeUnlock('mercado', 49).requiredBand).toBe('Técnico');
  });

  it('boveda (aportar) requiere Técnico: bloqueado en 49, abierto en 50', () => {
    expect(nodeUnlock('boveda', 49).unlocked).toBe(false);
    expect(nodeUnlock('boveda', 50).unlocked).toBe(true);
  });

  it('gobernanza requiere Arquitecto: bloqueado en 79, abierto en 80', () => {
    expect(nodeUnlock('gobernanza', 79).unlocked).toBe(false);
    expect(nodeUnlock('gobernanza', 80).unlocked).toBe(true);
    expect(nodeUnlock('gobernanza', 79).requiredBand).toBe('Arquitecto');
  });

  it('es aditivo: más reputación solo abre más (mercado sigue abierto en Arquitecto)', () => {
    expect(nodeUnlock('mercado', 100).unlocked).toBe(true);
    expect(nodeUnlock('boveda', 100).unlocked).toBe(true);
    expect(nodeUnlock('gobernanza', 100).unlocked).toBe(true);
  });
});

describe('unlockHint / nodeUnlock.hint — copia CERO JERGA, escala completa N/100', () => {
  it('mercado: pista exacta con el nombre humano del nodo y el nivel', () => {
    expect(nodeUnlock('mercado', 10).hint).toBe(
      'Vender tus ideas y servicios se abre al llegar a Técnico (reputación 50/100).',
    );
  });

  it('boveda: pista exacta', () => {
    expect(nodeUnlock('boveda', 10).hint).toBe(
      'Aportar a la Bóveda de conocimiento se abre al llegar a Técnico (reputación 50/100).',
    );
  });

  it('gobernanza: pista exacta apuntando a Arquitecto 80/100', () => {
    expect(nodeUnlock('gobernanza', 10).hint).toBe(
      'Participar en la Gobernanza de la red se abre al llegar a Arquitecto (reputación 80/100).',
    );
  });

  it('unlockHint usa el sujeto genérico para nodos sin nombre humano', () => {
    const hint = unlockHint('desconocido', 'Técnico' as LevelBand);
    expect(hint).toBe('Este nodo se abre al llegar a Técnico (reputación 50/100).');
  });

  it('la pista es null cuando el nodo ya está desbloqueado', () => {
    expect(nodeUnlock('mercado', 60).hint).toBeNull();
    expect(nodeUnlock('inicio', 0).hint).toBeNull();
  });
});
