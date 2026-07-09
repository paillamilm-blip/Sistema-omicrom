// Service Worker · Sistema Ómicron
// Estrategia NETWORK-FIRST: siempre intenta traer la versión más reciente
// (clave durante la beta para no servir builds viejos) y solo cae al cache
// cuando no hay red. Esto da instalabilidad PWA + resiliencia offline básica
// sin el riesgo de contenido obsoleto.

const CACHE = 'omicron-v2';
const SHELL = ['/', '/index.html', '/icon.svg', '/manifest.webmanifest', '/og-image.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo GET y mismo origen; nunca interceptamos llamadas a Supabase/API.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Guarda copia fresca en cache para uso offline.
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('/index.html'))
      )
  );
});
