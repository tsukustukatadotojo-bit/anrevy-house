import { chromium } from 'playwright';
import fs from 'fs';
const URL = 'https://tsukustukatadotojo-bit.github.io/anrevy-house/lounge/';
const out = [];
const br = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
async function page(name){
  const ctx = await br.newContext({ permissions: ['microphone'] });
  const pg = await ctx.newPage(); pg.errs = [];
  pg.on('pageerror', e => pg.errs.push(String(e)));
  await pg.goto(URL + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  return pg;
}
const S = `({conn:__lounge.connected, lock:__lounge.lockOn(), peers:[...__lounge.peers.values()].map(p=>p.name), pcs:[...__lounge.pcs.values()].map(s=>s.pc.connectionState), audio:[...document.querySelectorAll('#audios audio')].map(a=>a.srcObject?'live':'none')})`;
try {
  const A = await page('A'); await A.waitForTimeout(5000);
  out.push('A before: ' + JSON.stringify(await A.evaluate(S)) + ' gate=' + await A.innerText('#gHead'));
  await A.fill('#name', 'TestA'); await A.click('#goBtn'); await A.waitForTimeout(1500);
  const B = await page('B'); await B.waitForTimeout(5000);
  out.push('B gate: ' + await B.innerText('#gHead') + ' / ' + await B.innerText('#gWho'));
  await B.fill('#name', 'TestB'); await B.click('#goBtn');
  await B.waitForTimeout(9000);
  out.push('A: ' + JSON.stringify(await A.evaluate(S)));
  out.push('B: ' + JSON.stringify(await B.evaluate(S)));
  await A.click('#leaveBtn'); await B.click('#leaveBtn'); await A.waitForTimeout(1500);
  out.push('errors A=' + JSON.stringify(A.errs.slice(0, 3)) + ' B=' + JSON.stringify(B.errs.slice(0, 3)));
  for (const path of ['travis/', 'jazz/']){
    const pg = await (await br.newContext()).newPage(); const errs = [];
    pg.on('pageerror', e => errs.push(String(e)));
    await pg.goto('https://tsukustukatadotojo-bit.github.io/anrevy-house/' + path, { waitUntil: 'load' }); await pg.waitForTimeout(4000);
    const info = path === 'travis/' ? await pg.evaluate("({gl:!document.body.classList.contains('no-gl'), three:!!window.THREE})") : await pg.evaluate("({doors:document.querySelectorAll('.door').length})");
    out.push(path + ' ' + JSON.stringify(info) + ' errors=' + JSON.stringify(errs.slice(0, 3)));
  }
} catch (e){ out.push('FAIL ' + e.message); }
await br.close();
console.log(out.join('\n')); fs.writeFileSync('out.txt', out.join('\n'));
