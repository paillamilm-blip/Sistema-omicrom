import { useState } from 'react';
import { CreditCard, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../shared/Modal';

interface Props {
  onClose: () => void;
}

type Step = 'form' | 'loading' | 'error';

// Paquetes sugeridos (1 Token = 1 CLP). El mínimo del backend es 1000.
const PACKAGES = [1000, 5000, 10000, 25000];
const MIN_TOKENS = 1000;
const MAX_TOKENS = 500000;

export function TokenPurchaseModal({ onClose }: Props) {
  const [selected, setSelected] = useState<number>(5000);
  const [custom, setCustom] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [errorMsg, setErrorMsg] = useState('');

  const customNum = parseInt(custom, 10) || 0;
  const tokens = customNum > 0 ? customNum : selected;
  const valid = tokens >= MIN_TOKENS && tokens <= MAX_TOKENS;

  async function handleCheckout() {
    if (!valid) return;
    setStep('loading');
    try {
      const { data, error } = await supabase.functions.invoke('crear-checkout', {
        body: { tokens },
      });

      // supabase-js entrega el cuerpo de error en error.context para respuestas no-2xx.
      if (error) {
        let msg = 'No pude iniciar el pago. Intenta de nuevo.';
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch { /* usa mensaje por defecto */ }
        throw new Error(msg);
      }

      if (data?.ok && data?.url) {
        // Redirige a la página segura de pago de Stripe.
        window.location.href = data.url as string;
        return;
      }
      throw new Error(data?.error || 'No pude iniciar el pago.');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Error iniciando el pago');
      setStep('error');
    }
  }

  if (step === 'loading') {
    return (
      <Modal title="Preparando tu pago" onClose={onClose}>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 border-2 border-omicron-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-omicron-subtle text-sm">Redirigiéndote a la pasarela segura…</p>
        </div>
      </Modal>
    );
  }

  if (step === 'error') {
    return (
      <Modal title="No se pudo iniciar" onClose={onClose}>
        <div className="flex flex-col items-center px-5 py-10 gap-4 text-center">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-red-400 text-sm">{errorMsg}</p>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-omicron-border text-omicron-subtle text-sm">Cerrar</button>
            <button onClick={() => setStep('form')} className="flex-1 py-3 rounded-xl bg-omicron-accent text-omicron-bg text-sm font-semibold">Reintentar</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Comprar Tokens" onClose={onClose}>
      <div className="px-5 py-4 space-y-4">
        <div className="flex items-center gap-3 p-3 bg-omicron-surface border border-omicron-border rounded-xl">
          <Sparkles size={18} className="text-omicron-gold" />
          <p className="text-omicron-subtle text-sm">
            Recarga tu billetera. <span className="text-omicron-text font-bold">1 Token = 1 CLP</span>.
          </p>
        </div>

        {/* Paquetes */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-2 block">Elige un paquete</label>
          <div className="grid grid-cols-2 gap-2">
            {PACKAGES.map((v) => {
              const active = customNum === 0 && selected === v;
              return (
                <button
                  key={v}
                  onClick={() => { setSelected(v); setCustom(''); }}
                  className={`py-3 rounded-xl border text-sm font-semibold transition ${
                    active
                      ? 'border-omicron-gold bg-omicron-gold/15 text-omicron-text'
                      : 'border-omicron-border bg-omicron-surface text-omicron-subtle hover:text-omicron-text'
                  }`}
                >
                  {v.toLocaleString('es-CL')} T
                  <span className="block text-[10px] text-omicron-muted font-normal">${v.toLocaleString('es-CL')} CLP</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Monto personalizado */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-1 block">O ingresa un monto</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-omicron-subtle text-sm">T</span>
            <input
              type="number"
              min={MIN_TOKENS}
              max={MAX_TOKENS}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={`mín. ${MIN_TOKENS.toLocaleString('es-CL')}`}
              className="w-full bg-omicron-surface border border-omicron-border rounded-xl pl-8 pr-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-gold transition"
            />
          </div>
          {custom !== '' && !valid && (
            <p className="text-red-400 text-xs mt-1">
              El monto debe estar entre {MIN_TOKENS.toLocaleString('es-CL')} y {MAX_TOKENS.toLocaleString('es-CL')} tokens.
            </p>
          )}
        </div>

        {/* Resumen */}
        <div className="bg-omicron-card border border-omicron-gold/30 rounded-2xl p-4 flex items-center justify-between">
          <span className="text-omicron-subtle text-sm">Total a pagar</span>
          <span className="text-omicron-text text-xl font-bold">${tokens.toLocaleString('es-CL')} CLP</span>
        </div>

        <div className="flex items-center gap-2 text-omicron-muted text-[11px]">
          <ShieldCheck size={13} className="text-omicron-green" />
          Pago procesado de forma segura por Stripe. Ómicron no almacena tu tarjeta.
        </div>

        <div className="flex gap-3 pb-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-omicron-border text-omicron-subtle text-sm font-medium hover:text-omicron-text transition">
            Cancelar
          </button>
          <button
            onClick={handleCheckout}
            disabled={!valid}
            className="flex-1 py-3 rounded-xl bg-omicron-gold text-omicron-bg text-sm font-semibold hover:brightness-110 disabled:opacity-40 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <CreditCard size={16} /> Ir a pagar
          </button>
        </div>
      </div>
    </Modal>
  );
}
