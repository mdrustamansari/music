/* Rustam's Music — the glass screen. The phone engine is the "Android" bridge (see Bridge.kt). */
(() => {
'use strict';
const A = window.Android;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = window.MPS ? { get: MPS.get, set: MPS.set } : {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

/* ---------- settings ---------- */
const M = window.Motion, C = window.Companion, ROOT = document.documentElement;
let S = Object.assign({ night: true, nightT: 23, nightV: 7, nightR: 5, skin: 'glass', look: 'auto', on: [], off: [], infinity: true, fade: true, haptic: true, hero: 'album', acol: true, calm: false, comp: true, listen: true, warm: true, live: 2, viz: 'tide', ins: true, insf: 6, lysz: 17, st: true, sta: 50, sts: 50, stg: 50, stt: 50, stb: 60, stp: 50, sm: true, pwr: true, lv: 'auto', cover: true, djmin: 20, djmax: 70, djspeech: false, lmus: 100, lfx: 100, lkeep: true, djxf: 6, djfav: true, lslow: 14, lrev: 45, lech: 30, lwarm: 50, lvol: 70, eql: 0, eqm: 0, eqh: 0, vol: 100, norm: true, insst: 'tip', vfav: {}, lastbk: 0, insop: 100, insol: 100, xf: true, xfl: 3, mxo_soft: true, mxv_soft: 55, mxo_heavy: false, mxv_heavy: 40, mxo_thunder: true, mxv_thunder: 45, mxo_crickets: false, mxv_crickets: 35, mxo_birds: false, mxv_birds: 35, adn: true, admin: 35, admax: 100, adp: 'slow', lsleep: 0, vizc: 'accent', rip: 3, ripc: 'accent', net: false, ev: 2, eo: 40, es: 50, ea: 50, sn: 50, eb: 50, src: 'bolly', sx: { itunes: true, deezer: true, mb: true, wiki: true, adb: true }, fresh: true,  suggest: true, rem: false, speed: 1, tapHold: false, opt: true }, store.get('mp_set', {}));
if (S.lrn === undefined) S.lrn = true; if (S.lsv === undefined) S.lsv = true; if (window.Taste) Taste.cfg(S.lrn, S.lsv);
if (S.fresh === undefined) S.fresh = true; if (S.insf === undefined) S.insf = S.ins === false ? 0 : 6; S.sx = Object.assign({ adb: true }, S.sx);
{ const raw = store.get('mp_set', {}); if (raw.viz === undefined && raw.hero === 'blob') S.viz = 'blob'; if (raw.viz === undefined && raw.hero === 'album') S.viz = 'none'; }
if (!['none', 'tide', 'bars', 'wave', 'lights', 'disc'].includes(S.viz)) S.viz = 'tide';
let favs = new Set(store.get('mp_favs', [])), marks = store.get('mp_marks', []), tried = store.get('mp_tried', {}), snooze = store.get('mp_snooze', 0);
const saveS = () => { store.set('mp_set', S); MPS.flush(); };

/* ---------- small helpers ---------- */
const tick = () => { if (S.haptic && A && A.tick) A.tick(); };
const fmt = ms => { ms = Math.max(0, Math.round(ms / 1000)); return Math.floor(ms / 60) + ':' + String(ms % 60).padStart(2, '0'); };
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const band = (d = new Date()) => { const h = d.getHours(); return h >= 5 && h < 11 ? 'morning' : h < 16 ? 'afternoon' : h < 21 ? 'evening' : 'night'; };
const hueOf = s => hash(s) % 360;
const artCss = s => { const h = hueOf(s); return `linear-gradient(150deg,hsl(${h} 70% 62%),hsl(${(h + 50) % 360} 65% 70%) 60%,hsl(${(h + 120) % 360} 70% 78%))`; };
const initial = s => { const m = String(s).trim().match(/[\p{L}\p{N}]/u); return m ? m[0].toUpperCase() : '♪'; };

/* messy-folder healer: tidy raw file names before anything is shown */
const DIRTY = /(\[[^\]]*\]|\([^)]*(kbps|official|video|audio|lyric|release|remaster|hd|hq|mp3|free download|www)[^)]*\)|(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|net|org|in|co|pk|io|info|me)(?![a-z0-9])[_\s-]*|\b\d{2,3}\s?kbps\b|\.(mp3|flac|wav|m4a|ogg|opus|aac)$)/gi;
const titleCase = s => s.toLowerCase().replace(/(^|\s|-)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
function heal(s) {
  let t = String(s || '').replace(DIRTY, ' ').replace(/_/g, ' ').replace(/\s+-\s*$/, '').replace(/\s{2,}/g, ' ').trim();
  t = t.replace(/^\d{1,3}\s*[-.)]\s*/, '');
  if (t && (t === t.toLowerCase() || t === t.toUpperCase()) && /[a-z]/i.test(t)) t = titleCase(t);
  return t;
}
const dirtyTitle = (t, f) => !t || /[_[\]]|www\.|\.com|kbps|\.mp3|\.flac/i.test(t) || t === f.replace(/\.[^.]+$/, '');
const JUNK = /whatsapp|voice|recording|ringtone|notification|alarm|podcast|call|sound ?recorder|telegram audio|status/i;

/* ---------- library ---------- */
let lib = [], byId = new Map(), folders = new Map();
const folderOf = p => (p || '').replace(/\/+$/, '') || 'Internal storage';
const folderName = f => f.split('/').pop() || f;
const included = f => S.on.includes(f) ? true : S.off.includes(f) ? false : !JUNK.test(f);
const songs = () => lib.filter(s => included(s.f));
function buildLib(raw) {
  lib = raw.map(r => {
    const f = folderOf(r.p), t = dirtyTitle(r.t, r.f || '') ? heal(r.t || r.f) : r.t;
    return { id: String(r.id), t: t || 'Untitled', a: r.a || '', al: r.al || '', d: r.d, f, ad: r.ad || 0, hk: !!r.hk, o: !!r.o, sz: r.sz || 0, fn: r.f || '', g: r.g || '', y: r.y || 0, ys: r.ys || '', yc: r.yc || 0, yv: r.yv || [], n: r.n || 0, mn: r.mn || '' };
  });
  byId = new Map(lib.map(s => [s.id, s]));
  folders = new Map();
  lib.forEach(s => { if (!folders.has(s.f)) folders.set(s.f, []); folders.get(s.f).push(s); });
  if (A.names) A.names(JSON.stringify(lib.map(s => ({ id: s.id, t: s.t, a: s.a || folderName(s.f) }))));
}
const sub = s => s.a || folderName(s.f);
const ns = n => n + (n === 1 ? ' song' : ' songs');

/* universal search: songs, artists, albums, playlists, genres and moods, grouped; every result opens its own page */
const MOODS = [[/asmr|whisper|tingl|binaural|white noise|rain sound|nature sound/, 'asmr'], [/focus|study|concentrat|reading|work music|deep work/, 'focus'], [/late night|night|bed|dream|sleep/, 'late'], [/calm|quiet|soft|gentle|slow|relax|chill|peace/, 'calm'], [/live|lively|energ|upbeat|fast|party|dance|happy|loud|workout/, 'live']];
function uniSearch(q, songsMatched) {
  const has = s => (s || '').toLowerCase().includes(q), out = [], sec = (t, h) => { if (h) out.push(`<div class="sech"><h2>${t}</h2></div>${h}`); };
  const songs0 = songsMatched.slice(0, 40);
  const ar = [...artistMap()].filter(([n]) => has(n)).slice(0, 6), al = [...albumMap()].filter(([n]) => has(n)).slice(0, 6);
  const gn = new Map(); songs().forEach(s => { if (s.g && has(s.g)) { const k = s.g.trim(); (gn.get(k) || gn.set(k, []).get(k)).push(s); } });
  const pls = userLists.filter(l => has(l.name)).map(l => `<button class="row" data-ul="${l.id}" type="button"><div class="th" style="background:${CDBG}"></div><div class="tx"><div class="rt1">${esc(l.name)}</div><div class="rt2">Playlist · ${ns(ulSongs(l).length)}</div></div></button>`);
  const AL = autoLists(), moodKeys = new Set(); MOODS.forEach(([re, k]) => { if (re.test(q)) moodKeys.add(k); });
  const mo = AL.filter(x => moodKeys.has(x.k) || has(x.name) || has(x.desc)).slice(0, 6).map(x => `<button class="row" data-ap="${x.k}" type="button"><div class="th" style="background:${CDBG}"></div><div class="tx"><div class="rt1">${esc(x.name)}</div><div class="rt2">${esc(x.desc)} · ${ns(x.list.length)}</div></div></button>`);
  sec('Artists', ar.map(([n, l]) => `<button class="row" data-artist="${esc(n)}" type="button">${artistAvatar(n, l)}<div class="tx"><div class="rt1">${esc(n)}</div><div class="rt2">Artist · ${ns(l.length)}</div></div></button>`).join(''));
  sec('Albums', al.map(([n, l]) => `<button class="row" data-album="${esc(n)}" type="button">${thHTML(l[0])}<div class="tx"><div class="rt1">${esc(n)}</div><div class="rt2">Album · ${ns(l.length)}</div></div></button>`).join(''));
  sec('Playlists', pls.join(''));
  sec('Genres', [...gn].slice(0, 6).map(([n, l]) => `<button class="row" data-gn="${esc(n)}" type="button"><div class="th" style="background:${CDBG}"></div><div class="tx"><div class="rt1">${esc(n)}</div><div class="rt2">Genre · ${ns(l.length)}</div></div></button>`).join(''));
  sec('Moods and types', mo.join(''));
  sec('Songs', songs0.map((s, i) => rowHTML(s, i)).join(''));
  return { html: out.join(''), songs: songs0, n: songsMatched.length + ar.length + al.length + pls.length + gn.size + mo.length };
}


/* after a restore on a fresh install the songs get new ids: match them by file name and size, and carry plays, ratings, hearts and playlists over */
function remapFromBackup() {
  const m = store.get('mp_idmap', null); if (!m || !m.length) return;
  const have = new Set(songs().map(s => s.id)), by = new Map(songs().map(s => [s.fn + '|' + s.sz, s.id])), moves = [], left = [];
  m.forEach(x => { if (have.has(x.id)) return; const to = by.get(x.f + '|' + x.size); if (to && to !== x.id) moves.push({ from: x.id, to }); else if (!to) left.push(x); });
  if (moves.length) { mergeInto(moves); toast(moves.length + ' songs matched to your backup'); }
  if (left.length) store.set('mp_idmap', left); else store.remove ? store.remove('mp_idmap') : localStorage.removeItem('mp_idmap');
}

/*DUPS*/
/* ---------- play history (learns the time of day) ---------- */
let plays = store.get('mp_plays', []);
function logPlay(id) {
  const n = Date.now(), last = plays[plays.length - 1];
  if (last && last.id === id && n - last.t < 180000) return;
  plays.push({ id, t: n, b: band() });
  if (plays.length > 2000) plays = plays.slice(-2000);
  store.set('mp_plays', plays);
}
function likelyFolders() {
  const b = band(), now = Date.now(), score = new Map();
  plays.forEach(p => {
    const s = byId.get(p.id); if (!s || !included(s.f)) return;
    const w = (p.b === b ? 1 : 0.25) * Math.exp(-(now - p.t) / (30 * 864e5));
    score.set(s.f, (score.get(s.f) || 0) + w);
  });
  const all = [...folders.keys()].filter(included);
  all.forEach(f => { const rec = Math.max(...folders.get(f).map(s => s.ad)); score.set(f, (score.get(f) || 0) + rec / 1e11); });
  return all.sort((x, y) => (score.get(y) || 0) - (score.get(x) || 0));
}

/* ---------- artwork ---------- */
const artCache = new Map();
let artBusy = Promise.resolve();
function getArt(id, size = 256) {
  const k = id + ':' + size;
  if (artCache.has(k)) return Promise.resolve(artCache.get(k));
  artBusy = artBusy.then(() => new Promise(res => setTimeout(() => {
    let v = ''; try { v = A.art(id, size) || ''; } catch (e) {} if (!v) { const s0 = byId.get(id); if (s0) v = albCover(albKey(s0)); }
    if (/^https?:/.test(v)) { const im = new Image(); const done = ok => { artCache.set(k, ok ? v : ''); res(ok ? v : ''); }; im.onload = () => done(true); im.onerror = () => done(false); im.src = v; return; }
    artCache.set(k, v); res(v);
  }, 8)));
  return artBusy.then(() => artCache.get(k));
}
function paintThumb(el, s) {
  const keep = [...el.children], put = t => { el.textContent = t; keep.forEach(k => el.appendChild(k)); };
  el.style.background = CDBG;
  put('');
  getArt(s.id, +el.dataset.sz || 128).then(u => { if (u) { el.style.background = `center/cover url(${u})`; put(''); } });
}
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { io.unobserve(e.target); const s = byId.get(e.target.dataset.id); if (s) paintThumb(e.target, s); }
}), { rootMargin: '200px' }) : null;
function thumbs(root) { $$('.th[data-id]', root).forEach(el => { if (io) io.observe(el); else { const s = byId.get(el.dataset.id); if (s) paintThumb(el, s); } }); }
const CDBG = 'center/contain no-repeat url(cd.png)';
const thHTML = s => `<div class="th" data-id="${s.id}" style="background:${CDBG}"></div>`;

/* ---------- colours that follow the cover (all switchable) ---------- */
const rgb2hs = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; } return [h, d / (1 - Math.abs(mx + mn - 1) || 1)]; };
const hueMix = (a, b, k) => { let d = ((b - a + 540) % 360) - 180; return (a + d * k + 360) % 360; };
let col = { h1: 215, s1: 70, h2: 25, s2: 70, tone: '' };
function setCol(h1, s1, h2, s2) { col = { h1, s1, h2, s2, tone: '' }; applyColours(); }
function applyColours() {
  const dark = ROOT.dataset.theme === 'dark', warm = ROOT.dataset.warm === 'on';
  ['--amb1', '--amb2', '--acc1', '--acc2', '--cs2'].forEach(p => ROOT.style.removeProperty(p));
  col.tone = '';
  if (S.acol) {
    const h1 = warm ? hueMix(col.h1, 28, .55) : col.h1, h2 = warm ? hueMix(col.h2, 18, .55) : col.h2;
    const L1 = dark ? 34 : 76, L2 = dark ? 30 : 80;
    ROOT.style.setProperty('--amb1', `hsl(${h1.toFixed(0)} ${col.s1}% ${L1}%)`);
    ROOT.style.setProperty('--amb2', `hsl(${h2.toFixed(0)} ${col.s2}% ${L2}%)`);
    if (col.s1 > 12) {
      const s = Math.max(45, Math.min(78, col.s1));
      ROOT.style.setProperty('--acc1', `hsl(${h1.toFixed(0)} ${s}% ${dark ? 72 : 62}%)`);
      ROOT.style.setProperty('--acc2', `hsl(${h1.toFixed(0)} ${s}% ${dark ? 58 : 40}%)`);
      ROOT.style.setProperty('--cs2', `hsl(${h1.toFixed(0)} ${s}% ${dark ? 70 : 42}%)`);
    }
    const bgL = dark ? .09 : .97, bl = (L1 + L2) / 200;
    const L = dark ? .7 * bgL + .3 * bl : .42 * bgL + .58 * bl;
    col.tone = L > .6 ? 'dark' : 'light';
  }
  mood(); updateTone();
}
/* each mode has its own atmosphere: Playing stays as the cover paints it, DJ turns cool and electric, Lofi turns warm and grainy */
function mood() {
  const dj = !!(window.DJ && DJ.on), lo = !!(window.Fx && Fx.on), dark = ROOT.dataset.theme === 'dark';
  ROOT.dataset.dj = dj ? 'on' : 'off'; ROOT.dataset.lofi = lo ? 'on' : 'off';
  const P = (k, v) => ROOT.style.setProperty(k, v);
  if (dj) { P('--amb1', dark ? 'hsl(262 70% 34%)' : 'hsl(255 75% 78%)'); P('--amb2', dark ? 'hsl(190 80% 28%)' : 'hsl(190 80% 76%)'); P('--acc1', dark ? 'hsl(190 85% 66%)' : 'hsl(262 70% 56%)'); P('--acc2', dark ? 'hsl(262 75% 66%)' : 'hsl(262 70% 44%)'); P('--cs2', dark ? 'hsl(190 85% 68%)' : 'hsl(262 65% 44%)'); }
  else if (lo) { P('--amb1', dark ? 'hsl(28 60% 30%)' : 'hsl(30 85% 78%)'); P('--amb2', dark ? 'hsl(8 50% 28%)' : 'hsl(12 75% 82%)'); P('--acc1', dark ? 'hsl(32 80% 68%)' : 'hsl(24 80% 52%)'); P('--acc2', dark ? 'hsl(18 70% 58%)' : 'hsl(16 70% 42%)'); P('--cs2', dark ? 'hsl(32 80% 70%)' : 'hsl(22 70% 40%)'); }
}
function updateTone() {
  if (window.Viz) Viz.set({ active: tab === 'play' });
  if (tab === 'play' && col.tone) ROOT.dataset.tone = col.tone; else delete ROOT.dataset.tone;
  $('#app').classList.toggle('pl', tab === 'play');
}
function ambient(url, seed) {
  const h = hueOf(seed);
  setCol(h, 78, (h + 70) % 360, 78);
  if (!url) return;
  const im = new Image();
  im.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 8;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0, 8, 8);
      const d = x.getImageData(0, 0, 8, 8).data; let a = [0, 0, 0], b = [0, 0, 0];
      for (let i = 0; i < 128; i += 4) { a[0] += d[i]; a[1] += d[i + 1]; a[2] += d[i + 2]; }
      for (let i = 128; i < 256; i += 4) { b[0] += d[i]; b[1] += d[i + 1]; b[2] += d[i + 2]; }
      const A1 = a.map(v => v / 32), B1 = b.map(v => v / 32), p = rgb2hs(...A1), q = rgb2hs(...B1);
      setCol(p[0], Math.round(Math.min(85, p[1] * 100 * 1.25)), q[0], Math.round(Math.min(85, q[1] * 100 * 1.25)));
    } catch (e) {}
  };
  im.src = url;
}

/* ---------- player state ---------- */
let st = { playing: false, pos: 0, dur: 0, index: 0, count: 0, shuffle: false, repeat: 0, qv: -1, sleep: 0 };
let qIds = [], qv = -1, curId = null, loggedId = null, dragging = false, hasArt = false, aloneId = null, sleepTotal = 0, lastPl = null, bgm = 0, lastIc = null, pausedAt = 0, lastRep = -1, lastSleepOn = null;
const slip = new Set();
const cur = () => (window.DJ && DJ.on && DJ.now && byId.get(DJ.now.id)) || byId.get(qIds[st.index]);

/* shape-shifting icons */
const setP = M.playIcon($('#bplay'), false), setMP = M.playIcon($('#mplay'), false);
const repAng = M.follow(0, v => { $('#replp').style.transform = `rotate(${v * 180}deg)`; });
const repOne = M.follow(0, v => { const o = $('#repone'); o.style.transform = `scale(${Math.max(0, v)})`; o.style.opacity = Math.max(0, Math.min(1, v)); });
const moonK = M.follow(0, v => { const m = $('#moon'), r = $('#ring'); m.style.opacity = Math.max(0, Math.min(1, 1 - v * 1.2)); m.style.transform = `scale(${1 - .8 * Math.min(1, v)}) rotate(${v * 120}deg)`; r.style.opacity = Math.max(0, Math.min(1, v * 1.4)); });
const qSet = ['#ql1', '#ql2', '#ql3'].map((q, i) => M.follow(0, v => { $(q).style.transform = `translateY(${v * -7 * (i + 1) / 2}px)`; $(q).style.opacity = 1 - Math.abs(v) * .5; }, 1 + i * .15));
function qdrop() { qSet.forEach((f, i) => { const s = $(['#ql1', '#ql2', '#ql3'][i]); s.style.transform = 'translateY(-10px)'; setTimeout(() => f(0), i * 60); }); }

/* each song's loudness profile is learned in its first seconds and kept, so the visualisers fit the song from the first frame next time */
const loudMap = store.get('mp_loud', {}); let loudT = Date.now();
function loudSave() { const p = Viz.profile(); if (!p || !curId) return; const o = loudMap[curId]; loudMap[curId] = o ? [+(o[0] * .6 + p[0] * .4).toFixed(3), +(o[1] * .6 + p[1] * .4).toFixed(3)] : p; const k = Object.keys(loudMap); if (k.length > 3000) delete loudMap[k[0]]; store.set('mp_loud', loudMap); loudT = Date.now(); }
function poll() {
  if (st && st.playing && Date.now() - loudT > 20000) loudSave();
  if (!A) return;
  let n; try { n = JSON.parse(A.state()); } catch (e) { return; }
  st = n;
  if (window.DJ && DJ.on) { st.playing = !DJ.paused; st.pos = DJ.pos(); st.dur = DJ.now ? DJ.now.l * 1000 : st.dur; }
  if (n.qv !== qv) { const first = qv === -1; qv = n.qv; try { qIds = JSON.parse(A.queue()); } catch (e) { qIds = []; } if (!first) qdrop(); if ($('#qsheet').classList.contains('open')) renderQueue(); infinity(); }
  const s = cur();
  if (s && s.id !== curId) { if (bgm) { bgm = 0; bgPaint(); } loudSave(); Viz.seed(loudMap[s.id]); if (window.Taste && !(window.DJ && DJ.on)) Taste.start(s.id, st.dur || s.d); curId = s.id; slip.delete(s.id); nowPlaying(s); svyWatch(); if (C) C.track(); if (window.Fx) Fx.track(s.id); window.__lv && __lv(s.id); }
  if (s && window.Taste && !(window.DJ && DJ.on)) { Taste.tick(s.id, n.pos, n.playing); if (n.dur) Taste.dur(n.dur); }
  if (s && n.playing && !(window.DJ && DJ.on) && loggedId !== s.id) { loggedId = s.id; logPlay(s.id); }
  paintState();
}

const CV = ['tide', 'bars', 'wave', 'lights', 'disc'];
function effViz() { if (S.calm) return 'none'; return CV.includes(S.viz) && S.listen ? S.viz : 'none'; }
function heroMode() { if (S.calm) return 'calm'; if (!S.cover) return S.comp ? 'blob' : 'none'; return S.viz === 'disc' ? 'disc' : 'album'; }
function paintMode() { const v = $('#v-play'); v.dataset.mode = heroMode(); v.dataset.viz = effViz(); v.dataset.cd = 0; if (window.Viz) Viz.set({ mode: effViz() }); }
function setCover(u, s) {
  const c = $('#cover'); hasArt = !!u;
  c.style.background = u ? `center/cover url(${u})` : ''; c.classList.toggle('has', !!u); c.classList.toggle('cd', !u);
  $('#coverletter').textContent = initial(s.t); paintMode();
}
function nowPlaying(s) {
  insSeed = Math.random(); setTimeout(insPaintSoft, 0);
  $('#title').textContent = s.t;
  $('#artist').textContent = sub(s);
  $('#from').textContent = 'Playing from ' + folderName(s.f);
  $('#live').textContent = 'Now playing ' + s.t + ', ' + sub(s);
  const keep = hasArt; setCover('', s); hasArt = keep; $('#cover').classList.remove('has');
  ambient('', s.f + s.a);
  getArt(s.id, 512).then(u => { if (curId === s.id) { setCover(u, s); if (u) ambient(u, s.f + s.a); } });
  const mt = $('#mth'); mt.style.background = CDBG; mt.textContent = '';
  getArt(s.id, 96).then(u => { if (u && curId === s.id) { mt.style.background = `center/cover url(${u})`; mt.textContent = ''; } });
  $('#mtitle').textContent = s.t; $('#martist').textContent = sub(s);
  paintAlone(); miniShow();
}
function paintAlone() {
  const a = $('#alone'), s = cur(), on = s && aloneId === s.id && !S.calm;
  a.classList.toggle('hid', !on);
  if (on) { const t = $('#aloneth'); t.style.background = artCss(s.f + s.a); t.textContent = initial(s.t); getArt(s.id, 64).then(u => { if (u && curId === s.id) { t.style.background = `center/cover url(${u})`; t.textContent = ''; } }); $('#alonetxt').textContent = 'Plays alone'; }
}

function paintState() {
  const dur = st.dur || (cur() ? cur().d : 0), f = dur ? Math.min(1, st.pos / dur) : 0;
  if (!dragging) { Viz.prog = f; $('#barf').style.width = (f * 100) + '%'; $('#knob').style.left = (f * 100) + '%'; $('#tcur').textContent = fmt(st.pos); $('#bar').setAttribute('aria-valuenow', Math.round(f * 100)); }
  $('#tdur').textContent = S.rem ? '-' + fmt(dur - st.pos) : fmt(dur);
  const pl = !!st.playing, ic = bgm ? bgm === 1 : pl;
  if (ic !== lastIc) { lastIc = ic; setP(ic); setMP(ic); ['#bplay', '#mplay'].forEach(q => $(q).setAttribute('aria-label', ic ? 'Pause' : 'Play')); }
  if (pl !== lastPl) {
    const first = lastPl === null; lastPl = pl;
    $('#app').classList.toggle('pl-on', pl);
    if (C) { C.playing = pl; C.kick(); }
    if (window.Viz) Viz.set({ playing: pl });
  }
  if (C) { C.sleepLeft = st.sleep; if (!pl) { if (!pausedAt) pausedAt = Date.now(); C.setIdle(!cur() || Date.now() - pausedAt > 20000); } else { pausedAt = 0; C.setIdle(false); } }
  $('#lshuf').classList.toggle('on', !!st.shuffle); $('#lshuf').setAttribute('aria-label', st.shuffle ? 'Shuffle on' : 'Shuffle off');
  if (st.repeat !== lastRep) { lastRep = st.repeat; repAng(st.repeat === 1 ? 1 : 0); repOne(st.repeat === 1 ? 1 : 0); $('#lrep').classList.toggle('on', st.repeat > 0); $('#lrep').style.opacity = st.repeat === 0 ? .55 : 1; $('#lrep').setAttribute('aria-label', ['Repeat off', 'Repeat one song', 'Repeat all'][st.repeat]); }
  const so = st.sleep > 0;
  if (so && st.sleep > sleepTotal) sleepTotal = st.sleep;
  if (so !== lastSleepOn) { lastSleepOn = so; moonK(so ? 1 : 0); if (!so) sleepTotal = 0; }
  if (so) $('#ring').style.strokeDashoffset = 53.4 * (1 - st.sleep / (sleepTotal || st.sleep));
  $('#sleeptxt').textContent = so ? Math.ceil(st.sleep / 60) + ' min' : '';
}

/* queue protection and infinity play */
let infHold = null, infT = 0;
/* after a tidy, the music-going refill waits until the current song is nearly over, so a cleared queue stays clear */
function infLater() { infHold = qIds[st.index]; clearInterval(infT); infT = setInterval(() => { if (!infHold || qIds[st.index] !== infHold) { infHold = null; clearInterval(infT); return; } if ((st.dur || 0) - (st.pos || 0) < 20000) { infHold = null; clearInterval(infT); infinity(); } }, 3000); }
function infinity() {
  if (!S.infinity || !qIds.length || st.repeat === 2 || infHold) return;
  if (st.index < qIds.length - 2) return;
  const inQ = new Set(qIds), c = cur(), b = band();
  const heat = new Map(); plays.forEach(p => { if (p.b === b) heat.set(p.id, (heat.get(p.id) || 0) + 1); });
  const cands = songs().filter(s => !inQ.has(s.id)).map(s => ({
    s, v: (c && s.a && s.a === c.a ? 2 : 0) + (c && s.f === c.f ? 1.5 : 0) + Math.min(2, heat.get(s.id) || 0) + Math.random() * 0.8
  })).sort((x, y) => y.v - x.v).slice(0, 10).map(x => x.s.id);
  if (cands.length) { A.append(JSON.stringify(cands)); }
}
function startList(list, i) { aloneId = null; if (window.Taste) Taste.manual(); A.setQueue(JSON.stringify(list.map(s => s.id)), i, 0, true); tick(); setTab('play'); }
function choose(list, i, label) {
  const one = i !== null && i !== undefined;
  const ids = one ? [list[i].id] : list.map(s => s.id);
  if (!qIds.length) { startList(list, one ? i : 0); return; }
  if (!one) { chooseList(list, label, ids); return; }
  const j = JSON.stringify(ids);
  popup(`<h3>${esc(label)}</h3><div class="sub">Your queue stays safe.</div>
    <button class="pillbtn" data-do="now" type="button">${one ? 'Play alone' : 'Play now'}</button>
    <div class="acts"><button class="lnk" data-do="next" type="button">Play next</button><button class="lnk" data-do="end" type="button">Add to end</button></div>`, e => {
    const d = e.target.dataset.do; if (!d) return;
    if (d === 'now') { A.insertNext(j); if (one) aloneId = ids[0]; setTimeout(() => { A.jump(st.index + 1); setTab('play'); }, 120); }
    if (d === 'next') { A.insertNext(j); ids.forEach(id => slip.add(id)); toast('Will play next'); }
    if (d === 'end') { A.append(j); toast('Added to the end'); }
    tick(); closePop();
  });
}

