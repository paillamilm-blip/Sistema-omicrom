// src/features/omicron/utils/orbHomeGuide.ts
// ═══════════════════════════════════════════════════════════════════════
// Helpers PUROS para la superficie de bienvenida del orbe (OrbHomeGuide).
//
// Este módulo NO importa React, framer-motion, Supabase ni nada que toque
// window / matchMedia, de modo que puede probarse con Vitest sin mocks
// pesados (un test previo se rompió al importar transitivamente un
// componente que usaba window.matchMedia vía useReducedMotion).
// ═══════════════════════════════════════════════════════════════════════

// ── Entrada laxa: solo nos interesan los campos de nombre del perfil ──
export interface GreetingProfileLike {
  display_name?: string | null;
  full_name?: string | null;
  username?: string | null;
}

// Fallbacks genéricos que NO son un nombre real: se tratan como sin-nombre.
const GENERIC_FALLBACKS = new Set(['operador', 'amigo']);

/**
 * Resuelve el nombre a mostrar en el saludo siguiendo la precedencia ya
 * usada en OrbShell: display_name > full_name > username. Recorta espacios
 * y devuelve '' cuando el valor está vacío o es un fallback genérico
 * ('operador' / 'amigo').
 */
export function resolveGreetingName(profile: GreetingProfileLike | null | undefined): string {
  if (!profile) return '';
  const candidates = [profile.display_name, profile.full_name, profile.username];
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (GENERIC_FALLBACKS.has(trimmed.toLowerCase())) continue;
    return trimmed;
  }
  return '';
}

/**
 * Construye la línea de saludo. Con nombre no vacío:
 *   'Hola, {name} · tu Gemelo está activo'
 * Sin nombre:
 *   'Hola · tu Gemelo está activo'
 */
export function buildGreeting(name: string): string {
  const clean = (name ?? '').trim();
  return clean
    ? `Hola, ${clean} · tu Gemelo está activo`
    : 'Hola · tu Gemelo está activo';
}

// ── Chip de acción tocable ──────────────────────────────────────────
export interface HomeAction {
  label: string;
  tab: string;
}

/**
 * Construye hasta 3 chips de acción tocables.
 * - Si NO hay CV: el primer chip es { label: 'Sube tu CV', tab: 'cv' }.
 * - Si HAY CV: se incluye { label: 'Actualizar CV', tab: 'cv' }.
 * - Siempre se incluyen 'Ver empleos que te calzan' (empleos) y
 *   'Subir tu reputación' (academia).
 * El arreglo se limita a 3 chips como máximo.
 */
export function buildHomeActions(hasCv: boolean): HomeAction[] {
  const cvChip: HomeAction = hasCv
    ? { label: 'Actualizar CV', tab: 'cv' }
    : { label: 'Sube tu CV', tab: 'cv' };
  const actions: HomeAction[] = [
    cvChip,
    { label: 'Ver empleos que te calzan', tab: 'empleos' },
    { label: 'Subir tu reputación', tab: 'academia' },
  ];
  return actions.slice(0, 3);
}
