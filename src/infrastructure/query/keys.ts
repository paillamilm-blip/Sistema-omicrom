// infrastructure/query/keys.ts
// Centralized query key factory for type-safe cache invalidation.
//
// Pattern: each domain exports a key factory that produces consistent
// arrays for use with useQuery/useMutation/queryClient.invalidateQueries.
//
// Usage:
//   useQuery({ queryKey: queryKeys.profile.detail(userId), ... })
//   queryClient.invalidateQueries({ queryKey: queryKeys.profile.all })

export const queryKeys = {
  // === PROFILE ===
  profile: {
    all: ['profile'] as const,
    detail: (userId: string) => ['profile', userId] as const,
    gemelo: (userId: string) => ['profile', userId, 'gemelo'] as const,
    reputation: (userId: string) => ['profile', userId, 'reputation'] as const,
  },

  // === SKILLS ===
  skills: {
    all: ['skills'] as const,
    tree: () => ['skills', 'tree'] as const,
    progress: (userId: string) => ['skills', 'progress', userId] as const,
    tests: (nodeId: string) => ['skills', 'tests', nodeId] as const,
  },

  // === JOBS ===
  jobs: {
    all: ['jobs'] as const,
    list: (filters?: Record<string, unknown>) => ['jobs', 'list', filters] as const,
    detail: (jobId: string) => ['jobs', jobId] as const,
    matches: (userId: string) => ['jobs', 'matches', userId] as const,
  },

  // === MARKET ===
  market: {
    all: ['market'] as const,
    services: (filters?: Record<string, unknown>) => ['market', 'services', filters] as const,
    detail: (serviceId: string) => ['market', serviceId] as const,
  },

  // === WALLET ===
  wallet: {
    all: ['wallet'] as const,
    balance: (userId: string) => ['wallet', 'balance', userId] as const,
    transactions: (userId: string) => ['wallet', 'transactions', userId] as const,
  },

  // === CHAT ===
  chat: {
    all: ['chat'] as const,
    rooms: (userId: string) => ['chat', 'rooms', userId] as const,
    messages: (roomId: string) => ['chat', 'messages', roomId] as const,
  },

  // === NOTIFICATIONS ===
  notifications: {
    all: ['notifications'] as const,
    unread: (userId: string) => ['notifications', 'unread', userId] as const,
    list: (userId: string) => ['notifications', 'list', userId] as const,
  },

  // === ACADEMIA ===
  academia: {
    all: ['academia'] as const,
    dailyChallenge: (userId: string) => ['academia', 'challenge', userId] as const,
    streak: (userId: string) => ['academia', 'streak', userId] as const,
  },
} as const;
