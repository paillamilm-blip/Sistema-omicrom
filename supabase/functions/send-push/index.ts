// supabase/functions/send-push/index.ts
// ═══════════════════════════════════════════════════════════════════════
// SEND-PUSH — Envía Web Push Notifications a usuarios específicos.
// Usa VAPID (Voluntary Application Server Identification).
// Llamado por pg_cron o manualmente para re-engagement.
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_EMAIL = 'mailto:admin@sistema-omicrom.vercel.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

interface PushSubscription {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Genera JWT para VAPID authentication.
 * Simplified implementation for Deno Edge Functions.
 */
async function generateVapidAuth(endpoint: string): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  // Header
  const header = { typ: 'JWT', alg: 'ES256' };
  
  // Payload
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12h
    sub: VAPID_EMAIL,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsigned = `${headerB64}.${payloadB64}`;

  // Import private key
  const keyData = Uint8Array.from(atob(VAPID_PRIVATE_KEY.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  // Sign
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(unsigned),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const token = `${unsigned}.${sigB64}`;

  return {
    authorization: `vapid t=${token}, k=${VAPID_PUBLIC_KEY}`,
    cryptoKey: `p256ecdsa=${VAPID_PUBLIC_KEY}`,
  };
}

/**
 * Envía push a una subscription individual.
 */
async function sendToSubscription(sub: PushSubscription, payload: PushPayload): Promise<boolean> {
  try {
    const body = JSON.stringify(payload);
    const { authorization, cryptoKey } = await generateVapidAuth(sub.endpoint);

    const resp = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Crypto-Key': cryptoKey,
        'Content-Type': 'application/json',
        'Content-Length': String(new TextEncoder().encode(body).length),
        'TTL': '86400', // 24h
        'Urgency': 'normal',
      },
      body,
    });

    if (resp.status === 410 || resp.status === 404) {
      // Subscription expired — eliminar de BD
      await supabase.from('push_subscriptions')
        .delete()
        .eq('endpoint', sub.endpoint);
      return false;
    }

    return resp.ok;
  } catch (e) {
    console.error('[send-push] Error:', e);
    return false;
  }
}

// ── Main Handler ─────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const { user_ids, payload, all_inactive } = await req.json() as {
      user_ids?: string[];
      payload: PushPayload;
      all_inactive?: boolean; // si true, envía a todos los inactivos >24h
    };

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'VAPID keys no configuradas' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }

    let subscriptions: PushSubscription[] = [];

    if (all_inactive) {
      // Buscar usuarios inactivos (>24h sin login) que tengan push subscription
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('push_subscriptions')
        .select('user_id, endpoint, p256dh, auth')
        .lt('last_active', yesterday);
      subscriptions = (data ?? []) as PushSubscription[];
    } else if (user_ids && user_ids.length > 0) {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('user_id, endpoint, p256dh, auth')
        .in('user_id', user_ids);
      subscriptions = (data ?? []) as PushSubscription[];
    }

    if (subscriptions.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: 'No hay subscriptions' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Enviar en paralelo (max 10 concurrentes)
    let sent = 0;
    let failed = 0;
    const BATCH = 10;

    for (let i = 0; i < subscriptions.length; i += BATCH) {
      const batch = subscriptions.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(sub => sendToSubscription(sub, payload)));
      sent += results.filter(Boolean).length;
      failed += results.filter(r => !r).length;
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, total: subscriptions.length }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[send-push] Fatal:', e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
