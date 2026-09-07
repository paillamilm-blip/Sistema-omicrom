// features/redviva/hooks/useRedViva.ts
// Cablea la Red Viva con los datos REALES: tu perfil, tus pruebas registradas,
// los empleos publicados y el saldo del Fondo de Conocimiento.
//
// DEGRADACIÓN ELEGANTE (requisito, no lujo): la tabla omicron_skill_proofs y el
// RPC omicron_fund_quote llegan en la migración 10001, que se aplica a mano con
// `supabase db push`. Mientras no esté aplicada, esta capa NO rompe la app:
//   • sin tabla de pruebas → todas las habilidades quedan como DECLARADAS y se
//     expone pruebasDisponibles=false para que la UI no prometa "probado".
//   • sin saldo del Fondo   → fondoSaldo=null y la UI dice que no lo pudo leer,
//     en vez de mostrar 0 (que significaría "el Fondo está vacío", otra cosa).
// Ese es el criterio de siempre: preferir decir "no lo sé" antes que inventar.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { queryKeys } from '@/infrastructure/query/keys';
import { useApp } from '@/store/AppContext';
import { useJobsQuery } from '@/features/empleos/hooks/useJobsQuery';
import { buildRedViva, type RedVivaModel, type SkillProof } from '../services/redViva';
import type { RealJob } from '../services/gapEngine';

/** Marcador de "la migración 10001 todavía no está aplicada en esta base". */
const SIN_TABLA = Symbol('sin-tabla-de-pruebas');
type ProofsResult = SkillProof[] | typeof SIN_TABLA;

// Constantes estables para los casos vacíos. Si acá se escribiera `?? []`, cada
// render crearía un array NUEVO, las dependencias del useMemo cambiarían siempre y
// la red se reconstruiría en cada render (ESLint lo marca con react-hooks/
// exhaustive-deps). Con una referencia fija, el useMemo sirve de verdad.
const SIN_PRUEBAS: SkillProof[] = [];
const SIN_EMPLEOS: RealJob[] = [];

export interface RedVivaState {
  model: RedVivaModel;
  isLoading: boolean;
  /** Saldo del Fondo en tokens. null = no se pudo leer (≠ 0, que es "vacío"). */
  fondoSaldo: number | null;
  /** false = la migración 10001 no está aplicada: no se puede saber qué probaste. */
  pruebasDisponibles: boolean;
  /** true = hay empleos publicados contra los que medir la brecha. */
  hayMercado: boolean;
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
        .select('skill_key, skill_label, best_score, proofs_count, tokens_earned, last_proven_at')
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

/**
 * Saldo del Fondo de Conocimiento. Existe desde el PR #391 y hasta ahora ningún
 * archivo del front lo llamaba: el Fondo era real pero invisible.
 */
function useFondoSaldo(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.redviva.fondo(),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await supabase.rpc('omicron_fund_balance');
      if (error) {
        console.info('[Omicron] No se pudo leer el saldo del Fondo:', error.message);
        return null;
      }
      const n = Number(data);
      return Number.isFinite(n) ? n : null;
    },
  });
}

export function useRedViva(): RedVivaState {
  const { profile } = useApp();
  const userId = profile?.id;

  // Solo empleos ABIERTOS: no se mide una brecha contra un empleo cerrado.
  const jobsQuery = useJobsQuery({ status: 'OPEN', limit: 60 });
  const proofsQuery = useSkillProofs(userId);
  const fondoQuery = useFondoSaldo(!!userId);

  const proofsData = proofsQuery.data;
  const pruebasDisponibles = proofsData !== SIN_TABLA && proofsData !== undefined;

  const proofs = useMemo<SkillProof[]>(
    () => (Array.isArray(proofsData) ? proofsData : SIN_PRUEBAS),
    [proofsData],
  );

  const jobs = useMemo<RealJob[]>(
    () => (jobsQuery.data ?? SIN_EMPLEOS) as unknown as RealJob[],
    [jobsQuery.data],
  );

  const model = useMemo(
    () =>
      buildRedViva({
        skillsDetail: profile?.skills_detail ?? null,
        skills: profile?.skills ?? null,
        proofs,
        jobs,
      }),
    // Todas las dependencias son referencias estables: profile viene memorizado
    // del contexto, y proofs/jobs están memorizados arriba.
    [profile?.skills_detail, profile?.skills, proofs, jobs],
  );

  return {
    model,
    isLoading: jobsQuery.isLoading || proofsQuery.isLoading,
    fondoSaldo: fondoQuery.data ?? null,
    pruebasDisponibles,
    hayMercado: jobs.length > 0,
  };
}
