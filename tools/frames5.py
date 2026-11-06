import urllib.request, re
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
def get(u, extra=None, n=1500000):
    h = {'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9'}
    if extra: h.update(extra)
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=h), timeout=25); return r.status, r.headers, r.read(n).decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e: return e.code, e.headers, ''
    except Exception as e: return 0, {}, repr(e)
out = []
for u in ['https://pitchfork.com/feed/feed-album-reviews/rss', 'https://pitchfork.com/feed/feed-track-reviews/rss', 'https://www.stereogum.com/feed/', 'https://www.nme.com/reviews/album/feed', 'https://feeds.npr.org/1039/rss.xml', 'https://daily.bandcamp.com/feed', 'https://consequence.net/feed/']:
    st, h, b = get(u)
    it = re.search(r'<item[ >](.*?)</item>', b, re.S)
    x = re.sub(r'\s+', ' ', it.group(1))[:1300] if it else 'none'
    out.append(f'== {u} {st}: {x}')
st, h, b = get('https://letterboxd.com/haanvie/watchlist/')
slugs = re.findall(r'data-(?:film-slug|item-slug|target-link)="([^"]+)"', b)
names = re.findall(r'data-(?:film-name|item-name)="([^"]+)"', b)
alts = re.findall(r'<img[^>]+alt="([^"]+)"', b)
cnt = re.search(r'([\d,]+)\s*films?', b)
out.append(f'== WATCHLIST {st} len={len(b)} slugs={slugs[:8]} names={names[:8]} alts={alts[:10]} cnt={cnt.group(0) if cnt else None} title={re.search(r"<title>(.*?)</title>", b, re.S).group(1)[:80] if "<title>" in b else ""}')
m = re.search(r'<li class="[^"]*poster-container[^"]*".{0,1200}', b, re.S) or re.search(r'react-component.{0,1200}', b, re.S)
out.append('== WL SNIP ' + (re.sub(r'\s+', ' ', m.group(0))[:1200] if m else 'none'))
st, h, b = get('https://letterboxd.com/haanvie/watchlist/rss/'); out.append(f'== WL RSS {st} len={len(b)}')
st, h, b = get('https://letterboxd.com/ajax/poster/film/the-godfather/std/125x187/'); out.append(f'== POSTER AJAX {st} {re.sub(r"\s+"," ",b)[:400]}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
