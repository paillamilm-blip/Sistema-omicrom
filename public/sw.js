// Service Worker · Sistema Ómicron
// Estrategia NETWORK-FIRST: siempre intenta traer la versión más reciente
// (clave durante la beta para no servir builds viejos) y solo cae al cache
// cuando no hay red. Esto da instalabilidad PWA + resiliencia offline básica
// sin el riesgo de contenido obsoleto.

const CACHE = 'omicron-v3';
const SHELL = ['/', '/index.html', '/icon.svg', '/manifest.webmanifest', '/og-image.png'];

self.addEventListener('install', (event) => {
  // NO activamos automáticamente: el SW nuevo queda "esperando" hasta que el
  // usuario toque "Actualizar" (evita romper la sesión en curso). La app
  // detecta este estado y muestra el aviso de nueva versión.
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
});

// La app pide activar la versión nueva cuando el usuario toca "Actualizar".
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
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
