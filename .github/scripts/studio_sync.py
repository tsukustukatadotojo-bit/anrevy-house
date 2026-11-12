"""Studio: dữ liệu cho trang studio/ (chạy định kỳ trên GitHub Actions, chỉ commit khi có thay đổi).

1. Letterboxd: nhật ký phim (RSS công khai) của haanvie → studio/data/letterboxd.json
   (Letterboxd không cho hiển thị trang của họ trong khung, nên trang Studio đọc file này.)
   + phim đã xem (trang /films/, xếp theo phim mới) và Watchlist (mọi trang) — phát hiện phim mới đánh dấu đã xem.
2. Nhạc mới: RSS của 16 trang tin nhạc + Hype Machine (bài hot) + Bandcamp (nhạc mới) → studio/data/music.json
   (AOTY, Rate Your Music, Paste chặn cả khung lẫn máy đọc tự động.)
3. Bảng xếp hạng: Spotify US/UK hằng ngày, Apple Music Nga/Trung Quốc (kworb.net) → studio/data/charts.json
4. Album phát hành quanh hôm nay (Wikipedia "List of 2026 albums") → studio/data/releases.json

Lịch chạy 30 phút một lần: Letterboxd (RSS + phim đã xem) mỗi lần; Watchlist, nhạc mới, bảng xếp hạng 2 giờ một lần.

Chạy thử: python3 studio_sync.py --dry
"""
import html, json, os, re, subprocess, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

LB_USER = 'haanvie'
LB_OUT = 'studio/data/letterboxd.json'
MUSIC_OUT = 'studio/data/music.json'
CHARTS_OUT = 'studio/data/charts.json'
HEAVY = '--all' in sys.argv or os.environ.get('GITHUB_EVENT_NAME', 'schedule') != 'schedule' or (datetime.now(timezone.utc).hour % 2 == 0 and datetime.now(timezone.utc).minute < 30)
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
    old = load(LB_OUT) or {}
    data = {'user': LB_USER, 'name': name, 'profile': f'https://letterboxd.com/{LB_USER}/', 'items': items}
    # phim đã xem: trang /films/ (Letterboxd chỉ cho máy đọc trang đầu, xếp theo phim mới phát hành)
    seen = dict(old.get('seen') or {})
    films = old.get('films')
    page = lb_page(f'https://letterboxd.com/{LB_USER}/films/')
    if page:
        grid, total = page[0], page[1]
        if grid:
            base = not seen
            stamp = now_iso()
            for it in grid:
                if it['s'] not in seen: seen[it['s']] = '' if base else stamp     # lần đầu: chưa biết ngày xem
                if seen.get(it['s']): it['seen'] = seen[it['s']]
            fix_posters(grid, (films or {}).get('items'))
            films = {'total': total or (films or {}).get('total') or len(grid), 'items': grid}
            new = [it['t'] for it in grid if it.get('seen') == stamp]
            if new: print('Phim mới đánh dấu đã xem:', new)
    if films: data['films'] = films
    data['seen'] = seen
    # Watchlist: đọc đủ mọi trang, nếu một trang lỗi thì giữ dữ liệu cũ
    wl = old.get('watchlist')
    if HEAVY or not wl:
        got = lb_watchlist()
        if got is not None: wl = got
    if wl: data['watchlist'] = wl
    cmp = lambda d: {k: v for k, v in (d or {}).items() if k != 'updated'}
    if cmp(old) == cmp(data):
        print('Letterboxd không đổi', len(items), 'nhật ký,', len((films or {}).get('items', [])), 'phim đã xem,', len((wl or {}).get('items', [])), 'watchlist'); return
    data['updated'] = now_iso()
    save(LB_OUT, data)
    print('Letterboxd cập nhật', len(items), 'nhật ký,', len((films or {}).get('items', [])), 'phim đã xem,', len((wl or {}).get('items', [])), 'watchlist')

def lb_html(url):
    raw = fetch(url, 'text/html,application/xhtml+xml', tries=2)
    return raw.decode('utf-8', 'ignore') if raw else None

