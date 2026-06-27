// components/shared/HubSubNav.tsx
// Sub-pestañas (píldoras) para cambiar dentro de un hub con varios miembros.
import { useApp } from '../../store/AppContext';
import { hubForTab } from '../../config/hubs';

export function HubSubNav() {
  const { activeTab, setActiveTab } = useApp();
  const hub = hubForTab(activeTab);

  // Si el hub tiene una sola pestaña, no mostramos píldoras.
  if (hub.members.length < 2) return null;

  return (
    <div className="flex-none flex gap-2 px-3 py-2 bg-omicron-bg border-b border-omicron-border">
      {hub.members.map(m => {
        const active = activeTab === m.tab;
        return (
          <button
            key={m.tab}
            onClick={() => setActiveTab(m.tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 ${
              active
                ? 'bg-omicron-accent/20 border-omicron-accent/50 text-omicron-accent'
                : 'bg-omicron-card border-omicron-border text-omicron-subtle'
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
