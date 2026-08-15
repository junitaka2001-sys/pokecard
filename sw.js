const CACHE_NAME = 'pokecard-v1.1.0';
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
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
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

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        // オフライン時のフォールバック
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