def lb_page(url):
    """Đọc lưới poster của một trang Letterboxd → ([phim], tổng số phim)."""
    b = lb_html(url)
    if not b or 'data-item-slug' not in b: return None
    out = []
    for m in re.finditer(r'<li class="griditem[^"]*">(.*?)</li>', b, re.S):
        blk = m.group(1)
        nm, sl = re.search(r'data-item-name="([^"]+)"', blk), re.search(r'data-item-slug="([^"]+)"', blk)
        if not nm or not sl: continue
        n = html.unescape(nm.group(1)); my = re.match(r'(.*) \((\d{4})\)$', n)
        it = {'t': my.group(1) if my else n, 'y': my.group(2) if my else '', 's': sl.group(1)}
        try:
            pid = json.loads(html.unescape(re.search(r"data-postered-identifier='([^']+)'", blk).group(1)))
            it['f'] = pid['uid'].split(':')[1]
            rp = json.loads(html.unescape(re.search(r"data-resolvable-poster-path='([^']+)'", blk).group(1)))
            it['k'] = rp.get('cacheBustingKey', '')
        except Exception: pass
        r = re.search(r'rated-(\d+)', blk)
        if r: it['r'] = int(r.group(1)) / 2
        if 'icon-liked' in blk: it['l'] = 1
        out.append(it)
    tot = re.search(r'([\d,]+)&nbsp;films', b)
    pages = [int(x) for x in re.findall(r'/page/(\d+)/', b)]
    return out, (int(tot.group(1).replace(',', '')) if tot else 0), (max(pages) if pages else 1)

def lb_poster_url(it):
    f = it.get('f', '')
    return f"https://a.ltrbxd.com/resized/film-poster/{'/'.join(f)}/{f}-{it['s']}-0-150-0-225-crop.jpg?v={it.get('k', '')}" if f else ''

def head_ok(url):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, method='HEAD', headers={'User-Agent': UA, 'Referer': 'https://letterboxd.com/'}), timeout=15)
        return r.status == 200 and 'image' in (r.headers.get('Content-Type') or '')
    except Exception: return False

def imdb_poster(title, year):
    q = re.sub(r'[^a-z0-9 ]+', ' ', title.lower()).strip()
    raw = fetch('https://v3.sg.media-imdb.com/suggestion/x/' + urllib.parse.quote(q or title) + '.json', 'application/json', tries=1)
    if not raw: return ''
    try: d = [x for x in json.loads(raw).get('d', []) if str(x.get('id', '')).startswith('tt') and x.get('i')]
    except ValueError: return ''
    pick = next((x for x in d if str(x.get('y', '')) == str(year)), None) or (d[0] if d and not year else None)
    u = pick and pick['i'].get('imageUrl')
    return re.sub(r'\._V1_.*?\.jpg$', '._V1_QL75_UX150_.jpg', u) if u else ''

def fix_posters(items, old_items, budget=650):
    """Kiểm tra poster dựng từ mã phim (một lần, nhớ lại); poster hỏng thì lấy poster IMDb."""
    cache = {o['s']: o for o in (old_items or []) if o.get('pc')}
    for it in items:
        o = cache.get(it['s'])
        if o and o.get('k') == it.get('k'):
            it['pc'] = 1
            if o.get('p'): it['p'] = o['p']
            continue
        if budget <= 0: continue
        budget -= 1
        if not head_ok(lb_poster_url(it)):
            alt = imdb_poster(it['t'], it['y'])
            if alt: it['p'] = alt
            print('poster thay thế:', it['t'], it['y'], '→', 'IMDb' if alt else 'không có')
        it['pc'] = 1
    return budget

def lb_watchlist():
    first = lb_page(f'https://letterboxd.com/{LB_USER}/watchlist/')
    if not first: print('Watchlist: không đọc được, giữ dữ liệu cũ'); return None
    items, _, last = first[0], first[1], first[2]
    for p in range(2, min(last, 60) + 1):
        time.sleep(.6)
        pg = lb_page(f'https://letterboxd.com/{LB_USER}/watchlist/page/{p}/')
        if not pg: print('Watchlist: trang', p, 'lỗi, giữ dữ liệu cũ'); return None
        items += pg[0]
    seen, uniq = set(), []
    for it in items:
        if it['s'] in seen: continue
        seen.add(it['s']); uniq.append(it)
    fix_posters(uniq, ((load(LB_OUT) or {}).get('watchlist') or {}).get('items'))
    print('Watchlist', len(uniq), 'phim')
    return {'total': len(uniq), 'items': uniq}

