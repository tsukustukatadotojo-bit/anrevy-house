"""Lưu tranh khách gửi vào kho của trang web.

Trang An Vy's Gallery gửi tranh (ảnh + năm + tác giả + ghi chú) lên máy chủ chuyển tin MQTT công cộng dưới dạng
tin nhắn giữ lại (retained), nên mọi người thấy ngay. Kịch bản này chạy định kỳ trên GitHub Actions:
  1. đọc mọi tin giữ lại dưới anrevy-house-9q2/gallery/v1/ trên các máy chủ,
  2. ghép ảnh, kiểm tra, nén lại (bỏ EXIF/vị trí), lưu vào gallery/uploads/<id>.jpg và gallery/uploads.json,
  3. commit + push lên main và gh-pages,
  4. xoá tin giữ lại của những tranh đã được lưu từ lần chạy trước (lúc đó trang web đã có bản lâu dài).
Khách không tự gỡ được tranh đã treo: mọi yêu cầu gỡ (d/<id>) đều bị bỏ qua và dọn đi.
Chỉ chủ trang gỡ tranh bằng cách sửa gallery/uploads.json (và xoá ảnh trong gallery/uploads).
Chạy thử không đụng tới git:  python3 gallery_sync.py --dry   (BROKERS=ws://localhost:8883 để dùng máy chủ thử)
"""
import base64, hashlib, io, json, os, random, re, string, subprocess, sys, time, warnings
from datetime import datetime, timezone
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion
from PIL import Image, ImageOps

PFX = 'anrevy-house-9q2/gallery/v1/'
DEFAULT_BROKERS = 'tcp://broker.emqx.io:1883,tcp://broker.hivemq.com:1883'
DB = 'gallery/uploads.json'
DIR = 'gallery/uploads'
MEDIUMS = ('Tranh vẽ', 'Ảnh chụp')       # hai mục của phòng tranh
MAX_NEW, MAX_TOTAL = 30, 800
STALE_MS = 6 * 3600 * 1000           # tranh gửi dở dang quá 6 giờ thì dọn
DRY = '--dry' in sys.argv

Image.MAX_IMAGE_PIXELS = 60_000_000
warnings.simplefilter('error', Image.DecompressionBombWarning)

def rid(n=8): return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(n))
def sha(s): return hashlib.sha256(s.encode() if isinstance(s, str) else s).hexdigest()
def clean(s, n):
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f‪-‮⁦-⁩]', '', str(s or '')).replace('\r\n', '\n').strip()
    return s[:n]

