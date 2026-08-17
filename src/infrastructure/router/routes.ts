// infrastructure/router/routes.ts
// Route definitions mapping TabId → URL paths
//
// Each tab in the system maps to a URL path for deep linking,
// browser back-button support, and shareable URLs.

import type { TabId } from '@/types';

export interface RouteConfig {
  path: string;
  tab: TabId;
  label: string;
}

/**
 * All app routes. The order matters for matching (more specific first).
 */
export const ROUTES: RouteConfig[] = [
  { path: '/',            tab: 'perfil',     label: 'Inicio' },
  { path: '/academia',    tab: 'academia',   label: 'Academia' },
  { path: '/habilidades', tab: 'maxskill',   label: 'Habilidades' },
  { path: '/empleos',     tab: 'empleos',    label: 'Empleos' },
  { path: '/mercado',     tab: 'market',     label: 'Mercado' },
  { path: '/boveda',      tab: 'vault',      label: 'Bóveda' },
  { path: '/mensajes',    tab: 'chat',       label: 'Mensajes' },
  { path: '/billetera',   tab: 'wallet',     label: 'Billetera' },
  { path: '/gobernanza',  tab: 'gobernanza', label: 'Gobernanza' },
];

/** Map TabId → path for programmatic navigation */
export const TAB_TO_PATH: Record<TabId, string> = Object.fromEntries(
  ROUTES.map(r => [r.tab, r.path])
) as Record<TabId, string>;

/** Map path → TabId for reading current route */
export const PATH_TO_TAB: Record<string, TabId> = Object.fromEntries(
  ROUTES.map(r => [r.path, r.tab])
) as Record<string, TabId>;

/** Get the TabId for the current pathname (fallback to 'perfil') */
export function tabFromPath(pathname: string): TabId {
  return PATH_TO_TAB[pathname] ?? 'perfil';
}

/** Get the path for a given TabId */
export function pathFromTab(tab: TabId): string {
  return TAB_TO_PATH[tab] ?? '/';
}
