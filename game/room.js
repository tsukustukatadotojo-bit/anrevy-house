/* ===== PHẦN CHUNG CHO CÁC PHÒNG GAME VẼ TAY =====
   Mỗi trang khai báo window.ROOM = { title, music, links: [{n, d, u}], fx(ctx, t, dt, W, H, S) }
   và vẽ cảnh vào <svg id="scene">; mỗi đồ vật là <a class="lk" data-i="…">, data-i trỏ vào ROOM.links
   = link mà đồ vật đó được vẽ riêng cho (tên trên máy, hình trên áp phích…).
   Link thật của phòng lấy từ game/links.json (qua shelf.js): link nào còn ở phòng thì giữ đồ vật của nó,
   link mới gắn vào đồ vật còn trống (đổi nhãn tên trên đồ vật), đồ vật không còn link thành đồ trang trí,
   link dư chỉ nằm trên giá sách (nút ☰). Không tải được file thì dùng ROOM.links như cũ. */
(() => {
  const R = window.ROOM, $ = s => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none)').matches;
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };

  /* ---- gắn link vào đồ vật ---- */
  const LKS = [...document.querySelectorAll('#scene .lk')];
  const HOME = R.links || [];                                   // link gốc của từng đồ vật (theo data-i)
  const KEY = (location.pathname.match(/\/game\/([^/]+)\/?/) || [])[1] || '';
  let roomLinks = HOME.map(L => ({ n: L.n, d: L.d, u: L.u })), attached = false;
  const NS = 'http://www.w3.org/2000/svg';
  function relabel(a, L){                                       // đồ vật vẽ cho link khác → giấu chữ cũ, treo bảng tên mới
    const g = a.firstElementChild || a;
    g.querySelectorAll('text').forEach(t => { if (t.textContent.trim().length >= 3) t.setAttribute('visibility', 'hidden'); });
    let bb; try { bb = g.getBBox(); } catch (e) { return; }
    if (!bb || !bb.width) return;
    const fs = Math.max(10, Math.min(18, bb.width / 7)), nm = L.n.length > 18 ? L.n.slice(0, 17) + '…' : L.n;
    const p = document.createElementNS(NS, 'g'); p.setAttribute('class', 'plq'); p.setAttribute('aria-hidden', 'true');
    p.setAttribute('pointer-events', 'none');
    const r = document.createElementNS(NS, 'rect'), t = document.createElementNS(NS, 'text');
    t.textContent = nm;
    // bảng tên nằm ở lớp trên cùng của cảnh (đồ vật vẽ sau không che mất), cùng toạ độ với đồ vật
    const svgEl = document.getElementById('scene');
    let layer = svgEl.querySelector('g.plqs'); if (!layer){ layer = document.createElementNS(NS, 'g'); layer.setAttribute('class', 'plqs'); svgEl.appendChild(layer); }
    try { const m = svgEl.getScreenCTM().inverse().multiply(g.getScreenCTM()); p.setAttribute('transform', `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`); } catch (e) {}
    Object.entries({ x: bb.x + bb.width / 2, y: bb.y + Math.min(bb.height * .22, fs * 2.2) + fs * .35, 'text-anchor': 'middle', 'font-size': fs.toFixed(1) })
      .forEach(([k, v]) => t.setAttribute(k, v));
    t.setAttribute('style', 'font-family:var(--tip-font,system-ui,sans-serif);fill:var(--tip-ink,#fff);letter-spacing:.02em');
    p.append(r, t); layer.appendChild(p);
    let w = fs * nm.length * .6; try { w = t.getComputedTextLength(); } catch (e) {}
    const pw = w + fs * 1.1, ph = fs * 1.7, cy = +t.getAttribute('y') - fs * .35;
    Object.entries({ x: bb.x + bb.width / 2 - pw / 2, y: cy - ph / 2, width: pw, height: ph, rx: Math.min(6, ph / 3) }).forEach(([k, v]) => r.setAttribute(k, v));
    r.setAttribute('style', 'fill:var(--tip-bg,#111);fill-opacity:.9;stroke:var(--accent,#fff);stroke-width:' + Math.max(1.5, fs / 8).toFixed(1));
  }
  function attach(list){
    if (attached) return; attached = true;
    const free = new Set(LKS), byUrl = new Map(), pick = new Map(), rest = [];
    LKS.forEach(a => { const h = HOME[+a.dataset.i]; if (h){ if (!byUrl.has(h.u)) byUrl.set(h.u, []); byUrl.get(h.u).push(a); } });
    list.forEach(L => { const a = (byUrl.get(L.u) || []).find(x => free.has(x)); if (a){ free.delete(a); pick.set(a, L); } else rest.push(L); });
    const spare = LKS.filter(a => free.has(a));
    rest.forEach(L => { const a = spare.shift(); if (a){ free.delete(a); pick.set(a, L); } else L.shelfOnly = true; });
    LKS.forEach(a => {
      const L = pick.get(a);
      if (!L){                                                  // không còn link: chỉ để trang trí
        a.removeAttribute('href'); a.classList.remove('lk'); a.classList.add('deco'); a._L = null; return;
      }
      a.setAttribute('href', L.u); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener');
      a.setAttribute('aria-label', L.n + (L.d ? ': ' + L.d : '') + ' (mở thẻ mới)');
      a._L = L;
      const h = HOME[+a.dataset.i]; if (!h || h.u !== L.u) relabel(a, L);
    });
    roomLinks = list;
  }
  if (window.Shelf && KEY && location.protocol !== 'file:'){
    const fallback = setTimeout(() => attach(roomLinks), 5000);
    Shelf.forRoom(KEY).then(list => { clearTimeout(fallback); attach(list); }).catch(() => { clearTimeout(fallback); attach(roomLinks); });
  } else attach(roomLinks);

  /* ---- nhãn tên: rê chuột thì hiện, điện thoại chạm lần 1 hiện tên, chạm lần 2 mới mở ---- */
  const tip = $('#tip');
  let armed = null, armT = 0;
  function showTip(a, x, y){
    const L = a._L; if (!L) return;
    tip.innerHTML = `<b>${esc(L.n)}</b><small>${esc(L.d)}</small><i>${esc(host(L.u))} ↗${touch ? ' · chạm lần nữa để mở' : ''}</i>`;
    tip.classList.add('on');
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const tx = Math.min(innerWidth - w - 8, Math.max(8, x + 14)), ty = y + 18 + h > innerHeight - 8 ? y - h - 14 : y + 18;
    tip.style.transform = `translate(${tx}px,${Math.max(8, ty)}px)`;
  }
  const hideTip = () => tip.classList.remove('on');
  LKS.forEach(a => {
    a.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') showTip(a, e.clientX, e.clientY); });
    a.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') showTip(a, e.clientX, e.clientY); });
    a.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hideTip(); });
    a.addEventListener('focus', () => { const r = a.getBoundingClientRect(); showTip(a, r.left + r.width / 2, r.top + r.height / 2); });
    a.addEventListener('blur', hideTip);
    a.addEventListener('click', e => {
      if (!a._L){ e.preventDefault(); return; }
      if (touch && (armed !== a || performance.now() - armT > 4000)){
        e.preventDefault();
        if (armed) armed.classList.remove('armed');
        armed = a; armT = performance.now(); a.classList.add('armed');
        const r = a.getBoundingClientRect(); showTip(a, r.left + r.width / 2 - 60, r.top + r.height * .3);
        return;
      }
      if (armed){ armed.classList.remove('armed'); armed = null; }
      hideTip();
    });
  });
  document.addEventListener('pointerdown', e => { if (armed && !(e.target.closest && e.target.closest('.lk'))){ armed.classList.remove('armed'); armed = null; hideTip(); } });

  /* ---- khung cảnh rộng hơn màn hình (điện thoại dọc): kéo ngang để xem, mở ra ở giữa ---- */
  const wrap = $('#wrap'), panL = $('#panL'), panR = $('#panR');
  function layout(){
    document.body.classList.toggle('narrow', innerWidth < 700 || innerWidth / innerHeight < 1);
    const scrolly = wrap.scrollWidth > wrap.clientWidth + 4;
    document.body.classList.toggle('scrolly', scrolly);
    panUI();
  }
  function panUI(){ panL.classList.toggle('off', wrap.scrollLeft < 8); panR.classList.toggle('off', wrap.scrollLeft > wrap.scrollWidth - wrap.clientWidth - 8); }
  wrap.addEventListener('scroll', () => { panUI(); hideTip(); }, { passive: true });
  wrap.addEventListener('wheel', e => { if (wrap.scrollWidth > wrap.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)){ wrap.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  const step = d => wrap.scrollBy({ left: d * wrap.clientWidth * .6, behavior: reduce ? 'auto' : 'smooth' });
  panL.addEventListener('click', () => step(-1)); panR.addEventListener('click', () => step(1));
  addEventListener('resize', layout);
  layout();
  wrap.scrollLeft = (wrap.scrollWidth - wrap.clientWidth) * (R.startAt != null ? R.startAt : .5);
  // gợi ý
  const hint = $('#hint');
  if (hint){ hint.textContent = touch ? (document.body.classList.contains('scrolly') ? 'vuốt ngang để xem cả phòng · chạm vào đồ vật để xem tên, chạm lần nữa để mở' : 'chạm vào đồ vật để xem tên, chạm lần nữa để mở') : 'rê chuột lên đồ vật để xem · ' + (R.openHint || 'bấm để mở trò chơi'); setTimeout(() => hint.classList.add('on'), 900); setTimeout(() => hint.classList.remove('on'), 8000); }

  /* ---- giá sách: tất cả link trong phòng (kể cả link không có đồ vật) ---- */
  const listBtn = $('#listBtn');
  listBtn.addEventListener('click', () => {
    hideTip();
    const col = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (window.Shelf) Shelf.open({ title: R.title, col, links: roomLinks, opener: listBtn });
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });

  /* ---- hiệu ứng hạt (mưa, sao, bụi phấn, tàn lửa…) ---- */
  const cv = $('#fx'), cx = cv.getContext('2d');
  let W = 0, H = 0, last = performance.now();
  function size(){ const d = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; cv.width = Math.round(W * d); cv.height = Math.round(H * d); cx.setTransform(d, 0, 0, d, 0, 0); }
  size(); addEventListener('resize', size);
  const svg = $('#scene');
  // đổi toạ độ trong cảnh (1600x900) sang toạ độ màn hình
  const S = (x, y) => { const m = svg.getScreenCTM(); return m ? [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f, m.a] : [x, y, 1]; };
  function loop(now){
    requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    cx.clearRect(0, 0, W, H);
    if (R.fx && !reduce) R.fx(cx, now / 1000, dt, W, H, S);
  }
  requestAnimationFrame(loop);

  /* ---- nhạc nền YouTube (ẩn được) ---- */
  const tv = $('#tv'), tvMsg = $('#tvMsg'), snd = $('#snd'), tvMin = $('#tvMin');
  let yt = null, ytReady = false, ytDead = false, soundOn = false, userMuted = false, gestured = false;
  function sndUI(){ snd.textContent = soundOn ? 'on' : 'off'; snd.setAttribute('aria-pressed', soundOn); tv.classList.toggle('on', soundOn); }
  function noSignal(txt){ ytDead = true; soundOn = false; tv.classList.add('dead'); tvMsg.innerHTML = 'no signal<small>' + txt + '</small>'; sndUI(); }
  function soundUp(){ if (!ytReady || ytDead) return; yt.unMute(); yt.setVolume(55); yt.playVideo(); soundOn = true; sndUI(); }
  function soundDown(){ if (ytReady) yt.mute(); soundOn = false; sndUI(); }
  if (location.protocol === 'file:') noSignal('chỉ chạy khi mở qua web');
  else {
    window.onYouTubeIframeAPIReady = () => {
      yt = new YT.Player('yt', {
        videoId: R.music,
        playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, loop: 1, playlist: R.music, origin: location.origin },
        events: {
          onReady: e => { ytReady = true; e.target.getIframe().setAttribute('title', 'Nhạc nền phòng ' + R.title); e.target.mute(); e.target.playVideo(); if (gestured && !userMuted) soundUp(); },
          onStateChange: e => { if (e.data === YT.PlayerState.ENDED){ e.target.seekTo(0); e.target.playVideo(); } },
          onError: () => noSignal('video không phát được')
        }
      });
    };
    const tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api'; tag.onerror = () => noSignal('không tải được YouTube'); document.head.appendChild(tag);
    setTimeout(() => { if (!ytReady && !ytDead) noSignal('không tải được YouTube'); }, 15000);
  }
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, e => { if (e.target.closest && e.target.closest('#snd')) return; gestured = true; if (!userMuted && !soundOn) soundUp(); }, true));
  snd.addEventListener('click', () => { gestured = true; if (soundOn){ userMuted = true; soundDown(); } else { userMuted = false; soundUp(); } });
  function setMin(m){ tv.classList.toggle('min', m); tvMin.textContent = m ? '▢' : '–'; tvMin.setAttribute('aria-expanded', !m); tvMin.setAttribute('aria-label', m ? 'Hiện video' : 'Ẩn video'); try { localStorage.setItem('room-tv-min', m ? '1' : '0'); } catch (e) {} }
  let startMin = true; try { const v = localStorage.getItem('room-tv-min'); if (v) startMin = v === '1'; } catch (e) {}
  setMin(startMin);
  tvMin.addEventListener('click', () => setMin(!tv.classList.contains('min')));

  window.__room = { get links(){ return roomLinks; }, get attached(){ return attached; }, home: HOME, count: LKS.length, S, wrap };
})();
