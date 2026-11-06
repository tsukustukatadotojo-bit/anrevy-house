import urllib.request, re
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
out = []
for u in ['https://pitchfork.com/reviews/albums/laila-well-never-be-this-young-again/', 'https://pitchfork.com/reviews/albums/twisted-teens-the-holy-cross-tigers/', 'https://pitchfork.com/reviews/albums/yeah-yeah-yeahs-hidden-in-pieces-live-at-the-royal-albert-hall/']:
    try: b = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=30).read().decode('utf-8', 'ignore')
    except Exception as e: out.append(u + ' ERR ' + repr(e)); continue
    out.append('== ' + u + ' len=' + str(len(b)))
    for pat in [r'"rating"\s*:\s*\{[^{}]{0,200}', r'"ratingValue"[^,}]{0,40}', r'"score"[^,}]{0,30}', r'[Rr]ating[^<>]{0,80}>[^<]{0,20}<', r'BestNewMusic|best-new-music|"isBestNewMusic"[^,]{0,10}', r'ScoreCircle[^>]{0,120}>.{0,200}']:
        ms = re.findall(pat, b)[:4]
        out.append(f'  {pat[:30]}: {ms}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
