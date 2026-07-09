import { mockRanking } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { RankingEntry } from "@/types";

type RankingRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "name" | "handle" | "avatar_url" | "node" | "experience"
>;

/**
 * Obtiene el ranking (leaderboard) de nodos ordenado por experiencia.
 * Usa Supabase si esta configurado; de lo contrario, datos mock.
 */
export async function getRanking(): Promise<RankingEntry[]> {
  const supabase = createClient();
  if (!supabase) return mockRanking;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, handle, avatar_url, node, experience")
    .order("experience", { ascending: false })
    .limit(50)
    .returns<RankingRow[]>();

  if (error || !data) return mockRanking;

  return data.map((row, i) => ({
    position: i + 1,
    user: {
      id: row.id,
      name: row.name,
      handle: row.handle,
      avatarUrl: row.avatar_url,
    },
    node: row.node,
    nodeName: `Nodo ${row.node}`,
    experience: row.experience,
    delta: 0,
  }));
}
