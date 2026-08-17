// src/lib/pushNotifications.ts
// ═══════════════════════════════════════════════════════════════════════
// WEB PUSH NOTIFICATIONS — Suscripción y gestión de permisos.
// Usa Web Push API (VAPID) — funciona en Chrome, Edge, Firefox, Safari 16+.
// No necesita app nativa. El SW ya está instalado.
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from '@/infrastructure/supabase/client';

// VAPID public key — se genera con: npx web-push generate-vapid-keys
// Esta key va en variables de entorno para producción
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

/** Estado del permiso de push */
export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

/** Verifica si Web Push está soportado */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

/** Obtiene el estado actual del permiso */
export function getPushPermission(): PushPermission {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission as PushPermission;
}

/** Convierte urlBase64 a Uint8Array (necesario para VAPID) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Solicita permiso y suscribe al usuario a push notifications.
 * Guarda la subscription en Supabase para enviar pushes server-side.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[push] VAPID_PUBLIC_KEY no configurada');
    return false;
  }

  try {
    // 1. Pedir permiso
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    // 2. Obtener registration del SW
    const registration = await navigator.serviceWorker.ready;

    // 3. Suscribir
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });

    // 4. Guardar en Supabase
    const subJson = subscription.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh ?? '',
      auth: subJson.keys?.auth ?? '',
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,endpoint' });

    if (error) {
      console.error('[push] Error guardando subscription:', error.message);
      return false;
    }

    return true;
  } catch (e) {
    console.error('[push] Error al suscribir:', e);
    return false;
  }
}

/**
 * Desuscribir de push notifications.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await supabase.from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
    }
  } catch (e) {
    console.error('[push] Error al desuscribir:', e);
  }
}

/**
 * Verifica si ya está suscrito.
 */
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
