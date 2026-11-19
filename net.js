/* Online details: titles, artists, albums and covers from MusicBrainz and the Cover Art Archive (free, no account).
   Only the song's name, artist and length are sent. Never the audio. Nothing runs unless the person asks. */
(() => {
'use strict';
const N = {};
const wait = ms => new Promise(r => setTimeout(r, ms));
let lastCall = 0;
async function mb(path) {
  const gap = 1150 - (Date.now() - lastCall); lastCall = Date.now() + Math.max(0, gap); if (gap > 0) await wait(gap);
  for (let tryN = 0; tryN < 2; tryN++) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch('https://musicbrainz.org/ws/2/' + path, { headers: { Accept: 'application/json' }, signal: ctl.signal });
      if (r.status === 503 && !tryN) { await wait(2500); lastCall = Date.now(); continue; }
      if (!r.ok) throw new Error('mb ' + r.status);
      reach.ok++; return await r.json();
    } finally { clearTimeout(t); }
  }
  throw new Error('mb busy');
}
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9\u0900-\u097f\u0600-\u06ff]+/g, ' ').trim();
const toks = s => norm(s).split(' ').filter(Boolean);
function sim(a, b) {
  const x = toks(a), y = toks(b); if (!x.length || !y.length) return 0;
  const sy = new Set(y), inter = x.filter(t => sy.has(t)).length;
  return inter / Math.max(x.length, y.length) * 0.6 + inter / Math.min(x.length, y.length) * 0.4;
}
const q = s => String(s).replace(/["\\]/g, ' ').trim();
const rank = r => { const g = (r['release-group'] || {}), t = g['primary-type'] || '', sec = (g['secondary-types'] || []).length; return (t === 'Album' ? 0 : t === 'EP' ? 1 : t === 'Single' ? 2 : 3) + sec * 2 + (r.status === 'Official' ? 0 : 1.5); };
async function cover(rels) {
  for (const r of rels.slice(0, 3)) {
    try {
      const res = await fetch('https://coverartarchive.org/release/' + r.id + '/front-500');
      if (!res.ok) continue;
      const u = await window.Android.thumb(await res.blob(), 320);
      if (u) return u;
    } catch (e) {}
  }
  return '';
}
/* song: { t, a, d } -> { conf, t, a, al, yr, art } or null */
async function mbFind(song) {
  let t = q(song.t), a = q(song.a || '');
  if (!a && / - /.test(t)) { const p = t.split(' - '); a = q(p[0]); t = q(p.slice(1).join(' - ')); }
  if (!t) return null;
  const query = `recording:"${t}"` + (a ? ` AND artist:"${a}"` : '');
  const j = await mb('recording?fmt=json&limit=6&query=' + encodeURIComponent(query));
  let best = null;
  (j.recordings || []).forEach(rec => {
    const ac = (rec['artist-credit'] || []).map(c => c.name).join(' '), ts = sim(t, rec.title), as = a ? sim(a, ac) : 0.35;
    const dd = rec.length && song.d ? Math.abs(rec.length - song.d) : 99999;
    const ds = dd <= 3000 ? 0.3 : dd <= 8000 ? 0.12 : dd < 99999 ? -0.2 : 0;
    const conf = ts * 0.5 + as * 0.25 + ds + (rec.score || 0) / 100 * 0.15;
    if (!best || conf > best.conf) best = { conf, rec, ac };
  });
  if (!best || best.conf < 0.5) return null;
  const rels = (best.rec.releases || []).slice().sort((x, y) => rank(x) - rank(y) || String(x.date || '9').localeCompare(String(y.date || '9')));
  const rel = rels[0];
  /* the original year is the earliest date among official, non-compilation releases; any release is the fallback */
  const plain = rels.filter(r => r.status === 'Official' && !((r['release-group'] || {})['secondary-types'] || []).length && r.date);
  const ys = (plain.length ? plain : rels.filter(r => r.date)).map(r => +String(r.date).slice(0, 4)).filter(Boolean);
  return { src: 'mb', conf: Math.min(1, best.conf), t: best.rec.title, a: best.ac, al: rel ? rel.title : '', yr: ys.length ? Math.min(...ys) : 0, _rels: rels };
}
/* ---- source chain: iTunes India first for Bollywood, MusicBrainz as the open fallback ---- */
N.cfg = { order: ['itunes', 'mb'], on: { itunes: true, mb: true, wiki: true, adb: true, deezer: true } };
const big = u => String(u || '').replace(/\/\d+x\d+(bb)?\.(jpg|png)/, '/600x600bb.jpg');
async function bytesOrUrl(u) {
  if (!u) return '';
  try { const r = await fetch(u); if (r.ok) { const d = await window.Android.thumb(await r.blob(), 320); if (d) return d; } } catch (e) {}
  return u;   /* the picture cannot be copied (no permission from that site), so link it instead */
}
async function itunesRaw(song) {
  let t = q(song.t), a = q(song.a || '');
  if (!a && / - /.test(t)) { const p = t.split(' - '); a = q(p[0]); t = q(p.slice(1).join(' - ')); }
  if (!t) return { t, a, list: [] };
  const r = await fetch('https://itunes.apple.com/search?media=music&entity=song&country=IN&limit=12&term=' + encodeURIComponent((a + ' ' + t).trim()));
  if (!r.ok) throw new Error('itunes ' + r.status);
  const j = await r.json(); return { t, a, list: j.results || [] };
}
async function itunesFind(song) {
  const { t, a, list } = await itunesRaw(song); let best = null;
  list.forEach(x => {
    const ts = sim(t, x.trackName), as = a ? sim(a, x.artistName) : .35, dd = x.trackTimeMillis && song.d ? Math.abs(x.trackTimeMillis - song.d) : 99999;
    const ds = dd <= 3000 ? .3 : dd <= 8000 ? .12 : dd < 99999 ? -.2 : 0, conf = ts * .6 + as * .25 + ds + .1;
    if (!best || conf > best.conf) best = { conf, x };
  });
  if (!best || best.conf < .5) return null;
  const x = best.x;
  return { conf: Math.min(1, best.conf), t: x.trackName, a: x.artistName, al: x.collectionName || '', yr: x.releaseDate ? x.releaseDate.slice(0, 4) : '', g: x.primaryGenreName || '', art: await bytesOrUrl(big(x.artworkUrl100)) };
}
/* ---- the details engine ----
   Every source offers candidates. Each is scored by title, artist and length. The best match leads; matches that agree with it raise the confidence.
   Year: the earliest year that at least half the weight supports (within one year) wins, because later reissues and compilations are younger than the song.
   The file's own tag and the file name count as votes too. Nothing here writes anything: the caller decides, and manual edits always win. */
const SW = { tag: .9, name: .45, itunes: .8, mb: 1, deezer: .8 };
N.SRCNAME = { tag: 'the file', name: 'the file name', itunes: 'iTunes', mb: 'MusicBrainz', deezer: 'Deezer', me: 'you' };
const yr4 = x => { const m = String(x || '').match(/(19[2-9]\d|20[0-3]\d)/); return m ? +m[1] : 0; };
const split = song => { let t = q(song.t), a = q(song.a || ''); if (!a && / - /.test(t)) { const p = t.split(' - '); a = q(p[0]); t = q(p.slice(1).join(' - ')); } return { t, a }; };
const fit = (song, t, a, ms, ws) => { const as = a ? sim(a, ws.a) : .35, ts = sim(t, ws.t), dd = ms && song.d ? Math.abs(ms - song.d) : 99999; return ts * .55 + as * .25 + (dd <= 3000 ? .3 : dd <= 8000 ? .12 : dd < 99999 ? -.2 : 0) + .1; };
async function itunesCands(song) {
  const { t, a, list } = await itunesRaw(song), out = [];
  list.forEach(x => { const conf = fit(song, t, a, x.trackTimeMillis, { t: x.trackName, a: x.artistName }); if (conf >= .5) out.push({ src: 'itunes', conf: Math.min(1, conf), t: x.trackName, a: x.artistName, al: x.collectionName || '', yr: yr4(x.releaseDate), g: x.primaryGenreName || '', n: x.trackNumber || 0, artUrl: big(x.artworkUrl100) }); });
  return out.sort((x, y) => y.conf - x.conf).slice(0, 3);
}
async function deezerCands(song) {
  const { t, a } = split(song); if (!t) return [];
  const j = await jsonp('https://api.deezer.com/search?limit=6&q=' + encodeURIComponent(a ? `artist:"${a}" track:"${t}"` : t)), L = (j && j.data) || []; let best = null;
  L.forEach(x => { const conf = fit(song, t, a, (x.duration || 0) * 1000, { t: x.title, a: (x.artist || {}).name }); if (conf >= .5 && (!best || conf > best.conf)) best = { conf, x }; });
  if (!best) return [];
  const x = best.x; let d = {}; try { d = await jsonp('https://api.deezer.com/track/' + x.id) || {}; } catch (e) {}
  return [{ src: 'deezer', conf: Math.min(1, best.conf), t: x.title, a: (x.artist || {}).name || '', al: (x.album || {}).title || '', yr: yr4(d.release_date), n: d.track_position || 0, artUrl: (x.album || {}).cover_big || '' }];
}
async function mbCands(song) { const r = await mbFind(song); return r ? [r] : []; }
function pickYear(votes) {
  if (!votes.length) return { y: 0, c: 0 };
  const total = votes.reduce((s, v) => s + v.w, 0), ys = [...new Set(votes.map(v => v.y))].sort((p, q2) => p - q2);
  const sup = y => votes.filter(v => Math.abs(v.y - y) <= 1).reduce((s, v) => s + v.w, 0);
  let y;
  if (votes.length === 1) y = votes[0].y;
  else { y = ys.find(k => sup(k) >= total * .5); if (!y) y = ys.slice().sort((p, q2) => sup(q2) - sup(p) || p - q2)[0]; }
  const sv = votes.filter(v => Math.abs(v.y - y) <= 1), c = (sup(y) / total) * (votes.length > 1 ? .6 + .1 * Math.min(4, sv.length) : .4);
  return { y, c: Math.max(0, Math.min(1, c)) };
}
async function decide(song, C) {
  const good = C.filter(c => c.conf >= .55).sort((x, y) => y.conf * SW[y.src] - x.conf * SW[x.src]); if (!good.length) return null;
  const lead = good[0], agree = good.filter(c => c !== lead && sim(c.t, lead.t) >= .7 && (!lead.a || !c.a || sim(c.a, lead.a) >= .5));
  const first = k => { for (const c of [lead, ...agree, ...good]) if (c[k]) return c[k]; return ''; };
  const out = { conf: Math.min(1, lead.conf + Math.min(.15, agree.length * .08)), t: lead.t, a: lead.a, al: first('al'), g: first('g'), n: first('n') || 0, yr: '', yc: 0, yv: [], art: '', src: [...new Set([lead, ...agree].map(c => c.src))] };
  const votes = good.filter(c => c.yr).map(c => ({ s: c.src, y: c.yr, w: c.conf * SW[c.src] }));
  if (song.y && (song.ys === 'tag' || song.ys === 'name')) votes.push({ s: song.ys, y: song.y, w: SW[song.ys] });
  const py = pickYear(votes); if (py.y) { out.yr = String(py.y); out.yc = +py.c.toFixed(2); out.yv = votes.slice(0, 6).map(v => [v.s, v.y]); }
  const withArt = [lead, ...good].find(c => c.artUrl);
  if (withArt) out.art = await bytesOrUrl(withArt.artUrl);
  else { const m = good.find(c => c._rels && c._rels.length); if (m) out.art = await cover(m._rels); }
  return out;
}
/* song: { t, a, d, y?, ys? } -> { conf, t, a, al, yr, yc, yv, g, n, art, src } or null */
N.find = async song => {
  const on = N.cfg.on, jobs = [];
  if (on.itunes) jobs.push(itunesCands(song)); if (on.deezer !== false) jobs.push(deezerCands(song)); if (on.mb) jobs.push(mbCands(song));
  if (!jobs.length) return null;
  const res = await Promise.allSettled(jobs), bad = res.filter(r => r.status === 'rejected').length;
  if (bad === res.length) throw new Error('offline');
  return decide(song, res.flatMap(r => r.status === 'fulfilled' ? r.value : []));
};
N.test = async () => {
  const T = (name, f) => Promise.race([f().then(n => ({ name, ok: true, note: n || 'works' }), e => ({ name, ok: false, note: 'blocked or unreachable' })), new Promise(r => setTimeout(() => r({ name, ok: false, note: 'too slow' }), 9000))]);
  return Promise.all([
    T('iTunes India', async () => { const x = await itunesRaw({ t: 'Tum Hi Ho', a: 'Arijit Singh' }); if (!x.list.length) throw 0; try { const r = await fetch(big(x.list[0].artworkUrl100)); if (r.ok) { await r.blob(); return 'works, covers can be saved'; } } catch (e) {} return 'works, covers are linked online'; }),
    T('MusicBrainz', async () => { await mb('recording?fmt=json&limit=1&query=' + encodeURIComponent('recording:"Tum Hi Ho"')); }),
    T('Cover Art Archive', async () => { const r = await fetch('https://coverartarchive.org/release/76df3287-6cda-33eb-8e9a-044b5e15ffdd/front-250'); if (!r.ok) throw 0; await r.blob(); }),
    T('Lyrics (LRCLIB)', async () => { const j = await jget('https://lrclib.net/api/search?q=' + encodeURIComponent('Tum Hi Ho')); if (!Array.isArray(j)) throw 0; }),
    T('Artist photos (TheAudioDB)', async () => { const j = await jget('https://www.theaudiodb.com/api/v1/json/2/search.php?s=Arijit+Singh'); if (!j || !j.artists) throw 0; }),
    T('Artist photos (Deezer)', async () => { const j = await jsonp('https://api.deezer.com/search/artist?limit=1&q=Arijit+Singh'); if (!j || !j.data) throw 0; }),
    T('Artist info (Wikipedia)', async () => { const j = await jget('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srlimit=1&srsearch=Arijit+Singh'); if (!j || !j.query) throw 0; })
  ]);
};
/* ---- artists and albums: several free sources, each filling in what the others missed ---- */
const reach = { ok: 0 };
const MUSIC_RE = /singer|musician|composer|vocalist|lyricist|playback|band\b|rapper|qawwal|ghazal|poet|producer|songwriter|guitarist|pianist|violinist|flautist|instrumentalist|duo\b|group\b|actor|गायक|संगीत|गीतकार/i;
const cap = (s, n = 4, max = 720) => { const p = String(s || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Zऀ-ॿ])/); let t = p.slice(0, n).join(' '); if (t.length > max) t = t.slice(0, max).replace(/\s+\S*$/, '') + '…'; return t; };
const wide = u => String(u || '').replace(/\/(\d+)px-/, '/640px-');
function jsonp(url) {
  return new Promise((res, rej) => {
    const cb = 'dz' + Math.random().toString(36).slice(2), s = document.createElement('script');
    const done = () => { clearTimeout(t); delete window[cb]; s.remove(); }, t = setTimeout(() => { done(); rej(new Error('slow')); }, 10000);
    window[cb] = d => { done(); reach.ok++; res(d); }; s.onerror = () => { done(); rej(new Error('blocked')); };
    s.src = url + (url.includes('?') ? '&' : '?') + 'output=jsonp&callback=' + cb; document.head.appendChild(s);
  });
}
async function wikiArtist(n, lang) {
  const base = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*`;
  for (const term of (lang === 'hi' ? [n] : [n + ' singer musician composer', n])) {
    const j = await jget(base + '&generator=search&gsrlimit=4&gsrsearch=' + encodeURIComponent(term) + '&prop=extracts|pageimages&exintro=1&explaintext=1&exsentences=4&piprop=thumbnail&pithumbsize=640&redirects=1');
    if (!j || !j.query) continue;
    const p = Object.values(j.query.pages).sort((x, y) => x.index - y.index).filter(p => sim(n, String(p.title).replace(/\s*\(.*?\)\s*/g, ' ')) >= .6 && MUSIC_RE.test((p.extract || '') + ' ' + p.title))[0];
    if (p) return { bio: cap(p.extract), photo: p.thumbnail ? p.thumbnail.source : '' };
  }
  return null;
}
async function mbWiki(n) {
  const j = await mb('artist?fmt=json&limit=3&query=' + encodeURIComponent('artist:"' + n + '"'));
  const a = (j.artists || []).filter(x => sim(n, x.name) >= .85 && (x.score || 0) >= 80)[0]; if (!a) return null;
  const d = await mb('artist/' + a.id + '?fmt=json&inc=url-rels');
  const rel = (d.relations || []).find(r => r.type === 'wikipedia'), url = rel && rel.url && rel.url.resource, m = url && url.match(/^https?:\/\/(\w+)\.wikipedia\.org\/wiki\/(.+)$/); if (!m) return null;
  const s = await jget(`https://${m[1]}.wikipedia.org/api/rest_v1/page/summary/${m[2]}`);
  if (!s || !s.extract) return null;
  return { bio: cap(s.extract), photo: s.thumbnail ? wide(s.thumbnail.source) : '' };
}
async function audioDb(n) {
  const j = await jget('https://www.theaudiodb.com/api/v1/json/2/search.php?s=' + encodeURIComponent(n));
  const a = j && j.artists && j.artists.find(x => sim(n, x.strArtist) >= .85); if (!a) return null;
  return { bio: cap(a.strBiographyEN), photo: a.strArtistThumb || a.strArtistFanart || '' };
}
async function deezerArtist(n) {
  const j = await jsonp('https://api.deezer.com/search/artist?limit=4&q=' + encodeURIComponent(n));
  const a = (j.data || []).find(x => sim(n, x.name) >= .85 && /\/artist\/[0-9a-f]+/.test(x.picture_xl || x.picture_big || '')); if (!a) return null;
  return { bio: '', photo: a.picture_xl || a.picture_big };
}
/* name -> { bio, photo, src:{bio,photo}, at }; need = which parts are wanted (parts typed by hand are never asked for) */
N.artist = async (name, need = { bio: true, photo: true }) => {
  const n = q(name); if (!n) return null; const ok0 = reach.ok, out = { bio: '', photo: '', src: {}, at: Date.now() }, on = N.cfg.on;
  const take = (r, label) => { if (!r) return; if (need.bio && !out.bio && r.bio) { out.bio = r.bio; out.src.bio = label; } if (need.photo && !out.photo && r.photo) { out.photo = r.photo; out.src.photo = label; } };
  const done = () => (!need.bio || out.bio) && (!need.photo || out.photo);
  const steps = [['wiki', () => wikiArtist(n, 'en'), 'Wikipedia'], ['adb', () => audioDb(n), 'TheAudioDB'], ['deezer', () => deezerArtist(n), 'Deezer'], ['mb', () => mbWiki(n), 'Wikipedia'], ['wiki', () => wikiArtist(n, 'hi'), 'Wikipedia (Hindi)']];
  for (const [k, f, label] of steps) { if (done()) break; if (on[k] === false) continue; try { take(await f(), label); } catch (e) {} }
  if (!out.bio && !out.photo && reach.ok === ok0) throw new Error('offline');
  return out;
};
/* a copy of a photo kept inside the app, so it shows offline (null when the site does not allow copying) */
N.photoData = async u => { if (!u) return ''; try { const r = await fetch(u); if (r.ok) { const d = await window.Android.thumb(await r.blob(), 640); if (d) return d; } } catch (e) {} return ''; };
/* album: a front cover, the year, genre and track count, from iTunes, Deezer and MusicBrainz */
N.album = async (name, artist) => {
  const al = q(name), a = q(artist || ''); if (!al) return null; const ok0 = reach.ok, out = { cover: '', yr: '', g: '', n: 0, src: {} }, on = N.cfg.on;
  const score = (t, x) => sim(al, t) * .7 + (a ? sim(a, x) * .3 : .15);
  if (on.itunes !== false) { try {
    const j = await jget('https://itunes.apple.com/search?media=music&entity=album&country=IN&limit=8&term=' + encodeURIComponent((a + ' ' + al).trim()));
    let b = null; ((j && j.results) || []).forEach(x => { const c = score(x.collectionName, x.artistName); if (!b || c > b.c) b = { c, x }; });
    if (b && b.c >= .6) { const x = b.x; out.cover = String(x.artworkUrl100 || '').replace(/\/\d+x\d+(bb)?\.(jpg|png)/, '/1000x1000bb.jpg'); out.src.cover = 'iTunes'; out.yr = x.releaseDate ? x.releaseDate.slice(0, 4) : ''; out.g = x.primaryGenreName || ''; out.n = x.trackCount || 0; }
  } catch (e) {} }
  if (!out.cover && on.deezer !== false) { try {
    const j = await jsonp('https://api.deezer.com/search/album?limit=6&q=' + encodeURIComponent((a + ' ' + al).trim()));
    let b = null; (j.data || []).forEach(x => { const c = score(x.title, x.artist && x.artist.name); if (!b || c > b.c) b = { c, x }; });
    if (b && b.c >= .6 && /\/cover\/[0-9a-f]+/.test(b.x.cover_xl || '')) { out.cover = b.x.cover_xl; out.src.cover = 'Deezer'; if (!out.n && b.x.nb_tracks) out.n = b.x.nb_tracks; }
  } catch (e) {} }
  if ((!out.cover || !out.yr) && on.mb !== false) { try {
    const j = await mb('release-group?fmt=json&limit=5&query=' + encodeURIComponent('releasegroup:"' + al + '"' + (a ? ' AND artist:"' + a + '"' : '')));
    let b = null; (j['release-groups'] || []).forEach(x => { const c = score(x.title, (x['artist-credit'] || []).map(z => z.name).join(' ')); if (!b || c > b.c) b = { c, x }; });
    if (b && b.c >= .6) { if (!out.yr && b.x['first-release-date']) out.yr = b.x['first-release-date'].slice(0, 4); if (!out.cover) { const r = await fetch('https://coverartarchive.org/release-group/' + b.x.id + '/front-500').catch(() => null); if (r && r.ok) { out.cover = 'https://coverartarchive.org/release-group/' + b.x.id + '/front-500'; out.src.cover = 'Cover Art Archive'; } } }
  } catch (e) {} }
  if (!out.cover && !out.yr && !out.g && reach.ok === ok0) throw new Error('offline');
  return out;
};
/* up to 6 different front covers for a song */
N.covers = async song => {
  let t = q(song.t), a = q(song.a || ''); if (!t) return [];
  const out = [];
  if (N.cfg.on.itunes) { try { const { list } = await itunesRaw(song); const seen = new Set(); for (const x of list) { if (out.length >= 3) break; const u = big(x.artworkUrl100); if (!u || seen.has(x.collectionId)) continue; seen.add(x.collectionId); out.push(await bytesOrUrl(u)); } } catch (e) {} }
  if (!N.cfg.on.mb) return out;
  const j = await mb('recording?fmt=json&limit=5&query=' + encodeURIComponent(`recording:"${t}"` + (a ? ` AND artist:"${a}"` : '')));
  const rels = []; const seen = new Set();
  (j.recordings || []).forEach(rec => (rec.releases || []).forEach(r => { if (!seen.has(r.id)) { seen.add(r.id); rels.push(r); } }));
  rels.sort((x, y) => rank(x) - rank(y));
  for (const r of rels.slice(0, 10)) {
    if (out.length >= 6) break;
    try { const res = await fetch('https://coverartarchive.org/release/' + r.id + '/front-250'); if (!res.ok) continue; const u = await window.Android.thumb(await res.blob(), 320); if (u && !out.includes(u)) out.push(u); } catch (e) {}
  }
  return out;
};
/* lyrics: LRCLIB first, then lyrics.ovh. Both free, no account. */
const plain = s => String(s || '').replace(/^\[[^\]]*\]\s*/gm, '').trim();
async function jget(u) { const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000); try { const r = await fetch(u, { signal: ctl.signal }); if (!r.ok) return null; reach.ok++; return await r.json(); } catch (e) { return null; } finally { clearTimeout(t); } }
N.lyrics = async song => {
  const t = q(song.t), a = q(song.a || ''), d = song.d ? Math.round(song.d / 1000) : 0;
  if (!t) return '';
  let j = a ? await jget('https://lrclib.net/api/get?track_name=' + encodeURIComponent(t) + '&artist_name=' + encodeURIComponent(a) + (d ? '&duration=' + d : '')) : null;
  if (j && (j.plainLyrics || j.syncedLyrics)) return plain(j.plainLyrics || j.syncedLyrics);
  const l = await jget('https://lrclib.net/api/search?q=' + encodeURIComponent((a + ' ' + t).trim()));
  if (Array.isArray(l)) { const hit = l.find(x => (x.plainLyrics || x.syncedLyrics) && sim(t, x.trackName) > .7 && (!a || sim(a, x.artistName) > .5)); if (hit) return plain(hit.plainLyrics || hit.syncedLyrics); }
  if (a) { const o = await jget('https://api.lyrics.ovh/v1/' + encodeURIComponent(a) + '/' + encodeURIComponent(t)); if (o && o.lyrics) return String(o.lyrics).replace(/\r/g, '').trim(); }
  return '';
};

