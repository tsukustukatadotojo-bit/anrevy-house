#!/usr/bin/env python3
"""Công cụ cho mục tin nhắn của Studio (nhân vật "Anh" nhắn cho Vy).

    python3 studio/tools/chat.py status            # nhờ bot lấy tin Vy vừa nhắn, rồi in: giờ, tin mới của Vy, mạch chuyện 3 ngày, tin đã hẹn giờ
                                                   #   (--no-sync: không nhờ bot, chỉ đọc dữ liệu đang có)
    python3 studio/tools/chat.py add FILE.json     # thêm tin của Anh: [{"ts": "2026-11-18T19:12:00+07:00", "t": "...", "re": "<mã tin Vy>"?, "gn": true?}]
                                                   #   thả tim: {"ts", "k": "react", "re"} · đã xem mà chưa trả lời: {"ts", "k": "seen", "re"}
                                                   #   "gn": true = tin trong chuỗi đi ngủ (chúc ngủ ngon); sau tin gn đầu tiên của đêm
                                                   #   chỉ được thêm tin gn, và không tin nào trong 00:05–05:00 (Anh ngủ)
    python3 studio/tools/chat.py drop MÃ [MÃ...]   # bỏ tin của Anh CHƯA tới giờ hiện
    python3 studio/tools/chat.py drop --tonight    # bỏ mọi tin chưa hiện từ giờ tới 05:00 sáng (khi Vy nhắn đi ngủ)
    python3 studio/tools/chat.py done [--planned]  # đánh dấu đã đọc mọi tin của Vy hiện có; --planned: đã lên kế hoạch cho hôm nay

Dữ liệu (studio/data/chat/):
    YYYY-MM.json  { items: [{ id, ts, t, re?, k?, gn? }] } tin của Anh, tới giờ ts mới hiện trong Studio
    me.json       { items: { mã: { t, d, at, re?, k? } } } tin của Vy — DO BOT GHI, công cụ này không bao giờ sửa
    state.json    { handled_at, planned }                đã đọc tới đâu, ngày đã lên kế hoạch
"""
import datetime as dt, json, os, random, re, string, subprocess, sys, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CHAT = os.path.join(ROOT, 'studio', 'data', 'chat')
VN = dt.timezone(dt.timedelta(hours=7))
WD = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật']
EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿⬀-⯿️]')


def sync(wait=240):
    """Tin Vy nhắn nằm trên máy chủ chuyển tin; bot (workflow gallery-sync) mới ghi nó vào me.json. GitHub hay chạy lịch của bot
    trễ hàng giờ, nên đẩy một commit rỗng để bot chạy ngay (mỗi lần có commit là bot chạy), đợi bot xong rồi kéo dữ liệu về."""
    g = lambda *a: subprocess.run(['git', '-C', ROOT, *a], capture_output=True, text=True)
    g('pull', '-q', '--rebase', 'origin', 'main')
    if g('-c', 'user.name=Claude', '-c', 'user.email=noreply@anthropic.com', 'commit', '--allow-empty', '-q', '-m', 'Studio: nhờ bot lấy tin nhắn mới').returncode:
        print('sync: không tạo được commit — dùng dữ liệu đang có'); return
    pushed = False
    for _ in range(4):
        if g('push', '-q', 'origin', 'HEAD:main').returncode == 0:
            pushed = True; break
        g('pull', '-q', '--rebase', 'origin', 'main'); time.sleep(3)
    if not pushed:
        print('sync: đẩy lỗi — dùng dữ liệu đang có'); return
    sha, t0, done = g('rev-parse', 'HEAD').stdout.strip(), time.time(), False
    while time.time() - t0 < wait:
        time.sleep(15)
        r = subprocess.run(['gh', 'run', 'list', '-R', 'tsukustukatadotojo-bit/anrevy-house', '-w', 'gallery-sync', '-c', sha,
                            '--json', 'status', '-q', '.[0].status'], capture_output=True, text=True)
        if r.returncode != 0:                      # không dùng được gh: đợi cố định chừng một lượt chạy của bot
            time.sleep(max(0, 110 - (time.time() - t0))); break
        if r.stdout.strip() == 'completed':
            done = True; break
    g('pull', '-q', '--rebase', 'origin', 'main')
    print('sync: ' + ('bot đã lấy tin xong' if done else 'đã đợi bot, dùng dữ liệu mới nhất') + '\n')


