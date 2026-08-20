// shared/motion/StaggerChildren.tsx
// ═══════════════════════════════════════════════════════════════════════
// Orchestrates child animations with stagger delay.
// Anti-slop: 50ms stagger max (more feels like lag, not animation).
// Children must be motion.div or wrapped in FadeIn/SlideUp/ScaleIn.
// ═══════════════════════════════════════════════════════════════════════
import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface Props {
  children: ReactNode;
  /** Delay between each child in seconds (default 0.05, max 0.08) */
  stagger?: number;
  /** Delay before the first child starts */
  delay?: number;
  style?: CSSProperties;
  className?: string;
  motion?: boolean;
}

export function StaggerChildren({ children, stagger = 0.05, delay = 0, style, className, motion: enabled = true }: Props) {
  const reduced = useReducedMotion();

  if (!enabled || reduced) {
    return <div style={style} className={className}>{children}</div>;
  }

  const clampedStagger = Math.min(0.08, Math.max(0.02, stagger));

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: clampedStagger,
          },
        },
      }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Wrap each child item with this for stagger to work */
export function StaggerItem({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } },
      }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}
