// infrastructure/query/client.ts
// TanStack Query client configuration for Sistema Ómicrom
//
// Default settings optimized for a PWA with realtime subscriptions:
// - staleTime: 30s (data is fresh for 30s before refetching)
// - gcTime: 5min (cached data stays in memory for 5 min after unmount)
// - retry: 2 (retry failed requests twice)
// - refetchOnWindowFocus: true (refresh when user returns to tab)

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 seconds
      gcTime: 5 * 60 * 1000,       // 5 minutes
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