/* picture chooser: nine best-match pictures per page (Google if the person added a key, then open sources) */
N.pics = async (kind, name, artist, page = 0, g = {}) => {
  const base = String(kind === 'album' ? (artist ? artist + ' ' : '') + name + ' album cover art' : name + ' singer portrait'), qs = encodeURIComponent(base), off = page * 9, lists = [];
  if (g.key && g.cx) { const j = await jget(`https://www.googleapis.com/customsearch/v1?searchType=image&num=9&start=${off + 1}&key=${encodeURIComponent(g.key)}&cx=${encodeURIComponent(g.cx)}&q=${qs}`); lists.push(((j && j.items) || []).map(x => ({ u: x.link, t: (x.image && x.image.thumbnailLink) || x.link, s: 'Google' }))); }
  const jobs = [
    jget(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=9&gsroffset=${off}&gsrsearch=${encodeURIComponent(base + ' filetype:bitmap')}&prop=imageinfo&iiprop=url|mime&iiurlwidth=640`).then(j => Object.values((j && j.query && j.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0)).map(p => p.imageinfo && p.imageinfo[0]).filter(x => x && /jpeg|png|webp/.test(x.mime || '')).map(x => ({ u: x.thumburl || x.url, t: x.thumburl || x.url, s: 'Wikimedia' }))),
    jget(`https://api.openverse.org/v1/images/?page_size=9&page=${page + 1}&q=${qs}`).then(j => ((j && j.results) || []).map(x => ({ u: x.url, t: x.thumbnail || x.url, s: 'Openverse' })))
  ];
  if (!page) {
    if (kind === 'album') jobs.push(jget('https://itunes.apple.com/search?media=music&entity=album&limit=9&term=' + encodeURIComponent((artist || '') + ' ' + name)).then(j => ((j && j.results) || []).map(x => ({ u: String(x.artworkUrl100 || '').replace(/\/\d+x\d+(bb)?\.(jpg|png)/, '/1000x1000bb.jpg'), t: x.artworkUrl100, s: 'iTunes' }))));
    else jobs.push(jsonp('https://api.deezer.com/search/artist?limit=6&q=' + encodeURIComponent(name)).then(j => (j.data || []).filter(x => x.picture_xl).map(x => ({ u: x.picture_xl, t: x.picture_medium || x.picture_xl, s: 'Deezer' }))).catch(() => []));
  }
  (await Promise.all(jobs.map(j => j.catch(() => [])))).forEach(l => lists.push(l));
  const out = [], seen = new Set(); for (let r = 0; out.length < 9 && r < 9; r++) lists.forEach(l => { const x = l[r]; if (x && x.u && !seen.has(x.u) && out.length < 9) { seen.add(x.u); out.push(x); } });
  return out;
};
/* a short factual summary, used only when no source has a written introduction. Built from open data; nothing is invented. */
N.summary = async (name, kind, facts = {}) => {
  if (kind === 'album') { const b = []; if (facts.artist) b.push('An album by ' + facts.artist); else b.push('An album'); if (facts.yr) b[0] += ', released in ' + facts.yr; b[0] += '.'; if (facts.g) b.push('Genre: ' + facts.g + '.'); if (facts.n) b.push(facts.n + ' tracks.'); return b.length > 1 || facts.yr ? b.join(' ') : ''; }
  const j = await jget('https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&origin=*&language=en&limit=5&search=' + encodeURIComponent(name));
  let best = null; ((j && j.search) || []).forEach(x => { if (x.description && MUSIC_RE.test(x.description) && sim(name, x.label) >= .8 && !best) best = x; });
  let t = best ? name + ' is ' + (/^[aeiou]/i.test(best.description) ? 'an ' : 'a ') + best.description.replace(/^\s+/, '') + '.' : '';
  if (!t) { const m = await mb('artist?fmt=json&limit=3&query=' + encodeURIComponent('artist:"' + q(name) + '"')); const x = ((m && m.artists) || []).find(a => sim(name, a.name) >= .85 && (a.score || 0) >= 90); if (x) { const bits = [x.type, x.country && ('from ' + x.country), x.disambiguation].filter(Boolean); if (bits.length) t = name + ' is listed as ' + bits.join(', ') + '.'; } }
  return t;
};
N.mb = mb; N.jsonp = jsonp; N._pick = pickYear; N.jget = jget; N.sim = sim; N.q = q; N.bytesOrUrl = bytesOrUrl; N.big = big; N.itunesRaw = itunesRaw;
window.Net = N;
})();
