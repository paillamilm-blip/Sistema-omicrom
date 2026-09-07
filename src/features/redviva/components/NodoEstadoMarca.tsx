import type { CSSProperties } from 'react';
import { C } from '@/theme';
import type { EstadoNodo } from '../services/redViva';

export const ESTADO_NODO_LABEL: Record<EstadoNodo, string> = {
  solido: 'Probada',
  latiendo: 'En prueba',
  hueco: 'Solo declarada',
  ausente: 'No la tenés',
};

interface NodoEstadoMarcaProps {
  estado: EstadoNodo;
  color: string;
  size?: number;
  style?: CSSProperties;
}

/**
 * Marca compartida por leyenda, filas e inspector. Cada estado cambia la forma
 * y el patrón, no solo el color: círculo con marca, aro, doble aro o hexágono.
 */
export function NodoEstadoMarca({ estado, color, size = 14, style }: NodoEstadoMarcaProps) {
  const medio = size / 2;
  const radio = Math.max(2, size * 0.31);
  return (
    <svg
      aria-hidden="true"
      data-node-state={estado}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <NodoEstadoFormaSvg estado={estado} color={color} x={medio} y={medio} r={radio} />
    </svg>
  );
}

interface NodoEstadoFormaSvgProps {
  estado: EstadoNodo;
  color: string;
  x?: number;
  y?: number;
  r: number;
  className?: string;
}

/** Misma gramática de forma para el mapa SVG. */
export function NodoEstadoFormaSvg({
  estado,
  color,
  x = 0,
  y = 0,
  r,
  className,
}: NodoEstadoFormaSvgProps) {
  if (estado === 'solido') {
    return (
      <g data-node-state={estado}>
        <circle cx={x} cy={y} r={r} fill={color} stroke={color} strokeWidth={1.2} />
        <path
          d={`M ${x - r * 0.48} ${y} L ${x - r * 0.1} ${y + r * 0.36} L ${x + r * 0.54} ${y - r * 0.38}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={Math.max(0.9, r * 0.24)}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: C.bg }}
        />
      </g>
    );
  }

  if (estado === 'latiendo') {
    return (
      <g data-node-state={estado}>
        <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={1.15} />
        <circle
          className={className}
          cx={x}
          cy={y}
          r={r * 0.48}
          fill="none"
          stroke={color}
          strokeWidth={1}
        />
        <circle cx={x} cy={y} r={Math.max(0.8, r * 0.14)} fill={color} />
      </g>
    );
  }

  if (estado === 'ausente') {
    const points = Array.from({ length: 6 }, (_, index) => {
      const angle = -Math.PI / 2 + index * Math.PI / 3;
      return `${x + Math.cos(angle) * r},${y + Math.sin(angle) * r}`;
    }).join(' ');
    return (
      <g data-node-state={estado}>
        <polygon
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          strokeDasharray={`${Math.max(1.5, r * 0.45)} ${Math.max(1.2, r * 0.3)}`}
          strokeLinejoin="round"
        />
        <path
          d={`M ${x - r * 0.3} ${y - r * 0.3} L ${x + r * 0.3} ${y + r * 0.3} M ${x + r * 0.3} ${y - r * 0.3} L ${x - r * 0.3} ${y + r * 0.3}`}
          stroke={color}
          strokeWidth={Math.max(0.8, r * 0.16)}
          strokeLinecap="round"
        />
      </g>
    );
  }

  return (
    <g data-node-state={estado}>
      <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={1.2} />
    </g>
  );
}
