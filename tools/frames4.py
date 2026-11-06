import urllib.request, urllib.parse, re, json
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
def get(u, extra=None, n=1500000):
    h = {'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9'}
    if extra: h.update(extra)
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=h), timeout=25); return r.status, r.headers, r.read(n).decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e: return e.code, e.headers, (e.read(3000).decode('utf-8', 'ignore') if e.fp else '')
    except Exception as e: return 0, {}, repr(e)
out = []
IFR = {'Sec-Fetch-Dest': 'iframe', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'cross-site', 'Referer': 'https://tsukustukatadotojo-bit.github.io/'}
def fa(h):
    if not h: return '-'
    csp = h.get('Content-Security-Policy') or ''
    m = re.search(r'frame-ancestors[^;]*', csp)
    return f'XFO={h.get("X-Frame-Options")} FA={m.group(0) if m else None} cf={h.get("cf-mitigated")}'
FR = ['https://www.albumoftheyear.org/', 'https://www.albumoftheyear.org/releases/this-week/', 'https://rateyourmusic.com/new-music/',
 'https://www.pastemagazine.com/music', 'https://www.npr.org/music/', 'https://www.npr.org/sections/allsongs/', 'https://pitchfork.com/reviews/albums/',
 'https://www.stereogum.com/', 'https://hypem.com/latest', 'https://daily.bandcamp.com/', 'https://consequence.net/category/reviews/album-reviews/',
 'https://www.nme.com/reviews/album', 'https://kworb.net/spotify/country/vn_daily.html', 'https://www.thelineofbestfit.com/new-music',
 'https://www.billboard.com/charts/hot-100/', 'https://genius.com/', 'https://www.metacritic.com/browse/game/', 'https://musicboard.app/',
 'https://www.udiscovermusic.com/new-releases/', 'https://www.albumoftheyear.org/user/anrevy/', 'https://streamimdb.ru/', 'https://www.imdb.com/',
 'https://www.last.fm/music/+releases/out-now', 'https://www.discogs.com/', 'https://bandcamp.com/', 'https://www.youtube.com/embed/videoseries?list=PL4fGSI1pDJn6puJdseH2Rt9sMvt9E2M4i']
FR = []
for u in FR:
    st, h, b = get(u, IFR, 300000)
    t = re.search(r'<title[^>]*>(.*?)</title>', b, re.S)
    out.append(f'FRAME {st} {fa(h)} {u} title={(t.group(1).strip()[:50] if t else "")!r}')
RSS = ['https://pitchfork.com/feed/feed-album-reviews/rss', 'https://pitchfork.com/feed/feed-track-reviews/rss', 'https://pitchfork.com/rss/reviews/best/albums/',
 'https://www.pastemagazine.com/music/feed', 'https://www.pastemagazine.com/feed', 'https://feeds.npr.org/1039/rss.xml', 'https://feeds.npr.org/1108/rss.xml',
 'https://www.stereogum.com/feed/', 'https://consequence.net/feed/', 'https://www.nme.com/reviews/album/feed', 'https://www.albumoftheyear.org/rss/',
 'https://www.thelineofbestfit.com/feeds/new-music', 'https://daily.bandcamp.com/feed', 'https://hypem.com/feed/popular/now/1/feed.xml']
for u in RSS:
    st, h, b = get(u, {'Accept': 'application/rss+xml,application/xml,*/*'})
    items = re.findall(r'<item[ >].*?<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>', b, re.S)
    out.append(f'RSS {st} n={len(items)} {u} first={items[:3]}')
O = {'Origin': 'https://tsukustukatadotojo-bit.github.io'}
st, h, b = get('https://itunes.apple.com/search?term=' + urllib.parse.quote('mitski my love mine all mine') + '&entity=song&limit=3', O)
am = None
try:
    j = json.loads(b); am = j['results'][0]['trackViewUrl'] if j.get('results') else None
except Exception: pass
out.append(f'ITUNES {st} ACAO={h.get("Access-Control-Allow-Origin") if h else None} first={am}')
if am:
    st, h, b = get('https://api.song.link/v1-alpha.1/links?userCountry=VN&url=' + urllib.parse.quote(am), O)
    sp = re.search(r'open\.spotify\.com/track/([A-Za-z0-9]{22})', b)
    out.append(f'SONGLINK {st} ACAO={h.get("Access-Control-Allow-Origin") if h else None} spotify={sp.group(1) if sp else None} body={b[:120]!r}')
for u in ['https://lastfm-recently-played.vercel.app/api?user=Anrevy&count=5', 'https://lastfm-last-played.biancarosa.com.br/Anrevy/latest-song',
          'https://lastfm-last-played.biancarosa.com.br/rj/latest-song']:
    st, h, b = get(u, O)
    txt = ' / '.join(t.strip() for t in re.findall(r'>([^<>]+)<', b) if t.strip())[:200] if '<svg' in b else b[:200]
    out.append(f'LFM {st} ACAO={h.get("Access-Control-Allow-Origin") if h else None} {u} -> {txt!r}')
st, h, b = get('https://www.last.fm/user/Anrevy')
names = re.findall(r'class="chartlist-name"[^>]*>\s*<a[^>]*title="([^"]+)"', b)
hid = 'hidden' in b.lower() and 'recent' in b.lower()
sc = re.search(r'Scrobbles</h4>\s*<p[^>]*>\s*<a[^>]*>([\d,]+)', b)
out.append(f'LFMPAGE {st} tracks={names[:5]} scrobbles={sc.group(1) if sc else None} hiddenWord={hid} recentSec={"recent-tracks" in b}')
st, h, b = get('https://open.spotify.com/user/315rpcaxgfhfg4tdfaxhmdlhcy3u')
pl = sorted(set(re.findall(r'(?:spotify:playlist:|/playlist/)([A-Za-z0-9]{22})', b)))
t = re.search(r'<title>(.*?)</title>', b)
og = re.findall(r'<meta[^>]+(?:property|name)="(og:[^"]+|music:[^"]+)"[^>]+content="([^"]*)"', b)
out.append(f'SPUSER {st} title={t.group(1) if t else None} playlists={pl[:10]} og={og[:8]}')
for p in ['37i9dQZF1DX4JAvHpjipBk', '37i9dQZF1DXcBWIGoYBM5M', '37i9dQZF1DWVOaOWiz6sdh']:
    st, h, b = get('https://open.spotify.com/embed/playlist/' + p, IFR)
    t = re.search(r'<title>(.*?)</title>', b)
    out.append(f'SPEMB {p} {st} {fa(h)} {t.group(1) if t else ""}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
