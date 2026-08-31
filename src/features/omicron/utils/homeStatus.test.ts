// src/features/omicron/utils/homeStatus.test.ts
// Pruebas del helper PURO del ribbon "estado del día" del Home.
// Ejercitan la composición REAL (próximo paso, racha singular/plural,
// reputación a escala completa y fallback): fallarían si esa lógica fuera
// revertida. No renderizan componentes ni tocan window.matchMedia.

import { describe, it, expect } from 'vitest';
import { pickHomeStatus } from './homeStatus';
import type { NextStep } from '../services/coach';

// Construye un NextStep mínimo válido para las pruebas (solo nos importa title).
function stepWith(title: string): NextStep {
  return {
    id: 'test',
    title,
    why: 'porque sí',
    tab: 'perfil',
    actionLabel: 'Ir',
    accent: '#a0aec0',
  };
}

describe('pickHomeStatus', () => {
  it('con próximo paso incluye el título del paso', () => {
    const status = pickHomeStatus({ streak: 0, nextStep: stepWith('Convalida tu CV real') });
    expect(status.label).toContain('Convalida tu CV real');
    expect(status.label).toContain('Tu próximo paso:');
  });

  it('con próximo paso Y racha antepone la racha como contexto', () => {
    const status = pickHomeStatus({ streak: 3, nextStep: stepWith('Rinde un examen en Academia') });
    expect(status.label).toContain('Racha de 3 días · Tu próximo paso:');
    expect(status.label).toContain('Rinde un examen en Academia');
  });

  it('con streak>0 y sin paso refleja la racha (plural correcto)', () => {
    const status = pickHomeStatus({ streak: 5, nextStep: null });
    expect(status.label).toContain('racha de 5 días');
  });

  it('con streak===1 usa el singular "día"', () => {
    const status = pickHomeStatus({ streak: 1, nextStep: null });
    expect(status.label).toContain('racha de 1 día');
    expect(status.label).not.toContain('1 días');
  });

  it('sin paso ni racha pero con reputación la muestra a escala completa', () => {
    const status = pickHomeStatus({ streak: 0, nextStep: null, reputation: 65 });
    expect(status.label).toBe('Reputación 65/100');
    expect(status.label).not.toContain('K');
  });

  it('sin datos devuelve el fallback calmo con la marca "Ómicrom"', () => {
    const status = pickHomeStatus({ streak: 0, nextStep: null });
    expect(status.label).toBe('Ómicrom sigue tu carrera. Da tu próximo paso cuando quieras.');
  });

  it('normaliza rachas negativas o no finitas a "sin racha"', () => {
    expect(pickHomeStatus({ streak: -2, nextStep: null, reputation: 40 }).label).toBe('Reputación 40/100');
    expect(pickHomeStatus({ streak: Number.NaN, nextStep: null }).label).toBe(
      'Ómicrom sigue tu carrera. Da tu próximo paso cuando quieras.',
    );
  });
});
