import json, re, sys, urllib.request, urllib.parse
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'
def get(u):
    req = urllib.request.Request(u, headers={'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', 'Cookie': 'CONSENT=YES+1; SOCS=CAI'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, ''
    except Exception as e:
        return 0, str(e)
def walk(o, out):
    if isinstance(o, dict):
        if 'videoRenderer' in o:
            v = o['videoRenderer']
            t = ''.join(x.get('text', '') for x in v.get('title', {}).get('runs', []))
            ch = ''.join(x.get('text', '') for x in v.get('ownerText', {}).get('runs', []))
            ln = v.get('lengthText', {}).get('simpleText', 'LIVE')
            out.append((v.get('videoId'), t, ch, ln))
        for x in o.values(): walk(x, out)
    elif isinstance(o, list):
        for x in o: walk(x, out)
def oembed(vid):
    s, b = get('https://www.youtube.com/oembed?format=json&url=' + urllib.parse.quote('https://www.youtube.com/watch?v=' + vid))
    if s == 200:
        j = json.loads(b); return '200 ' + j.get('author_name', '') + ' | ' + j.get('title', '')
    return str(s)
lines = []
for q in open(sys.argv[1], encoding='utf-8').read().strip().split('\n'):
    if q.startswith('ID '):
        vid = q[3:].strip(); lines.append(f'ID {vid}: oembed {oembed(vid)}'); continue
    s, html = get('https://www.youtube.com/results?search_query=' + urllib.parse.quote(q))
    m = re.search(r'var ytInitialData = (\{.*?\});</script>', html)
    res = []
    if m:
        try: walk(json.loads(m.group(1)), res)
        except Exception as e: lines.append(f'{q}: parse error {e}')
    lines.append(f'## {q} (http {s}, {len(res)} results)')
    for vid, t, ch, ln in res[:3]:
        lines.append(f'  {vid} | {t[:70]} | {ch} | {ln} | oembed {oembed(vid)}')
print('\n'.join(lines))
open('out.txt', 'w', encoding='utf-8').write('\n'.join(lines))
