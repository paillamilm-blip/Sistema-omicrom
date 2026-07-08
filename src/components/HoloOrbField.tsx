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

// Campo de estrellas (puntos diminutos vía múltiples radial-gradients).
const STARFIELD = [
  'radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,0.9), transparent)',
  'radial-gradient(1px 1px at 28% 62%, rgba(255,255,255,0.5), transparent)',
  'radial-gradient(1.5px 1.5px at 44% 12%, rgba(224,247,255,0.8), transparent)',
  'radial-gradient(1px 1px at 62% 74%, rgba(255,255,255,0.6), transparent)',
  'radial-gradient(1px 1px at 78% 30%, rgba(255,255,255,0.7), transparent)',
  'radial-gradient(1.5px 1.5px at 88% 60%, rgba(147,197,253,0.7), transparent)',
  'radial-gradient(1px 1px at 8% 82%, rgba(255,255,255,0.5), transparent)',
  'radial-gradient(1px 1px at 54% 90%, rgba(255,255,255,0.55), transparent)',
  'radial-gradient(1px 1px at 70% 8%, rgba(255,255,255,0.6), transparent)',
  'radial-gradient(1px 1px at 34% 40%, rgba(255,255,255,0.4), transparent)',
].join(', ');

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
      {/* Fondo espacial: nebulosa suave + campo de estrellas (recortado a
          esquinas redondeadas; los chips flotan por fuera sin recortarse). */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 16 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 44%, rgba(34,211,238,0.12), transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 72% 74%, rgba(124,58,237,0.12), transparent 55%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: STARFIELD, backgroundRepeat: 'no-repeat', opacity: 0.7 }} />
      </div>

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
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: `1px solid ${color}55`,
              boxShadow: `0 10px 28px -10px rgba(0,0,0,0.6), 0 0 14px -4px ${color}66, inset 0 1px 0 rgba(255,255,255,0.08)`,
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
