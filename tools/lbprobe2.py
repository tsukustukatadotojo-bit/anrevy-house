import urllib.request, urllib.parse, re, json, html
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
out = []
def get(u, extra=None, n=2000000, method='GET'):
    h = {'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'en-US,en;q=0.9'}
    if extra: h.update(extra)
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=h, method=method), timeout=30); return r.status, r.headers, r.read(n).decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e: return e.code, e.headers, ''
    except Exception as e: return 0, {}, repr(e)
O = {'Origin': 'https://tsukustukatadotojo-bit.github.io', 'Referer': 'https://tsukustukatadotojo-bit.github.io/'}
for u in ['https://sg.media-imdb.com/suggests/b/before%20sunrise.json', 'https://sg.media-imdb.com/suggests/b/before.json', 'https://v2.sg.media-imdb.com/suggestion/b/before_sunrise.json', 'https://v3.sg.media-imdb.com/suggestion/x/before%20sunrise.json?includeVideos=0&callback=cb']:
    st, h, b = get(u, O); out.append(f'IMDB {st} ct={h.get("Content-Type") if h else None} ACAO={h.get("Access-Control-Allow-Origin") if h else None} {u} -> {b[:160]!r}')
st, h, b = get('https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'generator': 'search', 'gsrsearch': 'before sunrise film', 'gsrlimit': 8, 'prop': 'pageimages|description|pageprops', 'piprop': 'thumbnail', 'pithumbsize': 200, 'ppprop': 'wikibase_item', 'format': 'json', 'origin': '*'}), O)
try:
    j = json.loads(b); ps = sorted(j['query']['pages'].values(), key=lambda p: p.get('index', 0))
    out.append('WIKI ' + str([(p['title'], p.get('description'), bool(p.get('thumbnail')), p.get('pageprops', {}).get('wikibase_item')) for p in ps]))
except Exception as e: out.append('WIKI ERR ' + repr(e) + b[:200])
st, h, b = get('https://letterboxd.com/haanvie/watchlist/', {'Accept': 'text/html'})
items = re.findall(r'data-item-name="([^"]+)"\s+data-item-slug="([^"]+)".*?data-postered-identifier=\'([^\']+)\'.*?data-resolvable-poster-path=\'([^\']+)\'', b, re.S)
out.append(f'WL {st} n={len(items)}')
for name, slug, pid, rp in items[:3]:
    pid = json.loads(html.unescape(pid)); rp = json.loads(html.unescape(rp)); fid = pid['uid'].split(':')[1]
    url = f'https://a.ltrbxd.com/resized/film-poster/{"/".join(fid)}/{fid}-{slug}-0-150-0-225-crop.jpg?v={rp.get("cacheBustingKey")}'
    st2, h2, b2 = get(url, {'Referer': 'https://letterboxd.com/'}, n=100)
    out.append(f'  {name} {fid} poster {st2} {h2.get("Content-Type") if h2 else None} {url}')
st, h, b = get('https://letterboxd.com/film/farewell-my-concubine/json/', {'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest'})
out.append(f'FILMJSON {st} {b[:600]!r}')
st, h, b = get('https://letterboxd.com/haanvie/rss/')
out.append('RSS ' + str(st) + ' ' + str(re.findall(r'<title>(.*?)</title>', b)[:8]) + ' ' + str(re.findall(r'<letterboxd:watchedDate>(.*?)<', b)[:8]))
for u in ['https://letterboxd.com/haanvie/films/', 'https://letterboxd.com/haanvie/films/page/1/', 'https://letterboxd.com/haanvie/films/by/date/page/1/', 'https://letterboxd.com/haanvie/films/diary/page/1/', 'https://letterboxd.com/haanvie/films/reviews/']:
    st, h, b = get(u, {'Accept': 'text/html'}); out.append(f'LB {st} {u} n={len(re.findall(r"data-item-slug=", b))}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
