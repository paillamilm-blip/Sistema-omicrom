// shared/components/DynamicIsland.tsx
// ═══════════════════════════════════════════════════════════════════════
// DYNAMIC ISLAND — iPhone 14+ inspired notification pill.
//
// Appears at the top of the screen as a compact pill, then expands
// to reveal notification content. Auto-dismisses after timeout.
//
// Usage:
//   <DynamicIsland
//     visible={showNotif}
//     icon="🎯"
//     title="Nuevo match"
//     subtitle="Diseñador UX en Startup Chile"
//     onTap={() => navigateToJobs()}
//     onDismiss={() => setShowNotif(false)}
//   />
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { C, FONT } from '@/theme';
import { hapticLight } from '@/shared/utils/haptics';

interface DynamicIslandProps {
  visible: boolean;
  icon?: string;
  title: string;
  subtitle?: string;
  onTap?: () => void;
  onDismiss?: () => void;
  duration?: number; // ms before auto-dismiss (default 5000)
  accent?: string;
}

export function DynamicIsland({
  visible,
  icon = '⬡',
  title,
  subtitle,
  onTap,
  onDismiss,
  duration = 5000,
  accent = C.cyan,
}: DynamicIslandProps) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mount/unmount with animation
  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Expand after pill appears
      const t = setTimeout(() => setExpanded(true), 300);
      return () => clearTimeout(t);
    } else {
      setExpanded(false);
      const t = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Auto-dismiss
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      onDismiss?.();
    }, duration);
    return () => clearTimeout(t);
  }, [visible, duration, onDismiss]);

  const handleTap = useCallback(() => {
    hapticLight();
    onTap?.();
    onDismiss?.();
  }, [onTap, onDismiss]);

  if (!mounted) return null;

  return (
    <div
      onClick={handleTap}
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 8px) + 8px)',
        left: '50%',
        transform: `translateX(-50%) scale(${visible ? 1 : 0.8})`,
        zIndex: 9999,
        cursor: onTap ? 'pointer' : 'default',
        // Pill → expanded transition
        width: expanded ? 'min(88%, 340px)' : '160px',
        padding: expanded ? '12px 16px' : '8px 16px',
        borderRadius: 999,
        background: 'rgba(2,3,10,0.95)',
        border: `1px solid ${accent}44`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 16px ${accent}22`,
        // Animation
        opacity: visible ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        // Layout
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      {/* Icon */}
      <span style={{
        fontSize: expanded ? 20 : 13,
        flexShrink: 0,
        transition: 'font-size 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {icon}
      </span>

      {/* Content */}
      <div style={{
        flex: 1,
        minWidth: 0,
        opacity: expanded ? 1 : 0.7,
        transition: 'opacity 0.3s ease',
      }}>
        <div style={{
          fontFamily: FONT.body,
          fontSize: expanded ? 13 : 11,
          fontWeight: 600,
          color: C.ink,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'font-size 0.3s ease',
        }}>
          {title}
        </div>
        {expanded && subtitle && (
          <div style={{
            fontFamily: FONT.mono,
            fontSize: 11,
            color: C.mut,
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Accent dot */}
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: accent,
        boxShadow: `0 0 8px ${accent}`,
        flexShrink: 0,
        animation: 'liquidPulse 2s ease-in-out infinite',
      }} />
    </div>
  );
}
