// src/features/omicron/utils/orbHomeGuide.test.ts
// Pruebas de los helpers PUROS de la superficie de bienvenida del orbe.
// Ejercitan la lógica real (saludo, precedencia de nombre y armado de
// chips): fallarían si esa lógica fuera revertida. No renderizan el
// componente ni tocan window.matchMedia.

import { describe, it, expect } from 'vitest';
import { resolveGreetingName, buildGreeting, buildHomeActions } from './orbHomeGuide';

describe('buildGreeting', () => {
  it('con nombre devuelve la variante nombrada', () => {
    expect(buildGreeting('Matías')).toBe('Hola, Matías · tu Gemelo está activo');
  });

  it('sin nombre ("") devuelve la variante sin-nombre', () => {
    expect(buildGreeting('')).toBe('Hola · tu Gemelo está activo');
  });

  it('recorta el nombre antes de interpolar', () => {
    expect(buildGreeting('  Ana  ')).toBe('Hola, Ana · tu Gemelo está activo');
  });
});

describe('resolveGreetingName', () => {
  it('sigue la precedencia display_name > full_name > username', () => {
    expect(
      resolveGreetingName({ display_name: 'Dis', full_name: 'Full', username: 'user' }),
    ).toBe('Dis');
    expect(
      resolveGreetingName({ display_name: '', full_name: 'Full', username: 'user' }),
    ).toBe('Full');
    expect(
      resolveGreetingName({ display_name: null, full_name: null, username: 'user' }),
    ).toBe('user');
  });

  it('recorta espacios', () => {
    expect(resolveGreetingName({ display_name: '  Nora  ' })).toBe('Nora');
  });

  it('devuelve "" para vacío o fallback genérico', () => {
    expect(resolveGreetingName(null)).toBe('');
    expect(resolveGreetingName({})).toBe('');
    expect(resolveGreetingName({ display_name: '   ' })).toBe('');
    expect(resolveGreetingName({ display_name: 'operador' })).toBe('');
    expect(resolveGreetingName({ full_name: 'Amigo' })).toBe('');
  });

  it('trata un nombre real de una sola letra ("N") como nombre válido', () => {
    expect(resolveGreetingName({ username: 'N' })).toBe('N');
  });
});

describe('buildHomeActions', () => {
  it('devuelve como máximo 3 chips', () => {
    expect(buildHomeActions(false)).toHaveLength(3);
    expect(buildHomeActions(true)).toHaveLength(3);
  });

  it('sin CV lidera con { tab: "cv", label: "Sube tu CV" }', () => {
    const actions = buildHomeActions(false);
    expect(actions[0]).toEqual({ tab: 'cv', label: 'Sube tu CV' });
  });

  it('con CV usa "Actualizar CV" para el tab cv', () => {
    const actions = buildHomeActions(true);
    const cv = actions.find(a => a.tab === 'cv');
    expect(cv).toEqual({ tab: 'cv', label: 'Actualizar CV' });
  });

  it('siempre incluye los tabs empleos y academia', () => {
    for (const hasCv of [false, true]) {
      const tabs = buildHomeActions(hasCv).map(a => a.tab);
      expect(tabs).toContain('empleos');
      expect(tabs).toContain('academia');
    }
  });
});
