# Kiểm tra máy chủ MQTT công cộng chạy cổng 443 (không bị nhà mạng chặn) có giữ được tin lớn không
import paho.mqtt.client as mqtt, time, random, string, ssl, socket
from paho.mqtt.enums import CallbackAPIVersion
RID = ''.join(random.choice(string.ascii_lowercase) for _ in range(6))
TARGETS = [('mqtt.eclipseprojects.io', 443, 'wss', '/mqtt'), ('mqtt.eclipseprojects.io', 1883, 'tcp', ''),
           ('broker.emqx.io', 443, 'wss', '/mqtt'), ('broker.hivemq.com', 443, 'wss', '/mqtt'),
           ('public.mqtthq.com', 443, 'wss', '/mqtt'), ('test.mosquitto.org', 443, 'wss', '/mqtt')]
SIZES = [60_000, 600_000, 1_000_000]
out = []
for host, port, tr, path in TARGETS:
    try:
        def mk():
            c = mqtt.Client(CallbackAPIVersion.VERSION2, client_id='anrevy-t-' + RID + str(random.randint(0, 99999)), transport='websockets' if tr == 'wss' else 'tcp')
            if tr == 'wss': c.tls_set(); c.ws_set_options(path=path)
            return c
        pub = mk(); pub.connect(host, port, 20); pub.loop_start(); time.sleep(2)
        if not pub.is_connected(): out.append(f'{host}:{port}/{tr} NOT CONNECTED'); pub.loop_stop(); continue
        base = f'anrevy-house-9q2/test443/{RID}/{port}'
        t0 = time.time()
        for s in SIZES:
            try: pub.publish(f'{base}/{s}', 'x' * s, qos=1, retain=True).wait_for_publish(25)
            except Exception as e: out.append(f'  pub {s} err {e}')
        dt = time.time() - t0
        time.sleep(3); pub.loop_stop(); pub.disconnect()
        got = {}
        sub = mk(); sub.on_message = lambda c, u, m: got.__setitem__(m.topic.split('/')[-1], len(m.payload)) if m.retain else None
        sub.connect(host, port, 20); sub.loop_start(); time.sleep(1.5); sub.subscribe(base + '/+', 1); time.sleep(8)
        out.append(f'{host}:{port}/{tr} pub {dt:.1f}s retained back: {sorted(got.items(), key=lambda kv: int(kv[0]))}')
        for s in SIZES: sub.publish(f'{base}/{s}', b'', qos=1, retain=True)
        time.sleep(2); sub.loop_stop(); sub.disconnect()
    except Exception as e:
        out.append(f'{host}:{port}/{tr} ERROR {e!r}')
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
