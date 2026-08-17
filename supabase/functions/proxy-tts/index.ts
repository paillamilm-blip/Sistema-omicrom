// supabase/functions/proxy-tts/index.ts
// ═══════════════════════════════════════════════════════════════════════
// PROXY-TTS — Text-to-Speech server-side via OpenRouter.
//
// Protege la API key (nunca en el frontend). Usa modelos TTS gratis.
// Retorna audio stream (mp3 o pcm) directo al browser para reproducción.
//
// Modelos disponibles (ago-2026):
//   - fish-audio/s2.1-pro-free (GRATIS, multilingüe, expresivo)
//   - hexgrad/kokoro-82m (GRATIS, voces españolas naturales)
//
// El frontend envía texto oración por oración → reproduce al instante.
// ═══════════════════════════════════════════════════════════════════════
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';

const OPENROUTER_KEY = Deno.env.get('OPENROUTER_KEY') ?? '';
const TTS_URL = 'https://openrouter.ai/api/v1/audio/speech';
const ALLOWED_ORIGIN = Deno.env.get('PUBLIC_SITE_URL') || 'https://sistema-omicrom.vercel.app';

// Modelos TTS: S2.1 Pro Free (expresivo) → Kokoro (rápido) como fallback
const TTS_MODELS = [
  'fish-audio/s2.1-pro-free',
  'hexgrad/kokoro-82m',
];

// Voces españolas
const VOICES: Record<string, string> = {
  default: 'ef_dora',      // Kokoro: español femenino natural
  male: 'em_alex',         // Kokoro: español masculino
  s2_spanish: 'es_female', // S2.1: español genérico
};

const CORS = corsHeaders();

Deno.serve(async (req) => {
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

    return new Response(JSON.stringify({ error: 'TTS no disponible. Modelos fallaron.' }), {
      status: 503, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e).slice(0, 200) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
