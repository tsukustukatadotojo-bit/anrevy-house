import { chromium } from 'playwright';
import fs from 'fs';
const CANDS = {
  freestun_udp: [{ urls: 'turn:freestun.net:3478', username: 'free', credential: 'free' }],
  freestun_tcp: [{ urls: 'turn:freestun.net:3478?transport=tcp', username: 'free', credential: 'free' }],
  freestun_tls: [{ urls: 'turns:freestun.net:5349', username: 'free', credential: 'free' }],
  anyfirewall: [{ urls: 'turn:turn.anyfirewall.com:443?transport=tcp', username: 'webrtc', credential: 'webrtc' }],
  openrelay: [{ urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }],
};
const out = [];
const br = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const pg = await br.newPage();
await pg.goto('about:blank');
for (const [name, ice] of Object.entries(CANDS)){
  const r = await pg.evaluate(async (ice) => {
    const cfg = { iceServers: ice, iceTransportPolicy: 'relay' };
    const a = new RTCPeerConnection(cfg), b = new RTCPeerConnection(cfg);
    const relays = [];
    a.onicecandidate = e => { if (e.candidate){ relays.push(e.candidate.candidate.split(' ').slice(4, 8).join(' ')); b.addIceCandidate(e.candidate).catch(() => {}); } };
    b.onicecandidate = e => { if (e.candidate) a.addIceCandidate(e.candidate).catch(() => {}); };
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach(t => a.addTrack(t, s));
    let got = false; b.ontrack = () => { got = true; };
    const o = await a.createOffer(); await a.setLocalDescription(o); await b.setRemoteDescription(o);
    const an = await b.createAnswer(); await b.setLocalDescription(an); await a.setRemoteDescription(an);
    const t0 = Date.now();
    while (Date.now() - t0 < 15000 && a.connectionState !== 'connected' && a.connectionState !== 'failed') await new Promise(r => setTimeout(r, 300));
    let bytes = 0;
    if (a.connectionState === 'connected'){ await new Promise(r => setTimeout(r, 2500)); (await b.getStats()).forEach(x => { if (x.type === 'inbound-rtp' && x.kind === 'audio') bytes = x.bytesReceived; }); }
    const res = { state: a.connectionState, ms: Date.now() - t0, relays: relays.slice(0, 3), track: got, bytes };
    a.close(); b.close(); s.getTracks().forEach(t => t.stop());
    return res;
  }, ice);
  out.push(name + ': ' + JSON.stringify(r));
}
await br.close();
console.log(out.join('\n')); fs.writeFileSync('out.txt', out.join('\n'));
