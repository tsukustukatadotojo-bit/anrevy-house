import urllib.request, urllib.parse, re, json, asyncio
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
out = []
def get(u, extra=None, n=2000000):
    h = {'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9'}
    if extra: h.update(extra)
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=h), timeout=30); return r.status, r.headers, r.read(n).decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e: return e.code, e.headers, ''
    except Exception as e: return 0, {}, repr(e)
def summ(b):
    names = re.findall(r'data-(?:item-name|film-name)="([^"]+)"', b)
    slugs = re.findall(r'data-(?:item-slug|film-slug)="([^"]+)"', b)
    alts = re.findall(r'<img[^>]+alt="([^"]{2,60})"', b)
    return f'names={names[:6]} slugs={slugs[:4]} alts={alts[:6]} n={len(names) or len(slugs)}'
LB = ['https://letterboxd.com/haanvie/watchlist/', 'https://letterboxd.com/haanvie/films/by/date/', 'https://letterboxd.com/haanvie/films/diary/', 'https://letterboxd.com/haanvie/']
for u in LB:
    st, h, b = get(u); out.append(f'URLLIB {st} {u} {summ(b)}')
try:
    from curl_cffi import requests as cr
    for u in LB:
        try:
            r = cr.get(u, impersonate='chrome', timeout=30); out.append(f'CFFI {r.status_code} {u} {summ(r.text)} title={re.search(r"<title>(.*?)</title>", r.text, re.S).group(1)[:60] if "<title>" in r.text else ""}')
            if r.status_code == 200 and 'watchlist' in u:
                m = re.search(r'<li[^>]*class="[^"]*(?:poster-container|griditem)[^"]*".{0,1500}', r.text, re.S)
                out.append('  SNIP ' + (re.sub(r'\s+', ' ', m.group(0))[:1500] if m else 'none'))
                cnt = re.findall(r'(\d[\d,]*)\s*(?:films|&nbsp;films)', r.text)[:3]; out.append(f'  count={cnt} pages={re.findall(r"/watchlist/page/(\d+)/", r.text)[-3:]}')
        except Exception as e: out.append(f'CFFI ERR {u} {e!r}'[:200])
except Exception as e: out.append('no curl_cffi ' + repr(e))
st, h, b = get('https://r.jina.ai/https://letterboxd.com/haanvie/watchlist/', {'Accept': 'text/plain'}); out.append(f'JINA {st} len={len(b)} head={b[:300]!r}')
# IMDb suggestion
O = {'Origin': 'https://tsukustukatadotojo-bit.github.io'}
st, h, b = get('https://v3.sg.media-imdb.com/suggestion/x/before%20sunrise.json', O)
out.append(f'IMDBSUG {st} ACAO={h.get("Access-Control-Allow-Origin") if h else None} body={b[:400]!r}')
st, h, b = get('https://v3.sg.media-imdb.com/suggestion/titles/x/la%20haine.json', O); out.append(f'IMDBSUG2 {st} ACAO={h.get("Access-Control-Allow-Origin") if h else None} body={b[:200]!r}')
st, h, b = get('https://en.wikipedia.org/api/rest_v1/page/summary/Before_Sunrise', O); out.append(f'WIKI {st} ACAO={h.get("Access-Control-Allow-Origin") if h else None} thumb={re.search(r"\"thumbnail\":\{\"source\":\"([^\"]+)", b).group(1) if "thumbnail" in b else None}')
# kworb charts
for u in ['https://kworb.net/spotify/country/us_daily.html', 'https://kworb.net/spotify/country/gb_daily.html', 'https://kworb.net/charts/apple_s/ru.html', 'https://kworb.net/charts/apple_s/cn.html', 'https://kworb.net/charts/itunes/ru.html', 'https://kworb.net/charts/apple_s/gb.html', 'https://kworb.net/charts/apple_s/us.html']:
    st, h, b = get(u)
    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', b, re.S)
    t = re.search(r'<title>(.*?)</title>', b)
    out.append(f'KWORB {st} {u} title={t.group(1) if t else ""} rows={len(rows)} r1={re.sub(r"\s+"," ",rows[1])[:500] if len(rows)>1 else ""}')
    ids = re.findall(r'open\.spotify\.com/track/([A-Za-z0-9]{22})', b); out.append(f'   spids={len(ids)} sample={ids[:2]}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
async def pw():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(user_agent=UA)
        await pg.goto('https://letterboxd.com/haanvie/watchlist/', wait_until='domcontentloaded'); await pg.wait_for_timeout(12000)
        html = await pg.content()
        out.append(f'PW title={await pg.title()} {summ(html)}')
        await b.close()
try: asyncio.run(pw())
except Exception as e: out.append('PW ERR ' + repr(e)[:200])
print('\n'.join(out[-1:])); open('out_gal.txt', 'w').write('\n'.join(out))
