import { useState, useEffect, lazy, Suspense } from 'react';
import { Bell, LogOut } from 'lucide-react';
import { AppProvider, useApp } from './store/AppContext';
import { AuthOverlay } from './components/auth/AuthOverlay';
import { ResetPasswordOverlay } from './components/auth/ResetPasswordOverlay';
import { supabase } from './lib/supabase';
import { NoAccess } from './components/shared/NoAccess';
import { NotificationsPanel } from './components/shared/NotificationsPanel';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { OraculoBar } from './components/OraculoBar';
import { InstallPWA } from './components/shared/InstallPWA';
import { IniciacionGemelo, shouldShowIniciacion } from './components/shared/IniciacionGemelo';
import { HoloGemeloHome } from './components/perfil/HoloGemeloHome';
import { ToastProvider } from './components/shared/Toast';
import { ConnectionBanner } from './components/shared/ConnectionBanner';
import { RealtimeProvider } from './store/RealtimeContext';
import { LiveNetworkFeed } from './components/shared/LivePresence';
import { IncomingJobPush } from './components/shared/IncomingJobs';
import { PublicProfileGate } from './components/perfil/RedSocial';
import { VerifyCredentialView } from './components/perfil/VerifyCredential';
import { C, FONT } from './theme';
import type { TabId } from './types';

const WalletTab     = lazy(() => import('./components/tabs/WalletTab').then(m => ({ default: m.WalletTab })));
const ChatTab       = lazy(() => import('./components/tabs/ChatTab').then(m => ({ default: m.ChatTab })));
const EmpleosTab    = lazy(() => import('./components/tabs/EmpleosTab').then(m => ({ default: m.EmpleosTab })));
const MarketTab     = lazy(() => import('./components/tabs/MarketTab').then(m => ({ default: m.MarketTab })));
const PerfilTab     = lazy(() => import('./components/tabs/PerfilTab').then(m => ({ default: m.PerfilTab })));
const MaxSkillTab   = lazy(() => import('./components/tabs/MaxSkillTab').then(m => ({ default: m.MaxSkillTab })));
const AcademiaTab   = lazy(() => import('./components/tabs/AcademiaTab').then(m => ({ default: m.AcademiaTab })));
const GobernanzaTab = lazy(() => import('./components/tabs/GobernanzaTab').then(m => ({ default: m.GobernanzaTab })));
const VaultTab      = lazy(() => import('./components/tabs/VaultTab').then(m => ({ default: m.VaultTab })));

const TAB_TITLES: Record<TabId, string> = {
  perfil: 'Inicio', maxskill: 'Habilidades', academia: 'Academia', market: 'Servicios',
  empleos: 'Empleos', chat: 'Mensajes', wallet: 'Billetera', gobernanza: 'Gobernanza',
  vault: 'Bóveda',
};

