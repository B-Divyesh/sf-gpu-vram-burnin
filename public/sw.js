const CACHE = 'gpu-vram-burnin-v2';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const shell = await fetch('/');
    const text = await shell.clone().text();
    const assets = [...text.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]);
    await cache.put('/', shell);
    await cache.addAll(['/demo', '/privacy', '/terms', '/404.html', ...assets]);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => {
    const network = fetch(event.request).then(async response => {
      if (response.ok) await caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => cached || (event.request.mode === 'navigate' ? caches.match('/demo') : Response.error()));
    return cached || network;
  }));
});
