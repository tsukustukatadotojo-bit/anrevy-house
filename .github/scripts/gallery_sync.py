"""Lưu tranh khách gửi vào kho của trang web, giữ nguyên bản gốc chất lượng cao nhất.

Trang An Vy's Gallery gửi mỗi tác phẩm lên máy chủ chuyển tin MQTT công cộng dưới dạng tin nhắn giữ lại (retained):
  m/<id>        thông tin (năm, tác giả, loại, ghi chú, cỡ mảnh, mã kiểm tra…)
  c/<id>/<k>    ảnh xem nhanh (≤1600 px) để mọi người đang mở trang thấy ngay
  o/<id>/<k>    BẢN GỐC (đã xoá siêu dữ liệu trong trình duyệt, không nén lại)
Kịch bản này chạy định kỳ trên GitHub Actions:
  1. đọc mọi tin giữ lại dưới anrevy-house-9q2/gallery/v1/ trên các máy chủ (đợi tới khi hết tin mới),
  2. ghép bản gốc, KIỂM ĐỊNH: đúng mã SHA-256, đúng định dạng JPEG/PNG/WebP, giải mã trọn vẹn, đúng kích thước,
     xoá lại siêu dữ liệu (GPS, máy chụp…) KHÔNG nén lại, rồi lưu vào gallery/uploads/full/<id>.<đuôi>,
  3. tạo ảnh xem nhanh chất lượng cao (1600 px, JPEG 90, giữ hồ sơ màu) vào gallery/uploads/<id>.jpg,
  4. ghi gallery/uploads.json, commit + push lên main và gh-pages,
  5. xoá tin giữ lại của những tranh đã được lưu từ lần chạy trước (lúc đó trang web đã có bản lâu dài).
Khách không tự gỡ được tranh đã treo: mọi yêu cầu gỡ (d/<id>) đều bị bỏ qua và dọn đi.
Chỉ chủ trang gỡ tranh bằng cách sửa gallery/uploads.json (và xoá ảnh trong gallery/uploads).
Chạy thử không đụng tới git:  python3 gallery_sync.py --dry   (BROKERS=ws://localhost:8883 để dùng máy chủ thử)
"""
import base64, hashlib, io, json, os, random, re, string, struct, subprocess, sys, time, warnings
from datetime import datetime, timezone
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion
from PIL import Image, ImageOps

PFX = 'anrevy-house-9q2/gallery/v1/'
DEFAULT_BROKERS = 'tcp://broker.emqx.io:1883,tcp://broker.hivemq.com:1883'
DB = 'gallery/uploads.json'
DIR = 'gallery/uploads'
FULL = DIR + '/full'
MEDIUMS = ('Tranh vẽ', 'Ảnh chụp')            # hai mục của phòng tranh
MAX_NEW, MAX_TOTAL = 30, 800
MAX_ORIG = 21 * 1024 * 1024                    # bản gốc tối đa (trang giới hạn 20 MB)
MAX_PIX = 110_000_000
RUN_BYTES = 350 * 1024 * 1024                  # mỗi lần chạy lưu tối đa chừng này, phần còn lại để lần sau
FULL_BUDGET = 750 * 1024 * 1024                # tổng dung lượng bản gốc; vượt thì lưu bản 3200 px JPEG 93
STALE_MS = 6 * 3600 * 1000                     # tranh gửi dở dang quá 6 giờ thì dọn
DRY = '--dry' in sys.argv

Image.MAX_IMAGE_PIXELS = MAX_PIX
warnings.simplefilter('error', Image.DecompressionBombWarning)

import unicodedata
NO_NAME = re.compile(r'^(none|null|nil|n/?a|na|unknown|anonymous|no ?name|khong( ro| co| biet| ten)?|chua ro.*|an danh|vo danh|[-_.?x ]+)$')
def fold(t): return ''.join(c for c in unicodedata.normalize('NFD', t.lower()) if unicodedata.category(c) != 'Mn').replace('đ', 'd')
def rid(n=8): return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(n))
def sha(s): return hashlib.sha256(s.encode() if isinstance(s, str) else s).hexdigest()
def clean(s, n):
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f‪-‮⁦-⁩]', '', str(s or '')).replace('\r\n', '\n').strip()
    return s[:n]

