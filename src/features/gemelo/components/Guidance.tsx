// src/components/shared/GemeloGuidance.tsx
// ═══════════════════════════════════════════════════════════════════════
// Banner contextual del Gemelo — muestra la guía del omicronCoach
// según el tab actual y los datos reales del usuario.
// Conecta el motor de coaching con cada pestaña de la app.
// ═══════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { nodeGuidance } from '@/features/omicron/services/coach';
import { C, FONT } from '@/theme';
import type { TabId, GemeloDigital } from '@/types';

interface GemeloGuidanceProps {
  tab: TabId;
}

export function GemeloGuidance({ tab }: GemeloGuidanceProps) {
  const { profile } = useApp();

  const guidance = useMemo(() => {
    if (!profile) return null;
    const gemelo: GemeloDigital = {
      execution: profile.execution_score ?? 40,
      quality: profile.quality_score ?? 50,
      transcendence: profile.transcendence_score ?? 18,
      foundation: profile.foundation_score ?? 25,
      overallReputation: profile.reputation_score ?? 0,
    };
    return nodeGuidance(tab, profile, gemelo);
  }, [profile, tab]);

  if (!guidance) return null;

  return (
    <div
      role="status"
      aria-label="Guía contextual del Gemelo"
      style={{
        padding: '10px 14px',
        margin: '0 0 12px',
        background: C.cyanGhost,
        border: `1px solid ${C.cyanFaint}`,
        borderRadius: 12,
        fontFamily: FONT.body,
        fontSize: 12,
        color: C.ink,
        lineHeight: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 13, flexShrink: 0 }}>💡</span>
      <span style={{ opacity: 0.9 }}>{guidance}</span>
    </div>
  );
}
