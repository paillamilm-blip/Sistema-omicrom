// _shared/openrouter.ts — Cliente OpenRouter compartido para todas las Edge Functions.
// Usa modelos GRATIS de OpenRouter (google/gemma-4-31b-it:free).
// Secret necesario en Supabase: OPENROUTER_KEY

const OPENROUTER_KEY = Deno.env.get('OPENROUTER_KEY') ?? '';
const MODEL = 'google/gemma-4-31b-it:free';
const FALLBACK_MODEL = 'google/gemma-4-26b-a4b-it:free';
const URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Llama a OpenRouter y devuelve el texto de respuesta.
 * Si el modelo principal falla, intenta con el fallback.
 * @param messages - Array de mensajes (system + user/assistant)
 * @param jsonMode - Si true, pide respuesta en JSON
 * @param maxTokens - Máximo de tokens de salida (default 1024)
 */
export async function callLLM(
  messages: ChatMessage[],
  jsonMode = false,
  maxTokens = 1024,
): Promise<string> {
  if (!OPENROUTER_KEY) {
    throw new Error('Falta OPENROUTER_KEY en los secretos de Supabase.');
  }

  for (const model of [MODEL, FALLBACK_MODEL]) {
    try {
      const resp = await fetch(URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://sistema-omicrom.vercel.app',
          'X-Title': 'Sistema Omicron',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

      if (!resp.ok) {
        const err = await resp.text().catch(() => '');
        console.error(`[openrouter] ${model} failed: ${resp.status} ${err.slice(0, 200)}`);
        continue; // try fallback
      }

      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content ?? '';
      if (text) return text.trim();
      console.error(`[openrouter] ${model} returned empty content`);
      continue;
    } catch (e) {
      console.error(`[openrouter] ${model} error:`, e);
      continue;
    }
  }

  throw new Error('OpenRouter: ambos modelos fallaron. Intenta más tarde.');
}

/** Helper: verificar si la key está configurada */
export function hasKey(): boolean {
  return !!OPENROUTER_KEY;
}
