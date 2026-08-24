// src/lib/schemas/cvAnalysis.ts
// ═══════════════════════════════════════════════════════════════════════
// ZOD SCHEMA — Valida la respuesta de la IA al analizar un CV.
//
// Sin esto, un JSON malformado de la IA causa undefined silenciosos.
// Con Zod: si la respuesta no cumple el schema, se rechaza de forma
// explícita y controlada.
// ═══════════════════════════════════════════════════════════════════════
import { z } from 'zod';

/** Schema para un skill con porcentaje de dominio */
export const SkillDetailSchema = z.object({
  name: z.string().min(1),
  pct: z.number().min(0).max(100),
});

/** Schema para los 4 ejes del Gemelo Digital */
export const AxesSchema = z.object({
  exec: z.number().default(40),
  qual: z.number().default(40),
  trans: z.number().default(20),
  fund: z.number().default(30),
});

/** Schema completo de la respuesta del análisis de CV con IA */
export const GeminiAnalysisSchema = z.object({
  name: z.string().optional().default(''),
  seniorLabel: z.string().optional().default('Profesional'),
  seniorLevel: z.number().optional().default(2),
  years: z.number().optional().default(0),
  skills: z.array(z.string()).optional().default([]),
  skillsDetail: z.array(SkillDetailSchema).optional().default([]),
  arch: z.string().optional().default('mid'),
  axes: AxesSchema,
  summary: z.string().optional().default(''),
});

export type GeminiAnalysisValidated = z.infer<typeof GeminiAnalysisSchema>;

/**
 * Intenta parsear y validar la respuesta de la IA.
 * Si falla, retorna { success: false, error: string }.
 * Si pasa, retorna { success: true, data: GeminiAnalysisValidated }.
 */
export function validateGeminiResponse(raw: unknown): 
  | { success: true; data: GeminiAnalysisValidated }
  | { success: false; error: string } {
  const result = GeminiAnalysisSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
  return { success: false, error: `Respuesta de IA inválida: ${issues}` };
}
