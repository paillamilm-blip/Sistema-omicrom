/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        omicron: {
          // === FONDOS (acero industrial profundo) ===
          bg:       '#06090f',
          surface:  '#0a0f17',
          card:     '#131b28',
          border:   '#1f3a5c',
          muted:    '#24365f',
          text:     '#eaf2ff',
          subtle:   '#7d93b0',
          // === ACENTOS (Industria 5.0 · azul héroe + ámbar) ===
          accent:   '#2e9bff',   // AZUL héroe (antes violeta)
          cyan:     '#2e9bff',
          magenta:  '#6fc3ff',   // azul claro (antes magenta)
          green:    '#2bd97c',
          gold:     '#ff9d2e',   // ÁMBAR acento
          red:      '#ff5066',
          blue:     '#2e9bff',
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
