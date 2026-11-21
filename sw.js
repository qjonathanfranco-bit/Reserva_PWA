const CACHE = 'deporzone-v20';
const ASSETS = [
  './', './index.html', './css/styles.css', './js/script.js', './js/supabase.js', './js/carousel-data.js', './js/buscador.js', './manifest.json',
  './img/vol/A.jpeg', './img/vol/B.jpeg', './img/vol/C.jpeg', './img/vol/CANCHA.jpeg',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './img/galeria/wally-01.svg',
  './img/galeria/wally-02.svg',
  './img/galeria/wally-03.svg',
  './img/galeria/wally-04.svg',
  './img/galeria/wally-05.svg',
  './img/galeria/wally-06.svg',
  './img/galeria/wally-07.svg',
  './img/galeria/wally-08.svg',
  './img/galeria/wally-09.svg',
  './img/galeria/wally-10.svg',
  './img/galeria/futsal-01.svg',
  './img/galeria/futsal-02.svg',
  './img/galeria/futsal-03.svg',
  './img/galeria/futsal-04.svg',
  './img/galeria/futsal-05.svg',
  './img/galeria/futsal-06.svg',
  './img/galeria/futsal-07.svg',
  './img/galeria/futsal-08.svg',
  './img/galeria/futsal-09.svg',
  './img/galeria/futsal-10.svg',
  './img/galeria/voley-01.svg',
  './img/galeria/voley-02.svg',
  './img/galeria/voley-03.svg',
  './img/galeria/voley-04.svg',
  './img/galeria/voley-05.svg',
  './img/galeria/voley-06.svg',
  './img/galeria/voley-07.svg',
  './img/galeria/voley-08.svg',
  './img/galeria/voley-09.svg',
  './img/galeria/voley-10.svg',
  'https://code.jquery.com/jquery-3.7.1.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first con actualización en segundo plano; fallback a index.html offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  var u = new URL(e.request.url);
  var h = u.hostname;
  // La API (datos dinámicos: reservas, canchas, etc.) siempre se pide a la red
  if (u.pathname.indexOf('/api/') === 0) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Fotos y APIs del buscador: siempre desde la red (no llenar el caché con respuestas opacas)
  if (h.endsWith('wikimedia.org') || h === 'www.googleapis.com' || h.endsWith('googleusercontent.com') || h.endsWith('gstatic.com') && h.startsWith('encrypted')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const red = fetch(e.request).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return res;
      }).catch(() => cached || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return cached || red;
    })
  );
});
