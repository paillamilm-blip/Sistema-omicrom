import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string };
}) {
  return (
    <Card className="border-border/60 glass">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Bienvenido de vuelta</CardTitle>
        <p className="text-sm text-muted-foreground">
          Inicia sesión para continuar tu progreso.
        </p>
      </CardHeader>
      <CardContent>
        <AuthForm mode="login" redirectTo={searchParams.redirectTo} />
        {!isSupabaseConfigured() && (
          <p className="mt-4 rounded-md bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
            Modo demo: sin Supabase configurado, cualquier acceso entra directo
            al dashboard.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
