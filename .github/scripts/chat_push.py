#!/usr/bin/env python3
"""Báo tin nhắn mới của "Anh" (mục tin nhắn của Studio) về điện thoại/máy của Vy bằng Web Push.

Chạy sau gallery_sync trong workflow gallery-sync (5 phút một lần):
  - đọc tin của Anh trong studio/data/chat/YYYY-MM.json, tìm tin đã tới giờ hiện mà chưa báo;
  - gửi một thông báo (gộp tối đa 3 tin) tới mọi máy đã bật thông báo (studio/data/chat/push-subs.json, do bot ghi từ Studio);
  - ghi mốc đã báo vào studio/data/chat/push-state.json rồi commit.

Khoá riêng VAPID chỉ nằm trong secret VAPID_PRIVATE của repo (base64url 32 byte) — không bao giờ nằm trong code.
Mã hoá nội dung theo RFC 8291 (aes128gcm), xác thực máy chủ theo RFC 8292 (VAPID, ES256) — chỉ cần thư viện cryptography.
"""
import base64, datetime as dt, json, os, re, struct, subprocess, sys, time, urllib.error, urllib.parse, urllib.request

from cryptography.hazmat.primitives import hashes, hmac, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

CHAT = 'studio/data/chat/'
SUBS, STATE, PROFILE = CHAT + 'push-subs.json', CHAT + 'push-state.json', CHAT + 'profile.json'
VN = dt.timezone(dt.timedelta(hours=7))
SUB_CLAIM = 'https://tsukustukatadotojo-bit.github.io/anvy-studio/'
FRESH_MS = 3 * 3600 * 1000            # tin hiện quá 3 giờ mà chưa báo (bot trễ) thì thôi không báo nữa
DRY = '--dry' in sys.argv


def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def unb64u(s):
    s = s.strip()
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))


def load(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def _hmac(key, data):
    h = hmac.HMAC(key, hashes.SHA256()); h.update(data); return h.finalize()


def encrypt(payload, p256dh, auth, salt=None, as_key=None):
    """RFC 8291 — trả về thân yêu cầu (header aes128gcm + bản mã)."""
    ua_pub = unb64u(p256dh)
    auth_secret = unb64u(auth)
    as_key = as_key or ec.generate_private_key(ec.SECP256R1())
    as_pub = as_key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    ua_key = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), ua_pub)
    shared = as_key.exchange(ec.ECDH(), ua_key)
    prk_key = _hmac(auth_secret, shared)
    ikm = _hmac(prk_key, b'WebPush: info\x00' + ua_pub + as_pub + b'\x01')
    salt = salt or os.urandom(16)
    prk = _hmac(salt, ikm)
    cek = _hmac(prk, b'Content-Encoding: aes128gcm\x00\x01')[:16]
    nonce = _hmac(prk, b'Content-Encoding: nonce\x00\x01')[:12]
    ct = AESGCM(cek).encrypt(nonce, payload + b'\x02', None)
    return salt + struct.pack('!I', 4096) + bytes([len(as_pub)]) + as_pub + ct


def vapid_headers(endpoint, priv_b64):
    d = int.from_bytes(unb64u(priv_b64), 'big')
    key = ec.derive_private_key(d, ec.SECP256R1())
    pub = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    u = urllib.parse.urlsplit(endpoint)
    head = b64u(json.dumps({'typ': 'JWT', 'alg': 'ES256'}, separators=(',', ':')).encode())
    body = b64u(json.dumps({'aud': f'{u.scheme}://{u.netloc}', 'exp': int(time.time()) + 12 * 3600, 'sub': SUB_CLAIM}, separators=(',', ':')).encode())
    r, s = decode_dss_signature(key.sign(f'{head}.{body}'.encode(), ec.ECDSA(hashes.SHA256())))
    sig = b64u(r.to_bytes(32, 'big') + s.to_bytes(32, 'big'))
    return {'Authorization': f'vapid t={head}.{body}.{sig}, k={b64u(pub)}'}


