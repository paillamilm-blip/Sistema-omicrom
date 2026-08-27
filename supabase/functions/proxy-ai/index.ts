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

// Modelos gratis ordenados por preferencia (actualizado agosto 2026)
const FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'google/gemma-3n-e4b-it:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
];

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
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  // CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // ── Validate key ──────────────────────────────────────────────────
    if (!OPENROUTER_KEY && !GEMINI_KEY) {
      return json({ error: 'IA no configurada (falta GEMINI_API_KEY y OPENROUTER_KEY en secrets).' }, 503);
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

    // ── Try Gemini first ──────────────────────────────────────────────
    if (GEMINI_KEY) {
      try {
        // Gemini no tiene rol 'system' — convertir a user con prefijo
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

        const geminiController = new AbortController();
        const geminiTimer = setTimeout(() => geminiController.abort(), 40000);
        const geminiResp = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_KEY,
          },
          body: JSON.stringify(geminiBody),
          signal: geminiController.signal,
        });
        clearTimeout(geminiTimer);

        if (geminiResp.ok) {
          const geminiData = await geminiResp.json();
          const geminiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (geminiText) {
            return json({ text: geminiText.trim(), model: GEMINI_MODEL });
          }
        } else {
          console.warn(`[proxy-ai] Gemini failed: ${geminiResp.status}, falling back to OpenRouter`);
        }
      } catch (e) {
        console.warn('[proxy-ai] Gemini error, falling back to OpenRouter:', String(e).slice(0, 150));
      }
    }

    // ── If no OPENROUTER_KEY and Gemini failed, return clear error ────
    if (!OPENROUTER_KEY) {
      return json({ error: 'Gemini falló y no hay fallback disponible (OPENROUTER_KEY no configurada). Reintentá en unos segundos.' }, 503);
    }

    // ── Call OpenRouter with multi-model fallback ──────────────────────
    const aliveModels = FREE_MODELS.filter(isModelAlive);
    if (aliveModels.length === 0) {
      DEAD_MODELS.clear(); // Reset and try all
    }
    const modelsToTry = aliveModels.length > 0 ? aliveModels : FREE_MODELS;

    for (const model of modelsToTry) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 25000); // 25s timeout

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
            max_tokens: Math.min(maxTokens, 4096), // Cap server-side
            temperature: Math.min(Math.max(temperature, 0), 1.5),
            ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!resp.ok) {
          const status = resp.status;
          if (status === 404 || status === 402) {
            DEAD_MODELS.set(model, Date.now());
            continue;
          }
          if (status === 429) continue; // Rate limited on this model, try next
          continue; // Other errors, try next
        }

        const data = await resp.json();
        const text = data?.choices?.[0]?.message?.content ?? '';
        if (text) {
          return json({ text: text.trim(), model });
        }
        continue; // Empty response, try next
      } catch (e) {
        if ((e as Error).name === 'AbortError') continue;
        continue;
      }
    }

    // All models failed
    return json({ error: 'IA no disponible. Todos los modelos fallaron. Intenta en unos minutos.' }, 503);
  } catch (e) {
    return json({ error: 'Error interno en proxy-ai.', detail: String(e).slice(0, 200) }, 500);
  }
});
