import asyncio, os
from playwright.async_api import async_playwright
os.makedirs('shots', exist_ok=True); out = []
def log(*a): s = ' '.join(str(x) for x in a); print(s); out.append(s)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1440, 'height': 860}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
        await pg.goto('http://localhost:8000/studio/'); await pg.wait_for_timeout(600)
        await pg.keyboard.type('111213'); await pg.wait_for_timeout(9000)
        log('grid imgs:', await pg.evaluate("[...document.querySelectorAll('#lbBody .pg img')].slice(0,8).map(i=>i.naturalWidth)"), 'broken:', await pg.evaluate("document.querySelectorAll('#lbBody .pg .ph').length"))
        await pg.screenshot(path='shots/r1.png')
        await pg.click('[data-lb="watchlist"]'); await pg.wait_for_timeout(5000)
        log('wl imgs:', await pg.evaluate("[...document.querySelectorAll('#lbBody .pg img')].slice(0,12).map(i=>i.naturalWidth)"), 'broken:', await pg.evaluate("document.querySelectorAll('#lbBody .pg .ph').length"))
        await pg.screenshot(path='shots/r2.png')
        for q in ['in the mood for love', 'parasite', 'mắt biếc', 'spider-man brand new day']:
            await pg.fill('#lbQ', q); await pg.press('#lbQ', 'Enter'); await pg.wait_for_timeout(4000)
            log('search', repr(q), '->', (await pg.inner_text('#lbBody'))[:260].replace('\n', ' | '))
        log('imdb imgs:', await pg.evaluate("[...document.querySelectorAll('#lbBody [data-i] img')].slice(0,4).map(i=>i.naturalWidth)"))
        await pg.screenshot(path='shots/r3.png')
        await pg.click('[data-tab="charts"]'); await pg.wait_for_timeout(500)
        await pg.locator('.ch-row .ib').nth(2).click(); await pg.wait_for_timeout(5000)
        log('sp after chart:', await pg.evaluate("(document.querySelector('#spHost iframe')||{}).src"))
        await pg.screenshot(path='shots/r4.png')
        for sel in ['#w-letterboxd', '#w-music', '#w-lastfm', '#w-spotify']: await pg.click(f'{sel} [data-act="hide"]')
        await pg.wait_for_timeout(500); await pg.screenshot(path='shots/r5.png')
        log('errors:', errs[:8])
        await b.close()
    open('out_gal.txt', 'w').write('\n'.join(out))
asyncio.run(main())
