import type { Metadata } from "next";

import { SkillMap } from "@/components/dashboard/skill-map";
import { PageHeader } from "@/components/layout/page-header";
import { AchievementsGrid } from "@/components/profile/achievements-grid";
import { NodeProgression } from "@/components/profile/node-progression";
import { ProfileHeader } from "@/components/profile/profile-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDashboardData } from "@/lib/data/dashboard";
import { getAchievements, getNodeProgression } from "@/lib/data/profile";

export const metadata: Metadata = {
  title: "Perfil",
};

export default async function ProfilePage() {
  const [{ user, node, skills }, achievements] = await Promise.all([
    getDashboardData(),
    getAchievements(),
  ]);
  const nodes = getNodeProgression();

  return (
    <div className="space-y-6">
      <PageHeader title="Mi perfil" />

      <ProfileHeader user={user} node={node} />

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="insignias">Insignias</TabsTrigger>
          <TabsTrigger value="progresion">Progresión</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen">
          <div className="grid gap-6 lg:grid-cols-2">
            <SkillMap skills={skills} />
            <AchievementsGrid achievements={achievements} />
          </div>
        </TabsContent>

        <TabsContent value="insignias">
          <AchievementsGrid achievements={achievements} />
        </TabsContent>

        <TabsContent value="progresion">
          <NodeProgression
            nodes={nodes}
            currentIndex={node.current}
            experience={node.experience}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
