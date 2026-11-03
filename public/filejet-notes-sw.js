const CACHE = 'filejet-offline-shell-v1'
const ASSETS = ['/offline-notes.html', '/filejet-offline/store.js', '/filejet-offline/editor.js', '/filejet-offline/style.css']
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())))
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('filejet-offline-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())))
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url)
    if (url.origin !== self.location.origin || event.request.method !== 'GET') return
    // Cache only public editor assets, never authenticated HTML, APIs or files.
    if (ASSETS.includes(url.pathname)) event.respondWith(caches.match(url.pathname).then(cached => cached || fetch(event.request)))
    else if (event.request.mode === 'navigate' && /^\/notes(?:\/[^/]+)?\/?$/.test(url.pathname)) event.respondWith(fetch(event.request).catch(() => caches.match('/offline-notes.html')))
})
