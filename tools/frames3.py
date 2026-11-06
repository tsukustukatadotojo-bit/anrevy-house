import urllib.request, re
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
def get(u, extra=None):
    h = {'User-Agent': UA, 'Accept': '*/*'}
    if extra: h.update(extra)
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=h), timeout=25); return r.status, r.headers, r.read(2000000).decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e: return e.code, e.headers, ''
    except Exception as e: return 0, {}, repr(e)
out = []
st, h, b = get('https://lastfm-recently-played.vercel.app/api?user=Anrevy&count=5')
out.append('SVG ' + str(st) + ' TEXT: ' + ' / '.join(t.strip() for t in re.findall(r'>([^<>]+)<', b) if t.strip())[:500])
st, h, b = get('https://letterboxd.com/haanvie/rss/')
it = re.search(r'<item>(.*?)</item>', b, re.S)
out.append('RSS ITEM: ' + (it.group(1)[:1500] if it else 'none').replace('\n', ' '))
img = re.search(r'src="(https://a\.ltrbxd\.com[^"]+)"', b)
if img:
    st, h, b2 = get(img.group(1), {'Referer': 'https://tsukustukatadotojo-bit.github.io/'})
    out.append(f'POSTER {st} ct={h.get("Content-Type")} corp={h.get("Cross-Origin-Resource-Policy")} len={len(b2)}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
