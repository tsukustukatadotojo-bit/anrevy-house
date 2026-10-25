import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'https://tsukustukatadotojo-bit.github.io/anrevy-house/';
const out = [];
const br = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
async function page(path){
  const ctx = await br.newContext({ permissions: ['microphone'] });
  const pg = await ctx.newPage(); pg.errs = [];
  pg.on('pageerror', e => pg.errs.push(String(e)));
  await pg.goto(BASE + path + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  return pg;
}
const S = `({conn:__lounge.connected, peers:[...__lounge.peers.values()].map(p=>p.name+'@'+p.seat), pcs:[...__lounge.pcs.values()].map(s=>s.pc.connectionState), lights:__lounge.extras.lights, seat:__lounge.self&&__lounge.self.seat})`;
const wclick = async (pg, x, y) => { const s = await pg.evaluate(`__lounge.screen(${x},${y})`); await pg.mouse.click(s.x, s.y); };
try {
  // Lounge -> tranh đỏ -> phòng ngủ
  const A = await page('lounge/'); await A.waitForTimeout(5000);
  await A.fill('#name', 'LiveA'); await A.click('#goBtn'); await A.waitForTimeout(2000);
  await wclick(A, 886, 52); await A.waitForURL('**/lounge/red/**', { timeout: 8000 }); await A.waitForTimeout(5000);
  out.push('A in red room gate: ' + await A.innerText('#gHead') + ' name=' + await A.inputValue('#name'));
  await A.click('#goBtn'); await A.waitForTimeout(1500);
  const B = await page('lounge/red/'); await B.waitForTimeout(5000);
  await B.fill('#name', 'LiveB'); await B.click('#goBtn'); await B.waitForTimeout(9000);
  out.push('A: ' + JSON.stringify(await A.evaluate(S)));
  out.push('B: ' + JSON.stringify(await B.evaluate(S)));
  await wclick(A, 560, 330); await A.waitForTimeout(4500);
  await wclick(A, 393, 186); await A.waitForTimeout(2500);
  out.push('after bed+lamp B sees: ' + JSON.stringify(await B.evaluate(S)));
  await wclick(A, 393, 186); await A.waitForTimeout(1500);
  await A.click('#leaveBtn'); await B.click('#leaveBtn');
  out.push('errors A=' + JSON.stringify(A.errs.slice(0, 3)) + ' B=' + JSON.stringify(B.errs.slice(0, 3)));
  // Jazz: câu nói + danh sách phim
  const J = await page('jazz/'); await J.waitForTimeout(2500);
  const bb = await J.locator('#piano').boundingBox(); await J.mouse.click(bb.x + bb.width * .6, bb.y + bb.height * .6); await J.waitForTimeout(2500);
  out.push('jazz piano line: ' + await J.innerText('#dlgText'));
  await J.evaluate('__jazz.lower()'); await J.waitForTimeout(4000);
  out.push('jazz cinema: ' + await J.innerText('#cineTitle') + ' errors=' + JSON.stringify(J.errs.slice(0, 3)));
} catch (e){ out.push('FAIL ' + e.message); }
await br.close();
console.log(out.join('\n')); fs.writeFileSync('out.txt', out.join('\n'));