# ---------------------------------------------------------------- Nhạc mới
FEEDS = [
    ('pitchfork', 'album', 'https://pitchfork.com/feed/feed-album-reviews/rss'),
    ('pitchfork', 'song', 'https://pitchfork.com/feed/feed-track-reviews/rss'),
    ('stereogum', '', 'https://www.stereogum.com/feed/'),
    ('nme', 'album', 'https://www.nme.com/reviews/album/feed'),
    ('consequence', 'news', 'https://consequence.net/feed/'),
    ('npr', 'news', 'https://feeds.npr.org/1039/rss.xml'),
    ('bandcamp', 'news', 'https://daily.bandcamp.com/feed'),
    ('pitchfork', 'news', 'https://pitchfork.com/feed/feed-news/rss'),
    ('nme', 'news', 'https://www.nme.com/news/music/feed'),
    ('guardian', 'news', 'https://www.theguardian.com/music/rss'),
    ('rollingstone', 'news', 'https://www.rollingstone.com/music/music-news/feed/'),
    ('billboard', 'news', 'https://www.billboard.com/c/music/music-news/feed/'),
    ('clash', 'news', 'https://www.clashmusic.com/feed/'),
    ('quietus', 'news', 'https://thequietus.com/feed'),
    ('diy', 'news', 'https://diymag.com/feed'),
    ('spin', 'news', 'https://www.spin.com/feed/'),
    ('soompi', 'news', 'https://www.soompi.com/feed'),
]
NEWS_MIN, NEWS_MAX = 3, 12        # tin nhạc: mỗi nguồn có ít nhất 3 tin mới nhất (nguồn ít đăng như NPR không bị lấn), tối đa 12
RELEASE_DAYS = (-7, 10)          # album phát hành: 7 ngày trước → 10 ngày tới
RELEASES_OUT = 'studio/data/releases.json'
# tiêu đề kiểu "Artist Shares New Single ‘Song’" → bài / album mới
VERB = r'(?:(?:Unveil|Share|Drop|Release|Surprise-Release|Debut|Premiere|Unleash|Deliver|Announce|Tease|Unwrap|Preview)(?:s|es)?|Returns? With|(?:Is|Are) Back With|Celebrates? .{1,40}? on)'
HEAD_RE = re.compile(r'^(.{2,60}?)\s+' + VERB + r'\s+(?:[\w-]+\s+){0,3}?(Album|LP|EP|Single|Song|Track|Mixtape)\s+[‘\'"“](.+?)[’\'"”]', re.I)
Q = '“”"‘’\''

def rss_items(raw):
    try:
        ch = ET.fromstring(raw).find('channel')
        return [it for it in ch.findall('item')]
    except Exception as e:
        # một số trang dùng tiền tố XML chưa khai báo (vd. DIY): bỏ tiền tố rồi đọc lại
        try:
            t = raw.decode('utf-8', 'ignore')
            t = re.sub(r'<(/?)([A-Za-z][\w.-]*):', r'<\1\2_', t)
            t = re.sub(r'\s([A-Za-z][\w.-]*):([A-Za-z][\w.-]*)=', r' \1_\2=', t)
            ch = ET.fromstring(t.encode('utf-8')).find('channel')
            return [it for it in ch.findall('item')]
        except Exception as e2:
            print('RSS lỗi', repr(e)[:120], repr(e2)[:80]); return []

