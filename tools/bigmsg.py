import paho.mqtt.client as mqtt, time, json, os, sys, random, string
from paho.mqtt.enums import CallbackAPIVersion
RID = ''.join(random.choice(string.ascii_lowercase) for _ in range(6))
BROKERS = [('broker.emqx.io', 1883, 'tcp'), ('test.mosquitto.org', 1883, 'tcp'), ('broker.hivemq.com', 1883, 'tcp'),
           ('broker.emqx.io', 8084, 'wss'), ('test.mosquitto.org', 8081, 'wss'), ('broker.hivemq.com', 8884, 'wss')]
SIZES = [100_000, 400_000, 700_000, 1_000_000, 1_500_000]
out = []
def mk(host, port, tr):
    c = mqtt.Client(CallbackAPIVersion.VERSION2, client_id='anrevy-t-' + RID + str(random.randint(0, 9999)), transport='websockets' if tr == 'wss' else 'tcp')
    if tr == 'wss':
        c.tls_set(); c.ws_set_options(path='/mqtt')
    return c
for host, port, tr in BROKERS:
    try:
        pub = mk(host, port, tr); pub.connect(host, port, 30); pub.loop_start(); time.sleep(2)
        base = f'anrevy-house-9q2/test/{RID}/{tr}'
        for s in SIZES:
            payload = 'x' * s
            r = pub.publish(f'{base}/{s}', payload, qos=1, retain=True)
            try: r.wait_for_publish(20)
            except Exception as e: out.append(f'{host}:{port} pub {s} err {e}')
        time.sleep(4); pub.loop_stop(); pub.disconnect()
        got = {}
        sub = mk(host, port, tr)
        sub.on_message = lambda c, u, m: got.__setitem__(m.topic.split('/')[-1], len(m.payload))
        sub.connect(host, port, 30); sub.loop_start(); time.sleep(1.5); sub.subscribe(base + '/+', 1); time.sleep(10)
        out.append(f'{host}:{port}/{tr} received: {sorted(got.items(), key=lambda kv: int(kv[0]))}')
        # cleanup
        for s in SIZES: sub.publish(f'{base}/{s}', b'', qos=1, retain=True)
        time.sleep(2); sub.loop_stop(); sub.disconnect()
    except Exception as e:
        out.append(f'{host}:{port}/{tr} ERROR {e!r}')
# how old are retained notes (persistence check)
for host in ['broker.emqx.io', 'test.mosquitto.org']:
    try:
        notes = []
        c = mk(host, 1883, 'tcp')
        c.on_message = lambda cl, u, m: notes.append((m.topic, m.payload[:200]))
        c.connect(host, 1883, 30); c.loop_start(); time.sleep(1.5)
        c.subscribe('anrevy-house-9q2/#', 0); time.sleep(8); c.loop_stop(); c.disconnect()
        now = time.time() * 1000; ages = []
        for t, p in notes:
            try:
                d = json.loads(p.decode() + ('' if p.decode().endswith('}') else '"}')) if False else None
            except Exception: d = None
            ages.append(t)
        out.append(f'{host} retained under anrevy prefix: {len(notes)} topics: {sorted(set(t.rsplit("/",1)[0] for t in ages))[:30]}')
        for t, p in notes[:40]:
            s = p.decode('utf-8', 'replace')
            import re
            m = re.search(r'"(?:at|t)":(\d{13})', s)
            out.append(f'  {t} age_h={((now - int(m.group(1))) / 3.6e6) if m else None}')
    except Exception as e:
        out.append(f'{host} notes ERROR {e!r}')
open('out_mq.txt', 'w').write('\n'.join(out))
print('\n'.join(out))
