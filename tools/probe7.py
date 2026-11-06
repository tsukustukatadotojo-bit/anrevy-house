import urllib.request, urllib.parse, re, json
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
out = []
def get(u, extra=None, n=3000000, data=None):
    h = {'User-Agent': UA, 'Accept': 'text/html,application/json,application/xml,*/*', 'Accept-Language': 'en-US,en;q=0.9'}
    if extra: h.update(extra)
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=h, data=data), timeout=25); return r.status, r.headers, r.read(n).decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e: return e.code, e.headers, (e.read(400).decode('utf-8','ignore') if e.fp else '')
    except Exception as e: return 0, {}, repr(e)
IFR = {'Sec-Fetch-Dest': 'iframe', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'cross-site', 'Referer': 'https://tsukustukatadotojo-bit.github.io/'}
for u in ['https://poolsuite.net/', 'https://hypem.com/popular', 'https://bandcamp.com/discover?s=new', 'https://bandcamp.com/discover', 'https://somafm.com/player24/', 'https://magenta.github.io/lofi-player/', 'https://bandcamp.com/EmbeddedPlayer/album=1/size=large/']:
    st, h, b = get(u, IFR)
    csp = (h.get('Content-Security-Policy') or '') if h else ''
    out.append(f'FRAME {st} XFO={h.get("X-Frame-Options") if h else None} FA={re.findall(r"frame-ancestors[^;]*", csp)} {u} title={re.findall(r"<title>(.*?)</title>", b, re.S)[:1]}')
for u in ['https://hypem.com/feed/popular/now/1/feed.xml', 'https://hypem.com/playlist/popular/3day/json/1/data.js', 'https://hypem.com/playlist/popular/now/json/1/data.js', 'https://api.hypem.com/v2/popular?mode=now&count=20', 'https://hypem.com/feed/popular/3day/1/feed.xml']:
    st, h, b = get(u); out.append(f'HYPEM {st} {u} ct={h.get("Content-Type") if h else None} {b[:400]!r}')
for u in ['https://bandcamp.com/api/discover/3/get_web?g=all&s=new&p=0&gn=0&f=all&w=0', 'https://bandcamp.com/api/discover/1/discover_web']:
    if 'discover_web' in u:
        body = json.dumps({'category_id': 0, 'tag_norm_names': [], 'geoname_id': 0, 'slice': 'new', 'time_facet_id': None, 'cursor': '*', 'size': 30, 'include_result_types': ['a', 's']}).encode()
        st, h, b = get(u, {'Content-Type': 'application/json'}, data=body)
    else: st, h, b = get(u)
    out.append(f'BANDCAMP {st} {u} {b[:700]!r}')
st, h, b = get('https://bandcamp.com/discover?s=new')
m = re.search(r'data-blob="([^"]{0,600})', b); out.append(f'BCPAGE {st} len={len(b)} blob={m.group(1)[:600] if m else None}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
