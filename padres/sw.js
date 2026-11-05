/* Service worker de la Consulta para Padres (PWA instalable).
   Conservador a propósito: la red manda siempre para la página y los datos;
   la caché solo guarda los íconos/manifiesto y sirve de respaldo sin conexión. */
const CACHE = 'padres-pwa-v1';
const ESTATICOS = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ESTATICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // envíos (documentos, solicitudes) siempre directos
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase y librerías externas: sin tocar
  if (req.mode === 'navigate') {
    // Red primero; la copia en caché solo aparece si no hay conexión.
    e.respondWith(
      fetch(req)
        .then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put('/padres/', copia)); return r; })
        .catch(() => caches.match('/padres/'))
    );
    return;
  }
  if (ESTATICOS.some(f => url.pathname.endsWith('/' + f))) {
    e.respondWith(caches.match(req).then(m => m || fetch(req)));
  }
});
