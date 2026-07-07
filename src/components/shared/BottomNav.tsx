import { useApp } from '../../store/AppContext';
import { HUBS, hubForTab } from '../../config/hubs';
import { C, FONT } from '../../theme';
import type { TabId } from '../../types';

const NOTIF_TABS: TabId[] = ['chat', 'market'];

export function BottomNav() {
  const { activeTab, setActiveTab, unreadCount } = useApp();
  const currentHub = hubForTab(activeTab);

  // 🧪 MVP PILOTO: con solo 3 hubs visibles (Perfil, Academia, Empleos),
  // los botones ya no se estiran a todo el ancho (flex:1 por elemento).
  // En su lugar se centran con un ancho máximo fijo por botón, para que
  // se vean proporcionados y agrupados en el centro de la barra.
  return (
    <nav style={{ flexShrink: 0, background: C.surface, borderTop: `1px solid ${C.cyanFaint}`, position: 'relative', zIndex: 3 }}>
      {/* Barra indicadora del hub activo */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {HUBS.map(hub => (
          <div key={hub.id} style={{ width: 96, maxWidth: '33%', height: 2 }}>
            {currentHub.id === hub.id && (
              <div style={{ height: '100%', background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {HUBS.map(hub => {
          const active = currentHub.id === hub.id;
          const Icon = hub.Icon;
          const showBadge = unreadCount > 0 && hub.members.some(m => NOTIF_TABS.includes(m.tab));
          return (
            <button
              key={hub.id}
              onClick={() => setActiveTab(hub.members[0].tab)}
              style={{
                flex: '0 1 96px', maxWidth: '33%', display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 4, padding: '8px 0', background: 'none',
                border: 'none', cursor: 'pointer', opacity: active ? 1 : 0.5, transition: 'opacity .2s',
              }}
            >
              <div style={{ position: 'relative', display: 'flex' }}>
                <Icon size={20} color={active ? C.cyan : C.cyanDim} />
                {showBadge && (
                  <span style={{
                    position: 'absolute', top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 8,
                    background: C.red, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 600, letterSpacing: 0.2, color: active ? C.cyan : C.cyanDim }}>
                {hub.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
