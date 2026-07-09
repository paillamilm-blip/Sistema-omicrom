import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function RegisterPage() {
  return (
    <Card className="border-border/60 glass">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Crea tu cuenta</CardTitle>
        <p className="text-sm text-muted-foreground">
          Empieza a subir de nodo en Omicron.
        </p>
      </CardHeader>
      <CardContent>
        <AuthForm mode="signup" />
        {!isSupabaseConfigured() && (
          <p className="mt-4 rounded-md bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
            Modo demo: sin Supabase configurado, el registro entra directo al
            dashboard.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
