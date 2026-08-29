// theme/typography.ts
// ═══════════════════════════════════════════════════════════════════════
// Fuentes, escala tipográfica y estilos premium.
//
// ESCALA: harmónica con ratio ~1.25 (Major Third), inspirada en Apple HIG.
// Cada tamaño tiene un propósito claro → no hay "magic numbers" sueltos.
// ═══════════════════════════════════════════════════════════════════════

const SANS = "-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',system-ui,sans-serif";
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,monospace";

export const FONT = {
  mono:    MONO,
  display: SANS,
  body:    SANS,
} as const;

/**
 * Escala de font-size (px). Usar SIEMPRE estos valores.
 * Si necesitas un tamaño que no está aquí → NO lo inventes, usa el más cercano.
 *
 *   xxs → labels de sistema, badges, contadores tiny
 *   xs  → eyebrows, tags, chips, hints
 *   sm  → body secundario, captions, metadata
 *   md  → body principal (16px = base de legibilidad móvil)
 *   lg  → subtítulos, card titles
 *   xl  → títulos de sección
 *   xxl → hero numbers, stat values
 *   hero → display headlines
 */
export const SIZE = {
  xxs: 9,
  xs:  11,
  sm:  13,
  md:  15,
  lg:  17,
  xl:  20,
  xxl: 24,
  hero: 32,
} as const;

export const FONT_STYLE = {
  /** Tags, badges, eyebrows (ÓMICROM, CÓMO MEJORAR, etc.) */
  label:    { fontFamily: MONO, fontSize: SIZE.xxs, letterSpacing: 1.4, textTransform: 'uppercase' as const },
  /** Code, counters */
  mono:     { fontFamily: MONO, fontSize: SIZE.sm },
  /** Card titles, section headers */
  title:    { fontFamily: SANS, fontWeight: 700 as const, fontSize: SIZE.xl, letterSpacing: -0.3 },
  /** Subtítulos, metadata  */
  subtitle: { fontFamily: MONO, fontSize: SIZE.xs, letterSpacing: 0.5 },
  /** Body text */
  body:     { fontFamily: SANS, fontSize: SIZE.md, lineHeight: 1.5 },
  /** Chips, small interactive text */
  chip:     { fontFamily: MONO, fontSize: SIZE.xs, letterSpacing: 0.4 },
  /** Input text */
  input:    { fontFamily: SANS, fontSize: SIZE.md },
  /** Stat values (big numbers) */
  stat:     { fontFamily: SANS, fontWeight: 800 as const, fontSize: SIZE.xl, letterSpacing: -0.5 },
} as const;

// Re-export raw values for use in BASE styles
export { SANS, MONO };