# ---------------- xoá siêu dữ liệu mà không nén lại ----------------
def sniff(b):
    if b[:3] == b'\xff\xd8\xff': return 'jpg'
    if b[:8] == b'\x89PNG\r\n\x1a\n': return 'png'
    if b[:4] == b'RIFF' and b[8:12] == b'WEBP': return 'webp'
    return ''

def exif_orient_seg(o):
    return b'\xff\xe1\x00\x22Exif\x00\x00MM\x00\x2a\x00\x00\x00\x08\x00\x01\x01\x12\x00\x03\x00\x00\x00\x01\x00' + bytes([o]) + b'\x00\x00\x00\x00\x00\x00'

def jpeg_orientation(b):
    try:
        return int(Image.open(io.BytesIO(b)).getexif().get(0x0112, 1) or 1)
    except Exception:
        return 1

def strip_jpeg(b):
    """Giữ JFIF, ICC, Adobe và toàn bộ dữ liệu ảnh; bỏ EXIF/XMP/IPTC/MPF/ghi chú; giữ hướng xoay; cắt phần thừa sau EOI."""
    o = jpeg_orientation(b)
    out, off, n = [b[:2]], 2, len(b)
    if 1 < o <= 8: out.append(exif_orient_seg(o))
    while off < n:
        if b[off] != 0xFF: raise ValueError('JPEG lỗi cấu trúc')
        mk = b[off + 1]
        if mk == 0xFF: off += 1; continue
        if mk == 0xD9: out.append(b[off:off + 2]); return b''.join(out)
        if 0xD0 <= mk <= 0xD7 or mk == 0x01: out.append(b[off:off + 2]); off += 2; continue
        if off + 4 > n: break
        ln = (b[off + 2] << 8) | b[off + 3]; end = off + 2 + ln
        if ln < 2 or end > n: break
        if mk == 0xDA:
            i = end
            while i < n - 1:
                if b[i] == 0xFF:
                    nx = b[i + 1]
                    if nx == 0x00 or 0xD0 <= nx <= 0xD7: i += 2; continue
                    if nx == 0xFF: i += 1; continue
                    break
                i += 1
            out.append(b[off:i]); off = i; continue
        if 0xE0 <= mk <= 0xEF:
            ident = b[off + 4:off + 16]
            keep = (mk == 0xE0 and ident.startswith(b'JFIF')) or (mk == 0xE2 and ident.startswith(b'ICC_PROFILE')) or (mk == 0xEE and ident.startswith(b'Adobe'))
        else:
            keep = mk != 0xFE
        if keep: out.append(b[off:end])
        off = end
    raise ValueError('JPEG thiếu điểm kết thúc (tệp chưa trọn vẹn)')

PNG_KEEP = {b'IHDR', b'PLTE', b'IDAT', b'IEND', b'tRNS', b'gAMA', b'cHRM', b'sRGB', b'iCCP', b'sBIT', b'bKGD', b'pHYs', b'acTL', b'fcTL', b'fdAT', b'cICP', b'mDCv', b'cLLi'}
def strip_png(b):
    out, off, n = [b[:8]], 8, len(b)
    while off + 12 <= n:
        ln = struct.unpack('>I', b[off:off + 4])[0]; typ = b[off + 4:off + 8]; end = off + 12 + ln
        if end > n: break
        if typ in PNG_KEEP: out.append(b[off:end])
        off = end
        if typ == b'IEND': return b''.join(out)
    raise ValueError('PNG thiếu điểm kết thúc (tệp chưa trọn vẹn)')

def strip_webp(b):
    size = struct.unpack('<I', b[4:8])[0]; n = min(len(b), 8 + size); off, parts = 12, []
    while off + 8 <= n:
        cc = b[off:off + 4]; ln = struct.unpack('<I', b[off + 4:off + 8])[0]; end = off + 8 + ln + (ln & 1)
        if off + 8 + ln > n: raise ValueError('WebP lỗi cấu trúc')
        if cc not in (b'EXIF', b'XMP '): parts.append(bytearray(b[off:min(end, n)]))
        off = end
    if not parts: raise ValueError('WebP rỗng')
    if parts[0][:4] == b'VP8X': parts[0][8] &= ~0x0C
    body = b''.join(bytes(p) for p in parts)
    return b'RIFF' + struct.pack('<I', 4 + len(body)) + b'WEBP' + body

STRIP = {'jpg': strip_jpeg, 'png': strip_png, 'webp': strip_webp}
PIL_FMT = {'jpg': 'JPEG', 'png': 'PNG', 'webp': 'WEBP'}

