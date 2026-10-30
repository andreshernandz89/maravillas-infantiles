/* Maravillas Infantiles — Service Worker (PlataformaEDU: modo instalable + trabajo sin conexión)
   La interfaz se guarda en caché para abrir sin internet; los datos siguen
   viviendo en Firebase/localStorage y se sincronizan al volver la conexión. */
const CACHE = 'cemi-plataforma-v2';
const BASE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', '../escudo.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(BASE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase y demás: siempre red
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    // La página: red primero (código fresco), caché si no hay conexión
    e.respondWith(fetch(req).then(function (r) {
      const copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put('./index.html', copia); });
      return r;
    }).catch(function () { return caches.match('./index.html'); }));
    return;
  }
  // Recursos propios (imágenes, manifest): caché primero
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (r) {
      const copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copia); });
      return r;
    });
  }));
});