def fields(it):
    f, cats, img = {}, [], ''
    for c in it:
        t = local(c.tag)
        if '_' in t and t.split('_', 1)[0] in ('media', 'content', 'dc', 'atom', 'slash', 'wfw', 'sy'): t = t.split('_', 1)[1]
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
    # điểm của bài nằm ở "musicRating":{"isBestNewMusic":false,...,"score":7.4} (mục đầu tiên trong trang)
    for m in re.finditer(r'"musicRating"\s*:\s*(\{[^{}]*\})', b):
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
            items += [it for it in old.get('items', []) if it.get('s') == src and it.get('f') == url]; continue
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
            if src == 'pitchfork' and k in ('album', 'song'):
                work = title.strip(Q + ' ')
                c = cache.get(link)
                bnm = False
                if c and c.get('a') and c.get('v') == 3: artist, sc, bnm = c['a'], c.get('sc'), c.get('bnm', False)
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
            if k == 'news' and src not in ('npr', 'bandcamp', 'quietus', 'guardian', 'soompi'):
                m = HEAD_RE.match(title)
                if m and not re.search(r'\b(tour|dates|shows|festival)\b', title, re.I):
                    artist, work = m.group(1).strip(), m.group(3).strip()
                    k = 'album' if m.group(2).lower() in ('album', 'lp', 'ep', 'mixtape') else 'song'
            row = {'s': src, 'k': k, 't': title, 'u': link, 'd': iso(f.get('pubDate') or '') or f.get('date', ''), 'x': desc, 'f': url}
            if artist: row['a'] = artist
            if work: row['w'] = work
            if img: row['i'] = img
            if sc is not None: row['sc'] = sc
            if src == 'pitchfork':
                row['v'] = 3
                if bnm: row['bnm'] = True
            items.append(row); n += 1
        print(f'{src}/{kind or "*"}: {n} mục')
    seen, uniq = set(), []
    for it in sorted(items, key=lambda x: x.get('d', ''), reverse=True):
        if it['u'] in seen: continue
        seen.add(it['u']); uniq.append(it)
    out = []
    for k, cap in (('song', 60), ('album', 50), ('news', 90)):
        pool = [it for it in uniq if it['k'] == k]
        if k == 'news':
            per, keep = {}, []
            for it in pool:                                   # mới nhất trước: giữ NEWS_MIN tin đầu của mỗi nguồn
                c = per.get(it['s'], 0)
                if c < NEWS_MIN: keep.append(it)
                per[it['s']] = c + 1
            ids, per2 = {id(it) for it in keep}, {}
            for it in keep: per2[it['s']] = per2.get(it['s'], 0) + 1
            for it in pool:                                   # phần còn lại lấp theo thời gian, mỗi nguồn tối đa NEWS_MAX
                if len(keep) >= cap: break
                if id(it) in ids or per2.get(it['s'], 0) >= NEWS_MAX: continue
                keep.append(it); per2[it['s']] = per2.get(it['s'], 0) + 1
            pool = sorted(keep, key=lambda x: x.get('d', ''), reverse=True)
        out += pool[:cap]
    out.sort(key=lambda x: x.get('d', ''), reverse=True)
    if not out: print('Nhạc mới: không có dữ liệu, giữ dữ liệu cũ'); return
    data = {'items': out}
    try: data['hypem'] = hypem() or old.get('hypem') or []
    except Exception as e: print('Hypem lỗi', repr(e)[:200]); data['hypem'] = old.get('hypem') or []
    try: data['bandcamp'] = bandcamp() or old.get('bandcamp') or []
    except Exception as e: print('Bandcamp lỗi', repr(e)[:200]); data['bandcamp'] = old.get('bandcamp') or []
    if all(old.get(k) == data[k] for k in data):
        print('Nhạc mới không đổi', len(out), 'mục'); return
    data['updated'] = now_iso()
    save(MUSIC_OUT, data)
    print('Nhạc mới cập nhật', len(out), 'mục:', {k: sum(1 for it in out if it['k'] == k) for k in ('song', 'album', 'news')})
    if DRY:
        for it in out[:12]: print('  ', it['k'], it['s'], it['t'], it.get('sc'), it.get('i', '')[:60])

