// src/design-system/theme.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON CORE · Theme
// Objeto de tema semántico derivado de los tokens. Úsalo en estilos inline
// o como referencia. Los helpers de Tailwind viven en tailwind.config.js.
// ═══════════════════════════════════════════════════════════════════════
import { colors, radius, blur, easing } from './tokens';

export const theme = {
  colors: {
    background: colors.bg.primary,
    surface:    colors.bg.secondary,
    card:       colors.bg.secondary,
    text: {
      primary:   colors.text.primary,
      secondary: colors.text.secondary,
      muted:     colors.text.muted,
    },
    primary: colors.energy.cyan,
    energy:  colors.energy.cyan,
    border:  colors.glass.border,
    glass:   colors.glass,
    state:   colors.state,
  },
  radius: {
    card:   radius.lg,
    orb:    radius.full,
    button: radius.md,
    pill:   radius.full,
  },
  blur,
  shadows: {
    // Glow del orbe (halo cyan). El "40" es el alfa en hex (~25%).
    orb:     `0 0 60px ${colors.energy.cyan}40`,
    orbSoft: `0 0 40px ${colors.energy.cyan}26`,
    card:    '0 10px 30px -10px rgba(0, 0, 0, 0.35)',
    // Vidrio: sombra profunda + brillo interior sutil
    glass:   '0 8px 32px -8px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(248,250,252,0.06)',
  },
  transition: {
    default: `all 0.25s cubic-bezier(${easing.standard.join(', ')})`,
    slow:    `all 0.4s cubic-bezier(${easing.gentle.join(', ')})`,
    spring:  `all 0.5s cubic-bezier(${easing.spring.join(', ')})`,
  },
} as const;

export type Theme = typeof theme;

// ───────────────────────────────────────────────────────────────────────
// Referencia para Tailwind. La config real y activa está en
// tailwind.config.js (extend.colors.omicronCore). Este export se mantiene
// como documentación / fuente compartida de los valores.
// ───────────────────────────────────────────────────────────────────────
export const tailwindConfig = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        omicronCore: {
          bg:      colors.bg.primary,
          surface: colors.bg.secondary,
          card:    colors.bg.secondary,
          cyan:    colors.energy.cyan,
          text:    colors.text.primary,
          subtle:  colors.text.secondary,
          border:  colors.glass.border,
        },
      },
      borderRadius: {
        'omicron-card':   radius.lg,
        'omicron-button': radius.md,
      },
    },
  },
};
