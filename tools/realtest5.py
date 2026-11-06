import asyncio, os
from playwright.async_api import async_playwright
os.makedirs('shots', exist_ok=True); out = []
def log(*a): s = ' '.join(str(x) for x in a); print(s); out.append(s)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 1440, 'height': 860}); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
        await pg.goto('http://localhost:8000/studio/'); await pg.wait_for_timeout(600)
        await pg.keyboard.type('111213'); await pg.wait_for_timeout(6000)
        await pg.click('[data-tab="bandcamp"]'); await pg.wait_for_timeout(300)
        await pg.locator('#nmBody [data-bc]').first.click(); await pg.wait_for_timeout(7000)
        log('bc time:', await pg.inner_text('#bcTime'), '| title:', await pg.inner_text('#bcT'), '| embed shown:', await pg.is_visible('#bcFrame'))
        await pg.screenshot(path='shots/b1.png')
        log('errors:', errs[:8])
        await b.close()
    open('out_gal.txt', 'a').write('\n' + '\n'.join(out))
asyncio.run(main())