/* starting a whole list while a queue exists: Replace or Add. Replacing offers to keep the old queue under a fitting name. */
function queueName(ids) {
  const L = ids.map(i => byId.get(i)).filter(Boolean), d = new Date(), day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), h = d.getHours();
  const top = k => { const m = new Map(); L.forEach(s => { const v = k(s); if (v) m.set(v, (m.get(v) || 0) + 1); }); const x = [...m].sort((a, b) => b[1] - a[1])[0]; return x && x[1] / L.length >= .6 ? x[0] : ''; };
  const al = top(s => s.al), ar = top(s => s.a);
  let nm = al || (ar ? ar + ' mix' : '') || ((h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night') + ' mix · ' + day);
  nm = nm.slice(0, 40); let k = 2, base = nm; while (userLists.some(l => l.name === nm)) nm = base.slice(0, 36) + ' ' + k++;
  return nm;
}
function replaceWithSave(list) {
  const same = userLists.some(l => l.ids.length === qIds.length && l.ids.every((x, k) => x === qIds[k]));
  if (qIds.length < 2 || same) { startList(list, 0); return; }
  const nm = queueName(qIds), old = qIds.slice();
  popup(`<h3>Keep the current queue?</h3><div class="sub">${ns(old.length)} will be replaced.</div><input class="inp" id="plname" value="${esc(nm)}" aria-label="Playlist name" maxlength="40" style="margin:12px 0" autocomplete="off"><button class="pillbtn" data-do="go" type="button">Save, then replace</button><div class="acts"><button class="lnk" data-do="no" type="button">Don't save</button></div>`, ev => {
    const k = ev.target.dataset.do; if (!k) return; const v = ($('#plname') || {}).value; closePop();
    if (k === 'go') { const name = (v || nm).trim() || nm; userLists.unshift({ id: 'u' + Date.now(), name, ids: old, at: Date.now() }); saveULists(); toast('Saved “' + name + '”'); }
    startList(list, 0);
  });
}
function chooseList(list, label, ids) {
  if (S.alwaysRepl) { startList(list, 0); toastUndo('Queue replaced', () => { S.alwaysRepl = false; saveS(); }, 'Ask again', 6000); return; }
  const j = JSON.stringify(ids); let always = false;
  popup(`<h3>${esc(label)}</h3>
    <button class="pillbtn" data-do="rep" type="button">Replace the queue</button>
    <div class="acts"><button class="lnk" data-do="end" type="button">Add to the end</button><button class="lnk" data-do="next" type="button">Play next</button></div>
    <div class="alw"><span>Always replace</span><button class="sw" data-do="al" type="button" role="switch" aria-checked="false" aria-label="Always replace"><i></i></button></div>`, e => {
    const b = e.target.closest('[data-do]'); if (!b) return; const d = b.dataset.do;
    if (d === 'al') { always = !always; b.classList.toggle('on', always); b.setAttribute('aria-checked', always); tick(); return; }
    closePop();
    if (d === 'rep') { if (always) { S.alwaysRepl = true; saveS(); startList(list, 0); toastUndo('Queue replaced', () => { S.alwaysRepl = false; saveS(); }, 'Ask again', 6000); } else replaceWithSave(list); return; }
    if (d === 'next') { A.insertNext(j); ids.forEach(id => slip.add(id)); toast('Will play next'); }
    if (d === 'end') { A.append(j); toast('Added to the end'); }
    tick();
  });
}
/* tidy the queue: counts show what each action would remove; Undo puts it back */
function tidyPlan(n) {
  const ids = qIds, i = st.index, seen = new Set([ids[i]]), dup = [];
  ids.forEach((id, k) => { if (k === i) { dup.push(id); return; } if (!seen.has(id)) { seen.add(id); dup.push(id); } });
  const dupIdx = dup.indexOf(ids[i]);
  return { played: { n: i, ids: ids.slice(i), at: 0 }, dups: { n: ids.length - dup.length, ids: dup, at: dupIdx }, keep: { n: Math.max(0, ids.length - (i + 1 + n)), ids: ids.slice(0, i + 1 + n), at: i }, clear: { n: ids.length - 1, ids: [ids[i]], at: 0 } };
}
function tidyOpen() {
  if (!qIds.length) return;
  const keepN = [10, 25, 50], ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const draw = () => {
    const P = k => tidyPlan(k), base = P(25);
    return `<h3>Tidy the queue</h3><div class="tdl">
      <button class="tdb" data-t="played" type="button" ${base.played.n ? '' : 'disabled'}>${ic('<path d="M5 12l4 4 10-10"/>')}<span>Remove played</span><b>${base.played.n}</b></button>
      <button class="tdb" data-t="dups" type="button" ${base.dups.n ? '' : 'disabled'}>${ic('<rect x="8" y="8" width="11" height="11" rx="2.5"/><path d="M5 15V7a2 2 0 012-2h8"/>')}<span>Remove repeats</span><b>${base.dups.n}</b></button>
      <div class="tdk">${ic('<path d="M4 7h10M4 12h7M4 17h4"/><path d="M17 8v8M14.5 13.5L17 16l2.5-2.5"/>')}<span>Keep next</span>${keepN.map(k => `<button class="lnk sm" data-t="keep" data-k="${k}" type="button" ${P(k).keep.n ? '' : 'disabled'}>${k}</button>`).join('')}</div>
      <button class="tdb" data-t="clear" type="button" ${base.clear.n ? '' : 'disabled'}>${ic('<path d="M6 6l12 12M18 6L6 18"/>')}<span>Clear all but this song</span><b>${base.clear.n}</b></button></div>`;
  };
  popup(draw(), e => {
    const b = e.target.closest('button[data-t]'); if (!b || b.disabled) return; const t = b.dataset.t, plan = tidyPlan(+b.dataset.k || 25)[t === 'keep' ? 'keep' : t];
    const prevIds = qIds.slice(), prevIdx = st.index; closePop(); tick();
    A.reorder(JSON.stringify(plan.ids), t === 'played' || t === 'clear' ? 0 : t === 'dups' ? plan.at : st.index); infLater();
    toastUndo(ns(plan.n) + ' removed', () => { infHold = null; A.reorder(JSON.stringify(prevIds), prevIdx); });
  });
}
$('#qtidy').addEventListener('click', tidyOpen);

/* ---------- views ---------- */
let tab = 'play', stack = [];
const goTab = M.pill($('.tabs'), $('.tabs .pill'), $$('.tabs button'), 0);
function setTab(t) {
  tab = t; stack = [];
  $$('.view').forEach(v => v.classList.remove('on')); $('#v-' + t).classList.add('on');
  goTab(['play', 'lib', 'set'].indexOf(t));
  if (t === 'lib') renderLib(); if (t === 'set') renderSet();
  updateTone(); closeQueue(); miniShow(); wake(); if (window.Power) Power.touch();
}
function miniShow() { $('#mini').classList.toggle('hid', !(cur() && tab !== 'play')); }
function morphToPlay() {
  if (!document.startViewTransition || !M.p()) { setTab('play'); return; }
  const src = [$('#minic'), $('#mth')].find(e => e.offsetParent !== null);
  if (src) src.style.viewTransitionName = 'art';
  let dst = null;
  const t = document.startViewTransition(() => {
    if (src) src.style.viewTransitionName = '';
    setTab('play');
    dst = [$('#cover'), $('#bigc')].find(e => e.offsetParent !== null);
    if (dst) dst.style.viewTransitionName = 'art';
  });
  t.finished.finally(() => { if (dst) dst.style.viewTransitionName = ''; });
}

const PLAYSVG = '<svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><polygon points="8.5,5 19,12 8.5,19"/></svg>';
function rowHTML(s, i, extra = '') { return `<button class="row${extra}" data-i="${i}" data-id="${s.id}" type="button">${thHTML(s)}<div class="tx"><div class="rt1">${esc(s.t)}</div><div class="rt2">${esc(sub(s))} · ${fmt(s.d)}</div></div></button>`; }
let addState = 0;
const ADDSVG = () => `<svg class="addic" data-s="${addState}" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><g class="a"><path d="M12 5v14M5 12h14"/></g><g class="b"><circle cx="12" cy="12" r="8" stroke-dasharray="14 40"/></g><g class="c"><path d="M6 12.5l4 4 8-9" stroke-linejoin="round"/></g></svg>`;
function ageLabel(d) { return d < 1 ? 'new' : d < 14 ? Math.round(d) + ' d' : d < 60 ? Math.round(d / 7) + ' wk' : Math.round(d / 30) + ' mo'; }
function rediscover() {
  const now = Date.now(), last = new Map(), b = band(), cnt = new Map();
  plays.forEach(p => { last.set(p.id, Math.max(last.get(p.id) || 0, p.t)); if (p.b === b) cnt.set(p.id, (cnt.get(p.id) || 0) + 1); });
  return songs().filter(s => s.id !== curId).map(s => { const lp = last.get(s.id) || s.ad * 1000, age = (now - lp) / 864e5; return { s, age, v: Math.min(4, Math.log2(age + 1)) + (cnt.get(s.id) || 0) * 1.2 + Math.random() * 1.5 }; })
    .sort((x, y) => y.v - x.v).slice(0, 8);
}

/* ---------- library: Home, Songs, Albums, Artists, Playlists ---------- */
let libSeg = (v => ['home', 'songs', 'albums', 'artists', 'lists'].includes(v) ? v : 'home')(store.get('mp_seg', 'home')), segGo = null, artInfo = store.get('mp_artist', {}), energy = store.get('mp_energy', {});
const SEGS = [['home', 'Home'], ['songs', 'Songs'], ['albums', 'Albums'], ['artists', 'Artists'], ['lists', 'Playlists']];
const firstArtist = s => { const a = (s.a || '').split(/\s*(?:,|&|;|\bfeat\.?|\bft\.?|\bwith\b| x )\s*/i)[0].trim(); return a || 'Unknown artist'; };
let _ar = null, _arLib = null;
function artistMap() { if (_ar && _arLib === lib) return _ar; const m = new Map(); songs().forEach(s => { const k = firstArtist(s); (m.get(k) || m.set(k, []).get(k)).push(s); }); _ar = m; _arLib = lib; return m; }
const dayOf = t => { const d = new Date(t).getDay(); return d === 0 || d === 6 ? 'weekend' : 'week'; };
/* ---------- Auto playlists you can change, and what the app learns from the changes ---------- */
let smartL = store.get('mp_smart', []), djf = store.get('mp_djf', {}), alx = store.get('mp_alx', {}), alb = store.get('mp_alb', {}), DOUBT = [];
const FEEL = ['calm', 'live', 'late', 'focus', 'asmr'];
function alxSave() { store.set('mp_alx', alx); store.set('mp_alb', alb); }
let _enR = null;
function featOf(s) {
  const e = energy[s.id], p = loudMap[s.id]; if (!_enR) { const en = songs().filter(x => energy[x.id] && energy[x.id].n >= 3).map(x => energy[x.id].s / energy[x.id].n).sort((x, y) => x - y); _enR = en; setTimeout(() => { _enR = null; }, 4000); }
  const ev = e && e.n >= 3 ? e.s / e.n : null, rk = ev == null || _enR.length < 2 ? null : _enR.filter(v => v < ev).length / (_enR.length - 1);
  return [rk, p ? clampN(p[0], 0, 1) : null, Math.min(1, (s.d || 0) / 360000)];
}
const clampN = (x, a, b) => Math.max(a, Math.min(b, x));
function fdist(f, c) { let t = 0, n = 0; for (let i = 0; i < 3; i++) if (f[i] != null && c[i] != null) { t += (f[i] - c[i]) ** 2; n++; } return n ? Math.sqrt(t / n) : null; }
function catLearn(k, s, sign) {
  if (!FEEL.includes(k)) return; const f = featOf(s), m = alb[k] || (alb[k] = { p: { s: [0, 0, 0], c: [0, 0, 0], n: 0 }, q: { s: [0, 0, 0], c: [0, 0, 0], n: 0 } }), g = m[sign > 0 ? 'p' : 'q'];
  f.forEach((v, i) => { if (v != null) { g.s[i] += v; g.c[i]++; } }); g.n++;
}
const centroid = g => g && g.n ? g.s.map((v, i) => g.c[i] ? v / g.c[i] : null) : null;
/* the app moves its own rules: songs nearer to what you removed leave the list, songs nearer to what you added come in */
function catAdjust(k, list, sg) {
  const m = alb[k]; if (!m || m.p.n + m.q.n < 3) return list; const P = centroid(m.p), N = centroid(m.q), inL = new Set(list.map(s => s.id));
  const score = s => { const f = featOf(s), dp = P ? fdist(f, P) : null, dn = N ? fdist(f, N) : null; if (dp == null && dn == null) return 0; return (dn == null ? .3 : dn) - (dp == null ? .3 : dp); };
  const keep = list.filter(s => !N || m.q.n < 2 || score(s) > -.06);
  const extra = P && m.p.n >= 2 ? sg.filter(s => !inL.has(s.id) && included(s.f) && score(s) > .22).sort((x, y) => score(y) - score(x)).slice(0, 6) : [];
  return keep.concat(extra);
}
function applyOv(k, list) {
  const o = alx[k]; if (!o) return list; const rm = new Set(o.r || []); let L = list.filter(s => !rm.has(s.id));
  (o.a || []).forEach(id => { const s = byId.get(id); if (s && included(s.f) && !L.includes(s)) L.push(s); });
  const pins = (o.p || []).map(id => byId.get(id)).filter(Boolean); return pins.concat(L.filter(s => !pins.includes(s)));
}
function alxTouch(k, id, how) {
  const o = alx[k] || (alx[k] = { a: [], r: [], p: [] }), s = byId.get(id), un = (f, v) => { o[f] = (o[f] || []).filter(x => x !== v); };
  if (how === 'rm') { un('a', id); un('p', id); if (!o.r.includes(id)) o.r.push(id); if (s) catLearn(k, s, -1); }
  else if (how === 'add') { un('r', id); if (!o.a.includes(id)) o.a.push(id); if (s) catLearn(k, s, 1); }
  else if (how === 'pin') { if (o.p.includes(id)) un('p', id); else { o.p.unshift(id); un('r', id); } }
  alxSave();
}
function autoLists() {
  DOUBT = [];
  const sg = songs(), by = (pred, min = 1) => { const c = new Map(); plays.forEach(p => { if (pred(p)) c.set(p.id, (c.get(p.id) || 0) + 1); }); return [...c].filter(x => x[1] >= min && byId.has(x[0]) && included(byId.get(x[0]).f)).sort((x, y) => y[1] - x[1]).map(x => byId.get(x[0])); };
  const out = [], add = (k, name, desc, list, grp, lim = 40) => { if (FEEL.includes(k)) list = catAdjust(k, list, sg); list = applyOv(k, list); const o = alx[k]; const ed = !!(o && ((o.a || []).length || (o.r || []).length || (o.p || []).length)); if (list.length >= 3 || ed) out.push({ k, name, desc, list: list.slice(0, lim), grp, edited: ed }); };
  if (window.Taste && Taste.stage() >= 1) add('fyn', 'For you now', 'What you tend to enjoy at this time, learned from your listening', Taste.rank(sg.filter(s => included(s.f)), 40), 'Learned');
  add('morn', 'Mornings', 'What you play from 5 to 11', by(p => p.b === 'morning'), 'Time of day');
  add('aft', 'Afternoons', 'What you play from 11 to 4', by(p => p.b === 'afternoon'), 'Time of day');
  add('eve', 'Evenings', 'What you play from 4 to 9', by(p => p.b === 'evening'), 'Time of day');
  add('night', 'Late nights', 'What you play after 9', by(p => p.b !== 'morning' && p.b !== 'afternoon' && p.b !== 'evening'), 'Time of day');
  add('wkd', 'Weekdays', 'Monday to Friday', by(p => dayOf(p.t) === 'week'), 'Through the week');
  add('wke', 'Weekends', 'Saturday and Sunday', by(p => dayOf(p.t) === 'weekend'), 'Through the week');
  const mon = Date.now() - 30 * 864e5;
  add('rep', 'On repeat', 'Played most in the last month', by(p => p.t > mon, 2), 'From your listening');
  add('long', 'Long listens', 'Over 15 minutes, for talks and recitations', sg.filter(s => s.d > 15 * 6e4).sort((x, y) => y.d - x.d), 'From your listening');
  add('short', 'Short and sweet', 'Under 3 and a half minutes', sg.filter(s => s.d < 210000).sort((x, y) => x.d - y.d), 'From your listening');
  const lastP = new Map(); plays.forEach(p => { if (p.t > (lastP.get(p.id) || 0)) lastP.set(p.id, p.t); });
  const heardDJ = id => !!(djf[id] && (lastP.get(id) || 0) < djf[id].t);
  add('djf', 'Found by DJ', 'Songs the DJ played that you have not played yourself since', sg.filter(s => included(s.f) && heardDJ(s.id)).sort((x, y) => djf[y.id].t - djf[x.id].t), 'From your listening');
  const cold = Date.now() - 60 * 864e5, rank = s => heardDJ(s.id) ? 0 : lastP.has(s.id) ? 2 : 1;
  add('new0', 'Forgotten gems', 'Never played, or not played for two months. Songs the DJ played come first', sg.filter(s => included(s.f) && (!lastP.has(s.id) || lastP.get(s.id) < cold)).sort((x, y) => rank(x) - rank(y) || (rank(x) === 2 ? lastP.get(x.id) - lastP.get(y.id) : y.ad - x.ad)), 'From your listening');
  const en = sg.filter(s => energy[s.id] && energy[s.id].n >= 3).map(s => ({ s, e: energy[s.id].s / energy[s.id].n })).sort((x, y) => x.e - y.e);
  if (en.length >= 8) { const k = Math.max(3, Math.floor(en.length / 3)); add('calm', 'Calm', 'The quieter songs, learned as you listen', en.slice(0, k).map(x => x.s), 'By feel'); add('live', 'Lively', 'The livelier songs, learned as you listen', en.slice(-k).reverse().map(x => x.s), 'By feel');
    const lowE = new Set(en.slice(0, k).map(x => x.s.id)), nightP = new Set(plays.filter(p => p.b !== 'morning' && p.b !== 'afternoon' && p.b !== 'evening').map(p => p.id));
    [['calm', en.slice(Math.max(0, k - 1), k + 2)], ['live', en.slice(Math.max(0, en.length - k - 2), en.length - k + 1)]].forEach(([c, bs]) => bs.forEach(x => DOUBT.push({ k: c, id: x.s.id })));
    add('late', 'Late night', 'Quiet songs, with the ones you play after dark first', en.slice(0, k + 4).map(x => x.s).sort((p, q) => (nightP.has(q.id) ? 1 : 0) - (nightP.has(p.id) ? 1 : 0)), 'By feel');
    const mid = en.slice(Math.floor(en.length * .12), Math.floor(en.length * .5)).map(x => x.s).filter(s => s.d > 170000 || /ambient|classical|instrumental|piano|lo-?fi|study|focus|jazz/i.test(s.g || ''));
    add('focus', 'Focus', 'Steady, unhurried songs for work and study', mid, 'By feel'); }
  const asmrRe = /asmr|whisper|tingl|binaural|white noise|rain|nature|ocean|forest|sleep sound/i, tagged = s => asmrRe.test((s.g || '') + ' ' + (s.t || '') + ' ' + (s.al || '') + ' ' + (s.a || '') + ' ' + (s.fn || ''));
  const dbOnly = s => { const p = loudMap[s.id], e = energy[s.id]; return !!(p && p[0] < .2 && e && e.n >= 3 && e.s / e.n < .12); };
  const asmrL = sg.filter(s => included(s.f) && (tagged(s) || dbOnly(s)));
  asmrL.forEach(s => { if (!tagged(s)) DOUBT.push({ k: 'asmr', id: s.id }); });
  add('asmr', 'ASMR', 'Tag and title first, then how quiet and soft a song measures, then your own changes', asmrL, 'By feel');
  return out;
}
function forNow() {
  const b = band(), wk = dayOf(Date.now()), L = autoLists(), key = { morning: 'morn', afternoon: 'aft', evening: 'eve' }[b] || 'night';
  return L.find(x => x.k === key) || L.find(x => x.k === (wk === 'weekend' ? 'wke' : 'wkd')) || L.find(x => x.k === 'rep') || null;
}
const GREET = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Late night' };
const segHTML = () => `<div class="seg g" role="tablist" aria-label="Library sections"><i class="spill"></i>${SEGS.map(x => `<button type="button" role="tab" data-seg="${x[0]}" aria-selected="${libSeg === x[0]}">${x[1]}</button>`).join('')}</div>`;
let albSort = 'az', _am = null, _amLib = null;
function albumMap() { if (_am && _amLib === lib) return _am; const m = new Map(); songs().forEach(s => { const k = ((s.al || '').trim()) || folderName(s.f); (m.get(k) || m.set(k, []).get(k)).push(s); }); _am = m; _amLib = lib; return m; }
function albumList() {
  const by = { az: (x, y) => x[0].localeCompare(y[0], undefined, { sensitivity: 'base' }), recent: (x, y) => Math.max(...y[1].map(s => s.ad)) - Math.max(...x[1].map(s => s.ad)) || x[0].localeCompare(y[0]), artist: (x, y) => firstArtist(x[1][0]).localeCompare(firstArtist(y[1][0])) || x[0].localeCompare(y[0]), size: (x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]) };
  return [...albumMap()].sort(by[albSort]);
}
const albTile = ([name, L]) => { const a = [...new Set(L.map(firstArtist))]; const mc = albManual(name) ? albCover(name) : ''; return `<button class="atile" data-album="${esc(name)}" type="button">${mc ? `<div class="th" style="background:center/cover url('${mc}'),${CDBG}"></div>` : thHTML(L.find(x => x.hk) || L[0])}<div class="rt1">${esc(name)}</div><div class="rt2">${a.length === 1 ? esc(a[0]) + ' · ' : ''}${ns(L.length)}</div></button>`; };
const albumTile = f => { const L = folders.get(f); return `<button class="atile" data-folder="${esc(f)}" type="button"><div class="th" data-id="${L[0].id}" style="background:${CDBG}"></div><div class="rt1">${esc(folderName(f))}</div><div class="rt2">${ns(L.length)} · ${totalLen(L)}</div></button>`; };
const artistAvatar = (name, L) => { const ph = artPhoto(name); return ph ? `<div class="th av" style="background:center/cover url('${ph}'),${CDBG}"></div>` : thHTML(L[0]).replace('class="th"', 'class="th av"'); };
/* ---------- Library 0.10: hints, quiet learning, small charts ---------- */
const HINTS = {
  artists: ['Your most played artists, shown as faces.', 'It is the quickest way to reach one singer’s songs.', 'Tap a face to open their page.'],
  week: ['A picture of your last seven days of listening.', 'It shows when you listen, so Home can suggest the right music at the right time.', 'A taller bar means more songs that day. The ring shows the time of day.'],
  waiting: ['Songs you have not played for a while.', 'Old favourites are easy to forget.', 'Tap one to play it. The blurrier the cover, the longer it has waited.'],
  learn: ['The order of the shelves on Home.', 'The shelves you use most move up, so you scroll less.', 'There is nothing to set. It learns on this phone only.'],
  artup: ['Fetches a photo and a short introduction for each artist.', 'Faces make the library easier to scan.', 'Tap the button. Only the artist’s name is sent to Wikipedia, and only if you allow online lookups.'],
  when: ['The parts of the day when you play this music.', 'It shows the moments this music belongs to.', 'A longer bar means more plays in that part of the day.'],
  about: ['A short introduction to the artist.', 'To know who is singing.', 'It comes from Wikipedia and can sometimes match the wrong person. Tap Update to try again.'],
  alb: ['A few facts about this album, taken from your own listening.', 'To see how it fits into your day.', 'Tap Find details to add missing covers and names.']
};
const infBtn = k => `<button class="inf" data-inf="${k}" type="button" aria-label="What is this?" aria-expanded="false">i</button>`;
const tipHTML = k => { const h = HINTS[k]; return h ? `<div class="tipin tipbox" id="tp-${k}" hidden><b>What it is</b> ${h[0]}<br><b>Why use it</b> ${h[1]}<br><b>How</b> ${h[2]}</div>` : ''; };
const sech = (t, k, extra = '') => `<div class="sech"><h2>${t}</h2>${HINTS[k] ? infBtn(k) : ''}<span class="gap"></span>${extra}</div>${tipHTML(k)}`;
function toggleInf(btn) {
  const tp = document.getElementById('tp-' + btn.dataset.inf); if (!tp) return;
  const open = !tp.classList.contains('show'); btn.setAttribute('aria-expanded', open); btn.classList.toggle('on', open);
  if (open) { tp.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => tp.classList.add('show'))); }
  else { tp.classList.remove('show'); setTimeout(() => { if (!tp.classList.contains('show')) tp.hidden = true; }, 520); }
}
const useS = store.get('mp_use', {});
function bumpUse(k) { for (const x in useS) useS[x] *= .96; useS[k] = (useS[k] || 0) + 1; store.set('mp_use', useS); }
const BAND_N = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' }, BAND_C = { morning: '#f2c14e', afternoon: '#f08a4b', evening: '#8a63d2', night: '#3e5bb8' };
const fmtMin = ms => { const m = Math.round(ms / 6e4); return m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min'; };
const bandOf = p => p.b === 'night' || p.b === 'morning' || p.b === 'afternoon' || p.b === 'evening' ? p.b : 'night';
function weekStats() {
  const now = new Date(), d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(), days = Array(7).fill(0), bands = { morning: 0, afternoon: 0, evening: 0, night: 0 }; let ms = 0, n = 0;
  plays.forEach(p => { const t = new Date(p.t), k = Math.round((d0 - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 864e5); if (k >= 0 && k < 7) { days[6 - k]++; n++; bands[bandOf(p)]++; const s = byId.get(p.id); if (s) ms += Math.min(s.d || 0, 6e5); } });
  return { days, bands, n, ms, d0 };
}
const donut = (bands, size) => { const tot = Object.values(bands).reduce((a, b) => a + b, 0) || 1; let acc = 0; const st = Object.keys(bands).map(k => { const f = bands[k] / tot * 100, s = `${BAND_C[k]} ${acc}% ${acc + f}%`; acc += f; return s; }); return `<div class="dn" style="--s:${size}px;background:conic-gradient(${st.join(',')})"></div>`; };
function secWeek() {
  const w = weekStats(); if (w.n < 5) return '';
  const mx = Math.max(...w.days, 1), top = Object.keys(w.bands).sort((x, y) => w.bands[y] - w.bands[x])[0], tot = w.n, dn = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const bars = w.days.map((n, i) => `<div class="wb${i === 6 ? ' td' : ''}"><i style="--h:${n ? Math.max(6, Math.round(n / mx * 58)) : 3}px;--d:${i * 70}ms"></i><span>${dn[new Date(w.d0 - (6 - i) * 864e5).getDay()]}</span></div>`).join('');
  const leg = Object.keys(w.bands).map(k => `<div class="lg"><i style="background:${BAND_C[k]}"></i>${BAND_N[k]}<em>${Math.round(w.bands[k] / tot * 100)}%</em></div>`).join('');
  return `<div class="card g week" style="display:block">${sech('This week', 'week', '<button class="lnk sm" data-act="lis" data-us="week" type="button">More</button>')}<div class="wbars" aria-label="Songs played each day this week">${bars}</div><div class="wrow">${donut(w.bands, 78)}<div class="wl">${leg}</div></div><div class="sub" style="margin:10px 2px 0">${ns(w.n).replace('song', 'play')} · ${fmtMin(w.ms)}. Mostly in the ${BAND_N[top].toLowerCase()}.</div></div>`;
}
function secArtists() {
  const am = [...artistMap()].filter(x => x[0] !== 'Unknown artist').sort((x, y) => y[1].length - x[1].length).slice(0, 14); if (!am.length) return '';
  return `<div>${sech('Artists', 'artists', '<button class="lnk sm" data-seg="artists" type="button">See all</button>')}<div class="arow">${am.map(([n, l]) => `<button class="ac" data-artist="${esc(n)}" data-us="artists" type="button" aria-label="${esc(n)}">${artistAvatar(n, l)}<span>${esc(n)}</span></button>`).join('')}</div></div>`;
}
const secTiles = () => `<div class="tiles">${[['fav', '♥', 'Favourites', favs.size], ['new', '+', 'Added', ''], ['rec', '↺', 'Played', ''], ['mk', '◆', 'Bookmarks', marks.length]].map(x => `<button class="tile g" data-col="${x[0]}" data-us="tiles" type="button"><span class="ti">${x[1]}</span><span>${x[2]}</span><em>${x[3] === '' ? '' : x[3]}</em></button>`).join('')}</div>`;
const secWaiting = rc => rc.length > 1 ? `<div>${sech('Songs waiting for you', 'waiting')}<div class="shelf">${rc.map(x => `<button class="rcard g" data-rc="${x.s.id}" data-us="waiting" type="button" aria-label="${esc(x.s.t)}, not played for ${ageLabel(x.age)}"><div class="c th" data-id="${x.s.id}" style="background:${CDBG}"><i class="vl" style="--va:${Math.min(.4, x.age / 120)};--vb:${Math.min(7, 1 + x.age / 12)}px"></i></div><div class="t1">${esc(x.s.t)}</div><div class="t2">${ageLabel(x.age)}</div></button>`).join('')}</div></div>` : '';
function homeRest(rc) {
  const f = { artists: secArtists, week: secWeek, tiles: secTiles, waiting: () => secWaiting(rc) };
  const parts = ['artists', 'week', 'tiles', 'waiting'].sort((x, y) => (useS[y] || 0) - (useS[x] || 0)).map(k => f[k]());
  return `<div class="lstag">${parts.join('')}<div class="learn">Home arranges itself by what you use. ${infBtn('learn')}</div>${tipHTML('learn')}</div>`;
}
function listStats(L) {
  const ids = new Set(L.map(s => s.id)), cnt = new Map(), bands = { morning: 0, afternoon: 0, evening: 0, night: 0 }; let n = 0, last = 0;
  plays.forEach(p => { if (!ids.has(p.id)) return; n++; last = Math.max(last, p.t); cnt.set(p.id, (cnt.get(p.id) || 0) + 1); bands[bandOf(p)]++; });
  const top = [...cnt].sort((x, y) => y[1] - x[1])[0];
  return { n, last, top: top && byId.get(top[0]), topN: top ? top[1] : 0, bands };
}
const agoTxt = t => { if (!t) return '–'; const d = (Date.now() - t) / 864e5; return d < 1 ? 'Today' : d < 2 ? 'Yesterday' : ageLabel(d) + ' ago'; };
const blk = (big, small) => `<div class="blk g"><b>${big}</b><span>${small}</span></div>`;
function bandBars(st) {
  const tot = Object.values(st.bands).reduce((a, b) => a + b, 0), mx = Math.max(1, ...Object.values(st.bands));
  return `<div class="card g bb" style="display:block">${sech('When you listen', 'when')}${tot < 3 ? '<div class="sub">Play a few songs and this fills in.</div>' : Object.keys(st.bands).map((k, i) => `<div class="br"><span>${BAND_N[k]}</span><div class="tr"><i style="--w:${Math.round(st.bands[k] / mx * 100)}%;--d:${i * 90}ms;background:${BAND_C[k]}"></i></div><em>${st.bands[k]}</em></div>`).join('')}</div>`;
}
const playActs = `<div class="acts2 c2"><button class="pillbtn" data-act="playall" type="button">Play</button><button class="pillbtn ghost" data-act="shufall" type="button">Shuffle</button></div>`;
/* ---------- Your listening: a calm page of small charts ---------- */
Object.assign(HINTS, {
  lsnum: ['Your listening in numbers.', 'A gentle look at your habit, with no scores to chase.', 'Streak counts the days in a row with at least one song.'],
  lsdays: ['How much you played each day.', 'To see your busy days and quiet days.', 'Switch between a week and a month. The bright bar is today.'],
  lswk: ['Which weekdays you play the most.', 'So Home and your playlists can match your week.', 'A longer bar means more songs on that day.'],
  lsart: ['The artists you play the most.', 'A quick way to see your taste.', 'Tap a name to open that artist.'],
  lssong: ['Your most played songs.', 'Your favourites, found without searching.', 'Tap a song to play it.'],
  lstime: ['The parts of the day when you play music.', 'It shows when music is part of your day.', 'The ring is split by morning, afternoon, evening and night.'],
  lsnew: ['How much of your library you have heard.', 'To find music you own but never played.', 'Tap Play unheard to start with those.']
});
let lsRange = 'week';
function lisStats() {
  const now = new Date(), d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(), dayK = t => { const x = new Date(t); return Math.round((d0 - new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()) / 864e5); };
  const per = new Array(30).fill(0), wd = new Array(7).fill(0), bands = { morning: 0, afternoon: 0, evening: 0, night: 0 }, sc = new Map(), ac = new Map(), dset = new Set(); let ms = 0, n = 0;
  plays.forEach(p => { const k = dayK(p.t), s = byId.get(p.id); if (!s) return; n++; ms += Math.min(s.d || 0, 6e5); dset.add(k); sc.set(p.id, (sc.get(p.id) || 0) + 1); const a = firstArtist(s); ac.set(a, (ac.get(a) || 0) + 1); wd[(new Date(p.t).getDay() + 6) % 7]++; bands[bandOf(p)]++; if (k >= 0 && k < 30) per[29 - k]++; });
  let streak = 0, k = dset.has(0) ? 0 : 1; while (dset.has(k)) { streak++; k++; }
  return { n, ms, per, wd, bands, d0, streak, days: dset.size, songs: sc, artists: ac, heard: sc.size };
}
function lsChart(w) {
  const m = lsRange === 'month', arr = m ? w.per : w.per.slice(23), mx = Math.max(...arr, 1), dn = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return `<div class="wbars${m ? ' mon' : ''}" aria-label="Songs played each day">${arr.map((n, i) => { const back = arr.length - 1 - i, d = new Date(w.d0 - back * 864e5); return `<div class="wb${back === 0 ? ' td' : ''}"><i style="--h:${n ? Math.max(6, Math.round(n / mx * 70)) : 3}px;--d:${i * (m ? 18 : 70)}ms"></i>${m ? (back % 7 === 0 ? `<span>${d.getDate()}</span>` : '<span></span>') : `<span>${dn[d.getDay()]}</span>`}</div>`; }).join('')}</div>`;
}
function listenPage() {
  const w = lisStats(); if (w.n < 3) { page('Your listening', '<div class="empty">Play a few songs and this page fills in with your habits.</div>'); return; }
  const ta = [...w.artists].sort((x, y) => y[1] - x[1]).slice(0, 5), ts = [...w.songs].sort((x, y) => y[1] - x[1]).slice(0, 5), tot = songs().length, pct = Math.round(w.heard / Math.max(tot, 1) * 100), mxa = ta[0][1];
  const wk = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], mxw = Math.max(...w.wd, 1), top = Object.keys(w.bands).sort((x, y) => w.bands[y] - w.bands[x])[0], tb = Object.values(w.bands).reduce((a, b) => a + b, 0) || 1;
  const leg = Object.keys(w.bands).map(k => `<div class="lg"><i style="background:${BAND_C[k]}"></i>${BAND_N[k]}<em>${Math.round(w.bands[k] / tb * 100)}%</em></div>`).join('');
  page('Your listening', `<div class="sub">${w.days} ${w.days === 1 ? 'day' : 'days'} of music, kept on this phone</div>` +
    `<div class="card g" style="display:block">${sech('In numbers', 'lsnum')}<div class="blks"><div class="blk"><b>${w.n}</b><span>plays</span></div><div class="blk"><b>${fmtMin(w.ms)}</b><span>listened</span></div><div class="blk"><b>${w.streak}</b><span>${w.streak === 1 ? 'day streak' : 'day streak'}</span></div></div></div>` +
    `<div class="card g" style="display:block;margin-top:12px">${sech('Day by day', 'lsdays', `<div class="chipsr" style="padding:0;gap:6px">${[['week', 'Week'], ['month', 'Month']].map(x => `<button class="chp sm${lsRange === x[0] ? ' on' : ''}" data-lsr="${x[0]}" type="button" aria-pressed="${lsRange === x[0]}">${x[1]}</button>`).join('')}</div>`)}<div id="lschart">${lsChart(w)}</div></div>` +
    `<div class="card g" style="display:block;margin-top:12px">${sech('Time of day', 'lstime')}<div class="wrow">${donut(w.bands, 96)}<div class="wl" style="grid-template-columns:1fr">${leg}</div></div><div class="sub" style="margin:10px 2px 0">Most of your listening is in the ${BAND_N[top].toLowerCase()}.</div></div>` +
    `<div class="card g" style="display:block;margin-top:12px">${sech('Your week', 'lswk')}${wk.map((d, i) => `<div class="br"><span>${d}</span><div class="tr"><i style="--w:${Math.round(w.wd[i] / mxw * 100)}%;--d:${i * 70}ms;background:linear-gradient(90deg,var(--acc1),var(--acc2))"></i></div><em>${w.wd[i]}</em></div>`).join('')}</div>` +
    `<div class="card g" style="display:block;margin-top:12px">${sech('Top artists', 'lsart')}${ta.map(([n, c]) => `<button class="br tap" data-artist="${esc(n)}" type="button"><span class="nm">${esc(n)}</span><div class="tr"><i style="--w:${Math.round(c / mxa * 100)}%;--d:0ms;background:linear-gradient(90deg,var(--acc1),var(--acc2))"></i></div><em>${c}</em></button>`).join('')}</div>` +
    sech('Top songs', 'lssong') + `<div class="list g">${ts.map(([id, c]) => { const s = byId.get(id); return `<button class="row" data-rc="${id}" type="button">${thHTML(s)}<div class="tx"><div class="rt1">${esc(s.t)}</div><div class="rt2">${esc(sub(s))}</div></div><em class="cn">${c}×</em></button>`; }).join('')}</div>` +
    `<div class="card g" style="display:flex;margin-top:12px;gap:16px;align-items:center"><div class="ringw"><div class="dn" style="--s:84px;background:conic-gradient(var(--acc1) ${pct}%,color-mix(in srgb,var(--fg) 10%,transparent) 0)"></div><b class="dnc">${pct}%</b></div><div style="flex:1;min-width:0">${sech('Heard so far', 'lsnew')}<div class="sub" style="margin:0 0 8px">${w.heard} of ${tot} songs</div>${tot > w.heard ? '<button class="pillbtn sm" data-ap="new0" type="button">Play unheard</button>' : '<div class="sub">You have heard everything.</div>'}</div></div>`,
    bx => { bx._ls = w; });
}
function artistPage(name) {
  const L = (artistMap().get(name) || []).slice().sort((x, y) => x.t.localeCompare(y.t)), i = Object.assign({}, artInfo[name] || {}, { photo: artPhoto(name) });
  const am = albumMap(), fl = [...new Set(L.map(s => ((s.al || '').trim()) || folderName(s.f)))].map(n => [n, am.get(n)]), st = listStats(L);
  const hero = `<div class="ahero${i.photo ? '' : ' col'}"${i.photo ? ` style="background-image:url('${i.photo}')" role="img" aria-label="${esc(name)}"` : ''}>${i.photo ? '' : L.slice(0, 4).map(s => `<div class="th" data-id="${s.id}" data-sz="512"></div>`).join('')}<div class="ah-t"><h1>${esc(name)}</h1><div>${ns(L.length)} · ${totalLen(L)}</div></div></div>`;
  const about = i.bio ? `<div class="card g about" style="display:block">${sech('About', 'about', '<button class="lnk sm" data-act="edart" data-n="' + esc(name) + '" type="button">Edit</button><button class="lnk sm" data-act="artinfo" data-n="' + esc(name) + '" type="button">Update</button>')}<div class="bio clamp" id="bio">${esc(i.bio)}</div><button class="lnk sm" data-act="biomore" type="button">Read more</button><div class="hint" style="padding:6px 0 0">${(artInfo[name].src || {}).bio === 'You' ? 'Written by you' : ((artInfo[name].src || {}).bio === 'Summary' ? 'Short summary from open data. A fuller text replaces it when found' : 'From ' + esc((artInfo[name].src || {}).bio || 'Wikipedia'))}</div></div>`
    : `<div class="card g about" style="display:block">${sech('About', 'about')}<div class="sub" style="margin-bottom:10px">${i.photo ? 'No introduction yet.' : 'No photo or introduction yet.'}</div><div class="acts2"><button class="pillbtn sm" data-act="artinfo" data-n="${esc(name)}" type="button">Find it</button><button class="pillbtn sm ghost" data-act="edart" data-n="${esc(name)}" type="button">Write it myself</button>${i.photo || artPhoto(name) ? '' : `<button class="pillbtn sm ghost" data-act="pickpic" data-k="artist" data-n="${esc(name)}" type="button">Choose a picture</button>`}</div></div>`;
  page(name, hero + playActs + `<div class="blks">${blk(st.n, st.n === 1 ? 'play' : 'plays')}${blk(fl.length, fl.length === 1 ? 'album' : 'albums')}${blk(agoTxt(st.last), 'last played')}</div>` + (st.top ? `<div class="topline">Most played: <b>${esc(st.top.t)}</b> · ${st.topN} ${st.topN === 1 ? 'time' : 'times'}</div>` : '') + about + bandBars(st) +
    (fl.length > 1 ? `<h2>Albums</h2><div class="agrid">${fl.map(albTile).join('')}</div>` : '') + `<h2>Songs</h2><div class="list g" id="plist2">${L.slice(0, 200).map((s, k) => rowHTML(s, k)).join('')}</div>`, bx => { bx._list = L; bx._shown = 200; }, true);
}
function albumPage(n) {
  const L = (albumMap().get(n) || []).slice(), cov = L.find(x => x.hk) || L[0], a = [...new Set(L.map(firstArtist))], st = listStats(L);
  const top = Object.keys(st.bands).sort((x, y) => st.bands[y] - st.bands[x])[0], ai = a.length === 1 && artInfo[a[0]] && artInfo[a[0]].bio ? artInfo[a[0]].bio.split(/(?<=[.!?])\s/)[0] : '';
  const ai2 = albInfo[n] || {}, mc = albManual(n) ? albCover(n) : '', hero = `<div class="alb-h">${mc ? `<div class="th hdc" style="background:center/cover url('${mc}'),${CDBG}"></div>` : `<div class="th hdc" data-id="${cov.id}" data-sz="1024" style="background:${CDBG}"></div>`}<h1>${esc(n)}</h1><div class="sub">${a.length === 1 ? esc(a[0]) + ' · ' : ''}${yrSpan(L)}${ns(L.length)} · ${totalLen(L)}</div></div>`;
  const info = `<div class="card g about" style="display:block">${sech('About this album', 'alb', '<button class="lnk sm" data-act="edalb" data-n="' + esc(n) + '" type="button">Edit</button><button class="lnk sm" data-act="findfolder" type="button">Find details</button>')}${mc || ai2.curl || ai2.cover || L.some(x => x.hk) ? '' : `<div class="acts2" style="margin-bottom:10px"><button class="pillbtn sm" data-act="pickpic" data-k="album" data-n="${esc(n)}" type="button">Choose a cover</button></div>`}${ai2.note ? `<div class="bio" style="margin-bottom:8px">${esc(ai2.note)}</div><div class="hint" style="padding:0 0 8px">Written by you</div>` : ''}${ai2.yr || ai2.g ? `<div class="facts">${[ai2.yr ? 'Released ' + esc(ai2.yr) : '', ai2.g ? esc(ai2.g) : '', ai2.n ? ai2.n + ' tracks' : ''].filter(Boolean).join(' · ')}<span> · ${esc((ai2.src || {}).facts || 'iTunes')}</span></div>` : ''}<div class="bio">${L.length === 1 ? 'A single song' : 'An album of ' + L.length + ' songs'}${a.length === 1 ? ' by ' + esc(a[0]) : ' by ' + a.length + ' artists'}, ${totalLen(L)} long.${st.n > 2 ? ' You play it most in the ' + BAND_N[top].toLowerCase() + '.' : ''}</div>${ai ? `<div class="bio" style="margin-top:8px">${esc(ai)}</div><div class="hint" style="padding:6px 0 0">About ${esc(a[0])}, from Wikipedia</div>` : ''}</div>`;
  page(n, hero + playActs + `<div class="blks">${blk(st.n, st.n === 1 ? 'play' : 'plays')}${blk(L.length, L.length === 1 ? 'song' : 'songs')}${blk(agoTxt(st.last), 'last played')}</div>` + (st.top ? `<div class="topline">Most played: <b>${esc(st.top.t)}</b> · ${st.topN} ${st.topN === 1 ? 'time' : 'times'}</div>` : '') + info + `<h2>Songs</h2><div class="list g" id="plist2">${L.slice(0, 400).map((s, k) => rowHTML(s, k)).join('')}</div>`, bx => { bx._list = L; bx._shown = 400; }, true);
}
function renderLib() {
  const box = $('#libbox');
  if (!A.hasPerm()) { box.innerHTML = `<h1>Library</h1><div class="card g" style="margin-top:20px"><div><div class="rt1" style="font-size:18px">Allow music access</div><div class="sub" style="margin:6px 0 14px">This lets the app find the songs on your phone.</div><button class="pillbtn" data-act="perm" type="button">Allow</button></div></div>`; return; }
  const sg = songs();
  const head = `<div class="hd"><div><h1>Library</h1><div class="sub">${ns(sg.length)}${A.web ? ' in this app' : ''}</div></div>${A.web ? `<button class="addb g" data-act="addsongs" type="button" aria-label="Add songs">${ADDSVG()}</button>` : ''}</div>`;
  if (!sg.length) { box.innerHTML = head + `<div class="card g" style="margin-top:22px"><div><div class="rt1" style="font-size:18px">Add your songs</div><div class="sub" style="margin:6px 0 14px">Pick music from your phone. The app keeps its own copy. Your originals are not touched.</div><button class="pillbtn" data-act="addsongs" type="button">Add songs</button></div></div>`; return; }
  const c = cur(); let body = '', wire = null;
  if (libSeg === 'home') {
    const rc = rediscover(), fn = forNow(), left = c ? Math.max(0, (st.dur || c.d) - st.pos) : 0, m = (S.suggest && Date.now() > snooze) ? missing() : [];
    body = (c ? `<button class="card g cont" data-act="resume" type="button"><div class="th" data-id="${c.id}" style="background:${CDBG}">${PLAYSVG}</div><div class="tx" style="flex:1;min-width:0"><div class="lab">Continue</div><div class="rt1">${esc(c.t)}</div><div class="rt2">${esc(sub(c))} · ${fmt(left)} left</div><div class="mbar"><b style="width:${(st.dur || c.d) ? Math.min(100, st.pos / (st.dur || c.d) * 100) : 0}%"></b></div></div></button>` : '') +
      (fn ? `<button class="card g now" data-ap="${fn.k}" type="button"><div class="stk">${fn.list.slice(0, 3).map(thHTML).join('')}</div><div class="tx" style="flex:1;min-width:0"><div class="lab">${GREET[band()]}</div><div class="rt1">${esc(fn.name)}</div><div class="rt2">${fn.desc} · ${ns(fn.list.length)}</div></div></button>` : '') +
      (m.length ? `<div class="card g sug"><div class="stk">${m.slice(0, 3).map(thHTML).join('')}</div><div class="tx" style="flex:1;min-width:0"><div class="rt1">${m.length} ${m.length === 1 ? 'song has' : 'songs have'} no cover</div><div class="rt2"><button class="lnk sm" data-act="finddo" type="button">Find them</button> <button class="lnk sm" data-act="snooze" type="button">Not now</button></div></div></div>` : '') +
      homeRest(rc);
  } else if (libSeg === 'songs') {
    body = `<div class="search g"><input id="q2" type="search" placeholder="Search songs, artists, albums, moods" autocomplete="off" enterkeyhint="search" aria-label="Search songs"></div><div class="sgrow"><div class="acts2"><button class="pillbtn sm" data-act="playall" type="button">Play all</button><button class="pillbtn sm ghost" data-act="shufall" type="button">Shuffle</button></div><span class="cnt" id="scnt"></span></div><div class="chipsr" role="group" aria-label="Sort songs">${SORTS.map(x => `<button class="chp${x[0] === ssort() ? ' on' : ''}" data-sort="${x[0]}" type="button" aria-pressed="${x[0] === ssort()}">${x[1]}</button>`).join('')}</div><div class="list g" id="plist2"></div><div class="centre"><button class="lnk" data-act="more400" type="button" id="more2">Show more</button></div>`;
    wire = bx => {
      const all = songs().slice().sort((x, y) => x.t.localeCompare(y.t)); bx._all = all; bx._shown = 120; bx._sort = ssort(); bx._q = ''; bx._list = all.slice(); sortList(bx._list, bx._sort);
      const paint = () => {
        const p = $('#plist2', bx), sl = bx._list.slice(0, bx._shown); let h = '', lt = '';
        sl.forEach((s, i) => { if (bx._sort === 'az') { const c = (s.t[0] || '#').toUpperCase(), k = /\p{L}/u.test(c) ? c : '#'; if (k !== lt) { lt = k; h += `<div class="ltr">${k}</div>`; } } h += rowHTML(s, i); });
        if (bx._q) { const u = uniSearch(bx._q, bx._list); p.innerHTML = u.html || '<div class="empty">Nothing found.</div>'; bx._list = u.songs; thumbs(p); const mo2 = $('#more2', bx); if (mo2) mo2.hidden = true; const c2 = $('#scnt', bx); if (c2) c2.textContent = u.n + ' found'; return; }
        p.innerHTML = sl.length ? h : '<div class="empty">Nothing found.</div>'; thumbs(p);
        const mo = $('#more2', bx); if (mo) mo.hidden = bx._shown >= bx._list.length;
        const c = $('#scnt', bx); if (c) c.textContent = bx._q ? bx._list.length + ' found' : ns(all.length);
      };
      bx._paint = paint; paint(); let t0;
      $('#q2', bx).addEventListener('input', e => { clearTimeout(t0); t0 = setTimeout(() => { const q = e.target.value.trim().toLowerCase(); bx._q = q; bx._list = (q ? all.filter(s => (s.t + ' ' + s.a + ' ' + (s.al || '') + ' ' + folderName(s.f) + ' ' + (s.g || '')).toLowerCase().includes(q)) : all).slice(); sortList(bx._list, bx._sort); bx._shown = 120; paint(); }, 140); });
    };
  } else if (libSeg === 'albums') {
    body = `<div class="chipsr" role="group" aria-label="Sort albums">${[['az', 'A to Z'], ['recent', 'Recent'], ['artist', 'Artist'], ['size', 'Size']].map(x => `<button class="chp${albSort === x[0] ? ' on' : ''}" data-asort="${x[0]}" type="button" aria-pressed="${albSort === x[0]}">${x[1]}</button>`).join('')}</div><div class="agrid">${albumList().map(albTile).join('')}</div>`;
  } else if (libSeg === 'artists') {
    const am = [...artistMap()].sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0])), upd = store.get('mp_artup', 0), nph = am.filter(x => artPhoto(x[0])).length;
    body = `<div class="agrid3">${am.map(([n, l]) => `<button class="aav" data-artist="${esc(n)}" data-us="artists" type="button">${artistAvatar(n, l)}<span class="an">${esc(n)}</span><span class="ac2">${ns(l.length)}</span></button>`).join('')}</div>` +
      `<div class="card g" style="margin-top:18px;display:block">${sech('Photos and introductions', 'artup')}<div class="sub" style="margin:0 0 6px">${nph} of ${am.length} artists have a photo${upd ? ' · checked ' + (Date.now() - upd < 36e5 ? 'just now' : ageLabel((Date.now() - upd) / 864e5) + ' ago') : ''}</div><div class="sub" style="margin:0 0 10px;font-size:13px">${!S.net ? 'Allow online lookups and the Library fills these in by itself.' : S.fresh !== false ? 'The Library keeps these fresh in the background.' : 'Automatic updates are off in Settings.'} To add one by hand, open an artist and tap Edit.</div><button class="pillbtn sm" data-act="updart" type="button">${!S.net ? 'Allow and find photos' : 'Update now'}</button></div>`;
  } else {
    const L = autoLists(), grps = [...new Set(L.map(x => x.grp))];
    body = smartHTML() + ulHTML() + `<div class="list g">${[['fav', '♥', 'Favourites', favs.size + ' saved'], ['rec', '↺', 'Recently played', 'Your latest listening'], ['new', '+', 'Recently added', 'Newest first'], ['mk', '◆', 'Bookmarks', marks.length + ' saved']].map(x => `<button class="row" data-col="${x[0]}" type="button"><div class="th ic2">${x[1]}</div><div class="tx"><div class="rt1">${x[2]}</div><div class="rt2">${x[3]}</div></div></button>`).join('')}</div>` +
      grps.map(g => `<h2>${g}</h2><div class="list g">${L.filter(x => x.grp === g).map(x => `<button class="row" data-ap="${x.k}" type="button"><div class="stk">${x.list.slice(0, 2).map(thHTML).join('')}</div><div class="tx"><div class="rt1">${esc(x.name)}</div><div class="rt2">${x.desc} · ${ns(x.list.length)}</div></div></button>`).join('')}</div>`).join('') +
      (L.length ? '' : '<div class="empty">Playlists appear here as you listen: mornings, evenings, weekends and more.</div>');
  }
  box.innerHTML = head + segHTML() + body;
  const bs = $$('.seg button', box); segGo = M.pill($('.seg', box), $('.spill', box), bs, SEGS.findIndex(x => x[0] === libSeg), 3);
  thumbs(box); box.scrollTop = 0; if (wire) wire(box);
  box.classList.remove('lin'); void box.offsetWidth; box.classList.add('lin');
  if (libSeg === 'artists') autoArtists();
}
/* artist details: a short introduction and a photo from Wikipedia, now and then */
/* ---------- a Library that keeps itself fresh: photos, introductions and covers, never over your own edits ---------- */
let albInfo = store.get('mp_album', {});
const albKey = s => ((s.al || '').trim()) || folderName(s.f);
const artPhoto = n => { const i = artInfo[n]; if (!i) return ''; return (i.man && i.man.photo) ? (i.photo || '') : ((A.img && A.img('ar:' + n)) || i.photo || ''); };
const albCover = n => { const i = albInfo[n]; if (!i) return ''; return (i.man && i.man.cover) ? (i.cover || '') : ((A.img && A.img('al:' + n)) || i.curl || ''); };
const albManual = n => !!(albInfo[n] && albInfo[n].man && albInfo[n].man.cover);
const backoff = [0, 1, 3, 7, 30];
const dueArt = (n, force) => { const i = artInfo[n]; if (!i) return true; const m = i.man || {}, have = (i.bio || m.bio) && (i.photo || m.photo), age = (Date.now() - (i.at || 0)) / 864e5; if (m.bio && m.photo) return false; if (have) return !force && age > 60; return force || age >= backoff[Math.min(i.try || 0, 4)]; };
const albNeeds = (n, L) => { const i = albInfo[n] || {}, m = i.man || {}, art = L.some(x => x.hk) || i.cover || i.curl; return { cover: !m.cover && !art, facts: !(i.yr || i.g) }; };
const dueAlb = (n, L, force) => { const w = albNeeds(n, L); if (!w.cover && !w.facts) { const i = albInfo[n]; return false; } const i = albInfo[n]; if (!i) return true; return force || (Date.now() - (i.at || 0)) / 864e5 >= backoff[Math.min(i.try || 0, 4)]; };
let syncBusy = false, liveT = 0, syncMsg = store.get('mp_syncmsg', '');
const pause = ms => new Promise(r => setTimeout(r, ms));
async function syncLib(force, only) {
  if (syncBusy || !navigator.onLine) return; if (!S.net) { if (force) toast('Allow online lookups in Settings first'); return; }
  const am = artistMap(), names = [...am.keys()].filter(n => n !== 'Unknown artist' && (!only || only.includes(n)));
  const albs = only ? [] : [...albumMap()];
  if (!only) Object.keys(artInfo).forEach(k => { if (!am.has(k) && !(artInfo[k].man && (artInfo[k].man.bio || artInfo[k].man.photo))) delete artInfo[k]; });
  const jobsA = names.filter(n => only || dueArt(n, force)).sort((x, y) => (artInfo[x] ? 1 : 0) - (artInfo[y] ? 1 : 0) || am.get(y).length - am.get(x).length);
  const jobsB = albs.filter(([n, L]) => dueAlb(n, L, force)).sort((x, y) => y[1].length - x[1].length);
  const total = jobsA.length + jobsB.length; if (!total) { if (force) toast('Everything is up to date'); store.set('mp_artup', Date.now()); return; }
  syncBusy = true; let k = 0, gotA = 0, gotB = 0, miss = 0, off = false;
  try {
    for (const n of jobsA) {
      const i = artInfo[n] || (artInfo[n] = { bio: '', photo: '', src: {}, man: {}, at: 0, try: 0 }); i.man = i.man || {}; i.src = i.src || {};
      const need = { bio: !i.man.bio && (!i.bio || i.src.bio === 'Summary'), photo: !i.man.photo && !i.photo };
      if (!need.bio && !need.photo) { const stale = !i.man.bio || !i.man.photo; if (stale && (Date.now() - (i.at || 0)) / 864e5 > 60) { need.bio = !i.man.bio; need.photo = !i.man.photo; } else { k++; continue; } }
      try {
        const r = await Net.artist(n, need); let got = false;
        if (need.bio && r.bio) { i.bio = r.bio; i.src.bio = r.src.bio; got = true; }
        if (need.photo && r.photo) { i.photo = r.photo; i.src.photo = r.src.photo; got = true; const d = await Net.photoData(r.photo); if (d && A.imgPut) await A.imgPut('ar:' + n, d); }
        if (!i.bio && !i.man.bio) { try { const t = await Net.summary(n, 'artist'); if (t) { i.bio = t; i.src.bio = 'Summary'; got = true; } } catch (e) {} }
        i.at = Date.now(); i.try = ((i.bio && i.src.bio !== 'Summary') || i.man.bio) && (i.photo || i.man.photo) ? 0 : (i.try || 0) + 1; if (got) gotA++; else miss++;
      } catch (e) { if (/offline/.test(e.message)) { off = true; break; } i.at = Date.now(); i.try = (i.try || 0) + 1; miss++; }
      k++; if (k % 4 === 0) store.set('mp_artist', artInfo); if (force && k % 8 === 0) toast('Updating… ' + k + ' of ' + total);
      await pause(900);
    }
    if (!off) for (const [n, L] of jobsB) {
      const i = albInfo[n] || (albInfo[n] = { cover: '', curl: '', yr: '', g: '', n: 0, src: {}, man: {}, at: 0, try: 0 }); i.man = i.man || {}; i.src = i.src || {};
      const w = albNeeds(n, L);
      try {
        const r = await Net.album(n, firstArtist(L[0]) === 'Unknown artist' ? '' : firstArtist(L[0])); let got = false;
        if (w.cover && r.cover) { i.curl = r.cover; i.src.cover = r.src.cover; got = true; const d = await Net.photoData(r.cover); if (d && A.imgPut) await A.imgPut('al:' + n, d); }
        if (w.facts && (r.yr || r.g)) { i.yr = r.yr; i.g = r.g; i.n = r.n; i.src.facts = r.src.cover || 'MusicBrainz'; got = true; }
        i.at = Date.now(); const w2 = albNeeds(n, L); i.try = !w2.cover && !w2.facts ? 0 : (i.try || 0) + 1; if (got) gotB++; else miss++;
      } catch (e) { if (/offline/.test(e.message)) { off = true; break; } i.at = Date.now(); i.try = (i.try || 0) + 1; miss++; }
      k++; if (k % 4 === 0) { store.set('mp_artist', artInfo); store.set('mp_album', albInfo); } if (force && k % 8 === 0) toast('Updating… ' + k + ' of ' + total);
      await pause(900);
    }
  } finally {
    syncBusy = false; store.set('mp_artist', artInfo); store.set('mp_album', albInfo);
    if (!off) { store.set('mp_artup', Date.now()); syncMsg = `${gotA + gotB} updated, ${miss} not found`; store.set('mp_syncmsg', syncMsg); }
    artCache.clear();
    if (force) toast(off ? 'No connection. I will try again later.' : `${gotA} artists and ${gotB} albums updated${miss ? ', ' + miss + ' not found' : ''}`);
    if (tab === 'lib' && !document.querySelector('#bms.open,#eds.open,#pks.open')) { const bx = $('#libbox'); $$('.th[data-id]', bx).forEach(el => { const s = byId.get(el.dataset.id); if (s) paintThumb(el, s); }); if (!stack.length && bx.scrollTop < 8 && libSeg !== 'songs') renderLib(); }
  }
}
/* song details in the background: year, album, genre, track number and cover, only when the match is confident and only where a slot is empty.
   Edits you made are never touched (setMeta with "auto" skips them), and each song is tried at most once a week. */
