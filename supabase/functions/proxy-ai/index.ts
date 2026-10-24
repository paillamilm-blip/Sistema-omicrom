// supabase/functions/proxy-ai/index.ts
// ═══════════════════════════════════════════════════════════════════════
// PROXY-AI — Gateway centralizado para TODAS las llamadas a OpenRouter.
//
// El frontend NUNCA llama a OpenRouter directamente. En cambio invoca:
//   supabase.functions.invoke('proxy-ai', { body: { messages, options } })
//
// Beneficios:
//   1. La OPENROUTER_KEY vive solo server-side (nunca en el bundle)
//   2. Rate limiting real (no localStorage burlable)
//   3. Un solo punto de control para modelos, fallback, y logging
//   4. Créditos IA con conteo atómico server-side
//
// Acepta el mismo formato que aiClient.ts del frontend:
//   { messages: [{role, content}], options?: {maxTokens, temperature, jsonMode} }
// ═══════════════════════════════════════════════════════════════════════
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';
import { checkAndConsumeCredit } from '../_shared/iaCredits.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OPENROUTER_KEY = Deno.env.get('OPENROUTER_KEY') ?? '';
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Allowed origin for CORS (production domain)
const ALLOWED_ORIGIN = Deno.env.get('PUBLIC_SITE_URL') || 'https://sistema-omicrom.vercel.app';

import { corsHeaders } from '../_shared/cors.ts';

// Orden medido el 2026-10-24 contra este proyecto, no suposiciones:
// un CV completo devolvió JSON válido SOLO con los dos nemotron (el ultra
// también contestó un trivial en 3,4s). glm-5.2 llegó a tardar 24,8s en un
// prompt trivial y minimax/gemma nunca dieron el CV dentro de la ventana.
const FREE_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',   // El único que devolvió el CV completo
  'nvidia/nemotron-3-super-120b-a12b:free',   // Mismo proveedor, más chico
  'google/gemma-4-31b-it:free',               // Fallback Google
  'google/gemma-4-26b-a4b-it:free',
  'minimax/minimax-m3:free',
  'z-ai/glm-5.2:free',                        // 24,8s medidos en un trivial: último
];

// Abort por modelo. Medido el 2026-10-24 con el MISMO prompt de CV cinco
// veces: 13,3s · 16,0s · 23,7s · 49,9s · 89,6s (todos JSON completo, siempre
// nemotron-ultra). Es una lotería de cola, no un problema de tamaño de
// respuesta: por eso el primer modelo se queda con el presupuesto entero y
// los demás solo reciben un intento corto (los muertos contestan en <1s).
const FIRST_MODEL_ABORT_MS = 45000;
const MODEL_ABORT_MS = 10000;
// Presupuesto total del server. Debe quedar DEBAJO del presupuesto del
// cliente (48s en gemini.ts) para que el error estructurado llegue al
// usuario antes de que el cliente corte la conexión con su TIMEOUT genérico.
const SERVER_BUDGET_MS = 45000;
const MIN_USEFUL_ATTEMPT_MS = 4000;
// Huella de la versión desplegada. Un GET responde estos números en <1s y sin
// gastar créditos: es la única forma de comprobar que el pegado del dashboard
// realmente reemplazó la función (los timeouts viejos se cuelan igual).
const BUILD = '6d-body-45s';

// Cache de modelos muertos (por instancia de la Edge Function — ~5min lifetime)
const DEAD_MODELS: Map<string, number> = new Map();
const DEAD_TTL = 10 * 60 * 1000; // 10 min

function isModelAlive(model: string): boolean {
  const deadSince = DEAD_MODELS.get(model);
  if (!deadSince) return true;
  if (Date.now() - deadSince > DEAD_TTL) {
    DEAD_MODELS.delete(model);
    return true;
  }
  return false;
}

const _admin = createClient(SUPABASE_URL, SERVICE_KEY);



interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  messages: AIMessage[];
  options?: {
    maxTokens?: number;
    temperature?: number;
    jsonMode?: boolean;
  };
}

