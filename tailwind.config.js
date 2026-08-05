// tailwind.config.js
// ═══════════════════════════════════════════════════════════════════════
// FUENTE ÚNICA DE VERDAD: src/theme.ts
// Los valores aquí son ESPEJO EXACTO de las constantes C, RADIUS, BLUR,
// EASING en src/theme.ts. Si cambiás un color, cambialo en theme.ts
// primero y luego actualizá este archivo para que coincidan.
//
// El namespace muerto "omicronCore" fue eliminado (era código no usado).
// ═══════════════════════════════════════════════════════════════════════

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        omicron: {
          // === FONDOS (Holo-Gemelo Premium · espejo de C en theme.ts) ===
          bg:       '#000206',                    // C.bg
          surface:  'rgba(12,16,30,0.86)',        // C.surface
          card:     'rgba(255,255,255,0.045)',     // C.glass
          border:   'rgba(150,180,255,0.14)',      // C.line
          muted:    '#6b7590',                     // C.mut
          text:     '#eaf0fb',                     // C.ink
          subtle:   '#6b7590',                     // C.mut
          // === ACENTOS (paleta Holo-Gemelo unificada) ===
          accent:   '#5cc8ff',                     // C.cyan — héroe SKY
          cyan:     '#5cc8ff',                     // C.cyan
          cyanDim:  'rgba(92,200,255,0.46)',       // C.cyanDim
          gold:     '#ffb02e',                     // C.gold — ÁMBAR
          goldDim:  'rgba(255,176,46,0.46)',       // C.goldDim
          purple:   '#5e5ce6',                     // C.purple — INDIGO
          purpleDim:'rgba(94,92,230,0.44)',        // C.purpleDim
          green:    '#3fd0c9',                     // C.green — TEAL
          greenDim: 'rgba(63,208,201,0.44)',       // C.greenDim
          red:      '#ff5c7a',                     // C.red — ROSA-ROJO
          redDim:   'rgba(255,92,122,0.44)',       // C.redDim
          // === ESTADOS (alias de los acentos) ===
          success:  '#3fd0c9',                     // = C.green
          warning:  '#ffb02e',                     // = C.gold
          error:    '#ff5c7a',                     // = C.red
        },
      },
      borderRadius: {
        'omicron-card':   '16px',    // RADIUS.lg
        'omicron-button': '12px',    // RADIUS.md
        'omicron-xl':     '22px',    // RADIUS.xl
        'omicron-pill':   '999px',   // RADIUS.pill
      },
      boxShadow: {
        'orb':         '0 0 60px rgba(92,200,255,0.46)',
        'glass-core':  '0 8px 32px -8px rgba(0,0,0,0.45)',
        'glow-cyan':   '0 0 18px rgba(92,200,255,0.45)',
        'glow-gold':   '0 0 18px rgba(255,176,46,0.42)',
        'glow-purple': '0 0 18px rgba(94,92,230,0.45)',
      },
      backdropBlur: {
        sm:    '8px',    // BLUR.sm
        glass: '16px',   // BLUR.md
        lg:    '24px',   // BLUR.lg
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      transitionTimingFunction: {
        'omicron': 'cubic-bezier(0.4,0,0.2,1)',   // EASING.standard
        'gentle':  'cubic-bezier(0.25,0.1,0.25,1)', // EASING.gentle
        'spring':  'cubic-bezier(0.34,1.56,0.64,1)', // EASING.spring
      },
    },
  },
  plugins: [],
};
