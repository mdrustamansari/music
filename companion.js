/* The Companion: a clear glass blob, drawn as an outline only. Its shape follows the music (bass swells the belly, treble
   lifts the top), its two eyes blink and look around, and its mouth changes with the mood of the sound. */
(() => {
'use strict';
const NS = 'http://www.w3.org/2000/svg', N = 12, TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const C = { reactive: true, on: true, playing: false, lowp: false, sleepLeft: 0, hosts: [], t0: performance.now() };
const lev = new Float32Array(12), sm = new Float32Array(N).fill(0), pts = [];
let bassAvg = 0, onset = 0, energy = 0, centroid = 0, surprise = 0, giggle = 0, lookX = 0, lookY = 0, lookT = 0, lookTX = 0, blink = 0, nextBlink = 2, squash = 0, hasAudio = false;
const P = { open: 1, happy: 0, sleep: 0, mouthC: 0.5, mouthO: 0, mouthW: 30, bodyY: 0 };   // eased face
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function html() {
  return `<svg class="comp" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
  <defs><linearGradient id="cg%" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--cs1)"/><stop offset="1" stop-color="var(--cs2)"/></linearGradient></defs>
  <g class="cb"><path class="cin" fill="none" stroke="url(#cg%)" stroke-width="1.2" opacity=".35"/><path class="cout" fill="none" stroke="url(#cg%)" stroke-width="3.2" stroke-linejoin="round"/><path class="cspec" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
  <g class="face" fill="currentColor" stroke="currentColor">
   <g class="eL"><ellipse rx="8" ry="11" stroke="none"/><circle r="2.6" fill="#fff" stroke="none" class="gl"/><path class="ha" fill="none" stroke-width="4.4" stroke-linecap="round" d="M-9 4Q0 -9 9 4"/></g>
   <g class="eR"><ellipse rx="8" ry="11" stroke="none"/><circle r="2.6" fill="#fff" stroke="none" class="gl"/><path class="ha" fill="none" stroke-width="4.4" stroke-linecap="round" d="M-9 4Q0 -9 9 4"/></g>
   <path class="mo" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
   <g class="zz" fill="currentColor" stroke="none" font-family="Inter,sans-serif" font-weight="300"><text x="150" y="60" font-size="18">z</text><text x="162" y="42" font-size="13">z</text></g></g></g></svg>`;
}
let uid = 0;
C.mount = (host) => {
  host.insertAdjacentHTML('afterbegin', html().replace(/cg%/g, 'cg' + (++uid)));
  const el = host.querySelector('svg.comp');
  const h = { host, el, out: el.querySelector('.cout'), inn: el.querySelector('.cin'), spec: el.querySelector('.cspec'), body: el.querySelector('.cb'), eL: el.querySelector('.eL'), eR: el.querySelector('.eR'), mo: el.querySelector('.mo'), zz: el.querySelector('.zz') };
  C.hosts.push(h); C.draw(h); C.kick(); return h;
};
C.unmount = h => { C.hosts = C.hosts.filter(x => x !== h); h.el.remove(); };

function smooth(p) {   // closed Catmull-Rom spline through points, as cubic beziers
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length; i++) {
    const p0 = p[(i - 1 + p.length) % p.length], p1 = p[i], p2 = p[(i + 1) % p.length], p3 = p[(i + 2) % p.length];
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}
const ang = i => (i / N) * TAU;
const bandOf = i => Math.round(11 * (1 + Math.cos(ang(i))) / 2 * -1 + 11);   // top = treble (11), bottom = bass (0)

C.step = (dt, now) => {
  const t = (now - C.t0) / 1000;
  const on = C.reactive && !reduced && C.playing && window.Android && window.Android.levels && window.Android.levels(lev);
  hasAudio = !!on;
  let bass = 0, mid = 0, hi = 0;
  if (on) { bass = (lev[0] + lev[1] + lev[2]) / 3; mid = (lev[3] + lev[4] + lev[5] + lev[6] + lev[7]) / 5; hi = (lev[8] + lev[9] + lev[10] + lev[11]) / 4; }
  const rms = clamp((bass * 1.1 + mid * 0.9 + hi * 0.4) / 1.6 * 1.5);
  energy += (rms - energy) * (rms > energy ? 0.25 : 0.05);
  centroid += ((on ? (hi + 0.3 * mid) / (bass + mid + hi + 0.05) : 0.3) - centroid) * 0.05;
  const jump = bass - bassAvg; bassAvg += (bass - bassAvg) * 0.08;
  if (on && jump > 0.1 && onset < 0.2) onset = 1; else onset *= Math.pow(0.002, dt);
  squash += ((onset * 0.05) - squash) * 0.3;
  for (let i = 0; i < N; i++) {
    const tgt = on ? clamp(lev[clamp(bandOf(i), 0, 11)] * 1.25) : 0;
    sm[i] += (tgt - sm[i]) * (tgt > sm[i] ? 0.45 : 0.12);
  }
  surprise = Math.max(0, surprise - dt / 0.7); giggle = Math.max(0, giggle - dt / 1.0);
  nextBlink -= dt; if (nextBlink < 0) { blink = 1; nextBlink = 2 + Math.random() * 4; if (Math.random() < 0.3) lookTX = (Math.random() - 0.5) * 2; }
  blink = Math.max(0, blink - dt / 0.16);
  lookX += (lookTX - lookX) * Math.min(1, dt * 6); lookTX *= Math.pow(0.4, dt);
  // mood -> target face
  const drowsy = C.sleepLeft > 0 && C.sleepLeft < 300 ? 1 - C.sleepLeft / 300 : 0;
  const asleep = !C.playing && C.idle ? 1 : 0;
  let open = 1, happy = 0, mc = 0.55, mo = 0, mw = 30;
  if (C.playing) {
    const joy = clamp((energy - 0.45) * 2.2);
    mo = clamp(hasAudio ? (mid * 1.7 + bass * 0.5) * (0.4 + energy) - 0.12 : 0.08 + 0.1 * Math.sin(t * 2));
    mc = 0.55 + joy * 0.35; mw = 28 + centroid * 40 + joy * 8; happy = joy > 0.55 ? (joy - 0.55) * 2.2 : 0;
    open = (energy < 0.12 && hasAudio ? 0.62 : 1) + onset * 0.15;
  } else { mc = 0.35; mo = 0; open = 1; }
  if (surprise > 0) { mo = Math.max(mo, 0.75 * surprise); open = 1.2; mc = 0; mw = 22; happy = 0; }
  if (giggle > 0) { happy = 1; mo = 0.55; mc = 1; mw = 40; }
  if (drowsy > 0) { open = Math.min(open, 1 - 0.7 * drowsy); mo = Math.max(0, mo - drowsy * 0.3); if (C.sleepLeft < 25) { mo = 0.9; mw = 22; mc = 0; open = 0.25; } }
  if (C.lowp) open = Math.min(open, 0.7);
  const k = 1 - Math.pow(0.001, dt);
  P.open += ((blink > 0 ? 0.06 : open) - P.open) * Math.min(1, k * (blink > 0 ? 3 : 1.4));
  P.happy += (happy - P.happy) * k; P.sleep += (asleep - P.sleep) * k * 0.5;
  P.mouthC += (mc - P.mouthC) * k; P.mouthO += (mo - P.mouthO) * Math.min(1, k * 2.2); P.mouthW += (mw - P.mouthW) * k;
  if (C.hosts.some(h => h.big)) { /* no-op */ }
  C.phase = t;
};
C.draw = h => {
  const t = C.phase || 0, R = 66, cx = 100, cy = 108 - P.sleep * 4;
  const breathe = reduced ? 0 : (C.playing ? 0.022 : 0.012);
  const p = [];
  for (let i = 0; i < N; i++) {
    const a = ang(i), w = 1 + breathe * Math.sin(t * (C.playing ? 1.6 : 0.9) + i * 1.7) + sm[i] * 0.34 + (Math.cos(a) < -0.5 ? squash * 1 : -squash * 0.4) * 0 - (Math.abs(Math.sin(a)) * squash);
    const rx = R * 1.07 * w, ry = R * (0.96 + (Math.cos(a) > 0.2 ? 0.03 : 0)) * (w + squash * 0.9);
    p.push([cx + Math.sin(a) * rx, cy - Math.cos(a) * ry]);
  }
  const d = smooth(p); h.out.setAttribute('d', d);
  h.inn.setAttribute('d', d); h.inn.setAttribute('transform', `translate(${cx} ${cy}) scale(.9) translate(${-cx} ${-cy})`);
  h.spec.setAttribute('d', `M${(cx - 40).toFixed(1)} ${(cy - 42).toFixed(1)}Q${(cx - 28).toFixed(1)} ${(cy - 58).toFixed(1)} ${(cx - 8).toFixed(1)} ${(cy - 62).toFixed(1)}`);
  // face
  const fy = cy - 8 + P.sleep * 3, lx = lookX * 6, ex = 25;
  [[h.eL, cx - ex], [h.eR, cx + ex]].forEach(([g, x]) => {
    g.setAttribute('transform', `translate(${(x + lx).toFixed(1)} ${(fy - 8).toFixed(1)})`);
    const el = g.querySelector('ellipse'), ha = g.querySelector('.ha'), gl = g.querySelector('.gl');
    const op = clamp(P.open - P.sleep);
    el.setAttribute('ry', (1.4 + 10 * clamp(op, 0, 1.3)).toFixed(2)); el.setAttribute('rx', (8 + 1.2 * clamp(P.open - 1, 0, 0.3) * 6).toFixed(2));
    const hap = clamp(P.happy + P.sleep * 0.0); el.style.opacity = 1 - hap; ha.style.opacity = hap; gl.setAttribute('cx', (2.6 + lookX * 1.5).toFixed(1)); gl.setAttribute('cy', -3); gl.style.opacity = (1 - hap) * clamp(op * 1.5);
    if (P.sleep > 0.5) { ha.style.opacity = P.sleep; ha.setAttribute('d', 'M-9 -2Q0 8 9 -2'); el.style.opacity = 1 - P.sleep; } else ha.setAttribute('d', 'M-9 4Q0 -9 9 4');
  });
  const my = fy + 28, w = P.mouthW / 2, c = P.mouthC, o = clamp(P.mouthO, 0, 1) * (1 - P.sleep);
  const up = my + 12 * c - 2, lo = up + 3 + o * 30;
  h.mo.setAttribute('d', `M${(cx - w).toFixed(1)} ${(my).toFixed(1)}Q${cx} ${up.toFixed(1)} ${(cx + w).toFixed(1)} ${my.toFixed(1)}Q${cx} ${(lo + 12 * c).toFixed(1)} ${(cx - w).toFixed(1)} ${my.toFixed(1)}Z`);
  h.mo.style.fill = o > 0.12 ? 'currentColor' : 'none';
  h.zz.style.opacity = P.sleep;
};
let timer = 0, last = 0;
C.kick = () => { if (!timer) timer = setTimeout(C.frame, 0); };
C.frame = () => {
  timer = 0; if (document.hidden || !C.on) return;
  if (window.Power && !Power.live()) return;
  const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000 || 0.03); last = now;
  const vis = C.hosts.filter(h => h.host.offsetParent !== null);
  if (vis.length) { C.step(dt, now); vis.forEach(C.draw); }
  timer = (window.Power && Power.t === 'rest') ? setTimeout(C.frame, Power.gap()) : (C.playing && !C.lowp) ? requestAnimationFrame(C.frame) : setTimeout(C.frame, C.playing ? 40 : 100);
};
document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); C.kick(); } });
/* moments */
C.track = () => { surprise = 1; };
C.tap = () => { giggle = 1; };
C.look = dx => { lookTX = clamp(dx, -1, 1); };
C.setIdle = v => { C.idle = v; };
window.Companion = C;
})();
