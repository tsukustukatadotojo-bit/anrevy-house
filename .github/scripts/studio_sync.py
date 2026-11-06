"""Studio: lấy nhật ký phim Letterboxd (RSS công khai) của haanvie, lưu thành studio/data/letterboxd.json.
Letterboxd không cho hiển thị trang của họ trong khung (X-Frame-Options), nên trang Studio đọc file JSON này.
Chạy định kỳ trên GitHub Actions; chỉ commit khi dữ liệu thay đổi.  Chạy thử: python3 studio_sync.py --dry
"""
import html, json, os, re, subprocess, sys, time, urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

LB_USER = 'haanvie'
OUT = 'studio/data/letterboxd.json'
MAX_ITEMS = 40
DRY = '--dry' in sys.argv
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

def fetch(url):
    for i in range(3):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/rss+xml,application/xml,*/*'}), timeout=30)
            return r.read()
        except Exception as e:
            print('lỗi tải', url, repr(e)); time.sleep(5 + i * 5)
    return None

def local(tag): return tag.rsplit('}', 1)[-1]

def text_of(desc):
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

def main():
    raw = fetch(f'https://letterboxd.com/{LB_USER}/rss/')
    if not raw: print('không tải được RSS, giữ dữ liệu cũ'); return
    root = ET.fromstring(raw)
    ch = root.find('channel')
    items, name = [], ''
    for it in ch.findall('item'):
        f = {local(c.tag): (c.text or '').strip() for c in it}
        if not f.get('filmTitle'): continue                # bỏ các danh sách (list), chỉ giữ phim
        poster, review = text_of(f.get('description', ''))
        name = name or f.get('creator', '')
        try: pub = parsedate_to_datetime(f.get('pubDate')).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        except Exception: pub = ''
        rating = f.get('memberRating')
        items.append({
            'title': f['filmTitle'], 'year': f.get('filmYear', ''), 'rating': float(rating) if rating else None,
            'liked': f.get('memberLike') == 'Yes', 'rewatch': f.get('rewatch') == 'Yes',
            'watched': f.get('watchedDate', ''), 'published': pub,
            'poster': poster, 'review': review[:6000], 'link': f.get('link', ''), 'tmdb': f.get('movieId', ''),
        })
        if len(items) >= MAX_ITEMS: break
    data = {'user': LB_USER, 'name': name, 'profile': f'https://letterboxd.com/{LB_USER}/', 'items': items}
    old = None
    if os.path.exists(OUT):
        try: old = json.load(open(OUT, encoding='utf-8'))
        except Exception: old = None
    if old and old.get('items') == items and old.get('name') == name:
        print('Letterboxd không đổi', len(items), 'phim'); return
    data['updated'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as fh: json.dump(data, fh, ensure_ascii=False, indent=1)
    print('Letterboxd cập nhật', len(items), 'phim')
    if os.environ.get('GITHUB_ACTIONS'): print(f'::notice title=studio-sync::Letterboxd {len(items)} phim, mới nhất: {items[0]["title"] if items else "-"}')
    if not DRY: push('Studio: cập nhật nhật ký Letterboxd')

def git(*a): return subprocess.run(['git', *a], capture_output=True, text=True)

def push(msg):
    git('config', 'user.name', 'github-actions[bot]')
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
    git('add', OUT)
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

if __name__ == '__main__':
    main()
