/* =====================================================================
   LOUNGE MAP — phần chạy: vào phòng, đi lại (cần điều khiển tròn / phím / chuột),
   cửa tự kéo, khoá phòng, gọi thoại theo phòng (chỉ người cùng phòng nghe thấy nhau),
   bản đồ, chỉ rời được ở Lối vào, rời trang quá 15 phút thì tự ra.
   Kết nối qua máy chủ MQTT công cộng, gọi thoại WebRTC (tiếng đi vòng qua máy chủ khi cần).
   ===================================================================== */
(() => {
  const $ = s => document.querySelector(s);
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const SVG_MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/><path class="slash" d="M4 4l16 16" style="display:none"/></svg>';
  const SVG_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>';
  const SVG_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path id="shackle" d="M8 11V7a4 4 0 0 1 7.7-1.5"/></svg>';
  document.body.insertAdjacentHTML('afterbegin', `
  <canvas id="room" tabindex="0" aria-label="Lounge Map: dinh thự nhìn từ trên xuống. Dùng nút tròn hoặc phím mũi tên để đi lại, bấm vào đồ vật để tương tác."></canvas>
  <div class="where" id="where" role="status" aria-live="polite"><span aria-hidden="true">📍</span><b id="whereT">LOUNGE MAP</b></div>
  <div class="hud-tr">
    <div class="status off" id="status" role="status"><span class="dot"></span><span id="stTxt">đang kết nối…</span></div>
    <button class="btn" id="lockBtn" hidden aria-label="Khoá phòng">${SVG_LOCK}</button>
    <button class="btn" id="chatBtn" aria-label="Nhắn tin" aria-expanded="false">${SVG_CHAT}</button>
    <button class="btn" id="micBtn" aria-pressed="true" aria-label="Bật hoặc tắt micro">${SVG_MIC}</button>
  </div>
  <form class="chat" id="chat" autocomplete="off"><input id="chatIn" maxlength="140" placeholder="Nhắn gì đó… (Enter)" aria-label="Tin nhắn" enterkeyhint="send"><button class="btn" type="submit" aria-label="Gửi">➤</button></form>
  <div class="gate" id="gate">
    <form class="card" id="gateForm" autocomplete="off">
      <div class="c-left">
        <h1>LOUNGE MAP</h1>
        <p class="sub">dinh thự của AnreVy · đi dạo, trò chuyện, gọi thoại theo từng phòng</p>
        <div class="gstate"><span class="ico" id="gIco">⏳</span><div><b id="gHead">Đang kết nối…</b><span id="gSub"></span><div class="who" id="gWho"></div></div></div>
        <p class="note">Trang sẽ xin quyền dùng micro. Chỉ những người <b>ở cùng một phòng</b> mới nghe thấy nhau. Muốn rời Lounge Map thì đi ra lại <b>Lối vào</b>. Rời trang quá 15 phút sẽ tự bị mời ra.</p>
      </div>
      <div class="c-right">
        <label class="lbl" for="name">Tên của bạn</label>
        <input class="field" id="name" maxlength="16" placeholder="vd. An Vy" required>
        <span class="lbl" id="colLbl">Màu</span>
        <div class="swatches" id="swatches" role="radiogroup" aria-labelledby="colLbl"></div>
        <span class="lbl" id="hatLbl">Nhân vật</span>
        <div class="hats" id="hats" role="radiogroup" aria-labelledby="hatLbl"></div>
        <p class="err" id="gErr" role="alert"></p>
        <button class="go" id="goBtn" type="submit">Vào Lounge Map</button>
        <span class="back-home"><a href="../home.html">← quay lại Anrevy House</a></span>
      </div>
    </form>
  </div>
  <div class="joy" id="joy" aria-label="Nút xoay tròn để di chuyển" role="application"><div class="joy-knob" id="joyKnob"></div></div>
  <button class="actbtn" id="actBtn" type="button" hidden><span id="actT"></span><kbd>E</kbd></button>
  <div class="modal" id="exitModal" role="dialog" aria-modal="true" aria-labelledby="exTitle">
    <div class="card"><h2 id="exTitle">RỜI LOUNGE MAP?</h2><p class="sub" style="margin-top:8px">Bạn đang đứng ở Lối vào. Ra ngoài sẽ ngắt cuộc gọi và quay về Anrevy House.</p>
      <div class="row"><button class="go ghost" type="button" id="exStay">Ở lại</button><button class="go" type="button" id="exGo">Rời đi</button></div></div>
  </div>
  <div class="mapm" id="mapModal" role="dialog" aria-modal="true" aria-label="Bản đồ Lounge Map">
    <div class="map-card"><div class="map-head"><b>LOUNGE MAP</b><small id="mapNote"></small><button class="map-x" id="mapClose" aria-label="Đóng bản đồ">✕</button></div><canvas id="mapCv"></canvas></div>
  </div>
  <div class="rotate" id="rotate"><div class="ph" aria-hidden="true"></div><h2>XOAY NGANG ĐIỆN THOẠI</h2><p>Lounge Map chỉ chơi được khi điện thoại nằm ngang. Hãy xoay máy (và tắt khoá xoay màn hình nếu đang bật).</p><a href="../home.html">← quay lại Anrevy House</a></div>
  <div class="toasts" id="toasts" aria-live="polite"></div>
  <button class="btn hot tapaudio" id="tapAudio">🔊 Chạm để nghe mọi người</button>
  <div id="audios" hidden></div>
  <div class="tv" id="tv">
    <div class="tv-bar"><span class="tv-t"><i aria-hidden="true">♪</i>lounge.fm</span><button id="snd" aria-pressed="false" aria-label="Bật hoặc tắt tiếng nhạc">off</button><button id="tvMin" aria-expanded="true" aria-controls="tvScr" aria-label="Thu nhỏ màn hình">–</button></div>
    <div class="tv-scr" id="tvScr"><div id="yt"></div><span class="tv-msg" id="tvMsg">tap anywhere for sound</span></div>
  </div>
  <div class="fade" id="fade"></div>`);

  /* ======= CÀI ĐẶT CHUNG ======= */
  const MUSIC = 'mM1dIwGO00w';
  const PREFIX = 'anrevy-house-9q2/loungemap/v1';
  const LOCK_MS = 2 * 60 * 60 * 1000;       // phòng khoá tự mở sau 2 tiếng
  let AWAY_KICK_MS = 15 * 60 * 1000;        // rời trang quá 15 phút thì tự ra khỏi Lounge Map
  const MAX_PEOPLE = 10;                    // gọi thoại kiểu mạng lưới: tối đa 10 người
  const HEAR_FULL = 620, HEAR_MAX = 1080;   // khoảng cách nghe rõ / hết nghe (đơn vị bản đồ)
  const EXIT_HREF = '../home.html';
  let BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
  /* ============================ */

  const qs = new URLSearchParams(location.search);
  if (qs.get('broker')) BROKERS = qs.get('broker').split(',');
  if (qs.get('awayms')) AWAY_KICK_MS = Math.max(2000, Math.min(AWAY_KICK_MS, +qs.get('awayms') || AWAY_KICK_MS));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rid = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => (b % 36).toString(36)).join('');
  const cleanName = s => String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  const cleanText = s => String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
  function toast(msg, warn){ const t = document.createElement('div'); t.className = 'toast' + (warn ? ' warn' : ''); t.textContent = msg; const box = $('#toasts'); box.appendChild(t); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => t.remove(), 4200); }
  function rr(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const TOUCH = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches);
  const PHONE = TOUCH && Math.min(screen.width, screen.height) < 600;
  if (TOUCH) document.body.classList.add('touch');

  const COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#9775fa', '#f783ac', '#f1f3f5', '#5c636a'];
  const HATS = ['none', 'top', 'beret', 'crown', 'cowboy', 'phones', 'party', 'flower'];
  const me = (() => { let id = ''; try { id = sessionStorage.getItem('lounge-id') || ''; } catch (e) {} if (!/^[a-z0-9]{10}$/.test(id)){ id = rid(10); try { sessionStorage.setItem('lounge-id', id); } catch (e) {} } return id; })();
  let prof = { name: '', col: COLORS[Math.floor(Math.random() * 6)], hat: HATS[Math.floor(Math.random() * HATS.length)] };
  try { const p = JSON.parse(localStorage.getItem('lounge-profile') || 'null'); if (p){ prof.name = cleanName(p.name); if (COLORS.includes(p.col)) prof.col = p.col; if (HATS.includes(p.hat)) prof.hat = p.hat; } } catch (e) {}

  /* ================= TRẠNG THÁI ================= */
  const peers = new Map();
  let self = null, inside = false, leaving = false, seatPending = -1, actPending = null, clock = 0, marker = null;
  let extras = { at: 0 };
  const locks = {};
  const freshPeers = () => [...peers.values()].filter(p => Date.now() - p.seen < 45000);

  /* ================= THẾ GIỚI ================= */
  const K = {
    rr, toast, claimSeat, approach, setExtras, toggleLock, openMap, note, sound, leaveTo,
    lockOn: room => lockOn(room), occupant: i => occupant(i), toggleMusic: () => toggleMusic(),
    publishFx: d => pub(T_FX, Object.assign({ from: me }, d)),
    get extras(){ return extras; }, get self(){ return self; }, get inside(){ return inside; }, get clock(){ return clock; }, get soundOn(){ return soundOn; }, me
  };
  const MAP = window.LOUNGE_MAP(K);
  const { W, H, T, FACE, ZONES, zoneAt, DOORS, GAPS, HW, VW, DW, OB, SEATS, HOTS, PROPS, DYN, BOUND, SPAWN, EXIT } = MAP;
  const LOCKABLE = new Set(ZONES.filter(z => z.lock).map(z => z.id));
  const LOCKDOORS = DOORS.filter(d => d.lock);
  const inRoom = (zi, room) => { const z = ZONES[zi]; return !!z && (z.id === room || z.parent === room); };

  /* ----- mặt nạ va chạm (ô 8 đơn vị) ----- */
  const AR = 18, MC = 8, MW = Math.ceil(W / MC), MH = Math.ceil(H / MC);
  const MASK = new Uint8Array(MW * MH), WALLM = new Uint8Array(MW * MH);
  function markRect(m, x0, y0, x1, y1){ const i0 = clamp(Math.floor(x0 / MC), 0, MW - 1), i1 = clamp(Math.floor(x1 / MC), 0, MW - 1), j0 = clamp(Math.floor(y0 / MC), 0, MH - 1), j1 = clamp(Math.floor(y1 / MC), 0, MH - 1); for (let j = j0; j <= j1; j++) m.fill(1, j * MW + i0, j * MW + i1 + 1); }
  function markFn(m, x0, y0, x1, y1, f){ const i0 = clamp(Math.floor(x0 / MC), 0, MW - 1), i1 = clamp(Math.floor(x1 / MC), 0, MW - 1), j0 = clamp(Math.floor(y0 / MC), 0, MH - 1), j1 = clamp(Math.floor(y1 / MC), 0, MH - 1); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (f(i * MC + MC / 2, j * MC + MC / 2)) m[j * MW + i] = 1; }
  const segD = (px, py, d) => { const vx = d.x1 - d.x0, vy = d.y1 - d.y0, t = clamp(((px - d.x0) * vx + (py - d.y0) * vy) / (vx * vx + vy * vy), 0, 1); return Math.hypot(px - d.x0 - vx * t, py - d.y0 - vy * t); };
  HW.forEach(w => { const x0 = w.x0 - (w.ea ? T / 2 : 0), x1 = w.x1 + (w.eb ? T / 2 : 0); markRect(MASK, x0 - AR, w.y - T / 2 - AR * .6, x1 + AR, w.y + T / 2 + FACE + 4); markRect(WALLM, x0, w.y - T / 2, x1, w.y + T / 2); });
  VW.forEach(w => { const y0 = w.y0 - (w.ea ? T / 2 : 0), y1 = w.y1 + (w.eb ? T / 2 : 0); markRect(MASK, w.x - T / 2 - AR, y0 - AR * .6, w.x + T / 2 + AR, y1 + AR * .4); markRect(WALLM, w.x - T / 2, y0, w.x + T / 2, y1); });
  DW.forEach(d => { const bx0 = Math.min(d.x0, d.x1) - 60, by0 = Math.min(d.y0, d.y1) - 60, bx1 = Math.max(d.x0, d.x1) + 60, by1 = Math.max(d.y0, d.y1) + 60; markFn(MASK, bx0, by0, bx1, by1, (x, y) => segD(x, y, d) < T / 2 + AR * .85); markFn(WALLM, bx0, by0, bx1, by1, (x, y) => segD(x, y, d) < T / 2); });
  OB.forEach(o => {
    if (o.r){ const [a, b, c, d] = o.r; markRect(MASK, a - AR, b - AR * .6, c + AR, d + AR * .4); }
    else if (o.c){ const [cx, cy, r] = o.c, R = r + AR; markFn(MASK, cx - R, cy - R, cx + R, cy + R, (x, y) => Math.hypot(x - cx, (y - cy) * 1.15) < R); }
    else if (o.e){ const [cx, cy, rx, ry] = o.e, Rx = rx + AR, Ry = ry + AR * .8; markFn(MASK, cx - Rx, cy - Ry, cx + Rx, cy + Ry, (x, y) => ((x - cx) / Rx) ** 2 + ((y - cy) / Ry) ** 2 < 1); }
  });
  const inBox = (x, y, b) => x > b[0] && x < b[2] && y > b[1] && y < b[3];
  function blocked(x, y){
    if (x < BOUND.x0 || x > BOUND.x1 || y < BOUND.y0 || y > BOUND.y1) return true;
    if (MASK[Math.floor(y / MC) * MW + Math.floor(x / MC)]) return true;
    if (self) for (const d of LOCKDOORS) if (inBox(x, y, d.block) && lockOn(d.owner) && !inRoom(self.zs, d.owner)) return true;
    return false;
  }
  const inGap = (x, y) => DOORS.some(d => inBox(x, y, d.block));
  // điểm đứng để dùng đồ vật mà lỡ bị vướng thì dời ra chỗ trống gần nhất
  const freeAt = (x, y) => !(x < BOUND.x0 || x > BOUND.x1 || y < BOUND.y0 || y > BOUND.y1 || MASK[Math.floor(y / MC) * MW + Math.floor(x / MC)]);
  function nearestFree(x, y){ if (freeAt(x, y)) return { x, y }; for (let r = 8; r <= 240; r += 8) for (let k = 0; k < 24; k++){ const a = k / 24 * Math.PI * 2, qx = x + Math.cos(a) * r, qy = y + Math.sin(a) * r; if (freeAt(qx, qy) && zoneAt(qx, qy) === zoneAt(x, y)) return { x: qx, y: qy }; } return null; }
  HOTS.forEach(h => { if (h.sit) return; const p = nearestFree(h.x, h.y); if (p){ h.x = p.x; h.y = p.y; } });
  SEATS.forEach(s => { const p = nearestFree(s.ax, s.ay); if (p){ s.ax = p.x; s.ay = p.y; } });
  function trackZone(p){ const x = p.seat >= 0 ? SEATS[p.seat].ax : p.x, y = p.seat >= 0 ? SEATS[p.seat].ay : p.y; if (!inGap(x, y) || p.zs == null) p.zs = zoneAt(x, y); }

  /* ----- tìm đường (A*) ----- */
  const CS = 16, GW = Math.ceil(W / CS), GH = Math.ceil(H / CS);
  let gridFree = null;
  function grid(){
    if (gridFree) return gridFree;
    gridFree = new Uint8Array(GW * GH);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++){ const x = i * CS + CS / 2, y = j * CS + CS / 2; gridFree[j * GW + i] = (x < BOUND.x0 || x > BOUND.x1 || y < BOUND.y0 || y > BOUND.y1 || MASK[Math.floor(y / MC) * MW + Math.floor(x / MC)]) ? 0 : 1; }
    return gridFree;
  }
  function clearLine(x0, y0, x1, y1){ const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6); for (let k = 1; k <= n; k++){ const t = k / n; if (blocked(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; } return true; }
  function plan(x0, y0, x1, y1){
    if (clearLine(x0, y0, x1, y1)) return null;
    const G = grid(), N = GW * GH;
    const cell = (x, y) => clamp(Math.floor(y / CS), 0, GH - 1) * GW + clamp(Math.floor(x / CS), 0, GW - 1);
    const s = cell(x0, y0), goalFree = !blocked(x1, y1);
    let g = cell(x1, y1);
    if (!G[g]){
      let best = -1, bd = 1e9; const gi0 = g % GW, gj0 = (g / GW) | 0;
      for (let r = 1; r < 40 && best < 0; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++){ if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = gi0 + di, j = gj0 + dj; if (i < 0 || j < 0 || i >= GW || j >= GH) continue; const k = j * GW + i; if (G[k]){ const d = Math.hypot(di, dj); if (d < bd){ bd = d; best = k; } } }
      if (best < 0) return null; g = best;
    }
    const gi = g % GW, gj = (g / GW) | 0, h = k => Math.hypot(k % GW - gi, ((k / GW) | 0) - gj);
    const cost = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N), heap = [];
    const push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i){ const q = (i - 1) >> 1; if (heap[q][0] <= heap[i][0]) break; [heap[q], heap[i]] = [heap[i], heap[q]]; i = q; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length){ heap[0] = last; let i = 0; for (;;){ const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top[1]; };
    const ok = k => G[k] || k === g || k === s;
    cost[s] = 0; push(s, h(s)); let iter = 0;
    while (heap.length && iter++ < 90000){
      const k = pop(); if (closed[k]) continue; closed[k] = 1;
      if (k === g) break;
      const i = k % GW, j = (k / GW) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++){
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
        const nk = nj * GW + ni;
        if (closed[nk] || !ok(nk)) continue;
        if (di && dj && (!ok(j * GW + ni) || !ok(nj * GW + i))) continue;
        const nc = cost[k] + (di && dj ? 1.414 : 1);
        if (nc < cost[nk]){ cost[nk] = nc; from[nk] = k; push(nk, nc + h(nk)); }
      }
    }
    if (g !== s && from[g] < 0) return null;
    const cells = []; for (let k = g; k !== s && k >= 0; k = from[k]) cells.push(k);
    cells.reverse();
    const pts = cells.map(k => ({ x: (k % GW) * CS + CS / 2, y: ((k / GW) | 0) * CS + CS / 2 }));
    if (goalFree){ if (pts.length) pts[pts.length - 1] = { x: x1, y: y1 }; else pts.push({ x: x1, y: y1 }); }
    const out = []; let cx = x0, cy = y0, k = 0;
    while (k < pts.length){ let far = k; for (let m = Math.min(pts.length - 1, k + 40); m > k; m--) if (clearLine(cx, cy, pts[m].x, pts[m].y)){ far = m; break; } out.push(pts[far]); cx = pts[far].x; cy = pts[far].y; k = far + 1; }
    out.stop = !goalFree;
    return out;
  }

  /* ----- nghe theo phòng ----- */
  const LINKS = new Set();
  GAPS.filter(g => g.kind === 'open').forEach(g => { const m = (g.a0 + g.a1) / 2, a = g.v ? zoneAt(g.at - 50, m) : zoneAt(m, g.at - 50), b = g.v ? zoneAt(g.at + 50, m) : zoneAt(m, g.at + FACE + 50); if (a !== b){ LINKS.add(a + '|' + b); LINKS.add(b + '|' + a); } });
  MAP.links.forEach(([a, b]) => { const i = MAP.ZI[a], j = MAP.ZI[b]; LINKS.add(i + '|' + j); LINKS.add(j + '|' + i); });
  function los(x0, y0, x1, y1){ const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 10); for (let k = 1; k < n; k++){ const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; if (WALLM[Math.floor(y / MC) * MW + Math.floor(x / MC)]) return false; } return true; }
  function hearVol(ax, ay, za, bx, by, zb){
    const d = Math.hypot(ax - bx, ay - by); if (d > HEAR_MAX) return 0;
    const f = d <= HEAR_FULL ? 1 : 1 - (d - HEAR_FULL) / (HEAR_MAX - HEAR_FULL);
    if (za === zb) return f;
    if (LINKS.has(za + '|' + zb) && los(ax, ay - 20, bx, by - 20)) return f * .85;
    return 0;
  }
  const hearFrom = (x, y) => self ? hearVol(self.x, self.y, self.zs, x, y, zoneAt(x, y)) : 0;

  /* ----- khoá phòng ----- */
  function occupied(room){ if (self && inRoom(self.zs, room)) return true; for (const p of peers.values()) if (Date.now() - p.seen < 45000 && inRoom(p.zs, room)) return true; return false; }
  function lockOn(room){ const s = locks[room]; if (!s || !s.locked) return false; if (Date.now() > Math.min(+s.until || 0, (+s.at || 0) + LOCK_MS)) return false; return occupied(room); }
  function toggleLock(room){
    if (!inside || !self) return;
    if (!inRoom(self.zs, room)){ toast('Phải ở trong phòng mới khoá/mở khoá được.', true); return; }
    const on = lockOn(room), at = Date.now();
    locks[room] = on ? { locked: false, at, by: self.name } : { locked: true, at, until: at + LOCK_MS, by: self.name };
    pub(T_LOCK + room, locks[room], true); ui();
    toast(on ? 'Đã mở khoá phòng 🔓' : 'Đã khoá phòng 🔒 Người bên ngoài không vào được và không nghe thấy tiếng trong phòng.');
    pub(T_CHAT, { id: me, text: on ? 'đã mở khoá phòng 🔓' : 'đã khoá phòng 🔒' }); self.bubble = on ? 'đã mở khoá phòng 🔓' : 'đã khoá phòng 🔒'; self.bubbleUntil = clock + 4;
  }
  function onLock(room, d){
    if (!LOCKABLE.has(room)) return;
    if (!d){ delete locks[room]; return; }
    const at = +d.at || 0; if (at > Date.now() + 60000 || (locks[room] && at < (+locks[room].at || 0))) return;
    locks[room] = { locked: !!d.locked, at, until: +d.until || 0, by: cleanName(d.by) };
  }
  // khoá "bỏ quên" (không còn ai trong phòng) thì tự mở
  const emptySince = {};
  setInterval(() => {
    if (!inside || Date.now() - enteredAt < 10000) return;
    for (const room in locks){ const s = locks[room]; if (!s.locked){ delete emptySince[room]; continue; }
      if (occupied(room)){ delete emptySince[room]; continue; }
      emptySince[room] = emptySince[room] || Date.now();
      if (Date.now() - emptySince[room] > 8000){ locks[room] = { locked: false, at: Date.now(), by: '' }; pub(T_LOCK + room, locks[room], true); delete emptySince[room]; } }
  }, 3000);
  function knock(room){ pub(T_FX, { from: me, id: 'knock:' + room, dur: 3000, at: Date.now(), data: { room, by: self ? self.name : '' } }); toast('Cốc cốc… đã gõ cửa 🚪'); }

  /* ----- nhân vật ----- */
  function drawHat(g, hat, x, y){
    g.lineJoin = 'round';
    switch (hat){
      case 'top': g.fillStyle = '#1a1416'; g.beginPath(); g.ellipse(x, y + 4, 24, 7, 0, 0, 7); g.fill(); g.fillRect(x - 15, y - 26, 30, 30); g.fillStyle = '#c0392b'; g.fillRect(x - 15, y - 4, 30, 6); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(x - 12, y - 24, 5, 20); break;
      case 'beret': g.fillStyle = '#c0392b'; g.beginPath(); g.ellipse(x + 3, y - 2, 25, 11, -.15, 0, 7); g.fill(); g.fillStyle = '#8a2218'; g.fillRect(x + 2, y - 16, 3, 7); break;
      case 'crown': g.fillStyle = '#f5c542'; g.beginPath(); g.moveTo(x - 18, y + 4); g.lineTo(x - 20, y - 16); g.lineTo(x - 9, y - 6); g.lineTo(x, y - 20); g.lineTo(x + 9, y - 6); g.lineTo(x + 20, y - 16); g.lineTo(x + 18, y + 4); g.closePath(); g.fill(); g.strokeStyle = '#b8862b'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#e03a5a'; g.beginPath(); g.arc(x, y - 3, 3.4, 0, 7); g.fill(); break;
      case 'cowboy': g.fillStyle = '#8a5a2a'; g.beginPath(); g.ellipse(x, y + 3, 32, 9, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - 16, y + 2); g.quadraticCurveTo(x - 16, y - 22, x, y - 18); g.quadraticCurveTo(x + 16, y - 22, x + 16, y + 2); g.fill(); g.fillStyle = '#4a2a12'; g.fillRect(x - 16, y - 4, 32, 4); break;
      case 'phones': g.strokeStyle = '#2a2a30'; g.lineWidth = 5; g.beginPath(); g.arc(x, y + 14, 25, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); g.fillStyle = '#ff5a8a'; rr(g, x - 30, y + 8, 11, 20, 5); g.fill(); rr(g, x + 19, y + 8, 11, 20, 5); g.fill(); break;
      case 'party': g.fillStyle = '#4dabf7'; g.beginPath(); g.moveTo(x - 14, y + 4); g.lineTo(x + 2, y - 30); g.lineTo(x + 16, y + 4); g.closePath(); g.fill(); g.fillStyle = '#ffd43b'; [[x - 6, y - 4], [x + 4, y - 14], [x + 8, y - 2]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 3, 0, 7); g.fill(); }); g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(x + 2, y - 31, 5, 0, 7); g.fill(); break;
      case 'flower': for (let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; g.fillStyle = '#ffb3d1'; g.beginPath(); g.arc(x + 14 + Math.cos(a) * 7, y + 2 + Math.sin(a) * 7, 6, 0, 7); g.fill(); } g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(x + 14, y + 2, 4.5, 0, 7); g.fill(); break;
    }
  }
  // kiểu chỗ: 'lie' nằm, 'sit' ngồi quay ra, 'back' ngồi quay lưng, 'tub' ngâm bồn, 'swim' bơi
  const pose = p => {
    const s = p.seat >= 0 ? SEATS[p.seat] : null;
    if (!s) return { x: p.x, y: p.y, lying: false, mode: 'stand' };
    const mode = s.pose || 'lie';
    return { x: s.x, y: mode === 'lie' ? s.y + 34 : s.y, lying: true, mode, face: s.face };
  };
  const seatZ = i => { const s = SEATS[i]; return s.z != null ? s.z : (s.pose || 'lie') === 'lie' ? s.y + .5 : s.y; };
  function drawBody(g, p, t){
    const P = pose(p), x = P.x, y = P.y, walking = p.moving && !P.lying, f = P.face || p.face || 1, back = P.mode === 'back', swim = P.mode === 'swim';
    const bob = walking ? Math.abs(Math.sin(t * 13 + p.ph)) * -4 : Math.sin(t * (P.lying ? 1.2 : 2) + p.ph) * (swim ? 3 : 1.2);
    g.save(); g.globalAlpha = p.away ? .45 : 1;
    const by = y - 34 + bob;
    if (swim){ g.beginPath(); g.rect(x - 70, by - 120, 140, 128); g.clip(); }
    if (p.speaking > .05 && !p.away && !swim){ const r = 30 + p.speaking * 14; g.strokeStyle = `rgba(91,227,138,${.35 + p.speaking * .5})`; g.lineWidth = 4; g.beginPath(); g.ellipse(x, P.mode === 'lie' ? y - 34 : y, r, r * (P.mode === 'lie' ? .8 : .38), 0, 0, 7); g.stroke(); }
    if (P.mode === 'sit'){ g.fillStyle = '#e8902a'; g.beginPath(); g.ellipse(x - 11, y + 2, 9, 5, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 11, y + 2, 9, 5, 0, 0, 7); g.fill(); }
    if (!P.lying){
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y, 26, 9, 0, 0, 7); g.fill();
      const st = walking ? Math.sin(t * 13 + p.ph) * 5 : 0;
      g.fillStyle = '#e8902a'; g.beginPath(); g.ellipse(x - 10, y - 3 + st * .3, 9, 5, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 10, y - 3 - st * .3, 9, 5, 0, 0, 7); g.fill();
    }
    g.fillStyle = p.col; g.beginPath(); g.ellipse(x, by, 25, 30, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.stroke();
    if (back){
      g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(x, by + 6, 17, 20, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(x + 10, by - 14, 6, 9, .4, 0, 7); g.fill();
      g.fillStyle = p.col; g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2;
      g.save(); g.translate(x - 22, by + 4); g.rotate(-.25); g.beginPath(); g.ellipse(0, 6, 6, 11, 0, 0, 7); g.fill(); g.stroke(); g.restore();
      g.save(); g.translate(x + 22, by + 4); g.rotate(.25); g.beginPath(); g.ellipse(0, 6, 6, 11, 0, 0, 7); g.fill(); g.stroke(); g.restore();
      drawHat(g, p.hat, x, by - 28); g.restore(); return;
    }
    g.fillStyle = 'rgba(255,255,255,.32)'; g.beginPath(); g.ellipse(x + f * 3, by + 8, 15, 16, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x - f * 10, by - 16, 6, 9, -.4 * f, 0, 7); g.fill();
    const sleepy = (P.mode === 'lie' && Math.sin(t * .35 + p.ph) > .55) || (P.mode === 'tub' && Math.sin(t * .5 + p.ph) > .2);
    const blink = sleepy || Math.sin(t * .9 + p.ph * 3) > .985;
    const ex = x + f * 6;
    [-9, 9].forEach(dx => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex + dx, by - 6, 6, blink ? 1.2 : 7.5, 0, 0, 7); g.fill(); if (!blink){ g.fillStyle = '#1a1416'; g.beginPath(); g.arc(ex + dx + f * 2, by - 5, 3.4, 0, 7); g.fill(); } });
    g.fillStyle = 'rgba(255,110,140,.45)'; g.beginPath(); g.ellipse(ex - 15, by + 5, 5, 3, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(ex + 15, by + 5, 5, 3, 0, 0, 7); g.fill();
    g.fillStyle = p.col; g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2;
    const wave = p.speaking > .2 || swim ? Math.sin(t * (swim ? 4 : 10)) * .5 : 0;
    g.save(); g.translate(x - 23, by + 6); g.rotate(.5 + wave); g.beginPath(); g.ellipse(0, 6, 6, 11, 0, 0, 7); g.fill(); g.stroke(); g.restore();
    g.save(); g.translate(x + 23, by + 6); g.rotate(-.5 - (swim ? wave : 0)); g.beginPath(); g.ellipse(0, 6, 6, 11, 0, 0, 7); g.fill(); g.stroke(); g.restore();
    drawHat(g, p.hat, x, by - 28);
    g.restore();
    if (swim){ g.save(); g.globalAlpha = p.away ? .45 : 1; g.fillStyle = 'rgba(90,190,230,.55)'; g.beginPath(); g.ellipse(x, by + 8, 36, 11, 0, 0, 7); g.fill(); for (let i = 0; i < 2; i++){ const r = ((t * 18 + i * 14 + p.ph * 5) % 28); g.strokeStyle = `rgba(255,255,255,${.6 * (1 - r / 28)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(x, by + 8, 30 + r, 9 + r * .3, 0, 0, 7); g.stroke(); } g.restore(); }
  }
  function drawLabel(g, p, t, isSelf){
    const P = pose(p), x = P.x, y = P.y, ny = y - (P.mode === 'swim' ? 76 : 86);
    g.save(); g.globalAlpha = p.away ? .6 : 1;
    g.font = '700 17px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(p.name, x, ny); g.fillStyle = isSelf ? '#ffe066' : '#ffffff'; g.fillText(p.name, x, ny);
    const nw = g.measureText(p.name).width;
    if (!isSelf && inside){ const audible = (p.vol || 0) > .02, m = linkMode(p.id), dx = x - nw / 2 - 11, dy = ny - 6; g.fillStyle = !audible ? 'rgba(160,160,170,.8)' : m === 'p2p' ? '#5be38a' : m === 'relay' ? '#ffb84d' : `rgba(200,200,200,${.4 + .4 * Math.sin(t * 6)})`; g.beginPath(); g.arc(dx, dy, 4.5, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.5; g.stroke(); }
    if (!p.mic){ const mx = x + nw / 2 + 12, my = ny - 6; g.fillStyle = '#ff5a5a'; g.beginPath(); g.arc(mx, my, 8, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(mx - 1.5, my - 4); g.lineTo(mx - 1.5, my + 1); g.moveTo(mx + 1.5, my - 4); g.lineTo(mx + 1.5, my + 1); g.moveTo(mx - 4, my - 4); g.lineTo(mx + 4, my + 4); g.stroke(); }
    if (p.away){ g.fillStyle = '#cdb79a'; g.font = '700 14px Fredoka, sans-serif'; g.fillText('zZ · vắng mặt', x, ny - 20); }
    g.restore();
    if (p.bubble && t < p.bubbleUntil){
      g.font = '500 16px Fredoka, sans-serif';
      const words = p.bubble.split(' '), lines = []; let cur = '';
      words.forEach(w => { const tryL = cur ? cur + ' ' + w : w; if (g.measureText(tryL).width > 200 && cur){ lines.push(cur); cur = w; } else cur = tryL; });
      if (cur) lines.push(cur);
      const L = lines.slice(0, 4), bw = Math.max(...L.map(l => g.measureText(l).width)) + 22, bh = L.length * 20 + 12;
      const bx = x - bw / 2, byy = ny - (p.away ? 26 : 12) - bh - 10;
      g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, bx + 2, byy + 3, bw, bh, 10); g.fill();
      g.fillStyle = '#fffaf0'; rr(g, bx, byy, bw, bh, 10); g.fill();
      g.beginPath(); g.moveTo(x - 7, byy + bh); g.lineTo(x, byy + bh + 9); g.lineTo(x + 7, byy + bh); g.fill();
      g.fillStyle = '#2a1a12'; g.textAlign = 'center'; L.forEach((l, i) => g.fillText(l, x, byy + 22 + i * 20));
    }
  }

  /* ================= MẠNG (MQTT) ================= */
  const T_P = PREFIX + '/p/', T_MOVE = PREFIX + '/m', T_CHAT = PREFIX + '/c', T_SIG = PREFIX + '/s/', T_BYE = PREFIX + '/bye', T_X = PREFIX + '/x', T_FX = PREFIX + '/fx', T_LOCK = PREFIX + '/lock/', T_AUD = PREFIX + '/a';
  const clients = []; const seen = new Map();
  let connectedCount = 0, enteredAt = 0;
  function pub(topic, obj, retain){
    const payload = obj === null ? '' : JSON.stringify(Object.assign({}, obj, { k: rid(8) }));
    clients.forEach(c => { if (c.connected) c.publish(topic, payload, { qos: 0, retain: !!retain }); });
  }
  function onMsg(topic, buf){
    if (topic === T_AUD) return onAudio(buf);
    const str = buf && buf.length ? buf.toString() : '';
    let d = null;
    if (str){ try { d = JSON.parse(str); } catch (e) { return; } if (!d || typeof d !== 'object') return;
      if (d.k){ if (seen.has(d.k)) return; seen.set(d.k, Date.now()); if (seen.size > 800){ const cut = Date.now() - 60000; for (const [k, v] of seen) if (v < cut) seen.delete(k); } } }
    if (topic === T_X) return onExtras(d);
    if (topic.startsWith(T_LOCK)) return onLock(topic.slice(T_LOCK.length), d);
    if (topic.startsWith(T_P)) return onPresence(topic.slice(T_P.length), d);
    if (topic === T_MOVE) return d && onMove(d);
    if (topic === T_CHAT) return d && onChat(d);
    if (topic === T_FX) return d && onFx(d);
    if (topic === T_BYE) return d && dropPeer(String(d.id));
    if (topic === T_SIG + me) return d && onSignal(d);
  }
  function connectNet(){
    if (!window.mqtt){ netDown('không tải được thư viện kết nối'); return; }
    BROKERS.forEach((url, i) => {
      let c;
      try { c = mqtt.connect(url, { clientId: 'anrevymap_' + me + '_' + i + rid(3), clean: true, keepalive: 30, reconnectPeriod: 5000, connectTimeout: 12000, will: { topic: T_P + me, payload: '', qos: 0, retain: true } }); }
      catch (e) { return; }
      c.on('connect', () => {
        c.subscribe([T_X, T_P + '+', T_MOVE, T_CHAT, T_FX, T_BYE, T_SIG + me, T_LOCK + '+'], { qos: 0 });
        if (inside) c.subscribe(T_AUD, { qos: 0 });
        connectedCount = clients.filter(x => x.connected).length;
        if (inside) publishPresence();
        ui();
      });
      c.on('message', onMsg);
      c.on('close', () => { connectedCount = clients.filter(x => x.connected).length; ui(); });
      c.on('error', () => {});
      clients.push(c);
    });
    setTimeout(() => { if (!connectedCount) netDown('chưa kết nối được máy chủ, đang thử lại…'); }, 12000);
  }
  let netNote = '';
  function netDown(msg){ netNote = msg; ui(); }
  function onExtras(d){
    if (!d) return;
    if ((+d.at || 0) < (+extras.at || 0) || (+d.at || 0) > Date.now() + 60000) return;
    extras = Object.assign({}, d); delete extras.k;
  }
  function setExtras(patch){ extras = Object.assign({}, extras, patch, { at: Date.now(), by: self ? self.name : '' }); pub(T_X, extras, true); }
  function onPresence(id, d){
    if (!/^[a-z0-9]{10}$/.test(id) || id === me) return;
    if (!d){ const p = peers.get(id); if (p) p.lwt = Date.now(); return; }
    if (Date.now() - (+d.t || 0) > 60000) return;
    let p = peers.get(id);
    const fresh = !p;
    if (!p){ p = { id, x: +d.x || SPAWN.x, y: +d.y || SPAWN.y, tx: +d.x || SPAWN.x, ty: +d.y || SPAWN.y, ph: Math.random() * 6, face: 1, speaking: 0, seat: -1, joinT: Date.now(), vol: 0 }; peers.set(id, p); }
    if (typeof d.pk === 'string' && d.pk.length < 200 && d.pk !== p.pk){ p.pk = d.pk; if (inside) sendKey(id); }
    p.name = cleanName(d.name) || 'khách'; p.col = COLORS.includes(d.col) ? d.col : COLORS[0]; p.hat = HATS.includes(d.hat) ? d.hat : 'none';
    p.mic = !!d.mic; p.away = !!d.away; p.seen = Date.now(); p.lwt = 0;
    const seat = Number.isInteger(d.seat) && d.seat >= 0 && d.seat < SEATS.length ? d.seat : -1;
    if (seat !== p.seat){ p.seat = seat; if (seat < 0 && d.x != null){ p.x = clamp(+d.x, 0, W); p.y = clamp(+d.y, 0, H); } }
    if (!p.moving && d.x != null){ p.tx = clamp(+d.x, 0, W); p.ty = clamp(+d.y, 0, H); }
    trackZone(p);
    if (fresh){ if (inside){ toast(p.name + ' vừa vào Lounge Map'); ensurePeer(id); (early[id] || []).splice(0).forEach(onSignal); } ui(); }
    if (self && self.seat >= 0 && p.seat === self.seat && p.id < me) bumpSeat();
  }
  function onMove(d){
    const p = peers.get(String(d.id)); if (!p) return;
    const x = clamp(+d.x, 0, W), y = clamp(+d.y, 0, H);
    if (Math.hypot(p.x - x, p.y - y) > 200){ p.x = x; p.y = y; }
    p.tx = clamp(+d.tx, 0, W); p.ty = clamp(+d.ty, 0, H); p.direct = !!d.d; p.seen = Date.now();
    if (p.seat >= 0 && !d.st) p.seat = -1;
  }
  function onChat(d){
    const p = String(d.id) === me ? self : peers.get(String(d.id)); if (!p) return;
    p.bubble = cleanText(d.text); p.bubbleUntil = clock + 7;
  }
  function onFx(d){
    if (String(d.from) === me) return;
    MAP.onFx(d);
    if (typeof d.id === 'string' && d.id.startsWith('knock:') && self){ const room = d.id.slice(6); if (inRoom(self.zs, room)){ toast('🚪 ' + (cleanName(d.data && d.data.by) || 'Ai đó') + ' đang gõ cửa phòng'); const dr = LOCKDOORS.find(x => x.owner === room); sound('knock', dr ? dr.cx : self.x, dr ? dr.cy : self.y, true); } }
  }
  function dropPeer(id){
    if (!peers.has(id)) return;
    const p = peers.get(id); peers.delete(id); closePeer(id); peerKey.delete(id); sentKey.delete(id); rx.delete(id);
    if (inside) toast(p.name + ' đã rời Lounge Map');
    ui();
  }
  function publishPresence(){
    if (!inside || !self) return;
    pub(T_P + me, { id: me, name: self.name, col: self.col, hat: self.hat, x: Math.round(self.x), y: Math.round(self.y), mic: self.mic, away: self.away, seat: self.seat, pk: myPub, t: Date.now() }, true);
  }
  setInterval(() => { if (inside) publishPresence(); }, 12000);
  setInterval(() => { const now = Date.now(); for (const [id, p] of peers) if (p.seen < now - 45000 || (p.lwt && now - p.lwt > 15000)) dropPeer(id); }, 3000);

  /* ================= CHỖ NGỒI / NẰM ================= */
  const seatTaken = i => [...peers.values()].some(p => p.seat === i && Date.now() - p.seen < 45000);
  const sameGroup = (i, k) => (SEATS[i].g || '') === (SEATS[k].g || '');
  function claimSeat(group){
    if (!self || !SEATS.length) return;
    const inG = i => !group || SEATS[i].g === group;
    if (self.seat >= 0){ if (inG(self.seat)) return; standUp(); }
    const free = SEATS.map((s, i) => i).filter(i => inG(i) && !seatTaken(i));
    if (!free.length){ toast('Chỗ này có người rồi.', true); return; }
    free.sort((a, b) => Math.hypot(SEATS[a].ax - self.x, SEATS[a].ay - self.y) - Math.hypot(SEATS[b].ax - self.x, SEATS[b].ay - self.y));
    seatPending = free[0]; actPending = null; self.direct = false;
    goTo(SEATS[seatPending].ax, SEATS[seatPending].ay);
  }
  function sitDown(i){
    if (seatTaken(i)){ const other = SEATS.map((s, k) => k).find(k => k !== i && sameGroup(i, k) && !seatTaken(k)); if (other === undefined){ toast('Chỗ này có người rồi.', true); return; } i = other; }
    self.seat = i; self.x = SEATS[i].ax; self.y = SEATS[i].ay; self.tx = self.x; self.ty = self.y; self.moving = false; self.path = null;
    publishPresence(); sendMove(true);
    MAP.onSeat(i);
  }
  function standUp(){ if (!self || self.seat < 0) return; const i = self.seat, s = SEATS[i]; self.seat = -1; self.x = s.ax; self.y = s.ay; self.tx = self.x; self.ty = self.y; publishPresence(); sendMove(); MAP.onStand(i); }
  function bumpSeat(){ const i = self.seat; standUp(); const other = SEATS.map((s, k) => k).find(k => k !== i && sameGroup(i, k) && !seatTaken(k)); if (other !== undefined) sitDown(other); else toast('Chỗ này có người rồi.', true); }
  const occupant = i => (self && self.seat === i) ? self : [...peers.values()].find(p => p.seat === i && Date.now() - p.seen < 45000) || null;
  function approach(x, y, fn, r = 70){
    if (!self) return;
    if (self.seat >= 0) standUp();
    seatPending = -1; self.direct = false;
    if (Math.hypot(self.x - x, self.y - y) <= r){ actPending = null; fn(); return; }
    actPending = { x, y, fn, r, until: clock + 14 };
    goTo(x, y);
  }
  function goTo(x, y){ if (self.seat >= 0) standUp(); self.tx = clamp(x, BOUND.x0, BOUND.x1); self.ty = clamp(y, BOUND.y0, BOUND.y1); self.ptx = undefined; marker = { x: self.tx, y: self.ty, t: clock }; sendMove(); }

  /* ================= GỌI THOẠI (WebRTC) ================= */
  let localStream = null, actx = null, localAn = null;
  const pcs = new Map();
  const early = {};
  const dbg = [];
  const note_ = (...a) => { dbg.push(Math.round(performance.now()) + ' ' + a.join(' ')); if (dbg.length > 200) dbg.shift(); };
  function sig(to, data){ const st = pcs.get(to); pub(T_SIG + to, { from: me, sid: st ? st.sid : '', d: data }); }
  function analyser(stream){ if (!actx) return null; try { const src = actx.createMediaStreamSource(stream); const an = actx.createAnalyser(); an.fftSize = 512; src.connect(an); return { an, buf: new Uint8Array(an.fftSize) }; } catch (e) { return null; } }
  const level = a => { if (!a) return 0; a.an.getByteTimeDomainData(a.buf); let s = 0; for (let i = 0; i < a.buf.length; i++){ const v = (a.buf[i] - 128) / 128; s += v * v; } return Math.sqrt(s / a.buf.length); };
  const micTrack = () => localStream ? localStream.getAudioTracks()[0] || null : null;
  function ensurePeer(id){
    if (!inside || pcs.has(id) || id === me) return pcs.get(id);
    if (pcs.size >= MAX_PEOPLE - 1) return null;
    const pc = new RTCPeerConnection(qs.get('nop2p') ? { iceServers: [], iceTransportPolicy: 'relay' } : { iceServers: ICE });
    const st = { pc, sid: rid(6), rsid: '', init: me < id, pending: [], audio: null, t0: Date.now(), sender: null, sending: true };
    pcs.set(id, st);
    if (localStream) localStream.getTracks().forEach(tr => { st.sender = pc.addTrack(tr, localStream); });
    else pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.onicecandidate = e => { if (e.candidate) sig(id, { ice: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    pc.onnegotiationneeded = async () => { if (!st.init) return; try { await pc.setLocalDescription(await pc.createOffer()); sig(id, { sdp: pc.localDescription.toJSON ? pc.localDescription.toJSON() : pc.localDescription }); } catch (e) { note_('nego-err', id, e.message); } };
    pc.ontrack = e => {
      const stream = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]);
      if (!st.audio){ st.audio = pool.pop() || document.createElement('audio'); st.audio.autoplay = true; st.audio.setAttribute('playsinline', ''); if (!st.audio.parentNode) $('#audios').appendChild(st.audio); }
      const p = peers.get(id), v = p ? p.vol || 0 : 0;
      st.audio.muted = v < .03; try { st.audio.volume = clamp(v, 0, 1); } catch (er) {}
      st.audio.srcObject = stream;
      const pr = st.audio.play(); if (pr && pr.catch) pr.catch(() => $('#tapAudio').classList.add('on'));
      st.receiver = e.receiver;
    };
    pc.onconnectionstatechange = () => { note_('conn', id, pc.connectionState); if (pc.connectionState === 'failed' && st.init){ try { pc.restartIce(); } catch (e) {} } };
    return st;
  }
  async function onSignal(m){
    const from = String(m.from || ''); if (!inside || !/^[a-z0-9]{10}$/.test(from) || !(m.d || m.kx)) return;
    if (!peers.has(from)){ (early[from] = early[from] || []).push(m); setTimeout(() => { delete early[from]; }, 8000); return; }
    if (m.kx) return onKey(from, m.kx);
    let st = ensurePeer(from); if (!st) return;
    const rs = String(m.sid || '');
    if (st.rsid && rs && rs !== st.rsid){ closePeer(from); st = ensurePeer(from); if (!st) return; }
    if (rs) st.rsid = rs;
    const pc = st.pc, d = m.d;
    try {
      if (d.sdp){
        if (d.sdp.type === 'offer'){
          if (st.init) return;
          await pc.setRemoteDescription(d.sdp);
          for (const c of st.pending.splice(0)) { try { await pc.addIceCandidate(c); } catch (e) {} }
          await pc.setLocalDescription(await pc.createAnswer()); sig(from, { sdp: pc.localDescription.toJSON ? pc.localDescription.toJSON() : pc.localDescription });
        } else {
          if (pc.signalingState !== 'have-local-offer') return;
          await pc.setRemoteDescription(d.sdp);
          for (const c of st.pending.splice(0)) { try { await pc.addIceCandidate(c); } catch (e) {} }
        }
      } else if (d.ice){ if (!pc.remoteDescription) st.pending.push(d.ice); else { try { await pc.addIceCandidate(d.ice); } catch (e) {} } }
    } catch (e) { note_('sig-err', from, e.message); }
  }
  const retries = {};
  setInterval(() => {
    if (!inside) return;
    pcs.forEach((st, id) => { const cs = st.pc.connectionState; if (cs === 'connected' || !peers.has(id)) return; const age = Date.now() - st.t0, limit = st.init ? 12000 : 20000; if (age > limit && (retries[id] || 0) < 4){ retries[id] = (retries[id] || 0) + 1; closePeer(id); ensurePeer(id); } });
  }, 4000);
  function closePeer(id){ const st = pcs.get(id); if (!st) return; pcs.delete(id); try { st.pc.close(); } catch (e) {} if (st.audio){ st.audio.srcObject = null; pool.push(st.audio); } }

  /* ----- âm lượng theo phòng: chỉ gửi/nhận tiếng với người cùng phòng ----- */
  function hearTick(){
    if (!inside || !self) return;
    const tr = micTrack();
    peers.forEach(p => {
      p.vol = hearVol(self.x, self.y, self.zs, p.x, p.y, p.zs);
      const st = pcs.get(p.id);
      if (st){
        if (st.audio){ st.audio.muted = p.vol < .03; try { st.audio.volume = clamp(p.vol, 0, 1); } catch (e) {} }
        const want = p.vol > 0 && !!tr;
        if (st.sender && st.sending !== want){ st.sending = want; st.sender.replaceTrack(want ? tr : null).catch(() => { st.sending = !want; }); }
      }
      const r = rx.get(p.id); if (r) r.g.gain.value = p.vol;
    });
  }
  setInterval(hearTick, 250);

  /* ================= TIẾNG ĐI VÒNG QUA MÁY CHỦ ================= */
  const RATE = 12000, FRAME = 720;
  const b64 = u => btoa(String.fromCharCode(...u));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  let kp = null, myPub = '', audKey = null, audKeyRaw = null;
  const peerKey = new Map(), sentKey = new Map();
  async function cryptoInit(){ if (kp || !crypto.subtle) return; try { kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']); myPub = b64(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))); audKeyRaw = crypto.getRandomValues(new Uint8Array(16)); audKey = await crypto.subtle.importKey('raw', audKeyRaw, 'AES-GCM', false, ['encrypt']); } catch (e) { kp = null; } }
  async function pairKey(pk){ const pubk = await crypto.subtle.importKey('raw', unb64(pk), { name: 'ECDH', namedCurve: 'P-256' }, false, []); return crypto.subtle.deriveKey({ name: 'ECDH', public: pubk }, kp.privateKey, { name: 'AES-GCM', length: 128 }, false, ['encrypt', 'decrypt']); }
  async function sendKey(id){ const p = peers.get(id); if (!inside || !p || !p.pk || !kp || sentKey.get(id) === p.pk) return; sentKey.set(id, p.pk); try { const k = await pairKey(p.pk), iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, audKeyRaw)); pub(T_SIG + id, { from: me, kx: b64(iv) + '.' + b64(ct) }); } catch (e) { sentKey.delete(id); } }
  async function onKey(from, kx){ const p = peers.get(from); if (!p || !p.pk || !kp) return; try { const [a, b] = String(kx).split('.'); const k = await pairKey(p.pk); const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(a) }, k, unb64(b)); peerKey.set(from, await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt'])); } catch (e) {} }
  function needRelay(id){ const p = peers.get(id); if (!p || Date.now() - p.seen > 45000) return false; const st = pcs.get(id), cs = st ? st.pc.connectionState : 'none'; if (cs === 'connected') return false; return Date.now() - p.joinT > 7000 || cs === 'failed'; }
  const linkMode = id => { const st = pcs.get(id); if (st && st.pc.connectionState === 'connected') return 'p2p'; return needRelay(id) ? 'relay' : 'wait'; };
  const STEP = [7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767];
  const IDXT = [-1,-1,-1,-1,2,4,6,8,-1,-1,-1,-1,2,4,6,8];
  let encIdx = 0;
  function adpcmEncode(f32){ const out = new Uint8Array(3 + f32.length / 2); let pred = Math.max(-32768, Math.min(32767, Math.round(f32[0] * 32767))), idx = encIdx; out[0] = pred & 255; out[1] = (pred >> 8) & 255; out[2] = idx;
    for (let i = 0; i < f32.length; i++){ const s = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767))); let step = STEP[idx], d = s - pred, code = 0; if (d < 0){ code = 8; d = -d; } let delta = step >> 3; if (d >= step){ code |= 4; d -= step; delta += step; } step >>= 1; if (d >= step){ code |= 2; d -= step; delta += step; } step >>= 1; if (d >= step){ code |= 1; delta += step; } pred += (code & 8) ? -delta : delta; pred = Math.max(-32768, Math.min(32767, pred)); idx = Math.max(0, Math.min(88, idx + IDXT[code])); if (i & 1) out[3 + (i >> 1)] |= code << 4; else out[3 + (i >> 1)] = code; }
    encIdx = idx; return out; }
  function adpcmDecode(u){ let pred = (u[0] | (u[1] << 8)); if (pred > 32767) pred -= 65536; let idx = Math.min(88, u[2]); const n = (u.length - 3) * 2, out = new Float32Array(n);
    for (let i = 0; i < n; i++){ const code = i & 1 ? u[3 + (i >> 1)] >> 4 : u[3 + (i >> 1)] & 15; const step = STEP[idx]; let delta = step >> 3; if (code & 4) delta += step; if (code & 2) delta += step >> 1; if (code & 1) delta += step >> 2; pred += (code & 8) ? -delta : delta; pred = Math.max(-32768, Math.min(32767, pred)); idx = Math.max(0, Math.min(88, idx + IDXT[code])); out[i] = pred / 32768; }
    return out; }
  let proc = null, procSrc = null, lpf = 0, rsPos = 0, accN = 0, seq = 0, vadHang = 0, echoLvl = 0;
  const acc = new Float32Array(FRAME);
  function startCapture(){ if (!actx || !localStream || proc) return; try { procSrc = actx.createMediaStreamSource(localStream); proc = actx.createScriptProcessor(2048, 1, 1); const sink = actx.createGain(); sink.gain.value = 0; procSrc.connect(proc); proc.connect(sink); sink.connect(actx.destination); const ratio = actx.sampleRate / RATE, a = 1 - Math.exp(-2 * Math.PI * 5000 / actx.sampleRate);
    proc.onaudioprocess = e => { const x = e.inputBuffer.getChannelData(0); for (let i = 0; i < x.length; i++){ lpf += (x[i] - lpf) * a; if ((rsPos += 1) >= ratio){ rsPos -= ratio; acc[accN++] = lpf; if (accN === FRAME){ accN = 0; frameOut(acc); } } } }; } catch (e) { proc = null; } }
  function stopCapture(){ try { if (procSrc) procSrc.disconnect(); if (proc){ proc.onaudioprocess = null; proc.disconnect(); } } catch (e) {} proc = null; procSrc = null; }
  async function frameOut(f){
    if (!inside || !self || !self.mic || self.away || !audKey) return;
    let s = 0; for (let i = 0; i < FRAME; i++) s += f[i] * f[i];
    const rms = Math.sqrt(s / FRAME);
    if (rms > Math.max(.012, echoLvl * 1.8)) vadHang = 6; else if (vadHang > 0) vadHang--; else return;
    if (![...peers.values()].some(p => needRelay(p.id) && (p.vol || 0) > 0)) return;
    const plain = adpcmEncode(f), iv = crypto.getRandomValues(new Uint8Array(12)), n = ++seq;
    let ct; try { ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, audKey, plain)); } catch (e) { return; }
    const pkt = new Uint8Array(27 + ct.length);
    pkt[0] = 1; for (let i = 0; i < 10; i++) pkt[1 + i] = me.charCodeAt(i);
    pkt[11] = n >>> 24; pkt[12] = (n >>> 16) & 255; pkt[13] = (n >>> 8) & 255; pkt[14] = n & 255;
    pkt.set(iv, 15); pkt.set(ct, 27);
    clients.forEach(c => { if (c.connected) c.publish(T_AUD, pkt, { qos: 0, retain: false }); });
  }
  const rx = new Map();
  async function onAudio(buf){
    if (!inside || !actx || !buf || buf.length < 40 || buf[0] !== 1) return;
    const from = String.fromCharCode(...buf.subarray(1, 11));
    if (from === me || !needRelay(from)) return;
    const key = peerKey.get(from); if (!key) return;
    const p = peers.get(from); if (!p || (p.vol || 0) <= 0) return;
    const n = ((buf[11] << 24) >>> 0) + (buf[12] << 16) + (buf[13] << 8) + buf[14];
    let r = rx.get(from);
    if (!r){ r = { next: 0, seen: new Set(), g: actx.createGain() }; r.g.connect(actx.destination); rx.set(from, r); }
    r.g.gain.value = p.vol;
    if (r.seen.has(n)) return; r.seen.add(n); if (r.seen.size > 120) r.seen = new Set([...r.seen].slice(-60));
    let plain; try { plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(15, 27) }, key, buf.slice(27))); } catch (e) { return; }
    const pcm = adpcmDecode(plain);
    let s = 0; for (let i = 0; i < pcm.length; i++) s += pcm[i] * pcm[i];
    const lvl = Math.sqrt(s / pcm.length);
    p.relayLvl = Math.max(p.relayLvl || 0, lvl); echoLvl = Math.max(echoLvl, lvl);
    const now = actx.currentTime;
    if (r.next < now + .04) r.next = now + .16;
    if (r.next > now + .9) return;
    const b = actx.createBuffer(1, pcm.length, RATE); b.getChannelData(0).set(pcm);
    const src = actx.createBufferSource(); src.buffer = b; src.connect(r.g); src.start(r.next); r.next += b.duration;
  }
  setInterval(() => { echoLvl *= .7; peers.forEach(p => { if (p.relayLvl) p.relayLvl *= .6; }); }, 100);
  const pool = [];
  function unlockAudio(){ if (!actx) return; let silent = null; try { silent = actx.createMediaStreamDestination().stream; } catch (e) {} while (pool.length < MAX_PEOPLE){ const a = document.createElement('audio'); a.autoplay = true; a.setAttribute('playsinline', ''); if (silent) a.srcObject = silent; $('#audios').appendChild(a); const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); pool.push(a); } }
  document.addEventListener('pointerdown', () => { if (!inside) return; if (actx && actx.state !== 'running') actx.resume(); pcs.forEach(st => { if (st.audio && st.audio.paused) st.audio.play().catch(() => {}); }); }, true);
  $('#tapAudio').addEventListener('click', () => { $('#tapAudio').classList.remove('on'); if (actx) actx.resume(); pcs.forEach(st => st.audio && st.audio.play().catch(() => {})); });

  /* ----- âm thanh nhỏ (đàn, gõ cửa…) chỉ vang tới người ở gần ----- */
  function note(freq, x, y, at, kind){
    if (!actx || !self) return; const v = hearFrom(x, y); if (v <= 0) return;
    const delay = Math.max(0, ((at || Date.now()) - Date.now()) / 1000); if (delay > 8) return;
    const t0 = actx.currentTime + delay, g = actx.createGain(), o = actx.createOscillator(), o2 = actx.createOscillator(), g2 = actx.createGain(), dur = kind === 'harp' ? 1.8 : 1.2;
    o.type = kind === 'harp' ? 'triangle' : 'sine'; o.frequency.value = freq; o2.type = 'sine'; o2.frequency.value = freq * 2; g2.gain.value = kind === 'harp' ? .15 : .3;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.16 * v, t0 + .012); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(actx.destination); o.start(t0); o2.start(t0); o.stop(t0 + dur + .05); o2.stop(t0 + dur + .05);
  }
  function noise(t0, dur, vol, freq){ const n = Math.floor(actx.sampleRate * dur), b = actx.createBuffer(1, n, actx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2); const s = actx.createBufferSource(); s.buffer = b; const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; const g = actx.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(actx.destination); s.start(t0); }
  function sound(kind, x, y, force){
    if (!actx || !self) return; const v = force ? 1 : hearFrom(x, y); if (v <= 0) return; const t = actx.currentTime;
    try {
      if (kind === 'knock') [0, .18, .36].forEach(dt => noise(t + dt, .09, .9 * v, 500));
      else if (kind === 'flush') noise(t, 1.4, .35 * v, 1400);
      else if (kind === 'coin'){ note(1568, x, y, 0, 'harp'); note(2093, x, y, Date.now() + 90, 'harp'); }
      else if (kind === 'dart' || kind === 'clack') noise(t, .05, .8 * v, 3000);
    } catch (e) {}
  }

  /* ================= VÀO / RỜI ================= */
  const gate = $('#gate'), goBtn = $('#goBtn'), gErr = $('#gErr');
  async function enter(){
    gErr.textContent = '';
    if (document.body.classList.contains('portrait')){ gErr.textContent = 'Hãy xoay ngang điện thoại trước nhé.'; return; }
    const name = cleanName($('#name').value);
    if (!name){ gErr.textContent = 'Nhập tên của bạn trước nhé.'; $('#name').focus(); return; }
    prof.name = name; try { localStorage.setItem('lounge-profile', JSON.stringify(prof)); } catch (e) {}
    if (freshPeers().length >= MAX_PEOPLE){ gErr.textContent = 'Lounge Map đã đủ ' + MAX_PEOPLE + ' người, đợi một lát nhé.'; return; }
    goBtn.disabled = true; goBtn.textContent = 'Đang xin quyền micro…';
    try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) { actx = null; }
    unlockAudio();
    await cryptoInit();
    let micOk = false;
    if (!localStream && navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
      try { localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); micOk = true; }
      catch (e) { localStream = null; }
    } else micOk = !!localStream;
    goBtn.disabled = false; goBtn.textContent = 'Vào Lounge Map';
    if (!micOk) toast('Không dùng được micro — bạn vẫn nghe được mọi người và nhắn tin được.', true);
    localAn = localStream ? analyser(localStream) : null;
    startCapture();
    self = { id: me, name, col: prof.col, hat: prof.hat, x: SPAWN.x + Math.round(Math.random() * 60 - 30), y: SPAWN.y, tx: SPAWN.x, ty: SPAWN.y, ph: Math.random() * 6, face: 1, mic: !!localStream, away: false, speaking: 0, moving: false, seat: -1, zs: null };
    trackZone(self);
    inside = true; leaving = false; enteredAt = Date.now(); exitArmed = false; document.body.classList.add('inside');
    clients.forEach(c => { if (c.connected) c.subscribe(T_AUD, { qos: 0 }); });
    goTo(MAP.ENTER_TO.x + Math.round(Math.random() * 80 - 40), MAP.ENTER_TO.y);
    publishPresence();
    freshPeers().forEach(p => { ensurePeer(p.id); sendKey(p.id); });
    micUI(); ui(); musicDuck(); hearTick();
    try { history.pushState({ loungeMap: 1 }, ''); } catch (e) {}
    $('#room').focus({ preventScroll: true });
    toast(connectedCount ? (TOUCH ? 'Đã vào Lounge Map. Kéo nút tròn để đi, chạm vào đồ vật để dùng.' : 'Đã vào Lounge Map. Bấm xuống sàn hoặc dùng phím mũi tên để đi.') : 'Chưa kết nối được máy chủ — bạn đang đi dạo một mình.', !connectedCount);
  }
  function leave(reason){
    if (!inside) return;
    inside = false; document.body.classList.remove('inside');
    pub(T_P + me, null, true); pub(T_BYE, { id: me });
    [...pcs.keys()].forEach(closePeer);
    clients.forEach(c => { if (c.connected) c.unsubscribe(T_AUD); });
    stopCapture(); peerKey.clear(); sentKey.clear(); rx.clear();
    if (localStream){ localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    self = null; seatPending = -1; actPending = null; clearTimeout(awayT); hiddenAt = 0;
    $('#chat').classList.remove('open'); closeMap(); $('#exitModal').classList.remove('open'); $('#actBtn').hidden = true;
    musicDuck(); ui();
    if (reason){ gErr.textContent = reason; toast(reason, true); }
  }
  function leaveTo(href, fade){
    leaving = true; leave();
    if (location.search.includes('broker=') && !href.includes('?')) href += location.search;
    if (fade){ $('#fade').classList.add('on'); setTimeout(() => { location.href = href; }, 650); }
    else setTimeout(() => { location.href = href; }, 160);
  }
  $('#gateForm').addEventListener('submit', e => {
    e.preventDefault();
    // điện thoại Android: thử vào toàn màn hình và khoá xoay ngang (iPhone không hỗ trợ, bỏ qua)
    if (PHONE && document.documentElement.requestFullscreen && !document.fullscreenElement){ try { document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => {}); } catch (er) {} }
    enter();
  });
  addEventListener('beforeunload', e => { if (inside && !leaving){ e.preventDefault(); e.returnValue = ''; } });
  addEventListener('pagehide', () => { if (inside){ pub(T_P + me, null, true); pub(T_BYE, { id: me }); } });
  addEventListener('pageshow', e => { if (e.persisted){ $('#fade').classList.remove('on'); leaving = false; } });
  // nút Back của trình duyệt không đưa ra ngoài — phải đi ra Lối vào
  addEventListener('popstate', () => { if (inside && !leaving){ try { history.pushState({ loungeMap: 1 }, ''); } catch (e) {} toast('Muốn rời Lounge Map thì đi ra Lối vào (cửa chính, đi xuống thảm LỐI RA) nhé 🚪'); } });

  // rời trang quá 15 phút thì tự ra khỏi Lounge Map
  let awayT = null, micBeforeAway = true, hiddenAt = 0;
  const kickAway = () => leave('Bạn đã rời trang quá ' + Math.max(1, Math.round(AWAY_KICK_MS / 60000)) + ' phút nên đã tự động ra khỏi Lounge Map. Nhập tên để vào lại nhé.');
  document.addEventListener('visibilitychange', () => {
    if (!inside || !self) return;
    if (document.hidden){
      hiddenAt = Date.now(); micBeforeAway = self.mic; setMic(false, true); self.away = true; publishPresence();
      clearTimeout(awayT); awayT = setTimeout(kickAway, AWAY_KICK_MS);
    } else {
      clearTimeout(awayT);
      if (hiddenAt && Date.now() - hiddenAt >= AWAY_KICK_MS){ hiddenAt = 0; kickAway(); return; }
      hiddenAt = 0; self.away = false; setMic(micBeforeAway, true); publishPresence();
      toast('Mừng bạn quay lại 👋');
    }
  });

  /* mic */
  function setMic(on, quiet){
    if (!self) return;
    if (on && !localStream){ if (!quiet) toast('Không có micro để bật.', true); on = false; }
    self.mic = on; if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = on; });
    micUI(); if (!quiet) publishPresence();
  }
  function micUI(){ const on = !!(self && self.mic), b = $('#micBtn'); b.classList.toggle('off', !on); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? 'Micro đang bật — bấm để tắt' : 'Micro đang tắt — bấm để bật'); b.querySelector('.slash').style.display = on ? 'none' : ''; }
  $('#micBtn').addEventListener('click', () => { if (self) setMic(!self.mic); });
  $('#lockBtn').addEventListener('click', () => { const r = curLockRoom(); if (r) toggleLock(r); });
  const curLockRoom = () => { if (!self) return null; const z = ZONES[self.zs]; if (!z) return null; if (z.lock) return z.id; if (z.parent && LOCKABLE.has(z.parent)) return z.parent; return null; };

  /* chat */
  $('#chat').addEventListener('submit', e => {
    e.preventDefault(); const v = cleanText($('#chatIn').value); if (!v || !self) return;
    pub(T_CHAT, { id: me, text: v }); self.bubble = v; self.bubbleUntil = clock + 7; $('#chatIn').value = '';
    if (TOUCH){ $('#chatIn').blur(); openChat(false); }
  });
  function openChat(o){ $('#chat').classList.toggle('open', o); $('#chatBtn').setAttribute('aria-expanded', o); $('#chatBtn').classList.toggle('hot', o); if (o) $('#chatIn').focus(); else $('#room').focus({ preventScroll: true }); }
  $('#chatIn').addEventListener('keydown', e => { if (e.key === 'Escape'){ e.preventDefault(); openChat(false); } });
  $('#chatBtn').addEventListener('click', () => openChat(!$('#chat').classList.contains('open')));

  /* ================= BẢN ĐỒ ================= */
  const mapCv = $('#mapCv'), mapModal = $('#mapModal');
  let mapOpen = false, mapBase = null, mapSig = '', mapGeo = null;
  function openMap(){ mapOpen = true; mapModal.classList.add('open'); mapSig = ''; $('#mapNote').textContent = 'chấm sáng là vị trí mọi người · bạn ở vòng nhấp nháy'; $('#mapClose').focus(); }
  function closeMap(){ mapOpen = false; mapModal.classList.remove('open'); }
  $('#mapClose').addEventListener('click', () => { closeMap(); $('#room').focus({ preventScroll: true }); });
  mapModal.addEventListener('click', e => { if (e.target === mapModal) closeMap(); });
  function drawMapFrame(t){
    const dpr = Math.min(devicePixelRatio || 1, 2), cw = mapCv.clientWidth, ch = mapCv.clientHeight; if (!cw || !ch) return;
    if (mapCv.width !== Math.round(cw * dpr) || mapCv.height !== Math.round(ch * dpr)){ mapCv.width = Math.round(cw * dpr); mapCv.height = Math.round(ch * dpr); mapSig = ''; }
    const lockedSet = new Set([...LOCKABLE].filter(lockOn)), sig2 = cw + 'x' + ch + ':' + [...lockedSet].join(',');
    const sc = Math.min(cw / W, ch / H) * dpr, ox = (mapCv.width - W * sc) / 2, oy = (mapCv.height - H * sc) / 2;
    if (sig2 !== mapSig){ mapSig = sig2; mapBase = document.createElement('canvas'); mapBase.width = mapCv.width; mapBase.height = mapCv.height; const g = mapBase.getContext('2d'); g.fillStyle = '#efe4cc'; g.fillRect(0, 0, mapBase.width, mapBase.height); g.setTransform(sc, 0, 0, sc, ox, oy); MAP.drawMap(g, lockedSet); }
    const g = mapCv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(mapBase, 0, 0); g.setTransform(sc, 0, 0, sc, ox, oy);
    const ppl = freshPeers(); if (self) ppl.push(self);
    ppl.forEach(p => { const P = pose(p), isMe = p === self; if (isMe){ const r = 70 + Math.sin(t * 5) * 14; g.strokeStyle = '#ffe066'; g.lineWidth = 10; g.beginPath(); g.arc(P.x, P.y - 20, r, 0, 7); g.stroke(); }
      g.fillStyle = p.col; g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.arc(P.x, P.y - 20, 34, 0, 7); g.fill(); g.stroke();
      g.font = '700 52px Fredoka, sans-serif'; g.textAlign = 'center'; g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,.85)'; const lb = isMe ? 'BẠN' : p.name; g.strokeText(lb, P.x, P.y - 74); g.fillStyle = isMe ? '#ffe066' : '#fff'; g.fillText(lb, P.x, P.y - 74); });
  }
  addEventListener('keydown', e => { if (e.key === 'Escape' && mapOpen){ closeMap(); } });

  /* ================= LỐI RA ================= */
  let exitArmed = false;
  const exitModal = $('#exitModal');
  $('#exStay').addEventListener('click', () => { exitModal.classList.remove('open'); exitArmed = true; if (self){ self.direct = false; goTo(self.x, EXIT[1] - 120); } $('#room').focus({ preventScroll: true }); });
  $('#exGo').addEventListener('click', () => { exitModal.classList.remove('open'); leaveTo(EXIT_HREF, true); });

  /* ================= GIAO DIỆN ================= */
  const swRoot = $('#swatches'), hatRoot = $('#hats');
  COLORS.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.style.background = c; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', 'màu ' + c); b.dataset.c = c; swRoot.appendChild(b); });
  HATS.forEach(h => { const b = document.createElement('button'); b.type = 'button'; b.className = 'hat'; b.setAttribute('role', 'radio'); b.dataset.h = h; b.setAttribute('aria-label', { none: 'không mũ', top: 'mũ chóp', beret: 'mũ nồi', crown: 'vương miện', cowboy: 'mũ cao bồi', phones: 'tai nghe', party: 'mũ tiệc', flower: 'hoa' }[h]); const cv = document.createElement('canvas'); cv.width = 80; cv.height = 80; b.appendChild(cv); hatRoot.appendChild(b); });
  function paintPicker(){
    swRoot.querySelectorAll('.sw').forEach(b => { const on = b.dataset.c === prof.col; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    hatRoot.querySelectorAll('.hat').forEach(b => { const on = b.dataset.h === prof.hat; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; const g = b.firstChild.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 80, 80); g.setTransform(.7, 0, 0, .7, 1.5, 4); drawBody(g, { x: 55, y: 100, name: '', col: prof.col, hat: b.dataset.h, mic: true, ph: 1, face: 1, speaking: 0, seat: -1 }, 0); });
  }
  swRoot.addEventListener('click', e => { const b = e.target.closest('.sw'); if (!b) return; prof.col = b.dataset.c; paintPicker(); });
  hatRoot.addEventListener('click', e => { const b = e.target.closest('.hat'); if (!b) return; prof.hat = b.dataset.h; paintPicker(); });
  [swRoot, hatRoot].forEach(root => root.addEventListener('keydown', e => { if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return; e.preventDefault(); const items = [...root.children], i = items.findIndex(b => b.getAttribute('aria-checked') === 'true'), n = items[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length]; n.click(); n.focus(); }));
  $('#name').value = prof.name;
  paintPicker();

  const status = $('#status'), stTxt = $('#stTxt');
  let lastZone = -1;
  function ui(){
    const n = freshPeers().length + (inside ? 1 : 0);
    status.classList.toggle('off', !connectedCount);
    stTxt.textContent = !connectedCount ? (netNote ? 'ngoại tuyến' : 'đang kết nối…') : n + ' người';
    const gIco = $('#gIco'), gHead = $('#gHead'), gSub = $('#gSub');
    if (!connectedCount){ gIco.textContent = '⏳'; gHead.textContent = netNote ? 'Chưa kết nối được máy chủ' : 'Đang kết nối…'; gSub.textContent = netNote ? 'Bạn vẫn có thể vào đi dạo. Trang sẽ tự kết nối lại.' : ''; }
    else { gIco.textContent = '🏡'; gHead.textContent = 'Lounge Map đang mở'; gSub.textContent = freshPeers().length ? 'Đang có trong dinh thự:' : 'Chưa có ai — bạn vào trước nhé.'; }
    const who = $('#gWho'); who.textContent = '';
    freshPeers().slice(0, 12).forEach(p => { const i = document.createElement('i'); i.textContent = p.name + (p.mic ? '' : ' 🔇'); who.appendChild(i); });
    const lr = curLockRoom(), lb = $('#lockBtn');
    lb.hidden = !inside || !lr;
    if (lr){ const on = lockOn(lr); lb.classList.toggle('hot', on); lb.setAttribute('aria-label', on ? 'Phòng đang khoá — bấm để mở khoá' : 'Khoá phòng này'); lb.title = on ? 'Mở khoá phòng' : 'Khoá phòng'; lb.querySelector('#shackle').setAttribute('d', on ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.7-1.5'); }
    $('#whereT').textContent = inside && self ? ZONES[self.zs].name + (lr && lockOn(lr) ? ' 🔒' : '') : 'LOUNGE MAP';
  }
  setInterval(ui, 1000);

  /* xoay ngang trên điện thoại */
  function orient(){ document.body.classList.toggle('portrait', PHONE && innerHeight > innerWidth); }
  addEventListener('resize', orient); addEventListener('orientationchange', () => setTimeout(orient, 200)); orient();

  /* ================= VẼ + DI CHUYỂN ================= */
  const cv = $('#room'), ctx = cv.getContext('2d');
  let DPR = 1, view = { s: .6, ox: 0, oy: 0, init: false }, zoom = 1;
  function resize(){ DPR = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR); }
  resize(); addEventListener('resize', resize);
  function camera(){
    const vw = innerWidth, vh = innerHeight;
    const base = TOUCH ? Math.min(vw / 1300, vh / 720) : Math.min(vw / 1500, vh / 880);
    const s = clamp(base * zoom, .3, 1.3);
    const f = self ? pose(self) : MAP.VIEW0;
    let cx = vw / 2 - f.x * s, cy = vh / 2 - (f.y - 50) * s;
    if (W * s <= vw) cx = (vw - W * s) / 2; else cx = clamp(cx, vw - W * s, 0);
    if (H * s <= vh) cy = (vh - H * s) / 2; else cy = clamp(cy, vh - H * s, 0);
    if (!view.init || Math.abs(view.s - s) > .001){ view.ox = view.init ? view.ox + (cx - view.ox) * .5 : cx; view.oy = view.init ? view.oy + (cy - view.oy) * .5 : cy; view.init = true; }
    view.s = s; view.ox += (cx - view.ox) * .16; view.oy += (cy - view.oy) * .16;
  }
  const toWorld = (sx, sy) => ({ x: (sx - view.ox) / view.s, y: (sy - view.oy) / view.s });
  if (!TOUCH) cv.addEventListener('wheel', e => { e.preventDefault(); zoom = clamp(zoom * Math.exp(-e.deltaY * .0012), .55, 1.7); }, { passive: false });

  let lastMoveSend = 0;
  function sendMove(force){
    if (!self) return;
    const d = self.direct ? 1 : 0, vx = self.vx || 0, vy = self.vy || 0;
    const tx = d ? self.x + vx * 70 : self.tx, ty = d ? self.y + vy * 70 : self.ty;
    pub(T_MOVE, { id: me, x: Math.round(self.x), y: Math.round(self.y), tx: Math.round(tx), ty: Math.round(ty), d, st: self.seat >= 0 ? 1 : 0 });
    lastMoveSend = performance.now();
    clearTimeout(sendMove._t); sendMove._t = setTimeout(publishPresence, 1200);
  }

  /* ----- vùng bấm (đồ vật) ----- */
  const knockHots = LOCKDOORS.map(d => ({ r: d.v ? [d.at - 40, d.a0, d.at + 40, d.a1] : [d.a0, d.at - 30, d.a1, d.at + FACE + 30], x: d.out[0], y: d.out[1], label: 'Gõ cửa', cond: () => lockOn(d.owner) && self && !inRoom(self.zs, d.owner), act: () => approach(d.out[0], d.out[1], () => knock(d.owner), 120), door: true }));
  const ALLHOTS = knockHots.concat(HOTS);
  ALLHOTS.forEach(h => { h.zi = zoneAt(h.x, h.y); });
  function reachable(h){
    if (!self) return false;
    const d = Math.hypot(self.x - h.x, self.y - h.y);
    if (d < 420) return true;
    if (h.zi === self.zs) return ZONES[h.zi].kind !== 'out' || d < 1200;
    return LINKS.has(self.zs + '|' + h.zi) && d < 700;
  }
  const rectDist = (x, y, r) => Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - y, 0, y - r[3]));
  function hotAt(w){ const c = ALLHOTS.filter(h => (!h.cond || h.cond()) && w.x >= h.r[0] && w.x <= h.r[2] && w.y >= h.r[1] && w.y <= h.r[3]); if (!c.length) return null; c.sort((a, b) => (b.door ? 1 : 0) - (a.door ? 1 : 0) || ((a.r[2] - a.r[0]) * (a.r[3] - a.r[1])) - ((b.r[2] - b.r[0]) * (b.r[3] - b.r[1]))); return c[0]; }
  const labelOf = h => typeof h.label === 'function' ? h.label() : h.label;
  function useHot(h){
    if (!inside){ if (h.always) h.act(); return; }
    if (!reachable(h)){ toast('Lại gần hơn để ' + labelOf(h).toLowerCase() + ' nhé.'); return; }
    self.direct = false; h.act();
  }
  let pressHot = null;
  cv.addEventListener('pointerdown', e => {
    const w = toWorld(e.clientX, e.clientY), h = hotAt(w);
    if (h){ useHot(h); return; }
    if (!inside || !self) return;
    if (TOUCH){ if (!pressHot){ pressHot = 1; toast('Kéo nút tròn ở góc trái để di chuyển 🕹️'); } return; }
    if (self.seat >= 0) standUp();
    seatPending = -1; actPending = null; self.direct = false;
    goTo(w.x, w.y);
  });
  cv.addEventListener('pointermove', e => { if (TOUCH) return; const h = hotAt(toWorld(e.clientX, e.clientY)); cv.style.cursor = h && inside ? 'pointer' : ''; });

  /* ----- nút tương tác: hiện khi đứng cạnh đồ vật ----- */
  const actBtn = $('#actBtn'), actT = $('#actT');
  let actHot = null, actTick = 0;
  function pickAct(){
    if (!inside || !self || mapOpen || exitModal.classList.contains('open')){ actHot = null; actBtn.hidden = true; return; }
    if (self.seat >= 0){ actHot = { label: 'Đứng dậy', act: () => standUp(), stand: true }; const s = SEATS[self.seat]; if (s.g === 'piano') actHot = { label: 'Chơi tiếp', act: () => HOTS.find(h => h.label === 'Chơi piano').act(), extra: true }; }
    else {
      let best = null, bd = 95;
      for (const h of ALLHOTS){ if (h.cond && !h.cond()) continue; if (h.zi !== self.zs && !h.door && !LINKS.has(self.zs + '|' + h.zi)) continue; const d = rectDist(self.x, self.y - 20, h.r); if (d < bd){ bd = d; best = h; } }
      actHot = best;
    }
    if (!actHot){ actBtn.hidden = true; return; }
    const t = labelOf(actHot); if (actT.textContent !== t) actT.textContent = t; actBtn.hidden = false;
    if (TOUCH) actBtn.style.bottom = `calc(${Math.round($('#tv').getBoundingClientRect().height + 22)}px + env(safe-area-inset-bottom, 0px))`;
  }
  actBtn.addEventListener('click', () => { if (!actHot) return; if (actHot.stand){ standUp(); return; } useHot(actHot); $('#room').focus({ preventScroll: true }); });

  /* ----- cần điều khiển tròn ----- */
  const joyEl = $('#joy'), knob = $('#joyKnob');
  const joy = { id: null, vx: 0, vy: 0, mag: 0 };
  function moveJoy(e){ const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2 - 20; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R){ dx *= R / d; dy *= R / d; } joy.vx = dx / R; joy.vy = dy / R; joy.mag = Math.min(1, d / R); knob.style.transform = `translate(${dx}px,${dy}px)`; }
  joyEl.addEventListener('pointerdown', e => { e.preventDefault(); joy.id = e.pointerId; try { joyEl.setPointerCapture(e.pointerId); } catch (er) {} joyEl.classList.add('on'); moveJoy(e); });
  joyEl.addEventListener('pointermove', e => { if (e.pointerId === joy.id) moveJoy(e); });
  const endJoy = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.vx = joy.vy = joy.mag = 0; knob.style.transform = ''; joyEl.classList.remove('on'); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => joyEl.addEventListener(ev, endJoy));

  const keys = new Set();
  addEventListener('keydown', e => {
    if (!inside || e.target.closest('input,textarea') || mapOpen || exitModal.classList.contains('open')) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)){ keys.add(k); e.preventDefault(); }
    if ((k === 'e' || k === ' ') && !e.target.closest('button')){ e.preventDefault(); if (!actBtn.hidden) actBtn.click(); }
    if (k === 'enter'){ e.preventDefault(); openChat(true); }
    if (k === 'm' && !e.repeat) setMic(!self.mic);
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  // đi thẳng theo hướng (cần điều khiển / phím), trượt dọc tường khi vướng
  function drive(vx, vy, mag, dt){
    if (self.seat >= 0) standUp();
    seatPending = -1; actPending = null; self.path = null; self.ptx = undefined; self.direct = true;
    const sp = 280 * clamp(mag, .25, 1), dx = vx * sp * dt, dy = vy * sp * dt;
    self.vx = vx * clamp(mag, .25, 1) * 4; self.vy = vy * clamp(mag, .25, 1) * 4;
    let moved = true;
    if (!blocked(self.x + dx, self.y + dy)){ self.x += dx; self.y += dy; }
    else if (Math.abs(dx) > .01 && !blocked(self.x + dx, self.y)) self.x += dx;
    else if (Math.abs(dy) > .01 && !blocked(self.x, self.y + dy)) self.y += dy;
    else { moved = false; for (const a of [.6, -.6, 1.1, -1.1]){ const ca = Math.cos(a), sa = Math.sin(a), qx = self.x + (dx * ca - dy * sa), qy = self.y + (dx * sa + dy * ca); if (!blocked(qx, qy)){ self.x = qx; self.y = qy; moved = true; break; } } }
    self.moving = moved; if (Math.abs(dx) > .05) self.face = dx > 0 ? 1 : -1;
    self.tx = self.x; self.ty = self.y;
  }
  function step(p, dt, speed){
    if (p.seat >= 0){ p.moving = false; p.path = null; p.ptx = undefined; return; }
    if (p !== self && p.direct){ const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy); if (d < 2){ p.moving = false; return; } p.moving = true; if (Math.abs(dx) > 2) p.face = dx > 0 ? 1 : -1; const m = Math.min(d, Math.max(speed, d * 3) * dt); p.x += dx / d * m; p.y += dy / d * m; return; }
    if (p.ptx === undefined || Math.hypot(p.tx - p.ptx, p.ty - p.pty) > 20){ p.ptx = p.tx; p.pty = p.ty; p.path = plan(p.x, p.y, p.tx, p.ty); }
    let gx = p.tx, gy = p.ty;
    while (p.path && p.path.length){
      gx = p.path[0].x; gy = p.path[0].y;
      if (Math.hypot(gx - p.x, gy - p.y) >= 4) break;
      p.path.shift();
      if (!p.path.length){ if (p.path.stop){ p.tx = p.ptx = p.x; p.ty = p.pty = p.y; } gx = p.tx; gy = p.ty; p.path = null; }
    }
    const dx = gx - p.x, dy = gy - p.y, d = Math.hypot(dx, dy);
    if (d < 3){ p.moving = false; return; }
    p.moving = true; if (Math.abs(dx) > 2) p.face = dx > 0 ? 1 : -1;
    const m = Math.min(d, speed * dt);
    if (p === self){
      const ux = dx / d, uy = dy / d, side = p.side || 1;
      let ok = false;
      for (const a of [0, .45, -.45, .9, -.9, 1.35, -1.35]){
        const b = a * side, ca = Math.cos(b), sa = Math.sin(b), vx = ux * ca - uy * sa, vy = ux * sa + uy * ca;
        const qx = p.x + vx * m, qy = p.y + vy * m;
        if (!blocked(qx, qy)){ p.x = qx; p.y = qy; ok = true; if (a) p.side = Math.sign(b) || side; if (Math.abs(vx) > .2) p.face = vx > 0 ? 1 : -1; break; }
      }
      if (!ok){ p.tx = p.x; p.ty = p.y; p.moving = false; p.side = -side; sendMove(); }
    } else { p.x += dx / d * m; p.y += dy / d * m; }
  }
  function updateDoors(dt){
    const ppl = freshPeers(); if (self) ppl.push(self);
    for (const d of DOORS){
      let want = false;
      const hx = d.v ? 150 : (d.a1 - d.a0) / 2 + 70, hy = d.v ? (d.a1 - d.a0) / 2 + 70 : 160;
      for (const p of ppl){ if (p.seat >= 0) continue; if (Math.abs(p.x - d.cx) < hx && Math.abs(p.y - d.cy) < hy){ if (d.lock && lockOn(d.owner) && !inRoom(p.zs, d.owner)) continue; want = true; break; } }
      d.o += ((want ? 1 : 0) - d.o) * Math.min(1, dt * 8);
    }
  }

  /* ----- nền tĩnh chia ô (đỡ tốn bộ nhớ điện thoại) ----- */
  const TILE = 1024, TS = TOUCH ? 1 : 1.25, MAXT = TOUCH ? 10 : 16;
  const tiles = new Map(); let tileClock = 0, tilesMade = 0;
  function makeTile(i, j){ const c = document.createElement('canvas'); c.width = c.height = Math.ceil(TILE * TS); const g = c.getContext('2d'); g.setTransform(TS, 0, 0, TS, -i * TILE * TS, -j * TILE * TS); MAP.drawStatic(g, [i * TILE, j * TILE, (i + 1) * TILE, (j + 1) * TILE]); tilesMade++; return { cv: c, used: 0 }; }
  function tile(i, j){ const k = i + ',' + j; let t = tiles.get(k); if (!t){ t = makeTile(i, j); t.used = ++tileClock; tiles.set(k, t); if (tiles.size > MAXT){ const arr = [...tiles.entries()].sort((a, b) => a[1].used - b[1].used); while (tiles.size > MAXT){ const [kk, tt] = arr.shift(); tt.cv.width = tt.cv.height = 0; tiles.delete(kk); } } } t.used = ++tileClock; return t; }
  function clearTiles(){ tiles.forEach(t => { t.cv.width = t.cv.height = 0; }); tiles.clear(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { clearTiles(); paintPicker(); });

  const hitB = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  let last = performance.now();
  function frame(now){
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
    if (self){
      let mv = null;
      if (joy.id !== null && joy.mag > .14) mv = [joy.vx / joy.mag, joy.vy / joy.mag, joy.mag];
      else if (keys.size){ const vx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0), vy = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0); if (vx || vy){ const m = Math.hypot(vx, vy); mv = [vx / m, vy / m, 1]; } }
      if (mv){ drive(mv[0], mv[1], mv[2], dt); if (now - lastMoveSend > 170) sendMove(); }
      else if (self.direct){ self.direct = false; self.moving = false; self.vx = self.vy = 0; self.tx = self.x; self.ty = self.y; self.ptx = undefined; sendMove(); }
      else step(self, dt, 270);
      trackZone(self);
      if (seatPending >= 0 && !self.moving){ const s = SEATS[seatPending]; if (Math.hypot(self.x - s.ax, self.y - s.ay) < 44 || Math.hypot(self.x - s.x, self.y - s.y) < 100){ const i = seatPending; seatPending = -1; sitDown(i); } else if (!self.path){ seatPending = -1; } }
      if (actPending){ const a = actPending; if (!self.moving && Math.hypot(self.x - a.x, self.y - a.y) <= a.r + 70){ actPending = null; a.fn(); } else if (clock > a.until || (!self.moving && !self.path)){ actPending = null; } }
      self.speaking += ((self.mic && !self.away ? clamp((level(localAn) - .02) * 14, 0, 1) : 0) - self.speaking) * .3;
      // lối ra
      const onMat = inBox(self.x, self.y, EXIT);
      if (onMat && !exitArmed && !exitModal.classList.contains('open') && self.seat < 0){ exitModal.classList.add('open'); keys.clear(); joy.id = null; joy.mag = 0; knob.style.transform = ''; setTimeout(() => $('#exGo').focus(), 30); }
      if (!onMat && !inBox(self.x, self.y, [EXIT[0] - 60, EXIT[1] - 80, EXIT[2] + 60, EXIT[3] + 60])) exitArmed = false;
      if (self.zs !== lastZone){ lastZone = self.zs; ui(); }
    }
    peers.forEach(p => {
      step(p, dt, 280); trackZone(p);
      const st = pcs.get(p.id); let lv = 0;
      if (st && st.receiver && st.pc.connectionState === 'connected' && st.receiver.getSynchronizationSources){ const ss = st.receiver.getSynchronizationSources(); if (ss.length && ss[0].audioLevel != null) lv = clamp((ss[0].audioLevel - .015) * 7, 0, 1); }
      if (p.relayLvl) lv = Math.max(lv, clamp((p.relayLvl - .012) * 12, 0, 1));
      if ((p.vol || 0) < .03) lv = 0;
      p.speaking += (lv - p.speaking) * .3;
    });
    updateDoors(dt);
    if ((actTick += dt) > .15){ actTick = 0; pickAct(); }

    camera();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1e3318'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(view.s * DPR, 0, 0, view.s * DPR, view.ox * DPR, view.oy * DPR);
    const vb = [-view.ox / view.s, -view.oy / view.s, (innerWidth - view.ox) / view.s, (innerHeight - view.oy) / view.s];
    const made0 = tilesMade;
    for (let j = Math.max(0, Math.floor(vb[1] / TILE)); j <= Math.min(Math.ceil(H / TILE) - 1, Math.floor(vb[3] / TILE)); j++)
      for (let i = Math.max(0, Math.floor(vb[0] / TILE)); i <= Math.min(Math.ceil(W / TILE) - 1, Math.floor(vb[2] / TILE)); i++) ctx.drawImage(tile(i, j).cv, i * TILE, j * TILE, TILE + .6, TILE + .6);
    if (tilesMade === made0){ // chuẩn bị sẵn ô kế bên (mỗi khung hình tối đa 1 ô)
      const m = 500, nb = [vb[0] - m, vb[1] - m, vb[2] + m, vb[3] + m];
      outer: for (let j = Math.max(0, Math.floor(nb[1] / TILE)); j <= Math.min(Math.ceil(H / TILE) - 1, Math.floor(nb[3] / TILE)); j++) for (let i = Math.max(0, Math.floor(nb[0] / TILE)); i <= Math.min(Math.ceil(W / TILE) - 1, Math.floor(nb[2] / TILE)); i++) if (!tiles.has(i + ',' + j) && tiles.size < MAXT){ tile(i, j); break outer; }
    }
    DYN.forEach(o => { if (hitB(o.b, vb)) o.d(ctx, clock); });
    DOORS.forEach(d => { const b = d.v ? [d.at - 30, d.a0 - 30, d.at + 30, d.a1 + 30] : [d.a0 - 30, d.at - 30, d.a1 + 30, d.at + FACE + 30]; if (hitB(b, vb)) MAP.drawDoor(ctx, d, clock); });
    if (marker){ const a = clock - marker.t; if (a > .7) marker = null; else { ctx.globalAlpha = 1 - a / .7; ctx.fillStyle = '#e8902a'; ctx.beginPath(); ctx.ellipse(marker.x, marker.y, 34 + a * 20, 14 + a * 8, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; } }
    if (actHot && !actHot.stand && actHot.r){ const r = actHot.r, a = .35 + Math.sin(clock * 5) * .2; ctx.strokeStyle = `rgba(255,224,102,${a})`; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); rr(ctx, r[0] - 6, r[1] - 6, r[2] - r[0] + 12, r[3] - r[1] + 12, 12); ctx.stroke(); ctx.setLineDash([]); }
    const list = [];
    PROPS.forEach(p => { if (hitB(p.b, vb)) list.push(p); });
    const people = freshPeers(); if (self) people.push(self);
    const vis = people.filter(p => { const P = pose(p); return P.x > vb[0] - 120 && P.x < vb[2] + 120 && P.y > vb[1] - 60 && P.y < vb[3] + 200; });
    vis.forEach(p => { const P = pose(p); list.push({ y: P.lying ? seatZ(p.seat) : p.y + (p === self ? .1 : 0), d: g => drawBody(g, p, clock) }); });
    list.sort((a, b) => a.y - b.y).forEach(o => o.d(ctx, clock));
    MAP.overlay(ctx, clock, vb);
    vis.forEach(p => drawLabel(ctx, p, clock, p === self));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (mapOpen) drawMapFrame(clock);
  }
  requestAnimationFrame(frame);

  /* ================= NHẠC (YouTube) ================= */
  const tv = $('#tv'), tvMsg = $('#tvMsg'), snd = $('#snd'), tvMin = $('#tvMin');
  let yt = null, ytReady = false, ytDead = false, soundOn = false, userMuted = false, gestured = false;
  const vol = () => inside ? 30 : 60;
  function sndUI(){ snd.textContent = soundOn ? 'on' : 'off'; snd.setAttribute('aria-pressed', soundOn); tv.classList.toggle('on', soundOn); }
  function noSignal(txt){ ytDead = true; soundOn = false; tv.classList.add('dead'); tvMsg.innerHTML = 'no signal<small>' + txt + '</small>'; sndUI(); }
  function soundUp(){ if (!ytReady || ytDead) return; yt.unMute(); yt.setVolume(vol()); yt.playVideo(); soundOn = true; sndUI(); }
  function soundDown(){ if (ytReady) yt.mute(); soundOn = false; sndUI(); }
  function musicDuck(){ if (ytReady && soundOn) yt.setVolume(vol()); }
  function toggleMusic(){ gestured = true; if (soundOn){ userMuted = true; soundDown(); } else { userMuted = false; soundUp(); } }
  if (location.protocol === 'file:') noSignal('chỉ chạy khi mở qua web');
  else {
    window.onYouTubeIframeAPIReady = () => {
      yt = new YT.Player('yt', { videoId: MUSIC, playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, origin: location.origin },
        events: { onReady: e => { ytReady = true; e.target.getIframe().setAttribute('title', 'Nhạc của Lounge Map'); e.target.mute(); e.target.playVideo(); if (gestured && !userMuted) soundUp(); },
          onStateChange: e => { if (e.data === YT.PlayerState.ENDED || e.data === YT.PlayerState.PAUSED){ setTimeout(() => { if (ytReady) e.target.playVideo(); }, 800); } },
          onError: () => noSignal('video không phát được') } });
    };
    const tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api'; tag.onerror = () => noSignal('không tải được YouTube'); document.head.appendChild(tag);
    setTimeout(() => { if (!ytReady && !ytDead) noSignal('không tải được YouTube'); }, 15000);
  }
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, e => { if (e.target.closest && e.target.closest('#snd')) return; gestured = true; if (!userMuted && !soundOn) soundUp(); }, true));
  snd.addEventListener('click', toggleMusic);
  function setMin(m){ tv.classList.toggle('min', m); tvMin.textContent = m ? '▢' : '–'; tvMin.setAttribute('aria-expanded', !m); tvMin.setAttribute('aria-label', m ? 'Mở lại màn hình' : 'Thu nhỏ màn hình'); try { localStorage.setItem('loungemap-tv-min', m ? '1' : '0'); } catch (e) {} }
  let startMin = TOUCH || innerHeight < 600; try { const v = localStorage.getItem('loungemap-tv-min'); if (v) startMin = v === '1'; } catch (e) {}
  setMin(startMin);
  tvMin.addEventListener('click', () => setMin(!tv.classList.contains('min')));

  /* ================= KHỞI ĐỘNG ================= */
  ui(); connectNet();
  window.__lounge = { me, peers, pcs, get inside(){ return inside; }, get self(){ return self; }, get connected(){ return connectedCount; }, get extras(){ return extras; }, locks, lockOn, enter, leave, setMic, claimSeat, setExtras, dbg, linkMode, needRelay, hearVol, zoneAt, ZONES, DOORS, SEATS, HOTS: ALLHOTS, blocked, MAP, joy, get view(){ return view; }, get tilesMade(){ return tilesMade; }, openMap, closeMap, toggleLock, goTo, screen: (x, y) => ({ x: view.ox + x * view.s, y: view.oy + y * view.s }), test: { clients } };
})();