let sdBusy = false, sdet = store.get('mp_sdet', {});
async function syncSongs(force) {
  if (sdBusy || !navigator.onLine || !S.net || !window.Net) return;
  const wk = 7 * 864e5, list = songs().filter(s => !s.hk && (!s.y || !s.al || !s.g || !A.art(s.id)) && (force || !sdet[s.id] || Date.now() - sdet[s.id] > wk)).slice(0, force ? 40 : 10);
  if (!list.length) return; sdBusy = true; let got = 0;
  try {
    const one = async s => {
      let r = null; try { r = await Net.find({ t: s.t, a: s.a, d: s.d, y: s.y, ys: s.ys }); } catch (e) { if (/offline/.test(e.message)) return 'off'; }
      sdet[s.id] = Date.now();
      if (r && r.conf >= .75) {
        const p = {};
        if (r.yr && (!s.y || s.ys === 'name') && r.yc >= .45) { p.y = +r.yr; p.ys = 'online'; p.yc = r.yc; p.yv = r.yv; }
        if (r.al && !s.al) p.al = r.al; if (r.g && !s.g) p.g = r.g; if (r.n && !s.n) p.n = r.n; if (r.art && !A.art(s.id)) p.art = r.art;
        if (Object.keys(p).length && await A.setMeta(s.id, p, 'auto')) got++;
      }
    };
    /* Optimisation on: bursts of 4 songs back to back (MusicBrainz still gets its one request a second), then the radio rests until the next song starts; off: a 0.9 s pause after every song, as in 0.30 */
    for (let k = 0; k < list.length; k++) {
      if (document.hidden && !force) break;
      if (await one(list[k]) === 'off') break;
      if (!S.opt) { await pause(900); continue; }
      if ((k + 1) % 4) continue;
      if (force || !st.playing) { await pause(3000); continue; }   /* playing: the radio rests until the next song starts */
      await new Promise(res => { const f = () => { removeEventListener('mp-track', f); res(); }; addEventListener('mp-track', f); setTimeout(f, 15 * 6e4); });
    }
  } finally { sdBusy = false; store.set('mp_sdet', sdet); if (got) { refreshLib(); if (tab === 'lib' && !stack.length) renderLib(); } }
}
function liveKick(ms) { clearTimeout(liveT); liveT = setTimeout(() => { const go = () => { if (S.net && S.fresh !== false && !document.hidden) Promise.resolve(syncLib(false)).then(() => syncSongs(false)); }; if (S.opt && window.requestIdleCallback) requestIdleCallback(go, { timeout: 8000 }); else go(); }, ms || 4000); }
const freshDue = () => Date.now() - store.get('mp_artup', 0) > 6 * 36e5;
addEventListener('online', () => liveKick(3000));
document.addEventListener('visibilitychange', () => { if (!document.hidden && freshDue()) liveKick(2500); });
setInterval(() => { if (!document.hidden && freshDue()) liveKick(300); }, 30 * 6e4);
setTimeout(() => liveKick(0), 7000);

/* ---------- edit by hand: photo, introduction, cover, note. Your edits always win over automatic updates ---------- */
let edKind = '', edName = '', edPic = '', edReset = false;
$('#app').insertAdjacentHTML('beforeend', `<div class="bmbg" id="edbg"></div><div class="bms g" id="eds" role="dialog" aria-label="Edit" aria-hidden="true"><div class="bms-h"><div class="bms-t"><b id="edt">Edit</b><span id="eds2"></span></div><button class="x" id="edx" type="button" aria-label="Close">×</button></div><div class="edpic"><div class="th av" id="edpv"></div><div class="edbtns"><button class="pillbtn sm" id="edpick" type="button">Choose photo</button><button class="lnk sm" id="edpno" type="button">Use automatic</button></div></div><textarea id="edn" rows="5" maxlength="900" aria-label="Text"></textarea><div class="sub" id="edhint" style="margin:-4px 2px 0"></div><button class="pillbtn" id="edsave" type="button">Save</button><div class="centre"><button class="lnk sm" id="edauto" type="button">Back to automatic</button></div></div>`);
const edFile = document.createElement('input'); edFile.type = 'file'; edFile.accept = 'image/*'; edFile.hidden = true; $('#app').appendChild(edFile);
function edPaint() {
  const pv = $('#edpv'), cur = edReset ? '' : (edPic || (edKind === 'artist' ? artPhoto(edName) : albCover(edName)));
  pv.style.background = cur ? `center/cover url('${cur}'),${CDBG}` : CDBG; pv.style.borderRadius = edKind === 'artist' ? '50%' : '16px';
}
function edOpen(kind, name) {
  edKind = kind; edName = name; edPic = ''; edReset = false; tick();
  const a = artInfo[name] || {}, b = albInfo[name] || {}, m = (kind === 'artist' ? a.man : b.man) || {};
  $('#edt').textContent = kind === 'artist' ? 'Edit artist' : 'Edit album'; $('#eds2').textContent = name;
  $('#edn').value = kind === 'artist' ? (a.bio || '') : (b.note || ''); $('#edn').placeholder = kind === 'artist' ? 'Write a short introduction' : 'Write a short note about this album';
  $('#edhint').textContent = 'What you save here is kept. Automatic updates never replace it.';
  $('#edauto').hidden = !(m.bio || m.photo || m.cover || m.note);
  edPaint(); $('#eds').classList.add('open'); $('#edbg').classList.add('open'); $('#eds').setAttribute('aria-hidden', 'false'); if (window.MOrb) MOrb.refresh();
}
function edClose() { $('#eds').classList.remove('open'); $('#edbg').classList.remove('open'); $('#eds').setAttribute('aria-hidden', 'true'); document.activeElement && document.activeElement.blur && document.activeElement.blur(); setTimeout(() => window.MOrb && MOrb.refresh(), 200); }
$('#edx').addEventListener('click', () => { tick(); edClose(); }); $('#edbg').addEventListener('click', edClose);
const edChoose = () => { const ar = edKind === 'album' ? (((albumMap().get(edName) || [])[0]) ? firstArtist(albumMap().get(edName)[0]) : '') : ''; pkOpen(edKind, edName, ar === 'Unknown artist' ? '' : ar, d => { edPic = d; edReset = false; edPaint(); }); };
$('#edpick').addEventListener('click', edChoose); $('#edpv').addEventListener('click', edChoose); $('#edpv').style.cursor = 'pointer';
edFile.addEventListener('change', async () => { const f = edFile.files && edFile.files[0]; if (!f) return; try { const d = await A.thumb(f, 640); if (d) { edPic = d; edReset = false; edPaint(); } else toast('That picture could not be read'); } catch (e) { toast('That picture could not be read'); } });
$('#edpno').addEventListener('click', () => { tick(); edPic = ''; edReset = true; edPaint(); });
const redraw = () => { artCache.clear(); const n = edName; if (tab === 'lib') { if (stack.length) { const f = edKind === 'artist' ? artistPage : albumPage; stack.pop(); f(n); } else renderLib(); } };

/* ---------- picture chooser: nine suggestions per page, or a picture from the phone ---------- */
let pkKind = '', pkName = '', pkArtist = '', pkPage = 0, pkDone = null, pkBusy = false;
$('#app').insertAdjacentHTML('beforeend', `<div class="bmbg" id="pkbg"></div><div class="bms g" id="pks" role="dialog" aria-label="Choose a picture" aria-hidden="true"><div class="bms-h"><div class="bms-t"><b>Choose a picture</b><span id="pks2"></span></div><button class="x" id="pkx" type="button" aria-label="Close">×</button></div><div class="pkgrid" id="pkgrid"></div><div class="sub" id="pkmsg" style="margin:2px 2px 0"></div><div class="edbtns"><button class="pillbtn sm" id="pkmore" type="button">More</button><button class="pillbtn sm ghost" id="pkphone" type="button">From my phone</button></div></div>`);
function pkClose() { $('#pks').classList.remove('open'); $('#pkbg').classList.remove('open'); $('#pks').setAttribute('aria-hidden', 'true'); setTimeout(() => window.MOrb && MOrb.refresh(), 200); }
async function pkLoad(more) {
  if (pkBusy) return; const g = $('#pkgrid'), msg = $('#pkmsg'), mb2 = $('#pkmore');
  if (!S.net) { msg.textContent = 'Allow online lookups in Settings to see suggestions. You can still choose from your phone.'; mb2.hidden = true; return; }
  pkBusy = true; msg.textContent = 'Looking…'; mb2.hidden = true;
  try {
    const L = await Net.pics(pkKind, pkName, pkArtist, pkPage, { key: S.gkey, cx: S.gcx });
    if (!more) g.innerHTML = '';
    L.forEach(x => g.insertAdjacentHTML('beforeend', `<button class="pkc" type="button" data-u="${esc(x.u)}" data-t="${esc(x.t)}" aria-label="Use this picture"><span style="background:center/cover url('${esc(x.t)}'),${CDBG}"></span></button>`));
    msg.textContent = L.length ? (S.gkey && S.gcx ? 'Best matches from Google and open sources.' : 'Best matches from open sources. Add a Google key in Settings for Google results.') : (g.children.length ? 'That is all I found.' : 'Nothing found. Try from your phone.');
    mb2.hidden = L.length < 4; pkPage++;
  } catch (e) { msg.textContent = 'No connection. Try again later.'; }
  pkBusy = false;
}
function pkOpen(kind, name, artist, done) {
  pkKind = kind; pkName = name; pkArtist = artist || ''; pkPage = 0; pkDone = done; tick();
  $('#pks2').textContent = name; $('#pkgrid').innerHTML = ''; $('#pkmsg').textContent = ''; $('#pkmore').hidden = true;
  $('#pks').classList.add('open'); $('#pkbg').classList.add('open'); $('#pks').setAttribute('aria-hidden', 'false'); if (window.MOrb) MOrb.refresh(); pkLoad(false);
}
$('#pkx').addEventListener('click', () => { tick(); pkClose(); }); $('#pkbg').addEventListener('click', pkClose);
$('#pkmore').addEventListener('click', () => { tick(); pkLoad(true); });
$('#pkphone').addEventListener('click', () => { tick(); edFile.value = ''; edFile.onchange = async () => { const f = edFile.files && edFile.files[0]; if (!f) return; try { const d = await A.thumb(f, 640); if (d) { pkClose(); pkDone && pkDone(d); } else toast('That picture could not be read'); } catch (e) { toast('That picture could not be read'); } }; edFile.click(); });
$('#pkgrid').addEventListener('click', async ev => {
  const b = ev.target.closest('.pkc'); if (!b) return; tick(); b.classList.add('busy');
  let d = await Net.photoData(b.dataset.u); if (!d) d = await Net.photoData(b.dataset.t);
  b.classList.remove('busy'); if (!d) { toast('That site does not allow copying. Choose another.'); return; }
  pkClose(); pkDone && pkDone(d);
});
const setPhoto = async (kind, n, d) => {
  if (kind === 'artist') { const i = artInfo[n] = artInfo[n] || { bio: '', photo: '', src: {}, man: {}, at: 0, try: 0 }; i.man = i.man || {}; i.src = i.src || {}; i.photo = d; i.man.photo = 1; i.src.photo = 'You'; if (A.imgDel) await A.imgDel('ar:' + n); store.set('mp_artist', artInfo); }
  else { const i = albInfo[n] = albInfo[n] || { cover: '', curl: '', yr: '', g: '', n: 0, src: {}, man: {}, at: 0, try: 0 }; i.man = i.man || {}; i.src = i.src || {}; i.cover = d; i.man.cover = 1; i.src.cover = 'You'; store.set('mp_album', albInfo); }
  edName = n; edKind = kind; toast('Picture saved'); redraw();
};
$('#edsave').addEventListener('click', async () => {
  const txt = $('#edn').value.trim(), n = edName;
  if (edKind === 'artist') {
    const i = artInfo[n] = artInfo[n] || { bio: '', photo: '', src: {}, man: {}, at: 0, try: 0 }; i.man = i.man || {}; i.src = i.src || {};
    if (txt) { i.bio = txt; i.man.bio = 1; i.src.bio = 'You'; } else if (i.man.bio) { delete i.man.bio; i.bio = ''; i.src.bio = ''; i.at = 0; i.try = 0; }
    if (edPic) { i.photo = edPic; i.man.photo = 1; i.src.photo = 'You'; if (A.imgDel) await A.imgDel('ar:' + n); }
    else if (edReset && i.man.photo) { delete i.man.photo; i.photo = ''; i.src.photo = ''; i.at = 0; i.try = 0; }
    store.set('mp_artist', artInfo);
  } else {
    const i = albInfo[n] = albInfo[n] || { cover: '', curl: '', yr: '', g: '', n: 0, src: {}, man: {}, at: 0, try: 0 }; i.man = i.man || {}; i.src = i.src || {};
    if (txt) { i.note = txt; i.man.note = 1; } else if (i.man.note) { delete i.man.note; i.note = ''; }
    if (edPic) { i.cover = edPic; i.man.cover = 1; i.src.cover = 'You'; }
    else if (edReset && i.man.cover) { delete i.man.cover; i.cover = ''; i.src.cover = ''; i.at = 0; i.try = 0; }
    store.set('mp_album', albInfo);
  }
  tick(); toast('Saved'); edClose(); redraw(); if (S.net && S.fresh !== false) liveKick(2500);
});
$('#edauto').addEventListener('click', () => {
  const n = edName; tick();
  if (edKind === 'artist' && artInfo[n]) { Object.assign(artInfo[n], { bio: '', photo: '', man: {}, src: {}, at: 0, try: 0 }); store.set('mp_artist', artInfo); if (A.imgDel) A.imgDel('ar:' + n); }
  if (edKind === 'album' && albInfo[n]) { Object.assign(albInfo[n], { cover: '', note: '', man: {}, src: {}, at: 0, try: 0 }); store.set('mp_album', albInfo); }
  toast('Back to automatic'); edClose(); redraw(); if (S.net) syncLib(true, edKind === 'artist' ? [n] : undefined).then(() => redraw()); else toast('Allow online lookups to refill it');
});

function autoArtists() { liveKick(1500); }
const PINIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l-1 6 3 3v2h-5v5l-1 1-1-1v-5H5v-2l3-3z"/></svg>', XIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
function apRows(x) {
  const o = alx[x.k] || {}, pins = new Set(o.p || []);
  return x.list.map((s, i) => `<div class="row erow${pins.has(s.id) ? ' pinned' : ''}"><button class="rb" data-i="${i}" data-id="${s.id}" type="button">${thHTML(s)}<div class="tx"><div class="rt1">${esc(s.t)}</div><div class="rt2">${esc(sub(s))} · ${fmt(s.d)}</div></div></button><span class="eb"><button class="pn" data-axp="${s.id}" type="button" aria-label="Pin ${esc(s.t)} to the top">${PINIC}</button><button class="ex" data-axr="${s.id}" type="button" aria-label="Remove ${esc(s.t)} from this list">${XIC}</button></span></div>`).join('');
}
function apHead(x) { return `<div class="sub">${esc(x.desc)} · ${ns(x.list.length)} · ${totalLen(x.list)}</div>${x.edited ? `<div class="tipbox apn"><div class="s1">You changed this list</div><div class="s2">The app learns from your changes and keeps them when the list refreshes.</div></div>` : ''}`; }
function autoPage(k) {
  const x = autoLists().find(y => y.k === k); if (!x) return;
  page(x.name, `<div id="aphead">${apHead(x)}</div><div class="centre" style="margin:12px 0;flex-wrap:wrap">${x.list.length > 1 ? '<button class="pillbtn" data-act="playall" type="button">Play all</button>' : ''}<button class="lnk sm" data-apedit="1" type="button">Edit</button><button class="lnk sm" data-apadd="1" type="button">Add songs</button><button class="lnk sm" data-apreset="1" type="button" id="apreset"${x.edited ? '' : ' hidden'}>Reset to automatic</button></div><div id="apaddbox" hidden></div><div class="list g" id="plist2">${apRows(x)}</div>`, box => { box._list = x.list; box._shown = 400; box._apk = k; });
}
function apRefresh() {
  const box = $('#libbox'), k = box._apk, x = autoLists().find(y => y.k === k), L = $('#plist2'); if (!L) return;
  if (!x) { autoPage(k); return; }
  box._list = x.list; L.innerHTML = apRows(x); $('#aphead').innerHTML = apHead(x); $('#apreset').hidden = !x.edited; thumbs(box);
}
function page(title, html, wire, hero) {
  stack.push(tab === 'lib' ? renderLib : renderSet);
  const box = $('#libbox'); box.dataset.pg = ''; box.innerHTML = `<button class="lnk back" data-act="back" type="button">‹ Library</button>${hero ? '' : `<h1>${esc(title)}</h1>`}${html}`; box.classList.remove('lin'); void box.offsetWidth; box.classList.add('lin');
  thumbs(box); box.scrollTop = 0; if (wire) wire(box);
}
function sortList(L, k) {
  const by = { az: (x, y) => x.t.localeCompare(y.t), recent: (x, y) => y.ad - x.ad, len: (x, y) => y.d - x.d, artist: (x, y) => sub(x).localeCompare(sub(y)) || x.t.localeCompare(y.t) };
  L.sort(by[k] || by.az);
}
const SORTS = [['az', 'A to Z'], ['recent', 'Recent'], ['len', 'Length'], ['artist', 'Artist']];
const ssort = () => (v => SORTS.some(x => x[0] === v) ? v : 'az')(store.get('mp_ssort', 'az'));
function collection(k) {
  if (k === 'fav') { const L = songs().filter(s => favs.has(s.id)); if (!L.length) { page('Favourites', '<div class="empty">Double-tap the cover while a song plays to add it here.</div>'); return; } listPage('Favourites', L); }
  if (k === 'new') listPage('Recently added', songs().slice().sort((x, y) => y.ad - x.ad).slice(0, 60), 'The last songs you added');
  if (k === 'rec') { const seen = new Set(), L = []; for (let i = plays.length - 1; i >= 0 && L.length < 60; i--) { const s = byId.get(plays[i].id); if (s && included(s.f) && !seen.has(s.id)) { seen.add(s.id); L.push(s); } } if (!L.length) { page('Recently played', '<div class="empty">Songs you play will appear here.</div>'); return; } listPage('Recently played', L, null, true); }
  if (k === 'mk') marksPage();
}
function marksPage() {
  const L = marks.map((m, i) => ({ m, i, s: byId.get(m.id) })).filter(x => x.s).reverse();
  if (stack.length && $('#libbox').dataset.pg === 'marks') stack.pop();
  page('Bookmarks', L.length ? `<div class="sub">${L.length} saved</div><div class="list g" style="margin-top:12px">${L.map(x => `<div class="row" data-mk="${x.i}" role="button" tabindex="0">${thHTML(x.s)}<div class="tx"><div class="rt1">${esc(x.s.t)}</div><div class="rt2">${x.m.kind === 'chapter' ? 'Chapter · ' : ''}at ${fmt(x.m.pos)} · ${esc(sub(x.s))}</div>${x.m.note ? `<div class="rt2 bnote">${esc(x.m.note)}</div>` : ''}</div><button class="x" data-mkrm="${x.i}" type="button" aria-label="Remove bookmark">×</button></div>`).join('')}</div>` : '<div class="empty">Use “Save this moment” in Listening to mark a place in a long recording.</div>');
  $('#libbox').dataset.pg = 'marks';
}
function listPage(title, list, sub2, keep, folder) {
  page(title, `<div class="sub">${sub2 || ns(list.length) + ' · ' + totalLen(list)}</div><div class="centre">${keep ? '' : SORTS.map(x => `<button class="lnk sm" data-sort="${x[0]}" type="button">${x[1]}</button>`).join('')}${folder ? '<button class="lnk sm" data-act="findfolder" type="button">Find details</button>' : ''}</div>${list.length > 1 ? `<div class="centre" style="margin:12px 0"><button class="pillbtn" data-act="playall" type="button">Play all</button></div>` : ''}<div class="list g" id="plist2">${list.slice(0, 400).map((s, i) => rowHTML(s, i)).join('')}</div>${list.length > 400 ? `<div class="centre"><button class="lnk" data-act="more400" type="button">Show more…</button></div>` : ''}`, box => {
    box._list = list; box._shown = 400;
  });
}

