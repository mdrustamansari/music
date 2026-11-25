/* Liquid glass engine (independent: Classic and Physical never load or call any of this).
   Level  off   = clear glass with a soft rim, nothing animated, no lens
          part  = lens on the big surfaces (Queue sheet, mini player, tabs, pop-ups) + touch glow
          full  = lens on every glass object, glass that forms out of the background when it appears
   The lens is an SVG displacement map (made once per size and shared) used as the element's backdrop-filter.
   It only runs on surfaces that are on screen, never while the app is hidden or in low power. */
(function (root) {
  'use strict';
  const BIG = '.qsheet,#mini,.tabs,#pop,.bms,#smsheet,#toast,.gprev>.g';
  const ALL = '.g,.alone,.tabs,#mini,#pop,#toast,.qsheet,.bms,#smsheet';
  const NS = 'http://www.w3.org/2000/svg', MAXN = 70;
  const L = { on: false, lv: 'part', len: 55, firm: 20, rim: 70, mat: 'clear', frost: 50, tint: 30 };
  const doc = document, H = doc.documentElement;
  const reduce = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const canLens = () => { try { return CSS.supports('(backdrop-filter:url(#a)) or (-webkit-backdrop-filter:url(#a))'); } catch (e) { return false; } };
  let svg = null, io = null, ro = null, mo = null, cmo = null, seq = 0, glow = null, glowRaf = 0, rt = 0;
  const maps = new Map();   /* key -> {id, f, dm, img, w, h, r, raf} */
  const els = new Map();    /* element -> {key, vis, on} */
  let nvis = 0;

  const lensOK = () => L.lv !== 'off' && !H.classList.contains('lowp') && !doc.hidden && canLens();
  const sel = () => (L.lv === 'full' ? ALL : BIG);
  const fullScale = (m) => { const b = bezel(m.w, m.h); return L.len * 1.1 * (1 - L.firm / 100 * .7) * Math.min(1, b / 14); };
  const bezel = (w, h) => Math.max(6, Math.min(30, Math.min(w, h) * .3));

  function ensureSvg() {
    if (svg) return;
    svg = doc.createElementNS(NS, 'svg'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    svg.appendChild(doc.createElementNS(NS, 'defs')); doc.body.appendChild(svg);
  }

  /* displacement map for a rounded box: neutral grey inside, pointing inwards near the rim (strongest at the very edge) */
  function buildMap(w, h, r) {
    const k = w * h > 40000 ? .5 : 1, cw = Math.max(2, Math.round(w * k)), ch = Math.max(2, Math.round(h * k)), b = bezel(w, h);
    const c = doc.createElement('canvas'); c.width = cw; c.height = ch;
    const x = c.getContext('2d'), im = x.createImageData(cw, ch), d = im.data, hw = w / 2, hh = h / 2;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const px = (i + .5) / k - hw, py = (j + .5) / k - hh, qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
      let ox, oy, sd;
      if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy); sd = l - r; ox = Math.sign(px) * qx / l; oy = Math.sign(py) * qy / l; }
      else if (qx > qy) { sd = qx - r; ox = Math.sign(px); oy = 0; } else { sd = qy - r; ox = 0; oy = Math.sign(py); }
      const dd = -sd, o = (j * cw + i) * 4;
      let R = 128, G = 128;
      if (dd >= 0 && dd < b) { const t = 1 - dd / b, p = Math.pow(t, 1.5); R = 128 - ox * p * 127; G = 128 - oy * p * 127; }
      d[o] = R; d[o + 1] = G; d[o + 2] = 128; d[o + 3] = 255;
    }
    x.putImageData(im, 0, 0); return c.toDataURL('image/png');
  }

  function mapFor(w, h, r) {
    const key = w + 'x' + h + 'x' + r; let m = maps.get(key); if (m) return m;
    if (maps.size > 40) { const first = maps.keys().next().value, o = maps.get(first); if (o) { o.f.remove(); maps.delete(first); els.forEach(t => { if (t.key === first) t.key = null; }); } }
    ensureSvg();
    const id = 'lqf' + (++seq), f = doc.createElementNS(NS, 'filter');
    f.setAttribute('id', id); f.setAttribute('filterUnits', 'userSpaceOnUse'); f.setAttribute('x', '0'); f.setAttribute('y', '0'); f.setAttribute('width', w); f.setAttribute('height', h); f.setAttribute('color-interpolation-filters', 'sRGB');
    const img = doc.createElementNS(NS, 'feImage'); img.setAttribute('href', buildMap(w, h, r)); img.setAttribute('x', '0'); img.setAttribute('y', '0'); img.setAttribute('width', w); img.setAttribute('height', h); img.setAttribute('preserveAspectRatio', 'none'); img.setAttribute('result', 'm');
    f.appendChild(img);
    /* Full: red, green and blue bend by slightly different amounts, so the rim shows a thin colour fringe like real glass */
    const chroma = L.lv === 'full', rat = chroma ? [1.14, 1, .86] : [1], dms = [];
    rat.forEach((k, i) => {
      const dm = doc.createElementNS(NS, 'feDisplacementMap'); dm.setAttribute('in', 'SourceGraphic'); dm.setAttribute('in2', 'm'); dm.setAttribute('scale', '0'); dm.setAttribute('xChannelSelector', 'R'); dm.setAttribute('yChannelSelector', 'G'); dm.setAttribute('result', 'd' + i); dm._k = k; f.appendChild(dm); dms.push(dm);
      if (chroma) { const cm = doc.createElementNS(NS, 'feColorMatrix'); cm.setAttribute('in', 'd' + i); cm.setAttribute('type', 'matrix'); const v = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]; v[i * 5 + i] = 1; cm.setAttribute('values', v.join(' ')); cm.setAttribute('result', 'c' + i); f.appendChild(cm); }
    });
    if (chroma) { const b1 = doc.createElementNS(NS, 'feBlend'); b1.setAttribute('in', 'c0'); b1.setAttribute('in2', 'c1'); b1.setAttribute('mode', 'screen'); b1.setAttribute('result', 'b1'); const b2 = doc.createElementNS(NS, 'feBlend'); b2.setAttribute('in', 'b1'); b2.setAttribute('in2', 'c2'); b2.setAttribute('mode', 'screen'); f.appendChild(b1); f.appendChild(b2); }
    svg.firstChild.appendChild(f);
    m = { id, f, dms, img, w, h, r, raf: 0, key }; maps.set(key, m); return m;
  }

  const frosted = () => L.mat === 'frost';
  const setSc = (m, S) => m.dms.forEach(d => d.setAttribute('scale', (S * d._k).toFixed(2)));
  const blurPx = () => (frosted() ? 3 + L.frost * .2 : 2.2 + L.firm / 100 * 1.5).toFixed(1);
  const lensBlur = () => (frosted() ? 2 + L.frost * .16 : 1.2 + L.firm / 100 * 1.2).toFixed(1);
  const bodyA = () => frosted() ? .5 + L.firm / 100 * .3 : .2 + L.tint / 100 * .4 + L.firm / 100 * .25;
