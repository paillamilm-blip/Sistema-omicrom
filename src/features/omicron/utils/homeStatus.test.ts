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
  it('con próximo paso incluye el título del paso y cierra con la invitación', () => {
    const status = pickHomeStatus({ streak: 0, nextStep: stepWith('Convalida tu CV real') });
    expect(status.label).toBe('Tu próximo paso: Convalida tu CV real. ¿Seguimos o quieres hacer otra cosa?');
  });

  it('con próximo paso Y racha antepone la racha y cierra con la invitación', () => {
    const status = pickHomeStatus({ streak: 3, nextStep: stepWith('Rinde un examen en Academia') });
    expect(status.label).toBe(
      'Racha de 3 días · Tu próximo paso: Rinde un examen en Academia. ¿Seguimos o quieres hacer otra cosa?',
    );
  });

  it('con eje que subió + próximo paso compone qué se movió + qué sigue + invitación en UNA línea', () => {
    const status = pickHomeStatus({
      streak: 0,
      nextStep: stepWith('Rinde un examen en Academia'),
      axisRose: 'Ejecución',
    });
    expect(status.label).toBe(
      'Hoy tu Ejecución subió · Tu próximo paso: Rinde un examen en Academia. ¿Seguimos o quieres hacer otra cosa?',
    );
  });

  it('el alza de eje tiene prioridad sobre la racha (una sola voz del núcleo)', () => {
    const status = pickHomeStatus({
      streak: 5,
      nextStep: stepWith('Sube un aporte a la Bóveda'),
      axisRose: 'Calidad',
    });
    expect(status.label).toBe(
      'Hoy tu Calidad subió · Tu próximo paso: Sube un aporte a la Bóveda. ¿Seguimos o quieres hacer otra cosa?',
    );
    // No debe caer en la rama de "próximo paso + racha".
    expect(status.label).not.toContain('Racha de 5 días');
  });

  it('axisRose vacío o solo espacios NO activa la rama de alza', () => {
    const status = pickHomeStatus({
      streak: 0,
      nextStep: stepWith('Convalida tu CV real'),
      axisRose: '   ',
    });
    expect(status.label).toBe('Tu próximo paso: Convalida tu CV real. ¿Seguimos o quieres hacer otra cosa?');
    expect(status.label).not.toContain('subió');
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

  it('sin paso ni racha pero con reputación (sin banda) la muestra a escala completa', () => {
    const status = pickHomeStatus({ streak: 0, nextStep: null, reputation: 65 });
    expect(status.label).toBe('Reputación 65/100');
    expect(status.label).not.toContain('K');
  });

  it('con banda Técnico + reputación muestra el nivel único e invita a Arquitecto (una línea, N/100)', () => {
    const status = pickHomeStatus({ streak: 0, nextStep: null, reputation: 63, levelBand: 'Técnico' });
    expect(status.label).toBe(
      'Vas como Técnico (63/100) — valida una habilidad para acercarte a Arquitecto.',
    );
    // Tuteo neutro (sin voseo) y escala completa.
    expect(status.label).not.toContain('validá');
    expect(status.label).toContain('/100');
  });

  it('con banda Estudiante invita a Técnico', () => {
    const status = pickHomeStatus({ streak: 0, nextStep: null, reputation: 20, levelBand: 'Estudiante' });
    expect(status.label).toBe(
      'Vas como Estudiante (20/100) — valida una habilidad para acercarte a Técnico.',
    );
  });

  it('en la banda tope (Arquitecto) reconoce el nivel sin invitar a otra banda', () => {
    const status = pickHomeStatus({ streak: 0, nextStep: null, reputation: 92, levelBand: 'Arquitecto' });
    expect(status.label).toBe('Vas como Arquitecto (92/100) — el nivel más alto de la red.');
    expect(status.label).not.toContain('acercarte');
  });

  it('el próximo paso tiene prioridad sobre el nivel (una sola voz del núcleo)', () => {
    const status = pickHomeStatus({
      streak: 0,
      nextStep: stepWith('Rinde un examen en Academia'),
      reputation: 63,
      levelBand: 'Técnico',
    });
    expect(status.label).toBe('Tu próximo paso: Rinde un examen en Academia. ¿Seguimos o quieres hacer otra cosa?');
    expect(status.label).not.toContain('Vas como');
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
