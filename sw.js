// Service Worker — CRM CNA Roma
// BUILD: 1790349526
const CACHE  = 'crm-cna-1790349526';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co') || e.request.url.includes('fonts.')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Network-first per index.html: aggiornamento immediato
  if (e.request.url.endsWith('/') || e.request.url.includes('index.html')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      })
    ).catch(() => caches.match('./index.html'))
  );
});

// ── PUSH ──────────────────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = {
    title: 'CRM CNA Roma',
    body: 'Hai una nuova notifica',
    url: '/',
    icon: '/icon-192.png',
    badge: '/icon-144.png',
    tag: 'crm'
  };
  if (e.data) {
    try { Object.assign(data, e.data.json()); } catch(err) { data.body = e.data.text() || data.body; }
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: { url: data.url },
      vibrate: [200, 100, 200],
      requireInteraction: false,
      // iOS 16.4+: silent: false assicura che la notifica venga mostrata
      silent: false
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) ? e.notification.data.url : '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.postMessage({ type: 'CRM_NAVIGATE', url });
          return c.focus();
        }
      }
      return clients.openWindow(self.location.origin + url);
    })
  );
});

// ── MESSAGGI DA INDEX.HTML ────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (!e.data) return;

  // Forza aggiornamento immediato quando richiesto
  if (e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Notifica l'app che c'è una nuova versione disponibile
  if (e.data.type === 'CHECK_UPDATE') {
    self.clients.matchAll().then(clients => {
      clients.forEach(c => c.postMessage({ type: 'SW_VERSION', version: CACHE }));
    });
  }
});

// ── PUSH SUBSCRIPTION REFRESH (iOS: subscription scade silenziosamente) ───────
self.addEventListener('pushsubscriptionchange', e => {
  // Evento sparato quando iOS invalida la subscription
  // Notifica l'app di rinnovare la subscription
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(c => c.postMessage({ type: 'PUSH_SUBSCRIPTION_EXPIRED' }));
    })
  );
});
