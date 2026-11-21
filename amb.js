/* Natural sounds for Lofi mode and sleep (engine 2).
   Goals: never silent, never fragmented, never the same twice.
   - Sounds are planned seconds ahead on the audio clock (4 s, growing to 10 s if the phone is busy), and the timer lives in a Worker,
     so a busy screen cannot make a sound late. All recordings are decoded once and kept in memory while the mode is on.
   - Beds (rain, crickets, birds' background) are three overlapping voices, each playing random stretches with its own pitch, brightness and place;
     stretches are chosen from the least recently heard parts of the recording, so the same minute is not heard twice for as long as possible.
   - Birds are cut into single calls and sung in small flocks over a soft background. Thunder is built from several recordings (as before).
   - A watchdog resumes a suspended audio engine, rebuilds a stalled one, retries failed downloads, and meanwhile plays a made sound,
     so there is always something natural to hear.
   Each sound has its own volume, and can drift by itself between a quietest and a loudest level at its own pace. */
(() => {
'use strict';
const R = (a, b) => a + Math.random() * (b - a), M = {};
const THUNDER = ['sounds/thunder-1.mp3', 'sounds/thunder-2.mp3', 'sounds/thunder-3.mp3', 'sounds/thunder-4.mp3', 'sounds/thunder-5.mp3'].map(f => [f, 1]);
M.CAT = [
  { id: 'soft', name: 'Soft rain', kind: 'bed', file: 'sounds/rain-soft.mp3', syn: 'rain-soft', voices: 3 },
  { id: 'heavy', name: 'Heavy rain', kind: 'bed', file: 'sounds/rain-heavy.mp3', syn: 'rain-heavy', voices: 3 },
  { id: 'thunder', name: 'Thunder', kind: 'event', files: THUNDER, gap: [45, 150], g: 2.4, syn: 'thunder' },
  { id: 'crickets', name: 'Night crickets', kind: 'bed', file: 'sounds/crickets.mp3', syn: 'crickets', voices: 3 },
  { id: 'birds', name: 'Morning birds', kind: 'bed', file: 'sounds/birds.mp3', syn: 'birds', voices: 1, calls: true }
];
const PACE = { slow: [45, 100], medium: [18, 45], lively: [7, 18], wander: [6, 100] };
let ac = null, out = null, dest = null, wk = 0, fbT = 0, layers = {}, drift = { on: false, min: 35, max: 100, pace: 'slow', pan: true, panw: 70 }, mix = {};
let LOOK = 4, lastWall = 0, chkWall = 0, chkCT = 0, stalls = 0, restarts = 0, late = 0, lastRebuild = 0, health = 'idle';
const A = new Map();   /* file -> { buf, p, tries, next, fake, calls } */
const curve = (up, n = 48) => { const c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = up ? Math.sin(i / (n - 1) * Math.PI / 2) : Math.cos(i / (n - 1) * Math.PI / 2); return c; };
const UP = curve(true), DOWN = curve(false);
const vg = v => Math.pow(Math.max(0, Math.min(100, v)) / 100, 1.4); /* more room at the quiet end */

/* ---------- made sounds: used only while a recording cannot be loaded ---------- */
function synth(kind) {
  const sr = ac.sampleRate, len = Math.round(sr * (kind === 'thunder' ? 9 : 24)), b = ac.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let b0 = 0, b1 = 0, b2 = 0, lp = 0, ph = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913; const p = (b0 + b1 + b2 + w * .1848) * .11, t = i / sr;
      if (kind === 'rain-soft' || kind === 'rain-heavy') { const h = kind === 'rain-heavy'; lp += (p - lp) * (h ? .5 : .35); d[i] = (p - lp * .6) * (h ? 1.3 : .8) + (Math.random() < (h ? .0016 : .0007) ? (Math.random() - .5) * .45 : 0); }
      else if (kind === 'crickets') { ph += 2 * Math.PI * (4600 + 70 * Math.sin(t * .7 + c)) / sr; const am = Math.max(0, Math.sin(2 * Math.PI * 27 * t)) * (Math.sin(2 * Math.PI * .31 * t + c * 2) > -.35 ? 1 : 0); d[i] = Math.sin(ph) * am * .14 + w * .004; }
      else if (kind === 'birds') d[i] = p * .02;
      else { lp += (w - lp) * .012; d[i] = lp * 3.2 * Math.exp(-t / 3) * (1 + .4 * Math.sin(t * 6)); }
    }
  }
  if (kind === 'birds') for (let k = 0; k < 16; k++) { const st = Math.round(R(.2, 22) * sr), n = Math.round(R(.14, .45) * sr), f0 = R(2400, 5200), sw = R(-1500, 2200); let ph = 0; for (let i = 0; i < n && st + i < len; i++) { const e = Math.sin(Math.PI * i / n) ** 2, f = f0 + sw * i / n + 380 * Math.sin(i / sr * 55); ph += 2 * Math.PI * f / sr; for (let c = 0; c < 2; c++) b.getChannelData(c)[st + i] += Math.sin(ph) * e * .22; } }
  return b;
}
/* ---------- recordings: decoded once, kept in memory, retried with growing waits ---------- */
function want(f, syn) {
  let a = A.get(f); if (!a) { a = { buf: null, p: null, tries: 0, next: 0, fake: false, calls: null }; A.set(f, a); }
  const now = performance.now(); if ((a.buf && !a.fake) || a.p || now < a.next || !ac) return a;
  a.p = (f.indexOf('user:') === 0 ? Promise.resolve(M.userGet ? M.userGet(f.slice(5)) : null).then(x => { if (!x) throw new Error(f); return x; }) : fetch(f).then(r => { if (!r.ok) throw new Error(f); return r.arrayBuffer(); })).then(x => ac.decodeAudioData(x)).then(b => { a.buf = b; a.fake = false; a.tries = 0; a.calls = null; })
    .catch(() => { a.tries++; a.next = performance.now() + Math.min(60000, 2000 * Math.pow(2, a.tries)); if (!a.buf && syn) { try { a.buf = synth(syn); a.fake = true; a.calls = null; } catch (e) {} } })
    .then(() => { a.p = null; });
  return a;
}
/* single bird calls, found by loudness: runs above a threshold, joined when close, padded a little */
function findCalls(buf) {
  const d = buf.getChannelData(0), sr = buf.sampleRate, B = Math.round(sr * .04), n = Math.floor(d.length / B), e = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = 0; j < B; j += 4) { const v = d[i * B + j]; s += v * v; c++; } e[i] = Math.sqrt(s / c); }
  const so = Float32Array.from(e).sort(), thr = Math.max(so[n * .5 | 0] * 2.2, so[n * .9 | 0] * .45), runs = []; let st = -1;
  for (let i = 0; i <= n; i++) { const hot = i < n && e[i] > thr; if (hot && st < 0) st = i; else if (!hot && st >= 0) { runs.push([st * .04, i * .04]); st = -1; } }
  const m = []; runs.forEach(c => { const l = m[m.length - 1]; if (l && c[0] - l[1] < .3) l[1] = c[1]; else m.push([c[0], c[1]]); });
  return m.map(([x, y]) => [Math.max(0, x - .1), Math.min(buf.duration, Math.min(y + .15, x + 4))]).filter(([x, y]) => y - x > .2);
}
const QC = new WeakMap();
/* quiet moments of a recording (local lows of a 0.2 s loudness curve) and whether it is rhythmic */
function quietAt(buf) {
  if (QC.has(buf)) return QC.get(buf); let r = null;
  try {
    const sr = buf.sampleRate, W = .2, d = buf.getChannelData(0), n = Math.floor(d.length / (sr * W)), e = new Float32Array(n), B = Math.round(sr * W);
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < B; j += 4) { const v = d[i * B + j]; s += v * v; } e[i] = Math.sqrt(s / (B / 4)); }
    const so = Float32Array.from(e).sort(), p30 = so[n * .3 | 0], p50 = so[n * .5 | 0] || 1e-6, p90 = so[n * .9 | 0], t = [];
    for (let i = 1; i < n - 1; i++) if (e[i] <= p30 && e[i] <= e[i - 1] && e[i] <= e[i + 1]) t.push(i * W + W / 2);
    r = t.length >= 3 ? { t, rh: p90 / p50 > 2.2 } : null;
  } catch (x) {}
  QC.set(buf, r); return r;
}
const snapQ = (x, T, max) => { let b = x, bd = max; for (const v of T) { const d = Math.abs(v - x); if (d < bd) { bd = d; b = v; } } return b; };
function mk(def) {
  const bus = ac.createGain(), dg = ac.createGain(), pn = ac.createStereoPanner ? ac.createStereoPanner() : null; bus.gain.value = 0; dg.gain.value = 1; if (pn) { dg.connect(pn); pn.connect(bus); } else dg.connect(bus); bus.connect(out);
  const n = def.voices || 0;
  return { def, bus, dg, pn, nextP: 0, nextE: ac.currentTime + R(6, 20), nextC: ac.currentTime + R(1, 5), nextD: 0, last: -1, hist: [], srcs: [], gone: 0, vol: 0, until: 0, cells: null, cb: null, err: 0, vs: Array.from({ length: n }, (_, i) => ({ nextT: 0, i })), rec: [] };
}
function setVol(L, on, vol) {
  const t = ac.currentTime; L.vol = on ? vol : 0; L.bus.gain.cancelScheduledValues(t); L.bus.gain.setTargetAtTime(on ? vg(vol) * (L.def.g || 1) : 0, t, on ? .9 : .6);
}
const keep = (L, s, e) => { L.srcs.push(s); s.onended = () => { L.srcs = L.srcs.filter(x => x !== s); try { e.disconnect(); } catch (x) {} }; };
/* ---------- beds: overlapping voices, each stretch unique ---------- */
function stretch(L, V, b, now) {
  const dur = b.duration, calls = !!L.def.calls, n = L.def.voices || 1;
  let len = Math.min(dur - .6, R(10, 28)), rate = R(.965, 1.035); const need = (len + .2) * rate; if (need > dur - .1) { len = (dur - .2) / rate - .2; }
  let X = Math.min(3.6, len * .25), srcLen = (len + .15) * rate, maxOff = Math.max(0, dur - srcLen - .05), CELL = 3, nc = Math.ceil(dur / CELL);
  if (!L.cells || L.cells.length !== nc) L.cells = new Float64Array(nc);
  let best = 0, bs = -1; for (let k = 0; k < 7; k++) { const o = R(0, maxOff); let sc = 0, c0 = Math.floor(o / CELL), c1 = Math.min(nc - 1, Math.floor((o + srcLen) / CELL)); for (let c = c0; c <= c1; c++) sc += now - L.cells[c]; sc /= (c1 - c0 + 1); if (sc > bs) { bs = sc; best = o; } }
  { const c0 = Math.floor(best / CELL), c1 = Math.min(nc - 1, Math.floor((best + srcLen) / CELL)); for (let c = c0; c <= c1; c++) L.cells[c] = now; }
  /* hide the seam: start and end each stretch at a quiet moment, and cross-fade for a different length every time
     (long and soft for steady sounds, short for rhythmic ones, so a beat is never smeared) */
  const Q = quietAt(b);
  if (Q) {
    best = snapQ(best, Q.t, 1.2); const e2 = snapQ(best + srcLen, Q.t, 1.5), sl = e2 - best;
    if (sl > 6 * rate && best + sl <= dur - .05) { srcLen = sl; len = sl / rate - .15; }
    X = Math.min(Q.rh ? R(.5, 1.3) : R(1.6, 3.8), len * .3);
  } else X = Math.min(R(1.6, 3.6), len * .25);
  const t = Math.max(V.nextT, now + .08), s = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain(), p = ac.createStereoPanner ? ac.createStereoPanner() : null;
  s.buffer = b; s.playbackRate.value = rate; f.type = 'lowpass'; f.frequency.value = calls ? 1500 : R(7500, 16000); f.Q.value = .4;
  e.gain.setValueAtTime(0, t); e.gain.setValueCurveAtTime(UP, t, X); e.gain.setValueAtTime(1, t + X + .002); e.gain.setValueAtTime(1, t + len - X); e.gain.setValueCurveAtTime(DOWN, t + len - X + .002, X - .004);
  const vgn = (calls ? .5 : .95) / Math.sqrt(n), g = ac.createGain(); g.gain.value = vgn;
  s.connect(f); f.connect(e); e.connect(g); if (p) { p.pan.value = R(-.45, .45); g.connect(p); p.connect(L.dg); } else g.connect(L.dg);
  s.start(t, best, srcLen); keep(L, s, g); V.nextT = t + len - X; L.until = Math.max(L.until, t + len);
}
function planBed(L, now, a) {
  if (!a.buf || L.vol <= 0) return;
  L.vs.forEach(V => { if (V.nextT < now) V.nextT = now + .1 + V.i * R(.5, 2.5); let g = 0; while (V.nextT < now + LOOK && g++ < 6) stretch(L, V, a.buf, now); });
}
/* ---------- bird calls in small flocks ---------- */
function planCalls(L, now, a) {
  if (!a.buf || L.vol <= 0) return; if (!a.calls) a.calls = findCalls(a.buf); const C = L.def.off && L.def.off.size ? a.calls.filter((x, i) => !L.def.off.has(i)) : a.calls; if (C.length < 3) return;
  let g = 0; while (L.nextC < now + LOOK && g++ < 4) {
    const k = 1 + (Math.random() * 4 | 0), base = Math.max(L.nextC, now + .15), dist = R(0, 1), pan = R(-.8, .8); let t = base;
    for (let j = 0; j < k; j++) {
      let i, tr = 0; do { i = Math.random() * C.length | 0; } while (L.rec.includes(i) && tr++ < 20); L.rec.push(i); if (L.rec.length > Math.min(8, C.length - 1)) L.rec.shift();
      const [x, y] = C[i], len = y - x, rate = R(.93, 1.09), s = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain(), p = ac.createStereoPanner ? ac.createStereoPanner() : null, lvl = R(.45, 1) * (1 - .55 * dist);
      s.buffer = a.buf; s.playbackRate.value = rate; f.type = 'lowpass'; f.frequency.value = R(6000, 13000) * (1 - .5 * dist);
      const dd = len / rate; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(lvl, t + .04); e.gain.setValueAtTime(lvl, t + Math.max(.05, dd - .2)); e.gain.linearRampToValueAtTime(0, t + dd);
      s.connect(f); f.connect(e); if (p) { p.pan.value = Math.max(-1, Math.min(1, pan + R(-.15, .15))); e.connect(p); p.connect(L.dg); } else e.connect(L.dg);
      s.start(t, x, len + .05); keep(L, s, e); L.until = Math.max(L.until, t + dd); t += dd * R(.5, 1.1) + R(.25, 1.6);
    }
    L.nextC = t + R(2.5, 13);
  }
}
/* ---------- events: planned ahead, built from several recordings ---------- */
const heavy = () => { const h = mix.heavy, s = mix.soft; return Math.max(0, Math.min(1, (h && h.on ? h.vol / 100 : 0) + (s && s.on ? s.vol / 200 : 0))); };
function storm(L, t0, bufs) {
  const d = L.def, n = d.files.length, hv = heavy(); let a, b, c, sig, tries = 0; const pick = (...no) => { let i; do { i = Math.random() * n | 0; } while (no.includes(i)); return i; };
  do { a = pick(); b = pick(a); c = pick(a, b); sig = a + '.' + b + '.' + c; } while (L.hist.includes(sig) && tries++ < 24);
  L.hist.push(sig); if (L.hist.length > 16) L.hist.shift();
  const [A1, B1, C1] = [a, b, c].map(i => bufs[i]), dist = R(0, 1), lvl = (.95 + 1.25 * hv) * (1 - .4 * dist), pan = R(-.8, .8);
  /* the plan: up to three layers, each a slice of a recording with its own pace, tone, fades and place */
  const plan = [[A1, R(0, .5), R(1.8, 3), 0, lvl * R(.9, 1.1), R(.92, 1.08), R(2600, 8000) * (1 - .55 * dist), .02, 1.2, pan], [B1, R(.3, B1.duration * .35), R(5, 10), R(.15, .5), lvl * R(.8, 1) * .9, R(.82, 1), R(500, 1500) * (1 - .4 * dist), .5, 3, pan * .8]];
  if (Math.random() < .7) plan.push([C1, R(.5, C1.duration * .4), R(4, 8), R(.9, 2.6), lvl * R(.35, .6), R(.75, .95), R(300, 800), .8, 3, -pan * .6]);
  const setup = (cx, dest, t0x, add) => plan.forEach(([buf, off, len, delay, gain, rate, lp, fi, fo, pn]) => {
    const s = cx.createBufferSource(), f = cx.createBiquadFilter(), g = cx.createGain(), p = cx.createStereoPanner ? cx.createStereoPanner() : null, t = t0x + delay;
    s.buffer = buf; s.playbackRate.value = rate; f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = .5;
    len = Math.max(.5, Math.min(len, (buf.duration - off) / rate - .05));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + fi); g.gain.setValueAtTime(gain, t + Math.max(fi, len - fo)); g.gain.linearRampToValueAtTime(0, t + len);
    s.connect(f); f.connect(g); if (p) { p.pan.value = pn; g.connect(p); p.connect(dest); } else g.connect(dest);
    s.start(t, Math.min(off, Math.max(0, buf.duration - .6)), len + .05); add(s, g, t + len);
  });
  const total = Math.max(...plan.map(q => q[3] + Math.max(.5, Math.min(q[2], (q[0].duration - q[1]) / q[5] - .05)))) + .3;
  L.until = Math.max(L.until, t0 + total);
  /* one finished sound is made ahead of time, so the live engine only has to play it (a single source, no filters at play time) */
  try {
    const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext, sr = ac.sampleRate, oc = new Off(2, Math.ceil(total * sr), sr);
    setup(oc, oc.destination, 0, () => {});
    oc.startRendering().then(rb => {
      if (!out || !layers[d.id] || layers[d.id] !== L) return;
      const s = ac.createBufferSource(), e = ac.createGain(); s.buffer = rb; s.connect(e); e.connect(L.dg); s.start(Math.max(t0, ac.currentTime + .05)); keep(L, s, e);
    }).catch(() => live());
  } catch (x) { live(); }
  function live() { setup(ac, L.dg, t0, (s, g) => keep(L, s, g)); }
}
function planEvent(L, now) {
  const d = L.def; if (L.vol <= 0 || L.nextE > now + LOOK) return;
  const rs = d.files.map(f => want(f[0], d.syn)); if (!rs.every(x => x.buf)) return;
  const t = Math.max(L.nextE, now + .2), hv = heavy();
  if (d.id === 'thunder') { storm(L, t, rs.map(x => x.buf)); L.nextE = t + R(d.gap[0], d.gap[1]) * (1.25 - .55 * hv) + 20; return; }
  let i; do { i = Math.random() * d.files.length | 0; } while (d.files.length > 1 && i === L.last); L.last = i;
  const [, gn] = d.files[i], b = rs[i].buf, s = ac.createBufferSource(), lp = ac.createBiquadFilter(), e = ac.createGain(); s.buffer = b; s.playbackRate.value = R(.9, 1.04); lp.type = 'lowpass'; lp.frequency.value = R(1400, 7000); e.gain.value = gn * R(.55, 1);
  s.connect(lp); lp.connect(e); e.connect(L.dg); s.start(t); keep(L, s, e); L.until = Math.max(L.until, t + b.duration); L.nextE = t + R(d.gap[0], d.gap[1]) + 30;
}
/* each sound wanders slowly left and right on its own, never in step with the others */
function panning(L, now) {
  if (!L.pn || now < L.nextP) return; const t = ac.currentTime, w = Math.max(0, Math.min(100, drift.panw)) / 100;
  if (!drift.pan || w === 0) { L.nextP = now + 4; L.pn.pan.setTargetAtTime(0, t, 1.2); return; }
  const T = R(10, 30), cur = L.pn.pan.value, side = cur > .1 ? -1 : cur < -.1 ? 1 : (Math.random() < .5 ? -1 : 1);
  L.nextP = now + T; L.pn.pan.setTargetAtTime(side * R(.35, 1) * w, t, T * .35);
}
function drifting(L, now) {
  if (now < L.nextD) return; const [a, b] = PACE[drift.pace] || PACE.slow, T = R(a, b); L.nextD = now + T; const t = ac.currentTime;
  if (!drift.on) { L.dg.gain.setTargetAtTime(1, t, 1.2); return; }
  const lo = Math.min(drift.min, drift.max) / 100, hi = Math.max(drift.min, drift.max) / 100; L.dg.gain.setTargetAtTime(R(lo, hi), t, Math.max(1.5, T * .35));
}
/* ---------- the clock, the watchdog and the rebuild ---------- */
function tick() {
  if (!ac || !out) return; const wall = performance.now(), now = ac.currentTime;
  if (ac.state === 'closed') { M.stop(true); return; }
  if (ac.state !== 'running') { health = 'recovering'; try { ac.resume(); } catch (e) {} lastWall = wall; chkWall = wall; chkCT = now; return; }
  if (lastWall && wall - lastWall > 700) { LOOK = Math.min(10, LOOK + 1); late++; } else if (LOOK > 4 && Math.random() < .004) LOOK = Math.max(4, LOOK - .5);
  lastWall = wall;
  if (!chkWall) { chkWall = wall; chkCT = now; } else if (wall - chkWall >= 1500) { if (now - chkCT < .25) stalls++; else stalls = 0; chkWall = wall; chkCT = now; if (stalls >= 2 && wall - lastRebuild > 8000) { rebuild(); return; } }
  let ahead = 99, bad = 0;
  Object.values(layers).forEach(L => {
    try {
      const a = L.def.file ? want(L.def.file, L.def.syn) : null;
      if (L.def.kind === 'bed') { planBed(L, now, a); if (L.def.calls) planCalls(L, now, a); } else planEvent(L, now);
      drifting(L, now); panning(L, now);
      if (L.def.kind === 'bed' && L.vol > 0 && a && a.buf) { const ah = L.until - now; if (ah < ahead) ahead = ah; if (ah < .4) { L.vs.forEach(V => { V.nextT = 0; }); late++; } }
      if (a && a.fake) bad++;
    } catch (e) { L.err++; L.vs.forEach(V => { V.nextT = 0; }); }
  });
  health = ahead < .3 ? 'recovering' : 'ok'; M._bad = bad; M._ahead = ahead === 99 ? null : +ahead.toFixed(1);
}
function begin() {
  clearInterval(fbT); if (wk) { try { wk.terminate(); } catch (e) {} wk = 0; }
  try { const u = URL.createObjectURL(new Blob(['let t=setInterval(()=>postMessage(0),100)'], { type: 'text/javascript' })); wk = new Worker(u); wk.onmessage = tick; URL.revokeObjectURL(u); } catch (e) { wk = 0; }
  if (!wk) fbT = setInterval(tick, 200);
}
function build(m, d) {
  out = ac.createGain(); out.gain.value = 0; const cm = ac.createDynamicsCompressor(); cm.threshold.value = -8; cm.knee.value = 8; cm.ratio.value = 6; out.connect(cm); cm.connect(dest); out.gain.setTargetAtTime(1, ac.currentTime, 1.2);
  layers = {}; mix = m || {}; drift = Object.assign({ on: false, min: 35, max: 100, pace: 'slow', pan: true, panw: 70 }, d || {}); lastWall = 0; chkWall = 0; stalls = 0; M.update(mix, drift); begin();
}
function rebuild() {
  restarts++; lastRebuild = performance.now(); health = 'recovering'; const m = mix, d = drift, o = out, old = layers; layers = {}; out = null;
  Object.values(old).forEach(L => { try { L.srcs.forEach(x => x.stop()); } catch (e) {} clearTimeout(L.gone); });
  try { o.disconnect(); } catch (e) {} try { ac.resume(); } catch (e) {}
  build(m, d);
}
document.addEventListener('visibilitychange', () => { if (ac && out) { try { if (ac.state !== 'running') ac.resume(); } catch (e) {} tick(); } });
/* mixSet: { id: {on, vol} }, driftSet: {on, min, max, pace} */
M.update = (m, d) => {
  if (!ac) return; mix = m || mix; drift = Object.assign(drift, d || {});
  M.CAT.forEach(def => {
    const s = mix[def.id] || { on: false, vol: 0 }, on = !!s.on && s.vol > 0; let L = layers[def.id];
    if (on) {
      if (!L) { L = layers[def.id] = mk(def); (def.kind === 'bed' ? [def.file] : def.files.map(f => f[0])).forEach(f => want(f, def.syn)); }
      clearTimeout(L.gone); L.gone = 0; if (!(L.vol > 0)) L.nextD = 0; setVol(L, true, s.vol);
    } else if (L) { setVol(L, false, 0); L.nextD = 1e9; if (!L.gone) L.gone = setTimeout(() => { if (layers[def.id] !== L) return; try { L.srcs.forEach(x => x.stop()); } catch (e) {} try { L.bus.disconnect(); } catch (e) {} delete layers[def.id]; }, 3500); }
  });
};
M.start = (ctx, dst, m, d) => {
  if (ac === ctx && out && (wk || fbT)) { M.update(m, d); return true; }
  M.stop(true); ac = ctx; dest = dst; try { ac.onstatechange = () => { if (out && ac.state !== 'running' && ac.state !== 'closed') { try { ac.resume(); } catch (e) {} } }; } catch (e) {}
  build(m, d); return true;
};
M.stop = quick => {
  clearInterval(fbT); fbT = 0; if (wk) { try { wk.terminate(); } catch (e) {} wk = 0; } const o = out, old = layers; layers = {}; out = null; health = 'idle'; if (!o) return;
  try { o.gain.cancelScheduledValues(ac.currentTime); o.gain.setTargetAtTime(0, ac.currentTime, quick ? .05 : .8); } catch (e) {}
  setTimeout(() => { Object.values(old).forEach(L => { try { L.srcs.forEach(x => x.stop()); } catch (e) {} clearTimeout(L.gone); }); try { o.disconnect(); } catch (e) {} if (!out) A.clear(); }, quick ? 300 : 4000);
};
/* ---------- my own sounds: read, trimmed, levelled, sorted into steady or separate sounds, written as a small WAV ---------- */
const BASE = M.CAT.length; M.userGet = null;
M.setUser = list => { M.CAT.length = BASE; (list || []).forEach(u => M.CAT.push({ id: u.id, name: u.name, kind: 'bed', file: 'user:' + u.id, syn: null, voices: u.type === 'sounds' ? 1 : 3, calls: u.type === 'sounds', off: new Set(u.off || []), user: true })); M.CAT.forEach(d => { if (layers[d.id]) layers[d.id].def = d; }); Object.keys(layers).forEach(k => { if (!M.CAT.some(d => d.id === k)) { const L = layers[k]; try { L.srcs.forEach(x => x.stop()); L.bus.disconnect(); } catch (e) {} delete layers[k]; } }); };
M.forget = id => { A.delete('user:' + id); };
const env = (d, sr, w = .05) => { const B = Math.max(1, Math.round(sr * w)), n = Math.floor(d.length / B), e = new Float32Array(n); for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < B; j += 2) { const v = d[i * B + j]; s += v * v; } e[i] = Math.sqrt(s / (B / 2)); } return e; };
const wav = (d, sr) => { const n = d.length, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true); return new Blob([b], { type: 'audio/wav' }); };
/* returns { blob, secs, srcSecs, type, calls, peaks, notes[] } or throws a plain-English reason */
M.prepare = async (ab, maxSec = 600) => {
  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext; let buf;
  try { buf = await new Off(1, 1, 44100).decodeAudioData(ab); } catch (e) { throw new Error('This file could not be read as audio. Try an MP3, M4A, WAV or OGG file.'); }
  const sr = buf.sampleRate, notes = [], src = buf.duration; let n = buf.length, ch = buf.numberOfChannels;
  const m = new Float32Array(Math.min(n, Math.round(maxSec * sr))); if (n > m.length) notes.push('Only the first ' + Math.round(maxSec / 60) + ' minutes are used.');
  for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < m.length; i++) m[i] += d[i] / ch; }
  /* trim silence at both ends (quieter than a hundredth of the loudest stretch), keep a little room */
  let e = env(m, sr), pk = 0; for (let i = 0; i < e.length; i++) if (e[i] > pk) pk = e[i];
  if (pk < .0005) throw new Error('This file is silent.');
  const thr = pk * .02; let a0 = 0, a1 = e.length - 1; while (a0 < a1 && e[a0] < thr) a0++; while (a1 > a0 && e[a1] < thr) a1--;
  const s0 = Math.max(0, Math.round((a0 * .05 - .1) * sr)), s1 = Math.min(m.length, Math.round(((a1 + 1) * .05 + .15) * sr)); let d = m.subarray(s0, s1);
  if (s0 > sr * .3 || m.length - s1 > sr * .3) notes.push('Quiet ends trimmed (' + ((s0 + m.length - s1) / sr).toFixed(1) + ' s).');
  if (d.length < sr * 3) throw new Error('This sound is shorter than 3 seconds after trimming. Choose a longer recording.');
  d = Float32Array.from(d);
  /* take out any steady offset, then level: loudness to about -20 dB, peaks kept under -1 dB */
  let mean = 0; for (let i = 0; i < d.length; i += 7) mean += d[i]; mean /= Math.ceil(d.length / 7); let ss = 0, mx = 0; for (let i = 0; i < d.length; i++) { d[i] -= mean; const v = Math.abs(d[i]); ss += d[i] * d[i]; if (v > mx) mx = v; }
  const rms = Math.sqrt(ss / d.length) || 1e-4, gain = Math.min(.89 / mx, .1 / rms); for (let i = 0; i < d.length; i++) d[i] *= gain; notes.push('Levelled (' + (20 * Math.log10(gain)).toFixed(0) + ' dB).');
  /* short fade at both ends so no click is heard when it is cut */
  const f = Math.min(Math.round(sr * .03), d.length >> 2); for (let i = 0; i < f; i++) { const k = i / f; d[i] *= k; d[d.length - 1 - i] *= k; }
  /* steady or separate sounds: how much the loudness moves, and whether quiet gaps divide it into clear events */
  e = env(d, sr, .04); const so = Float32Array.from(e).sort(), p50 = so[e.length * .5 | 0] || 1e-5, p90 = so[e.length * .9 | 0], p10 = so[e.length * .1 | 0];
  const fake = { getChannelData: () => d, sampleRate: sr, duration: d.length / sr, length: d.length }, calls = findCalls(fake);
  const move = p90 / Math.max(p50, 1e-5), gaps = p10 < p50 * .35; let type = 'steady';
  if (calls.length >= 4 && (move > 2.2 || gaps) && d.length / sr < 180) type = 'sounds';
  const W = 120, peaks = []; for (let i = 0; i < W; i++) { let x = 0; const a = Math.floor(i * d.length / W), b = Math.floor((i + 1) * d.length / W); for (let j = a; j < b; j += 16) { const v = Math.abs(d[j]); if (v > x) x = v; } peaks.push(+x.toFixed(3)); }
  notes.push(type === 'sounds' ? calls.length + ' separate sounds found.' : 'Sounds like a steady background.');
  return { blob: wav(d, sr), secs: d.length / sr, srcSecs: src, type, calls: calls.map(c => [c[0] / (d.length / sr), c[1] / (d.length / sr)]), peaks, notes };
};
M.assets = () => { let real = 0, fake = 0; A.forEach(x => { if (x.buf && !x.fake) real++; else if (x.fake) fake++; }); return { real, fake }; };
M.running = () => !!(out && (wk || fbT));
M.live = () => Object.entries(layers).filter(([k, L]) => L.vol > 0).map(([k, L]) => ({ id: k, level: Math.min(1, L.vol / 100 * L.dg.gain.value), pan: L.pn ? L.pn.pan.value : 0 }));
M.quiet = quietAt;
M.health = () => ({ state: health, ahead: M._ahead, look: LOOK, late, restarts, fallback: M._bad || 0 });
M._force = id => { if (layers[id]) layers[id].nextE = 0; };
M.debug = () => Object.entries(layers).map(([k, L]) => [k, !!(L.def.file ? (A.get(L.def.file) || {}).buf : 1), L.srcs.length, +L.bus.gain.value.toFixed(3), +L.dg.gain.value.toFixed(2)]);
window.Amb = M;
})();
