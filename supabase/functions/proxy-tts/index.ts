// supabase/functions/proxy-tts/index.ts
// ═══════════════════════════════════════════════════════════════════════
// PROXY-TTS — Text-to-Speech server-side via OpenRouter.
//
// Protege la API key (nunca en el frontend). Usa un único motor TTS.
// Retorna audio stream (mp3 o pcm) directo al browser para reproducción.
//
// VOZ UNIFICADA (una sola): Fish Audio S2.1 Pro Free, multilingüe y
// expresivo. Acento español latinoamericano NEUTRO (el texto de la app
// ya está neutralizado, sin voseo). Si Fish Audio falla, se retorna
// { fallback: true } para que el navegador use su voz local como
// emergencia offline (ver voiceAI.ts). Kokoro fue removido para evitar
// cambios de voz a mitad de conversación.
//
// El frontend envía texto oración por oración → reproduce al instante.
// ═══════════════════════════════════════════════════════════════════════
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// EL CORS VA INLINNEADO, NO IMPORTADO DESDE _shared.
// Este proyecto se despliega pegando index.ts en el editor del dashboard, y
// el dashboard congela una copia de `_shared/` en el momento en que la
// función se creó: actualizar el import no actualiza esa copia. Se midió el
// 2026-10-24 — proxy-ai (snapshot nuevo) refleja `localhost:5173`, proxy-tts
// (snapshot viejo) devuelve siempre el origen de producción y el browser
// bloquea la voz en desarrollo. Un solo archivo = lo pegado = lo que corre.
const PROD_ORIGIN = 'https://sistema-omicrom.vercel.app';
const ALLOWED_ORIGINS = [
  PROD_ORIGIN,
  Deno.env.get('PUBLIC_SITE_URL') || '',
  'http://localhost:5173', // Vite dev
  'http://localhost:3000',
].filter(Boolean);

function getAllowedOrigin(requestOrigin: string | null): string {
  if (!requestOrigin) return PROD_ORIGIN;
  if (ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin;
  // previews de Vercel del proyecto (con y sin la 'm' final del nombre viejo)
  if (requestOrigin.endsWith('.vercel.app') && /sistema-omicro[nm]/.test(requestOrigin)) {
    return requestOrigin;
  }
  return PROD_ORIGIN;
}

// Huella de build: un OPTIONS desde localhost devuelve esta cabecera SI el
// codigo nuevo esta corriendo, y `Access-Control-Allow-Origin: <el origin>`
// si ademas el CORS inline esta vivo. Sin esto no se puede distinguir
// "no se despliego" de "se despliego y no anda".
const BUILD = '6f-cors-inline';

function corsHeaders(req?: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(req?.headers?.get('origin') ?? null),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'x-omicron-build': BUILD,
    'Vary': 'Origin',
  };
}

const OPENROUTER_KEY = Deno.env.get('OPENROUTER_KEY') ?? '';
const TTS_URL = 'https://openrouter.ai/api/v1/audio/speech';
const ALLOWED_ORIGIN = Deno.env.get('PUBLIC_SITE_URL') || PROD_ORIGIN;

// Motor TTS ÚNICO: Fish Audio S2.1 Pro Free (multilingüe, expresivo).
// Sin fallback a otros modelos → una sola voz coherente en toda la sesión.
const TTS_MODELS = [
  'fish-audio/s2.1-pro-free',
];

// Voces españolas — acento latinoamericano NEUTRO.
// Fish Audio S2.1 sigue el texto de entrada (ya neutralizado LatAm), por
// eso usamos la voz española genérica del modelo sin sobre-parametrizar.
const VOICES: Record<string, string> = {
  default: 'es_female', // S2.1: español femenino (neutro LatAm)
  male: 'es_male',      // S2.1: español masculino (neutro LatAm)
};

Deno.serve(async (req) => {
  // Se le pasa el request: sin eso getAllowedOrigin() cae al default de
  // producción y el browser bloquea localhost:5173.
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    if (!OPENROUTER_KEY) {
      return new Response(JSON.stringify({ error: 'TTS no configurado (falta OPENROUTER_KEY)' }), {
        status: 503, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const text = (body.text ?? '').toString().trim();
    const voice = body.voice ?? 'default';
    const format = body.format ?? 'mp3';

    if (!text) {
      return new Response(JSON.stringify({ error: 'Se requiere campo "text"' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Limitar a 500 chars por llamada (una oración/chunk)
    const chunk = text.slice(0, 500);

    // Intentar con cada modelo TTS
    for (const model of TTS_MODELS) {
      try {
        const resp = await fetch(TTS_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': ALLOWED_ORIGIN,
            'X-Title': 'Sistema Omicron TTS',
          },
          body: JSON.stringify({
            model,
            input: chunk,
            voice: VOICES[voice] ?? VOICES.default,
            response_format: format,
            speed: 1.05, // Ligeramente más rápido para sentirse natural
          }),
        });

        if (!resp.ok) {
          console.warn(`[proxy-tts] ${model} failed: ${resp.status}`);
          continue; // Try next model
        }

        // Stream de audio directo al frontend
        return new Response(resp.body, {
          status: 200,
          headers: {
            ...CORS,
            'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'audio/pcm',
            'Cache-Control': 'public, max-age=3600', // Cache 1h (mismo texto = mismo audio)
          },
        });
      } catch (e) {
        console.error(`[proxy-tts] ${model} error:`, e);
        continue;
      }
    }

    // All TTS models failed — return fallback for browser speechSynthesis
    return new Response(JSON.stringify({ fallback: true, text: chunk }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e).slice(0, 200) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
