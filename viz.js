/* Visualisers and the play-button ripple. One small loop reads the sound once per frame and draws only what is on screen.
   Colour choices for each: accent, white, grey, spectrum. */
(() => {
'use strict';
const V = { layers: 2, eo: .4, es: .5, ea: .5, sn: .5, eb: .5, mode: 'none', col: 'accent', rip: 3, ripCol: 'accent', playing: false, active: false, lowp: false, hue: 0 };
const ws = new Float32Array(128), NB = 32, bands = new Float32Array(NB), raw = new Float32Array(NB), wav = new Float32Array(128), peak = new Float32Array(16);
let cvs = null, ctx = null, rc = null, rctx = null, W = 0, H = 0, RW = 0, timer = 0, last = 0, settle = 0, angle = 0, needle = { x: 0, v: 0 }, glowV = -1;
const PADV = 40; /* the frame is taller than the strip, so glow and peaks are never clipped */
let bassAvg = 0, energy = 0, lastRing = 0, rings = [], accent = ['#6aa9ee', '#3560bd'], accT = 0, dark = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const A = () => window.Android, clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

const AG = { t: 0 }, BR = new Float32Array(NB).fill(.5), BF = new Float32Array(NB).fill(.04);
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
V.profile = () => AG.t > 6 ? [+avg(BR).toFixed(3), +avg(BF).toFixed(3)] : null;
V.seed = p => { const r = p && p.length === 2 ? p : [.5, .04]; BR.fill(r[0]); BF.fill(r[1]); AG.t = 0; };
const reps = []; let lastBeat = 0, bAvg = 0, pend = false; V.pulse = () => { pend = true; V.kick(); };
V.attach = (canvas, ripple, host) => {
  cvs = canvas; ctx = cvs.getContext('2d'); rc = ripple; rctx = rc.getContext('2d'); V.size(); host = host || cvs.parentNode;
  try { new ResizeObserver(() => { V.size(); V.kick(); }).observe(cvs); } catch (e) {}
  for (let i = 0; i < 4; i++) { const el = document.createElement('canvas'); el.className = 'vzr r' + i; el.width = 256; el.height = 96; el.setAttribute('aria-hidden', 'true'); host.appendChild(el); reps.push({ el, c: el.getContext('2d'), s: 1, sv: 0, st: 1, a: 0, av: 0, at: 0, x: 0, xv: 0, xt: 0, y: 0, yv: 0, yt: 0, n: 0 }); }
};
const spr = (o, k, t, dt, kk = 12, z = .6) => { o[k + 'v'] += (-kk * (o[k] - o[k + 't']) - 2 * z * Math.sqrt(kk) * o[k + 'v']) * dt; o[k] += o[k + 'v'] * dt; };
function updateReps(vis, dt, now, beat) {
  const n = vis && !reduced ? Math.min(V.layers, V.lowp ? 1 : 4) : 0;
  reps.forEach((r, i) => {
    if (i >= n) { if (r.on) { r.el.style.display = 'none'; r.on = false; } return; }
    if (!r.on) { r.el.style.display = 'block'; r.on = true; }
    if (beat) {
      const rnd = () => Math.random() * 2 - 1, big = .5 + V.es * 1.5;
      r.st = 1 + (.22 + i * .22 + Math.random() * .25) * big; r.at = rnd() * V.ea * 38; r.xt = rnd() * V.ea * .16; r.yt = rnd() * V.ea * .12; r.t0 = now;
    } else if (now - (r.t0 || 0) > 900) { r.st += (1.12 + i * .1 - r.st) * (1 - Math.exp(-dt * 1.2)); r.at *= Math.exp(-dt * .9); r.xt *= Math.exp(-dt * .9); r.yt *= Math.exp(-dt * .9); }
    spr(r, 's', 0, dt, 9 + i, .55); spr(r, 'a', 0, dt, 8, .6); spr(r, 'x', 0, dt, 8, .65); spr(r, 'y', 0, dt, 8, .65);
    if ((r.n++ & 1) === 0) { r.c.clearRect(0, 0, 256, 96); r.c.drawImage(cvs, 0, 0, 256, 96); }
    r.el.style.transform = `translate(${(r.x * 100).toFixed(2)}%,${(r.y * 100).toFixed(2)}%) rotate(${r.a.toFixed(2)}deg) scale(${r.s.toFixed(3)})`;
    r.el.style.opacity = (V.eo * (.9 - i * .17)).toFixed(3);
  });
}
V.blurPx = () => (6 + V.eb * 20);
V.size = () => {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cvs && cvs.clientWidth) { W = cvs.clientWidth; H = Math.max(10, cvs.clientHeight - 2 * PADV); if (cvs.width !== Math.round(W * dpr) || cvs.height !== Math.round((H + 2 * PADV) * dpr)) { cvs.width = Math.round(W * dpr); cvs.height = Math.round((H + 2 * PADV) * dpr); } ctx.setTransform(dpr, 0, 0, dpr, 0, PADV * dpr); }
  if (rc) { RW = 190; if (rc.width !== Math.round(RW * dpr)) { rc.width = rc.height = Math.round(RW * dpr); } rctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
};
addEventListener('resize', () => { V.size(); V.kick(); });

function colours() {
  if (performance.now() - accT < 1500) return; accT = performance.now();
  const cs = getComputedStyle(document.documentElement);
  accent = [cs.getPropertyValue('--acc1').trim() || '#6aa9ee', cs.getPropertyValue('--acc2').trim() || '#3560bd'];
  dark = document.documentElement.dataset.theme === 'dark';
}
/* colour for a position 0..1 and alpha */
function paint(kind, pos, a = 1, hueBase = V.hue) {
  if (kind === 'white') return `rgba(255,255,255,${a})`;
  if (kind === 'grey') return `rgba(${dark ? '178,186,202' : '140,149,168'},${a})`;
  if (kind === 'spectrum') return `hsla(${(hueBase + pos * 280) % 360},88%,62%,${a})`;
  return pos > .5 ? withA(accent[0], a) : withA(accent[1], a);
}
const cache = new Map();
function withA(c, a) {
  let rgb = cache.get(c);
  if (!rgb) { const m = c.match(/\d+(\.\d+)?/g); if (/^#/.test(c)) { const n = parseInt(c.slice(1).length === 3 ? c.slice(1).replace(/./g, x => x + x) : c.slice(1), 16); rgb = [n >> 16, (n >> 8) & 255, n & 255]; } else if (/^hsl/.test(c)) { const h = +m[0] / 360, s = +m[1] / 100, l = +m[2] / 100, f = n => { const k = (n + h * 12) % 12, aa = s * Math.min(l, 1 - l); return Math.round(255 * (l - aa * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; rgb = [f(0), f(8), f(4)]; } else rgb = m ? m.slice(0, 3).map(Number) : [90, 140, 230]; cache.set(c, rgb); }
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}
function grad(kind, x0, y0, x1, y1, a = 1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  if (kind === 'spectrum') for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, paint('spectrum', i / 6, a)); else { g.addColorStop(0, paint(kind, 1, a)); g.addColorStop(1, paint(kind, 0, a)); }
  return g;
}

function read(dt) {
  const a = A(); let ok = false;
  if (a && a.spectrum && V.playing) ok = a.spectrum(raw);
  if (!ok) raw.fill(0);
  if (ok) { /* adapt every band to this song: loud songs are not stuck at the top, calm ones (ASMR) still rise and fall */
    for (let i = 0; i < NB; i++) {
      const r = raw[i];
      BR[i] += (r - BR[i]) * (1 - Math.exp(-dt * (r > BR[i] ? 16 : .35)));
      BF[i] += (r - BF[i]) * (1 - Math.exp(-dt * (r < BF[i] ? 6 : .12)));
      const fl = BF[i] * .6; raw[i] = clamp((r - fl) / Math.max(.12, BR[i] - fl));
    }
    AG.t += dt;
  }
  let s = 0;
  for (let i = 0; i < NB; i++) { const up = raw[i] > bands[i]; raw[i] = clamp(raw[i] * (.55 + V.sn * .95)); bands[i] += (raw[i] - bands[i]) * (1 - Math.exp(-dt * (up ? 34 : 9))); s += bands[i]; }
  const bass = (bands[0] + bands[1] + bands[2] + bands[3]) / 4, mean = s / NB;
  energy += ((bass * .6 + mean * .8) - energy) * (1 - Math.exp(-dt * 6));
  const centroid = bands.reduce((t, v, i) => t + v * i, 0) / (s + .001) / NB;
  const bs = (bands[0] + bands[1] + bands[2] + bands[3]) / 4, jb = bs - bAvg; bAvg += (bs - bAvg) * (1 - Math.exp(-dt * 3));
  const nowT = performance.now(); let beat = pend; pend = false; if (ok && jb > .16 - V.sn * .11 && bs > .18 && nowT - lastBeat > 430) { beat = true; lastBeat = nowT; }
  V.hue += (centroid * 260 - V.hue) * (1 - Math.exp(-dt * 1.4));
  return { bass, mean, ok, beat };
}

/* ---- the drawings ---- */
function scrimBottom() {}
function scrimAll() {}
const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
const cap = new Float32Array(NB), capV = new Float32Array(NB), capH = new Float32Array(NB);
/* a peak marker waits a moment at its top, then falls with growing speed */
function fall(a, v, h, i, level, dt, wait = .4, g = 3.6) {
  if (level >= a[i]) { a[i] = level; v[i] = 0; h[i] = wait; } else if (h[i] > 0) h[i] -= dt; else { v[i] += dt * g; a[i] = Math.max(level, a[i] - v[i] * dt); }
}
/* pixel colours climb in steps from the bottom row to the top row */
function pix(t) {
  if (V.col === 'spectrum') return `hsl(${(170 + V.hue * .12 + Math.floor(t * 6) / 5 * 150) % 360},84%,${58 + t * 6}%)`;
  if (V.col === 'white') return `rgba(255,255,255,${(.55 + .4 * Math.floor(t * 4) / 3).toFixed(2)})`;
  if (V.col === 'grey') return dark ? 'rgb(178,186,202)' : 'rgb(120,129,148)';
  return t > .5 ? accent[0] : accent[1];
}
/* bars: pixel art. Every bar is a stack of square pixels. The white peak pixel waits, then falls, and never rises above the top row. */
function bars(c, dt) {
  /* tiny square pixels (2 px with a 1 px gap) stacked into solid bars; the white cap is one pixel row, never above the tallest bar */
  const n = NB, pp = Math.max(3, Math.round(W / 130)), ps = pp - 1, gx = Math.max(3, Math.round(W * .008)), avail = (W * .9 - gx * (n - 1)) / n, kx = Math.max(2, Math.floor((avail + 1) / pp)), bw = kx * pp - 1;
  const R = Math.max(8, Math.floor(H * .6 / pp)), x0 = Math.round((W - (n * bw + (n - 1) * gx)) / 2), base = Math.round(H * .93), lit = BL;
  let top = 0;
  for (let i = 0; i < n; i++) { lit[i] = Math.round(bands[i] * R); fall(cap, capV, capH, i, bands[i], dt); if (lit[i] > top) top = lit[i]; }
  for (let r = 0; r < top; r++) {
    ctx.fillStyle = pix(r / (R - 1)); const y = base - (r + 1) * pp + 1;
    for (let i = 0; i < n; i++) if (lit[i] > r) ctx.fillRect(x0 + i * (bw + gx), y, bw, ps);
  }
  ctx.fillStyle = '#fff';
  for (let i = 0; i < n; i++) {
    if (cap[i] <= .04) continue; const cr = Math.min(R, Math.max(lit[i], Math.round(cap[i] * R)), top + 1), y = base - (cr + 1) * pp + 1; ctx.fillRect(x0 + i * (bw + gx), y, bw, ps);
  }
  /* the vertical gaps between pixel columns */
  const hh = (top + 2) * pp, yy = base - hh;
  for (let i = 0; i < n; i++) for (let k = 1; k < kx; k++) ctx.clearRect(x0 + i * (bw + gx) + k * pp - 1, yy, 1, hh + 2);
}
const BL = new Int16Array(NB);
let wRef = .3;
function wave(c) {
  scrimBottom(); const a = A(); let ok = a && a.wave && V.playing && a.wave(wav);
  if (!ok) wav.fill(0); else { let pk = 0; for (let i = 0; i < wav.length; i++) pk = Math.max(pk, Math.abs(wav[i])); wRef += (pk - wRef) * (pk > wRef ? .3 : .01); }
  const gain = ok ? clamp(.6 / Math.max(.12, wRef), .6, 4) : 1;
  for (let i = 0; i < wav.length; i++) ws[i] += (wav[i] * gain - ws[i]) * .3;
  const n = wav.length, mid = H * .72, amp = H * .26;
  ctx.lineCap = ctx.lineJoin = 'round';
  [[5, .28], [2.6, .95]].forEach(([lw, al]) => {
    ctx.lineWidth = lw; ctx.strokeStyle = grad(V.col, 0, 0, W, 0, al); ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = W * .05 + i / (n - 1) * W * .9, y = mid + clamp(ws[i], -1.2, 1.2) * amp * (1 + c.mean * .4); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  });
}
/* ---- lights: 48 columns of LEDs, each a 2:1 rectangle. Only the lit ones are drawn, on a clear background. ---- */
const LC = 48, lpk = new Float32Array(LC), lpv = new Float32Array(LC), lph = new Float32Array(LC);
let LED = null;
function ledSprite(css, lw, lh, dpr) {
  const pad = 4, c = document.createElement('canvas'); c.width = Math.ceil((lw + 2 * pad) * dpr); c.height = Math.ceil((lh + 2 * pad) * dpr);
  const x = c.getContext('2d'); x.scale(dpr, dpr); x.shadowColor = css; x.shadowBlur = 5; x.fillStyle = css; x.fillRect(pad, pad, lw, lh); return { c, pad };
}
function ledBuild() {
  const dpr = Math.min(2, window.devicePixelRatio || 1), span = W * .92, p = span / LC, lw = p * .8, lh = lw / 2, rp = lh * 1.5, rows = clamp(Math.floor(H * .46 / rp), 10, 24);
  LED = { W, H, dpr, span, p, lw, lh, rp, rows, px: (W - span) / 2, base: H * .93, sp: new Map() };
}
function ledCss(t) {
  if (V.col === 'white') return 'rgb(' + Math.round(225 + 30 * t) + ',' + Math.round(232 + 23 * t) + ',255)';
  if (V.col === 'grey') return dark ? 'rgb(190,198,214)' : 'rgb(150,160,180)';
  if (V.col === 'accent') return t > .5 ? accent[0] : accent[1];
  if (V.col === 'spectrum') return t < .55 ? 'rgb(70,230,120)' : t < .8 ? 'rgb(245,215,60)' : 'rgb(255,80,70)';
  return accent[0];
}
function lights(c, dt) {
  if (!LED || LED.W !== W || LED.H !== H) ledBuild(); const L = LED, rows = L.rows;
  const sp = css => { let s = L.sp.get(css); if (!s) { s = ledSprite(css, L.lw, L.lh, L.dpr); L.sp.set(css, s); } return s; }, wh = sp('rgb(255,255,255)');
  for (let i = 0; i < LC; i++) {
    const f = i / (LC - 1) * (NB - 1), a = Math.floor(f), b = Math.min(NB - 1, a + 1), lv = clamp(bands[a] + (bands[b] - bands[a]) * (f - a)), lit = Math.round(lv * rows);
    fall(lpk, lpv, lph, i, lv, dt, .4, 3);
    const x = L.px + i * L.p + (L.p - L.lw) / 2, yOf = r => L.base - (r + 1) * L.rp + (L.rp - L.lh) / 2;
    for (let r = 0; r < lit; r++) { const s = sp(ledCss(r / (rows - 1))), y = yOf(r); ctx.drawImage(s.c, x - s.pad, y - s.pad, L.lw + 2 * s.pad, L.lh + 2 * s.pad); }
    const pr = Math.min(rows, Math.max(lit, Math.round(lpk[i] * rows)));                  /* the white peak LED: at most one row above the tallest column */
    if (lpk[i] > .05) { const y = yOf(pr); ctx.drawImage(wh.c, x - wh.pad, y - wh.pad, L.lw + 2 * wh.pad, L.lh + 2 * wh.pad); }
  }
}
function meter(c, dt) {
  scrimAll(); const px = W / 2, py = H * .9, R = Math.min(W * .46, H * .72), a0 = -Math.PI / 2 - .85, a1 = -Math.PI / 2 + .85;
  ctx.lineCap = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = paint(V.col, .7, .6); ctx.beginPath(); ctx.arc(px, py, R, a0, a1); ctx.stroke();
  const redFrom = a0 + (a1 - a0) * .8; ctx.strokeStyle = 'rgba(235,90,80,.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(px, py, R, redFrom, a1); ctx.stroke();
  for (let i = 0; i <= 20; i++) { const a = a0 + (a1 - a0) * i / 20, big = i % 5 === 0, r1 = R - (big ? 16 : 9); ctx.strokeStyle = i > 16 ? 'rgba(235,90,80,.9)' : paint(V.col, .6, .8); ctx.lineWidth = big ? 2.2 : 1.2; ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1); ctx.lineTo(px + Math.cos(a) * R, py + Math.sin(a) * R); ctx.stroke(); }
  const tgt = clamp(c.mean * 1.9 + c.bass * .5), k = 55, z = .34; needle.v += (-k * (needle.x - tgt) - 2 * z * Math.sqrt(k) * needle.v) * dt; needle.x += needle.v * dt; const ang = a0 + (a1 - a0) * clamp(needle.x, -.05, 1.08);
  ctx.strokeStyle = paint(V.col === 'spectrum' ? 'white' : V.col, .5, 1); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - Math.cos(ang) * 10, py - Math.sin(ang) * 10); ctx.lineTo(px + Math.cos(ang) * (R - 6), py + Math.sin(ang) * (R - 6)); ctx.stroke();
  ctx.fillStyle = paint(V.col, .5, 1); ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill();
  ctx.fillStyle = paint('white', 0, .8); ctx.font = '300 ' + Math.round(W * .045) + 'px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VU', px, py - R * .42);
}

