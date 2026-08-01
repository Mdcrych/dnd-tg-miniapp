const CACHE_VERSION = 'cp-builder-v8';
const ASSETS = [
  '/dnd-tg-miniapp/',
  '/dnd-tg-miniapp/index.html',
  '/dnd-tg-miniapp/app.js',
  '/dnd-tg-miniapp/style.css',
  '/dnd-tg-miniapp/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;

  // Network-first для navigate (новый заход) — обновляет кэш
  // Если страница уже открыта, браузер не шлёт navigate, поэтому обновление не мешает
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Stale-while-revalidate для JS/CSS: отдаём кэш мгновенно, обновляем в фоне
  e.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      cache.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => null);
        return cached || fetchPromise;
      })
    )
  );
});
