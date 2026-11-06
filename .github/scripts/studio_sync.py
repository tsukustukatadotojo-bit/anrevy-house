"""Studio: dữ liệu cho trang studio/ (chạy định kỳ trên GitHub Actions, chỉ commit khi có thay đổi).

1. Letterboxd: nhật ký phim (RSS công khai) của haanvie → studio/data/letterboxd.json
   (Letterboxd không cho hiển thị trang của họ trong khung, nên trang Studio đọc file này.)
2. Nhạc mới: RSS của Pitchfork, Stereogum, NME, Consequence, NPR Music, Bandcamp Daily → studio/data/music.json
   (AOTY, Rate Your Music, Paste chặn cả khung lẫn máy đọc tự động.)

Chạy thử: python3 studio_sync.py --dry
"""
import html, json, os, re, subprocess, sys, time, urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

LB_USER = 'haanvie'
LB_OUT = 'studio/data/letterboxd.json'
MUSIC_OUT = 'studio/data/music.json'
MAX_ITEMS = 40
DRY = '--dry' in sys.argv
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
changed = []

def fetch(url, accept='application/rss+xml,application/xml,*/*', tries=3):
    for i in range(tries):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': accept, 'Accept-Language': 'en-US,en;q=0.9'}), timeout=30)
            return r.read()
        except Exception as e:
            print('lỗi tải', url, repr(e)[:200]); time.sleep(3 + i * 4)
    return None

def local(tag): return tag.rsplit('}', 1)[-1]

def load(path):
    try: return json.load(open(path, encoding='utf-8'))
    except Exception: return None

def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh: json.dump(data, fh, ensure_ascii=False, indent=1)
    changed.append(path)

def now_iso(): return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

def iso(d):
    try: return parsedate_to_datetime(d).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    except Exception: return ''

def plain(s, n=None):
    s = re.sub(r'<br\s*/?>', '\n', s or '')
    s = re.sub(r'<[^>]+>', ' ', s)
    s = re.sub(r'[ \t\r\f\v]+', ' ', html.unescape(s)).strip()
    return s[:n] if n else s

# ---------------------------------------------------------------- Letterboxd
def lb_text(desc):
    poster = ''
    m = re.search(r'<img[^>]+src="([^"]+)"', desc or '')
    if m: poster = html.unescape(m.group(1))
    paras = [p for p in re.findall(r'<p>(.*?)</p>', desc or '', re.S) if '<img' not in p]
    out = []
    for p in paras:
        p = re.sub(r'<br\s*/?>', '\n', p)
        p = re.sub(r'<[^>]+>', '', p)
        p = html.unescape(p).strip()
        if p: out.append(p)
    review = '\n\n'.join(out)
    if re.fullmatch(r'(Watched|Rewatched|Added) on .*', review or ''): review = ''
    return poster, review

def letterboxd():
    raw = fetch(f'https://letterboxd.com/{LB_USER}/rss/')
    if not raw: print('Letterboxd: không tải được RSS, giữ dữ liệu cũ'); return
    ch = ET.fromstring(raw).find('channel')
    items, name = [], ''
    for it in ch.findall('item'):
        f = {local(c.tag): (c.text or '').strip() for c in it}
        if not f.get('filmTitle'): continue                # bỏ các danh sách (list), chỉ giữ phim
        poster, review = lb_text(f.get('description', ''))
        name = name or f.get('creator', '')
        rating = f.get('memberRating')
        items.append({
            'title': f['filmTitle'], 'year': f.get('filmYear', ''), 'rating': float(rating) if rating else None,
            'liked': f.get('memberLike') == 'Yes', 'rewatch': f.get('rewatch') == 'Yes',
            'watched': f.get('watchedDate', ''), 'published': iso(f.get('pubDate')),
            'poster': poster, 'review': review[:6000], 'link': f.get('link', ''), 'tmdb': f.get('movieId', ''),
        })
        if len(items) >= MAX_ITEMS: break
    old = load(LB_OUT)
    if old and old.get('items') == items and old.get('name') == name:
        print('Letterboxd không đổi', len(items), 'phim'); return
    save(LB_OUT, {'user': LB_USER, 'name': name, 'profile': f'https://letterboxd.com/{LB_USER}/', 'items': items, 'updated': now_iso()})
    print('Letterboxd cập nhật', len(items), 'phim')

