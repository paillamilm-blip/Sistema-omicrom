// shared/motion/SlideUp.tsx
// ═══════════════════════════════════════════════════════════════════════
// Slide up entrance with spring physics. The workhorse animation.
// Use for cards, panels, list items, modals.
// Anti-slop: offset is 16px max (more feels slow), spring not duration.
// ═══════════════════════════════════════════════════════════════════════
import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';
import { useReducedMotion, REDUCED_TRANSITION, MOTION_SPRING } from './useReducedMotion';

interface Props {
  children: ReactNode;
  /** Vertical offset in px (default 16, max 24) */
  offset?: number;
  delay?: number;
  style?: CSSProperties;
  className?: string;
  motion?: boolean;
}

export function SlideUp({ children, offset = 16, delay = 0, style, className, motion: enabled = true }: Props) {
  const reduced = useReducedMotion();
  const y = Math.min(24, Math.max(4, offset));

  if (!enabled) return <div style={style} className={className}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: y / 2 }}
      transition={reduced
        ? REDUCED_TRANSITION
        : { ...MOTION_SPRING, delay }
      }
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}
