'use strict';

// This line is maintained by node build-pwa.cjs.
const RELEASE = {"version":"ab011248c811f55c","files":["assets/favicon.ico","assets/icon-192.png","assets/icon-512.png","character-sheets/aelt/index.html","character-sheets/aelt/level-2.html","character-sheets/naestriel/index.html","character-sheets/naestriel/level-2.html","character-sheets/sheet-engine.js","character-sheets/sheet-ui.js","character-sheets/styles.css","character-sheets/theme.js","character-sheets/vega/index.html","character-sheets/vega/level-2.html","index.html","manifest.webmanifest","party.html","pwa.js"]};
const scope = self.registration.scope;
const cachePrefix = 'dnd-character-sheets:' + scope + ':';
const cacheName = cachePrefix + RELEASE.version;
const files = new Set(RELEASE.files.map(file => new URL(file, scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([...files].map(url => new Request(url, {cache: 'reload'})));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(cachePrefix) && name !== cacheName)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'APPLY_UPDATE') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.href.startsWith(scope)) return;
  url.search = '';
  if (url.pathname.endsWith('/')) url.pathname += 'index.html';
  if (!files.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return (await cache.match(url.href)) || fetch(event.request);
  })());
});
