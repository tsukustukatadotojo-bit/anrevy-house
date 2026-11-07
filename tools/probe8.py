import urllib.request, re
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
out = []
def get(u, extra=None, n=400000):
    h = {'User-Agent': UA, 'Accept': 'text/html,text/css,*/*', 'Accept-Language': 'en-US,en;q=0.9'}
    if extra: h.update(extra)
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=h), timeout=25); return r.status, r.headers, r.read(n).decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e: return e.code, e.headers, ''
    except Exception as e: return 0, {}, repr(e)
IFR = {'Sec-Fetch-Dest': 'iframe', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'cross-site', 'Referer': 'https://tsukustukatadotojo-bit.github.io/'}
for u in ['https://keep.google.com/u/0/#home', 'https://app.standardnotes.com/', 'https://noclip.website/', 'https://sealo.neocities.org/', 'https://message.neocities.org/', 'https://www.newgrounds.com/', 'https://www.getafteritmedia.com/retrotv', 'https://club404.neocities.org/', 'https://neocities.org/']:
    st, h, b = get(u, IFR)
    csp = (h.get('Content-Security-Policy') or '') if h else ''
    t = re.findall(r'<title[^>]*>(.*?)</title>', b, re.S)
    d = re.findall(r'<meta[^>]+name="description"[^>]+content="([^"]{0,160})', b)
    out.append(f'{st} XFO={h.get("X-Frame-Options") if h else None} FA={re.findall(r"frame-ancestors[^;]*", csp)} {u} title={t[:1]} desc={d[:1]}')
for fam in ['Pixelify+Sans', 'Handjet', 'Tiny5', 'Jersey+10', 'Micro+5', 'Silkscreen', 'Press+Start+2P', 'DotGothic16', 'Sixtyfour', 'Bytesized', 'Workbench', 'Pixelify+Sans:wght@400', 'Jacquard+12', 'Kode+Mono', 'Pixel+Operator']:
    st, h, b = get('https://fonts.googleapis.com/css2?family=' + fam + '&display=swap', {'User-Agent': UA})
    out.append(f'FONT {fam}: {st} subsets={re.findall(r"/\* ([\w-]+) \*/", b)}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
