// components/shared/HubSubNav.tsx
// Sub-pestañas (segmented control) para cambiar dentro de un hub con varios miembros.
import { useApp } from '../../store/AppContext';
import { hubForTab } from '../../config/hubs';
import { C, FONT } from '../../theme';

export function HubSubNav() {
  const { activeTab, setActiveTab } = useApp();
  const hub = hubForTab(activeTab);

  // Si el hub tiene una sola pantalla, no hace falta sub-navegación
  if (hub.members.length < 2) return null;

  return (
    <div style={{
      flexShrink: 0, display: 'flex', gap: 8, padding: '10px 14px',
      background: 'rgba(0,245,255,0.03)', borderBottom: `1px solid ${C.cyanFaint}`,
      position: 'relative', zIndex: 3,
    }}>
      {hub.members.map(m => {
        const active = activeTab === m.tab;
        return (
          <button
            key={m.tab}
            onClick={() => setActiveTab(m.tab)}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
              fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1.5, fontWeight: 700,
              textTransform: 'uppercase',
              background: active ? 'rgba(0,245,255,0.14)' : 'transparent',
              border: `1px solid ${active ? C.cyan : C.cyanFaint}`,
              color: active ? C.cyan : C.cyanDim,
              boxShadow: active ? `0 0 12px ${C.cyan}33` : 'none',
              transition: 'all .2s',
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
