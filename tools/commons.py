import json, re, urllib.request, urllib.parse
UA = 'AnrevyHouseBot/1.0 (personal site; contact via github)'
def get(params):
    u = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=40) as r:
        return json.load(r)
lines = []
cats = ['Category:Travis Scott']
sub = get({'action': 'query', 'list': 'categorymembers', 'cmtitle': 'Category:Travis Scott', 'cmtype': 'subcat', 'cmlimit': 50, 'format': 'json'})
for m in sub['query']['categorymembers']:
    cats.append(m['title']); lines.append('SUBCAT ' + m['title'])
for cat in cats[:6]:
    d = get({'action': 'query', 'generator': 'categorymembers', 'gcmtitle': cat, 'gcmtype': 'file', 'gcmlimit': 60, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': 900, 'format': 'json'})
    for p in (d.get('query', {}).get('pages', {}) or {}).values():
        ii = p['imageinfo'][0]; md = ii.get('extmetadata', {})
        lic = md.get('LicenseShortName', {}).get('value', '')
        art = re.sub('<[^>]+>', '', md.get('Artist', {}).get('value', ''))[:40].strip()
        date = re.sub('<[^>]+>', '', md.get('DateTimeOriginal', {}).get('value', ''))[:10]
        lines.append(f"{p['title'][5:][:60]} | {ii.get('width')}x{ii.get('height')} | {lic} | {art} | {date} | {ii.get('thumburl','')}")
open('out2.txt', 'w').write('\n'.join(lines))
print('\n'.join(lines))