/* Tide: the signature picture. Three slow layers of light that rise and fall with the music and settle like water. */
const tY = [new Float32Array(26), new Float32Array(26), new Float32Array(26)];
function tide(c, dt) {
  const n = 26, t = performance.now() / 1000, L = [[.34, .62, .8], [.26, .5, .55], [.18, .4, .34]];
  for (let k = 2; k >= 0; k--) {
    const [amp, base, al] = L[k], ys = tY[k];
    for (let i = 0; i < n; i++) {
      const b = bands[Math.min(NB - 1, Math.floor(i / n * NB * .9))] * (1 - k * .18);
      const tgt = H * base - b * H * amp * 1.5 - Math.sin(t * (.55 + k * .3) + i * .5 + k * 1.9) * H * (.025 + c.mean * .05);
      ys[i] += (tgt - ys[i]) * (1 - Math.exp(-dt * (k ? 3.2 : 4.2)));
      if (!ys[i]) ys[i] = tgt;
    }
    ctx.beginPath(); ctx.moveTo(0, ys[0]);
    for (let i = 1; i < n; i++) { const x0 = (i - 1) / (n - 1) * W, x1 = i / (n - 1) * W, mx = (x0 + x1) / 2, my = (ys[i - 1] + ys[i]) / 2; ctx.quadraticCurveTo(x0, ys[i - 1], mx, my); }
    ctx.lineTo(W, ys[n - 1]); const top = ctx.lineWidth = 1.6; ctx.strokeStyle = grad(V.col, 0, 0, W, 0, Math.min(1, al + .15)); ctx.stroke();
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const f = ctx.createLinearGradient(0, H * .2, 0, H);
    if (V.col === 'spectrum') { f.addColorStop(0, paint('spectrum', .2 + k * .3, al * .5)); f.addColorStop(1, paint('spectrum', .2 + k * .3, 0)); } else { f.addColorStop(0, paint(V.col, k ? .2 : .9, al * .5)); f.addColorStop(1, paint(V.col, k ? .2 : .9, 0)); }
    ctx.fillStyle = f; ctx.fill();
  }
}

