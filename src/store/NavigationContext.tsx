// store/NavigationContext.tsx
// Navegación (activeTab). Separado de ProfileContext (Fase 0.3 del plan de
// producción) porque cambia mucho más seguido (cada tap de navegación) que el
// perfil/reputación.
//
// El recorte de la Fase 5 sacó de acá dos cosas que ya no existen: el destino
// de empleo exacto (Empleos dejó de ser navegable) y el conteo de notificaciones
// no leídas — `notifications` tiene 0 filas y no había ninguna pantalla que lo
// mostrara, así que era un canal Realtime y un polling pagados por nada.

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';
import type { TabId } from '../types';

export interface NavigationContextState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

const NavigationContext = createContext<NavigationContextState | null>(null);

export function NavigationProvider({ children }: { profileId?: string; children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('perfil');

  const value: NavigationContextState = { activeTab, setActiveTab };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextState {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used inside NavigationProvider');
  return ctx;
}
