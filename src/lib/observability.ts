// src/lib/observability.ts
// Observabilidad de producción, activada por variables de entorno (sin
// dependencias nuevas: se cargan por CDN solo si hay configuración).
//   - VITE_SENTRY_DSN        → monitoreo de errores (Sentry)
//   - VITE_ANALYTICS_DOMAIN  → analítica de producto (Plausible, respetuosa de privacidad)
// Si no hay env vars, no se carga nada (cero impacto en desarrollo/local).

interface SentryGlobal {
  init?: (opts: Record<string, unknown>) => void;
  captureException?: (err: unknown, hint?: Record<string, unknown>) => void;
}
function sentry(): SentryGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Sentry?: SentryGlobal }).Sentry;
}

function loadScript(src: string, onload?: () => void): void {
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  s.crossOrigin = 'anonymous';
  if (onload) s.onload = onload;
  document.head.appendChild(s);
}

/** Inicializa Sentry + analítica si hay variables de entorno. Llamar una vez al arranque. */
export function initObservability(): void {
  if (typeof window === 'undefined') return;

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn) {
    loadScript('https://browser.sentry-cdn.com/7.120.3/bundle.min.js', () => {
      sentry()?.init?.({
        dsn,
        environment: import.meta.env.PROD ? 'production' : 'development',
        tracesSampleRate: 0.1,
        // Ignora ruido común de extensiones/red.
        ignoreErrors: ['ResizeObserver loop', 'Non-Error promise rejection'],
      });
    });
  }

  const domain = import.meta.env.VITE_ANALYTICS_DOMAIN as string | undefined;
  if (domain) {
    const s = document.createElement('script');
    s.defer = true;
    s.setAttribute('data-domain', domain);
    s.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(s);
  }
}

/** Reporta un error a Sentry (si está activo). Nunca lanza. */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  try {
    const s = sentry();
    if (s?.captureException) {
      s.captureException(err, context ? { extra: context } : undefined);
    } else if (import.meta.env.DEV) {
      console.error('[observability]', err, context ?? '');
    }
  } catch {
    /* la observabilidad nunca debe romper la app */
  }
}
