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
import { GobernanzaTab } from './components/tabs/GobernanzaTab'; // ✅ FIX: Tab faltante agregado

import type { TabId } from './types';

// ✅ FIX: 'gobernanza' agregado al Record para que coincida con TabId completo
const TAB_TITLES: Record<TabId, string> = {
  perfil:     'Mi Perfil',
  maxskill:   'Max Skill',
  academia:   'Academia',
  market:     'Market',
  empleos:    'Empleos',
  chat:       'Chat Seguro',
  wallet:     'Wallet',
  gobernanza: 'Gobernanza',
};

function AppShell() {
  const { authStatus, isLoadingProfile, activeTab, profile, unreadCount } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // ✅ FIX: Listener de PASSWORD_RECOVERY movido aquí solo como fallback visual.
  // El manejo de sesión real ya ocurre en AppContext; este solo controla el overlay.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPassword(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authStatus === 'loading' || isLoadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-omicron-bg gap-4">
        <div className="w-12 h-12 rounded-2xl bg-omicron-accent/20 border border-omicron-accent/40 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-omicron-accent border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-omicron-subtle text-sm">Conectando a la Red Ómicron...</p>
      </div>
    );
  }

  if (showResetPassword) {
    return <ResetPasswordOverlay onDone={() => setShowResetPassword(false)} />;
  }

  if (authStatus === 'unauthenticated') return <AuthOverlay />;
  if (authStatus === 'no_access') return <NoAccess />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="flex-none flex items-center justify-between px-4 py-3 bg-omicron-surface border-b border-omicron-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-omicron-accent/20 border border-omicron-accent/40 flex items-center justify-center">
            <span className="text-omicron-accent text-[10px] font-bold">Ω</span>
          </div>
          <span className="text-omicron-text text-sm font-semibold">{TAB_TITLES[activeTab]}</span>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <span className="flex items-center gap-1 text-omicron-subtle text-xs">
              <span className="text-sm">🪙</span>
              <span className="font-semibold text-omicron-text">{(profile.token_balance ?? 0).toLocaleString()}</span>
            </span>
          )}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-8 h-8 rounded-xl bg-omicron-card border border-omicron-border flex items-center justify-center text-omicron-subtle hover:text-omicron-text transition active:scale-90"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Sub-pestañas del hub activo (píldoras) */}
      <HubSubNav />

      {/* Tab content area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'perfil'     && <PerfilTab />}
        {activeTab === 'maxskill'   && <MaxSkillTab />}
        {activeTab === 'academia'   && <AcademiaTab />}
        {activeTab === 'market'     && <MarketTab />}
        {activeTab === 'empleos'    && <EmpleosTab />}
        {activeTab === 'chat'       && <ChatTab />}
        {activeTab === 'wallet'     && <WalletTab />}
        {activeTab === 'gobernanza' && <GobernanzaTab />} {/* ✅ FIX: Render del tab faltante */}
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
