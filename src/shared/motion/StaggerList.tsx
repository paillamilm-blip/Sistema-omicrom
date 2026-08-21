// shared/motion/StaggerList.tsx
// ═══════════════════════════════════════════════════════════════════════
// Convenience wrapper: StaggerChildren + StaggerItem for lists.
// Just wrap your .map() output with <StaggerList> and each item with <StaggerItem>.
// Anti-slop: only animates on first mount (not re-renders).
// ═══════════════════════════════════════════════════════════════════════
import { type ReactNode, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from './useReducedMotion';

interface ListProps {
  children: ReactNode;
  stagger?: number;
  style?: CSSProperties;
  className?: string;
}

interface ItemProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

const listVariants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: { staggerChildren: stagger },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } },
};

export function StaggerList({ children, stagger = 0.04, style, className }: ListProps) {
  const reduced = useReducedMotion();

  if (reduced) return <div style={style} className={className}>{children}</div>;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      custom={stagger}
      variants={listVariants}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, style, className }: ItemProps) {
  return (
    <motion.div variants={itemVariants} style={style} className={className}>
      {children}
    </motion.div>
  );
}
