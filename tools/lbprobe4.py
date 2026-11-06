import urllib.request, urllib.parse, re, json, html, asyncio
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
out = []
URLS = ['https://letterboxd.com/haanvie/films/by/date/', 'https://letterboxd.com/haanvie/films/diary/', 'https://letterboxd.com/haanvie/', 'https://letterboxd.com/haanvie/films/', 'https://letterboxd.com/haanvie/watchlist/page/2/']
def info(b):
    names = re.findall(r'data-item-name="([^"]+)"', b)
    sel = re.findall(r'class="[^"]*smenu-selected[^"]*"[^>]*>\s*<a[^>]*>([^<]+)', b)[:3]
    ttl = re.search(r'<title>(.*?)</title>', b, re.S)
    diary = re.findall(r'<td class="td-day[^"]*"[^>]*>.*?<a[^>]*>(\d+)</a>', b, re.S)[:5]
    return f'title={(ttl.group(1).strip()[:50] if ttl else "")!r} n={len(names)} first={names[:6]} sel={sel} diaryDays={diary}'
for u in URLS:
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9'}), timeout=30); out.append(f'URLLIB {r.status} {u} ' + info(r.read().decode('utf-8', 'ignore')))
    except urllib.error.HTTPError as e: out.append(f'URLLIB {e.code} {u}')
for u in URLS[:3]:
    try:
        r = urllib.request.urlopen(urllib.request.Request('https://r.jina.ai/' + u, headers={'User-Agent': UA, 'Accept': 'text/html', 'X-Return-Format': 'html'}), timeout=60); b = r.read().decode('utf-8', 'ignore'); out.append(f'JINA {r.status} {u} len={len(b)} ' + info(b))
    except Exception as e: out.append(f'JINA ERR {u} {e!r}'[:200])
async def pw():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--disable-blink-features=AutomationControlled'])
        ctx = await b.new_context(user_agent=UA, locale='en-US')
        pg = await ctx.new_page()
        for u in URLS[:3]:
            try:
                await pg.goto(u, wait_until='domcontentloaded', timeout=45000); await pg.wait_for_timeout(10000)
                out.append(f'PW {u} ' + info(await pg.content()))
            except Exception as e: out.append(f'PW ERR {u} {e!r}'[:200])
        await b.close()
try: asyncio.run(pw())
except Exception as e: out.append('PW ERR ' + repr(e)[:200])
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
