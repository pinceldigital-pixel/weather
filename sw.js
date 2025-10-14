const CACHE = 'clima-upload-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Cache-first for same-origin assets; network-first for API calls
  if (url.origin === location.origin) {
    e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
  } else {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  }
});
