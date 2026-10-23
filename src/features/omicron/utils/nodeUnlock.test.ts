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
  bandDisplayFor,
  bandForNodeLevel,
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

describe('bandDisplayFor — nivel visible del usuario (banda + rango 0..100)', () => {
  it('bordes 0 y 49 → Estudiante con rango "0–49"', () => {
    expect(bandDisplayFor(0)).toEqual({ band: 'Estudiante', range: '0–49' });
    expect(bandDisplayFor(49)).toEqual({ band: 'Estudiante', range: '0–49' });
  });

  it('bordes 50 y 79 → Técnico con rango "50–79"', () => {
    expect(bandDisplayFor(50)).toEqual({ band: 'Técnico', range: '50–79' });
    expect(bandDisplayFor(79)).toEqual({ band: 'Técnico', range: '50–79' });
  });

  it('bordes 80 y 100 → Arquitecto con rango "80–100"', () => {
    expect(bandDisplayFor(80)).toEqual({ band: 'Arquitecto', range: '80–100' });
    expect(bandDisplayFor(100)).toEqual({ band: 'Arquitecto', range: '80–100' });
  });

  it('normaliza fuera de rango y no finitos a los extremos', () => {
    expect(bandDisplayFor(-10)).toEqual({ band: 'Estudiante', range: '0–49' });
    expect(bandDisplayFor(Number.NaN)).toEqual({ band: 'Estudiante', range: '0–49' });
    expect(bandDisplayFor(150)).toEqual({ band: 'Arquitecto', range: '80–100' });
  });

  it('la banda coincide siempre con levelBandFor (una sola fuente de verdad)', () => {
    for (const rep of [0, 49, 50, 79, 80, 100]) {
      expect(bandDisplayFor(rep).band).toBe(levelBandFor(rep));
    }
  });
});

describe('bandForNodeLevel — presentación de node_level (1/2/3) al nivel humano', () => {
  it('1 → Estudiante, 2 → Técnico, 3 → Arquitecto', () => {
    expect(bandForNodeLevel(1)).toBe('Estudiante');
    expect(bandForNodeLevel(2)).toBe('Técnico');
    expect(bandForNodeLevel(3)).toBe('Arquitecto');
  });

  it('fuera de 1..3 o nulo cae en Estudiante (nunca rompe el render)', () => {
    expect(bandForNodeLevel(0)).toBe('Estudiante');
    expect(bandForNodeLevel(99)).toBe('Estudiante');
    expect(bandForNodeLevel(null)).toBe('Estudiante');
    expect(bandForNodeLevel(undefined)).toBe('Estudiante');
  });
});

describe('nodeUnlock — mapa conservador: el núcleo abre desde Estudiante', () => {
  // Un usuario recién llegado (reputación 0) NUNCA debe quedar varado. Tras el
  // recorte de la Fase 5 estos tres hubs son TODA la app: cerrarles el paso
  // sería dejarla sin camino.
  const CORE_NODES = ['inicio', 'academia', 'habilidades'];

  it('todos los nodos núcleo están desbloqueados con reputación 0', () => {
    for (const id of CORE_NODES) {
      const state = nodeUnlock(id, 0);
      expect(state.unlocked).toBe(true);
      expect(state.hint).toBeNull();
      expect(state.requiredBand).toBe('Estudiante');
    }
  });

  it('abrirse en 0 es aditivo: siguen abiertos con cualquier reputación', () => {
    for (const id of CORE_NODES) {
      expect(nodeUnlock(id, 50).unlocked).toBe(true);
      expect(nodeUnlock(id, 100).unlocked).toBe(true);
    }
  });

  it('un id desconocido se trata como desbloqueado (nunca varamos por un nodo no gateado)', () => {
    const state = nodeUnlock('nodo-inexistente', 0);
    expect(state.unlocked).toBe(true);
    expect(state.hint).toBeNull();
  });
});

describe('unlockHint — copia CERO JERGA, escala completa N/100', () => {
  it('unlockHint usa el sujeto genérico para nodos sin nombre humano', () => {
    const hint = unlockHint('desconocido', 'Técnico' as LevelBand);
    expect(hint).toBe('Este nodo se abre al llegar a Técnico (reputación 50/100).');
  });

  it('la pista es null cuando el nodo ya está desbloqueado', () => {
    expect(nodeUnlock('inicio', 0).hint).toBeNull();
  });
});
