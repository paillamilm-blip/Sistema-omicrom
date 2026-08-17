// shared/components/HoloSkeleton.tsx
// ═══════════════════════════════════════════════════════════════════════
// HOLOGRAPHIC SKELETON — Premium loading placeholder.
//
// Instead of a gray shimmer, data "materializes" from a holographic
// gradient sweep. Feels like the orb is downloading information.
//
// Usage:
//   <HoloSkeleton width={200} height={20} />
//   <HoloSkeleton width="100%" height={44} rounded="pill" />
//   <HoloSkeleton.Circle size={48} />
// ═══════════════════════════════════════════════════════════════════════

import { C, RADIUS } from '@/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'pill' | 'circle';
  style?: React.CSSProperties;
}

export function HoloSkeleton({ width = '100%', height = 16, rounded = 'md', style }: SkeletonProps) {
  const borderRadius = rounded === 'circle' ? '50%'
    : rounded === 'pill' ? RADIUS.pill
    : RADIUS[rounded];

  return (
    <div
      aria-hidden
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(135deg, ${C.glass} 0%, ${C.glass2} 40%, ${C.cyanGhost} 50%, ${C.glass2} 60%, ${C.glass} 100%)`,
        backgroundSize: '300% 100%',
        animation: 'holoSkeleton 1.8s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

/** Circular skeleton for avatars */
HoloSkeleton.Circle = function Circle({ size = 44 }: { size?: number }) {
  return <HoloSkeleton width={size} height={size} rounded="circle" />;
};

/** Text line skeleton (multiple lines) */
HoloSkeleton.Lines = function Lines({ lines = 3, gap = 8 }: { lines?: number; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <HoloSkeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={12}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
};

/** Card skeleton (avatar + title + text) */
HoloSkeleton.Card = function Card() {
  return (
    <div style={{
      padding: 16,
      borderRadius: RADIUS.xl,
      background: C.glass,
      border: `1px solid ${C.line}`,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <HoloSkeleton width={44} height={44} rounded="circle" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <HoloSkeleton width="70%" height={13} />
        <HoloSkeleton width="100%" height={11} />
        <HoloSkeleton width="40%" height={11} />
      </div>
    </div>
  );
};
