/* Canvasly's offline app shell. Projects are stored separately in IndexedDB. */
const VERSION = 'canvasly-shell-v3'
const SHELL = ['/', '/index.html', '/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

async function cacheAppShell() {
  const cache = await caches.open(VERSION)
  await cache.addAll(SHELL)

  // Vite gives production assets content-hashed names. Read index.html at install time
  // so the exact JavaScript and CSS files for this release are available offline too.
  const indexResponse = await fetch('/index.html', { cache: 'no-cache' })
  if (!indexResponse.ok) return
  const html = await indexResponse.clone().text()
  await cache.put('/index.html', indexResponse)
  const assets = [...html.matchAll(/(?:src|href)="([^"#?]+)"/g)]
    .map((match) => match[1])
    .filter((asset) => asset.startsWith('/assets/'))
  await Promise.all(assets.map((asset) => cache.add(asset)))
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('canvasly-') && key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(VERSION).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/offline.html'))),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(VERSION).then((cache) => cache.put(event.request, response.clone()))
          return response
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
