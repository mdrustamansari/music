/* Taste: the app learns, on this phone only, which songs you like, how much and when.
   Signals: how soon you skip (12 bands of 10 s), full plays, replays, songs you pick by hand,
   rewinds, time of day, and a rare 5-second question. Nothing leaves the phone. */
(() => {
'use strict';
const KEY = 'mp_taste', DAY = 864e5, HLIFE = 30 * DAY, BLIFE = 21 * DAY, SLOTS = 8;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
let D;
const fresh = () => ({ v: 1, on: true, sv: true, s: {}, g: { n: 0, kb: new Array(13).fill(0), fp: new Array(SLOTS).fill(0), svT: 0, svN: 0, sa: [0, 0, 0], sk: [] } });
function load() { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.v === 1 && j.s && j.g) return j; } catch (e) {} return fresh(); }
let saveT = 0;
function save(now) { if (now) { clearTimeout(saveT); saveT = 0; try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} return; } if (!saveT) saveT = setTimeout(() => { saveT = 0; try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }, 4000); }
D = load();
const slotOf = t => Math.floor(new Date(t).getHours() / 3);
const rec = id => D.s[id] || (D.s[id] = { n: 0, f: 0, k: 0, L: 0, B: 0, at: Date.now(), u: 0, us: 0, t: new Array(SLOTS).fill(0), la: 0, st: 0 });
/* old feelings fade: likes over about a month, dislikes over about three weeks */
function age(r, now) { const dt = now - r.at; if (dt <= 0) return; r.L *= Math.pow(.5, dt / HLIFE); r.B *= Math.pow(.5, dt / BLIFE); for (let i = 0; i < SLOTS; i++) r.t[i] *= Math.pow(.5, dt / (2 * HLIFE)); r.at = now; }
const P = window.Taste = {};
P.get = () => D;
P.on = () => !!D.on;
P.cfg = (on, sv) => { D.on = !!on; D.sv = !!sv; save(); };
P.forgive = id => { const r = D.s[id]; if (r) { r.u = 0; r.B *= .4; save(true); } };
P.set = (k, v) => { D[k] = v; save(true); };
P.clear = () => { const o = D.on, sv = D.sv; D = fresh(); D.on = o; D.sv = sv; sess = null; save(true); };

/* ---------- one listening session ---------- */
let sess = null, pendingAsk = null, manualFlag = 0;
P.manual = () => { manualFlag = Date.now(); };
function bandOf(listened, dur) { const eff = listened * Math.max(1, 240 / Math.max(20, dur)); return eff >= 120 ? 12 : Math.floor(eff / 10); }
function finish(s, now) {
  if (!s || !D.on) return;
  const r = rec(s.id); age(r, now); const sl = slotOf(s.t0), ended = s.pos >= s.d - 4000 || s.l >= .92 * s.d / 1000;
  if (s.l < .4 && !ended) return;
  D.g.n++; r.n++; r.la = now;
  if (ended || s.l >= .85 * s.d / 1000) {
    r.f++; r.L += 1; r.t[sl] += 1; r.st = 0; D.g.fp[sl]++; D.g.kb[12]++; D.g.sk = D.g.sk.filter(t => now - t < 9e4);
    if (s.again) { r.L += 1.5; r.t[sl] += .8; }
    if (s.back) r.L += Math.min(1, .3 * s.back);
    pendingAsk = { id: s.id, t: now };
  } else {
    const b = bandOf(s.l, s.d / 1000); D.g.kb[b]++; r.k++;
    let st = b >= 12 ? .08 : (12 - b) / 12;                      /* sooner skip, stronger push */
    if (s.l < 1) st *= .25;                                       /* probably an accidental tap */
    D.g.sk = D.g.sk.filter(t => now - t < 9e4); D.g.sk.push(now);
    if (D.g.sk.length >= 3) st *= .5;                             /* a run of skips often means "something else", not "all of these" */
    if (s.back) st *= .6;
    r.st = b < 6 ? Math.min(4, (r.st || 0) + 1) : 0;
    r.B += 1.6 * st; r.t[sl] -= st;
    const days = b >= 12 ? .3 : Math.min(30, 14 * st * st * (1 + .5 * Math.max(0, r.st - 1)));
    if (days > .5) { r.us = now; r.u = Math.max(r.u, now + days * DAY); }
  }
  save();
}
P.start = (id, durMs, manual) => {
  const now = Date.now();
  const same = !!(sess && sess.id === id); if (sess) finish(sess, now);   /* the same id again means a replay */
  if (!D.on) { sess = null; return; }
  const r = rec(id); age(r, now);
  const again = same;
  const man = manual || (manualFlag && now - manualFlag < 2500); manualFlag = 0;
  if (man) { r.L += .6; if (r.u > now) { r.u = 0; r.B *= .5; } }   /* you chose it, so the earlier skip is forgiven */
  sess = { id, d: Math.max(1000, durMs || 1000), t0: now, w: now, l: 0, pos: 0, back: 0, again: again ? 1 : 0 };
  save();
};
P.tick = (id, pos, playing) => {
  if (!sess || !D.on || sess.id !== id) return; const now = Date.now(), dt = (now - sess.w) / 1000; sess.w = now;
  if (playing && dt > 0 && dt < 2.5) sess.l += dt;
  if (pos < sess.pos - 3000 && pos < sess.pos) { if (sess.l > 5) sess.back++; }
  sess.pos = pos;
};
P.dur = ms => { if (sess && ms > 1000) sess.d = ms; };
/* DJ mode plays sections: the same learning, with a lighter touch */
P.dj = (id, how, played, len) => {
  if (!D.on || !id) return; const now = Date.now(), r = rec(id); age(r, now); const sl = slotOf(now);
  if (how === 'end') { r.L += .3; r.t[sl] += .3; save(); return; }
  const b = Math.min(11, Math.floor(Math.max(0, played) / 10)), st = .6 * (12 - b) / 12; D.g.kb[b]++;
  r.B += st; r.t[sl] -= st * .6; if (b < 6) { r.us = now; r.u = Math.max(r.u, now + 3 * st * st * 10 * DAY / 4); }
  save();
};
/* a heart, a rating, a playlist add */
P.like = (id, n) => { if (!D.on) return; const r = rec(id); age(r, Date.now()); r.L += n || 2; r.B *= .5; r.u = 0; r.t[slotOf(Date.now())] += 1; save(); };
P.merge = moves => { moves.forEach(({ from, to }) => { const a = D.s[from]; if (!a) return; const b = D.s[to]; if (!b) D.s[to] = a; else { b.n += a.n; b.f += a.f; b.k += a.k; b.L += a.L; b.B = Math.max(b.B, a.B); b.u = Math.max(b.u, a.u); for (let i = 0; i < SLOTS; i++) b.t[i] += a.t[i]; } delete D.s[from]; }); save(true); };

