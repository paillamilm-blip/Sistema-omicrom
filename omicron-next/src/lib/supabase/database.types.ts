/**
 * Tipos generados de la base de datos de Supabase.
 *
 * En un proyecto real, este archivo se genera con:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 *
 * Aqui se define un esquema minimo que refleja las entidades de dominio,
 * suficiente para tipar los clientes mientras se conecta el backend.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          handle: string;
          avatar_url: string;
          role: string;
          location: string;
          bio: string;
          joined_at: string;
          streak: number;
          experience: number;
          node: number;
        };
        Insert: {
          id?: string;
          name: string;
          handle: string;
          avatar_url?: string;
          role?: string;
          location?: string;
          bio?: string;
          joined_at?: string;
          streak?: number;
          experience?: number;
          node?: number;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      opportunities: {
        Row: {
          id: string;
          title: string;
          description: string;
          type: string;
          reward_xp: number;
          reward: number | null;
          match: number;
          tags: string[];
          company: string;
          commitment: string;
          location: string;
          deadline: string;
          requirements: string[];
          level: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          type: string;
          reward_xp: number;
          reward?: number | null;
          match?: number;
          tags?: string[];
          company: string;
          commitment: string;
          location: string;
          deadline: string;
          requirements?: string[];
          level: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["opportunities"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