function setBF(el, v) { if (v) { el.style.setProperty('-webkit-backdrop-filter', v); el.style.setProperty('backdrop-filter', v); } else { el.style.removeProperty('-webkit-backdrop-filter'); el.style.removeProperty('backdrop-filter'); } }

  function engage(el, t, intro) {
    const w = el.offsetWidth, h = el.offsetHeight; if (w < 20 || h < 20) return;
    const r = Math.max(2, Math.min(Math.round(parseFloat(getComputedStyle(el).borderTopLeftRadius) || h / 2), Math.min(w, h) / 2));
    const m = mapFor(Math.round(w), Math.round(h), r); t.key = m.key; t.on = true;
    setBF(el, `url(#${m.id}) blur(${lensBlur()}px) saturate(185%) brightness(1.03)`);
    cancelAnimationFrame(m.raf);
    const S = fullScale(m);
    if (intro && L.lv === 'full' && !reduce()) {
      const t0 = performance.now(), step = n => {
        const k = Math.min(1, (n - t0) / 420), e = 1 - Math.pow(1 - k, 3);
        setSc(m, S * e); el.style.setProperty('--lqk', e.toFixed(2));
        if (k < 1) m.raf = requestAnimationFrame(step); else el.style.removeProperty('--lqk');
      };
      m.raf = requestAnimationFrame(step);
    } else setSc(m, S);
  }
  function disengage(el, t) { if (!t.on) return; t.on = false; setBF(el, ''); el.style.removeProperty('--lqk'); }

  function considerVisible(el, t) {
    if (!lensOK()) return;
    if (t.vis && !t.on && nvis < MAXN) { nvis++; engage(el, t, true); }
  }
  function track(el) {
    if (els.has(el)) return; const t = { key: null, vis: false, on: false }; els.set(el, t);
    if (io) io.observe(el); if (ro) ro.observe(el);
  }
  function untrack(el) { const t = els.get(el); if (!t) return; if (io) io.unobserve(el); if (ro) ro.unobserve(el); if (t.on) { nvis--; disengage(el, t); } els.delete(el); }

  function refresh() {
    if (!L.on) return;
    const want = lensOK() ? new Set(doc.querySelectorAll(sel())) : new Set();
    els.forEach((t, el) => { if (!want.has(el) || !el.isConnected) untrack(el); });
    want.forEach(el => track(el));
  }
  function rescale() { maps.forEach(m => { cancelAnimationFrame(m.raf); setSc(m, fullScale(m)); }); els.forEach((t, el) => { if (t.on) setBF(el, `url(#${maps.get(t.key) ? maps.get(t.key).id : ''}) blur(${lensBlur()}px) saturate(185%) brightness(1.03)`); }); }

  /* touch glow: a soft light under the finger, drawn as a background layer so it works on every glass object */
  function pd(e) {
    if (L.lv === 'off' || !e.target.closest) return; const el = e.target.closest(ALL); if (!el) return;
    const r = el.getBoundingClientRect(); el.style.setProperty('--lqx', (e.clientX - r.left).toFixed(0) + 'px'); el.style.setProperty('--lqy', (e.clientY - r.top).toFixed(0) + 'px'); el.style.setProperty('--lqo', '1');
    cancelAnimationFrame(glowRaf); glow = el;
  }
  function pu() {
    const el = glow; if (!el) return; glow = null; const t0 = performance.now();
    const step = n => { const k = Math.min(1, (n - t0) / 380); el.style.setProperty('--lqo', (1 - k).toFixed(2)); if (k < 1) glowRaf = requestAnimationFrame(step); else el.style.removeProperty('--lqo'); };
    glowRaf = requestAnimationFrame(step);
  }

  /* elements that carry the rim ring get a marker class (kept for styling) */
  function markRims(on) { doc.querySelectorAll('.list.g,.card.g,.tabs,#mini,#pop,#toast,.qsheet,.bms,#smsheet,.alone,.hcard.g,.tile.g,.rcard.g,.search.g,.smlive,.row.add.g,.gprev>.g').forEach(el => el.classList.toggle('lqrim', on)); }

  function start() {
    if (L.on) return; L.on = true;
    io = new IntersectionObserver(es => es.forEach(en => { const t = els.get(en.target); if (!t) return; t.vis = en.isIntersecting; if (t.vis) { if (!t.on && lensOK() && nvis < MAXN) { nvis++; engage(en.target, t, true); } } else if (t.on) { nvis--; disengage(en.target, t); } }));
    ro = new ResizeObserver(es => { clearTimeout(rt); rt = setTimeout(() => es.forEach(en => { const t = els.get(en.target); if (t && t.on) engage(en.target, t, false); }), 160); });
    let mt = 0; const app = doc.getElementById('app') || doc.body;
    mo = new MutationObserver(recs => { if (mt || !recs.some(r => [...r.addedNodes].some(n => n.nodeType === 1))) return; mt = setTimeout(() => { mt = 0; markRims(true); refresh(); }, 300); }); mo.observe(app, { childList: true, subtree: L.lv === 'full' });
    cmo = new MutationObserver(() => { refresh(); }); cmo.observe(H, { attributes: true, attributeFilter: ['class'] });
    doc.addEventListener('pointerdown', pd, { capture: true, passive: true }); root.addEventListener('pointerup', pu, { passive: true }); root.addEventListener('pointercancel', pu, { passive: true });
    doc.addEventListener('visibilitychange', vis);
  }
  function vis() { if (!L.on) return; if (doc.hidden) { els.forEach((t, el) => { if (t.on) { nvis--; disengage(el, t); } }); } else { refresh(); els.forEach((t, el) => { if (t.vis && !t.on && lensOK() && nvis < MAXN) { nvis++; engage(el, t, false); } }); } }

  function stop() {
    if (!L.on) return; L.on = false;
    els.forEach((t, el) => { disengage(el, t); el.style.removeProperty('--lqo'); el.style.removeProperty('--lqx'); el.style.removeProperty('--lqy'); });
    els.clear(); nvis = 0; maps.forEach(m => { cancelAnimationFrame(m.raf); m.f.remove(); }); maps.clear();
    [io, ro, mo, cmo].forEach(o => o && o.disconnect()); io = ro = mo = cmo = null;
    doc.removeEventListener('pointerdown', pd, true); root.removeEventListener('pointerup', pu); root.removeEventListener('pointercancel', pu); doc.removeEventListener('visibilitychange', vis);
    ['--lqF', '--lqT', '--lqBt', '--lqB', '--lqA'].forEach(p => H.style.removeProperty(p)); delete H.dataset.lq; delete H.dataset.lqm; delete H.dataset.lqp; delete H.dataset.lqpt; markRims(false);
  }

  function apply(S, col) {
    const lv = ['off', 'part', 'full'].includes(S.lql) ? S.lql : 'part', prev = L.lv;
    L.lv = lv; L.len = S.lqs === undefined ? 55 : S.lqs; L.firm = S.lqf === undefined ? 20 : S.lqf; L.rim = S.lqr === undefined ? 70 : S.lqr; L.mat = S.lqm === 'frost' ? 'frost' : 'clear'; L.frost = S.lqi === undefined ? 50 : S.lqi; L.tint = S.lqt === undefined ? 30 : S.lqt;
    H.dataset.geng = 'liquid'; H.dataset.lq = lv; H.dataset.lqm = L.mat;
    ['--gdim', '--gl', '--sheen', '--glf', '--oc', '--et', '--eb'].forEach(p => H.style.removeProperty(p));
    H.style.setProperty('--lqF', (L.firm / 100).toFixed(2)); H.style.setProperty('--lqT', ((S.lqet === undefined ? 70 : S.lqet) / 100).toFixed(2)); H.style.setProperty('--lqBt', ((S.lqeb === undefined ? 70 : S.lqeb) / 100).toFixed(2)); H.dataset.lqp = S.lqp ? 'on' : 'off'; H.dataset.lqpt = S.lqpt === 'white' ? 'white' : 'accent'; H.style.setProperty('--lqB', blurPx() + 'px'); H.style.setProperty('--lqA', bodyA().toFixed(3));
    /* light sensor: estimate how bright the glass body is over the background and pick the text colour */
    if (H.dataset.theme === 'dark') { delete H.dataset.gtx; delete H.dataset.gtf; }
    else { const Lb = col && col.L !== undefined ? col.L : .97, a = Math.min(.95, bodyA() + .1), af = Math.min(.95, a + .16); H.dataset.gtx = (Lb * (1 - a) + a) < .5 ? 'light' : 'dark'; H.dataset.gtf = (Lb * (1 - af) + af) < .5 ? 'light' : 'dark'; }
    const wasOn = L.on; start(); markRims(true);
    if (mo && wasOn && prev !== lv) { mo.disconnect(); mo.observe(doc.getElementById('app') || doc.body, { childList: true, subtree: lv === 'full' }); }
    const rebuild = wasOn && prev !== lv && (prev === 'full' || lv === 'full');
    if (rebuild) { els.forEach((t, el) => { if (t.on) { nvis--; disengage(el, t); } }); maps.forEach(m => { cancelAnimationFrame(m.raf); m.f.remove(); }); maps.clear(); }
    refresh(); if (rebuild) els.forEach((t, el) => { if (t.vis && !t.on && lensOK() && nvis < MAXN) { nvis++; engage(el, t, false); } });
    if (wasOn && !rebuild) { rescale(); } setTimeout(() => root.dispatchEvent(new Event('lq-status')), 600);
  }
  function status() {
  const lens = L.lv !== 'off' ? (canLens() ? (nvis ? 'Lens: running on ' + nvis + (nvis === 1 ? ' surface' : ' surfaces') + (L.lv === 'full' ? ', with colour fringe' : '') + '.' : 'Lens: ready, nothing to bend on this screen.') : 'Lens: this browser cannot draw it, so a soft edge is used.') : 'Lens: off.';
  
  return lens;
}
root.Liquid = { apply, stop, status };
})(window);
