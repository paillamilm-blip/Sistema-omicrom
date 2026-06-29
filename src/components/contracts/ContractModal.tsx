import { useState } from 'react';
import { Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { Modal } from '../shared/Modal';
import type { MarketService } from '../../types';

interface Props {
  service: MarketService;
  onClose: () => void;
}

type Step = 'confirm' | 'loading' | 'success' | 'error';

export function ContractModal({ service, onClose }: Props) {
  const { profile, refreshProfile } = useApp();
  const [note, setNote] = useState('');
  const [step, setStep] = useState<Step>('confirm');
  const [errorMsg, setErrorMsg] = useState('');
  const [contractId, setContractId] = useState<string | null>(null);

  const canAfford = (profile?.token_balance ?? 0) >= service.price;
  const sellerName = service.seller?.username ?? 'vendedor';

  async function handleHire() {
    if (!profile || !service.seller_id) return;
    setStep('loading');
    try {
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          buyer_id:   profile.id,
          seller_id:  service.seller_id,
          service_id: service.id,
          title:      service.title,
          amount:     service.price,
          buyer_note: note || null,
          // status omitido → el trigger lock_escrow_on_contract lo deja en 'LOCKED' y bloquea el escrow
        })
        .select('id')
        .single();
      if (error) throw error;
      setContractId(data.id as string);
      await refreshProfile();
      setStep('success');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Error al crear contrato');
      setStep('error');
    }
  }


  if (step === 'loading') {
    return (
      <Modal title="Procesando Escrow" onClose={onClose}>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 border-2 border-omicron-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-omicron-subtle text-sm">Bloqueando fondos en Escrow...</p>
        </div>
      </Modal>
    );
  }

  if (step === 'success') {
    return (
      <Modal title="Contrato Activo" onClose={onClose}>
        <div className="flex flex-col items-center px-5 py-10 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-omicron-green/20 border border-omicron-green/40 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-omicron-green" />
          </div>
          <h3 className="text-omicron-text font-bold text-lg">Escrow Activado</h3>
          <p className="text-omicron-subtle text-sm leading-relaxed max-w-xs">
            {service.price} tokens bloqueados. @{sellerName} recibirá el pago cuando apruebes la entrega.
          </p>
          <div className="bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 w-full text-left">
            <p className="text-omicron-subtle text-xs">ID de Contrato</p>
            <p className="text-omicron-text text-xs font-mono mt-0.5 break-all">{contractId}</p>
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-omicron-accent text-omicron-bg font-semibold text-sm hover:bg-omicron-magenta transition mt-2">
            Entendido
          </button>
        </div>
      </Modal>
    );
  }


  if (step === 'error') {
    return (
      <Modal title="Error en Escrow" onClose={onClose}>
        <div className="flex flex-col items-center px-5 py-10 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h3 className="text-omicron-text font-bold text-lg">No se pudo procesar</h3>
          <p className="text-red-400 text-sm">{errorMsg}</p>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-omicron-border text-omicron-subtle text-sm transition">Cerrar</button>
            <button onClick={() => setStep('confirm')} className="flex-1 py-3 rounded-xl bg-omicron-accent text-omicron-bg text-sm font-semibold transition">Reintentar</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Contratar · Escrow" onClose={onClose}>
      <div className="px-5 py-4 space-y-4">

        {/* Service summary */}
        <div className="bg-omicron-surface border border-omicron-border rounded-2xl p-4">
          <p className="text-omicron-subtle text-xs uppercase tracking-wide mb-1">Servicio</p>
          <p className="text-omicron-text font-bold text-base">{service.title}</p>
          <p className="text-omicron-subtle text-sm mt-0.5">@{sellerName}</p>
        </div>


        {/* Price breakdown */}
        <div className="bg-omicron-surface border border-omicron-border rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-omicron-subtle">Precio servicio</span>
            <span className="text-omicron-text font-semibold">🪙 {service.price}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-omicron-subtle">Tu saldo actual</span>
            <span className={`font-semibold ${canAfford ? 'text-omicron-green' : 'text-red-400'}`}>
              🪙 {profile?.token_balance ?? 0}
            </span>
          </div>
          <div className="border-t border-omicron-border pt-2 flex justify-between text-sm">
            <span className="text-omicron-subtle">Saldo tras contratar</span>
            <span className={`font-bold ${canAfford ? 'text-omicron-text' : 'text-red-400'}`}>
              🪙 {(profile?.token_balance ?? 0) - service.price}
            </span>
          </div>
        </div>

        {/* How escrow works */}
        <div className="bg-omicron-accent/10 border border-omicron-accent/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-omicron-accent" />
            <p className="text-omicron-accent text-xs font-bold uppercase tracking-wide">Cómo funciona el Escrow</p>
          </div>
          <ol className="space-y-1 text-omicron-subtle text-xs list-decimal list-inside">
            <li>Tus tokens se bloquean ahora de forma segura</li>
            <li>El vendedor trabaja y marca como "Entregado"</li>
            <li>Tú apruebas la entrega y los tokens se liberan</li>
          </ol>
        </div>


        {/* Note */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-1 block">
            Instrucciones al vendedor (opcional)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Describe los detalles del proyecto, plazos, requisitos..."
            rows={3}
            className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition resize-none"
          />
        </div>

        {!canAfford && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            Saldo insuficiente. Necesitas {service.price - (profile?.token_balance ?? 0)} tokens más.
          </div>
        )}

        <div className="flex gap-3 pb-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-omicron-border text-omicron-subtle text-sm font-medium hover:text-omicron-text transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleHire}
            disabled={!canAfford}
            className="flex-1 py-3 rounded-xl bg-omicron-accent text-omicron-bg text-sm font-semibold hover:bg-omicron-magenta disabled:opacity-40 transition active:scale-95"
          >
            Confirmar Escrow
          </button>
        </div>
      </div>
    </Modal>
  );
}
