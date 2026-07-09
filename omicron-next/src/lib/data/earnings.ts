import { buildMockEarnings } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import type { EarningsDetail } from "@/types";

/**
 * Obtiene el detalle de ganancias del usuario. Con Supabase configurado se
 * compondría desde la tabla `earnings`; por ahora usa datos mock.
 */
export async function getEarnings(): Promise<EarningsDetail> {
  const supabase = createClient();
  if (!supabase) {
    return buildMockEarnings();
  }

  // TODO: agregar por período y fuente desde la tabla `earnings`.
  return buildMockEarnings();
}