/* settings: every choice is a picture, a switch, or a short link */
const LEVELS = ['Still', 'Gentle', 'Lively', 'Playful', 'Springy', 'Bouncy'], DOT = [8, 12, 17, 22, 28, 34];
const eyes = '<i style="position:absolute;left:36%;top:44%;width:5px;height:7px;border-radius:50%;background:currentColor"></i><i style="position:absolute;left:58%;top:44%;width:5px;height:7px;border-radius:50%;background:currentColor"></i>';
const PV = {
  album: '<div class="pv" style="background:linear-gradient(180deg,#8a7fd0,#f1a98e)"><div style="position:absolute;left:24%;right:24%;top:10%;height:62%;border-radius:12px;background:linear-gradient(180deg,#3d59b8,#f1a98e)"></div></div>',
  blob: '<div class="pv" style="background:var(--bg);border:1px solid var(--hair);color:var(--fg)"><div style="position:absolute;left:30%;top:14%;width:40%;height:50%;border-radius:50%;border:2px solid var(--acc2)">' + eyes + '</div></div>',
  free: '<div class="pv" style="background:linear-gradient(180deg,#9aa8e0,#d8a0c4)"><div style="position:absolute;left:30%;right:30%;top:36%;height:6%;border-radius:3px;background:rgba(255,255,255,.55)"></div><div style="position:absolute;left:41%;right:41%;top:54%;height:32%;border-radius:50%;background:#fff"></div></div>',
  card: '<div class="pv" style="background:linear-gradient(180deg,#9aa8e0,#d8a0c4)"><div class="g" style="position:absolute;left:10%;right:10%;top:34%;bottom:8%;border-radius:14px"></div><div style="position:absolute;left:41%;right:41%;top:54%;height:28%;border-radius:50%;background:linear-gradient(160deg,var(--acc1),var(--acc2))"></div></div>'
};
const VI = {
  disc: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.6"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>',
  tide: '<path d="M3 14c3-4 5 3 9-1s6 2 9-1M3 18c3-3 5 2 9-1s6 2 9-1"/>',
  none: '<circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/>',
  blob: '<path d="M12 4.5c4 0 7.5 3 7.5 7.5S16 19.5 12 19.5 4.5 16 4.5 12 8 4.5 12 4.5z"/><circle cx="9.5" cy="11" r=".9" fill="currentColor"/><circle cx="14.5" cy="11" r=".9" fill="currentColor"/><path d="M10 14.5q2 1.6 4 0"/>',
  bars: '<path d="M6 18v-5M10 18V7M14 18v-9M18 18v-4"/>',
  wave: '<path d="M3 12h3l2-6 3 12 3-9 2 3h5"/>',
  meter: '<path d="M4 17a8 8 0 0116 0"/><path d="M12 17l4-6"/>',
  lights: '<path d="M7 19v-2M7 14v-2M12 19v-2M12 14v-2M12 9V7M17 19v-2"/>',
  disc: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/>'
};
const VN = { none: 'None', tide: 'Tide', bars: 'Bars', wave: 'Wave', lights: 'Lights', disc: 'Disc' };
const vt = v => `<button class="vt${S.viz === v ? ' sel' : ''}" data-set="viz" data-v="${v}" type="button" aria-pressed="${S.viz === v}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${VI[v]}</svg><span>${VN[v]}</span></button>`;
const CN = { accent: 'Accent', white: 'White', grey: 'Grey', spectrum: 'Spectrum' };
const swatches = k => `<div class="cols" role="group" aria-label="Colour">${Object.keys(CN).map(v => `<button class="cs${S[k] === v ? ' sel' : ''}" data-set="${k}" data-v="${v}" type="button" aria-label="${CN[v]}" aria-pressed="${S[k] === v}"><i></i></button>`).join('')}</div>`;
const RIPN = ['Off', 'Faint', 'Soft', 'Medium', 'Strong', 'Max'];
const sxRow = (k, a, b) => `<div class="setrow"><div><div class="s1">${a}</div><div class="s2">${b}</div></div><button class="sw${S.sx[k] ? ' on' : ''}" data-sxk="${k}" type="button" role="switch" aria-checked="${!!S.sx[k]}" aria-label="${a}"><i></i></button></div>`;
const optBtn = (key, v, label) => `<button class="opt g${S[key] === v ? ' sel' : ''}" data-set="${key}" data-v="${v}" type="button" aria-pressed="${S[key] === v}">${PV[v]}<span>${label}</span></button>`;
const toggleRow = (k, a, b) => `<div class="setrow"><div><div class="s1">${a}</div>${b ? `<div class="s2">${b}</div>` : ''}</div><button class="sw${S[k] ? ' on' : ''}" data-tog="${k}" type="button" role="switch" aria-checked="${!!S[k]}" aria-label="${a}"><i></i></button></div>`;
const optRow = () => `<div class="setrow optrow"><div class="optk"><span class="optdot" id="optdot" data-h="0"></span><svg id="opttr" viewBox="0 0 60 14" width="60" height="14" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" points=""/></svg></div><div><div class="s1">Optimisation</div></div><button class="sw${S.opt ? ' on' : ''}" data-tog="opt" type="button" role="switch" aria-checked="${!!S.opt}" aria-label="Optimisation"><i></i></button></div>`;
setInterval(() => { const d = document.getElementById('optdot'); if (!d || !window.Viz) return; d.dataset.h = !S.opt ? 'x' : (Viz.heat && Viz.playing ? '1' : '0'); const p = document.querySelector('#opttr polyline'); if (p) { const t = Viz.trace, n = t.length, pts = []; for (let i = 0; i < n; i++) { const v = t[(i + 1) % n]; pts.push(i + ',' + (13 - Math.min(12, v / 4)).toFixed(1)); } p.setAttribute('points', S.opt ? pts.join(' ') : ''); } }, 1000);
/* ---------- Settings: a calm home with small pages ---------- */
let setPg = '';
const nh = s => s.replace(/^\s*<h2[^>]*>.*?<\/h2>/, '');
const hico = {
  look: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 000 16z" fill="currentColor"/>',
  screen: '<rect x="6.5" y="3.5" width="11" height="17" rx="2.5"/><circle cx="12" cy="13" r="2.6"/>',
  viz: '<path d="M6 18v-5M10 18V7M14 18v-9M18 18v-4"/>',
  quiet: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  sound: '<path d="M4 10v4h3.5l4.5 3.5v-11L7.5 10z"/><path d="M15.5 9.5a3.5 3.5 0 010 5M18 7a7 7 0 010 10"/>',
  dj: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.8"/><path d="M12 4v3M20 12h-3"/>',
  songs: '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/>',
  online: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3 3.5 3 13.5 0 17M12 3.5c-3 3.5-3 13.5 0 17"/>',
  backup: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  echo: '<path d="M4 12h2M8 8v8M12 5v14M16 8v8M20 12h-2"/>'
};
const hrow = (pg, ico, col, title, val) => `<button class="hrow" data-pg="${pg}" type="button"><i class="hi" style="--c:${col}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${hico[ico]}</svg></i><span class="ht">${title}</span><span class="hv">${val}</span><svg class="hc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg></button>`;
const LKN = { light: 'Light', dark: 'Dark', auto: 'Follows your phone' };
const bkAgo = () => { if (!S.lastbk) return 'Not yet'; const d = Math.floor((Date.now() - S.lastbk) / 864e5); return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d + ' days ago'; };
const VK = ['ev', 'eo', 'es', 'ea', 'eb', 'sn'];
const SK = ['sta', 'sts', 'stg', 'stt', 'stb', 'stp'], SKR = { sta: [25, 80], sts: [25, 75], stg: [30, 85], stt: [25, 85], stb: [30, 85], stp: [30, 75] };
const sfavList = () => (S.sfav && S.sfav[S.viz]) || [], sameStar = (c, o) => SK.every(k => (o || S)[k] === c[k]);
const vfavList = () => (S.vfav && S.vfav[S.viz]) || [];
const sameCombo = (c, o) => VK.every(k => (o || S)[k] === c[k]);
const heartIc = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/></svg>';
const link = (key, v, l) => `<button class="lnk${S[key] === v ? ' on' : ''}" data-set="${key}" data-v="${v}" type="button">${l}</button>`;
const folderList = () => [...folders.keys()].sort();
const SECT = {
  screen: () => `<h2>Playing screen</h2>
    <div class="list g" style="margin-top:12px">${toggleRow('acol', 'Colours from the album', 'Tints the screen with the cover’s colours.')}${toggleRow('calm', 'Calm minimal', 'Hides the busy parts and keeps the screen quiet.')}${toggleRow('sm', 'Small album art', 'Shows the cover at 125 px when there are no lyrics. Turn off for the large cover.')}${toggleRow('comp', 'Companion', 'A small face that reacts to the music.')}${toggleRow('listen', 'Visuals move with the music', 'Needs the music to pass through the app. Turn off if playback stops with the screen off.')}</div>`,
  quiet: () => `<div class="list g" style="margin-top:12px">${toggleRow('cover', 'Show the album art', 'Turn off to keep only the visualiser and its echoes.')}<div class="setrow rng"><div><div class="s1">Info card when quiet</div><div class="s2">How often the song’s details appear on the quiet screen. At Never the card stays hidden and the lyrics show instead, when the song has them.</div><input type="range" min="0" max="6" step="1" value="${S.insf}" data-rng="insf" aria-label="How often the info card appears"></div></div><div class="setrow rng"><div><div class="s1">Lyrics text size</div><div class="s2">The size of the lyrics on the quiet screen.</div><input type="range" min="14" max="28" step="1" value="${S.lysz || 17}" data-rng="lysz" aria-label="Lyrics text size"></div></div><div class="setrow"><div class="s1">Card style</div><div class="links" data-grp="insst">${link('insst', 'tip', 'Tooltip')}${link('insst', 'glass', 'Glass')}</div></div><div class="setrow rng"><div><div class="s1">Card background</div><input type="range" min="0" max="100" step="5" value="${S.insop}" data-rng="insop" aria-label="Tooltip background opacity"></div></div><div class="setrow rng"><div><div class="s1">Hairline border</div><input type="range" min="0" max="100" step="5" value="${S.insol}" data-rng="insol" aria-label="Outline opacity"></div></div></div>`,
  viz: () => `<h2>Visualiser</h2><div class="list g" style="padding:14px 10px 4px"><div class="vgrid">${['none', 'tide', 'bars', 'wave', 'lights', 'disc'].map(vt).join('')}</div>${swatches('vizc')}</div>`,
  echo: () => `<h2>Echoes and sensitivity</h2><div class="list g">${[['ev', 'Echoes', 'Blurred copies that jump with the beat', 0, 4, 1], ['eo', 'Visibility', 'How strongly the echoes show', 0, 100, 5], ['es', 'Size', 'How large the echoes grow', 0, 100, 5], ['ea', 'Angle', 'How far they tilt and drift', 0, 100, 5], ['eb', 'Softness', 'How blurred they are', 0, 100, 5], ['sn', 'Sensitivity', 'How easily the music moves the visualiser', 0, 100, 5]].map(x => `<div class="setrow rng"><div><div class="s1">${x[1]}</div><div class="s2">${x[2]}</div><input type="range" min="${x[3]}" max="${x[4]}" step="${x[5]}" value="${S[x[0]]}" data-rng="${x[0]}" aria-label="${x[1]}"></div></div>`).join('')}</div>`,
  ripple: () => `<h2>Play button ripple</h2><div class="list g"><div class="lv" role="group" aria-label="Ripple strength">${RIPN.map((n, i) => `<button type="button" data-rip="${i}" class="${S.rip === i ? 'on' : ''}" aria-pressed="${S.rip === i}"><i class="d" style="width:${DOT[i]}px;height:${DOT[i]}px"></i><span>${n}</span></button>`).join('')}</div>${swatches('ripc')}</div>`,
  look: () => `<h2>Skin</h2><div class="skins">${Skins.list.map(k => `<button class="skin${S.skin === k.id ? ' sel' : ''}" data-set="skin" data-v="${k.id}" type="button" aria-pressed="${S.skin === k.id}">${k.prev}<span class="skn">${k.name}</span><span class="sks">${k.note}</span></button>`).join('')}</div><h2>Look</h2><div class="list g"><div class="setrow"><div class="s1">Theme</div><div class="links" data-grp="look">${link('look', 'light', 'Light')}${link('look', 'dark', 'Dark')}${link('look', 'auto', 'Phone')}</div></div>${toggleRow('warm', 'Warm at night', 'Softer colours between 9 pm and 5 am.')}</div>`,
  live: () => `<h2>Liveliness</h2><div class="list g"><div class="lv" role="group" aria-label="Liveliness">${LEVELS.map((n, i) => `<button type="button" data-live="${i}" class="${S.live === i ? 'on' : ''}" aria-pressed="${S.live === i}"><i class="d" style="width:${DOT[i]}px;height:${DOT[i]}px"></i><span>${n}</span></button>`).join('')}</div></div>`,
  playing: () => `<h2>Playing</h2><div class="list g">${toggleRow('infinity', 'Keep the music going', 'When your queue ends, add songs you may like.')}${toggleRow('night', 'Quieter at night', 'Eases the app volume down to a low level late in the evening, once a night. It comes back in the morning.')}<div class="setrow rng"><div><div class="s1">Night starts</div><input type="range" min="20" max="23" step="1" value="${S.nightT}" data-rng="nightT" aria-label="Night starts"></div></div><div class="setrow rng"><div><div class="s1">Night volume</div><input type="range" min="2" max="30" step="1" value="${S.nightV}" data-rng="nightV" aria-label="Night volume"></div></div><div class="setrow rng"><div><div class="s1">Back to normal at</div><input type="range" min="4" max="9" step="1" value="${S.nightR}" data-rng="nightR" aria-label="Back to normal at"></div></div>${toggleRow('alwaysRepl', 'Always replace the queue', 'Starting an album, artist or playlist replaces the queue without asking. A small “Ask again” appears each time.')}${toggleRow('fade', 'Soft start and stop', 'Music fades in and out instead of cutting.')}${toggleRow('xf', 'Crossfade when you skip', 'Next and Previous blend the two songs instead of cutting.')}<div class="setrow rng"><div><div class="s1">Crossfade length</div><input type="range" min="1" max="10" step="1" value="${S.xfl}" data-rng="xfl" aria-label="Crossfade length"></div></div>${toggleRow('haptic', 'Tiny taps', 'A small buzz when you tap.')}<div class="setrow"><div><div class="s1">Tap, then hold to switch mode</div><svg class="gdemo" viewBox="0 0 120 44" aria-hidden="true"><rect x="8" y="2" width="30" height="12" rx="6"/><rect x="45" y="2" width="30" height="12" rx="6" class="on"/><rect x="82" y="2" width="30" height="12" rx="6"/><path d="M60 20v8" class="ar"/><circle cx="60" cy="36" r="6" class="bt"/><circle cx="60" cy="36" r="9" class="rg"/></svg></div><button class="sw${S.tapHold ? ' on' : ''}" data-tog="tapHold" type="button" role="switch" aria-checked="${!!S.tapHold}" aria-label="Tap, then hold to switch mode"><i></i></button></div>`,
  sound: () => `<h2 id="eq-set">Sound</h2><div class="list g"><div class="setrow links" style="justify-content:center">${[['Flat', 0, 0, 0], ['Warm', 4, 0, -2], ['Bright', -1, 1, 4], ['Vocal', -2, 3, 1], ['Bass', 6, 0, 0]].map(v => `<button class="lnk ${S.eql === v[1] && S.eqm === v[2] && S.eqh === v[3] ? 'on' : ''}" data-eqp="${v[1]},${v[2]},${v[3]}" type="button" aria-pressed="${S.eql === v[1] && S.eqm === v[2] && S.eqh === v[3]}">${v[0]}</button>`).join('')}</div>${[['eql', 'Bass'], ['eqm', 'Voice'], ['eqh', 'Treble']].map(x => `<div class="setrow rng"><div><div class="s1">${x[1]}</div><input type="range" min="-10" max="10" step="1" value="${S[x[0]]}" data-rng="${x[0]}" aria-label="${x[1]}"></div></div>`).join('')}${toggleRow('norm', 'Even out loudness', 'Gently lifts quiet songs and lowers loud ones, so you rarely reach for the volume. Each song is measured once, the first time it plays.')}<div class="setrow"><div class="s2">The equaliser works with the visualiser turned on, since both use the same sound path.</div></div></div>`,
  backup: () => `<h2 id="bk-set">Backup</h2><div class="list g"><div class="setrow"><div><div class="s1">Save a backup</div><div class="s2">Ratings, playlists, history, settings and artist and album pictures, in one file. Your songs are not included.</div></div><button class="lnk" data-bk="save" type="button">Save</button></div><div class="setrow"><div><div class="s1">Restore a backup</div><div class="s2">Replaces what is here with the file you choose.</div></div><button class="lnk" data-bk="load" type="button">Choose</button></div></div>`,
  dj: () => `<h2 id="dj-set">DJ and Lofi</h2><div class="list g"><div class="setrow"><div><div class="s1">DJ mode</div><div class="s2">Experimental. Blends the parts of your songs you replay most.</div></div><button class="lnk" data-opn="dj" type="button">Open</button></div><div class="setrow links" style="justify-content:center">${[['short', 'Short', 12, 35], ['mid', 'Medium', 20, 70], ['long', 'Long', 45, 140]].map(v => `<button class="lnk ${S.djmin === v[2] && S.djmax === v[3] ? 'on' : ''}" data-djp="${v[2]},${v[3]}" type="button" aria-pressed="${S.djmin === v[2] && S.djmax === v[3]}">${v[1]}</button>`).join('')}</div>${[['djmin', 'Shortest section', 'Seconds', 8, 90, 1], ['djmax', 'Longest section', 'Seconds. Each mix picks lengths between the two', 20, 180, 5], ['djxf', 'Crossfade', 'Seconds between two sections', 3, 10, 1]].map(x => `<div class="setrow rng"><div><div class="s1">${x[1]}</div><div class="s2">${x[2]}</div><input type="range" min="${x[3]}" max="${x[4]}" step="${x[5]}" value="${S[x[0]]}" data-rng="${x[0]}" aria-label="${x[1]}"></div></div>`).join('')}${toggleRow('djfav', 'Favour what you love', 'Favourites and songs you rated highly come up more often.')}${toggleRow('djspeech', 'Include lectures and audiobooks', 'Off by default. DJ mode then plays music only.')}</div>
    <div class="list g" style="margin-top:12px"><div class="setrow"><div><div class="s1">Lofi mode</div><div class="s2">Slowed, with reverb and echo, and a natural sound underneath.</div></div><button class="lnk" data-opn="lofi" type="button">Open</button></div>${[['lmus', 'Music volume', 'Only in Lofi mode', 0, 100, 5], ['lfx', 'Effects volume', 'How strong reverb and echo are', 0, 100, 5], ['lvol', 'Sound underneath', 'Rain, fire and the others', 0, 100, 5], ['lslow', 'Slowdown', 'How much slower, in percent', 0, 30, 1], ['lrev', 'Reverb', 'How much room', 0, 100, 5], ['lech', 'Echo', 'How many repeats', 0, 100, 5], ['lwarm', 'Warmth', 'Softens the bright sounds', 0, 100, 5]].map(x => `<div class="setrow rng"><div><div class="s1">${x[1]}</div><div class="s2">${x[2]}</div><input type="range" min="${x[3]}" max="${x[4]}" step="${x[5]}" value="${S[x[0]]}" data-rng="${x[0]}" aria-label="${x[1]}"></div></div>`).join('')}${toggleRow('lkeep', 'Keep voices natural', 'Slows the music without lowering the pitch, so voices do not sound deep or robotic.')}<div class="setrow"><div><div class="s1">Sounds underneath</div><div class="s2">Rain, thunder, crickets and birds, with volumes, drifting and a sleep timer.</div></div><button class="lnk" data-opn="lofi" type="button">Open</button></div></div>`,
  keep: () => `<h2>Keep music playing</h2><div class="list g">${A.web ? '<div class="setrow"><div><div class="s1">Add to home screen</div><div class="s2">In Chrome, open the menu and choose Add to Home screen. Then music keeps playing with the screen off.</div></div></div>' : `<div class="setrow"><div><div class="s1">${A.batteryOk() ? 'Battery saver will not stop the music' : 'Battery saver may stop the music'}</div></div>${ok ? '' : '<button class="pillbtn" data-act="battery" type="button">Allow</button>'}</div>`}</div>`,
  songs: () => `<h2>${A.web ? 'Your songs' : 'Music folders'}</h2><div class="list g">${folderList().map(f => `<div class="setrow"><div style="min-width:0"><div class="s1" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(folderName(f))}</div><div class="s2">${ns(folders.get(f).length)}${JUNK.test(f) && !S.on.includes(f) ? ' · left out (looks like voice notes)' : ''}${A.web ? ` · <button class="lnk sm" data-rmf="${esc(f)}" type="button">Remove</button>` : ''}</div></div><button class="sw${included(f) ? ' on' : ''}" data-fold="${esc(f)}" type="button" role="switch" aria-checked="${included(f)}" aria-label="${esc(folderName(f))}"><i></i></button></div>`).join('') || '<div class="setrow"><div class="s2">No songs yet.</div></div>'}</div>`,
  online: () => `<h2>Song details</h2><div class="list g">${toggleRow('net', 'Allow online lookups', 'Sends only title, artist and length to MusicBrainz. Never audio.')}<div class="setrow"><div><div class="s1">Google pictures (optional)</div><div class="s2">${S.gkey && S.gcx ? 'On. Your own key is used for picture suggestions.' : 'Add your own free Google search key to see Google results in the picture chooser.'}</div></div><button class="lnk" data-act="gkey" type="button">${S.gkey ? 'Change' : 'Add'}</button></div>${toggleRow('suggest', 'Suggest finding covers', 'Shows a card in Library when songs have no cover.')}<div class="setrow"><div><div class="s1">Look first in</div><div class="s2">If one source has nothing, the next is tried for what is missing.</div></div></div><div class="setrow links" style="justify-content:center"><button class="lnk ${S.src === 'bolly' ? 'on' : ''}" data-set="src" data-v="bolly" type="button">Bollywood first</button><button class="lnk ${S.src === 'global' ? 'on' : ''}" data-set="src" data-v="global" type="button">Global first</button></div>${sxRow('itunes', 'iTunes India', 'Strong for Hindi film songs. Covers, albums, years.')}${sxRow('mb', 'MusicBrainz', 'Open music database with the Cover Art Archive.')}${sxRow('wiki', 'Wikipedia', 'Artist introductions and photos.')}${sxRow('adb', 'TheAudioDB', 'Artist photos and introductions when Wikipedia has none.')}${toggleRow('fresh', 'Keep details fresh automatically', 'Quietly fills in missing photos, introductions, covers, years and genres in the background every few hours. Your own edits are never replaced.')}<div class="setrow"><div><div class="s1">Test sources</div><div class="s2">Checks which ones work from this phone.</div></div><button class="lnk" data-act="testsrc" type="button">Test</button></div><div class="setrow"><div><div class="s1">Find details now</div><div class="s2">Checks songs with missing details. Anything you edited or added by hand is left as it is.</div></div><button class="lnk" data-act="findnow" type="button">Find</button></div>${lib.some(x => x.o) ? '<div class="setrow"><div><div class="s1">Save tagged copies</div><div class="s2">Writes your edits into copies of the MP3 files and saves them to your downloads. Other formats keep details inside the app.</div></div><button class="lnk" data-act="tagall" type="button">Save</button></div><div class="setrow"><div><div class="s1">Restore original details</div><div class="s2">Puts back the titles and covers the files came with.</div></div><button class="lnk" data-act="restore" type="button">Restore</button></div>' : ''}</div>`,
  about: () => `<h2>About</h2><div class="list g"><div class="setrow"><div><div class="s1">Rustam's Music</div><div class="s2">Version ${A.version ? A.version() : '0.5.4'}. Everything stays on your phone.</div></div></div></div>`
};
const echoCtl = () => { const n = vfavList().length, on = vfavList().some(c => sameCombo(c)); return `<div class="list g"><div class="setrow"><div><div class="s1">Surprise me</div><div class="s2">Picks a fresh mix of everything below. Tap the heart to keep a look you like.</div></div><div class="rfx"><button class="rbtn g" data-rnd="1" type="button">Randomize</button><button class="fav${on ? ' on' : ''}" data-favv="1" type="button" aria-pressed="${on}" aria-label="Like this look">${heartIc}</button></div></div><div class="setrow"><div class="s2" id="favn">${n ? n + (n === 1 ? ' look' : ' looks') + ' liked for ' + VN[S.viz] : 'No looks liked yet for ' + VN[S.viz]}. Tapping the visualiser on the Playing screen uses your liked looks, or a fresh good one if you have none yet.</div></div></div>`; };
const PG = {
  look: ['Appearance', '', () => nh(SECT.look()) + SECT.live()],
  screen: ['Playing screen', '', () => nh(SECT.screen())],
  quiet: ['Quiet screen', '', () => SECT.quiet()],
  viz: ['Visualiser', '', () => nh(SECT.viz()) + `<div class="list g" style="margin-top:12px"><button class="hrow plain" data-pg="echo" type="button"><i class="hi" style="--c:#e8738a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">${hico.echo}</svg></i><span class="ht">Echoes and sensitivity</span><span class="hv">${S.ev ? S.ev + (S.ev === 1 ? ' echo' : ' echoes') : 'Off'}</span><svg class="hc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg></button><button class="hrow plain" data-pg="stars" type="button"><i class="hi" style="--c:#f2b84b"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg></i><span class="ht">Stars</span><span class="hv">${S.st ? 'On' : 'Off'}</span><svg class="hc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg></button></div>` + SECT.ripple()],
  stars: ['Stars', 'viz', () => `<h2>Stars</h2><div class="list g"><div class="setrow"><div><div class="s1">Surprise me</div><div class="s2">Picks a fresh mix of the sliders below. Tap the heart to keep a look you like.</div></div><div class="rfx"><button class="rbtn g" data-srnd="1" type="button">Randomize</button><button class="fav${sfavList().some(c => sameStar(c)) ? ' on' : ''}" data-sfav="1" type="button" aria-pressed="${sfavList().some(c => sameStar(c))}" aria-label="Like this star look">${heartIc}</button></div></div><div class="setrow"><div class="s2" id="sfavn">${sfavList().length ? sfavList().length + (sfavList().length === 1 ? ' look' : ' looks') + ' liked for ' + VN[S.viz] : 'No star looks liked yet for ' + VN[S.viz]}. Double-tapping the background on the Playing screen uses your liked looks, or a fresh good one if you have none yet.</div></div>${toggleRow('st', 'Stars in the background', 'Far behind the visualiser. They fade in and out, glow, shine and twinkle, and flare on the beat.')}${[['sta', 'Amount', 'How many stars'], ['sts', 'Size', 'How large they are'], ['stg', 'Glow and halo', 'How soft and wide the light around each star is'], ['stt', 'Twinkle', 'How much each star flickers'], ['stb', 'Beat reaction', 'How many stars flare on each beat'], ['stp', 'Pace', 'How fast stars appear, fade and shine']].map(r => `<div class="setrow rng"><div><div class="s1">${r[1]}</div><div class="s2">${r[2]}</div><input type="range" min="0" max="100" step="1" value="${S[r[0]]}" data-rng="${r[0]}" aria-label="${r[1]}"></div></div>`).join('')}</div>`],
  echo: ['Echoes and sensitivity', 'viz', () => echoCtl() + nh(SECT.echo())],
  sound: ['Playing and sound', '', () => SECT.playing() + SECT.sound() + SECT.keep()],
  dj: ['DJ and Lofi', '', () => `<div class="sub" style="margin:2px 6px 0">Tip: hold the play button to pause only the sounds underneath.</div>` + nh(SECT.dj())],
  songs: ['Your songs', '', () => nh(SECT.songs())],
  dups: ['Duplicates and removed', '', () => dupsPage()],
  taste: ['What the app has learned', '', () => tastePage()],
  online: ['Online details', '', () => nh(SECT.online())],
  backup: ['Backup and data', '', () => nh(SECT.backup()) + SECT.about()]
};
function renderSet(fresh) {
  const box = $('#setbox'), keep = fresh ? 0 : box.scrollTop;
  let h;
  if (!PG[setPg]) {
    setPg = '';
    const lk = (v, c) => `<button class="lk${S.look === v ? ' on' : ''}" data-set="look" data-v="${v}" type="button" style="background:${c}" aria-label="${LKN[v]}" aria-pressed="${S.look === v}"></button>`;
    h = `<h1>Settings</h1>
    <div class="hcards"><button class="hcard g" data-pg="backup" type="button"><span class="hk">Backup</span><span class="hb">${bkAgo()}</span><span class="hf">${S.lastbk ? 'Your ratings and playlists are safe' : 'Save a copy of your ratings and playlists'}</span></button>
    <div class="hcard g"><span class="hk">Look</span><div class="lks" role="group" aria-label="Theme">${lk('light', 'linear-gradient(160deg,#f4f8ff,#b9cdf2)')}${lk('dark', 'linear-gradient(160deg,#2a3246,#0b0e15)')}${lk('auto', 'linear-gradient(90deg,#e6eefc 50%,#161b27 50%)')}</div><span class="hf" id="lookn">${LKN[S.look]}</span></div></div>
    <div class="list g hgrp">${hrow('look', 'look', '#5b8def', 'Appearance', LKN[S.look] === 'Follows your phone' ? 'Phone' : LKN[S.look])}${hrow('screen', 'screen', '#7c6ee6', 'Playing screen', S.calm ? 'Calm' : S.cover ? 'Album art' : 'Visualiser')}${hrow('viz', 'viz', '#e8738a', 'Visualiser', VN[S.viz])}${hrow('quiet', 'quiet', '#f0a43a', 'Quiet screen', S.ins ? 'On' : 'Off')}</div>
    <div class="list g hgrp">${optRow()}
    ${toggleRow('pwr', 'Power saving', 'Eases the screen down when you stop touching it, and goes black after a minute while music plays. Tap to return.')}</div>
    <div class="list g hgrp">${hrow('sound', 'sound', '#e5645b', 'Playing and sound', S.xf ? 'Crossfade ' + S.xfl + ' s' : 'Crossfade off')}${hrow('dj', 'dj', '#8a63d2', 'DJ and Lofi', 'Modes')}${window.Taste ? hrow('taste', 'viz', '#d65a8e', 'What the app has learned', Taste.on() ? ['Just starting', 'Getting to know you', 'Well acquainted'][Taste.stage()] : 'Off') : ''}</div>
    <div class="list g hgrp">${hrow('songs', 'songs', '#3fb68b', A.web ? 'Your songs' : 'Music folders', ns(lib.length))}${A.dups ? hrow('dups', 'songs', '#d6893f', 'Duplicates and removed', (() => { try { const n = JSON.parse(A.trashList()).length; return n ? n + ' removed' : 'Clean'; } catch (e) { return ''; } })()) : ''}${hrow('online', 'online', '#4aa3d6', 'Online details', S.net ? 'On' : 'Off')}${hrow('backup', 'backup', '#34a853', 'Backup and data', bkAgo())}</div>
    <div class="hfoot">Rustam's Music ${A.version ? A.version() : ''}</div>`;
  } else {
    const p = PG[setPg], par = p[1] ? PG[p[1]][0] : 'Settings';
    h = `<button class="back" data-pg="${p[1]}" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>${par}</button><h1>${p[0]}</h1>${p[2]()}`;
  }
  box.innerHTML = `<div class="pg${fresh ? ' in' : ''}">${h}</div>`;
  box.scrollTop = keep; $$('.sw', box).forEach(sw => { sw._k = M.knob(sw, sw.classList.contains('on')); });
}
const goPg = p => { setPg = p; renderSet(true); };
/* visualiser looks: Randomize, liked looks, and tap-to-change */
const VKR = { eo: [30, 85], es: [25, 85], ea: [10, 90], eb: [20, 80], sn: [35, 85] };
function rndCombo() {
  const r5 = (lo, hi) => Math.round((lo + Math.random() * (hi - lo)) / 5) * 5, W = [0, 1, 1, 2, 2, 2, 3, 3, 4];
  for (let n = 0; n < 40; n++) {
    const c = { ev: W[Math.floor(Math.random() * W.length)] }; for (const k in VKR) c[k] = r5(VKR[k][0], VKR[k][1]);
    if (c.eb > 65 && c.eo < 45) continue; if (c.es > 70 && c.ea > 70) continue; if (c.ev === 4 && c.eo > 70) continue;
    if (!sameCombo(c)) return c;
  }
  return { ev: 2, eo: 50, es: 50, ea: 50, eb: 50, sn: 55 };
}
function favPaint() {
  const b = $('#setbox [data-favv]'); if (b) { const on = vfavList().some(c => sameCombo(c)); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
  const n = vfavList().length, f = $('#favn'); if (f) f.textContent = (n ? n + (n === 1 ? ' look' : ' looks') + ' liked for ' + VN[S.viz] : 'No looks liked yet for ' + VN[S.viz]) + '. Tapping the visualiser on the Playing screen uses only your liked looks.';
}
let morphId = 0;
function morphTo(c) {
  const id = ++morphId, from = {}; VK.forEach(k => from[k] = S[k]); S.ev = c.ev;
  const D = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100, t0 = performance.now();
  const put = () => { if (window.Viz) { Viz.set({ layers: S.ev, eo: S.eo / 100, es: S.es / 100, ea: S.ea / 100, sn: S.sn / 100, eb: S.eb / 100 }); ROOT.style.setProperty('--eblur', Viz.blurPx() + 'px'); Viz.kick(); } VK.forEach(k => { const r = $(`#setbox [data-rng=${k}]`); if (r) { r.value = S[k]; if (r._o) r._o.textContent = rvText(r); } }); };
  const step = now => {
    if (id !== morphId) return; const u = D ? Math.min(1, (now - t0) / D) : 1, e = u * u * (3 - 2 * u);
    VK.forEach(k => { if (k !== 'ev') S[k] = Math.round(from[k] + (c[k] - from[k]) * e); }); put();
    if (u < 1) requestAnimationFrame(step); else { VK.forEach(k => S[k] = c[k]); put(); saveS(); applyAll(); favPaint(); }
  };
  requestAnimationFrame(step);
}
let vzN = 0;
function rndStar() { const r5 = (lo, hi) => Math.round((lo + Math.random() * (hi - lo)) / 5) * 5; for (let n = 0; n < 30; n++) { const c = {}; SK.forEach(k => c[k] = r5(SKR[k][0], SKR[k][1])); if (c.sta > 70 && c.stb > 75) continue; if (c.sts > 65 && c.stg > 75) continue; if (!sameStar(c)) return c; } return { sta: 50, sts: 50, stg: 50, stt: 50, stb: 60, stp: 50 }; }
let starId = 0;
function starMorph(c) { const id = ++starId, from = {}; SK.forEach(k => from[k] = S[k]); const D = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100, t0 = performance.now(); S.st = true;
  const put = () => { applyStars(); SK.forEach(k => { const r = $(`#setbox [data-rng=${k}]`); if (r) { r.value = S[k]; if (r._o) r._o.textContent = rvText(r); } }); };
  const step = now => { if (id !== starId) return; const u = D ? Math.min(1, (now - t0) / D) : 1, e = u * u * (3 - 2 * u); SK.forEach(k => S[k] = Math.round(from[k] + (c[k] - from[k]) * e)); put(); if (u < 1) requestAnimationFrame(step); else { SK.forEach(k => S[k] = c[k]); put(); saveS(); sfavPaint(); } }; requestAnimationFrame(step); }
function sfavPaint() { const b = $('#setbox [data-sfav]'); if (b) { const on = sfavList().some(c => sameStar(c)); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); } const n = sfavList().length, f = $('#sfavn'); if (f) f.textContent = (n ? n + (n === 1 ? ' look' : ' looks') + ' liked for ' + VN[S.viz] : 'No star looks liked yet for ' + VN[S.viz]) + '. Double-tapping the background on the Playing screen uses your liked looks, or a fresh good one if you have none yet.'; }
let starN = 0;
function starShuffle() { tick(); const f = sfavList(); let c; if (f.length) { const o = f.filter(x => !sameStar(x)), p = o.length ? o : f; c = p[Math.floor(Math.random() * p.length)]; } else { c = rndStar(); if (starN++ % 4 === 0) toast('Like a star look? Save favourites in Settings, under Visualiser, Stars'); } starMorph(c); }
function vzTap() {
  if (S.viz === 'none') return; tick();
  const f = vfavList(); let c;
  if (f.length) { const o = f.filter(x => !sameCombo(x)), p = o.length ? o : f; c = p[Math.floor(Math.random() * p.length)]; }
  else { c = rndCombo(); if (vzN++ % 4 === 0) toast('Like a look? Save favourites in Settings, under Visualiser'); }
  morphTo(c);
}
(() => { const s = $('#strip'); if (!s) return; s.removeAttribute('aria-hidden'); s.setAttribute('role', 'button'); s.setAttribute('tabindex', '0'); s.setAttribute('aria-label', 'Change the look of the visualiser'); s.addEventListener('click', vzTap); s.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); vzTap(); } }); })();





/* ---------- one editor for tags, lyrics and cover ---------- */
function copyText(t) {
  const done = () => toast('Copied');
  try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(t).then(done, fb); return; } } catch (e) {}
  fb();
  function fb() { const x = document.createElement('textarea'); x.value = t; x.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Could not copy'); } x.remove(); }
}
const sdFile = document.createElement('input'); sdFile.type = 'file'; sdFile.accept = 'image/*'; sdFile.hidden = true; document.body.appendChild(sdFile);
let sd = null;
document.addEventListener('input', e => { if (e.target && e.target.id === 'sdy' && sd) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); sd.ys = 'me'; sd.yfound = false; sd.yv = []; sdYear(); } });
const sdv = id => { const el = $('#' + id); return el ? el.value : ''; };
function sdStatus(t) { const e = $('#sdst'); if (e) e.textContent = t; }
function sdCover(u) { sd.art = u; const e = $('#sdcov'); if (e) { e.style.background = `center/cover url(${u})`; } }
async function sdNet() {
  if (!navigator.onLine) { sdStatus('You are offline.'); return false; }
  if (!S.net) { sdStatus(''); const e = $('#sdst'); e.innerHTML = 'Looking up sends only the title, artist and length. <button class="lnk sm" data-sd="allow" type="button">Allow</button>'; return false; }
  return true;
}
/* the year (or span of years) a set of songs shares, shown only when it is known */
const yrSpan = L => { const y = L.map(s => s.y).filter(Boolean); if (!y.length) return ''; const lo = Math.min(...y), hi = Math.max(...y); return (lo === hi ? lo : lo + '–' + hi) + ' · '; };
const yrSrc = s => ({ tag: 'from the file', name: 'from the file name', online: 'found online', me: 'set by you' }[s.ys] || '');
/* the confidence pips: three filled = several sources agree or the file says so; one = a guess */
const yrPips = (ys, yc) => ys === 'tag' ? 3 : ys === 'name' ? 1 : ys === 'online' ? (yc >= .7 ? 3 : yc >= .45 ? 2 : 1) : 0;
function sdYear() {
  const p = $('#sdyp'), t = $('#sdys'), b = $('#sdyb'); if (!p || !sd) return; const n = yrPips(sd.ys, sd.yc), has = !!($('#sdy').value || '').trim();
  p.innerHTML = [1, 2, 3].map(i => `<i class="${has && i <= n ? 'on' : ''}"></i>`).join(''); t.textContent = has ? yrSrc({ ys: sd.ys }) : ''; b.hidden = !has;
  const L = (sd.yv || []).map(v => (Net.SRCNAME[v[0]] || v[0]) + ' ' + v[1]).join(' · '); $('#sdyl').textContent = L || t.textContent;
}
function songSheet(id) {
  const s = byId.get(id); if (!s) return;
  sd = { id, art: null, prev: { t: s.t, a: s.a, al: s.al || '', y: s.y || 0, ly: A.lyrics ? A.lyrics(id) : '', had: s.o } };
  const cov = A.art(id); sd.ys = s.ys || ''; sd.yc = s.yc || 0; sd.yv = s.yv || []; requestAnimationFrame(sdYear);
  popup(`<div class="sdh"><div class="th" id="sdcov" style="background:${cov ? `center/cover url(${cov})` : CDBG}"></div>
      <div style="flex:1;min-width:0"><input class="inp" id="sdt" value="${esc(s.t)}" placeholder="Title" aria-label="Title" autocomplete="off"><input class="inp" id="sda" value="${esc(s.a)}" placeholder="Artist" aria-label="Artist" autocomplete="off"><div class="yrw"><input class="inp" id="sdy" value="${s.y || ''}" placeholder="Year" aria-label="Year" inputmode="numeric" maxlength="4" autocomplete="off"><button class="yrb" id="sdyb" type="button" data-sd="yinfo" aria-label="Where this year came from"><span class="pips" id="sdyp"></span><span class="yrs" id="sdys"></span></button></div><div class="yrl" id="sdyl" hidden></div></div></div>
    <div class="acts wrap" style="justify-content:center"><button class="lnk" data-sd="all" type="button">Find online</button><button class="lnk" data-sd="photo" type="button">Choose cover</button><button class="lnk" data-sd="more" type="button" aria-expanded="false">More</button></div>
    <div class="sdst" id="sdst" role="status"></div>
    <div id="sdmore" hidden>
      <div class="covs" id="covs"></div>
      <input class="inp" id="sdal" value="${esc(s.al || '')}" placeholder="Album" aria-label="Album" autocomplete="off">
      <textarea class="inp" id="sdly" placeholder="Lyrics" aria-label="Lyrics" autocomplete="off">${esc(sd.prev.ly)}</textarea>
      <div class="acts wrap" style="justify-content:center"><button class="lnk sm" data-sd="covers" type="button">More covers</button><button class="lnk sm" data-sd="lyr" type="button">Find lyrics</button><button class="lnk sm" data-sd="paste" type="button">Paste lyrics</button><button class="lnk sm" data-sd="cpall" type="button">Copy text</button><button class="lnk sm" data-sd="file" type="button">Save tagged copy</button>${s.o ? '<button class="lnk sm" data-sd="rest" type="button">Restore original</button>' : ''}${A.remove ? '<button class="lnk sm dng" data-sd="del" type="button">Remove from app</button>' : ''}</div>
    </div>
    <button class="pillbtn" data-sd="save" type="button" style="margin-top:8px">Save</button>
    <div class="acts"><button class="lnk" data-sd="x" type="button">Cancel</button></div>`, async e => {
    const b = e.target.closest('button'); if (!b || !sd) return; const k = b.dataset.sd; if (!k) return;
    if (k === 'x') { closePop(); return; }
    if (k === 'yinfo') { const l = $('#sdyl'); l.hidden = !l.hidden; return; }
    if (k === 'cpall') { copyText([sdv('sdt'), sdv('sda'), sdv('sdal'), sdv('sdly')].filter(Boolean).join('\n')); return; }
    if (k === 'more') { const m = $('#sdmore'), o = m.hidden; m.hidden = !o; b.setAttribute('aria-expanded', o); b.textContent = o ? 'Less' : 'More'; $('#pop').classList.toggle('tall', o); return; }
    if (k === 'paste') { try { const t = await navigator.clipboard.readText(); if (t) $('#sdly').value = t; } catch (x) { toast('Long-press the box and choose Paste'); $('#sdly').focus(); } return; }
    if (k === 'photo') { sdFile.click(); return; }
    if (k === 'allow') { S.net = true; saveS(); sdStatus('Allowed. Tap your choice again.'); return; }
    if (k === 'pick') { $$('.covs button').forEach(x => x.classList.toggle('sel', x === b)); sdCover(b.dataset.u || b.style.backgroundImage.slice(5, -2)); return; }
    const probe = () => ({ t: sdv('sdt'), a: sdv('sda'), d: s.d });
    if (k === 'covers') { if (!(await sdNet())) return; sdStatus('Looking for covers…'); try { const L = await Net.covers(probe()); sd.cands = L; $('#covs').innerHTML = L.map((u, i) => `<button type="button" data-sd="pick" aria-label="Cover ${i + 1}" style="background-image:url(${u})"></button>`).join(''); sdStatus(L.length ? 'Tap a cover to use it.' : 'No covers found. You can choose one from your photos.'); } catch (x) { sdStatus('Could not reach the service.'); } return; }
    if (k === 'lyr') { if (!(await sdNet())) return; sdStatus('Looking for lyrics…'); try { const t = await Net.lyrics(probe()); if (t) { $('#sdly').value = t; sdStatus('Lyrics found. Check them, then Save.'); } else sdStatus('No lyrics found. You can paste them.'); } catch (x) { sdStatus('Could not reach the service.'); } return; }
    if (k === 'all') {
      if (!(await sdNet())) return; sdStatus('Looking up details…');
      try {
        const r = await Net.find(probe());
        if (r) { $('#sdt').value = r.t; $('#sda').value = r.a || sdv('sda'); if (r.al) $('#sdal').value = r.al; if (r.yr && sd.ys !== 'me' && !(s.mn || '').split(',').includes('y') && !(sd.ys === 'tag' && s.y)) { $('#sdy').value = r.yr; sd.ys = 'online'; sd.yc = r.yc; sd.yv = r.yv; sd.yfound = true; sdYear(); } sd.found = { g: r.g, n: r.n }; if (r.art) sdCover(r.art); }
        sdStatus(r ? 'Details found. Looking for lyrics…' : 'No match for the details. Looking for lyrics…');
        const ly = await Net.lyrics({ t: sdv('sdt'), a: sdv('sda'), d: s.d }); if (ly) $('#sdly').value = ly;
        sdStatus((r || ly) ? 'Check the fields, then Save.' : 'Nothing found. Regional songs often are not listed.');
      } catch (x) { sdStatus('Could not reach the service.'); }
      return;
    }
    if (k === 'file') { const bl = await A.tagged(id); if (!bl) { toast('Only MP3 files can hold tags. Details stay in the app.'); return; } const u = URL.createObjectURL(bl), a = document.createElement('a'); a.href = u; a.download = s.f; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 8000); toast('Saved to your downloads'); return; }
    if (k === 'del') { closePop(); removeSong(id); return; }
    if (k === 'rest') { await A.revertMeta(id); closePop(); refreshLib(); toast('Original details restored'); return; }
    if (k === 'save') {
      const p = { t: sdv('sdt').trim() || s.t, a: sdv('sda').trim(), al: sdv('sdal').trim(), ly: sdv('sdly') }; if (sd.art) p.art = sd.art;
      { const yv = parseInt(sdv('sdy'), 10) || 0; if (yv !== (s.y || 0)) { p.y = yv; if (sd.yfound) { p.ys = 'online'; p.yc = sd.yc; p.yv = sd.yv; } } }
      if (sd.found) { if (sd.found.g && !s.g) p.g = sd.found.g; if (sd.found.n && !s.n) p.n = sd.found.n; }
      const prev = sd.prev, prevArt = cov; closePop();
      await A.setMeta(id, p); refreshLib(); if (tab === 'lib' && !stack.length) renderLib();
      toastUndo('Details saved', async () => { if (!prev.had) await A.revertMeta(id); else await A.setMeta(id, { t: prev.t, a: prev.a, al: prev.al, y: prev.y, ly: prev.ly, art: sd && sd.art ? prevArt : undefined }); refreshLib(); });
    }
  });
}
sdFile.addEventListener('change', async () => { const f = sdFile.files[0]; sdFile.value = ''; if (!f || !sd) return; const u = await A.thumb(f, 320); if (u) { sdCover(u); sdStatus('Cover chosen. Tap Save to keep it.'); } else sdStatus('That picture could not be read.'); });
function lyricsView() {
  const c = cur(); if (!c) return; const t = A.lyrics ? A.lyrics(c.id) : '';
  popup(`<h3>${esc(c.t)}</h3>${t ? `<div class="lyr">${esc(t)}</div>` : '<div class="sub">No lyrics yet.</div>'}<div class="acts wrap" style="justify-content:center;margin-top:12px"><button class="lnk" data-do="ed" type="button">${t ? 'Edit' : 'Add or find lyrics'}</button><button class="lnk" data-do="x" type="button">Close</button></div>`, e => { const d = e.target.dataset.do; if (!d) return; closePop(); if (d === 'ed') songSheet(c.id); }, true);
}
/* long-press anything with a song to open the editor */
function longPress(root, pick, fire) {
  let t = 0, x0 = 0, y0 = 0, hit = null;
  root.addEventListener('pointerdown', e => { const id = pick(e); if (!id) return; x0 = e.clientX; y0 = e.clientY; hit = id; clearTimeout(t); t = setTimeout(() => { t = 0; root._lp = Date.now(); if (navigator.vibrate && S.haptic) navigator.vibrate(12); fire(hit); }, 560); }, { passive: true });
  root.addEventListener('pointermove', e => { if (t && Math.hypot(e.clientX - x0, e.clientY - y0) > 9) { clearTimeout(t); t = 0; } }, { passive: true });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => root.addEventListener(ev, () => { clearTimeout(t); t = 0; }, { passive: true }));
  root.addEventListener('click', e => { if (root._lp && Date.now() - root._lp < 700) { e.stopPropagation(); e.preventDefault(); root._lp = 0; } }, true);
  root.addEventListener('contextmenu', e => { if (pick(e)) e.preventDefault(); });
}

