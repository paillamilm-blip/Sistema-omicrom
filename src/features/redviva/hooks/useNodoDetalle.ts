// features/redviva/hooks/useNodoDetalle.ts
// Lo que hay que saber de UNA habilidad antes de decidir probarla: si el
// examen existe de verdad.
//
// LA REGLA QUE ESTE ARCHIVO PROTEGE: no prometer lo que el backend no puede
// cumplir. Hoy el examen (Edge Function simulador-universal) exige una fila en
// skill_tree_nodes y rechaza los ids 'virtual-*' que fabrica MaxSkillTab con un
// 404 'Nodo no encontrado'. O sea: NO se puede examinar cualquier habilidad del
// CV todavía. Antes de mostrar un botón "Probarla ahora" se verifica que el
// examen exista; si no existe, la ficha lo dice en vez de mandar al usuario a
// una pared.
//
// (Estaba también la cotización del Fondo de Conocimiento —`omicron_fund_quote`—
// para decir cuánto paga probar una habilidad. El Fondo nunca tuvo tokens, así
// que la cotización solo podía responder "0". Se fue con el Fondo.)

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';

export interface ExamenDisponible {
  /** null = no hay examen para esta habilidad todavía. */
  nodeId: string | null;
  titulo: string | null;
}

/**
 * ¿Existe un examen real para esta habilidad?
 *
 * Busca en el catálogo skill_tree_nodes por título. Primero exacto (sin
 * distinguir mayúsculas) y después por coincidencia parcial, que es el mismo
 * criterio flexible que usa el matching del servidor.
 */
export function useExamenDisponible(skill: string | null | undefined) {
  return useQuery({
    queryKey: ['redviva', 'examen', (skill ?? '').toLowerCase()],
    enabled: !!skill,
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<ExamenDisponible> => {
      const termino = String(skill ?? '').trim();
      if (!termino) return { nodeId: null, titulo: null };

      const exacto = await supabase
        .from('skill_tree_nodes')
        .select('id, title')
        .ilike('title', termino)
        .limit(1)
        .maybeSingle();

      if (exacto.data?.id) {
        return { nodeId: String(exacto.data.id), titulo: String(exacto.data.title) };
      }

      const parcial = await supabase
        .from('skill_tree_nodes')
        .select('id, title')
        .ilike('title', `%${termino}%`)
        .limit(1)
        .maybeSingle();

      if (parcial.data?.id) {
        return { nodeId: String(parcial.data.id), titulo: String(parcial.data.title) };
      }

      return { nodeId: null, titulo: null };
    },
  });
}
