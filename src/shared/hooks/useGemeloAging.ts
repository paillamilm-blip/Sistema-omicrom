// shared/hooks/useGemeloAging.ts
// ═══════════════════════════════════════════════════════════════════════
// JARVIS PRESENCE · Gemelo Aging
//
// The Gemelo's visual "age" decays with inactivity:
//   Active today    → freshness 1.0 (vivid, sharp, glowing)
//   1 day inactive  → freshness 0.85 (slightly dimmer)
//   3 days inactive → freshness 0.6 (noticeably muted)
//   7+ days inactive → freshness 0.3 (dusty, faded, "archived" look)
//
// Visual effects driven by freshness:
//   - Opacity of avatar/profile elements
//   - Saturation reduction
//   - Subtle grain/noise overlay at low freshness
//   - Glow intensity reduction
//
// When user becomes active again: freshness animates back to 1.0 (2s ease)
// This is PASSIVE gamification — you don't need to "do" anything specific,
// just being active keeps your Gemelo vibrant.
// ═══════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import type { CSSProperties } from 'react';

interface AgingInput {
  /** ISO date string of last activity */
  lastActiveAt?: string | null;
  /** Current streak days */
  streakDays?: number;
}

export interface GemeloFreshness {
  /** 0-1: how "alive" the gemelo looks */
  freshness: number;
  /** Days since last activity */
  daysSince: number;
  /** CSS style to apply on profile elements */
  style: CSSProperties;
  /** Label for the aging state */
  label: 'vibrant' | 'fresh' | 'resting' | 'fading' | 'archived';
}

export function useGemeloAging(input: AgingInput): GemeloFreshness {
  return useMemo(() => {
    const { lastActiveAt, streakDays = 0 } = input;

    let daysSince = 0;
    if (lastActiveAt) {
      const last = new Date(lastActiveAt);
      const now = new Date();
      daysSince = Math.max(0, Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Streak bonus: each streak day adds 0.05 freshness resilience
    const streakBonus = Math.min(0.2, streakDays * 0.05);

    // Freshness decay curve (exponential)
    let freshness: number;
    if (daysSince === 0) freshness = 1.0;
    else if (daysSince === 1) freshness = 0.85 + streakBonus;
    else if (daysSince <= 3) freshness = 0.6 + streakBonus;
    else if (daysSince <= 7) freshness = 0.35 + streakBonus * 0.5;
    else freshness = 0.2;

    freshness = Math.min(1, Math.max(0.15, freshness));

    // Label
    let label: GemeloFreshness['label'];
    if (freshness >= 0.9) label = 'vibrant';
    else if (freshness >= 0.7) label = 'fresh';
    else if (freshness >= 0.5) label = 'resting';
    else if (freshness >= 0.3) label = 'fading';
    else label = 'archived';

    // CSS style that reflects aging
    const style: CSSProperties = {
      opacity: 0.7 + freshness * 0.3,
      filter: freshness < 0.6
        ? `saturate(${0.4 + freshness * 0.6}) brightness(${0.85 + freshness * 0.15})`
        : freshness < 0.9
          ? `saturate(${0.7 + freshness * 0.3})`
          : 'none',
      transition: 'opacity 2s ease, filter 2s ease',
    };

    return { freshness, daysSince, style, label };
  }, [input.lastActiveAt, input.streakDays]);
}
