import urllib.request, re
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
out = []
for u in ['https://pitchfork.com/reviews/albums/laila-well-never-be-this-young-again/', 'https://pitchfork.com/reviews/albums/twisted-teens-the-holy-cross-tigers/']:
    b = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=30).read().decode('utf-8', 'ignore')
    out.append('== ' + u)
    for m in list(re.finditer(r'"ratingValue"\s*:\s*\{', b))[:2]: out.append('  RV: ' + b[m.start():m.start() + 260])
    for m in list(re.finditer(r'"score"\s*:\s*7\.4', b))[:2]: out.append('  SC: ' + b[max(0, m.start() - 260):m.start() + 60])
    for m in list(re.finditer(r'"musicRating"|"rating"\s*:', b))[:3]: out.append('  MR: ' + b[m.start():m.start() + 200])
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
