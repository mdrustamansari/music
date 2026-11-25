/* Smart playlists: rules you combine, evaluated live on this phone.
   The engine knows nothing about the screen. app.js hands it a context (what it knows about each song). */
(() => {
'use strict';
const DAY = 864e5;
const P = window.Smart = {};
const sv = d => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
const lc = s => String(s || '').toLowerCase();

/* each rule: k key, g group, n name, i icon, t type (choice | pick | text | flag), o options [value, label],
   f(p, C) -> a test for one song, h(songs, C) -> how many songs the rule can speak about (the tile number) */
const RULES = {
  last: { g: 0, n: 'Last played', i: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', t: 'choice',
    o: [['w1', 'In the last week'], ['m1', 'In the last month'], ['n30', 'Not for 30 days'], ['n90', 'Not for 3 months'], ['nv', 'Never played']],
    f: (p, C) => { const n = C.now, a = { w1: 7, m1: 30, n30: 30, n90: 90 }[p]; return s => { const l = C.last(s.id); return p === 'nv' ? !l : p === 'w1' || p === 'm1' ? l && n - l < a * DAY : !l || n - l >= a * DAY; }; }, h: (L) => L.length },
  plays: { g: 0, n: 'Play count', i: '<path d="M5 12a7 7 0 0112-5l2 2M19 12a7 7 0 01-12 5l-2-2"/><path d="M19 4v5h-5M5 20v-5h5"/>', t: 'choice',
    o: [['one', 'Once or twice'], ['some', '3 to 9 times'], ['lots', '10 times or more']],
    f: (p, C) => s => { const c = C.cnt(s.id); return p === 'one' ? c >= 1 && c <= 2 : p === 'some' ? c >= 3 && c <= 9 : c >= 10; }, h: (L, C) => L.filter(s => C.cnt(s.id) > 0).length },
  fav: { g: 0, n: 'Favourite', i: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>', t: 'choice',
    o: [['yes', 'Favourites'], ['no', 'Not favourites']], f: (p, C) => s => C.fav(s.id) === (p === 'yes'), h: (L, C) => L.filter(s => C.fav(s.id)).length },
  star: { g: 0, n: 'Rating', i: '<path d="M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.2 7.2 19l1-5.4-4-3.8 5.4-.7z"/>', t: 'choice',
    o: [['3', '3 stars or more'], ['4', '4 stars or more'], ['5', '5 stars']], f: (p, C) => s => C.star(s.id) >= +p, h: (L, C) => L.filter(s => C.star(s.id) >= 3).length },
  liked: { g: 0, n: 'Liked now', i: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 16v4M16.5 18h4"/>', t: 'choice',
    o: [['love', 'Songs you love'], ['cool', 'Songs you tend to skip'], ['rest', 'Resting after skips']],
    f: (p, C) => s => p === 'love' ? C.known(s.id) && C.w(s.id) > 1.15 : p === 'cool' ? C.known(s.id) && C.w(s.id) < .7 : C.rest(s.id), h: (L, C) => L.filter(s => C.known(s.id)).length },

  artist: { g: 1, n: 'Artist', i: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3.2-6 7-6s7 2 7 6"/>', t: 'pick', v: (s, C) => C.artist(s), f: (p, C) => { const q = new Set(p); return s => q.has(C.artist(s)); } },
  album: { g: 1, n: 'Album', i: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="12" cy="12" r="4"/>', t: 'pick', v: (s, C) => C.album(s), f: (p, C) => { const q = new Set(p); return s => q.has(C.album(s)); } },
  genre: { g: 1, n: 'Genre', i: '<path d="M4 12V5h7l9 9-7 7z"/><circle cx="8" cy="9" r="1"/>', t: 'pick', v: s => (s.g || '').trim(), f: p => { const q = new Set(p); return s => q.has((s.g || '').trim()); } },
  length: { g: 1, n: 'Length', i: '<path d="M7 4h10M7 20h10"/><path d="M8 4c0 4 4 5 4 8s-4 4-4 8M16 4c0 4-4 5-4 8s4 4 4 8"/>', t: 'choice',
    o: [['s', 'Under 3½ minutes'], ['m', '3½ to 7 minutes'], ['l', '7 to 15 minutes'], ['x', 'Over 15 minutes']],
    f: p => s => { const m = s.d / 6e4; return p === 's' ? m < 3.5 : p === 'm' ? m >= 3.5 && m < 7 : p === 'l' ? m >= 7 && m < 15 : m >= 15; }, h: L => L.length },
  quality: { g: 1, n: 'Quality', i: '<path d="M12 3l8 6-8 12L4 9z"/><path d="M4 9h16"/>', t: 'choice',
    o: [['lo', 'Under 128 kbps'], ['ok', '128 to 256 kbps'], ['hi', 'Over 256 kbps'], ['ll', 'Lossless (over 600 kbps)']],
    f: p => s => { const k = s.size && s.d ? s.size * 8 / s.d : 0; return !k ? false : p === 'lo' ? k < 128 : p === 'ok' ? k >= 128 && k < 256 : p === 'hi' ? k >= 256 : k >= 600; }, h: L => L.filter(s => s.size && s.d).length },
  year: { g: 1, n: 'Year', i: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M9 3v4M15 3v4"/><circle cx="9" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="16" r="1"/><circle cx="12" cy="16" r="1"/>', t: 'choice',
    o: [['60', '1960s or earlier'], ['70', '1970s'], ['80', '1980s'], ['90', '1990s'], ['00', '2000s'], ['10', '2010s'], ['20', '2020s'], ['u', 'Year unknown']],
    f: p => s => { const y = s.y || 0; if (p === 'u') return !y; if (!y) return false; if (p === '60') return y < 1970; const d = +p < 30 ? 2000 + +p : 1900 + +p; return y >= d && y < d + 10; }, h: L => L.filter(s => s.y).length },
  folder: { g: 1, n: 'Folder', i: '<path d="M3.5 7a2 2 0 012-2H10l2 2.5h6.5a2 2 0 012 2V17a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/>', t: 'pick', v: (s, C) => C.folder(s), f: (p, C) => { const q = new Set(p); return s => q.has(C.folder(s)); } },
  words: { g: 1, n: 'Words', i: '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>', t: 'text', f: p => { const q = lc(p).trim(); return s => !q || lc(s.t + ' ' + (s.a || '') + ' ' + (s.al || '') + ' ' + (s.g || '')).includes(q); }, h: L => L.length },

  feel: { g: 2, n: 'Feel', i: '<path d="M3 12h3l2-6 3 12 3-9 2 5 2-2h3"/>', t: 'choice',
    o: [['calm', 'Calm'], ['live', 'Lively'], ['late', 'Late night'], ['focus', 'Focus'], ['asmr', 'ASMR']], f: (p, C) => { const q = C.feel(p); return s => q.has(s.id); }, h: (L, C) => { const u = new Set(); ['calm', 'live', 'late', 'focus', 'asmr'].forEach(k => C.feel(k).forEach(i => u.add(i))); return u.size; } },
  loud: { g: 2, n: 'Loudness', i: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>', t: 'choice',
    o: [['q', 'The quiet third'], ['m', 'The middle third'], ['l', 'The loud third']],
    f: (p, C) => s => { const r = C.loud(s.id); return r == null ? false : p === 'q' ? r < .34 : p === 'm' ? r >= .34 && r < .67 : r >= .67; }, h: (L, C) => L.filter(s => C.loud(s.id) != null).length },
  tod: { g: 2, n: 'Time of day', i: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>', t: 'choice',
    o: [['morning', 'Played in the morning'], ['afternoon', 'Played in the afternoon'], ['evening', 'Played in the evening'], ['night', 'Played at night']],
    f: (p, C) => s => C.tod(s.id).has(p), h: (L, C) => L.filter(s => C.tod(s.id).size).length },
  day: { g: 2, n: 'Day', i: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>', t: 'choice',
    o: [['week', 'Played on weekdays'], ['weekend', 'Played at weekends']], f: (p, C) => s => C.day(s.id).has(p), h: (L, C) => L.filter(s => C.day(s.id).size).length },
  added: { g: 2, n: 'Date added', i: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>', t: 'choice',
    o: [['w1', 'This week'], ['m1', 'This month'], ['m3', 'In the last 3 months'], ['old', 'Over 3 months ago']],
    f: (p, C) => s => { const a = (C.now / 1000 - s.ad) / 86400; return p === 'w1' ? a < 7 : p === 'm1' ? a < 30 : p === 'm3' ? a < 91 : a >= 91; }, h: L => L.length }
};
const GROUPS = ['Listening', 'The song', 'Feel and time'];
const ORDERS = [['liked', 'Most liked'], ['random', 'Random'], ['new', 'Newest'], ['cold', 'Longest unplayed']];
P.RULES = RULES; P.GROUPS = GROUPS; P.ORDERS = ORDERS; P.icon = k => sv(RULES[k].i);

/* a short phrase for a rule, shown on its chip */
P.text = r => {
  const R = RULES[r.k]; if (!R) return '';
  if (R.t === 'pick') { const a = r.p || []; return R.n + ' · ' + (a.length ? a.slice(0, 2).join(', ') + (a.length > 2 ? ' +' + (a.length - 2) : '') : 'any'); }
  if (R.t === 'text') return 'Words · “' + (r.p || '') + '”';
  const o = R.o.find(x => x[0] === r.p); return R.n + ' · ' + (o ? o[1] : '');
};
P.valid = r => { const R = RULES[r.k]; if (!R) return false; if (R.t === 'pick') return Array.isArray(r.p) && r.p.length > 0; if (R.t === 'text') return !!String(r.p || '').trim(); return !!R.o.find(x => x[0] === r.p); };
/* the values you can pick for artist, album, genre and folder, with how many songs each holds */
P.values = (k, L, C) => { const R = RULES[k], m = new Map(); L.forEach(s => { const v = R.v(s, C); if (v) m.set(v, (m.get(v) || 0) + 1); }); return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); };
P.tile = (k, L, C) => RULES[k].t === 'pick' ? P.values(k, L, C).length : RULES[k].h(L, C);

/* the run: which songs, how many each rule holds on its own */
P.run = (def, L, C) => {
  const rs = (def.rules || []).filter(P.valid), tests = rs.map(r => RULES[r.k].f(r.p, C)), per = tests.map(t => L.reduce((n, s) => n + (t(s) ? 1 : 0), 0));
  let out = !rs.length ? [] : L.filter(s => def.mode === 'any' ? tests.some(t => t(s)) : tests.every(t => t(s)));
  const total = out.length, ord = def.order || 'liked';
  if (ord === 'liked') { const w = new Map(out.map(s => [s.id, C.w(s.id) * (.85 + Math.random() * .3)])); out.sort((a, b) => w.get(b.id) - w.get(a.id)); }
  else if (ord === 'random') { const k = new Map(out.map(s => [s.id, Math.pow(Math.random(), 1 / Math.max(.05, C.w(s.id)))])); out.sort((a, b) => k.get(b.id) - k.get(a.id)); }
  else if (ord === 'new') out.sort((a, b) => b.ad - a.ad);
  else if (ord === 'cold') out.sort((a, b) => (C.last(a.id) || 0) - (C.last(b.id) || 0));
  if (def.limit > 0) out = out.slice(0, def.limit);
  return { list: out, total, per, n: rs.length };
};
/* a few starting points, each made of the same rules */
P.PRESETS = [
  { name: 'Calm evenings', mode: 'all', rules: [{ k: 'feel', p: 'calm' }, { k: 'tod', p: 'evening' }], limit: 40, order: 'liked' },
  { name: 'Loved, not heard lately', mode: 'all', rules: [{ k: 'liked', p: 'love' }, { k: 'last', p: 'n30' }], limit: 40, order: 'liked' },
  { name: 'New and unplayed', mode: 'all', rules: [{ k: 'added', p: 'm1' }, { k: 'last', p: 'nv' }], limit: 40, order: 'new' },
  { name: 'Weekend favourites', mode: 'all', rules: [{ k: 'fav', p: 'yes' }, { k: 'day', p: 'weekend' }], limit: 40, order: 'random' },
  { name: 'Long listens', mode: 'all', rules: [{ k: 'length', p: 'l' }], limit: 0, order: 'liked' }
];
})();
