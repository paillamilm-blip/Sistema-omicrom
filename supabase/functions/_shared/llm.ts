// _shared/llm.ts — Cliente LLM compartido: Gemini-first, OpenRouter-fallback.
// Secrets necesarios en Supabase: GEMINI_API_KEY (primario), OPENROUTER_KEY (fallback)

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const OPENROUTER_KEY = Deno.env.get('OPENROUTER_KEY') ?? '';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OR_MODEL = 'google/gemma-4-31b-it:free';
const OR_FALLBACK_MODEL = 'google/gemma-4-26b-a4b-it:free';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Llama a un LLM y devuelve el texto de respuesta.
 * Estrategia: Gemini primero (gratis, rapido), OpenRouter como fallback.
 * @param messages - Array de mensajes (system + user/assistant)
 * @param jsonMode - Si true, pide respuesta en JSON
 * @param maxTokens - Maximo de tokens de salida (default 1024)
 */
export async function callLLM(
  messages: ChatMessage[],
  jsonMode = false,
  maxTokens = 1024,
): Promise<string> {
  // ── Try Gemini first ──────────────────────────────────────────────
  if (GEMINI_KEY) {
    try {
      const result = await callGemini(messages, jsonMode, maxTokens);
      if (result) return result;
    } catch (e) {
      console.warn('[llm] Gemini failed, falling back to OpenRouter:', String(e).slice(0, 150));
    }
  }

  // ── Fallback: OpenRouter ──────────────────────────────────────────
  if (!OPENROUTER_KEY) {
    throw new Error('Falta GEMINI_API_KEY y OPENROUTER_KEY en los secretos de Supabase.');
  }

  return await callOpenRouter(messages, jsonMode, maxTokens);
}

/** Helper: verificar si al menos una key esta configurada */
export function hasKey(): boolean {
  return !!(GEMINI_KEY || OPENROUTER_KEY);
}

// ── Gemini ────────────────────────────────────────────────────────────

async function callGemini(
  messages: ChatMessage[],
  jsonMode: boolean,
  maxTokens: number,
): Promise<string> {
  // Gemini no tiene rol 'system' — convertir a user con prefijo
  const contents = messages.map((msg) => {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const text = msg.role === 'system' ? `System: ${msg.content}` : msg.content;
    return { role, parts: [{ text }] };
  });

  const body = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
      responseMimeType: jsonMode ? 'application/json' : 'text/plain',
    },
  };

  const resp = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Gemini returned empty content');
  return text.trim();
}

// ── OpenRouter ────────────────────────────────────────────────────────

async function callOpenRouter(
  messages: ChatMessage[],
  jsonMode: boolean,
  maxTokens: number,
): Promise<string> {
  for (const model of [OR_MODEL, OR_FALLBACK_MODEL]) {
    try {
      const resp = await fetch(OR_URL, {
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
        console.error(`[llm/openrouter] ${model} failed: ${resp.status} ${err.slice(0, 200)}`);
        continue;
      }

      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content ?? '';
      if (text) return text.trim();
      console.error(`[llm/openrouter] ${model} returned empty content`);
      continue;
    } catch (e) {
      console.error(`[llm/openrouter] ${model} error:`, e);
      continue;
    }
  }

  throw new Error('OpenRouter: ambos modelos fallaron. Intenta mas tarde.');
}
