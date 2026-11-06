# Trang nào cho phép nhúng trong khung (iframe)? In X-Frame-Options, CSP frame-ancestors, CORS
import urllib.request, re
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
URLS = ['https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M', 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
        'https://letterboxd.com/', 'https://letterboxd.com/film/parasite-2019/', 'https://letterboxd.com/dave/rss/', 'https://letterboxd.com/dave/films/diary/',
        'https://www.last.fm/', 'https://www.last.fm/user/rj', 'https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=rj&format=json',
        'https://www.albumoftheyear.org/', 'https://www.albumoftheyear.org/user/anthony/',
        'https://www.instagram.com/instagram/', 'https://www.instagram.com/instagram/embed/', 'https://www.instagram.com/p/C0yDqNnMyxS/embed/',
        'https://www.imdb.com/', 'https://www.justwatch.com/', 'https://hackertyper.neocities.org/', 'https://stdhoom.neocities.org/']
out = []
for u in URLS:
    try:
        req = urllib.request.Request(u, headers={'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,*/*', 'Origin': 'https://tsukustukatadotojo-bit.github.io'})
        r = urllib.request.urlopen(req, timeout=20); st = r.status; h = r.headers; body = r.read(400000)
    except urllib.error.HTTPError as e:
        st = e.code; h = e.headers; body = b''
    except Exception as e:
        out.append(f'{u} ERR {e!r}'); continue
    csp = h.get('Content-Security-Policy') or ''
    fa = re.search(r'frame-ancestors[^;]*', csp)
    out.append(f'{st} {u}\n    XFO={h.get("X-Frame-Options")} | {fa.group(0) if fa else "no frame-ancestors"} | ACAO={h.get("Access-Control-Allow-Origin")} | CF={h.get("cf-mitigated") or h.get("Server")} | len={len(body)}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
