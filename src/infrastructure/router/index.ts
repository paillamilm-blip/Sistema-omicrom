// infrastructure/router/
// URL routing utilities for Sistema Ómicron

export { ROUTES, TAB_TO_PATH, PATH_TO_TAB, tabFromPath, pathFromTab } from './routes';
export type { RouteConfig } from './routes';
export { preloadTab, preloadCriticalTabs } from './preload';
