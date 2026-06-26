import { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { Modal } from '../shared/Modal';

interface Props {
  mode: 'send' | 'receive';
  onClose: () => void;
}

type Step = 'form' | 'loading' | 'success' | 'error';

export function TokenTransferModal({ mode, onClose }: Props) {
  const { profile, refreshProfile } = useApp();
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [errorMsg, setErrorMsg] = useState('');

  const isSend = mode === 'send';
  const tokens = profile?.token_balance ?? 0;
  const amountNum = parseInt(amount) || 0;
  const canSend = isSend ? amountNum > 0 && amountNum <= tokens && username.trim() : true;


  async function handleSend() {
    if (!profile || !isSend) return;
    setStep('loading');
    try {
      // Find recipient
      const { data: recipient, error: findErr } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', username.trim().replace('@', ''))
        .maybeSingle();

      if (findErr) throw findErr;
      if (!recipient) throw new Error(`No se encontro el usuario @${username}`);
      if (recipient.id === profile.id) throw new Error('No puedes enviarte tokens a ti mismo');

      // Use atomic transfer function
      const { error: rpcErr } = await supabase.rpc('transfer_tokens', {
        p_sender_id: profile.id,
        p_receiver_id: recipient.id,
        p_amount: amountNum,
        p_note: note || null,
      });

      if (rpcErr) throw rpcErr;

      await refreshProfile();
      setStep('success');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Error en la transferencia');
      setStep('error');
    }
  }


  if (step === 'loading') {
    return (
      <Modal title={isSend ? 'Enviando tokens' : 'Tu dirección'} onClose={onClose}>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 border-2 border-omicron-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-omicron-subtle text-sm">Procesando transferencia...</p>
        </div>
      </Modal>
    );
  }

  if (step === 'success') {
    return (
      <Modal title="Transferencia exitosa" onClose={onClose}>
        <div className="flex flex-col items-center px-5 py-10 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-omicron-green/20 border border-omicron-green/40 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-omicron-green" />
          </div>
          <h3 className="text-omicron-text font-bold text-lg">Tokens enviados</h3>
          <p className="text-omicron-subtle text-sm">
            <span className="text-omicron-text font-bold">{amountNum} tokens</span> enviados a <span className="text-omicron-text font-bold">@{username}</span>
          </p>
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-omicron-accent text-white font-semibold text-sm hover:bg-violet-600 transition mt-2">
            Listo
          </button>
        </div>
      </Modal>
    );
  }


  if (step === 'error') {
    return (
      <Modal title="Error" onClose={onClose}>
        <div className="flex flex-col items-center px-5 py-10 gap-4 text-center">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-red-400 text-sm">{errorMsg}</p>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-omicron-border text-omicron-subtle text-sm">Cerrar</button>
            <button onClick={() => setStep('form')} className="flex-1 py-3 rounded-xl bg-omicron-accent text-white text-sm font-semibold">Reintentar</button>
          </div>
        </div>
      </Modal>
    );
  }

  // Receive mode — show username to share
  if (!isSend) {
    return (
      <Modal title="Recibir Tokens" onClose={onClose}>
        <div className="px-5 py-6 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-omicron-surface border border-omicron-border rounded-2xl">
            <ArrowDownLeft size={20} className="text-omicron-cyan" />
            <p className="text-omicron-subtle text-sm">Comparte tu username para recibir tokens.</p>
          </div>

          <div className="bg-omicron-card border border-omicron-accent/40 rounded-2xl p-5 text-center">
            <p className="text-omicron-subtle text-xs uppercase tracking-widest mb-2">Tu username</p>
            <p className="text-omicron-text text-2xl font-bold">@{profile?.username}</p>
          </div>

          <div className="bg-omicron-surface border border-omicron-border rounded-2xl p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-omicron-subtle">Nodo</span>
              <span className="text-omicron-text">{profile?.node_type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-omicron-subtle">Saldo actual</span>
              <span className="text-omicron-text font-bold">🪙 {tokens}</span>
            </div>
          </div>

          <button onClick={onClose} className="w-full py-3 rounded-xl bg-omicron-surface border border-omicron-border text-omicron-text text-sm font-medium hover:bg-omicron-card transition">
            Cerrar
          </button>
        </div>
      </Modal>
    );
  }


  return (
    <Modal title="Enviar Tokens" onClose={onClose}>
      <div className="px-5 py-4 space-y-4">

        {/* Balance */}
        <div className="flex items-center gap-3 p-3 bg-omicron-surface border border-omicron-border rounded-xl">
          <ArrowUpRight size={18} className="text-omicron-green" />
          <span className="text-omicron-subtle text-sm">Saldo disponible:</span>
          <span className="text-omicron-text font-bold">🪙 {tokens}</span>
        </div>

        {/* Recipient */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-1 block">Username del destinatario</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-omicron-subtle text-sm">@</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.replace('@', ''))}
              placeholder="username_nodo"
              className="w-full bg-omicron-surface border border-omicron-border rounded-xl pl-8 pr-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
            />
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-1 block">Cantidad de Tokens</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🪙</span>
            <input
              type="number"
              min="1"
              max={tokens}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-omicron-surface border border-omicron-border rounded-xl pl-10 pr-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
            />
          </div>
          {amountNum > tokens && (
            <p className="text-red-400 text-xs mt-1">Saldo insuficiente</p>
          )}
        </div>


        {/* Quick amounts */}
        <div className="flex gap-2">
          {[10, 25, 50, 100].map(v => (
            <button
              key={v}
              onClick={() => setAmount(String(Math.min(v, tokens)))}
              className="flex-1 py-1.5 rounded-lg border border-omicron-border bg-omicron-surface text-omicron-subtle text-xs hover:text-omicron-text hover:border-omicron-accent transition"
            >
              {v}
            </button>
          ))}
        </div>

        {/* Note */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-1 block">Motivo (opcional)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Pago por proyecto, colaboración..."
            className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
          />
        </div>

        <div className="flex gap-3 pb-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-omicron-border text-omicron-subtle text-sm font-medium hover:text-omicron-text transition">
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-1 py-3 rounded-xl bg-omicron-green text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40 transition active:scale-95"
          >
            Enviar Tokens
          </button>
        </div>
      </div>
    </Modal>
  );
}