def connect(url):
    proto, rest = url.split('://', 1)
    host, port = rest.split(':', 1)
    port = int(port.split('/', 1)[0])
    c = mqtt.Client(CallbackAPIVersion.VERSION2, client_id='anrevy-archiver-' + rid(), transport='websockets' if proto in ('ws', 'wss') else 'tcp')
    if proto == 'wss': c.tls_set()
    if proto in ('ws', 'wss'): c.ws_set_options(path='/mqtt' if 'localhost' not in host else '/')
    store = {}
    c.on_message = lambda cl, u, m: store.__setitem__(m.topic, bytes(m.payload)) if m.retain else None
    c.connect(host, port, 30)
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
    time.sleep(14)

    db = {'items': []}
    if os.path.exists(DB):
        try: db = json.load(open(DB, encoding='utf-8'))
        except Exception as e: print('uploads.json lỗi, tạo lại', e)
    items = [it for it in db.get('items', []) if isinstance(it, dict) and it.get('id')]
    existing = {it['id']: it for it in items}
    now = time.time() * 1000

    # gom tin theo mã tranh, theo từng máy chủ
    per = {}   # id -> {url: {'m': bytes, 'c': {n: str}, 'd': bytes}}
    for u, c, store in links:
        for t, p in store.items():
            if not t.startswith(PFX) or not p: continue
            parts = t[len(PFX):].split('/')
            if len(parts) < 2 or not re.fullmatch(r'[a-z0-9-]{6,40}', parts[1]): continue
            kind, gid = parts[0], parts[1]
            slot = per.setdefault(gid, {}).setdefault(u, {'m': None, 'c': {}, 'd': None})
            if kind == 'm': slot['m'] = p
            elif kind == 'd': slot['d'] = p
            elif kind == 'c' and len(parts) == 3 and parts[2].isdigit(): slot['c'][int(parts[2])] = p.decode('ascii', 'ignore')
    print(f'{len(per)} mã tranh trên máy chủ, {len(existing)} tranh đã lưu')

    clear = set()          # chủ đề cần xoá tin giữ lại sau khi xong
    def clear_all(gid, n=None):
        clear.add(PFX + 'm/' + gid)
        ks = set(range(n or 0))
        for slot in per.get(gid, {}).values(): ks |= set(slot['c'].keys())
        for k in ks: clear.add(f'{PFX}c/{gid}/{k}')
    changed, added, removed = False, [], []

    # 1) khách không được tự gỡ tranh: bỏ qua và dọn mọi yêu cầu gỡ
    gone = set()
    for gid, slots in per.items():
        if any(s['d'] for s in slots.values()): clear.add(PFX + 'd/' + gid)

    # 2) tranh mới
    count = len(items)
    for gid, slots in per.items():
        if gid in gone: continue
        metas = [(u, s) for u, s in slots.items() if s['m']]
        if gid in existing:
            clear_all(gid); continue                 # đã lưu từ lần trước, trang web đã có bản lâu dài
        if not metas:
            if any(s['c'] for s in slots.values()): clear_all(gid)   # mảnh ảnh mồ côi
            continue
        try: meta = json.loads(metas[0][1]['m'].decode())
        except Exception: clear_all(gid); continue
        n = int(meta.get('n') or 0)
        b64 = None
        for u, s in metas:
            if n > 0 and all(k in s['c'] for k in range(n)):
                cand = ''.join(s['c'][k] for k in range(n))
                if sha(cand) == meta.get('sha'): b64 = cand; break
        if b64 is None:
            if now - float(meta.get('at') or 0) > STALE_MS: print('dọn tranh gửi dở', gid); clear_all(gid, n)
            continue
        if len(added) >= MAX_NEW or count >= MAX_TOTAL: print('đủ giới hạn, để lần sau', gid); continue
        try:
            year = int(meta.get('year'))
            artist, note = re.sub(r'\s+', ' ', clean(meta.get('artist'), 80)), clean(meta.get('note'), 4000)
            # năm 0 (hiện là 0000) = không rõ năm
            if not (0 <= year <= datetime.now(timezone.utc).year + 1) or not artist or not note:
                raise ValueError('thiếu năm / tác giả / ghi chú')
            raw = base64.b64decode(b64, validate=True)
            if len(raw) > 2_500_000: raise ValueError('ảnh quá lớn')
            im = Image.open(io.BytesIO(raw))
            if im.format not in ('JPEG', 'PNG', 'WEBP'): raise ValueError('định dạng ' + str(im.format))
            im.load()
            im = ImageOps.exif_transpose(im).convert('RGB')
            im.thumbnail((1600, 1600), Image.LANCZOS)
            os.makedirs(DIR, exist_ok=True)
            path = f'{DIR}/{gid}.jpg'
            im.save(path, 'JPEG', quality=85, optimize=True, progressive=True)
            r, g, b = im.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
            # soát loại: chỉ hai mục Tranh vẽ / Ảnh chụp (điêu khắc là ảnh chụp tượng)
            medium = meta.get('medium') if meta.get('medium') in MEDIUMS else ('Ảnh chụp' if meta.get('medium') == 'Điêu khắc' else 'Tranh vẽ')
            items.append({'id': gid, 'image': f'uploads/{gid}.jpg', 'title': clean(meta.get('title'), 120) or 'Không tên',
                          'artist': artist, 'year': year, 'medium': medium, 'catalog': 'Khách gửi', 'note': note,
                          'w': im.width, 'h': im.height, 'ph': '#%02X%02X%02X' % (r, g, b), 'at': int(float(meta.get('at') or now))})
            added.append(gid); count += 1; changed = True
        except Exception as e:
            print('bỏ tranh không hợp lệ', gid, repr(e)); clear_all(gid, n)

    # 3) giữ cho lịch chạy không bị GitHub tắt khi lâu không có thay đổi (60 ngày)
    keep = False
    if not changed and not DRY:
        try:
            last = int(subprocess.check_output(['git', 'log', '-1', '--format=%ct']).decode().strip())
            keep = time.time() - last > 45 * 86400
        except Exception: pass

    if changed or keep:
        items.sort(key=lambda it: it.get('at', 0))
        db = {'about': 'Tranh khách gửi qua nút Update ở cuối trang An Vy’s Gallery (lưu tự động).', 'items': items}
        if keep: db['checked'] = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        with open(DB, 'w', encoding='utf-8') as f: json.dump(db, f, ensure_ascii=False, indent=1)
        msg = 'Gallery: ' + ', '.join(filter(None, [f'thêm {len(added)} tranh khách gửi' if added else '', 'giữ lịch chạy' if keep and not changed else '']))
        print(msg, added, removed)
        if not DRY and not push(msg):
            print('push thất bại — không xoá tin giữ lại, lần sau thử lại')
            for u, c, s in links: c.loop_stop(); c.disconnect()
            sys.exit(1)

    # 4) dọn tin giữ lại (chỉ sau khi đã lưu xong)
    for gid in added: clear.discard(PFX + 'm/' + gid)
    keep_ids = set(added)
    def mine(t):
        rest = t[len(PFX):].split('/')
        return len(rest) >= 2 and rest[0] in ('m', 'c') and rest[1] in keep_ids
    clear = {t for t in clear if not mine(t)}
    print('xoá', len(clear), 'tin giữ lại')
    if os.environ.get('GITHUB_ACTIONS'):
        print(f'::notice title=gallery-sync::{len(per)} mã trên máy chủ · đã lưu {len(items)} · thêm {len(added)} · dọn {len(clear)} tin')
    for u, c, s in links:
        for t in clear: c.publish(t, b'', qos=1, retain=True)
    time.sleep(4)
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
