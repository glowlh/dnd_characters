'use strict';

// This line is maintained by node build-pwa.cjs.
const RELEASE = {"version":"b73c83054a6b3e93","files":["assets/D12.svg","assets/aelt-profile.png","assets/favicon.ico","assets/fonts/CormorantSC-SemiBold.ttf","assets/icon-192.png","assets/icon-512.png","assets/naestriel-profile.png","assets/nettlin-profile.png","assets/party-icon.svg","assets/quiz-icon.svg","assets/vega-profile.png","character-generator.html","character-sheets/aelt/character.json","character-sheets/aelt/index.html","character-sheets/aelt/level-2.html","character-sheets/naestriel/character.json","character-sheets/naestriel/index.html","character-sheets/naestriel/level-2.html","character-sheets/nettlin/character.json","character-sheets/nettlin/index.html","character-sheets/nettlin/level-2.html","character-sheets/sheet-engine.js","character-sheets/sheet-ui.js","character-sheets/styles.css","character-sheets/theme.js","character-sheets/vega/character.json","character-sheets/vega/index.html","character-sheets/vega/level-2.html","class-quiz.html","index.html","manifest.webmanifest","party.html","pwa.js"]};
const scope = self.registration.scope;
const cachePrefix = 'dnd-character-sheets:' + scope + ':';
const cacheName = cachePrefix + RELEASE.version;
const files = new Set(RELEASE.files.map(file => new URL(file, scope).href));

self.addEventListener('install', event => {
  event.waitUntil(refreshCache());
});

async function refreshCache() {
  const cache = await caches.open(cacheName);
  await cache.addAll([...files].map(url => new Request(url, {cache: 'reload'})));
}

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
  if (event.data?.type === 'REFRESH_CACHE' && event.ports[0]) {
    const port = event.ports[0];
    event.waitUntil(refreshCache().then(
      () => port.postMessage({ok: true}),
      () => port.postMessage({ok: false})
    ));
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.href.startsWith(scope)) return;
  url.search = '';
  if (url.pathname.endsWith('/')) url.pathname += 'index.html';
  if (!files.has(url.href)) return;

  event.respondWith((async () => {
    let response;
    try {
      response = await fetch(event.request, {cache: 'no-cache'});
      if (response.status < 500) return response;
    } catch {
      // The release cache remains available without a connection.
    }
    return (await caches.match(url.href, {cacheName})) || response || Response.error();
  })());
});