function TabLoader() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: C.bg }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(92,200,255,0.06)', border: `1px solid ${C.cyanDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(94,92,230,0.28)' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${C.cyan}`, borderTopColor: 'transparent', animation: 'cp-spin 0.8s linear infinite' }} />
      </div>
      <p style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 2, color: C.cyanDim, textTransform: 'uppercase' }}>Cargando módulo...</p>
    </div>
  );
}

function AppShell() {
  const { authStatus, isLoadingProfile, activeTab, setActiveTab, profile, unreadCount } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showIniciacion, setShowIniciacion] = useState(() => shouldShowIniciacion());
  const [perfilView, setPerfilView] = useState<'holo' | 'classic'>('holo');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setShowResetPassword(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Atajos PWA (long-press del icono): /?tab=wallet abre ese hub directo.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    const valid: TabId[] = ['perfil', 'maxskill', 'academia', 'market', 'empleos', 'chat', 'wallet', 'gobernanza', 'vault'];
    if (t && (valid as string[]).includes(t)) setActiveTab(t as TabId);
  }, [setActiveTab]);

  if (authStatus === 'loading' || isLoadingProfile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 22, background: C.bg, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 42%, rgba(94,92,230,0.14), transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', width: 92, height: 92, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(140deg, #5cc8ff, #5e5ce6)', boxShadow: '0 22px 60px rgba(94,92,230,0.5)', animation: 'floatY 4s ease-in-out infinite' }}>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 50, color: '#fff' }}>Ω</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${C.cyan}`, borderTopColor: 'transparent', animation: 'cp-spin 0.8s linear infinite' }} />
          <p style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 2.5, color: C.cyanDim, textTransform: 'uppercase', margin: 0 }}>Conectando a la Red Ómicron...</p>
        </div>
      </div>
    );
  }

  if (showResetPassword) return <ResetPasswordOverlay onDone={() => setShowResetPassword(false)} />;
  if (authStatus === 'unauthenticated') return <AuthOverlay />;
  if (authStatus === 'no_access') return <NoAccess />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {showIniciacion && (
        <ErrorBoundary section="Iniciación">
          <IniciacionGemelo
            userName={profile?.full_name || profile?.username}
            onClose={() => setShowIniciacion(false)}
          />
        </ErrorBoundary>
      )}
      {activeTab === 'perfil' && perfilView === 'holo' ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          <ErrorBoundary section="Gemelo">
            <HoloGemeloHome onOpenPerfil={() => setPerfilView('classic')} />
          </ErrorBoundary>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {/* Barra de seccion (drill-down desde el Gemelo). Reemplaza al header/menu viejos. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', flexShrink: 0, borderBottom: '1px solid rgba(150,180,255,0.12)', background: 'rgba(9,12,22,0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', position: 'relative', zIndex: 3 }}>
            <button onClick={() => { setPerfilView('holo'); setActiveTab('perfil'); }} aria-label="Volver al Gemelo" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 12, background: 'rgba(92,200,255,0.10)', border: '1px solid rgba(92,200,255,0.28)', color: '#5cc8ff', fontFamily: FONT.mono, fontSize: 12.5, cursor: 'pointer' }}>← Gemelo</button>
            <span style={{ flex: 1, fontFamily: FONT.display, fontWeight: 700, fontSize: 16, color: '#eaf0fb', letterSpacing: -0.2 }}>{TAB_TITLES[activeTab]}</span>
            <button onClick={() => setShowNotifications(true)} aria-label="Notificaciones" style={{ position: 'relative', width: 34, height: 34, borderRadius: 11, background: 'rgba(92,200,255,0.10)', border: '1px solid rgba(92,200,255,0.28)', color: '#5cc8ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={16} />
              {unreadCount > 0 && (<span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: C.red, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>)}
            </button>
            <button onClick={() => supabase.auth.signOut()} aria-label="Cerrar sesión" style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(255,92,122,0.12)', border: '1px solid rgba(255,92,122,0.3)', color: '#ff5c7a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={16} />
            </button>
          </div>
          <ErrorBoundary section={TAB_TITLES[activeTab]} key={activeTab}>
            <Suspense fallback={<TabLoader />}>
              {activeTab === 'perfil'     && <PerfilTab />}
              {activeTab === 'maxskill'   && <MaxSkillTab />}
              {activeTab === 'academia'   && <AcademiaTab />}
              {activeTab === 'market'     && <MarketTab />}
              {activeTab === 'empleos'    && <EmpleosTab />}
              {activeTab === 'chat'       && <ChatTab />}
              {activeTab === 'wallet'     && <WalletTab />}
              {activeTab === 'gobernanza' && <GobernanzaTab />}
              {activeTab === 'vault'      && <VaultTab />}
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      <LiveNetworkFeed />
      <IncomingJobPush />
      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
      <PublicProfileGate />
      <ErrorBoundary section="Oráculo">
        <OraculoBar />
      </ErrorBoundary>
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
