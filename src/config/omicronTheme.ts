// src/config/omicronTheme.ts
// ═══════════════════════════════════════════════════════════════
// SISTEMA ÓMICRON · TEMA v5.0 "NEO-ACADÉMICO HOLOGRÁFICO"
// Fuente única de verdad para la nueva identidad visual.
// Paleta: cyan eléctrico + esmeralda + azul acero industrial + ámbar.
// (Sin morado — contraste tecnológico de energía limpia.)
// ═══════════════════════════════════════════════════════════════

export interface ThemeColors {
  background: {
    pure: string;     // Negro absoluto (contraste cuántico)
    void: string;     // Azul profundo base de la interfaz
    elevated: string; // Glassmorphism traslúcido para contenedores
  };
  neon: {
    cyan: string;      // Flujos activos, conexiones de red, energía limpia
    emerald: string;   // Validaciones del Gemelo, éxitos, accesos liberados
    steelBlue: string; // Bóveda de Conocimiento y Cajas Negras
    amber: string;     // Alertas, Simulador Contrarreloj, saldos de tokens
  };
}

export interface ThemeEffects {
  flowLines: string;
  glowPulse: string;
  blurGlass: string;
}

export interface OmicronThemeStructure {
  id: string;
  meta: { version: string; engine: string; style: string };
  styles: { colors: ThemeColors; effects: ThemeEffects };
}

export const OmicronTheme: OmicronThemeStructure = {
  id: 'omicron-v5-hologram',
  meta: {
    version: '5.0',
    engine: 'WebGL/WebGPU-Ready',
    style: 'Neo-Academic Cyberpunk Industrial',
  },
  styles: {
    colors: {
      background: {
        pure: '#000000',
        void: '#020613',
        elevated: 'rgba(8, 16, 38, 0.4)',
      },
      neon: {
        cyan: '#00F0FF',
        emerald: '#39FF14',
        steelBlue: '#005F73',
        amber: '#F59E0B',
      },
    },
    effects: {
      flowLines: 'animate-[dash_4s_linear_infinite] drop-shadow-[0_0_4px_#00f0ff]',
      glowPulse:
        'shadow-[0_0_15px_rgba(0,240,255,0.25)] hover:shadow-[0_0_25px_rgba(0,240,255,0.45)] transition-all duration-300 border-cyan-500/30',
      blurGlass:
        'backdrop-blur-2xl border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
    },
  },
};

// ── Atajos para uso en estilos inline (componentes sin Tailwind) ──
export const HOLO = {
  // Colores planos
  cyan: '#00F0FF',
  emerald: '#39FF14',
  steel: '#005F73',
  amber: '#F59E0B',
  pure: '#000000',
  void: '#020613',

  // Versiones translúcidas (glow / fills)
  cyanDim: 'rgba(0,240,255,0.40)',
  cyanFaint: 'rgba(0,240,255,0.12)',
  cyanGhost: 'rgba(0,240,255,0.05)',
  emeraldDim: 'rgba(57,255,20,0.40)',
  emeraldFaint: 'rgba(57,255,20,0.10)',
  steelDim: 'rgba(0,95,115,0.55)',
  steelFaint: 'rgba(0,95,115,0.18)',
  amberDim: 'rgba(245,158,11,0.45)',
  amberFaint: 'rgba(245,158,11,0.10)',

  // Superficies glassmorphism
  glass: 'rgba(8,16,38,0.40)',
  glassSolid: 'rgba(8,16,38,0.72)',
  locked: 'rgba(255,255,255,0.04)',
  lockedBorder: 'rgba(255,255,255,0.10)',
  grid: 'rgba(0,240,255,0.05)',
} as const;

// Sombras de glow reutilizables
export const HOLO_GLOW = {
  cyan: '0 0 18px rgba(0,240,255,0.45)',
  cyanSoft: '0 0 12px rgba(0,240,255,0.25)',
  emerald: '0 0 18px rgba(57,255,20,0.45)',
  amber: '0 0 18px rgba(245,158,11,0.5)',
  steel: '0 0 14px rgba(0,95,115,0.6)',
} as const;
