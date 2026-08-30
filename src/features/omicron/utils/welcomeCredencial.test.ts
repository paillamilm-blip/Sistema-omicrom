// src/features/omicron/utils/welcomeCredencial.test.ts
// Pruebas del helper puro que decide la bienvenida por Credencial.
// Ejercitan la lógica real: fallarían si se removiera cualquier guarda
// (invitado, ya-mostrado, mitad de flujo o estado incorrecto).

import { describe, it, expect } from 'vitest';
import {
  shouldShowWelcomeCredencial,
  type WelcomeCredencialInput,
} from './welcomeCredencial';

// Caso base "todo verde": autenticado, en el orbe, onboarding hecho,
// sin mostrar aún y sin ningún flujo en conflicto.
function baseInput(): WelcomeCredencialInput {
  return {
    isAuthenticated: true,
    state: 'orb',
    onboardingDone: true,
    alreadyShown: false,
    showConvalida: false,
    showCredencial: false,
    showPremium: false,
  };
}

describe('shouldShowWelcomeCredencial', () => {
  it('autenticado + orbe + onboarding + no mostrado + sin flujo -> true', () => {
    expect(shouldShowWelcomeCredencial(baseInput())).toBe(true);
  });

  it('invitado (isAuthenticated=false) -> false (falla si se remueve la guarda de auth)', () => {
    expect(
      shouldShowWelcomeCredencial({ ...baseInput(), isAuthenticated: false }),
    ).toBe(false);
  });

  it('ya mostrado en la sesión (alreadyShown=true) -> false (falla si se remueve la guarda de sesión)', () => {
    expect(
      shouldShowWelcomeCredencial({ ...baseInput(), alreadyShown: true }),
    ).toBe(false);
  });

  it('onboarding incompleto -> false', () => {
    expect(
      shouldShowWelcomeCredencial({ ...baseInput(), onboardingDone: false }),
    ).toBe(false);
  });

  it('flujo de CV abierto (showConvalida=true) -> false', () => {
    expect(
      shouldShowWelcomeCredencial({ ...baseInput(), showConvalida: true }),
    ).toBe(false);
  });

  it('credencial ya abierta (showCredencial=true) -> false (evita reabrir)', () => {
    expect(
      shouldShowWelcomeCredencial({ ...baseInput(), showCredencial: true }),
    ).toBe(false);
  });

  it('upsell premium abierto (showPremium=true) -> false', () => {
    expect(
      shouldShowWelcomeCredencial({ ...baseInput(), showPremium: true }),
    ).toBe(false);
  });

  it('estado "preview" -> false', () => {
    expect(
      shouldShowWelcomeCredencial({ ...baseInput(), state: 'preview' }),
    ).toBe(false);
  });

  it('estado "fullscreen" -> false', () => {
    expect(
      shouldShowWelcomeCredencial({ ...baseInput(), state: 'fullscreen' }),
    ).toBe(false);
  });
});
