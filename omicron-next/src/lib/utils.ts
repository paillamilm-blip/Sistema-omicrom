import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Une clases de Tailwind de forma segura, resolviendo conflictos.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un número como moneda (por defecto USD, locale es-CL configurable).
 */
export function formatCurrency(
  value: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formatea un número grande con separadores de miles.
 */
export function formatNumber(value: number, locale: string = "en-US"): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Formatea una fecha ISO a un formato legible (ej: "8 jul 2026").
 */
export function formatDate(iso: string, locale: string = "es-CL"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * Devuelve una cadena relativa aproximada respecto a ahora (ej: "hace 2 h").
 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `hace ${weeks} sem`;
  const months = Math.round(days / 30);
  return `hace ${months} mes${months > 1 ? "es" : ""}`;
}
