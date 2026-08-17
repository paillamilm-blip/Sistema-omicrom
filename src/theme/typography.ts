// theme/typography.ts
// Fuentes y estilos tipográficos premium

const SANS = "-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',system-ui,sans-serif";
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,monospace";

export const FONT = {
  mono:    MONO,
  display: SANS,
  body:    SANS,
} as const;

export const FONT_STYLE = {
  label:    { fontFamily: MONO, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' as const },
  mono:     { fontFamily: MONO },
  title:    { fontFamily: SANS, fontWeight: 700 as const, letterSpacing: -0.2 },
  subtitle: { fontFamily: MONO, fontSize: 10, letterSpacing: 0.5 },
} as const;

// Re-export raw values for use in BASE styles
export { SANS, MONO };
