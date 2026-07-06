/* GoodSeed service worker — offline-first app shell with runtime caching.
 * v2: the site is split into a static landing page (/index.html) and the app
 * shell (/app.html); offline navigations fall back to the right one. */
const CACHE = 'goodseed-v2'
const APP_SHELL = ['/', '/index.html', '/app.html', '/seedling.svg', '/icon.svg', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  // Navigations: network first, fall back to the cached shell — the landing
  // page for "/", the app shell for everything else (deep links offline).
  if (request.mode === 'navigate') {
    const path = new URL(request.url).pathname
    const fallback = path === '/' || path === '/index.html' ? '/index.html' : '/app.html'
    event.respondWith(fetch(request).catch(() => caches.match(fallback)))
    return
  }

  // Static assets: cache first, then network (and cache the result for next time).
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
    )
  )
})
