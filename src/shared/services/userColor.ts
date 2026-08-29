// shared/services/userColor.ts
// ═══════════════════════════════════════════════════════════════════════
// Lógica PURA del color del Gemelo, aislada de Supabase.
//
// Este módulo NO importa el cliente de Supabase ni ColorPicker: la paleta
// oficial se inlinea aquí (mismos id/hex que COLOR_OPTIONS de ColorPicker)
// para mantener el módulo con dependencias mínimas y evitar arrastrar
// ColorPicker → spatialAudio (cuyo constructor usa window.matchMedia, que no
// existe en jsdom) dentro del entorno de Vitest de CI. Al separarlo del
// servicio de sincronización, las pruebas unitarias del helper puro pueden
// importarlo sin romper la carga del suite.
// ═══════════════════════════════════════════════════════════════════════

// Paleta oficial inlineada (debe mantenerse sincronizada con COLOR_OPTIONS
// de ColorPicker). resolveColorId solo necesita id y hex.
const COLOR_OPTIONS: ReadonlyArray<{ id: string; hex: string }> = [
  { id: 'ice', hex: '#7dd3fc' },
  { id: 'pink', hex: '#ff6b9d' },
  { id: 'gold', hex: '#ffb02e' },
  { id: 'lime', hex: '#84cc16' },
];

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
export function readLocalColor(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}
