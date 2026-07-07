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
          // ♿ Accesibilidad: tonos oscurecidos (~10-15%) respecto a la
          // versión original para subir el contraste y evitar el zoom.
          accent:   '#00D6E6',   // CYAN eléctrico (flujos / energía limpia)
          cyan:     '#00D6E6',
          magenta:  '#5ad6e6',   // cyan claro (hover / destacados)
          steel:    '#045A68',   // azul acero (Bóveda / cajas negras)
          green:    '#2FE014',   // esmeralda (validado / éxito)
          gold:     '#E08A00',   // ÁMBAR (alertas / simulador / tokens)
          red:      '#FF3D57',
          blue:     '#00D6E6',
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
