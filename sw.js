const CACHE = 'lmj-v8';
const ASSETS = ['./', './index.html', './app.js', './style.css', './pages.css', './manifest.webmanifest',
  './i18n/ja.json', './i18n/en.json', './data/events.json', './data/live-events.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Network first so listings stay fresh, cache as offline fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(async () => (await caches.match(e.request, {ignoreSearch: true})) ||
      (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});