def send(sub, payload, priv):
    data = encrypt(payload, sub['keys']['p256dh'], sub['keys']['auth'])
    h = {'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', 'TTL': str(6 * 3600), 'Urgency': 'high', **vapid_headers(sub['endpoint'], priv)}
    req = urllib.request.Request(sub['endpoint'], data=data, headers=h, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def git(*a):
    return subprocess.run(['git', *a], capture_output=True, text=True)


def commit(msg, files):
    git('config', 'user.name', 'github-actions[bot]')
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
    git('add', *files)
    r = git('commit', '-m', msg)
    if r.returncode != 0:
        print(r.stdout.strip()[-200:]); return
    for i in range(4):
        if git('push', 'origin', 'HEAD:main').returncode == 0:
            git('push', 'origin', 'HEAD:gh-pages'); return
        git('fetch', '--depth=200', 'origin', 'main')
        if git('rebase', 'origin/main').returncode != 0:
            git('rebase', '--abort'); print('rebase lỗi'); return
        time.sleep(3 + 3 * i)
    print('push thất bại')


def main():
    priv = os.environ.get('VAPID_PRIVATE', '').strip()
    if not priv:
        print('chưa có secret VAPID_PRIVATE — bỏ qua báo tin về điện thoại'); return
    now = int(time.time() * 1000)
    st = load(STATE, {})
    sent = int(st.get('sent_until') or 0)
    n = dt.datetime.now(VN)
    months = sorted({(n.replace(day=1) - dt.timedelta(days=1)).strftime('%Y-%m'), n.strftime('%Y-%m')})
    due = []
    for m in months:
        for it in load(CHAT + m + '.json', {}).get('items', []):
            if it.get('k') == 'react' or not isinstance(it.get('t'), str) or not it['t'].strip():
                continue
            try:
                ts = int(dt.datetime.fromisoformat(it['ts']).timestamp() * 1000)
            except (KeyError, ValueError, TypeError):
                continue
            if sent < ts <= now:
                due.append((ts, it['t'].strip()))
    due.sort()
    files = [STATE]
    if not sent:                                        # lần đầu: chỉ đặt mốc, không báo tin cũ
        st['sent_until'] = now
    elif not due:
        print('không có tin mới tới giờ'); return
    else:
        st['sent_until'] = due[-1][0]
        fresh = [t for ts, t in due if now - ts < FRESH_MS]
        subs_doc = load(SUBS, {'items': {}})
        subs = {k: v for k, v in (subs_doc.get('items') or {}).items() if isinstance(v, dict) and v.get('t')}
        if fresh and subs:
            name = (load(PROFILE, {}) or {}).get('name') or 'Anh'
            body = '\n'.join(fresh[-3:])
            body = body if len(body) <= 600 else body[:597] + '…'
            payload = json.dumps({'title': name, 'body': body, 'tag': 'studio-chat', 'url': './?chat=1', 'n': len(fresh)}, ensure_ascii=False).encode()
            gone = []
            for sid, v in subs.items():
                try:
                    sub = json.loads(v['t'])
                    code = 0 if DRY else send(sub, payload, priv)
                except Exception as e:                    # một máy lỗi không chặn các máy khác
                    print('lỗi gửi', sid, repr(e)[:200]); continue
                print('báo', sid, '→', code, f'({len(fresh)} tin)')
                if code in (404, 410):
                    gone.append(sid)
            if gone:                                      # máy đã huỷ đăng ký: đánh dấu rỗng (Studio đăng ký lại sẽ ghi bản mới hơn)
                for sid in gone:
                    subs_doc['items'][sid] = {**subs_doc['items'][sid], 't': ''}
                with open(SUBS, 'w', encoding='utf-8') as f:
                    json.dump(subs_doc, f, ensure_ascii=False, indent=1)
                files.append(SUBS)
        else:
            print(f'{len(due)} tin tới giờ, {len(fresh)} tin còn mới, {len(subs)} máy đăng ký')
    with open(STATE, 'w', encoding='utf-8') as f:
        json.dump(st, f, ensure_ascii=False, indent=1)
    if not DRY:
        commit('Studio: báo tin nhắn về điện thoại', files)


if __name__ == '__main__':
    main()
