// shared/services/userColor.ts
// ═══════════════════════════════════════════════════════════════════════
// Lógica PURA del color del Gemelo, aislada de Supabase.
//
// Este módulo NO importa el cliente de Supabase: solo depende de la paleta
// oficial (COLOR_OPTIONS de ColorPicker) y de localStorage. Al separarlo del
// servicio de sincronización, las pruebas unitarias del helper puro pueden
// importarlo sin arrastrar el cliente de Supabase (que lee variables de
// entorno al inicializarse y rompería en el entorno de Vitest de CI).
// ═══════════════════════════════════════════════════════════════════════

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
export function readLocalColor(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}
