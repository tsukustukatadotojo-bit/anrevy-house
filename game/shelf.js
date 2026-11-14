/* ===== GIÁ SÁCH CHUNG CỦA GAME ROOM =====
   Dùng ở sảnh (nút ⋯ trên mỗi cửa) và trong phòng (nút ☰). Mỗi link là một cuốn sách:
   tên viết dọc trên gáy, rê chuột (hoặc chạm một lần) để đọc mô tả, bấm (chạm lần nữa) để mở ở thẻ mới.
   Danh sách link nằm chung trong game/links.json (name, desc, url, room). */
(() => {
  if (window.Shelf) return;
  const SRC = (document.currentScript && document.currentScript.src) || location.href;
  const DATA_URL = new URL('links.json', SRC).href;
  const touch = matchMedia('(hover: none)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const norm = s => String(s || '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '');

  /* ---- dữ liệu: tải links.json một lần ---- */
  let dataP = null;
  function data(){
    if (!dataP) dataP = fetch(DATA_URL, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(e => { dataP = null; throw e; });
    return dataP;
  }
  // link của một phòng (theo mã thư mục: arcade, cyber…), giữ đúng thứ tự trong file
  function forRoom(key){
    return data().then(D => {
      const want = new Set([norm(key), norm(D.rooms && D.rooms[key])]); want.delete('');
      return (D.links || []).filter(L => L && L.url && want.has(norm(L.room)))
        .map(L => ({ n: String(L.name || host(L.url)), d: String(L.desc || ''), u: String(L.url) }));
    });
  }

  /* ---- giao diện ---- */
  const CSS = `
.shf{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top,0px)) 12px max(12px,env(safe-area-inset-bottom,0px));
  font-family:'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif;color:#f4e9cf;--H:176px;--pl:16px}
.shf[hidden]{display:none}
.shf-bg{position:absolute;inset:0;background:rgba(6,3,10,.74);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.shf-case{position:relative;width:min(1000px,100%);max-height:min(88vh,900px);display:flex;flex-direction:column;border-radius:10px;overflow:hidden;
  background:linear-gradient(90deg,#3b2414,#4a2e19 3%,#2a180d 3.4%,#2a180d 96.6%,#4a2e19 97%,#3b2414);
  box-shadow:0 0 0 2px #1a0e06,0 0 0 4px #5e3b20,0 30px 80px rgba(0,0,0,.7)}
.shf.in .shf-case{animation:shfUp .38s cubic-bezier(.2,.9,.3,1.1)}
@keyframes shfUp{from{transform:translateY(18px) scale(.98);opacity:0}}
.shf-head{position:relative;flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 56px 12px;
  background:linear-gradient(180deg,#5e3b20,#432a16);border-bottom:6px solid #1f1209;box-shadow:0 4px 10px rgba(0,0,0,.5)}
.shf-plate{display:inline-flex;align-items:center;gap:10px;padding:6px 18px;border-radius:6px;
  background:linear-gradient(180deg,#f3d58a,#c99a3c 55%,#a87a26);box-shadow:inset 0 1px 0 rgba(255,255,255,.6),inset 0 -2px 0 rgba(0,0,0,.25),0 2px 4px rgba(0,0,0,.5)}
.shf-plate h2{margin:0;font-weight:700;font-size:clamp(15px,2.2vw,20px);line-height:1.2;letter-spacing:.18em;text-transform:uppercase;color:#3a2408;text-shadow:0 1px 0 rgba(255,240,200,.6)}
.shf-plate i{flex:none;width:10px;height:10px;border-radius:50%;background:var(--c,#fff);box-shadow:0 0 6px var(--c,#fff),inset 0 0 0 1.5px rgba(0,0,0,.35)}
.shf-head p{margin:0;font:400 13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:#e9d6b0;opacity:.85;text-align:center}
.shf-x{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;cursor:pointer;font:16px/1 system-ui,sans-serif;
  background:rgba(0,0,0,.25);border:1.5px solid #e2b84e;color:#f4e9cf}
.shf-x:hover,.shf-x:focus-visible{background:#e2b84e;color:#2a180d;outline:none}
.shf-rows{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:18px 22px 0;display:flex;flex-wrap:wrap;align-items:flex-end;align-content:flex-start;
  column-gap:3px;row-gap:var(--pl);background-color:#24150b;
  background-image:repeating-linear-gradient(180deg,transparent 0 var(--H),#b07a45 var(--H) calc(var(--H) + 3px),#6e4524 calc(var(--H) + 3px) calc(var(--H) + var(--pl) - 3px),#3a2312 calc(var(--H) + var(--pl) - 3px) calc(var(--H) + var(--pl))),
    radial-gradient(120% 60% at 50% 0,rgba(255,200,120,.10),transparent 70%);
  background-origin:content-box;background-clip:border-box;background-position:0 0;padding-bottom:var(--pl)}
.shf-rows::after{content:'';flex:1 0 100%;height:0}
.shf-sl{height:var(--H);display:flex;align-items:flex-end}
.shf-bk{position:relative;display:block;height:calc(var(--H) * var(--k,.9));min-width:26px;padding:16px 7px 16px;box-sizing:border-box;border-radius:3px 3px 1px 1px;
  writing-mode:vertical-rl;text-orientation:mixed;text-decoration:none;cursor:pointer;color:var(--ink,#f4e9cf);
  font-weight:600;font-size:13px;line-height:1.15;letter-spacing:.02em;overflow:hidden;
  background:linear-gradient(90deg,rgba(0,0,0,.38),rgba(255,255,255,.14) 16%,rgba(255,255,255,0) 38%,rgba(0,0,0,.08) 70%,rgba(0,0,0,.34)),var(--c,#7a1f2b);
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.25),2px 0 3px rgba(0,0,0,.35);transition:transform .22s cubic-bezier(.3,1.6,.5,1),filter .2s}
.shf-bk::before,.shf-bk::after{content:'';position:absolute;left:3px;right:3px;height:4px;border-top:1px solid var(--g,#e2c27a);border-bottom:1px solid var(--g,#e2c27a);opacity:.75}
.shf-bk::before{top:7px}.shf-bk::after{bottom:7px}
.shf-bk.lab span{display:inline-block;padding:6px 2px;background:rgba(244,233,207,.92);color:#2a1d10;border-radius:2px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.2)}
.shf-bk:hover,.shf-bk:focus-visible,.shf-bk.armed{transform:translateY(-8px);filter:brightness(1.12);outline:none}
.shf-bk:focus-visible{box-shadow:inset 0 0 0 1px rgba(0,0,0,.25),0 0 0 2px #fff,0 0 0 4px #e2b84e}
.shf-empty{width:100%;height:var(--H);display:flex;align-items:center;justify-content:center;font-style:italic;font-size:15px;color:#c9ab7a}
.shf-tip{position:fixed;left:0;top:0;z-index:81;max-width:min(320px,calc(100vw - 16px));padding:10px 13px;border-radius:8px;pointer-events:none;opacity:0;transition:opacity .12s;
  background:#fbf3df;color:#2a1d10;box-shadow:0 10px 30px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.15);font:400 13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif}
.shf-tip.on{opacity:1}
.shf-tip b{display:block;font:700 16px/1.25 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif;margin-bottom:3px}
.shf-tip i{display:block;margin-top:6px;font-style:normal;font-size:12px;color:#8a5a1c}
@media (max-width:640px){.shf{--H:138px;--pl:14px}.shf-rows{padding:14px 12px 0;padding-bottom:var(--pl)}.shf-head{padding:14px 50px 10px}.shf-bk{font-size:12px;padding:14px 6px}}
@media (prefers-reduced-motion:reduce){.shf.in .shf-case{animation:none}.shf-bk{transition:none}}`;

  // vải bọc gáy sách: [màu nền, màu chữ, màu viền nhũ]
  const CLOTH = [['#7a1f2b', '#f4e9cf', '#e2c27a'], ['#1f3a5f', '#f4e9cf', '#e2c27a'], ['#2f5d3a', '#f4e9cf', '#e2c27a'], ['#c08f2e', '#2a1d10', '#5a3a10'],
    ['#5b2a5e', '#f4e9cf', '#e2c27a'], ['#1d5c63', '#f4e9cf', '#e2c27a'], ['#e9dcc0', '#2a1d10', '#8a5a1c'], ['#2b2b33', '#e9d6b0', '#c9a24a'],
    ['#8c3b1f', '#f4e9cf', '#e8c98a'], ['#3e4f86', '#f4e9cf', '#e2c27a'], ['#a33b5b', '#f9ecd6', '#f0cf8a'], ['#4a6b3a', '#f4e9cf', '#e2c27a'], ['#6b4a2b', '#f4e9cf', '#e2c27a']];

  let root, rows, tip, titleEl, countEl, dotEl, opener = null, armed = null, armT = 0;
  function build(){
    if (root) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div');
    root.className = 'shf'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'shfTitle');
    root.innerHTML = `<div class="shf-bg" data-x></div><div class="shf-case"><div class="shf-head"><div class="shf-plate"><i aria-hidden="true"></i><h2 id="shfTitle"></h2></div><p></p>
      <button type="button" class="shf-x" data-x aria-label="Đóng giá sách">✕</button></div><div class="shf-rows" role="list"></div></div><div class="shf-tip" aria-hidden="true"></div>`;
    document.body.appendChild(root);
    rows = root.querySelector('.shf-rows'); tip = root.querySelector('.shf-tip');
    titleEl = root.querySelector('h2'); countEl = root.querySelector('.shf-head p'); dotEl = root.querySelector('.shf-plate i');
    root.addEventListener('click', e => { if (e.target.closest('[data-x]')) close(); });
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape'){ e.stopPropagation(); close(); }
      else if (e.key === 'Tab'){                              // giữ phím Tab trong giá sách
        const f = [...root.querySelectorAll('a[href],button')].filter(x => x.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]){ e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]){ e.preventDefault(); f[0].focus(); }
      }
    });
    rows.addEventListener('scroll', hideTip, { passive: true });
    document.addEventListener('pointerdown', e => { if (armed && !(e.target.closest && e.target.closest('.shf-bk'))) disarm(); });
  }
  function showTip(bk){
    const L = bk._L; if (!L) return;
    tip.innerHTML = `<b>${esc(L.n)}</b>${L.d ? esc(L.d) : ''}<i>${esc(host(L.u))} ↗${L.shelfOnly ? ' · chỉ có trên giá sách' : ''}${touch ? ' · chạm lần nữa để mở' : ''}</i>`;
    tip.classList.add('on');
    const r = bk.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    let x, y;
    if (r.right + 10 + w <= innerWidth - 8){ x = r.right + 10; y = r.top + 8; }          // bên phải cuốn sách
    else if (r.left - 10 - w >= 8){ x = r.left - w - 10; y = r.top + 8; }               // bên trái
    else { x = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)); y = r.top - h - 12 >= 8 ? r.top - h - 12 : r.bottom + 10; }
    y = Math.max(8, Math.min(innerHeight - h - 8, y));
    tip.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
  }
  function hideTip(){ if (tip) tip.classList.remove('on'); }
  function disarm(){ if (armed){ armed.classList.remove('armed'); armed = null; } hideTip(); }
  function book(L){
    const h = hash(L.u + L.n), c = CLOTH[h % CLOTH.length];
    const sl = document.createElement('div'); sl.className = 'shf-sl'; sl.setAttribute('role', 'listitem');
    const a = document.createElement('a');
    a.className = 'shf-bk' + ((h >>> 8) % 5 === 0 ? ' lab' : '');
    a.href = L.u; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', L.n + (L.d ? ': ' + L.d : '') + ' (mở thẻ mới)');
    a.style.setProperty('--c', c[0]); a.style.setProperty('--ink', c[1]); a.style.setProperty('--g', c[2]);
    a.style.setProperty('--k', (.8 + ((h >>> 4) % 21) / 100).toFixed(2));
    const nm = L.n.length > 46 ? L.n.slice(0, 44) + '…' : L.n;
    a.innerHTML = `<span>${esc(nm)}</span>`;
    a._L = L;
    a.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') showTip(a); });
    a.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && armed !== a) hideTip(); });
    a.addEventListener('focus', () => showTip(a));
    a.addEventListener('blur', () => { if (armed !== a) hideTip(); });
    a.addEventListener('click', e => {
      if (touch && (armed !== a || performance.now() - armT > 4000)){
        e.preventDefault(); if (armed) armed.classList.remove('armed');
        armed = a; armT = performance.now(); a.classList.add('armed'); showTip(a); return;
      }
      disarm();
    });
    sl.appendChild(a);
    return sl;
  }
  function open(o){
    build();
    const links = (o && o.links) || [];
    opener = (o && o.opener) || document.activeElement;
    titleEl.textContent = (o && o.title) || 'Giá sách';
    root.style.setProperty('--c', (o && o.col) || '#e2b84e');
    countEl.textContent = links.length
      ? links.length + ' cuốn · ' + (touch ? 'chạm một lần để đọc mô tả, chạm lần nữa để mở' : 'rê chuột lên gáy sách để đọc mô tả, bấm để mở ở thẻ mới')
      : (o && o.error) || 'giá sách còn trống';
    rows.innerHTML = '';
    if (links.length) links.forEach(L => rows.appendChild(book(L)));
    else rows.innerHTML = `<div class="shf-empty">${esc((o && o.error) ? 'chưa tải được danh sách, thử lại sau nhé' : 'chưa có cuốn nào')}</div>`;
    rows.scrollTop = 0;
    root.hidden = false; root.classList.remove('in'); void root.offsetWidth; if (!reduce) root.classList.add('in');
    const first = rows.querySelector('a') || root.querySelector('.shf-x');
    setTimeout(() => first.focus({ preventScroll: true }), 30);
  }
  function close(){
    if (!root || root.hidden) return;
    disarm(); root.hidden = true;
    if (opener && opener.focus) opener.focus({ preventScroll: true });
    opener = null;
  }
  window.Shelf = { data, forRoom, open, close, get isOpen(){ return !!root && !root.hidden; } };
})();
