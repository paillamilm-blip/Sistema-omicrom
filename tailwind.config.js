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
        },
        // === ÓMICRON CORE (tema premium holográfico · aditivo) ===
        // Convive con la paleta `omicron` clásica; se adopta pantalla a
        // pantalla. Valores espejo de src/design-system/tokens.ts.
        omicronCore: {
          bg:      '#0F172A',   // negro profundo (fondo principal)
          surface: '#1E293B',   // tarjetas / elementos secundarios
          card:    '#1E293B',
          cyan:    '#22D3EE',   // energía principal
          cyanSoft:'#67E8F9',
          cyanDeep:'#06B6D4',
          text:    '#F8FAFC',   // texto principal
          subtle:  '#94A3B8',   // texto secundario
          border:  'rgba(34,211,238,0.20)',
          success: '#34D399',
          warning: '#FBBF24',
          error:   '#F87171',
        },
      },
      borderRadius: {
        'omicron-card':   '20px',
        'omicron-button': '12px',
      },
      boxShadow: {
        'orb':        '0 0 60px rgba(34,211,238,0.25)',
        'glass-core': '0 8px 32px -8px rgba(0,0,0,0.45)',
      },
      backdropBlur: {
        glass: '16px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
