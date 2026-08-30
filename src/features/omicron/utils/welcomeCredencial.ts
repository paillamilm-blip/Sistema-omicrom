// src/features/omicron/utils/welcomeCredencial.ts
// ═══════════════════════════════════════════════════════════════════════
// Helper PURO para decidir si la Credencial Ómicrom debe auto-abrirse como
// bienvenida la PRIMERA VEZ de cada sesión de navegador.
//
// Este módulo NO importa React, framer-motion, Supabase ni nada que toque
// window / matchMedia, de modo que puede probarse con Vitest sin mocks
// pesados (mismo criterio que orbHomeGuide.ts: un test previo se rompió al
// importar transitivamente un componente que usaba window.matchMedia vía
// useReducedMotion).
// ═══════════════════════════════════════════════════════════════════════

// ── Entrada laxa: solo señales de estado, sin dependencias de UI ─────
export interface WelcomeCredencialInput {
  /** true cuando hay sesión autenticada (proxy en OrbShell: !!sbProfile?.id). */
  isAuthenticated: boolean;
  /** Estado de la shell: 'orb' | 'preview' | 'fullscreen'. */
  state: string;
  /** Onboarding completado (localStorage o confirmación de la nube). */
  onboardingDone: boolean;
  /** Ya se mostró en esta sesión (sessionStorage 'omicron_welcome_credencial_shown'). */
  alreadyShown: boolean;
  /** Modal de subida/actualización de CV abierto. */
  showConvalida: boolean;
  /** La Credencial ya está abierta (evita reabrir/duplicar). */
  showCredencial: boolean;
  /** Upsell premium abierto. */
  showPremium: boolean;
}

/**
 * Decide si la Credencial debe auto-abrirse como bienvenida.
 *
 * Devuelve true SOLO cuando:
 *   - hay sesión autenticada, y
 *   - la shell está en el home del orbe (state === 'orb'), y
 *   - el onboarding está completo, y
 *   - todavía no se mostró en esta sesión, y
 *   - no hay ningún flujo/modal en conflicto abierto
 *     (ConvalidaOmicron, la propia Credencial ni el upsell premium).
 *
 * En cualquier otro caso devuelve false. Nunca se abre para invitados,
 * ni a mitad de un flujo, ni en estados 'preview' / 'fullscreen'.
 */
export function shouldShowWelcomeCredencial(input: WelcomeCredencialInput): boolean {
  return (
    input.isAuthenticated &&
    input.state === 'orb' &&
    input.onboardingDone &&
    !input.alreadyShown &&
    !input.showConvalida &&
    !input.showCredencial &&
    !input.showPremium
  );
}
