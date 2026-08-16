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

import { supabase } from './supabase';

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
 * Llama a la IA vía Edge Function proxy-ai (server-side).
 * Si falla, retorna null (el caller decide qué hacer).
 */
export async function callAI(
  messages: AIMessage[],
  options: AIOptions = {},
): Promise<string | null> {
  const { maxTokens = 1024, temperature = 0.7, jsonMode = false, timeout = 30000 } = options;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const { data, error } = await supabase.functions.invoke('proxy-ai', {
      body: {
        messages,
        options: { maxTokens, temperature, jsonMode },
      },
    });

    clearTimeout(timer);

    if (error) {
      console.warn('[aiClient] Edge Function error:', error.message ?? error);
      return null;
    }

    // La Edge Function retorna { text: string, model: string } on success
    // o { error: string } on failure
    if (data?.text) return data.text;
    if (data?.error) {
      console.warn('[aiClient] Server error:', data.error);
      return null;
    }

    return null;
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      console.warn('[aiClient] Timeout alcanzado.');
    } else {
      console.error('[aiClient] Error:', e);
    }
    return null;
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
