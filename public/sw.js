// Bump this on every shell change. Hashed Vite assets can stay cache-first;
// navigations must check the network so an installed app cannot be pinned to
// an old shell forever.
const CACHE = 'gpu-vram-burnin-v3';
const CACHE_PREFIX = 'gpu-vram-burnin-';

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

self.addEventListener('activate', event => event.waitUntil((async () => {
  await Promise.all((await caches.keys())
    .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE)
    .map(name => caches.delete(name)));
  await self.clients.claim();
})()));

self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  const networkFirst = event.request.mode === 'navigate';
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    const network = async () => {
      const response = await fetch(event.request);
      if (response.ok) await caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
      return response;
    };
    if (networkFirst) {
      try { return await network(); }
      catch { return cached || caches.match('/') || Response.error(); }
    }
    if (cached) return cached;
    try { return await network(); }
    catch { return Response.error(); }
  })());
});
