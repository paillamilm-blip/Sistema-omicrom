// src/lib/aiClient.ts
// ═══════════════════════════════════════════════════════════════════════
// AI CLIENT RESILIENTE — Multi-model fallback + detección de modelo muerto.
// Si OpenRouter quita el modelo gratis, automáticamente prueba el siguiente.
// Mantiene un cache de "modelos muertos" para no perder tiempo.
// ═══════════════════════════════════════════════════════════════════════

const OR_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Modelos gratis de OpenRouter (ordenados por preferencia — actualizar si rotan)
// ACTUALIZADO ago-2026: Solo quedan Google y NVIDIA en capa gratuita.
// Meta Llama, Qwen y Mistral fueron removidos.
// Más modelos = menos probabilidad de 429 (rate limit distribuido).
const FREE_MODELS = [
  'google/gemma-4-31b-it:free',               // Google 31B, 256K ctx — mejor calidad
  'nvidia/nemotron-3-super-120b-a12b:free',    // NVIDIA 120B MoE (12B active) — rápido
  'google/gemma-4-26b-a4b-it:free',            // Google 26B sparse
  'nvidia/nemotron-3-nano-30b-a3b:free',       // NVIDIA 30B MoE (3B active) — ultra rápido
  'google/gemma-3n-e4b-it:free',               // Google 4B — ligero, siempre disponible
  'nvidia/nemotron-3-ultra-550b-a55b:free',    // NVIDIA 550B (55B active) — último recurso
];

// Cache de modelos que fallaron recientemente (no reintentar por 1h)
const DEAD_MODELS: Map<string, number> = new Map();
const DEAD_TTL = 60 * 60 * 1000; // 1 hora

function isModelAlive(model: string): boolean {
  const deadSince = DEAD_MODELS.get(model);
  if (!deadSince) return true;
  if (Date.now() - deadSince > DEAD_TTL) {
    DEAD_MODELS.delete(model); // Reintentar después de 1h
    return true;
  }
  return false;
}

function markModelDead(model: string): void {
  DEAD_MODELS.set(model, Date.now());
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  timeout?: number; // ms, default 15000
}

/**
 * Llama a OpenRouter con fallback automático entre modelos gratis.
 * Si todos fallan, retorna null (el caller decide qué hacer).
 */
export async function callAI(
  messages: AIMessage[],
  options: AIOptions = {},
): Promise<string | null> {
  if (!OR_KEY) {
    console.warn('[aiClient] Sin VITE_OPENROUTER_KEY — IA desactivada');
    return null;
  }

  const { maxTokens = 1024, temperature = 0.7, jsonMode = false, timeout = 15000 } = options;
  const aliveModels = FREE_MODELS.filter(isModelAlive);

  if (aliveModels.length === 0) {
    console.error('[aiClient] Todos los modelos están muertos. Reintentando en 1h.');
    // Reset all para reintentar
    DEAD_MODELS.clear();
    return null;
  }

  for (const model of aliveModels) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const resp = await fetch(OR_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OR_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://sistema-omicrom.vercel.app',
          'X-Title': 'Sistema Omicron',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!resp.ok) {
        const status = resp.status;
        // 429 = rate limited, 402 = payment required, 404 = model removed
        if (status === 404 || status === 402) {
          markModelDead(model);
          console.warn(`[aiClient] Modelo ${model} muerto (${status}). Probando siguiente.`);
          continue;
        }
        if (status === 429) {
          // Rate limited — NO marcar como muerto, solo saltar al siguiente
          // El siguiente modelo probablemente tiene su propio rate limit separado
          console.warn(`[aiClient] Rate limit en ${model}. Saltando a siguiente modelo.`);
          continue;
        }
        // Otros errores (500, 503, etc) — probar siguiente
        console.warn(`[aiClient] Error ${status} en ${model}.`);
        continue;
      }

      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content ?? '';
      if (text) return text.trim();
      continue; // Empty response — try next
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        console.warn(`[aiClient] Timeout en ${model}. Probando siguiente.`);
        continue;
      }
      console.error(`[aiClient] Error en ${model}:`, e);
      continue;
    }
  }

  console.error('[aiClient] Todos los modelos fallaron en esta llamada.');
  return null;
}

/**
 * Verifica si hay al menos un modelo disponible.
 */
export function isAIAvailable(): boolean {
  return !!OR_KEY && FREE_MODELS.some(isModelAlive);
}

/**
 * Retorna el modelo que se va a usar (para debugging).
 */
export function getCurrentModel(): string {
  const alive = FREE_MODELS.filter(isModelAlive);
  return alive[0] ?? 'ninguno';
}

/**
 * Rate limiter simple basado en localStorage.
 * Retorna true si la acción está dentro del límite.
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
