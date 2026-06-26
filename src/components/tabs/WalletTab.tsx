import { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, Lock, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { TokenTransferModal } from '../wallet/TokenTransferModal';
import type { WalletTransaction } from '../../types';

// ── Node tiers (Bitácora V4: 0-499 / 500-1999 / 2000+) ──────────────────────
const NODES = [
  { name: 'Nodo Operativo',  minPE: 0,    maxPE: 499,  commission: 15, color: 'text-slate-400',      border: 'border-slate-700'       },
  { name: 'Nodo Core',       minPE: 500,  maxPE: 1999, commission: 10, color: 'text-omicron-cyan',   border: 'border-omicron-cyan/50'  },
  { name: 'Nodo Arquitecto', minPE: 2000, maxPE: null, commission: 5,  color: 'text-omicron-accent', border: 'border-omicron-accent/50' },
] as const;

function getNode(pe: number) {
  if (pe >= 2000) return NODES[2];
  if (pe >= 500)  return NODES[1];
  return NODES[0];
}

// ── Wallet tx display config ──────────────────────────────────────────────────
const TX_META: Record<WalletTransaction['type'], {
  label: string; sign: '+' | '−'; color: string; dot: string;
}> = {
  deposit:        { label: 'Deposit',          sign: '+', color: 'text-omicron-green', dot: 'bg-omicron-green'  },
  escrow_lock:    { label: 'Escrow locked',    sign: '−', color: 'text-yellow-400',   dot: 'bg-yellow-400'     },
  escrow_release: { label: 'Payment received', sign: '+', color: 'text-omicron-green', dot: 'bg-omicron-green'  },
  refund:         { label: 'Refund',           sign: '+', color: 'text-omicron-cyan',  dot: 'bg-omicron-cyan'   },
  commission:     { label: 'Network fee',      sign: '−', color: 'text-red-400',       dot: 'bg-red-400'        },
  withdrawal:     { label: 'Withdrawal',       sign: '−', color: 'text-purple-400',    dot: 'bg-purple-400'     },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}


// ── Component ─────────────────────────────────────────────────────────────────
export function WalletTab() {
  const { profile, refreshProfile } = useApp();
  const [txs, setTxs]               = useState<WalletTransaction[]>([]);
  const [loading, setLoading]        = useState(true);
  const [view, setView]              = useState<'transactions' | 'nodes'>('transactions');
  const [transferMode, setTransferMode] = useState<'send' | 'receive' | null>(null);

  const loadTxs = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, type:transaction_type, amount, balance_after, description, reference_id, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setTxs((data as WalletTransaction[]) ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadTxs(); }, [loadTxs]);

  async function handleTransferClose() {
    setTransferMode(null);
    await refreshProfile();
    await loadTxs();
  }

  const balance  = profile?.token_balance ?? 0;
  const escrow   = profile?.token_escrow ?? 0;
  const pe       = profile?.pe_points     ?? 0;
  const pioneer  = profile?.is_pioneer    ?? false;
  const node     = getNode(pe);


  return (
    <>
      <div className="flex-1 scroll-area bg-omicron-bg pb-6">
        <div className="px-4 pt-5 space-y-4">

          {/* ── Balance card ── */}
          <div className="bg-omicron-card border border-omicron-border rounded-2xl p-5">
            <p className="text-omicron-subtle text-[10px] uppercase tracking-widest mb-3">
              Available Balance
            </p>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-5xl font-bold text-omicron-text tracking-tight leading-none">
                {balance.toLocaleString('es-CL')}
              </span>
              <span className="text-omicron-accent text-lg font-semibold mb-1">T</span>
            </div>
            <p className="text-omicron-subtle text-xs mt-1">1 Token = 1 CLP</p>

            {/* Escrow + PE mini cards */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-omicron-surface border border-omicron-border rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Lock size={10} className="text-yellow-400" />
                  <span className="text-[10px] text-omicron-subtle uppercase tracking-widest">In Escrow</span>
                </div>
                <span className="text-yellow-400 font-bold text-base">
                  {escrow.toLocaleString('es-CL')}
                </span>
                <span className="text-yellow-400/60 text-xs ml-1">T</span>
              </div>
              <div className="bg-omicron-surface border border-omicron-border rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap size={10} className="text-omicron-accent" />
                  <span className="text-[10px] text-omicron-subtle uppercase tracking-widest">PE Points</span>
                </div>
                <span className={`font-bold text-base ${node.color}`}>
                  {pe.toLocaleString('es-CL')}
                </span>
                <span className="text-omicron-subtle text-[10px] block mt-0.5">{node.name}</span>
              </div>
            </div>


            {/* Action buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setTransferMode('send')}
                className="flex-1 flex items-center justify-center gap-2 bg-omicron-surface border border-omicron-border rounded-xl py-2.5 text-sm text-omicron-text hover:border-omicron-green hover:text-omicron-green transition active:scale-95"
              >
                <ArrowUpRight size={15} className="text-omicron-green" />
                Send
              </button>
              <button
                onClick={() => setTransferMode('receive')}
                className="flex-1 flex items-center justify-center gap-2 bg-omicron-surface border border-omicron-border rounded-xl py-2.5 text-sm text-omicron-text hover:border-omicron-cyan hover:text-omicron-cyan transition active:scale-95"
              >
                <ArrowDownLeft size={15} className="text-omicron-cyan" />
                Receive
              </button>
            </div>
          </div>

          {/* ── Pioneer banner ── */}
          {pioneer && (
            <div className="bg-gradient-to-r from-yellow-900/40 to-amber-900/30 border border-omicron-gold/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">🏆</span>
                <span className="text-omicron-gold text-[10px] font-bold uppercase tracking-widest">
                  Pioneer Program
                </span>
              </div>
              <p className="text-omicron-gold text-xl font-bold mb-1">Lifetime 10% Commission</p>
              <p className="text-yellow-300/80 text-xs leading-snug">
                Guaranteed benefit for founding-stage users.
              </p>
            </div>
          )}


          {/* ── View tabs ── */}
          <div className="flex border-b border-omicron-border">
            {(['transactions', 'nodes'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest transition border-b-2 -mb-px capitalize ${
                  view === v
                    ? 'text-omicron-accent border-omicron-accent'
                    : 'text-omicron-subtle border-transparent hover:text-omicron-text'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* ── Transactions ── */}
          {view === 'transactions' && (
            <div className="bg-omicron-card border border-omicron-border rounded-2xl p-4">
              {loading ? (
                <div className="text-center py-6 text-omicron-subtle text-sm">Loading…</div>
              ) : txs.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <Clock size={22} className="text-omicron-muted" />
                  <p className="text-omicron-subtle text-sm">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {txs.map(tx => {
                    const meta = TX_META[tx.type] ?? {
                      label: tx.type, sign: '', color: 'text-omicron-subtle', dot: 'bg-omicron-subtle'
                    };
                    return (
                      <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-omicron-border last:border-0">
                        <div className={`w-8 h-8 rounded-xl bg-omicron-surface flex-shrink-0 flex items-center justify-center`}>
                          <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-omicron-text text-xs font-semibold">{meta.label}</p>
                          {tx.description && (
                            <p className="text-omicron-subtle text-[10px] truncate">{tx.description}</p>
                          )}
                          <p className="text-omicron-muted text-[10px] mt-0.5">{formatDate(tx.created_at)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-bold text-sm ${meta.color}`}>
                            {meta.sign}{Math.abs(tx.amount).toLocaleString('es-CL')} T
                          </p>
                          {tx.balance_after != null && (
                            <p className="text-omicron-muted text-[10px] mt-0.5">
                              Balance: {tx.balance_after.toLocaleString('es-CL')} T
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}


          {/* ── Nodes ── */}
          {view === 'nodes' && (
            <div className="space-y-3">
              {NODES.map(n => {
                const active   = node.name === n.name;
                const progress = n.maxPE
                  ? Math.min(((pe - n.minPE) / (n.maxPE - n.minPE)) * 100, 100)
                  : 100;
                return (
                  <div
                    key={n.name}
                    className={`rounded-2xl border p-4 transition ${
                      active
                        ? `bg-omicron-card ${n.border}`
                        : 'bg-omicron-surface border-omicron-border opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold ${active ? n.color : 'text-omicron-subtle'}`}>
                        {n.name}
                        {active && <span className="text-[10px] font-normal opacity-60 ml-1">← current</span>}
                      </span>
                      <span className={`text-sm font-bold ${active ? n.color : 'text-omicron-subtle'}`}>
                        {n.commission}% fee
                      </span>
                    </div>
                    <p className="text-omicron-subtle text-[10px] mb-2">
                      {n.maxPE
                        ? `${n.minPE.toLocaleString()} – ${n.maxPE.toLocaleString()} PE`
                        : `${n.minPE.toLocaleString()}+ PE`}
                    </p>
                    {active && (
                      <>
                        <div className="flex justify-between text-[10px] text-omicron-subtle mb-1.5">
                          <span>{pe} PE current</span>
                          <span>{n.maxPE ? `Next tier: ${(n.maxPE + 1).toLocaleString()} PE` : 'Max tier'}</span>
                        </div>
                        {n.maxPE && (
                          <div className="bg-omicron-border rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${n.color.replace('text-', 'bg-')}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {transferMode && (
        <TokenTransferModal mode={transferMode} onClose={handleTransferClose} />
      )}
    </>
  );
}
