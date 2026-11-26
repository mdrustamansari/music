/* DJ mode: a way to explore your own library. It plays short sections of songs, new and forgotten ones first, and blends them with
   smooth crossfades. It never changes your files.

   How it plays: two hidden audio players (the kind normal playback uses), each joined to the app's audio chain through its own
   volume control. Crossfades are volume curves on the audio clock, so they stay exact with the screen off. Nothing is decoded into memory.
   What it plays: the app gives it a pool of songs with their history (cfg.pool). "Lean towards" decides how it chooses:
   explore (new and forgotten), mixed, or favourites (what you replay, your A-B loops, where your listening piled up).
   Fail-proof: every start is checked for real sound. If a song cannot be opened it is left out and the next one is tried.
   If a player stalls it is skipped. If the audio chain is silent, the players are joined straight to the output. If nothing works,
   DJ says why, in plain words, and gives you normal playback back. */
(() => {
'use strict';
const A = () => window.Android;
const D = {
  on: false, paused: false, now: null, next: null, why: '',
  cfg: { pool: () => [], heat: () => null, loops: () => [], gainDb: () => 0, save: null, keep: null },
  opt: { min: 20, max: 70, xf: 6, lean: 'explore', vary: 60, learn: true, sleep: 0 },
  onchange: null, onfail: null, onsleep: null, hist: { sec: {}, pairs: [] }, set: [], stats: { sections: 0, fresh: 0, skips: 0 }
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const LEAD = 2; /* a player starts this many seconds before its section is heard, silently, so a slow timer can never make it late */
let g = null, bus = null, pre = null, pa = null, lanes = null, cur = null, queued = null, timer = 0, busy = false, skipping = false, direct = false;
let lastId = null, lastEn = null, lastArtists = [], recent = [], bad = new Set(), fails = 0, peaks = [], sleepAt = 0, sleepFading = false, ended = 0;
const live = [];

/* ---------- a short log, shown in Settings: what DJ mode is doing, and why it failed ---------- */
D.log = [];
const lg = m => { D.log.unshift(new Date().toTimeString().slice(0, 8) + ' ' + m); D.log.length = Math.min(D.log.length, 8); try { dispatchEvent(new Event('lq-status')); } catch (e) {} };
D.status = () => {
  if (!D.on) return 'DJ is off.' + (D.why ? ' Last problem: ' + D.why : '') + (D.log.length ? ' Last time: ' + D.log.slice(0, 2).join(' · ') : '');
  const lv = D.level(), pr = D.preLevel();
  return 'DJ is ' + (D.paused ? 'paused' : 'playing') + (g ? ' (audio engine ' + g.ac.state + ', players ' + pr.toFixed(2) + ', output ' + lv.toFixed(2) + (direct ? ', direct output' : '') + ')' : '') +
    '; the next section is ' + (D.next || queued ? 'ready' : 'being prepared') + '.' + (D.log.length ? ' Latest: ' + D.log.slice(0, 3).join(' · ') : '');
};
const peakOf = an => { try { const b = new Float32Array(an.fftSize); an.getFloatTimeDomainData(b); let m = 0; for (let i = 0; i < b.length; i++) { const v = Math.abs(b[i]); if (v > m) m = v; } return m; } catch (e) { return 0; } };
D.level = () => (g && g.an ? peakOf(g.an) : 0);     /* what comes out of the app's audio chain */
D.preLevel = () => (pa ? peakOf(pa) : 0);            /* what the players themselves produce, before the chain */

/* ---------- choosing what to play ---------- */
const DAY = 864e5;
function score(x) {
  const lean = D.opt.lean, now = Date.now(), n = x.n || 0;
  const nov = n === 0 ? 1 : 1 / (1 + n), age = x.last ? Math.min(1, (now - x.last) / (45 * DAY)) : 1;
  const explore = .55 * nov + .45 * age + .03, fav = Math.max(.05, (x.w || 1) * (1 + (x.fav ? 1.2 : 0) + ((x.r || 0) >= 4 ? .8 : 0)) * (1 + Math.log2(1 + n) * .5) / 3);
  let b = lean === 'fav' ? fav : lean === 'mixed' ? .5 * explore + .5 * Math.min(1, fav) : explore;
  if (D.opt.learn) b *= clamp(x.tw || 1, .25, 2.2);   /* what you skipped or loved before */
  /* variety: high = the next song differs from the last one (artist, energy); low = it flows on from it */
  const v = (D.opt.vary - 50) / 50;
  if (lastArtists.includes(x.a) && x.a) b *= 1 - .85 * Math.max(0, (D.opt.vary + 10) / 110);
  if (lastEn != null && x.en != null) { const dist = Math.abs(x.en - lastEn); b *= clamp(1 + v * (dist - .25) * 3, .25, 2.4); }
  if (D.hist.pairs.includes(lastId + '>' + x.id)) b *= .25;
  return Math.max(.001, b);
}
function pickSong() {
  const base = D.cfg.pool().filter(x => x.d > 30 && x.d < 900 && !bad.has(x.id));
  if (!base.length) return null;
  const keep = Math.min(8, Math.floor(base.length / 2)), fresh = base.filter(x => !recent.includes(x.id) && x.id !== lastId), all = fresh.length ? fresh : base;
  const w = all.map(x => Math.pow(score(x), 1.3)), tot = w.reduce((a, b) => a + b, 0); let r = Math.random() * tot, c = all[0];
  for (let i = 0; i < all.length; i++) { r -= w[i]; if (r <= 0) { c = all[i]; break; } }
  recent.push(c.id); if (recent.length > keep) recent.shift();
  return c;
}
/* which part of a song: explore leans to the middle of the song, where the best parts usually are, and to parts not used before;
   favourites lean to your A-B loops and to where your listening piled up. Never the first seconds. Never the same part twice. */
function pickSection(song) {
  const d = song.d, lean = D.opt.lean, used = D.hist.sec[song.id] || [];
  const pLoop = lean === 'fav' ? .65 : lean === 'mixed' ? .35 : .08, pHeat = lean === 'fav' ? .7 : lean === 'mixed' ? .35 : 0;
  const lp = D.cfg.loops ? D.cfg.loops(song.id) : [];
  if (lp.length && Math.random() < pLoop) {
    let pk = null, ps = 1e9;
    lp.forEach(([s0, l0]) => { const s = Math.max(0, Math.min(s0, d - 4)), l = Math.floor(Math.min(l0, d - s - 1, 120)); if (l < 4) return; const u = used.filter(([us, ul]) => Math.abs(us - s) < 2 && Math.abs(ul - l) < 2).length, sc = u + Math.random() * .9; if (sc < ps) { ps = sc; pk = { s, l }; } });
    if (pk) return pk;
  }
  if (d < 45) return { s: 0, l: Math.max(10, Math.floor(d - 1)) };
  const maxL = Math.max(8, Math.min(D.opt.max, d - 22)), minL = Math.max(6, Math.min(D.opt.min, maxL - 3)), bs = 5;
  const heat = D.cfg.heat ? D.cfg.heat(song.id) : null, hv = pHeat && heat && heat.some(Boolean) ? heat : null, hm = hv ? Math.max(1, ...hv.map(x => x || 0)) : 1;
  let best = null, bv = -1e9;
  for (let k = 0; k < 12; k++) {
    const l = Math.round(minL + Math.random() * (maxL - minL)), room = Math.max(1, d - 2 - l - 20); let s;
    if (hv && Math.random() < pHeat) {
      const n = Math.ceil(d / bs), w = []; let tot = 0; for (let i = 4; i < n - 2; i++) { const x = (hv[i] || 0) / hm + .12; w.push(x); tot += x; }
      let r = Math.random() * tot, i = 0; for (; i < w.length - 1; i++) { r -= w[i]; if (r <= 0) break; } s = (i + 4) * bs - Math.random() * l * .5;
    } else s = 20 + room * (lean === 'explore' ? (Math.random() + Math.random()) / 2 : Math.random()); /* two dice: the middle is likelier */
    s = Math.round(clamp(s, 20, d - 2 - l));
    let m = 0; if (hv) { let t = 0, c = 0; for (let i = Math.floor(s / bs); i <= Math.floor((s + l) / bs); i++) { t += hv[i] || 0; c++; } m = t / c / hm; }
    let sc = m * .8 + Math.random() * .7;
    used.forEach(([us, ul]) => { const ov = Math.max(0, Math.min(s + l, us + ul) - Math.max(s, us)) / Math.min(l, ul); sc -= ov * 2.4; if (Math.abs(ul - l) < 5) sc -= .35; });
    if (sc > bv) { bv = sc; best = { s, l }; }
  }
  return best;
}
function choose() {
  const c = pickSong(); if (!c) return null; const sec = pickSection(c), h = D.hist;
  (h.sec[c.id] = h.sec[c.id] || []).push([sec.s, sec.l]); if (h.sec[c.id].length > 10) h.sec[c.id].shift();
  h.pairs.push(lastId + '>' + c.id); if (h.pairs.length > 80) h.pairs.shift();
  lastId = c.id; lastEn = c.en != null ? c.en : lastEn; lastArtists.push(c.a); if (lastArtists.length > 3) lastArtists.shift();
  D.cfg.save && D.cfg.save(h);
  return Object.assign({}, c, sec, { fresh: !(c.n > 0) });
}

/* ---------- the two players ---------- */
function mkLane() {
  const el = new Audio(); el.preload = 'auto'; try { el.setAttribute('playsinline', ''); } catch (e) {}
  const sn = g.ac.createMediaElementSource(el), gn = g.ac.createGain(); gn.gain.value = 0; sn.connect(gn); gn.connect(pre);
  const L = { el, gn, sec: null, url: '', err: false, lastT: -1, lastAt: 0 };
  el.addEventListener('error', () => { L.err = true; });
  return L;
}
/* the DJ bus is joined to the app's audio chain again at every start, so it can never be left tied to a stale connection */
function build() {
  let ng = null; try { ng = A().graph(); } catch (e) {} if (!ng) return false; g = ng;
  if (pre && pre.context !== g.ac) { pre = bus = pa = null; lanes = null; }
  if (!pre) { pre = g.ac.createGain(); bus = g.ac.createGain(); pa = g.ac.createAnalyser(); pa.fftSize = 2048; pre.connect(pa); pre.connect(bus); }
  try { bus.disconnect(); } catch (e) {}
  if (direct) { try { bus.connect(g.ac.destination); } catch (e) {} } else { bus.connect(g.mix); bus.connect(g.an); bus.connect(g.an2); }
  if (!lanes) lanes = [mkLane(), mkLane()];
  return true;
}
function free(l) {
  if (!l) return; try { l.el.pause(); l.el.removeAttribute('src'); l.el.load(); } catch (e) {}
  try { l.gn.gain.cancelScheduledValues(0); l.gn.gain.value = 0; } catch (e) {}
  if (l.url) { try { URL.revokeObjectURL(l.url); } catch (e) {} } l.url = ''; l.sec = null; l.err = false; l.lastT = -1;
}
const once = (el, ev, ms) => new Promise((res, rej) => {
  let t = 0; const ok = () => { clear(); res(); }, no = () => { clear(); rej(new Error('the file could not be played')); };
  const clear = () => { clearTimeout(t); el.removeEventListener(ev, ok); el.removeEventListener('error', no); };
  t = setTimeout(() => { clear(); rej(new Error('timed out waiting for ' + ev)); }, ms); el.addEventListener(ev, ok); el.addEventListener('error', no);
});
/* open the song in a free player, wind it to just before the section, and wait until it is ready */
async function load(tr) {
  const l = lanes && lanes.find(x => !x.sec); if (!l) throw new Error('both players are busy'); l.sec = tr; const t0 = performance.now();
  try {
    const url = await A().fileUrl(tr.id); if (!url) throw new Error('the file is missing'); l.url = url; const el = l.el; el.src = url;
    await once(el, 'loadedmetadata', 12000);
    if (isFinite(el.duration) && el.duration > 1) { if (tr.s + tr.l > el.duration - 1) tr.l = Math.floor(el.duration - 1 - tr.s); if (tr.l < 6) { tr.s = Math.max(0, Math.floor(el.duration * .3)); tr.l = Math.floor(Math.min(D.opt.max, el.duration - 1 - tr.s)); } }
    if (tr.l < 6) throw new Error('too short');
    const at = Math.max(0, tr.s - LEAD); if (Math.abs(el.currentTime - at) > .05) { const p = once(el, 'seeked', 8000); el.currentTime = at; await p; }
    if (el.readyState < 3) await once(el, 'canplay', 8000).catch(() => {});
    tr.lane = l; tr.gs = clamp(Math.pow(10, clamp(D.cfg.gainDb ? D.cfg.gainDb(tr.id) || 0 : 0, -12, 9) / 20), .25, 2);
    lg('"' + (tr.t || '?').slice(0, 22) + '" ready (' + Math.round(performance.now() - t0) + ' ms)'); return tr;
  } catch (e) { free(l); throw e; }
}
/* gets a section ready; songs that cannot be opened are left out, and the next one is tried */
async function ready() {
  let why = '';
  for (let k = 0; k < 5 && (D.on || !cur); k++) {
    const c = choose(); if (!c) { why = why ? 'none of the songs could be opened (last problem: ' + why + ')' : 'there is no song long enough to use'; break; }
    try { const t = await load(c); fails = 0; return t; } catch (e) { why = (e && e.message) || String(e); bad.add(c.id); fails++; lg('left out "' + (c.t || '?').slice(0, 20) + '": ' + why); }
  }
  D.why = why; return null;
}
async function prepare() {
  if (busy || D.next || !D.on || !lanes || !lanes.some(x => !x.sec)) return; busy = true;
  try { D.next = await ready(); } finally { busy = false; }
}
/* equal-power curves: the blend keeps the same loudness all the way through */
const CN = 48, CI = new Float32Array(CN), CO = new Float32Array(CN);
for (let i = 0; i < CN; i++) { const t = i / (CN - 1); CI[i] = Math.sin(t * Math.PI / 2); CO[i] = Math.cos(t * Math.PI / 2); }
const scaled = (c, k) => { const o = new Float32Array(CN); for (let i = 0; i < CN; i++) o[i] = c[i] * k; return o; };
function xfFor(sec) { return clamp(D.opt.xf, 1, Math.max(1, sec.l / 2.5)); }
function place(sec, when) {
  const ac = g.ac, l = sec.lane, gn = l.gn, now = ac.currentTime, xf = xfFor(sec);
  sec.xf = xf; sec.start = when; sec.on = false; sec.end = when + sec.l + xf + .4;
  try {
    gn.gain.cancelScheduledValues(0); gn.gain.setValueAtTime(0, Math.max(now, when - .001));
    gn.gain.setValueCurveAtTime(scaled(CI, sec.gs), when, xf); gn.gain.setValueAtTime(sec.gs, when + xf + .001);
    gn.gain.setValueCurveAtTime(scaled(CO, sec.gs), when + sec.l, xf);
  } catch (e) { gn.gain.cancelScheduledValues(0); gn.gain.setValueAtTime(0, now); gn.gain.linearRampToValueAtTime(sec.gs, when + xf); gn.gain.setValueAtTime(sec.gs, when + sec.l); gn.gain.linearRampToValueAtTime(0, when + sec.l + xf); }
  live.push(sec); if (when - now < LEAD) startPlayer(sec, Math.max(0, when - now));
}
/* the player is wound to the exact place and started; `lead` is how long until the section is meant to be heard */
async function startPlayer(sec, lead) {
  if (sec.on) return; sec.on = true; const el = sec.lane.el;
  try { const target = Math.max(0, sec.s - lead); if (Math.abs(el.currentTime - target) > .3) { const p = once(el, 'seeked', 8000); el.currentTime = target; await p; } if (!D.paused) await el.play(); }
  catch (e) { lg('player problem: ' + ((e && e.message) || e)); sec.lane.err = true; }
}
function fadeNow(sec, dur) {
  if (!sec || !sec.lane) return; const t = g.ac.currentTime;
  try { const gn = sec.lane.gn, v = gn.gain.value; gn.gain.cancelScheduledValues(t); gn.gain.setValueAtTime(v, t); gn.gain.linearRampToValueAtTime(0, t + dur); sec.end = t + dur + .1; } catch (e) {}
}
function say() {
  D.onchange && D.onchange();
  try { const t = D.now; if (t && 'mediaSession' in navigator) { navigator.mediaSession.metadata = new MediaMetadata({ title: t.t, artist: t.a || 'DJ mode', album: 'DJ mode' }); navigator.mediaSession.playbackState = D.paused ? 'paused' : 'playing'; } } catch (e) {}
}
function becomeCurrent(s) {
  cur = D.now = s; D.stats.sections++; if (s.fresh) D.stats.fresh++;
  D.set.unshift({ id: s.id, t: s.t, a: s.a, s: s.s, l: s.l, at: Date.now(), fresh: !!s.fresh, kept: false, sk: false }); if (D.set.length > 80) D.set.pop(); s.rec = D.set[0];
  window.onDJHeard && window.onDJHeard(s.id); say();
}

/* ---------- the clock: hand-overs, health checks ---------- */
function reason(el) { return el ? (el.error ? 'player error ' + el.error.code : el.paused ? 'player paused' : 'player stalled') : 'no player'; }
let wd = 0;
function tick() {
  if (!D.on || !cur || D.paused) return; const ac = g.ac, now = ac.currentTime;
  peaks.push(Math.max(peakOf(pa), D.level())); if (peaks.length > 16) peaks.shift();
  /* the next section goes on the audio clock as soon as it is ready, so a hand-over never depends on a timer */
  if (!queued && D.next) { const nx = D.next; D.next = null; place(nx, Math.max(cur.start + cur.l, now + .05)); queued = nx; lg('next section placed'); }
  for (let i = live.length - 1; i >= 0; i--) { const s = live[i]; if (now > s.end) { free(s.lane); live.splice(i, 1); } else if (!s.on && now >= s.start - LEAD) startPlayer(s, Math.max(0, s.start - now)); }
  if (queued && now >= queued.start) { if (D.opt.learn && window.Taste && cur && !cur.sk) Taste.dj(cur.id, 'end'); becomeCurrent(queued); queued = null; }
  if (!D.next && !busy && now > cur.start + .5) prepare();
  /* the current section ran out and nothing is ready: say so, and carry on as soon as something is */
  if (!queued && !D.next && now > cur.start + cur.l + cur.xf + .2) { if (!ended) { ended = Date.now(); lg('waiting for the next song'); } if (!busy) prepare(); if (Date.now() - ended > 20000) { stopWith('the next song could not be prepared' + (D.why ? ' (' + D.why + ')' : '')); return; } } else ended = 0;
  /* the player that should be heard has stopped moving: nudge it, then skip it */
  const l = cur.lane, el = l.el, playing = now >= cur.start && now < cur.start + cur.l;
  if (playing) {
    if (el.currentTime !== l.lastT) { l.lastT = el.currentTime; l.lastAt = Date.now(); }
    else { const idle = Date.now() - l.lastAt; if (idle > 3000 && idle < 3300 && !document.hidden) { lg(reason(el) + ', nudging it'); el.play().catch(() => {}); } if ((idle > 7000 || l.err) && !skipping && now > cur.start + 2) { lg(reason(el) + ', moving on'); l.lastAt = Date.now(); cur.sk = 2; D.skip(true); } }
  }
  /* a sleep timer */
  if (sleepAt && !sleepFading && Date.now() >= sleepAt) { sleepFading = true; lg('sleep timer: fading out'); try { bus.gain.cancelScheduledValues(ac.currentTime); bus.gain.setValueAtTime(bus.gain.value, ac.currentTime); bus.gain.linearRampToValueAtTime(0, ac.currentTime + 8); } catch (e) {} setTimeout(() => { const f = D.onsleep; D.stop(); f && f(); }, 8600); }
}
D.sleepLeft = () => sleepAt ? Math.max(0, sleepAt - Date.now()) : 0;
D.pos = () => { const t = D.now; return t && cur && g ? clamp(g.ac.currentTime - cur.start, 0, t.l) * 1000 : 0; };
D.progress = () => { const t = D.now; return t && cur && g ? clamp((g.ac.currentTime - cur.start) / t.l, 0, 1) : 0; };

/* ---------- the sound check: is anything really coming out? ---------- */
function mgain() { try { return g.master && g.master.gain ? g.master.gain.value : 1; } catch (e) { return 1; } }
function checkSound(stage) {
  if (!D.on || D.paused || !g || !cur) return; const ac = g.ac, pk = Math.max(0, ...peaks, D.level()), pr = Math.max(D.preLevel(), 0), el = cur.lane.el;
  if (pk >= .0008) { lg('sound is coming out (level ' + pk.toFixed(2) + ', volume ' + Math.round(mgain() * 100) + '%)'); return; }
  const info = 'engine ' + ac.state + ', players ' + pr.toFixed(2) + ', ' + reason(el) + ' at ' + el.currentTime.toFixed(0) + ' s, volume ' + Math.round(mgain() * 100) + '%';
  lg('silent: ' + info);
  if (mgain() < .02) { toastIt('The output volume is at zero. Raise it to hear DJ mode.'); return; }
  if (ac.state !== 'running') ac.resume().catch(() => {});
  if (el.paused) el.play().catch(e => lg('player refused: ' + (e && e.name)));
  if (stage === 1) {
    build(); setTimeout(() => checkSound(2), 3000);
  } else if (stage === 2) {
    if (pr >= .0008) { direct = true; build(); lg('the audio chain is silent, so the players now go straight to the output'); setTimeout(() => checkSound(3), 3000); }   /* the players make sound, the chain does not */
    else { lg('the player makes no sound, trying another song'); bad.add(cur.id); cur.sk = 2; D.skip(true); setTimeout(() => checkSound(3), 5000); }
  } else if (stage === 3) {
    stopWith('no sound could be made (' + info + ')');
  }
}
function toastIt(m) { try { window.dispatchEvent(new CustomEvent('dj-say', { detail: m })); } catch (e) {} }
function stopWith(msg) { D.why = msg; lg(msg); const f = D.onfail; D.stop(); f && f(msg); }
const wake = () => { if (D.on && g && g.ac.state !== 'running') g.ac.resume().catch(() => {}); };
const vis = () => { if (D.on && !D.paused) { wake(); if (cur && cur.lane.el.paused && g.ac.currentTime > cur.start - LEAD) cur.lane.el.play().catch(() => {}); } };

/* ---------- start, pause, skip, stop ---------- */
D.start = async () => {
  if (D.on) return true; D.why = '';
  const fail = m => { D.why = m; lg(m); return false; };
  if (!A() || !A().graph) return fail('the audio engine is not available here');
  direct = false; if (!build()) return fail('the audio engine could not be reached');
  const ac = g.ac; if (ac.state !== 'running') await Promise.race([ac.resume().catch(() => {}), new Promise(r => setTimeout(r, 2500))]);
  lg('started' + (ac.state !== 'running' ? ' (audio engine ' + ac.state + ')' : ''));
  A().pause(); D.on = true; D.paused = false; A().ext = true; D.next = null; queued = null; live.length = 0; lanes.forEach(free); busy = false; skipping = false;
  recent = []; lastId = lastEn = null; lastArtists = []; bad = new Set(); fails = 0; peaks = []; ended = 0; D.set = []; D.stats = { sections: 0, fresh: 0, skips: 0 };
  try { bus.gain.cancelScheduledValues(0); bus.gain.value = 1; } catch (e) {} sleepFading = false; sleepAt = D.opt.sleep > 0 ? Date.now() + D.opt.sleep * 60000 : 0;
  const first = await ready();
  if (!first || !D.on) { if (!first) { const m = D.why || 'no song could be opened'; D.on = false; A().ext = false; say(); return fail(m); } return false; }
  place(first, ac.currentTime + .15); becomeCurrent(first);
  clearInterval(timer); timer = setInterval(tick, 250); setTimeout(prepare, 800);
  setTimeout(() => checkSound(1), 2800); addEventListener('pointerdown', wake, { passive: true }); document.addEventListener('visibilitychange', vis);
  ac.onstatechange = () => { if (D.on && !D.paused && ac.state !== 'running') { lg('audio engine is ' + ac.state + ', waking it'); ac.resume().catch(() => {}); } };
  try { const h = (a, f) => navigator.mediaSession.setActionHandler(a, f); h('play', () => D.pause(false)); h('pause', () => D.pause(true)); h('nexttrack', () => D.skip()); h('previoustrack', null); } catch (e) {}
  return true;
};
D.pause = p => {
  if (!D.on || !g) return; D.paused = p;
  if (p) { lanes.forEach(l => { try { l.el.pause(); } catch (e) {} }); g.ac.suspend().catch(() => {}); }
  else { g.ac.resume().catch(() => {}); live.forEach(s => { if (s.on) s.lane.el.play().catch(() => {}); }); }
  say();
};
D.skip = async force => {
  if (!D.on || skipping || D.paused) return; skipping = true;
  try {
    let nx = queued;
    if (!nx) { if (!D.next) await prepare(); nx = D.next; D.next = null; if (!nx) { if (!force) lg('no other song is ready yet'); return; } }
    else { const i = live.indexOf(nx); if (i >= 0) live.splice(i, 1); }   /* already placed on the clock: bring it forward */
    if (cur && !cur.sk) { cur.sk = 1; D.stats.skips++; if (cur.rec) cur.rec.sk = true; if (D.opt.learn && window.Taste) Taste.dj(cur.id, 'skip', g.ac.currentTime - cur.start); }
    fadeNow(cur, 1.2); place(nx, g.ac.currentTime + .15); queued = nx;
  } finally { skipping = false; }
};
/* keep this: the part you are hearing becomes an A-B section and a favourite, and DJ learns that you like it */
D.keep = () => {
  const s = cur; if (!D.on || !s || s.rec && s.rec.kept) return false; if (s.rec) s.rec.kept = true;
  try { D.cfg.keep && D.cfg.keep(s, Math.max(0, g.ac.currentTime - s.start)); } catch (e) {} if (window.Taste) Taste.like && Taste.like(s.id, 2); lg('kept "' + (s.t || '?').slice(0, 20) + '"'); D.onchange && D.onchange(); return true;
};
D.setIds = () => { const seen = new Set(), out = []; D.set.slice().reverse().forEach(x => { if (!seen.has(x.id)) { seen.add(x.id); out.push(x.id); } }); return out; };
D.setSleep = m => { D.opt.sleep = m; sleepFading = false; sleepAt = D.on && m > 0 ? Date.now() + m * 60000 : 0; try { if (bus) { bus.gain.cancelScheduledValues(0); bus.gain.value = 1; } } catch (e) {} };
D.stop = () => {
  if (!D.on) return; D.on = false; clearInterval(timer); removeEventListener('pointerdown', wake); document.removeEventListener('visibilitychange', vis); try { g.ac.onstatechange = null; } catch (e) {} A().ext = false;
  [cur, queued].forEach(s => s && fadeNow(s, .8)); live.length = 0; sleepAt = 0;
  const old = lanes ? lanes.slice() : []; setTimeout(() => { if (!D.on) old.forEach(free); }, 1100);
  cur = queued = null; D.now = D.next = null; say();
  try { const h = (a, f) => navigator.mediaSession.setActionHandler(a, f); h('play', () => A().play()); h('pause', () => A().pause()); h('nexttrack', () => A().next()); h('previoustrack', () => A().prev()); } catch (e) {}
};
window.DJ = D;
})();
