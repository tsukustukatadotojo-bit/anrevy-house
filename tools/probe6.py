import urllib.request, urllib.parse, re, json
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
out = []
def get(u, extra=None, n=3000000):
    h = {'User-Agent': UA, 'Accept': 'text/html,application/xml,*/*', 'Accept-Language': 'en-US,en;q=0.9'}
    if extra: h.update(extra)
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=h), timeout=25); return r.status, r.headers, r.read(n).decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e: return e.code, e.headers, ''
    except Exception as e: return 0, {}, repr(e)
IFR = {'Sec-Fetch-Dest': 'iframe', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'cross-site', 'Referer': 'https://tsukustukatadotojo-bit.github.io/'}
for u in ['https://plaza.one/', 'https://plaza.one/?ref=producthunt']:
    st, h, b = get(u, IFR)
    csp = (h.get('Content-Security-Policy') or '') if h else ''
    out.append(f'PLAZA {st} XFO={h.get("X-Frame-Options") if h else None} FA={re.findall(r"frame-ancestors[^;]*", csp)} len={len(b)} title={re.findall(r"<title>(.*?)</title>", b)[:1]}')
for u in ['https://api.plaza.one/status', 'https://radio.plaza.one/mp3']:
    st, h, b = get(u, {'Origin': 'https://tsukustukatadotojo-bit.github.io'}, n=600)
    out.append(f'PLAZAAPI {st} ct={h.get("Content-Type") if h else None} ACAO={h.get("Access-Control-Allow-Origin") if h else None} {b[:300]!r}')
FEEDS = ['https://www.theguardian.com/music/rss', 'https://www.brooklynvegan.com/feed/', 'https://www.thefader.com/rss', 'https://www.clashmusic.com/feed/', 'https://www.rollingstone.com/music/music-news/feed/', 'https://www.billboard.com/c/music/music-news/feed/', 'https://pitchfork.com/feed/feed-news/rss', 'https://www.nme.com/news/music/feed', 'https://thequietus.com/feed', 'https://www.gorillavsbear.net/feed/', 'https://diymag.com/feed', 'https://exclaim.ca/feeds/rss/music', 'https://www.undertheradarmag.com/rss', 'https://consequence.net/category/new-music/feed/', 'https://www.stereogum.com/category/music/feed/', 'https://www.pastemagazine.com/feeds/music', 'https://www.spin.com/feed/', 'https://www.complex.com/music/rss', 'https://www.udiscovermusic.com/feed/', 'https://www.kerrang.com/feed.rss', 'https://www.allkpop.com/feed', 'https://www.soompi.com/feed', 'https://pitchfork.com/feed/feed-best-new-music/rss', 'https://pitchfork.com/rss/reviews/best/tracks/']
for u in FEEDS:
    st, h, b = get(u)
    items = re.findall(r'<item[ >].*?<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>', b, re.S)
    dates = re.findall(r'<pubDate>(.*?)</pubDate>', b)[:2]
    out.append(f'RSS {st} n={len(items)} {u} first={[t.strip()[:70] for t in items[:3]]} d={dates[:1]}')
st, h, b = get('https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'list': 'search', 'srsearch': 'List of 2026 albums', 'format': 'json', 'srlimit': 6}))
out.append('WIKISEARCH ' + str([x['title'] for x in json.loads(b)['query']['search']]) if b.startswith('{') else 'WIKISEARCH ERR')
for t in ['List of 2026 albums', 'List of 2026 albums (July–December)']:
    st, h, b = get('https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'parse', 'page': t, 'prop': 'sections|wikitext', 'format': 'json', 'redirects': 1}))
    try:
        j = json.loads(b)['parse']; wt = j['wikitext']['*']
        out.append(f'WIKI {t!r}: sections={[s["line"] for s in j["sections"]][:20]} len={len(wt)}')
        i = wt.find('November'); out.append('  SNIP ' + wt[i:i + 1400].replace('\n', ' ⏎ '))
    except Exception as e: out.append(f'WIKI {t!r} ERR {e!r} {b[:200]!r}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
