import asyncio, os, re, urllib.request
from playwright.async_api import async_playwright
os.makedirs('shots', exist_ok=True); out = []
def log(*a): s = ' '.join(str(x) for x in a); print(s); out.append(s)
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
for u in ['https://www.theguardian.com/music', 'https://www.rollingstone.com/music/', 'https://www.billboard.com/c/music/', 'https://www.clashmusic.com/', 'https://thequietus.com/', 'https://diymag.com/', 'https://www.spin.com/', 'https://www.soompi.com/', 'https://pitchfork.com/news/', 'https://www.nme.com/news/music']:
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA, 'Sec-Fetch-Dest': 'iframe'}), timeout=20); h = r.headers
        csp = h.get('Content-Security-Policy') or ''
        log('FRAME', r.status, u, 'XFO=', h.get('X-Frame-Options'), 'FA=', re.findall(r'frame-ancestors[^;]*', csp))
    except urllib.error.HTTPError as e: log('FRAME', e.code, u, 'XFO=', e.headers.get('X-Frame-Options'))
    except Exception as e: log('FRAME ERR', u, repr(e)[:80])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1440, 'height': 860}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
        await pg.goto('http://localhost:8000/studio/'); await pg.wait_for_timeout(600)
        await pg.keyboard.type('111213'); await pg.wait_for_timeout(10000)
        await pg.screenshot(path='shots/p1.png')
        await pg.click('#plFull'); await pg.wait_for_timeout(3000); await pg.screenshot(path='shots/p2.png'); await pg.keyboard.press('Escape')
        await pg.click('[data-tab="rel"]'); await pg.wait_for_timeout(500); await pg.screenshot(path='shots/p3.png')
        for sel in ['#w-plaza', '#w-letterboxd', '#w-music', '#w-lastfm', '#w-spotify']: await pg.click(f'{sel} [data-act="hide"]')
        await pg.wait_for_timeout(800); await pg.screenshot(path='shots/p4.png')
        log('font loaded:', await pg.evaluate("document.fonts.check('80px Monoton')"))
        log('errors:', errs[:8])
        m = await b.new_context(**p.devices['iPhone 13']); mp = await m.new_page()
        await mp.goto('http://localhost:8000/studio/'); await mp.wait_for_timeout(600)
        await mp.touchscreen.tap(200, 400); await mp.keyboard.type('111213'); await mp.wait_for_timeout(9000)
        await mp.screenshot(path='shots/p5.png')
        await mp.goto('http://localhost:8000/home.html'); await mp.wait_for_timeout(2500)
        await b.close()
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        await pg.goto('http://localhost:8000/home.html'); await pg.wait_for_timeout(1500)
        await pg.evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in','shown','visible'))")
        el = pg.locator('#socials'); await el.scroll_into_view_if_needed(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='shots/p6.png')
        await b.close()
    open('out_gal.txt', 'w').write('\n'.join(out))
asyncio.run(main())