/* ---- the ripple behind the play button: small, slow, fades before it reaches the next control ---- */

let dcv = null, dctx = null, DW = 0, DH = 0;
V.prog = 0;
/* ---- the quiet seek bar: tiny dots, rising with the sound, with a softer reflection; bright is played, pale is to come ---- */
const dB = new Float32Array(240), dT = new Float32Array(240);
V.attachDots = canvas => { dcv = canvas; dctx = canvas.getContext('2d'); V.sizeD(); try { new ResizeObserver(() => { V.sizeD(); V.kick(); }).observe(dcv); } catch (e) {} };
V.sizeD = () => { const dpr = Math.min(2, window.devicePixelRatio || 1); if (dcv && dcv.clientWidth) { DW = dcv.clientWidth; DH = dcv.clientHeight; if (dcv.width !== Math.round(DW * dpr) || dcv.height !== Math.round(DH * dpr)) { dcv.width = Math.round(DW * dpr); dcv.height = Math.round(DH * dpr); } dctx.setTransform(dpr, 0, 0, dpr, 0, 0); } };
function dotsBar(c, dt, now) {
  dctx.clearRect(0, 0, DW, DH); const w = 3, gap = 2, pitch = w + gap, N = Math.max(8, Math.floor(DW / pitch)), x0 = (DW - (N * pitch - gap)) / 2, mid = DH / 2, MAX = 7, p = clamp(V.prog);
  const dark = document.documentElement.dataset.theme === 'dark', rgb = dark ? '255,255,255' : '26,28,34';
  for (let i = 0; i < N; i++) {
    const f = i / (N - 1), b = bands[Math.min(NB - 1, Math.floor(Math.pow(f, 1.25) * NB * .8))], tg = 1.5 + Math.pow(b, .8) * (MAX - 1.5);
    dB[i] += (tg - dB[i]) * (1 - Math.exp(-dt * (tg > dB[i] ? 40 : 10)));
    const h = clamp2(dB[i], 1.5, MAX), played = f <= p;
    dctx.fillStyle = `rgba(${rgb},${played ? .94 : .36})`; dctx.beginPath(); (dctx.roundRect ? dctx.roundRect(x0 + i * pitch, mid - h, w, h * 2, w / 2) : dctx.rect(x0 + i * pitch, mid - h, w, h * 2)); dctx.fill();
  }
}
const clamp2 = (x, a, b) => Math.max(a, Math.min(b, x));
/* heat: PressureObserver when the phone offers it, otherwise frame-time drift. Hot = stars and dots drop to 15 fps (the wave stays full). */
/* device profiles: how soon the app eases effects and how fast the quiet layers draw (ms between frames) */
V.profiles = { nord5: { heat: 26, cool: 20, star: 30, hot: 66 }, mi11x: { heat: 23, cool: 19, star: 40, hot: 83 } };
const DP = () => V.profiles[window.MP_DEVICE] || V.profiles.nord5;
V.heat = 0; V.trace = new Array(60).fill(0); let trI = 0, trL = 0, hotN = 0;
function heatTick(now) {
  if (trL) { const d = Math.min(100, now - trL); V.trace[trI = (trI + 1) % 60] = d; if (V.playing && V.opt && !V.pressure) { let m = 0; for (let i = 0; i < 60; i++) m += V.trace[i]; m /= 60; if (m > DP().heat) hotN = Math.min(600, hotN + 1); else if (m < DP().cool) hotN = Math.max(0, hotN - 2); V.heat = hotN > 240 ? 1 : (hotN < 60 ? 0 : V.heat); } }
  trL = now;
}
try { if (window.PressureObserver) { V.pressure = 1; new PressureObserver(r => { const l = r[r.length - 1]; V.heat = l && (l.state === 'serious' || l.state === 'critical') ? 1 : 0; }).observe('cpu', { sampleInterval: 2000 }).catch(() => { V.pressure = 0; }); } } catch (e) { V.pressure = 0; }
let ripOn = false, stLast = 0, dtAcc = 0, dotLast = 0;
const THR = [9, .17, .12, .085, .055, .035];
function ripple(c, now) {
  const s = V.rip; if (!V.opt || ripOn) { rctx.clearRect(0, 0, RW, RW); ripOn = false; }
  const btn = document.getElementById('bplay');
  if (btn) { const g = s ? clamp(energy * (.5 + s * .25)) : 0, q = Math.round(g * 14); if (q !== glowV) { glowV = q; btn.style.boxShadow = s ? `0 14px 32px rgba(10,20,80,.3), 0 0 ${6 + g * 20}px ${g * 2}px ${paint(V.ripCol, .5, .1 + g * .3, V.hue)}` : ''; } }
  if (!s || !V.playing) { rings.length = 0; return; }
  const bass = (bands[0] + bands[1] + bands[2] + bands[3]) / 4, jump = bass - bassAvg; bassAvg += (bass - bassAvg) * .08;
  if (c.ok && jump > THR[s] * .5 && bass > .22 && now - lastRing > 520) { rings.push({ t0: now, amp: clamp(.35 + bass * .9), hue: V.hue }); lastRing = now; }
  else if (now - lastRing > 1800 && energy > .06) { rings.push({ t0: now, amp: .3, hue: V.hue }); lastRing = now; }
  if (rings.length > 4) rings.shift();
  const cx = RW / 2, cy = RW / 2, r0 = 40, maxR = 47 + s * 3.4, life = 2600, alpha = .1 + s * .035;
  rings = rings.filter(r => now - r.t0 < life);
  if (rings.length) ripOn = true;
  rings.forEach(r => {
    const k = (now - r.t0) / life, e = 1 - Math.pow(1 - k, 2.6), rad = r0 + e * (maxR - r0), a = clamp(r.amp * alpha * Math.pow(1 - k, 1.4) * 2, 0, .5);
    rctx.lineWidth = 1.8 - k * 1.1; rctx.strokeStyle = paint(V.ripCol, .5, a, r.hue); rctx.beginPath(); rctx.arc(cx, cy, rad, 0, 7); rctx.stroke();
  });
}


