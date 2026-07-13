import { useApp } from '../../store/AppContext';
import { HUBS, hubForTab } from '../../config/hubs';
import { C, FONT } from '../../theme';

// Menú inferior limpio: solo las áreas principales de navegación
// (Inicio, Academia, Empleos). Mensajería, notificaciones y cerrar
// sesión viven en la barra superior (ver App.tsx) para minimizar los
// clics del usuario y no duplicar accesos.
export function BottomNav() {
  const { activeTab, setActiveTab } = useApp();
  const currentHub = hubForTab(activeTab);

  // 🧪 MVP PILOTO: con solo 3 hubs visibles (Perfil, Academia, Empleos),
  // los botones ya no se estiran a todo el ancho (flex:1 por elemento).
  // En su lugar se centran con un ancho máximo fijo por botón, para que
  // se vean proporcionados y agrupados en el centro de la barra.
  return (
    <nav style={{ flexShrink: 0, background: 'rgba(9,12,22,0.66)', backdropFilter: 'blur(22px) saturate(140%)', WebkitBackdropFilter: 'blur(22px) saturate(140%)', borderTop: `1px solid ${C.line}`, position: 'relative', zIndex: 3 }}>
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
              <Icon size={20} color={active ? C.cyan : C.cyanDim} />
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
