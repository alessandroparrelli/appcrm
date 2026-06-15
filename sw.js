// Service Worker — CRM CNA Roma v4
const CACHE  = 'crm-cna-v4';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k!==CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co') || e.request.url.includes('fonts.')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(resp => {
        if (resp && resp.status===200 && resp.type==='basic') {
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
    body:  'Hai una nuova notifica',
    url:   '/',
    icon:  '/icon-192.png',
    badge: '/icon-144.png',
    tag:   'crm',
  };

  if (e.data) {
    try {
      const json = e.data.json();
      data = Object.assign(data, json);
      // Il SW riceve il campo "body" come testo notifica
      if (json.body) data.body = json.body;
    } catch {
      data.body = e.data.text() || data.body;
    }
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:               data.body,
      icon:               data.icon,
      badge:              data.badge,
      tag:                data.tag,
      data:               { url: data.url },
      vibrate:            [200, 100, 200],
      requireInteraction: false,
      silent:             false,
    })
  );
});

// ── NOTIFICATION CLICK ─────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) ? e.notification.data.url : '/';
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.postMessage({type:'CRM_NAVIGATE', url});
          return c.focus();
        }
      }
      return clients.openWindow(self.location.origin + url);
    })
  );
});

// ── MESSAGE ──────────────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
