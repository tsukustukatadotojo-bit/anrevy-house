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
        await pg.keyboard.type('111213'); await pg.wait_for_timeout(5000)
        await pg.click('#tasks [data-app="note"]'); await pg.wait_for_timeout(9000)
        log('live:', await pg.inner_text('#ntLive'))
        log('msgs:', await pg.locator('.nt-msg').count(), '| font ok:', await pg.evaluate("document.fonts.check('16px Tiny5', 'ế')"))
        await pg.screenshot(path='shots/n1.png')
        log('errors:', errs[:6])
        for r in ['cyber', 'arcade']:
            await pg.goto(f'http://localhost:8000/game/{r}/'); await pg.wait_for_timeout(2500)
            await pg.locator('#scene').screenshot(path=f'shots/g-{r}.png')
        await b.close()
    open('out_gal.txt', 'w').write('\n'.join(out))
asyncio.run(main())
