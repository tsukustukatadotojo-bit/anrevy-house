import sys, re, ssl, urllib.request, urllib.error, concurrent.futures as cf
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'
def check(line):
    room, url = line.split('|', 1)
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9'})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            body = r.read(200000).decode('utf-8', 'replace')
            m = re.search(r'<title[^>]*>(.*?)</title>', body, re.S | re.I)
            t = re.sub(r'\s+', ' ', m.group(1)).strip()[:60] if m else '-'
            return f'{r.status} {room} {url} -> {r.geturl()[:70]} | {t}'
    except urllib.error.HTTPError as e:
        body = e.read(20000).decode('utf-8', 'replace') if e.fp else ''
        m = re.search(r'<title[^>]*>(.*?)</title>', body, re.S | re.I)
        t = re.sub(r'\s+', ' ', m.group(1)).strip()[:50] if m else '-'
        return f'{e.code} {room} {url} | {t}'
    except Exception as e:
        return f'ERR {room} {url} | {type(e).__name__}: {str(e)[:80]}'
lines = [l.strip() for l in open(sys.argv[1]) if l.strip()]
with cf.ThreadPoolExecutor(12) as ex:
    out = list(ex.map(check, lines))
open('out3.txt', 'w').write('\n'.join(out))
print('\n'.join(out))
