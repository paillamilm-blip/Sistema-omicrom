// store/AppContext.tsx
// FACADE de compatibilidad (Fase 0.3 del plan de producción).
//
// La lógica real vive ahora en dos contextos separados:
//   - ProfileContext.tsx    → auth + perfil + gemelo (reputación solo-lectura)
//   - NavigationContext.tsx → activeTab + unreadCount
//
// Se separaron para que un cambio de `activeTab` (navegación, muy frecuente)
// no re-renderice componentes que solo leen `profile`/`gemelo` (mucho menos
// frecuente). AppContext.tsx queda como FACADE: compone ambos providers y
// expone `useApp()` con EXACTAMENTE la misma forma que antes del split, para
// que ninguno de los ~39 archivos que ya consumen useApp() necesite cambios.
//
// Si un componente nuevo solo necesita navegación o solo necesita perfil,
// preferir `useNavigation()` / `useProfile()` directamente en vez de
// `useApp()`, para aprovechar el split (menos re-renders).

import { ReactNode } from 'react';
import { ProfileProvider, useProfile } from './ProfileContext';
import { NavigationProvider, useNavigation } from './NavigationContext';
import type { AppState, GemeloDigital } from '../types';

interface ExtendedAppState extends AppState {
  gemelo: GemeloDigital | null;
}

function NavigationProviderBridge({ children }: { children: ReactNode }) {
  // Puente: NavigationProvider necesita profileId, que solo existe dentro
  // de ProfileProvider. Este componente vive DENTRO de ProfileProvider y
  // lee el profile.id para pasárselo.
  const { profile } = useProfile();
  return (
    <NavigationProvider profileId={profile?.id}>
      {children}
    </NavigationProvider>
  );
}

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <NavigationProviderBridge>
        {children}
      </NavigationProviderBridge>
    </ProfileProvider>
  );
}

/**
 * Facade de compatibilidad: combina ProfileContext + NavigationContext para
 * que el consumidor no note el split. Nueva forma == forma anterior exacta.
 */
export function useApp(): ExtendedAppState {
  const profileState = useProfile();
  const navState = useNavigation();

  return {
    ...profileState,
    ...navState,
  };
}

// Hook para obtener solo el Gemelo Digital
export function useGemeloDigital(): GemeloDigital | null {
  const { gemelo } = useProfile();
  return gemelo;
}

// Re-exports para quien prefiera consumir los contextos granulares
// directamente (menos re-renders que useApp() en componentes que solo
// necesitan una parte del estado).
export { useProfile } from './ProfileContext';
export { useNavigation } from './NavigationContext';