Deno.serve(async (req) => {
  // Compute CORS from the actual request origin as a local const to avoid
  // race conditions under concurrent requests in the same Deno isolate.
  const cors = corsHeaders(req);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json', 'x-omicron-build': BUILD },
    });

  // Health/huella de versión: sin tocar OpenRouter ni los créditos.
  if (req.method === 'GET') {
    return json({ build: BUILD, budgetMs: SERVER_BUDGET_MS, abortMs: MODEL_ABORT_MS, firstModel: FREE_MODELS[0], models: FREE_MODELS.length });
  }

  // CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // ── Validate key ──────────────────────────────────────────────────
    if (!OPENROUTER_KEY && !GEMINI_KEY) {
      return json({ error: 'IA no configurada (falta OPENROUTER_KEY en secrets).' }, 503);
    }

    // ── Rate limit (15 req/min por IP — más generoso que endpoints específicos) ──
    const ip = clientIp(req);
    const rl = await checkRateLimit(_admin, 'proxy-ai', ip, 15, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at, cors);

    // ── Auth check + credits ──────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    // Only check credits for authenticated users with a real JWT.
    // If authHeader is empty or blank (guest user), skip credit check entirely.
    if (authHeader.trim() && authHeader.trim() !== 'Bearer') {
      const creditBlock = await checkAndConsumeCredit(_admin, authHeader, 'proxy-ai', cors);
      if (creditBlock) return creditBlock;
    }

    // ── Parse body ────────────────────────────────────────────────────
    const body: RequestBody = await req.json().catch(() => ({ messages: [] }));

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return json({ error: 'Se requiere un array "messages" con al menos 1 mensaje.' }, 400);
    }

    // Sanitize: limitar tamaño del input (prevenir abuse)
    const totalChars = body.messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
    if (totalChars > 30000) {
      return json({ error: 'Input demasiado largo. Máximo 30,000 caracteres totales.' }, 400);
    }

    // Validar que los roles sean válidos
    const validRoles = new Set(['system', 'user', 'assistant']);
    for (const msg of body.messages) {
      if (!validRoles.has(msg.role) || typeof msg.content !== 'string') {
        return json({ error: 'Cada mensaje debe tener role (system|user|assistant) y content (string).' }, 400);
      }
    }

    const { maxTokens = 1024, temperature = 0.7, jsonMode = false } = body.options ?? {};

    // ══════════════════════════════════════════════════════════════════
    // STRATEGY: OpenRouter FIRST (reliable, free models available).
    // Gemini only as last-resort fallback if OpenRouter completely fails.
    // ══════════════════════════════════════════════════════════════════

    // ── Try OpenRouter (PRIMARY) ──────────────────────────────────────
    const debugLog: string[] = [];
    const serverDeadline = Date.now() + SERVER_BUDGET_MS;
    // NUNCA incluir caracteres de las keys: debugLog viaja al cliente en el 503.
    debugLog.push(`OPENROUTER_KEY: ${OPENROUTER_KEY ? 'present' : 'MISSING'}`);
    debugLog.push(`GEMINI_KEY: ${GEMINI_KEY ? 'present' : 'MISSING'}`);

    if (OPENROUTER_KEY) {
      const aliveModels = FREE_MODELS.filter(isModelAlive);
      if (aliveModels.length === 0) DEAD_MODELS.clear();
      const modelsToTry = aliveModels.length > 0 ? aliveModels : FREE_MODELS;

      for (let mi = 0; mi < modelsToTry.length; mi++) {
        const model = modelsToTry[mi];
        // Si el cliente ya cortó, seguir probando modelos quema créditos IA
        // para nadie.
        const budgetLeft = serverDeadline - Date.now();
        if (budgetLeft < MIN_USEFUL_ATTEMPT_MS) {
          debugLog.push(`presupuesto agotado tras ${model} → corte de la ladder`);
          break;
        }
        const abortAfter = Math.min(mi === 0 ? FIRST_MODEL_ABORT_MS : MODEL_ABORT_MS, budgetLeft);
        const attemptStart = Date.now();
        const latency = () => `${Date.now() - attemptStart}ms`;
        const controller = new AbortController();
        // El timer se suelta recién en el finally. Soltarlo al recibir las
        // cabeceras dejaba el CUERPO sin timeout — y el cuerpo es donde
        // OpenRouter se queda esperando: medido en 49,9s y 89,6s con un abort
        // que decía 20s.
        const timer = setTimeout(() => controller.abort(), abortAfter);
        try {

          const resp = await fetch(OR_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENROUTER_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': ALLOWED_ORIGIN,
              'X-Title': 'Sistema Omicron',
            },
            body: JSON.stringify({
              model,
              messages: body.messages,
              max_tokens: Math.min(maxTokens, 4096),
              temperature: Math.min(Math.max(temperature, 0), 1.5),
              ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
            }),
            signal: controller.signal,
          });

          if (!resp.ok) {
            const status = resp.status;
            const errBody = await resp.text().catch(() => '');
            debugLog.push(`${model} → ${status} en ${latency()}: ${errBody.slice(0, 150)}`);
            console.error(`[proxy-ai] ${model} failed ${status}: ${errBody.slice(0, 200)}`);
            if (status === 404 || status === 402) { DEAD_MODELS.set(model, Date.now()); continue; }
            if (status === 429) continue;
            continue;
          }

          const data = await resp.json();
          const text = data?.choices?.[0]?.message?.content ?? '';
          if (text) {
            console.log(`[proxy-ai] ${model} OK en ${latency()} (${text.length} chars)`);
            return json({ text: text.trim(), model });
          }
          debugLog.push(`${model} → 200 but empty response en ${latency()}`);
          continue;
        } catch (e) {
          const errMsg = (e as Error).name === 'AbortError' ? `abort a los ${Math.round(abortAfter / 1000)}s (real ${latency()})` : `${String(e).slice(0, 100)} (${latency()})`;
          debugLog.push(`${model} → threw: ${errMsg}`);
          console.error(`[proxy-ai] ${model} threw:`, errMsg);
          continue;
        } finally {
          clearTimeout(timer);
        }
      }
    }

    // ── Try Gemini (FALLBACK only if OpenRouter failed) ───────────────
    const geminiBudget = serverDeadline - Date.now();
    if (GEMINI_KEY && geminiBudget >= MIN_USEFUL_ATTEMPT_MS) {
      const geminiController = new AbortController();
      const geminiTimer = setTimeout(() => geminiController.abort(), Math.min(40000, geminiBudget));
      try {
        const contents = body.messages.map((msg) => {
          const role = msg.role === 'assistant' ? 'model' : 'user';
          const text = msg.role === 'system' ? `System: ${msg.content}` : msg.content;
          return { role, parts: [{ text }] };
        });

        const geminiBody = {
          contents,
          generationConfig: {
            maxOutputTokens: Math.min(maxTokens, 4096),
            temperature: Math.min(Math.max(temperature, 0), 1.5),
            responseMimeType: jsonMode ? 'application/json' : 'text/plain',
          },
        };

        const geminiResp = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_KEY,
          },
          body: JSON.stringify(geminiBody),
          signal: geminiController.signal,
        });

        if (geminiResp.ok) {
          const geminiData = await geminiResp.json();
          const geminiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (geminiText) {
            return json({ text: geminiText.trim(), model: GEMINI_MODEL });
          }
        }
      } catch (e) {
        console.warn('[proxy-ai] Gemini fallback also failed:', String(e).slice(0, 100));
      } finally {
        // Igual que en la ladder: el timeout tiene que cubrir la lectura del
        // cuerpo, no solo las cabeceras.
        clearTimeout(geminiTimer);
      }
    }

    // All failed — return debug info so we can see WHAT failed
    debugLog.push(`total intentado en ${Date.now() - (serverDeadline - SERVER_BUDGET_MS)}ms`);
    console.error('[proxy-ai] ALL FAILED. Debug:', debugLog.join(' | '));
    return json({
      error: 'IA no disponible. Todos los modelos fallaron.',
      debug: debugLog,
    }, 503);
  } catch (e) {
    return json({ error: 'Error interno en proxy-ai.', detail: String(e).slice(0, 200) }, 500);
  }
});
