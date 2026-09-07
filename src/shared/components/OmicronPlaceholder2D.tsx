// shared/components/OmicronPlaceholder2D.tsx
// Placeholder de carga LIGERO en 2D — reemplaza a GeodesicOrb como fallback de
// Suspense / TabLoader (no como componente global; GeodesicOrb sigue vivo en
// sus 8+ pantallas). Un pulso sobrio en el color del usuario, con tokens de
// '@/theme'. Solo transform/opacity, <=300ms por ciclo del keyframe, y bajo
// prefers-reduced-motion se congela (sin loop) mostrando el estado visible.
//
// No usa framer-motion para no arrastrar dependencias en un fallback de carga:
// un keyframe CSS inyectado una sola vez basta y respeta reduced-motion por
// media query, igual que el resto del sistema.

import { useEffect } from 'react';

const CSS_ID = 'omicron-placeholder-2d-css';

/** Inyecta el keyframe una única vez. Reduced-motion lo detiene por CSS. */
function usePlaceholderCss(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    // Solo opacity + transform (scale), ciclo suave. El anillo exterior late
    // en contrafase para dar sensación de "cargando" sin brillos ni barridos.
    style.textContent = `
@keyframes omi-ph-core { 0%,100% { opacity:0.55; transform:scale(0.9); } 50% { opacity:1; transform:scale(1); } }
@keyframes omi-ph-ring { 0%,100% { opacity:0.15; transform:scale(1); } 50% { opacity:0.45; transform:scale(1.12); } }
.omi-ph-core { animation: omi-ph-core 1.6s cubic-bezier(0.4,0,0.2,1) infinite; transform-origin:center; transform-box:fill-box; }
.omi-ph-ring { animation: omi-ph-ring 1.6s cubic-bezier(0.4,0,0.2,1) infinite; transform-origin:center; transform-box:fill-box; }
@media (prefers-reduced-motion: reduce) {
  .omi-ph-core { animation:none; opacity:0.9; }
  .omi-ph-ring { animation:none; opacity:0.35; }
}
`;
    document.head.appendChild(style);
  }, []);
}

export interface OmicronPlaceholder2DProps {
  /** Lado del cuadrado en px. */
  size?: number;
  /** Color del usuario (hex). Quien lo llama pasa getUserColor()/useUserColor. */
  color: string;
}

/**
 * Pulso de carga 2D en el color del usuario. Un núcleo relleno tenue y un
 * anillo que respira alrededor: legible por FORMA (círculo + aro) incluso en
 * escala de grises, sin depender del color.
 */
export function OmicronPlaceholder2D({ size = 80, color }: OmicronPlaceholder2DProps) {
  usePlaceholderCss();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Cargando"
      style={{ display: 'block' }}
    >
      <circle
        className="omi-ph-ring"
        cx={50}
        cy={50}
        r={38}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      <circle
        className="omi-ph-core"
        cx={50}
        cy={50}
        r={16}
        fill={color}
        fillOpacity={0.22}
        stroke={color}
        strokeWidth={1.5}
      />
      <circle cx={50} cy={50} r={3.2} fill={color} />
    </svg>
  );
}
