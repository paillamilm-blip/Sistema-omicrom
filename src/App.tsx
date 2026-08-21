import { OrbShell } from '@/features/omicron/components/OrbShell';
import { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/infrastructure/query/client';
import { AppProvider, useApp } from './store/AppContext';
import { AuthOverlay } from '@/features/auth/components/AuthOverlay';
import { ResetPasswordOverlay } from '@/features/auth/components/ResetPasswordOverlay';
import { supabase } from '@/infrastructure/supabase/client';
import { NoAccess } from '@/features/auth/components/NoAccess';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { InstallPWA } from '@/shared/components/InstallPWA';
import ParticleOrb from '@/features/omicron/components/ParticleOrbLazy';
import { ToastProvider } from '@/shared/components/Toast';
import { ConnectionBanner } from '@/shared/components/ConnectionBanner';
import { RealtimeProvider } from './store/RealtimeContext';
import { LiveNetworkFeed } from '@/features/gemelo/components/LivePresence';
import { IncomingJobPush } from '@/features/empleos/components/IncomingJobs';
import { PublicProfileGate } from '@/features/gemelo/components/RedSocial';
import { VerifyCredentialView } from '@/features/gemelo/components/VerifyCredential';
import { C, FONT } from './theme';
import { SelfManagedPulseBar } from '@/shared/components/LivePulseBar';
import { EmotionBridge } from '@/shared/components/EmotionBridge';
import { omicronAudio } from '@/shared/utils/spatialAudio';


function AppShell() {
  const { authStatus, isLoadingProfile } = useApp();
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Unlock audio on first user gesture (browser policy)
  useEffect(() => {
    const unlock = () => { omicronAudio.unlock(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  // Track visit count for push permission timing
  useEffect(() => {
    const key = 'omicron_visit_count';
    const count = parseInt(localStorage.getItem(key) ?? '0');
    localStorage.setItem(key, String(count + 1));

    // Analytics: track open + daily return
    import('@/shared/utils/analytics').then(({ track }) => {
      track('app_opened');
      if (count > 0) track('daily_return');
    }).catch(() => {});

    // Register daily activity for streak (server-side)
    if (authStatus === 'authenticated') {
      supabase.rpc('register_daily_activity', { p_challenge: false, p_pe: 0 }).then(() => {/* ok */});
    }
  }, [authStatus]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setShowResetPassword(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Escuchar evento 'omicron:request-auth' para abrir modal de auth
  useEffect(() => {
    const handler = () => setShowAuthModal(true);
    window.addEventListener('omicron:request-auth', handler);
    return () => window.removeEventListener('omicron:request-auth', handler);
  }, []);

  // Timeout: si auth tarda más de 5s, forzar modo guest
  const [forceGuest, setForceGuest] = useState(false);
  useEffect(() => {
    if (authStatus !== 'loading' && !isLoadingProfile) return;
    const timer = setTimeout(() => {
      setForceGuest(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [authStatus, isLoadingProfile]);

  if ((authStatus === 'loading' || isLoadingProfile) && !forceGuest) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 22, background: C.bg, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 42%, rgba(94,92,230,0.14), transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', width: 168, height: 168 }}>
          <ParticleOrb />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}>
          <p style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 2.5, color: C.cyanDim, textTransform: 'uppercase', margin: 0 }}>Conectando a la Red Ómicron...</p>
          <button onClick={() => setForceGuest(true)} style={{ marginTop: 8, padding: '8px 16px', borderRadius: 999, background: 'transparent', border: `1px solid ${C.cyan}44`, color: C.cyan, fontFamily: FONT.mono, fontSize: 10, cursor: 'pointer' }}>
            Entrar sin cuenta →
          </button>
        </div>
      </div>
    );
  }

  if (showResetPassword) return <ResetPasswordOverlay onDone={() => setShowResetPassword(false)} />;
  if (authStatus === 'no_access') return <NoAccess />;

  const isGuest = authStatus === 'unauthenticated' || forceGuest;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <SelfManagedPulseBar />
      <OrbShell />
      {isGuest && showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
      <LiveNetworkFeed />
      {!isGuest && <IncomingJobPush />}
      <PublicProfileGate />
      <ErrorBoundary section="InstalarApp">
        <InstallPWA />
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  // Verificación pública del Pasaporte (no requiere cuenta): ?verificar=<token>
  const verifyToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('verificar')
    : null;
  if (verifyToken) return <VerifyCredentialView token={verifyToken} />;

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <ToastProvider>
          <RealtimeProvider>
            <EmotionBridge>
              <ConnectionBanner />
              <AppShell />
            </EmotionBridge>
          </RealtimeProvider>
        </ToastProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}
