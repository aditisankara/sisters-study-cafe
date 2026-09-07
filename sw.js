/* Sisters' Café Study Tracker — service worker (offline-first, no build step) */
const CACHE = 'cafe-study-v3';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

/* Reminder notifications scheduled from the page via postMessage */
self.addEventListener('message', (e) => {
  const data = e.data || {};
  if (data.type === 'notify') {
    self.registration.showNotification(data.title || 'Reminder', {
      body: data.body || '',
      icon: './icons/icon.svg',
      badge: './icons/icon.svg',
      tag: data.tag || 'cafe-reminder',
      data: { url: './index.html#reminders' }
    });
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return clients.openWindow('./index.html#reminders');
  }));
});
