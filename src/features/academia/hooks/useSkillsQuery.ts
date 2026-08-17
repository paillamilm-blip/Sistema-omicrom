// features/academia/hooks/useSkillsQuery.ts
// TanStack Query hooks for skill tree and user progress.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { queryKeys } from '@/infrastructure/query/keys';
import type { SkillTreeNode, UserSkillProgress } from '@/types/skills';

/**
 * Fetch the full skill tree (rarely changes — long stale time).
 */
export function useSkillTreeQuery() {
  return useQuery({
    queryKey: queryKeys.skills.tree(),
    queryFn: async (): Promise<SkillTreeNode[]> => {
      const { data, error } = await supabase
        .from('skill_tree_nodes')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SkillTreeNode[];
    },
    staleTime: 10 * 60 * 1000, // Skill tree is very stable — 10 min
  });
}

/**
 * Fetch user's skill progress.
 */
export function useSkillProgressQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.skills.progress(userId ?? ''),
    queryFn: async (): Promise<UserSkillProgress[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_skill_progress')
        .select('*, node:skill_tree_nodes(*)')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []) as UserSkillProgress[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 min
  });
}
