// features/redviva/hooks/useRedViva.ts
// Cablea la Red Viva con los datos REALES: tu perfil y tus pruebas registradas.
//
// DEGRADACIÓN ELEGANTE (requisito, no lujo): la tabla omicron_skill_proofs
// llega en la migración 10001, que se aplica a mano con `supabase db push`.
// Mientras no esté aplicada, esta capa NO rompe la app:
//   • sin tabla de pruebas → todas las habilidades quedan como DECLARADAS y se
//     expone pruebasDisponibles=false para que la UI no prometa "probado".
// Ese es el criterio de siempre: preferir decir "no lo sé" antes que inventar.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { queryKeys } from '@/infrastructure/query/keys';
import { useApp } from '@/store/AppContext';
import { buildRedViva, type RedVivaModel, type SkillProof } from '../services/redViva';

/** Marcador de "la migración 10001 todavía no está aplicada en esta base". */
const SIN_TABLA = Symbol('sin-tabla-de-pruebas');
type ProofsResult = SkillProof[] | typeof SIN_TABLA;

// Constante estable para el caso vacío. Si acá se escribiera `?? []`, cada render
// crearía un array NUEVO, las dependencias del useMemo cambiarían siempre y la
// red se reconstruiría en cada render (ESLint lo marca con react-hooks/
// exhaustive-deps). Con una referencia fija, el useMemo sirve de verdad.
const SIN_PRUEBAS: SkillProof[] = [];

export interface RedVivaState {
  model: RedVivaModel;
  isLoading: boolean;
  /** false = la migración 10001 no está aplicada: no se puede saber qué probaste. */
  pruebasDisponibles: boolean;
}

/**
 * Lee las habilidades DEMOSTRADAS del usuario.
 * No lanza si la tabla no existe todavía: devuelve el marcador SIN_TABLA.
 */
function useSkillProofs(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.redviva.proofs(userId ?? ''),
    enabled: !!userId,
    staleTime: 60 * 1000,
    retry: false, // si la tabla no está, reintentar no la va a crear
    queryFn: async (): Promise<ProofsResult> => {
      const { data, error } = await supabase
        .from('omicron_skill_proofs')
        .select('skill_key, skill_label, best_score, proofs_count, last_proven_at')
        .order('last_proven_at', { ascending: false });

      if (error) {
        // 42P01 = tabla inexistente; PGRST205 = PostgREST no la conoce todavía.
        console.info(
          '[Omicron] Registro de pruebas no disponible todavía (migración 10001 sin aplicar):',
          error.message,
        );
        return SIN_TABLA;
      }
      return (data ?? []) as SkillProof[];
    },
  });
}

export function useRedViva(): RedVivaState {
  const { profile } = useApp();
  const userId = profile?.id;

  const proofsQuery = useSkillProofs(userId);

  const proofsData = proofsQuery.data;
  const pruebasDisponibles = proofsData !== SIN_TABLA && proofsData !== undefined;

  const proofs = useMemo<SkillProof[]>(
    () => (Array.isArray(proofsData) ? proofsData : SIN_PRUEBAS),
    [proofsData],
  );

  const model = useMemo(
    () =>
      buildRedViva({
        skillsDetail: profile?.skills_detail ?? null,
        skills: profile?.skills ?? null,
        proofs,
      }),
    // Todas las dependencias son referencias estables: profile viene memorizado
    // del contexto, y proofs está memorizado arriba.
    [profile?.skills_detail, profile?.skills, proofs],
  );

  return {
    model,
    isLoading: proofsQuery.isLoading,
    pruebasDisponibles,
  };
}
