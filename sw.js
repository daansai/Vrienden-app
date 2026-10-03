// Service worker: het spel werkt ook zonder internet nadat je het één keer hebt geopend.
const CACHE = 'vrienden-run-v7';
const ASSETS = ['./', 'index.html', 'style.css', 'character.js', 'game.js', 'manifest.webmanifest',
  'icons/icon-32.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const same = new URL(req.url).origin === self.location.origin;
  if (same) { // eerst uit de opslag (snel), ondertussen vernieuwen voor de volgende keer
    e.respondWith(caches.open(CACHE).then(cache => cache.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  } else { // lettertypen: netwerk, anders opslag
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }).catch(() => caches.match(req)));
  }
});
