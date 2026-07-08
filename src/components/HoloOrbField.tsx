// src/components/HoloOrbField.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON CORE · HoloOrbField
// La "constelación": un orbe central rodeado de tarjetas de vidrio
// (chips) que flotan en posiciones radiales, conectadas al orbe por
// líneas finas con un punto luminoso — el patrón de la visión del usuario
// ("tú eres el orbe... tus datos flotando a tu alrededor").
//
// Aditivo: usa el componente Orb + glassmorphism inline. No toca el tema
// clásico. Cada chip se posiciona con coordenadas (x, y) en % del
// contenedor (0-100), lo que permite componer la constelación a mano.
// ═══════════════════════════════════════════════════════════════════════
import { motion } from 'framer-motion';
import { Orb, type OrbVariant, type OrbState, type OrbSize } from './Orb';

export interface OrbChip {
  label: string;
  value: string;
  color?: string;
  /** Posición del chip en el contenedor, en % (0-100). */
  x: number;
  y: number;
}

interface HoloOrbFieldProps {
  variant?: OrbVariant;
  orbState?: OrbState;
  orbSize?: OrbSize;
  /** Contenido central del orbe (p. ej. la reputación). */
  center?: React.ReactNode;
  chips: OrbChip[];
  /** Alto del contenedor en px. */
  height?: number;
  ariaLabel?: string;
}

const CYAN = '#22D3EE';

export function HoloOrbField({
  variant = 'identity',
  orbState = 'idle',
  orbSize = 'md',
  center,
  chips,
  height = 320,
  ariaLabel,
}: HoloOrbFieldProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height }} aria-label={ariaLabel}>
      {/* Líneas conectoras (constelación). El orbe se dibuja encima y oculta
          el segmento interior, dando el efecto de conectar con su superficie. */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
      >
        {chips.map((c, i) => (
          <line
            key={`line-${i}`}
            x1={c.x} y1={c.y} x2={50} y2={50}
            stroke={c.color ?? CYAN}
            strokeWidth={1}
            strokeOpacity={0.3}
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Punto luminoso sobre cada línea (nodo de conexión) */}
      {chips.map((c, i) => {
        const dotX = c.x + (50 - c.x) * 0.2;
        const dotY = c.y + (50 - c.y) * 0.2;
        return (
          <span
            key={`dot-${i}`}
            style={{
              position: 'absolute', left: `${dotX}%`, top: `${dotY}%`,
              transform: 'translate(-50%, -50%)',
              width: 6, height: 6, borderRadius: '50%',
              background: c.color ?? CYAN,
              boxShadow: `0 0 8px ${c.color ?? CYAN}`,
              zIndex: 2, pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* Orbe central */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 3 }}>
        <Orb variant={variant} state={orbState} size={orbSize} ariaLabel={ariaLabel}>
          {center}
        </Orb>
      </div>

      {/* Tarjetas de vidrio flotando */}
      {chips.map((c, i) => {
        const color = c.color ?? CYAN;
        return (
          <motion.div
            key={`chip-${i}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
            transition={{
              opacity: { duration: 0.4, delay: i * 0.08 },
              scale: { duration: 0.4, delay: i * 0.08 },
              y: { duration: 4 + i * 0.35, repeat: Infinity, ease: 'easeInOut' },
            }}
            style={{
              position: 'absolute', left: `${c.x}%`, top: `${c.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 4,
              padding: '7px 12px', borderRadius: 14,
              background: 'rgba(30, 41, 59, 0.55)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: `1px solid ${color}44`,
              boxShadow: `0 8px 24px -8px rgba(0,0,0,0.55), 0 0 12px -4px ${color}55`,
              minWidth: 60, textAlign: 'center', pointerEvents: 'none',
            }}
          >
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 7.5, letterSpacing: 1,
              color, textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}>
              {c.label}
            </div>
            <div style={{
              fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15,
              color: '#F8FAFC', marginTop: 2, lineHeight: 1, whiteSpace: 'nowrap',
            }}>
              {c.value}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default HoloOrbField;
