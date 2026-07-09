// src/components/shared/GemeloBadge.tsx
// Badge global del Gemelo (Nodo/Tier + reputación) visible en el header de
// toda la app. Lee el perfil COMPARTIDO y navega al Perfil al tocarlo.
import { useGemeloProfile } from '../../hooks/useGemeloProfile';
import { useApp } from '../../store/AppContext';
import { C, FONT } from '../../theme';

const SHORT: Record<string, string> = {
  'Nodo Operativo': 'Operativo',
  'Nodo Core': 'Core',
  'Nodo Arquitecto': 'Arquitecto',
};

export function GemeloBadge() {
  const { profile, tier } = useGemeloProfile();
  const { setActiveTab } = useApp();
  const color =
    tier.name === 'Nodo Arquitecto' ? C.gold : tier.name === 'Nodo Core' ? C.cyan : C.purple;

  return (
    <button
      onClick={() => setActiveTab('perfil')}
      title={`${tier.name} · ${profile.pe.toLocaleString()} PE · Reputación ${profile.rep}`}
      aria-label="Tu Gemelo"
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 9px', borderRadius: 14, cursor: 'pointer',
        background: 'rgba(0,214,230,0.08)', border: `1px solid ${C.cyanDim}`,
        fontFamily: FONT.mono, fontSize: 11, color: '#eaf2ff', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color, fontSize: 12, lineHeight: 1 }}>◆</span>
      <span style={{ fontWeight: 700 }}>{SHORT[tier.name] ?? tier.name}</span>
      <span style={{ color: C.gold }}>· {profile.rep}</span>
    </button>
  );
}