# ---------------------------------------------------------------- Nhạc mới
FEEDS = [
    ('pitchfork', 'album', 'https://pitchfork.com/feed/feed-album-reviews/rss'),
    ('pitchfork', 'song', 'https://pitchfork.com/feed/feed-track-reviews/rss'),
    ('stereogum', '', 'https://www.stereogum.com/feed/'),
    ('nme', 'album', 'https://www.nme.com/reviews/album/feed'),
    ('consequence', 'news', 'https://consequence.net/feed/'),
    ('npr', 'news', 'https://feeds.npr.org/1039/rss.xml'),
    ('bandcamp', 'news', 'https://daily.bandcamp.com/feed'),
]
Q = '“”"‘’\''

def rss_items(raw):
    try:
        ch = ET.fromstring(raw).find('channel')
        return [it for it in ch.findall('item')]
    except Exception as e:
        print('RSS lỗi', repr(e)[:120]); return []

def fields(it):
    f, cats, img = {}, [], ''
    for c in it:
        t = local(c.tag)
        if t == 'category': cats.append((c.text or '').strip())
        elif t in ('thumbnail', 'content') and c.get('url') and not img: img = c.get('url')
        elif t == 'encoded': f['encoded'] = c.text or ''
        else: f.setdefault(t, (c.text or '').strip())
    blob = f.get('description', '') + f.get('encoded', '')
    if not img:
        m = re.search(r'<img[^>]+src=["\']([^"\']+)', blob)
        if m and 'tracking' not in m.group(1) and 'pixel' not in m.group(1): img = html.unescape(m.group(1))
    return f, cats, small_img(img, blob)

def small_img(img, blob=''):
    """Ảnh nhỏ cho danh sách (ảnh gốc của các trang rất lớn)."""
    if not img: return ''
    if 'media.pitchfork.com/photos/' in img: return img.replace('/master/pass/', '/master/w_200,c_limit/')
    if 'stereogum.com' in img: return re.sub(r'\?w=\d+', '', img) + '?w=200'
    m = re.search(r'(https://[^\s"\']+-(?:400|300|320|360)x\d+\.(?:jpe?g|png|webp))\s+\d+w', blob)
    if m: return html.unescape(m.group(1))
    return img

def pitchfork_page(link):
    raw = fetch(link, 'text/html,*/*', tries=2)
    if not raw: return '', None
    b = raw.decode('utf-8', 'ignore')
    t = re.search(r'<title[^>]*>(.*?)</title>', b, re.S)
    artist = ''
    if t:
        tt = html.unescape(t.group(1)).strip()
        m = re.match(r'(.+?):\s', tt)
        if m: artist = m.group(1).strip()
    sc, bnm = None, False
    # điểm nằm trong "ratingValue":{..."score":7.4,"isBestNewMusic":...}; bài bị khoá thì không có điểm
    for m in re.finditer(r'"ratingValue"\s*:\s*(\{[^{}]*\})', b):
        try: rv = json.loads(m.group(1))
        except ValueError: continue
        v = rv.get('score')
        if isinstance(v, (int, float)) and 1 <= v <= 10:
            sc, bnm = float(v), bool(rv.get('isBestNewMusic') or rv.get('isBestNewReissue')); break
    return artist, sc, bnm

