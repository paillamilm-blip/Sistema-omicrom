import { User, Zap, BookOpen, ShoppingCart, Briefcase, MessageCircle, Globe, Scale, type LucideIcon } from 'lucide-react';
import type { TabId } from '../../types';
import { useApp } from '../../store/AppContext';

const TABS: { id: TabId; label: string; Icon: LucideIcon }[] = [
  { id: 'perfil',   label: 'PERFIL',    Icon: User },
  { id: 'maxskill', label: 'MAX\nSKILL', Icon: Zap },
  { id: 'academia', label: 'ACADEMIA',  Icon: BookOpen },
  { id: 'market',   label: 'MARKET',    Icon: ShoppingCart },
  { id: 'empleos',  label: 'EMPLEOS',   Icon: Briefcase },
  { id: 'chat',     label: 'CHAT',      Icon: MessageCircle },
  { id: 'wallet',   label: 'WALLET',    Icon: Globe },
  { id: 'gobernanza', label: 'GOBERNANZA', Icon: Scale },
];

// These tabs show notification badges
const NOTIF_TABS: TabId[] = ['chat', 'market'];

export function BottomNav() {
  const { activeTab, setActiveTab, unreadCount } = useApp();

  return (
    <nav className="flex-none bg-omicron-surface border-t border-omicron-border">
      {/* Active indicator bar */}
      <div className="flex">
        {TABS.map(tab => (
          <div key={tab.id} className="flex-1 h-0.5">
            {activeTab === tab.id && <div className="h-full tab-active-bar" />}
          </div>
        ))}
      </div>


      <div className="flex">
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          const showBadge = unreadCount > 0 && NOTIF_TABS.includes(id);

          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-all active:scale-90 relative ${
                active ? '' : 'opacity-50'
              }`}
            >
              <div className="relative">
                <Icon
                  size={20}
                  className={active ? (id === 'maxskill' ? 'text-yellow-400' : 'text-omicron-accent') : 'text-omicron-subtle'}
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white px-1 leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[9px] font-semibold leading-tight text-center whitespace-pre ${
                  active
                    ? id === 'maxskill' ? 'text-yellow-400' : 'text-omicron-accent'
                    : 'text-omicron-subtle'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
