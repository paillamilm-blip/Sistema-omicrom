// src/lib/aiStream.ts
// ═══════════════════════════════════════════════════════════════════════
// AI STREAMING — Texto en tiempo real desde proxy-ai.
//
// En vez de esperar 3-5s por la respuesta completa, el texto aparece
// token por token (~0.5s hasta el primer token). El callback onToken
// se llama con cada fragmento para actualizar la UI en vivo.
//
// Compatible con el proxy-ai actual (non-streaming) como fallback.
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from '@/infrastructure/supabase/client';
import type { AIMessage } from './client';

export interface StreamOptions {
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  timeout?: number;
}

// Re-export for consumers that import from stream
export type { AIMessage };

/**
 * Llama a proxy-ai con streaming. Invoca onToken con cada fragmento.
 * Retorna el texto completo al finalizar.
 * Si streaming no está disponible, cae a callAI normal (non-streaming).
 */
export async function callAIStream(
  messages: AIMessage[],
  onToken: (partial: string) => void,
  options: StreamOptions = {},
): Promise<string> {
  const { maxTokens = 512, temperature = 0.75, timeout = 25000 } = options;

  try {
    // Intentar streaming via fetch directo a la Edge Function
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';
    const supabaseUrl = (supabase as unknown as { supabaseUrl?: string }).supabaseUrl
      ?? import.meta.env.VITE_SUPABASE_URL
      ?? 'https://cuwuyqpxaibbqjrvamjb.supabase.co';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const resp = await fetch(`${supabaseUrl}/functions/v1/proxy-ai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-stream': 'true', // Signal to proxy-ai that we want streaming
      },
      body: JSON.stringify({
        messages,
        options: { maxTokens, temperature, stream: true },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    // Si la respuesta es streaming (text/event-stream o chunked)
    if (resp.ok && resp.body) {
      const contentType = resp.headers.get('content-type') ?? '';

      // SSE stream
      if (contentType.includes('text/event-stream') || contentType.includes('stream')) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let full = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          // Parse SSE: "data: {...}\n\n"
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const token = parsed.choices?.[0]?.delta?.content ?? parsed.text ?? '';
                if (token) {
                  full += token;
                  onToken(full);
                }
              } catch {
                // Texto plano (no JSON)
                if (data.trim()) {
                  full += data;
                  onToken(full);
                }
              }
            }
          }
        }
        return full;
      }

      // Non-streaming fallback (respuesta JSON normal)
      const json = await resp.json();
      const text = json.text ?? '';
      if (text) onToken(text);
      return text;
    }

    // Fallback: usar callAI normal
    const { callAI } = await import('./client');
    const result = await callAI(messages, { maxTokens, temperature, timeout });
    if (result) onToken(result);
    return result ?? '';
  } catch {
    // Fallback silencioso a non-streaming
    try {
      const { callAI } = await import('./client');
      const result = await callAI(messages, { maxTokens, temperature, timeout });
      if (result) onToken(result);
      return result ?? '';
    } catch {
      return '';
    }
  }
}
