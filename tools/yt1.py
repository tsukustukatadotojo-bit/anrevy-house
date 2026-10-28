import urllib.request, json
out = []
for vid in ['lTQ6U40d5QA']:
    try:
        r = urllib.request.urlopen(f'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json', timeout=20)
        d = json.loads(r.read().decode()); out.append(f'{vid} {r.status} embeddable | {d.get("title")} | {d.get("author_name")}')
    except urllib.error.HTTPError as e: out.append(f'{vid} HTTP {e.code} (401/403 = không cho nhúng, 404 = không có)')
    except Exception as e: out.append(f'{vid} ERR {e!r}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
