import { OrbShell } from './components/omicron/OrbShell';
import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { AuthOverlay } from './components/auth/AuthOverlay';
import { ResetPasswordOverlay } from './components/auth/ResetPasswordOverlay';
import { supabase } from './lib/supabase';
import { NoAccess } from './components/shared/NoAccess';
import { NotificationsPanel } from './components/shared/NotificationsPanel';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { InstallPWA } from './components/shared/InstallPWA';
import ParticleOrb from './components/omicron/ParticleOrb';
import { ToastProvider } from './components/shared/Toast';
import { ConnectionBanner } from './components/shared/ConnectionBanner';
import { RealtimeProvider } from './store/RealtimeContext';
import { LiveNetworkFeed } from './components/shared/LivePresence';
import { IncomingJobPush } from './components/shared/IncomingJobs';
import { PublicProfileGate } from './components/perfil/RedSocial';
import { VerifyCredentialView } from './components/perfil/VerifyCredential';
import { C, FONT } from './theme';


function AppShell() {
  const { authStatus, isLoadingProfile } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Track visit count for push permission timing
  useEffect(() => {
    const key = 'omicron_visit_count';
    const count = parseInt(localStorage.getItem(key) ?? '0');
    localStorage.setItem(key, String(count + 1));

    // Register daily activity for streak (server-side)
    if (authStatus === 'authenticated') {
      void supabase.rpc('register_daily_activity', { p_challenge: false, p_pe: 0 }).catch(() => {});
    }
  }, [authStatus]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setShowResetPassword(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authStatus === 'loading' || isLoadingProfile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 22, background: C.bg, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 42%, rgba(94,92,230,0.14), transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', width: 168, height: 168 }}>
          <ParticleOrb />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}>
          <p style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 2.5, color: C.cyanDim, textTransform: 'uppercase', margin: 0 }}>Conectando a la Red Ómicron...</p>
        </div>
      </div>
    );
  }

  if (showResetPassword) return <ResetPasswordOverlay onDone={() => setShowResetPassword(false)} />;
  // GUEST MODE: permitir ver el orbe sin auth. Auth se pide cuando quiere guardar/postular/conectar.
  if (authStatus === 'no_access') return <NoAccess />;

  // Si no está autenticado, mostrar el orbe en modo guest (sin AuthOverlay bloqueante)
  const isGuest = authStatus === 'unauthenticated';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── ORBE NEURONAL: la app es el orbe ──────────────────────── */}
      <OrbShell />

      {/* Auth overlay como modal (no bloqueante) — se muestra cuando el guest quiere persistir */}
      {isGuest && showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}

      <LiveNetworkFeed />
      {!isGuest && <IncomingJobPush />}
      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
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
    <AppProvider>
      <ToastProvider>
        <RealtimeProvider>
          <ConnectionBanner />
          <AppShell />
        </RealtimeProvider>
      </ToastProvider>
    </AppProvider>
  );
}
