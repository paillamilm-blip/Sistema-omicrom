// store/AppContext.tsx
// VERSIÓN CORREGIDA - Gemelo Digital, reputación, sin race conditions

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { calculateGemeloDigital, updateReputationInDatabase } from '../services/reputationService';
import type { AppState, Profile, TabId, GemeloDigital } from '../types';

// ✅ FIX: Eliminado AppContext duplicado que nunca se usaba.
// Solo existe un contexto: ExtendedAppContext.

// ✅ FIX: Constantes movidas aquí; reputationService las puede importar desde types/constants si las necesita.
const DEFAULT_PE_POINTS = 0;
const DEFAULT_REPUTATION = 50;

interface ExtendedAppState extends AppState {
  gemelo: GemeloDigital | null;
  updateReputation: (input: {
    execution_delta?: number;
    quality_delta?: number;
    transcendence_delta?: number;
    foundation_delta?: number;
    reason: string;
    trigger_event_id?: string;
  }) => Promise<boolean>;
}

const ExtendedAppContext = createContext<ExtendedAppState | null>(null);


export function AppProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('perfil');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gemelo, setGemelo] = useState<GemeloDigital | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [authStatus, setAuthStatus] = useState<AppState['authStatus']>('loading');
  const [unreadCount, setUnreadCount] = useState(0);

  const isMounted = useRef(true);

  // ✅ FIX: fetchAttempted eliminado. En su lugar usamos una flag local por efecto
  // para evitar la race condition entre getSession() y onAuthStateChange('SIGNED_IN').
  // La sesión de onAuthStateChange es la fuente de verdad única.

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return error || !data ? null : (data as Profile);
  }, []);

  // Recalcular Gemelo Digital cada vez que cambia el perfil
  useEffect(() => {
    if (profile && isMounted.current) {
      setGemelo(calculateGemeloDigital(profile));
    }
  }, [profile]);


  // ✅ FIX: updateReputation ya no usa setTimeout para refrescar el perfil.
  // El canal real-time de profiles (más abajo) ya detecta el UPDATE y actualiza el estado.
  const updateReputation = useCallback(
    async (input: {
      execution_delta?: number;
      quality_delta?: number;
      transcendence_delta?: number;
      foundation_delta?: number;
      reason: string;
      trigger_event_id?: string;
    }) => {
      if (!profile?.id) return false;

      const success = await updateReputationInDatabase({
        user_id: profile.id,
        ...input,
      });

      // El canal real-time actualizará el perfil automáticamente si success === true.
      return success;
    },
    [profile?.id]
  );

  const refreshProfile = useCallback(async () => {
    if (!profile?.id) return;
    const p = await fetchProfile(profile.id);
    if (p && isMounted.current) setProfile(p);
  }, [profile?.id, fetchProfile]);


  // ✅ FIX: Flujo de autenticación usando onAuthStateChange como fuente única.
  // getSession() ya no dispara loadProfile directamente; solo sirve para detectar
  // si el usuario ya tiene sesión al montar (el evento INITIAL_SESSION lo cubre).
  useEffect(() => {
    let effectMounted = true;

    async function loadProfile(session: Session) {
      if (!effectMounted) return;
      setIsLoadingProfile(true);

      try {
        let data = await fetchProfile(session.user.id);

        // Reintentos con backoff (el trigger de BD puede demorar en crear el perfil)
        let attempts = 0;
        while (!data && attempts < 5 && effectMounted) {
          await new Promise(r => setTimeout(r, 200 * (attempts + 1)));
          if (!effectMounted) return;
          data = await fetchProfile(session.user.id);
          attempts++;
        }

        if (!effectMounted) return;


        if (!data) {
          if (import.meta.env.DEV) {
            console.warn('Profile not found after retries. Creating fallback.');
          }

          const username = session.user.email?.split('@')[0] ?? 'usuario';
          const { data: created, error } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              username,
              full_name: username,
              pe_points: DEFAULT_PE_POINTS,
              is_pioneer: false,
              node_type: 'Nodo Operativo',
              node_level: 1,
              reputation_score: DEFAULT_REPUTATION,
              execution_score: DEFAULT_REPUTATION,
              quality_score: DEFAULT_REPUTATION,
              transcendence_score: DEFAULT_REPUTATION,
              foundation_score: DEFAULT_REPUTATION,
              traditional_score: 0,
              experience_score: 0,
              node_status: 'ACTIVE',
              is_verified_professional: false,
              can_receive_contracts: true,
              total_contracts_completed: 0,
              total_earnings: 0,
            })
            .select()
            .maybeSingle();

          if (error) {
            if (import.meta.env.DEV) console.error('Profile creation error:', error);
            throw error;
          }
          data = created as Profile | null;
        }

        if (!effectMounted) return;


        if (data) {
          setProfile(data);
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('no_access');
          setProfile(null);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('loadProfile error:', err);
        if (effectMounted) {
          setAuthStatus('no_access');
          setProfile(null);
        }
      } finally {
        if (effectMounted) setIsLoadingProfile(false);
      }
    }

    // ✅ FIX: onAuthStateChange es la única fuente de verdad para la sesión.
    // INITIAL_SESSION dispara al montar con la sesión existente (equivale al getSession anterior).
    // Esto elimina la race condition entre getSession() y SIGNED_IN.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!effectMounted) return;

      if (event === 'INITIAL_SESSION') {
        if (session) {
          loadProfile(session);
        } else {
          setAuthStatus('unauthenticated');
          setIsLoadingProfile(false);
        }
      } else if (event === 'SIGNED_IN' && session) {
        // Solo carga si no hay perfil (evita recargas innecesarias en token refresh)
        if (!profile) {
          loadProfile(session);
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setGemelo(null);
        setAuthStatus('unauthenticated');
        setIsLoadingProfile(false);
        setUnreadCount(0);
      }
    });

    return () => {
      effectMounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar; fetchProfile es estable (useCallback sin deps cambiantes)


  // Notificaciones no leídas
  useEffect(() => {
    if (!profile?.id) return;

    let cancelled = false;

    const load = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
      if (!cancelled && isMounted.current) {
        setUnreadCount(count ?? 0);
      }
    };

    load();

    const channel = supabase
      .channel(`notif-count-${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);


  // ✅ Canal real-time para cambios de reputación.
  // Esto reemplaza el setTimeout en updateReputation: cuando la BD confirma el UPDATE,
  // este canal actualiza el estado automáticamente sin polling manual.
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`reputation-changes-${profile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${profile.id}`,
      }, (payload) => {
        if (isMounted.current && payload.new) {
          setProfile(payload.new as Profile);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const value: ExtendedAppState = {
    activeTab,
    setActiveTab,
    profile,
    isLoadingProfile,
    authStatus,
    unreadCount,
    setUnreadCount,
    refreshProfile,
    gemelo,
    updateReputation,
  };

  return (
    <ExtendedAppContext.Provider value={value}>
      {children}
    </ExtendedAppContext.Provider>
  );
}


export function useApp(): ExtendedAppState {
  const ctx = useContext(ExtendedAppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// Hook para obtener solo el Gemelo Digital
export function useGemeloDigital(): GemeloDigital | null {
  const { gemelo } = useApp();
  return gemelo;
}

// Hook para actualizar reputación fácilmente
export function useUpdateReputation() {
  const { updateReputation } = useApp();
  return updateReputation;
}
