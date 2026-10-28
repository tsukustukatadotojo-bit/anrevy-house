# Thử thật trên máy chủ công cộng: gửi một tác phẩm theo giao thức v2 (ảnh xem nhanh + bản gốc), hoặc dọn sạch.
import paho.mqtt.client as mqtt, time, json, sys, hashlib, base64, io, random, string
from paho.mqtt.enums import CallbackAPIVersion
from PIL import Image, ImageDraw
PFX = 'anrevy-house-9q2/gallery/v1/'
mode = sys.argv[1]
GID = 'mvtest02-claude'
BROKERS = [('broker.emqx.io', 60000), ('broker.hivemq.com', 600000)]
def sha(s): return hashlib.sha256(s.encode()).hexdigest()
r = random.Random(5)
im = Image.new('RGB', (2400, 1800), (236, 222, 200)); d = ImageDraw.Draw(im)
for i in range(400):
    x, y, s = r.randint(0, 2400), r.randint(0, 1800), r.randint(10, 300)
    d.ellipse([x, y, x + s, y + s], fill=(r.randint(0, 255), r.randint(0, 255), r.randint(0, 255)))
ex = Image.Exif(); ex[0x010F] = 'TestCam'; ex[0x0110] = 'Model X'; ex[0x8825] = {1: 'N', 2: (10.0, 46.0, 30.0)}
buf = io.BytesIO(); im.save(buf, 'JPEG', quality=95, exif=ex.tobytes()); orig = buf.getvalue()
pv = im.copy(); pv.thumbnail((1600, 1600)); b2 = io.BytesIO(); pv.save(b2, 'JPEG', quality=90); prev = b2.getvalue()
ob64, pb64 = base64.b64encode(orig).decode(), base64.b64encode(prev).decode()
out = [f'orig {len(orig)} bytes sha256(raw)={hashlib.sha256(orig).hexdigest()[:16]}']
for host, cs in BROKERS:
    c = mqtt.Client(CallbackAPIVersion.VERSION2, client_id='anrevy-test-' + ''.join(random.choice(string.ascii_lowercase) for _ in range(6)))
    c.max_inflight_messages_set(10)
    c.connect(host, 1883, 60); c.loop_start(); time.sleep(1.5)
    n, on = -(-len(pb64) // cs), -(-len(ob64) // cs)
    t0 = time.time()
    if mode == 'up':
        meta = {'v': 2, 'id': GID, 'at': int(time.time() * 1000), 'title': 'Thử hệ thống (bản gốc)', 'artist': 'Claude', 'year': 0, 'medium': 'Tranh vẽ',
                'note': 'Tác phẩm thử để kiểm tra việc lưu bản gốc. Sẽ được gỡ ngay.', 'w': 2400, 'h': 1800, 'ph': '#ECDEC8',
                'cs': cs, 'n': n, 'len': len(pb64), 'sha': sha(pb64), 'on': on, 'olen': len(ob64), 'osha': sha(ob64), 'ofmt': 'jpg', 'obytes': len(orig), 'oq': 'goc'}
        msgs = [(PFX + 'm/' + GID, json.dumps(meta))] + [(f'{PFX}c/{GID}/{k}', pb64[k * cs:(k + 1) * cs]) for k in range(n)] + [(f'{PFX}o/{GID}/{k}', ob64[k * cs:(k + 1) * cs]) for k in range(on)]
    else:
        msgs = [(PFX + 'm/' + GID, b'')] + [(f'{PFX}c/{GID}/{k}', b'') for k in range(n + 2)] + [(f'{PFX}o/{GID}/{k}', b'') for k in range(on + 2)]
    infos = [c.publish(t, p, qos=1, retain=True) for t, p in msgs]
    for i in infos: i.wait_for_publish(60)
    out.append(f'{host}: {mode} {len(msgs)} msgs (preview {n}, original {on} chunks of {cs}) in {time.time() - t0:.1f}s')
    # đọc lại để chắc máy chủ giữ đủ
    got = {}
    s = mqtt.Client(CallbackAPIVersion.VERSION2, client_id='anrevy-chk-' + ''.join(random.choice(string.ascii_lowercase) for _ in range(6)))
    s.on_message = lambda cl, u, m: got.__setitem__(m.topic, len(m.payload)) if m.retain else None
    s.connect(host, 1883, 60); s.loop_start(); time.sleep(1); s.subscribe(PFX + '+/' + GID + '/#', 1); s.subscribe(PFX + 'm/' + GID, 1); time.sleep(10)
    out.append(f'{host}: retained back {len([v for v in got.values() if v])} non-empty topics, total {sum(got.values())} bytes')
    s.loop_stop(); s.disconnect(); c.loop_stop(); c.disconnect()
print('\n'.join(out)); open('out_gal.txt', 'w').write('\n'.join(out))
