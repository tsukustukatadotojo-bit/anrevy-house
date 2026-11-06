import urllib.request, re, json
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
def get(u, extra=None):
    h = {'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9'}
    if extra: h.update(extra)
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=h), timeout=25); return r.status, r.headers, r.read(2000000).decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e: return e.code, e.headers, ''
    except Exception as e: return 0, {}, repr(e)
out = []
st, h, b = get('https://open.spotify.com/user/315rpcaxgfhfg4tdfaxhmdlhcy3u')
pl = sorted(set(re.findall(r'(?:spotify:playlist:|/playlist/)([A-Za-z0-9]{22})', b)))
out.append(f'spotify user page {st} len={len(b)} playlists={pl[:12]} title={re.search(r"<title>(.*?)</title>", b).group(1) if "<title>" in b else ""}')
for p in pl[:6]:
    st2, h2, b2 = get('https://open.spotify.com/embed/playlist/' + p)
    t = re.search(r'<title>(.*?)</title>', b2)
    out.append(f'  embed {p} {st2} {t.group(1) if t else ""}')
st, h, b = get('https://open.spotify.com/embed/user/315rpcaxgfhfg4tdfaxhmdlhcy3u'); out.append(f'spotify embed/user {st} len={len(b)}')
st, h, b = get('https://letterboxd.com/haanvie/rss/')
items = re.findall(r'<item>.*?<title>(.*?)</title>.*?</item>', b, re.S)
out.append(f'letterboxd rss {st} items={len(items)} first={items[:4]}')
st, h, b = get('https://www.last.fm/user/Anrevy')
names = re.findall(r'class="chartlist-name"[^>]*>\s*<a[^>]*title="([^"]+)"', b)
out.append(f'lastfm user page {st} len={len(b)} tracks={names[:5]} snippet={b[:160]!r}')
for u in ['https://lastfm-recently-played.vercel.app/api?user=Anrevy', 'https://lastfm-recently-played.vercel.app/api?user=Anrevy&count=5']:
    st, h, b = get(u, {'Accept': 'image/svg+xml,*/*'}); out.append(f'{u} {st} ct={h.get("Content-Type") if h else None} len={len(b)}')
st, h, b = get('https://www.albumoftheyear.org/user/anrevy/'); out.append(f'aoty {st} len={len(b)} cf={h.get("cf-mitigated") if h else None}')
for u in ['https://www.instagram.com/p/C0yDqNnMyxS/embed/captioned/', 'https://www.instagram.com/_haanvie_/embed/', 'https://www.instagram.com/anrevy_/embed/']:
    st, h, b = get(u, {'Sec-Fetch-Dest': 'iframe', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'cross-site', 'Referer': 'https://tsukustukatadotojo-bit.github.io/'})
    out.append(f'{u} {st} XFO={h.get("X-Frame-Options") if h else None} len={len(b)} has_media={"EmbeddedMedia" in b or "embed" in b[:5000]}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
