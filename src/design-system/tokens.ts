// src/design-system/tokens.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON CORE · Design Tokens
// Fuente única de verdad para el tema premium holográfico "Ómicron Core".
//
// Estética: Mac / holográfica · dark mode elegante · glassmorphism sutil.
// Este sistema es ADITIVO: convive con el tema clásico (src/theme.ts) sin
// pisarlo. Se adopta pantalla por pantalla.
// ═══════════════════════════════════════════════════════════════════════

/** Paleta base de Ómicron Core. */
export const colors = {
  // Fondos y superficies (profundidad espacial por layering)
  bg: {
    primary:   '#0F172A', // negro profundo (slate-900) — fondo principal
    secondary: '#1E293B', // tarjetas / elementos secundarios (slate-800)
    tertiary:  '#334155', // superficies elevadas (slate-700)
  },
  // Texto
  text: {
    primary:   '#F8FAFC', // texto principal (slate-50)
    secondary: '#94A3B8', // texto secundario (slate-400)
    muted:     '#64748B', // texto atenuado (slate-500)
  },
  // Energía (color de acento holográfico)
  energy: {
    cyan:      '#22D3EE', // cyan energía principal
    cyanSoft:  '#67E8F9', // cyan claro (highlights del orbe)
    cyanDeep:  '#06B6D4', // cyan profundo (núcleo del orbe)
  },
  // Glassmorphism (bordes y superficies translúcidas)
  glass: {
    border:    'rgba(34, 211, 238, 0.20)', // borde cyan transparente
    borderHi:  'rgba(34, 211, 238, 0.40)', // borde cyan en hover / activo
    surface:   'rgba(30, 41, 59, 0.60)',   // superficie de vidrio
    surfaceHi: 'rgba(30, 41, 59, 0.80)',
    highlight: 'rgba(248, 250, 252, 0.06)', // brillo superior sutil
  },
  // Estados semánticos
  state: {
    success: '#34D399', // esmeralda
    warning: '#FBBF24', // ámbar
    error:   '#F87171', // rojo suave
    info:    '#22D3EE', // = energy.cyan
  },
} as const;

/** Radios de borde (esquinas suaves estilo Mac). */
export const radius = {
  none: '0px',
  sm:   '8px',
  md:   '12px',
  lg:   '20px',
  xl:   '28px',
  full: '9999px',
} as const;

/** Escala de espaciado (múltiplos de 4px). */
export const spacing = {
  xs:  '4px',
  sm:  '8px',
  md:  '16px',
  lg:  '24px',
  xl:  '40px',
  xxl: '64px',
} as const;

/** Desenfoques para glassmorphism. */
export const blur = {
  sm: '8px',
  md: '16px',
  lg: '24px',
} as const;

/** Capas (z-index) para profundidad espacial. */
export const zIndex = {
  base:    0,
  card:    10,
  orb:     20,
  overlay: 40,
  modal:   50,
  toast:   60,
} as const;

/** Curvas de easing premium (fluidas, nada exagerado). */
export const easing = {
  standard: [0.4, 0, 0.2, 1] as const,   // Material-like
  gentle:   [0.25, 0.1, 0.25, 1] as const,
  spring:   [0.34, 1.56, 0.64, 1] as const, // rebote sutil
} as const;

export type Colors = typeof colors;
export type Radius = typeof radius;
