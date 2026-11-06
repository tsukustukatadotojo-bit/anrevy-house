import asyncio, os
from playwright.async_api import async_playwright
os.makedirs('shots', exist_ok=True); out = []
def log(*a): s = ' '.join(str(x) for x in a); print(s); out.append(s)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1440, 'height': 860}); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
        await pg.goto('http://localhost:8000/studio/'); await pg.wait_for_timeout(600)
        await pg.keyboard.type('111213'); await pg.wait_for_timeout(8000)
        await pg.click('[data-tab="bandcamp"]'); await pg.wait_for_timeout(300)
        await pg.locator('#nmBody [data-bc]').first.click(); await pg.wait_for_timeout(6000)
        log('bc imgs:', await pg.evaluate("[...document.querySelectorAll('#nmBody .nm-item img')].slice(0,5).map(i=>i.naturalWidth)"))
        await pg.screenshot(path='shots/q1.png')
        await pg.click('[data-tab="hypem"]'); await pg.wait_for_timeout(2500)
        log('hy imgs:', await pg.evaluate("[...document.querySelectorAll('#nmBody .ch-row img')].slice(0,5).map(i=>i.naturalWidth)"))
        await pg.click('#start'); await pg.click('#poolBtn'); await pg.wait_for_timeout(9000)
        await pg.screenshot(path='shots/q2.png')
        log('errors:', errs[:8])
        await pg.goto('http://localhost:8000/jazz/'); await pg.wait_for_timeout(2500)
        try:
            await pg.click('#rack', timeout=5000); await pg.wait_for_timeout(1500)
        except Exception as e: log('rack click', repr(e)[:100])
        await pg.screenshot(path='shots/q3.png')
        await b.close()
    open('out_gal.txt', 'w').write('\n'.join(out))
asyncio.run(main())
