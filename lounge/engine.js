/* =====================================================================
   LÕI PHÒNG GỌI THOẠI — dùng chung cho The Lounge và phòng sau bức tranh đỏ
   Mỗi trang khai báo window.ROOM (kích thước, cách vẽ, đồ vật, vùng bấm)
   rồi nạp file này. Kết nối qua máy chủ MQTT công cộng, gọi thoại WebRTC.
   ===================================================================== */
(() => {
  const R = window.ROOM;
  const $ = s => document.querySelector(s);

  /* ---------- dựng giao diện ---------- */
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  document.body.insertAdjacentHTML('afterbegin', `
  <canvas id="room" tabindex="0" aria-label="${esc(R.aria || 'Căn phòng nhìn từ trên xuống. Bấm xuống sàn để đi tới. Phím mũi tên cũng di chuyển được.')}"></canvas>
  <nav class="hud hud-tl" aria-label="Lối ra">${R.links.map(([t, h]) => `<a href="${esc(h)}" data-leave>${esc(t)}</a>`).join('')}</nav>
  <div class="status off" id="status" role="status" aria-live="polite"><span class="dot"></span><span id="stTxt">đang kết nối…</span></div>
  <div class="gate" id="gate">
    <form class="card" id="gateForm" autocomplete="off">
      <h1>${esc(R.title)}</h1>
      <p class="sub">${esc(R.sub)}</p>
      <div class="gstate"><span class="ico" id="gIco">⏳</span><div><b id="gHead">Đang kết nối tới phòng…</b><span id="gSub"></span><div class="who" id="gWho"></div></div></div>
      <label class="lbl" for="name">Tên của bạn</label>
      <input class="field" id="name" maxlength="16" placeholder="vd. An Vy" required>
      <span class="lbl" id="colLbl">Màu</span>
      <div class="swatches" id="swatches" role="radiogroup" aria-labelledby="colLbl"></div>
      <span class="lbl" id="hatLbl">Mũ</span>
      <div class="hats" id="hats" role="radiogroup" aria-labelledby="hatLbl"></div>
      <div class="pw">
        <label class="lbl" for="pwIn">Mật khẩu phòng</label>
        <input class="field" id="pwIn" type="password" maxlength="32" placeholder="nhập mật khẩu người khoá phòng đã đặt" autocomplete="off">
      </div>
      <p class="err" id="gErr" role="alert"></p>
      <button class="go" id="goBtn" type="submit">Vào phòng</button>
      <p class="note">Trang sẽ xin quyền dùng micro để nói chuyện. Khi đang nói chuyện bạn phải ở lại trang này: rời trang thì micro tự tắt, rời quá 60 giây thì cuộc gọi bị ngắt. Nên dùng tai nghe để tiếng không bị vọng.</p>
    </form>
  </div>
  <div class="bar" id="bar">
    <button class="btn" id="micBtn" aria-pressed="true" aria-label="Bật hoặc tắt micro"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/><path class="slash" d="M4 4l16 16" style="display:none"/></svg><span class="t" id="micT">Mic</span></button>
    <button class="btn" id="lockBtn" aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path id="shackle" d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><span class="t" id="lockT">Khoá phòng</span></button>
    <button class="btn" id="chatBtn" aria-label="Nhắn tin" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg></button>
    <form class="chat" id="chat"><input id="chatIn" maxlength="140" placeholder="Nhắn gì đó… (Enter)" aria-label="Tin nhắn"><button class="btn" type="submit" aria-label="Gửi">➤</button></form>
    <button class="btn" id="leaveBtn" aria-label="Rời phòng"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></svg><span class="t">Rời phòng</span></button>
  </div>
  <div class="modal" id="lockModal" role="dialog" aria-modal="true" aria-labelledby="lmTitle">
    <form class="card" id="lockForm" autocomplete="off">
      <h2 id="lmTitle">KHOÁ PHÒNG</h2>
      <p class="sub" id="lmSub"></p>
      <div id="lmSet">
        <label class="lbl" for="pw1">Mật khẩu mới</label>
        <input class="field" id="pw1" type="password" minlength="4" maxlength="32" placeholder="ít nhất 4 ký tự" autocomplete="new-password">
        <label class="lbl" for="pw2">Nhập lại</label>
        <input class="field" id="pw2" type="password" minlength="4" maxlength="32" autocomplete="new-password">
      </div>
      <p class="err" id="lmErr" role="alert"></p>
      <div class="row"><button class="go ghost" type="button" id="lmCancel">Huỷ</button><button class="go" type="submit" id="lmOk">Khoá 2 tiếng</button></div>
    </form>
  </div>
  <div class="toasts" id="toasts" aria-live="polite"></div>
  <button class="btn hot tapaudio" id="tapAudio">🔊 Chạm để nghe mọi người</button>
  <div id="audios" hidden></div>
  <div class="tv" id="tv">
    <div class="tv-bar">
      <span class="tv-t"><i aria-hidden="true">♪</i>${esc(R.tvName || 'lounge.fm')}</span>
      <button id="snd" aria-pressed="false" aria-label="Bật hoặc tắt tiếng nhạc">off</button>
      <button id="tvMin" aria-expanded="true" aria-controls="tvScr" aria-label="Thu nhỏ màn hình">–</button>
    </div>
    <div class="tv-scr" id="tvScr"><div id="yt"></div><span class="tv-msg" id="tvMsg">tap anywhere for sound</span></div>
  </div>
  <div class="fade" id="fade"></div>`);

  /* ======= CÀI ĐẶT CHUNG ======= */
  const MUSIC = R.music;
  const LOCK_MS = 2 * 60 * 60 * 1000;       // phòng tự mở khoá sau 2 tiếng
  let AWAY_KICK_MS = 60 * 1000;             // rời trang quá 60 giây thì ngắt cuộc gọi
  const MAX_PEOPLE = 10;                    // gọi thoại kiểu mạng lưới: tối đa 10 người
  const PREFIX = R.prefix;
  let BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  // STUN giúp hai máy tìm đường kết nối thoại. Có tài khoản TURN (Metered, Cloudflare…) thì thêm
  // { urls: 'turn:…', username: '…', credential: '…' } để mạng di động khó tính cũng gọi được.
  const ICE = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }
  ];
  /* ============================ */

  const qs = new URLSearchParams(location.search);
  if (qs.get('broker')) BROKERS = qs.get('broker').split(',');
  let LOCK_DUR = LOCK_MS;   // thời gian khoá khi mình bấm khoá (chỉ có thể ngắn hơn 2 tiếng)
  if (qs.get('lockms')) LOCK_DUR = Math.max(3000, Math.min(LOCK_MS, +qs.get('lockms') || LOCK_MS));
  if (qs.get('awayms')) AWAY_KICK_MS = Math.max(2000, Math.min(60000, +qs.get('awayms') || 60000));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rid = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => (b % 36).toString(36)).join('');
  const cleanName = s => String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  const cleanText = s => String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
  async function sha(s){ const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join(''); }
  function toast(msg, warn){ const t = document.createElement('div'); t.className = 'toast' + (warn ? ' warn' : ''); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4200); }
  const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  function rr(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  const COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#9775fa', '#f783ac', '#f1f3f5', '#5c636a'];
  const HATS = ['none', 'top', 'beret', 'crown', 'cowboy', 'phones', 'party', 'flower'];
  const me = (() => { let id = ''; try { id = sessionStorage.getItem('lounge-id') || ''; } catch (e) {} if (!/^[a-z0-9]{10}$/.test(id)){ id = rid(10); try { sessionStorage.setItem('lounge-id', id); } catch (e) {} } return id; })();
  let prof = { name: '', col: COLORS[Math.floor(Math.random() * 6)], hat: HATS[Math.floor(Math.random() * HATS.length)] };
  try { const p = JSON.parse(localStorage.getItem('lounge-profile') || 'null'); if (p){ prof.name = cleanName(p.name); if (COLORS.includes(p.col)) prof.col = p.col; if (HATS.includes(p.hat)) prof.hat = p.hat; } } catch (e) {}

  /* ================= THẾ GIỚI ================= */
  const { W, H, FL, BOUND, DOOR, PANEL, SPAWN, OB } = R;
  const SEATS = R.seats || [];
  const AR = 18;
  function blocked(x, y){
    if (x < BOUND.x0 || x > BOUND.x1 || y < BOUND.y0 || y > BOUND.y1) return true;
    for (const o of OB){
      if (o.r){ const [a, b, c, d] = o.r; if (x > a - AR && x < c + AR && y > b - AR * .6 && y < d + AR * .4) return true; }
      else { const [cx, cy, r] = o.c; if (Math.hypot(x - cx, (y - cy) * 1.15) < r + AR) return true; }
    }
    return false;
  }
  // tìm đường vòng qua đồ đạc: lưới ô 16px + A*, rồi nắn thẳng đường đi.
  // Mọi máy đều tính giống nhau nên người khác cũng thấy mình đi vòng y như vậy.
  const CS = 16, GW = Math.ceil(W / CS), GH = Math.ceil(H / CS);
  let gridFree = null;
  function grid(){
    if (gridFree) return gridFree;
    gridFree = new Uint8Array(GW * GH);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) gridFree[j * GW + i] = blocked(i * CS + CS / 2, j * CS + CS / 2) ? 0 : 1;
    return gridFree;
  }
  function clearLine(x0, y0, x1, y1){
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 5);
    for (let k = 1; k <= n; k++){ const t = k / n; if (blocked(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
    return true;
  }
  function plan(x0, y0, x1, y1){
    if (clearLine(x0, y0, x1, y1)) return null;
    const G = grid(), N = GW * GH;
    const cell = (x, y) => Math.min(GH - 1, Math.max(0, Math.floor(y / CS))) * GW + Math.min(GW - 1, Math.max(0, Math.floor(x / CS)));
    const s = cell(x0, y0), goalFree = !blocked(x1, y1);
    let g = cell(x1, y1);
    if (!goalFree && !G[g]){
      let best = -1, bd = 1e9;
      for (let k = 0; k < N; k++) if (G[k]){ const d = Math.hypot(k % GW - g % GW, ((k / GW) | 0) - ((g / GW) | 0)); if (d < bd){ bd = d; best = k; } }
      if (best < 0) return null; g = best;
    }
    const gi = g % GW, gj = (g / GW) | 0, h = k => Math.hypot(k % GW - gi, ((k / GW) | 0) - gj);
    const cost = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N), heap = [];
    const push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i){ const q = (i - 1) >> 1; if (heap[q][0] <= heap[i][0]) break; [heap[q], heap[i]] = [heap[i], heap[q]]; i = q; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length){ heap[0] = last; let i = 0; for (;;){ const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top[1]; };
    const ok = k => G[k] || k === g || k === s;
    cost[s] = 0; push(s, h(s));
    while (heap.length){
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
    // nắn thẳng: nhảy tới điểm xa nhất còn nhìn thấy được
    const out = []; let cx = x0, cy = y0, k = 0;
    while (k < pts.length){
      let far = k;
      for (let m = Math.min(pts.length - 1, k + 40); m > k; m--) if (clearLine(cx, cy, pts[m].x, pts[m].y)){ far = m; break; }
      out.push(pts[far]); cx = pts[far].x; cy = pts[far].y; k = far + 1;
    }
    out.stop = !goalFree;
    return out;
  }

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
  // vị trí vẽ: người nằm giường thì đặt đầu lên gối
  // kiểu chỗ: 'lie' nằm (x, y = chỗ gối đầu), 'sit' ngồi quay ra, 'back' ngồi quay lưng (ngắm trăng), 'tub' ngâm bồn tắm
  const pose = p => {
    const s = p.seat >= 0 ? SEATS[p.seat] : null;
    if (!s) return { x: p.x, y: p.y, lying: false, mode: 'stand' };
    const mode = s.pose || 'lie';
    return { x: s.x, y: mode === 'lie' ? s.y + 34 : s.y, lying: true, mode, face: s.face };
  };
  const seatZ = i => { const s = SEATS[i]; return s.z != null ? s.z : (s.pose || 'lie') === 'lie' ? s.y + .5 : s.y; };
  function drawBody(g, p, t){
    const P = pose(p), x = P.x, y = P.y, walking = p.moving && !P.lying, f = P.face || p.face || 1, back = P.mode === 'back';
    const bob = walking ? Math.abs(Math.sin(t * 13 + p.ph)) * -4 : Math.sin(t * (P.lying ? 1.2 : 2) + p.ph) * 1.2;
    g.save(); g.globalAlpha = p.away ? .45 : 1;
    if (p.speaking > .05 && !p.away){ const r = 30 + p.speaking * 14; g.strokeStyle = `rgba(91,227,138,${.35 + p.speaking * .5})`; g.lineWidth = 4; g.beginPath(); g.ellipse(x, P.lying ? y - 34 : y, r, r * (P.lying ? .8 : .38), 0, 0, 7); g.stroke(); }
    if (P.mode === 'sit'){ g.fillStyle = '#e8902a'; g.beginPath(); g.ellipse(x - 11, y + 2, 9, 5, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 11, y + 2, 9, 5, 0, 0, 7); g.fill(); }
    if (!P.lying){
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y, 26, 9, 0, 0, 7); g.fill();
      const st = walking ? Math.sin(t * 13 + p.ph) * 5 : 0;
      g.fillStyle = '#e8902a'; g.beginPath(); g.ellipse(x - 10, y - 3 + st * .3, 9, 5, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 10, y - 3 - st * .3, 9, 5, 0, 0, 7); g.fill();
    }
    const by = y - 34 + bob;
    g.fillStyle = p.col; g.beginPath(); g.ellipse(x, by, 25, 30, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.stroke();
    if (back){
      // nhìn từ phía sau: không thấy mặt, chỉ có lưng tròn
      g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(x, by + 6, 17, 20, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(x + 10, by - 14, 6, 9, .4, 0, 7); g.fill();
      g.fillStyle = p.col; g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2;
      g.save(); g.translate(x - 22, by + 4); g.rotate(-.25); g.beginPath(); g.ellipse(0, 6, 6, 11, 0, 0, 7); g.fill(); g.stroke(); g.restore();
      g.save(); g.translate(x + 22, by + 4); g.rotate(.25); g.beginPath(); g.ellipse(0, 6, 6, 11, 0, 0, 7); g.fill(); g.stroke(); g.restore();
      drawHat(g, p.hat, x, by - 28);
      g.restore(); return;
    }
    g.fillStyle = 'rgba(255,255,255,.32)'; g.beginPath(); g.ellipse(x + f * 3, by + 8, 15, 16, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x - f * 10, by - 16, 6, 9, -.4 * f, 0, 7); g.fill();
    const sleepy = (P.mode === 'lie' && Math.sin(t * .35 + p.ph) > .55) || (P.mode === 'tub' && Math.sin(t * .5 + p.ph) > .2);
    const blink = sleepy || Math.sin(t * .9 + p.ph * 3) > .985;
    const ex = x + f * 6;
    [-9, 9].forEach(dx => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex + dx, by - 6, 6, blink ? 1.2 : 7.5, 0, 0, 7); g.fill(); if (!blink){ g.fillStyle = '#1a1416'; g.beginPath(); g.arc(ex + dx + f * 2, by - 5, 3.4, 0, 7); g.fill(); } });
    g.fillStyle = 'rgba(255,110,140,.45)'; g.beginPath(); g.ellipse(ex - 15, by + 5, 5, 3, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(ex + 15, by + 5, 5, 3, 0, 0, 7); g.fill();
    g.fillStyle = p.col; g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2;
    const wave = p.speaking > .2 ? Math.sin(t * 10) * .5 : 0;
    g.save(); g.translate(x - 23, by + 6); g.rotate(.5 + wave); g.beginPath(); g.ellipse(0, 6, 6, 11, 0, 0, 7); g.fill(); g.stroke(); g.restore();
    g.save(); g.translate(x + 23, by + 6); g.rotate(-.5); g.beginPath(); g.ellipse(0, 6, 6, 11, 0, 0, 7); g.fill(); g.stroke(); g.restore();
    drawHat(g, p.hat, x, by - 28);
    g.restore();
  }
  function drawLabel(g, p, t, isSelf){
    const P = pose(p), x = P.x, y = P.y, ny = y - 86;
    g.save(); g.globalAlpha = p.away ? .6 : 1;
    g.font = '700 16px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(p.name, x, ny); g.fillStyle = isSelf ? '#ffe066' : '#ffffff'; g.fillText(p.name, x, ny);
    const nw = g.measureText(p.name).width;
    if (!isSelf && inside){ const m = linkMode(p.id), dx = x - nw / 2 - 11, dy = ny - 6; g.fillStyle = m === 'p2p' ? '#5be38a' : m === 'relay' ? '#ffb84d' : `rgba(200,200,200,${.4 + .4 * Math.sin(t * 6)})`; g.beginPath(); g.arc(dx, dy, 4.5, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.5; g.stroke(); }
    if (!p.mic){ const mx = x + nw / 2 + 12, my = ny - 6; g.fillStyle = '#ff5a5a'; g.beginPath(); g.arc(mx, my, 8, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(mx - 1.5, my - 4); g.lineTo(mx - 1.5, my + 1); g.moveTo(mx + 1.5, my - 4); g.lineTo(mx + 1.5, my + 1); g.moveTo(mx - 4, my - 4); g.lineTo(mx + 4, my + 4); g.stroke(); }
    if (p.away){ g.fillStyle = '#cdb79a'; g.font = '700 14px Fredoka, sans-serif'; g.fillText('zZ · vắng mặt', x, ny - 20); }
    g.restore();
    if (p.bubble && t < p.bubbleUntil){
      g.font = '500 15px Fredoka, sans-serif';
      const words = p.bubble.split(' '), lines = []; let cur = '';
      words.forEach(w => { const tryL = cur ? cur + ' ' + w : w; if (g.measureText(tryL).width > 190 && cur){ lines.push(cur); cur = w; } else cur = tryL; });
      if (cur) lines.push(cur);
      const L = lines.slice(0, 4), bw = Math.max(...L.map(l => g.measureText(l).width)) + 22, bh = L.length * 19 + 12;
      const bx = x - bw / 2, byy = ny - (p.away ? 26 : 12) - bh - 10;
      g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, bx + 2, byy + 3, bw, bh, 10); g.fill();
      g.fillStyle = '#fffaf0'; rr(g, bx, byy, bw, bh, 10); g.fill();
      g.beginPath(); g.moveTo(x - 7, byy + bh); g.lineTo(x, byy + bh + 9); g.lineTo(x + 7, byy + bh); g.fill();
      g.fillStyle = '#2a1a12'; g.textAlign = 'center'; L.forEach((l, i) => g.fillText(l, x, byy + 21 + i * 19));
    }
  }
  // bảng khoá cạnh cửa (đèn xanh = mở, đỏ = khoá)
  function drawPanel(g, t){
    const locked = lockOn();
    g.fillStyle = '#1a1214'; rr(g, PANEL.x - 16, PANEL.y - 18, 32, 34, 6); g.fill();
    g.strokeStyle = '#c9963a'; g.lineWidth = 2; rr(g, PANEL.x - 16, PANEL.y - 18, 32, 34, 6); g.stroke();
    g.fillStyle = locked ? '#ff5a5a' : '#5be38a'; g.shadowColor = g.fillStyle; g.shadowBlur = 10 + Math.sin(t * 4) * 4;
    g.beginPath(); g.arc(PANEL.x, PANEL.y - 6, 5, 0, 7); g.fill(); g.shadowBlur = 0;
    g.strokeStyle = '#e8d8b8'; g.lineWidth = 2; g.beginPath(); g.rect(PANEL.x - 6, PANEL.y + 2, 12, 9); g.stroke();
    g.beginPath(); locked ? g.arc(PANEL.x, PANEL.y + 2, 4, Math.PI, 0) : g.arc(PANEL.x + 4, PANEL.y + 1, 4, Math.PI, 0); g.stroke();
    if (locked){ g.fillStyle = 'rgba(255,90,90,.25)'; g.fillRect(DOOR.x0, FL.y1 - 6, DOOR.x1 - DOOR.x0, 8); }
  }

  /* ================= TRẠNG THÁI ================= */
  const peers = new Map();
  let self = null, inside = false, roomState = { locked: false, at: 0 }, stateKnown = false, leaving = false, exitPending = false, seatPending = -1;
  let extras = Object.assign({ at: 0 }, R.extras || {});
  const lockOn = () => { const s = roomState; return !!(s && s.locked && Date.now() < Math.min(+s.until || 0, (+s.at || 0) + LOCK_MS)); };
  const lockLeft = () => Math.min(+roomState.until || 0, (+roomState.at || 0) + LOCK_MS) - Date.now();
  const freshPeers = () => [...peers.values()].filter(p => Date.now() - p.seen < 45000);

  /* ================= MẠNG (MQTT) ================= */
  const T_STATE = PREFIX + '/state', T_P = PREFIX + '/p/', T_MOVE = PREFIX + '/m', T_CHAT = PREFIX + '/c', T_SIG = PREFIX + '/s/', T_BYE = PREFIX + '/bye', T_X = PREFIX + '/x';
  const clients = []; const seen = new Map();
  let connectedCount = 0;
  function pub(topic, obj, retain){
    const payload = obj === null ? '' : JSON.stringify(Object.assign({}, obj, { k: rid(8) }));   // mã chống trùng luôn mới
    clients.forEach(c => { if (c.connected) c.publish(topic, payload, { qos: 0, retain: !!retain }); });
  }
  function onMsg(topic, buf){
    if (topic === T_AUD) return onAudio(buf);
    const str = buf && buf.length ? buf.toString() : '';
    let d = null;
    if (str){ try { d = JSON.parse(str); } catch (e) { return; } if (!d || typeof d !== 'object') return;
      if (d.k){ if (seen.has(d.k)) return; seen.set(d.k, Date.now()); if (seen.size > 800){ const cut = Date.now() - 60000; for (const [k, v] of seen) if (v < cut) seen.delete(k); } } }
    if (topic === T_STATE) return onState(d);
    if (topic === T_X) return onExtras(d);
    if (topic.startsWith(T_P)) return onPresence(topic.slice(T_P.length), d);
    if (topic === T_MOVE) return d && onMove(d);
    if (topic === T_CHAT) return d && onChat(d);
    if (topic === T_BYE) return d && dropPeer(String(d.id));
    if (topic === T_SIG + me) return d && onSignal(d);
    if (R.topics) for (const k in R.topics){
      const base = PREFIX + '/' + k.replace(/\/\+$/, '/');
      if (k.endsWith('/+') ? topic.startsWith(base) && !topic.slice(base.length).includes('/') : topic === PREFIX + '/' + k){ try { R.topics[k](topic.slice(base.length), d, K); } catch (e) {} return; }
    }
  }
  function connectNet(){
    if (!window.mqtt){ netDown('không tải được thư viện kết nối'); return; }
    BROKERS.forEach((url, i) => {
      let c;
      try {
        c = mqtt.connect(url, { clientId: 'anrevy_' + me + '_' + i + rid(3), clean: true, keepalive: 30, reconnectPeriod: 5000, connectTimeout: 12000,
          will: { topic: T_P + me, payload: '', qos: 0, retain: true } });
      } catch (e) { return; }
      c.on('connect', () => {
        c.subscribe([T_STATE, T_X, T_P + '+', T_MOVE, T_CHAT, T_BYE, T_SIG + me].concat(Object.keys(R.topics || {}).map(k => PREFIX + '/' + k)), { qos: 0 });
        if (inside) c.subscribe(T_AUD, { qos: 0 });
        connectedCount = clients.filter(x => x.connected).length;
        setTimeout(() => { if (!stateKnown){ stateKnown = true; ui(); } }, 1500);
        if (inside) publishPresence();
        ui();
      });
      c.on('message', onMsg);
      c.on('close', () => { connectedCount = clients.filter(x => x.connected).length; ui(); });
      c.on('error', () => {});
      clients.push(c);
    });
    setTimeout(() => { if (!connectedCount) netDown('chưa kết nối được máy chủ phòng, đang thử lại…'); }, 12000);
  }
  let netNote = '';
  function netDown(msg){ netNote = msg; ui(); }

  function onState(d){
    if (!d){ if (!stateKnown){ stateKnown = true; ui(); } return; }
    if ((+d.at || 0) < (+roomState.at || 0) || (+d.at || 0) > Date.now() + 60000) return;
    roomState = { locked: !!d.locked, salt: String(d.salt || ''), hash: String(d.hash || ''), at: +d.at || 0, until: +d.until || 0, by: cleanName(d.by) };
    stateKnown = true; ui();
  }
  // trạng thái riêng của phòng (vd. đèn bật/tắt) — giữ lại trên máy chủ
  function onExtras(d){
    if (!d) return;
    if ((+d.at || 0) < (+extras.at || 0) || (+d.at || 0) > Date.now() + 60000) return;
    const prev = extras; extras = Object.assign({}, R.extras || {}, d); delete extras.k;
    if (R.onExtras) R.onExtras(extras, prev, K);
  }
  function setExtras(patch){
    extras = Object.assign({}, extras, patch, { at: Date.now(), by: self ? self.name : '' });
    pub(T_X, extras, true);
  }
  function onPresence(id, d){
    if (!/^[a-z0-9]{10}$/.test(id) || id === me) return;
    if (!d){ const p = peers.get(id); if (p) p.lwt = Date.now(); return; }
    if (Date.now() - (+d.t || 0) > 60000) return;
    let p = peers.get(id);
    const fresh = !p;
    if (!p){ p = { id, x: +d.x || SPAWN.x, y: +d.y || SPAWN.y, tx: +d.x || SPAWN.x, ty: +d.y || SPAWN.y, ph: Math.random() * 6, face: 1, speaking: 0, seat: -1, joinT: Date.now() }; peers.set(id, p); }
    if (typeof d.pk === 'string' && d.pk.length < 200 && d.pk !== p.pk){ p.pk = d.pk; if (inside) sendKey(id); }
    p.name = cleanName(d.name) || 'khách'; p.col = COLORS.includes(d.col) ? d.col : COLORS[0]; p.hat = HATS.includes(d.hat) ? d.hat : 'none';
    p.mic = !!d.mic; p.away = !!d.away; p.seen = Date.now(); p.lwt = 0;
    const seat = Number.isInteger(d.seat) && d.seat >= 0 && d.seat < SEATS.length ? d.seat : -1;
    if (seat !== p.seat){ p.seat = seat; if (seat < 0 && d.x != null){ p.x = clamp(+d.x, 0, W); p.y = clamp(+d.y, 0, H); } }
    if (!p.moving && d.x != null){ p.tx = clamp(+d.x, 0, W); p.ty = clamp(+d.y, 0, H); }
    if (fresh){ if (inside){ toast(p.name + ' vừa vào phòng'); ensurePeer(id); (early[id] || []).splice(0).forEach(onSignal); } ui(); }
    if (self && self.seat >= 0 && p.seat === self.seat && p.id < me) bumpSeat();
  }
  function onMove(d){
    const p = peers.get(String(d.id)); if (!p) return;
    const x = clamp(+d.x, 0, W), y = clamp(+d.y, 0, H);
    if (Math.hypot(p.x - x, p.y - y) > 140){ p.x = x; p.y = y; }
    p.tx = clamp(+d.tx, 0, W); p.ty = clamp(+d.ty, 0, H); p.seen = Date.now();
  }
  function onChat(d){
    const p = String(d.id) === me ? self : peers.get(String(d.id)); if (!p) return;
    p.bubble = cleanText(d.text); p.bubbleUntil = clock + 7;
  }
  function dropPeer(id){
    if (!peers.has(id)) return;
    const p = peers.get(id); peers.delete(id); closePeer(id); peerKey.delete(id); sentKey.delete(id); rx.delete(id);
    if (inside) toast(p.name + ' đã rời phòng');
    ui();
  }
  function publishPresence(){
    if (!inside || !self) return;
    pub(T_P + me, { id: me, name: self.name, col: self.col, hat: self.hat, x: Math.round(self.x), y: Math.round(self.y), mic: self.mic, away: self.away, seat: self.seat, pk: myPub, t: Date.now() }, true);
  }
  setInterval(() => { if (inside) publishPresence(); }, 12000);
  setInterval(() => { const now = Date.now(); for (const [id, p] of peers) if (p.seen < now - 45000 || (p.lwt && now - p.lwt > 15000)) dropPeer(id); }, 3000);

  /* ================= CHỖ NẰM / CHỖ NGỒI ================= */
  // mỗi chỗ có thể thuộc một nhóm (giường, ghế, bồn tắm…): bấm vào đồ nào thì chỉ tìm chỗ trong nhóm đó
  const seatTaken = i => [...peers.values()].some(p => p.seat === i && Date.now() - p.seen < 45000);
  const sameGroup = (i, k) => (SEATS[i].g || '') === (SEATS[k].g || '');
  const fullMsg = g => (R.seatFullBy && R.seatFullBy[g]) || R.seatFull || 'Hết chỗ rồi.';
  function claimSeat(group){
    if (!self || !SEATS.length) return;
    const inG = i => !group || SEATS[i].g === group;
    if (self.seat >= 0){ if (inG(self.seat)) return; standUp(); }
    const free = SEATS.map((s, i) => i).filter(i => inG(i) && !seatTaken(i));
    if (!free.length){ toast(fullMsg(group), true); return; }
    // chọn chỗ gần mình hơn
    free.sort((a, b) => Math.hypot(SEATS[a].ax - self.x, SEATS[a].ay - self.y) - Math.hypot(SEATS[b].ax - self.x, SEATS[b].ay - self.y));
    seatPending = free[0]; exitPending = false; actPending = null;
    self.tx = SEATS[seatPending].ax; self.ty = SEATS[seatPending].ay; marker = { x: self.tx, y: self.ty, t: clock };
    sendMove();
  }
  function sitDown(i){
    if (seatTaken(i)){ const other = SEATS.map((s, k) => k).find(k => k !== i && sameGroup(i, k) && !seatTaken(k)); if (other === undefined){ toast(fullMsg(SEATS[i].g), true); return; } i = other; }
    self.seat = i; self.x = SEATS[i].ax; self.y = SEATS[i].ay; self.tx = self.x; self.ty = self.y; self.moving = false;
    publishPresence(); sendMove();
    if (R.onSeat) R.onSeat(i, K);
  }
  function standUp(){ if (!self || self.seat < 0) return; const i = self.seat, s = SEATS[i]; self.seat = -1; self.x = s.ax; self.y = s.ay; publishPresence(); if (R.onStand) R.onStand(i, K); }
  function bumpSeat(){ const i = self.seat; standUp(); const other = SEATS.map((s, k) => k).find(k => k !== i && sameGroup(i, k) && !seatTaken(k)); if (other !== undefined) sitDown(other); else toast(fullMsg(SEATS[i].g), true); }
  // ai đang ở chỗ i (kể cả mình)
  const occupant = i => (self && self.seat === i) ? self : [...peers.values()].find(p => p.seat === i && Date.now() - p.seen < 45000) || null;
  // đi tới gần (x, y) rồi mới làm việc fn — vd. đứng cạnh bồn rửa mới mở được vòi
  let actPending = null;
  function approach(x, y, fn, r = 46){
    if (!self) return;
    if (self.seat >= 0) standUp();
    seatPending = -1; exitPending = false;
    if (Math.hypot(self.x - x, self.y - y) <= r){ actPending = null; fn(); return; }
    actPending = { x, y, fn, r, until: clock + 9 };
    self.tx = x; self.ty = y; marker = { x, y, t: clock }; sendMove();
  }

  /* ================= GỌI THOẠI (WebRTC) ================= */
  let localStream = null, actx = null, localAn = null;
  const pcs = new Map();
  const early = {};
  const dbg = [];   // nhật ký ngắn để chẩn đoán kết nối thoại
  const note = (...a) => { dbg.push(Math.round(performance.now()) + ' ' + a.join(' ')); if (dbg.length > 200) dbg.shift(); };
  function sig(to, data){ const st = pcs.get(to); pub(T_SIG + to, { from: me, sid: st ? st.sid : '', d: data }); }
  function analyser(stream){
    if (!actx) return null;
    try { const src = actx.createMediaStreamSource(stream); const an = actx.createAnalyser(); an.fftSize = 512; src.connect(an); return { an, buf: new Uint8Array(an.fftSize) }; } catch (e) { return null; }
  }
  const level = a => { if (!a) return 0; a.an.getByteTimeDomainData(a.buf); let s = 0; for (let i = 0; i < a.buf.length; i++){ const v = (a.buf[i] - 128) / 128; s += v * v; } return Math.sqrt(s / a.buf.length); };
  function ensurePeer(id){
    if (!inside || pcs.has(id) || id === me) return pcs.get(id);
    if (pcs.size >= MAX_PEOPLE - 1) return null;
    const pc = new RTCPeerConnection(qs.get('nop2p') ? { iceServers: [], iceTransportPolicy: 'relay' } : { iceServers: ICE });   // nop2p: chỉ để chạy thử đường vòng
    // chỉ một bên (mã nhỏ hơn) chủ động mời để hai bên không mời chéo nhau
    const st = { pc, sid: rid(6), rsid: '', init: me < id, pending: [], audio: null, an: null, t0: Date.now() };
    pcs.set(id, st);
    if (localStream) localStream.getTracks().forEach(tr => pc.addTrack(tr, localStream));
    else pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.onicecandidate = e => { if (e.candidate) sig(id, { ice: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    pc.onnegotiationneeded = async () => {
      if (!st.init) return;
      try { await pc.setLocalDescription(await pc.createOffer()); note('send', pc.localDescription.type, 'to', id); sig(id, { sdp: pc.localDescription.toJSON ? pc.localDescription.toJSON() : pc.localDescription }); }
      catch (e) { note('nego-err', id, e.message); }
    };
    pc.ontrack = e => {
      const stream = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]);
      if (!st.audio){ st.audio = pool.pop() || document.createElement('audio'); st.audio.autoplay = true; st.audio.setAttribute('playsinline', ''); if (!st.audio.parentNode) $('#audios').appendChild(st.audio); }
      st.audio.muted = false; st.audio.volume = 1; st.audio.srcObject = stream;
      const pr = st.audio.play(); if (pr && pr.catch) pr.catch(() => $('#tapAudio').classList.add('on'));
      st.receiver = e.receiver;
    };
    pc.onconnectionstatechange = () => {
      note('conn', id, pc.connectionState);
      if (pc.connectionState === 'failed' && st.init){ try { pc.restartIce(); } catch (e) {} }
    };
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
    note('recv', d.sdp ? d.sdp.type : 'ice', 'from', from, 'state', pc.signalingState, 'init', st.init);
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
      } else if (d.ice){
        if (!pc.remoteDescription) st.pending.push(d.ice);
        else { try { await pc.addIceCandidate(d.ice); } catch (e) {} }
      }
    } catch (e) { note('sig-err', from, e.message); }
  }
  // kết nối treo quá lâu thì dựng lại (tối đa vài lần)
  const retries = {};
  setInterval(() => {
    if (!inside) return;
    pcs.forEach((st, id) => {
      const cs = st.pc.connectionState;
      if (cs === 'connected' || !peers.has(id)) return;
      const age = Date.now() - st.t0, limit = st.init ? 12000 : 20000;
      if (age > limit && (retries[id] || 0) < 4){ retries[id] = (retries[id] || 0) + 1; note('rebuild', id, cs); closePeer(id); ensurePeer(id); }
    });
  }, 4000);
  function closePeer(id){
    const st = pcs.get(id); if (!st) return;
    pcs.delete(id);
    try { st.pc.close(); } catch (e) {}
    if (st.audio){ st.audio.srcObject = null; pool.push(st.audio); }
  }
  /* ================= TIẾNG ĐI VÒNG QUA MÁY CHỦ =================
     Khi hai máy không nối thẳng được với nhau (thường do mạng 4G hoặc tường lửa),
     tiếng nói được nén (ADPCM 12 kHz), mã hoá AES-GCM bằng khoá chỉ người trong phòng có
     (trao qua ECDH), rồi gửi qua máy chủ chuyển tin. Chỉ gửi khi đang nói. */
  const T_AUD = PREFIX + '/a';
  const RATE = 12000, FRAME = 720;   // khung 60 ms
  const b64 = u => btoa(String.fromCharCode(...u));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  let kp = null, myPub = '', audKey = null, audKeyRaw = null;
  const peerKey = new Map(), sentKey = new Map();
  async function cryptoInit(){
    if (kp || !crypto.subtle) return;
    try {
      kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
      myPub = b64(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)));
      audKeyRaw = crypto.getRandomValues(new Uint8Array(16));
      audKey = await crypto.subtle.importKey('raw', audKeyRaw, 'AES-GCM', false, ['encrypt']);
    } catch (e) { kp = null; note('crypto-err', e.message); }
  }
  async function pairKey(pk){
    const pub = await crypto.subtle.importKey('raw', unb64(pk), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    return crypto.subtle.deriveKey({ name: 'ECDH', public: pub }, kp.privateKey, { name: 'AES-GCM', length: 128 }, false, ['encrypt', 'decrypt']);
  }
  async function sendKey(id){
    const p = peers.get(id); if (!inside || !p || !p.pk || !kp || sentKey.get(id) === p.pk) return;
    sentKey.set(id, p.pk);
    try { const k = await pairKey(p.pk), iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, audKeyRaw)); pub(T_SIG + id, { from: me, kx: b64(iv) + '.' + b64(ct) }); }
    catch (e) { sentKey.delete(id); note('kx-err', e.message); }
  }
  async function onKey(from, kx){
    const p = peers.get(from); if (!p || !p.pk || !kp) return;
    try { const [a, b] = String(kx).split('.'); const k = await pairKey(p.pk); const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(a) }, k, unb64(b)); peerKey.set(from, await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt'])); note('key-from', from); }
    catch (e) { note('kx-dec-err', e.message); }
  }
  // cặp nào chưa nối thẳng được sau vài giây thì dùng đường vòng
  function needRelay(id){
    const p = peers.get(id); if (!p || Date.now() - p.seen > 45000) return false;
    const st = pcs.get(id), cs = st ? st.pc.connectionState : 'none';
    if (cs === 'connected') return false;
    return Date.now() - p.joinT > 7000 || cs === 'failed';
  }
  const linkMode = id => { const st = pcs.get(id); if (st && st.pc.connectionState === 'connected') return 'p2p'; return needRelay(id) ? 'relay' : 'wait'; };

  // nén ADPCM (IMA) 4 bit
  const STEP = [7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767];
  const IDXT = [-1,-1,-1,-1,2,4,6,8,-1,-1,-1,-1,2,4,6,8];
  let encIdx = 0;
  function adpcmEncode(f32){
    const out = new Uint8Array(3 + f32.length / 2);
    let pred = Math.max(-32768, Math.min(32767, Math.round(f32[0] * 32767))), idx = encIdx;
    out[0] = pred & 255; out[1] = (pred >> 8) & 255; out[2] = idx;
    for (let i = 0; i < f32.length; i++){
      const s = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767)));
      let step = STEP[idx], d = s - pred, code = 0;
      if (d < 0){ code = 8; d = -d; }
      let delta = step >> 3;
      if (d >= step){ code |= 4; d -= step; delta += step; } step >>= 1;
      if (d >= step){ code |= 2; d -= step; delta += step; } step >>= 1;
      if (d >= step){ code |= 1; delta += step; }
      pred += (code & 8) ? -delta : delta; pred = Math.max(-32768, Math.min(32767, pred));
      idx = Math.max(0, Math.min(88, idx + IDXT[code]));
      if (i & 1) out[3 + (i >> 1)] |= code << 4; else out[3 + (i >> 1)] = code;
    }
    encIdx = idx;
    return out;
  }
  function adpcmDecode(u){
    let pred = (u[0] | (u[1] << 8)); if (pred > 32767) pred -= 65536;
    let idx = Math.min(88, u[2]);
    const n = (u.length - 3) * 2, out = new Float32Array(n);
    for (let i = 0; i < n; i++){
      const code = i & 1 ? u[3 + (i >> 1)] >> 4 : u[3 + (i >> 1)] & 15;
      const step = STEP[idx];
      let delta = step >> 3;
      if (code & 4) delta += step; if (code & 2) delta += step >> 1; if (code & 1) delta += step >> 2;
      pred += (code & 8) ? -delta : delta; pred = Math.max(-32768, Math.min(32767, pred));
      idx = Math.max(0, Math.min(88, idx + IDXT[code]));
      out[i] = pred / 32768;
    }
    return out;
  }

  // thu tiếng từ micro → khung 60 ms
  let proc = null, procSrc = null, lpf = 0, rsPos = 0, accN = 0, seq = 0, vadHang = 0, echoLvl = 0;
  const acc = new Float32Array(FRAME);
  function startCapture(){
    if (!actx || !localStream || proc) return;
    try {
      procSrc = actx.createMediaStreamSource(localStream);
      proc = actx.createScriptProcessor(2048, 1, 1);
      const sink = actx.createGain(); sink.gain.value = 0;
      procSrc.connect(proc); proc.connect(sink); sink.connect(actx.destination);
      const ratio = actx.sampleRate / RATE, a = 1 - Math.exp(-2 * Math.PI * 5000 / actx.sampleRate);
      proc.onaudioprocess = e => {
        const x = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < x.length; i++){
          lpf += (x[i] - lpf) * a;
          if ((rsPos += 1) >= ratio){ rsPos -= ratio; acc[accN++] = lpf; if (accN === FRAME){ accN = 0; frameOut(acc); } }
        }
      };
    } catch (e) { note('capture-err', e.message); proc = null; }
  }
  function stopCapture(){ try { if (procSrc) procSrc.disconnect(); if (proc){ proc.onaudioprocess = null; proc.disconnect(); } } catch (e) {} proc = null; procSrc = null; }
  async function frameOut(f){
    if (!inside || !self || !self.mic || self.away || !audKey) return;
    let s = 0; for (let i = 0; i < FRAME; i++) s += f[i] * f[i];
    const rms = Math.sqrt(s / FRAME);
    if (rms > Math.max(.012, echoLvl * 1.8)) vadHang = 6; else if (vadHang > 0) vadHang--; else return;
    if (![...peers.keys()].some(needRelay)) return;
    const plain = adpcmEncode(f), iv = crypto.getRandomValues(new Uint8Array(12)), n = ++seq;
    let ct;
    try { ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, audKey, plain)); } catch (e) { return; }
    const pkt = new Uint8Array(27 + ct.length);
    pkt[0] = 1; for (let i = 0; i < 10; i++) pkt[1 + i] = me.charCodeAt(i);
    pkt[11] = n >>> 24; pkt[12] = (n >>> 16) & 255; pkt[13] = (n >>> 8) & 255; pkt[14] = n & 255;
    pkt.set(iv, 15); pkt.set(ct, 27);
    clients.forEach(c => { if (c.connected) c.publish(T_AUD, pkt, { qos: 0, retain: false }); });
    relayTx = performance.now();
  }
  let relayTx = 0, relayRx = 0;

  // nhận và phát lại, có đệm chống giật
  const rx = new Map();
  async function onAudio(buf){
    if (!inside || !actx || !buf || buf.length < 40 || buf[0] !== 1) return;
    const from = String.fromCharCode(...buf.subarray(1, 11));
    if (from === me || !needRelay(from)) return;
    const key = peerKey.get(from); if (!key) return;
    const n = ((buf[11] << 24) >>> 0) + (buf[12] << 16) + (buf[13] << 8) + buf[14];
    let r = rx.get(from);
    if (!r){ r = { next: 0, seen: new Set(), g: actx.createGain() }; r.g.connect(actx.destination); rx.set(from, r); }
    if (r.seen.has(n)) return; r.seen.add(n); if (r.seen.size > 120) r.seen = new Set([...r.seen].slice(-60));
    let plain;
    try { plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(15, 27) }, key, buf.slice(27))); } catch (e) { return; }
    const pcm = adpcmDecode(plain); relayRx++;
    let s = 0; for (let i = 0; i < pcm.length; i++) s += pcm[i] * pcm[i];
    const lvl = Math.sqrt(s / pcm.length);
    const p = peers.get(from); if (p){ p.relayLvl = Math.max(p.relayLvl || 0, lvl); p.relayAt = performance.now(); }
    echoLvl = Math.max(echoLvl, lvl);
    const now = actx.currentTime;
    if (r.next < now + .04) r.next = now + .16;
    if (r.next > now + .9) return;
    const b = actx.createBuffer(1, pcm.length, RATE); b.getChannelData(0).set(pcm);
    const src = actx.createBufferSource(); src.buffer = b; src.connect(r.g); src.start(r.next); r.next += b.duration;
  }
  setInterval(() => { echoLvl *= .7; peers.forEach(p => { if (p.relayLvl) p.relayLvl *= .6; }); }, 100);
  // báo một lần khi phải đi đường vòng
  setInterval(() => {
    if (!inside) return;
    peers.forEach(p => { if (!p.relayNoted && needRelay(p.id)){ p.relayNoted = true; toast('Không nối thẳng được với ' + p.name + ' — tiếng sẽ đi vòng qua máy chủ, có thể trễ một chút.'); } });
  }, 2000);

  // phát lại tiếng người khác: chuẩn bị sẵn loa trong lúc bấm "Vào phòng" (iPhone cần thế)
  const pool = [];
  function unlockAudio(){
    if (!actx) return;
    let silent = null; try { silent = actx.createMediaStreamDestination().stream; } catch (e) {}
    while (pool.length < MAX_PEOPLE){ const a = document.createElement('audio'); a.autoplay = true; a.setAttribute('playsinline', ''); if (silent) a.srcObject = silent; $('#audios').appendChild(a); const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); pool.push(a); }
  }
  // chạm bất kỳ đâu cũng thử phát lại các tiếng đang bị trình duyệt chặn
  document.addEventListener('pointerdown', () => {
    if (!inside) return;
    if (actx && actx.state !== 'running') actx.resume();
    pcs.forEach(st => { if (st.audio && st.audio.paused) st.audio.play().catch(() => {}); });
  }, true);

  $('#tapAudio').addEventListener('click', () => { $('#tapAudio').classList.remove('on'); if (actx) actx.resume(); pcs.forEach(st => st.audio && st.audio.play().catch(() => {})); });

  /* ================= VÀO / RỜI PHÒNG ================= */
  const gate = $('#gate'), goBtn = $('#goBtn'), gErr = $('#gErr');
  async function enter(){
    gErr.textContent = '';
    const name = cleanName($('#name').value);
    if (!name){ gErr.textContent = 'Nhập tên của bạn trước nhé.'; $('#name').focus(); return; }
    prof.name = name; try { localStorage.setItem('lounge-profile', JSON.stringify(prof)); } catch (e) {}
    for (let i = 0; i < 25 && connectedCount && !stateKnown; i++) await new Promise(r => setTimeout(r, 100));   // chờ đọc trạng thái khoá
    if (lockOn()){
      const pw = $('#pwIn').value;
      if (!pw || await sha(roomState.salt + ':' + pw) !== roomState.hash){ gErr.textContent = 'Sai mật khẩu. Hỏi người đã khoá phòng nhé.'; $('#gateForm').classList.remove('shake'); void $('#gateForm').offsetWidth; $('#gateForm').classList.add('shake'); $('#pwIn').select(); return; }
    }
    if (freshPeers().length >= MAX_PEOPLE){ gErr.textContent = 'Phòng đã đủ ' + MAX_PEOPLE + ' người, đợi một lát nhé.'; return; }
    goBtn.disabled = true; goBtn.textContent = 'Đang xin quyền micro…';
    try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) { actx = null; }
    unlockAudio();
    await cryptoInit();
    let micOk = false;
    if (!localStream && navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
      try { localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); micOk = true; }
      catch (e) { localStream = null; }
    } else micOk = !!localStream;
    goBtn.disabled = false; goBtn.textContent = 'Vào phòng';
    if (!micOk) toast('Không dùng được micro — bạn vẫn nghe được mọi người và nhắn tin được.', true);
    localAn = localStream ? analyser(localStream) : null;
    startCapture();
    self = { id: me, name, col: prof.col, hat: prof.hat, x: SPAWN.x, y: SPAWN.y, tx: SPAWN.x + Math.round(Math.random() * 140 - 70), ty: SPAWN.y - 100 - Math.round(Math.random() * 60), ph: Math.random() * 6, face: 1, mic: !!localStream, away: false, speaking: 0, moving: false, seat: -1 };
    inside = true; leaving = false; document.body.classList.add('inside');
    clients.forEach(c => { if (c.connected) c.subscribe(T_AUD, { qos: 0 }); });
    publishPresence(); sendMove();
    freshPeers().forEach(p => { ensurePeer(p.id); sendKey(p.id); });
    micUI(); ui(); musicDuck();
    $('#room').focus({ preventScroll: true });
    toast(connectedCount ? (R.welcome || 'Đã vào phòng. Bấm xuống sàn để đi lại.') : 'Chưa kết nối được máy chủ — bạn đang ở một mình trong phòng.', !connectedCount);
  }
  function leave(reason){
    if (!inside) return;
    inside = false; document.body.classList.remove('inside');
    pub(T_P + me, null, true); pub(T_BYE, { id: me });
    [...pcs.keys()].forEach(closePeer);
    clients.forEach(c => { if (c.connected) c.unsubscribe(T_AUD); });
    stopCapture(); peerKey.clear(); sentKey.clear(); rx.clear();
    peers.forEach(p => { p.relayNoted = false; });
    if (localStream){ localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    self = null; seatPending = -1; actPending = null; clearTimeout(awayT); musicDuck(); ui();
    if (reason) { gErr.textContent = reason; }
  }
  function leaveTo(href, fade){
    leaving = true; leave();
    if (location.search.includes('broker=') && !href.includes('?')) href += location.search;   // giữ cấu hình khi chạy thử
    if (fade){ $('#fade').classList.add('on'); setTimeout(() => { location.href = href; }, 650); }
    else setTimeout(() => { location.href = href; }, 160);
  }
  document.querySelectorAll('[data-leave]').forEach(a => a.addEventListener('click', e => { if (!inside) return; e.preventDefault(); leaveTo(a.href); }));
  $('#gateForm').addEventListener('submit', e => { e.preventDefault(); enter(); });
  $('#leaveBtn').addEventListener('click', () => leave());
  addEventListener('beforeunload', e => { if (inside && !leaving){ e.preventDefault(); e.returnValue = ''; } });
  addEventListener('pagehide', () => { if (inside){ pub(T_P + me, null, true); pub(T_BYE, { id: me }); } });
  addEventListener('pageshow', e => { if (e.persisted){ $('#fade').classList.remove('on'); leaving = false; } });

  // bắt buộc ở lại trang khi đang nói chuyện
  let awayT = null, micBeforeAway = true;
  document.addEventListener('visibilitychange', () => {
    if (!inside || !self) return;
    if (document.hidden){
      micBeforeAway = self.mic; setMic(false, true); self.away = true; publishPresence();
      clearTimeout(awayT); awayT = setTimeout(() => { leave('Bạn đã rời trang quá ' + Math.round(AWAY_KICK_MS / 1000) + ' giây nên cuộc gọi đã ngắt. Bấm “Vào phòng” để nói tiếp.'); }, AWAY_KICK_MS);
    } else {
      clearTimeout(awayT); self.away = false; setMic(micBeforeAway, true); publishPresence();
      toast('Mừng bạn quay lại — micro đã bật lại như cũ.');
    }
  });

  /* mic */
  function setMic(on, quiet){
    if (!self) return;
    if (on && !localStream){ if (!quiet) toast('Không có micro để bật.', true); on = false; }
    self.mic = on; if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = on; });
    micUI(); if (!quiet) publishPresence();
  }
  function micUI(){
    const on = !!(self && self.mic);
    const b = $('#micBtn'); b.classList.toggle('off', !on); b.setAttribute('aria-pressed', on);
    b.querySelector('.slash').style.display = on ? 'none' : ''; $('#micT').textContent = on ? 'Mic bật' : 'Mic tắt';
  }
  $('#micBtn').addEventListener('click', () => { if (self) setMic(!self.mic); });

  /* khoá phòng */
  const lockModal = $('#lockModal');
  function openLock(){
    if (!inside) return;
    $('#lmErr').textContent = '';
    if (lockOn()){
      $('#lmTitle').textContent = 'MỞ KHOÁ PHÒNG'; $('#lmSub').textContent = 'Phòng đang khoá' + (roomState.by ? ' (bởi ' + roomState.by + ')' : '') + ', tự mở sau ' + fmt(lockLeft()) + '. Mở khoá ngay để ai cũng vào được?';
      $('#lmSet').style.display = 'none'; $('#lmOk').textContent = 'Mở khoá';
    } else {
      $('#lmTitle').textContent = 'KHOÁ PHÒNG'; $('#lmSub').textContent = 'Tự đặt mật khẩu. Ai vào sau phải nhập đúng mật khẩu này. Phòng tự mở khoá sau 2 tiếng.';
      $('#lmSet').style.display = ''; $('#lmOk').textContent = 'Khoá 2 tiếng'; $('#pw1').value = ''; $('#pw2').value = '';
    }
    lockModal.classList.add('open');
    setTimeout(() => (lockOn() ? $('#lmOk') : $('#pw1')).focus(), 30);
  }
  function closeLock(){ lockModal.classList.remove('open'); $('#room').focus({ preventScroll: true }); }
  $('#lockBtn').addEventListener('click', openLock);
  $('#lmCancel').addEventListener('click', closeLock);
  lockModal.addEventListener('click', e => { if (e.target === lockModal) closeLock(); });
  $('#lockForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (lockOn()){
      roomState = { locked: false, at: Date.now(), by: self ? self.name : '' };
      pub(T_STATE, roomState, true); closeLock(); ui(); toast('Đã mở khoá phòng.'); sysChat('đã mở khoá phòng 🔓');
      return;
    }
    const a = $('#pw1').value, b = $('#pw2').value;
    if (a.length < 4){ $('#lmErr').textContent = 'Mật khẩu cần ít nhất 4 ký tự.'; return; }
    if (a !== b){ $('#lmErr').textContent = 'Hai lần nhập chưa khớp.'; return; }
    const salt = rid(12), at = Date.now();
    roomState = { locked: true, salt, hash: await sha(salt + ':' + a), at, until: at + LOCK_DUR, by: self ? self.name : '' };
    pub(T_STATE, roomState, true); closeLock(); ui();
    toast('Đã khoá phòng trong 2 tiếng. Gửi mật khẩu cho người bạn muốn mời.'); sysChat('đã khoá phòng 🔒');
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && lockModal.classList.contains('open')) closeLock(); });
  setInterval(() => { if (inside && roomState.locked && !lockOn() && roomState.at){ roomState = { locked: false, at: Date.now(), by: '' }; pub(T_STATE, roomState, true); toast('Đã hết 2 tiếng — phòng tự mở khoá.'); } }, 5000);

  /* chat */
  function sysChat(text){ if (!self) return; pub(T_CHAT, { id: me, text }); self.bubble = text; self.bubbleUntil = clock + 5; }
  $('#chat').addEventListener('submit', e => {
    e.preventDefault(); const v = cleanText($('#chatIn').value); if (!v || !self) return;
    pub(T_CHAT, { id: me, text: v }); self.bubble = v; self.bubbleUntil = clock + 7; $('#chatIn').value = '';
    if (matchMedia('(max-width:760px)').matches){ $('#chat').classList.remove('open'); $('#chatBtn').setAttribute('aria-expanded', 'false'); $('#room').focus({ preventScroll: true }); }
  });
  $('#chatIn').addEventListener('keydown', e => { if (e.key === 'Escape'){ e.preventDefault(); $('#chatIn').blur(); $('#chat').classList.remove('open'); $('#room').focus({ preventScroll: true }); } });
  $('#chatBtn').addEventListener('click', () => { const o = !$('#chat').classList.contains('open'); $('#chat').classList.toggle('open', o); $('#chatBtn').setAttribute('aria-expanded', o); if (o) $('#chatIn').focus(); });

  /* ================= GIAO DIỆN ================= */
  const swRoot = $('#swatches'), hatRoot = $('#hats');
  COLORS.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.style.background = c; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', 'màu ' + c); b.dataset.c = c; swRoot.appendChild(b); });
  HATS.forEach(h => { const b = document.createElement('button'); b.type = 'button'; b.className = 'hat'; b.setAttribute('role', 'radio'); b.dataset.h = h; b.setAttribute('aria-label', { none: 'không mũ', top: 'mũ chóp', beret: 'mũ nồi', crown: 'vương miện', cowboy: 'mũ cao bồi', phones: 'tai nghe', party: 'mũ tiệc', flower: 'hoa' }[h]); const cv = document.createElement('canvas'); cv.width = 80; cv.height = 80; b.appendChild(cv); hatRoot.appendChild(b); });
  function paintPicker(){
    swRoot.querySelectorAll('.sw').forEach(b => { const on = b.dataset.c === prof.col; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    hatRoot.querySelectorAll('.hat').forEach(b => {
      const on = b.dataset.h === prof.hat; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1;
      const g = b.firstChild.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 80, 80); g.setTransform(.7, 0, 0, .7, 1.5, 4);
      drawBody(g, { x: 55, y: 100, name: '', col: prof.col, hat: b.dataset.h, mic: true, ph: 1, face: 1, speaking: 0, seat: -1 }, 0);
    });
  }
  swRoot.addEventListener('click', e => { const b = e.target.closest('.sw'); if (!b) return; prof.col = b.dataset.c; paintPicker(); });
  hatRoot.addEventListener('click', e => { const b = e.target.closest('.hat'); if (!b) return; prof.hat = b.dataset.h; paintPicker(); });
  [swRoot, hatRoot].forEach(root => root.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return; e.preventDefault();
    const items = [...root.children], i = items.findIndex(b => b.getAttribute('aria-checked') === 'true'), n = items[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length];
    n.click(); n.focus();
  }));
  $('#name').value = prof.name;
  paintPicker();

  const status = $('#status'), stTxt = $('#stTxt');
  function ui(){
    const n = freshPeers().length + (inside ? 1 : 0);
    const locked = lockOn();
    status.classList.toggle('locked', locked); status.classList.toggle('off', !connectedCount);
    if (!connectedCount) stTxt.innerHTML = netNote ? 'ngoại tuyến' : 'đang kết nối…';
    else stTxt.innerHTML = (locked ? '🔒 Đang khoá' : '🔓 Phòng mở') + ' · ' + n + ' người' + (locked ? ' <small>· mở sau ' + fmt(lockLeft()) + '</small>' : '');
    gate.classList.toggle('locked', locked && !inside);
    const gIco = $('#gIco'), gHead = $('#gHead'), gSub = $('#gSub');
    if (!connectedCount){ gIco.textContent = '⏳'; gHead.textContent = netNote ? 'Chưa kết nối được tới phòng' : 'Đang kết nối tới phòng…'; gSub.textContent = netNote ? 'Bạn vẫn có thể vào đi dạo và nghe nhạc. Trang sẽ tự kết nối lại.' : ''; }
    else if (locked){ gIco.textContent = '🔒'; gHead.textContent = 'Phòng đang khoá' + (roomState.by ? ' bởi ' + roomState.by : ''); gSub.textContent = 'Nhập đúng mật khẩu để vào. Tự mở khoá sau ' + fmt(lockLeft()) + '.'; }
    else { gIco.textContent = '🔓'; gHead.textContent = 'Phòng đang mở'; gSub.textContent = freshPeers().length ? 'Mọi người đang ở trong phòng:' : 'Chưa có ai — bạn vào trước nhé.'; }
    const who = $('#gWho'); who.textContent = '';
    freshPeers().slice(0, 12).forEach(p => { const i = document.createElement('i'); i.textContent = p.name + (p.mic ? '' : ' 🔇'); who.appendChild(i); });
    $('#lockT').textContent = locked ? 'Mở khoá' : 'Khoá phòng';
    $('#lockBtn').classList.toggle('hot', locked);
    $('#shackle').setAttribute('d', locked ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.7-1.5');
  }
  setInterval(ui, 1000);

  /* ================= VẼ + DI CHUYỂN ================= */
  const bg = document.createElement('canvas');
  const BGS = 1.6; bg.width = W * BGS; bg.height = H * BGS;
  const cv = $('#room'), ctx = cv.getContext('2d');
  let DPR = 1, view = { s: 1, ox: 0, oy: 0 }, clock = 0, marker = null;
  function resize(){ DPR = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR); }
  resize(); addEventListener('resize', resize);
  function camera(){
    const vw = innerWidth, vh = innerHeight, small = vw < 760;
    const padT = small ? 92 : 64, padB = small ? 72 : 78;
    const fit = Math.min(vw / W, (vh - padT - padB) / H);
    const s = Math.max(fit, small ? Math.max(.52, Math.min(.68, (vh - padT - padB) / H)) : .4);   // điện thoại: phóng to vừa chiều cao, camera đi theo mình
    let cx, cy;
    const focus = self ? pose(self) : { x: W / 2, y: H / 2 + 60 };
    if (W * s <= vw) cx = (vw - W * s) / 2; else cx = clamp(vw / 2 - focus.x * s, vw - W * s, 0);
    const availH = vh - padT - padB;
    if (H * s <= availH) cy = padT + (availH - H * s) / 2; else cy = clamp(padT + availH / 2 - (focus.y - 40) * s, vh - padB - H * s, padT);
    view.s = s; view.ox = view.ox ? view.ox + (cx - view.ox) * .15 : cx; view.oy = view.oy ? view.oy + (cy - view.oy) * .15 : cy;
  }
  const toWorld = (sx, sy) => ({ x: (sx - view.ox) / view.s, y: (sy - view.oy) / view.s });
  function sendMove(){ if (!self) return; pub(T_MOVE, { id: me, x: Math.round(self.x), y: Math.round(self.y), tx: Math.round(self.tx), ty: Math.round(self.ty) }); clearTimeout(sendMove._t); sendMove._t = setTimeout(publishPresence, 1200); }
  function goDoor(){ if (!self) return; standUp(); seatPending = -1; actPending = null; self.tx = (DOOR.x0 + DOOR.x1) / 2; self.ty = BOUND.y1; exitPending = true; marker = { x: self.tx, y: self.ty, t: clock }; sendMove(); toast('Đi ra cửa… (bấm chỗ khác để ở lại)'); }

  // bộ công cụ cho trang cấu hình
  const K = {
    rr, toast, lockOn, claimSeat, standUp, setExtras, openLock, goDoor, leaveTo,
    publish: (sub, obj, retain) => pub(PREFIX + '/' + sub, obj, retain), rid,
    get profileName(){ return prof.name; },
    get clock(){ return clock; }, get self(){ return self; }, get inside(){ return inside; }, get extras(){ return extras; },
    get soundOn(){ return soundOn; }, toggleMusic: () => toggleMusic(), peers,
    seatTaken, occupant, approach, me, seats: SEATS,
    near: (x, y, r = 60) => !!self && Math.hypot(self.x - x, self.y - y) <= r
  };
  const HOT = (R.hotspots ? R.hotspots(K) : []).concat([
    { r: [DOOR.x0, FL.y1 - 30, DOOR.x1, FL.y1 + 40], act: goDoor },
    { r: [PANEL.x - 22, PANEL.y - 26, PANEL.x + 22, PANEL.y + 22], act: openLock }
  ]);
  const PROPS = (R.props ? R.props(K) : []).concat([{ y: (FL.y1 + 20), d: drawPanel }]);
  R.drawBG(bg.getContext('2d'), K, BGS);

  cv.addEventListener('pointerdown', e => {
    const w = toWorld(e.clientX, e.clientY);
    for (const h of HOT){ const [a, b, c, d] = h.r; if (w.x >= a && w.x <= c && w.y >= b && w.y <= d){ if (inside || h.always) h.act(w); return; } }
    if (!inside || !self) return;
    exitPending = false; seatPending = -1; actPending = null;
    if (self.seat >= 0) standUp();
    self.tx = clamp(w.x, BOUND.x0, BOUND.x1); self.ty = clamp(w.y, BOUND.y0, BOUND.y1);
    marker = { x: self.tx, y: self.ty, t: clock };
    sendMove();
  });
  const keys = new Set();
  addEventListener('keydown', e => {
    if (!inside || e.target.closest('input,button,textarea') || lockModal.classList.contains('open')) return;
    const k = e.key.toLowerCase(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)){ keys.add(k); e.preventDefault(); }
    if (k === 'enter'){ e.preventDefault(); if (matchMedia('(max-width:760px)').matches) $('#chatBtn').click(); else $('#chatIn').focus(); }
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  function step(p, dt, speed){
    if (p.seat >= 0){ p.moving = false; p.path = null; p.ptx = undefined; return; }
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
    const m = Math.min(d, speed * dt), nx = p.x + dx / d * m, ny = p.y + dy / d * m;
    if (p === self){
      // vướng đồ thì thử đi chếch sang hai bên để vòng qua
      const ux = dx / d, uy = dy / d, side = p.side || 1;
      let ok = false;
      for (const a of [0, .45, -.45, .9, -.9, 1.35, -1.35]){
        const b = a * side, ca = Math.cos(b), sa = Math.sin(b), vx = ux * ca - uy * sa, vy = ux * sa + uy * ca;
        const qx = p.x + vx * m, qy = p.y + vy * m;
        if (!blocked(qx, qy)){ p.x = qx; p.y = qy; ok = true; if (a) p.side = Math.sign(b) || side; if (Math.abs(vx) > .2) p.face = vx > 0 ? 1 : -1; break; }
      }
      if (!ok){ p.tx = p.x; p.ty = p.y; p.moving = false; p.side = -side; sendMove(); }
    } else { p.x = nx; p.y = ny; }
  }
  let last = performance.now(), lastKeySend = 0;
  function frame(now){
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
    if (self && keys.size){
      const vx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
      const vy = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
      if (vx || vy){ if (self.seat >= 0) standUp(); seatPending = -1; actPending = null; self.tx = clamp(self.x + vx * 60, BOUND.x0, BOUND.x1); self.ty = clamp(self.y + vy * 60, BOUND.y0, BOUND.y1); if (now - lastKeySend > 250){ lastKeySend = now; sendMove(); } }
    }
    if (self && exitPending && !self.moving && self.y > BOUND.y1 - 14 && self.x > DOOR.x0 && self.x < DOOR.x1){ exitPending = false; leaveTo(R.exitHref); }
    if (self && seatPending >= 0 && !self.moving && Math.hypot(self.x - SEATS[seatPending].ax, self.y - SEATS[seatPending].ay) < 30){ const i = seatPending; seatPending = -1; sitDown(i); }
    if (self && actPending){ const a = actPending; if (!self.moving && Math.hypot(self.x - a.x, self.y - a.y) <= a.r){ actPending = null; a.fn(); } else if (clock > a.until) actPending = null; }
    if (self){ step(self, dt, 250); self.speaking += ((self.mic && !self.away ? clamp((level(localAn) - .02) * 14, 0, 1) : 0) - self.speaking) * .3; }
    peers.forEach(p => {
      step(p, dt, 250);
      const st = pcs.get(p.id); let lv = 0;
      if (st && st.receiver && st.pc.connectionState === 'connected' && st.receiver.getSynchronizationSources){ const ss = st.receiver.getSynchronizationSources(); if (ss.length && ss[0].audioLevel != null) lv = clamp((ss[0].audioLevel - .015) * 7, 0, 1); }
      if (p.relayLvl) lv = Math.max(lv, clamp((p.relayLvl - .012) * 12, 0, 1));
      p.speaking += (lv - p.speaking) * .3;
    });

    camera();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = R.outside || '#0d0807'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(view.s * DPR, 0, 0, view.s * DPR, view.ox * DPR, view.oy * DPR);
    ctx.drawImage(bg, 0, 0, W, H);
    if (R.underlay) R.underlay(ctx, clock, K);
    if (marker){ const a = clock - marker.t; if (a > .7) marker = null; else { ctx.globalAlpha = 1 - a / .7; ctx.fillStyle = '#e8902a'; ctx.beginPath(); ctx.ellipse(marker.x, marker.y, 34 + a * 20, 14 + a * 8, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; } }
    const list = PROPS.map(p => ({ y: p.y, d: p.d }));
    const people = [...peers.values()]; if (self) people.push(self);
    people.forEach(p => { const P = pose(p); list.push({ y: P.lying ? seatZ(p.seat) : p.y + (p === self ? .1 : 0), d: g => drawBody(g, p, clock) }); });
    list.sort((a, b) => a.y - b.y).forEach(o => o.d(ctx, clock));
    if (R.overlay) R.overlay(ctx, clock, K, view, DPR);
    people.forEach(p => drawLabel(ctx, p, clock, p === self));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  requestAnimationFrame(frame);

  /* ================= NHẠC (YouTube) ================= */
  const tv = $('#tv'), tvMsg = $('#tvMsg'), snd = $('#snd'), tvMin = $('#tvMin');
  let yt = null, ytReady = false, ytDead = false, soundOn = false, userMuted = false, gestured = false;
  const vol = () => inside ? (R.volIn || 35) : (R.volOut || 70);
  function sndUI(){ snd.textContent = soundOn ? 'on' : 'off'; snd.setAttribute('aria-pressed', soundOn); tv.classList.toggle('on', soundOn); }
  function noSignal(txt){ ytDead = true; soundOn = false; tv.classList.add('dead'); tvMsg.innerHTML = 'no signal<small>' + txt + '</small>'; sndUI(); }
  function soundUp(){ if (!ytReady || ytDead) return; yt.unMute(); yt.setVolume(vol()); yt.playVideo(); soundOn = true; sndUI(); }
  function soundDown(){ if (ytReady) yt.mute(); soundOn = false; sndUI(); }
  function musicDuck(){ if (ytReady && soundOn) yt.setVolume(vol()); }
  function toggleMusic(){ gestured = true; if (soundOn){ userMuted = true; soundDown(); } else { userMuted = false; soundUp(); } }
  if (location.protocol === 'file:') noSignal('chỉ chạy khi mở qua web');
  else {
    window.onYouTubeIframeAPIReady = () => {
      yt = new YT.Player('yt', {
        videoId: MUSIC,
        playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, origin: location.origin },
        events: {
          onReady: e => { ytReady = true; e.target.getIframe().setAttribute('title', 'Nhạc của phòng'); e.target.mute(); e.target.playVideo(); if (gestured && !userMuted) soundUp(); },
          onStateChange: e => { if (e.data === YT.PlayerState.ENDED || e.data === YT.PlayerState.PAUSED){ setTimeout(() => { if (ytReady) e.target.playVideo(); }, 800); } },
          onError: () => noSignal('video không phát được')
        }
      });
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => noSignal('không tải được YouTube');
    document.head.appendChild(tag);
    setTimeout(() => { if (!ytReady && !ytDead) noSignal('không tải được YouTube'); }, 15000);
  }
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, e => {
    if (e.target.closest && e.target.closest('#snd')) return;
    gestured = true; if (!userMuted && !soundOn) soundUp();
  }, true));
  snd.addEventListener('click', toggleMusic);
  function setMin(m){ tv.classList.toggle('min', m); tvMin.textContent = m ? '▢' : '–'; tvMin.setAttribute('aria-expanded', !m); tvMin.setAttribute('aria-label', m ? 'Mở lại màn hình' : 'Thu nhỏ màn hình'); try { localStorage.setItem(R.key + '-tv-min', m ? '1' : '0'); } catch (e) {} }
  let startMin = innerWidth < 760; try { const v = localStorage.getItem(R.key + '-tv-min'); if (v) startMin = v === '1'; } catch (e) {}
  setMin(startMin);
  tvMin.addEventListener('click', () => setMin(!tv.classList.contains('min')));

  /* ================= KHỞI ĐỘNG ================= */
  ui(); connectNet();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintPicker);
  window.__lounge = { me, peers, pcs, get inside(){ return inside; }, get state(){ return roomState; }, get self(){ return self; }, get connected(){ return connectedCount; }, get extras(){ return extras; }, lockOn, enter, leave, setMic, claimSeat, setExtras, dbg, linkMode, needRelay, get relayTx(){ return relayTx; }, get relayRx(){ return relayRx; }, hot: HOT, screen: (x, y) => ({ x: view.ox + x * view.s, y: view.oy + y * view.s }), test: { pubState: st => pub(T_STATE, st, true), clients } };
})();
