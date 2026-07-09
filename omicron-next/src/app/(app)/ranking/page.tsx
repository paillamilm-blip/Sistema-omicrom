import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Leaderboard } from "@/components/ranking/leaderboard";
import { Badge } from "@/components/ui/badge";
import { getRanking } from "@/lib/data/ranking";

export const metadata: Metadata = {
  title: "Ranking",
};

export default async function RankingPage() {
  const entries = await getRanking();
  const me = entries.find((e) => e.isCurrentUser);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ranking de nodos"
        description="Los miembros con mayor experiencia de la comunidad Omicron."
      >
        {me && (
          <Badge variant="gradient" className="text-sm">
            Tu posición: #{me.position}
          </Badge>
        )}
      </PageHeader>

      <Leaderboard entries={entries} />
    </div>
  );
}
