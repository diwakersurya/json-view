// Keeps a copy of the page's own files so it opens offline. The network is tried first,
// so a new deploy shows up on the next load; the copy is only the fallback.
const CACHE = 'json-view-1';
// Query and fragment are dropped from the cache key: every URL is the same page, and
// JSON handed over in a link's fragment must not be written to storage.
const key = url => url.split(/[?#]/)[0];

self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(['./', 'game.js'])).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const { method, url } = e.request;
  if (method !== 'GET' || new URL(url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(
    r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(key(url), copy)); }
      return r;
    },
    () => caches.match(key(url)).then(r => r ?? Response.error())));
});
