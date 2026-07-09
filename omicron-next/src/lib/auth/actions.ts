"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
}

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

/**
 * Inicia sesión con email y contraseña.
 * En modo demo (sin Supabase) redirige directo al dashboard.
 */
export async function signIn(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = createClient();

  // Modo demo: sin backend, entramos directo.
  if (!supabase) {
    redirect("/dashboard");
  }

  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Ingresa tu email y contraseña." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Credenciales inválidas. Inténtalo de nuevo." };
  }

  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");
  revalidatePath("/", "layout");
  redirect(redirectTo || "/dashboard");
}

/** Registra un nuevo usuario. */
export async function signUp(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = createClient();

  if (!supabase) {
    redirect("/dashboard");
  }

  const { email, password } = readCredentials(formData);
  const name = String(formData.get("name") ?? "").trim();

  if (!name || !email || !password) {
    return { error: "Completa todos los campos." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) {
    return { error: "No pudimos crear tu cuenta. Inténtalo de nuevo." };
  }

  return {
    message:
      "¡Cuenta creada! Revisa tu correo para confirmar y luego inicia sesión.",
  };
}

/** Cierra la sesión y vuelve a /login. */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