/* ---- stars: the far background. They appear, fade, glow, shine and twinkle, and answer the beat by blinking and flaring, never by moving like the wave ---- */
let scv = null, sctx = null, SW = 0, SH = 0, SN = 0, SS = 0, stars = [], sprH = [], sprX = null, stT = 0, stShine = 0, fakeB = 0, stOff = false;
const TINT = ['255,255,255', '205,225,255', '255,238,205', '228,210,255'];
V.stars = { on: true, amt: .5, size: .5, glow: .5, tw: .5, beat: .6, pace: .5 };
V.attachStars = c => { scv = c; sctx = c.getContext('2d'); sprH = TINT.map(t => { const s = document.createElement('canvas'); s.width = s.height = 64; const g = s.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, `rgba(${t},1)`); r.addColorStop(.12, `rgba(${t},.55)`); r.addColorStop(.4, `rgba(${t},.14)`); r.addColorStop(1, `rgba(${t},0)`); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return s; });
  sprX = document.createElement('canvas'); sprX.width = sprX.height = 128; const g = sprX.getContext('2d');
  [[1, 0], [0, 1]].forEach(([dx, dy]) => { const L = 62, gr = g.createLinearGradient(64 - dx * L, 64 - dy * L, 64 + dx * L, 64 + dy * L); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.strokeStyle = gr; g.lineWidth = 1.6; g.beginPath(); g.moveTo(64 - dx * L, 64 - dy * L); g.lineTo(64 + dx * L, 64 + dy * L); g.stroke(); }); };
