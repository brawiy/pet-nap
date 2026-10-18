const CACHE = 'pet-nap-v2';
const ASSETS = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'src/app.js', 'src/logic.js',
  'assets/bg-light.png', 'assets/bg-dark.png',
  'assets/logo-light.png', 'assets/logo-dark.png',
  'assets/pet-goose.png', 'assets/pet-mouse.png', 'assets/pet-capy.png',
  'assets/icons/apple-touch-icon.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// stale-while-revalidate: мгновенно из кэша, в фоне обновляем (работает и без сети)
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const key = new Request(url.origin + url.pathname);
  e.respondWith(
    caches.match(key).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(key, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
