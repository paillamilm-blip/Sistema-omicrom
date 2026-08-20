// shared/motion/FadeIn.tsx
// ═══════════════════════════════════════════════════════════════════════
// Opacity entrance. The most subtle motion — use when you want presence
// without drawing attention. Exit is faster than enter (Taste rule #1).
// ═══════════════════════════════════════════════════════════════════════
import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';
import { useReducedMotion, REDUCED_TRANSITION } from './useReducedMotion';

interface Props {
  children: ReactNode;
  delay?: number;
  duration?: number;
  style?: CSSProperties;
  className?: string;
  /** Set false to skip animation entirely */
  motion?: boolean;
}

export function FadeIn({ children, delay = 0, duration = 0.3, style, className, motion: enabled = true }: Props) {
  const reduced = useReducedMotion();

  if (!enabled) return <div style={style} className={className}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduced
        ? REDUCED_TRANSITION
        : { duration, delay, ease: [0.32, 0.72, 0, 1] }
      }
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}
