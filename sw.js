const CACHE = 'deporzone-v2';
const ASSETS = [
  './', './index.html', './styles.css', './script.js', './manifest.json',
  './img/vol/A.jpeg', './img/vol/B.jpeg', './img/vol/C.jpeg', './img/vol/CANCHA.jpeg',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
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
