import { useState, useEffect } from 'react';
import { OrbShell } from './components/omicron/OrbShell';
import { AppProvider, useApp } from './store/AppContext';
import { AuthOverlay } from './components/auth/AuthOverlay';
import { ResetPasswordOverlay } from './components/auth/ResetPasswordOverlay';
import { supabase } from './lib/supabase';
import { NoAccess } from './components/shared/NoAccess';
import { NotificationsPanel } from './components/shared/NotificationsPanel';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { InstallPWA } from './components/shared/InstallPWA';
import { ToastProvider } from './components/shared/Toast';
import { ConnectionBanner } from './components/shared/ConnectionBanner';
import { RealtimeProvider } from './store/RealtimeContext';
import { LiveNetworkFeed } from './components/shared/LivePresence';
import { IncomingJobPush } from './components/shared/IncomingJobs';
import { PublicProfileGate } from './components/perfil/RedSocial';
import { VerifyCredentialView } from './components/perfil/VerifyCredential';
import { C, FONT } from './theme';

// ═══════════════════════════════════════════════════════════════════════
// App.tsx — Entrada principal de Sistema Ómicron
//
// La navegación completa vive en OrbShell (el orbe neuronal).
// Este archivo solo maneja: auth flow + loading + providers.
// ═══════════════════════════════════════════════════════════════════════

function AppShell() {
  const { authStatus, isLoadingProfile } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') setShowResetPassword(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Loading state ─────────────────────────────────────────────────
  if (authStatus === 'loading' || isLoadingProfile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 22, background: C.bg }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${C.cyan}`, borderTopColor: 'transparent', animation: 'cp-spin 0.8s linear infinite' }} />
        <p style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 2.5, color: C.cyanDim, textTransform: 'uppercase', margin: 0 }}>Conectando a la Red Ómicron...</p>
      </div>
    );
  }

  // ── Auth gates ────────────────────────────────────────────────────
  if (showResetPassword) return <ResetPasswordOverlay onDone={() => setShowResetPassword(false)} />;
  if (authStatus === 'unauthenticated') return <AuthOverlay />;
  if (authStatus === 'no_access') return <NoAccess />;

  // ── Main app: the orb IS the app ─────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <OrbShell />

      <LiveNetworkFeed />
      <IncomingJobPush />
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
