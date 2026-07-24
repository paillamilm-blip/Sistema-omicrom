// supabase/functions/stripe-webhook/index.ts
// Recibe eventos de Stripe y acredita los tokens comprados al usuario.
//
// SEGURIDAD:
// - verify_jwt = false: Stripe no envía un JWT de Supabase. La autenticidad se
//   valida con la FIRMA del webhook (STRIPE_WEBHOOK_SECRET) — verificación HMAC.
// - La acreditación usa la RPC idempotente credit_tokens_from_payment(), que
//   evita doble acreditación si Stripe reintenta el mismo evento.
// - Activada por env: sin STRIPE_WEBHOOK_SECRET responde 503 (no procesa nada).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const _admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Verifica la firma del webhook de Stripe (esquema v1, HMAC-SHA256). */
async function verifyStripeSignature(payload: string, sigHeader: string, secret: string, toleranceSec = 300): Promise<boolean> {
  try {
    const parts = Object.fromEntries(
      sigHeader.split(',').map((kv) => {
        const [k, v] = kv.split('=');
        return [k.trim(), (v ?? '').trim()];
      }),
    );
    const t = parts['t'];
    const v1 = parts['v1'];
    if (!t || !v1) return false;

    // Rechaza timestamps muy viejos (protección anti-replay).
    const age = Math.abs(Date.now() / 1000 - Number(t));
    if (!Number.isFinite(age) || age > toleranceSec) return false;

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`${t}.${payload}`));
    const expected = toHex(mac);

    // Comparación en tiempo constante.
    if (expected.length !== v1.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  if (!STRIPE_WEBHOOK_SECRET || !_admin) {
    return new Response(JSON.stringify({ ok: false, error: 'Webhook no configurado.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sig = req.headers.get('stripe-signature') ?? '';
  const rawBody = await req.text();

  const valid = await verifyStripeSignature(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response(JSON.stringify({ ok: false, error: 'Firma inválida.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Payload inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Solo nos interesa el pago completado.
  if (event.type === 'checkout.session.completed') {
    const session = (event.data?.object ?? {}) as Record<string, unknown>;
    const metadata = (session.metadata ?? {}) as Record<string, string>;
    const userId = metadata.user_id ?? (session.client_reference_id as string | undefined) ?? '';
    const tokens = parseInt(metadata.tokens ?? '0', 10);
    // Referencia única para idempotencia (el PI o, en su defecto, el id de sesión).
    const reference =
      (typeof session.payment_intent === 'string' && session.payment_intent) ||
      (session.id as string | undefined) ||
      '';

    if (userId && tokens > 0 && reference) {
      const { error } = await _admin.rpc('credit_tokens_from_payment', {
        p_user_id: userId,
        p_tokens: tokens,
        p_payment_intent_id: reference,
      });
      if (error) {
        // Devolver 500 hace que Stripe reintente; la RPC es idempotente, así que es seguro.
        console.error('[stripe-webhook] credit_tokens_from_payment error:', error.message);
        return new Response(JSON.stringify({ ok: false, error: 'No pude acreditar los tokens.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // 200 para todos los eventos manejados/ignorados (Stripe deja de reintentar).
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
