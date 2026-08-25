// src/lib/aiClient.ts
// ═══════════════════════════════════════════════════════════════════════
// AI CLIENT — Proxy seguro vía Edge Function.
//
// ANTES: llamaba a OpenRouter DIRECTO desde el browser (exponía la API key).
// AHORA: invoca supabase.functions.invoke('proxy-ai') — la key vive solo
//        server-side. Rate limiting real, créditos atómicos, sin abuse.
//
// La interfaz pública (callAI, isAIAvailable, checkRateLimit) se mantiene
// IDÉNTICA para no romper los ~12 archivos que la importan.
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from '@/infrastructure/supabase/client';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  timeout?: number; // ms — ahora es un hint (el server tiene su propio timeout)
}

/**
 * Error class that carries the specific server message through to callers.
 * This allows upstream code to distinguish between timeout, credits exhausted,
 * model unavailable, etc. and show the user an actionable message.
 */
export class AIError extends Error {
  code: 'timeout' | 'credits' | 'server' | 'network';
  constructor(message: string, code: AIError['code']) {
    super(message);
    this.name = 'AIError';
    this.code = code;
  }
}

export async function callAI(
  messages: AIMessage[],
  options: AIOptions = {},
): Promise<string | null> {
  const { maxTokens = 1024, temperature = 0.7, jsonMode = false, timeout = 30000 } = options;

  try {
    // Promise.race: the Supabase JS v2 invoke() does NOT support AbortSignal,
    // so we race the call against a timeout to ensure actual timeout behavior.
    const invokePromise = supabase.functions.invoke('proxy-ai', {
      body: {
        messages,
        options: { maxTokens, temperature, jsonMode },
      },
    });

    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
      setTimeout(() => resolve({ data: null, error: { message: 'TIMEOUT' } }), timeout);
    });

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    if (error) {
      const msg = typeof error === 'string' ? error : (error.message ?? String(error));
      console.warn('[aiClient] Edge Function error:', msg, error);

      // Propagate specific error types so callers can show better messages
      if (msg === 'TIMEOUT') {
        throw new AIError('La IA tardó demasiado en responder.', 'timeout');
      }

      // Supabase JS v2 FunctionsHttpError: the context is the Response object.
      // Try multiple approaches to extract the JSON error body.
      let serverMessage: string | null = null;
      try {
        // Approach 1: error.context is a Response object (v2 standard)
        if (error.context && typeof error.context.json === 'function') {
          const body = await error.context.json();
          serverMessage = body?.error || body?.message || null;
        }
        // Approach 2: error.context.body is a string (some versions)
        else if (error.context?.body && typeof error.context.body === 'string') {
          const body = JSON.parse(error.context.body);
          serverMessage = body?.error || body?.message || null;
        }
        // Approach 3: error itself has the parsed data (newer versions)
        else if ((error as { data?: { error?: string } }).data?.error) {
          serverMessage = (error as { data: { error: string } }).data.error;
        }
      } catch {
        // Could not parse server message — continue with generic
      }

      if (serverMessage) {
        if (serverMessage.includes('Créditos') || serverMessage.includes('créditos') || serverMessage.includes('límite')) {
          throw new AIError(serverMessage, 'credits');
        }
        if (serverMessage.includes('no configurada') || serverMessage.includes('no disponible')) {
          throw new AIError(serverMessage, 'server');
        }
        throw new AIError(serverMessage, 'server');
      }

      // If msg indicates connection failure vs server error
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
        throw new AIError('Sin conexión al servidor. Verificá tu internet.', 'network');
      }

      throw new AIError(msg || 'Error al contactar el servicio de IA.', 'server');
    }

    // La Edge Function retorna { text: string, model: string } on success
    // o { error: string } on failure (even with 200 status in some cases)
    if (data?.text) return data.text;
    if (data?.error) {
      console.warn('[aiClient] Server error in data:', data.error);
      if (data.error.includes('Créditos') || data.error.includes('créditos')) {
        throw new AIError(data.message || data.error, 'credits');
      }
      throw new AIError(data.error, 'server');
    }

    return null;
  } catch (e) {
    if (e instanceof AIError) throw e; // re-throw typed errors
    console.error('[aiClient] Error:', e);
    // Distinguish network errors from other errors
    const errMsg = (e as Error)?.message || '';
    if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('ERR_')) {
      throw new AIError('Sin conexión al servidor. Verificá tu internet.', 'network');
    }
    throw new AIError('Error de conexión con la IA.', 'network');
  }
}

/**
 * Verifica si la IA está disponible (siempre true si Supabase está conectado).
 * La Edge Function maneja internamente si la key existe o no.
 */
export function isAIAvailable(): boolean {
  return true; // La disponibilidad real la controla el servidor
}

/**
 * Retorna el modelo en uso (ahora determinado server-side).
 */
export function getCurrentModel(): string {
  return 'server-managed'; // El proxy elige el modelo
}

/**
 * Rate limiter client-side (COMPLEMENTARIO al server-side).
 * Evita que el usuario haga spam de clicks innecesarios mientras
 * el rate limit REAL está en el servidor.
 */
export function checkRateLimit(key: string, maxPerDay: number): boolean {
  const storageKey = `omicron_rl_${key}`;
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem(storageKey);

  if (!raw) {
    localStorage.setItem(storageKey, JSON.stringify({ date: today, count: 1 }));
    return true;
  }

  try {
    const data = JSON.parse(raw);
    if (data.date !== today) {
      localStorage.setItem(storageKey, JSON.stringify({ date: today, count: 1 }));
      return true;
    }
    if (data.count >= maxPerDay) return false;
    data.count++;
    localStorage.setItem(storageKey, JSON.stringify(data));
    return true;
  } catch {
    localStorage.setItem(storageKey, JSON.stringify({ date: today, count: 1 }));
    return true;
  }
}
