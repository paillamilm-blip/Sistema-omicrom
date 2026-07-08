// src/components/Orb.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON CORE · Orb
// El orbe holográfico: elemento central que cambia de significado según la
// pantalla mediante `variant`:
//   · 'digital-twin'    → Inicio: Gemelo Digital (centro del universo)
//   · 'learning-system' → Academia: Sistema Solar del Aprendizaje
//   · 'identity'        → Perfil: "Tú eres el orbe" (identidad personal)
//
// Animación: Framer Motion (orbe + halos) · GSAP (barrido holográfico en
// una capa aislada, para no competir por el mismo transform).
// Respeta `prefers-reduced-motion`.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useCallback } from 'react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import { gsap } from 'gsap';

export type OrbState = 'idle' | 'loading' | 'success' | 'celebration' | 'error';
export type OrbSize = 'sm' | 'md' | 'lg';
export type OrbVariant = 'digital-twin' | 'learning-system' | 'identity';

interface OrbProps {
  state?: OrbState;
  size?: OrbSize;
  variant?: OrbVariant;
  onClick?: () => void;
  onLongPress?: () => void;
  /** Contenido central opcional (p. ej. reputación, iniciales, ícono). */
  children?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

const SIZE_PX: Record<OrbSize, number> = { sm: 120, md: 180, lg: 240 };

// El núcleo del gradiente cambia de tinte según el rol del orbe en la pantalla.
// Bordes profundos (índigo/violeta) + punto de luz desplazado → esfera con
// profundidad espacial en vez de una bola plana. El centro geométrico queda
// en tono medio para que el contenido (reputación) sea legible.
const CORE_GRADIENT: Record<OrbVariant, string> = {
  'digital-twin':
    'radial-gradient(circle at 40% 34%, #CFFAFE 0%, #22D3EE 34%, #1E40AF 68%, #1E1B4B 92%)',
  'learning-system':
    'radial-gradient(circle at 40% 34%, #CFFAFE 0%, #22D3EE 36%, #0E7490 66%, #164E63 92%)',
  'identity':
    'radial-gradient(circle at 40% 34%, #E0F7FF 0%, #38BDF8 34%, #3730A3 70%, #2E1065 92%)',
};

const LONG_PRESS_MS = 500;

export const Orb = ({
  state = 'idle',
  size = 'md',
  variant = 'digital-twin',
  onClick,
  onLongPress,
  children,
  ariaLabel,
  className = '',
}: OrbProps) => {
  const reduceMotion = useReducedMotion();
  const px = SIZE_PX[size];
  // Interactivo solo si hay handler; si no, es decorativo (role="img"),
  // evitando "botones fantasma" sin acción (accesibilidad).
  const interactive = !!(onClick || onLongPress);

  const isLoading = state === 'loading';
  const isCelebrating = state === 'celebration';
  const isError = state === 'error';
  const isSuccess = state === 'success';

  // ── Long-press accesible (pointer + teclado), sin secuestrar el menú ──
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const startPress = useCallback(() => {
    if (!onLongPress) return;
    longPressFired.current = false;
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }, [onLongPress]);

  const cancelPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    // Si ya disparó el long-press, no dispares también el click.
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onClick?.();
  }, [onClick]);

  useEffect(() => cancelPress, [cancelPress]);

  // ── GSAP: barrido de luz holográfico en una capa propia (no compite con
  //     los transforms de Framer Motion del orbe/halos) ──────────────────
  const sweepRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sweepRef.current;
    if (!el || reduceMotion) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { xPercent: -140, opacity: 0 },
        {
          xPercent: 140,
          opacity: 0.65,
          duration: isLoading ? 1.6 : 3.2,
          ease: 'power2.inOut',
          repeat: -1,
          repeatDelay: isLoading ? 0.2 : 1.4,
          yoyo: false,
        },
      );
    }, el);
    return () => ctx.revert();
  }, [isLoading, reduceMotion]);

  // ── Halo exterior ─────────────────────────────────────────────────────
  const haloColor = isError
    ? 'rgba(248, 113, 113, 0.22)'
    : isSuccess
      ? 'rgba(52, 211, 153, 0.22)'
      : 'rgba(34, 211, 238, 0.20)';

  const haloAnimate = reduceMotion
    ? { scale: 1, opacity: 0.5 }
    : {
        scale: isLoading ? [0.95, 1.15, 0.95] : isCelebrating ? [1, 1.4, 1] : [0.98, 1.06, 0.98],
        opacity: isLoading ? [0.4, 0.9, 0.4] : [0.45, 0.7, 0.45],
      };

  const haloTransition: Transition = {
    duration: isLoading ? 1.8 : isCelebrating ? 0.9 : 3.4,
    repeat: Infinity,
    ease: 'easeInOut',
  };

  // ── Orbe principal ────────────────────────────────────────────────────
  const coreGlow = isError
    ? '0 0 65px -5px rgba(248, 113, 113, 0.9)'
    : isSuccess
      ? '0 0 65px -5px rgba(52, 211, 153, 0.9)'
      : '0 0 65px -5px rgba(103, 232, 249, 0.9)';

  const coreGlowActive = isLoading
    ? '0 0 90px 12px rgba(103, 232, 249, 0.9)'
    : coreGlow;

  const orbFloat = reduceMotion || isCelebrating
    ? {}
    : { y: isLoading ? 0 : [-4, 4, -4] };

  return (
    <motion.div
      {...(interactive
        ? {
            role: 'button' as const,
            tabIndex: 0,
            onClick: handleClick,
            onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            },
            onPointerDown: startPress,
            onPointerUp: cancelPress,
            onPointerLeave: cancelPress,
          }
        : { role: 'img' as const })}
      aria-label={ariaLabel ?? 'Orbe Ómicron'}
      aria-busy={isLoading}
      className={`relative flex items-center justify-center select-none outline-none ${interactive ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: px, height: px }}
      whileTap={interactive ? { scale: 0.95 } : undefined}
      animate={{
        ...orbFloat,
        scale: isCelebrating && !reduceMotion ? [1, 1.12, 1] : 1,
      }}
      transition={
        isCelebrating
          ? { duration: 0.7, ease: 'easeOut' }
          : { y: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }
      }
    >
      {/* Halo exterior (glow) */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: px * 1.25,
          height: px * 1.25,
          background: haloColor,
          filter: 'blur(4px)',
        }}
        animate={haloAnimate}
        transition={haloTransition}
      />

      {/* Orbe principal */}
      <motion.div
        className="relative rounded-full overflow-hidden"
        style={{
          width: px,
          height: px,
          background: CORE_GRADIENT[variant],
          boxShadow: coreGlow,
          border: '1px solid rgba(34, 211, 238, 0.25)',
        }}
        animate={{ boxShadow: coreGlowActive }}
        transition={{ duration: 1.2, repeat: isLoading ? Infinity : 0, repeatType: 'reverse' }}
      >
        {/* Núcleo luminoso (bloom central, sin tapar el contenido) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 47%, rgba(125,211,252,0.45) 0%, rgba(34,211,238,0.22) 30%, transparent 58%)',
            mixBlendMode: 'screen',
          }}
        />

        {/* Rejilla holográfica interna (anillos concéntricos girando) */}
        <motion.div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              'repeating-radial-gradient(circle, transparent, transparent 16px, rgba(224,247,255,0.28) 17px, transparent 19px)',
          }}
          animate={{ rotate: reduceMotion ? 0 : 360 }}
          transition={{ duration: isLoading ? 6 : 18, repeat: Infinity, ease: 'linear' }}
        />

        {/* Anillos orbitales tipo radar / HUD (giroscopio) */}
        <motion.svg
          viewBox="0 0 100 100"
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%', opacity: 0.6, mixBlendMode: 'screen' }}
          animate={{ rotate: reduceMotion ? 0 : 360 }}
          transition={{ duration: isLoading ? 12 : 28, repeat: Infinity, ease: 'linear' }}
        >
          <ellipse cx="50" cy="50" rx="42" ry="15" fill="none" stroke="rgba(224,247,255,0.6)" strokeWidth="0.5" />
          <ellipse cx="50" cy="50" rx="42" ry="15" fill="none" stroke="rgba(34,211,238,0.5)" strokeWidth="0.5" transform="rotate(60 50 50)" />
          <ellipse cx="50" cy="50" rx="42" ry="15" fill="none" stroke="rgba(147,197,253,0.4)" strokeWidth="0.5" transform="rotate(120 50 50)" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="0.4" strokeDasharray="1 3" />
        </motion.svg>

        {/* Barrido de luz holográfico (GSAP controla xPercent/opacity) */}
        <div
          ref={sweepRef}
          className="absolute inset-y-0 pointer-events-none"
          style={{
            width: '55%',
            left: '22%',
            transform: 'skewX(-18deg)',
            background:
              'linear-gradient(90deg, transparent, rgba(248,250,252,0.35), transparent)',
            mixBlendMode: 'screen',
          }}
        />

        {/* Brillo especular superior (profundidad estilo Mac) */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '8%',
            left: '20%',
            width: '46%',
            height: '30%',
            borderRadius: '9999px',
            background:
              'radial-gradient(ellipse at center, rgba(255,255,255,0.45), transparent 70%)',
            filter: 'blur(2px)',
          }}
        />

        {/* Rim light (borde luminoso de la esfera + sombra inferior = volumen) */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow:
              'inset 0 0 22px rgba(224,247,255,0.35), inset 0 -10px 34px rgba(30,27,75,0.55)',
          }}
        />

        {/* Contenido central opcional */}
        {children != null && (
          <div className="absolute inset-0 flex items-center justify-center text-center px-3">
            {children}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Orb;
