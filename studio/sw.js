/* Studio cũ (anrevy-house/studio/) đã chuyển sang /anvy-studio/.
   Service worker này thay bản cũ để tự gỡ mình và xoá cache cũ của Studio, rồi tải lại các tab đang mở. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => /^studio-v\d+$/.test(k)).map(k => caches.delete(k)));
    await self.registration.unregister();
    const cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach(c => { try { c.navigate(c.url); } catch (e) {} });
  })());
});