# ---------------------------------------------------------------- Hype Machine (bài hot trên blog) + Bandcamp (nhạc mới)
def hypem():
    raw = fetch('https://api.hypem.com/v2/popular?mode=now&count=50', 'application/json')
    if not raw: return None
    try: d = json.loads(raw)
    except ValueError: return None
    out = []
    for i, x in enumerate(d if isinstance(d, list) else [], 1):
        if not x.get('artist') or not x.get('title'): continue
        out.append({'p': i, 'a': html.unescape(x['artist']).strip(), 't': html.unescape(x['title']).strip(), 's': x.get('sitename', ''),
                    'lv': x.get('loved_count', 0), 'i': x.get('thumb_url_medium') or x.get('thumb_url') or '', 'u': f"https://hypem.com/track/{x.get('itemid', '')}",
                    'd': datetime.fromtimestamp(int(x.get('dateposted') or 0), timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ') if x.get('dateposted') else ''})
    print('Hypem:', len(out), 'bài')
    return out or None

def bandcamp():
    raw = fetch('https://bandcamp.com/api/discover/3/get_web?g=all&s=new&p=0&gn=0&f=all&w=0', 'application/json')
    if not raw: return None
    try: d = json.loads(raw)
    except ValueError: return None
    out = []
    for x in d.get('items', [])[:48]:
        h = x.get('url_hints') or {}
        kind = 'track' if x.get('type') == 't' else 'album'
        if not x.get('id') or not h.get('subdomain'): continue
        base = h.get('custom_domain') if h.get('custom_domain') and h.get('custom_domain_verified') else f"{h['subdomain']}.bandcamp.com"
        it = {'id': x['id'], 'k': kind, 't': html.unescape(x.get('primary_text') or ''), 'a': html.unescape(x.get('secondary_text') or ''),
              'g': x.get('genre_text') or '', 'u': f"https://{base}/{h.get('item_type') == 't' and 'track' or 'album'}/{h.get('slug', '')}",
              'i': f"https://f4.bcbits.com/img/a{x['art_id']}_7.jpg" if x.get('art_id') else ''}
        ft = x.get('featured_track') or {}
        mp3 = (ft.get('file') or {}).get('mp3-128')
        if mp3:                      # link nghe thử của Bandcamp (hết hạn sau khoảng 1 ngày, máy chủ làm mới 2 giờ/lần)
            it['s'] = mp3; it['ft'] = html.unescape(ft.get('title') or '')
            if ft.get('duration'): it['dur'] = round(float(ft['duration']))
        try: it['d'] = datetime.strptime(x.get('publish_date', ''), '%d %b %Y %H:%M:%S %Z').strftime('%Y-%m-%dT%H:%M:%SZ')
        except ValueError: pass
        out.append(it)
    print('Bandcamp:', len(out), 'album/bài mới')
    return out or None

# ---------------------------------------------------------------- Album phát hành (Wikipedia "List of 2026 albums")
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

def wiki_clean(t):
    t = re.sub(r'<ref[^>]*/>', '', t); t = re.sub(r'<ref[^>]*>.*?</ref>', '', t, flags=re.S)
    t = re.sub(r'\{\{(?:sort|sortname)\|[^|}]*\|([^}]*)\}\}', r'\1', t)
    t = re.sub(r'\{\{[^{}]*\}\}', '', t)
    t = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', t)
    t = re.sub(r"'{2,}", '', t); t = re.sub(r'<br\s*/?>', ', ', t); t = re.sub(r'<[^>]+>', '', t)
    return html.unescape(re.sub(r'\s+', ' ', t)).strip(' ,|')

def releases():
    from datetime import date, timedelta
    today = datetime.now(timezone.utc).date()
    lo, hi = today + timedelta(days=RELEASE_DAYS[0]), today + timedelta(days=RELEASE_DAYS[1])
    pages = sorted({f'List of {d.year} albums ({"January–June" if d.month <= 6 else "July–December"})' for d in (lo, today, hi)})
    out = []
    for page in pages:
        raw = fetch('https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'parse', 'page': page, 'prop': 'wikitext', 'format': 'json', 'redirects': 1}), 'application/json')
        if not raw: return None
        try: wt = json.loads(raw)['parse']['wikitext']['*']
        except Exception: print('Wikipedia: không đọc được', page); return None
        year = int(re.search(r'(\d{4})', page).group(1))
        cur = None
        for row in wt.split('\n|-'):
            m = re.search(r'!\s*scope="row"[^|]*\|\s*(' + '|'.join(MONTHS) + r')\s*<br\s*/?>\s*(\d{1,2})', row)
            if m: cur = date(year, MONTHS.index(m.group(1)) + 1, int(m.group(2)))
            if not cur or not (lo <= cur <= hi): continue
            cells = [re.sub(r'^\s*(?:[\w-]+\s*=\s*"[^"]*"\s*)+\|', '', c[1:]).strip() for c in row.split('\n') if c.startswith('|') and not c.startswith('|-') and not c.startswith('|}') and not c.startswith('|+')]
            if len(cells) < 2: continue
            artist, album = wiki_clean(cells[0]), wiki_clean(cells[1])
            if not artist or not album or len(artist) > 120 or artist.startswith('+') or '=' in album or 'colspan' in artist: continue
            it = {'d': cur.isoformat(), 'a': artist, 'w': album}
            g = wiki_clean(cells[2]) if len(cells) > 2 else ''
            l = wiki_clean(cells[3]) if len(cells) > 3 else ''
            if g: it['g'] = g[:60]
            if l: it['l'] = l[:60]
            out.append(it)
    out.sort(key=lambda x: (x['d'], x['a'].lower()))
    print('Album phát hành:', len(out), 'album từ', lo, 'đến', hi)
    return out

def release_sync():
    items = releases()
    if not items: return
    old = load(RELEASES_OUT) or {}
    if old.get('items') == items: print('Album phát hành không đổi'); return
    save(RELEASES_OUT, {'items': items, 'updated': now_iso()})

# ---------------------------------------------------------------- Bảng xếp hạng
CHARTS = [
    ('us', 'US · Spotify top 200', 'https://kworb.net/spotify/country/us_daily.html'),
    ('gb', 'UK · Spotify top 200', 'https://kworb.net/spotify/country/gb_daily.html'),
    ('ru', 'Nga · Apple Music top 200', 'https://kworb.net/charts/apple_s/ru.html'),
    ('cn', 'Trung Quốc · Apple Music top 200', 'https://kworb.net/charts/apple_s/cn.html'),
]

def charts():
    old = load(CHARTS_OUT) or {}
    out = {}
    for key, name, url in CHARTS:
        raw = fetch(url, 'text/html')
        if not raw:
            if (old.get('charts') or {}).get(key): out[key] = old['charts'][key]
            continue
        b = raw.decode('utf-8', 'ignore')
        d = re.search(r'(\d{4}/\d{2}/\d{2})', b) or re.search(r'(\d{4}-\d{2}-\d{2})', b)
        rows = []
        for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', b, re.S):
            tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S)
            if len(tds) < 3 or not re.fullmatch(r'\s*\d+\s*', re.sub(r'<[^>]+>', '', tds[0])): continue
            cell = next((c for c in tds if ' - ' in re.sub(r'<[^>]+>', '', c)), '')
            text = html.unescape(re.sub(r'<[^>]+>', '', cell)).strip()
            if ' - ' not in text: continue
            artist, title = text.split(' - ', 1)
            row = {'p': int(re.sub(r'<[^>]+>', '', tds[0])), 'a': artist.strip(), 't': title.strip(), 'c': html.unescape(re.sub(r'<[^>]+>', '', tds[1])).strip()}
            sp = re.search(r'track/([A-Za-z0-9]{22})\.html', cell)
            if sp: row['sp'] = sp.group(1)
            rows.append(row)
        rows.sort(key=lambda r: r['p'])
        if rows: out[key] = {'name': name, 'date': d.group(1) if d else '', 'src': url, 'items': rows[:200]}
        elif (old.get('charts') or {}).get(key): out[key] = old['charts'][key]
        print(f'chart {key}: {len(rows)} bài, ngày {d.group(1) if d else "?"}')
        time.sleep(.5)
    if not out: return
    if old.get('charts') == out: print('Bảng xếp hạng không đổi'); return
    save(CHARTS_OUT, {'charts': out, 'updated': now_iso()})

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
    if HEAVY:
        try: music()
        except Exception as e: print('Nhạc mới lỗi', repr(e)[:300])
        try: charts()
        except Exception as e: print('Bảng xếp hạng lỗi', repr(e)[:300])
        try: release_sync()
        except Exception as e: print('Album phát hành lỗi', repr(e)[:300])
    if not changed: return
    parts = (['Letterboxd'] if LB_OUT in changed else []) + (['nhạc mới'] if MUSIC_OUT in changed else []) + (['bảng xếp hạng'] if CHARTS_OUT in changed else []) + (['album phát hành'] if RELEASES_OUT in changed else [])
    msg = 'Studio: cập nhật ' + ' + '.join(parts)
    if os.environ.get('GITHUB_ACTIONS'): print(f'::notice title=studio-sync::{msg}')
    if not DRY: push(msg)

if __name__ == '__main__':
    main()
