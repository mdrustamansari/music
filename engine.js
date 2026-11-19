window.MP_DEVICE = 'nord5'; /* device build tag: nord5 or mi11x (picks the tuned profile) */
/* Rustam's Music — web engine. Same "Android" door the screen already knows, but made of browser parts:
   songs are copied into the app's own storage (IndexedDB), played with an audio element, shown on the lock screen with Media Session. */
(() => {
'use strict';
const E = { web: true };
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- storage ---------- */
let db = null;
const idb = () => new Promise((res, rej) => {
  const r = indexedDB.open('rustams-music', 1);
  r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('meta', { keyPath: 'id' }); d.createObjectStore('files'); d.createObjectStore('art'); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const tx = (store, mode, fn) => new Promise((res, rej) => { const t = db.transaction(store, mode), s = t.objectStore(store), r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); });
const put = (store, val, key) => { if (LZ.size) LZ.delete(store + '|' + (key === undefined ? val.id : key)); return tx(store, 'readwrite', s => key === undefined ? s.put(val) : s.put(val, key)); };
/* background results (found artwork, auto details) wait in RAM and go to disk in one transaction: once per new track, when hidden, or every 10 min (Optimisation on) */
const LZ = new Map();
const lput = (store, val, key) => { if (!(window.MPS && MPS.on)) return put(store, val, key); LZ.set(store + '|' + (key === undefined ? val.id : key), [store, val, key]); if (!LZ.t) LZ.t = setTimeout(lflush, 600000); return Promise.resolve(); };
const lflush = () => { clearTimeout(LZ.t); LZ.t = 0; if (!LZ.size || !db) return; const L = [...LZ.values()]; LZ.clear(); try { const names = [...new Set(L.map(x => x[0]))], t = db.transaction(names, 'readwrite'); L.forEach(([st, v, k]) => k === undefined ? t.objectStore(st).put(v) : t.objectStore(st).put(v, k)); } catch (e) {} };
addEventListener('mp-track', () => setTimeout(lflush, 3500)); addEventListener('pagehide', lflush); document.addEventListener('visibilitychange', () => { if (document.hidden) lflush(); });
const getv = (store, key) => tx(store, 'readonly', s => s.get(key));
const allv = store => tx(store, 'readonly', s => s.getAll());
const delv = (store, key) => { LZ.delete(store + '|' + key); return tx(store, 'readwrite', s => s.delete(key)); };

let metas = [], artMap = new Map();
/* Shared storage with RAM first: reads come from memory; with Optimisation on, writes are gathered and sent to disk together
   (once per new track, when hidden or closed, and every 10 min at most, and at once when the app is hidden or closed). Off = every write goes straight to disk, as in 0.30. */
const MPS = window.MPS = { on: true, pend: {}, n: 0, t: 0 };
MPS.flush = () => { clearTimeout(MPS.t); MPS.t = 0; const p = MPS.pend; MPS.pend = {}; for (const k in p) { try { localStorage.setItem(k, p[k]); MPS.n++; } catch (e) {} } };
MPS.get = (k, d) => { try { const v = k in MPS.pend ? MPS.pend[k] : localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
/* only background and counting data waits in RAM; anything you chose (ratings, playlists, favourites, settings) is saved at once */
const LAZY = new Set(['mp_saved', 'mp_artist', 'mp_album', 'mp_sdet', 'mp_artup', 'mp_syncmsg', 'mp_plays', 'mp_loops', 'mp_heat', 'mp_gain', 'mp_energy', 'mp_tried', 'mp_loud', 'mp_alx', 'mp_use', 'mp_alq', 'mp_djhist']);
MPS.set = (k, v) => { let j; try { j = JSON.stringify(v); } catch (e) { return; } if (!MPS.on || !LAZY.has(k)) { try { localStorage.setItem(k, j); MPS.n++; } catch (e) {} return; } MPS.pend[k] = j; if (!MPS.t) MPS.t = setTimeout(MPS.flush, 600000); };
addEventListener('mp-track', () => setTimeout(MPS.flush, 2500));
['pagehide', 'visibilitychange'].forEach(ev => addEventListener(ev, () => { if (ev === 'pagehide' || document.hidden) MPS.flush(); }));
const store = { get: MPS.get, set: MPS.set };

/* ---------- reading tags (ID3 for MP3; other formats use the file name) ---------- */
function decode(b, enc) {
  try {
    if (enc === 1) { const le = !(b[0] === 0xFE && b[1] === 0xFF); return new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(b.subarray(2)).replace(/\0+$/, ''); }
    if (enc === 2) return new TextDecoder('utf-16be').decode(b).replace(/\0+$/, '');
    return new TextDecoder(enc === 3 ? 'utf-8' : 'latin1').decode(b).replace(/\0+$/, '');
  } catch (e) { return ''; }
}
/* a four-digit year from a tag or a file name; the original release year wins over a re-release when both are present */
const yearOf = x => { const m = String(x || '').match(/(?:^|[^0-9])(19[2-9]\d|20[0-3]\d)(?!\d)/); return m ? +m[1] : 0; };
const yearClue = name => yearOf(String(name || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/\b(?:\d{3,4}\s?kbps|\d{2,3}\s?khz|24\s?bit|1080p|720p)\b/gi, ''));
async function readTags(file) {
  const out = { t: '', a: '', al: '', g: '', y: 0, yo: 0, n: 0, pic: null };
  try {
    const buf = new Uint8Array(await file.slice(0, 600 * 1024).arrayBuffer());
    if (buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return out;
    const ver = buf[3], size = ((buf[6] & 127) << 21) | ((buf[7] & 127) << 14) | ((buf[8] & 127) << 7) | (buf[9] & 127);
    let p = 10; const end = Math.min(buf.length, 10 + size);
    while (p + 10 < end) {
      const id = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3]);
      if (!/^[A-Z0-9]{4}$/.test(id)) break;
      const fs = ver === 4 ? ((buf[p + 4] & 127) << 21) | ((buf[p + 5] & 127) << 14) | ((buf[p + 6] & 127) << 7) | (buf[p + 7] & 127) : (buf[p + 4] << 24) | (buf[p + 5] << 16) | (buf[p + 6] << 8) | buf[p + 7];
      const body = buf.subarray(p + 10, p + 10 + fs);
      if (id === 'TIT2') out.t = decode(body.subarray(1), body[0]);
      else if (id === 'TPE1') out.a = decode(body.subarray(1), body[0]);
      else if (id === 'TALB') out.al = decode(body.subarray(1), body[0]);
      else if (id === 'TYER' || id === 'TDRC') out.y = yearOf(decode(body.subarray(1), body[0]));
      else if (id === 'TORY' || id === 'TDOR') out.yo = yearOf(decode(body.subarray(1), body[0]));
      else if (id === 'TRCK') out.n = parseInt(decode(body.subarray(1), body[0]), 10) || 0;
      else if (id === 'TCON') out.g = (decode(body.subarray(1), body[0]) || '').replace(/\(\d+\)/g, '').replace(/\0/g, ' ').trim();
      else if (id === 'APIC' && !out.pic) {
        const enc = body[0]; let i = 1; while (i < body.length && body[i] !== 0) i++;
        const mime = decode(body.subarray(1, i), 0) || 'image/jpeg'; i += 2;
        if (enc === 1 || enc === 2) { while (i + 1 < body.length && !(body[i] === 0 && body[i + 1] === 0)) i += 2; i += 2; } else { while (i < body.length && body[i] !== 0) i++; i++; }
        out.pic = new Blob([body.subarray(i)], { type: /\//.test(mime) ? mime : 'image/jpeg' });
      }
      p += 10 + fs; if (fs <= 0) break;
    }
  } catch (e) {}
  return out;
}
async function thumb(blob, size = 320) {
  try {
    const bmp = await createImageBitmap(blob), c = document.createElement('canvas'), k = Math.min(1, size / Math.min(bmp.width, bmp.height));
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  } catch (e) { return ''; }
}
const duration = file => new Promise(res => {
  const a = new Audio(), u = URL.createObjectURL(file);
  const done = v => { URL.revokeObjectURL(u); res(v); };
  a.preload = 'metadata'; a.onloadedmetadata = () => done(isFinite(a.duration) ? Math.round(a.duration * 1000) : 0); a.onerror = () => done(0);
  setTimeout(() => done(0), 8000); a.src = u;
});

/* ---------- adding songs ---------- */
const input = document.createElement('input');
input.type = 'file'; input.multiple = true; input.accept = 'audio/*,.mp3,.m4a,.aac,.flac,.ogg,.opus,.wav';
input.style.display = 'none'; document.documentElement.appendChild(input);
E.pick = () => { input.value = ''; input.click(); };
/* details kept aside: they come from a backup file, or from songs removed from the app. When the same song is added again
   (same file name and size, or the same content) its details and cover are attached again. */
let stash = { r: [], a: {} };
const stashSave = () => { stash.r = stash.r.slice(-4000); return put('art', JSON.stringify(stash), 'bk:details').catch(() => {}); };
const recOf = m => ({ f: m.f, size: m.size, h: m.h && !/^x/.test(m.h) ? m.h : '', t: m.t, a: m.a, al: m.al, y: m.y, ys: m.ys, yc: m.yc, yv: m.yv, g: m.g, n: m.n, ly: m.ly, man: m.man, orig: m.orig, ak: m.ak });
const keep = list => { list.forEach(m => { const r = recOf(m); stash.r = stash.r.filter(x => !(x.f === r.f && x.size === r.size)); stash.r.push(r); if (m.ak && artMap.has(m.ak)) stash.a[m.ak] = artMap.get(m.ak); if (m.orig && m.orig.ak && artMap.has(m.orig.ak)) stash.a[m.orig.ak] = artMap.get(m.orig.ak); }); };
async function attach(m, r) {
  ['t', 'a', 'al', 'y', 'ys', 'yc', 'yv', 'g', 'n', 'ly', 'man', 'orig'].forEach(k => { if (r[k] !== undefined) m[k] = r[k]; });
  if (r.h) m.h = r.h;
  if (r.ak) {
    const u = stash.a[r.ak] || artMap.get(r.ak), key = /^m:/.test(r.ak) ? 'm:' + m.id : r.ak;
    if (u) { artMap.set(key, u); await put('art', u, key); m.ak = key; }
  }
  if (m.orig && /^m:/.test(m.orig.ak || '')) m.orig.ak = '';
  m.p = m.al || m.a || m.p;
}
const found = async (f, can) => {
  if (!stash.r.length) return null;
  let r = stash.r.find(x => x.f === f.name && x.size === f.size);
  if (!r && can) { try { const h = hex(await crypto.subtle.digest('SHA-256', await f.arrayBuffer())) + ':' + f.size; r = stash.r.find(x => x.h === h); } catch (x) {} }
  return r || null;
};
E.dumpDetails = () => { const own = new Set(metas.map(m => m.f + '|' + m.size)); const old = stash.r.filter(x => !own.has(x.f + '|' + x.size)); const keepS = { r: stash.r, a: stash.a }; stash = { r: old, a: stash.a }; keep(metas.concat(trash)); const out = { r: stash.r, a: stash.a }; stash = keepS; return out; };
E.loadDetails = async d => {
  if (!d || !Array.isArray(d.r)) return 0;
  const keys = new Set(d.r.map(x => x.f + '|' + x.size)); stash.r = stash.r.filter(x => !keys.has(x.f + '|' + x.size)).concat(d.r); Object.assign(stash.a, d.a || {});
  let n = 0;
  for (const m of metas) { if (m.man || m.orig) continue; const r = d.r.find(x => x.f === m.f && x.size === m.size); if (r && (r.man || r.orig)) { await attach(m, r); await put('meta', m); stash.r = stash.r.filter(x => x !== r); n++; } }
  await stashSave(); return n;
};
E.detailsPending = () => stash.r.length;
const AUDIO = /\.(mp3|m4a|aac|flac|ogg|opus|wav)$/i;
async function addFiles(files) {
  files = files.filter(f => AUDIO.test(f.name) || /^audio\//.test(f.type));
  if (!files.length) { window.__libChanged && window.__libChanged('No songs found', true); return; }
  let added = 0, skipped = 0, n = 0, back = 0;
  const day = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  for (const f of files) {
    n++; window.__libChanged && window.__libChanged('Adding ' + n + ' of ' + files.length + '…', false);
    await new Promise(r => setTimeout(r, 0));
    if (metas.some(m => m.f === f.name && m.size === f.size)) { skipped++; continue; }
    const d = await duration(f);
    if (!d || d < 20000) { skipped++; continue; }
    const tg = await readTags(f), id = uniqId();
    const key = (tg.al || tg.a || f.name) + ''; let hasArt = false;
    if (tg.pic && !artMap.has(key)) { const u = await thumb(tg.pic); if (u) { artMap.set(key, u); await put('art', u, key); hasArt = true; } } else if (artMap.has(key)) hasArt = true;
    const yy = tg.yo || tg.y || 0, yc = yy ? 0 : yearClue(f.name);
    const m = { id, g: tg.g || '', y: yy || yc, ys: yy ? 'tag' : yc ? 'name' : '', t: tg.t || f.name, a: tg.a, al: tg.al, d, p: tg.al ? tg.al : tg.a ? tg.a : 'Added ' + day, f: f.name, ad: Math.floor(Date.now() / 1000), size: f.size, ak: hasArt ? key : '' };
    const r = await found(f, true);
    if (r) { await attach(m, r); stash.r = stash.r.filter(x => x !== r); back++; }
    await put('files', f, id); await put('meta', m); metas.push(m); added++;
    if (n % 5 === 0) window.__libChanged && window.__libChanged('Adding ' + n + ' of ' + files.length + '…', true);
  }
  if (back) await stashSave();
  window.__libChanged && window.__libChanged(added ? added + ' song' + (added === 1 ? '' : 's') + ' added' + (back ? ', ' + back + ' with your details back' : '') + (skipped ? ', ' + skipped + ' skipped' : '') : 'Nothing new to add', true);
}
input.addEventListener('change', () => addFiles([...input.files]));
const dirIn = document.createElement('input'); dirIn.type = 'file'; dirIn.multiple = true; dirIn.setAttribute('webkitdirectory', ''); dirIn.style.display = 'none'; document.documentElement.appendChild(dirIn);
E.pickFolder = () => { dirIn.value = ''; dirIn.click(); };
dirIn.addEventListener('change', () => addFiles([...dirIn.files]));
/* ---------- one-click tagged copies: your details written into copies of the songs, collected in zip files ----------
   MP3 gets proper ID3 tags and the cover inside. Other formats are copied as they are and listed in a small table. */
const crcT = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
async function crcOf(blob) { let c = -1; for (let o = 0; o < blob.size; o += 1 << 20) { const u = new Uint8Array(await blob.slice(o, o + (1 << 20)).arrayBuffer()); for (let i = 0; i < u.length; i++) c = crcT[(c ^ u[i]) & 255] ^ (c >>> 8); } return (c ^ -1) >>> 0; }
const te = new TextEncoder(), cc = ps => { let n = 0; ps.forEach(p => n += p.length); const o = new Uint8Array(n); let k = 0; ps.forEach(p => { o.set(p, k); k += p.length; }); return o; };
const ss = n => [(n >>> 21) & 127, (n >>> 14) & 127, (n >>> 7) & 127, n & 127];
const frm = (id, body, fl = [0, 0]) => cc([te.encode(id), Uint8Array.from(ss(body.length)), Uint8Array.from(fl), body]);
const tfr = (id, v) => v === undefined || v === null || v === '' ? null : frm(id, cc([[3], te.encode(String(v))]));
const OURS = new Set(['TIT2', 'TPE1', 'TALB', 'TYER', 'TDRC', 'TCON', 'TRCK', 'USLT', 'APIC']), V3ONLY = new Set(['TYER', 'TDAT', 'TIME', 'TRDA', 'TORY', 'IPLS', 'RVAD', 'EQUA', 'TSIZ']);
async function oldTag(f) {
  const h = new Uint8Array(await f.slice(0, 10).arrayBuffer());
  if (h[0] !== 0x49 || h[1] !== 0x44 || h[2] !== 0x33) return { size: 0, frames: [] };
  const ver = h[3], sz = (h[6] << 21) | (h[7] << 14) | (h[8] << 7) | h[9], total = 10 + sz + ((h[5] & 16) ? 10 : 0), frames = [];
  if ((ver === 3 || ver === 4) && !(h[5] & 128)) {
    const b = new Uint8Array(await f.slice(10, 10 + sz).arrayBuffer()); let o = 0;
    if (h[5] & 64) o = ver === 4 ? ((b[0] << 21) | (b[1] << 14) | (b[2] << 7) | b[3]) : (b[0] * 16777216 + (b[1] << 16) + (b[2] << 8) + b[3] + 4);
    while (o + 10 <= b.length && b[o]) {
      const id = String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
      const fs = ver === 4 ? ((b[o + 4] << 21) | (b[o + 5] << 14) | (b[o + 6] << 7) | b[o + 7]) : (b[o + 4] * 16777216 + (b[o + 5] << 16) + (b[o + 6] << 8) + b[o + 7]);
      if (fs < 0 || o + 10 + fs > b.length) break;
      const ok = !OURS.has(id) && !(ver === 3 && (V3ONLY.has(id) || (b[o + 9] & 0xC0))) && !(ver === 4 && (b[o + 9] & 0x0C));
      if (ok) frames.push(frm(id, b.slice(o + 10, o + 10 + fs), ver === 4 ? [b[o + 8], b[o + 9]] : [0, 0]));
      o += 10 + fs;
    }
  }
  return { size: total, frames };
}
async function tagged(m, f) {
  const old = await oldTag(f), fr = [tfr('TIT2', m.t), tfr('TPE1', m.a), tfr('TALB', m.al), tfr('TDRC', m.y || ''), tfr('TCON', m.g), tfr('TRCK', m.n || '')];
  if (m.ly) fr.push(frm('USLT', cc([[3], te.encode('eng'), [0], te.encode(m.ly)])));
  const u = m.ak && artMap.get(m.ak);
  if (u && /^data:image\/(jpeg|png);base64,/.test(u)) { const mi = u.slice(5, u.indexOf(';')), bin = atob(u.slice(u.indexOf(',') + 1)), by = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) by[i] = bin.charCodeAt(i); fr.push(frm('APIC', cc([[3], te.encode(mi), [0, 3, 0], by]))); }
  const body = cc(fr.filter(Boolean).concat(old.frames)), head = cc([te.encode('ID3'), [4, 0, 0], Uint8Array.from(ss(body.length))]);
  return new Blob([head, body, f.slice(old.size)], { type: 'audio/mpeg' });
}
const le = (n, b) => { const a = new Uint8Array(b); for (let i = 0; i < b; i++) a[i] = Math.floor(n / 2 ** (8 * i)) & 255; return a; };
async function zipOf(items) {
  const chunks = [], cd = []; let off = 0; const d = new Date(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const it of items) {
    const nm = te.encode(it.name), crc = it.crc !== undefined ? it.crc : await crcOf(it.blob), sz = it.blob.size;
    const lh = cc([le(0x04034b50, 4), le(20, 2), le(0x0800, 2), le(0, 2), le(tm, 2), le(dt, 2), le(crc, 4), le(sz, 4), le(sz, 4), le(nm.length, 2), le(0, 2), nm]);
    cd.push(cc([le(0x02014b50, 4), le(20, 2), le(20, 2), le(0x0800, 2), le(0, 2), le(tm, 2), le(dt, 2), le(crc, 4), le(sz, 4), le(sz, 4), le(nm.length, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 4), le(off, 4), nm]));
    chunks.push(lh, it.blob); off += lh.length + sz;
  }
  const cdb = cc(cd), end = cc([le(0x06054b50, 4), le(0, 2), le(0, 2), le(items.length, 2), le(items.length, 2), le(cdb.length, 4), le(off, 4), le(0, 2)]);
  return new Blob([...chunks, cdb, end], { type: 'application/zip' });
}
E.exportTagged = async (progress, cap = 400 * 1048576) => {
  const used = new Set(), items = [], other = []; let mp3 = 0, n = 0;
  for (const m of metas) {
    n++; progress && progress(n, metas.length); await new Promise(r => setTimeout(r, 0));
    const f = await getv('files', m.id); if (!f) continue;
    let nm = (m.f || m.t || m.id).replace(/[\\/:*?"<>|]/g, '_'), k = 1; const base = nm.replace(/(\.[a-z0-9]{2,5})$/i, ''), ext = (nm.match(/\.[a-z0-9]{2,5}$/i) || [''])[0];
    while (used.has(nm.toLowerCase())) nm = base + ' (' + (++k) + ')' + ext; used.add(nm.toLowerCase());
    if (/\.mp3$/i.test(nm)) { try { items.push({ name: nm, blob: await tagged(m, f), size: m.size }); mp3++; continue; } catch (x) {} }
    items.push({ name: nm, blob: f, size: m.size }); other.push(m);
  }
  const parts = []; let cur = [], sum = 0;
  items.forEach(it => { if (cur.length && sum + it.blob.size > cap) { parts.push(cur); cur = []; sum = 0; } cur.push(it); sum += it.blob.size; });
  if (cur.length) parts.push(cur);
  const csv = '﻿file,title,artist,album,year,genre,track\n' + other.map(m => [m.f, m.t, m.a, m.al, m.y || '', m.g, m.n || ''].map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n') + '\n';
  const del = 'These files are now inside the tagged zip files. After you have unpacked them and checked the songs, you may delete the originals.\r\n\r\n' + items.map(i => i.name).join('\r\n') + '\r\n';
  if (parts.length) { parts[0].unshift({ name: 'Originals you may delete.txt', blob: new Blob([del]) }); if (other.length) parts[0].unshift({ name: 'Details for other formats.csv', blob: new Blob([csv]) }); }
  const out = [], day = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < parts.length; i++) { const b = await zipOf(parts[i]); out.push({ name: 'tagged-songs-' + day + (parts.length > 1 ? '-part-' + (i + 1) + '-of-' + parts.length : '') + '.zip', blob: b, count: parts[i].filter(x => x.size).length, size: b.size }); }
  return { parts: out, mp3, other: other.length };
};
/* details found online or typed by hand: kept inside the app, with the originals so they can be restored */
E.thumb = thumb;
E.speed = r => { audio.defaultPlaybackRate = r; audio.playbackRate = r; try { audio.preservesPitch = true; } catch (x) {} };
E.setMeta = async (id, p, by) => {
  const m = metaOf(id); if (!m) return false;
  const man = m.man || {}, auto = by === 'auto'; let did = false;
  /* details typed or chosen by hand are marked, and later automatic updates leave them alone */
  const take = f => { if (auto && man[f]) return false; if (by === 'me') man[f] = 1; did = true; return true; };
  if (!m.orig) m.orig = { t: m.t, a: m.a, al: m.al, ak: m.ak, p: m.p, ly: m.ly || '', y: m.y || 0, ys: m.ys || '', g: m.g || '', n: m.n || 0 };
  if (p.ly != null && take('ly')) m.ly = p.ly; if (p.t && take('t')) m.t = p.t; if (p.a != null && take('a')) m.a = p.a; if (p.al != null && take('al')) m.al = p.al;
  if (p.y !== undefined && take('y')) { m.y = Math.max(0, +p.y || 0); m.ys = p.ys || (by === 'me' ? 'me' : 'online'); m.yc = p.yc || 0; m.yv = Array.isArray(p.yv) ? p.yv.slice(0, 6) : undefined; }
  if (p.g !== undefined && take('g')) m.g = String(p.g || '');
  if (p.n !== undefined && take('n')) m.n = Math.max(0, +p.n || 0);
  if (p.art && take('art')) { const key = 'm:' + id; artMap.set(key, p.art); await (by === 'auto' ? lput : put)('art', p.art, key); m.ak = key; }
  if (p.artKey && artMap.has(p.artKey) && take('art')) m.ak = p.artKey;
  if (by === 'me') { m.man = man; try { MPS.set('mp_detat', Date.now()); } catch (x) {} }
  if (!did) { if (!by) { await put('meta', m); } return false; }
  if (/^Added /.test(m.p) && (m.al || m.a)) m.p = m.al || m.a;
  await (by === 'auto' ? lput : put)('meta', m); if (queue[index] === id) updateSession(); return true;
};
E.imgKeys = () => [...artMap.keys()];
E.img = key => artMap.get(key) || '';
E.imgPut = async (key, u) => { if (!u) return; artMap.set(key, u); await lput('art', u, key); };
E.imgDel = async key => { artMap.delete(key); try { await delv('art', key); } catch (x) {} };
E.revertMeta = async id => {
  const m = metaOf(id); if (!m || !m.orig) return false;
  if (m.ak === 'm:' + id) { artMap.delete(m.ak); await delv('art', m.ak); }
  Object.assign(m, { t: m.orig.t, a: m.orig.a, al: m.orig.al, ak: m.orig.ak, p: m.orig.p, ly: m.orig.ly || '', y: m.orig.y || 0, ys: m.orig.ys || '', g: m.orig.g || '', n: m.orig.n || 0 }); delete m.yc; delete m.yv; delete m.orig; delete m.man;
  await put('meta', m); if (queue[index] === id) updateSession(); return true;
};
E.removeFolder = async name => {
  keep(metas.filter(m => m.p === name)); stashSave();
  const gone = metas.filter(m => m.p === name).map(m => m.id);
  for (const id of gone) { await delv('files', id); await delv('meta', id); }
  metas = metas.filter(m => m.p !== name);
  const cur = queue[index]; queue = queue.filter(id => !gone.includes(id)); qv++;
  if (cur && gone.includes(cur)) { index = Math.min(index, Math.max(0, queue.length - 1)); pendingPos = 0; if (queue.length) load(playing); else stop(); }
  else if (cur) index = queue.indexOf(cur);
};


let idSeq = 0; function uniqId() { let id; do { id = String(Date.now()) + String(Math.floor(Math.random() * 1e4)).padStart(4, '0') + (idSeq++ % 10); } while (metas.some(m => m.id === id) || trash.some(m => m.id === id)); return id; }
/* ---------- duplicates, removing and the 7-day "Recently removed" place ----------
   Only this app's own copy is ever removed; the file on the phone is never touched. */
let trash = [];
const WEEK = 7 * 864e5;
async function purge() { const old = trash.filter(m => Date.now() - m.rm > WEEK); if (old.length) { keep(old); stashSave(); } for (const m of old) { try { await delv('files', m.id); await delv('meta', m.id); } catch (x) {} } trash = trash.filter(m => !old.includes(m)); }
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
/* one quiet pass: a content fingerprint and the genre for songs that lack them; n songs per call */
E.index = async (n = 1) => {
  const todo = metas.filter(m => !m.h || m.g === undefined || m.y === undefined);
  for (const m of todo.slice(0, n)) {
    try {
      const f = await getv('files', m.id); if (!f) { m.h = m.h || 'x' + m.id; m.g = m.g || ''; continue; }
      if (!m.h) m.h = hex(await crypto.subtle.digest('SHA-256', await f.arrayBuffer())) + ':' + f.size;
      if (m.g === undefined || m.y === undefined) { const tg = await readTags(f); if (m.g === undefined) m.g = tg.g || ''; if (m.y === undefined) { const yy = tg.yo || tg.y || 0, yc = yy ? 0 : yearClue(m.f); m.y = yy || yc; m.ys = yy ? 'tag' : yc ? 'name' : ''; } }
      await put('meta', m);
    } catch (x) { m.h = m.h || 'x' + m.id; m.g = m.g || ''; if (m.y === undefined) m.y = 0; }
  }
  return Math.max(0, todo.length - n);
};
const normT = s => (s || '').toLowerCase().replace(/\.[a-z0-9]{2,4}$/, '').replace(/\s*\(\d+\)\s*$/, '').replace(/[\s_\-–—.()\[\]]+/g, ' ').replace(/\b(official|audio|video|lyrics?|hd|copy)\b/g, '').trim();
E.dups = () => {
  const by = new Map(), near = new Map();
  metas.forEach(m => { if (m.h && !/^x/.test(m.h)) (by.get(m.h) || by.set(m.h, []).get(m.h)).push(m); });
  const exact = [...by.values()].filter(g => g.length > 1);
  const inEx = new Set(exact.flat().map(m => m.id));
  metas.forEach(m => { if (inEx.has(m.id)) return; const k = normT(m.t); if (k.length < 2) return; (near.get(k) || near.set(k, []).get(k)).push(m); });
  const nearG = [...near.values()].filter(g => g.length > 1 && g.some(x => Math.abs(x.d - g[0].d) < 4000) && new Set(g.map(x => x.h)).size > 1);
  const ids = g => g.map(m => m.id);
  return JSON.stringify({ exact: exact.map(ids), near: nearG.map(ids), pending: metas.filter(m => !m.h).length });
};
const rank = m => (m.man ? Object.keys(m.man).length * 3 : 0) + (m.ak ? 2 : 0) + (m.ly ? 1 : 0) - (m.ad || 0) / 1e12;
function toTrash(ids, to) {
  const set = new Set(ids), gone = metas.filter(m => set.has(m.id)); if (!gone.length) return [];
  const cur = queue[index];
  gone.forEach(m => { m.rm = Date.now(); trash.push(m); put('meta', m); });
  metas = metas.filter(m => !set.has(m.id));
  if (to) queue = queue.map(id => set.has(id) ? (to[id] || id) : id);
  queue = queue.filter((id, i) => !set.has(id) && queue.indexOf(id) === i); qv++;
  if (cur && set.has(cur)) { const k = (to && to[cur]) ? queue.indexOf(to[cur]) : -1; if (k >= 0) index = k; else { index = Math.min(index, Math.max(0, queue.length - 1)); pendingPos = 0; if (queue.length) load(playing); else stop(); } }
  else if (cur) index = Math.max(0, queue.indexOf(cur));
  return gone.map(m => m.id);
}
/* removes the extra copies of byte-identical files; returns [{from, to}] so the app can merge plays, ratings, favourites and playlists */
E.dedupe = () => {
  const g = JSON.parse(E.dups()).exact, moves = [], to = {};
  g.forEach(ids => { const L = ids.map(metaOf).sort((a, b) => rank(b) - rank(a)), k = L[0]; L.slice(1).forEach(m => { moves.push({ from: m.id, to: k.id }); to[m.id] = k.id; }); });
  toTrash(moves.map(x => x.from), to); return JSON.stringify(moves);
};
E.remove = (id, keep) => { const to = keep ? { [id]: keep } : null; return toTrash([id], to).length > 0; };
E.restore = async ids => { for (const id of [].concat(ids)) { const m = trash.find(x => x.id === id); if (!m) continue; delete m.rm; trash = trash.filter(x => x !== m); metas.push(m); await put('meta', m); } };
E.trashList = () => JSON.stringify(trash.map(m => ({ id: m.id, t: m.t, a: m.a || '', rm: m.rm })));
E.emptyTrash = async () => { for (const m of trash) { try { await delv('files', m.id); await delv('meta', m.id); } catch (x) {} } trash = []; };

/* ---------- player ---------- */
let queue = [], index = 0, playing = false, shuffleOn = false, repeatMode = 0, qv = 0, sleepAt = 0, sleepT = null, fadeOn = true, lowp = false, pendingPos = 0, token = 0, curUrl = null, lastSave = 0;
const audio = new Audio(); audio.preload = 'auto';
const metaOf = id => metas.find(m => m.id === id);
const stop = () => { playing = false; audio.pause(); audio.removeAttribute('src'); if (curUrl) { URL.revokeObjectURL(curUrl); curUrl = null; } updateSession(); };

async function load(autoplay) {
  const my = ++token, id = queue[index];
  if (!id) return;
  const blob = await getv('files', id);
  if (my !== token) return;
  if (!blob) { next(); return; }
  if (curUrl) URL.revokeObjectURL(curUrl);
  curUrl = URL.createObjectURL(blob); audio.src = curUrl;
  const seekTo = pendingPos; pendingPos = 0;
  audio.onloadedmetadata = () => { if (seekTo) { try { audio.currentTime = seekTo; } catch (e) {} } };
  updateSession();
  if (autoplay) { playing = true; fadeIn(); }
}
let fadeT = null;
function ramp(from, to, done, sec) {
  clearInterval(fadeT); const n = sec ? Math.max(8, Math.round(sec * 25)) : 10; let i = 0; audio.volume = from;
  fadeT = setInterval(() => { i++; const u = i / n, k = sec && to > from ? Math.sin(u * Math.PI / 2) : u; audio.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (i >= n) { clearInterval(fadeT); done && done(); } }, 40);
}

/* crossfade when you press Next or Previous: the old song carries on in a spare player and fades away while the new one fades in */
let xfOn = true, xfLen = 3, xfIn = 0, ghostUrl = null;
function ghostOut(go) {
  if (!xfOn || !playing || audio.paused || !audio.src || (window.Fx && window.Fx.on) || !curUrl) { go(); return; }
  const len = xfLen, el = new Audio(), src = curUrl, t0 = audio.currentTime; let done = false, gn = null;
  const swap = () => { if (done) return; done = true; clearTimeout(bail); xfIn = len; ghostUrl = src; curUrl = null; audio.volume = 0; go(); fade(); };
  const fade = () => {
    const end = () => { try { el.pause(); el.removeAttribute('src'); el.load(); } catch (x) {} try { gn && gn.disconnect(); } catch (x) {} setTimeout(() => { if (ghostUrl === src) { URL.revokeObjectURL(src); ghostUrl = null; } }, 200); };
    if (gn) { const c = new Float32Array(64), b = gn._b; for (let i = 0; i < 64; i++) c[i] = Math.cos(i / 63 * Math.PI / 2) * b; try { gn.gain.cancelScheduledValues(ac.currentTime); gn.gain.setValueCurveAtTime(c, ac.currentTime + .02, len); } catch (x) {} setTimeout(end, len * 1000 + 150); }
    else { let i = 0; const n = Math.round(len * 25), iv = setInterval(() => { i++; el.volume = Math.max(0, Math.cos(i / n * Math.PI / 2)); if (i >= n) { clearInterval(iv); end(); } }, 40); }
  };
  const bail = setTimeout(() => { if (!done) { try { el.pause(); } catch (x) {} go(); done = true; } }, 700);
  el.preload = 'auto'; el.src = src;
  try { if (ac && eqB) { const s = ac.createMediaElementSource(el); gn = ac.createGain(); gn._b = dbG(normDb); gn.gain.value = gn._b; s.connect(gn); gn.connect(eqB[0]); } } catch (x) { gn = null; }
  el.addEventListener('loadedmetadata', () => { try { el.currentTime = Math.min((el.duration || 1e9) - .1, t0 + .08); } catch (x) {} el.play().catch(() => {}); });
  el.addEventListener('playing', swap, { once: true });
}
E.xf = (on, len) => { xfOn = !!on; xfLen = Math.max(1, Math.min(10, +len || 3)); };
/* A-B loop: when the loop jumps back, the part just played carries on in a spare player and fades out while the start fades in */
E.loopTo = ms => {
  const t = ms / 1000;
  if (!xfOn || !playing || audio.paused || !curUrl || !ac || !eqB || (window.Fx && window.Fx.on)) { audio.currentTime = t; return; }
  const len = Math.min(xfLen, 4), el = new Audio(), t0 = audio.currentTime; let gn = null, did = false;
  const go = () => { if (did) return; did = true; audio.volume = 0; audio.currentTime = t; ramp(0, 1, null, len);
    const c = new Float32Array(64), b = gn._b; for (let i = 0; i < 64; i++) c[i] = Math.cos(i / 63 * Math.PI / 2) * b;
    try { gn.gain.cancelScheduledValues(ac.currentTime); gn.gain.setValueCurveAtTime(c, ac.currentTime + .02, len); } catch (x) {}
    setTimeout(() => { try { el.pause(); el.removeAttribute('src'); el.load(); } catch (x) {} try { gn.disconnect(); } catch (x) {} }, len * 1000 + 150); };
  try { const s = ac.createMediaElementSource(el); gn = ac.createGain(); gn._b = dbG(normDb); gn.gain.value = gn._b; s.connect(gn); gn.connect(eqB[0]); } catch (x) { audio.currentTime = t; return; }
  el.preload = 'auto'; el.src = curUrl;
  el.addEventListener('loadedmetadata', () => { try { el.currentTime = t0 + .05; } catch (x) {} el.play().catch(() => { go(); }); });
  el.addEventListener('playing', go, { once: true });
  setTimeout(() => { if (!did) { did = true; audio.currentTime = t; try { el.pause(); gn.disconnect(); } catch (x) {} } }, 900);
};
/* listening (for the Companion): a side branch that only reads the sound, never changes it */
let ac = null, an = null, fb = null, an2 = null, fb2 = null, tb2 = null, listenOn = false;
let srcN = null;
let eqB = null, eqV = [0, 0, 0], normG = null, masterG = null, normDb = 0, volV = 1; const dbG = d => Math.pow(10, d / 20);
/* one master volume for everything (music, DJ, Lofi, sounds underneath) and a per-song level that evens out loud and quiet songs */
E.vol = g => { volV = g; if (masterG) masterG.gain.setTargetAtTime(g, ac.currentTime, .05); else audio.volume = Math.min(1, g); };
E.norm = (db, fast) => { normDb = db; if (normG) { if (fast) normG.gain.value = dbG(db); else normG.gain.setTargetAtTime(dbG(db), ac.currentTime, .35); } };
/* measure a song once: loudness (RMS after a gentle low cut, quiet gaps ignored) -> the gain that brings it to a common level */
E.measure = async id => {
  const g = E.graph(); if (!g) return null; const url = await E.fileUrl(id); if (!url) return null;
  try { const ab = await (await fetch(url)).arrayBuffer(); const b = await ac.decodeAudioData(ab), n = b.length, ch = b.numberOfChannels, d0 = b.getChannelData(0), d1 = ch > 1 ? b.getChannelData(1) : d0, blk = Math.floor(b.sampleRate * .4), ms = []; let peak = 0, y = 0, x1 = 0; const a = .985;
    for (let s = 0; s + blk <= n; s += blk) { let acc = 0; for (let i = s; i < s + blk; i += 2) { const x = (d0[i] + d1[i]) * .5; y = a * (y + x - x1); x1 = x; acc += y * y; const ab2 = Math.abs(x); if (ab2 > peak) peak = ab2; } ms.push(acc / (blk / 2)); }
    const mean = arr => arr.reduce((t, v) => t + v, 0) / Math.max(1, arr.length), all = mean(ms), gate = ms.filter(v => v > all * .1), rms = Math.sqrt(mean(gate.length ? gate : ms)), db = 20 * Math.log10(rms + 1e-9);
    return Math.max(-9, Math.min(9, -17 - db)); } finally { URL.revokeObjectURL(url); }
};
E.eq = (l, m, h) => { eqV = [l, m, h]; if (eqB) eqB.forEach((n, i) => { try { n.gain.setTargetAtTime(eqV[i], ac.currentTime, .15); } catch (x) {} }); };
function ensureGraph(force) {
  if (!listenOn && !force) return;
  try {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) { listenOn = false; return; }
      ac = new C({ latencyHint: 'playback' }); const src = srcN = ac.createMediaElementSource(audio); eqB = [['lowshelf', 110, .7], ['peaking', 1200, .8], ['highshelf', 6500, .7]].map(([t, f, q]) => { const n = ac.createBiquadFilter(); n.type = t; n.frequency.value = f; n.Q.value = q; return n; }); eqB[0].connect(eqB[1]); eqB[1].connect(eqB[2]); audio.volume = 1; normG = ac.createGain(); normG.gain.value = dbG(normDb); const cmp = ac.createDynamicsCompressor(); cmp.threshold.value = -4; cmp.knee.value = 6; cmp.ratio.value = 20; cmp.attack.value = .004; cmp.release.value = .25; masterG = ac.createGain(); masterG.gain.value = volV; eqB[2].connect(cmp); cmp.connect(masterG); masterG.connect(ac.destination); src.connect(normG); normG.connect(eqB[0]); E.eq(eqV[0], eqV[1], eqV[2]);
      an = ac.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.55; src.connect(an); fb = new Uint8Array(an.frequencyBinCount);
      an2 = ac.createAnalyser(); an2.fftSize = 1024; an2.smoothingTimeConstant = 0.6; src.connect(an2); fb2 = new Uint8Array(an2.frequencyBinCount); tb2 = new Uint8Array(an2.fftSize);
    }
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { listenOn = false; }
}
/* the same graph, shared with Lofi and DJ mode (fx.js, dj.js) */
E.graph = () => { ensureGraph(true); return ac && srcN ? { ac, src: normG, an, an2, mix: eqB[0], master: masterG } : null; };
E.el = audio;
E.fileUrl = async id => { const b = await getv('files', id); return b ? URL.createObjectURL(b) : ''; };
E.ext = false;
E.listen = on => { listenOn = !!on; if (on && !audio.paused) ensureGraph(); };
const EDG = [1, 2, 3, 4, 6, 8, 11, 15, 21, 30, 45, 70, 110];
E.levels = out => {
  if (!an || (audio.paused && !E.ext)) return false;
  an.getByteFrequencyData(fb);
  for (let k = 0; k < 12; k++) { let s = 0, n = 0; for (let i = EDG[k]; i < EDG[k + 1]; i++) { s += fb[i]; n++; } out[k] = n ? s / n / 255 : 0; }
  return true;
};
/* finer spectrum (log spaced bands, 0..1) and the raw wave, for the visualisers */
E.spectrum = out => {
  if (!an2 || (audio.paused && !E.ext)) return false;
  an2.getByteFrequencyData(fb2); const n = out.length; let prev = 1;
  for (let k = 0; k < n; k++) {
    const hi = Math.max(prev + 1, Math.round(Math.pow(380, (k + 1) / n))); let s = 0, c = 0;
    for (let i = prev; i < hi && i < 512; i++) { s += fb2[i]; c++; }
    out[k] = c ? Math.min(1, s / c / 255 * (1 + k / n * 0.9)) : 0; prev = hi;
  }
  return true;
};
E.wave = out => {
  if (!an2 || (audio.paused && !E.ext)) return false;
  an2.getByteTimeDomainData(tb2); const n = out.length, step = Math.floor(tb2.length / n);
  for (let i = 0; i < n; i++) out[i] = (tb2[i * step] - 128) / 128;
  return true;
};
function fadeIn() { if (!audio.src) return; ensureGraph(); const L = xfIn; xfIn = 0; if (!fadeOn && !L) { audio.volume = 1; audio.play().catch(() => {}); return; } audio.volume = 0; audio.play().then(() => ramp(0, 1, null, L)).catch(() => {}); }
function fadeOut() { if (!fadeOn || audio.paused) { audio.pause(); audio.volume = 1; return; } ramp(audio.volume, 0, () => { audio.pause(); audio.volume = 1; }); }
function next() {
  if (index < queue.length - 1) { index++; playing = true; load(true); }
  else if (repeatMode === 2 && queue.length) { index = 0; playing = true; load(true); }
  else { playing = false; audio.pause(); }
}
function prev() { if (audio.currentTime > 3 || index === 0) audio.currentTime = 0; else { index--; load(playing); } }
audio.addEventListener('ended', () => { if (repeatMode === 1) { audio.currentTime = 0; audio.play().catch(() => {}); } else next(); });
audio.addEventListener('loadedmetadata', () => dispatchEvent(new Event('mp-track')));
audio.addEventListener('timeupdate', () => { const n = Date.now(); if (n - lastSave > 5000) { lastSave = n; persist(); } });
['pagehide', 'visibilitychange'].forEach(ev => addEventListener(ev, () => { persist(); MPS.flush(); }));
function persist() { if (queue.length) store.set('mp_saved', { ids: queue, index, pos: Math.round(audio.currentTime * 1000) || 0 }); }

/* lock-screen card and buttons */
function updateSession() {
  if (!('mediaSession' in navigator)) return;
  const m = metaOf(queue[index]);
  try {
    navigator.mediaSession.metadata = m ? new MediaMetadata({ title: m.t, artist: m.a || m.p, album: m.al || '', artwork: m.ak && artMap.get(m.ak) ? [{ src: artMap.get(m.ak), sizes: '320x320', type: 'image/jpeg' }] : [] }) : null;
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  } catch (e) {}
}
if ('mediaSession' in navigator) {
  const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch (e) {} };
  h('play', () => E.play()); h('pause', () => E.pause()); h('nexttrack', () => E.next()); h('previoustrack', () => E.prev());
  h('seekto', d => { if (d.seekTime != null) audio.currentTime = d.seekTime; });
}
audio.addEventListener('play', () => { try { navigator.mediaSession.playbackState = 'playing'; } catch (e) {} });
audio.addEventListener('pause', () => { try { navigator.mediaSession.playbackState = 'paused'; } catch (e) {} });

/* ---------- the door (same names as the Android version) ---------- */
E.version = () => '0.37 nord5 web';
E.hasPerm = () => true; E.askPerm = () => {};
E.library = () => JSON.stringify(metas.map(m => ({ id: m.id, t: m.t, a: m.a, al: m.al, d: m.d, p: m.p, f: m.f, ad: m.ad, hk: !!m.ak, o: !!m.orig, mn: m.man ? Object.keys(m.man).join(',') : '', ly: !!m.ly, sz: m.size || 0, g: m.g || '', y: m.y || 0, ys: m.ys || '', yc: m.yc || 0, yv: m.yv || [], n: m.n || 0 })));
E.names = () => {};
E.lyrics = id => { const m = metaOf(id); return m && m.ly ? m.ly : ''; };
/* a copy of the song with tags written in (MP3 only): title, artist, album, lyrics and cover */
const u16 = s => { const b = new Uint8Array(2 + s.length * 2); b[0] = 255; b[1] = 254; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); b[2 + i * 2] = c & 255; b[3 + i * 2] = c >> 8; } return b; };
const cat = parts => { let n = 0; parts.forEach(p => n += p.length); const o = new Uint8Array(n); let k = 0; parts.forEach(p => { o.set(p, k); k += p.length; }); return o; };
const asc = s => Uint8Array.from(s, ch => ch.charCodeAt(0) & 127);
const frame = (id, body) => { const n = body.length; return cat([asc(id), Uint8Array.of(n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255, 0, 0), body]); };
E.tagged = async id => {
  const m = metaOf(id); if (!m) return null; const blob = await getv('files', id);
  if (!blob || !/\.mp3$/i.test(m.f || '')) return null;
  const fr = [frame('TIT2', cat([Uint8Array.of(1), u16(m.t || '')])), frame('TPE1', cat([Uint8Array.of(1), u16(m.a || '')])), frame('TALB', cat([Uint8Array.of(1), u16(m.al || '')]))];
  if (m.y) fr.push(frame('TYER', cat([Uint8Array.of(1), u16(String(m.y))])));
  if (m.ly) fr.push(frame('USLT', cat([Uint8Array.of(1), asc('eng'), Uint8Array.of(255, 254, 0, 0), u16(m.ly)])));
  const art = m.ak ? artMap.get(m.ak) : '';
  if (art && /^data:image\/(jpeg|png)/.test(art)) { const bin = atob(art.split(',')[1]), px = Uint8Array.from(bin, ch => ch.charCodeAt(0)); fr.push(frame('APIC', cat([Uint8Array.of(0), asc(/png/.test(art.slice(0, 20)) ? 'image/png' : 'image/jpeg'), Uint8Array.of(0, 3, 0), px]))); }
  const body = cat(fr), n = body.length;
  const head = Uint8Array.of(73, 68, 51, 3, 0, 0, (n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127);
  const h = new Uint8Array(await blob.slice(0, 10).arrayBuffer());
  let start = 0; if (h[0] === 73 && h[1] === 68 && h[2] === 51) start = 10 + ((h[6] << 21) | (h[7] << 14) | (h[8] << 7) | h[9]) + (h[5] & 16 ? 10 : 0);
  return new Blob([head, body, blob.slice(start)], { type: 'audio/mpeg' });
};
E.art = id => { const m = metaOf(id); return m && m.ak ? artMap.get(m.ak) || '' : ''; };
E.setQueue = (j, i, pos, play) => { queue = JSON.parse(j); index = i; pendingPos = (pos || 0) / 1000; qv++; playing = !!play; load(!!play); };
E.insertNext = j => { queue.splice(index + 1, 0, ...JSON.parse(j)); qv++; };
E.append = j => { queue.push(...JSON.parse(j)); qv++; };
E.removeAt = i => { if (i < 0 || i >= queue.length) return; const was = i === index; queue.splice(i, 1); if (i < index) index--; qv++; if (was) { if (queue.length) { index = Math.min(index, queue.length - 1); pendingPos = 0; load(playing); } else stop(); } };
E.move = (a, b) => { if (a === b || a < 0 || b < 0 || a >= queue.length || b >= queue.length) return; const id = queue.splice(a, 1)[0]; queue.splice(b, 0, id); if (index === a) index = b; else if (a < index && b >= index) index--; else if (a > index && b <= index) index++; qv++; };
E.reorder = (j, i) => { queue = JSON.parse(j); index = Math.max(0, Math.min(queue.length - 1, i)); qv++; persist(); };
E.jump = i => { if (i < 0 || i >= queue.length) return; index = i; pendingPos = 0; playing = true; load(true); };
E.play = () => { if (!queue.length) return; playing = true; if (!audio.src) load(true); else { if (audio.ended) audio.currentTime = 0; fadeIn(); } updateSession(); };
E.pause = () => { playing = false; fadeOut(); updateSession(); };
E.next = () => { if (index < queue.length - 1 || repeatMode === 2) ghostOut(() => next()); else next(); };
E.prev = () => { if (audio.currentTime > 3 || index === 0) prev(); else ghostOut(() => prev()); };
E.seek = ms => { audio.currentTime = ms / 1000; };
E.shuffle = on => { shuffleOn = on; if (on && queue.length > index + 2) { const head = queue.slice(0, index + 1), tail = queue.slice(index + 1); if (window.Taste && Taste.on()) { const k = new Map(tail.map(id => [id, Math.pow(Math.random(), 1 / Math.max(.01, Taste.wx(id)))])); tail.sort((x, y) => k.get(y) - k.get(x)); } else for (let i = tail.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tail[i], tail[j]] = [tail[j], tail[i]]; } queue = head.concat(tail); qv++; } };
E.repeat = m => { repeatMode = m; };
E.sleep = min => { clearTimeout(sleepT); if (min > 0) { sleepAt = Date.now() + min * 60000; sleepT = setTimeout(() => { sleepAt = 0; E.pause(); }, min * 60000); } else sleepAt = 0; };
E.fade = on => { fadeOn = on; };
E.state = () => {
  const m = metaOf(queue[index]);
  return JSON.stringify({ playing: playing && !audio.ended, pos: Math.round((audio.currentTime || pendingPos) * 1000), dur: isFinite(audio.duration) && audio.duration ? Math.round(audio.duration * 1000) : (m ? m.d : 0), index, count: queue.length, shuffle: shuffleOn, repeat: repeatMode, ended: false, qv, sleep: sleepAt ? Math.max(0, Math.round((sleepAt - Date.now()) / 1000)) : 0 });
};
E.queue = () => JSON.stringify(queue);
E.savedState = () => JSON.stringify(store.get('mp_saved', { ids: [], index: 0, pos: 0 }));
E.visible = () => {};
E.tick = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} };
E.lowPower = () => lowp; E.batteryOk = () => true; E.askBattery = () => {};
E.bars = (c) => { let t = document.querySelector('meta[name=theme-color]'); if (!t) { t = document.createElement('meta'); t.name = 'theme-color'; document.head.appendChild(t); } t.content = c; };
window.Android = E;

window.__ready = (async () => {
  try { db = await idb(); try { const sj = await getv('art', 'bk:details'); if (sj) stash = JSON.parse(sj); } catch (x) {} metas = await allv('meta'); trash = metas.filter(m => m.rm); metas = metas.filter(m => !m.rm); purge(); const keys = new Set(metas.map(m => m.ak).filter(Boolean)); try { (await tx('art', 'readonly', s => s.getAllKeys())).forEach(k => { if (/^(a|am|al):/.test(k)) keys.add(k); }); } catch (x) {} for (const k of keys) { const u = await getv('art', k); if (u) artMap.set(k, u); } } catch (e) { metas = []; }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  try { if (navigator.getBattery) { const b = await navigator.getBattery(); const f = () => { lowp = b.level < 0.2 && !b.charging; }; f(); b.addEventListener('levelchange', f); b.addEventListener('chargingchange', f); } } catch (e) {}
})();
})();