/* ---------- favourites, bookmarks, listening panel ---------- */
const saveFav = () => store.set('mp_favs', [...favs]);
function favToggle(fromTap) {
  const c = cur(); if (!c) return;
  const on = !favs.has(c.id);
  if (fromTap && favs.has(c.id)) { heartPop(); return; }
  on ? favs.add(c.id) : favs.delete(c.id); if (on && window.Taste) Taste.like(c.id, 2); saveFav(); tick();
  if (on) heartPop(); toast(on ? 'Added to favourites' : 'Removed from favourites'); insPaint();
}
function heartPop() {
  const h = $('#heart'); if (!h || !M.p()) return;
  h.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.15)', offset: .35 }, { opacity: 1, transform: 'scale(.95)', offset: .6 }, { opacity: 0, transform: 'translateY(-34px) scale(.6)' }], { duration: 900, easing: 'cubic-bezier(.3,1.2,.5,1)' });
}
const saveMarks = () => store.set('mp_marks', marks);
function addMark() { const c = cur(); if (!c) return; marks.push({ id: c.id, pos: Math.round(st.pos), at: Date.now() }); saveMarks(); tick(); toast('Saved ' + fmt(st.pos) + ' in ' + c.t); }

/* ---------- bookmarks and chapters: the orb opens a small sheet with a note ---------- */
let bmPos = 0, bmKind = 'mark';
$('#app').insertAdjacentHTML('beforeend', `<div class="bmbg" id="bmbg"></div><div class="bms g" id="bms" role="dialog" aria-label="Bookmark" aria-hidden="true"><div class="bms-h"><div class="bms-t"><b id="bmst">Bookmark</b><span id="bmss"></span></div><button class="x" id="bmx" type="button" aria-label="Close">×</button></div><div class="chipsr" id="bmk" role="group" aria-label="Kind" hidden><button class="chp on" data-bmk="mark" type="button" aria-pressed="true">Bookmark</button><button class="chp" data-bmk="chapter" type="button" aria-pressed="false">Chapter</button></div><textarea id="bmn" rows="2" maxlength="240" placeholder="Add a note (optional)" aria-label="Note" enterkeyhint="done"></textarea><button class="pillbtn" id="bmsave" type="button">Save</button><div class="bms-l" id="bml"></div></div>`);
function bmList() {
  const id = curId, L = marks.map((m, i) => ({ m, i })).filter(x => x.m.id === id).sort((x, y) => x.m.pos - y.m.pos), el = $('#bml');
  el.innerHTML = L.length ? `<div class="bms-lh">Saved in this recording</div>` + L.map(x => `<div class="bmr${x.m.kind === 'chapter' ? ' ch' : ''}"><button class="bmg" data-bmgo="${x.i}" type="button"><span class="bt">${fmt(x.m.pos)}</span><span class="bn">${x.m.kind === 'chapter' ? '<em>Chapter</em> ' : ''}${esc(x.m.note || (x.m.kind === 'chapter' ? 'Untitled chapter' : 'Bookmark'))}</span></button><button class="x" data-bmrm="${x.i}" type="button" aria-label="Remove">×</button></div>`).join('') : '';
}
function bmOpen() {
  const c = cur(); if (!c) return; tick(); bmPos = Math.round(st.pos); bmKind = 'mark'; const sp = isSpoken(c);
  $('#bmst').textContent = (sp ? 'Bookmark at ' : 'Save this moment at ') + fmt(bmPos); $('#bmss').textContent = c.t; $('#bmk').hidden = !sp; $('#bmn').value = '';
  $$('[data-bmk]').forEach(b => { const on = b.dataset.bmk === 'mark'; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  bmList(); $('#bms').classList.add('open'); $('#bmbg').classList.add('open'); $('#bms').setAttribute('aria-hidden', 'false'); if (window.MOrb) MOrb.refresh();
}
function bmClose() { $('#bms').classList.remove('open'); $('#bmbg').classList.remove('open'); $('#bms').setAttribute('aria-hidden', 'true'); document.activeElement && document.activeElement.blur && document.activeElement.blur(); setTimeout(() => window.MOrb && MOrb.refresh(), 200); }
$('#bmx').addEventListener('click', () => { tick(); bmClose(); }); $('#bmbg').addEventListener('click', bmClose);
$('#bms').addEventListener('click', e => {
  const k = e.target.closest('[data-bmk]'); if (k) { tick(); bmKind = k.dataset.bmk; $$('[data-bmk]').forEach(b => { b.classList.toggle('on', b === k); b.setAttribute('aria-pressed', b === k); }); $('#bmn').placeholder = bmKind === 'chapter' ? 'Name this chapter' : 'Add a note (optional)'; return; }
  const g = e.target.closest('[data-bmgo]'); if (g) { const m = marks[+g.dataset.bmgo]; if (m) { tick(); A.seek(m.pos); bmClose(); } return; }
  const r = e.target.closest('[data-bmrm]'); if (r) { tick(); marks.splice(+r.dataset.bmrm, 1); saveMarks(); bmList(); }
});
$('#bmsave').addEventListener('click', () => { const c = cur(); if (!c) return; marks.push({ id: c.id, pos: bmPos, at: Date.now(), note: $('#bmn').value.trim(), kind: bmKind }); saveMarks(); tick(); toast(bmKind === 'chapter' ? 'Chapter saved at ' + fmt(bmPos) : 'Saved ' + fmt(bmPos) + ' in ' + c.t); bmClose(); });
$('#bmn').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#bmsave').click(); } });
setTimeout(() => {
  if (!window.MOrb) return;
  MOrb.init({
    pick: () => { const c = cur(); if (!c || tab !== 'play') return null; if (window.DJ && DJ.on) return null; if (ab && !ab.b && ab.id === curId) return { icon: 'loop', label: 'Set loop end', act: 'abend' }; return { icon: 'mark', label: isSpoken(c) ? 'Bookmark' : 'Save moment', act: 'bm' }; },
    hide: () => { const q = id => { const e = $(id); return e && e.classList.contains('open'); }; return $('#app').classList.contains('quiet') || q('#qsheet') || q('#bms') || q('#eds') || q('#pks') || q('#modes') || q('#volp') || !!$('#pop').offsetParent; },
    place: (o, t) => { const v = $('#vsw'), r = (v || $('#pnl')).getBoundingClientRect(), a = $('#app').getBoundingClientRect(), b = Math.max(96, Math.round(a.bottom - r.bottom - 14 + (v ? 0 : -12))); o.style.bottom = b + 'px'; t.style.bottom = (b + 62) + 'px'; t.style.right = '16px'; }
  });
  $('#morb').addEventListener('click', () => { if (!$('#morb').dataset.act) return; if ($('#morb').dataset.act === 'abend') { abStep(); tick(); } else bmOpen(); });
}, 0);
function playAt(id, pos) {
  if (curId === id) { A.seek(pos); A.play(); setTab('play'); return; }
  A.insertNext(JSON.stringify([id])); aloneId = id;
  setTimeout(() => { A.jump(st.index + 1); setTimeout(() => A.seek(pos), 450); setTab('play'); }, 120);
}
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
function setSpeed(r) { S.speed = r; saveS(); try { A.speed && A.speed(r); } catch (e) {} }
function listening() {
  const c = cur(), fav = c && favs.has(c.id);
  popup(`<h3>Listening</h3>
    <div class="s2 hint">Speed</div><div class="acts">${SPEEDS.map(r => `<button class="lnk${S.speed === r ? ' on' : ''}" data-sp="${r}" type="button" aria-pressed="${S.speed === r}">${r}×</button>`).join('')}</div>
    <div class="s2 hint" style="margin-top:12px">Sleep timer</div><div class="acts">${[15, 30, 60].map(m => `<button class="lnk" data-m="${m}" type="button">${m} min</button>`).join('')}${st.sleep > 0 ? '<button class="lnk" data-m="0" type="button">Off</button>' : ''}</div>
    <div class="acts" style="margin-top:14px"><button class="lnk" data-do="mark" type="button">Save this moment</button><button class="lnk" data-do="fav" type="button">${fav ? 'Remove favourite' : 'Add to favourites'}</button></div>
    <div class="acts" style="margin-top:12px"><button class="lnk" data-do="lyr" type="button">Lyrics</button><button class="lnk" data-do="edit" type="button">Edit details</button></div>
    <div class="acts" style="margin-top:12px"><button class="lnk" data-do="pwr" type="button">Power saving: ${S.pwr ? 'On' : 'Off'}</button></div>`, e => {
    const t = e.target.closest('button'); if (!t) return; const d = t.dataset;
    if (d.sp) { setSpeed(+d.sp); toast('Speed ' + d.sp + '×'); }
    else if (d.m !== undefined) { A.sleep(+d.m); toast(+d.m ? 'Music will fade in ' + d.m + ' minutes' : 'Sleep timer off'); }
    else if (d.do === 'mark') addMark();
    else if (d.do === 'fav') { favToggle(false); }
    else if (d.do === 'lyr') { closePop(); lyricsView(); return; }
    else if (d.do === 'pwr') { S.pwr = !S.pwr; saveS(); applyAll(); closePop(); toast(S.pwr ? 'Power saving on' : 'Power saving off'); return; }
    else if (d.do === 'edit') { closePop(); if (c) songSheet(c.id); return; }
    else return;
    tick(); closePop();
  });
}
const totalLen = L => { const m = Math.round(L.reduce((a, s) => a + (s.d || 0), 0) / 60000); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; };

/* ---------- online details (opt-in) ---------- */
let fnd = null, coverFor = -1;
const fileIn = document.createElement('input'); fileIn.type = 'file'; fileIn.accept = 'image/*'; fileIn.hidden = true; document.body.appendChild(fileIn);
const missing = () => songs().filter(s => !s.hk && !tried[s.id]);
function refreshLib() {
  let raw = []; try { raw = JSON.parse(A.library()); } catch (e) {}
  buildLib(raw); artCache.clear();
  const c = cur(); if (c) { curId = null; poll(); }
}
function openFind(list) {
  if (!list || !list.length) return;
  if (!navigator.onLine) { toast('You are offline. Try again later.'); return; }
  if (!S.net) {
    popup(`<h3>Look up details online?</h3><div class="sub">The app sends only the song title, artist and length to MusicBrainz (and Wikipedia, Deezer, TheAudioDB or iTunes for pictures). Never the audio. Nothing is saved until you accept it. Regional songs may not be found.</div><button class="pillbtn" data-do="ok" type="button">Allow and find</button><div class="acts"><button class="lnk" data-do="no" type="button">Not now</button></div>`, e => {
      const d = e.target.dataset.do; if (!d) return; closePop(); if (d === 'ok') { S.net = true; saveS(); runFind(list); }
    }); return;
  }
  runFind(list);
}
const frowHTML = (r, i) => {
  const s = r.s, n = r.r, o = r.on;
  const left = r.state === 'wait' ? `<div class="th" style="background:${artCss(s.f + s.a)}">${esc(initial(s.t))}</div>` : (r.art ? `<div class="th" style="background:center/cover url(${r.art})"></div>` : thHTML(s));
  let l1, l2, acts = '';
  if (r.state === 'wait') { l1 = esc(s.t); l2 = 'Waiting…'; }
  else if (r.state === 'busy') { l1 = esc(s.t); l2 = 'Looking…'; }
  else if (r.state === 'err') { l1 = esc(s.t); l2 = 'Could not reach the service'; }
  else { l1 = esc(r.t || s.t); l2 = n || r.edited ? `${esc(r.a || 'Unknown artist')}${r.al ? ' · ' + esc(r.al) : ''}${r.yr ? ' · ' + r.yr : ''}<br><span style="opacity:.7">Was: ${esc(s.t)}${s.a ? ' · ' + esc(s.a) : ''}</span>` : 'No match found'; }
  if (r.state === 'done' || r.state === 'err') {
    if (n || r.edited || r.art) acts += `<button class="sw${o ? ' on' : ''}" data-fsw="${i}" type="button" role="switch" aria-checked="${!!o}" aria-label="Accept for ${esc(s.t)}"><i></i></button>`;
    acts += `<button class="lnk sm" data-fcov="${i}" type="button">Cover</button><button class="lnk sm" data-fedit="${i}" type="button">Edit</button>`;
  }
  return `<div class="row fr" data-fr="${i}">${left}<div class="tx"><div class="rt1">${l1}</div><div class="rt2" style="white-space:normal">${l2}</div></div><div class="acts">${acts}</div></div>`;
};
function paintFind() {
  const box = $('#libbox'); if (!fnd) return;
  const done = fnd.rows.filter(r => r.state === 'done' || r.state === 'err').length, n = fnd.rows.filter(r => r.on).length;
  const sm = $('#fsum'); if (sm) sm.textContent = done < fnd.rows.length ? `Looking… ${done} of ${fnd.rows.length}` : `${n} of ${fnd.rows.length} ready to apply`;
  const ap = $('#fapply'); if (ap) { ap.textContent = n ? 'Apply ' + n : 'Nothing to apply'; ap.disabled = !n; }
}
function paintRow(i) {
  const el = $(`[data-fr="${i}"]`, $('#libbox')); if (!el) return;
  const t = document.createElement('div'); t.innerHTML = frowHTML(fnd.rows[i], i); el.replaceWith(t.firstElementChild);
  $$('.sw', $(`[data-fr="${i}"]`, $('#libbox'))).forEach(sw => { sw._k = M.knob(sw, sw.classList.contains('on')); });
  paintFind();
}
async function runFind(list) {
  const rows = list.slice(0, 40).map(s => ({ s, state: 'wait', on: false }));
  fnd = { rows, tok: Date.now() }; const tok = fnd.tok;
  page('Find details', `<div class="sub" id="fsum">Looking…</div><div class="centre" style="margin:12px 0"><button class="pillbtn" id="fapply" data-act="fapply" type="button" disabled>Nothing to apply</button><button class="lnk" data-act="fskip" type="button">Skip all</button></div><div class="hint">Only the title, artist and length are sent. Nothing changes until you apply, and you can undo it.</div><div class="list g" id="flist">${rows.map(frowHTML).join('')}</div>`);
  paintFind();
  for (let i = 0; i < rows.length; i++) {
    if (!fnd || fnd.tok !== tok) return;
    const r = rows[i]; r.state = 'busy'; paintRow(i);
    let res = null, bad = false;
    try { res = await Net.find({ t: r.s.t, a: r.s.a, d: r.s.d }); } catch (e) { bad = true; }
    if (!fnd || fnd.tok !== tok) return;
    if (!bad) { tried[r.s.id] = Date.now(); store.set('mp_tried', tried); }
    r.state = bad ? 'err' : 'done'; r.r = res;
    if (res) { r.t = res.t; r.a = res.a; r.al = res.al; r.art = res.art; r.yr = res.yr; r.g = res.g; r.n = res.n; r.yc = res.yc; r.yv = res.yv; r.on = true; }
    paintRow(i);
  }
}
async function applyFind() {
  if (!fnd) return; const picks = fnd.rows.filter(r => r.on); if (!picks.length) return;
  const ids = [];
  for (const r of picks) {
    const p = { t: r.t || r.s.t, a: r.a != null ? r.a : r.s.a };
    if (r.al) p.al = r.al; if (r.art) p.art = r.art;
    if (r.yr && (!r.s.y || r.s.ys === 'name' || r.s.ys === 'online')) { p.y = +r.yr; p.ys = 'online'; p.yc = r.yc; p.yv = r.yv; }
    if (r.g && !r.s.g) p.g = r.g; if (r.n && !r.s.n) p.n = r.n;
    if (await A.setMeta(r.s.id, p, 'auto')) ids.push(r.s.id);
  }
  fnd = null; refreshLib(); stack = []; renderLib();
  toastUndo(ids.length + (ids.length === 1 ? ' song updated' : ' songs updated'), async () => { for (const id of ids) await A.revertMeta(id); refreshLib(); if (tab === 'lib' && !stack.length) renderLib(); });
}
function editRow(i) {
  const r = fnd.rows[i], s = r.s;
  popup(`<h3>Edit details</h3><input class="inp" id="ft" value="${esc(r.t || s.t)}" aria-label="Title" autocomplete="off"><input class="inp" id="fa" value="${esc(r.a != null ? r.a : s.a)}" placeholder="Artist" aria-label="Artist" autocomplete="off"><button class="pillbtn" data-do="save" type="button">Use these</button><div class="acts"><button class="lnk" data-do="copy" type="button">Copy text</button><button class="lnk" data-do="no" type="button">Cancel</button></div>`, e => {
    const d = e.target.dataset.do; if (!d) return;
    if (d === 'copy') { copyText((sdv('ft') + (sdv('fa') ? ' - ' + sdv('fa') : '')).trim()); return; }
    if (d === 'save') { r.t = $('#ft').value.trim() || s.t; r.a = $('#fa').value.trim(); r.edited = true; r.on = true; r.state = 'done'; paintRow(i); }
    closePop();
  });
}
fileIn.addEventListener('change', async () => {
  const f = fileIn.files[0]; fileIn.value = ''; if (!f || !fnd || coverFor < 0) return;
  const u = await A.thumb(f, 320); if (!u) { toast('That picture could not be read'); return; }
  const r = fnd.rows[coverFor]; r.art = u; r.on = true; if (r.state !== 'done') r.state = 'done'; paintRow(coverFor);
});
function toastUndo(t, fn, lab, ms) {
  const e = $('#toast'); e.innerHTML = ''; e.append(t + ' ');
  const b = document.createElement('button'); b.className = 'lnk'; b.type = 'button'; b.textContent = lab || 'Undo'; b.onclick = () => { clearTimeout(toastT); e.classList.add('hid'); fn(); }; e.appendChild(b);
  e.classList.remove('hid'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.add('hid'), ms || 7000);
}

/* peek + queue sheet */
const NT = '<svg class="nt ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v8a3 3 0 003 3h9M14 11l4 4-4 4"/></svg>';
const EQ = '<svg class="eq" viewBox="0 0 24 24" fill="var(--acc2)" aria-hidden="true"><rect x="5" y="6" width="3.2" height="12" rx="1"><animate attributeName="height" values="12;5;12" dur="1.1s" repeatCount="indefinite"/><animate attributeName="y" values="6;9.5;6" dur="1.1s" repeatCount="indefinite"/></rect><rect x="10.4" y="6" width="3.2" height="12" rx="1"><animate attributeName="height" values="6;12;6" dur=".9s" repeatCount="indefinite"/><animate attributeName="y" values="9;6;9" dur=".9s" repeatCount="indefinite"/></rect><rect x="15.8" y="6" width="3.2" height="12" rx="1"><animate attributeName="height" values="10;4;10" dur="1.3s" repeatCount="indefinite"/><animate attributeName="y" values="7;10;7" dur="1.3s" repeatCount="indefinite"/></rect></svg>';
let qShown = 120;
function renderQueue() {
  const from = Math.max(0, st.index - 3), items = qIds.slice(from, from + qShown);
  $('#qlab').textContent = 'Up next · ' + ns(Math.max(0, qIds.length - st.index - 1));
  $('#qlist').innerHTML = items.map((id, k) => { const s = byId.get(id), i = from + k, c = i === st.index, sl = i > st.index && slip.has(id); return s ? `<div class="row${c ? ' cur' : ''}${sl ? ' slip' : ''}" data-q="${i}" role="button" tabindex="0"><i class="edge"></i>${thHTML(s)}<div class="tx"><div class="rt1">${esc(s.t)}</div><div class="rt2">${esc(sub(s))}</div></div>${c ? EQ : NT}<span class="gr" data-gr="${i}" aria-label="Drag to move ${esc(s.t)}" role="button" tabindex="-1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h14M5 15h14"/></svg></span><button class="x" data-rm="${i}" type="button" aria-label="Remove ${esc(s.t)} from queue"><svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>` : ''; }).join('') + (from + qShown < qIds.length ? `<div class="centre"><button class="lnk" data-act="moreq" type="button">Show more…</button></div>` : '');
  thumbs($('#qlist'));
}
function openQueue() { $('#qsheet').classList.add('open'); renderQueue(); }
function closeQueue() { $('#qsheet').classList.remove('open'); }

/* popup + toast */
let popH = null;
function popup(html, handler, cls) { $('#pop').classList.toggle('tall', !!cls); $('#pop').innerHTML = html; $('#pop').classList.remove('hid'); $('#scrim').classList.remove('hid'); popH = handler; }
function closePop() { $('#pop').classList.add('hid'); $('#scrim').classList.add('hid'); popH = null; }
let toastT;
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.remove('hid'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.add('hid'), 2200); }

/* ---------- events ---------- */
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerdown', e => { const b = e.target.closest('.sec,.tl,.rnd,.addb,.x,.pillbtn'); if (b) M.press(b); }, { passive: true });
$('#scrim').addEventListener('click', closePop);
$('#pop').addEventListener('click', e => popH && popH(e));
$$('.tabs button').forEach(b => b.addEventListener('click', () => { tick(); setTab(b.dataset.tab); }));
/* the sounds underneath follow the music's own pause and play at once, also from the lock screen, a headset or another app that takes the audio */
if (A && A.el) { ['pause', 'play', 'playing', 'ended'].forEach(k => A.el.addEventListener(k, () => { if (k !== 'pause' && bgm) { bgm = 0; bgPaint(); } bgSync(); })); }
/* play button.
   Short tap: plays or pauses everything (music, effects and the sounds underneath).
   Hold (Lofi only, plain hold): the music and effects stop, the sounds underneath go on (bgm 1). A short tap then pauses or plays just those sounds (bgm 2 is paused). Hold again: back to full Lofi.
   Hold and slide to a pill (Normal, Lofi, DJ): switches the mode. Setting 'pgest' A: hold and slide. B: double-tap, then hold and slide. */
let tapT = 0, plHold = 0, plLong = false, plOpen = false, plSel = '', plX = 0, plY = 0, lastUp = 0, dbl = false, preTap = false;
const bgOn = () => Object.values(getMix()).some(x => x.on && x.vol > 0);
function bgSync() { if (!(window.Fx && Fx.on)) { if (bgm) { bgm = 0; bgPaint(); } return; } Fx.hush(bgm === 1 ? false : bgm === 2 ? true : !!(A.el ? A.el.paused : !st.playing)); }
function bgPaint() { const b = $('#bplay'); b.classList.toggle('bgonly', bgm === 1); b.classList.toggle('bgpaused', bgm === 2); lastIc = null; if (typeof paintState === 'function' && st) paintState(); }
function bgEnter() {
  if (!(window.Fx && Fx.on)) return; if (!bgOn()) { toast('No sounds are on underneath. Choose some in Modes'); return; }
  bgm = 1; if (st.playing) A.pause(); bgSync(); bgPaint();
}
function bgExit() { bgm = 0; bgSync(); bgPaint(); if (!st.playing) A.play(); }
function bgToggle() { bgm = bgm === 1 ? 2 : 1; bgSync(); bgPaint(); }
const playTap = () => { if (bgm) { bgToggle(); return; } if (window.Fx && Fx.on) Fx.hush(false); if (!st.playing) A.play(); else A.pause(); };
function setMode(m) {
  const lo = !!(window.Fx && Fx.on), dj = !!(window.DJ && DJ.on);
  if (m === 'normal') { if (dj) djStop(); if (lo) lofiStop(); }
  else if (m === 'lofi') { if (!lo) lofiStart(); }
  else if (m === 'dj') { if (!dj) djStart(); }
}
function chooseOpen() {
  let c = $('#pmode'); const b = $('#bplay').getBoundingClientRect();
  if (!c) { $('#app').insertAdjacentHTML('beforeend', '<div id="pmode" aria-hidden="true"><b data-m="normal"><svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/></svg>Normal</b><b data-m="lofi"><svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/></svg>Lofi</b><b data-m="dj"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3.5v3M20.5 12h-3"/></svg>DJ</b></div>'); c = $('#pmode'); }
  const lo = !!(window.Fx && Fx.on), dj = !!(window.DJ && DJ.on), cm = dj ? 'dj' : lo ? 'lofi' : 'normal';
  $$('#pmode b').forEach(x => { x.classList.toggle('cur', x.dataset.m === cm); x.classList.remove('sel'); });
  c.style.left = (b.left + b.width / 2) + 'px'; c.style.top = (b.top - 18) + 'px'; void c.offsetWidth; c.classList.add('open'); plOpen = true; plSel = '';
}
function chooseMove(x, y) {
  let sel = ''; if (y < plY - 14) $$('#pmode b').forEach(p => { const r = p.getBoundingClientRect(); if (x >= r.left - 8 && x <= r.right + 8) sel = p.dataset.m; });
  if (sel !== plSel) { plSel = sel; $$('#pmode b').forEach(p => p.classList.toggle('sel', p.dataset.m === sel)); if (sel && navigator.vibrate && S.haptic) navigator.vibrate(6); }
}
function chooseClose() { const c = $('#pmode'); c && c.classList.remove('open'); plOpen = false; }
const pb = $('#bplay'); $('#djfull').addEventListener('click', e => { e.stopPropagation(); djFull(); });
pb.addEventListener('pointerdown', e => {
  try { pb.setPointerCapture(e.pointerId); } catch (x) {}
  plLong = false; clearTimeout(plHold); plX = e.clientX; plY = e.clientY; dbl = !!tapT; if (dbl) { clearTimeout(tapT); tapT = 0; }   /* a second press: the first tap no longer toggles */
  plHold = setTimeout(() => {
    plLong = true; if (navigator.vibrate && S.haptic) navigator.vibrate(12);
    if (!S.tapHold || dbl) chooseOpen();
    else if (window.Fx && Fx.on && !(window.DJ && DJ.on)) { if (bgm) bgExit(); else bgEnter(); }
  }, 520);
});
pb.addEventListener('pointermove', e => { if (plOpen) chooseMove(e.clientX, e.clientY); else if (Math.hypot(e.clientX - plX, e.clientY - plY) > 14) clearTimeout(plHold); });
const plEnd = e => {
  clearTimeout(plHold);
  if (!plOpen) return; const sel = plSel, B = !!S.tapHold; chooseClose();
  if (e.type === 'pointercancel') return;
  if (sel) { bgm = 0; bgSync(); bgPaint(); setMode(sel); }
  else if (!B && window.Fx && Fx.on && !(window.DJ && DJ.on)) { if (bgm) bgExit(); else bgEnter(); }   /* plain hold in Lofi */
};
['pointerup', 'pointercancel'].forEach(k => pb.addEventListener(k, plEnd));
pb.addEventListener('pointerleave', () => { if (!plOpen) clearTimeout(plHold); });
pb.addEventListener('contextmenu', e => e.preventDefault());
pb.addEventListener('click', () => {
  if (plLong) { plLong = false; return; }
  if (dbl) { dbl = false; tick(); window.muteToggle && muteToggle(); return; }                        /* tap, tap: mute or unmute */
  tick(); unzero(); if (C) C.tap(); clearTimeout(tapT); tapT = setTimeout(() => { tapT = 0; playTap(); }, 350);  /* a single tap waits a moment for a second one */
});
$('#mplay').addEventListener('click', e => { e.stopPropagation(); tick(); playTap(); });
$('#mini').addEventListener('click', () => morphToPlay());
let lp = 0;
function hold(btn, dir, tap) {
  let t = null;
  btn.addEventListener('pointerdown', () => { lp = 0; t = setTimeout(() => { lp = 1; tick(); A.seek(Math.max(0, st.pos + dir * 10000)); toast(dir > 0 ? '+10 s' : '−10 s'); }, 480); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, () => clearTimeout(t)));
  btn.addEventListener('click', () => { if (lp) { lp = 0; return; } tick(); tap(); });
}
hold($('#bnext'), 1, () => A.next()); hold($('#bprev'), -1, () => A.prev());
{ const td = $('#tdur'); td.setAttribute('role', 'button'); td.tabIndex = 0; td.setAttribute('aria-label', 'Time left or total');
  const sw = () => { S.rem = !S.rem; saveS(); tick(); paintState(); }; td.addEventListener('click', sw); td.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sw(); } }); }
$('#srnext').addEventListener('click', () => A.next());
$('#srprev').addEventListener('click', () => A.prev());
$('#alone').addEventListener('click', openQueue);
$('#lshuf').addEventListener('click', () => { tick(); A.shuffle(!st.shuffle); st.shuffle = !st.shuffle; paintState(); });
/* A-B repeat: press and hold the repeat button. First hold sets the start, second sets the end and loops that part, third clears */
let ab = null, abHold = 0, abLong = false, abT = 0;
function abStep() { if (window.DJ && DJ.on) return; const p = st.pos | 0;
  if (!ab) { ab = { a: p, b: 0, id: curId }; toast('Start set. Hold again for the end'); } else if (!ab.b) { if (p - ab.a < 2000) { toast('Pick an end a little later'); return; } ab.b = p; saveLoop(ab); toast('Looping this part. Hold to clear'); } else { ab = null; toast('Loop cleared'); }
  $('#lrep').classList.toggle('on', !!ab || st.repeat > 0); if (navigator.vibrate && S.haptic) navigator.vibrate(12); if (window.MOrb) MOrb.refresh(); }
const loops = store.get('mp_loops', []);
function saveLoop(x) { if (!x.id || !x.b) return; if (loops.some(l => l.id === x.id && Math.abs(l.a - x.a) < 3000 && Math.abs(l.b - x.b) < 3000)) return; loops.push({ id: x.id, a: x.a, b: x.b, at: Date.now() }); if (loops.length > 300) loops.shift(); store.set('mp_loops', loops); }
$('#lrep').addEventListener('pointerdown', () => { abLong = false; clearTimeout(abHold); abHold = setTimeout(() => { abLong = true; abStep(); }, 550); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(k => $('#lrep').addEventListener(k, () => clearTimeout(abHold)));
setInterval(() => { if (ab && ab.b) { if (curId !== ab.id) { ab = null; return; } if (st.playing && st.pos >= ab.b && Date.now() > abT) { abT = Date.now() + 1200; A.loopTo ? A.loopTo(ab.a) : A.seek(ab.a); } } }, 200);
$('#lrep').addEventListener('click', () => { if (abLong) { abLong = false; return; } tick(); const m = (st.repeat + 1) % 3; A.repeat(m); st.repeat = m; paintState(); });
$('#qopen').addEventListener('click', openQueue);
$('#qclose').addEventListener('click', closeQueue);
$('#sleepchip').addEventListener('click', listening);
/* queue: drag the grip to move a song; hold a row for Play next and Move to end */
(() => {
  const L = $('#qlist'); let d = null, dragEnd = 0, lpAt = 0;
  const rows = () => [...L.querySelectorAll('.row[data-q]')];
  L.addEventListener('pointerdown', e => {
    const g = e.target.closest('[data-gr]'); if (!g) return; const row = g.closest('.row'), rs = rows(), k = rs.indexOf(row); if (k < 0) return;
    e.preventDefault(); g.setPointerCapture(e.pointerId); const r = row.getBoundingClientRect(), r2 = rs[Math.min(rs.length - 1, k + 1)].getBoundingClientRect();
    d = { g, row, rs, k, y0: e.clientY, rh: Math.max(40, rs.length > 1 ? Math.abs((k + 1 < rs.length ? r2.top - r.top : r.top - rs[k - 1].getBoundingClientRect().top)) : r.height), to: k, sc: L.scrollTop, id: e.pointerId };
    row.classList.add('lift'); rs.forEach(x => { if (x !== row) x.style.transition = 'transform .28s cubic-bezier(.3,.8,.3,1)'; }); row.style.transition = 'box-shadow .25s'; if (navigator.vibrate && S.haptic) navigator.vibrate(8);
  });
  L.addEventListener('pointermove', e => {
    if (!d) return; const dy = e.clientY - d.y0 + (L.scrollTop - d.sc), n = d.rs.length; d.row.style.transform = `translateY(${dy}px) scale(1.02)`;
    const to = Math.max(0, Math.min(n - 1, d.k + Math.round(dy / d.rh))); if (to !== d.to) { d.to = to; d.rs.forEach((x, j) => { if (x === d.row) return; x.style.transform = d.k < to && j > d.k && j <= to ? `translateY(${-d.rh}px)` : d.k > to && j < d.k && j >= to ? `translateY(${d.rh}px)` : ''; }); tick(); }
    const lr = L.getBoundingClientRect(); if (e.clientY < lr.top + 36) L.scrollTop -= 6; else if (e.clientY > lr.bottom - 36) L.scrollTop += 6;
  });
  const done = e => {
    if (!d) return; const x = d, from = +x.row.dataset.q, to = +x.rs[x.to].dataset.q; d = null; dragEnd = Date.now();
    x.rs.forEach(r => { r.style.transform = ''; r.style.transition = ''; }); x.row.classList.remove('lift');
    if (e.type !== 'pointercancel' && from !== to) { A.move(from, to); toast('Moved'); }
  };
  L.addEventListener('pointerup', done); L.addEventListener('pointercancel', done);
  const closeM = () => { L.querySelectorAll('.qm').forEach(m => m.remove()); };
  longPress(L, e => { const r = e.target.closest('.row[data-q]'); return r && !e.target.closest('[data-gr],[data-rm]') ? r.dataset.q : null; }, i => {
    lpAt = Date.now(); closeM(); const row = L.querySelector(`.row[data-q="${i}"]`); if (!row) return; const m = document.createElement('div'); m.className = 'qm'; m.innerHTML = `<button type="button" data-qa="next" data-i="${i}">Play next</button><button type="button" data-qa="end" data-i="${i}">Move to end</button>`; row.after(m); void m.offsetWidth; m.classList.add('on');
  });
  L.addEventListener('click', e => { if (e.target.closest('[data-gr]') || Date.now() - dragEnd < 500) { e.stopPropagation(); e.preventDefault(); return; } if (Date.now() - lpAt < 700) return; const b = e.target.closest('[data-qa]'); if (b) { e.stopPropagation(); const i = +b.dataset.i; tick(); if (b.dataset.qa === 'next') A.move(i, i < st.index ? st.index : st.index + 1); else A.move(i, qIds.length - 1); toast(b.dataset.qa === 'next' ? 'Plays next' : 'Moved to the end'); closeM(); } else if (!e.target.closest('.qm')) closeM(); }, true);
})();
$('#qlist').addEventListener('click', e => {
  const rm = e.target.closest('[data-rm]'); if (rm) { tick(); A.removeAt(+rm.dataset.rm); return; }
  const q = e.target.closest('[data-q]'); if (q) { tick(); A.jump(+q.dataset.q); closeQueue(); return; }
  if (e.target.closest('[data-act="moreq"]')) { qShown += 200; renderQueue(); }
});
function unzero() { $('#bplay').classList.remove('zero'); }

/* scrubber: thickens under the finger */
(() => {
  const bar = $('#bar'); let lastTick = -1;
  const frac = e => { const r = bar.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
  const move = e => { const f = frac(e); Viz.prog = f; Viz.kick(); const _f = f, dur = st.dur || (cur() ? cur().d : 0); $('#barf').style.width = f * 100 + '%'; $('#knob').style.left = f * 100 + '%'; $('#tcur').textContent = fmt(f * dur); const t = Math.round(f * 10); if (t !== lastTick) { lastTick = t; tick(); } };
  bar.addEventListener('pointerdown', e => { dragging = true; bar.classList.add('drag'); bar.setPointerCapture(e.pointerId); move(e); });
  bar.addEventListener('pointermove', e => { if (dragging) move(e); });
  bar.addEventListener('pointercancel', () => { dragging = false; bar.classList.remove('drag'); });
  const end = e => { if (!dragging) return; const f = frac(e), dur = st.dur || (cur() ? cur().d : 0); dragging = false; bar.classList.remove('drag'); if (dur) { A.seek(Math.round(f * dur)); st.pos = f * dur; } };
  bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', () => { dragging = false; bar.classList.remove('drag'); });
  bar.addEventListener('keydown', e => { if (e.key === 'ArrowRight') A.seek(st.pos + 10000); if (e.key === 'ArrowLeft') A.seek(Math.max(0, st.pos - 10000)); });
})();

/* hero: swipe for next and back, tap for play and pause; the Companion looks where you swipe */
(() => {
  const h = $('#hero'); let x0 = null, y0 = 0;
  const isA = () => $('#v-play').dataset.mode === 'album';
  const tgt = () => isA() ? $('#coverbox') : $('#bigc');
  const jel = () => isA() ? $('#cover') : $('#bigc');
  let tapT = 0, tapW = 0;
  let vm = 0, v0 = 0, vh = null, vT = 0;
  const hud = () => { if (vh) return vh; vh = document.createElement('div'); vh.className = 'vhud'; vh.setAttribute('aria-hidden', 'true'); vh.innerHTML = '<output></output><i><b></b></i>'; h.appendChild(vh); return vh; };
  const hudSet = v => { const e = hud(); e.querySelector('output').textContent = v + '%'; e.querySelector('b').style.height = v + '%'; e.classList.add('on'); clearTimeout(vT); vT = setTimeout(() => e.classList.remove('on'), 1100); };
  h.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; vm = 0; h._q = $('#app').classList.contains('quiet'); x0 = e.clientX; y0 = e.clientY; h.setPointerCapture(e.pointerId); });
  h.addEventListener('pointermove', e => { if (x0 === null) return; const dx = e.clientX - x0;
    if (vm === 0) { const ay = Math.abs(e.clientY - y0); if (ay > 14 && ay > 1.6 * Math.abs(dx)) { vm = 1; v0 = S.vol; clearTimeout(h._lpT); } else if (Math.abs(dx) > 14) vm = -1; }
    if (vm === 1) { const v = window.volSwipe(v0 - (e.clientY - y0) / Math.max(160, h.clientHeight * .8) * 100); if (v !== h._lv) { h._lv = v; if (v % 5 === 0) tick(); } hudSet(v); return; } const t = tgt(); t.style.transition = 'none'; t.style.transform = `translateX(${Math.max(-70, Math.min(70, dx / 2.2))}px) rotate(${dx / 60}deg)`; if (C) C.look(dx / 90); });
  const end = e => { if (x0 === null) return; if (vm === 1) { vm = 0; x0 = null; h._lp = Date.now(); return; } const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null; const t = tgt(); t.style.transition = 'transform .55s cubic-bezier(.3,1.3,.5,1)'; t.style.transform = ''; setTimeout(() => { t.style.transition = ''; }, 600); if (C) C.look(0);
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { tick(); dx < 0 ? A.next() : A.prev(); M.jelly(jel(), dx < 0 ? -1 : 1, .08); }
    else if (h._q) { h._q = false; }
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && !(h._lp && Date.now() - h._lp < 700)) { const n = Date.now(); if (n - tapT < 320) { clearTimeout(tapW); tapT = 0; const on = el => { if (!el || !el.offsetParent || +getComputedStyle(el).opacity < .1 || getComputedStyle(el).display === 'none') return false; const r = el.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }; if (on($('#art125')) || on($('#coverbox')) || on($('#bigc'))) favToggle(true); else starShuffle(); } else { tapT = n; tapW = setTimeout(() => { tick(); playTap(); if (C) C.tap(); M.jelly(jel(), 1, .1); }, 300); } } };
  h.addEventListener('pointerup', end); h.addEventListener('pointercancel', () => { x0 = null; const t = tgt(); t.style.transition = ''; t.style.transform = ''; });
})();

