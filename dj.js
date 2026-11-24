/* DJ mode (experimental): plays the sections of your songs you come back to, blends them with slow crossfades, and keeps going.
   It never changes your files.
   Each section is decoded and cut ahead of time into a ready buffer and scheduled on the audio clock, so crossfades are sample-exact and cannot stutter. The app tells it which songs to use (cfg.pool) and where the heat is (cfg.heat). */
(() => {
'use strict';
const A = () => window.Android;
const D = { on: false, paused: false, now: null, next: null, cfg: { pool: () => [], heat: () => null, loops: () => [] }, opt: { min: 20, max: 70, xf: 6 }, onchange: null, recent: [] };
let g = null, bus = null, cur = null, timer = 0, busy = false, skipping = false;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* which part of a song to use: chosen at random, leaning towards where your listening piled up, never the first 20 seconds,
   and steering away from sections and lengths it has already used for that song, so each mix is new */
D.hist = { sec: {}, pairs: [] }; D.lastId = null;
/* a short log, shown in Settings, so it is visible what DJ mode is doing and why it failed */
D.log = []; const lg = m => { const d = new Date(); D.log.unshift(d.toTimeString().slice(0, 8) + ' ' + m); D.log.length = Math.min(D.log.length, 6); try { dispatchEvent(new Event('lq-status')); } catch (e) {} };
D.status = () => D.on ? 'DJ is ' + (D.paused ? 'paused' : 'playing') + '; the next section is ' + (D.next || queued ? 'ready' : 'being prepared') + '.' + (D.log.length ? ' Latest: ' + D.log.slice(0, 3).join(' · ') : '') : 'DJ is off.' + (D.log.length ? ' Last time: ' + D.log.slice(0, 2).join(' · ') : '');
D.section = (song, heat) => {
  const d = song.d, bs = 5;
  /* sections you chose yourself with A-B repeat come first, most often, but never alone: the rest of the time the mix still finds its own parts */
  const lp = D.cfg.loops ? D.cfg.loops(song.id) : [];
  if (lp.length && Math.random() < .65) {
    const seen = D.hist.sec[song.id] || []; let pk = null, ps = 1e9;
    lp.forEach(([s0, l0]) => { const s = Math.max(0, Math.min(s0, d - 4)), l = Math.floor(Math.min(l0, d - s - 1, 120)); if (l < 4) return; const u = seen.filter(([us, ul]) => Math.abs(us - s) < 2 && Math.abs(ul - l) < 2).length, sc = u + Math.random() * .9; if (sc < ps) { ps = sc; pk = { s, l }; } });
    if (pk) return pk;
  }
  if (d < 45) return { s: 0, l: Math.max(10, Math.floor(d - 1)) };
  const lo0 = D.opt.min, hi0 = D.opt.max, maxL = Math.max(8, Math.min(hi0, d - 22)), minL = Math.max(6, Math.min(lo0, maxL - 3));
  const n = Math.ceil(d / bs), skip = 4, hv = heat && heat.some(Boolean) ? heat : null, hm = hv ? Math.max(1, ...hv.map(x => x || 0)) : 1;
  const used = D.hist.sec[song.id] || []; let best = null, bv = -1e9;
  for (let k = 0; k < 10; k++) {
    const l = Math.round(minL + Math.random() * (maxL - minL)); let s;
    if (!hv || Math.random() < .3) s = 20 + Math.random() * Math.max(1, d - 2 - l - 20);
    else { let tot = 0; const w = []; for (let i = skip; i < n - 2; i++) { const x = (hv[i] || 0) / hm + .12; w.push(x); tot += x; } let r = Math.random() * tot, i = 0; for (; i < w.length - 1; i++) { r -= w[i]; if (r <= 0) break; } s = (i + skip) * bs - Math.random() * l * .5; }
    s = Math.round(clamp(s, 20, d - 2 - l));
    let m = 0; if (hv) { let t = 0, c = 0; for (let i = Math.floor(s / bs); i <= Math.floor((s + l) / bs); i++) { t += hv[i] || 0; c++; } m = t / c / hm; }
    let sc = m * .8 + Math.random() * .7;
    used.forEach(([us, ul]) => { const ov = Math.max(0, Math.min(s + l, us + ul) - Math.max(s, us)) / Math.min(l, ul); sc -= ov * 2.4; if (Math.abs(ul - l) < 5) sc -= .35; });
    if (sc > bv) { bv = sc; best = { s, l }; }
  }
  return best;
};
function pick() {
  const base = D.cfg.pool().filter(x => x.d > 30 && x.d < 900), fresh = base.filter(x => !D.recent.includes(x.id)), all = fresh.length ? fresh : base;
  if (!all.length) return null;
  const wt = x => x.w * ((D.cfg.loops && D.cfg.loops(x.id).length) ? 2.2 : 1) * (D.hist.pairs.includes(D.lastId + '>' + x.id) ? .25 : 1) * (x.id === D.lastId ? .05 : 1), tot = all.reduce((t, x) => t + wt(x), 0); let r = Math.random() * tot, c = all[0];
  for (const x of all) { r -= wt(x); if (r <= 0) { c = x; break; } }
  D.recent.push(c.id); if (D.recent.length > 5) D.recent.shift();
  const sec = D.section(c, D.cfg.heat(c.id)), h = D.hist;
  (h.sec[c.id] = h.sec[c.id] || []).push([sec.s, sec.l]); if (h.sec[c.id].length > 10) h.sec[c.id].shift();
  h.pairs.push(D.lastId + '>' + c.id); if (h.pairs.length > 80) h.pairs.shift(); D.lastId = c.id;
  D.cfg.save && D.cfg.save(h);
  return Object.assign({}, c, sec);
}

function build() { g = g || A().graph(); if (!g) return false; if (bus) return true; bus = g.ac.createGain(); bus.gain.value = 1; bus.connect(g.mix); bus.connect(g.an); bus.connect(g.an2); return true; }
/* decode the song, keep only the section (plus the overlap), and let the rest go */
async function render(tr) {
  const ac = g.ac, full = await Prep.decode(ac, tr.id), sr = full.sampleRate, xf = D.opt.xf, a = Math.max(0, Math.floor(tr.s * sr)), n = Math.min(full.length - a, Math.floor((tr.l + xf) * sr));
  if (n < sr) throw new Error('short'); const b = ac.createBuffer(full.numberOfChannels, n, sr);
  for (let c = 0; c < full.numberOfChannels; c++) b.copyToChannel(full.getChannelData(c).subarray(a, a + n), c);
  return b;
}
async function prepare() {
  if (busy || D.next || !D.on) return; busy = true;
  const t0 = performance.now();
  try { for (let k = 0; k < 4 && D.on; k++) { const nx = pick(); if (!nx) { lg('no song long enough to use'); break; } try { nx.buf = await render(nx); nx.xf = D.opt.xf; D.next = nx; lg('next section ready (' + Math.round(performance.now() - t0) + ' ms)'); break; } catch (e) { lg('could not read a song: ' + (e && e.message || e)); } } } finally { busy = false; }
}
function place(sec, when, xfIn) { /* put a prepared section on the audio clock */
  const ac = g.ac, s = ac.createBufferSource(), gn = ac.createGain(); s.buffer = sec.buf; s.connect(gn); gn.connect(bus);
  const xo = sec.xf || D.opt.xf; gn.gain.setValueAtTime(0, when); gn.gain.linearRampToValueAtTime(1, when + xfIn);
  gn.gain.setValueAtTime(1, when + sec.l); gn.gain.linearRampToValueAtTime(0, when + sec.l + xo);
  s.start(when); s.stop(when + sec.buf.duration + .1); sec.src = s; sec.gn = gn; sec.start = when; sec.xfIn = xfIn;
  s.onended = () => { try { gn.disconnect(); } catch (e) {} if (sec.buf) sec.buf = null; try { tick(); } catch (e) {} };
}
function fadeNow(sec, dur) { const t = g.ac.currentTime; try { const v = sec.gn.gain.value; sec.gn.gain.cancelScheduledValues(t); sec.gn.gain.setValueAtTime(v, t); sec.gn.gain.linearRampToValueAtTime(0, t + dur); sec.src.stop(t + dur + .05); } catch (e) {} }
function say() { D.onchange && D.onchange(); try { const t = D.now; if (t && 'mediaSession' in navigator) { navigator.mediaSession.metadata = new MediaMetadata({ title: t.t, artist: 'DJ mode', album: t.a || '' }); navigator.mediaSession.playbackState = D.paused ? 'paused' : 'playing'; } } catch (e) {} }
let queued = null; /* the next section, once placed on the clock */
function tick() {
  if (!D.on || !cur || D.paused) return; const ac = g.ac, now = ac.currentTime;
  /* the next section goes onto the audio clock as soon as it is ready, so the hand-over never depends on a timer (timers slow down with the screen off) */
  if (!queued && D.next) { const nx = D.next; D.next = null; place(nx, Math.max(cur.start + cur.l, now + .05), nx.xf || D.opt.xf); queued = nx; lg('next section placed'); }
  if (queued && now >= queued.start) { if (window.Taste && cur && !cur.sk) { Taste.dj(cur.id, 'end'); window.onDJHeard && onDJHeard(cur.id); } cur = D.now = queued; queued = null; say(); }
  if (!D.next && !busy && now > cur.start + .5) prepare();
}
D.pos = () => { const t = D.now; return t && cur && g ? clamp(g.ac.currentTime - cur.start, 0, t.l) * 1000 : 0; };
D.progress = () => { const t = D.now; return t && cur && g ? clamp((g.ac.currentTime - cur.start) / t.l, 0, 1) : 0; };
D.start = async () => {
  if (D.on) return true; if (!A() || !A().graph || !window.Prep) return false;
  if (window.Fx && Fx.on) Fx.stop();
  if (!build()) return false; const ac = g.ac; if (ac.state === 'suspended') await ac.resume().catch(() => {});
  lg('started'); A().pause(); D.on = true; D.paused = false; A().ext = true; D.next = null; queued = null;
  let first = null; for (let k = 0; k < 4 && !first; k++) { const f = pick(); if (!f) break; try { f.buf = await render(f); f.xf = D.opt.xf; first = f; } catch (e) {} }
  if (!first) { D.on = false; A().ext = false; return false; }
  place(first, ac.currentTime + .15, 1.6); cur = D.now = first; say();
  clearInterval(timer); timer = setInterval(tick, 250); setTimeout(prepare, 800);
  try { const h = (a, f) => navigator.mediaSession.setActionHandler(a, f); h('play', () => D.pause(false)); h('pause', () => D.pause(true)); h('nexttrack', () => D.skip()); h('previoustrack', null); } catch (e) {}
  return true;
};
D.pause = p => { if (!D.on || !g) return; D.paused = p; (p ? g.ac.suspend() : g.ac.resume()).catch(() => {}); say(); };
D.skip = async () => {
  if (!D.on || skipping || D.paused) return; skipping = true;
  try { if (!queued) { if (!D.next) await prepare(); if (D.next) { const nx = D.next; D.next = null; if (window.Taste && cur && !cur.sk) { cur.sk = 1; Taste.dj(cur.id, 'skip', g.ac.currentTime - cur.start); } fadeNow(cur, 1.2); place(nx, g.ac.currentTime + .08, 1.2); nx.xf = D.opt.xf; queued = nx; } } } finally { skipping = false; }
};
D.stop = () => {
  if (!D.on) return; D.on = false; clearInterval(timer); A().ext = false;
  [cur, queued].forEach(s => s && fadeNow(s, .8)); cur = queued = null; D.now = D.next = null; say();
  try { const h = (a, f) => navigator.mediaSession.setActionHandler(a, f); h('play', () => A().play()); h('pause', () => A().pause()); h('nexttrack', () => A().next()); h('previoustrack', () => A().prev()); } catch (e) {}
};
window.DJ = D;
})();