function mkStar(now, i) { const rr = Math.random(); return { x: Math.random(), y: Math.random() * .94, r: .5 + rr * rr * 1.7, t: i % 4, ph: Math.random() * 6.3, rate: 1.1 + Math.random() * 2.4, life: Math.random() < .55 ? Math.random() : 0, tgt: 1, nx: now + Math.random() * 6000, fl: 0, cr: 0 }; }
function flare(s, k) { s.tgt = 1; s.life = Math.max(s.life, .55); s.fl = Math.max(s.fl, .6 + Math.random() * .4); if (Math.random() < .35 + k * .6) s.cr = 1; s.nx = performance.now() + 2500 + Math.random() * 4000; }
function starsFrame(c, dt, now) {
  if (!scv || !sctx) return; const P = V.stars;
  if (!P.on || scv.offsetParent === null) { if (!stOff) { sctx.clearRect(0, 0, SW, SH); stOff = true; } return; } stOff = false;
  if (V.lowp && (stT++ & 1)) return;
  if (V.opt) { dtAcc += dt; if (now - stLast < (V.heat ? DP().hot : DP().star)) return; stLast = now; dt = Math.min(.1, dtAcc); dtAcc = 0; }
  if (!SW || Math.abs(scv.clientWidth - SW) > 2 || Math.abs(scv.clientHeight - SH) > 2) { SW = scv.clientWidth; SH = scv.clientHeight; scv.width = SW; scv.height = SH; }
  const N = Math.round((10 + P.amt * 90) * (V.lowp ? .6 : 1)), sp = .35 + P.pace * 1.3, sz = .45 + P.size * 1.7, gl = P.glow, tw = P.tw;
  if (stars.length !== N) { while (stars.length < N) stars.push(mkStar(now, stars.length)); stars.length = N; }
  let beat = c.beat; if (!c.ok && V.playing) { fakeB += dt; if (fakeB > .62) { fakeB = 0; beat = true; } }
  if (beat && P.beat > 0) { const k = 1 + Math.floor(P.beat * 4 * Math.random() + P.beat * 2); for (let i = 0; i < k; i++) flare(stars[(Math.random() * N) | 0], P.beat); }
  stShine -= dt * sp; if (stShine < 0) { stShine = 2.5 + Math.random() * 5; const s = stars[(Math.random() * N) | 0]; if (s) { flare(s, 1); s.cr = 1; } }
  const t = now / 1000, bo = dark ? 1 : 1.35; sctx.clearRect(0, 0, SW, SH); sctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < N; i++) {
    const s = stars[i]; if (now > s.nx) { s.tgt = s.tgt ? 0 : 1; s.nx = now + (s.tgt ? 3500 + Math.random() * 8000 : 2500 + Math.random() * 7000) / sp; }
    s.life += (s.tgt - s.life) * (1 - Math.exp(-dt * .9 * sp)); s.fl = Math.max(0, s.fl - dt * 1.1); s.cr = Math.max(0, s.cr - dt * .75);
    const q = .5 + .5 * Math.sin(t * s.rate * sp + s.ph), a = s.life * (1 - tw * .7 * (1 - q)); if (a < .015 && s.fl < .02) continue;
    const x = s.x * SW, y = s.y * SH, d = s.r * sz, cx = Math.min(1, (a + s.fl) * bo);
    sctx.globalAlpha = Math.min(1, cx * (.25 + gl * .55)); const hd = d * (5 + gl * 9 + s.fl * 10); sctx.drawImage(sprH[s.t], x - hd, y - hd, hd * 2, hd * 2);
    sctx.globalAlpha = Math.min(1, cx * .95); const cd = d * (.9 + s.fl * .8); sctx.drawImage(sprH[s.t], x - cd * 1.6, y - cd * 1.6, cd * 3.2, cd * 3.2);
    if (s.cr > .02) { sctx.globalAlpha = Math.min(1, s.cr * (.5 + gl * .5)); const L = d * (10 + gl * 8) * (.6 + s.cr * .6); sctx.drawImage(sprX, x - L, y - L, L * 2, L * 2); }
  }
  sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over';
}

