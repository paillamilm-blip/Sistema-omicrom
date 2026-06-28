import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { AppProvider, useApp } from './store/AppContext';
import { AuthOverlay } from './components/auth/AuthOverlay';
import { ResetPasswordOverlay } from './components/auth/ResetPasswordOverlay';
import { supabase } from './lib/supabase';
import { NoAccess } from './components/shared/NoAccess';
import { BottomNav } from './components/shared/BottomNav';
import { HubSubNav } from './components/shared/HubSubNav';
import { NotificationsPanel } from './components/shared/NotificationsPanel';
import { WalletTab }     from './components/tabs/WalletTab';
import { ChatTab }       from './components/tabs/ChatTab';
import { EmpleosTab }    from './components/tabs/EmpleosTab';
import { MarketTab }     from './components/tabs/MarketTab';
import { PerfilTab }     from './components/tabs/PerfilTab';
import { MaxSkillTab }   from './components/tabs/MaxSkillTab';
import { AcademiaTab }   from './components/tabs/AcademiaTab';
import { GobernanzaTab } from './components/tabs/GobernanzaTab';
import { C, FONT } from './theme';
import type { TabId } from './types';

const TAB_TITLES: Record<TabId, string> = {
  perfil: 'Mi Perfil', maxskill: 'Max Skill', academia: 'Academia', market: 'Market',
  empleos: 'Empleos', chat: 'Chat Seguro', wallet: 'Wallet', gobernanza: 'Gobernanza',
};

function AppShell() {
  const { authStatus, isLoadingProfile, activeTab, profile, unreadCount } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setShowResetPassword(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authStatus === 'loading' || isLoadingProfile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, background: C.bg }}>
        <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(0,245,255,0.06)', border: `1px solid ${C.cyanDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${C.cyan}`, borderTopColor: 'transparent', animation: 'cp-spin 0.8s linear infinite' }} />
        </div>
        <p style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 2, color: C.cyanDim, textTransform: 'uppercase' }}>Conectando a la Red Ómicron...</p>
      </div>
    );
  }

  if (showResetPassword) return <ResetPasswordOverlay onDone={() => setShowResetPassword(false)} />;
  if (authStatus === 'unauthenticated') return <AuthOverlay />;
  if (authStatus === 'no_access') return <NoAccess />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar HUD */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.cyanFaint}`, background: 'rgba(0,245,255,0.02)', flexShrink: 0, position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,245,255,0.1)', border: `1px solid ${C.cyanDim}`, boxShadow: `0 0 8px ${C.cyanFaint}` }}>
            <span style={{ color: C.cyan, fontFamily: FONT.display, fontWeight: 700, fontSize: 14 }}>Ω</span>
          </div>
          <span style={{ fontFamily: FONT.mono, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: C.cyan }}>{TAB_TITLES[activeTab]}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {profile && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT.mono, fontSize: 12, color: C.gold }}>
              🪙 {(profile.token_balance ?? 0).toLocaleString()}
            </span>
          )}
          <button onClick={() => setShowNotifications(true)} style={{ position: 'relative', width: 34, height: 34, borderRadius: 8, background: 'rgba(0,245,255,0.06)', border: `1px solid ${C.cyanFaint}`, color: C.cyan, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        {activeTab === 'perfil'     && <PerfilTab />}
        {activeTab === 'maxskill'   && <MaxSkillTab />}
        {activeTab === 'academia'   && <AcademiaTab />}
        {activeTab === 'market'     && <MarketTab />}
        {activeTab === 'empleos'    && <EmpleosTab />}
        {activeTab === 'chat'       && <ChatTab />}
        {activeTab === 'wallet'     && <WalletTab />}
        {activeTab === 'gobernanza' && <GobernanzaTab />}
      </div>

      <BottomNav />
      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
