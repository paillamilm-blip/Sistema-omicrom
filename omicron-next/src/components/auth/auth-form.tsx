"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type AuthState, signIn, signUp } from "@/lib/auth/actions";

interface AuthFormProps {
  mode: "login" | "signup";
  redirectTo?: string;
}

const initialState: AuthState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="gradient"
      className="w-full"
      disabled={pending}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const isLogin = mode === "login";
  const action = isLogin ? signIn : signUp;
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {!isLogin && (
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Nombre
          </label>
          <Input id="name" name="name" placeholder="Tu nombre" required />
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Contraseña
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
        />
      </div>

      {isLogin && redirectTo && (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      )}

      {state.error && (
        <p className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      {state.message && (
        <p className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {state.message}
        </p>
      )}

      <SubmitButton label={isLogin ? "Iniciar sesión" : "Crear cuenta"} />

      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? (
          <>
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="text-primary hover:underline">
              Regístrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Inicia sesión
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
