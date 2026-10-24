import mqtt from 'mqtt';
const URLS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
const topic = 'anrevy-house-9q2/lounge/v1/selftest';
const out = [];
const once = (c, ev) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), 12000); c.once(ev, (...a) => { clearTimeout(t); res(a); }); c.once('error', e => { clearTimeout(t); rej(e); }); });
for (const url of URLS){
  const t0 = Date.now();
  try {
    const a = mqtt.connect(url, { clientId: 'av_test_a_' + Math.random().toString(16).slice(2, 8), reconnectPeriod: 0, connectTimeout: 10000 });
    await once(a, 'connect');
    const tc = Date.now() - t0;
    const payload = JSON.stringify({ k: Math.random(), at: Date.now() });
    await new Promise(r => a.publish(topic, payload, { retain: true, qos: 1 }, r));
    a.end();
    await new Promise(r => setTimeout(r, 1500));
    const b = mqtt.connect(url, { clientId: 'av_test_b_' + Math.random().toString(16).slice(2, 8), reconnectPeriod: 0, connectTimeout: 10000 });
    await once(b, 'connect');
    const got = new Promise((res) => { const t = setTimeout(() => res('NO retained'), 6000); b.on('message', (tp, p, pk) => { if (tp === topic){ clearTimeout(t); res((String(p) === payload ? 'retained OK' : 'retained OTHER') + ' retainFlag=' + pk.retain); } }); });
    b.subscribe(topic);
    const r = await got;
    // dọn: xoá retained
    b.publish(topic, '', { retain: true });
    // độ trễ khứ hồi
    const t1 = Date.now(); const rt = new Promise(res => { b.on('message', (tp, p) => { if (tp === topic + '/rt') res(Date.now() - t1); }); setTimeout(() => res(-1), 5000); });
    b.subscribe(topic + '/rt', () => b.publish(topic + '/rt', 'x'));
    out.push(`${url}: connect ${tc}ms, ${r}, roundtrip ${await rt}ms`);
    b.end();
  } catch (e){ out.push(`${url}: FAIL ${e.message}`); }
}
console.log(out.join('\n'));
import fs from 'fs'; fs.writeFileSync('out.txt', out.join('\n'));
