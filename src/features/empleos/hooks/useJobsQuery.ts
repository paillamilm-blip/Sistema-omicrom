// features/empleos/hooks/useJobsQuery.ts
// TanStack Query hooks for job listings and matches.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { queryKeys } from '@/infrastructure/query/keys';
import type { JobPosting, JobMatch } from '@/types/jobs';

/**
 * Fetch available job postings with caching.
 */
export function useJobsQuery(filters?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: async (): Promise<JobPosting[]> => {
      let query = supabase
        .from('job_postings')
        .select('*')
        .order('published_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as JobPosting[];
    },
    staleTime: 2 * 60 * 1000, // Jobs refresh every 2 min
  });
}

/**
 * Fetch job matches for a specific user.
 */
export function useJobMatchesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.jobs.matches(userId ?? ''),
    queryFn: async (): Promise<JobMatch[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('job_matches')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobMatch[];
    },
    enabled: !!userId,
  });
}
