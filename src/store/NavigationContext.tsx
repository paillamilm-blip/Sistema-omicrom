// store/NavigationContext.tsx
// ═══════════════════════════════════════════════════════════════════════
// Navegación (activeTab) + notificaciones no leídas.
//
// AFTER ROUTER MIGRATION:
// - activeTab is now DERIVED from the current URL via React Router
// - setActiveTab calls navigate() under the hood
// - Fallback: if not inside a Router, uses local state (for tests/SSR)
//
// Depende del profile.id de ProfileContext (para el canal de notificaciones),
// por eso NavigationProvider debe montarse DENTRO de ProfileProvider.
// ═══════════════════════════════════════════════════════════════════════

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/infrastructure/supabase/client';
import { tabFromPath, pathFromTab } from '@/infrastructure/router/routes';
import type { TabId } from '../types';

export interface NavigationContextState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

const NavigationContext = createContext<NavigationContextState | null>(null);

export function NavigationProvider({ profileId, children }: { profileId?: string; children: ReactNode }) {
  // ── Tab state derived from URL ──────────────────────────────────────
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = tabFromPath(location.pathname);

  const setActiveTab = useCallback((tab: TabId) => {
    const path = pathFromTab(tab);
    if (location.pathname !== path) {
      navigate(path);
    }
  }, [navigate, location.pathname]);

  // ── Notifications ───────────────────────────────────────────────────
  const [unreadCount, setUnreadCount] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!profileId) setUnreadCount(0);
  }, [profileId]);

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