def inspect(raw):
    """Kiểm định bản gốc. Trả về (bytes đã làm sạch, định dạng, ảnh đã xoay đúng chiều, ICC)."""
    if len(raw) > MAX_ORIG: raise ValueError('bản gốc quá lớn')
    fmt = sniff(raw)
    if fmt not in STRIP: raise ValueError('định dạng không hỗ trợ')
    data = STRIP[fmt](raw)
    im = Image.open(io.BytesIO(data))
    if im.format != PIL_FMT[fmt]: raise ValueError('định dạng không khớp ' + str(im.format))
    im.verify()                                          # kiểm tra cấu trúc
    im = Image.open(io.BytesIO(data)); im.load()         # giải mã trọn vẹn từng điểm ảnh
    if im.width < 16 or im.height < 16: raise ValueError('ảnh quá nhỏ')
    ex = im.getexif()
    if any(k != 0x0112 for k in ex.keys()): raise ValueError('còn sót siêu dữ liệu')
    icc = im.info.get('icc_profile')
    disp = ImageOps.exif_transpose(im)
    return data, fmt, disp, icc

def flat_rgb(im):
    if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
        im = im.convert('RGBA'); bg = Image.new('RGB', im.size, (255, 255, 255)); bg.paste(im, mask=im.split()[3]); return bg
    return im.convert('RGB')

# ---------------- máy chủ chuyển tin ----------------
LAST = [time.time()]
def connect(url):
    proto, rest = url.split('://', 1)
    host, port = rest.split(':', 1)
    port = int(port.split('/', 1)[0])
    c = mqtt.Client(CallbackAPIVersion.VERSION2, client_id='anrevy-archiver-' + rid(), transport='websockets' if proto in ('ws', 'wss') else 'tcp')
    c.max_inflight_messages_set(50)
    if proto == 'wss': c.tls_set()
    if proto in ('ws', 'wss'): c.ws_set_options(path='/mqtt' if 'localhost' not in host else '/')
    store = {}
    def on_msg(cl, u, m):
        if m.retain: store[m.topic] = bytes(m.payload); LAST[0] = time.time()
    c.on_message = on_msg
    c.connect(host, port, 60)
    c.loop_start()
    return c, store

