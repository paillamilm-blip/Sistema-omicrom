// shared/services/userColorSync.ts
// ═══════════════════════════════════════════════════════════════════════
// Sincronización del color del Gemelo entre dispositivos (teléfono <-> web).
//
// El color vive en localStorage['omicron_user_color'] como caché síncrona
// (getUserColor() debe seguir siendo síncrona: se usa en canvas, defaults
// de orbe y fallbacks de Suspense). Esta capa añade una caché de lectura y
// escritura contra Supabase, sin cambiar la firma ni la sincronicidad de
// getUserColor()/setUserColor().
//
//   - persistUserColor  -> escritura: sube el color al perfil (write-through)
//   - hydrateUserColorFromProfile -> lectura: baja el color del perfil a
//     localStorage y avisa a la app (read-through)
//
// El modo invitado (sin sesión) sigue funcionando solo con localStorage:
// las escrituras a Supabase son no-op silenciosas si no hay usuario.
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from '@/infrastructure/supabase/client';
import { COLOR_OPTIONS } from '@/shared/components/ColorPicker';

// Misma clave que usa ColorPicker (caché síncrona en el dispositivo).
const STORAGE_KEY = 'omicron_user_color';

/**
 * Helper PURO de validación. Devuelve el ID canónico del color si `value`
 * coincide con un id ('gold') o con un hex ('#ffb02e') de COLOR_OPTIONS.
 * Si no coincide (o es null/undefined) devuelve null. No toca localStorage
 * ni la red: es determinista y fácil de probar.
 */
export function resolveColorId(value: string | null | undefined): string | null {
  if (!value) return null;
  const found = COLOR_OPTIONS.find(c => c.id === value || c.hex === value);
  return found ? found.id : null;
}

/** Lee el valor crudo guardado en localStorage (o null si no existe). */
function readLocalColor(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Escritura (write-through): sube el color al perfil de la persona en
 * Supabase. NO toca localStorage (ColorPicker.setUserColor ya lo hace de
 * forma síncrona). Si no hay sesión (invitado), es un no-op silencioso.
 * Todo va envuelto en try/catch para no romper la selección de color ante
 * un fallo de red.
 */
export async function persistUserColor(colorId: string): Promise<void> {
  try {
    // Validar contra la paleta oficial antes de escribir en la base.
    const id = resolveColorId(colorId);
    if (!id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // invitado: solo localStorage, sin crash

    // Mismo patrón de auto-actualización con RLS que migrateGuestProfile.
    await supabase.from('profiles').update({ user_color: id }).eq('id', user.id);
  } catch {
    /* silencioso: la selección local ya quedó guardada en localStorage */
  }
}

/**
 * Lectura (read-through): reconcilia el color del perfil autenticado con la
 * caché local. Se llama cuando el perfil se materializa (login / realtime).
 *
 *   (a) Si el perfil trae un color válido y difiere del de localStorage,
 *       se escribe localStorage y se avisa a la app con el evento
 *       'omicron:color-changed' (para que useUserColor reaccione).
 *   (b) Si el perfil no trae color válido pero localStorage sí tiene uno,
 *       se sube el valor local al perfil (persistUserColor).
 *
 * Todas las ramas comparan antes de escribir (guardas anti-bucle): solo
 * escriben cuando los valores difieren realmente.
 */
export function hydrateUserColorFromProfile(profileColor: string | null | undefined): void {
  const profileId = resolveColorId(profileColor);
  const localId = resolveColorId(readLocalColor());

  if (profileId) {
    // (a) El perfil manda: bajar a localStorage solo si cambia. Se compara
    // el id canónico (no el valor crudo) para que una entrada antigua que
    // guardara el hex no fuerce una reescritura redundante en cada carga.
    if (localId !== profileId) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, profileId);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('omicron:color-changed'));
      }
    }
    return;
  }

  // (b) El perfil no tiene color válido pero el dispositivo sí: subirlo.
  if (localId) {
    void persistUserColor(localId);
  }
}
