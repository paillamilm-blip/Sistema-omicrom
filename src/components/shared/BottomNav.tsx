import { useApp } from '../../store/AppContext';
import { HUBS, hubForTab } from '../../config/hubs';
import type { TabId } from '../../types';

// Hubs que muestran badge de notificaciones (si alguno de sus miembros aplica)
const NOTIF_TABS: TabId[] = ['chat', 'market'];

export function BottomNav() {
  const { activeTab, setActiveTab, unreadCount } = useApp();
  const currentHub = hubForTab(activeTab);

  return (
    <nav className="flex-none bg-omicron-surface border-t border-omicron-border">
      {/* Barra indicadora del hub activo */}
      <div className="flex">
        {HUBS.map(hub => (
          <div key={hub.id} className="flex-1 h-0.5">
            {currentHub.id === hub.id && <div className="h-full tab-active-bar" />}
          </div>
        ))}
      </div>

      <div className="flex">
        {HUBS.map(hub => {
          const active = currentHub.id === hub.id;
          const Icon = hub.Icon;
          const showBadge = unreadCount > 0 && hub.members.some(m => NOTIF_TABS.includes(m.tab));

          return (
            <button
              key={hub.id}
              onClick={() => setActiveTab(hub.members[0].tab)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-all active:scale-90 relative ${
                active ? '' : 'opacity-50'
              }`}
            >
              <div className="relative">
                <Icon size={20} className={active ? 'text-omicron-accent' : 'text-omicron-subtle'} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white px-1 leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold leading-tight text-center ${
                active ? 'text-omicron-accent' : 'text-omicron-subtle'
              }`}>
                {hub.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
