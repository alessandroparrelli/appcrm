// Service Worker — CRM CNA Roma
const CACHE = 'crm-cna-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  // Network-first per le chiamate Supabase, cache-first per gli asset statici
  if(e.request.url.includes('supabase.co')){
    e.respondWith(fetch(e.request).catch(function(){ return caches.match(e.request); }));
  } else {
    e.respondWith(
      caches.match(e.request).then(function(cached){
        return cached || fetch(e.request).then(function(resp){
          if(resp && resp.status===200 && resp.type==='basic'){
            var clone = resp.clone();
            caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
          }
          return resp;
        });
      })
    );
  }
});
