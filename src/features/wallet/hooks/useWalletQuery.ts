// features/wallet/hooks/useWalletQuery.ts
// TanStack Query hooks for wallet balance and transactions.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { queryKeys } from '@/infrastructure/query/keys';
import type { WalletTransaction } from '@/types/wallet';

/**
 * Fetch wallet transaction history.
 */
export function useWalletTransactionsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.wallet.transactions(userId ?? ''),
    queryFn: async (): Promise<WalletTransaction[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as WalletTransaction[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}
