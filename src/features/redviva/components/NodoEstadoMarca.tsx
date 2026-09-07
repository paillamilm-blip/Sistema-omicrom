import type { CSSProperties } from 'react';
import { C } from '@/theme';
import type { EstadoNodo } from '../services/redViva';

export const ESTADO_NODO_LABEL: Record<EstadoNodo, string> = {
  solido: 'Probada',
  latiendo: 'En prueba',
  hueco: 'Solo declarada',
  ausente: 'No la tenés',
};

/**
 * Variante de skin del nodo. 'circulo' es la gramática original (círculo con
 * marca para el estado probado). 'pieza' le da el "sabor A": el estado 'solido'
 * se dibuja como una pieza de rompecabezas ENCAJADA, conservando el check y el
 * mapeo estado -> forma. Los demás estados no cambian.
 */
export type VarianteNodo = 'circulo' | 'pieza';

interface NodoEstadoMarcaProps {
  estado: EstadoNodo;
  color: string;
  size?: number;
  style?: CSSProperties;
  variante?: VarianteNodo;
}

/**
 * Marca compartida por leyenda, filas e inspector. Cada estado cambia la forma
 * y el patrón, no solo el color: círculo con marca, aro, doble aro o hexágono.
 */
export function NodoEstadoMarca({
  estado,
  color,
  size = 14,
  style,
  variante = 'circulo',
}: NodoEstadoMarcaProps) {
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
      <NodoEstadoFormaSvg estado={estado} color={color} x={medio} y={medio} r={radio} variante={variante} />
    </svg>
  );
}

/**
 * Contorno de una pieza de rompecabezas centrada en (x, y). `s` es el
 * medio-lado. Lleva un tab (saliente) arriba y un blank (entrante) a la
 * derecha; abajo e izquierda son lados planos. Es solo presentación: sugiere el
 * "encaje" sin cambiar el significado del nodo. Se distingue en escala de
 * grises por su silueta, no por color.
 */
export function piezaRompecabezasPath(x: number, y: number, s: number): string {
  const nudo = s * 0.42; // profundidad del saliente/entrante
  const cuello = s * 0.34; // ancho del cuello del nudo
  const izq = x - s;
  const der = x + s;
  const arr = y - s;
  const aba = y + s;
  return (
    `M ${izq} ${arr} ` +
    `L ${x - cuello} ${arr} C ${x - cuello} ${arr - nudo} ${x + cuello} ${arr - nudo} ${x + cuello} ${arr} ` + // tab arriba
    `L ${der} ${arr} ` +
    `L ${der} ${y - cuello} C ${der + nudo} ${y - cuello} ${der + nudo} ${y + cuello} ${der} ${y + cuello} ` + // blank derecha
    `L ${der} ${aba} L ${izq} ${aba} Z`
  );
}

interface NodoEstadoFormaSvgProps {
  estado: EstadoNodo;
  color: string;
  x?: number;
  y?: number;
  r: number;
  className?: string;
  variante?: VarianteNodo;
}

/** Misma gramática de forma para el mapa SVG. */
export function NodoEstadoFormaSvg({
  estado,
  color,
  x = 0,
  y = 0,
  r,
  className,
  variante = 'circulo',
}: NodoEstadoFormaSvgProps) {
  if (estado === 'solido') {
    // El check es idéntico en ambas variantes: cambia solo el contorno relleno
    // (círculo o pieza encajada). El significado no cambia: probado = TUYO.
    const marca = (
      <path
        d={`M ${x - r * 0.48} ${y} L ${x - r * 0.1} ${y + r * 0.36} L ${x + r * 0.54} ${y - r * 0.38}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={Math.max(0.9, r * 0.24)}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: C.bg }}
      />
    );
    if (variante === 'pieza') {
      return (
        <g data-node-state={estado} data-node-variant="pieza">
          <path
            d={piezaRompecabezasPath(x, y, r * 0.92)}
            fill={color}
            stroke={color}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          {marca}
        </g>
      );
    }
    return (
      <g data-node-state={estado} data-node-variant="circulo">
        <circle cx={x} cy={y} r={r} fill={color} stroke={color} strokeWidth={1.2} />
        {marca}
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