/* ---------- what the app thinks ---------- */
function pen(r, now) { if (!r || r.u <= now) return 1; const span = Math.max(DAY / 2, r.u - (r.us || now)), left = (r.u - now) / span; return .03 + .97 * Math.pow(clamp(1 - left, 0, 1), 2); }
/* a weight for choosing songs: about 0.25 (rather not) to 3.3 (love), and close to 0 while a song is resting */
P.w = id => {
  if (!D.on) return 1; const r = D.s[id]; if (!r) return 1; const now = Date.now();
  const dt = now - r.at, L = r.L * Math.pow(.5, dt / HLIFE), B = r.B * Math.pow(.5, dt / BLIFE), t = r.t[slotOf(now)] * Math.pow(.5, dt / (2 * HLIFE));
  return Math.max(.01, Math.exp(clamp(.45 * (L - B + .5 * t), -3, 1.2)) * pen(r, now));
};
/* a little room to be surprised: resting songs stay away, the rest are flattened a touch */
P.wx = id => { const w = P.w(id), r = D.s[id]; return r && r.u > Date.now() ? w : .88 * w + .12; };
P.resting = id => { const r = D.s[id]; return !!(r && r.u > Date.now() && pen(r, Date.now()) < .5); };
P.stage = () => D.g.n < 25 ? 0 : D.g.n < 150 ? 1 : 2;
P.rank = (list, n) => list.filter(s => !P.resting(s.id) && D.s[s.id] && D.s[s.id].f > 0).map(s => [s, P.w(s.id)]).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]);
P.report = byId => {
  const now = Date.now(), rows = Object.keys(D.s).filter(id => byId.has(id)).map(id => ({ id, w: P.w(id), r: D.s[id] }));
  const likes = rows.filter(x => x.r.f > 0 && x.w > 1.15 && !P.resting(x.id)).sort((a, b) => b.w - a.w).slice(0, 5);
  const rest = rows.filter(x => P.resting(x.id)).sort((a, b) => b.r.u - a.r.u).slice(0, 6).map(x => ({ id: x.id, until: x.r.u }));
  const kb = D.g.kb, sk = kb.slice(0, 12).reduce((a, b) => a + b, 0), early = kb.slice(0, 3).reduce((a, b) => a + b, 0);
  const fp = D.g.fp, best = fp.indexOf(Math.max(...fp));
  return { plays: D.g.n, known: rows.length, stage: P.stage(), likes, rest, kb, sk, early, best: Math.max(...fp) > 2 ? best : -1, sa: D.g.sa };
};

/* ---------- the 5-second question ---------- */
P.canAsk = () => {
  if (!D.on || !D.sv || !pendingAsk || D.g.n < 8) return null; const now = Date.now(), a = pendingAsk; pendingAsk = null;
  if (now - a.t > 6e4) return null;
  const wait = 3 * DAY * (1 + 3 * Math.min(3, D.g.svN));        /* ignored questions make it rarer */
  if (now - D.g.svT < wait || Math.random() > .4) return null;
  return a.id;
};
P.shown = () => { D.g.svT = Date.now(); save(true); };
P.answer = (id, k) => {                                          /* 0 love, 1 fine, 2 not now, -1 no answer */
  const now = Date.now(), r = rec(id); age(r, now);
  if (k < 0) { D.g.svN++; save(true); return; }
  D.g.svN = 0; D.g.sa[k]++;
  if (k === 0) { r.L += 2; r.B *= .3; r.u = 0; r.t[slotOf(now)] += 1.2; } else if (k === 1) r.L += .3; else { r.B += 1; r.us = now; r.u = now + 7 * DAY; r.t[slotOf(now)] -= 1; }
  save(true);
};
document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
})();
