/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        omicron: {
          // === FONDOS (void holográfico v5.0) ===
          bg:       '#020613',   // void azul profundo absoluto
          surface:  '#0a1428',   // superficie elevada
          card:     '#0e1a36',   // tarjetas
          border:   '#0e4250',   // borde acero industrial (steel-blue)
          muted:    '#1c3a52',
          text:     '#eaf2ff',
          subtle:   '#7d93b0',
          // === ACENTOS (Neo-Académico Holográfico) ===
          accent:   '#00F0FF',   // CYAN eléctrico (flujos / energía limpia)
          cyan:     '#00F0FF',
          magenta:  '#7df9ff',   // cyan claro (hover / destacados)
          steel:    '#005F73',   // azul acero (Bóveda / cajas negras)
          green:    '#39FF14',   // esmeralda (validado / éxito)
          gold:     '#F59E0B',   // ÁMBAR (alertas / simulador / tokens)
          red:      '#ff5066',
          blue:     '#00F0FF',
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
