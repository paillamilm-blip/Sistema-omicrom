// src/shared/services/onboardingSync.test.ts
// Pruebas del helper puro de reconciliación del onboarding.
// Ejercitan la LÓGICA REAL (semántica aditiva): fallarían si se revirtiera a
// sobrescribir (overwrite) en lugar de GREATEST/unión.

import { describe, it, expect } from 'vitest';
// Se importa desde el módulo PURO (./onboarding) para que la prueba no arrastre
// el cliente de Supabase (que lee variables de entorno al inicializarse).
import { mergeOnboardingIntoLocal, hasCloudOnboarding } from './onboarding';
import type { GuestProfile } from '@/shared/utils/guestMode';

function guest(overrides: Partial<GuestProfile> = {}): GuestProfile {
  return {
    profession: '',
    years: 0,
    skills: [],
    axes: { exec: 0, qual: 0, trans: 0, fund: 0 },
    seniorLabel: '',
    summary: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('mergeOnboardingIntoLocal (semántica aditiva)', () => {
  it('nunca baja un eje: si el local es mayor, gana el local', () => {
    const result = mergeOnboardingIntoLocal(
      { axes: { exec: 45, qual: 50, trans: 50, fund: 50 } },
      guest({ axes: { exec: 62, qual: 40, trans: 30, fund: 20 } }),
    );
    // cloud exec=45, local exec=62 -> 62 (GREATEST, nunca baja)
    expect(result.axes.exec).toBe(62);
  });

  it('sube un eje: si la nube es mayor, gana la nube', () => {
    const result = mergeOnboardingIntoLocal(
      { axes: { exec: 70, qual: 10, trans: 10, fund: 10 } },
      guest({ axes: { exec: 50, qual: 5, trans: 5, fund: 5 } }),
    );
    // cloud exec=70, local exec=50 -> 70 (GREATEST)
    expect(result.axes.exec).toBe(70);
  });

  it('une skills sin duplicados (case-insensitive)', () => {
    const result = mergeOnboardingIntoLocal(
      { skills: ['Derecho', 'Gestión'] },
      guest({ skills: ['derecho', 'Litigación'] }),
    );
    expect(result.skills).toEqual(['Derecho', 'Gestión', 'Litigación']);
    // Sin duplicados: 'derecho' no se agrega dos veces.
    expect(result.skills.length).toBe(3);
  });

  it('años: toma el MAYOR (GREATEST)', () => {
    const higherLocal = mergeOnboardingIntoLocal({ years: 3 }, guest({ years: 8 }));
    expect(higherLocal.years).toBe(8);
    const higherCloud = mergeOnboardingIntoLocal({ years: 12 }, guest({ years: 4 }));
    expect(higherCloud.years).toBe(12);
  });

  it('profession y seniorLabel: prefiere el valor no vacío', () => {
    // La nube trae valores; el local está vacío -> gana la nube.
    const fromCloud = mergeOnboardingIntoLocal(
      { profession: 'Abogada', seniorLabel: 'Senior', onboarding_completed_at: '2026-02-01T00:00:00.000Z' },
      guest({ profession: '', seniorLabel: '' }),
    );
    expect(fromCloud.profession).toBe('Abogada');
    expect(fromCloud.seniorLabel).toBe('Senior');

    // La nube está vacía; el local trae valores -> gana el local.
    const fromLocal = mergeOnboardingIntoLocal(
      { profession: '', seniorLabel: '' },
      guest({ profession: 'Ingeniera', seniorLabel: 'Semi Senior' }),
    );
    expect(fromLocal.profession).toBe('Ingeniera');
    expect(fromLocal.seniorLabel).toBe('Semi Senior');
  });

  it('cloud-leads: con onboarding_completed_at, el texto de la nube gana sobre un local no vacío', () => {
    // Cuando la nube trae marca de compleción (onboarding_completed_at), sus
    // textos no vacíos tienen prioridad AUNQUE el local también traiga valores.
    const result = mergeOnboardingIntoLocal(
      {
        profession: 'Abogada',
        seniorLabel: 'Senior',
        summary: 'Resumen desde la nube',
        onboarding_completed_at: '2026-02-01T00:00:00.000Z',
      },
      guest({ profession: 'Ingeniera', seniorLabel: 'Junior', summary: 'Resumen local' }),
    );
    expect(result.profession).toBe('Abogada');
    expect(result.seniorLabel).toBe('Senior');
    expect(result.summary).toBe('Resumen desde la nube');
  });
});

describe('hasCloudOnboarding (predicado puro)', () => {
  it('es true cuando onboarding_completed_at está seteado', () => {
    expect(hasCloudOnboarding({ onboarding_completed_at: '2026-02-01T00:00:00.000Z' })).toBe(true);
  });

  it('es true cuando hay skills aunque no haya marca de completado', () => {
    expect(hasCloudOnboarding({ skills: ['Derecho'] })).toBe(true);
  });

  it('es false cuando no hay marca ni skills', () => {
    expect(hasCloudOnboarding({ onboarding_completed_at: null, skills: [] })).toBe(false);
    expect(hasCloudOnboarding({})).toBe(false);
    expect(hasCloudOnboarding(null)).toBe(false);
    expect(hasCloudOnboarding(undefined)).toBe(false);
  });
});
