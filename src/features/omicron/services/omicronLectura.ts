// features/omicron/services/omicronLectura.ts
// Lógica PURA del modo LECTURA de la barra Ómicrom y del cableado de la Red
// Viva con la navegación por tabs. Sin React, sin Supabase, sin acceso a red:
// solo transforma el modelo de la Red Viva en texto sin jerga y decide a qué
// tab lleva un nodo. Se testea aislado (omicronLectura.test.ts) y CI lo valida.
//
// FILOSOFÍA ADITIVA: los textos NO se inventan. El resumen de la red y la línea
// por nodo se toman de resumenRed()/textoEstado() de redViva.ts (fuente única),
// nunca de strings sueltos. Si no hay nada que leer, se dice con honestidad.

import type { NodoRed, RedVivaModel } from '@/features/redviva/services/redViva';
import { resumenRed, textoEstado } from '@/features/redviva/services/redViva';
import type { TabId } from '@/types/common';

/**
 * Qué "lee" Ómicrom en modo lectura. Si hay un nodo enfocado, prioriza su
 * lectura concreta (textoEstado); si no, el resumen global de la red
 * (resumenRed). Ambos vienen del modelo real, sin jerga y sin inventar.
 *
 * @param model  modelo de la Red Viva (datos reales del usuario).
 * @param nodo   nodo enfocado (seleccionado) o null si no hay foco.
 */
export function textoLecturaOmicron(
  model: RedVivaModel,
  nodo: NodoRed | null,
): string {
  if (nodo) return textoEstado(nodo);
  return resumenRed(model);
}

/**
 * Traduce un nodo de la Red Viva a la tab de navegación que le corresponde.
 * La Red Viva ya NO es un menú de tabs: es la evidencia del usuario. Pero al
 * seleccionar un nodo, Ómicrom abre la superficie donde ESE nodo se acciona:
 *   • ausente  → 'empleos': lo que te falta se persigue desde los empleos que
 *                lo piden (el puente ámbar apunta ahí).
 *   • resto    → 'maxskill': una habilidad tuya (probada / declarada / en
 *                prueba) se acciona probándola en Habilidades.
 * Es determinista y no depende del color ni del layout.
 */
export function tabParaNodo(nodo: NodoRed): TabId {
  if (nodo.estado === 'ausente') return 'empleos';
  return 'maxskill';
}
