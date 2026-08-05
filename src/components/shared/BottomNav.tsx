import { useApp } from '../../store/AppContext';
import { HUBS, hubForTab } from '../../config/hubs';
import { C, FONT } from '../../theme';

// ═══════════════════════════════════════════════════════════════════════
// BottomNav — Navegación inferior con los 6 hubs del ecosistema.
// Interacciones suaves: transiciones CSS, feedback táctil inmediato,
// safe-area-inset para notch/home indicator en iOS.
// ═══════════════════════════════════════════════════════════════════════
export function BottomNav() {
  const { activeTab, setActiveTab } = useApp();
  const currentHub = hubForTab(activeTab);

  return (
    <nav
      aria-label="Navegación principal"
      style={{
        flexShrink: 0,
        background: 'rgba(2,2,6,0.88)',
        backdropFilter: 'blur(24px) saturate(150%)',
        WebkitBackdropFilter: 'blur(24px) saturate(150%)',
        borderTop: `1px solid ${C.line}`,
        position: 'relative',
        zIndex: 10,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Indicador del hub activo — barra superior animada */}
      <div style={{ display: 'flex', justifyContent: 'center', height: 2 }}>
        {HUBS.map(hub => (
          <div key={hub.id} style={{ flex: 1, maxWidth: 72 }}>
            <div style={{
              height: '100%',
              background: currentHub.id === hub.id ? C.cyan : 'transparent',
              boxShadow: currentHub.id === hub.id ? `0 0 10px ${C.cyan}` : 'none',
              transition: 'background 0.3s ease, box-shadow 0.3s ease',
              borderRadius: '0 0 2px 2px',
            }} />
          </div>
        ))}
      </div>

      {/* Botones de navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '6px 4px 4px' }}>
        {HUBS.map(hub => {
          const active = currentHub.id === hub.id;
          const Icon = hub.Icon;
          return (
            <button
              key={hub.id}
              onClick={() => setActiveTab(hub.members[0].tab)}
              aria-label={hub.label}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: '0 1 64px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                padding: '6px 0 4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                // Interacción suave
                opacity: active ? 1 : 0.5,
                transform: active ? 'scale(1)' : 'scale(0.92)',
                transition: 'opacity 0.25s ease, transform 0.25s ease',
                // Touch friendly
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                minHeight: 44, // mínimo touch target
              }}
            >
              <Icon
                size={22}
                color={active ? C.cyan : C.mut}
                style={{
                  filter: active ? `drop-shadow(0 0 6px ${C.cyan})` : 'none',
                  transition: 'color 0.25s ease, filter 0.25s ease',
                }}
              />
              <span style={{
                fontFamily: FONT.mono,
                fontSize: 9,
                fontWeight: active ? 700 : 500,
                letterSpacing: 0.3,
                color: active ? C.cyan : C.mut,
                transition: 'color 0.25s ease',
              }}>
                {hub.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
