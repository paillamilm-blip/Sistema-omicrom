// shared/components/CrystalCard.tsx
// ═══════════════════════════════════════════════════════════════════════
// JARVIS PRESENCE · Crystallize Cards
//
// Cards that visually solidify from nebulous to crystal-clear.
// At progress 0: translucent, blurred edges, breathing opacity.
// At progress 1: solid borders, glass clarity, sealed shine + haptic.
//
// The crystallization is CONTINUOUS — not binary. At 0.5 you see
// a half-formed crystal. This communicates progress WITHOUT numbers.
//
// Taste: the "seal" shine only plays ONCE (not every render).
// Anti-slop: max blur is 2px (more hides content = bad UX).
// Impeccable: the transition is 800ms ease — slow enough to perceive.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { C, RADIUS } from '@/theme';
import { hapticSuccess } from '@/shared/utils/haptics';

interface Props {
  children: ReactNode;
  /** Progress 0-1 (0=nebulous, 1=crystallized) */
  progress: number;
  /** Color accent for the crystal border (default cyan) */
  color?: string;
  /** Fire haptic when reaching 1.0 (default true) */
  haptic?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
}

export function CrystalCard({
  children, progress, color = C.cyan, haptic = true, onClick, style, className,
}: Props) {
  const p = Math.max(0, Math.min(1, progress));
  const prevProgress = useRef(p);
  const [sealed, setSealed] = useState(false);
  const sealedOnce = useRef(false);

  // Detect crystallization moment (progress crosses 1.0)
  useEffect(() => {
    if (p >= 1 && prevProgress.current < 1 && !sealedOnce.current) {
      sealedOnce.current = true;
      setSealed(true);
      if (haptic) hapticSuccess();
      // Reset seal animation after it plays
      const t = setTimeout(() => setSealed(false), 1200);
      return () => clearTimeout(t);
    }
    prevProgress.current = p;
  }, [p, haptic]);

  // Computed visual properties based on progress
  const borderOpacity = 0.1 + p * 0.6;             // 0.1 → 0.7
  const backdropBlur = 8 + p * 10;                  // 8px → 18px (more blur = more glass)
  const contentBlur = (1 - p) * 1.5;                // 1.5px → 0px (nebulous → clear)
  const borderWidth = 1 + p * 0.5;                  // 1px → 1.5px
  const bgOpacity = 0.03 + p * 0.04;               // more solid at 100%
  const glowIntensity = p * p;                       // quadratic — glow ramps at end

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        position: 'relative',
        borderRadius: RADIUS.xl,
        padding: 16,
        background: `linear-gradient(160deg, rgba(255,255,255,${bgOpacity + 0.02}), rgba(255,255,255,${bgOpacity}))`,
        border: `${borderWidth}px solid rgba(${hexToRgb(color)}, ${borderOpacity})`,
        backdropFilter: `blur(${backdropBlur}px)`,
        WebkitBackdropFilter: `blur(${backdropBlur}px)`,
        boxShadow: glowIntensity > 0.3
          ? `0 0 ${12 * glowIntensity}px ${color}${Math.round(glowIntensity * 40).toString(16).padStart(2, '0')}, 0 8px 24px rgba(0,0,0,0.35)`
          : '0 8px 24px rgba(0,0,0,0.35)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'all 0.8s cubic-bezier(0.32, 0.72, 0, 1)',
        ...style,
      }}
    >
      {/* Content with clarity transition */}
      <div style={{
        position: 'relative', zIndex: 1,
        filter: contentBlur > 0.1 ? `blur(${contentBlur}px)` : undefined,
        transition: 'filter 0.8s ease',
      }}>
        {children}
      </div>

      {/* Nebulous shimmer (fades out as progress increases) */}
      {p < 0.9 && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            borderRadius: 'inherit',
            background: `linear-gradient(135deg, transparent 30%, ${color}08 50%, transparent 70%)`,
            backgroundSize: '250% 250%',
            animation: 'crystalShimmer 5s ease-in-out infinite',
            opacity: 1 - p,
            transition: 'opacity 1s ease',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Seal shine (plays once on crystallization) */}
      {sealed && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            borderRadius: 'inherit',
            background: `linear-gradient(105deg, transparent 40%, ${color}44 50%, transparent 60%)`,
            animation: 'crystalSeal 1s ease both',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}

      {/* Top accent line (solidifies with progress) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, left: '10%', right: '10%',
          height: 1,
          background: `linear-gradient(90deg, transparent, ${color}${Math.round(p * 180).toString(16).padStart(2, '0')}, transparent)`,
          transition: 'background 0.8s ease',
        }}
      />
    </div>
  );
}

// Helper: hex color to rgb string
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

// Inject crystal keyframes
if (typeof document !== 'undefined' && !document.getElementById('crystal-css')) {
  const s = document.createElement('style');
  s.id = 'crystal-css';
  s.textContent = `
    @keyframes crystalShimmer {
      0% { background-position: 0% 0%; }
      50% { background-position: 100% 100%; }
      100% { background-position: 0% 0%; }
    }
    @keyframes crystalSeal {
      0% { transform: translateX(-100%); opacity: 0; }
      30% { opacity: 1; }
      100% { transform: translateX(100%); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      [style*="crystalShimmer"], [style*="crystalSeal"] { animation: none !important; }
    }
  `;
  document.head.appendChild(s);
}
