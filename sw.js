const CACHE_NAME = 'pokecard-v1.1.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/storage.js',
  './js/stamp.js',
  './js/qr.js',
  './js/jsQR.min.js',
  './manifest.json',
  './images/icons/app-icon.svg',
  './images/icons/stamp-red.svg',
  './images/icons/stamp-empty.svg',
  './images/icons/logo-ball.svg',
  './images/icons/watermark-ball.svg',
  './images/icons/eevee.svg',
  './images/rewards/movie.svg',
  './images/rewards/yakiniku.svg',
  './images/rewards/aquarium.svg',
  './images/rewards/disney.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network First（オンライン時は常に最新を取得、オフライン時はキャッシュ）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 成功したレスポンスをキャッシュに保存して返す
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // オフライン時のフォールバック
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
