// shared/motion/ScaleIn.tsx
// ═══════════════════════════════════════════════════════════════════════
// Scale entrance — for elements that "pop" into existence.
// Use for badges, notifications, achievement unlocks, toasts.
// Anti-slop: scale starts at 0.85 (not 0 — that's cartoonish).
// ═══════════════════════════════════════════════════════════════════════
import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';
import { useReducedMotion, REDUCED_TRANSITION, MOTION_SPRING } from './useReducedMotion';

interface Props {
  children: ReactNode;
  /** Starting scale (default 0.85, range 0.7-0.95) */
  from?: number;
  delay?: number;
  style?: CSSProperties;
  className?: string;
  motion?: boolean;
}

export function ScaleIn({ children, from = 0.85, delay = 0, style, className, motion: enabled = true }: Props) {
  const reduced = useReducedMotion();
  const scale = Math.max(0.7, Math.min(0.95, from));

  if (!enabled) return <div style={style} className={className}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, scale }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: scale + 0.05 }}
      transition={reduced
        ? REDUCED_TRANSITION
        : { ...MOTION_SPRING, delay }
      }
      style={{ ...style, transformOrigin: 'center' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
