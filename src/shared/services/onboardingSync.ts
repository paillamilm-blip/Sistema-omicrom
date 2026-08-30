// shared/services/onboardingSync.ts
// ═══════════════════════════════════════════════════════════════════════
// Sincronización del perfil del onboarding entre dispositivos (celu <-> web).
//
// El onboarding genera profesión + etiqueta de seniority + resumen + años +
// skills + 4 ejes. Vive localmente como perfil invitado en
// localStorage['omicron_guest_profile'] (ver guestMode.ts). Esta capa añade
// una caché de lectura y escritura contra Supabase, sin cambiar cómo funciona
// el modo invitado.
//
//   - persistOnboardingProfile     -> escritura (write-through): sube el
//     perfil del onboarding al perfil autenticado.
//   - hydrateOnboardingFromProfile -> lectura (read-through): baja el
//     onboarding del perfil a la caché local y marca "onboarding ya hecho".
//
// REGLA DE ORO (filosofía aditiva, 0077_cv_aditivo_suma_total.sql): el
// onboarding NUNCA debe pisar los datos más ricos del CV. Por eso la parte
// ADITIVA (skills / años / ejes / resumen) se sube por el RPC aditivo
// aplicar_analisis_cv (GREATEST/MERGE del lado servidor), y SOLO las columnas
// de presentación propias del onboarding (profession / seniorLabel /
// onboarding_completed_at) se escriben con un UPDATE directo (no hay riesgo
// de clobber en esas columnas).
//
// El modo invitado (sin sesión) sigue funcionando solo con localStorage: las
// escrituras a Supabase son no-op silenciosas si no hay usuario, y todo va
// envuelto en try/catch para no romper la experiencia local ante un fallo de
// red.
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from '@/infrastructure/supabase/client';
import type { GuestProfile } from '@/shared/utils/guestMode';
import { getGuestProfile, saveGuestProfile } from '@/shared/utils/guestMode';
import { hasCloudOnboarding, mergeOnboardingIntoLocal } from './onboarding';

// Misma clave que usa OrbOnboarding (marca síncrona de "onboarding hecho").
const ONBOARDING_DONE_KEY = 'omicron_onboarding_done';

// La lógica pura (reconciliación aditiva y el predicado hasCloudOnboarding)
// vive en ./onboarding, un módulo sin dependencia de Supabase. Se re-exporta
// para no romper a quienes lo importen desde aquí.
export { hasCloudOnboarding, mergeOnboardingIntoLocal } from './onboarding';

/**
 * Escritura (write-through): sube el perfil del onboarding al perfil de la
 * persona en Supabase. Si no hay sesión (invitado), es un no-op silencioso.
 *
 *   (a) La parte ADITIVA (skills / años / ejes / resumen) va por el RPC
 *       aplicar_analisis_cv, que aplica GREATEST/MERGE del lado servidor:
 *       así el onboarding jamás baja un eje ganado en el CV ni pisa skills.
 *   (b) Las columnas de presentación propias del onboarding
 *       (onboarding_profession / onboarding_senior_label /
 *       onboarding_completed_at) se escriben con un UPDATE directo, porque
 *       el flujo de CV no las gestiona y no hay riesgo de clobber.
 *
 * Todo va envuelto en try/catch para no romper la UX local ante un fallo de
 * red.
 */
export async function persistOnboardingProfile(guest: GuestProfile): Promise<void> {
  try {
    if (!guest) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // invitado: solo localStorage, sin crash

    // (a) Parte ADITIVA por el RPC aditivo (mismo mapeo de skills_detail que
    // usaba migrateGuestProfile). Ejes/skills/años/resumen se funden con
    // GREATEST/MERGE del lado servidor: nunca bajan un valor ya ganado.
    await supabase.rpc('aplicar_analisis_cv', {
      p_name: guest.profession,
      p_skills: guest.skills,
      p_exec: guest.axes.exec,
      p_qual: guest.axes.qual,
      p_trans: guest.axes.trans,
      p_fund: guest.axes.fund,
      p_years: guest.years,
      p_summary: guest.summary,
      p_skills_detail: guest.skills.map((s, i) => ({ name: s, pct: Math.max(40, 80 - i * 10) })),
    });

    // (b) Columnas de presentación propias del onboarding: UPDATE directo.
    // Mismo patrón de auto-actualización con RLS (id = auth.uid()).
    await supabase.from('profiles').update({
      onboarding_profession: guest.profession,
      onboarding_senior_label: guest.seniorLabel,
      onboarding_completed_at: new Date().toISOString(),
    }).eq('id', user.id);
  } catch {
    /* silencioso: el perfil local del onboarding ya quedó en localStorage */
  }
}

/**
 * Lectura (read-through): reconcilia el onboarding del perfil autenticado con
 * la caché local del invitado. Se llama cuando el perfil se materializa
 * (login / real-time).
 *
 *   (a) Si el perfil de la nube trae onboarding (hasCloudOnboarding) y el
 *       resultado reconciliado (mergeOnboardingIntoLocal) DIFIERE del perfil
 *       invitado local, se escribe con saveGuestProfile y se marca
 *       localStorage['omicron_onboarding_done']='true' (para que un
 *       dispositivo nuevo detecte que el onboarding ya fue hecho).
 *   (b) Si la nube NO trae onboarding pero el dispositivo SÍ tiene perfil
 *       local, se sube el local con persistOnboardingProfile.
 *
 * Todas las ramas comparan antes de escribir (guardas anti-bucle): solo
 * escriben cuando los valores difieren realmente. Nunca lanza.
 */
export function hydrateOnboardingFromProfile(
  profile: {
    profession?: string | null;
    years?: number | null;
    skills?: string[] | null;
    axes?: { exec?: number | null; qual?: number | null; trans?: number | null; fund?: number | null } | null;
    seniorLabel?: string | null;
    summary?: string | null;
    onboarding_profession?: string | null;
    onboarding_senior_label?: string | null;
    onboarding_completed_at?: string | null;
  } | null | undefined,
): void {
  try {
    if (!profile) return;

    const local = getGuestProfile();

    if (hasCloudOnboarding(profile)) {
      // (a) La nube manda: reconciliar y bajar a localStorage solo si cambia.
      // Se mapean las columnas del Profile a la forma que espera el
      // reconciliador puro (las columnas onboarding_* son las de presentación).
      const reconciled = mergeOnboardingIntoLocal(
        {
          profession: profile.onboarding_profession ?? profile.profession,
          years: profile.years,
          skills: profile.skills,
          axes: profile.axes,
          seniorLabel: profile.onboarding_senior_label ?? profile.seniorLabel,
          summary: profile.summary,
          onboarding_completed_at: profile.onboarding_completed_at,
        },
        local,
      );

      // Comparar antes de escribir (guarda anti-bucle): serialización estable
      // basta porque mergeOnboardingIntoLocal es determinista.
      if (JSON.stringify(reconciled) !== JSON.stringify(local)) {
        saveGuestProfile(reconciled);
      }
      if (typeof localStorage !== 'undefined' && localStorage.getItem(ONBOARDING_DONE_KEY) !== 'true') {
        localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
      }
      return;
    }

    // (b) La nube no tiene onboarding pero el dispositivo sí: subirlo.
    if (local) {
      void persistOnboardingProfile(local);
    }
  } catch {
    /* silencioso: la caché local del onboarding ya es válida */
  }
}
