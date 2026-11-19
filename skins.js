/* Skins: the app is a skeleton (layout, sizes, gestures) with a skin on top (materials, colours, shapes, type, visualiser palette).
   A skin is a stylesheet that only restyles; anything it leaves out falls back to Glass, so a half-made skin cannot break the app. */
(() => {
'use strict';
const svg = b => '<svg viewBox="0 0 120 72" aria-hidden="true">' + b + '</svg>';
const L = [
  { id: 'glass', name: 'Glass', note: 'Soft, bright and calm', look: null, pal: null, css: null,
    prev: svg('<defs><linearGradient id="skg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bcd5f7"/><stop offset="1" stop-color="#f6d9c4"/></linearGradient></defs><rect width="120" height="72" rx="10" fill="url(#skg)"/><rect x="16" y="10" width="40" height="40" rx="12" fill="#fff" opacity=".85"/><rect x="62" y="16" width="42" height="6" rx="3" fill="#fff" opacity=".9"/><rect x="62" y="28" width="30" height="5" rx="2.5" fill="#fff" opacity=".6"/><rect x="14" y="56" width="92" height="10" rx="5" fill="#fff" opacity=".7"/><circle cx="60" cy="61" r="6" fill="#3560bd"/>') },
  { id: 'winamp', name: 'Winamp Classic 3', note: 'Graphite, copper and LCD', look: 'dark', pal: 'winamp', css: 'skins/winamp.css',
    prev: svg('<rect width="120" height="72" fill="#4a4a4c"/><rect x=".5" y=".5" width="119" height="71" fill="none" stroke="#000"/><rect x="4" y="4" width="112" height="8" fill="#38383a" stroke="#000"/><rect x="8" y="7" width="34" height="2.5" fill="#d9ad7c"/><rect x="78" y="7" width="34" height="2.5" fill="#d9ad7c"/><rect x="6" y="15" width="108" height="26" fill="#000" stroke="#777"/><text x="12" y="35" font-family="monospace" font-size="17" fill="none" stroke="#43d55a" stroke-width=".7">06:31</text><g fill="#c9a272"><rect x="82" y="26" width="4" height="10"/><rect x="88" y="22" width="4" height="14"/><rect x="94" y="29" width="4" height="7"/><rect x="100" y="32" width="4" height="4"/></g><rect x="6" y="46" width="108" height="6" rx="3" fill="#1a1a1b" stroke="#111"/><rect x="34" y="44" width="16" height="10" fill="#c5c5c7" stroke="#000"/><g fill="#b4b4b6" stroke="#000"><rect x="6" y="57" width="18" height="12"/><rect x="23" y="57" width="18" height="12" fill="#8c8c8e"/><rect x="40" y="57" width="18" height="12"/><rect x="57" y="57" width="18" height="12"/><rect x="74" y="57" width="18" height="12"/></g>') }
];
window.Skins = {
  list: L,
  get: id => L.find(s => s.id === id) || L[0],
  apply(id) {
    const s = this.get(id), H = document.documentElement; H.dataset.skin = s.id; let l = document.getElementById('skincss');
    if (s.css) { if (!l) { l = document.createElement('link'); l.id = 'skincss'; l.rel = 'stylesheet'; document.head.appendChild(l); } if (l.getAttribute('href') !== s.css) l.setAttribute('href', s.css); } else if (l) l.remove();
    return s;
  }
};
})();
