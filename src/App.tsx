import { useState, useEffect, lazy, Suspense } from 'react';
import { Bell } from 'lucide-react';
import { AppProvider, useApp } from './store/AppContext';
import { AuthOverlay } from './components/auth/AuthOverlay';
import { ResetPasswordOverlay } from './components/auth/ResetPasswordOverlay';
import { supabase } from './lib/supabase';
import { NoAccess } from './components/shared/NoAccess';
import { BottomNav } from './components/shared/BottomNav';
import { HubSubNav } from './components/shared/HubSubNav';
import { NotificationsPanel } from './components/shared/NotificationsPanel';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { Onboarding, shouldShowOnboarding } from './components/shared/Onboarding';
import { ToastProvider } from './components/shared/Toast';
import { ConnectionBanner } from './components/shared/ConnectionBanner';
import { C, FONT } from './theme';
import type { TabId } from './types';

// ── Carga diferida (code-splitting): cada pestaña es su propio chunk, ──
// ── por lo que el arranque inicial en móvil es mucho más liviano. ──
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
  perfil: 'Mi Perfil', maxskill: 'Max Skill', academia: 'Academia', market: 'Market',
  empleos: 'Empleos', chat: 'Chat Seguro', wallet: 'Wallet', gobernanza: 'Gobernanza',
  vault: 'Bóveda',
};

function TabLoader() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: C.bg }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0,240,255,0.06)', border: `1px solid ${C.cyanDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(0,240,255,0.18)' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${C.cyan}`, borderTopColor: 'transparent', animation: 'cp-spin 0.8s linear infinite' }} />
      </div>
      <p style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 2, color: C.cyanDim, textTransform: 'uppercase' }}>Cargando módulo...</p>
    </div>
  );
}

function AppShell() {
  const { authStatus, isLoadingProfile, activeTab, profile, unreadCount } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding());

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setShowResetPassword(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authStatus === 'loading' || isLoadingProfile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 22, background: C.bg, position: 'relative', overflow: 'hidden' }}>
        {/* Halo radial de fondo */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 42%, rgba(0,240,255,0.10), transparent 60%)', pointerEvents: 'none' }} />
        {/* Logo Ω flotante con glow */}
        <div style={{ position: 'relative', width: 88, height: 88, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(125,249,255,0.18), rgba(0,240,255,0.06))', border: '1px solid rgba(0,240,255,0.4)', boxShadow: '0 0 38px rgba(0,240,255,0.35), inset 0 0 26px rgba(0,95,115,0.18)', animation: 'floatY 5s ease-in-out infinite' }}>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 48, background: 'linear-gradient(135deg, #7df9ff, #00F0FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 0 10px rgba(0,240,255,0.6))' }}>Ω</span>
        </div>
        {/* Spinner + texto */}
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
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
      {/* Top bar HUD — barra de comando distintiva */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'linear-gradient(180deg, rgba(10,20,40,0.9), rgba(2,6,19,0.92))', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(0,240,255,0.40)', boxShadow: '0 3px 18px rgba(0,0,0,0.55), 0 0 22px rgba(0,240,255,0.10), inset 0 -1px 0 rgba(0,240,255,0.30)', flexShrink: 0, position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7df9ff, #00F0FF)', boxShadow: '0 0 16px rgba(0,240,255,0.6)' }}>
            <span style={{ color: '#020613', fontFamily: FONT.display, fontWeight: 700, fontSize: 15 }}>Ω</span>
          </div>
          <span style={{ fontFamily: FONT.mono, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#eaf2ff', fontWeight: 700 }}>{TAB_TITLES[activeTab]}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {profile && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT.mono, fontSize: 13, color: '#F59E0B', fontWeight: 700 }}>
              🪙 {(profile.token_balance ?? 0).toLocaleString()}
            </span>
          )}
          <button onClick={() => setShowNotifications(true)} aria-label="Notificaciones" style={{ position: 'relative', width: 34, height: 34, borderRadius: 8, background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.3)', color: '#7df9ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: C.red, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Sub-pestañas del hub activo (Árbol / Academia, Identidad / Wallet, etc.) */}
      <HubSubNav />

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
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

      <BottomNav />
      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <ConnectionBanner />
        <AppShell />
      </ToastProvider>
    </AppProvider>
  );
}
