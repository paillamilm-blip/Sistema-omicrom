// shared/utils/stagger.ts
// ═══════════════════════════════════════════════════════════════════════
// STAGGER CHILDREN — Cascading enter animation for list items.
//
// "A list that appears all at once is a wall. A list that staggers
//  in is a conversation." — Emil Kowalski
//
// Usage (inline style approach):
//   {items.map((item, i) => (
//     <div key={item.id} style={staggerChild(i)}>
//       <Card>{item.title}</Card>
//     </div>
//   ))}
//
// Usage (CSS class approach):
//   <div className="stagger-container">
//     {items.map(item => <Card key={item.id} className="stagger-item" />)}
//   </div>
//
// The CSS class approach uses :nth-child for delay (defined in index.css).
// The inline approach is more flexible (works with any number of items).
// ═══════════════════════════════════════════════════════════════════════

import type { CSSProperties } from 'react';

/**
 * Returns inline style for a staggered child at index `i`.
 * Each child enters 50ms after the previous one.
 *
 * @param i — zero-based index of the child
 * @param baseDelay — initial delay before first child (default 0ms)
 * @param step — delay between each child (default 50ms)
 */
export function staggerChild(
  i: number,
  baseDelay = 0,
  step = 50,
): CSSProperties {
  return {
    opacity: 0,
    animation: `ocRise 0.32s var(--ease-default) both`,
    animationDelay: `${baseDelay + i * step}ms`,
  };
}

/**
 * Returns style for the container (ensures children don't flash before animating).
 */
export const staggerContainer: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

/**
 * Generates stagger styles for a grid layout.
 * Items enter left-to-right, top-to-bottom.
 */
export function staggerGrid(
  i: number,
  columns: number = 2,
  baseDelay = 0,
): CSSProperties {
  const row = Math.floor(i / columns);
  const col = i % columns;
  const delay = baseDelay + (row * 80) + (col * 40);
  return {
    opacity: 0,
    animation: `ocRise 0.32s var(--ease-default) both`,
    animationDelay: `${delay}ms`,
  };
}
