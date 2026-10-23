// features/redviva/hooks/useJobsQuery.ts
// Lee los empleos publicados: son la fuente contra la que la Red Viva mide la
// brecha. Ya no hay pantalla de Empleos — estas filas solo alimentan evidencia.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { queryKeys } from '@/infrastructure/query/keys';
import type { JobPosting } from '@/types/jobs';

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
