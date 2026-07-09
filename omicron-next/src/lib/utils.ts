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
