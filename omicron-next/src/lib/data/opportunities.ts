import { createClient } from "@/lib/supabase/server";
import { mockOpportunities } from "@/lib/mock-data";
import type { Database } from "@/lib/supabase/database.types";
import type { Opportunity, OpportunityType } from "@/types";

type OpportunityRow = Database["public"]["Tables"]["opportunities"]["Row"];

/** Mapea una fila de Supabase al tipo de dominio. */
function mapRow(row: OpportunityRow): Opportunity {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as OpportunityType,
    rewardXp: row.reward_xp,
    reward: row.reward ?? undefined,
    match: row.match,
    tags: row.tags ?? [],
    company: row.company,
    commitment: row.commitment,
    location: row.location,
    deadline: row.deadline,
    requirements: row.requirements ?? [],
    level: row.level as Opportunity["level"],
  };
}

/**
 * Obtiene todas las oportunidades. Usa Supabase si esta configurado;
 * de lo contrario, devuelve datos mock.
 */
export async function getOpportunities(): Promise<Opportunity[]> {
  const supabase = createClient();
  if (!supabase) return mockOpportunities;

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("match", { ascending: false });

  if (error || !data) return mockOpportunities;
  return data.map(mapRow);
}

/** Obtiene una oportunidad por id, o `null` si no existe. */
export async function getOpportunityById(
  id: string,
): Promise<Opportunity | null> {
  const supabase = createClient();
  if (!supabase) {
    return mockOpportunities.find((o) => o.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return mockOpportunities.find((o) => o.id === id) ?? null;
  }
  return mapRow(data);
}
