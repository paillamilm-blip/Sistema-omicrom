// store/NavigationContext.tsx
// Navegación (activeTab) + notificaciones no leídas. Separado de
// ProfileContext (Fase 0.3 del plan de producción) porque cambia mucho más
// seguido (cada tap de navegación) que el perfil/reputación.
//
// Depende del profile.id de ProfileContext (para el canal de notificaciones),
// por eso NavigationProvider debe montarse DENTRO de ProfileProvider.

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import type { TabId } from '../types';

export interface NavigationContextState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  jobTargetId: string | null;
  /** Cambia en cada openJob, incluso si se vuelve a pedir el mismo empleo. */
  jobTargetRequest: number;
  openJob: (jobId: string) => void;
  clearJobTarget: () => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

const NavigationContext = createContext<NavigationContextState | null>(null);

export function NavigationProvider({ profileId, children }: { profileId?: string; children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('perfil');
  const [jobTargetId, setJobTargetId] = useState<string | null>(null);
  const [jobTargetRequest, setJobTargetRequest] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!profileId) {
      setUnreadCount(0);
      setJobTargetId(null);
    }
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

  const openJob = useCallback((jobId: string) => {
    setJobTargetId(jobId);
    setJobTargetRequest((request) => request + 1);
    setActiveTab('empleos');
  }, []);
  const clearJobTarget = useCallback(() => setJobTargetId(null), []);

  const value: NavigationContextState = {
    activeTab,
    setActiveTab,
    jobTargetId,
    jobTargetRequest,
    openJob,
    clearJobTarget,
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
