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
      background: '#0a0f17', borderBottom: '1px solid rgba(46,155,255,0.12)',
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
              fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1.5, fontWeight: 700,
              textTransform: 'uppercase',
              background: active ? 'linear-gradient(135deg, #2e9bff, #0077cc)' : 'transparent',
              border: `1px solid ${active ? '#2e9bff' : 'rgba(110,150,200,0.18)'}`,
              color: active ? '#06090f' : '#7d93b0',
              boxShadow: active ? '0 0 14px rgba(46,155,255,0.45)' : 'none',
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
