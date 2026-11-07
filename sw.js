/* Anrevy House — service worker: cho phép cài cả nhà thành app và mở được khi mạng chập chờn.
   Trang luôn lấy bản mới từ mạng trước; mất mạng thì dùng bản đã lưu gần nhất.
   Chỉ lưu trang + css/js/font nhỏ (không lưu ảnh gallery cho đỡ nặng máy). Studio có service worker riêng. */
const CACHE = 'house-v1';
const SHELL = ['./', './login.html', './home.html', './site.webmanifest',
               './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-32.png'];
const KEEP = new Set(['style', 'script', 'font', 'manifest']);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  // chỉ dọn cache cũ của nhà (house-…), không đụng cache của Studio
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('house-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const nav = req.mode === 'navigate';
  if (!nav && !KEEP.has(req.destination)) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok && res.type === 'basic'){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: nav })
      .then(m => m || (nav ? caches.match('./') : Response.error())))
  );
});
