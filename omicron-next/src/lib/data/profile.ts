import {
  mockAchievements,
  mockSkills,
  mockUser,
  nodeProgression,
} from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Achievement, NodeDefinition, Skill, UserProfile } from "@/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/** Perfil del usuario actual. */
export async function getProfile(): Promise<UserProfile> {
  const supabase = createClient();
  if (!supabase) return mockUser;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return mockUser;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error || !data) return mockUser;

  return {
    id: data.id,
    name: data.name,
    handle: data.handle,
    avatarUrl: data.avatar_url,
    role: data.role,
    location: data.location,
    bio: data.bio,
    joinedAt: data.joined_at,
    streak: data.streak,
  };
}

export async function getSkills(): Promise<Skill[]> {
  // Placeholder: se conectaria a una tabla de skills.
  return mockSkills;
}

export async function getAchievements(): Promise<Achievement[]> {
  return mockAchievements;
}

export function getNodeProgression(): NodeDefinition[] {
  return nodeProgression;
}
