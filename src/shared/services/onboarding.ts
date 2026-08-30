// shared/services/onboarding.ts
// ═══════════════════════════════════════════════════════════════════════
// Lógica PURA de reconciliación del onboarding, aislada de Supabase.
//
// Este módulo NO importa el cliente de Supabase ni componentes de UI: solo
// depende del TIPO GuestProfile (de '@/shared/utils/guestMode', que a su vez
// es Supabase-free). Se mantiene con dependencias mínimas para que las
// pruebas unitarias del helper puro puedan importarlo sin arrastrar el
// cliente de Supabase (que lee variables de entorno al inicializarse) ni
// componentes que rompen jsdom (p. ej. spatialAudio → window.matchMedia).
//
// FILOSOFÍA ADITIVA (0077_cv_aditivo_suma_total.sql): el onboarding
// COMPLEMENTA, nunca sobrescribe, la información más rica del CV. Aquí se
// replica ese criterio en memoria: ejes GREATEST, skills unión, años
// GREATEST, textos prefieren el valor no vacío. La escritura real contra la
// base pasa por el RPC aplicar_analisis_cv (que aplica lo mismo del lado
// servidor); esta función solo reconcilia la caché local del invitado.
// ═══════════════════════════════════════════════════════════════════════

import type { GuestProfile } from '@/shared/utils/guestMode';

/**
 * Forma mínima "tipo perfil" que necesita hasCloudOnboarding: solo las
 * columnas que delatan que ya hubo onboarding sincronizado en la nube. Se
 * declara laxa (todas opcionales) para aceptar tanto un Profile completo
 * como un objeto parcial en las pruebas.
 */
export interface OnboardingProfileLike {
  onboarding_completed_at?: string | null;
  skills?: string[] | null;
}

/**
 * Predicado PURO: ¿el perfil de la nube trae datos de onboarding?
 * Verdadero si tiene marca de onboarding_completed_at O si ya trae skills.
 * Determinista, sin efectos secundarios.
 */
export function hasCloudOnboarding(profile: OnboardingProfileLike | null | undefined): boolean {
  if (!profile) return false;
  if (typeof profile.onboarding_completed_at === 'string' && profile.onboarding_completed_at !== '') {
    return true;
  }
  return Array.isArray(profile.skills) && profile.skills.length > 0;
}

/** Elige el primer texto no vacío (tras recortar espacios); si ninguno, cadena vacía. */
function preferNonEmpty(a: string | null | undefined, b: string | null | undefined): string {
  const ta = (a ?? '').trim();
  if (ta !== '') return ta;
  const tb = (b ?? '').trim();
  return tb;
}

/** Unión de dos listas de skills sin duplicados (case-insensitive), conservando el orden. */
function mergeSkills(
  a: string[] | null | undefined,
  b: string[] | null | undefined,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of [a ?? [], b ?? []]) {
    for (const raw of list) {
      const skill = (raw ?? '').trim();
      if (skill === '') continue;
      const key = skill.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(skill);
    }
  }
  return out;
}

/**
 * Reconciliador PURO: combina el perfil de la nube (cloud) con el perfil
 * invitado local (local) aplicando la filosofía aditiva en memoria y
 * devuelve el GuestProfile resultante. Es determinista y sin efectos:
 *
 *   · axes: GREATEST por eje (nunca baja un eje ganado en el CV)
 *   · skills: unión sin duplicados
 *   · years: GREATEST
 *   · profession / seniorLabel / summary: prefiere el valor no vacío,
 *     dando prioridad al de la nube cuando trae onboarding_completed_at
 *   · createdAt: se conserva el del local si existe; si no, el de la nube
 *
 * `cloud` es una forma laxa (no un GuestProfile estricto) porque la nube
 * expone las columnas del Profile; se mapean por nombre.
 */
export function mergeOnboardingIntoLocal(
  cloud: {
    profession?: string | null;
    years?: number | null;
    skills?: string[] | null;
    axes?: { exec?: number | null; qual?: number | null; trans?: number | null; fund?: number | null } | null;
    seniorLabel?: string | null;
    summary?: string | null;
    onboarding_completed_at?: string | null;
    createdAt?: string | null;
  } | null | undefined,
  local: GuestProfile | null | undefined,
): GuestProfile {
  const c = cloud ?? {};
  const l = local ?? null;

  const cloudLeads = typeof c.onboarding_completed_at === 'string' && c.onboarding_completed_at !== '';

  const cAxes = c.axes ?? {};
  const lAxes = l?.axes ?? { exec: 0, qual: 0, trans: 0, fund: 0 };

  // Ejes: GREATEST (nunca baja un eje ya ganado).
  const axes = {
    exec: Math.max(cAxes.exec ?? 0, lAxes.exec ?? 0),
    qual: Math.max(cAxes.qual ?? 0, lAxes.qual ?? 0),
    trans: Math.max(cAxes.trans ?? 0, lAxes.trans ?? 0),
    fund: Math.max(cAxes.fund ?? 0, lAxes.fund ?? 0),
  };

  // Textos: si la nube manda (tiene onboarding_completed_at) se prioriza su
  // valor no vacío; si no, se prioriza el local.
  const profession = cloudLeads
    ? preferNonEmpty(c.profession, l?.profession)
    : preferNonEmpty(l?.profession, c.profession);
  const seniorLabel = cloudLeads
    ? preferNonEmpty(c.seniorLabel, l?.seniorLabel)
    : preferNonEmpty(l?.seniorLabel, c.seniorLabel);
  const summary = cloudLeads
    ? preferNonEmpty(c.summary, l?.summary)
    : preferNonEmpty(l?.summary, c.summary);

  return {
    profession,
    years: Math.max(c.years ?? 0, l?.years ?? 0),
    skills: mergeSkills(c.skills, l?.skills),
    axes,
    seniorLabel,
    summary,
    // Se conserva el createdAt del dispositivo si ya existe (marca de cuándo
    // se generó localmente); si no, cae al de la nube o "ahora".
    createdAt: preferNonEmpty(l?.createdAt, c.createdAt) || new Date().toISOString(),
  };
}
