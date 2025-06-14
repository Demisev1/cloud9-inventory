self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('cloud9-cache').then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './style.css',
        './script.js',
        './manifest.json',
        './icon-192.png',
        './icon-512.png',
        'https://cdn.jsdelivr.net/npm/papaparse@5.3.1/papaparse.min.js'
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
