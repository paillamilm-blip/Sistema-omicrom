// supabase/functions/tts/index.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · Text-to-Speech via ElevenLabs
//
// Convierte texto en audio ultra-realista usando ElevenLabs API.
// El frontend envía texto → esta función devuelve audio MP3.
// La API key vive en Supabase Secrets (ELEVENLABS_API_KEY).
//
// Voces recomendadas (español):
//   - "Rachel" (female, warm) — voice_id: 21m00Tcm4TlvDq8ikWAM
//   - "Antoni" (male, warm) — voice_id: ErXwobaYiN019PkySvjV
//   - O cualquier voz custom/clonada del usuario
// ═══════════════════════════════════════════════════════════════════════
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY') || '';
const DEFAULT_VOICE_ID = Deno.env.get('ELEVENLABS_VOICE_ID') || '21m00Tcm4TlvDq8ikWAM'; // Rachel (default)
const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
      },
    });
  }

  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  // Check API key configured
  if (!ELEVENLABS_API_KEY) {
    return json({ error: 'ELEVENLABS_API_KEY not configured. Add it in Supabase Edge Function Secrets.' }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const text: string = (body?.text ?? '').toString().trim();
    const voiceId: string = (body?.voice_id ?? DEFAULT_VOICE_ID).toString().trim();

    if (!text) return json({ error: 'No text provided' }, 400);
    if (text.length > 2000) return json({ error: 'Text too long (max 2000 chars)' }, 400);

    // Call ElevenLabs API
    const response = await fetch(`${ELEVENLABS_URL}/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2', // Best for Spanish
        voice_settings: {
          stability: 0.5,        // Balance between stable and expressive
          similarity_boost: 0.75, // Sound like the selected voice
          style: 0.3,            // Some expressiveness
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => 'Unknown error');
      console.error('[TTS] ElevenLabs error:', response.status, err);
      return json({ error: `ElevenLabs error: ${response.status}` }, 502);
    }

    // Return audio as MP3 binary
    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600', // Cache 1 hour
      },
    });
  } catch (err) {
    console.error('[TTS] Error:', err);
    return json({ error: 'Internal error generating speech' }, 500);
  }
});
