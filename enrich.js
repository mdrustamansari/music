/* Artist and album details from several free sources, tried one after another until the gaps are filled.
   Artist: Wikipedia (English), MusicBrainz -> Wikidata -> Wikipedia (English or Hindi) and the Wikimedia photo, Wikipedia search, Hindi Wikipedia, TheAudioDB.
   Album:  iTunes India, MusicBrainz + Cover Art Archive, Wikipedia.
   Only a name is ever sent (never audio, never your files). Every source is optional, and every answer says where it came from. */
(() => {
'use strict';
const E = { on: { wiki: true, wd: true, adb: true, hiw: true, itunes: true, mb: true } };
const N = () => window.Net;
const MUSIC = /sing|music|compos|vocal|playback|band|rap|lyric|ghazal|qawwal|songwr|guitar|pianist|violin|sitar|flute|dj\b|producer|bhajan|performer|instrument|artist|duo|group/i;
const ALBUM = /album|soundtrack|film|ep\b|record|music|songs|single/i;
const clean = (s, n = 620) => { s = String(s || '').replace(/\s+/g, ' ').replace(/\s*\((?:[^()]*\bpronounced\b[^()]*|[^()]*\blisten\b[^()]*)\)/gi, '').trim(); if (s.length <= n) return s; const cut = s.slice(0, n), i = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('। ')); return i > 160 ? cut.slice(0, i + 1) : cut.replace(/\s+\S*$/, '') + '…'; };
const wsz = u => String(u || '').replace(/\/(\d+)px-/, '/960px-');
async function wikiSummary(lang, title) {
  const j = await N().jget('https://' + lang + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(String(title).replace(/ /g, '_')) + '?redirect=true');
  if (!j || j.type !== 'standard') return null;
  return { title: j.title, desc: j.description || '', bio: clean(j.extract), photo: j.thumbnail ? wsz(j.thumbnail.source) : '', lang };
}
async function wikiSearch(lang, query, want) {
  const j = await N().jget('https://' + lang + '.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=4&gsrsearch=' + encodeURIComponent(query) + '&prop=extracts|pageimages&exintro=1&explaintext=1&exsentences=4&piprop=thumbnail&pithumbsize=960');
  if (!j || !j.query) return null;
  const pages = Object.values(j.query.pages).sort((x, y) => x.index - y.index).filter(p => want(p));
  const p = pages[0]; if (!p) return null;
  return { title: p.title, desc: '', bio: clean(p.extract), photo: p.thumbnail ? p.thumbnail.source : '', lang };
}
/* MusicBrainz knows the artist's Wikidata entry, which leads to the right Wikipedia page and a free photo, even for names that are spelled in many ways */
async function viaWikidata(qid) {
  const j = await N().jget('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=sitelinks|claims&sitefilter=enwiki|hiwiki&ids=' + qid);
  const en = j && j.entities && j.entities[qid]; if (!en) return null;
  const sl = en.sitelinks || {}, p18 = en.claims && en.claims.P18 && en.claims.P18[0] && en.claims.P18[0].mainsnak && en.claims.P18[0].mainsnak.datavalue && en.claims.P18[0].mainsnak.datavalue.value;
  let r = null;
  if (E.on.wiki && sl.enwiki) r = await wikiSummary('en', sl.enwiki.title);
  if ((!r || !r.bio) && E.on.hiw && sl.hiwiki) { const h = await wikiSummary('hi', sl.hiwiki.title); if (h && h.bio) r = Object.assign(h, { photo: (r && r.photo) || h.photo }); }
  const commons = p18 ? 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(p18) + '?width=960' : '';
  if (r) { if (!r.photo && commons) r.photo = commons; return r; }
  return commons ? { title: '', desc: '', bio: '', photo: commons, lang: 'wd' } : null;
}
async function viaMusicBrainz(name) {
  const n = N(), j = await n.mb('artist?fmt=json&limit=4&query=' + encodeURIComponent('artist:"' + n.q(name) + '"'));
  const c = (j.artists || []).filter(a => (a.score || 0) >= 80 && Math.max(n.sim(name, a.name), ...(a.aliases || []).map(x => n.sim(name, x.name))) >= .8)[0]; if (!c) return null;
  const d = await n.mb('artist/' + c.id + '?fmt=json&inc=url-rels'), rel = (d.relations || []).find(r => r.type === 'wikidata' && r.url && r.url.resource);
  if (!rel) return null; const q = rel.url.resource.split('/').pop(); return /^Q\d+$/.test(q) ? viaWikidata(q) : null;
}
async function viaWikidataSearch(name) {
  const n = N(), j = await n.jget('https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&origin=*&language=en&limit=5&search=' + encodeURIComponent(name));
  const hit = j && (j.search || []).find(x => n.sim(name, x.label) >= .8 && MUSIC.test(x.description || '')); return hit ? viaWikidata(hit.id) : null;
}
async function viaAudioDb(name) {
  const j = await N().jget(N().adb() + 'search.php?s=' + encodeURIComponent(name));
  const a = j && j.artists && j.artists[0]; if (!a || N().sim(name, a.strArtist) < .8) return null;
  return { title: a.strArtist, desc: '', bio: clean(a.strBiographyEN || ''), photo: a.strArtistThumb || a.strArtistFanart || '', lang: 'adb' };
}
const SRC_NAME = { en: 'Wikipedia', hi: 'Hindi Wikipedia', wd: 'Wikimedia Commons', adb: 'TheAudioDB' };
/* resolve a picture into a small saved copy; if the site does not allow copying, keep the link */
async function pic(u) { if (!u) return { data: '', url: '' }; try { const r = await fetch(u); if (r.ok) { const d = await window.Android.thumb(await r.blob(), 720); if (d) return { data: d, url: '' }; } } catch (e) {} return { data: '', url: u }; }
/* artist -> { bio, srcB, photoData, photoUrl, srcP, title, err } */
E.artist = async name => {
  name = String(name || '').trim(); const out = { bio: '', srcB: '', photoData: '', photoUrl: '', srcP: '', title: '' }; let errs = 0, tried = 0, cand = [];
  const run = async (f, label) => { if (out.bio && (out.photoData || out.photoUrl)) return; tried++; let r = null; try { r = await f(); } catch (e) { errs++; } if (r) cand.push([r, label]); take(); };
  const take = () => { cand.forEach(([r]) => { const l = r.lang; if (!out.bio && r.bio && r.bio.length > 40) { out.bio = r.bio; out.srcB = SRC_NAME[l] || 'Wikipedia'; out.title = r.title || out.title; } if (!out.photoData && !out.photoUrl && r.photo) { out._p = r.photo; out.srcP = SRC_NAME[l] || 'Wikipedia'; } }); cand = []; };
  if (E.on.wiki) await run(async () => { const r = await wikiSummary('en', name); return r && MUSIC.test(r.desc + ' ' + r.bio.slice(0, 220)) ? r : null; }, 'wiki');
  if (E.on.wd && E.on.mb) await run(() => viaMusicBrainz(name), 'mb');
  if (E.on.wd) await run(() => viaWikidataSearch(name), 'wds');
  if (E.on.wiki) await run(() => wikiSearch('en', name + ' singer OR musician OR composer OR band', p => N().sim(name, p.title) > .6), 'search');
  if (E.on.hiw && /[ऀ-ॿ]/.test(name)) await run(() => wikiSearch('hi', name, p => N().sim(name, p.title) > .6), 'hi');
  if (E.on.adb) await run(() => viaAudioDb(name), 'adb');
  if (out._p) { const p = await pic(out._p); out.photoData = p.data; out.photoUrl = p.url; } delete out._p;
  if (!tried || (errs === tried && !out.bio && !out.photoData && !out.photoUrl)) out.err = true;
  return out;
};
/* album -> { cover (data or url), srcC, year, genre, about, srcA, err } */
E.album = async (name, artist) => {
  name = String(name || '').trim(); const out = { cover: '', coverIsUrl: false, srcC: '', year: '', genre: '', about: '', srcA: '', tracks: 0 }; let errs = 0, tried = 0; const n = N();
  if (!name) return out;
  const art = artist && artist !== 'Unknown artist' ? artist : '';
  if (E.on.itunes) { tried++; try {
    const r = await fetch('https://itunes.apple.com/search?media=music&entity=album&country=IN&limit=8&term=' + encodeURIComponent((art + ' ' + name).trim()));
    if (!r.ok) throw 0; const j = await r.json(); let best = null;
    (j.results || []).forEach(x => { const s = n.sim(name, x.collectionName) * .7 + (art ? n.sim(art, x.artistName) * .3 : .15); if (s >= .62 && (!best || s > best.s)) best = { s, x }; });
    if (best) { const x = best.x; out.year = x.releaseDate ? x.releaseDate.slice(0, 4) : ''; out.genre = x.primaryGenreName || ''; out.tracks = x.trackCount || 0; const p = await pic(n.big(x.artworkUrl100)); if (p.data || p.url) { out.cover = p.data || p.url; out.coverIsUrl = !p.data; out.srcC = 'iTunes'; } }
  } catch (e) { errs++; } }
  if (!out.cover && E.on.mb) { tried++; try {
    const j = await n.mb('release-group?fmt=json&limit=4&query=' + encodeURIComponent('releasegroup:"' + n.q(name) + '"' + (art ? ' AND artist:"' + n.q(art) + '"' : '')));
    const g = (j['release-groups'] || []).filter(x => (x.score || 0) >= 80 && n.sim(name, x.title) >= .75)[0];
    if (g) { try { const res = await fetch('https://coverartarchive.org/release-group/' + g.id + '/front-500'); if (res.ok) { const d = await window.Android.thumb(await res.blob(), 720); if (d) { out.cover = d; out.srcC = 'Cover Art Archive'; } } } catch (e) {} if (!out.year && g['first-release-date']) out.year = g['first-release-date'].slice(0, 4); }
  } catch (e) { errs++; } }
  if (E.on.wiki) { tried++; try {
    const r = await wikiSearch('en', '"' + name + '" ' + (art ? art + ' ' : '') + 'album OR soundtrack OR film', p => n.sim(name.replace(/\s*\(.*?\)/g, ''), p.title.replace(/\s*\(.*?\)/g, '')) > .6 && ALBUM.test((p.extract || '').slice(0, 300)));
    if (r && r.bio) { out.about = r.bio; out.srcA = 'Wikipedia'; if (!out.cover && r.photo && /album|soundtrack|film|cover/i.test(r.title + r.bio.slice(0, 120))) { const p = await pic(r.photo); if (p.data || p.url) { out.cover = p.data || p.url; out.coverIsUrl = !p.data; out.srcC = 'Wikipedia'; } } }
  } catch (e) { errs++; } }
  if (!tried || (errs === tried && !out.cover && !out.about)) out.err = true;
  return out;
};
E.test = async () => {
  const T = (name, f) => Promise.race([f().then(() => ({ name, ok: true, note: 'works' }), () => ({ name, ok: false, note: 'blocked or unreachable' })), new Promise(r => setTimeout(() => r({ name, ok: false, note: 'too slow' }), 9000))]);
  return Promise.all([
    T('Wikipedia summaries', async () => { if (!await wikiSummary('en', 'Arijit Singh')) throw 0; }),
    T('Wikidata', async () => { if (!await N().jget('https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&origin=*&language=en&limit=1&search=Arijit+Singh')) throw 0; }),
    T('Hindi Wikipedia', async () => { if (!await wikiSummary('hi', 'अरिजीत सिंह')) throw 0; }),
    T('TheAudioDB', async () => { if (!await N().jget(N().adb() + 'search.php?s=arijit%20singh')) throw 0; })
  ]);
};
window.Enrich = E;
})();
