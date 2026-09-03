// features/market/hooks/useMarketQuery.ts
// TanStack Query hooks for marketplace services.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { queryKeys } from '@/infrastructure/query/keys';
import type { MarketService } from '@/types/market';

/**
 * Fetch active marketplace services.
 */
export function useMarketServicesQuery(filters?: { category?: string; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.market.services(filters),
    queryFn: async (): Promise<MarketService[]> => {
      let query = supabase
        .from('market_services')
        // `commission_floor_locked_at` se trae porque la transparencia de
        // Comisión Ómicrom lo necesita: un vendedor que GANÓ el piso paga
        // 0.5 % permanente, y sin este campo el comprador vería la tasa de
        // banda (hasta 1 %), un número que NO es el real.
        .select('*, seller:profiles(id, username, full_name, avatar_url, node_type, node_level, reputation_score, commission_floor_locked_at)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as MarketService[];
    },
    staleTime: 2 * 60 * 1000,
  });
}
