// Sky Buddy service worker: makes the app installable and lets it open offline.
// Live data (flights, ISS orbit, the /api relay) always goes to the network.
const VERSION = 'skybuddy-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
  'https://cdn.jsdelivr.net/npm/satellite.js@5.0.0/dist/satellite.min.js'
];
const LIB_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  // Cache each file on its own so one unreachable CDN file cannot block installing.
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(SHELL.map(u => c.add(u).catch(err => console.warn('SW cache skip', u, err)))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The page itself: network first so updates show up, cache when offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req)
      .then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }

  // App files and libraries: serve from cache, refresh in the background.
  const sameOriginStatic = url.origin === location.origin && !url.pathname.includes('/api/');
  if (sameOriginStatic || LIB_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
  // Everything else (flight feeds, ISS data, map tiles) is left to the network.
});
