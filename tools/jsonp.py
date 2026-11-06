import urllib.request, urllib.parse, re, json
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
out = []
for q in ['in_the_mood_for_love', 'inthemoodforlove', 'in the mood for love', 'in_the', 'in_the%20mood', 'spidermanbrandnewday', 'spider_man', 'spiderman_brand', 'the_odyssey', 'the%20odyssey', 'inthemood', 'mood_for_love']:
    u = 'https://sg.media-imdb.com/suggests/' + q[0] + '/' + (q if '%' in q else urllib.parse.quote(q)) + '.json'
    try:
        b = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=20).read().decode('utf-8', 'ignore')
        m = re.match(r'([^(]+)\((.*)\)\s*$', b, re.S); cb = m.group(1) if m else b[:40]
        d = json.loads(m.group(2)) if m else {}
        out.append(f'{q!r}: cb={cb!r} -> {[(x.get("l"), x.get("y")) for x in d.get("d", [])][:4]}')
    except Exception as e: out.append(f'{q!r}: ERR {e!r}'[:120])
for q in ['in the mood for love', 'spider-man brand new day']:
    b = urllib.request.urlopen(urllib.request.Request('https://v3.sg.media-imdb.com/suggestion/x/' + urllib.parse.quote(q) + '.json', headers={'User-Agent': UA}), timeout=20).read().decode()
    out.append(f'v3 {q!r}: ' + str([(x.get('l'), x.get('y')) for x in json.loads(b).get('d', [])][:3]))
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