longPress($('#hero'), e => (e.target.closest('button') ? null : curId), id => songSheet(id));
longPress($('#libbox'), e => { const r = e.target.closest('.th[data-id],.row[data-id]'); return r ? r.dataset.id : null; }, id => songSheet(id));
/* any cover, wherever it shows, opens the same editor on a long tap */
longPress($('#mrow'), e => { const r = e.target.closest('.mc[data-id]'); return r ? r.dataset.id : null; }, id => songSheet(id));
longPress($('#qsheet'), e => { const r = e.target.closest('.th[data-id],[data-id]'); return r ? r.dataset.id : null; }, id => songSheet(id));
longPress($('#mini'), e => curId, id => songSheet(id));
/* library and settings clicks */
$('#libbox').addEventListener('click', e => {
  const box = $('#libbox');
  const mr = e.target.closest('[data-mkrm]'); if (mr) { marks.splice(+mr.dataset.mkrm, 1); saveMarks(); tick(); marksPage(); return; }
  const mk = e.target.closest('[data-mk]'); if (mk) { const m = marks[+mk.dataset.mk]; if (m && byId.has(m.id)) { tick(); playAt(m.id, m.pos); } return; }
  const t = e.target.closest('button'); if (!t) return;
  if (smartClick(t, box)) return;
  if (t.dataset.inf) { tick(); toggleInf(t); return; }
  { const us = t.closest('[data-us]'); if (us) bumpUse(us.dataset.us); }
  if (t.dataset.lsr) { tick(); lsRange = t.dataset.lsr; $$('[data-lsr]', box).forEach(b => { const on = b.dataset.lsr === lsRange; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); $('#lschart').innerHTML = lsChart(box._ls); return; }
  if (t.dataset.seg) { const i = SEGS.findIndex(x => x[0] === t.dataset.seg); if (libSeg === t.dataset.seg) return; tick(); libSeg = t.dataset.seg; store.set('mp_seg', libSeg); segGo && segGo(i); setTimeout(renderLib, 300); return; }
  if (t.dataset.asort) { albSort = t.dataset.asort; tick(); renderLib(); return; }
  if (t.dataset.album) { tick(); albumPage(t.dataset.album); return; }
  if (t.dataset.artist) { tick(); artistPage(t.dataset.artist); return; }
  if (t.dataset.ul) { tick(); const l = userLists.find(x => x.id === t.dataset.ul); if (l) { const L = ulSongs(l); listPage(l.name, L, ns(L.length) + ' · ' + totalLen(L), true); $('#libbox').insertAdjacentHTML('beforeend', `<div class="centre" style="margin-top:18px"><button class="lnk sm" data-uldel="${l.id}" type="button">Delete this playlist</button></div>`); } return; }
  if (t.dataset.uldel) { const l = userLists.find(x => x.id === t.dataset.uldel); if (l) popup(`<h3>Delete “${esc(l.name)}”?</h3><div class="sub">Only the playlist goes. Your songs stay.</div><button class="pillbtn" data-do="go" type="button">Delete</button><div class="acts"><button class="lnk" data-do="no" type="button">Keep it</button></div>`, ev => { const k = ev.target.dataset.do; if (!k) return; closePop(); if (k === 'go') { userLists = userLists.filter(x => x.id !== l.id); saveULists(); stack.length = 0; libSeg = 'lists'; renderLib(); } }); return; }
  if (t.dataset.apedit) { tick(); const l = $('#plist2'); l.classList.toggle('edit'); t.textContent = l.classList.contains('edit') ? 'Done' : 'Edit'; return; }
  if (t.dataset.axr) { tick(); alxTouch(box._apk, t.dataset.axr, 'rm'); const s = byId.get(t.dataset.axr); apRefresh(); toast(s ? '“' + s.t + '” removed. Noted' : 'Removed', 2600); return; }
  if (t.dataset.axp) { tick(); alxTouch(box._apk, t.dataset.axp, 'pin'); apRefresh(); return; }
  if (t.dataset.apreset) { tick(); delete alx[box._apk]; delete alb[box._apk]; alxSave(); apRefresh(); toast('Back to automatic'); return; }
  if (t.dataset.apadd) {
    tick(); const b = $('#apaddbox'); if (!b.hidden) { b.hidden = true; return; } b.hidden = false;
    b.innerHTML = '<div class="apq"><input id="apq" type="search" placeholder="Search songs to add" autocomplete="off" aria-label="Search songs to add"></div><div class="list g" id="apres"></div>';
    const paint = () => { const q = $('#apq').value.trim().toLowerCase(), have = new Set((box._list || []).map(s => s.id)); const R = songs().filter(s => included(s.f) && !have.has(s.id) && (!q || (s.t + ' ' + sub(s)).toLowerCase().includes(q))).slice(0, 30); $('#apres').innerHTML = R.length ? R.map(s => `<button class="row" data-axa="${s.id}" type="button">${thHTML(s)}<div class="tx"><div class="rt1">${esc(s.t)}</div><div class="rt2">${esc(sub(s))}</div></div><span class="plus">Add</span></button>`).join('') : '<div class="sub" style="padding:12px">Nothing to add</div>'; thumbs(b); };
    $('#apq').addEventListener('input', paint); paint(); $('#apq').focus(); return;
  }
  if (t.dataset.axa) { tick(); alxTouch(box._apk, t.dataset.axa, 'add'); const s = byId.get(t.dataset.axa); apRefresh(); t.remove(); toast(s ? '“' + s.t + '” added. Noted' : 'Added', 2600); return; }
  if (t.dataset.ap) { tick(); autoPage(t.dataset.ap); return; }
  if (t.dataset.act === 'edart') { edOpen('artist', t.dataset.n); return; }
  if (t.dataset.act === 'edalb') { edOpen('album', t.dataset.n); return; }
  if (t.dataset.act === 'updart') { tick(); if (!S.net) { popup('<h3>Look up photos and details online?</h3><div class="sub">Only artist and album names are sent, to Wikipedia, MusicBrainz, TheAudioDB, Deezer and iTunes. Never your audio. After this, the Library keeps itself fresh in the background. You can turn that off in Settings. Anything you write or choose yourself is never replaced.</div><button class="pillbtn" data-do="ok" type="button">Allow</button><div class="acts"><button class="lnk" data-do="no" type="button">Not now</button></div>', ev => { const d = ev.target.dataset.do; if (!d) return; closePop(); if (d === 'ok') { S.net = true; saveS(); syncLib(true); } }); } else syncLib(true); return; }
  if (t.dataset.act === 'gkey') { tick(); popup(`<h3>Google pictures</h3><div class="sub">Use your own free Google Programmable Search key and search engine ID (image search on). The key stays on this phone and is sent only to Google. Leave both empty to switch it off.</div><input id="gk1" class="fld" placeholder="API key" value="${esc(S.gkey || '')}" autocomplete="off" style="font-size:16px"><input id="gk2" class="fld" placeholder="Search engine ID" value="${esc(S.gcx || '')}" autocomplete="off" style="font-size:16px;margin-top:8px"><button class="pillbtn" data-do="ok" type="button">Save</button><div class="acts"><button class="lnk" data-do="no" type="button">Cancel</button></div>`, ev => { const d = ev.target.dataset.do; if (!d) return; const a = ($('#gk1') || {}).value || '', b = ($('#gk2') || {}).value || ''; closePop(); if (d === 'ok') { S.gkey = a.trim(); S.gcx = b.trim(); saveS(); toast(S.gkey && S.gcx ? 'Google pictures on' : 'Google pictures off'); if (tab === 'set') { const f = stack.pop(); if (f) f(); else renderSet(); } } }); return; }
  if (t.dataset.act === 'pickpic') { const k = t.dataset.k, n = t.dataset.n; edKind = k; edName = n; const ar = k === 'album' && (albumMap().get(n) || [])[0] ? firstArtist(albumMap().get(n)[0]) : ''; pkOpen(k, n, ar === 'Unknown artist' ? '' : ar, d => setPhoto(k, n, d)); return; }
  if (t.dataset.act === 'artinfo') { tick(); const n = t.dataset.n; if (artInfo[n]) { artInfo[n].at = 0; artInfo[n].try = 0; } S.net ? syncLib(true, [n]).then(() => { if (stack.length) artistPage(stack.pop() && n); }) : toast('Allow online lookups in Settings first'); return; }
  if (t.dataset.fsw !== undefined) { const r = fnd.rows[+t.dataset.fsw]; r.on = !r.on; t.classList.toggle('on', r.on); t.setAttribute('aria-checked', r.on); t._k && t._k(r.on); tick(); paintFind(); return; }
  if (t.dataset.fcov !== undefined) { coverFor = +t.dataset.fcov; fileIn.click(); return; }
  if (t.dataset.fedit !== undefined) { editRow(+t.dataset.fedit); return; }
  if (t.dataset.col) { collection(t.dataset.col); return; }
  if (t.dataset.sort) { const L = box._list; if (L) { box._sort = t.dataset.sort; if (box._all) store.set('mp_ssort', box._sort); sortList(L, t.dataset.sort); if (box._paint) box._paint(); else { $('#plist2').innerHTML = L.slice(0, box._shown).map((s, i) => rowHTML(s, i)).join(''); thumbs($('#plist2')); } $$('[data-sort]', box).forEach(b => { b.classList.toggle('on', b === t); b.setAttribute('aria-pressed', b === t); }); tick(); } return; }
  if (t.dataset.folder) { const L = folders.get(t.dataset.folder).slice().sort((a, b) => a.t.localeCompare(b.t)); listPage(folderName(t.dataset.folder), L, null, false, true); return; }
  if (t.dataset.rc) { const s = byId.get(t.dataset.rc); if (s) choose([s], 0, s.t); return; }
  if (t.dataset.i !== undefined) { const L = box._list; if (L) choose(L, +t.dataset.i, L[+t.dataset.i].t); return; }
  const a = t.dataset.act; if (!a) return;
  if (a === 'addsongs') { A.pick(); }
  if (a === 'perm') { A.askPerm(); const iv = setInterval(() => { if (A.hasPerm()) { clearInterval(iv); loadLib(); } }, 700); }
  if (a === 'resume') { tick(); A.play(); morphToPlay(); }
  if (a === 'back') { tick(); fnd = null; const f = stack.pop(); f && f(); }
  if (a === 'folders') { const fl = likelyFolders(); page('Albums', `<div class="list g">${fl.map(f => `<button class="row" data-folder="${esc(f)}" type="button">${thHTML(folders.get(f)[0])}<div class="tx"><div class="rt1">${esc(folderName(f))}</div><div class="rt2">${ns(folders.get(f).length)}</div></div></button>`).join('')}</div>`); }
  if (a === 'all') { listPage('All songs', songs().slice().sort((x, y) => x.t.localeCompare(y.t))); }
  if (a === 'fapply') { applyFind(); return; }
  if (a === 'fskip') { fnd = null; tick(); const f = stack.pop(); f && f(); return; }
  if (a === 'finddo') { tick(); openFind(missing()); return; }
  if (a === 'findfolder') { tick(); openFind(box._list); return; }
  if (a === 'snooze') { snooze = Date.now() + 3 * 864e5; store.set('mp_snooze', snooze); tick(); renderLib(); return; }
  if (a === 'lis') { tick(); listenPage(); return; }
  if (a === 'biomore') { const b = $('#bio'); if (b) { const c = b.classList.toggle('clamp'); t.textContent = c ? 'Read more' : 'Show less'; } tick(); return; }
  if (a === 'shufall') { const L = box._list; if (L) { const s = L.slice(); for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } choose(s, null, 'Shuffle ' + s.length + ' songs'); } }
  if (a === 'playall') { const L = box._list; if (L) choose(L, null, 'Play all ' + L.length + ' songs'); }
  if (a === 'more400') { const L = box._list; box._shown += 400; $('#plist2').innerHTML = L.slice(0, box._shown).map((s, i) => rowHTML(s, i)).join(''); thumbs($('#plist2')); if (box._shown >= L.length) { box._paint ? (t.hidden = true) : t.remove(); } }
  if (a === 'search') {
    page('Search', `<div class="search g"><input id="q" type="search" placeholder="Search songs" autocomplete="off" enterkeyhint="search" aria-label="Search songs"></div><div id="res" class="list g"></div>`, bx => {
      const inp = $('#q', bx), res = $('#res', bx); let t0;
      inp.addEventListener('input', () => { clearTimeout(t0); t0 = setTimeout(() => {
        const q = inp.value.trim().toLowerCase(); if (!q) { res.innerHTML = ''; return; }
        const L = songs().filter(s => (s.t + ' ' + s.a + ' ' + folderName(s.f)).toLowerCase().includes(q)).slice(0, 80);
        bx._list = L; res.innerHTML = L.length ? L.map((s, i) => rowHTML(s, i)).join('') : '<div class="empty">Nothing found.</div>'; thumbs(res);
      }, 160); });
      setTimeout(() => inp.focus(), 250);
    });
  }
});
const dotJolt = el => { const d = el.querySelector('.d'); if (!d) return; const f = M.follow(-.6, v => { d.style.transform = `scale(${1 + v})`; }); f(0); };
$('#setbox').addEventListener('input', e => { const r = e.target.closest('[data-rng]'); if (!r) return; S[r.dataset.rng] = +r.value; if (r.dataset.rng === 'insf') insSong = ''; if (r.dataset.rng === 'lysz') document.documentElement.style.setProperty('--lysz', S.lysz + 'px'); const k = r.dataset.rng; if (k === 'djmin' && S.djmin > S.djmax - 10) S.djmax = S.djmin + 10; if (k === 'djmax' && S.djmax < S.djmin + 10) S.djmin = S.djmax - 10; if (k === 'djmin' || k === 'djmax') { const o = $(`[data-rng=${k === 'djmin' ? 'djmax' : 'djmin'}]`, $('#setbox')); if (o) o.value = S[k === 'djmin' ? 'djmax' : 'djmin']; } saveS(); applyAll(); if (window.Viz) Viz.kick(); });
$('#setbox').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.gn) { tick(); const L = songs().filter(s => (s.g || '').trim() === t.dataset.gn); listPage(t.dataset.gn, L, 'Genre · ' + ns(L.length) + ' · ' + totalLen(L), true); return; }
  if (t.dataset.dup) { tick(); removeSong(t.dataset.dup); setTimeout(() => renderSet(), 60); return; }
  if (t.dataset.undel) { tick(); A.restore([t.dataset.undel]).then(() => { afterLib(); toast('Brought back'); }); return; }
  if (t.dataset.act === 'emptytrash') { tick(); A.emptyTrash().then(() => { renderSet(); toast('Cleared'); }); return; }
  if (t.dataset.pg !== undefined) { tick(); goPg(t.dataset.pg); return; }
  if (t.dataset.rnd) { tick(); morphTo(rndCombo()); return; }
  if (t.dataset.srnd) { tick(); starMorph(rndStar()); return; }
  if (t.dataset.sfav) { S.sfav = S.sfav || {}; const l = (S.sfav[S.viz] = S.sfav[S.viz] || []), i = l.findIndex(c => sameStar(c)); if (i >= 0) { l.splice(i, 1); toast('Star look removed'); } else { l.push(Object.fromEntries(SK.map(k => [k, S[k]]))); toast('Star look saved'); } saveS(); tick(); sfavPaint(); return; }
  if (t.dataset.favv) {
    if (S.viz === 'none') { toast('Pick a visualiser first'); return; }
    S.vfav = S.vfav || {}; const l = (S.vfav[S.viz] = S.vfav[S.viz] || []), i = l.findIndex(c => sameCombo(c));
    if (i >= 0) { l.splice(i, 1); toast('Look removed'); } else { l.push(Object.fromEntries(VK.map(k => [k, S[k]]))); toast('Look saved'); }
    saveS(); tick(); favPaint(); return;
  }
  if (t.dataset.set) {
    const k = t.dataset.set; S[k] = t.dataset.v; saveS(); tick();
    $$(`[data-set="${k}"]`, $('#setbox')).forEach(b => { const on = b.dataset.v === S[k]; const pk = b.matches('.opt,.vt,.cs'); b.classList.toggle('sel', on && pk); b.classList.toggle('on', on && !pk); b.setAttribute('aria-pressed', on); });
    if (k === 'look') { const ln = $('#lookn'); if (ln) ln.textContent = LKN[S.look]; }
    applyAll(); return;
  }
  if (t.dataset.eqp) { const [l, m, h] = t.dataset.eqp.split(',').map(Number); S.eql = l; S.eqm = m; S.eqh = h; saveS(); applyAll(); renderSet(); return; }
  if (t.dataset.djp) { const [a, b] = t.dataset.djp.split(',').map(Number); S.djmin = a; S.djmax = b; saveS(); applyAll(); renderSet(); return; }
  if (t.dataset.bk === 'save') { try { S.lastbk = Date.now(); saveS(); const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('mp_')) o[k] = localStorage.getItem(k); } const im = {}; if (A.imgKeys) A.imgKeys().filter(k => /^a[rl]:/.test(k)).forEach(k => { const u = A.img(k); if (u) im[k] = u; }); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'rustams-music', v: 3, at: Date.now(), data: o, imgs: im, songs: songs().map(s => ({ id: s.id, f: s.fn, size: s.sz })) })], { type: 'application/json' })); a.download = 'rustams-music-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Backup saved'); } catch (e) { toast('Could not save the backup'); } return; }
  if (t.dataset.bk === 'load') { const f = document.createElement('input'); f.type = 'file'; f.accept = '.json,application/json'; f.onchange = async () => { try { const j = JSON.parse(await f.files[0].text()); if (j.app !== 'rustams-music' || !j.data) throw 0; Object.keys(j.data).forEach(k => { if (k.startsWith('mp_')) localStorage.setItem(k, j.data[k]); }); if (Array.isArray(j.songs)) localStorage.setItem('mp_idmap', JSON.stringify(j.songs)); for (const k of Object.keys(j.imgs || {})) if (/^a[rl]:/.test(k) && A.imgPut) await A.imgPut(k, j.imgs[k]); toast('Restored. Reopening'); setTimeout(() => location.reload(), 900); } catch (e) { toast('That file is not a backup'); } }; f.click(); return; }
  if (t.dataset.opn) { openModes(t.dataset.opn); return; }
  if (t.dataset.live !== undefined) { S.live = +t.dataset.live; saveS(); M.set(S.live); ROOT.dataset.live = S.live; $$('button', t.parentNode).forEach(b => { b.classList.toggle('on', b === t); b.setAttribute('aria-pressed', b === t); }); dotJolt(t); tick(); return; }
  if (t.dataset.cd !== undefined) { S.cd = +t.dataset.cd; saveS(); $$('button', t.parentNode).forEach(b => { b.classList.toggle('on', b === t); b.setAttribute('aria-pressed', b === t); }); dotJolt(t); tick(); paintMode(); return; }
  if (t.dataset.rip !== undefined) { S.rip = +t.dataset.rip; saveS(); $$('button', t.parentNode).forEach(b => { b.classList.toggle('on', b === t); b.setAttribute('aria-pressed', b === t); }); dotJolt(t); tick(); applyAll(); if (window.Viz) Viz.kick(); return; }
  if (t.dataset.act === 'tagall') { (async () => { let n = 0; for (const x of lib.filter(z => z.o)) { const bl = await A.tagged(x.id); if (!bl) continue; const u = URL.createObjectURL(bl), a = document.createElement('a'); a.href = u; a.download = x.f; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 8000); n++; await new Promise(r => setTimeout(r, 600)); } toast(n ? n + (n === 1 ? ' file' : ' files') + ' saved to your downloads' : 'No MP3 files with edits to save'); })(); return; }
  if (t.dataset.act === 'findnow') { setTab('lib'); const m = songs().filter(x => !x.o && (!x.hk || !x.a || !x.al)); if (!m.length) { toast('Every song already has its details'); return; } openFind(m); return; }
  if (t.dataset.act === 'restore') { popup(`<h3>Restore original details?</h3><div class="sub">Titles, artists and covers go back to what the files came with.</div><button class="pillbtn" data-do="go" type="button">Restore</button><div class="acts"><button class="lnk" data-do="no" type="button">Keep changes</button></div>`, async ev => { const d = ev.target.dataset.do; if (!d) return; closePop(); if (d === 'go') { for (const x of lib.filter(z => z.o)) await A.revertMeta(x.id); tried = {}; store.set('mp_tried', tried); refreshLib(); renderSet(); toast('Original details restored'); } }); return; }
  if (t.dataset.sxk) { const k = t.dataset.sxk; S.sx[k] = !S.sx[k]; saveS(); t.classList.toggle('on', S.sx[k]); t.setAttribute('aria-checked', S.sx[k]); t._k && t._k(S.sx[k]); tick(); applyAll(); return; }
  if (t.dataset.act === 'testsrc') { popup('<h3>Testing…</h3><div class="sub">One moment.</div>', e => e.target.dataset.do && closePop()); Net.test().then(L => popup(`<h3>Sources</h3>${L.map(x => `<div class="setrow"><div><div class="s1">${esc(x.name)}</div><div class="s2">${esc(x.note)}</div></div><span aria-label="${x.ok ? 'works' : 'not working'}" style="font-size:20px;color:${x.ok ? 'var(--acc2)' : 'var(--warn)'}">${x.ok ? '✓' : '✕'}</span></div>`).join('')}<div class="acts"><button class="lnk" data-do="x" type="button">Close</button></div>`, e => e.target.dataset.do && closePop())); return; }
  if (t.dataset.tback) { tick(); Taste.forgive(t.dataset.tback); toast('Back in your mix'); renderSet(); return; }
  if (t.dataset.tclr) { tick(); if (t._arm) { Taste.clear(); toast('Cleared'); renderSet(); } else { t._arm = 1; t.textContent = 'Tap again to clear'; setTimeout(() => { t._arm = 0; if (t.isConnected) t.textContent = 'Clear what it has learned'; }, 3500); } return; }
  if (t.dataset.tog) { const k = t.dataset.tog; S[k] = !S[k]; saveS(); if ((k === 'lrn' || k === 'lsv') && window.Taste) Taste.cfg(S.lrn, S.lsv); t.classList.toggle('on', S[k]); t.setAttribute('aria-checked', S[k]); t._k && t._k(S[k]); if (k === 'fade') A.fade(S.fade); if (k === 'norm') { if (curId) window.__lv(curId); window.__np && __np(); } tick(); applyAll(); return; }
  if (t.dataset.fold) { const f = t.dataset.fold, on = !included(f); S.on = S.on.filter(x => x !== f); S.off = S.off.filter(x => x !== f); (on ? S.on : S.off).push(f); saveS(); t.classList.toggle('on', on); t.setAttribute('aria-checked', on); t._k && t._k(on); tick(); return; }
  if (t.dataset.act === 'battery') { A.askBattery(); }
  if (t.dataset.rmf) { const f = t.dataset.rmf; popup(`<h3>Remove “${esc(folderName(f))}”?</h3><div class="sub">This only removes the copy kept inside this app. Your original files stay on the phone.</div><button class="pillbtn" data-do="rm" type="button">Remove ${folders.get(f) ? ns(folders.get(f).length) : ''}</button><div class="acts"><button class="lnk" data-do="keep" type="button">Keep them</button></div>`, ev => { const d = ev.target.dataset.do; if (!d) return; closePop(); if (d === 'rm') A.removeFolder(f).then(() => { window.__libChanged('Removed', true); }); }); }
});

/* ---------- 0.5: ratings, insights, playlists, heat, DJ and Lofi ---------- */
const rates = store.get('mp_rate', {}), saveRates = () => store.set('mp_rate', rates);
let userLists = store.get('mp_lists', []); const saveULists = () => store.set('mp_lists', userLists);
const heat = store.get('mp_heat', {}); let heatDirty = false; const saveHeat = () => { if (heatDirty) { store.set('mp_heat', heat); heatDirty = false; } };

/* ---------- duplicates and removing (only the app's own copy; the file on the phone is never touched) ---------- */
const MERGE_KEYS = ['mp_alx', 'mp_alb', 'mp_rate', 'mp_favs', 'mp_plays', 'mp_lists', 'mp_marks', 'mp_loops', 'mp_gain', 'mp_energy', 'mp_heat', 'mp_djf', 'mp_smart'];
function snapStores() { const o = {}; MERGE_KEYS.forEach(k => { try { o[k] = localStorage.getItem(k); } catch (e) {} }); return o; }
function putStores(o) { MERGE_KEYS.forEach(k => { try { if (o[k] == null) localStorage.removeItem(k); else localStorage.setItem(k, o[k]); } catch (e) {} }); }
function mergeInto(moves) {
  if (window.Taste) Taste.merge(moves);
  moves.forEach(({ from, to }) => {
    if (rates[from] != null) { rates[to] = Math.max(rates[to] || 0, rates[from]); delete rates[from]; }
    if (favs.has(from)) { favs.delete(from); favs.add(to); }
    plays.forEach(p => { if (p.id === from) p.id = to; });
    userLists.forEach(l => { l.ids = l.ids.map(i => i === from ? to : i).filter((i, k, r) => r.indexOf(i) === k); });
    marks.forEach(m => { if (m.id === from) m.id = to; }); loops.forEach(m => { if (m.id === from) m.id = to; });
    if (gains[from] != null) { if (gains[to] == null) gains[to] = gains[from]; delete gains[from]; }
    if (energy[from]) { const e = energy[to], f = energy[from]; energy[to] = e ? { s: e.s + f.s, n: e.n + f.n } : f; delete energy[from]; }
    if (heat[from]) { heat[to] = (heat[to] || 0) + heat[from]; delete heat[from]; }
    Object.values(alx).forEach(o => ['a', 'r', 'p'].forEach(f => { if (o[f]) o[f] = o[f].map(i => i === from ? to : i).filter((i, k, r) => r.indexOf(i) === k); }));
  });
  saveRates(); saveFav(); store.set('mp_plays', plays); saveULists(); saveMarks(); store.set('mp_loops', loops); store.set('mp_gain', gains); store.set('mp_energy', energy); store.set('mp_heat', heat); store.set('mp_alx', alx);
}
function reloadStores() { smartL = store.get('mp_smart', []); djf = store.get('mp_djf', {}); alx = store.get('mp_alx', {}); alb = store.get('mp_alb', {}); const r = store.get('mp_rate', {}); Object.keys(rates).forEach(k => delete rates[k]); Object.assign(rates, r); favs = new Set(store.get('mp_favs', [])); plays = store.get('mp_plays', []); userLists = store.get('mp_lists', []); marks = store.get('mp_marks', []); loops.length = 0; loops.push(...store.get('mp_loops', [])); }
function afterLib() { refreshLib(); if (tab === 'lib' && !stack.length) renderLib(); if (tab === 'set') renderSet(); }
let dedupBusy = false;
async function autoDedupe(quiet) {
  if (!A.dedupe || dedupBusy) return 0; dedupBusy = true;
  try {
    const snap = snapStores(), moves = JSON.parse(A.dedupe());
    if (!moves.length) return 0;
    mergeInto(moves); afterLib();
    if (!quiet) toastUndo(moves.length === 1 ? '1 duplicate removed' : moves.length + ' duplicates removed', async () => { await A.restore(moves.map(m => m.from)); putStores(snap); reloadStores(); afterLib(); toast('Brought back'); });
    return moves.length;
  } finally { dedupBusy = false; }
}
function removeSong(id) {
  const s = byId.get(id); if (!s || !A.remove) return;
  const snap = snapStores(); A.remove(id); afterLib();
  toastUndo('Removed “' + (s.t.length > 28 ? s.t.slice(0, 27) + '…' : s.t) + '”', async () => { await A.restore([id]); putStores(snap); reloadStores(); afterLib(); toast('Brought back'); });
}
/* one quiet pass in the background: fingerprints and genres, a song at a time, only while the app is in view */
let idxRun = false;
function indexSongs() {
  if (!A.index || idxRun) return; idxRun = true;
  const step = async () => {
    if (document.hidden) { setTimeout(step, 4000); return; }
    let left = 0; try { left = await A.index(2); } catch (e) { idxRun = false; return; }
    if (left > 0) { setTimeout(step, Power && Power.t === 'full' ? 1500 : 300); return; }
    idxRun = false; remapFromBackup(); const n = await autoDedupe(false); afterLib(); void n;
  };
  setTimeout(step, 2500);
}

/* ---------- what the app has learned ---------- */
function tastePage() {
  const R = Taste.report(byId), SL = ['after midnight', 'early morning', 'the morning', 'midday', 'the afternoon', 'the evening', 'the night', 'late at night'];
  const nm = id => { const s = byId.get(id); return s ? `<div class="s1">${esc(s.t)}</div><div class="s2">${esc(sub(s))}</div>` : ''; };
  const left = Math.max(0, 25 - R.plays), pat = [];
  if (R.stage === 0) pat.push(`It needs about ${left} more plays before it starts to guess.`);
  else {
    if (R.sk >= 5) pat.push(R.early / R.sk >= .5 ? 'You often move on within the first 30 seconds.' : R.early / R.sk <= .2 ? 'You usually give a song a fair chance before you skip it.' : 'Some songs you skip quickly, others you let run on.');
    if (R.best >= 0) pat.push(`You listen to whole songs most in ${SL[R.best]}.`);
    const q = R.sa[0] + R.sa[1] + R.sa[2]; if (q >= 3) pat.push(`Of ${q} quick questions you answered, ${R.sa[0]} were “Love it”.`);
    if (!pat.length) pat.push('Still learning. A few more days of listening will show patterns.');
  }
  const mx = Math.max(1, ...R.kb.slice(0, 12)), bars = R.kb.slice(0, 12).map((n, i) => `<i style="height:${Math.round(6 + 44 * n / mx)}px" title="${i * 10}–${i * 10 + 10} s: ${n}"></i>`).join('');
  return `<div class="tipbox tpbn"><div class="s1">Learning stays on this phone</div><div class="s2">The app watches how you listen: how soon you skip, what you play to the end, what you repeat, and when. It never sends anything out.</div></div>
  <h2 style="margin-top:16px">Learning</h2><div class="list g">${toggleRow('lrn', 'Learn from my listening', 'Shapes shuffle, DJ mode and the “For you now” list.')}${toggleRow('lsv', 'Ask a quick question now and then', 'Five seconds, after a whole song. Rare, and rarer if you ignore it.')}</div>
  <h2 style="margin-top:18px">So far</h2><div class="list g"><div class="setrow"><div><div class="s1">${['Just starting', 'Getting to know you', 'Well acquainted'][R.stage]}</div><div class="s2">${R.plays} listening sessions · ${ns(R.known)} seen</div></div></div>${pat.map(t => `<div class="setrow"><div class="s2" style="color:var(--fg)">${esc(t)}</div></div>`).join('')}</div>
  ${R.sk >= 3 ? `<h2 style="margin-top:18px">When you skip</h2><div class="list g"><div class="setrow" style="display:block"><div class="tpbar">${bars}</div><div class="tpax"><span>0 s</span><span>60 s</span><span>120 s</span></div><div class="s2" style="margin-top:6px">The sooner you skip, the longer a song rests.</div></div></div>` : ''}
  ${R.likes.length ? `<h2 style="margin-top:18px">Likes right now</h2><div class="list g">${R.likes.map(x => `<div class="setrow"><div style="min-width:0">${nm(x.id)}</div></div>`).join('')}</div>` : ''}
  ${R.rest.length ? `<h2 style="margin-top:18px">Resting for now</h2><div class="list g">${R.rest.map(x => `<div class="setrow"><div style="min-width:0">${nm(x.id)}<div class="s2">Back in ${Math.max(1, Math.ceil((x.until - Date.now()) / 864e5))} ${Math.ceil((x.until - Date.now()) / 864e5) <= 1 ? 'day' : 'days'}</div></div><button class="lnk sm" data-tback="${x.id}" type="button">Bring back</button></div>`).join('')}</div><div class="hfoot" style="text-align:left;padding:6px 4px 0">Choosing a song yourself also brings it back at once.</div>` : ''}
  <div class="list g" style="margin-top:18px"><div class="setrow"><div><div class="s1">Start again</div><div class="s2">Removes everything it has learned. Your songs and playlists stay.</div></div><button class="lnk sm dng" data-tclr="1" type="button">Clear what it has learned</button></div></div>`;
}
/* the 5-second question */
let svyT = 0;
function svyWatch() {
  if (!window.Taste) return; const id = Taste.canAsk(); if (!id) { catWatch(); return; }
  setTimeout(() => {
    const s = byId.get(id), pw = ROOT.dataset.power; if (!s || (pw && pw !== 'full' && pw !== 'rest') || document.hidden || $('#v-play').offsetHeight < 50) return;
    let b = $('#svy'); if (!b) { b = document.createElement('div'); b.id = 'svy'; b.className = 'tipbox'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Quick question'); document.body.appendChild(b); b.addEventListener('click', e => { const t = e.target.closest('[data-sa]'); if (t) svyEnd(+t.dataset.sa); const c = e.target.closest('[data-ca]'); if (c) catEnd(+c.dataset.ca); }); }
    b._id = id; b.innerHTML = `<div class="q">How was <b>${esc(s.t)}</b>?</div><div class="a"><button type="button" data-sa="0">Love it</button><button type="button" data-sa="1">Fine</button><button type="button" data-sa="2">Not now</button></div><i class="bar"></i>`;
    Taste.shown(); void b.offsetWidth; b.classList.add('on'); clearTimeout(svyT); svyT = setTimeout(() => svyEnd(-1), 5000);
  }, 1400);
}
/* when the app is unsure which list a song belongs in, it asks once, about the song you are hearing */
let alq = store.get('mp_alq', { t: 0, d: [], done: {} }), catT = 0, catQ = null;
const CATN = { calm: 'Calm', live: 'Lively', late: 'Late night', focus: 'Focus', asmr: 'ASMR' };
function catWatch() {
  if (S.lsv === false || !curId) return; const now = Date.now(); alq.d = (alq.d || []).filter(t => now - t < 864e5);
  if (now - alq.t < 4 * 36e5 || alq.d.length >= 3 || (window.Taste && Taste.get().g.n < 6)) return;
  autoLists(); const hit = DOUBT.find(d => d.id === curId && !alq.done[d.k + '|' + d.id]); if (!hit) return;
  const id = curId; setTimeout(() => {
    const s = byId.get(id), pw = ROOT.dataset.power; if (!s || curId !== id || (pw && pw !== 'full' && pw !== 'rest') || document.hidden || $('#v-play').offsetHeight < 50 || ($('#svy') && $('#svy').classList.contains('on'))) return;
    const inL = (autoLists().find(x => x.k === hit.k) || { list: [] }).list.some(y => y.id === id);
    let b = $('#svy'); if (!b) { b = document.createElement('div'); b.id = 'svy'; b.className = 'tipbox'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Quick question'); document.body.appendChild(b); b.addEventListener('click', e => { const t = e.target.closest('[data-sa]'); if (t) svyEnd(+t.dataset.sa); const c = e.target.closest('[data-ca]'); if (c) catEnd(+c.dataset.ca); }); }
    catQ = { k: hit.k, id, inL }; b._id = null; b.innerHTML = `<div class="q">Does <b>${esc(s.t)}</b> belong in <b>${CATN[hit.k]}</b>?</div><div class="a"><button type="button" data-ca="1">Yes</button><button type="button" data-ca="0">No</button><button type="button" data-ca="-1">Not sure</button></div><i class="bar" style="animation-duration:8s"></i>`;
    alq.t = Date.now(); alq.d.push(alq.t); alq.done[hit.k + '|' + id] = 1; store.set('mp_alq', alq); void b.offsetWidth; b.classList.add('on'); clearTimeout(svyT); svyT = setTimeout(() => catEnd(-1), 8000);
  }, 2500);
}
function catEnd(k) {
  const b = $('#svy'); if (!b || !b.classList.contains('on') || !catQ) return; clearTimeout(svyT); b.classList.remove('on'); const q = catQ; catQ = null;
  if (k === 1) { if (!q.inL) alxTouch(q.k, q.id, 'add'); else catLearn(q.k, byId.get(q.id), 1); alxSave(); toast('Noted. It belongs in ' + CATN[q.k]); }
  else if (k === 0) { if (q.inL) alxTouch(q.k, q.id, 'rm'); else catLearn(q.k, byId.get(q.id), -1); alxSave(); toast('Noted. Not in ' + CATN[q.k]); }
}
function svyEnd(k) { const b = $('#svy'); if (!b || !b.classList.contains('on')) return; clearTimeout(svyT); b.classList.remove('on'); Taste.answer(b._id, k); if (k === 2) toast('It will rest for a while'); else if (k === 0) toast('Noted'); }

function dupsPage() {
  let d = { exact: [], near: [], pending: 0 }, tr = []; try { d = JSON.parse(A.dups()); tr = JSON.parse(A.trashList()); } catch (e) {}
  const nm = id => { const s = byId.get(id); return s ? `<div class="s1">${esc(s.t)}</div><div class="s2">${esc(sub(s))} · ${fmt(s.d)} · ${esc(folderName(s.f))}</div>` : ''; };
  const near = d.near.map((g, gi) => `<div class="setrow dgrp" style="display:block"><div class="s2" style="margin-bottom:6px">Same title, different files</div>${g.map(id => `<div style="display:flex;align-items:center;gap:10px;justify-content:space-between;margin:6px 0"><div style="min-width:0">${nm(id)}</div><button class="lnk sm dng" data-dup="${id}" type="button">Remove</button></div>`).join('')}</div>`).join('');
  const days = t => Math.max(0, 7 - Math.floor((Date.now() - t) / 864e5));
  return `<h2>Duplicates</h2><div class="list g"><div class="setrow"><div><div class="s1">Exact copies</div><div class="s2">${d.pending ? 'Checking your songs quietly… ' + d.pending + ' to go.' : 'Identical files are removed by themselves. Plays, ratings, hearts and playlist places move to the copy you keep.'}</div></div></div></div>
  <h2 style="margin-top:18px">Look-alikes</h2><div class="list g">${near || '<div class="setrow"><div><div class="s2">No songs share a title right now.</div></div></div>'}</div>
  <div class="hfoot" style="text-align:left;padding:6px 4px 0">Only the app’s copy is removed. The file on your phone stays.</div>
  <h2 style="margin-top:18px">Recently removed</h2><div class="list g">${tr.length ? tr.map(t => `<div class="setrow"><div style="min-width:0"><div class="s1">${esc(t.t)}</div><div class="s2">${esc(t.a)} · ${days(t.rm)} days left</div></div><button class="lnk sm" data-undel="${t.id}" type="button">Restore</button></div>`).join('') + `<div class="setrow"><button class="lnk sm dng" data-act="emptytrash" type="button">Empty now</button></div>` : '<div class="setrow"><div><div class="s2">Nothing removed. Songs stay here for 7 days.</div></div></div>'}</div>`;
}

const partOf = h => h >= 5 && h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
const playsOf = id => plays.filter(p => p.id === id);
const ago = d => d < 1 ? 'today' : d < 2 ? 'yesterday' : d < 14 ? Math.floor(d) + ' days ago' : d < 60 ? Math.round(d / 7) + ' weeks ago' : Math.round(d / 30) + ' months ago';
function whenWords(t) {
  const n = new Date(), x = new Date(t), d0 = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - new Date(x.getFullYear(), x.getMonth(), x.getDate())) / 864e5), p = partOf(x.getHours());
  return d0 === 0 ? 'today, in the ' + (p === 'night' ? 'night' : p) : d0 === 1 ? 'yesterday ' + (p === 'night' ? 'night' : p) : ago((n - x) / 864e5);
}
function autoRate(id) { const L = playsOf(id).length, f = favs.has(id); if (!L && !f) return 0; return Math.max(1, Math.min(5, Math.round(2 + 1.1 * Math.log2(1 + L) + (f ? .8 : 0)))); }
const ratingOf = id => rates[id] ? { n: rates[id], by: 'you' } : { n: autoRate(id), by: 'auto' };
const LOSSLESS = ['flac', 'wav', 'alac', 'aiff', 'aif', 'ape', 'wv'];
function quality(s) {
  const sec = (s.d || 0) / 1000, kb = s.sz && sec ? s.sz * 8 / sec / 1000 : 0, ext = ((s.fn || '').split('.').pop() || '').toLowerCase(); if (!kb) return null;
  const k = LOSSLESS.includes(ext) ? (kb > 1500 ? 'hd' : 'cd') : kb < 128 ? 'low' : kb >= 310 ? 'hd' : 'cd';
  return { k, kb: Math.round(kb), ext: ext.toUpperCase() };
}
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z"/></svg>';
const FILEI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/></svg>';
const HEARTI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/></svg>';
const TIPS = [['Hold the cover', 'Press and hold the cover to edit tags, lyrics and the cover.'], ['Double-tap', 'Double-tap the cover to add a song to your favourites.'], ['Swipe the cover', 'Swipe it left or right for the next or the last song.'], ['Tap the moon', 'The moon sets a sleep timer, and saves a moment.']];
let insSeed = Math.random(), insFor = null, insHold = 0;
function suggestion(c) {
  const last = new Map(); plays.forEach(p => last.set(p.id, p.t)); const now = Date.now(), cs = [];
  songs().forEach(s => { if (s.id === c.id) return; const lt = last.get(s.id), r = ratingOf(s.id);
    if (!lt) cs.push({ s, w: 2, why: 'You have not heard this one yet' });
    else if (r.n >= 4 && now - lt > 21 * 864e5) cs.push({ s, w: 4, why: 'You like this. Last played ' + ago((now - lt) / 864e5) });
    else if (now - lt > 45 * 864e5) cs.push({ s, w: 1, why: 'Not played ' + ago((now - lt) / 864e5).replace(' ago', '') + ' ago' }); });
  if (!cs.length) return null; const tot = cs.reduce((a, x) => a + x.w, 0); let r = insSeed * tot; for (const x of cs) { r -= x.w; if (r <= 0) return x; } return cs[0];
}
function insCards(c) {
  const out = [], P = playsOf(c.id), hrs = new Array(24).fill(0); P.forEach(p => hrs[new Date(p.t).getHours()]++);
  const mx = Math.max(1, ...hrs), nowH = new Date().getHours();
  let l1, l2;
  if (!P.length) { l1 = 'Not played before'; l2 = 'This is its first listen'; }
  else { l1 = 'Last played ' + whenWords(P[P.length - 1].t); const top = {}; P.forEach(p => { const k = partOf(new Date(p.t).getHours()); top[k] = (top[k] || 0) + 1; }); const [k, v] = Object.entries(top).sort((a, b) => b[1] - a[1])[0];
    l2 = P.length < 3 ? ns(P.length).replace('song', 'play') : v / P.length >= .5 ? (k === 'night' ? 'You mostly play it late at night, in bed' : 'You mostly play it in the ' + k + 's') + ' · ' + P.length + ' plays' : 'Played ' + P.length + ' times, at all hours'; }
  out.push(`<div class="icard" data-go="next"><div class="hrs" aria-hidden="true">${hrs.map((v, i) => `<i class="${i === nowH ? 'now' : ''}" style="height:${Math.max(6, v / mx * 100)}%"></i>`).join('')}</div><div class="tx"><div class="k">When you listen</div><div class="v">${l1}</div><div class="v2">${l2}</div></div></div>`);
  const nx = byId.get(qIds[st.index + 1]), n = qIds.length, rest = qIds.slice(st.index).map(i => byId.get(i)).filter(Boolean);
  out.push(`<div class="icard" data-go="queue">${nx ? thHTML(nx) : ''}<div class="tx"><div class="k">${nx ? 'Next up' : 'Last in the queue'}</div><div class="v">${nx ? esc(nx.t) : 'Then the music rests'}</div><div class="v2">${st.index + 1} of ${n} · ${totalLen(rest)} left</div><div class="mbar" aria-hidden="true"><b style="width:${(st.index + 1) / n * 100}%"></b></div></div>${n > 1 ? '<button class="sm2" data-ins="saveq" type="button">Save queue</button>' : ''}</div>`);
  const sg = suggestion(c);
  if (sg) out.push(`<div class="icard">${thHTML(sg.s)}<div class="tx"><div class="k">You might enjoy</div><div class="v">${esc(sg.s.t)}</div><div class="v2">${esc(sg.why)}</div></div><button class="sm2" data-ins="pn" data-id="${sg.s.id}" type="button">Play next</button></div>`);
  const m = rates[c.id], au = autoRate(c.id);
  if (m && au && m !== au) out.push(`<div class="icard"><div class="stars auto" style="height:auto;flex:none;pointer-events:none"><span class="who" style="margin:0">${'★'.repeat(m)}</span></div><div class="tx"><div class="k">Your rating</div><div class="v">You gave it ${m} ${m === 1 ? 'star' : 'stars'}</div><div class="v2">Your listening says ${au}. ${m > au ? 'You like it more than you play it.' : 'You play it more than you rate it.'}</div></div><button class="sm2" data-ins="auto" type="button">Use auto</button></div>`);
  const wk = plays.filter(p => Date.now() - p.t < 7 * 864e5); if (wk.length > 2) { const cnt = {}; wk.forEach(p => cnt[p.id] = (cnt[p.id] || 0) + 1); const top = byId.get(Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0]); if (top) out.push(`<div class="icard" data-go="play" data-id="${top.id}">${thHTML(top)}<div class="tx"><div class="k">This week</div><div class="v">${esc(top.t)}</div><div class="v2">Your most played · ${wk.length} plays in 7 days</div></div></div>`); }
  const tp = TIPS[Math.floor(Date.now() / 864e5) % TIPS.length]; out.push(`<div class="icard" data-go="next"><div class="tx"><div class="k">Tip</div><div class="v">${tp[0]}</div><div class="v2" style="white-space:normal">${tp[1]}</div></div></div>`);
  return out;
}

