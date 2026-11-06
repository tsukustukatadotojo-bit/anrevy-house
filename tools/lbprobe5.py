import urllib.request, re, html
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
out = []
def get(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9'}), timeout=30); return r.status, r.read().decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e: return e.code, ''
st, b = get('https://letterboxd.com/haanvie/films/')
names = re.findall(r'data-item-name="([^"]+)"', b)
yrs = [int(m) for m in re.findall(r'\((\d{4})\)"', ' '.join(f'"{n}"' for n in names))]
out.append(f'FILMS {st} years={yrs}')
mono = all(yrs[i] >= yrs[i + 1] for i in range(len(yrs) - 1)); out.append(f'non-increasing={mono}')
i = b.find('Sort by'); out.append('SORTCTX ' + re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', b[i:i + 1500]))[:600])
for u in ['https://letterboxd.com/haanvie/films/page/2/', 'https://letterboxd.com/haanvie/films/by/release/', 'https://letterboxd.com/haanvie/films/diary/for/2026/', 'https://letterboxd.com/haanvie/films/by/rated-date/', 'https://letterboxd.com/haanvie/films/by/date-earliest/', 'https://letterboxd.com/haanvie/watchlist/page/17/', 'https://letterboxd.com/haanvie/films/ratings/', 'https://letterboxd.com/haanvie/likes/films/']:
    st, b2 = get(u); out.append(f'{st} {u} n={len(re.findall(r"data-item-name=", b2))} first={re.findall(r"data-item-name=\"([^\"]+)\"", b2)[:4]}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
