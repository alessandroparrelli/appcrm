// Service Worker — CRM CNA Roma v9
const CACHE  = 'crm-cna-v9';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  console.log('[SW v6] install');
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  console.log('[SW v6] activate — cleaning old caches');
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log('[SW v6] deleting cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
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
  console.log('[SW v6] push event received');

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
      console.log('[SW v6] push data:', JSON.stringify(json));
      Object.assign(data, json);
      if (json.body) data.body = json.body;
      if (json.message) data.body = json.message; // fallback field
    } catch (err) {
      console.warn('[SW v6] push data not JSON:', e.data.text());
      data.body = e.data.text() || data.body;
    }
  } else {
    console.warn('[SW v6] push event has no data!');
  }

  console.log('[SW v6] showing notification:', data.title, '-', data.body);

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
    }).then(() => {
      console.log('[SW v6] notification shown OK');
    }).catch(err => {
      console.error('[SW v6] showNotification error:', err);
    })
  );
});

// ── NOTIFICATION CLICK ─────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  console.log('[SW v6] notificationclick', e.notification.data);
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

// ── MESSAGE ──────────────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    console.log('[SW v6] SKIP_WAITING received');
    self.skipWaiting();
  }
});
