// types/common.ts
// Tipos compartidos fundamentales (auth, navegación, utilidades)

import type { Profile } from './profile';

// ===== AUTHENTICATION =====
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'no_access';

// ===== TAB NAVIGATION =====
export type TabId = 'perfil' | 'maxskill' | 'academia' | 'empleos' | 'chat' | 'market' | 'wallet' | 'gobernanza' | 'vault';

// ===== APP STATE (Context) =====
export interface AppState {
  // === AUTH ===
  authStatus: AuthStatus;
  isLoadingProfile: boolean;

  // === PROFILE ===
  profile: Profile | null;

  // === NAVIGATION ===
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  // === NOTIFICATIONS ===
  unreadCount: number;
  setUnreadCount: (count: number) => void;

  // === ACTIONS ===
  refreshProfile: () => Promise<void>;
}

// ===== UTILIDADES =====
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ReputationUpdateInput {
  user_id: string;
  execution_delta?: number;
  quality_delta?: number;
  transcendence_delta?: number;
  foundation_delta?: number;
  reason: string;
  trigger_event_id?: string;
}
