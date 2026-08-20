// infrastructure/router/preload.ts
// Prefetch tab chunks on idle to improve perceived navigation speed.
//
// Strategy: after the app is interactive (2s idle), preload the most
// likely next tabs. This means the chunk is already in the browser cache
// when the user taps a node.

import type { TabId } from '@/types';

// Map of tab → dynamic import function (mirrors OrbShell lazy definitions)
const TAB_LOADERS: Partial<Record<TabId, () => Promise<unknown>>> = {
  perfil:     () => import('@/features/gemelo/components/GemeloTab'),
  empleos:    () => import('@/features/empleos/components/EmpleosTab'),
  academia:   () => import('@/features/academia/components/AcademiaTab'),
  market:     () => import('@/features/market/components/MarketTab'),
  wallet:     () => import('@/features/wallet/components/WalletTab'),
  chat:       () => import('@/features/chat/components/ChatTab'),
  gobernanza: () => import('@/features/gobernanza/components/GobernanzaTab'),
  maxskill:   () => import('@/features/academia/components/MaxSkillTab'),
  vault:      () => import('@/features/market/components/VaultTab'),
};

/**
 * Preload a specific tab's chunk. Safe to call multiple times (idempotent).
 */
export function preloadTab(tab: TabId): void {
  const loader = TAB_LOADERS[tab];
  if (loader) loader().catch(() => {/* silent — just a prefetch */});
}

/**
 * Preload the most commonly visited tabs after a delay.
 * Call once on app mount. Uses requestIdleCallback when available.
 */
export function preloadCriticalTabs(): void {
  const PRIORITY_TABS: TabId[] = ['perfil', 'empleos', 'academia'];
  const DELAY_MS = 2000;

  const doPreload = () => {
    PRIORITY_TABS.forEach(preloadTab);
  };

  if ('requestIdleCallback' in window) {
    setTimeout(() => {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(doPreload);
    }, DELAY_MS);
  } else {
    setTimeout(doPreload, DELAY_MS + 500);
  }
}