def now():
    return dt.datetime.now(VN)


def load(name, default):
    try:
        with open(os.path.join(CHAT, name), encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def save(name, data):
    os.makedirs(CHAT, exist_ok=True)
    with open(os.path.join(CHAT, name), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')


def months_around(t):
    a = t.replace(day=1)
    prev = (a - dt.timedelta(days=1)).strftime('%Y-%m')
    nxt = (a + dt.timedelta(days=32)).strftime('%Y-%m')
    return [prev, a.strftime('%Y-%m'), nxt]


def his_all(t=None):
    out = []
    for m in months_around(t or now()):
        for it in load(m + '.json', {}).get('items', []):
            try:
                it = dict(it); it['_t'] = dt.datetime.fromisoformat(it['ts']).astimezone(VN); it['_m'] = m
                out.append(it)
            except (KeyError, ValueError, TypeError):
                pass
    return sorted(out, key=lambda x: x['_t'])


def mine():
    items = load('me.json', {}).get('items', {}) or {}
    out = []
    for k, v in items.items():
        if isinstance(v, dict) and isinstance(v.get('at'), (int, float)):
            out.append({'id': k, **v, '_t': dt.datetime.fromtimestamp(v['at'] / 1000, VN)})
    return sorted(out, key=lambda x: x['_t'])


def fmt(t):
    return t.strftime('%d/%m %H:%M')


# Một đêm của Anh: từ 19:00 tối ngày D tới 05:00 sáng D+1. Vy nhắn "ngủ" (19:00–24:00) thì cả hai đi ngủ;
# Anh không nhận tin sau 00:00 và nhắn lại từ 05:00.
WAKE, CUTOFF = dt.time(5, 0), dt.time(0, 5)


def night(t):
    d = (t - dt.timedelta(days=1)).date() if t.time() < WAKE else t.date()
    w0 = dt.datetime.combine(d, dt.time(19, 0), VN)
    return w0, w0 + dt.timedelta(hours=5), w0 + dt.timedelta(hours=10)     # 19:00, 24:00, 05:00


NOT_SLEEP = re.compile(r'(chưa|không|ko|mất|khó|buồn|đừng|đã)\s+(\S+\s+)?ngủ|ngủ\s+(được|muộn|trưa|không|chưa|dậy)|ngủ\s*\?')


def vy_sleep(me, t):
    w0, w24, _ = night(t)
    return [m for m in me if m.get('t') and m.get('k') != 'react' and w0 <= m['_t'] < w24
            and 'ngủ' in m['t'].lower() and len(m['t']) <= 60 and not NOT_SLEEP.search(m['t'].lower())]


def status(days=3):
    n = now()
    st = load('state.json', {})
    handled = int(st.get('handled_at') or 0)
    his, me = his_all(n), mine()
    byid = {m['id']: m for m in me}
    hisid = {m['id']: m for m in his}
    today = n.strftime('%Y-%m-%d')
    print(f'BÂY GIỜ: {n.strftime("%Y-%m-%d %H:%M")} ({WD[n.weekday()]}) giờ Việt Nam')
    print(f'ĐÃ LÊN KẾ HOẠCH HÔM NAY: {"có" if st.get("planned") == today else "chưa"}')
    w0, w24, w5 = night(n)
    gn = [m for m in his if m.get('gn') and w0 <= m['_t'] < w5]
    if n.time() < WAKE:
        print(f'ANH ĐANG NGỦ (00:00–05:00): không nhắn gì trước 05:00; tin Vy gửi sau 00:00 để sáng mới đọc')
    elif gn:
        print(f'ĐÊM NAY ANH ĐÃ ĐI NGỦ: có — chúc ngủ ngon lúc {gn[0]["_t"]:%H:%M} ({"đã hiện" if gn[0]["_t"] <= n else "đã hẹn giờ, chưa hiện"})')
    elif n >= w0:
        print('ĐÊM NAY ANH ĐÃ ĐI NGỦ: chưa')
    vs = vy_sleep(me, n) if n >= w0 and n.time() >= WAKE else []
    if vs:
        print('VY NHẮN ĐI NGỦ (máy tự dò — tự đọc lại cho chắc): ' + ' · '.join(f'[{m["_t"]:%H:%M}] {m["id"]} «{m["t"]}»' for m in vs))
    new = [m for m in me if m['at'] > handled]
    print(f'\nTIN MỚI CỦA VY (chưa đọc): {len(new)}')
    for m in new:
        if m.get('k') == 'react':
            tgt = hisid.get(m.get('re'), {})
            print(f'  [{fmt(m["_t"])}] {m["id"]}: {"thả tim" if m["t"] else "bỏ tim"} tin của Anh «{tgt.get("t", "?")[:80]}»')
        elif m['t']:
            print(f'  [{fmt(m["_t"])}] {m["id"]}: {m["t"]}')
    since = n - dt.timedelta(days=days)
    rows = [(m['_t'], 'Anh', m) for m in his if since <= m['_t'] <= n] + [(m['_t'], 'Vy', m) for m in me if m['_t'] >= since and m.get('t')]
    print(f'\nMẠCH CHUYỆN {days} NGÀY QUA (đã hiện):')
    for t, who, m in sorted(rows, key=lambda r: r[0]):
        if m.get('k') in ('react', 'seen'):
            tgt = (byid if who == 'Anh' else hisid).get(m.get('re'), {})
            print(f'  [{fmt(t)}] {who} {"thả tim" if m["k"] == "react" else "đã xem"} «{(tgt.get("t") or "?")[:60]}»')
        else:
            print(f'  [{fmt(t)}] {who}{" ↩" + m["re"] if m.get("re") else ""}: {m["t"]}')
    up = [m for m in his if m['_t'] > n]
    print(f'\nTIN CỦA ANH ĐÃ HẸN GIỜ, CHƯA HIỆN: {len(up)}')
    for m in up:
        tag = {'react': ' (thả tim ', 'seen': ' (đã xem '}.get(m.get('k'))
        print(f'  [{fmt(m["_t"])}] {m["id"]}{tag + m["re"] + ")" if tag else ""}: {m["t"]}')


def rid(t):
    return t.strftime('%Y%m%d-%H%M-') + ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(3))


def add(path):
    n = now()
    try:
        rows = json.load(open(path, encoding='utf-8'))
    except (OSError, ValueError) as e:
        sys.exit(f'không đọc được {path}: {e}')
    if not isinstance(rows, list) or not rows:
        sys.exit('file phải là một mảng tin, không rỗng')
    vy = {m['id'] for m in mine()}
    his = his_all(n)
    existing = {m['id'] for m in his}
    clean, errs = [], []
    for i, r in enumerate(rows):
        try:
            t = dt.datetime.fromisoformat(r['ts'])
            if t.tzinfo is None:
                raise ValueError('ts thiếu múi giờ (+07:00)')
            t = t.astimezone(VN)
        except (KeyError, ValueError, TypeError) as e:
            errs.append(f'#{i}: ts sai ({e})'); continue
        txt = r.get('t')
        k = r.get('k')
        g = bool(r.get('gn'))
        if k not in (None, '', 'react', 'seen'):
            errs.append(f'#{i}: k chỉ được là "react" hoặc "seen"'); continue
        if CUTOFF <= t.time() < WAKE:
            errs.append(f'#{i}: {t:%H:%M} Anh đang ngủ — sau 00:05 không nhắn, sáng từ 05:00 mới nhắn lại'); continue
        if g and (k or not (t.hour >= 19 or t.time() < CUTOFF)):
            errs.append(f'#{i}: "gn" chỉ cho tin chữ trong 19:00–00:04'); continue
        w0, _, w5 = night(t)
        first = min([m['_t'] for m in his if m.get('gn') and w0 <= m['_t'] < w5] +
                    [dt.datetime.fromisoformat(x['ts']).astimezone(VN) for x in rows if isinstance(x, dict) and x.get('gn') and x.get('ts')
                     and w0 <= dt.datetime.fromisoformat(x['ts']).astimezone(VN) < w5], default=None)
        if first and t > first and not g:
            errs.append(f'#{i}: đêm đó Anh đã đi ngủ lúc {first:%H:%M} — sau đó chỉ thêm tin "gn" (hoặc drop --tonight rồi viết lại)'); continue
        if t < n - dt.timedelta(minutes=10):
            errs.append(f'#{i}: ts {t:%H:%M} đã qua — không tạo tin lùi giờ'); continue
        if t > n + dt.timedelta(hours=30):
            errs.append(f'#{i}: ts quá xa (hơn 30 giờ)'); continue
        if r.get('re') and r['re'] not in vy:
            errs.append(f'#{i}: re {r["re"]} không phải mã tin của Vy'); continue
        if k in ('react', 'seen'):
            if not r.get('re'):
                errs.append(f'#{i}: {k} cần re = mã tin của Vy'); continue
            txt = '❤' if k == 'react' else ''
        else:
            if not isinstance(txt, str) or not txt.strip():
                errs.append(f'#{i}: t rỗng'); continue
            txt = re.sub(r'(?<![.])[.]$', '', txt.strip()).strip()     # nhắn tin thật không chấm cuối câu (giữ "...")
            if not txt:
                errs.append(f'#{i}: t rỗng'); continue
            if len(txt) > 1500:
                errs.append(f'#{i}: tin quá dài (>1500 ký tự) — tách thành nhiều tin'); continue
            if EMOJI.search(txt):
                errs.append(f'#{i}: Anh không dùng icon/emoji'); continue
        i_ = rid(t)
        while i_ in existing:
            i_ = rid(t)
        existing.add(i_)
        clean.append({'id': i_, 'ts': t.isoformat(timespec='seconds'), 't': txt, **({'re': r['re']} if r.get('re') else {}), **({'k': k} if k in ('react', 'seen') else {}), **({'gn': True} if g else {})})
    if errs:
        print('\n'.join('LỖI ' + e for e in errs))
        sys.exit('không thêm tin nào — sửa file rồi chạy lại')
    by = {}
    for c in clean:
        by.setdefault(c['ts'][:7], []).append(c)
    for m, lst in by.items():
        j = load(m + '.json', {'items': []})
        items = (j.get('items') or []) + lst
        items.sort(key=lambda x: x.get('ts', ''))
        save(m + '.json', {'items': items})
    for c in clean:
        print(f'+ {c["id"]} {c["ts"][11:16]}{" [gn]" if c.get("gn") else ""} {c["t"][:70]}')
    print(f'đã thêm {len(clean)} tin')


def drop(ids, tonight=False):
    n = now()
    gone = 0
    end = night(n)[2]
    for m in months_around(n):
        j = load(m + '.json', None)
        if not j:
            continue
        keep = []
        for it in j.get('items', []):
            try:
                fut = dt.datetime.fromisoformat(it['ts']).astimezone(VN) > n
            except (KeyError, ValueError, TypeError):
                fut = False
            if tonight and fut and dt.datetime.fromisoformat(it['ts']).astimezone(VN) < end:
                gone += 1; continue
            if it.get('id') in ids:
                if fut:
                    gone += 1; continue
                print(f'bỏ qua {it["id"]}: đã hiện rồi, không xoá được')
            keep.append(it)
        if len(keep) != len(j.get('items', [])):
            save(m + '.json', {'items': keep})
    print(f'đã bỏ {gone} tin chưa hiện')


def done(planned):
    st = load('state.json', {})
    me = mine()
    if me:
        st['handled_at'] = max(int(st.get('handled_at') or 0), max(int(m['at']) for m in me))
    if planned:
        st['planned'] = now().strftime('%Y-%m-%d')
    save('state.json', st)
    print('state:', json.dumps(st, ensure_ascii=False))


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] == 'status':
        if '--no-sync' not in a:
            sync()
        status(int(a[a.index('--days') + 1]) if '--days' in a else 3)
    elif a[0] == 'add' and len(a) == 2:
        add(a[1])
    elif a[0] == 'drop' and a[1:] == ['--tonight']:
        drop(set(), tonight=True)
    elif a[0] == 'drop' and len(a) > 1:
        drop(set(a[1:]))
    elif a[0] == 'done':
        done('--planned' in a)
    else:
        sys.exit(__doc__)