/* the info card appears on a share of songs set by the slider (0 never ... 6 always); when it is hidden, the lyrics take its place */
const INSP = [0, .15, .3, .5, .7, .85, 1]; let insOn = true, insSong = '';
function insDecide(force) { const c = cur(); if (!c) return; if (!force && insSong === c.id) return; insSong = c.id; const p = INSP[Math.max(0, Math.min(6, S.insf === undefined ? 6 : S.insf))]; insOn = p >= 1 ? true : p <= 0 ? false : Math.random() < p; lyrPaint(); $('#app').classList.toggle('noins', !insOn); }
let lyrFor = '', lyrTx = '';
function lyrText(id) { const t = A.lyrics ? A.lyrics(id) : ''; return String(t || '').replace(/^\s*\[[^\]]*\]\s*/gm, '').replace(/\n{3,}/g, '\n\n').trim(); }
let rowKey = '', rowRaf = 0;
function rowFade() { const sc = $('#msc'); if (!sc) return; const mid = sc.scrollLeft + sc.clientWidth / 2; sc.querySelectorAll('.mc').forEach(e => { const d = Math.abs(e.offsetLeft + e.offsetWidth / 2 - mid) / 52; e.style.opacity = Math.max(.2, 1 - d * .2).toFixed(2); }); }
function rowCentre(smooth) { const sc = $('#msc'), cu = sc && sc.querySelector('.cur'); if (!cu) return; const x = cu.offsetLeft + cu.offsetWidth / 2 - sc.clientWidth / 2; sc.scrollTo({ left: x, behavior: smooth && M.p() ? 'smooth' : 'auto' }); }
function rowPaint(force) {
  const c = cur(), sc = $('#msc'), ph = $('#mph'); if (!sc) return; const key = c ? c.id + ':' + qIds.length + ':' + st.index : ''; if (!force && key === rowKey) return; const first = !rowKey; rowKey = key;
  if (!c) { sc.innerHTML = ''; ph.textContent = ''; return; }
  const lo = Math.max(0, st.index - 30), hi = Math.min(qIds.length - 1, st.index + 30), o = [];
  for (let k = lo; k <= hi; k++) { const id = qIds[k]; if (byId.get(id)) o.push(`<button class="th mc${k === st.index ? ' cur' : ''}" type="button" data-q="${k}" data-id="${id}" style="background:${CDBG}" aria-label="${k === st.index ? 'Playing now' : k < st.index ? 'Played earlier: ' : 'Play next: '}${esc(byId.get(id).title || '')}"></button>`); }
  sc.innerHTML = o.join(''); thumbs(sc);
  const pl = st.index, ah = Math.max(0, qIds.length - 1 - st.index); ph.textContent = `${pl} played · ${ah} ahead`;
  rowCentre(!first); rowFade();
}
$('#msc') && ($('#msc').addEventListener('scroll', () => { if (!rowRaf) rowRaf = requestAnimationFrame(() => { rowRaf = 0; rowFade(); }); }, { passive: true }), $('#msc').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (!b) return; const k = +b.dataset.q; if (k === st.index) return; tick(); A.jump(k); }));
let artFor = '';
function artPaint() { const c = cur(), a = $('#art125'); if (!a) return; const id = c ? c.id : ''; if (artFor !== id) { artFor = id; a.innerHTML = c ? `<div class="th" data-id="${id}" style="background:${CDBG}"></div>` : ''; if (c) thumbs(a); } }
function lyrPaint() {
  const c = cur(), box = $('#qly'); if (!box) return; const app = $('#app'), quiet = app.classList.contains('quiet'), was = app.classList.contains('haslyr');
  const has = c ? lyrText(c.id) : '', lv = S.lv || 'auto';
  const t = c && (lv === 'lyrics' || (lv === 'auto' && (!quiet || !insOn))) ? has : ''; const on = !!t;
  if (lyrFor !== (c ? c.id : '') || lyrTx !== t) { lyrFor = c ? c.id : ''; lyrTx = t; $('#qlyt').textContent = t; $('#qlyt').style.transform = ''; }
  app.classList.toggle('haslyr', on); artPaint();
  const vs = $('#vsw'); if (vs) { vs.dataset.sel = on ? 'lyrics' : 'cover'; vs.dataset.m = lv === 'auto' ? '' : '1'; vs.dataset.nl = has ? '' : '1'; }
  lyrScroll();
}

/* cover / lyrics capsule: tap chooses, long tap goes back to automatic */
(() => {
  const vs = $('#vsw'); if (!vs) return; let lt = 0, lng = false;
  vs.addEventListener('pointerdown', () => { lng = false; clearTimeout(lt); lt = setTimeout(() => { lng = true; if (S.lv !== 'auto') { S.lv = 'auto'; saveS(); lyrFor = '\u0000'; lyrPaint(); } toast('Cover and lyrics: automatic'); if (navigator.vibrate) navigator.vibrate(8); }, 520); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(e => vs.addEventListener(e, () => clearTimeout(lt)));
  vs.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || lng) { lng = false; return; }
    const c = cur(), v = b.dataset.v;
    if (v === 'lyrics' && !(c && lyrText(c.id))) { toast('No lyrics for this song'); return; }
    S.lv = v; saveS(); tick(); lyrFor = '\u0000'; lyrPaint();
  });
  vs.addEventListener('contextmenu', e => e.preventDefault());
})();
function lyrScroll() { if (!$('#app').classList.contains('haslyr')) return; const box = $('#qly'), tx = $('#qlyt'), over = Math.max(0, tx.offsetHeight - box.clientHeight + 24), dur = st.dur || (cur() ? cur().d : 0), f = dur ? Math.min(1, st.pos / dur) : 0; tx.style.transform = `translateY(${(-over * f).toFixed(1)}px)`; }
setInterval(() => { if (window.Power && !Power.live()) return; const c = cur(); if (c && (lyrFor !== c.id || artFor !== c.id)) lyrPaint(); rowPaint(); lyrScroll(); }, 700); addEventListener('resize', () => $('#app').style.setProperty('--lyh', Math.round($('#v-play').offsetHeight * .56) + 'px'));
function insPaint() {
  const c = cur(); const box = $('#ins'); if (!c || !box) return;
  const q = quality(c), r = ratingOf(c.id), f = favs.has(c.id), ext = ((c.fn || '').includes('.') ? c.fn.split('.').pop() : '').toUpperCase().slice(0, 4);
  $('#chips').innerHTML = `${ext ? `<span class="chip" title="File format">${FILEI}${esc(ext)}</span>` : ''}${q ? `<span class="chip"><span class="qb ${q.k === 'hd' ? 'hq' : q.k === 'low' ? 'lo' : ''}" aria-label="${{ low: 'Low quality', cd: 'CD quality', hd: 'HD quality' }[q.k]}, ${q.kb} kilobits per second">${q.k.toUpperCase()}</span>${q.kb}k</span>` : ''}<button class="heartb${f ? ' on' : ''}" data-ins="fav" type="button" aria-pressed="${f}" aria-label="Favourite">${HEARTI}</button><span class="chip">${st.index + 1} of ${qIds.length}</span>`;
  let stars = `<div class="stars${r.by === 'auto' ? ' auto' : ''}" role="radiogroup" aria-label="Rating, ${r.by === 'auto' ? 'automatic' : 'yours'}">`;
  for (let i = 1; i <= 5; i++) stars += `<button type="button" role="radio" aria-checked="${r.n === i}" data-star="${i}" aria-label="${i} ${i === 1 ? 'star' : 'stars'}" class="${i <= r.n ? 'f' : ''}">${STAR}</button>`;
  const sb = $('#starbox') || (() => { const d = document.createElement('div'); d.id = 'starbox'; d.style.flex = 'none'; $('#chips').after(d); return d; })();
  sb.innerHTML = stars + `<span class="who">${r.n ? (r.by === 'auto' ? 'Auto' : 'Yours') : 'Rate'}</span></div>`;
  const cards = $('#cards'), keep = insFor === c.id ? insIdx : 0;
  cards.innerHTML = insCards(c).join(''); thumbs(cards); insFor = c.id; insShow(keep); insMarquee();
}
/* when the song changes, the whole card fades out, changes while hidden, and fades back in */
let insFade = 0;
function insPaintSoft() { const box = $('#ins'); if (!box) return; if ($('#app').classList.contains('quiet')) { const was = insOn; insDecide(false); if (insOn !== was) { insPaint(); return; } } if (!box.querySelector('.icard') || !$('#app').classList.contains('quiet')) { insPaint(); return; } clearTimeout(insFade); box.classList.add('chg'); insFade = setTimeout(() => { insPaint(); requestAnimationFrame(() => box.classList.remove('chg')); }, 520); }
let insIdx = 0;
function insShow(i) { const cs = $('#cards').children, n = cs.length; if (!n) return; insIdx = (i % n + n) % n; [...cs].forEach((c, k) => c.classList.toggle('on', k === insIdx)); $('#idots').innerHTML = Array.from({ length: n }, (_, k) => `<i class="${k === insIdx ? 'on' : ''}"></i>`).join(''); }
/* long lines drift from right to left, then fade and begin again */
function insMarquee() {
  $$('#cards .v, #cards .v2').forEach(el => { if (!el.firstElementChild || !el.firstElementChild.matches('span.mqs')) el.innerHTML = '<span class="mqs">' + el.innerHTML + '</span>'; el.classList.add('mqw'); const sp = el.firstElementChild; sp.style.animation = 'none'; const over = sp.scrollWidth - el.clientWidth; el.classList.toggle('run', over > 3);
    if (over > 3) { sp.style.setProperty('--mq', -(over + 10) + 'px'); sp.style.animation = ''; sp.style.animationDuration = (5 + over / 24) + 's'; } });
}
(() => { const c = $('#cards'); let x0 = null; c.addEventListener('pointerdown', e => { x0 = e.clientX; insHold = Date.now(); });
  c.addEventListener('pointerup', e => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) insShow(insIdx + (dx < 0 ? 1 : -1)); }); c.addEventListener('pointercancel', () => { x0 = null; }); })();
setInterval(() => { if (window.Power && Power.t !== 'full') return; if (!$('#app').classList.contains('quiet') || Date.now() - insHold < 14000) return; insShow(insIdx + 1); }, 9000);
$('#ins').addEventListener('click', e => {
  const t = e.target.closest('button'); const c = cur(); if (!t) { const g = e.target.closest('[data-go]'); if (!g || !c) return; tick(); if (g.dataset.go === 'queue') { wake(); openQueue(); } else if (g.dataset.go === 'play' && byId.get(g.dataset.id)) startList([byId.get(g.dataset.id)], 0); else insShow(insIdx + 1); insHold = Date.now(); return; } if (!c) return;
  if (t.dataset.star) { const n = +t.dataset.star; tick(); if (rates[c.id] === n) { delete rates[c.id]; toast('Back to the automatic rating'); } else rates[c.id] = n; saveRates(); insPaint(); const b = $(`[data-star="${n}"]`, $('#ins')); if (b && M.p()) { b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 600); } return; }
  const a = t.dataset.ins; if (a === 'fav') { favToggle(false); }
  if (a === 'auto') { delete rates[c.id]; saveRates(); tick(); insPaint(); }
  if (a === 'pn') { tick(); A.insertNext(JSON.stringify([t.dataset.id])); toast('Plays next'); }
  if (a === 'saveq') { saveQueue(); }
});
function saveQueue() {
  const d = new Date(), nm = 'Queue · ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  popup(`<h3>Save the queue</h3><div class="sub">${ns(qIds.length)}, kept as a playlist in Library.</div><input class="inp" id="plname" value="${esc(nm)}" aria-label="Playlist name" maxlength="40" style="margin:12px 0"><button class="pillbtn" data-do="go" type="button">Save playlist</button><div class="acts"><button class="lnk" data-do="no" type="button">Not now</button></div>`, ev => { const k = ev.target.dataset.do; if (!k) return; const v = ($('#plname') || {}).value; closePop(); if (k === 'go') { const name = (v || nm).trim() || nm; userLists.unshift({ id: 'u' + Date.now(), name, ids: qIds.slice(), at: Date.now() }); saveULists(); toast('Saved “' + name + '”'); } });
}
function ulSongs(l) { return l.ids.map(i => byId.get(i)).filter(Boolean); }
/* what you replay: seconds of listening per five-second slice of each song */
let hLast = -1, prevSleep = 0;
setInterval(() => {
  if (window.DJ && DJ.on) { hLast = -1; if (prevSleep > 0 && st.sleep === 0) DJ.stop(); prevSleep = st.sleep || 0; return; } prevSleep = st.sleep || 0;
  bgSync();
  if (!st.playing || !curId) { hLast = -1; return; }
  const p = st.pos / 1000; if (hLast >= 0 && p > hLast && p - hLast < 2.6) { const a = heat[curId] || (heat[curId] = []), b = Math.floor(p / 5); a[b] = (a[b] || 0) + 1; heatDirty = true; } hLast = p;
}, 1000);
setInterval(saveHeat, 30000); ['pagehide', 'visibilitychange'].forEach(e => addEventListener(e, saveHeat));
if (window.DJ) {
  DJ.cfg.pool = () => songs().filter(s => s.d > 30000 && (S.djspeech || !isSpoken(s))).map(s => { const n = playsOf(s.id).length, r = rates[s.id] || 0; return { id: s.id, t: s.t, a: s.a, d: s.d / 1000, w: (1 + 1.3 * Math.log2(1 + n) + (S.djfav && favs.has(s.id) ? 2 : 0) + (r >= 4 ? 1.5 : 0)) * (window.Taste ? Taste.wx(s.id) : 1) }; });
  try { const h = store.get('mp_djhist', null); if (h && h.sec) DJ.hist = h; } catch (e) {}
  DJ.cfg.save = h => store.set('mp_djhist', h);
  DJ.cfg.loops = id => loops.filter(l => l.id === id && l.b - l.a >= 4000).map(l => [l.a / 1000, (l.b - l.a) / 1000]);
  DJ.cfg.heat = id => { const a = (heat[id] || []).slice(); marks.filter(m => m.id === id).forEach(m => { const b = Math.floor(m.pos / 5000); a[b] = (a[b] || 0) + 4; }); return a; };
  DJ.onchange = () => { djPaint(); modesPaint(); };
}
/* while the DJ plays, the main player is parked: its buttons steer the DJ instead */
['play', 'pause', 'next', 'prev', 'seek'].forEach(k => { const f = A[k]; if (!f) return; A[k] = (...a) => { if (window.DJ && DJ.on) { if (k === 'play') return DJ.pause(false); if (k === 'pause') return DJ.pause(true); if (k === 'next') return DJ.skip(); return; } return f.apply(A, a); }; });
window.onDJHeard = id => { if (!id) return; const o = djf[id] || { n: 0 }; djf[id] = { n: o.n + 1, t: Date.now() }; store.set('mp_djf', djf); };
function djFull() {
  const t = window.DJ && DJ.on && DJ.now; if (!t) return; const id = t.id; tick(); djStop(); if (window.Taste) Taste.manual();
  const ids = qIds.slice(); let i = ids.indexOf(id); if (i < 0) { i = Math.min(ids.length, Math.max(0, st.index + 1)); ids.splice(i, 0, id); }
  setTimeout(() => A.setQueue(JSON.stringify(ids), i, 0, true), 120);
}
function djPaint() {
  const fb = $('#djfull'); if (fb) { const on2 = !!(window.DJ && DJ.on && DJ.now); fb.classList.toggle('show', on2); fb.parentNode.classList.toggle('djon', on2); fb.tabIndex = on2 ? 0 : -1; if (on2) { const sg = byId.get(DJ.now.id), d = sg ? sg.d / 1000 : 0, g = $('#djseg'); if (d > 0) { const a = Math.max(0, Math.min(1, DJ.now.s / d)), l = Math.max(.04, Math.min(1 - a, DJ.now.l / d)); g.style.left = (a * 100) + '%'; g.style.width = (l * 100) + '%'; } } }
  const on = !!(window.DJ && DJ.on); applyColours(); $('#djb').classList.toggle('on', on); $('#djb').setAttribute('aria-pressed', on);
  if (on && DJ.now) { const t = DJ.now; $('#title').textContent = t.t; $('#artist').textContent = t.a || 'DJ mode'; $('#from').textContent = 'DJ mode'; getArt(t.id, 512).then(u => { setCover(u, byId.get(t.id) || { t: t.t }); }); }
  else if (!on && cur()) { const s = cur(); $('#title').textContent = s.t; $('#artist').textContent = sub(s); $('#from').textContent = 'Playing from ' + folderName(s.f); getArt(s.id, 512).then(u => setCover(u, s)); }
}
function lofiPaint() { const on = !!(window.Fx && Fx.on); applyColours(); $('#lofib').classList.toggle('on', on); $('#lofib').setAttribute('aria-pressed', on); document.documentElement.dataset.lofi = on ? 'on' : 'off'; }
const SPOKEN = /audio ?book|podcast|lecture|speech|bayan|bayaan|sermon|khutba|khutbah|tafs[ie]r|tilawat|recitation|quran|qur.an|episode|chapter|interview|\bdars\b|voice|ncert|talk|story|kahani/i;
const isSpoken = s => s.d > 15 * 60000 || SPOKEN.test([s.t, s.a, s.al, s.p, s.fn].join(' '));
function djStart() {
  if (!songs().filter(s => s.d > 30000 && (S.djspeech || !isSpoken(s))).length) { toast(S.djspeech ? 'Add a few songs first' : 'No music found. Lectures and audiobooks are skipped'); return; }
  if (songs().length < 3) toast('DJ mode sounds best with three songs or more');
  DJ.opt.min = S.djmin; DJ.opt.max = S.djmax; DJ.opt.xf = S.djxf; Fx.on && lofiStop(); tick();
  DJ.start().then(ok => { if (!ok) toast('DJ mode could not start'); else toast('DJ mode on'); djPaint(); modesPaint(); applyAll(); });
}
function djStop() { DJ.stop(); setTimeout(() => { djPaint(); modesPaint(); }, 0); tick(); }
function lofiStart() {
  if (!cur()) { toast('Pick a song first'); return; } const wasDJ = DJ.on; if (wasDJ) djStop();
  if (!Fx.start()) { toast('Lofi mode is not available here'); return; } bgm = 0; lofiApply(); ambSync(); Fx.sleep(S.lsleep); Fx.onSleepEnd = () => { lofiStop(); A.pause(); toast('Good night'); }; lofiPaint(); modesPaint(); tick(); if (wasDJ || !st.playing) A.play(); toast('Lofi mode on');
}
function lofiStop() { bgm = 0; bgPaint(); Fx.mix({}, {}); Fx.stop(); lofiPaint(); modesPaint(); tick(); }
function lofiApply() { if (window.Fx) Fx.set({ slow: S.lslow, rev: S.lrev, echo: S.lech, warm: S.lwarm, vol: S.lvol, mus: S.lmus, fx: S.lfx, keep: S.lkeep }); }
/* DJ and Lofi toggles: a tap switches the mode on or off; a long tap opens its screen */
function modeBtn(id, isOn, start, stop, screen) {
  const b = $(id); let lt = 0, lng = false;
  b.addEventListener('pointerdown', () => { lng = false; clearTimeout(lt); lt = setTimeout(() => { lng = true; if (navigator.vibrate) navigator.vibrate(10); openModes(screen); }, 520); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(e => b.addEventListener(e, () => clearTimeout(lt)));
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('click', () => { if (lng) { lng = false; return; } b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); if (isOn()) stop(); else start(); });
}
modeBtn('#djb', () => DJ.on, djStart, djStop, 'dj');
modeBtn('#lofib', () => Fx.on, lofiStart, lofiStop, 'lofi');
/* the Modes screen */
const MX = [['soft', 'Soft rain', '<path d="M7 16a4 4 0 010-8 5 5 0 019.6 1A3.5 3.5 0 0116 16z"/><path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2"/>'], ['heavy', 'Heavy rain', '<path d="M7 14a4 4 0 010-7 5 5 0 019.6 1A3.5 3.5 0 0116 14z"/><path d="M8 17l-1.5 4M12 17l-1.5 4M16 17l-1.5 4M10 21l.5-1M14 21l.5-1"/>'], ['thunder', 'Distant thunder', '<path d="M7 15a4 4 0 010-7 5 5 0 019.6 1A3.5 3.5 0 0116 15z"/><path d="M12 12l-2 4h3l-2 4"/>'], ['crickets', 'Night crickets', '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>'], ['birds', 'Morning birds', '<path d="M3 11c3 0 6-1 9-5 3 4 6 5 9 5M7 16c2 0 3-1 5-3 2 2 3 3 5 3"/>']];
const MIXES = { rainy: ['Rainy night', { soft: 55, thunder: 40, crickets: 30 }], storm: ['Storm', { heavy: 60, thunder: 60 }], dawn: ['Dawn', { birds: 55, soft: 25 }], night: ['Quiet night', { crickets: 55 }], none: ['Silence', {}] };
const getMix = () => Object.fromEntries(MX.map(x => [x[0], { on: !!S['mxo_' + x[0]], vol: +S['mxv_' + x[0]] || 0 }]));
const getDrift = () => ({ on: !!S.adn, min: S.admin, max: S.admax, pace: S.adp });
function ambSync() { if (window.Fx && Fx.on) Fx.mix(getMix(), getDrift()); }
const SLEEPS = [[0, 'Off'], [30, '30 min'], [60, '1 hour'], [90, '90 min'], [120, '2 hours']];
let modesTab = 'dj', modesGo = null;
function ensureModes() {
  if ($('#modes')) return;
  $('#app').insertAdjacentHTML('beforeend', `<div id="modes" role="dialog" aria-label="DJ and Lofi" aria-modal="true"><div class="mh"><h1 style="font-size:30px;margin:0">Modes</h1><button class="lnk" data-md="close" type="button">Done</button></div><div class="seg g" role="tablist"><i class="spill"></i><button type="button" role="tab" data-md="dj">DJ</button><button type="button" role="tab" data-md="lofi">Lofi</button></div><div id="mbody"></div></div>`);
  modesGo = M.pill($('#modes .seg'), $('#modes .spill'), $$('#modes .seg button'), 0, 3);
  $('#modes').addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return; const a = t.dataset.md, amb = t.dataset.amb;
    if (t.dataset.mxt) { const k = 'mxo_' + t.dataset.mxt; S[k] = !S[k]; saveS(); tick(); t.classList.toggle('on', S[k]); t.setAttribute('aria-checked', S[k]); t._k && t._k(S[k]); t.closest('.mixr').classList.toggle('on', S[k]); ambSync(); return; }
    if (t.dataset.mxp) { const p = MIXES[t.dataset.mxp][1]; MX.forEach(x => { S['mxo_' + x[0]] = p[x[0]] !== undefined; if (p[x[0]] !== undefined) S['mxv_' + x[0]] = p[x[0]]; }); saveS(); tick(); ambSync(); modesPaint(); return; }
    if (t.dataset.adp) { S.adp = t.dataset.adp; saveS(); tick(); ambSync(); modesPaint(); return; }
    if (t.dataset.adn) { S.adn = !S.adn; saveS(); tick(); t.classList.toggle('on', S.adn); t.setAttribute('aria-checked', S.adn); t._k && t._k(S.adn); const dm = t.closest('.setrow').nextElementSibling; dm && dm.classList.toggle('dim', !S.adn); ambSync(); return; }
    if (t.dataset.sl !== undefined) { S.lsleep = +t.dataset.sl; saveS(); tick(); if (Fx.on) Fx.sleep(S.lsleep); modesPaint(); return; }
    if (a === 'close') { closeModes(); } else if (a === 'dj' || a === 'lofi') { if (modesTab !== a) { modesTab = a; tick(); modesGo(a === 'dj' ? 0 : 1); modesPaint(); } }
    else if (a === 'djgo') { djStart(); } else if (a === 'djstop') { djStop(); } else if (a === 'djskip') { tick(); DJ.skip(); }
    else if (a === 'lfgo') { lofiStart(); } else if (a === 'lfstop') { lofiStop(); }
    else if (a === 'set') { closeModes(); setTab('set'); setTimeout(() => { const h = $('#dj-set'); h && h.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 450); }
  });
  $('#modes').addEventListener('input', e => { const r = e.target.closest('[data-rng]'); if (!r) return; S[r.dataset.rng] = +r.value; saveS(); lofiApply(); });
}
function openModes(tab) { ensureModes(); modesTab = tab || modesTab; modesGo(modesTab === 'dj' ? 0 : 1); modesPaint(); $('#modes').classList.add('open'); if (window.Power) Power.touch(); clearTimeout(quietT); $('#app').classList.remove('quiet'); qbFree(); }
function closeModes() { const m = $('#modes'); m && m.classList.remove('open'); armQuiet(); if (window.Power) Power.eval(); }
function modesPaint() {
  const m = $('#modes'); if (!m) return; const b = $('#mbody'); if (!b) return;
  $$('#modes .seg button').forEach(x => x.setAttribute('aria-selected', x.dataset.md === modesTab));
  if (modesTab === 'dj') {
    const on = DJ.on, t = DJ.now, nx = DJ.next;
    b.innerHTML = `<div class="dsc${on && !DJ.paused ? ' spin' : ''}"><b></b><b></b><i></i></div><div class="centre"><div class="sub" style="max-width:300px;margin:0 auto">Plays the parts of your songs you return to, and blends them with slow crossfades. It keeps going until you stop it. Experimental.</div></div>` +
      (on && t ? `<div class="list g" style="margin-top:16px"><div class="nowrow">${thHTML(byId.get(t.id) || { id: t.id })}<div class="tx" style="min-width:0;flex:1"><div class="lab">Now</div><div class="rt1">${esc(t.t)}</div><div class="rt2">${fmt(t.s * 1000)} for ${t.l} s${t.a ? ' · ' + esc(t.a) : ''}</div></div></div><div style="padding:0 16px 12px"><div class="secbar"><b id="secb"></b></div></div></div>` +
        (nx ? `<div class="list g" style="margin-top:12px"><div class="nowrow">${thHTML(byId.get(nx.id) || { id: nx.id })}<div class="tx" style="min-width:0;flex:1"><div class="lab">Next</div><div class="rt1">${esc(nx.t)}</div><div class="rt2">from ${fmt(nx.s * 1000)} for ${nx.l} s</div></div></div></div>` : '') +
        `<button class="pillbtn mbtn" data-md="djskip" type="button">Skip to next</button><div class="centre"><button class="lnk" data-md="djstop" type="button">Stop DJ mode</button></div>` : `<button class="pillbtn mbtn" data-md="djgo" type="button">Start DJ mode</button>`) +
      `<div class="centre sub" style="margin-top:14px">Sections ${S.djmin} to ${S.djmax} s · Crossfade ${S.djxf} s · <button class="lnk sm" data-md="set" type="button">Change</button></div>`;
    thumbs(b);
  } else {
    const on = Fx.on;
    b.innerHTML = `<div class="dsc${on ? ' spin' : ''}" style="${on ? '' : ''}"><b></b><b></b><i style="${on ? 'animation-duration:24s' : ''}"></i></div><div class="centre"><div class="sub" style="max-width:300px;margin:0 auto">Slowed down, softened, with reverb and echo, and a quiet natural sound underneath.</div></div>` +
      `<h2>Volumes</h2><div class="list g">${[['lmus', 'Music'], ['lfx', 'Effects (reverb and echo)'], ['lvol', 'All sounds underneath']].map(x => `<div class="setrow rng"><div><div class="s1">${x[1]}</div><input type="range" min="0" max="100" step="5" value="${S[x[0]]}" data-rng="${x[0]}" aria-label="${x[1]} volume"></div></div>`).join('')}</div>` +
      `<h2>Sound mixer</h2><div class="chipsr" role="group" aria-label="Mixes">${Object.keys(MIXES).map(k => `<button type="button" class="chp" data-mxp="${k}">${MIXES[k][0]}</button>`).join('')}</div><div class="list g">${MX.map(x => `<div class="mixr${S['mxo_' + x[0]] ? ' on' : ''}"><div class="mh2"><svg viewBox="0 0 24 24" aria-hidden="true">${x[2]}</svg><div class="s1">${x[1]}</div><button class="sw${S['mxo_' + x[0]] ? ' on' : ''}" data-mxt="${x[0]}" type="button" role="switch" aria-checked="${!!S['mxo_' + x[0]]}" aria-label="${x[1]}"><i></i></button></div><div class="setrow rng"><div><div class="s1">Volume</div><input type="range" min="0" max="100" step="5" value="${S['mxv_' + x[0]]}" data-rng="mxv_${x[0]}" aria-label="${x[1]} volume"></div></div></div>`).join('')}</div>` +
      `<h2>Let the sounds drift</h2><div class="list g"><div class="setrow"><div><div class="s1">Drift by itself</div><div class="s2">Each sound slowly rises and falls on its own, so no two moments are the same.</div></div><button class="sw${S.adn ? ' on' : ''}" data-adn="1" type="button" role="switch" aria-checked="${!!S.adn}" aria-label="Drift by itself"><i></i></button></div><div class="${S.adn ? '' : 'dim'}">${[['admin', 'Quietest'], ['admax', 'Loudest']].map(x => `<div class="setrow rng"><div><div class="s1">${x[1]}</div><input type="range" min="0" max="100" step="5" value="${S[x[0]]}" data-rng="${x[0]}" aria-label="${x[1]} level"></div></div>`).join('')}<div class="s2" style="padding:4px 16px 0">Pace</div><div class="chipsr" role="group" aria-label="Pace" style="padding:6px 12px 12px">${[['slow', 'Slow'], ['medium', 'Medium'], ['lively', 'Lively'], ['wander', 'Wander']].map(p => `<button type="button" class="chp${S.adp === p[0] ? ' on' : ''}" data-adp="${p[0]}" aria-pressed="${S.adp === p[0]}">${p[1]}</button>`).join('')}</div></div></div>` +
      `<h2>Sleep</h2><div class="list g"><div class="setrow"><div><div class="s2" style="margin:0">The music softens and darkens, then fades out. The natural sounds stay a little longer, then fade too.</div></div></div><div class="chipsr" role="group" aria-label="Sleep time" style="padding:4px 12px 14px">${SLEEPS.map(s => `<button type="button" class="chp${S.lsleep === s[0] ? ' on' : ''}" data-sl="${s[0]}" aria-pressed="${S.lsleep === s[0]}">${s[1]}</button>`).join('')}</div>${on && S.lsleep ? `<div class="setrow"><div class="s2" id="slleft" style="margin:0">${Math.ceil(Fx.sleepLeft() / 60000)} minutes left</div></div>` : ''}</div>` +
      (on ? `<button class="pillbtn mbtn" data-md="lfstop" type="button">Stop Lofi mode</button>` : `<button class="pillbtn mbtn" data-md="lfgo" type="button">Start Lofi mode</button>`) +
      `<div class="centre sub" style="margin-top:14px">Slowdown ${S.lslow}% · Reverb ${S.lrev} · Echo ${S.lech} · <button class="lnk sm" data-md="set" type="button">Change</button></div>`;
  }
  $$('.sw', b).forEach(sw => { sw._k = M.knob(sw, sw.classList.contains('on')); });
}
setInterval(() => { const sl = $('#slleft'); if (sl && window.Fx) { const m = Math.ceil(Fx.sleepLeft() / 60000); sl.textContent = m ? m + (m === 1 ? ' minute left' : ' minutes left') : ''; } }, 5000);
setInterval(() => { if (window.Power && !Power.live()) return; const sb = $('#secb'); if (sb && DJ.on) sb.style.width = (DJ.progress() * 100) + '%'; }, 300);
const ulHTML = () => userLists.length ? `<h2>Yours</h2><div class="list g" style="margin-bottom:12px">${userLists.map(l => { const L = ulSongs(l); return `<button class="row" data-ul="${l.id}" type="button"><div class="stk">${L.slice(0, 2).map(thHTML).join('')}</div><div class="tx"><div class="rt1">${esc(l.name)}</div><div class="rt2">${ns(L.length)}</div></div></button>`; }).join('')}</div>` : '';

