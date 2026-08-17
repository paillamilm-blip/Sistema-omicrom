// types/wallet.ts
// Transacciones y billetera

export type WalletTransactionType =
  | 'deposit'
  | 'escrow_lock'
  | 'escrow_release'
  | 'refund'
  | 'commission'
  | 'withdrawal'
  | 'purchase';

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: WalletTransactionType;
  amount: number;
  balance_after: number | null;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}
