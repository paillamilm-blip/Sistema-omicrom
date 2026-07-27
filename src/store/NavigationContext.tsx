// store/NavigationContext.tsx
// Navegación (activeTab) + notificaciones no leídas. Separado de
// ProfileContext (Fase 0.3 del plan de producción) porque cambia mucho más
// seguido (cada tap de navegación) que el perfil/reputación — antes,
// cualquier cambio de activeTab re-renderizaba todo lo que leía useApp(),
// incluyendo componentes que solo necesitaban profile/gemelo.
//
// Depende del profile.id de ProfileContext (para el canal de notificaciones),
// por eso NavigationProvider debe montarse DENTRO de ProfileProvider.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import type { TabId } from '../types';

export interface NavigationContextState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

const NavigationContext = createContext<NavigationContextState | null>(null);

export function NavigationProvider({ profileId, children }: { profileId?: string; children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('perfil');
  const [unreadCount, setUnreadCount] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Al cerrar sesión (profileId pasa a undefined), limpiar el contador.
  useEffect(() => {
    if (!profileId) setUnreadCount(0);
  }, [profileId]);

  // Notificaciones no leídas (con manejo de errores robusto)
  useEffect(() => {
    if (!profileId) return;

    let cancelled = false;

    const load = async () => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileId)
          .eq('is_read', false);
        if (!cancelled && isMounted.current) {
          setUnreadCount(error ? 0 : (count ?? 0));
        }
      } catch {
        // Red caída o sesión expirada — no romper la app
        if (!cancelled && isMounted.current) setUnreadCount(0);
      }
    };

    load();

    const channel = supabase
      .channel(`notif-count-${profileId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profileId}`,
      }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  const value: NavigationContextState = {
    activeTab,
    setActiveTab,
    unreadCount,
    setUnreadCount,
  };

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