def music():
    old = load(MUSIC_OUT) or {}
    cache = {it['u']: it for it in old.get('items', []) if it.get('u')}
    items, fetched = [], 0
    for src, kind, url in FEEDS:
        raw = fetch(url)
        if not raw:
            items += [it for it in old.get('items', []) if it.get('s') == src and (not kind or it.get('k') == kind or src == 'stereogum')]; continue
        n = 0
        for it in rss_items(raw)[:30]:
            f, cats, img = fields(it)
            title = plain(f.get('title', ''))
            link = (f.get('link') or '').strip()
            if not title or not link: continue
            link = re.sub(r'\?utm_[^#]*', '', link)
            k, artist, work, sc = kind or 'news', '', '', None
            desc = plain(f.get('description') or f.get('encoded') or '', 400)
            desc = re.sub(r'\s*(The post .* appeared first on .*|Read full story on the Bandcamp Daily\.?)$', '', desc).strip()
            if src == 'pitchfork':
                work = title.strip(Q + ' ')
                c = cache.get(link)
                bnm = False
                if c and c.get('a') and c.get('v') == 2: artist, sc, bnm = c['a'], c.get('sc'), c.get('bnm', False)
                elif fetched < 70:
                    artist, sc, bnm = pitchfork_page(link); fetched += 1; time.sleep(.4)
                if k == 'song': title = f'{artist} – “{work}”' if artist else title
                else: title = f'{artist} – {work}' if artist else title
            elif src == 'stereogum':
                m = re.match(r'(.+?)\s+[–—-]\s+[“"](.+?)[”"]\s*$', title)
                if m and 'New Music' in cats: k, artist, work = 'song', m.group(1).strip(), m.group(2).strip()
                else:
                    m = re.match(r'Album Of The Week:\s*(.+)$', title)
                    k = 'album' if m else 'news'
            elif src == 'nme':
                m = re.match(r'(.+?)\s+[–—-]\s+[‘\'“"](.+?)[’\'”"]\s+review\b:?\s*(.*)$', title)
                if m:
                    artist, work = m.group(1).strip(), m.group(2).strip()
                    if m.group(3): desc = m.group(3).strip()[:1].upper() + m.group(3).strip()[1:]
                    title = f'{artist} – {work}'
                else: k = 'news'
            row = {'s': src, 'k': k, 't': title, 'u': link, 'd': iso(f.get('pubDate') or '') or f.get('date', ''), 'x': desc}
            if artist: row['a'] = artist
            if work: row['w'] = work
            if img: row['i'] = img
            if sc is not None: row['sc'] = sc
            if src == 'pitchfork':
                row['v'] = 2
                if bnm: row['bnm'] = True
            items.append(row); n += 1
        print(f'{src}/{kind or "*"}: {n} mục')
    seen, uniq = set(), []
    for it in sorted(items, key=lambda x: x.get('d', ''), reverse=True):
        if it['u'] in seen: continue
        seen.add(it['u']); uniq.append(it)
    out = []
    for k, cap in (('song', 40), ('album', 40), ('news', 40)):
        out += [it for it in uniq if it['k'] == k][:cap]
    out.sort(key=lambda x: x.get('d', ''), reverse=True)
    if not out: print('Nhạc mới: không có dữ liệu, giữ dữ liệu cũ'); return
    if old.get('items') == out:
        print('Nhạc mới không đổi', len(out), 'mục'); return
    save(MUSIC_OUT, {'items': out, 'updated': now_iso()})
    print('Nhạc mới cập nhật', len(out), 'mục:', {k: sum(1 for it in out if it['k'] == k) for k in ('song', 'album', 'news')})
    if DRY:
        for it in out[:12]: print('  ', it['k'], it['s'], it['t'], it.get('sc'), it.get('i', '')[:60])

# ---------------------------------------------------------------- git
def git(*a): return subprocess.run(['git', *a], capture_output=True, text=True)

def push(msg):
    git('config', 'user.name', 'github-actions[bot]')
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
    git('add', *changed)
    r = git('commit', '-m', msg)
    if r.returncode != 0: print(r.stdout, r.stderr); return
    for i in range(4):
        r = git('push', 'origin', 'HEAD:main')
        if r.returncode == 0: break
        print('push main lỗi, thử lại', r.stderr.strip()[-300:])
        git('fetch', '--depth=200', 'origin', 'main')
        rb = git('rebase', 'origin/main')
        if rb.returncode != 0: print(rb.stderr[-300:]); git('rebase', '--abort'); sys.exit(1)
        time.sleep(3 + i * 3)
    else:
        sys.exit(1)
    r = git('push', 'origin', 'HEAD:gh-pages')
    if r.returncode != 0: print('push gh-pages lỗi', r.stderr.strip()[-300:])

def main():
    try: letterboxd()
    except Exception as e: print('Letterboxd lỗi', repr(e)[:300])
    try: music()
    except Exception as e: print('Nhạc mới lỗi', repr(e)[:300])
    if not changed: return
    parts = (['Letterboxd'] if LB_OUT in changed else []) + (['nhạc mới'] if MUSIC_OUT in changed else [])
    msg = 'Studio: cập nhật ' + ' + '.join(parts)
    if os.environ.get('GITHUB_ACTIONS'): print(f'::notice title=studio-sync::{msg}')
    if not DRY: push(msg)

if __name__ == '__main__':
    main()
