// infrastructure/router/useNavigateTab.ts
// Drop-in replacement for setActiveTab that uses React Router navigation.
//
// Usage:
//   const navigateTab = useNavigateTab();
//   navigateTab('empleos'); // navigates to /empleos
//
// This hook allows gradual migration: components can switch from
// `setActiveTab('empleos')` → `navigateTab('empleos')` one at a time.

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { pathFromTab } from './routes';
import type { TabId } from '@/types';

/**
 * Hook that returns a function with the same signature as setActiveTab,
 * but uses React Router under the hood for real URL navigation.
 */
export function useNavigateTab() {
  const navigate = useNavigate();

  return useCallback((tab: TabId) => {
    navigate(pathFromTab(tab));
  }, [navigate]);
}
