// src/components/shared/GemeloBadge.tsx
// Badge global del Gemelo (Nodo + reputación) visible en el header de toda la
// app. UNIFICADO: lee la MISMA fuente que el ranking, la presencia y los
// contratos → el perfil de Supabase (reputation_score + node_type). Así el
// número de reputación es consistente en todo el ecosistema.
import { useApp } from '../../store/AppContext';
import { C, FONT } from '../../theme';

const SHORT: Record<string, string> = {
  'Nodo Operativo': 'Operativo',
  'Nodo Core': 'Core',
  'Nodo Arquitecto': 'Arquitecto',
  'Nodo Fundador': 'Fundador',
};

export function GemeloBadge() {
  const { profile, setActiveTab } = useApp();
  const nodeType = profile?.node_type ?? 'Nodo Operativo';
  const rep = Math.round(profile?.reputation_score ?? 0);
  const color =
    nodeType === 'Nodo Arquitecto' || nodeType === 'Nodo Fundador'
      ? C.gold
      : nodeType === 'Nodo Core'
        ? C.cyan
        : C.purple;

  return (
    <button
      onClick={() => setActiveTab('perfil')}
      title={`${nodeType} · Reputación ${rep}`}
      aria-label="Tu Gemelo"
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 9px', borderRadius: 14, cursor: 'pointer',
        background: 'rgba(92,200,255,0.08)', border: `1px solid ${C.cyanDim}`,
        fontFamily: FONT.mono, fontSize: 11, color: '#eaf0fb', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color, fontSize: 12, lineHeight: 1 }}>◆</span>
      <span style={{ fontWeight: 700 }}>{SHORT[nodeType] ?? nodeType}</span>
      <span style={{ color: C.gold }}>· {rep}</span>
    </button>
  );
}
