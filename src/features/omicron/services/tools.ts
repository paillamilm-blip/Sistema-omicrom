// src/lib/omicronTools.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON TOOLS — Herramientas que el cerebro puede invocar.
//
// Cuando omicronBrain detecta que necesita una acción específica
// (examen, búsqueda en bóveda, carta, etc.), puede "llamar" una
// herramienta en vez de solo responder con texto.
//
// El flujo:
//   1. omicronBrain analiza el intent
//   2. Si necesita una herramienta → retorna { tool: 'examen', params: {...} }
//   3. El frontend ejecuta la herramienta (navega al tab + lanza la acción)
//   4. El resultado se añade al contexto de Ómicron
//
// Esto convierte a Ómicron de chatbot → agente real.
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from '@/infrastructure/supabase/client';

export type ToolName =
  | 'start_exam'        // Iniciar examen de una skill
  | 'search_vault'      // Buscar en la Bóveda
  | 'generate_carta'    // Generar carta de postulación
  | 'navigate'          // Navegar a un tab
  | 'show_challenge'    // Mostrar el reto del día
  | 'search_jobs'       // Buscar empleos con matching
  | 'upload_cv';        // Abrir upload de CV

export interface ToolCall {
  tool: ToolName;
  params: Record<string, unknown>;
  reason: string; // Por qué Ómicron decidió usar esta herramienta
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  message?: string;
}

/**
 * Catálogo de herramientas — se inyecta al prompt de omicronBrain
 * para que la IA sepa qué puede hacer.
 */
export const TOOL_CATALOG = `
HERRAMIENTAS DISPONIBLES (puedes sugerirlas al usuario):
- [EXAMEN]: Sugerir que valide una skill con un examen IA
- [BÓVEDA]: Recomendar buscar o publicar en la Bóveda de Conocimiento  
- [CARTA]: Ofrecer generar una carta de postulación
- [EMPLEOS]: Dirigir a ver oportunidades de empleo
- [CV]: Sugerir subir o actualizar el CV
- [RETO]: Mencionar el reto diario si no lo ha completado
- [ACADEMIA]: Recomendar un curso de la academia

Cuando sugieras una acción, termina con el formato: [ACCIÓN] para que el sistema pueda ejecutarla.
Ejemplo: "Te recomiendo validar React con un examen. [EXAMEN:react]"
`;

/**
 * Parsea si la respuesta de Ómicron contiene un tool call.
 * Busca patrones como [EXAMEN:react] o [EMPLEOS] al final.
 */
export function parseToolCall(response: string): ToolCall | null {
  const match = response.match(/\[([A-ZÁÉÍÓÚ]+)(?::([^\]]*))?\]\s*$/);
  if (!match) return null;

  const [, action, param] = match;
  const toolMap: Record<string, ToolName> = {
    'EXAMEN': 'start_exam',
    'BÓVEDA': 'search_vault',
    'BOVEDA': 'search_vault',
    'CARTA': 'generate_carta',
    'EMPLEOS': 'navigate',
    'CV': 'upload_cv',
    'RETO': 'show_challenge',
    'ACADEMIA': 'navigate',
  };

  const tool = toolMap[action];
  if (!tool) return null;

  const tabMap: Record<string, string> = {
    'EMPLEOS': 'empleos',
    'ACADEMIA': 'academia',
  };

  return {
    tool,
    params: {
      skill: param ?? undefined,
      tab: tabMap[action] ?? undefined,
    },
    reason: `Ómicron sugirió: ${action}${param ? ` (${param})` : ''}`,
  };
}

/**
 * Ejecuta una herramienta (server-side si es necesario).
 * El frontend maneja la UI (navegación, modales).
 */
export async function executeTool(tool: ToolCall): Promise<ToolResult> {
  switch (tool.tool) {
    case 'search_vault': {
      const query = tool.params.skill as string || '';
      if (!query) return { success: false, message: 'Sin query' };
      const { data } = await supabase.functions.invoke('vault-oracle', {
        body: { query, user_skills: [] },
      });
      return { success: true, data };
    }
    case 'search_jobs': {
      return { success: true, message: 'Navegar a empleos con filtro' };
    }
    default:
      // Herramientas de UI se manejan en el frontend
      return { success: true, message: `Tool ${tool.tool} ready` };
  }
}
