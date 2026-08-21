// shared/hooks/useProgressiveBlur.ts
// ═══════════════════════════════════════════════════════════════════════
// JARVIS PRESENCE · Progressive Blur
//
// Sections the user hasn't explored yet appear slightly blurred (1.5px).
// On first visit, the blur animates away (0.6s ease).
// Creates a sense of DISCOVERY — you "clear the fog" by exploring.
//
// Usage: const { blur, markVisited } = useProgressiveBlur('empleos');
// Then: style={{ filter: blur }} on the section wrapper.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'omicron_visited_sections';

function getVisited(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveVisited(set: Set<string>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch { /* noop */ }
}

export function useProgressiveBlur(sectionId: string) {
  const [visited, setVisited] = useState(() => getVisited().has(sectionId));
  const [clearing, setClearing] = useState(false);

  // On mount, if not visited, mark as clearing after 300ms (entrance delay)
  useEffect(() => {
    if (visited) return;
    const t = setTimeout(() => {
      setClearing(true);
      const vs = getVisited();
      vs.add(sectionId);
      saveVisited(vs);
      // After animation, set visited
      const t2 = setTimeout(() => setVisited(true), 600);
      return () => clearTimeout(t2);
    }, 300);
    return () => clearTimeout(t);
  }, [sectionId, visited]);

  const markVisited = useCallback(() => {
    if (visited) return;
    setClearing(true);
    const vs = getVisited();
    vs.add(sectionId);
    saveVisited(vs);
    setTimeout(() => setVisited(true), 600);
  }, [sectionId, visited]);

  // CSS filter value
  const blur = visited
    ? 'none'
    : clearing
      ? 'blur(0px)'
      : 'blur(1.5px)';

  // Style object ready to spread
  const blurStyle = visited
    ? {}
    : { filter: blur, transition: 'filter 0.6s ease' };

  return { visited, clearing, blur, blurStyle, markVisited };
}
