/* Lofi mode: slowed, softened, with reverb and echo, and an optional natural sound underneath.
   The slowing is done ahead of time (Prep): the song is stretched into a ready buffer, so playback is smooth and cannot be broken up by a busy screen.
   While it is being prepared, the song plays live so there is no wait. The natural sounds are short events at irregular times (Amb). */
(() => {
'use strict';
const A = () => window.Android, F = { on: false, amb: '', o: { slow: 14, rev: 45, echo: 30, warm: 50, vol: 50, mus: 100, fx: 100, keep: true } };
let musMul = 1, slStart = 0, slLen = 0, slT = 0, mixS = {}, driftS = {}, g = null, ch = null, ab = null, prevRate = 1, cur = null, bufR = null, bsrc = null, b0 = 0, bt0 = 0, wired = false, drift = 0, rest = 0;
const tc = (p, v, t = .6) => { try { p.setTargetAtTime(v, g.ac.currentTime, t); } catch (e) {} };
function impulse(ac, sec = 2.8) {
  const n = Math.round(ac.sampleRate * sec), b = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
  return b;
}
function chain() {
  g = g || (A() && A().graph && A().graph()); if (!g) return false;
  if (ch) return true; const ac = g.ac;
  const elG = ac.createGain(), bufG = ac.createGain(); bufG.gain.value = 0; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000; lp.Q.value = .5;
  const dry = ac.createGain(), conv = ac.createConvolver(), wet = ac.createGain(), dl = ac.createDelay(1.5), fbk = ac.createGain(), eg = ac.createGain(), out = ac.createGain();
  conv.buffer = impulse(ac); wet.gain.value = 0; dl.delayTime.value = .42; fbk.gain.value = .32; eg.gain.value = 0; dry.gain.value = 1;
  lp.connect(dry); dry.connect(out); lp.connect(conv); conv.connect(wet); wet.connect(out); lp.connect(dl); dl.connect(fbk); fbk.connect(dl); dl.connect(eg); eg.connect(out);
  elG.connect(lp); bufG.connect(lp); out.connect(g.mix); ch = { lp, dry, wet, eg, out, fbk, elG, bufG }; return true;
}
function apply() {
  if (!ch) return; const o = F.o, on = F.on;
  const sl = F.sl || 0; tc(ch.lp.frequency, on ? (19000 - o.warm / 100 * 15500) * (1 - .5 * sl) : 19000, .8);
  const k = o.fx / 100; tc(ch.wet.gain, on ? o.rev / 100 * .75 * k * (1 + .6 * sl) : 0, .8); tc(ch.eg.gain, on ? o.echo / 100 * .55 * k * (1 + .4 * sl) : 0, .8); tc(ch.out.gain, on ? o.mus / 100 * musMul : 1, .4); tc(ch.fbk.gain, .18 + o.echo / 100 * .3, .8);
  tc(ch.dry.gain, on ? 1 - o.rev / 100 * .25 : 1, .8);
}

/* the prepared song: a stretched buffer; the main element keeps time silently (and carries the lock-screen controls) */
const useBuf = () => F.on && F.o.keep && F.o.slow >= 2;
function rate() { const el = A().el; if (!el) return; const kp = !!F.o.keep; try { el.preservesPitch = kp; el.mozPreservesPitch = kp; el.webkitPreservesPitch = kp; } catch (e) {} const r = 1 - F.o.slow / 100; el.defaultPlaybackRate = r; el.playbackRate = r; }
function killBuf(fast) { if (!bsrc) return; const s = bsrc; bsrc = null; try { const t = g.ac.currentTime; ch.bufG.gain.cancelScheduledValues(t); ch.bufG.gain.setTargetAtTime(0, t, fast ? .02 : .08); s.stop(t + (fast ? .1 : .4)); } catch (e) {} }
function sync() { /* start the buffer where the element is, then hand the sound over */
  if (!F.on || !bufR || !g) return; const el = A().el; killBuf(true);
  if (bufR._id !== cur) { tc(ch.elG.gain, 1, .1); return; } if (el.paused || !useBuf()) { tc(ch.elG.gain, 1, .1); return; }
  const ac = g.ac, s = ac.createBufferSource(); s.buffer = bufR; s.connect(ch.bufG); const off = Math.min(bufR.duration - .05, Math.max(0, el.currentTime / bufR._r)); s.start(0, off); b0 = off; bt0 = ac.currentTime; bsrc = s;
  s.onended = () => { if (bsrc === s) bsrc = null; };
  const t = ac.currentTime; ch.bufG.gain.cancelScheduledValues(t); ch.bufG.gain.setValueAtTime(0, t); ch.bufG.gain.linearRampToValueAtTime(1, t + .25); ch.elG.gain.cancelScheduledValues(t); ch.elG.gain.setValueAtTime(ch.elG.gain.value, t); ch.elG.gain.linearRampToValueAtTime(0, t + .25);
}
function wire() {
  if (wired) return; wired = true; const el = A().el;
  ['pause', 'ended'].forEach(k => el.addEventListener(k, () => { if (F.on) { killBuf(); tc(ch.elG.gain, 1, .05); } }));
  el.addEventListener('mp-track', () => {}); addEventListener('mp-track', () => { if (!F.on) return; const id = A().nowId && A().nowId(); if (id && id !== cur) F.track(id); });
  ['playing', 'seeked'].forEach(k => el.addEventListener(k, () => { if (F.on && bufR && useBuf()) sync(); }));
  drift = setInterval(() => { if (!F.on || !bsrc || !bufR) return; const el = A().el, pos = b0 + (g.ac.currentTime - bt0), want = el.currentTime / bufR._r; if (Math.abs(pos - want) > .35) sync(); }, 1000);
}
let reqId = 0;
function prepare(id) {
  bufR = null; killBuf(); if (ch) tc(ch.elG.gain, 1, .1); if (!F.on || !id || !useBuf() || !g) return;
  const my = ++reqId, r = 1 - F.o.slow / 100, d = A().el && A().el.duration; if (d && d > 720) return;
  Prep.slowed(g.ac, id, r).then(b => { if (my !== reqId || !F.on || cur !== id) return; bufR = b; bufR._id = id; sync(); }).catch(() => {});
}
F.bufId = () => bufR && bufR._id;
F.ready = () => !!(bufR && bsrc);
F.track = id => { cur = id; if (F.on) prepare(id); };
F.prefetch = id => { if (!F.on || !id || !useBuf() || !g) return; Prep.slowed(g.ac, id, 1 - F.o.slow / 100).catch(() => {}); };
F.set = o => { const old = F.o.slow, ok = F.o.keep; Object.assign(F.o, o); apply(); if (F.on) { rate(); if (old !== F.o.slow || ok !== F.o.keep) { clearTimeout(rest); rest = setTimeout(() => { Prep.clear(); prepare(cur); }, 700); } } if (F.amb) ambGain(); };
F.start = () => {
  if (!chain()) return false; const el = A().el;
  if (!F.on) { prevRate = el.playbackRate || 1; try { g.src.disconnect(g.mix); } catch (e) {} g.src.connect(ch.elG); }
  F.on = true; wire(); rate(); apply(); if (g.ac.state === 'suspended') g.ac.resume(); prepare(cur); return true;
};
F.stop = () => {
  if (!F.on) return; F.sleep(0); F.on = false; reqId++; killBuf(); clearTimeout(rest); const el = A().el;
  if (ch) tc(ch.elG.gain, 1, .1);
  if (el) { try { el.preservesPitch = true; } catch (e) {} el.defaultPlaybackRate = prevRate; el.playbackRate = prevRate; }
  apply(); bufR = null; setTimeout(() => { if (F.on) return; Prep.clear(); }, 1000);
  setTimeout(() => { if (F.on || !g || !ch) return; try { g.src.disconnect(ch.elG); } catch (e) {} try { g.src.connect(g.mix); } catch (e) {} }, 1800);
};

/* ---- natural sounds: a mixer of recordings (see amb.js) ---- */
const vol = () => F.o.vol / 100;
let ambMul = 1;
function ambGain() { if (ab) tc(ab.gain, vol() * ambMul, .5); }
F.mix = (m, d) => {
  mixS = m || mixS; driftS = d || driftS; const any = Object.values(mixS).some(x => x && x.on && x.vol > 0);
  if (!any || !window.Amb) { stopAmb(); F.amb = ''; return true; }
  g = g || (A() && A().graph && A().graph()); if (!g) { F.amb = ''; return false; }
  if (!ab) { ab = g.ac.createGain(); ab.gain.value = 0; ab.connect(g.master); ab.gain.setTargetAtTime(vol() * ambMul, g.ac.currentTime, .8); }
  Amb.start(g.ac, ab, mixS, driftS); F.amb = 'mix'; if (g.ac.state === 'suspended') g.ac.resume(); return true;
};
function stopAmb() { const o = ab; ab = null; if (window.Amb) Amb.stop(); if (o) setTimeout(() => { try { o.disconnect(); } catch (e) {} }, 4200); }
F.hush = h => { if (ab) tc(ab.gain, h ? 0 : vol() * ambMul, .8); };
/* sleep: over the chosen time the music softens (darker, more reverb and echo), then fades out; the natural sounds stay longest, then fade too */
F.sleep = min => {
  clearInterval(slT); slLenSet(min); F.sl = 0; musMul = 1; ambMul = 1; if (F.on) { apply(); ambGain(); } if (!min) return;
  slT = setInterval(() => {
    const p = Math.min(1, (Date.now() - slStart) / slLen); F.sl = Math.min(1, p / .6);
    musMul = p < .3 ? 1 : p < .8 ? Math.pow(1 - (p - .3) / .5, 1.5) : 0; ambMul = p < .7 ? 1 : Math.pow(Math.max(0, 1 - (p - .7) / .3), 1.5);
    if (F.on) { apply(); ambGain(); } if (p >= 1) { clearInterval(slT); slT = 0; F.sl = 0; musMul = 1; ambMul = 1; F.onSleepEnd && F.onSleepEnd(); }
  }, 1000);
};
function slLenSet(min) { slStart = Date.now(); slLen = Math.max(.05, min) * 60000; }
F.sleepLeft = () => slT ? Math.max(0, slStart + slLen - Date.now()) : 0;

window.Fx = F;
})();
