// src/lib/omicronTools.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICROM TOOLS — Herramientas que el cerebro puede invocar.
//
// Cuando omicronBrain detecta que necesita una acción específica
// (examen, reto, CV), puede "llamar" una herramienta en vez de solo
// responder con texto.
//
// El flujo:
//   1. omicronBrain analiza el intent
//   2. Si necesita una herramienta → retorna { tool: 'examen', params: {...} }
//   3. El frontend ejecuta la herramienta (navega al tab + lanza la acción)
//   4. El resultado se añade al contexto de Ómicrom
//
// Esto convierte a Ómicrom de chatbot → agente real.
// ═══════════════════════════════════════════════════════════════════════

export type ToolName =
  | 'start_exam'        // Iniciar examen de una skill
  | 'navigate'          // Navegar a un tab
  | 'show_challenge'    // Mostrar el reto del día
  | 'upload_cv';        // Abrir upload de CV

export interface ToolCall {
  tool: ToolName;
  params: Record<string, unknown>;
  reason: string; // Por qué Ómicrom decidió usar esta herramienta
}

/**
 * Catálogo de herramientas — se inyecta al prompt de omicronBrain
 * para que la IA sepa qué puede hacer.
 *
 * El recorte de la Fase 5 sacó [CARTA] y [EMPLEOS]: ofrecer una carta de
 * postulación o una bolsa de empleos abría una pantalla con 0 filas. La
 * [BÓVEDA] salió con la Fase 6 por el mismo motivo — y era peor, porque este
 * catálogo se manda al prompt del modelo: la IA estaba instruida para
 * recomendar una función que ya no existe en la base.
 * Queda solo lo que el producto puede cumplir hoy.
 */
export const TOOL_CATALOG = `
HERRAMIENTAS DISPONIBLES (puedes sugerirlas al usuario):
- [EXAMEN]: Sugerir que valide una skill con un examen IA
- [CV]: Sugerir subir o actualizar el CV
- [RETO]: Mencionar el reto diario si no lo ha completado
- [ACADEMIA]: Recomendar un curso de la academia

Cuando sugieras una acción, termina con el formato: [ACCIÓN] para que el sistema pueda ejecutarla.
Ejemplo: "Te recomiendo validar React con un examen. [EXAMEN:react]"
`;

/**
 * Parsea si la respuesta de Ómicrom contiene un tool call.
 * Busca patrones como [EXAMEN:react] o [ACADEMIA] al final.
 */
export function parseToolCall(response: string): ToolCall | null {
  const match = response.match(/\[([A-ZÁÉÍÓÚ]+)(?::([^\]]*))?\]\s*$/);
  if (!match) return null;

  const [, action, param] = match;
  const toolMap: Record<string, ToolName> = {
    'EXAMEN': 'start_exam',
    'CV': 'upload_cv',
    'RETO': 'show_challenge',
    'ACADEMIA': 'navigate',
  };

  const tool = toolMap[action];
  if (!tool) return null;

  const tabMap: Record<string, string> = {
    'ACADEMIA': 'academia',
  };

  return {
    tool,
    params: {
      skill: param ?? undefined,
      tab: tabMap[action] ?? undefined,
    },
    reason: `Ómicrom sugirió: ${action}${param ? ` (${param})` : ''}`,
  };
}
