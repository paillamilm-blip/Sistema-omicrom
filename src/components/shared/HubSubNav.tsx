// components/shared/HubSubNav.tsx
// Sub-pestañas (píldoras) para cambiar dentro de un hub con varios miembros.
import { useApp } from '../../store/AppContext';
import { hubForTab } from '../../config/hubs';
import { C, FONT } from '../../theme';

export function HubSubNav() {
  const { activeTab, setActiveTab } = useApp();
  const hub = hubForTab(activeTab);

  if (hub.members.length < 2) return null;

  return (
    <div style={{
      flexShrink: 0, display: 'flex', gap: 8, padding: '8px 14px',
      background: C.bg, borderBottom: `1px solid ${C.cyanFaint}`, position: 'relative', zIndex: 3,
    }}>
      {hub.members.map(m => {
        const active = activeTab === m.tab;
        return (
          <button
            key={m.tab}
            onClick={() => setActiveTab(m.tab)}
            style={{
              padding: '6px 16px', borderRadius: 20, fontFamily: FONT.mono, fontSize: 11,
              letterSpacing: 1, cursor: 'pointer',
              background: active ? 'rgba(0,245,255,0.12)' : C.surface,
              border: `1px solid ${active ? C.cyanDim : C.cyanFaint}`,
              color: active ? C.cyan : C.cyanDim,
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
