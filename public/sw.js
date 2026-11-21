/* WireWise service worker: caches the app shell and every same-origin file it fetches so the app opens offline.
   No project data is ever sent anywhere: the worker only answers GET requests for this origin from the cache. */
// The deploy workflow appends the commit to this name, so every release installs a fresh worker
// and the activate handler below drops the previous release's cache.
const CACHE = 'wirewise-shell-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts and other origins go to the network as usual
  // Pages: try the network first so a new version is picked up, fall back to the cached shell offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }
  // Hashed build files (assets/) never change under the same name: cache first.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }
  // Files that keep their name between releases (icon.svg, manifest): answer from the cache for speed,
  // but always refresh it from the network so a new logo or manifest shows up on the next visit.
  event.respondWith(
    caches.match(req).then((hit) => {
      const update = fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
      if (hit) {
        update.catch(() => {}); // offline: keep serving the cached copy
        return hit;
      }
      return update;
    })
  );
});
