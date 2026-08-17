// src/lib/guestMode.ts
// ═══════════════════════════════════════════════════════════════════════
// GUEST MODE — Helpers para el modo invitado (sin auth).
// El usuario puede ver el orbe, hacer onboarding, ver empleos y ranking
// sin registrarse. Auth se pide solo cuando quiere guardar/persistir.
// ═══════════════════════════════════════════════════════════════════════

const GUEST_PROFILE_KEY = 'omicron_guest_profile';

export interface GuestProfile {
  profession: string;
  years: number;
  skills: string[];
  axes: { exec: number; qual: number; trans: number; fund: number };
  seniorLabel: string;
  summary: string;
  createdAt: string;
}

/** Guarda perfil guest en localStorage */
export function saveGuestProfile(profile: GuestProfile): void {
  try { localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile)); } catch { /* full/private */ }
}

/** Lee perfil guest desde localStorage */
export function getGuestProfile(): GuestProfile | null {
  try {
    const raw = localStorage.getItem(GUEST_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

/** Borra perfil guest (al registrarse, migrar a Supabase) */
export function clearGuestProfile(): void {
  try { localStorage.removeItem(GUEST_PROFILE_KEY); } catch { /* noop */ }
}

/** ¿Tiene perfil guest guardado? */
export function hasGuestProfile(): boolean {
  try { return !!localStorage.getItem(GUEST_PROFILE_KEY); } catch { return false; }
}

/**
 * Acciones que requieren auth (el resto es libre para guests).
 * Retorna true si la acción necesita que el usuario se registre.
 */
export function requiresAuth(action: string): boolean {
  const authActions = [
    'save_profile',
    'apply_job',
    'send_message',
    'connect',
    'follow',
    'publish_service',
    'create_contract',
    'open_dispute',
    'stake',
    'upload_cv',
  ];
  return authActions.includes(action);
}

/**
 * Mensajes amigables para pedir auth según contexto.
 */
export function getAuthPrompt(action: string): string {
  const prompts: Record<string, string> = {
    save_profile: 'Crea tu cuenta para guardar tu perfil y no perderlo.',
    apply_job: 'Regístrate para postular — tu carta IA quedará lista.',
    send_message: 'Crea tu cuenta para enviar mensajes en la red.',
    connect: 'Regístrate para conectar con otros profesionales.',
    follow: 'Crea tu cuenta para seguir a este profesional.',
    publish_service: 'Regístrate para publicar tu servicio en el marketplace.',
    upload_cv: 'Crea tu cuenta para que tu CV quede guardado en la nube.',
  };
  return prompts[action] ?? 'Crea tu cuenta para continuar — es gratis y toma 10 segundos.';
}



/**
 * Dispara el modal de auth desde cualquier componente.
 * Usar cuando un guest intenta una acción que requiere cuenta.
 */
export function requestAuth(): void {
  window.dispatchEvent(new CustomEvent('omicron:request-auth'));
}
