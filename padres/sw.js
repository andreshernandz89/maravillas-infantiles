/* Service worker de la Consulta para Padres (PWA instalable).
   Conservador a propósito: la red manda siempre para la página y los datos;
   la caché solo guarda los íconos/manifiesto y sirve de respaldo sin conexión. */
const CACHE = 'padres-pwa-v2';
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

/* ---------- Notificaciones push (Web Push) ---------- */
self.addEventListener('push', e => {
  const d = { title: 'Maravillas Infantiles', body: 'Tienes un aviso nuevo de tu colegio.', url: '/padres/' };
  try {
    if (e.data) Object.assign(d, e.data.json());
  } catch (_) {
    if (e.data) d.body = e.data.text();
  }
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: d.url || '/padres/' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/padres/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
      for (const w of ws) {
        if (w.url.includes('/padres') && 'focus' in w) {
          if (w.navigate) w.navigate(url).catch(() => {});
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
