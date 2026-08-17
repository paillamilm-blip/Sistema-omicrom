// features/perfil/hooks/useProfileQuery.ts
// TanStack Query hook for fetching and managing user profile data.
//
// Usage:
//   const { data: profile, isLoading, refetch } = useProfileQuery(userId);
//   const { mutate: updateProfile } = useUpdateProfile();

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { queryKeys } from '@/infrastructure/query/keys';
import type { Profile } from '@/types/profile';

/**
 * Fetch the current user's profile with automatic caching and revalidation.
 */
export function useProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile.detail(userId ?? ''),
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // Profile is stable — 1 min stale time
  });
}

/**
 * Update profile fields with optimistic update.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<Profile> }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data, { userId }) => {
      // Update the cache with the new profile data
      queryClient.setQueryData(queryKeys.profile.detail(userId), data);
    },
  });
}
