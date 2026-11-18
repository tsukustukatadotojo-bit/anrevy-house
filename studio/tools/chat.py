#!/usr/bin/env python3
"""Công cụ cho mục tin nhắn của Studio (nhân vật "Anh" nhắn cho Vy).

    python3 studio/tools/chat.py status            # giờ hiện tại, tin mới của Vy, mạch chuyện 3 ngày, tin đã hẹn giờ
    python3 studio/tools/chat.py add FILE.json     # thêm tin của Anh: [{"ts": "2026-11-18T19:12:00+07:00", "t": "...", "re": "<mã tin Vy>"?, "k": "react"?}]
    python3 studio/tools/chat.py drop MÃ [MÃ...]   # bỏ tin của Anh CHƯA tới giờ hiện
    python3 studio/tools/chat.py done [--planned]  # đánh dấu đã đọc mọi tin của Vy hiện có; --planned: đã lên kế hoạch cho hôm nay

Dữ liệu (studio/data/chat/):
    YYYY-MM.json  { items: [{ id, ts, t, re?, k? }] }   tin của Anh, tới giờ ts mới hiện trong Studio
    me.json       { items: { mã: { t, d, at, re?, k? } } } tin của Vy — DO BOT GHI, công cụ này không bao giờ sửa
    state.json    { handled_at, planned }                đã đọc tới đâu, ngày đã lên kế hoạch
"""
import datetime as dt, json, os, random, re, string, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CHAT = os.path.join(ROOT, 'studio', 'data', 'chat')
VN = dt.timezone(dt.timedelta(hours=7))
WD = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật']
EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿⬀-⯿️]')


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
    gn = [m for m in his if m['_t'].strftime('%Y-%m-%d') == today and m['_t'].hour >= 22 and m.get('k') != 'react']
    print(f'ĐÃ CÓ CHÚC NGỦ NGON HÔM NAY: {"có (" + gn[0]["_t"].strftime("%H:%M") + ")" if gn else "chưa"}')
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
        if m.get('k') == 'react':
            tgt = (byid if who == 'Anh' else hisid).get(m.get('re'), {})
            print(f'  [{fmt(t)}] {who} thả tim «{(tgt.get("t") or "?")[:60]}»')
        else:
            print(f'  [{fmt(t)}] {who}{" ↩" + m["re"] if m.get("re") else ""}: {m["t"]}')
    up = [m for m in his if m['_t'] > n]
    print(f'\nTIN CỦA ANH ĐÃ HẸN GIỜ, CHƯA HIỆN: {len(up)}')
    for m in up:
        print(f'  [{fmt(m["_t"])}] {m["id"]}{" (thả tim " + m["re"] + ")" if m.get("k") == "react" else ""}: {m["t"]}')


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
    existing = {m['id'] for m in his_all(n)}
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
        if k not in (None, '', 'react'):
            errs.append(f'#{i}: k chỉ được là "react"'); continue
        if t < n - dt.timedelta(minutes=10):
            errs.append(f'#{i}: ts {t:%H:%M} đã qua — không tạo tin lùi giờ'); continue
        if t > n + dt.timedelta(hours=30):
            errs.append(f'#{i}: ts quá xa (hơn 30 giờ)'); continue
        if r.get('re') and r['re'] not in vy:
            errs.append(f'#{i}: re {r["re"]} không phải mã tin của Vy'); continue
        if k == 'react':
            if not r.get('re'):
                errs.append(f'#{i}: thả tim cần re = mã tin của Vy'); continue
            txt = '❤'
        else:
            if not isinstance(txt, str) or not txt.strip():
                errs.append(f'#{i}: t rỗng'); continue
            txt = txt.strip()
            if len(txt) > 1500:
                errs.append(f'#{i}: tin quá dài (>1500 ký tự) — tách thành nhiều tin'); continue
            if EMOJI.search(txt):
                errs.append(f'#{i}: Anh không dùng icon/emoji'); continue
        i_ = rid(t)
        while i_ in existing:
            i_ = rid(t)
        existing.add(i_)
        clean.append({'id': i_, 'ts': t.isoformat(timespec='seconds'), 't': txt, **({'re': r['re']} if r.get('re') else {}), **({'k': 'react'} if k == 'react' else {})})
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
        print(f'+ {c["id"]} {c["ts"][11:16]} {c["t"][:70]}')
    print(f'đã thêm {len(clean)} tin')


def drop(ids):
    n = now()
    gone = 0
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
        status(int(a[2]) if len(a) > 2 and a[1] == '--days' else 3)
    elif a[0] == 'add' and len(a) == 2:
        add(a[1])
    elif a[0] == 'drop' and len(a) > 1:
        drop(set(a[1:]))
    elif a[0] == 'done':
        done('--planned' in a)
    else:
        sys.exit(__doc__)
