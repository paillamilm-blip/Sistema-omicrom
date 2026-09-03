// src/features/omicron/utils/typewriter.ts
// ═══════════════════════════════════════════════════════════════════════
// TYPEWRITER — Helper PURO para revelar un texto palabra por palabra.
//
// RESPUESTA VIVA (Inc 2): el proxy-ai NO hace streaming real (devuelve JSON,
// sin SSE), así que la sensación de "tiempo real" se logra con un typewriter
// del lado del cliente sobre el string final. Este módulo solo hace el
// troceo: NO importa React/framer/supabase/window, para que se pueda
// unit-testear sin mocks (mismo patrón que nodeUnlock.ts / homeStatus.ts /
// skillSynergy.ts).
//
// La idea: partir el texto en tokens que PRESERVAN los espacios y saltos de
// línea, de modo que al unir los tokens se reconstruye el original EXACTO.
// `wordPrefixes` devuelve los prefijos acumulados (uno por palabra); el
// ÚLTIMO prefijo es idéntico al texto de entrada.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Parte el texto en tokens que alternan palabra / espacio en blanco,
 * preservando TODO el whitespace (espacios múltiples, saltos de línea,
 * tabs) de modo que `splitIntoWords(text).join('') === text`.
 *
 * Ejemplos:
 *   splitIntoWords('Hola, mundo')        → ['Hola,', ' ', 'mundo']
 *   splitIntoWords('  a\n b ')           → ['  ', 'a', '\n ', 'b', ' ']
 *   splitIntoWords('')                   → []
 */
export function splitIntoWords(text: string): string[] {
  if (!text) return [];
  // \s+ captura cualquier corrida de whitespace (espacios, \n, \t) como un
  // solo token; \S+ captura cada palabra. La unión de todos reconstruye el
  // texto original sin pérdida.
  const tokens = text.match(/\s+|\S+/g);
  return tokens ?? [];
}

/**
 * Devuelve los prefijos acumulados del texto, revelando una PALABRA por
 * paso (el whitespace intermedio viaja junto a la palabra siguiente, así el
 * usuario ve aparecer la palabra completa). El último prefijo es EXACTAMENTE
 * el texto de entrada.
 *
 * Ejemplos:
 *   wordPrefixes('')            → []
 *   wordPrefixes('Hola')        → ['Hola']
 *   wordPrefixes('Hola, mundo') → ['Hola,', 'Hola, mundo']
 *   wordPrefixes('a b c')       → ['a', 'a b', 'a b c']
 *
 * Invariante: la última entrada, si existe, es igual al input; y todos los
 * prefijos son inicios reales del texto (text.startsWith(prefix)).
 */
export function wordPrefixes(text: string): string[] {
  if (!text) return [];

  const tokens = splitIntoWords(text);
  const prefixes: string[] = [];
  let acc = '';

  for (const token of tokens) {
    acc += token;
    // Solo emitimos un prefijo cuando el token es una PALABRA (contiene
    // algún carácter no-whitespace). El whitespace se acumula y viaja con la
    // palabra siguiente, evitando pasos "vacíos" que no cambian lo visible.
    if (/\S/.test(token)) {
      prefixes.push(acc);
    }
  }

  // Si el texto termina en whitespace (o es solo whitespace), garantizamos
  // que el último prefijo sea idéntico al input para que la reconstrucción
  // sea exacta.
  if (prefixes.length === 0 || prefixes[prefixes.length - 1] !== text) {
    prefixes.push(text);
  }

  return prefixes;
}
