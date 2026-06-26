/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        omicron: {
          // === FONDOS (void industrial profundo) ===
          bg:       '#04060f',   // void absoluto
          surface:  '#070b18',   // superficie base
          card:     '#0b1124',   // tarjetas (glass se aplica en CSS)
          border:   '#1b2b52',   // borde base (neon se aplica en CSS)
          muted:    '#24365f',
          text:     '#dbeafe',   // texto frío casi blanco
          subtle:   '#8aa0c8',
          // === ACENTOS NEÓN (Industria 5.0) ===
          accent:   '#7c3aed',   // violeta eléctrico (primario)
          cyan:     '#00f3ff',   // cian holográfico
          magenta:  '#ff2bd6',   // magenta neón
          green:    '#00ff9f',   // verde ácido
          gold:     '#ffb800',   // ámbar industrial
          red:      '#ff3b5c',   // alerta neón
          blue:     '#2b8bff',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