def main():
    urls = [u.strip() for u in os.environ.get('BROKERS', DEFAULT_BROKERS).split(',') if u.strip()]
    links = []
    for u in urls:
        try:
            c, store = connect(u); links.append((u, c, store))
        except Exception as e:
            print('không kết nối được', u, repr(e))
    if not links: print('không có máy chủ nào'); return
    time.sleep(2)
    for u, c, store in links: c.subscribe(PFX + '#', 1)
    t0 = LAST[0] = time.time()
    while True:                                          # đợi tới khi 10 giây không còn tin mới (tối đa 5 phút)
        time.sleep(1)
        if time.time() - t0 > 12 and time.time() - LAST[0] > 10: break
        if time.time() - t0 > 300: print('đợi quá lâu, xử lý phần đã nhận'); break

    db = {'items': []}
    if os.path.exists(DB):
        try: db = json.load(open(DB, encoding='utf-8'))
        except Exception as e: print('uploads.json lỗi, tạo lại', e)
    items = [it for it in db.get('items', []) if isinstance(it, dict) and it.get('id')]
    existing = {it['id']: it for it in items}
    now = time.time() * 1000

    # gom tin theo mã tranh, theo từng máy chủ (mỗi máy chủ có cỡ mảnh riêng)
    per = {}
    for u, c, store in links:
        for t, p in store.items():
            if not t.startswith(PFX) or not p: continue
            parts = t[len(PFX):].split('/')
            if len(parts) < 2 or not re.fullmatch(r'[a-z0-9-]{6,40}', parts[1]): continue
            kind, gid = parts[0], parts[1]
            slot = per.setdefault(gid, {}).setdefault(u, {'m': None, 'c': {}, 'o': {}, 'd': None})
            if kind == 'm': slot['m'] = p
            elif kind == 'd': slot['d'] = p
            elif kind in ('c', 'o') and len(parts) == 3 and parts[2].isdigit(): slot[kind][int(parts[2])] = p.decode('ascii', 'ignore')
    print(f'{len(per)} mã tranh trên máy chủ, {len(existing)} tranh đã lưu')

    clear = set()          # chủ đề cần xoá tin giữ lại sau khi xong
    def clear_all(gid, n=None):
        clear.add(PFX + 'm/' + gid)
        for slot in per.get(gid, {}).values():
            for kind in ('c', 'o'):
                for k in slot[kind].keys(): clear.add(f'{PFX}{kind}/{gid}/{k}')
        for k in range(n or 0): clear.add(f'{PFX}c/{gid}/{k}'); clear.add(f'{PFX}o/{gid}/{k}')
    changed, added, rejected = False, [], []

    # 1) khách không được tự gỡ tranh: bỏ qua và dọn mọi yêu cầu gỡ
    for gid, slots in per.items():
        if any(s['d'] for s in slots.values()): clear.add(PFX + 'd/' + gid)

    # 2) tranh mới
    count, run_bytes = len(items), 0
    full_used = sum(os.path.getsize(os.path.join(FULL, f)) for f in os.listdir(FULL)) if os.path.isdir(FULL) else 0
    for gid, slots in per.items():
        if gid in existing:
            clear_all(gid); continue                 # đã lưu từ lần trước, trang web đã có bản lâu dài
        metas = []
        for u, s in slots.items():
            if not s['m']: continue
            try: metas.append((u, s, json.loads(s['m'].decode())))
            except Exception: pass
        if not metas:
            if any(s['c'] or s['o'] for s in slots.values()): clear_all(gid)   # mảnh ảnh mồ côi
            continue
        meta = metas[0][2]
        orig = None
        for u, s, m in metas:                        # máy chủ nào đủ mảnh và đúng mã thì dùng
            n, on = int(m.get('n') or 0), int(m.get('on') or 0)
            if m.get('v') == 2 and on > 0:
                if all(k in s['o'] for k in range(on)):
                    cand = ''.join(s['o'][k] for k in range(on))
                    if sha(cand) == m.get('osha'): orig = cand; meta = m; break
            elif n > 0 and all(k in s['c'] for k in range(n)):   # bản cũ của trang: chỉ có ảnh đã nén
                cand = ''.join(s['c'][k] for k in range(n))
                if sha(cand) == m.get('sha'): orig = cand; meta = m; break
        if orig is None:
            if now - float(meta.get('at') or 0) > STALE_MS:
                print('dọn tranh gửi dở', gid); clear_all(gid, max(int(m.get('on') or 0) for _, _, m in metas) + max(int(m.get('n') or 0) for _, _, m in metas))
            continue
        if len(added) >= MAX_NEW or count >= MAX_TOTAL or run_bytes > RUN_BYTES:
            print('đủ giới hạn lần chạy, để lần sau', gid); continue
        try:
            year = int(meta.get('year'))
            artist = re.sub(r'[\s.,;:]+$', '', re.sub(r'\s+', ' ', clean(meta.get('artist'), 80)))
            note = clean(meta.get('note'), 4000)
            # năm 0 (hiện là 0000) = không rõ năm
            if not (0 <= year <= datetime.now(timezone.utc).year + 1) or not artist or NO_NAME.match(fold(artist)) or not note:
                raise ValueError('thiếu năm / tác giả / ghi chú')
            raw = base64.b64decode(orig, validate=True)
            data, fmt, disp, icc = inspect(raw)
            os.makedirs(FULL, exist_ok=True)
            if full_used + len(data) > FULL_BUDGET:
                # hết chỗ cho bản gốc: lưu bản lớn chất lượng rất cao thay thế
                big = flat_rgb(disp); big.thumbnail((3200, 3200), Image.LANCZOS)
                buf = io.BytesIO(); big.save(buf, 'JPEG', quality=93, optimize=True, progressive=True, subsampling=0, icc_profile=icc)
                data, fmt = buf.getvalue(), 'jpg'
                print('vượt dung lượng bản gốc, lưu bản 3200 px', gid)
            full_path = f'{FULL}/{gid}.{fmt}'
            with open(full_path, 'wb') as f: f.write(data)
            pv = flat_rgb(disp); pv.thumbnail((1600, 1600), Image.LANCZOS)
            path = f'{DIR}/{gid}.jpg'
            pv.save(path, 'JPEG', quality=90, optimize=True, progressive=True, subsampling=0, icc_profile=icc)
            r, g, b = pv.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
            medium = meta.get('medium') if meta.get('medium') in MEDIUMS else ('Ảnh chụp' if meta.get('medium') == 'Điêu khắc' else 'Tranh vẽ')
            items.append({'id': gid, 'image': f'uploads/{gid}.jpg', 'full': f'uploads/full/{gid}.{fmt}', 'title': clean(meta.get('title'), 120) or 'Không tên',
                          'artist': artist, 'year': year, 'medium': medium, 'catalog': 'Khách gửi', 'note': note,
                          'w': disp.width, 'h': disp.height, 'ph': '#%02X%02X%02X' % (r, g, b), 'fsize': len(data), 'ffmt': fmt,
                          'at': int(float(meta.get('at') or now))})
            full_used += len(data); run_bytes += len(data)
            print(f'lưu {gid}: {fmt} {disp.width}x{disp.height} {len(data) / 1048576:.2f} MB (gốc gửi lên {len(raw) / 1048576:.2f} MB)')
            added.append(gid); count += 1; changed = True
        except Exception as e:
            print('bỏ tranh không đạt kiểm định', gid, repr(e)); rejected.append(gid)
            clear_all(gid, max(int(m.get('on') or 0) for _, _, m in metas) + max(int(m.get('n') or 0) for _, _, m in metas))

    # 3) giữ cho lịch chạy không bị GitHub tắt khi lâu không có thay đổi (60 ngày)
    keep = False
    if not changed and not DRY:
        try:
            last = int(subprocess.check_output(['git', 'log', '-1', '--format=%ct']).decode().strip())
            keep = time.time() - last > 45 * 86400
        except Exception: pass

    if changed or keep:
        items.sort(key=lambda it: it.get('at', 0))
        db = {'about': 'Tranh khách gửi qua nút Update ở cuối trang An Vy’s Gallery (lưu tự động). image = ảnh xem nhanh, full = bản gốc.', 'items': items}
        if keep: db['checked'] = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        with open(DB, 'w', encoding='utf-8') as f: json.dump(db, f, ensure_ascii=False, indent=1)
        msg = 'Gallery: ' + ', '.join(filter(None, [f'thêm {len(added)} tranh khách gửi' if added else '', 'giữ lịch chạy' if keep and not changed else '']))
        print(msg, added)
        if not DRY and not push(msg):
            print('push thất bại — không xoá tin giữ lại, lần sau thử lại')
            for u, c, s in links: c.loop_stop(); c.disconnect()
            sys.exit(1)

    # 4) dọn tin giữ lại (chỉ sau khi đã lưu xong; tranh vừa lưu thì để tới lần sau mới dọn)
    keep_ids = set(added)
    def mine(t):
        rest = t[len(PFX):].split('/')
        return len(rest) >= 2 and rest[0] in ('m', 'c', 'o') and rest[1] in keep_ids
    clear = {t for t in clear if not mine(t)}
    print('xoá', len(clear), 'tin giữ lại')
    if os.environ.get('GITHUB_ACTIONS'):
        print(f'::notice title=gallery-sync::{len(per)} mã trên máy chủ · đã lưu {len(items)} · thêm {len(added)} · không đạt {len(rejected)} · dọn {len(clear)} tin')
    for u, c, s in links:
        for t in clear: c.publish(t, b'', qos=1, retain=True)
    time.sleep(5)
    for u, c, s in links: c.loop_stop(); c.disconnect()

def git(*a): return subprocess.run(['git', *a], capture_output=True, text=True)

def push(msg):
    git('config', 'user.name', 'github-actions[bot]')
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
    git('add', '-A', DB, *([DIR] if os.path.isdir(DIR) else []))
    r = git('commit', '-m', msg)
    if r.returncode != 0 and 'nothing to commit' not in r.stdout: print(r.stdout, r.stderr); return False
    for i in range(4):
        r = git('push', 'origin', 'HEAD:main')
        if r.returncode == 0: break
        print('push main lỗi, thử lại', r.stderr.strip()[-300:])
        git('fetch', '--depth=200', 'origin', 'main')
        rb = git('rebase', 'origin/main')
        if rb.returncode != 0: print(rb.stderr[-300:]); git('rebase', '--abort'); return False
        time.sleep(3 + i * 3)
    else:
        return False
    r = git('push', 'origin', 'HEAD:gh-pages')
    if r.returncode != 0: print('push gh-pages lỗi', r.stderr.strip()[-300:])
    return True

if __name__ == '__main__':
    main()
