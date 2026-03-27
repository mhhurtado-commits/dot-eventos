const CACHE = 'dot-eventos-v1';
const ARCHIVOS = [
  '/',
  '/pages/dashboard',
  '/pages/agenda',
  '/css/style.css',
  '/css/dashboard.css',
  '/css/evento.css',
  '/css/nuevo-evento.css',
  '/css/agenda.css',
  '/css/reuniones.css',
  '/js/supabase.js',
  '/js/dashboard.js',
  '/js/agenda.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ARCHIVOS))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});