/* ---- the loop ---- */
function frame() {
  timer = 0;
  if (document.hidden || !V.active) return;
  const Pw = window.Power; if (Pw && !Pw.live()) return;          // Library, Settings, dim: nothing drawn
  const now = performance.now(), dt = Math.min(.1, (now - last) / 1000 || .03); last = now; heatTick(now);
  colours();
  const vis = V.mode !== 'none' && cvs && cvs.offsetParent !== null;
  const needRip = V.rip > 0 && rc && rc.offsetParent !== null;
  const c = read(dt);
  if (vis) {
    if (cvs.width === 0 || Math.abs(cvs.clientWidth - W) > 1 || Math.abs(cvs.clientHeight - 2 * PADV - H) > 1) V.size();
    if (V.mode === 'bars' || V.mode === 'lights') ctx.clearRect(0, -PADV, W, H + 2 * PADV); else { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = `rgba(0,0,0,${1 - Math.exp(-dt * (V.mode === 'meter' ? 9 : 6.5))})`; ctx.fillRect(0, -PADV, W, H + 2 * PADV); ctx.globalCompositeOperation = 'source-over'; }
    ({ bars, wave, lights, tide, disc: wave })[V.mode](c, dt);
  }
  const dotsVis = dcv && document.getElementById('app').classList.contains('quiet');
  if (dotsVis) { if (!DW || Math.abs(dcv.clientWidth - DW) > 1 || Math.abs(dcv.clientHeight - DH) > 1) V.sizeD(); if (!V.opt || now - dotLast >= (V.heat ? DP().hot : DP().star)) { dotsBar(c, Math.min(.1, (now - dotLast) / 1000 || dt), now); dotLast = now; } }
  updateReps(vis, dt, now, c.beat); starsFrame(c, dt, now);
  if (needRip) ripple(c, now);
  // keep drawing while playing; after pause, a short settle, then stop
  if (V.playing) settle = 40; else settle--;
  if (Pw) Pw.count(performance.now() - now);
  if (settle > 0 || rings.length) timer = Pw && Pw.t === 'rest' ? setTimeout(frame, Pw.gap()) : (V.playing && !V.lowp) ? requestAnimationFrame(frame) : setTimeout(frame, V.playing ? 33 : 50);
}
V.kick = () => { if (!timer && V.active && !reduced) { last = performance.now(); timer = setTimeout(frame, 0); } };
V.set = o => { Object.assign(V, o); if (ctx && ('mode' in o)) ctx.clearRect(0, -PADV, W, H + 2 * PADV); if ('mode' in o || 'col' in o) { glowV = -1; if (ctx && cvs) ctx.clearRect(0, -PADV, W, H + 2 * PADV); } V.kick(); };
document.addEventListener('visibilitychange', () => V.kick());
window.Viz = V;
})();
