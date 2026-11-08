/* =====================================================================
   LOUNGE MAP — dinh thự nhỏ: phòng, tường, cửa tự kéo, đồ đạc và mọi tương tác.
   Toạ độ trong file lấy theo bản vẽ gốc (ảnh 2000×1714 px) rồi nhân 2.4 ra đơn vị thế giới.
   File này chỉ mô tả thế giới; phần chạy (mạng, gọi thoại, di chuyển) nằm ở map-engine.js.
   ===================================================================== */
window.LOUNGE_MAP = function (K) {
  'use strict';
  const KX = 2.4, OXI = 20;
  const X = v => Math.round((v - OXI) * KX), Y = v => Math.round(v * KX), S = v => Math.round(v * KX);
  const W = X(1980), H = Y(1540);
  const T = 24, FACE = 48, TAU = Math.PI * 2;
  const rr = K.rr;
  const hash = (a, b) => { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x27d4eb2d); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

  /* ======================= PHÒNG & VÙNG =======================
     kind: room (có tường, có cửa tự kéo) · open (có tường, không cửa) · hall (lối đi) · out (ngoài trời) */
  const ZONES = [{ id: 'garden', name: 'Sân vườn ngoài', kind: 'out', poly: null }];
  const zone = (id, name, kind, pts, o) => ZONES.push(Object.assign({ id, name, kind, poly: pts.map(([a, b]) => [X(a), Y(b)]) }, o || {}));
  const R4 = (a, b, c, d) => [[a, b], [c, b], [c, d], [a, d]];
  zone('wc04', 'WC 04', 'room', R4(1650, 390, 1760, 490), { parent: 'bed01', floor: 'bath', paper: '#cfe0e6' });
  zone('wcmaster', 'WC Master', 'room', R4(120, 620, 305, 805), { parent: 'master', floor: 'bath', paper: '#cfe0e6' });
  zone('master', 'Phòng ngủ Master', 'room', [[120, 345], [205, 345], [205, 255], [360, 255], [360, 345], [590, 345], [590, 620], [120, 620]], { lock: true, floor: 'warm', paper: '#4a3442' });
  zone('study', 'Phòng làm việc', 'room', R4(305, 620, 590, 865), { lock: true, floor: 'dark', paper: '#2e3a2c' });
  zone('pantry', 'Walk-in Pantry', 'room', R4(175, 865, 340, 1225), { floor: 'kitchen', paper: '#e6d9bd' });
  zone('kitchen', 'Phòng bếp', 'room', [[340, 865], [590, 865], [590, 830], [635, 830], [635, 1225], [340, 1225]], { floor: 'kitchen', paper: '#e6d9bd' });
  zone('hallway', 'Hallway', 'hall', [[635, 830], [730, 830], [730, 1075], [1000, 1075], [1000, 1190], [635, 1190]], { floor: 'herring', paper: '#3a2a20', label: [850, 1140] });
  zone('family', 'Phòng sinh hoạt chung', 'room', R4(590, 580, 870, 830), { floor: 'herring', paper: '#4a3426' });
  zone('rec', 'Phòng giải trí', 'open', R4(590, 395, 975, 580), { floor: 'herring', paper: '#2a2238' });
  zone('pub', 'Phòng Pub', 'open', [[1035, 285], [1180, 285], [1240, 345], [1240, 580], [975, 580], [975, 345]], { floor: 'dark', paper: '#3a1a12', label: [1110, 545] });
  zone('court', 'Sân trong', 'out', R4(870, 580, 1240, 830), { floor: 'paver' });
  zone('dining', 'Nhà ăn', 'room', R4(730, 830, 1240, 1075), { floor: 'herring', paper: '#3a2c22' });
  zone('mainhall', 'Sảnh chính', 'hall', R4(1000, 1075, 1335, 1275), { floor: 'marble', paper: '#e0d4bc', label: [1170, 1120] });
  zone('corridor', 'Lối hành lang mở', 'hall', R4(1240, 655, 1330, 1075), { floor: 'marble', paper: '#d8ccb4' });
  zone('poolpath', 'Lối đi ra bể bơi', 'hall', R4(1330, 655, 1445, 985), { floor: 'paver', paper: '#d8ccb4' });
  zone('smallhall', 'Sảnh nhỏ', 'hall', R4(1240, 430, 1445, 655), { floor: 'marble', paper: '#d8ccb4' });
  zone('stairs', 'Lối thang bộ lên tầng 2', 'hall', R4(1445, 490, 1715, 560), { floor: 'marble', paper: '#d8ccb4' });
  zone('pool', 'Bể bơi', 'room', R4(1445, 560, 1715, 985), { floor: 'deck', paper: '#bfe0e6' });
  zone('music', 'Phòng nhạc', 'room', R4(1715, 655, 1890, 985), { floor: 'carpet', paper: '#5a1a1e' });
  zone('bed01', 'Phòng ngủ 01 (Tùng)', 'room', R4(1445, 205, 1760, 490), { lock: true, floor: 'carpet', paper: '#6a1a1e' });
  zone('wcd2', 'WC D2 - Riêng', 'room', R4(1330, 985, 1565, 1075), { floor: 'bath', paper: '#cfe0e6' });
  zone('wc2', 'WC', 'room', R4(1565, 985, 1830, 1075), { floor: 'bath', paper: '#cfe0e6' });
  zone('living', 'Phòng khách', 'room', [[1335, 1075], [1830, 1075], [1830, 1310], [1740, 1400], [1430, 1400], [1335, 1305]], { floor: 'herring', paper: '#3a2c36' });
  zone('pond', 'Hồ cá Koi', 'out', R4(1240, 245, 1445, 430), { floor: 'grass' });
  zone('entry', 'Lối vào', 'out', R4(1120, 1275, 1235, 1440), { floor: 'paver', label: [1177, 1360] });
  const ZI = {}; ZONES.forEach((z, i) => { ZI[z.id] = i; z.idx = i; if (z.poly){ const xs = z.poly.map(p => p[0]), ys = z.poly.map(p => p[1]); z.bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; } });

  // lưới vùng 16 đơn vị: tra nhanh "điểm này thuộc phòng nào"
  const ZC = 16, ZW = Math.ceil(W / ZC), ZH = Math.ceil(H / ZC), ZR = new Uint8Array(ZW * ZH);
  function inPoly(x, y, P){ let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++){ const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
  for (let j = 0; j < ZH; j++) for (let i = 0; i < ZW; i++){
    const x = i * ZC + ZC / 2, y = j * ZC + ZC / 2;
    for (let k = 1; k < ZONES.length; k++){ const b = ZONES[k].bb; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue; if (inPoly(x, y, ZONES[k].poly)){ ZR[j * ZW + i] = k; break; } }
  }
  const zoneAt = (x, y) => { const i = Math.floor(x / ZC), j = Math.floor(y / ZC); return i < 0 || j < 0 || i >= ZW || j >= ZH ? 0 : ZR[j * ZW + i]; };

  /* ======================= CỬA & LỐI THÔNG ======================= */
  const GAPS = [];
  const gap = (kind, v, at, a0, a1, owner, o) => GAPS.push(Object.assign({ kind, v, at: v ? X(at) : Y(at), a0: v ? Y(a0) : X(a0), a1: v ? Y(a1) : X(a1), owner, o: 0 }, o || {}));
  // cửa tự kéo (owner = phòng sở hữu cửa; phòng khoá được thì cửa khoá theo)
  gap('door', false, 1275, 1135, 1220, 'mainhall', { front: true });
  gap('door', true, 1335, 1120, 1200, 'living');
  gap('door', false, 1075, 1080, 1160, 'dining');
  gap('door', true, 730, 920, 990, 'dining');
  gap('door', true, 1240, 920, 990, 'dining');
  gap('door', false, 830, 1010, 1090, 'dining');
  gap('door', true, 635, 1095, 1170, 'kitchen');
  gap('door', true, 340, 1010, 1080, 'pantry');
  gap('door', false, 1225, 430, 500, 'kitchen', { garden: true });
  gap('door', false, 830, 645, 722, 'family');
  gap('door', false, 580, 700, 780, 'family');
  gap('door', true, 870, 660, 740, 'family');
  gap('door', true, 590, 680, 760, 'study');
  gap('door', true, 590, 440, 520, 'master');
  gap('door', false, 620, 170, 240, 'wcmaster');
  gap('door', true, 1445, 432, 488, 'bed01');
  gap('door', true, 1650, 405, 475, 'wc04');
  gap('door', true, 1445, 780, 870, 'pool');
  gap('door', true, 1715, 760, 840, 'music');
  gap('door', true, 1330, 995, 1065, 'wcd2');
  gap('door', false, 1075, 1600, 1670, 'wc2');
  gap('door', false, 1400, 1540, 1620, 'living', { garden: true });
  // lối thông không có cửa (phòng giải trí, pub, sân trong và các sảnh)
  gap('open', false, 395, 700, 800);
  gap('open', true, 975, 430, 540);
  gap('open', false, 580, 890, 960);
  gap('open', false, 580, 1060, 1150);
  gap('open', true, 1240, 450, 560);
  gap('open', true, 1240, 690, 800);
  gap('open', false, 430, 1280, 1400);
  gap('open', true, 1445, 492, 558);
  gap('open', false, 655, 1244, 1326);
  gap('open', false, 655, 1334, 1441);
  gap('open', true, 1330, 680, 970);
  gap('open', false, 1075, 1244, 1331);
  gap('open', true, 1000, 1080, 1185);
  const DOORS = GAPS.filter(g => g.kind === 'door');
  DOORS.forEach((d, i) => { d.id = i; d.cx = d.v ? d.at : (d.a0 + d.a1) / 2; d.cy = d.v ? (d.a0 + d.a1) / 2 : d.at + FACE / 2; d.lock = !!(ZONES[ZI[d.owner]] && ZONES[ZI[d.owner]].lock);
    // vùng chặn khi cửa khoá (chân nhân vật không được lọt vào khe cửa)
    d.block = d.v ? [d.at - T / 2 - 20, d.a0, d.at + T / 2 + 20, d.a1] : [d.a0, d.at - T / 2 - 12, d.a1, d.at + T / 2 + FACE + 4];
    // điểm đứng ngoài cửa (để gõ cửa)
    if (d.lock){ const p1 = d.v ? [d.at - 70, d.cy] : [d.cx, d.at - 60], p2 = d.v ? [d.at + 70, d.cy] : [d.cx, d.at + FACE + 60]; d.out = ZONES[zoneAt(p1[0], p1[1])].id === d.owner ? p2 : p1; d.inPt = d.out === p1 ? p2 : p1; } });

  /* ======================= TƯỜNG =======================
     gộp cạnh các phòng thành từng đoạn tường, khoét chỗ cửa và lối thông */
  const HE = new Map(), VE = new Map(), DW = [];
  ZONES.forEach(z => {
    if (!z.poly || z.kind === 'out') return;
    const P = z.poly;
    for (let i = 0; i < P.length; i++){
      const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length];
      if (y0 === y1){ if (!HE.has(y0)) HE.set(y0, []); HE.get(y0).push([Math.min(x0, x1), Math.max(x0, x1)]); }
      else if (x0 === x1){ if (!VE.has(x0)) VE.set(x0, []); VE.get(x0).push([Math.min(y0, y1), Math.max(y0, y1)]); }
      else { const k = [x0, y0, x1, y1].join(','), k2 = [x1, y1, x0, y0].join(','); if (!DW.some(d => d.k === k || d.k === k2)) DW.push({ x0, y0, x1, y1, k }); }
    }
  });
  const union = L => { L.sort((a, b) => a[0] - b[0]); const o = []; for (const [a, b] of L){ const l = o[o.length - 1]; if (l && a <= l[1] + 1) l[1] = Math.max(l[1], b); else o.push([a, b]); } return o; };
  function cut(ivs, gs){
    let out = ivs.map(([a, b]) => ({ a, b, ea: true, eb: true }));
    for (const [g0, g1] of gs){ const nx = []; for (const s of out){ if (g1 <= s.a || g0 >= s.b){ nx.push(s); continue; } if (g0 > s.a) nx.push({ a: s.a, b: g0, ea: s.ea, eb: false }); if (g1 < s.b) nx.push({ a: g1, b: s.b, ea: false, eb: s.eb }); } out = nx; }
    return out.filter(s => s.b - s.a > 1);
  }
  const HW = [], VW = [];
  for (const [y, L] of HE){
    const gs = GAPS.filter(g => !g.v && g.at === y).map(g => [g.a0, g.a1]);
    for (const p of cut(union(L), gs)){
      // tách theo vùng phía nam (mặt tường nhìn thấy) và phía bắc
      const sAt = x => zoneAt(x, y + T / 2 + 30), nAt = x => zoneAt(x, y - T / 2 - 30);
      let a = p.a, s = sAt(p.a + 4), n = nAt(p.a + 4);
      for (let x = p.a + 8; ; x += 8){
        const end = x >= p.b, s2 = end ? -1 : sAt(x + 4), n2 = end ? -1 : nAt(x + 4);
        if (end || s2 !== s || n2 !== n){ const b = end ? p.b : x; HW.push({ y, x0: a, x1: b, ea: a === p.a && p.ea, eb: end && p.eb, s, n }); if (end) break; a = x; s = s2; n = n2; }
      }
    }
  }
  for (const [x, L] of VE){
    const gs = GAPS.filter(g => g.v && g.at === x).map(g => [g.a0, g.a1]);
    for (const p of cut(union(L), gs)) VW.push({ x, y0: p.a, y1: p.b, ea: p.ea, eb: p.eb });
  }

  /* ======================= MẪU SÀN ======================= */
  function mk(w, h, f){ const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; }
  function specks(g, w, h, n, a, b, s = 2){ for (let i = 0; i < n; i++){ g.fillStyle = hash(i, 7) < .5 ? a : b; g.fillRect(hash(i, 1) * w, hash(i, 2) * h, s, s); } }
  const planks = light => mk(240, 96, g => {
    const tones = light ? ['#c99a66', '#bf8f5c', '#d2a571', '#b88655'] : ['#5a3a24', '#62402a', '#523420', '#6a4630'];
    for (let r = 0; r < 4; r++){ const y = r * 24; let x = -Math.floor(hash(r, 3) * 120), k = 0;
      while (x < 240){ const len = 80 + Math.floor(hash(r, k + 10) * 3) * 40; g.fillStyle = tones[(r + k) % 4]; g.fillRect(x, y, len, 24); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x, y, 1.5, 24); x += len; k++; }
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y + 23, 240, 1.2); }
    specks(g, 240, 96, 160, 'rgba(0,0,0,.07)', 'rgba(255,240,210,.06)');
  });
  const tiles = (n, s, a, b, grout, gw = 1.5) => mk(n * s, n * s, g => { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++){ g.fillStyle = (i + j) % 2 ? b : a; g.fillRect(i * s, j * s, s, s); } g.fillStyle = grout; for (let i = 0; i < n; i++){ g.fillRect(i * s, 0, gw, n * s); g.fillRect(0, i * s, n * s, gw); } });
  const PAT = {
    herring: mk(160, 120, g => {
      const CW = 40, RH = 20, tones = ['#d8b384', '#cfa776', '#dcb98c', '#c9a06e'];
      for (let c = -1; c <= 4; c++) for (let r = -4; r <= 7; r++){
        const x = c * CW, y = r * RH, cc = ((c % 4) + 4) % 4, rq = ((r % 6) + 6) % 6;
        g.fillStyle = tones[(cc * 7 + rq * 3 + ((rq / 3) | 0)) % 4];
        g.beginPath();
        if (cc % 2 === 0){ g.moveTo(x, y + RH); g.lineTo(x + CW, y); g.lineTo(x + CW, y + RH); g.lineTo(x, y + 2 * RH); }
        else { g.moveTo(x, y); g.lineTo(x + CW, y + RH); g.lineTo(x + CW, y + 2 * RH); g.lineTo(x, y + RH); }
        g.closePath(); g.fill(); g.strokeStyle = 'rgba(110,70,36,.55)'; g.lineWidth = 1.2; g.stroke();
      }
      specks(g, 160, 120, 120, 'rgba(90,50,20,.08)', 'rgba(255,240,210,.07)');
    }),
    dark: planks(false), warm: planks(true),
    marble: mk(128, 128, g => { [[0, 0, '#ebe4d6'], [64, 0, '#ddd3c1'], [0, 64, '#ddd3c1'], [64, 64, '#ebe4d6']].forEach(([x, y, c]) => { g.fillStyle = c; g.fillRect(x, y, 64, 64); });
      g.strokeStyle = 'rgba(150,140,120,.25)'; g.lineWidth = 1; for (let i = 0; i < 5; i++){ g.beginPath(); g.moveTo(hash(i, 4) * 128, 0); g.bezierCurveTo(hash(i, 5) * 128, 40, hash(i, 6) * 128, 90, hash(i, 8) * 128, 128); g.stroke(); }
      g.fillStyle = 'rgba(120,110,95,.35)'; g.fillRect(0, 0, 128, 1); g.fillRect(0, 64, 128, 1); g.fillRect(0, 0, 1, 128); g.fillRect(64, 0, 1, 128); }),
    kitchen: tiles(2, 32, '#efe4cc', '#d9c7a2', 'rgba(140,120,90,.35)', 1),
    bath: tiles(2, 24, '#d6e8ee', '#c6dde5', '#f4fbfd', 1.5),
    deck: tiles(2, 48, '#dcc59c', '#d2b98e', '#b89d72', 2),
    paver: mk(120, 120, g => { g.fillStyle = '#7a7466'; g.fillRect(0, 0, 120, 120); const cols = ['#b9b0a0', '#a8a090', '#c4bcaa', '#b0a896'];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++){ const x = i * 40 + (j % 2) * 20, y = j * 40; [x, x - 120].forEach(xx => { g.fillStyle = cols[(i * 3 + j) % 4]; rr(g, xx + 3, y + 3, 34 + hash(i, j) * 4, 34, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.08)'; rr(g, xx + 6, y + 6, 20, 8, 4); g.fill(); }); } }),
    grass: mk(128, 128, g => { g.fillStyle = '#4f7d3f'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 260; i++){ const x = hash(i, 11) * 128, y = hash(i, 12) * 128; g.strokeStyle = hash(i, 13) < .5 ? 'rgba(110,170,80,.55)' : 'rgba(40,80,35,.5)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (hash(i, 14) - .5) * 4, y - 5); g.stroke(); }
      specks(g, 128, 128, 60, 'rgba(255,240,150,.25)', 'rgba(30,60,25,.3)', 2.4); }),
    carpet: mk(64, 64, g => { g.fillStyle = '#8e1c20'; g.fillRect(0, 0, 64, 64); specks(g, 64, 64, 140, 'rgba(60,0,0,.22)', 'rgba(255,120,120,.06)'); })
  };
  const pat = (g, k) => g.createPattern(PAT[k] || PAT.marble, 'repeat');
  const pathPoly = (g, P) => { g.beginPath(); P.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };

  /* ======================= NÉT VẼ CHUNG ======================= */
  const WOOD = { d: '#2a160c', m: '#4a2a18', l: '#6a3e22', x: '#8a5a32' };
  const SOFA = { red: ['#5a161c', '#7a2228', '#9a3036'], green: ['#1f3a2a', '#2c5a3e', '#3d7a52'], cream: ['#8a7a5a', '#c9b48a', '#e2d2ae'], blue: ['#1e2a4a', '#2c3e6a', '#3e5590'], brown: ['#4a2a18', '#7a4a2e', '#a8724a'], plum: ['#3a1a32', '#5a2a4e', '#7a3e6a'], gold: ['#7a5a1e', '#b0862e', '#d8b050'] };
  const FRAME_COLS = ['#6a4a7a', '#2a6a5a', '#9fb3c8', '#d98a2a', '#5a7a9a', '#e0c070', '#b3261e', '#3a5a3a', '#b0c4d8'];
  const shadowR = (g, x, y, w, h, r = 10) => { g.fillStyle = 'rgba(0,0,0,.28)'; rr(g, x + 5, y + 8, w, h, r); g.fill(); };
  const shadowE = (g, x, y, rx, ry) => { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x + 4, y + 8, rx, ry, 0, 0, TAU); g.fill(); };
  const fillRR = (g, x, y, w, h, r, c) => { g.fillStyle = c; rr(g, x, y, w, h, r); g.fill(); };
  const strokeRR = (g, x, y, w, h, r, c, lw) => { g.strokeStyle = c; g.lineWidth = lw; rr(g, x, y, w, h, r); g.stroke(); };
  const dot = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const oval = (g, x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); };
  const glow = (g, x, y, r, c, a) => { g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c.replace('A', a)); gr.addColorStop(1, c.replace('A', 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore(); };
  const WARM = 'rgba(255,200,120,A)';

  /* ======================= DANH SÁCH ĐỒ ======================= */
  const STATIC = [], DECO = [], NODECO = [], PROPS = [], DYN = [], OB = [], SEATS = [], HOTS = [], LAMPS = [], GLOWS = [];
  const bbx = (x0, y0, x1, y1, m = 16) => [x0 - m, y0 - m, x1 + m, y1 + m];
  const bg = (b, d, l = 1) => STATIC.push({ b, d, l });
  const deco = (b, d, wy, xr) => { DECO.push({ b, d }); if (xr) NODECO.push({ y: wy, x0: xr[0], x1: xr[1] }); };
  const prop = (y, b, d) => PROPS.push({ y, b, d });
  const dyn = (b, d) => DYN.push({ b, d });
  const obR = (x0, y0, x1, y1) => OB.push({ r: [x0, y0, x1, y1] });
  const obC = (x, y, r) => OB.push({ c: [x, y, r] });
  const seat = s => { s.i = SEATS.length; SEATS.push(s); return s.i; };
  const hot = h => { HOTS.push(h); return h; };
  // đi tới gần rồi mới làm
  const act = (r, ax, ay, label, fn, o = {}) => { const h = hot(Object.assign({ r, x: ax, y: ay, label }, o)); h.act = () => K.approach(h.x, h.y, fn, o.rad || 70); return h; };
  const sitAt = (r, label, grp) => hot({ r, x: (r[0] + r[2]) / 2, y: (r[1] + r[3]) / 2, label, act: () => K.claimSeat(grp), sit: true });
  let uid = 0; const nid = p => p + (uid++);

  /* ---------- hiệu ứng đồng bộ (vòi nước, bếp, bi-a…) ---------- */
  const FX = {};
  const fxOn = id => FX[id] && Date.now() < FX[id].until;
  const fxT = id => FX[id] ? (Date.now() - FX[id].at) / 1000 : 99;
  function fx(id, dur, data){ const at = Date.now(); FX[id] = { at, until: at + dur, data }; K.publishFx({ id, dur, data, at }); hook(id, data, at, true); }
  const HOOKS = {};
  function hook(id, data, at, mine){ const h = HOOKS[id.split(':')[0]]; if (h) try { h(id, data, at, mine); } catch (e) {} }
  function onFx(d){
    if (!d || typeof d.id !== 'string' || d.id.length > 40 || !(d.dur > 0 && d.dur <= 60000)) return;
    const at = Math.min(Date.now(), +d.at || Date.now());
    if (Date.now() - at > d.dur) return;
    FX[d.id] = { at, until: at + d.dur, data: d.data }; hook(d.id, d.data, at, false);
  }
  const ex = (k, def) => K.extras[k] === undefined ? def : K.extras[k];
  const flip = (k, def) => K.setExtras({ [k]: !ex(k, def) });

  /* ======================= ĐỒ ĐẠC (vẽ) ======================= */
  function dSofa(g, x, y, w, h, back, col, onlyBack){
    const [base, mid, top] = col, hz = back === 'n' || back === 's', bt = Math.round((hz ? h : w) * .34);
    if (!onlyBack){ shadowR(g, x, y, w, h, 16); fillRR(g, x, y, w, h, 16, base); }
    g.fillStyle = mid;
    if (back === 'n') rr(g, x + 6, y + 5, w - 12, bt, 12); else if (back === 's') rr(g, x + 6, y + h - bt - 5, w - 12, bt, 12);
    else if (back === 'w') rr(g, x + 5, y + 6, bt, h - 12, 12); else rr(g, x + w - bt - 5, y + 6, bt, h - 12, 12);
    g.fill();
    if (hz){ rr(g, x + 4, y + 6, 18, h - 12, 9); g.fill(); rr(g, x + w - 22, y + 6, 18, h - 12, 9); g.fill(); }
    else { rr(g, x + 6, y + 4, w - 12, 18, 9); g.fill(); rr(g, x + 6, y + h - 22, w - 12, 18, 9); g.fill(); }
    if (onlyBack){ strokeRR(g, x + 6, back === 's' ? y + h - bt - 5 : y + 5, w - 12, bt, 12, 'rgba(0,0,0,.3)', 2); return; }
    const cx = back === 'w' ? x + bt + 8 : x + (hz ? 24 : 8), cy = back === 'n' ? y + bt + 8 : (hz ? y + 8 : y + 24);
    const cw = hz ? w - 48 : w - bt - 16, ch = hz ? h - bt - 16 : h - 48, n = Math.max(1, Math.round((hz ? cw : ch) / 92));
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2;
    for (let i = 0; i < n; i++){ g.fillStyle = top; if (hz){ const sw = cw / n; rr(g, cx + i * sw + 2, cy, sw - 4, ch, 10); } else { const sh = ch / n; rr(g, cx, cy + i * sh + 2, cw, sh - 4, 10); } g.fill(); g.stroke(); }
    strokeRR(g, x, y, w, h, 16, 'rgba(0,0,0,.4)', 2.5);
  }
  function dChair(g, x, y, back, col, onlyBack){
    const s = 46, hs = s / 2;
    if (!onlyBack){ shadowR(g, x - hs, y - hs, s, s, 8); fillRR(g, x - hs, y - hs, s, s, 8, WOOD.m); fillRR(g, x - hs + 5, y - hs + 5, s - 10, s - 10, 7, col); }
    g.fillStyle = WOOD.l;
    if (back === 'n') rr(g, x - hs, y - hs - 8, s, 12, 5); else if (back === 's') rr(g, x - hs, y + hs - 4, s, 12, 5);
    else if (back === 'w') rr(g, x - hs - 8, y - hs, 12, s, 5); else if (back === 'e') rr(g, x + hs - 4, y - hs, 12, s, 5);
    if (back) { g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.stroke(); }
  }
  function dStool(g, x, y){ shadowE(g, x, y, 22, 16); dot(g, x, y, 22, '#b8b8c0'); dot(g, x, y, 18, '#9a2a2e'); dot(g, x - 5, y - 6, 6, 'rgba(255,255,255,.18)'); }
  function dTable(g, x, y, w, h, top){ shadowR(g, x, y, w, h, 8); fillRR(g, x, y, w, h, 8, WOOD.m); fillRR(g, x + 5, y + 5, w - 10, h - 10, 6, top || WOOD.l); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 8, y + 8, w - 16, (h - 16) * .35); strokeRR(g, x, y, w, h, 8, 'rgba(0,0,0,.4)', 2); }
  function dRound(g, x, y, r, top, rim){ shadowE(g, x, y, r, r * .85); dot(g, x, y, r, rim || WOOD.m); dot(g, x, y, r - 6, top || WOOD.l); g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(x - r * .2, y - r * .2, r * .45, 0, TAU); g.fill(); }
  function dBed(g, x, y, w, h, sheet){ shadowR(g, x, y, w, h, 10); fillRR(g, x, y, w, 30, 8, WOOD.m); fillRR(g, x + 4, y + 4, w - 8, 22, 6, WOOD.l); fillRR(g, x + 6, y + 24, w - 12, h - 30, 10, sheet || '#f1e8dc'); [x + w * .3, x + w * .7].forEach(px => { fillRR(g, px - 40, y + 30, 80, 34, 12, '#fffaf2'); strokeRR(g, px - 40, y + 30, 80, 34, 12, 'rgba(0,0,0,.15)', 2); }); strokeRR(g, x, y, w, h, 10, 'rgba(0,0,0,.4)', 2.5); }
  function dDuvet(g, x, y, w, h, c1, c2){ const top = y + 70; fillRR(g, x + 4, top, w - 8, y + h - top - 4, 12, c1); g.fillStyle = c2; g.fillRect(x + 4, top + 6, w - 8, 14); for (let i = 1; i < 5; i++){ g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + 4, top + 26 + i * 30, w - 8, 3); } strokeRR(g, x + 4, top, w - 8, y + h - top - 4, 12, 'rgba(0,0,0,.25)', 2); }
  function dLamp(g, x, y, on){ shadowE(g, x, y, 22, 10); dot(g, x, y, 20, on ? '#ffe9b8' : '#cdbb98'); g.strokeStyle = '#8a6a3a'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 20, 0, TAU); g.stroke(); dot(g, x, y, 6, on ? '#fff6dc' : '#a08a64'); }
  function dShelf(g, x, y, w, h){ const v = h > w; shadowR(g, x, y, w, h, 4); fillRR(g, x, y, w, h, 4, WOOD.d); const cols = ['#8a2a2a', '#2a4a6a', '#c9a24a', '#3a6a3a', '#6a3a6a', '#d8d0b8', '#4a2a18', '#2a6a6a'];
    if (!v){ let bx = x + 4, i = 0; while (bx < x + w - 10){ const bw = 7 + Math.floor(hash(bx, y) * 8); g.fillStyle = cols[Math.floor(hash(i, x) * cols.length)]; g.fillRect(bx, y + 4, bw - 1.5, h - 8); bx += bw; i++; } }
    else { let by = y + 4, i = 0; while (by < y + h - 10){ const bh = 7 + Math.floor(hash(by, x) * 8); g.fillStyle = cols[Math.floor(hash(i, y) * cols.length)]; g.fillRect(x + 4, by, w - 8, bh - 1.5); by += bh; i++; } }
    strokeRR(g, x, y, w, h, 4, 'rgba(0,0,0,.45)', 2); }
  function dPantry(g, x, y, w, h){ const v = h > w, L = v ? h : w; shadowR(g, x, y, w, h, 4); fillRR(g, x, y, w, h, 4, '#5a3c22'); fillRR(g, x + 3, y + 3, w - 6, h - 6, 3, '#8a6a46');
    const cols = ['#e05a3a', '#ffd43b', '#69db7c', '#f4efe6', '#c9a24a', '#ff9ac0', '#8a5a2a', '#4dabf7'], n = Math.max(1, Math.floor(L / 21));
    for (let i = 0; i < n; i++){ const t = 11 + i * (L - 22) / Math.max(1, n - 1), c = cols[Math.floor(hash(i, x | 0) * cols.length)], k = hash(i, y | 0), cx = v ? x + w / 2 : x + t, cy = v ? y + t : y + h / 2, r = Math.min(7.5, (v ? w : h) / 2 - 4);
      if (k < .45){ dot(g, cx, cy, r, c); dot(g, cx - 2, cy - 2, r * .4, 'rgba(255,255,255,.45)'); } else if (k < .75) fillRR(g, cx - r, cy - r, r * 2, r * 2, 3, c); else { dot(g, cx, cy, r, '#d8d0c0'); dot(g, cx, cy, r * .7, c); } }
    strokeRR(g, x, y, w, h, 4, 'rgba(0,0,0,.4)', 2); }
  function dCounter(g, x, y, w, h){ shadowR(g, x, y, w, h, 4); fillRR(g, x, y, w, h, 4, '#cfc0a2'); fillRR(g, x + 3, y + 3, w - 6, h - 6, 3, '#f2ede4'); g.fillStyle = 'rgba(160,150,140,.3)'; for (let i = 0; i < 8; i++) g.fillRect(x + 4 + hash(i, x | 0) * (w - 8), y + 3, 1.2, h - 6); strokeRR(g, x, y, w, h, 4, 'rgba(0,0,0,.35)', 2); }
  function dBasin(g, x, y, w, h){ oval(g, x, y, w / 2, h / 2, '#9aa4ac'); oval(g, x, y, w / 2 - 4, h / 2 - 4, '#d4dce2'); oval(g, x, y + 2, w / 2 - 10, h / 2 - 9, '#bcc6ce'); g.strokeStyle = '#7a848c'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y - h / 2 - 2); g.lineTo(x, y - h / 2 + 10); g.stroke(); g.lineCap = 'butt'; }
  function dToilet(g, cx, cy, dir){ g.save(); g.translate(cx, cy); g.rotate({ s: 0, w: Math.PI / 2, n: Math.PI, e: -Math.PI / 2 }[dir]); shadowR(g, -22, -38, 44, 70, 10); fillRR(g, -24, -40, 48, 20, 5, '#f4f6f8'); strokeRR(g, -24, -40, 48, 20, 5, 'rgba(0,0,0,.25)', 1.5); oval(g, 0, 2, 19, 24, '#f4f6f8'); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, 2, 19, 24, 0, 0, TAU); g.stroke(); oval(g, 0, 4, 11, 15, '#cfe6ee'); g.restore(); }
  function dTub(g, x, y, w, h){ shadowR(g, x, y, w, h, 20); fillRR(g, x, y, w, h, 20, '#f4f6f8'); const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#9ad8ec'); gr.addColorStop(1, '#5ab0d0'); g.fillStyle = gr; rr(g, x + 10, y + 10, w - 20, h - 20, 14); g.fill(); strokeRR(g, x, y, w, h, 20, 'rgba(0,0,0,.3)', 2); dot(g, x + w - 20, y + h / 2, 6, '#b8c0c8'); }
  function dTubFront(g, x, y, w, h, t){ const wy = y + h * .48; g.save(); rr(g, x + 10, wy, w - 20, y + h - 10 - wy, 10); g.clip(); g.fillStyle = 'rgba(110,190,220,.9)'; g.fillRect(x, wy, w, h); g.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i < 4; i++) g.fillRect(x + 14 + ((t * 30 + i * 47) % (w - 40)), wy + 6 + i * 7, 18, 2); g.restore(); fillRR(g, x, y + h - 12, w, 12, 6, '#f4f6f8'); }
  function dShower(g, x, y, w, h){ fillRR(g, x, y, w, h, 6, '#e4eef2'); g.strokeStyle = 'rgba(120,150,170,.4)'; g.lineWidth = 1; for (let i = 8; i < w; i += 10){ g.beginPath(); g.moveTo(x + i, y + 4); g.lineTo(x + i, y + h - 4); g.stroke(); } dot(g, x + w / 2, y + h / 2, 5, '#8a949c'); strokeRR(g, x, y, w, h, 6, 'rgba(160,200,220,.9)', 3); dot(g, x + w - 12, y + 12, 7, '#b8c0c8'); }
  function dPiano(g, x, y, w, h){ shadowR(g, x, y, w, h, 30); g.fillStyle = '#141016'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + 24); g.quadraticCurveTo(x, y, x + 30, y); g.lineTo(x + w * .45, y); g.bezierCurveTo(x + w * .75, y, x + w * .62, y + h * .55, x + w, y + h * .62); g.lineTo(x + w, y + h); g.closePath(); g.fill(); g.strokeStyle = '#3a3438'; g.lineWidth = 2; g.stroke(); g.fillStyle = 'rgba(255,255,255,.09)'; g.beginPath(); g.ellipse(x + w * .34, y + h * .36, w * .22, h * .16, -.4, 0, TAU); g.fill(); fillRR(g, x + 6, y + h - 24, w - 12, 20, 3, '#f8f6f0'); g.fillStyle = '#141016'; for (let k = 0; k < (w - 16) / 9; k++) if (k % 7 !== 2 && k % 7 !== 6) g.fillRect(x + 12 + k * 9, y + h - 24, 5, 11); }
  function dBilliard(g, x, y, w, h){ shadowR(g, x, y, w, h, 14); fillRR(g, x, y, w, h, 14, '#5a2a12'); fillRR(g, x + 16, y + 16, w - 32, h - 32, 6, '#14935a'); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x + 16, y + 16, w - 32, (h - 32) * .4); [[x + 16, y + 16], [x + w / 2, y + 13], [x + w - 16, y + 16], [x + 16, y + h - 16], [x + w / 2, y + h - 13], [x + w - 16, y + h - 16]].forEach(([a, b]) => dot(g, a, b, 9, '#0a0604')); dot(g, x + w * .72, y + h / 2, 3, 'rgba(255,255,255,.4)'); }
  function dBench(g, x, y, w, h){ shadowR(g, x, y, w, h, 6); const hz = w >= h; g.fillStyle = '#7a5434'; for (let i = 0; i < 4; i++){ if (hz) g.fillRect(x, y + 3 + i * (h - 6) / 4, w, (h - 6) / 4 - 3); else g.fillRect(x + 3 + i * (w - 6) / 4, y, (w - 6) / 4 - 3, h); } g.strokeStyle = '#2a2a30'; g.lineWidth = 4; g.strokeRect(x, y, w, h); }
  function dWardrobe(g, x, y, w, h, open){ shadowR(g, x, y, w, h, 4); fillRR(g, x, y, w, h, 4, WOOD.m); fillRR(g, x + 4, y + 4, w - 8, h - 8, 3, WOOD.l); g.fillStyle = WOOD.d; g.fillRect(x + w / 2 - 1, y + 4, 2, h - 8); dot(g, x + w / 2 - 8, y + h / 2, 3, '#c9963a'); dot(g, x + w / 2 + 8, y + h / 2, 3, '#c9963a');
    if (open){ const cols = ['#b3261e', '#2a4a6a', '#e0c070', '#3a6a3a', '#f1e8dc', '#6a3a6a']; for (let i = 0; i < 8; i++){ g.fillStyle = cols[i % cols.length]; g.fillRect(x + 8 + i * (w - 16) / 8, y + 6, (w - 16) / 8 - 3, h - 12); } g.fillStyle = WOOD.l; g.fillRect(x - 4, y + h - 2, w / 2, 16); g.fillRect(x + w / 2 + 4, y + h - 2, w / 2, 16); } }
  function dPlant(g, x, y, s = 1){ g.save(); g.translate(x, y); g.scale(s, s); oval(g, 4, 14, 30, 10, 'rgba(0,0,0,.3)'); oval(g, 0, 4, 24, 16, '#b06a3a'); oval(g, 0, 0, 19, 11, '#3a2416'); for (let i = 0; i < 9; i++){ const a = i / 9 * TAU; g.fillStyle = i % 2 ? '#3f8a4a' : '#56a85a'; g.beginPath(); g.ellipse(Math.cos(a) * 18, -22 + Math.sin(a) * 14, 16, 8, a, 0, TAU); g.fill(); } dot(g, 0, -24, 12, '#6ac06a'); g.restore(); }
  const TREES = [70, 86, 100].map((r, k) => mk(r * 2 + 30, r * 2 + 70, g => { const x = r + 10, y = r * 2 + 40; oval(g, x + 12, y + 2, r * .9, r * .32, 'rgba(0,0,0,.25)'); g.fillStyle = '#5a3a20'; g.fillRect(x - 8, y - 46, 16, 48); const cy = y - 46 - r * .7, cols = ['#2a522a', '#356634', '#44803e', '#5a9a4c'];
    for (let i = 0; i < 4; i++){ g.fillStyle = cols[i]; const rs = r * (1 - i * .2); for (let j = 0; j < 7; j++){ const a = j / 7 * TAU + k * 1.7 + i; g.beginPath(); g.arc(x + Math.cos(a) * rs * .42 - i * 4, cy + Math.sin(a) * rs * .32 - i * 5, rs * .52, 0, TAU); g.fill(); } } }));
  function dTree(g, x, y, k){ const c = TREES[k % 3]; g.drawImage(c, x - (c.width - 30) / 2 - 10, y - c.height + 30); }
  function dBush(g, x, y, r){ oval(g, x + 5, y + 6, r, r * .7, 'rgba(0,0,0,.22)'); [['#2f5a2e', 1], ['#3f7a3a', .78], ['#56964a', .5]].forEach(([c, s], i) => { g.fillStyle = c; for (let j = 0; j < 5; j++){ const a = j / 5 * TAU + i; g.beginPath(); g.arc(x + Math.cos(a) * r * s * .35, y - i * 4 + Math.sin(a) * r * s * .3, r * s * .62, 0, TAU); g.fill(); } }); }
  function dFlowers(g, x, y, w, h){ fillRR(g, x, y, w, h, 14, '#5a3a24'); fillRR(g, x + 4, y + 4, w - 8, h - 8, 12, '#6a4630'); const cs = ['#ff7aa8', '#ffd43b', '#fff1f5', '#c77dff', '#ff8a5a']; for (let i = 0; i < w * h / 520; i++){ const fx2 = x + 10 + hash(i, x) * (w - 20), fy = y + 10 + hash(i, y) * (h - 20); dot(g, fx2, fy, 7, '#3f7a3a'); dot(g, fx2, fy - 2, 4.5, cs[i % cs.length]); dot(g, fx2, fy - 2, 1.8, '#ffe066'); } }
  function dLantern(g, x, y, on){ oval(g, x + 3, y + 4, 12, 6, 'rgba(0,0,0,.3)'); g.fillStyle = '#2a2a30'; g.fillRect(x - 3, y - 70, 6, 72); fillRR(g, x - 12, y - 92, 24, 26, 5, '#2a2a30'); fillRR(g, x - 8, y - 88, 16, 18, 3, on ? '#ffe2a0' : '#8a7a5a'); }
  function dStatue(g, x, y){ oval(g, x + 4, y + 6, 30, 10, 'rgba(0,0,0,.3)'); fillRR(g, x - 24, y - 46, 48, 50, 4, '#d8d2c8'); fillRR(g, x - 28, y - 50, 56, 10, 3, '#eae4da'); fillRR(g, x - 20, y - 70, 40, 24, 10, '#cfc8bc'); oval(g, x, y - 90, 17, 22, '#e2dcd2'); oval(g, x - 6, y - 96, 6, 9, 'rgba(255,255,255,.4)'); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y - 90, 17, 22, 0, 0, TAU); g.stroke(); }
  function dVase(g, x, y){ oval(g, x + 4, y + 6, 26, 9, 'rgba(0,0,0,.3)'); fillRR(g, x - 20, y - 40, 40, 44, 4, '#2a1c18'); fillRR(g, x - 22, y - 44, 44, 8, 3, '#c9963a'); oval(g, x, y - 62, 16, 20, '#2a5a8a'); oval(g, x - 5, y - 68, 5, 8, 'rgba(255,255,255,.35)'); [['#ff7aa8', -10], ['#ffd43b', 2], ['#fff1f5', 12]].forEach(([c, dx]) => { g.strokeStyle = '#3f7a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 78); g.lineTo(x + dx, y - 100); g.stroke(); dot(g, x + dx, y - 102, 7, c); }); }
  function dGlobe(g, x, y, spin){ oval(g, x + 4, y + 8, 40, 12, 'rgba(0,0,0,.3)'); g.strokeStyle = '#c9963a'; g.lineWidth = 4; [[-26, 4, -18, -30], [26, 4, 18, -30], [0, 8, 0, -24]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(x + a, y + b); g.lineTo(x + c, y + d); g.stroke(); }); dot(g, x, y - 46, 38, '#8a5a2a'); dot(g, x, y - 46, 31, '#2a4a6a'); g.save(); g.beginPath(); g.arc(x, y - 46, 31, 0, TAU); g.clip(); const o = ((spin || 0) * 40) % 70; [[-14, -6, 11], [8, -14, 9], [2, 10, 12], [20, 4, 8]].forEach(([dx, dy, r]) => { for (const sh of [0, -70, 70]){ g.fillStyle = '#7ab070'; g.beginPath(); g.arc(x + ((dx + o + 35) % 70) - 35 + sh, y - 46 + dy, r, 0, TAU); g.fill(); } }); g.restore(); g.strokeStyle = '#c9963a'; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 46, 38, -2.6, .5); g.stroke(); }
  function dJukebox(g, x, y, t, on){ fillRR(g, x - 40, y - 66, 80, 80, 10, 'rgba(0,0,0,.35)'); fillRR(g, x - 36, y - 74, 72, 82, 26, '#5a2a14'); const gl = g.createLinearGradient(x - 36, 0, x + 36, 0); gl.addColorStop(0, '#ff7a3a'); gl.addColorStop(.5, '#ffe08a'); gl.addColorStop(1, '#ff7a3a'); g.strokeStyle = gl; g.lineWidth = 4; rr(g, x - 32, y - 70, 64, 74, 22); g.stroke(); fillRR(g, x - 22, y - 58, 44, 22, 8, on ? `hsl(${(t * 60) % 360},80%,62%)` : '#6a4a3a'); g.fillStyle = '#2a1a12'; for (let i = 0; i < 3; i++) g.fillRect(x - 20, y - 30 + i * 9, 40, 5); }
  function dArcade(g, x, y, t, hue){ fillRR(g, x - 30, y - 20, 64, 26, 6, 'rgba(0,0,0,.35)'); fillRR(g, x - 28, y - 86, 56, 92, 6, hue); fillRR(g, x - 28, y - 86, 56, 14, 4, '#1a0b2e'); g.fillStyle = '#fff'; g.font = '700 9px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillText('ARCADE', x, y - 76); fillRR(g, x - 22, y - 68, 44, 34, 3, '#0b1a3a'); const fl = Math.floor(t * 6) % 4; g.fillStyle = ['#ff2a6d', '#05d9e8', '#ffd23f', '#2bff88'][fl]; g.fillRect(x - 16 + (t * 30 % 28), y - 56, 6, 6); g.fillStyle = '#05d9e8'; g.fillRect(x - 18, y - 42, 36, 3); fillRR(g, x - 24, y - 30, 48, 14, 3, '#2a2a30'); dot(g, x - 12, y - 23, 4, '#ff2a6d'); dot(g, x + 4, y - 23, 3.5, '#ffd23f'); dot(g, x + 13, y - 23, 3.5, '#05d9e8'); }
  function dHarp(g, x, y){ oval(g, x + 4, y + 6, 26, 9, 'rgba(0,0,0,.3)'); g.strokeStyle = '#c9963a'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x - 14, y - 110); g.quadraticCurveTo(x + 10, y - 128, x + 26, y - 96); g.lineTo(x + 18, y - 4); g.closePath(); g.stroke(); g.strokeStyle = 'rgba(255,240,200,.75)'; g.lineWidth = 1; for (let i = 0; i < 8; i++){ const sx = x - 10 + i * 3.6; g.beginPath(); g.moveTo(sx, y - 6); g.lineTo(sx, y - 104 + i * 2); g.stroke(); } g.lineCap = 'butt'; }
  function dUmbrella(g, x, y){ g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(x + 20, y + 20, 104, 0, TAU); g.fill(); for (let i = 0; i < 8; i++){ g.fillStyle = i % 2 ? '#f4ece0' : '#b3261e'; g.beginPath(); g.moveTo(x, y - 60); g.arc(x, y - 60, 100, i / 8 * TAU, (i + 1) / 8 * TAU); g.closePath(); g.fill(); } dot(g, x, y - 60, 8, '#c9963a'); }
  function dSwing(g, x, y, t, busy){ g.strokeStyle = '#5a3a20'; g.lineWidth = 9; g.beginPath(); g.moveTo(x - 80, y); g.lineTo(x - 70, y - 140); g.lineTo(x + 70, y - 140); g.lineTo(x + 80, y); g.stroke(); const sw = busy ? Math.sin(t * 2.4) * 10 : 0; g.strokeStyle = '#8a6a3a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 26, y - 136); g.lineTo(x - 26, y - 34 + sw); g.moveTo(x + 26, y - 136); g.lineTo(x + 26, y - 34 + sw); g.stroke(); fillRR(g, x - 34, y - 38 + sw, 68, 14, 4, '#a8724a'); }
  function dLampPost(g, x, y){ oval(g, x + 3, y + 5, 16, 6, 'rgba(0,0,0,.3)'); g.fillStyle = '#1e1e24'; g.fillRect(x - 4, y - 120, 8, 122); fillRR(g, x - 14, y - 146, 28, 30, 6, '#1e1e24'); fillRR(g, x - 9, y - 141, 18, 20, 3, '#ffe2a0'); }
  function dCoat(g, x, y){ oval(g, x + 3, y + 5, 18, 7, 'rgba(0,0,0,.3)'); g.fillStyle = '#3a2416'; g.fillRect(x - 3, y - 110, 6, 112); [['#2a4a6a', -14], ['#b3261e', 12], ['#e0c070', 0]].forEach(([c, dx]) => { fillRR(g, x + dx - 10, y - 108, 20, 46, 8, c); }); }
  function dPost(g, x, y){ oval(g, x + 4, y + 6, 22, 8, 'rgba(0,0,0,.3)'); fillRR(g, x - 16, y - 70, 32, 74, 4, '#cdbb98'); fillRR(g, x - 20, y - 78, 40, 12, 3, '#e8d8b8'); dot(g, x, y - 90, 12, '#ffe2a0'); glow(g, x, y - 90, 40, WARM, .25); }
  function dChairBack(g, x, y){ fillRR(g, x - 23, y + 18, 46, 12, 5, WOOD.l); strokeRR(g, x - 23, y + 18, 46, 12, 5, 'rgba(0,0,0,.35)', 1.5); }
  function dLounger(g, x, y, w, h){ shadowR(g, x, y, w, h, 8); fillRR(g, x, y, w, h, 8, '#f4f1ea'); for (let i = 0; i < 6; i++){ g.fillStyle = i % 2 ? '#3a8ab0' : '#f4f1ea'; g.fillRect(x + 6, y + 34 + i * (h - 44) / 6, w - 12, (h - 44) / 6); } fillRR(g, x + 8, y + 6, w - 16, 24, 8, '#fff'); strokeRR(g, x, y, w, h, 8, 'rgba(0,0,0,.3)', 2); }
  function dTowel(g, x, y, w, h){ fillRR(g, x + 4, y + 70, w - 8, h - 76, 8, '#ff9a6a'); g.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i < 3; i++) g.fillRect(x + 4, y + 82 + i * 18, w - 8, 4); }
  function dBeanBag(g, x, y, c){ oval(g, x + 4, y + 8, 34, 22, 'rgba(0,0,0,.28)'); oval(g, x, y, 34, 26, c); oval(g, x - 6, y - 8, 14, 9, 'rgba(255,255,255,.18)'); }
  function dStairs(g, x, y, w, h){ fillRR(g, x, y, w, h, 4, '#cdbfa6'); const n = 10; for (let i = 0; i < n; i++){ const sx = x + i * w / n; g.fillStyle = `rgba(0,0,0,${.04 + i * .025})`; g.fillRect(sx, y, w / n - 3, h); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(sx, y, 3, h); } g.fillStyle = '#6a4228'; g.fillRect(x, y - 3, w, 6); g.fillRect(x, y + h - 3, w, 6); g.fillStyle = 'rgba(42,26,18,.6)'; g.font = '700 26px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('↗ TẦNG 2', x + w / 2, y + h / 2 + 1); }
  function dMapTable(g, x, y, r){ shadowE(g, x, y, r + 6, r * .85); dot(g, x, y, r + 8, '#c9963a'); dot(g, x, y, r, '#fbfaf6'); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r - 12, 0, TAU); g.stroke(); g.fillStyle = '#2a1a12'; g.font = `700 ${Math.round(r * .62)}px Fredoka, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Map', x, y + 2); g.textBaseline = 'alphabetic'; }
  function dPanel(g, x, y, locked, t){ fillRR(g, x - 13, y - 15, 26, 30, 5, '#1a1214'); strokeRR(g, x - 13, y - 15, 26, 30, 5, '#c9963a', 2); g.fillStyle = locked ? '#ff5a5a' : '#5be38a'; g.shadowColor = g.fillStyle; g.shadowBlur = 8 + Math.sin(t * 4) * 3; g.beginPath(); g.arc(x, y - 5, 4.5, 0, TAU); g.fill(); g.shadowBlur = 0; g.strokeStyle = '#e8d8b8'; g.lineWidth = 1.8; g.strokeRect(x - 5, y + 2, 10, 8); g.beginPath(); locked ? g.arc(x, y + 2, 3.5, Math.PI, 0) : g.arc(x + 3.5, y + 1, 3.5, Math.PI, 0); g.stroke(); }

  /* ======================= ĐỒ ĐẠC (đặt + tương tác) =======================
     các hàm viết hoa nhận toạ độ theo bản vẽ gốc */
  function Sofa(ix, iy, iw, ih, back, grp, o = {}){
    const x = X(ix), y = Y(iy), w = S(iw), h = S(ih), col = o.col || SOFA.red, hz = back === 'n' || back === 's';
    bg(bbx(x, y, x + w, y + h), g => dSofa(g, x, y, w, h, back, col));
    obR(x, y, x + w, y + h);
    const len = (hz ? w : h) - 48, n = o.n || Math.max(1, Math.round(len / 92));
    for (let i = 0; i < n; i++){
      const t = 24 + (i + .5) * len / n;
      if (back === 'n') seat({ x: x + t, y: y + h - 16, ax: x + t, ay: y + h + 42, g: grp, pose: 'sit', z: y + h - 16 });
      else if (back === 's') seat({ x: x + t, y: y + h * .5, ax: x + t, ay: y - 40, g: grp, pose: 'back', z: y + h * .5 });
      else if (back === 'w') seat({ x: x + w * .6, y: y + t + 22, ax: x + w + 42, ay: y + t, g: grp, pose: 'sit', face: 1, z: y + t + 22 });
      else seat({ x: x + w * .4, y: y + t + 22, ax: x - 42, ay: y + t, g: grp, pose: 'sit', face: -1, z: y + t + 22 });
    }
    if (back === 's') prop(y + h, bbx(x, y, x + w, y + h), g => dSofa(g, x, y, w, h, back, col, true));
    sitAt([x, y, x + w, y + h], o.label || 'Ngồi', grp);
  }
  const Arm = (cx, cy, back, grp, col) => Sofa(cx - 18, cy - 18, 36, 36, back, grp, { col, n: 1, label: 'Ngồi ghế bành' });
  function Chair(cx, cy, back, grp, o = {}){
    const x = X(cx), y = Y(cy), col = o.col || '#7a2228', d = 58;
    bg(bbx(x - 30, y - 34, x + 30, y + 34), g => dChair(g, x, y, back, col)); obC(x, y, 20);
    if (back === 'n') seat({ x, y: y + 12, ax: x, ay: y - d, g: grp, pose: 'sit', z: y + 12 });
    else if (back === 's'){ seat({ x, y: y + 4, ax: x, ay: y + d + 8, g: grp, pose: 'back', z: y + 4 }); prop(y + 24, bbx(x - 30, y + 10, x + 30, y + 34), g => dChairBack(g, x, y)); }
    else if (back === 'w') seat({ x: x + 4, y: y + 14, ax: x - d, ay: y, g: grp, pose: 'sit', face: 1, z: y + 14 });
    else seat({ x: x - 4, y: y + 14, ax: x + d, ay: y, g: grp, pose: 'sit', face: -1, z: y + 14 });
    sitAt([x - 28, y - 28, x + 28, y + 28], o.label || 'Ngồi', grp);
  }
  // ghế đẩu/đệm ngồi không tựa: dir = phía người ngồi quay mặt tới
  function Stool(cx, cy, dir, grp, o = {}){
    const x = cx, y = cy, d = 56;
    bg(bbx(x - 26, y - 26, x + 26, y + 26), g => o.bean ? dBeanBag(g, x, y, o.bean) : dStool(g, x, y)); obC(x, y, o.bean ? 24 : 17);
    const P = { s: ['sit', 0, x, y - d], n: ['back', 0, x, y + d], e: ['sit', 1, x - d, y], w: ['sit', -1, x + d, y] }[dir];
    seat({ x, y: y + (dir === 'n' ? 2 : 10), ax: P[2], ay: P[3], g: grp, pose: P[0], face: P[1] || undefined, z: y + 4 });
    sitAt([x - 26, y - 26, x + 26, y + 26], o.label || 'Ngồi', grp);
  }
  function Table(ix, iy, iw, ih, o = {}){ const x = X(ix), y = Y(iy), w = S(iw), h = S(ih); bg(bbx(x, y, x + w, y + h), g => { dTable(g, x, y, w, h, o.top); if (o.on) o.on(g, x, y, w, h); }); if (!o.soft) obR(x, y, x + w, y + h); return { x, y, w, h }; }
  function RoundT(icx, icy, ir, o = {}){ const x = X(icx), y = Y(icy), r = S(ir); bg(bbx(x - r, y - r, x + r, y + r), g => { dRound(g, x, y, r, o.top, o.rim); if (o.on) o.on(g, x, y, r); }); obC(x, y, r * .92); return { x, y, r }; }
  function Rug(ix, iy, iw, ih, col = '#9e1f22', bord = '#e09a3a', round){ const x = X(ix), y = Y(iy), w = S(iw), h = S(ih); bg(bbx(x, y, x + w, y + h, 6), g => {
      g.fillStyle = 'rgba(0,0,0,.18)'; if (round){ g.beginPath(); g.ellipse(x + w / 2 + 4, y + h / 2 + 6, w / 2, h / 2, 0, 0, TAU); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, TAU); g.fill(); g.strokeStyle = bord; g.lineWidth = 5; g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2 - 14, h / 2 - 14, 0, 0, TAU); g.stroke(); return; }
      g.fillRect(x + 4, y + 6, w, h); g.fillStyle = col; g.fillRect(x, y, w, h); g.strokeStyle = bord; g.lineWidth = 5; g.strokeRect(x + 14, y + 14, w - 28, h - 28); g.lineWidth = 2; g.strokeRect(x + 24, y + 24, w - 48, h - 48); }, 0); }
  function Bed(ix, iy, iw, ih, grp, c1, c2){
    const x = X(ix), y = Y(iy), w = S(iw), h = S(ih);
    bg(bbx(x, y, x + w, y + h), g => dBed(g, x, y, w, h)); obR(x, y, x + w, y + h);
    [x + w * .3, x + w * .7].forEach((px, i) => seat({ x: px, y: y + 58, ax: i ? x + w + 44 : x - 44, ay: y + 130, g: grp, pose: 'lie', z: y + 58.5 }));
    prop(y + 59, bbx(x, y + 60, x + w, y + h), g => dDuvet(g, x, y, w, h, c1, c2));
    sitAt([x, y, x + w, y + h], 'Nằm', grp);
  }
  // đèn bàn: bấm để bật/tắt đèn cả phòng
  function Lamp(x, y, key, ax, ay){ LAMPS.push({ x, y, key }); prop(y + 1, bbx(x - 30, y - 30, x + 30, y + 30), g => dLamp(g, x, y, ex(key, true))); act([x - 32, y - 36, x + 32, y + 28], ax != null ? ax : x, ay != null ? ay : y + 56, () => ex(key, true) ? 'Tắt đèn' : 'Bật đèn', () => { flip(key, true); K.toast(ex(key, true) ? 'Đã bật đèn 💡' : 'Đã tắt đèn 🌙'); }, { rad: 110 }); }
  function Night(ix, iy, key){ const x = X(ix), y = Y(iy), s = 54; bg(bbx(x, y, x + s, y + s), g => { shadowR(g, x, y, s, s, 6); fillRR(g, x, y, s, s, 6, WOOD.m); fillRR(g, x + 4, y + 4, s - 8, s - 8, 5, WOOD.l); }); obR(x, y, x + s, y + s); if (key) Lamp(x + s / 2, y + s / 2, key); }
  function Shelf(ix, iy, iw, ih, side, label, fn, o = {}){ const x = X(ix), y = Y(iy), w = S(iw), h = S(ih); bg(bbx(x, y, x + w, y + h), g => o.food ? dPantry(g, x, y, w, h) : dShelf(g, x, y, w, h)); obR(x, y, x + w, y + h);
    if (label){ const P = { e: [x + w + 46, y + h / 2], w: [x - 46, y + h / 2], s: [x + w / 2, y + h + 46], n: [x + w / 2, y - 46] }[side]; act([x, y, x + w, y + h], P[0], P[1], label, fn, { rad: 120 }); } }
  function Counter(ix, iy, iw, ih, o = {}){ const x = X(ix), y = Y(iy), w = S(iw), h = S(ih); bg(bbx(x, y, x + w, y + h), g => { dCounter(g, x, y, w, h); if (o.on) o.on(g, x, y, w, h); }); obR(x, y, x + w, y + h); return { x, y, w, h }; }
  // bồn rửa: mở vòi nước (đồng bộ)
  function Sink(x, y, ax, ay, w = 44, h = 32){ const id = nid('sink:'); bg(bbx(x - w / 2, y - h / 2, x + w / 2, y + h / 2), g => dBasin(g, x, y, w, h));
    dyn(bbx(x - 30, y - 30, x + 30, y + 30), (g, t) => { if (!fxOn(id)) return; g.strokeStyle = 'rgba(160,220,255,.9)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y - h / 2 + 10); g.lineTo(x + Math.sin(t * 30), y + 2); g.stroke(); for (let i = 0; i < 2; i++){ const r = ((t * 22 + i * 7) % 14); g.strokeStyle = `rgba(200,240,255,${1 - r / 14})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y + 3, r, r * .6, 0, 0, TAU); g.stroke(); } });
    act(bbx(x - w / 2, y - h / 2, x + w / 2, y + h / 2, 10), ax, ay, 'Rửa tay', () => { fx(id, 4500); K.toast('Rửa tay sạch sẽ 🫧'); }, { rad: 90 }); }
  function Toilet(icx, icy, dir, grp){ const x = X(icx), y = Y(icy); bg(bbx(x - 46, y - 46, x + 46, y + 46), g => dToilet(g, x, y, dir)); obC(x, y, 14);
    const d = 60, P = { s: ['sit', 0, x, y + d], n: ['back', 0, x, y - d], e: ['sit', 1, x + d, y], w: ['sit', -1, x - d, y] }[dir];
    const i = seat({ x, y: y + (dir === 'n' ? -4 : 12), ax: P[2], ay: P[3], g: grp, pose: P[0], face: P[1] || undefined, z: y + 12, wc: true });
    const id = 'flush:' + i;
    dyn(bbx(x - 40, y - 40, x + 40, y + 40), (g, t) => { if (!fxOn(id)) return; const k = fxT(id); for (let j = 0; j < 3; j++){ const r = (k * 30 + j * 8) % 22; g.strokeStyle = `rgba(150,220,255,${1 - r / 22})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y + 4, r, 0, TAU); g.stroke(); } });
    SEATS[i].onStand = () => { fx(id, 2200); K.sound('flush', x, y); };
    sitAt(bbx(x - 26, y - 30, x + 26, y + 30, 0), 'Dùng nhà vệ sinh', grp); }
  function Tub(ix, iy, iw, ih, grp){ const x = X(ix), y = Y(iy), w = S(iw), h = S(ih); bg(bbx(x, y, x + w, y + h), g => dTub(g, x, y, w, h)); obR(x, y, x + w, y + h);
    [.33, .67].forEach((k, i) => seat({ x: x + w * k, y: y + h * .48 + 34, ax: x + w * k, ay: y - 46, g: grp, pose: 'tub', face: i ? -1 : 1, z: y + h * .48 + 34 }));
    prop(y + h + 1, bbx(x, y, x + w, y + h), (g, t) => dTubFront(g, x, y, w, h, t));
    sitAt([x, y, x + w, y + h], 'Ngâm bồn', grp); }
  function Shower(ix, iy, iw, ih, ax, ay){ const x = X(ix), y = Y(iy), w = S(iw), h = S(ih), id = nid('shower:'); bg(bbx(x, y, x + w, y + h), g => dShower(g, x, y, w, h));
    dyn(bbx(x, y, x + w, y + h), (g, t) => { if (!fxOn(id)) return; g.strokeStyle = 'rgba(170,220,255,.75)'; g.lineWidth = 1.6; for (let i = 0; i < 14; i++){ const sx = x + 10 + hash(i, 3) * (w - 20), sy = y + 8 + ((t * 160 + i * 23) % (h - 16)); g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx, sy + 9); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x, y, w, h); });
    act([x, y, x + w, y + h], ax != null ? X(ax) : x + w / 2, ay != null ? Y(ay) : y + h + 40, 'Tắm vòi sen', () => { fx(id, 8000); K.toast('Tắm mát quá 🚿'); }, { rad: 110 }); }
  function Plant(ix, iy, s){ const x = X(ix), y = Y(iy); prop(y, bbx(x - 34, y - 50, x + 34, y + 20), g => dPlant(g, x, y, s)); obC(x, y, 20 * (s || 1));
    const id = nid('plant:'); dyn(bbx(x - 40, y - 60, x + 40, y + 10), (g, t) => { if (!fxOn(id)) return; const k = fxT(id); for (let i = 0; i < 8; i++){ const a = i / 8 * TAU, r = 10 + k * 30; dot(g, x + Math.cos(a) * r, y - 30 + Math.sin(a) * r * .5 - k * 10, 2.5, `rgba(140,210,255,${1 - k / 2})`); } });
    act(bbx(x - 26, y - 56, x + 26, y + 16, 0), x, y + 52, 'Tưới cây', () => { fx(id, 2000); K.toast('Đã tưới cây 🌿'); }, { rad: 110 }); }
  function Tree(ix, iy, k, block = true){ const x = X(ix), y = Y(iy); prop(y, bbx(x - 110, y - 230, x + 110, y + 30), g => dTree(g, x, y, k)); if (block) obC(x, y, 20); }
  function Bush(ix, iy, r = 40){ const x = X(ix), y = Y(iy); prop(y + 4, bbx(x - r, y - r, x + r, y + r), g => dBush(g, x, y, r)); obC(x, y, r * .7); }
  function Flowers(ix, iy, iw, ih){ const x = X(ix), y = Y(iy), w = S(iw), h = S(ih); bg(bbx(x, y, x + w, y + h), g => dFlowers(g, x, y, w, h)); }
  function Lantern(ix, iy){ const x = X(ix), y = Y(iy); prop(y, bbx(x - 20, y - 100, x + 20, y + 10), g => dLantern(g, x, y, true)); obC(x, y, 10); GLOWS.push({ x, y: y - 80, r: 90, a: .22 }); }
  function LampPost(ix, iy){ const x = X(ix), y = Y(iy); prop(y, bbx(x - 20, y - 150, x + 20, y + 10), g => dLampPost(g, x, y)); obC(x, y, 10); GLOWS.push({ x, y: y - 131, r: 120, a: .25 }); }
  function Bench(ix, iy, iw, ih, face, grp){ const x = X(ix), y = Y(iy), w = S(iw), h = S(ih); bg(bbx(x, y, x + w, y + h), g => dBench(g, x, y, w, h)); obR(x, y, x + w, y + h);
    const hz = w >= h, len = hz ? w : h, n = Math.max(1, Math.round((len - 30) / 92));
    for (let i = 0; i < n; i++){ const t = (i + .5) * len / n;
      if (face === 's') seat({ x: x + t, y: y + h * .6, ax: x + t, ay: y + h + 42, g: grp, pose: 'sit', z: y + h * .6 });
      else if (face === 'n') seat({ x: x + t, y: y + h * .5, ax: x + t, ay: y - 42, g: grp, pose: 'back', z: y + h * .5 });
      else if (face === 'e') seat({ x: x + w * .5, y: y + t + 14, ax: x + w + 42, ay: y + t, g: grp, pose: 'sit', face: 1, z: y + t + 14 });
      else seat({ x: x + w * .5, y: y + t + 14, ax: x - 42, ay: y + t, g: grp, pose: 'sit', face: -1, z: y + t + 14 }); }
    sitAt([x, y, x + w, y + h], 'Ngồi ghế', grp); }
  // tranh / TV / lò sưởi gắn trên mặt tường (vẽ sau tường)
  function WallTV(ix0, ix1, iwy, key){ const x0 = X(ix0), x1 = X(ix1), wy = Y(iwy) + T / 2, w = x1 - x0;
    deco(bbx(x0, wy, x1, wy + FACE), g => { fillRR(g, x0, wy + 4, w, FACE - 12, 4, '#0c0c10'); strokeRR(g, x0, wy + 4, w, FACE - 12, 4, '#3a3a44', 2); }, Y(iwy), [x0 - 20, x1 + 20]);
    dyn(bbx(x0, wy, x1, wy + FACE), (g, t) => { const sx = x0 + 4, sy = wy + 8, sw = w - 8, sh = FACE - 20; if (!ex(key, false)){ g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(sx, sy, sw * .4, sh); return; } const gr = g.createLinearGradient(sx, 0, sx + sw, 0); const h0 = (t * 40) % 360; gr.addColorStop(0, `hsl(${h0},70%,45%)`); gr.addColorStop(1, `hsl(${(h0 + 90) % 360},70%,55%)`); g.fillStyle = gr; g.fillRect(sx, sy, sw, sh); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(sx + (t * 50) % (sw - 10), sy + sh * .6, 10, 6); g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = sy; y < sy + sh; y += 3) g.fillRect(sx, y, sw, 1); });
    GLOWS.push({ x: (x0 + x1) / 2, y: wy + FACE + 30, r: 160, a: .14, key, def: false, col: 'rgba(120,170,255,A)' });
    act([x0, wy, x1, wy + FACE + 20], (x0 + x1) / 2, wy + FACE + 90, () => ex(key, false) ? 'Tắt TV' : 'Bật TV', () => { flip(key, false); K.toast(ex(key, false) ? 'Đã bật TV 📺' : 'Đã tắt TV'); }, { rad: 140 }); }
  function Fire(x, y, w, h, key, horizontal){ // lò sưởi: lửa bập bùng
    dyn(bbx(x, y, x + w, y + h), (g, t) => { fillRR(g, x, y, w, h, 6, '#1a0e0a'); if (!ex(key, false)) { g.fillStyle = '#3a2a22'; for (let i = 0; i < 3; i++) fillRR(g, x + 8 + i * (w - 16) / 3, y + h / 2 - 6, (w - 16) / 3 - 4, 12, 4, '#4a2e1e'); return; }
      for (let i = 0; i < 7; i++){ const k = i / 6, fx2 = horizontal ? x + 10 + k * (w - 20) : x + w / 2 + Math.sin(t * 7 + i) * 4, fy = horizontal ? y + h / 2 + Math.sin(t * 9 + i) * 3 : y + 10 + k * (h - 20), r = 9 + Math.sin(t * 11 + i * 2) * 3;
        dot(g, fx2, fy, r + 5, 'rgba(255,90,20,.65)'); dot(g, fx2, fy - 2, r, 'rgba(255,190,60,.85)'); dot(g, fx2, fy - 3, r * .45, 'rgba(255,250,200,.9)'); } });
    GLOWS.push({ x: x + w / 2, y: y + h / 2, r: 260, a: .3, key, def: false, flick: true }); }
  function Panel(ix, iy, room, aix, aiy){ const x = X(ix), y = Y(iy), ax = X(aix), ay = Y(aiy);
    dyn(bbx(x - 16, y - 18, x + 16, y + 18), (g, t) => dPanel(g, x, y, K.lockOn(room), t));
    act([x - 22, y - 24, x + 22, y + 22], ax, ay, () => K.lockOn(room) ? 'Mở khoá phòng' : 'Khoá phòng', () => K.toggleLock(room), { rad: 110 }); }

  /* ======================= BỐ TRÍ TỪNG PHÒNG ======================= */
  /* --- Phòng ngủ Master --- */
  Rug(390, 430, 160, 95, '#7a2240', '#e0b04a');
  Bench(215, 288, 135, 30, 'n', 'mBay'); SEATS.filter(s => s.g === 'mBay').forEach(s => { s.ay = Y(288) + S(30) + 46; });   // ghế cửa sổ: ngồi ngắm vườn
  Bed(410, 372, 120, 112, 'mBed', '#7a2240', '#e8c8a0');
  Night(382, 374, 'light_master'); Night(533, 374, 'light_master');
  Arm(160, 452, 'w', 'mArmA', SOFA.plum); Arm(292, 452, 'e', 'mArmB', SOFA.plum);
  RoundT(226, 452, 17, { on: (g, x, y) => { dot(g, x - 8, y - 4, 8, '#e8f4ff'); dot(g, x - 8, y - 4, 5, '#c9902a'); } });
  Sofa(165, 518, 130, 36, 's', 'mSofa', { col: SOFA.plum });
  { const x = X(440), y = Y(584), w = S(135), h = S(28), id = 'wardrobe'; bg(bbx(x, y, x + w, y + h), g => dWardrobe(g, x, y, w, h, false)); obR(x, y, x + w, y + h);
    dyn(bbx(x, y, x + w, y + h + 20), g => { if (fxOn(id)) dWardrobe(g, x, y, w, h, true); });
    act([x, y, x + w, y + h], x + w / 2, y - 46, 'Mở tủ quần áo', () => { fx(id, 4000); K.toast(['Chọn bộ đồ đẹp nhất 👗', 'Thử chiếc áo khoác mới 🧥', 'Tủ đồ gọn gàng ghê ✨'][Math.floor(Math.random() * 3)]); }, { rad: 110 }); }
  { const x = X(300), y = Y(588), w = S(100), h = S(24); bg(bbx(x, y, x + w, y + h), g => { dTable(g, x, y, w, h, '#8a5a32'); fillRR(g, x + w / 2 - 30, y + 2, 60, 12, 6, '#cfe3ee'); }); obR(x, y, x + w, y + h);
    act([x, y, x + w, y + h], x + w / 2, y - 46, 'Soi gương', () => K.toast(['Hôm nay trông xinh quá 💅', 'Chỉnh lại tóc một chút ✨', 'Gương ơi gương, ai đẹp nhất? 🪞'][Math.floor(Math.random() * 3)]), { rad: 110 }); }
  Plant(574, 386);
  Panel(580, 535, 'master', 556, 538);
  /* --- WC Master --- */
  Counter(250, 648, 48, 26, { on: () => {} }); Sink(X(274), Y(661), X(274), Y(700));
  Toilet(290, 712, 'w', 'wcm');
  Tub(132, 742, 105, 55, 'mTub');
  Plant(138, 664, .8);
  /* --- Phòng làm việc --- */
  Rug(355, 715, 190, 85, '#2c4a3a', '#e0b04a');
  Shelf(311, 650, 19, 205, 'e', 'Đọc sách', () => K.toast(BOOKS[Math.floor(Math.random() * BOOKS.length)]));
  Shelf(345, 648, 95, 18, 's', 'Đọc sách', () => K.toast(BOOKS[Math.floor(Math.random() * BOOKS.length)]));
  Table(450, 652, 110, 40, { on: (g, x, y, w) => { fillRR(g, x + 30, y + 14, 70, 44, 4, '#2a2a30'); fillRR(g, x + 34, y + 18, 62, 36, 3, '#3a6a9a'); fillRR(g, x + 120, y + 20, 50, 40, 3, '#f4efe6'); } });
  Lamp(X(545), Y(668), 'light_study', X(545), Y(714));
  Chair(505, 716, 's', 'stDesk', { col: '#2c5a3e' });
  Sofa(380, 812, 150, 40, 's', 'stSofa', { col: SOFA.green });
  Arm(352, 748, 'w', 'stArm', SOFA.green);
  RoundT(352, 794, 10, { on: (g, x, y) => { dot(g, x, y, 8, '#fff'); dot(g, x, y, 5, '#8a5a2a'); } });
  { const x = X(560), y = Y(818), id = 'globe'; prop(y, bbx(x - 44, y - 90, x + 44, y + 16), g => dGlobe(g, x, y, fxOn(id) ? fxT(id) : 0)); obC(x, y, 26);
    act([x - 40, y - 90, x + 40, y + 10], x, y - 70, 'Xoay quả địa cầu', () => { fx(id, 3000); K.toast(['Điểm đến tiếp theo: Kyoto 🗾', 'Điểm đến tiếp theo: Paris 🗼', 'Điểm đến tiếp theo: Reykjavík 🌌', 'Điểm đến tiếp theo: Đà Lạt 🌲'][Math.floor(Math.random() * 4)]); }, { rad: 110 }); }
  Panel(580, 790, 'study', 556, 790);
  /* --- Walk-in Pantry --- */
  const SNACKS = ['Lấy một gói bim bim 🍿', 'Một hũ mứt dâu 🍓', 'Bánh quy bơ giòn tan 🍪', 'Mì gói cho đêm khuya 🍜', 'Một thanh socola 🍫', 'Trà sữa đóng chai 🧋'];
  const snack = () => K.toast(SNACKS[Math.floor(Math.random() * SNACKS.length)]);
  Shelf(181, 893, 21, 320, 'e', 'Lấy đồ ăn vặt', snack, { food: true }); Shelf(215, 891, 115, 18, 's', 'Lấy đồ ăn vặt', snack, { food: true });
  Shelf(240, 960, 34, 190, 'e', 'Lấy đồ ăn vặt', snack, { food: true }); Shelf(215, 1198, 115, 18, 'n', 'Lấy đồ ăn vặt', snack, { food: true });
  { const x = X(320), y = Y(1180); bg(bbx(x - 30, y - 30, x + 30, y + 30), g => { dot(g, x + 4, y + 6, 26, 'rgba(0,0,0,.3)'); dot(g, x, y, 26, '#7a4a2a'); dot(g, x, y, 20, '#8a5a32'); g.strokeStyle = '#3a2a1a'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 23, 0, TAU); g.stroke(); }); obC(x, y, 24); }
  /* --- Phòng bếp --- */
  { const c = Counter(348, 891, 238, 26); const sx = X(420), sy = c.y + c.h / 2; Sink(sx, sy, sx, c.y + c.h + 52, 54, 36);
    const kx = X(505), kw = S(60), id = 'stove';
    bg(bbx(kx, c.y, kx + kw, c.y + c.h), g => { fillRR(g, kx, c.y + 3, kw, c.h - 6, 4, '#16161a'); [[.28, .3], [.72, .3], [.28, .72], [.72, .72]].forEach(([a, b]) => { g.strokeStyle = '#4a4a52'; g.lineWidth = 3; g.beginPath(); g.arc(kx + kw * a, c.y + c.h * b, 10, 0, TAU); g.stroke(); }); });
    dyn(bbx(kx, c.y - 60, kx + kw, c.y + c.h), (g, t) => { if (!fxOn(id)) return; [[.28, .3], [.72, .3], [.28, .72], [.72, .72]].forEach(([a, b], i) => { g.strokeStyle = `rgba(255,${120 + i * 20},40,${.7 + Math.sin(t * 20 + i) * .3})`; g.lineWidth = 3; g.beginPath(); g.arc(kx + kw * a, c.y + c.h * b, 10, 0, TAU); g.stroke(); }); fillRR(g, kx + kw * .28 - 16, c.y + c.h * .3 - 16, 32, 32, 16, '#3a3a42'); for (let i = 0; i < 3; i++){ const k = (t * .8 + i / 3) % 1; dot(g, kx + kw * .28 + Math.sin(t * 3 + i) * 6, c.y - k * 50, 6 + k * 8, `rgba(255,255,255,${.4 * (1 - k)})`); } });
    act([kx, c.y, kx + kw, c.y + c.h], kx + kw / 2, c.y + c.h + 52, () => fxOn(id) ? 'Đang nấu…' : 'Nấu ăn', () => { fx(id, 9000); K.toast(['Nấu một nồi phở thơm lừng 🍜', 'Chiên trứng ốp la 🍳', 'Xào rau muống tỏi 🥬', 'Nấu cháo gà nóng hổi 🍲'][Math.floor(Math.random() * 4)]); }, { rad: 110 });
    const cx = X(372), cid = 'coffee';
    bg(bbx(cx - 20, c.y, cx + 20, c.y + c.h), g => { fillRR(g, cx - 18, c.y + 4, 36, c.h - 8, 5, '#2a2a30'); dot(g, cx, c.y + c.h - 16, 7, '#e8e0d0'); });
    dyn(bbx(cx - 20, c.y - 50, cx + 20, c.y + c.h), (g, t) => { if (!fxOn(cid)) return; for (let i = 0; i < 3; i++){ const k = (t * .9 + i / 3) % 1; dot(g, cx + Math.sin(t * 4 + i) * 4, c.y + c.h - 20 - k * 40, 4 + k * 5, `rgba(255,255,255,${.45 * (1 - k)})`); } });
    act([cx - 22, c.y, cx + 22, c.y + c.h], cx, c.y + c.h + 52, 'Pha cà phê', () => { fx(cid, 6000); K.toast('Một ly cà phê sữa đá ☕'); }, { rad: 110 }); }
  { const x = X(596), y = Y(858), w = S(34), h = S(46), id = 'fridge'; bg(bbx(x, y, x + w, y + h), g => { shadowR(g, x, y, w, h, 6); fillRR(g, x, y, w, h, 6, '#c8ced4'); fillRR(g, x + 4, y + 4, w - 8, h - 8, 4, '#dfe4e8'); g.fillStyle = '#8a949c'; g.fillRect(x + 8, y + h * .35, w - 16, 3); g.fillRect(x + 6, y + 10, 4, h * .25); }); obR(x, y, x + w, y + h);
    dyn(bbx(x - 60, y, x + w, y + h), g => { if (!fxOn(id)) return; fillRR(g, x - 50, y + 4, 50, h - 8, 4, '#dfe4e8'); g.fillStyle = 'rgba(255,255,230,.5)'; g.fillRect(x + 4, y + 4, w - 8, h - 8); });
    act([x, y, x + w, y + h], x + w / 2, y + h + 50, 'Mở tủ lạnh', () => { fx(id, 3500); K.toast(['Lấy chai nước mát lạnh 🧊', 'Một hộp kem dâu 🍨', 'Sữa chua ngon tuyệt 🥛'][Math.floor(Math.random() * 3)]); }, { rad: 110 }); }
  Table(420, 990, 125, 56, { top: '#f2ede4' });
  [447, 482, 517].forEach((ix, i) => Stool(X(ix), Y(1070), 'n', 'kStool' + i));
  Counter(350, 1194, 68, 24); { const c = Counter(512, 1194, 114, 24), ox = X(540), id = 'oven';
    bg(bbx(ox, c.y, ox + S(50), c.y + c.h), g => { fillRR(g, ox, c.y + 3, S(50), c.h - 6, 4, '#2a2a30'); fillRR(g, ox + 10, c.y + 10, S(50) - 20, c.h - 24, 3, '#4a3a2a'); });
    dyn(bbx(ox, c.y, ox + S(50), c.y + c.h), (g, t) => { if (!fxOn(id)) return; g.fillStyle = `rgba(255,140,40,${.45 + Math.sin(t * 6) * .15})`; g.fillRect(ox + 10, c.y + 10, S(50) - 20, c.h - 24); });
    act([ox, c.y, ox + S(50), c.y + c.h], ox + S(25), c.y - 46, 'Nướng bánh', () => { fx(id, 9000); K.toast('Bánh mì nướng thơm phức 🥐'); }, { rad: 110 }); }
  Plant(362, 1166, .8);
  /* --- Hallway --- */
  Rug(655, 852, 55, 222, '#7a1a20', '#c9963a'); Rug(652, 1112, 335, 54, '#7a1a20', '#c9963a');
  { const x = X(805), y = Y(1172); prop(y, bbx(x - 34, y - 120, x + 34, y + 14), g => dStatue(g, x, y)); obC(x, y, 26);
    act([x - 32, y - 120, x + 32, y + 10], x, y - 60, 'Ngắm tượng', () => K.toast('Tượng bán thân của ông chủ dinh thự 🗿'), { rad: 120 }); }
  Table(875, 1103, 90, 16, { on: (g, x, y, w, h) => { dot(g, x + w / 2, y + h / 2, 10, '#2a5a8a'); dot(g, x + w / 2 - 3, y + h / 2 - 3, 3, 'rgba(255,255,255,.4)'); } });
  Plant(716, 1058, .8);
  /* --- Phòng sinh hoạt chung --- */
  Rug(650, 640, 200, 145, '#8a3a1e', '#e0b04a');
  { const x0 = X(605), x1 = X(690), wy = Y(580) + T / 2; deco(bbx(x0, wy, x1, wy + FACE), g => { fillRR(g, x0, wy + 2, x1 - x0, FACE - 4, 4, '#8a7a6a'); fillRR(g, x0 + 8, wy + 6, x1 - x0 - 16, FACE - 14, 3, '#6a5a4a'); }, Y(580), [x0 - 20, x1 + 20]);
    const hy = Y(580) + T / 2 + FACE + 2; bg(bbx(x0, hy, x1, hy + 40), g => { fillRR(g, x0, hy, x1 - x0, 40, 4, '#9a8a7a'); }); obR(x0, hy, x1, hy + 40);
    Fire(x0 + 22, hy - 30, x1 - x0 - 44, 36, 'fire_family', true);
    act([x0, hy - 40, x1, hy + 40], (x0 + x1) / 2, hy + 90, () => ex('fire_family', false) ? 'Dập lửa lò sưởi' : 'Đốt lò sưởi', () => { flip('fire_family', false); K.toast(ex('fire_family', false) ? 'Lò sưởi bập bùng 🔥' : 'Đã dập lửa'); }, { rad: 120 }); }
  WallTV(792, 860, 580, 'tv_family');
  Table(795, 606, 64, 14);
  Arm(630, 668, 's', 'fArmA', SOFA.brown); Arm(678, 668, 's', 'fArmB', SOFA.brown);
  Table(735, 702, 72, 40, { on: (g, x, y, w, h) => { fillRR(g, x + 14, y + 12, 40, 28, 3, '#e8d8b8'); } });
  Sofa(745, 788, 117, 34, 's', 'fSofa', { col: SOFA.brown });
  Plant(852, 645, .9);
  /* --- Phòng giải trí --- */
  Rug(605, 440, 115, 70, '#2a3a6a', '#e0b04a');
  WallTV(610, 690, 395, 'tv_rec');
  Stool(X(628), Y(462), 'n', 'recBagA', { bean: '#c0392b', label: 'Ngồi xem TV' }); Stool(X(668), Y(462), 'n', 'recBagB', { bean: '#2a6a9a', label: 'Ngồi xem TV' });
  { const x = X(800), y = Y(455), w = S(105), h = S(64), id = 'billiard'; bg(bbx(x, y, x + w, y + h), g => dBilliard(g, x, y, w, h)); obR(x, y, x + w, y + h);
    const BALLS = [['#f6c90e', 0, 0], ['#1f4fd1', 1, -.5], ['#d42a2a', 1, .5], ['#111', 2, 0], ['#6a2a8a', 2, -1], ['#ff7a1a', 2, 1], ['#1a8a3a', 3, -.5], ['#8a1a1a', 3, .5]];
    dyn(bbx(x, y, x + w, y + h), (g, t) => { const k = fxOn(id) ? Math.min(1, fxT(id) / 1.4) : 0, ease = 1 - Math.pow(1 - k, 3), rx = x + w * .3, ry = y + h / 2;
      BALLS.forEach(([c, col, row], i) => { const bx = rx - col * 16, by = ry + row * 18, a = hash(i, FX[id] ? FX[id].at % 997 : 1) * TAU, d = ease * (50 + hash(i, 5) * 120); dot(g, Math.max(x + 24, Math.min(x + w - 24, bx + Math.cos(a) * d)), Math.max(y + 24, Math.min(y + h - 24, by + Math.sin(a) * d * .6)), 8, c); });
      dot(g, x + w * .75 - ease * 60, y + h / 2, 8, '#fafafa'); });
    act([x, y, x + w, y + h], x + w + 50, y + h / 2, 'Đánh bi-a', () => { fx(id, 4000); K.sound('clack', x + w / 2, y + h / 2); K.toast(['Phá bi đẹp quá 🎱', 'Vào lỗ một quả! 🎱', 'Trượt rồi 😅'][Math.floor(Math.random() * 3)]); }, { rad: 130 }); }
  [[930, '#ff4fa3'], [958, '#2a2280']].forEach(([ix, hue], i) => { const x = X(ix), y = Y(440), id = 'arcade:' + i; prop(y, bbx(x - 34, y - 100, x + 34, y + 10), (g, t) => dArcade(g, x, y, fxOn(id) ? t * 3 : t, hue)); obR(x - 28, y - 20, x + 28, y + 6);
    act([x - 30, y - 90, x + 30, y + 6], x, y + 52, 'Chơi game', () => { fx(id, 8000); K.toast(['Phá kỷ lục mới! 🕹️', 'Game over… chơi lại nào 👾', 'Lên level 2! ⭐'][Math.floor(Math.random() * 3)]); }, { rad: 110 }); });
  RoundT(655, 540, 16, { top: '#1a6a3a', on: (g, x, y) => { [[-10, -6], [6, 4], [-2, 8]].forEach(([a, b]) => fillRR(g, x + a - 6, y + b - 8, 12, 16, 2, '#fff')); } });
  Chair(628, 540, 'w', 'recCardA', { col: '#1a6a3a', label: 'Chơi bài' }); Chair(682, 540, 'e', 'recCardB', { col: '#1a6a3a', label: 'Chơi bài' });
  /* --- Phòng Pub --- */
  { const x0 = X(1045), x1 = X(1172), wy = Y(285) + T / 2; deco(bbx(x0, wy, x1, wy + FACE), g => { fillRR(g, x0, wy + 2, x1 - x0, FACE - 6, 3, '#2a160c'); const bc = ['#3a6a3a', '#8a2a2a', '#c9a24a', '#2a4a6a', '#6a3a1a', '#d8d8c8']; for (let r = 0; r < 2; r++) for (let i = 0; i < (x1 - x0 - 12) / 14; i++){ fillRR(g, x0 + 8 + i * 14, wy + 6 + r * 20, 9, 15, 3, bc[(i + r * 3) % bc.length]); } }, Y(285), [x0 - 30, x1 + 30]);
    const by = wy + FACE + 2; bg(bbx(x0, by, x1, by + 34), g => { dCounter(g, x0, by, x1 - x0, 30); }); obR(x0, by, x1, by + 30);
    act([x0, wy, x1, by + 34], (x0 + x1) / 2, by + 80, 'Pha cocktail', () => K.toast(['Một ly Mojito mát lạnh 🍹', 'Old Fashioned cho người sành 🥃', 'Margarita muối viền ly 🍸', 'Rượu vang đỏ 🍷'][Math.floor(Math.random() * 4)]), { rad: 120 }); }
  { const cx = X(1110), cy = Y(428), R = S(62), r = S(38), gap = 1.15, a0 = -Math.PI / 2 + gap / 2, a1 = -Math.PI / 2 - gap / 2 + TAU;
    bg(bbx(cx - R, cy - R, cx + R, cy + R), g => { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(cx + 5, cy + 8, R, a0, a1); g.arc(cx + 5, cy + 8, r, a1, a0, true); g.closePath(); g.fill();
      g.fillStyle = WOOD.m; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.arc(cx, cy, r, a1, a0, true); g.closePath(); g.fill();
      g.fillStyle = '#6a3e22'; g.beginPath(); g.arc(cx, cy, R - 8, a0 + .04, a1 - .04); g.arc(cx, cy, r + 8, a1 - .04, a0 + .04, true); g.closePath(); g.fill();
      g.strokeStyle = '#c9963a'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R - 3, a0, a1); g.stroke();
      [[0.5, '#e8f4ff'], [1.3, '#ffd28a'], [2.2, '#c9e8a0'], [3.4, '#e8f4ff']].forEach(([a, c]) => oval(g, cx + Math.cos(a) * (R + r) / 2, cy + Math.sin(a) * (R + r) / 2, 9, 7, c));
      fillRR(g, cx - 26, cy + (R + r) / 2 - 10, 52, 16, 4, '#b8b8c0'); [-16, 0, 16].forEach(dx => fillRR(g, cx + dx - 3, cy + (R + r) / 2 - 18, 6, 12, 2, '#c9963a')); });
    for (let a = a0; a <= a1 + .01; a += (a1 - a0) / 10) obC(cx + Math.cos(a) * (R + r) / 2, cy + Math.sin(a) * (R + r) / 2, (R - r) / 2 + 2);
    const Rs = S(86); [-10, 25, 60, 95, 130, 165].forEach((deg, i) => { const a = deg * Math.PI / 180, sx = cx + Math.cos(a) * Rs, sy = cy + Math.sin(a) * Rs, s = Math.sin(a), c = Math.cos(a);
      bg(bbx(sx - 26, sy - 26, sx + 26, sy + 26), g => dStool(g, sx, sy)); obC(sx, sy, 17);
      const pose = s > .5 ? 'back' : 'sit', face = s > .5 ? undefined : (c > 0 ? -1 : 1);
      seat({ x: sx, y: sy + (pose === 'back' ? 2 : 10), ax: cx + Math.cos(a) * (Rs + 58), ay: cy + Math.sin(a) * (Rs + 58), g: 'pubStool' + i, pose, face, z: sy + 4 });
      sitAt([sx - 26, sy - 26, sx + 26, sy + 26], 'Ngồi quầy bar', 'pubStool' + i); });
    const tid = 'tap'; dyn(bbx(cx - 30, cy, cx + 30, cy + R), (g, t) => { if (!fxOn(tid)) return; const k = Math.min(1, fxT(tid) / 2.5); fillRR(g, cx - 10, cy + (R + r) / 2 - 2 - 22 * k, 20, 22 * k + 2, 3, 'rgba(240,180,40,.9)'); fillRR(g, cx - 10, cy + (R + r) / 2 - 6 - 22 * k, 20, 6, 3, '#fff8e8'); });
    act([cx - 34, cy + r, cx + 34, cy + R], cx, cy + Rs + 58, 'Rót bia', () => { fx(tid, 4000); K.toast('Một vại bia mát lạnh 🍺'); }, { rad: 120 }); }
  { const x = X(1005), y = Y(392), id = 'jukebox'; prop(y, bbx(x - 44, y - 80, x + 44, y + 14), (g, t) => dJukebox(g, x, y, t, K.soundOn)); obR(x - 36, y - 30, x + 36, y + 8);
    hot({ r: [x - 40, y - 80, x + 40, y + 10], x, y: y + 50, label: () => K.soundOn ? 'Tắt nhạc' : 'Bật nhạc', act: () => K.toggleMusic(), always: true }); }
  RoundT(1018, 550, 15); Stool(X(1018), Y(524), 's', 'pubTA'); Stool(X(1046), Y(550), 'w', 'pubTB');
  RoundT(1196, 392, 14); Stool(X(1196), Y(424), 'n', 'pubTC');
  { const x = X(1240) - T / 2 - 4, y = Y(395), id = 'darts'; dyn(bbx(x - 26, y - 26, x + 10, y + 26), (g, t) => { dot(g, x, y, 22, '#1a1a1a'); for (let i = 0; i < 4; i++) dot(g, x, y, 18 - i * 4.5, i % 2 ? '#e8d8b8' : '#b3261e'); dot(g, x, y, 3, '#1a8a3a'); if (fxOn(id)){ const d = FX[id].data || {}; g.strokeStyle = '#c9963a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + (d.dx || 0), y + (d.dy || 0)); g.lineTo(x + (d.dx || 0) - 14, y + (d.dy || 0) - 6); g.stroke(); dot(g, x + (d.dx || 0), y + (d.dy || 0), 2.5, '#fff'); } });
    act([x - 30, y - 30, x + 14, y + 30], x - 130, y, 'Phóng phi tiêu', () => { const dx = Math.round((Math.random() - .5) * 30), dy = Math.round((Math.random() - .5) * 30), sc = Math.max(0, 50 - Math.round(Math.hypot(dx, dy) * 3)); fx(id, 5000, { dx, dy }); K.sound('dart', x, y); K.toast(sc >= 45 ? 'Trúng hồng tâm! 🎯 ' + sc + ' điểm' : 'Phi tiêu: ' + sc + ' điểm 🎯'); }, { rad: 130 }); }
  { const x0 = X(1060), wy = Y(285) + T / 2; GLOWS.push({ x: X(1180), y: wy + 20, r: 120, a: .18, col: 'rgba(255,80,160,A)' }); }
  /* --- Sân trong --- */
  { const cx = X(1055), cy = Y(708), r = S(46);
    bg(bbx(cx - r - 70, cy - r - 70, cx + r + 70, cy + r + 70), g => { oval(g, cx, cy, r + 70, (r + 70) * .92, '#4f7d3f'); g.fillStyle = pat(g, 'grass'); g.beginPath(); g.ellipse(cx, cy, r + 66, (r + 66) * .9, 0, 0, TAU); g.fill(); oval(g, cx + 6, cy + 10, r + 6, r * .9, 'rgba(0,0,0,.3)'); oval(g, cx, cy, r + 4, r * .94, '#cdbfa6'); oval(g, cx, cy, r - 8, r * .82, '#3a7aa0'); });
    obC(cx, cy, r + 4);
    dyn(bbx(cx - r, cy - r - 80, cx + r, cy + r), (g, t) => { const gr = g.createRadialGradient(cx, cy, 10, cx, cy, r); gr.addColorStop(0, '#8fd8f0'); gr.addColorStop(1, '#3a8ab0'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, r - 10, r * .8, 0, 0, TAU); g.fill();
      for (let i = 0; i < 3; i++){ const k = (t * .5 + i / 3) % 1; g.strokeStyle = `rgba(255,255,255,${.5 * (1 - k)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, 20 + k * (r - 30), (20 + k * (r - 30)) * .8, 0, 0, TAU); g.stroke(); }
      oval(g, cx, cy, 22, 18, '#d8ccb4'); g.fillStyle = '#e8dcc4'; g.fillRect(cx - 8, cy - 46, 16, 46); oval(g, cx, cy - 46, 26, 12, '#d8ccb4');
      for (let i = 0; i < 10; i++){ const a = i / 10 * TAU + t, k = (t * 1.4 + i * .1) % 1; dot(g, cx + Math.cos(a) * 30 * k, cy - 50 + k * 40 - Math.sin(k * Math.PI) * 30, 3, 'rgba(200,240,255,.85)'); }
      if (fxOn('coin')){ const k = fxT('coin'); for (let i = 0; i < 10; i++){ const a = i / 10 * TAU; dot(g, cx + Math.cos(a) * k * 50, cy + 20 + Math.sin(a) * k * 30, 3, `rgba(255,220,90,${1 - k / 2})`); } } });
    act([cx - r, cy - r, cx + r, cy + r], cx, cy + r + 60, 'Thả đồng xu ước nguyện', () => { fx('coin', 2000); K.sound('coin', cx, cy); K.toast('🪙 Đã thả đồng xu và ước một điều…'); }, { rad: 130 }); }
  Tree(898, 640, 0); Tree(1212, 640, 1); Tree(898, 812, 2); Tree(1212, 812, 0);
  Bench(940, 765, 65, 18, 'n', 'cBenchA'); Bench(1105, 765, 65, 18, 'n', 'cBenchB');
  Flowers(1160, 607, 70, 18); Flowers(965, 607, 40, 18);
  /* --- Nhà ăn --- */
  Rug(812, 892, 346, 128, '#6a1a20', '#e0b04a');
  { const t = Table(840, 925, 290, 60), cx = t.x + t.w / 2, cy = t.y + t.h / 2;
    dyn(bbx(cx - 60, cy - 60, cx + 60, cy + 20), (g, tt) => { fillRR(g, cx - 40, cy - 6, 80, 12, 4, '#c9963a'); [-30, 0, 30].forEach((dx, i) => { fillRR(g, cx + dx - 4, cy - 30, 8, 26, 2, '#f4ece0'); if (ex('candles', true)){ oval(g, cx + dx, cy - 36 + Math.sin(tt * 12 + i) * 1.2, 4, 8, '#ffb347'); oval(g, cx + dx, cy - 35, 2, 4, '#fff6c8'); } }); });
    GLOWS.push({ x: cx, y: cy - 30, r: 300, a: .22, key: 'candles', def: true, flick: true });
    act([cx - 50, cy - 40, cx + 50, cy + 20], cx, t.y + t.h + 130, () => ex('candles', true) ? 'Thổi tắt nến' : 'Thắp nến', () => { flip('candles', true); K.toast(ex('candles', true) ? 'Đã thắp nến 🕯️' : 'Đã thổi tắt nến'); }, { rad: 150 }); }
  [869, 927, 985, 1043, 1101].forEach((ix, i) => { Chair(ix, 903, 'n', 'dN' + i); Chair(ix, 1007, 's', 'dS' + i); });
  Chair(818, 955, 'w', 'dW'); Chair(1152, 955, 'e', 'dE');
  Table(745, 858, 90, 18, { on: (g, x, y, w) => { [['#b3261e', .3], ['#ffd43b', .45], ['#69db7c', .6]].forEach(([c, k]) => dot(g, x + w * k, y + 22, 8, c)); } });
  { const tb = Table(1140, 858, 90, 18, { on: (g, x, y, w) => { [.25, .4, .55].forEach(k => fillRR(g, x + w * k, y + 8, 9, 26, 3, '#5a1a2a')); } }); act([tb.x, tb.y, tb.x + tb.w, tb.y + tb.h], tb.x + tb.w / 2, tb.y + tb.h + 50, 'Rót rượu vang', () => K.toast('Một ly vang đỏ cho bữa tối 🍷'), { rad: 110 }); }
  Plant(748, 1058, .9); Plant(1222, 1058, .9);
  /* --- Sảnh chính --- */
  Rug(1100, 1115, 140, 140, '#7a1a20', '#e0b04a', true);
  { const x = X(1170), y = Y(1185), r = S(30); bg(bbx(x - r - 10, y - r - 10, x + r + 10, y + r + 10), g => dMapTable(g, x, y, r)); obC(x, y, r + 6);
    hot({ r: [x - r - 14, y - r - 14, x + r + 14, y + r + 14], x, y: y + r + 56, label: 'Xem bản đồ', act: () => K.approach(x, y + r + 56, () => K.openMap(), 120), map: true }); }
  Bench(1030, 1238, 80, 26, 'n', 'hBench');
  Plant(1318, 1108, .9); Plant(1318, 1255, .9);
  { const x = X(1262), y = Y(1252); prop(y, bbx(x - 26, y - 120, x + 26, y + 10), g => dCoat(g, x, y)); obC(x, y, 14); act([x - 24, y - 116, x + 24, y + 6], x, y - 50, 'Treo áo khoác', () => K.toast('Đã treo áo khoác 🧥'), { rad: 110 }); }
  /* --- Lối hành lang mở & lối ra bể bơi --- */
  Rug(1262, 668, 46, 398, '#2a3a6a', '#c9963a');
  Bench(1246, 838, 16, 67, 'e', 'corBench');
  Flowers(1413, 668, 25, 98); Flowers(1413, 882, 25, 98);
  bg(bbx(X(1340), Y(660), X(1405), Y(980)), g => { for (let i = 0; i < 9; i++){ const y = Y(680) + i * 82; fillRR(g, X(1350) + (i % 2) * 30, y, 90, 50, 14, '#cdbfa6'); } });
  /* --- Sảnh nhỏ --- */
  { const x = X(1342), y = Y(562); prop(y, bbx(x - 30, y - 110, x + 30, y + 14), g => dVase(g, x, y)); obC(x, y, 26); act([x - 28, y - 110, x + 28, y + 10], x, y + 56, 'Ngắm bình hoa', () => K.toast('Hoa tươi được cắm mỗi sáng 💐'), { rad: 110 }); }
  Table(1246, 575, 16, 70, { on: (g, x, y, w, h) => { dot(g, x + w / 2, y + 22, 8, '#ffe2a0'); } });
  Plant(1428, 638, .85);
  /* --- Cầu thang lên tầng 2 --- */
  { const x = X(1520), y = Y(518), w = X(1708) - x, h = Y(556) - y; bg(bbx(x, y, x + w, y + h), g => dStairs(g, x, y, w, h)); obR(x, y, x + w, y + h);
    act([x, y, x + w, y + h], x - 50, y + h / 2, 'Lên tầng 2', () => K.toast('Tầng 2 đang được xây, quay lại sau nhé 🚧'), { rad: 120 }); }
  /* --- Bể bơi --- */
  { const x = X(1515), y = Y(650), w = X(1645) - x, h = Y(880) - y;
    bg(bbx(x, y, x + w, y + h, 20), g => { fillRR(g, x - 12, y - 12, w + 24, h + 24, 14, '#f2ead8'); const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#5ec6e6'); gr.addColorStop(1, '#2a8ab8'); g.fillStyle = gr; rr(g, x, y, w, h, 8); g.fill(); g.strokeStyle = '#1a6a90'; g.lineWidth = 3; rr(g, x, y, w, h, 8); g.stroke();
      g.strokeStyle = '#d8d8e0'; g.lineWidth = 4; [Y(706), Y(728)].forEach(yy => { g.beginPath(); g.moveTo(x - 6, yy); g.lineTo(x + 18, yy); g.stroke(); }); g.beginPath(); g.moveTo(x + 4, Y(696)); g.lineTo(x + 4, Y(738)); g.stroke(); });
    obR(x, y, x + w, y + h);
    dyn(bbx(x, y, x + w, y + h), (g, t) => { g.save(); rr(g, x, y, w, h, 8); g.clip(); g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 2; for (let i = 0; i < 14; i++){ const yy = y + 20 + i * (h - 40) / 13; g.beginPath(); for (let xx = x; xx <= x + w; xx += 20) g.lineTo(xx, yy + Math.sin(xx * .03 + t * 1.6 + i) * 5); g.stroke(); }
      const dx = x + w / 2 + Math.sin(t * .3) * w * .3, dy = y + h * .45 + Math.cos(t * .23) * h * .3; oval(g, dx, dy, 22, 16, '#ffd43b'); dot(g, dx + 14, dy - 12, 10, '#ffd43b'); oval(g, dx + 22, dy - 12, 6, 3, '#ff8a3a'); dot(g, dx + 16, dy - 14, 2, '#1a1a1a'); g.restore(); });
    const SW = [[1545, 694], [1614, 708], [1548, 772], [1612, 786], [1550, 850], [1612, 854]];
    SW.forEach(([ix, iy], i) => seat({ x: X(ix), y: Y(iy), ax: X(1488), ay: Y(760), g: 'swim', pose: 'swim', z: Y(iy) }));
    sitAt([x, y, x + w, y + h], 'Bơi', 'swim'); }
  [[1453, 886], [1672, 886]].forEach(([ix, iy], i) => { const x = X(ix), y = Y(iy), w = S(36), h = S(88), grp = 'lounger' + i; bg(bbx(x, y, x + w, y + h), g => dLounger(g, x, y, w, h)); obR(x, y, x + w, y + h); seat({ x: x + w / 2, y: y + 46, ax: x + w / 2, ay: y - 44, g: grp, pose: 'lie', z: y + 46.5 }); prop(y + 47, bbx(x, y + 60, x + w, y + h), g => dTowel(g, x, y, w, h)); sitAt([x, y, x + w, y + h], 'Nằm phơi nắng', grp); });
  Shower(1566, 590, 30, 22, 1580, 632);
  /* --- Phòng nhạc --- */
  Rug(1722, 682, 160, 290, '#7a1218', '#e0b04a');
  { const x = X(1758), y = Y(690), w = S(96), h = S(88); bg(bbx(x, y, x + w, y + h), g => dPiano(g, x, y, w, h)); obR(x, y, x + w, y + h);
    const bx = X(1786), by = Y(790), bw = S(44), bh = S(15); bg(bbx(bx, by, bx + bw, by + bh), g => { shadowR(g, bx, by, bw, bh, 6); fillRR(g, bx, by, bw, bh, 6, '#141016'); fillRR(g, bx + 4, by + 4, bw - 8, bh - 8, 4, '#7a1a20'); });
    const pi = seat({ x: bx + bw / 2, y: by + bh / 2 + 4, ax: bx + bw / 2, ay: by + bh + 48, g: 'piano', pose: 'back', z: by + bh / 2 + 4 });
    SEATS[pi].onSit = () => { const sd = Math.floor(Math.random() * 1e6); fx('piano', 6500, { sd }); K.toast('🎹 Đang chơi piano…'); };
    hot({ r: [x, y, x + w, by + bh], x: bx + bw / 2, y: by + bh + 48, label: 'Chơi piano', act: () => { if (K.self && K.self.seat === pi){ const sd = Math.floor(Math.random() * 1e6); fx('piano', 6500, { sd }); } else K.claimSeat('piano'); } });
    dyn(bbx(x, y - 80, x + w, y + h), (g, t) => { if (!fxOn('piano')) return; const k = fxT('piano'); for (let i = 0; i < 4; i++){ const q = (k * .7 + i / 4) % 1; g.fillStyle = `rgba(255,236,170,${1 - q})`; g.font = '700 22px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillText(i % 2 ? '♪' : '♫', x + w * (.3 + i * .15) + Math.sin(q * 6 + i) * 10, y + h * .5 - q * 90); } });
    HOOKS.piano = (id, data, at) => { const sd = data && data.sd || 1; for (let i = 0; i < 16; i++){ const n = PENTA[Math.floor(hash(sd, i) * PENTA.length)]; K.note(n, X(1806), Y(735), at + i * 360, 'piano'); } }; }
  { const x = X(1862), y = Y(905); prop(y, bbx(x - 30, y - 140, x + 40, y + 14), g => dHarp(g, x, y)); obC(x, y, 22);
    dyn(bbx(x - 60, y - 200, x + 60, y - 60), (g, t) => { if (!fxOn('harp')) return; const k = fxT('harp'); for (let i = 0; i < 3; i++){ const q = (k * .6 + i / 3) % 1; g.fillStyle = `rgba(255,236,170,${1 - q})`; g.font = '700 20px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillText('♪', x - 10 + i * 12, y - 120 - q * 60); } });
    act([x - 30, y - 140, x + 40, y + 10], x - 70, y, 'Gảy đàn hạc', () => fx('harp', 4000, { sd: Math.floor(Math.random() * 1e6) }), { rad: 120 });
    HOOKS.harp = (id, data, at) => { const sd = data && data.sd || 1, base = Math.floor(hash(sd, 1) * 5); for (let i = 0; i < 10; i++) K.note(PENTA[(base + i) % PENTA.length] * (i > 4 ? 2 : 1), x, y, at + i * 180, 'harp'); }; }
  Chair(1760, 888, 's', 'muA', { col: '#7a1a20' }); Chair(1814, 888, 's', 'muB', { col: '#7a1a20' });
  Shelf(1728, 952, 150, 20, 'n', 'Xem đĩa than', () => K.toast(['Kind of Blue — Miles Davis 🎺', 'A Love Supreme — John Coltrane 🎷', 'Blue Train — John Coltrane 🎶', 'Ella & Louis 🎤'][Math.floor(Math.random() * 4)]));
  /* --- Phòng ngủ 01 (Tùng) --- */
  { const x0 = X(1505), x1 = X(1695), wy = Y(205) + T / 2;
    deco(bbx(x0, wy, x1, wy + FACE), g => { fillRR(g, x0, wy + 3, x1 - x0, FACE - 8, 3, '#2a1c18'); const gl = g.createLinearGradient(0, wy + 6, 0, wy + FACE - 8); gl.addColorStop(0, '#1a2a5a'); gl.addColorStop(1, '#5a6aa8'); g.fillStyle = gl; g.fillRect(x0 + 6, wy + 7, x1 - x0 - 12, FACE - 16); dot(g, x1 - 60, wy + 18, 8, '#fff6dc'); for (let i = 0; i < 14; i++) dot(g, x0 + 10 + hash(i, 9) * (x1 - x0 - 20), wy + 9 + hash(i, 8) * (FACE - 20), 1.2, '#fff'); }, Y(205), [x0 - 30, x1 + 30]);
    dyn(bbx(x0 - 20, wy, x1 + 20, wy + FACE), (g, t) => { const open = ex('curtain_bed01', true), k = open ? .22 : .52, w = (x1 - x0) * k; [[x0 - 14, 1], [x1 + 14 - w, -1]].forEach(([cx]) => { g.fillStyle = '#8a1a24'; g.fillRect(cx, wy + 2, w, FACE - 4); g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < w; i += 10) g.fillRect(cx + i, wy + 2, 4, FACE - 4); }); fillRR(g, x0 - 20, wy, x1 - x0 + 40, 5, 2, '#c9963a'); });
    act([x0, wy, x1, wy + FACE + 10], (x0 + x1) / 2, wy + FACE + 300, () => ex('curtain_bed01', true) ? 'Kéo rèm' : 'Mở rèm', () => { flip('curtain_bed01', true); K.toast(ex('curtain_bed01', true) ? 'Đã mở rèm — trăng đẹp quá 🌙' : 'Đã kéo rèm'); }, { rad: 340 }); }
  Rug(1508, 300, 186, 110, '#a8242c', '#e0b04a');
  Bed(1545, 238, 110, 108, 'tBed', '#8a1a24', '#f1d0a0');
  Night(1520, 240, 'light_bed01'); Night(1657, 240, 'light_bed01');
  { const x = X(1451), y = Y(262), w = S(20), h = S(100); bg(bbx(x, y, x + w, y + h), g => { dTable(g, x, y, w, h, '#8a5a32'); fillRR(g, x + 6, y + 30, w - 12, h - 60, 6, '#cfe3ee'); }); obR(x, y, x + w, y + h);
    act([x, y, x + w, y + h], x + w + 50, y + h / 2, 'Soi gương', () => K.toast(['Hôm nay trông xinh quá 💅', 'Chỉnh lại tóc một chút ✨'][Math.floor(Math.random() * 2)]), { rad: 110 }); }
  Table(1733, 252, 20, 90, { on: (g, x, y, w, h) => { fillRR(g, x + 6, y + 30, w - 12, 50, 3, '#2a2a30'); } }); Chair(1716, 297, 'w', 'tDesk', { col: '#8a1a24' });
  RoundT(1560, 460, 14); Chair(1532, 460, 'w', 'tChA', { col: '#8a1a24' }); Chair(1588, 460, 'e', 'tChB', { col: '#8a1a24' });
  Panel(1453, 418, 'bed01', 1478, 418);
  /* --- WC 04 --- */
  Toilet(1742, 438, 'w', 'wc04'); Counter(1688, 468, 36, 18); Sink(X(1706), Y(477), X(1706), Y(447), 34, 24);
  /* --- WC D2 --- */
  Counter(1362, 1012, 60, 20); Sink(X(1392), Y(1022), X(1392), Y(1048), 34, 24);
  Shower(1500, 1013, 56, 54, 1480, 1040);
  Toilet(1468, 1058, 'n', 'wcd2');
  /* --- WC --- */
  Toilet(1582, 1035, 'e', 'wc2'); Counter(1690, 1012, 60, 20); Sink(X(1720), Y(1022), X(1720), Y(1048), 36, 24);
  Shower(1764, 1013, 58, 54, 1740, 1040);
  /* --- Phòng khách --- */
  Rug(1515, 1125, 275, 180, '#7a1a20', '#e0b04a');
  Sofa(1545, 1150, 36, 140, 'w', 'lSofa', { col: SOFA.red });
  Arm(1700, 1130, 'n', 'lArmA', SOFA.red); Arm(1700, 1282, 's', 'lArmB', SOFA.red);
  Table(1640, 1180, 50, 62, { on: (g, x, y, w, h) => { dot(g, x + w / 2, y + h / 2, 12, '#e8f4ff'); dot(g, x + w / 2, y + h / 2, 8, '#d9902a'); } });
  { const x0 = X(1830) - T / 2 - 40, y0 = Y(1160), y1 = Y(1240); bg(bbx(x0 - 20, y0 - 20, x0 + 40, y1 + 20), g => { fillRR(g, x0 - 16, y0 - 16, 56, y1 - y0 + 32, 6, '#9a8a7a'); fillRR(g, x0 - 8, y0 - 8, 44, y1 - y0 + 16, 4, '#6a5a4a'); }); obR(x0 - 16, y0 - 16, x0 + 40, y1 + 16);
    Fire(x0 + 2, y0 + 4, 30, y1 - y0 - 8, 'fire_living', false);
    act([x0 - 20, y0 - 20, x0 + 40, y1 + 20], x0 - 70, (y0 + y1) / 2, () => ex('fire_living', false) ? 'Dập lửa lò sưởi' : 'Đốt lò sưởi', () => { flip('fire_living', false); K.toast(ex('fire_living', false) ? 'Lò sưởi bập bùng 🔥' : 'Đã dập lửa'); }, { rad: 120 }); }
  { const x = X(1792), y = Y(1108); LAMPS.push({ x, y: y - 120, key: 'light_living' }); prop(y, bbx(x - 50, y - 160, x + 50, y + 14), g => { oval(g, x + 4, y + 6, 20, 7, 'rgba(0,0,0,.3)'); g.fillStyle = '#2a2a30'; g.fillRect(x - 3, y - 110, 6, 112); g.fillStyle = ex('light_living', true) ? '#ffe9b8' : '#cdbb98'; g.beginPath(); g.moveTo(x - 30, y - 104); g.lineTo(x + 30, y - 104); g.lineTo(x + 20, y - 140); g.lineTo(x - 20, y - 140); g.closePath(); g.fill(); }); obC(x, y, 14);
    act([x - 32, y - 150, x + 32, y + 6], x - 60, y + 20, () => ex('light_living', true) ? 'Tắt đèn' : 'Bật đèn', () => { flip('light_living', true); K.toast(ex('light_living', true) ? 'Đã bật đèn 💡' : 'Đã tắt đèn 🌙'); }, { rad: 110 }); }
  Shelf(1341, 1215, 18, 75, 'e', 'Đọc sách', () => K.toast(BOOKS[Math.floor(Math.random() * BOOKS.length)]));
  { const x = X(1372), y = Y(1268), w = S(40), h = S(28); bg(bbx(x, y, x + w, y + h), g => { dTable(g, x, y, w, h, '#c9963a'); [.2, .45, .7].forEach((k, i) => fillRR(g, x + w * k, y + 10, 10, 30, 3, ['#5a1a2a', '#c9a24a', '#2a4a6a'][i])); }); obR(x, y, x + w, y + h); act([x, y, x + w, y + h], x + w + 50, y + h / 2, 'Pha đồ uống', () => K.toast(['Một ly whisky 🥃', 'Nước cam tươi 🍊', 'Trà đá chanh 🍋'][Math.floor(Math.random() * 3)]), { rad: 110 }); }
  Plant(1452, 1372, .95); Plant(1720, 1372, .95);
  /* --- Hồ cá Koi --- */
  { const cx = X(1335), cy = Y(332), rx = S(64), ry = S(48);
    bg(bbx(cx - rx - 20, cy - ry - 20, cx + rx + 20, cy + ry + 20), g => { oval(g, cx + 6, cy + 10, rx + 14, ry + 12, 'rgba(0,0,0,.25)'); for (let i = 0; i < 26; i++){ const a = i / 26 * TAU; oval(g, cx + Math.cos(a) * (rx + 6), cy + Math.sin(a) * (ry + 6), 18, 13, ['#a8a090', '#b9b0a0', '#9a9284'][i % 3]); } const gr = g.createRadialGradient(cx, cy, 10, cx, cy, rx); gr.addColorStop(0, '#2a6a6a'); gr.addColorStop(1, '#1a4a50'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rx - 6, ry - 6, 0, 0, TAU); g.fill(); [[-.6, .4], [.7, -.3], [.2, .6]].forEach(([a, b]) => { oval(g, cx + a * rx * .7, cy + b * ry * .7, 18, 12, '#3f8a4a'); dot(g, cx + a * rx * .7 + 4, cy + b * ry * .7 - 3, 4, '#ff9ac0'); }); });
    OB.push({ e: [cx, cy, rx + 4, ry + 4] });
    dyn(bbx(cx - rx, cy - ry, cx + rx, cy + ry), (g, t) => { const feed = fxOn('koi'); for (let i = 0; i < 5; i++){ const sp = .25 + i * .05, a = t * sp + i * 1.3, kx = feed ? cx + Math.cos(a * 3) * 20 : cx + Math.cos(a) * rx * .6, ky = feed ? cy + Math.sin(a * 3) * 14 : cy + Math.sin(a * 1.3) * ry * .55, dir = Math.atan2(Math.cos(a * 1.3) * ry * .55 * 1.3, -Math.sin(a) * rx * .6);
        g.save(); g.translate(kx, ky); g.rotate(feed ? a * 3 + Math.PI / 2 : dir); oval(g, 0, 0, 14, 6, i % 2 ? '#ff7a2a' : '#fff4ea'); dot(g, 5, i % 2 ? 1 : -1, 3, i % 2 ? '#fff4ea' : '#ff5a1a'); g.fillStyle = i % 2 ? '#ff9a5a' : '#ffe0d0'; g.beginPath(); g.moveTo(-12, 0); g.lineTo(-22, -6); g.lineTo(-22, 6); g.closePath(); g.fill(); g.restore(); }
      if (feed){ const k = fxT('koi'); for (let i = 0; i < 3; i++){ const r = (k * 30 + i * 10) % 40; g.strokeStyle = `rgba(255,255,255,${.5 - r / 80})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, cy, r, r * .7, 0, 0, TAU); g.stroke(); } } });
    act([cx - rx, cy - ry, cx + rx, cy + ry], cx, cy + ry + 60, 'Cho cá ăn', () => { fx('koi', 5000); K.toast('Đàn cá Koi bơi lại ăn 🐟'); }, { rad: 140 }); }
  Bench(1418, 290, 18, 66, 'w', 'koiBench'); SEATS.filter(s => s.g === 'koiBench').forEach(s => { s.ax = X(1427); s.ay = Y(356) + 44; });
  Lantern(1262, 270); Lantern(1262, 408);
  /* --- Sân vườn ngoài --- */
  // lối đá dẫn vào cửa chính
  bg(bbx(X(1120), Y(1275), X(1235), Y(1540)), g => { g.fillStyle = pat(g, 'paver'); g.fillRect(X(1120), Y(1275), X(1235) - X(1120), Y(1540) - Y(1275)); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(X(1120), Y(1275), 6, Y(1540) - Y(1275)); g.fillRect(X(1235) - 6, Y(1275), 6, Y(1540) - Y(1275)); });
  const EXIT = [X(1128), Y(1448), X(1227), Y(1492)];
  bg(bbx(EXIT[0], EXIT[1], EXIT[2], EXIT[3]), g => { fillRR(g, EXIT[0], EXIT[1], EXIT[2] - EXIT[0], EXIT[3] - EXIT[1], 10, '#6a1a20'); strokeRR(g, EXIT[0] + 8, EXIT[1] + 8, EXIT[2] - EXIT[0] - 16, EXIT[3] - EXIT[1] - 16, 6, '#e0b04a', 3); g.fillStyle = '#ffe9b8'; g.font = '700 26px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LỐI RA ↓', (EXIT[0] + EXIT[2]) / 2, (EXIT[1] + EXIT[3]) / 2 + 1); g.textBaseline = 'alphabetic'; });
  [[1114, 1440], [1241, 1440]].forEach(([ix, iy]) => { const x = X(ix), y = Y(iy); prop(y, bbx(x - 24, y - 110, x + 24, y + 12), g => dPost(g, x, y)); obC(x, y, 18); });
  LampPost(1102, 1335); LampPost(1253, 1335);
  // hiên sau phòng giải trí
  bg(bbx(X(700), Y(300), X(800), Y(395)), g => { for (let i = 0; i < 4; i++) fillRR(g, X(722) + (i % 2) * 40, Y(375) - i * 50, 110, 42, 12, '#cdbfa6'); });
  RoundT(872, 318, 18, { top: '#f4ece0', rim: '#c9963a' }); Chair(842, 318, 'w', 'gPatA', { col: '#2a6a9a' }); Chair(902, 318, 'e', 'gPatB', { col: '#2a6a9a' });
  { const x = X(872), y = Y(318); prop(y + 30, bbx(x - 110, y - 170, x + 110, y + 50), g => dUmbrella(g, x, y)); }
  Flowers(600, 362, 95, 22); Flowers(820, 362, 145, 22); Flowers(140, 300, 55, 36);
  // vườn sau phía trên bên phải: xích đu, ghế đá
  { const x = X(1590), y = Y(140); prop(y, bbx(x - 90, y - 150, x + 90, y + 16), (g, t) => dSwing(g, x, y, t, SEATS.some(s => s.g === 'swing' && K.occupant(s.i)))); obR(x - 86, y - 8, x - 70, y + 6); obR(x + 70, y - 8, x + 86, y + 6);
    seat({ x, y: y - 26, ax: x, ay: y + 50, g: 'swing', pose: 'sit', z: y - 20 }); sitAt([x - 50, y - 80, x + 50, y + 10], 'Ngồi xích đu', 'swing'); }
  Bench(1340, 150, 75, 20, 's', 'gBenchA'); Bench(1760, 160, 75, 20, 's', 'gBenchB');
  Flowers(1440, 90, 110, 30); Flowers(1660, 90, 80, 30);
  // vườn rau sau bếp
  { const x = X(200), y = Y(1290), w = S(230), h = S(120); bg(bbx(x, y, x + w, y + h), g => { fillRR(g, x, y, w, h, 10, '#6a4a2e'); for (let r = 0; r < 4; r++){ fillRR(g, x + 10, y + 12 + r * (h - 20) / 4, w - 20, (h - 20) / 4 - 10, 6, '#5a3a24'); for (let i = 0; i < 9; i++) dot(g, x + 26 + i * (w - 52) / 8, y + 20 + r * (h - 20) / 4 + 4, 9, ['#4a9a3a', '#6ab04a', '#e05a3a', '#ffd43b'][(r + i) % 4]); } }); obR(x, y, x + w, y + h);
    const id = 'veg'; dyn(bbx(x, y - 40, x + w, y + h), (g, t) => { if (!fxOn(id)) return; const k = fxT(id); for (let i = 0; i < 16; i++) dot(g, x + hash(i, 4) * w, y + hash(i, 6) * h - k * 10, 2.5, `rgba(140,210,255,${1 - k / 2.5})`); });
    act([x, y, x + w, y + h], x + w / 2, y - 46, 'Tưới vườn rau', () => { fx(id, 2500); K.toast('Vườn rau xanh tốt quá 🥬🍅'); }, { rad: 140 }); }
  Bench(640, 1290, 80, 22, 's', 'gBenchC'); Bench(1560, 1452, 80, 22, 'n', 'gBenchD');
  Flowers(660, 1215, 260, 22); Flowers(1460, 1418, 70, 22); Flowers(1660, 1418, 70, 22);
  Bush(1300, 1330); Bush(1880, 1200); Bush(1900, 560); Bush(1720, 610, 30); Bush(150, 860, 36); Bush(1290, 220, 34);
  // cây trong vườn
  [[420, 300, 0], [1000, 250, 1], [1310, 120, 2], [1880, 330, 0], [1905, 780, 1], [1905, 1060, 2], [150, 1330, 1], [560, 1420, 2], [880, 1330, 0], [1010, 1470, 1], [1330, 1470, 2], [1850, 1420, 0], [80, 560, 2], [80, 1040, 0], [1060, 130, 0], [700, 230, 2]].forEach(([a, b, k]) => Tree(a, b, k));
  // hàng cây viền quanh khu đất (ngoài hàng rào)
  for (let ix = 40; ix <= 1960; ix += 95) { Tree(ix, 42, (ix / 95) | 0, false); if (ix < 1080 || ix > 1290) Tree(ix, 1545, ((ix / 95) | 0) + 1, false); }
  for (let iy = 140; iy <= 1460; iy += 105){ Tree(22, iy, (iy / 105) | 0, false); Tree(1975, iy, ((iy / 105) | 0) + 2, false); }

  /* ======================= TRANG TRÍ THÊM (chỉ để ngắm, không tương tác) ======================= */
  // đồ nhỏ đặt trên bàn / sàn (toạ độ bản vẽ gốc)
  const put = (ix, iy, r, f, l = 2) => { const x = X(ix), y = Y(iy); bg(bbx(x - r, y - r, x + r, y + r), g => f(g, x, y), l); };
  const plate = (g, x, y, r = 14) => { oval(g, x + 2, y + 3, r, r * .9, 'rgba(0,0,0,.18)'); dot(g, x, y, r, '#fbfaf6'); dot(g, x, y, r * .62, '#efe8da'); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); };
  const glassS = (g, x, y, c) => { dot(g, x, y, 6.5, 'rgba(255,255,255,.6)'); dot(g, x, y, 4.5, c || 'rgba(170,215,240,.9)'); };
  const fork = (g, x, y) => { g.fillStyle = '#b8bcc4'; g.fillRect(x - 1, y - 10, 2, 20); };
  const mug = (g, x, y, c = '#e8e0d0') => { dot(g, x, y, 8, c); dot(g, x, y, 5, '#6a3a1a'); g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.arc(x + 9, y, 4, -1.3, 1.3); g.stroke(); };
  const stack = (g, x, y, n = 3) => { const cs = ['#8a2a2a', '#2a4a6a', '#c9a24a', '#3a6a3a', '#6a3a6a']; for (let i = 0; i < n; i++) { fillRR(g, x - 17 + i * 2, y - 6 - i * 6, 34, 10, 2, cs[(i + Math.round(x)) % cs.length]); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x - 14 + i * 2, y - 4 - i * 6, 28, 1.5); } };
  const bowl = (g, x, y) => { dot(g, x + 3, y + 4, 21, 'rgba(0,0,0,.2)'); dot(g, x, y, 21, '#c9a46a'); dot(g, x, y, 17, '#a8824a'); [['#d42a2a', -7, -5], ['#ffd43b', 7, -4], ['#69db7c', 0, 6], ['#ff8a3a', -8, 6], ['#7a2a8a', 8, 6], ['#d42a2a', 0, -9]].forEach(([c, a, b]) => dot(g, x + a, y + b, 6.5, c)); };
  const vaseS = (g, x, y, c = '#2a5a8a') => { dot(g, x + 2, y + 3, 10, 'rgba(0,0,0,.2)'); dot(g, x, y, 10, c); dot(g, x - 3, y - 3, 3, 'rgba(255,255,255,.4)'); [['#ff7aa8', -8, -12], ['#ffd43b', 0, -16], ['#fff1f5', 8, -12], ['#c77dff', 3, -8]].forEach(([f, a, b]) => { dot(g, x + a, y + b + 2, 3, '#3f7a3a'); dot(g, x + a, y + b, 5, f); }); };
  const candleS = (g, x, y) => { dot(g, x, y, 7, '#c9963a'); dot(g, x, y, 5, '#f4ece0'); oval(g, x, y - 6, 2.5, 5, '#ffb347'); };
  const cboard = (g, x, y) => { fillRR(g, x - 28, y - 17, 56, 34, 7, '#b8864a'); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1.5; rr(g, x - 28, y - 17, 56, 34, 7); g.stroke(); dot(g, x - 12, y - 3, 7, '#e05a3a'); dot(g, x + 1, y + 5, 5.5, '#4a9a3a'); fillRR(g, x + 8, y - 9, 14, 5, 2, '#f4efe6'); g.fillStyle = '#9aa4ac'; g.fillRect(x - 22, y + 9, 24, 3.5); g.fillStyle = '#2a1a12'; g.fillRect(x + 2, y + 9, 10, 3.5); };
  const pot = (g, x, y, r = 14, c = '#9aa0a8') => { g.fillStyle = '#2a2a30'; g.fillRect(x + r - 2, y - 2.5, 14, 5); dot(g, x, y, r + 2, '#2a2a30'); dot(g, x, y, r, c); dot(g, x, y, r * .65, '#d8a868'); };
  const kettle = (g, x, y, c = '#c0392b') => { g.fillStyle = c; g.fillRect(x - 20, y - 2, 9, 4); dot(g, x, y, 12, c); dot(g, x, y, 5, '#e8e0d0'); };
  const boxA = (g, x, y, w, h, c, f) => { shadowR(g, x - w / 2, y - h / 2, w, h, 4); fillRR(g, x - w / 2, y - h / 2, w, h, 4, c); if (f) f(); strokeRR(g, x - w / 2, y - h / 2, w, h, 4, 'rgba(0,0,0,.3)', 1.5); };
  const toaster = (g, x, y) => boxA(g, x, y, 34, 24, '#c8ced4', () => { g.fillStyle = '#2a2a30'; g.fillRect(x - 10, y - 7, 20, 4); g.fillRect(x - 10, y + 2, 20, 4); });
  const micro = (g, x, y) => boxA(g, x, y, 48, 30, '#2a2a30', () => { fillRR(g, x - 20, y - 11, 28, 22, 3, '#4a5a6a'); dot(g, x + 15, y - 5, 2.5, '#5be38a'); });
  const knives = (g, x, y) => { fillRR(g, x - 10, y - 8, 20, 16, 3, '#6a3e22'); ['#2a2a30', '#2a2a30', '#2a2a30'].forEach((c, i) => fillRR(g, x - 7 + i * 6, y - 13, 3.5, 7, 1, c)); };
  const spices = (g, x, y, n = 5) => { const cs = ['#c0392b', '#e0a030', '#3f7a3a', '#8a5a2a', '#d8d0c0', '#e05a3a']; for (let i = 0; i < n; i++){ dot(g, x, y - (n - 1) * 8 + i * 16, 6.5, '#f4efe6'); dot(g, x, y - (n - 1) * 8 + i * 16, 4.5, cs[i % cs.length]); } };
  const dishes = (g, x, y) => { fillRR(g, x - 18, y - 24, 36, 48, 4, '#b8c0c8'); for (let i = 0; i < 5; i++) fillRR(g, x - 14, y - 20 + i * 9, 28, 5, 2, i % 2 ? '#fbfaf6' : '#cfe3ee'); };
  const bread = (g, x, y) => { oval(g, x, y, 20, 13, '#a8824a'); oval(g, x - 6, y - 1, 9, 5.5, '#e8b060'); oval(g, x + 6, y + 2, 9, 5.5, '#d89a4a'); };
  const wine = (g, x, y) => { dot(g, x + 2, y + 3, 7, 'rgba(0,0,0,.2)'); dot(g, x, y, 7, '#3a0a14'); dot(g, x, y, 3, '#c9963a'); };
  const mag = (g, x, y, c = '#c0392b') => { g.save(); g.translate(x, y); g.rotate(.25); fillRR(g, -16, -20, 32, 40, 2, '#f4efe6'); fillRR(g, -13, -17, 26, 16, 1, c); g.fillStyle = '#8a7a6a'; [4, 9, 14].forEach(t => g.fillRect(-13, t, 26, 2)); g.restore(); };
  const remote = (g, x, y) => { fillRR(g, x - 5, y - 14, 10, 28, 4, '#2a2a30'); dot(g, x, y - 8, 2, '#c0392b'); };
  const slippers = (g, x, y) => { oval(g, x - 7, y, 6, 12, '#ff9ac0'); oval(g, x + 7, y, 6, 12, '#ff9ac0'); oval(g, x - 7, y - 4, 4, 5, '#fff'); oval(g, x + 7, y - 4, 4, 5, '#fff'); };
  const perfume = (g, x, y) => { [['#ff9ac0', -10], ['#c9a24a', 2], ['#9fd8f0', 13]].forEach(([c, dx]) => { fillRR(g, x + dx - 5, y - 6, 10, 12, 3, c); dot(g, x + dx, y - 8, 2.5, '#c9963a'); }); };
  const towels = (g, x, y, c1 = '#ffffff', c2 = '#9fd8f0') => { fillRR(g, x - 20, y - 14, 40, 14, 4, c1); fillRR(g, x - 20, y, 40, 14, 4, c2); };
  const soap = (g, x, y) => { oval(g, x, y, 11, 7, '#e8eef2'); oval(g, x, y - 1, 7, 4.5, '#ffb3d1'); };
  const laptop = (g, x, y) => { fillRR(g, x - 26, y - 17, 52, 34, 3, '#c8ced4'); fillRR(g, x - 22, y - 13, 44, 26, 2, '#3a6a9a'); };
  const pens = (g, x, y) => { dot(g, x, y, 8, '#2a2a30'); ['#c0392b', '#ffd43b', '#4dabf7'].forEach((c, i) => dot(g, x - 3 + i * 3, y - 3 + (i % 2) * 3, 2.2, c)); };
  const papers = (g, x, y) => { g.save(); g.translate(x, y); g.rotate(-.15); fillRR(g, -15, -20, 30, 40, 1, '#ffffff'); g.fillStyle = '#9aa4ac'; for (let i = 0; i < 6; i++) g.fillRect(-11, -14 + i * 6, 22 - (i % 3) * 4, 1.5); g.restore(); };
  const cushion = (g, x, y, c) => { fillRR(g, x - 22, y - 22, 44, 44, 12, c); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 2; rr(g, x - 22, y - 22, 44, 44, 12); g.stroke(); dot(g, x, y, 3, 'rgba(0,0,0,.25)'); };
  const mat = (ix, iy, iw, ih, c1, c2) => { const x = X(ix), y = Y(iy), w = S(iw), h = S(ih); bg(bbx(x, y, x + w, y + h, 4), g => { fillRR(g, x, y, w, h, 8, c1); g.strokeStyle = c2; g.lineWidth = 3; rr(g, x + 6, y + 6, w - 12, h - 12, 6); g.stroke(); for (let i = 1; i < 6; i++){ g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 8, y + i * h / 6, w - 16, 2); } }, 0); };
  const crate = (ix, iy) => { const x = X(ix), y = Y(iy); bg(bbx(x - 34, y - 30, x + 34, y + 30), g => { boxA(g, x, y, 60, 48, '#a8784a', () => { g.strokeStyle = '#6a4628'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 30, y - 8); g.lineTo(x + 30, y - 8); g.moveTo(x - 30, y + 8); g.lineTo(x + 30, y + 8); g.stroke(); [['#e05a3a', -14], ['#ffd43b', 0], ['#69db7c', 14]].forEach(([c, dx]) => dot(g, x + dx, y - 16, 6, c)); }); }); obR(x - 30, y - 24, x + 30, y + 24); };
  const sack = (ix, iy) => { const x = X(ix), y = Y(iy); bg(bbx(x - 30, y - 30, x + 30, y + 30), g => { oval(g, x + 4, y + 6, 26, 22, 'rgba(0,0,0,.25)'); oval(g, x, y, 26, 22, '#d8c49a'); oval(g, x, y - 14, 12, 7, '#c8b48a'); g.fillStyle = '#8a6a3a'; g.font = '700 12px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillText('GẠO', x, y + 6); }); obC(x, y, 22); };
  const barrel = (ix, iy) => { const x = X(ix), y = Y(iy); bg(bbx(x - 34, y - 34, x + 34, y + 34), g => { dot(g, x + 4, y + 6, 30, 'rgba(0,0,0,.3)'); dot(g, x, y, 30, '#6a4628'); dot(g, x, y, 24, '#8a5a32'); g.strokeStyle = '#2a2a30'; g.lineWidth = 3; [30, 18].forEach(r => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }); }); obC(x, y, 28); };
  // đồ cao (vẽ xen với nhân vật)
  const tall = (ix, iy, r, f, ob = 0, glowR) => { const x = X(ix), y = Y(iy); prop(y, bbx(x - r, y - r * 2.2, x + r, y + 16), (g, t) => f(g, x, y, t)); if (ob) obC(x, y, ob); if (glowR) GLOWS.push({ x, y: y - 110, r: glowR, a: .2 }); };
  const floorLamp = (g, x, y) => { oval(g, x + 4, y + 6, 20, 7, 'rgba(0,0,0,.3)'); g.fillStyle = '#2a2a30'; g.fillRect(x - 3, y - 108, 6, 110); g.fillStyle = '#ffe9b8'; g.beginPath(); g.moveTo(x - 28, y - 100); g.lineTo(x + 28, y - 100); g.lineTo(x + 19, y - 134); g.lineTo(x - 19, y - 134); g.closePath(); g.fill(); g.strokeStyle = '#c9963a'; g.lineWidth = 2; g.stroke(); };
  const clock = (g, x, y, t) => { oval(g, x + 4, y + 6, 26, 8, 'rgba(0,0,0,.3)'); fillRR(g, x - 22, y - 150, 44, 154, 8, '#4a2a18'); fillRR(g, x - 17, y - 144, 34, 34, 17, '#f4ece0'); g.strokeStyle = '#2a1a12'; g.lineWidth = 2; const a = t * .5; g.beginPath(); g.moveTo(x, y - 127); g.lineTo(x + Math.cos(a) * 11, y - 127 + Math.sin(a) * 11); g.moveTo(x, y - 127); g.lineTo(x + Math.cos(a / 12) * 7, y - 127 + Math.sin(a / 12) * 7); g.stroke(); fillRR(g, x - 12, y - 100, 24, 80, 4, '#2a160c'); const sw = Math.sin(t * 3) * 8; g.strokeStyle = '#c9963a'; g.beginPath(); g.moveTo(x, y - 98); g.lineTo(x + sw, y - 40); g.stroke(); dot(g, x + sw, y - 38, 7, '#e2b84e'); };
  const guitar = (g, x, y) => { oval(g, x + 3, y + 5, 18, 6, 'rgba(0,0,0,.3)'); g.save(); g.translate(x, y - 40); g.rotate(-.18); oval(g, 0, 18, 20, 24, '#c97a2a'); oval(g, 0, -10, 15, 17, '#c97a2a'); dot(g, 0, 4, 7, '#2a1a12'); g.fillStyle = '#3a2416'; g.fillRect(-3, -70, 6, 60); fillRR(g, -6, -84, 12, 16, 3, '#2a1a12'); g.strokeStyle = 'rgba(255,240,200,.7)'; g.lineWidth = .8; for (let i = -2; i <= 2; i++){ g.beginPath(); g.moveTo(i * 1.2, -70); g.lineTo(i * 1.2, 30); g.stroke(); } g.restore(); };
  const cello = (g, x, y) => { oval(g, x + 3, y + 5, 20, 7, 'rgba(0,0,0,.3)'); oval(g, x, y - 30, 22, 30, '#8a3a12'); oval(g, x, y - 72, 17, 20, '#8a3a12'); g.fillStyle = '#1a0e08'; g.fillRect(x - 3, y - 140, 6, 80); fillRR(g, x - 5, y - 150, 10, 14, 4, '#1a0e08'); g.strokeStyle = 'rgba(255,240,200,.6)'; g.lineWidth = .8; for (let i = -1.5; i <= 1.5; i++){ g.beginPath(); g.moveTo(x + i * 1.6, y - 140); g.lineTo(x + i * 1.6, y - 14); g.stroke(); } };
  const stand = (g, x, y) => { g.strokeStyle = '#2a2a30'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x, y - 12); g.lineTo(x + 14, y); g.moveTo(x, y - 12); g.lineTo(x, y - 80); g.stroke(); fillRR(g, x - 26, y - 104, 52, 30, 3, '#2a2a30'); fillRR(g, x - 22, y - 100, 44, 22, 2, '#fbfaf6'); g.fillStyle = '#2a2a30'; for (let i = 0; i < 4; i++) g.fillRect(x - 19, y - 96 + i * 5, 38, 1); };
  const gramo = (g, x, y, t) => { dRound(g, x, y, 30, '#6a3e22'); dot(g, x - 4, y + 2, 18, '#111'); dot(g, x - 4, y + 2, 5, '#c0392b'); g.save(); g.translate(x + 14, y - 10); g.rotate(-.6 + Math.sin(t) * .03); g.fillStyle = '#c9963a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(26, -16); g.lineTo(34, 6); g.closePath(); g.fill(); g.restore(); };
  const umbStand = (g, x, y) => { oval(g, x + 3, y + 5, 16, 6, 'rgba(0,0,0,.3)'); fillRR(g, x - 13, y - 44, 26, 48, 6, '#2a4a6a'); [['#c0392b', -6], ['#2a2a30', 4], ['#e0c070', 8]].forEach(([c, dx]) => { g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); g.moveTo(x + dx, y - 40); g.lineTo(x + dx * 1.6, y - 92); g.stroke(); }); };
  const birdbath = (g, x, y, t) => { oval(g, x + 4, y + 6, 24, 8, 'rgba(0,0,0,.3)'); fillRR(g, x - 8, y - 46, 16, 48, 4, '#cdbfa6'); oval(g, x, y - 50, 34, 14, '#d8ccb4'); oval(g, x, y - 52, 26, 9, '#7ac0e0'); const hop = Math.abs(Math.sin(t * 2)) * 3; oval(g, x + 16, y - 62 - hop, 7, 6, '#8a6a4a'); dot(g, x + 21, y - 66 - hop, 4, '#8a6a4a'); };
  const gnome = (g, x, y) => { oval(g, x + 3, y + 4, 14, 5, 'rgba(0,0,0,.3)'); oval(g, x, y - 12, 12, 14, '#2a6a9a'); oval(g, x, y - 26, 9, 9, '#ffd8c0'); oval(g, x, y - 20, 9, 7, '#f4f4f4'); g.fillStyle = '#d42a2a'; g.beginPath(); g.moveTo(x - 11, y - 30); g.lineTo(x + 11, y - 30); g.lineTo(x + 2, y - 58); g.closePath(); g.fill(); };
  const mailbox = (g, x, y) => { oval(g, x + 3, y + 5, 14, 5, 'rgba(0,0,0,.3)'); g.fillStyle = '#4a2a18'; g.fillRect(x - 3, y - 50, 6, 52); fillRR(g, x - 18, y - 76, 36, 28, 10, '#b3261e'); g.fillStyle = '#ffd43b'; g.fillRect(x + 14, y - 80, 3, 16); };
  const bin = (g, x, y) => { oval(g, x + 3, y + 5, 15, 5, 'rgba(0,0,0,.3)'); fillRR(g, x - 13, y - 34, 26, 36, 5, '#8a949c'); fillRR(g, x - 15, y - 38, 30, 7, 3, '#6a747c'); };
  const plantD = (g, x, y) => dPlant(g, x, y, .8);
  const lampT = (g, x, y) => { dot(g, x + 3, y + 4, 13, 'rgba(0,0,0,.25)'); dot(g, x, y, 13, '#ffe9b8'); g.strokeStyle = '#c9963a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 13, 0, TAU); g.stroke(); dot(g, x, y, 4, '#fff6dc'); };
  const sideT = (ix, iy, f) => { const x = X(ix), y = Y(iy); bg(bbx(x - 26, y - 26, x + 26, y + 26), g => { dRound(g, x, y, 22); if (f) f(g, x, y); }); obC(x, y, 20); };

  /* --- Phòng bếp: đồ làm bếp và nội thất --- */
  mat(400, 928, 160, 30, '#7a2a20', '#e0b04a');
  put(520, 900, 20, (g, x, y) => pot(g, x, y, 13, '#c0392b')); put(552, 911, 20, (g, x, y) => kettle(g, x, y, '#2a6a9a'));
  put(462, 904, 30, cboard); put(482, 898, 14, knives); put(575, 904, 26, micro);
  Counter(346, 920, 24, 78); put(358, 958, 30, (g, x, y) => spices(g, x, y, 5));
  Counter(346, 1092, 24, 60); put(358, 1121, 28, dishes);
  Counter(606, 928, 24, 154); put(618, 950, 22, toaster); put(618, 990, 22, (g, x, y) => kettle(g, x, y)); put(618, 1035, 24, bowl); put(618, 1066, 22, bread);
  put(452, 1012, 24, bowl); put(482, 1004, 20, (g, x, y) => { glassS(g, x - 8, y); glassS(g, x + 8, y); }); put(515, 1016, 16, vaseS); put(502, 1030, 16, mug);
  RoundT(482, 1140, 19, { top: '#f4ece0', rim: '#c9963a', on: (g, x, y) => { vaseS(g, x, y - 6, '#c0392b'); mug(g, x - 18, y + 12); mug(g, x + 18, y + 12, '#9fd8f0'); } });
  Chair(453, 1140, 'w', 'kNookA', { col: '#c0392b' }); Chair(511, 1140, 'e', 'kNookB', { col: '#c0392b' });
  tall(590, 1180, 18, bin, 13); tall(620, 1182, 30, plantD, 12);
  /* --- Pantry --- */
  crate(300, 932); sack(318, 975); sack(296, 1120); crate(300, 1160);
  /* --- Phòng ngủ Master --- */
  Rug(140, 418, 172, 92, '#5a2a4e', '#e0b04a');
  { const x = X(430), y = Y(492), w = S(80), h = S(18); bg(bbx(x, y, x + w, y + h), g => { shadowR(g, x, y, w, h, 8); fillRR(g, x, y, w, h, 8, '#5a2a4e'); fillRR(g, x + 4, y + 4, w - 8, h - 8, 6, '#7a3e6a'); }); obR(x, y, x + w, y + h); }
  put(393, 384, 18, (g, x, y) => stack(g, x, y, 2)); put(544, 384, 16, mug); put(226, 446, 16, (g, x, y) => stack(g, x + 4, y + 8, 2));
  put(400, 478, 16, slippers, 0); put(352, 598, 22, perfume);
  tall(138, 378, 32, floorLamp, 12, 180); tall(140, 598, 30, plantD, 14);
  /* --- WC Master --- */
  mat(150, 712, 70, 22, '#9fd8f0', '#ffffff'); put(274, 650, 14, soap); put(140, 760, 12, candleS); put(140, 790, 12, candleS);
  { const x0 = X(250), x1 = X(300), wy = Y(620) + T / 2; deco(bbx(x0, wy, x1, wy + FACE), g => { g.fillStyle = '#c9963a'; g.fillRect(x0 + 6, wy + 10, x1 - x0 - 12, 3); towels(g, (x0 + x1) / 2, wy + 26); }, Y(620), [x0 - 10, x1 + 10]); }
  /* --- Phòng làm việc --- */
  put(470, 672, 20, pens); put(530, 676, 18, (g, x, y) => mug(g, x, y, '#2a6a3a')); put(392, 657, 18, (g, x, y) => stack(g, x, y + 4, 2), 2);
  { const x = X(566), y = Y(648), w = S(20), h = S(24); bg(bbx(x, y, x + w, y + h), g => { boxA(g, x + w / 2, y + h / 2, w, h, '#6a7a8a', () => { g.fillStyle = '#4a5a6a'; [8, 26, 44].forEach(t => g.fillRect(x + 4, y + t, w - 8, 3)); }); }); obR(x, y, x + w, y + h); }
  tall(336, 812, 32, floorLamp, 12, 170); put(352, 794, 14, mug); put(545, 793, 20, (g, x, y) => stack(g, x, y, 3), 1);
  /* --- Hallway --- */
  tall(652, 1176, 22, umbStand, 12); tall(712, 1058, 30, plantD, 0);
  { const x = X(640), y = Y(990), w = S(14), h = S(60); bg(bbx(x, y, x + w, y + h), g => { dTable(g, x, y, w, h, '#8a5a32'); [12, 44, 76, 108].forEach((t, i) => { oval(g, x + w / 2, y + t, 7, 11, ['#2a2a30', '#b3261e', '#e0c070', '#2a4a6a'][i]); }); }); obR(x, y, x + w, y + h); }
  /* --- Phòng sinh hoạt chung --- */
  put(752, 710, 20, (g, x, y) => mag(g, x, y)); put(785, 728, 14, remote); put(792, 712, 14, mug);
  sideT(728, 803, (g, x, y) => lampT(g, x, y)); tall(857, 772, 26, (g, x, y) => { oval(g, x + 3, y + 5, 22, 8, 'rgba(0,0,0,.3)'); fillRR(g, x - 20, y - 30, 40, 34, 8, '#a8784a'); fillRR(g, x - 16, y - 42, 32, 16, 6, '#c9b48a'); fillRR(g, x - 12, y - 46, 26, 12, 5, '#7a2228'); }, 18);
  put(612, 760, 26, (g, x, y) => cushion(g, x, y, '#c0392b'), 1); put(640, 790, 26, (g, x, y) => cushion(g, x, y, '#e0b04a'), 1);
  /* --- Phòng giải trí --- */
  { const x = X(845), y = Y(421), w = S(70), h = S(14); bg(bbx(x, y, x + w, y + h), g => { dTable(g, x, y, w, h, '#6a3e22'); ['#c0392b', '#2a6a9a', '#e0c070', '#3a8a3a', '#6a3a8a'].forEach((c, i) => fillRR(g, x + 8 + i * (w - 16) / 5, y + 5, (w - 16) / 5 - 4, h - 10, 2, c)); }); obR(x, y, x + w, y + h); }
  put(655, 540, 20, (g, x, y) => { glassS(g, x - 22, y - 16, 'rgba(240,180,40,.9)'); glassS(g, x + 22, y + 14, 'rgba(240,180,40,.9)'); });
  tall(600, 566, 30, plantD, 14); put(648, 486, 18, (g, x, y) => { fillRR(g, x - 18, y - 10, 36, 20, 8, '#2a2a30'); dot(g, x - 9, y, 3, '#c0392b'); dot(g, x + 9, y, 3, '#4dabf7'); }, 0);
  /* --- Pub --- */
  barrel(1222, 566); put(1018, 550, 18, (g, x, y) => { candleS(g, x, y); glassS(g, x + 14, y - 8, 'rgba(240,180,40,.9)'); }); put(1196, 392, 16, candleS);
  { const x0 = X(1045), x1 = X(1172), wy = Y(285) + T / 2; dyn(bbx(x0, wy - 10, x1, wy + 30), (g, t) => { g.save(); g.font = '700 20px Fredoka, sans-serif'; g.textAlign = 'center'; g.shadowColor = '#ff4fa3'; g.shadowBlur = 12 + Math.sin(t * 6) * 4; g.fillStyle = Math.sin(t * 1.7) > -.92 ? '#ffd0ea' : '#7a3a5a'; g.fillText('★ PUB ★', (x0 + x1) / 2, wy + 2); g.restore(); }); }
  /* --- Sân trong --- */
  Lantern(878, 606); Lantern(1228, 655);
  put(995, 660, 22, (g, x, y) => { dot(g, x + 3, y + 4, 18, 'rgba(0,0,0,.25)'); dot(g, x, y, 18, '#b06a3a'); dFlowers(g, x - 14, y - 14, 28, 28); }, 1); put(1115, 660, 22, (g, x, y) => { dot(g, x + 3, y + 4, 18, 'rgba(0,0,0,.25)'); dot(g, x, y, 18, '#b06a3a'); dFlowers(g, x - 14, y - 14, 28, 28); }, 1);
  /* --- Nhà ăn: bày bàn tiệc --- */
  [869, 927, 985, 1043, 1101].forEach(ix => { put(ix, 941, 22, (g, x, y) => { plate(g, x, y); fork(g, x - 22, y); fork(g, x + 22, y); glassS(g, x + 16, y - 14, 'rgba(150,20,40,.85)'); }); put(ix, 969, 22, (g, x, y) => { plate(g, x, y); fork(g, x - 22, y); fork(g, x + 22, y); glassS(g, x - 16, y + 14, 'rgba(150,20,40,.85)'); }); });
  put(853, 955, 18, (g, x, y) => plate(g, x, y, 13)); put(1117, 955, 18, (g, x, y) => plate(g, x, y, 13));
  put(918, 955, 22, vaseS); put(1052, 955, 22, (g, x, y) => vaseS(g, x, y, '#b3261e')); put(950, 957, 22, bread); put(1018, 952, 12, wine);
  GLOWS.push({ x: X(985), y: Y(955), r: 380, a: .1 });
  /* --- Sảnh chính --- */
  tall(1126, 1258, 30, plantD, 12); tall(1232, 1258, 30, plantD, 12); tall(1022, 1108, 26, clock, 18);
  GLOWS.push({ x: X(1170), y: Y(1185), r: 260, a: .14 });
  /* --- Lối hành lang & sảnh nhỏ --- */
  tall(1250, 818, 30, plantD, 14); Lantern(1342, 668); Lantern(1342, 975);
  Rug(1302, 512, 80, 80, '#2a3a6a', '#e0b04a', true);
  /* --- Bể bơi --- */
  RoundT(1580, 935, 12, { top: '#f4ece0', rim: '#c9963a', on: (g, x, y) => { glassS(g, x - 8, y - 4, 'rgba(255,140,60,.9)'); glassS(g, x + 8, y + 4, 'rgba(255,200,60,.9)'); } });
  { const x = X(1580), y = Y(935); prop(y + 20, bbx(x - 110, y - 170, x + 110, y + 40), g => dUmbrella(g, x, y)); }
  dyn(bbx(X(1515), Y(650), X(1645), Y(880)), (g, t) => { const x = X(1600) + Math.sin(t * .4) * 40, y = Y(800) + Math.cos(t * .3) * 30; g.strokeStyle = '#ff5a5a'; g.lineWidth = 9; g.beginPath(); g.arc(x, y, 18, 0, TAU); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 9; g.setLineDash([9, 19]); g.beginPath(); g.arc(x, y, 18, 0, TAU); g.stroke(); g.setLineDash([]); });
  /* --- Phòng nhạc --- */
  tall(1732, 688, 30, guitar, 12); tall(1872, 806, 30, cello, 12); tall(1787, 850, 30, stand, 0); tall(1870, 682, 32, floorLamp, 12, 170);
  sideT(1738, 914, (g, x, y, t) => gramo(g, x, y, 0));
  /* --- Phòng ngủ 01 --- */
  tall(1496, 396, 30, guitar, 12); tall(1486, 244, 28, plantD, 14); put(1612, 378, 26, (g, x, y) => cushion(g, x, y, '#e0b04a'), 1); put(1532, 254, 16, (g, x, y) => stack(g, x, y, 2)); put(1668, 253, 14, mug);
  put(1592, 354, 16, slippers, 0); tall(1702, 372, 22, (g, x, y) => { oval(g, x + 3, y + 5, 18, 6, 'rgba(0,0,0,.3)'); fillRR(g, x - 17, y - 34, 34, 36, 7, '#c9b48a'); g.strokeStyle = '#8a7a5a'; g.lineWidth = 1.5; for (let i = 1; i < 4; i++){ g.beginPath(); g.moveTo(x - 17, y - 34 + i * 9); g.lineTo(x + 17, y - 34 + i * 9); g.stroke(); } fillRR(g, x - 12, y - 42, 24, 12, 5, '#9fd8f0'); }, 14);
  put(1580, 460, 16, (g, x, y) => { mug(g, x - 8, y - 4); vaseS(g, x + 10, y + 6, '#c0392b'); });
  /* --- Các WC --- */
  mat(1500, 1045, 50, 16, '#9fd8f0', '#fff'); put(1405, 1021, 12, soap);
  tall(1748, 1052, 20, (g, x, y) => { oval(g, x + 3, y + 5, 16, 6, 'rgba(0,0,0,.3)'); fillRR(g, x - 15, y - 30, 30, 32, 6, '#c9b48a'); fillRR(g, x - 10, y - 38, 20, 12, 5, '#ffb3d1'); }, 12); put(1705, 1021, 12, soap);
  /* --- Phòng khách --- */
  sideT(1563, 1132, (g, x, y) => lampT(g, x, y)); sideT(1563, 1306, (g, x, y) => lampT(g, x, y));
  { const x = X(1640), y = Y(1276); bg(bbx(x - 34, y - 34, x + 34, y + 34), g => { dot(g, x + 4, y + 6, 30, 'rgba(0,0,0,.28)'); dot(g, x, y, 30, '#7a2228'); dot(g, x, y, 24, '#9a3036'); dot(g, x, y, 4, '#5a161c'); }); obC(x, y, 26); }
  put(1662, 1200, 22, (g, x, y) => { mag(g, x - 6, y + 4, '#2a6a9a'); candleS(g, x + 12, y - 14); }); tall(1352, 1100, 26, clock, 18); tall(1450, 1104, 30, plantD, 14);
  /* --- Sân vườn: đồ trang trí --- */
  tall(600, 300, 36, birdbath, 26); tall(655, 1244, 18, gnome, 0); tall(1500, 1432, 18, gnome, 0); tall(1180, 245, 18, gnome, 0); tall(1272, 1468, 22, mailbox, 10);
  put(1720, 150, 60, (g, x, y) => { g.save(); g.translate(x, y); g.rotate(-.12); fillRR(g, -70, -46, 140, 92, 6, '#f4f1ea'); g.fillStyle = '#d42a2a'; for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2) g.fillRect(-70 + i * 20, -46 + j * 18.4, 20, 18.4); g.restore(); fillRR(g, x + 24, y - 18, 40, 30, 6, '#a8784a'); bowl(g, x - 24, y + 4); }, 0);
  bg(bbx(X(450), Y(1228), X(480), Y(1300)), g => { for (let i = 0; i < 3; i++) fillRR(g, X(452) + (i % 2) * 20, Y(1236) + i * 52, 70, 38, 12, '#cdbfa6'); }, 0);
  Flowers(510, 1256, 110, 18); Bush(1918, 630, 30); Bush(980, 1300, 32); Bush(88, 660, 30);

  const BOOKS = ['📖 "Rừng Na Uy" — Haruki Murakami', '📖 "Hoàng tử bé" — Antoine de Saint-Exupéry', '📖 "Nhà giả kim" — Paulo Coelho', '📖 "Đắc nhân tâm" — Dale Carnegie', '📖 "Số đỏ" — Vũ Trọng Phụng', '📖 "Dế mèn phiêu lưu ký" — Tô Hoài', '📖 "1984" — George Orwell'];
  const PENTA = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];

  /* ======================= ĐÈN TỪNG PHÒNG ======================= */
  const LIGHTS = [['light_master', ['master', 'wcmaster']], ['light_bed01', ['bed01', 'wc04']], ['light_study', ['study']], ['light_living', ['living']]].map(([key, zs]) => ({ key, zs: zs.map(id => ZONES[ZI[id]]), d: 0 }));

  /* ======================= VẼ NỀN TĨNH (theo ô) ======================= */
  const hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  const isOut = i => ZONES[i].kind === 'out';
  function drawFace(g, w){
    const x0 = w.x0 - (w.ea ? T / 2 : 0), x1 = w.x1 + (w.eb ? T / 2 : 0), y0 = w.y + T / 2, y1 = y0 + FACE, indoor = !isOut(w.s), sz = ZONES[w.s];
    g.fillStyle = indoor ? (sz.paper || '#3a2c36') : '#d2be98'; g.fillRect(x0, y0, x1 - x0, FACE);
    if (indoor){ for (let x = Math.ceil(x0 / 26) * 26; x < x1; x += 26){ g.fillStyle = 'rgba(255,255,255,.045)'; g.fillRect(x, y0, 12, FACE - 10); } }
    else { g.fillStyle = 'rgba(0,0,0,.07)'; for (let y = y0 + 9; y < y1 - 8; y += 10) g.fillRect(x0, y, x1 - x0, 1); }
    g.fillStyle = indoor ? '#4a2e1e' : '#8a7458'; g.fillRect(x0, y1 - 8, x1 - x0, 8);
    g.fillStyle = indoor ? '#6a4228' : '#a89070'; g.fillRect(x0, y1 - 9, x1 - x0, 2);
    // cửa sổ (tường ngoài) hoặc tranh (tường trong)
    const len = x1 - x0, skip = (a, b) => NODECO.some(n => n.y === w.y && a < n.x1 && b > n.x0);
    if (len > 130){
      if (!indoor || isOut(w.n)){
        const n = Math.max(1, Math.floor(len / 240)), step = len / n;
        for (let i = 0; i < n; i++){ const cx = x0 + step * (i + .5), ww = Math.min(110, step - 60); if (ww < 40 || skip(cx - ww / 2, cx + ww / 2)) continue;
          g.fillStyle = indoor ? '#2a1c18' : '#6a5440'; g.fillRect(cx - ww / 2 - 4, y0 + 6, ww + 8, 30);
          const gl = g.createLinearGradient(0, y0 + 8, 0, y0 + 34); gl.addColorStop(0, indoor ? '#a8cce8' : '#ffe2a0'); gl.addColorStop(1, indoor ? '#5a7aa8' : '#d89a50'); g.fillStyle = gl; g.fillRect(cx - ww / 2, y0 + 9, ww, 24);
          g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(cx - 1, y0 + 9, 2, 24); g.fillRect(cx - ww / 2, y0 + 20, ww, 2); }
      } else if (sz.kind !== 'room' || !/^wc/.test(sz.id)){
        const n = Math.floor(len / 250);
        for (let i = 0; i < n; i++){ const r1 = hash(w.x0 + i, w.y), cx = x0 + len * (i + .5) / n + (r1 - .5) * 40, fw = 36 + Math.floor(hash(i, w.x0) * 4) * 12, fh = 22 + Math.floor(r1 * 2) * 6; if (skip(cx - fw / 2, cx + fw / 2)) continue;
          g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(cx - fw / 2 + 3, y0 + 8, fw, fh); g.fillStyle = '#c9963a'; g.fillRect(cx - fw / 2, y0 + 5, fw, fh);
          g.fillStyle = FRAME_COLS[Math.floor(hash(w.y, i + w.x0) * FRAME_COLS.length)]; g.fillRect(cx - fw / 2 + 3, y0 + 8, fw - 6, fh - 6); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(cx - fw / 2 + 3, y0 + 8, fw - 6, (fh - 6) * .4); }
      }
    }
    const sh = g.createLinearGradient(0, y1, 0, y1 + 24); sh.addColorStop(0, 'rgba(0,0,0,.3)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(x0, y1, x1 - x0, 24);
  }
  const CAP = '#2a1c18', CAPL = '#5a3e2e';
  function capH(g, w){ const x0 = w.x0 - (w.ea ? T / 2 : 0), x1 = w.x1 + (w.eb ? T / 2 : 0); g.fillStyle = CAP; g.fillRect(x0, w.y - T / 2, x1 - x0, T); g.fillStyle = CAPL; g.fillRect(x0, w.y - T / 2 + 3, x1 - x0, 4); }
  function capV(g, w){ const y0 = w.y0 - (w.ea ? T / 2 : 0), y1 = w.y1 + (w.eb ? T / 2 : 0); g.fillStyle = CAP; g.fillRect(w.x - T / 2, y0, T, y1 - y0); g.fillStyle = CAPL; g.fillRect(w.x - T / 2 + 3, y0, 4, y1 - y0); }
  function capD(g, d){ g.lineCap = 'round'; g.strokeStyle = CAP; g.lineWidth = T; g.beginPath(); g.moveTo(d.x0, d.y0); g.lineTo(d.x1, d.y1); g.stroke(); g.strokeStyle = CAPL; g.lineWidth = 4; g.beginPath(); g.moveTo(d.x0, d.y0 - 5); g.lineTo(d.x1, d.y1 - 5); g.stroke(); g.lineCap = 'butt'; }
  function frames(g, b){
    GAPS.forEach(d => {
      const gb = d.v ? [d.at - T, d.a0 - 10, d.at + T, d.a1 + 10] : [d.a0 - 10, d.at - T, d.a1 + 10, d.at + T + FACE];
      if (!hit(gb, b)) return;
      const trim = d.kind === 'door' ? '#c9963a' : '#a8824a';
      if (d.v){
        g.fillStyle = d.kind === 'door' ? '#3a2a1e' : 'rgba(0,0,0,.12)'; g.fillRect(d.at - T / 2, d.a0, T, d.a1 - d.a0);
        g.fillStyle = trim; g.fillRect(d.at - T / 2 - 2, d.a0 - 6, T + 4, 6); g.fillRect(d.at - T / 2 - 2, d.a1, T + 4, 6);
      } else {
        g.fillStyle = d.kind === 'door' ? '#3a2a1e' : 'rgba(0,0,0,.12)'; g.fillRect(d.a0, d.at - T / 2, d.a1 - d.a0, T);
        g.fillStyle = trim; g.fillRect(d.a0 - 6, d.at - T / 2, 6, T + FACE); g.fillRect(d.a1, d.at - T / 2, 6, T + FACE);
        if (d.kind === 'open'){ g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(d.a0, d.at + T / 2 + FACE, d.a1 - d.a0, 10); }
      }
    });
  }
  function drawStatic(g, b){
    g.fillStyle = pat(g, 'grass'); g.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);
    // hàng rào bao quanh
    if (b[0] < 120 || b[1] < 170 || b[2] > W - 120 || b[3] > H - 120){ g.strokeStyle = '#6a4a2a'; g.lineWidth = 6; g.setLineDash([18, 10]); g.strokeRect(X(45) - 20, Y(42) - 20, X(1955) - X(45) + 40, Y(1515) - Y(42) + 40); g.setLineDash([]); }
    for (let i = 1; i < ZONES.length; i++){ const z = ZONES[i]; if (!z.floor || z.floor === 'grass' || !hit(z.bb, b)) continue; g.fillStyle = pat(g, z.floor); pathPoly(g, z.poly); g.fill(); if (z.floor === 'carpet'){ g.save(); pathPoly(g, z.poly); g.clip(); g.strokeStyle = '#e0b04a'; g.lineWidth = 6; g.strokeRect(z.bb[0] + 34, z.bb[1] + 90, z.bb[2] - z.bb[0] - 68, z.bb[3] - z.bb[1] - 120); g.restore(); } }
    for (let l = 0; l < 3; l++) STATIC.forEach(s => { if (s.l === l && hit(s.b, b)) s.d(g); });
    HW.forEach(w => { if (hit([w.x0 - T, w.y - T, w.x1 + T, w.y + T / 2 + FACE + 26], b)) drawFace(g, w); });
    DECO.forEach(s => { if (hit(s.b, b)) s.d(g); });
    frames(g, b);
    HW.forEach(w => { if (hit([w.x0 - T, w.y - T, w.x1 + T, w.y + T], b)) capH(g, w); });
    VW.forEach(w => { if (hit([w.x - T, w.y0 - T, w.x + T, w.y1 + T], b)) capV(g, w); });
    DW.forEach(d => { if (hit([Math.min(d.x0, d.x1) - T, Math.min(d.y0, d.y1) - T, Math.max(d.x0, d.x1) + T, Math.max(d.y0, d.y1) + T], b)) capD(g, d); });
  }

  /* ======================= CỬA TỰ KÉO (vẽ mỗi khung hình) ======================= */
  function drawDoor(g, d, t){
    const o = d.o, gold = '#c9963a';
    if (!d.v){
      const y0 = d.at - T / 2, h = T + FACE, w = d.a1 - d.a0, half = w / 2, sh = half * o;
      g.save(); g.beginPath(); g.rect(d.a0, y0, w, h + 2); g.clip();
      [d.a0 - sh, d.a0 + half + sh].forEach((px, i) => {
        if (o > .98) return;
        g.fillStyle = d.front ? '#4a2a18' : '#6a3e22'; g.fillRect(px, y0, half, h);
        g.fillStyle = d.front || d.garden ? 'rgba(170,210,235,.75)' : 'rgba(255,230,180,.25)'; g.fillRect(px + 7, y0 + T / 2 + 6, half - 14, FACE - 16);
        g.fillStyle = gold; g.fillRect(i ? px : px + half - 3, y0, 3, h); g.fillRect(px, y0, half, 3);
        dot(g, i ? px + 9 : px + half - 9, y0 + T / 2 + FACE / 2, 3, gold);
      });
      g.restore();
      if (d.lock){ const lx = d.a1 + 14, ly = d.at + T / 2 + 14; dot(g, lx, ly, 6, '#1a1214'); dot(g, lx, ly, 4, K.lockOn(d.owner) ? '#ff5a5a' : '#5be38a'); }
    } else {
      const x0 = d.at - T / 2 + 3, w = T - 6, len = d.a1 - d.a0, half = len / 2, sh = half * o;
      g.save(); g.beginPath(); g.rect(x0 - 2, d.a0, w + 4, len); g.clip();
      if (o < .98) [d.a0 - sh, d.a0 + half + sh].forEach((py, i) => { g.fillStyle = '#6a3e22'; g.fillRect(x0, py, w, half); g.fillStyle = 'rgba(255,230,180,.25)'; g.fillRect(x0 + 4, py + 8, w - 8, half - 16); g.fillStyle = gold; g.fillRect(x0, i ? py : py + half - 3, w, 3); });
      g.restore();
      if (d.lock){ const lx = d.at, ly = d.a0 - 16; dot(g, lx, ly, 6, '#1a1214'); dot(g, lx, ly, 4, K.lockOn(d.owner) ? '#ff5a5a' : '#5be38a'); }
    }
  }

  /* ======================= LỚP PHỦ: ĐÈN & ÁNH SÁNG ======================= */
  function overlay(g, t, vb){
    LIGHTS.forEach(L => {
      const target = ex(L.key, true) ? 0 : 1; L.d += (target - L.d) * .08; if (L.d < .01) return;
      L.zs.forEach(z => { if (!hit(z.bb, vb)) return; g.save(); pathPoly(g, z.poly); g.clip(); g.fillStyle = `rgba(8,6,26,${.66 * L.d})`; g.fillRect(z.bb[0], z.bb[1], z.bb[2] - z.bb[0], z.bb[3] - z.bb[1]);
        g.globalCompositeOperation = 'lighter'; const mg = g.createLinearGradient(0, z.bb[1], 0, z.bb[1] + 400); mg.addColorStop(0, `rgba(120,140,255,${.12 * L.d})`); mg.addColorStop(1, 'rgba(120,140,255,0)'); g.fillStyle = mg; g.fillRect(z.bb[0], z.bb[1], z.bb[2] - z.bb[0], 400); g.restore(); });
    });
    LAMPS.forEach(l => { if (!ex(l.key, true) || l.x < vb[0] - 200 || l.x > vb[2] + 200 || l.y < vb[1] - 200 || l.y > vb[3] + 200) return; glow(g, l.x, l.y, 200, WARM, .16); });
    GLOWS.forEach(L => { if (L.key && !ex(L.key, L.def)) return; if (L.x < vb[0] - L.r || L.x > vb[2] + L.r || L.y < vb[1] - L.r || L.y > vb[3] + L.r) return; glow(g, L.x, L.y, L.r, L.col || WARM, L.a * (L.flick ? .85 + Math.sin(t * 9) * .1 + Math.sin(t * 23) * .05 : 1)); });
  }

  /* ======================= BẢN ĐỒ (mở từ bàn tròn) ======================= */
  const MAPCOL = { herring: '#c9a06e', dark: '#6a4630', warm: '#c99a66', marble: '#e2dacb', kitchen: '#e6d6b4', bath: '#bcd8e0', deck: '#d9c39a', paver: '#b8b0a0', carpet: '#9a2028', grass: '#5a8a4a' };
  function drawMap(g, locked){
    g.fillStyle = '#efe4cc'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#4f7d3f'; rr(g, X(45) - 30, Y(42) - 30, X(1955) - X(45) + 60, Y(1515) - Y(42) + 60, 40); g.fill();
    g.fillStyle = '#cdbfa6'; g.fillRect(X(1120), Y(1275), X(1235) - X(1120), Y(1520) - Y(1275));
    for (let i = 1; i < ZONES.length; i++){ const z = ZONES[i]; g.fillStyle = MAPCOL[z.floor] || '#ddd'; pathPoly(g, z.poly); g.fill(); if (locked.has(z.id)){ g.fillStyle = 'rgba(255,60,60,.25)'; pathPoly(g, z.poly); g.fill(); } }
    g.fillStyle = '#3a8ab0'; rr(g, X(1515), Y(650), X(1645) - X(1515), Y(880) - Y(650), 10); g.fill();
    g.beginPath(); g.ellipse(X(1055), Y(708), S(40), S(36), 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(X(1335), Y(332), S(60), S(42), 0, 0, TAU); g.fill();
    g.fillStyle = '#2a1c18'; HW.forEach(w => g.fillRect(w.x0 - (w.ea ? T / 2 : 0), w.y - T / 2, w.x1 - w.x0 + (w.ea ? T / 2 : 0) + (w.eb ? T / 2 : 0), T)); VW.forEach(w => g.fillRect(w.x - T / 2, w.y0 - (w.ea ? T / 2 : 0), T, w.y1 - w.y0 + (w.ea ? T / 2 : 0) + (w.eb ? T / 2 : 0))); DW.forEach(d => capD(g, d));
    DOORS.forEach(d => { g.fillStyle = d.lock && locked.has(d.owner) ? '#ff5a5a' : '#c9963a'; if (d.v) g.fillRect(d.at - 5, d.a0, 10, d.a1 - d.a0); else g.fillRect(d.a0, d.at - 5, d.a1 - d.a0, 10); });
    g.fillStyle = '#6a1a20'; g.fillRect(EXIT[0], EXIT[1], EXIT[2] - EXIT[0], EXIT[3] - EXIT[1]);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i < ZONES.length; i++){ const z = ZONES[i], [lx, ly] = z.label ? [X(z.label[0]), Y(z.label[1])] : [(z.bb[0] + z.bb[2]) / 2, (z.bb[1] + z.bb[3]) / 2], small = (z.bb[2] - z.bb[0]) < 500;
      const fs = small ? 34 : 46; g.font = `700 ${fs}px Fredoka, sans-serif`; const words = (z.name + (locked.has(z.id) ? ' 🔒' : '')).toUpperCase().split(' '); const lines = []; let cur = '';
      words.forEach(wd => { const tr = cur ? cur + ' ' + wd : wd; if (g.measureText(tr).width > Math.max(220, (z.bb[2] - z.bb[0]) * .9) && cur){ lines.push(cur); cur = wd; } else cur = tr; }); if (cur) lines.push(cur);
      lines.forEach((l, k) => { const yy = ly + (k - (lines.length - 1) / 2) * fs * 1.1; g.lineWidth = 8; g.strokeStyle = 'rgba(30,18,10,.85)'; g.strokeText(l, lx, yy); g.fillStyle = '#fff6e6'; g.fillText(l, lx, yy); }); }
    g.font = '700 54px Fredoka, sans-serif'; [[700, 120], [1560, 70], [600, 1420], [1640, 1500]].forEach(([a, b]) => { g.lineWidth = 8; g.strokeStyle = 'rgba(20,40,15,.85)'; g.strokeText('SÂN VƯỜN NGOÀI', X(a), Y(b)); g.fillStyle = '#e8f4d8'; g.fillText('SÂN VƯỜN NGOÀI', X(a), Y(b)); });
    g.font = '700 40px Fredoka, sans-serif'; g.lineWidth = 8; g.strokeStyle = 'rgba(30,18,10,.85)'; g.strokeText('LỐI RA ↓', (EXIT[0] + EXIT[2]) / 2, (EXIT[1] + EXIT[3]) / 2); g.fillStyle = '#ffe9b8'; g.fillText('LỐI RA ↓', (EXIT[0] + EXIT[2]) / 2, (EXIT[1] + EXIT[3]) / 2);
    g.textBaseline = 'alphabetic';
  }

  return {
    W, H, T, FACE, ZONES, ZI, zoneAt, GAPS, DOORS, HW, VW, DW, OB, SEATS, HOTS, PROPS, DYN, EXIT,
    BOUND: { x0: X(45), y0: Y(42), x1: X(1955), y1: Y(1515) },
    SPAWN: { x: X(1177), y: Y(1408) }, ENTER_TO: { x: X(1177), y: Y(1330) }, VIEW0: { x: X(1170), y: Y(1150) },
    links: [['entry', 'garden'], ['pond', 'garden']],
    drawStatic, drawDoor, overlay, drawMap, onFx,
    onSeat: i => { const s = SEATS[i]; if (s.onSit) s.onSit(); },
    onStand: i => { const s = SEATS[i]; if (s.onStand) s.onStand(); }
  };
};
