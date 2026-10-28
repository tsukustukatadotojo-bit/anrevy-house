# Gửi một tranh thử (hoặc yêu cầu gỡ) lên máy chủ thật, giống hệt trang gallery.
import paho.mqtt.client as mqtt, time, json, sys, hashlib, base64, io, random, string
from paho.mqtt.enums import CallbackAPIVersion
from PIL import Image, ImageDraw
PFX = 'anrevy-house-9q2/gallery/v1/'
mode = sys.argv[1]
GID, TOK = 'mvtest01-claude', 'claudetesttoken000000000000x'
def sha(s): return hashlib.sha256(s.encode()).hexdigest()
out = []
for host in ['broker.emqx.io', 'broker.hivemq.com']:
    c = mqtt.Client(CallbackAPIVersion.VERSION2, client_id='anrevy-test-' + ''.join(random.choice(string.ascii_lowercase) for _ in range(6)))
    c.connect(host, 1883, 30); c.loop_start(); time.sleep(1.5)
    if mode == 'up':
        im = Image.new('RGB', (1200, 900), (236, 222, 200)); d = ImageDraw.Draw(im)
        for i in range(30): d.ellipse([40 * i, 300 + (i % 5) * 40, 40 * i + 160, 460 + (i % 5) * 40], fill=(200 - i * 4, 90 + i * 3, 120))
        buf = io.BytesIO(); im.save(buf, 'JPEG', quality=85); b64 = base64.b64encode(buf.getvalue()).decode()
        n = (len(b64) + 59999) // 60000
        meta = {'v': 1, 'id': GID, 'at': int(time.time() * 1000), 'title': 'Tranh thử hệ thống', 'artist': 'Claude', 'year': 2026, 'medium': 'Tranh vẽ',
                'note': 'Tranh thử để kiểm tra việc lưu tự động. Sẽ được gỡ ngay.', 'w': 1200, 'h': 900, 'ph': '#ECDEC8', 'n': n, 'len': len(b64), 'sha': sha(b64), 'dh': sha(TOK)}
        c.publish(PFX + 'm/' + GID, json.dumps(meta), qos=1, retain=True).wait_for_publish(15)
        for k in range(n): c.publish(f'{PFX}c/{GID}/{k}', b64[k * 60000:(k + 1) * 60000], qos=1, retain=True).wait_for_publish(15)
        out.append(f'{host}: published {n} chunks, {len(b64)} b64')
    else:
        c.publish(PFX + 'd/' + GID, json.dumps({'id': GID, 'tok': TOK, 'at': int(time.time() * 1000)}), qos=1, retain=True).wait_for_publish(15)
        out.append(f'{host}: published delete')
    time.sleep(2); c.loop_stop(); c.disconnect()
print('\n'.join(out))
open('out_gal.txt', 'w').write('\n'.join(out))
