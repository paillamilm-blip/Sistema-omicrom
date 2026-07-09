import { buildMockDashboard } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import type { DashboardData } from "@/types";

/**
 * Obtiene los datos del dashboard. Si Supabase esta configurado, aqui se
 * compondrian las distintas consultas; mientras tanto se usan datos mock.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createClient();
  if (!supabase) {
    return buildMockDashboard();
  }

  // TODO: componer datos reales (profile, skills, earnings, etc.).
  // Por ahora, se retorna mock incluso con Supabase configurado hasta que
  // las tablas correspondientes esten pobladas.
  return buildMockDashboard();
}