/* ---------- Smart playlists (0.25): the screens; the rules live in smart.js ---------- */
const smSave = () => store.set('mp_smart', smartL);
function smCtx() {
  const now = Date.now(), lastP = new Map(), cnt = new Map(), tod = new Map(), day = new Map(), NONE = new Set();
  plays.forEach(p => { if (p.t > (lastP.get(p.id) || 0)) lastP.set(p.id, p.t); cnt.set(p.id, (cnt.get(p.id) || 0) + 1); (tod.get(p.id) || tod.set(p.id, new Set()).get(p.id)).add(p.b); (day.get(p.id) || day.set(p.id, new Set()).get(p.id)).add(dayOf(p.t)); });
  let AL = null, lr = null; const fc = {}, tg = window.Taste && Taste.on() ? Taste.get().s : {};
  const feel = k => fc[k] || (fc[k] = new Set(((AL || (AL = autoLists())).find(x => x.k === k) || { list: [] }).list.map(s => s.id)));
  const loud = id => { if (!lr) { const a = songs().filter(s => loudMap[s.id]).map(s => [s.id, loudMap[s.id][0]]).sort((x, y) => x[1] - y[1]); lr = new Map(a.map((x, i) => [x[0], a.length > 1 ? i / (a.length - 1) : .5])); } return lr.has(id) ? lr.get(id) : null; };
  return { now, last: id => lastP.get(id) || 0, cnt: id => cnt.get(id) || 0, fav: id => favs.has(id), star: id => (ratingOf(id).n || 0), known: id => !!tg[id], w: id => window.Taste ? Taste.w(id) : 1, rest: id => !!(window.Taste && Taste.resting(id)),
    dj: id => !!(djf[id] && (lastP.get(id) || 0) < djf[id].t), artist: firstArtist, album: s => (s.al || '').trim() || folderName(s.f), folder: s => folderName(s.f), feel, loud, tod: id => tod.get(id) || NONE, day: id => day.get(id) || NONE };
}
function smRes(d, C) {
  if (d.live === false && d.ids) { const l = d.ids.map(i => byId.get(i)).filter(Boolean); return { list: l, total: l.length, per: [], n: (d.rules || []).length }; }
  return Smart.run(d, songs(), C || smCtx());
}
function smartHTML() {
  const C = smCtx(), rows = smartL.map(d => { const r = smRes(d, C); return `<button class="row" data-sm="${d.id}" type="button"><div class="stk">${r.list.slice(0, 2).map(thHTML).join('')}</div><div class="tx"><div class="rt1">${esc(d.name)}</div><div class="rt2">${d.live === false ? '' : '<span class="smdot"></span>'}${ns(r.list.length)} · ${d.live === false ? 'kept as it is' : 'updates itself'}</div></div></button>`; }).join('');
  return `<h2>Smart · always fresh</h2>${rows ? `<div class="list g" style="margin-bottom:10px">${rows}</div>` : ''}<button class="row add smnew g" data-smnew="1" type="button">+ New smart playlist</button>`;
}
function smartOpen(id) {
  const d = smartL.find(x => x.id === id); if (!d) return; const r = smRes(d);
  listPage(d.name, r.list, ns(r.list.length) + ' · ' + totalLen(r.list) + (d.live === false ? '' : ' · updates itself'), true);
  $('#libbox').insertAdjacentHTML('beforeend', `<div class="centre" style="margin-top:18px"><button class="lnk sm" data-smedit="${id}" type="button">Change the rules</button></div>`);
}
function smartNew() {
  const C = smCtx(), L = songs();
  page('New smart playlist', `<div class="sub">Start from an idea, or from nothing. You can change every rule.</div><div class="list g" style="margin-top:12px">${Smart.PRESETS.map((p, i) => { const n = Smart.run({ ...p, limit: 0 }, L, C).total; return `<button class="row" data-smpre="${i}" type="button"><div class="th ic2 smic">${Smart.icon(p.rules[0].k)}</div><div class="tx"><div class="rt1">${esc(p.name)}</div><div class="rt2">${ns(n)} match now</div></div></button>`; }).join('')}<button class="row" data-smpre="-1" type="button"><div class="th ic2 smic"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></div><div class="tx"><div class="rt1">Start from nothing</div><div class="rt2">Add your own rules</div></div></button></div>`);
}
const LIMV = v => v > 200 ? 'No limit' : v + ' songs';
function smartEdit(id, openAdd) {
  const d = smartL.find(x => x.id === id); if (!d) return; const lim = d.limit > 0 ? d.limit : 210;
  page(d.name, `<input class="inp smname" id="smname" value="${esc(d.name)}" maxlength="40" aria-label="Playlist name" autocomplete="off">
    <div class="g smlive"><div><div class="smbig" id="smbig">0</div><div class="sub" style="margin:0" id="smsub">songs match now</div></div><div class="smmos" id="smmos"></div></div>
    <div class="smmode" role="group" aria-label="How rules combine"><button class="pillbtn sm${d.mode === 'any' ? '' : ' on'}" data-smmode="all" type="button">Match all</button><button class="pillbtn sm${d.mode === 'any' ? ' on' : ''}" data-smmode="any" type="button">Match any</button></div>
    <div id="smrules"></div><button class="row add smnew g" data-smadd="1" type="button">+ Add a rule</button>
    <div class="card g smcard"><div class="setrow" style="padding:0"><div class="s1">Up to <output class="rv" id="smlv">${LIMV(lim)}</output></div></div><input type="range" id="smlim" min="10" max="210" step="10" value="${lim}" aria-label="Number of songs"><div class="smord">${Smart.ORDERS.map(o => `<button class="pillbtn sm${(d.order || 'liked') === o[0] ? ' on' : ''}" data-smord="${o[0]}" type="button">${o[1]}</button>`).join('')}</div></div>
    <div class="list g" style="margin-top:10px"><div class="setrow"><div><div class="s1">Keeps refreshing</div></div><button class="sw${d.live === false ? '' : ' on'}" data-smlive="1" type="button" role="switch" aria-checked="${d.live !== false}" aria-label="Keeps refreshing"><i></i></button></div></div>
    <div class="centre" style="margin-top:14px;flex-wrap:wrap"><button class="pillbtn" data-smplay="1" type="button">Play all</button><button class="lnk sm" data-smdel="${id}" type="button">Delete</button></div><div style="height:100px"></div>`,
    box => { box._sm = id; $$('.sw', box).forEach(sw => { sw._k = M.knob(sw, sw.classList.contains('on')); }); smPaint(d, true); if (openAdd) setTimeout(() => smSheetOpen(id), 350); }, true);
}
let smBig = 0, smBigT = 0;
function smPaint(d, first) {
  const box = $('#libbox'); if (!$('#smrules')) return; const C = smCtx(), r = Smart.run(d, songs(), C), n = songs().length || 1; box._smres = r;
  $('#smrules').innerHTML = (d.rules || []).map((x, i) => `<div class="g chip"><button class="cb" data-smr="${i}" type="button"><span class="smic">${Smart.icon(x.k)}</span><span class="cx"><span class="t1">${esc(Smart.text(x))}</span><span class="bar"><b style="width:${Smart.valid(x) ? Math.round(r.per[(d.rules || []).slice(0, i).filter(Smart.valid).length] / n * 100) : 0}%"></b></span></span><span class="t2">${Smart.valid(x) ? r.per[(d.rules || []).slice(0, i).filter(Smart.valid).length] : ''}</span></button><button class="x" data-smrx="${i}" type="button" aria-label="Remove this rule">×</button></div>`).join('');
  const shown = d.live === false && d.ids ? d.ids.length : r.list.length, from = smBig; clearInterval(smBigT);
  if (first || from === shown) $('#smbig').textContent = shown; else { let k = 0; smBigT = setInterval(() => { k++; $('#smbig').textContent = Math.round(from + (shown - from) * Math.min(1, k / 10)); if (k >= 10) clearInterval(smBigT); }, 35); }
  smBig = shown; $('#smsub').textContent = (shown === 1 ? 'song matches' : 'songs match') + (r.total > shown ? ' · ' + r.total + ' before the limit' : '');
  $('#smmos').innerHTML = Array.from({ length: 9 }, (_, i) => r.list[i] ? thHTML(r.list[i]) : '<div class="th emp"></div>').join(''); thumbs(box);
  if (!first) { d.upd = Date.now(); smSave(); }
}
/* the sheet that adds or changes a rule */
let smS = null;
function smSheetOpen(id, edit) {
  const d = smartL.find(x => x.id === id); if (!d) return; let sh = $('#smsheet');
  if (!sh) { $('#app').insertAdjacentHTML('beforeend', '<div id="smsheet" role="dialog" aria-label="Add a rule"><div class="smgrab"></div><div id="smsb"></div></div>'); sh = $('#smsheet'); sh.addEventListener('click', smSheetClick); sh.addEventListener('input', e => { if (e.target.id === 'smq') smSheetPick(); }); }
  smS = { id, edit: edit === undefined ? -1 : edit, C: smCtx(), L: songs(), sel: new Set(), k: null };
  if (smS.edit >= 0) { const r = d.rules[smS.edit]; smS.k = r.k; smStep(r.k, r); } else smGrid();
  $('#scrim').classList.remove('hid'); void sh.offsetWidth; sh.classList.add('open');
}
function smSheetClose() { const sh = $('#smsheet'); sh && sh.classList.remove('open'); $('#scrim').classList.add('hid'); smS = null; }
function smGrid() {
  const { C, L } = smS; $('#smsb').innerHTML = Smart.GROUPS.map((g, gi) => `<div class="smgh">${g}</div><div class="smgr">${Object.keys(Smart.RULES).filter(k => Smart.RULES[k].g === gi).map(k => { const n = Smart.tile(k, L, C); return `<button class="cell${n ? '' : ' dim'}" data-smk="${k}" type="button"><span class="smic">${Smart.icon(k)}</span><span class="cl">${Smart.RULES[k].n}</span><span class="cn">${n || ''}</span></button>`; }).join('')}</div>`).join('');
}
function smStep(k, cur) {
  const R = Smart.RULES[k], { C, L } = smS; smS.k = k;
  if (R.t === 'choice') $('#smsb').innerHTML = `<div class="smgh"><button class="lnk sm" data-smback="1" type="button">‹</button> ${R.n}</div><div class="list g">${R.o.map(o => { const n = L.filter(R.f(o[0], C)).length; return `<button class="row${cur && cur.p === o[0] ? ' cur' : ''}" data-smo="${o[0]}" type="button"><div class="tx"><div class="rt1">${o[1]}</div></div><span class="t2">${n}</span></button>`; }).join('')}</div>`;
  else if (R.t === 'pick') { smS.sel = new Set(cur && Array.isArray(cur.p) ? cur.p : []); smS.vals = Smart.values(k, L, C); $('#smsb').innerHTML = `<div class="smgh"><button class="lnk sm" data-smback="1" type="button">‹</button> ${R.n}</div><input class="inp" id="smq" type="search" placeholder="Search" autocomplete="off" aria-label="Search"><div class="list g" id="smpl"></div><button class="pillbtn" data-smdone="1" type="button" style="margin-top:12px">Done</button>`; smSheetPick(); }
  else $('#smsb').innerHTML = `<div class="smgh"><button class="lnk sm" data-smback="1" type="button">‹</button> ${R.n}</div><input class="inp" id="smq" value="${esc(cur ? cur.p : '')}" placeholder="A word in the title, artist, album or genre" autocomplete="off" aria-label="Words"><button class="pillbtn" data-smdone="1" type="button" style="margin-top:12px">Done</button>`;
}
function smSheetPick() {
  const q = ($('#smq') && $('#smq').value || '').trim().toLowerCase(), V = smS.vals.filter(v => !q || v[0].toLowerCase().includes(q)).slice(0, 60);
  $('#smpl').innerHTML = V.length ? V.map(v => `<button class="row${smS.sel.has(v[0]) ? ' cur' : ''}" data-smv="${esc(v[0])}" type="button"><div class="tx"><div class="rt1">${esc(v[0])}</div></div><span class="t2">${v[1]}</span></button>`).join('') : '<div class="sub" style="padding:12px">Nothing found</div>';
}
function smCommit(p) {
  const d = smartL.find(x => x.id === smS.id); if (!d) return; const r = { k: smS.k, p };
  if (smS.edit >= 0) d.rules[smS.edit] = r; else d.rules.push(r); smSheetClose(); tick(); smPaint(d);
}
function smSheetClick(e) {
  const t = e.target.closest('button'); if (!t || !smS) return; tick();
  if (t.dataset.smk) { const k = t.dataset.smk; if (t.classList.contains('dim') && Smart.RULES[k].t === 'choice') return; smStep(k); return; }
  if (t.dataset.smback) { if (smS.edit >= 0) smSheetClose(); else smGrid(); return; }
  if (t.dataset.smo) { smCommit(t.dataset.smo); return; }
  if (t.dataset.smv) { const v = t.dataset.smv; smS.sel.has(v) ? smS.sel.delete(v) : smS.sel.add(v); t.classList.toggle('cur'); return; }
  if (t.dataset.smdone) { const R = Smart.RULES[smS.k]; if (R.t === 'pick') { if (!smS.sel.size) { toast('Choose at least one'); return; } smCommit([...smS.sel]); } else { const v = ($('#smq').value || '').trim(); if (!v) { toast('Type a word first'); return; } smCommit(v); } }
}
$('#scrim').addEventListener('click', () => { if (smS) smSheetClose(); });
function smartClick(t, box) {
  const d = smartL.find(x => x.id === box._sm);
  if (t.dataset.smnew) { tick(); smartNew(); return true; }
  if (t.dataset.smpre !== undefined) { tick(); const i = +t.dataset.smpre, p = i >= 0 ? Smart.PRESETS[i] : { name: 'New smart playlist', mode: 'all', rules: [], limit: 40, order: 'liked' }; const nd = { id: 's' + Date.now().toString(36), name: p.name, mode: p.mode, rules: p.rules.map(r => ({ ...r })), limit: p.limit, order: p.order, live: true }; smartL.push(nd); smSave(); stack.pop(); smartEdit(nd.id, i < 0); return true; }
  if (t.dataset.sm) { tick(); smartOpen(t.dataset.sm); return true; }
  if (t.dataset.smedit) { tick(); stack.pop(); smartEdit(t.dataset.smedit); return true; }
  if (!d) return false;
  if (t.dataset.smmode) { tick(); d.mode = t.dataset.smmode; $$('[data-smmode]', box).forEach(b => b.classList.toggle('on', b.dataset.smmode === d.mode)); smPaint(d); return true; }
  if (t.dataset.smadd) { tick(); smSheetOpen(d.id); return true; }
  if (t.dataset.smr !== undefined) { tick(); smSheetOpen(d.id, +t.dataset.smr); return true; }
  if (t.dataset.smrx !== undefined) { tick(); d.rules.splice(+t.dataset.smrx, 1); smPaint(d); return true; }
  if (t.dataset.smord) { tick(); d.order = t.dataset.smord; $$('[data-smord]', box).forEach(b => b.classList.toggle('on', b.dataset.smord === d.order)); smPaint(d); return true; }
  if (t.dataset.smlive) { tick(); const on = d.live === false; d.live = on; t.classList.toggle('on', on); t.setAttribute('aria-checked', on); t._k && t._k(on); if (!on) d.ids = (box._smres ? box._smres.list : []).map(s => s.id); else delete d.ids; smPaint(d); return true; }
  if (t.dataset.smplay) { tick(); const r = smRes(d); if (r.list.length) choose(r.list, null, d.name); else toast('No songs match yet'); return true; }
  if (t.dataset.smdel) { popup(`<h3>Delete “${esc(d.name)}”?</h3><div class="sub">Only the playlist goes. Your songs stay.</div><button class="pillbtn" data-do="go" type="button">Delete</button><div class="acts"><button class="lnk" data-do="no" type="button">Keep it</button></div>`, ev => { const k = ev.target.dataset.do; if (!k) return; closePop(); if (k === 'go') { smartL = smartL.filter(x => x.id !== d.id); smSave(); stack.length = 0; libSeg = 'lists'; renderLib(); } }); return true; }
  return false;
}
$('#libbox').addEventListener('input', e => {
  const box = $('#libbox'), d = smartL.find(x => x.id === box._sm); if (!d) return;
  if (e.target.id === 'smname') { d.name = e.target.value.slice(0, 40) || 'Smart playlist'; smSave(); }
  else if (e.target.id === 'smlim') { const v = +e.target.value; $('#smlv').textContent = LIMV(v); d.limit = v > 200 ? 0 : v; clearTimeout(box._lt); box._lt = setTimeout(() => smPaint(d), 160); }
});

/* every slider shows its number, so nobody has to guess */
const SEC = ['djmin', 'djmax', 'djxf'];
const INSF = ['Never', 'Rarely', 'Seldom', 'Sometimes', 'Often', 'Mostly', 'Always'];
const hr12 = v => v === 0 || v === 24 ? '12 AM' : v < 12 ? v + ' AM' : v === 12 ? '12 PM' : (v - 12) + ' PM';
function rvText(r) { const k = r.dataset.rng, v = +r.value; if (k === 'nightT' || k === 'nightR') return hr12(v); if (k === 'nightV') return v + '%'; if (k === 'lysz') return v + ' px'; if (k === 'insf') return INSF[v] || String(v); if (/^eq[lmh]$/.test(k)) return (v > 0 ? '+' : '') + v + ' dB'; if (k === 'xfl') return v + ' s'; return SEC.includes(k) ? v + ' s' : (+r.max === 100 || k === 'lslow') ? v + '%' : String(v); }
function decorateRanges() {
  document.querySelectorAll('input[type=range][data-rng]:not([data-rv])').forEach(r => { const row = r.closest('.setrow'), lab = row && row.querySelector('.s1'); if (!lab) return; r.dataset.rv = 1; const o = document.createElement('output'); o.className = 'rv'; o.textContent = rvText(r); lab.appendChild(o); r._o = o; });
}
document.addEventListener('input', e => { const r = e.target; if (r && r.matches && r.matches('input[type=range][data-rng]') && r._o) r._o.textContent = rvText(r); if (r && r.dataset && (r.dataset.rng === 'djmin' || r.dataset.rng === 'djmax')) document.querySelectorAll('input[data-rng=djmin],input[data-rng=djmax]').forEach(x => { if (x._o) x._o.textContent = rvText(x); }); }, true);
let rvQ = 0; new MutationObserver(() => { if (!rvQ) rvQ = requestAnimationFrame(() => { rvQ = 0; decorateRanges(); }); }).observe(document.body, { childList: true, subtree: true });
/* ---------- look, power, quiet ---------- */
function applyStars() { if (window.Viz) { Viz.set({ stars: { on: !!S.st, amt: S.sta / 100, size: S.sts / 100, glow: S.stg / 100, tw: S.stt / 100, beat: S.stb / 100, pace: S.stp / 100 } }); Viz.kick(); } }
function applyAll() {
  if (window.Power) { Power.playing = () => !!st.playing; Power.cfg(S.pwr); } MPS.on = !!S.opt; if (!S.opt) MPS.flush(); if (window.Viz) Viz.opt = !!S.opt; applyStars(); $('#app').dataset.sm = S.sm ? '1' : ''; $('#app').dataset.stars = S.st ? '1' : '';
  { const H = document.documentElement; H.dataset.insst = S.insst === 'glass' ? 'glass' : 'tip'; H.style.setProperty('--lysz', (S.lysz || 17) + 'px'); H.style.setProperty('--insop', (S.insop / 100).toFixed(2)); H.style.setProperty('--insol', (S.insol / 100).toFixed(2)); H.dataset.insop = S.insop < 55 ? 'low' : 'high'; }
  if (A.xf) A.xf(S.xf, S.xfl);
  if (window.Android && Android.eq) Android.eq(S.eql | 0, S.eqm | 0, S.eqh | 0);
  const sk = window.Skins ? Skins.apply(S.skin) : {}, dark = sk.look ? sk.look === 'dark' : S.look === 'dark' || (S.look === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  ROOT.dataset.theme = dark ? 'dark' : 'light';
  const h = new Date().getHours(), night = h >= 21 || h < 5;
  if (S.warm && night) ROOT.dataset.warm = 'on'; else delete ROOT.dataset.warm;
  ROOT.dataset.comp = S.comp ? 'on' : 'off'; ROOT.dataset.minic = 'comp'; ROOT.dataset.live = S.live;
  M.set(S.live);
  if (C) { C.on = S.comp; C.reactive = S.listen; if (S.comp) C.kick(); }
  const ev = effViz(), need = S.listen && (S.comp || S.rip > 0 || ev !== 'none');
  try { A.listen && A.listen(need); } catch (e) {}
  const ov = { white: ['#ffffff', '#ffffff'], grey: ['#8c95a8', '#8c95a8'] }[S.vizc];
  ['#bigc', '#smallc', '#minic'].forEach(q => { const el = $(q); if (!el) return; if (ov && heroMode() === 'blob') { el.style.setProperty('--cs1', ov[0]); el.style.setProperty('--cs2', ov[1]); } else if (S.vizc !== 'spectrum' || heroMode() !== 'blob') { el.style.removeProperty('--cs1'); el.style.removeProperty('--cs2'); } });
  ROOT.dataset.ins = S.ins ? 'on' : 'off';
  if (window.Net) Net.cfg = { order: S.src === 'global' ? ['mb', 'itunes'] : ['itunes', 'mb'], on: { itunes: S.sx.itunes, mb: S.sx.mb, wiki: S.sx.wiki, adb: S.sx.adb !== false, deezer: S.sx.deezer !== false } };
  if (window.Viz) { Viz.set({ pal: sk.pal || null, col: sk.pal ? 'spectrum' : S.vizc, rip: S.listen ? S.rip : 0, ripCol: S.ripc, layers: S.ev, eo: S.eo / 100, es: S.es / 100, ea: S.ea / 100, sn: S.sn / 100, eb: S.eb / 100 }); ROOT.style.setProperty('--eblur', Viz.blurPx() + 'px'); }
  if (window.DJ) { DJ.opt.min = S.djmin; DJ.opt.max = S.djmax; DJ.opt.xf = S.djxf; } lofiApply(); lofiPaint(); djPaint(); ambSync();
  paintMode(); paintAlone(); applyColours();
  try { A.bars && A.bars(dark ? '#17191d' : '#f6f7fa', dark); } catch (e) {}
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyAll);
if (window.Power) Power.sub((n, was) => { if (n === 'full' && (was === 'away' || was === 'off')) { try { lyrPaint(); rowPaint(); lyrScroll(); } catch (e) {} } });
function power() { try { const lp = !!(A.lowPower && A.lowPower()); ROOT.classList.toggle('lowp', lp); if (C) C.lowp = lp; if (window.Viz) Viz.set({ lowp: lp }); } catch (e) {} }

setInterval(() => { try { if (!st.playing || !curId || !S.listen || document.hidden || !A.levels) return; const o = new Float32Array(12); if (!A.levels(o)) return; const m = o.reduce((a, b) => a + b, 0) / 12, e = energy[curId] || (energy[curId] = { s: 0, n: 0 }); e.s += m; e.n++; if (e.n > 200) { e.s *= .5; e.n = 100; } if ((Date.now() / 2500 | 0) % 12 === 0) store.set('mp_energy', energy); } catch (x) {} }, 2500);

/* the visualisation must not move when the screen goes quiet: the block under it keeps the same distance to the bottom edge */
let qbH0 = 0, qbT = 0;
function qbLock() {
  const b = $('#below'), v = $('#v-play'), st2 = $('#strip'); if (!b || !v || !st2) return; clearTimeout(qbT);
  if (!st2.offsetHeight) { b.style.minHeight = ''; $('#app').style.setProperty('--lyh', Math.round(v.offsetHeight * .56) + 'px'); return; }   // Calm minimal has no visualiser to hold still: nothing to lock
  const vr = v.getBoundingClientRect(), sr = st2.getBoundingClientRect(), d0 = vr.bottom - sr.bottom;
  const zb = 1; qbH0 = b.offsetHeight; b.style.transition = 'none'; b.style.minHeight = (qbH0 / zb) + 'px'; void b.offsetHeight; b.style.transition = '';
  { const hh = $('#hero'); if (hh && !$('#app').classList.contains('quiet')) v.style.setProperty('--hh', hh.offsetHeight + 'px'); }
  const padQ = 24, sp2 = $('.sp2'); b.style.minHeight = (Math.max(qbH0, Math.round(d0 - (sp2 ? sp2.offsetHeight : 0) - padQ)) / zb) + 'px';
  $('#app').style.setProperty('--lyh', Math.round(v.offsetHeight * .56) + 'px');
}
function qbFree() { lyrPaint(); const b = $('#below'); if (!b) return; b.style.minHeight = qbH0 + 'px'; clearTimeout(qbT); qbT = setTimeout(() => { if (!$('#app').classList.contains('quiet')) b.style.minHeight = ''; }, 1100); }
let quietT;
let wokeAt = 0;
document.querySelector('.tabs').addEventListener('click', e => { if (Date.now() - wokeAt < 1000) { e.stopPropagation(); e.preventDefault(); } }, true);
const COLL = ['.top', '.alone', '.tools'];
/* if this phone cannot keep ~40 fps, the quiet change becomes a shorter, lighter fade */
(() => { let n = 0, t0 = 0, s = 0; const f = t => { if (t0) { s += t - t0; n++; } t0 = t; if (n < 40) requestAnimationFrame(f); else document.documentElement.dataset.lite = (s / n > 26) ? 'on' : 'off'; }; setTimeout(() => requestAnimationFrame(f), 1500); })();
function goQuiet() { const md = $('#modes'); $('#volp').classList.remove('open'); if (tab === 'play' && st.playing && !$('#qsheet').classList.contains('open') && !$('#pop').offsetParent && !(md && md.classList.contains('open')) && cur()) { $('#v-play').style.setProperty('--ph', $('#pnl').offsetHeight + 'px'); qbLock(); insDecide(true); insPaint(); COLL.forEach(q => { const el = $(q); if (el) { el.style.transition = 'none'; el.style.height = el.offsetHeight + 'px'; } }); void document.body.offsetHeight; COLL.forEach(q => { const el = $(q); if (el) el.style.transition = ''; }); $('#app').classList.add('quiet'); Viz.kick(); } }
function armQuiet() { clearTimeout(quietT); quietT = setTimeout(goQuiet, 6000); }
function wake(e) { const inIns = e && e.target && e.target.closest && e.target.closest('#ins'); if (!inIns) { if ($('#app').classList.contains('quiet')) { wokeAt = Date.now(); setTimeout(() => dispatchEvent(new Event('resize')), 1000); } $('#app').classList.remove('quiet'); qbFree(); clearTimeout(wake._t); wake._t = setTimeout(() => COLL.forEach(q => { const el = $(q); if (el && !$('#app').classList.contains('quiet')) el.style.height = ''; }), 1100); } armQuiet(); }
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, wake, { passive: true }));

window.__back = () => {
  if (!$('#pop').classList.contains('hid')) { closePop(); return true; }
  if ($('#modes') && $('#modes').classList.contains('open')) { closeModes(); return true; }
  if ($('#qsheet').classList.contains('open')) { closeQueue(); return true; }
  if (stack.length) { const f = stack.pop(); f(); return true; }
  if (tab !== 'play') { setTab('play'); return true; }
  return false;
};
let timer = null;
const loop = () => { poll(); timer = setTimeout(loop, st.playing && tab === 'play' ? 250 : 500); };
window.__vis = v => { if (A.visible) A.visible(v); clearTimeout(timer); if (v) { power(); loop(); } };
document.addEventListener('visibilitychange', () => window.__vis(!document.hidden));

/* ---------- adding songs (web version) ---------- */
let addT;
const setAdd = s => { addState = s; $$('.addic').forEach(el => { el.dataset.s = s; }); };
window.__libChanged = (msg, done) => {
  toast(msg);
  const busy = /^Adding/.test(msg);
  if (busy) { clearTimeout(addT); setAdd(1); }
  if (!done) return;
  let raw = []; try { raw = JSON.parse(A.library()); } catch (e) {}
  buildLib(raw);
  if (!busy) indexSongs();
  if (!busy) { addState = 2; clearTimeout(addT); addT = setTimeout(() => setAdd(0), 1500); }
  if (tab === 'lib' && !stack.length) renderLib(); if (tab === 'set') renderSet();
};

/* ---------- start ---------- */
function restore() {
  let sv = {}; try { sv = JSON.parse(A.savedState()); } catch (e) {}
  const ids = (sv.ids || []).filter(id => byId.has(String(id)));
  if (!ids.length) return;
  const idx = Math.min(ids.length - 1, Math.max(0, (sv.ids || []).slice(0, sv.index || 0).filter(id => byId.has(String(id))).length));
  A.setQueue(JSON.stringify(ids), idx, sv.pos || 0, false);
  $('#bplay').classList.add('zero');
}
function loadLib() {
  setTimeout(() => {
    let raw = []; try { raw = JSON.parse(A.library()); } catch (e) {}
    buildLib(raw);
    let n = null; try { n = JSON.parse(A.state()); } catch (e) {}
    if (!n || !n.count) restore();
    window.__vis(true); indexSongs();
    if (tab === 'lib') renderLib();
    if (tab === 'set') renderSet();
  }, 30);
}
function start() {
  if (!A) { document.body.innerHTML = '<p style="padding:40px;font-family:sans-serif">Open this inside the Rustam\'s Music app.</p>'; return; }
  document.addEventListener('focusin', e => { if (e.target.matches('input')) $('#app').classList.add('kb'); }); document.addEventListener('focusout', () => $('#app').classList.remove('kb'));
  if (C) { C.mount($('#smallc')); C.mount($('#bigc')); C.mount($('#minic')); }
  if (window.Viz) { Viz.attach($('#vz'), $('#rip'), $('#echo')); Viz.attachStars($('#sky')); }
Viz.attachDots($('#dotsbar'));
  try { A.speed && A.speed(S.speed || 1); } catch (e) {}
  A.fade(S.fade); applyAll(); power(); setInterval(power, 60000); setInterval(applyAll, 300000);
  paintMode();
  if (A.hasPerm()) loadLib(); else { setTab('lib'); }
  updateTone(); wake();
}
(window.__ready || Promise.resolve()).then(start);

/* ---------- 0.7: even loudness and one master volume ---------- */
window.__lv = id => levelFor(id); window.__np = () => normPaint(); const gains = store.get('mp_gain', {}); let gainBusy = 0;
function levelFor(id) {
  if (!S.norm) { A.norm && A.norm(0); return; }
  if (gains[id] !== undefined) { A.norm(gains[id], true); return; }
  A.norm(0, true); const d = (byId.get(id) || {}).d || 0; if (d > 15 * 60000 || gainBusy) return; gainBusy = 1;
  A.measure(id).then(db => { if (db === null) return; gains[id] = +db.toFixed(1); store.set('mp_gain', gains); if (curId === id && S.norm) A.norm(gains[id]); }).catch(() => {}).finally(() => { gainBusy = 0; });
}
const volG = p => p <= 0 ? 0 : Math.pow(10, -30 * (1 - p / 100) / 20), volT = p => p <= 0 ? 'Off' : p >= 100 ? '0 dB' : '\u2212' + Math.round(30 * (1 - p / 100)) + ' dB';
$('#app').insertAdjacentHTML('beforeend', `<div class="volp g" id="volp" role="dialog" aria-label="Volume"><div class="setrow rng"><div><div class="s1">Volume<output class="rv" id="volo"></output></div><input type="range" min="0" max="100" step="1" id="volr" aria-label="Volume"></div></div><div class="setrow" style="padding:4px 18px 12px"><div class="s1" style="font-size:15px">Even out loudness</div><button class="sw" id="volnorm" type="button" role="switch" aria-label="Even out loudness"><i></i></button></div></div>`);
$('#volnorm').classList.toggle('on', !!S.norm); $('#volnorm')._k = M.knob($('#volnorm'), !!S.norm);
const volPlace = () => { const v = $('#volp'), b = $('#lvol'), ap = $('#app').getBoundingClientRect(), r = b.getBoundingClientRect(); if (!r.width) return; v.style.bottom = Math.max(12, Math.round(ap.bottom - r.top + 12)) + 'px'; v.style.setProperty('--cx', Math.round(r.left + r.width / 2 - ap.left - 28) + 'px'); };
let volT_ = 0; const volShow = () => { volPlace(); $('#volp').classList.add('open'); clearTimeout(volT_); volT_ = setTimeout(() => $('#volp').classList.remove('open'), 4200); };
function normPaint() { const b = $('#volnorm'), was = b.classList.contains('on'); b.classList.toggle('on', !!S.norm); if (b._k && was !== !!S.norm) b._k(!!S.norm); b.setAttribute('aria-checked', !!S.norm); $$('[data-tog=norm]').forEach(x => { x.classList.toggle('on', !!S.norm); x.setAttribute('aria-checked', !!S.norm); }); }
$('#volnorm').addEventListener('click', () => { S.norm = !S.norm; saveS(); normPaint(); if (curId) levelFor(curId); toast(S.norm ? 'Loudness evened out' : 'Loudness left as recorded'); volShow(); });
let muted = false;
function volApply() { normPaint(); A.vol(muted ? 0 : volG(S.vol)); $('#lvol').classList.toggle('mut', muted); $('#volo').textContent = muted ? 'Muted' : volT(S.vol); $('#volr').value = S.vol; $('#lvol').classList.toggle('on', S.vol < 100); $('#lvol').style.opacity = muted || S.vol < 100 ? 1 : .55; }
window.muteToggle = () => { muted = !muted; volApply(); return muted; };
$('#lvol').addEventListener('click', e => { e.stopPropagation(); tick(); if ($('#volp').classList.contains('open')) { $('#volp').classList.remove('open'); clearTimeout(volT_); } else volShow(); });
$('#volr').addEventListener('input', () => { if (!$('#volp').classList.contains('open')) { $('#volr').value = S.vol; return; } muted = false; S.vol = +$('#volr').value; saveS(); volApply(); volShow(); });
document.addEventListener('pointerdown', e => { if (!e.target.closest('#volp,#lvol')) $('#volp').classList.remove('open'); }, true);
volApply();
window.volSwipe = v => { v = Math.max(0, Math.min(100, Math.round(v))); if (v !== S.vol) { muted = false; S.vol = v; saveS(); volApply(); } return S.vol; };

/* ---- night volume: once a night, ease the app volume down; bring it back in the morning; never fight a hand on the slider ---- */
const nv = { get: () => store.get('mp_night', {}), set: o => store.set('mp_night', o) };
let nvAnim = 0, nvExpect = null;
function nvEase(to, ms, done) {
  clearInterval(nvAnim); const from = S.vol, t0 = performance.now(); nvExpect = from;
  nvAnim = setInterval(() => {
    if (S.vol !== nvExpect) { clearInterval(nvAnim); nvAnim = 0; nvExpect = null; done && done(true); return; }
    const k = Math.min(1, (performance.now() - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, v = Math.round(from + (to - from) * e);
    if (v !== S.vol) { S.vol = v; nvExpect = v; volApply(); }
    if (k >= 1) { clearInterval(nvAnim); nvAnim = 0; nvExpect = null; saveS(); done && done(false); }
  }, 120);
}
const NV_MOON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/></svg>';
function nvHide(fx) { const m = $('#nvmsg'); if (!m) return; m.classList.add('out'); if (fx) m.style.setProperty('--nx', fx + 'px'); setTimeout(() => m.remove(), 800); }
function nvMsg() {
  const o = nv.get(); if (!o.msg || o.prev == null) return; let m = $('#nvmsg');
  if (!m) {
    m = document.createElement('div'); m.id = 'nvmsg'; m.className = 'tipbox'; m.setAttribute('role', 'status');
    m.innerHTML = NV_MOON + '<span class="nvr"><i></i></span><output></output><button type="button" data-nv="undo" aria-label="Undo: back to the earlier volume"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 7L5 11l4 4M5 11h9a5 5 0 010 10h-2"/></svg></button><button type="button" data-nv="ok" aria-label="OK, keep it"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>';
    $('#app').appendChild(m);
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-nv]'); if (!b) return; const o = nv.get(); tick();
      if (b.dataset.nv === 'undo' && o.prev != null) { nvEase(o.prev, 3500, () => {}); }
      nv.set(Object.assign(o, { msg: 0, prev: b.dataset.nv === 'undo' ? null : o.prev })); nvHide();
    });
    let x0 = null, dx = 0;
    m.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; x0 = e.clientX; dx = 0; m.setPointerCapture(e.pointerId); m.style.transition = 'none'; });
    m.addEventListener('pointermove', e => { if (x0 === null) return; dx = e.clientX - x0; m.style.transform = 'translateX(' + dx + 'px)'; m.style.opacity = String(Math.max(.2, 1 - Math.abs(dx) / 260)); });
    const up = () => { if (x0 === null) return; x0 = null; m.style.transition = ''; if (Math.abs(dx) > 70) { nv.set(Object.assign(nv.get(), { msg: 0 })); nvHide(dx > 0 ? 300 : -300); } else { m.style.transform = ''; m.style.opacity = ''; } };
    m.addEventListener('pointerup', up); m.addEventListener('pointercancel', up);
    requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add('in')));
  }
  m.querySelector('output').textContent = o.prev + '% \u2192 ' + o.v + '%'; m.querySelector('.nvr i').style.width = o.v + '%';
  m.setAttribute('aria-label', 'Volume lowered for the night, from ' + o.prev + ' to ' + o.v + ' percent');
}
function nvCheck() {
  if (!S.night) return;
  const d = new Date(), h = d.getHours(), inNight = h >= S.nightT || h < S.nightR, o = nv.get();
  const key = (h < S.nightR ? new Date(d.getTime() - 864e5) : d).toDateString();
  if (inNight) {
    if (o.k === key) return;
    if (S.vol <= S.nightV) { nv.set({ k: key }); return; }
    const prev = S.vol; nv.set({ k: key, prev, v: S.nightV, msg: 1 }); nvMsg(); nvEase(S.nightV, 8000, () => {});
  } else if (o.prev != null) {
    if (S.vol === o.v && !nvAnim) nvEase(o.prev, 6000, () => {});
    nv.set({ k: o.k, msg: 0 }); nvHide();
  }
}
setTimeout(() => { nvMsg(); nvCheck(); }, 1200); setInterval(nvCheck, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { nvMsg(); nvCheck(); } });
})();
