// Kairotec · service worker
// - Abre sem internet (cache como reserva)
// - Busca sempre a versão mais nova quando há rede, então o app se atualiza sozinho
const C = 'kairotec-v2'
const SCOPE = self.registration.scope
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll([SCOPE, SCOPE + 'logo.svg', SCOPE + 'manifest.webmanifest']))) })
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())))
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); return r })
    .catch(() => caches.match(e.request).then(r => r || caches.match(SCOPE))))
})
