// components/shared/HubSubNav.tsx
// Sub-pestañas (segmented control) — estilo Industria 5.0.
import { useApp } from '../../store/AppContext';
import { hubForTab } from '../../config/hubs';
import { FONT } from '../../theme';

export function HubSubNav() {
  const { activeTab, setActiveTab } = useApp();
  const hub = hubForTab(activeTab);

  if (hub.members.length < 2) return null;

  return (
    <div style={{
      flexShrink: 0, display: 'flex', gap: 8, padding: '9px 14px',
      background: 'rgba(2,6,19,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(92, 200, 255,0.14)',
      position: 'relative', zIndex: 3,
    }}>
      {hub.members.map(m => {
        const active = activeTab === m.tab;
        return (
          <button
            key={m.tab}
            onClick={() => setActiveTab(m.tab)}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
              fontFamily: FONT.display, fontSize: 13, letterSpacing: 0.3, fontWeight: 700,
              background: active ? 'linear-gradient(135deg, #5cc8ff, #008b9e)' : 'transparent',
              border: `1px solid ${active ? '#5cc8ff' : 'rgba(94, 92, 230,0.30)'}`,
              color: active ? '#000206' : '#9fb3cc',
              boxShadow: active ? '0 0 16px rgba(92, 200, 255,0.45)' : 'none',
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
