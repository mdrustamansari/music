/* Liveliness: one spring engine for every shape-shifting thing. Level 0 is Still (no motion), 5 is Bouncy.
   A spring has stiffness k and damping ratio z. Low z = more overshoot. Squash keeps area (x * y = 1). */
(() => {
'use strict';
const LV = [null,
  { k: 119, z: 1.0,  sq: 0,     goo: 0, jel: 0.35 },
  { k: 150, z: 0.62, sq: 0.010, goo: 1, jel: 1.0 },
  { k: 164, z: 0.48, sq: 0.016, goo: 1, jel: 1.5 },
  { k: 178, z: 0.36, sq: 0.022, goo: 1, jel: 2.0 },
  { k: 200, z: 0.26, sq: 0.030, goo: 1, jel: 2.6 }];
const M = { L: 2, LV };
let forceStill = matchMedia('(prefers-reduced-motion: reduce)').matches;
M.set = l => { M.L = Math.max(0, Math.min(5, l | 0)); };
M.p = () => (forceStill ? null : LV[M.L]);
class Sp {
  constructor(x = 0) { this.x = this.t = x; this.v = 0; }
  get rest() { return Math.abs(this.x - this.t) < 0.0008 && Math.abs(this.v) < 0.01; }
  step(dt, soft = 1) {
    const p = M.p(); if (!p) { this.x = this.t; this.v = 0; return; }
    const k = p.k * soft, c = 2 * p.z * Math.sqrt(k);
    this.v += (-k * (this.x - this.t) - c * this.v) * dt; this.x += this.v * dt;
  }
}
const live = new Set(); let last = 0, raf = 0;
function loop(n) {
  const dt = Math.min(0.034, (n - last) / 1000); last = n; let busy = false;
  live.forEach(o => { o.tick(dt); if (o.done()) live.delete(o); else busy = true; });
  raf = busy ? requestAnimationFrame(loop) : 0;
}
M.run = o => { live.add(o); if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
M.Sp = Sp;

/* play <-> pause: the triangle splits into two bars, with a soft liquid merge */
const PL = [[8, 5, 13.5, 8.5, 13.5, 15.5, 8, 19], [13.5, 8.5, 19, 12, 19, 12, 13.5, 15.5]];
const PA = [[8, 5, 11, 5, 11, 19, 8, 19], [13, 5, 16, 5, 16, 19, 13, 19]];
function setPoly(root, t) {
  const e = Math.max(-0.15, Math.min(1.3, t));
  root.querySelectorAll('polygon').forEach((pg, i) => {
    const a = PL[i], b = PA[i]; let s = '';
    for (let k = 0; k < 8; k += 2) s += (a[k] + (b[k] - a[k]) * e + (1 - e) * 0.9).toFixed(2) + ',' + (a[k + 1] + (b[k + 1] - a[k + 1]) * e).toFixed(2) + ' ';
    pg.setAttribute('points', s);
  });
}
M.playIcon = (btn, start) => {
  const sv = btn.querySelector('svg'), g = sv.querySelector('g'), s = new Sp(start ? 1 : 0); s.t = s.x; setPoly(sv, s.x);
  const o = {
    tick(dt) { s.step(dt); setPoly(sv, s.x); const p = M.p(); g.style.filter = p && p.goo && Math.abs(s.v) > 0.4 ? 'url(#goo)' : 'none'; const q = p ? Math.min(0.3, Math.abs(s.v) * p.sq) : 0; btn.style.transform = q > 0.002 ? `scale(${1 + q},${1 / (1 + q)})` : ''; },
    done() { if (s.rest) { s.x = s.t; setPoly(sv, s.x); g.style.filter = 'none'; btn.style.transform = ''; return true; } return false; }
  };
  return on => { s.t = on ? 1 : 0; if (!M.p()) { s.x = s.t; setPoly(sv, s.x); } M.run(o); };
};
/* press: squash then spring back */
M.press = el => {
  let o = el._press;
  if (!o) { const s = new Sp(0); o = el._press = { s, tick(dt) { s.step(dt); const a = s.x; el.style.transform = Math.abs(a) < 0.001 ? '' : `scale(${1 + a},${1 + a})`; }, done() { if (s.rest) { el.style.transform = ''; return true; } return false; } }; }
  o.s.x = -0.1; o.s.v = 0; o.s.t = 0; M.run(o);
};
/* jelly wobble for things that are soft (cover, Companion) */
M.jelly = (el, dir, amp = 0.1) => {
  let o = el._jel;
  if (!o) { const s = new Sp(0); o = el._jel = { s, amp, tick(dt) { s.step(dt, 0.6); const p = M.p(); const a = p ? s.x * o.amp * p.jel : 0; el.style.transform = Math.abs(a) < 0.0005 ? '' : `scale(${1 + a},${1 - a * 0.8}) rotate(${a * 6}deg)`; }, done() { if (s.rest) { el.style.transform = ''; return true; } return false; } }; }
  o.amp = amp; o.s.v += dir * 6; o.s.t = 0; M.run(o);
};
/* pill that slides: the front edge runs ahead, the back edge lags like a drop */
M.pill = (box, pill, bs, start, pad = 6) => {
  const l = new Sp(0), r = new Sp(0); let cur = start;
  const W = () => (box.clientWidth - pad * 2) / bs.length;
  const paint = () => { pill.style.left = (pad + l.x) + 'px'; pill.style.width = Math.max(20, r.x - l.x) + 'px'; };
  const o = { tick(dt) { const fwd = r.t > r.x || l.t > l.x; l.step(dt, fwd ? 0.55 : 1.15); r.step(dt, fwd ? 1.15 : 0.55); paint(); }, done() { if (l.rest && r.rest) { l.x = l.t; r.x = r.t; paint(); return true; } return false; } };
  const go = (i, snap) => { cur = i; bs.forEach((b, k) => b.classList.toggle('on', k === i)); l.t = i * W(); r.t = (i + 1) * W(); if (snap || !M.p()) { l.x = l.t; r.x = r.t; paint(); return; } M.run(o); };
  go(start, true); addEventListener('resize', () => go(cur, true));
  return go;
};
/* switch knob that stretches while it travels */
M.knob = (sw, on) => {
  const kn = sw.querySelector('i'); const W = 52, kw = 24; const x = new Sp(on ? 1 : 0);
  const paint = st => { kn.style.width = (kw + st) + 'px'; kn.style.left = (3 + x.x * (W - kw - 6) - (x.v > 0 ? 0 : st)) + 'px'; };
  paint(0);
  const o = { tick(dt) { x.step(dt); const p = M.p(); paint(p ? Math.min(14, Math.abs(x.v) * p.sq * 160) : 0); }, done() { if (x.rest) { paint(0); return true; } return false; } };
  return v => { x.t = v ? 1 : 0; if (!M.p()) x.x = x.t; M.run(o); };
};
/* a number that follows a target with a spring (used for rings, dots, shapes) */
M.follow = (init, apply, soft = 1) => {
  const s = new Sp(init); const o = { tick(dt) { s.step(dt, soft); apply(s.x, s.v); }, done() { if (s.rest) { apply(s.t, 0); return true; } return false; } };
  return v => { s.t = v; if (!M.p()) { s.x = v; s.v = 0; } M.run(o); };
};
window.Motion = M;
})();
