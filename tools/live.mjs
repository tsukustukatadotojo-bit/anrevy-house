import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'https://tsukustukatadotojo-bit.github.io/anrevy-house/';
const out = [];
const br = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
async function page(path, name){
  const ctx = await br.newContext({ permissions: ['microphone'] });
  const pg = await ctx.newPage(); pg.errs = [];
  pg.on('pageerror', e => pg.errs.push(String(e)));
  await pg.goto(BASE + path, { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(4000);
  await pg.fill('#name', name); await pg.click('#goBtn');
  return pg;
}
const S = `({inside:__lounge.inside, gate:document.getElementById('gHead').textContent, conn:__lounge.connected, modes:[...__lounge.peers.values()].map(p=>p.name+':'+__lounge.linkMode(p.id)+':'+p.speaking.toFixed(2)), rx:__lounge.relayRx, tx:Math.round(__lounge.relayTx)})`;
try {
  // 2) ép đi vòng qua máy chủ thật (mô phỏng mạng chặn kết nối thẳng)
  const C = await page('lounge/?nop2p=1&v=' + Date.now(), 'LiveC'); await C.waitForTimeout(1500);
  const D = await page('lounge/?nop2p=1&v=' + Date.now(), 'LiveD');
  for (const t of [8, 16, 24]){ await C.waitForTimeout(8000); out.push(`relay t${t} C: ` + JSON.stringify(await C.evaluate(S)) + ' D: ' + JSON.stringify(await D.evaluate(S))); }
  await C.evaluate('__lounge.leave()'); await D.evaluate('__lounge.leave()');
  out.push('errors ' + JSON.stringify([C.errs, D.errs].map(e => e.slice(0, 2))));
  const R = await page('lounge/red/?v=' + Date.now(), 'LiveR'); await R.waitForTimeout(3000); out.push('red room gate: ' + JSON.stringify(await R.evaluate(S)));
} catch (e){ out.push('FAIL ' + e.message); }
await br.close();
console.log(out.join('\n')); fs.writeFileSync('out.txt', out.join('\n'));
