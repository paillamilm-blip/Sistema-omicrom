// store/ProfileContext.tsx
// Auth + Perfil + Gemelo Digital. Se mantienen juntos a propósito: el
// AuthStatus depende de si el perfil existe/se puede crear en la base de
// datos (no_access se dispara ahí, no es un concepto de auth "puro"), y la
// lógica de reintento anti-race-condition (ver comentarios ✅ FIX) asume
// que profile y authStatus viven en el mismo efecto. Separarlos de más
// reintroduciría esa clase de bug que ya se corrigió antes.
//
// Extraído de AppContext.tsx (Fase 0.3 del plan de producción) para que
// NavigationContext.tsx pueda cambiar activeTab sin re-renderizar todo lo
// que solo depende de profile/gemelo.

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
import { supabase } from '@/infrastructure/supabase/client';
import { calculateGemeloDigital, updateReputationInDatabase } from '@/features/gemelo/services/reputation';
import type { AuthStatus, Profile, GemeloDigital } from '../types';

const DEFAULT_PE_POINTS = 0;
const DEFAULT_REPUTATION = 50;

export interface ProfileContextState {
  authStatus: AuthStatus;
  isLoadingProfile: boolean;
  profile: Profile | null;
  gemelo: GemeloDigital | null;
  refreshProfile: () => Promise<void>;
  updateReputation: (input: {
    execution_delta?: number;
    quality_delta?: number;
    transcendence_delta?: number;
    foundation_delta?: number;
    reason: string;
    trigger_event_id?: string;
  }) => Promise<boolean>;
}

const ProfileContext = createContext<ProfileContextState | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gemelo, setGemelo] = useState<GemeloDigital | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  const isMounted = useRef(true);

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

  // Sincronizar el color del Gemelo (lectura, read-through). Cuando el
  // perfil autenticado se materializa (login o canal real-time), se
  // reconcilia el color guardado en el perfil con la caché local
  // (localStorage). Este es el punto centralizado por donde fluye el
  // perfil. hydrateUserColorFromProfile solo escribe si los valores
  // difieren (anti-bucle) y no rompe el modo invitado.
  useEffect(() => {
    if (!profile) return;
    import('@/shared/services/userColorSync')
      .then(m => m.hydrateUserColorFromProfile(profile.user_color))
      .catch(() => {});
  }, [profile?.id, profile?.user_color]);

  // updateReputation no usa setTimeout para refrescar el perfil: el canal
  // real-time de profiles (más abajo) ya detecta el UPDATE y actualiza el estado.
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

      return success;
    },
    [profile?.id]
  );

  const refreshProfile = useCallback(async () => {
    if (!profile?.id) return;
    const p = await fetchProfile(profile.id);
    if (p && isMounted.current) setProfile(p);
  }, [profile?.id, fetchProfile]);

  // Flujo de autenticación usando onAuthStateChange como fuente única.
  // getSession() no dispara loadProfile directamente; INITIAL_SESSION lo cubre
  // al montar. Esto elimina la race condition entre getSession() y SIGNED_IN.
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
        // Clean up session-specific caches to prevent data leaking between users
        import('@/features/omicron/services/brain').then(({ clearConversationMemory }) => clearConversationMemory()).catch(() => {});
        import('@/features/gemelo/services/memory').then(({ clearMemory }) => clearMemory()).catch(() => {});
        import('@/infrastructure/voice/voiceAI').then(({ clearVoiceCache }) => clearVoiceCache()).catch(() => {});
      }
    });

    return () => {
      effectMounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar; fetchProfile es estable (useCallback sin deps cambiantes)

  // Canal real-time para cambios de reputación (con debounce para evitar flood).
  useEffect(() => {
    if (!profile?.id) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let latestPayload: Profile | null = null;

    const channel = supabase
      .channel(`reputation-changes-${profile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${profile.id}`,
      }, (payload) => {
        if (!isMounted.current || !payload.new) return;
        latestPayload = payload.new as Profile;
        // Debounce: esperar 300ms antes de actualizar el estado
        // (evita flood de setProfile ante múltiples updates consecutivos)
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (isMounted.current && latestPayload) {
            setProfile(latestPayload);
            latestPayload = null;
          }
        }, 300);
      })
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const value: ProfileContextState = {
    authStatus,
    isLoadingProfile,
    profile,
    gemelo,
    refreshProfile,
    updateReputation,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextState {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
