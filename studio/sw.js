/* Studio — service worker: cho phép cài Studio thành app và mở được cả khi mạng chập chờn.
   Luôn lấy bản mới từ mạng trước; mất mạng thì dùng bản đã lưu gần nhất. Không đụng tới Spotify, Instagram… (khác tên miền). */
const CACHE = 'studio-v1';
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  // chỉ dọn cache cũ của Studio (studio-…), không đụng cache của app Anrevy House
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('studio-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok && res.type === 'basic'){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? './' : req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(m => m || (req.mode === 'navigate' ? caches.match('./') : Response.error())))
  );
});
