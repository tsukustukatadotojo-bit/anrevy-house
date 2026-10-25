import json, re, urllib.request, urllib.parse, traceback
UA = 'AnrevyHouseBot/1.0 (personal fan site; https://github.com/tsukustukatadotojo-bit/anrevy-house)'
lines = []
def get(params):
    u = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=40) as r:
        return json.load(r)
def subcats(c):
    d = get({'action': 'query', 'list': 'categorymembers', 'cmtitle': c, 'cmtype': 'subcat', 'cmlimit': 50, 'format': 'json'})
    return [m['title'] for m in d.get('query', {}).get('categorymembers', [])]
try:
    cats = []
    for c in subcats('Category:Travis Scott by year'):
        cats.append(c)
        try: cats += subcats(c)
        except Exception as e: lines.append('ERR sub ' + c + ' ' + str(e))
    lines.append('CATS ' + ' ; '.join(c.replace('Category:', '') for c in cats))
    for cat in cats[:30]:
        try:
            d = get({'action': 'query', 'generator': 'categorymembers', 'gcmtitle': cat, 'gcmtype': 'file', 'gcmlimit': 40, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': 900, 'format': 'json'})
            for p in (d.get('query', {}).get('pages', {}) or {}).values():
                ii = p['imageinfo'][0]; md = ii.get('extmetadata', {})
                lic = md.get('LicenseShortName', {}).get('value', '')
                art = re.sub('<[^>]+>', '', md.get('Artist', {}).get('value', ''))[:40].strip()
                lines.append(f"{p['title'][5:][:70]} | {ii.get('width')}x{ii.get('height')} | {lic} | {art} | {ii.get('thumburl','').split('?')[0]}")
        except Exception as e: lines.append('ERR ' + cat + ' ' + str(e))
except Exception:
    lines.append('FAIL ' + traceback.format_exc()[-600:])
open('out2.txt', 'w').write('\n'.join(lines) or 'EMPTY')
print('\n'.join(lines))
