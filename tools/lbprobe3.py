import urllib.request, urllib.parse, re, json, html
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
out = []
def get(u, extra=None, n=3000000):
    h = {'User-Agent': UA, 'Accept': 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9'}
    if extra: h.update(extra)
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=h), timeout=30); return r.status, r.headers, r.read(n).decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e: return e.code, e.headers, ''
    except Exception as e: return 0, {}, repr(e)
st, h, b = get('https://letterboxd.com/haanvie/films/')
names = re.findall(r'data-item-name="([^"]+)"', b)
out.append(f'FILMS {st} n={len(names)} first={names[:12]}')
m = re.search(r'<li class="griditem[^"]*".{0,2200}', b, re.S); out.append('SNIP ' + (re.sub(r'\s+', ' ', m.group(0))[:2200] if m else 'none'))
srt = re.findall(r'(?:Sort by|sort-by|smenu-subtitle)[^<]{0,80}<[^>]*>[^<]{0,60}', b)[:4]; out.append(f'SORT {srt}')
out.append('RATED ' + str(re.findall(r'rated-(\d+)', b)[:12]) + ' liked=' + str(b.count('icon-liked')))
out.append('PAGES ' + str(re.findall(r'/haanvie/films/page/(\d+)/', b)[-3:]) + ' total=' + str(re.findall(r'([\d,]+)&nbsp;films|([\d,]+) films', b)[:3]))
st, h, b = get('https://letterboxd.com/haanvie/watchlist/')
out.append('WL first=' + str(re.findall(r'data-item-name="([^"]+)"', b)[:5]) + ' sortinfo=' + str(re.findall(r'(?:When added|Newest first|Shuffle|Film name)[^<]{0,30}', b)[:5]))
for q in ['la haine', '2046', 'in the mood for love', 'mat biec', 'amélie']:
    qs = q
    st, h, b = get('https://sg.media-imdb.com/suggests/' + qs[0] + '/' + urllib.parse.quote(qs) + '.json')
    out.append(f'JSONP {st} {q!r} -> {b[:60]!r}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
