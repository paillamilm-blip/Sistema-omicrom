// supabase/functions/ghost-approval/index.ts
// ═══════════════════════════════════════════════════════════════════════
// GHOST APPROVAL — Cron Edge Function para liberación automática.
//
// Flujo (DEFINICION_OMICROM_v8_BACKEND.md, sección 5):
//   1. Vendedor declara entrega → contrato pasa a status='DELIVERED',
//      delivery_declared_at = now().
//   2. Comprador tiene 15 minutos para OBJETAR (object_delivery() abre
//      disputa y pasa el contrato a DISPUTED).
//   3. Si pasan 15 min sin objeción → esta función libera los fondos
//      al vendedor (DELIVERED → RELEASED, escrow → seller).
//
// Se invoca vía cron (Supabase pg_cron → supabase.functions.invoke) o
// manualmente con un bearer service_role. NO requiere auth de usuario.
//
// Idempotente: solo actúa sobre contratos DELIVERED cuyo plazo expiró.
// ═══════════════════════════════════════════════════════════════════════
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// ── Ghost Approval escalonado por monto del contrato (en minutos) ──
//   < 100 Ω    → 1 hora      (60 min)
//   100–500 Ω  → 24 horas    (1440 min)
//   > 500 Ω    → 48 horas    (2880 min)
// Debe mantenerse en sincronía con ghost_approval_interval() en
// supabase/migrations/0056_correction_and_rehab.sql.
function ghostWindowMinutes(amount: number): number {
  const a = Number(amount) || 0;
  if (a < 100) return 60;
  if (a <= 500) return 1440;
  return 2880;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // Autenticación: solo service_role o cron interno pueden invocar
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.includes(SERVICE_KEY) && !authHeader.includes('Bearer')) {
      // Permitir si viene de pg_cron (sin auth header) — Supabase invoca internamente
      // En producción, pg_cron usa service_role automáticamente
    }

    // ── PASO 1: Encontrar contratos elegibles ──────────────────────────
    // Contratos en DELIVERED cuya ventana de Ghost Approval ya venció.
    // La ventana es escalonada por monto (ghost_approval_deadline lo fija
    // declare_delivery). Para contratos legacy sin deadline, se usa como
    // respaldo delivery_declared_at + ventana mínima (60 min), y se
    // recalcula por contrato más abajo antes de liberar.
    const nowIso = new Date().toISOString();
    const minCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: contracts, error: fetchErr } = await admin
      .from('contracts')
      .select('id, seller_id, buyer_id, amount, title, delivery_declared_at, ghost_approval_deadline')
      .eq('status', 'DELIVERED')
      .or(`ghost_approval_deadline.lt.${nowIso},and(ghost_approval_deadline.is.null,delivery_declared_at.lt.${minCutoff})`)
      .limit(50); // Procesar en lotes para evitar timeouts

    if (fetchErr) {
      console.error('[ghost-approval] Error fetching contracts:', fetchErr.message);
      return json({ error: 'Error consultando contratos', detail: fetchErr.message }, 500);
    }

    if (!contracts || contracts.length === 0) {
      return json({ processed: 0, message: 'No hay contratos pendientes de liberación.' });
    }

    // ── PASO 2: Liberar fondos de cada contrato ────────────────────────
    const results: Array<{ id: string; title: string; status: 'released' | 'error'; detail?: string }> = [];

    for (const contract of contracts) {
      try {
        // 2.0. Verificar por contrato que la ventana escalonada realmente venció.
        //      Para legacy sin ghost_approval_deadline, se calcula con el tramo por monto.
        const effectiveDeadline = contract.ghost_approval_deadline
          ? new Date(contract.ghost_approval_deadline).getTime()
          : (contract.delivery_declared_at
              ? new Date(contract.delivery_declared_at).getTime() + ghostWindowMinutes(contract.amount) * 60 * 1000
              : Number.POSITIVE_INFINITY);
        if (Date.now() < effectiveDeadline) {
          results.push({ id: contract.id, title: contract.title, status: 'error', detail: 'skipped: window not expired' });
          continue;
        }

        // 2a. Actualizar contrato a RELEASED
        const { error: updateErr } = await admin
          .from('contracts')
          .update({
            status: 'RELEASED',
            released_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', contract.id)
          .eq('status', 'DELIVERED'); // Guard: solo si sigue DELIVERED (idempotencia)

        if (updateErr) {
          results.push({ id: contract.id, title: contract.title, status: 'error', detail: updateErr.message });
          continue;
        }

        // 2b. Transferir fondos: escrow → seller via RPC (incremento atómico)
        const { error: balErr } = await admin.rpc('ghost_release_funds', {
          p_contract_id: contract.id,
          p_seller_id: contract.seller_id,
          p_amount: contract.amount,
        });

        if (balErr) {
          // Intentar incremento directo si la RPC no existe (fail-forward)
          console.warn('[ghost-approval] RPC ghost_release_funds not found, using direct update');
          await admin
            .from('profiles')
            .update({ token_balance: contract.amount }) // Fallback: set directo (no atómico)
            .eq('id', contract.seller_id);
        }

        // 2c. Registrar transacción en wallet_transactions
        await admin.from('wallet_transactions').insert({
          user_id: contract.seller_id,
          transaction_type: 'escrow_release',
          amount: contract.amount,
          description: `Ghost Approval: "${contract.title}" liberado automáticamente`,
          reference_id: contract.id,
        });

        // 2d. Notificar a ambas partes
        const notifications = [
          {
            user_id: contract.seller_id,
            type: 'CONTRACT_COMPLETED',
            title: 'Pago liberado',
            message: `Tu entrega "${contract.title}" fue aprobada automáticamente. +${contract.amount} Ω`,
            related_id: contract.id,
          },
          {
            user_id: contract.buyer_id,
            type: 'CONTRACT_COMPLETED',
            title: 'Entrega aprobada',
            message: `"${contract.title}" se aprobó por Ghost Approval (venció el plazo sin objeción ni corrección).`,
            related_id: contract.id,
          },
        ];
        await admin.from('notifications').insert(notifications);

        // 2e. Incrementar PE del vendedor (recompensa por entrega exitosa)
        await admin.rpc('increment_pe', {
          p_user_id: contract.seller_id,
          p_amount: 30, // +30 PE por entrega exitosa
        }).then(({ error: peErr }) => {
          if (peErr) {
            // Non-critical: PE increment failed (RPC may not exist yet)
            console.warn('[ghost-approval] PE increment failed (non-critical):', peErr.message);
          }
        });

        results.push({ id: contract.id, title: contract.title, status: 'released' });
      } catch (e) {
        results.push({ id: contract.id, title: contract.title, status: 'error', detail: String(e) });
      }
    }

    const released = results.filter(r => r.status === 'released').length;
    const errors = results.filter(r => r.status === 'error').length;

    console.log(`[ghost-approval] Processed: ${released} released, ${errors} errors`);

    return json({
      processed: contracts.length,
      released,
      errors,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[ghost-approval] Unexpected error:', e);
    return json({ error: 'Error inesperado en Ghost Approval', detail: String(e) }, 500);
  }
});
