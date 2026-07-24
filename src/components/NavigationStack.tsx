// src/components/NavigationStack.tsx
// ═══════════════════════════════════════════════════════════════════════
// NAVIGATION STACK — contenedor de la pantalla activa.
//
// Antes mostraba un breadcrumb flotante ("🏠 › Título") y un botón flotante de
// "volver". Se eliminaron: cada pantalla ya trae su encabezado Ómicron con el
// botón de volver integrado (→ Hub), así que esos elementos flotantes solo
// duplicaban el título y estorbaban. La navegación queda integrada y limpia.
// ═══════════════════════════════════════════════════════════════════════
import { ReactNode } from 'react';
import { useApp } from '../store/AppContext';
import type { TabId } from '../types';

interface NavigationStackProps {
  children: (currentTab: TabId) => ReactNode;
}

export function NavigationStack({ children }: NavigationStackProps) {
  const { activeTab } = useApp();
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children(activeTab)}
      </div>
    </div>
  );
}
