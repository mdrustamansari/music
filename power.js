/* Power tiers: one switch for every loop that draws or polls.
   full  = Playing / quiet / DJ / Lofi screens while you touch them (and 2 s after): smooth visuals
   rest  = same screens, then easing down with the time since your last touch:
           to 20 s about 30 frames a second, to 40 s about 15, to 60 s about 4; the steps glide into each other
   black = after 60 s without touch while music plays: a black screen, nothing drawn; a tap brings the app back
   away  = Library, Settings and other screens: no drawing, no visual timers
   off   = screen dimmed, hidden or in the background: only audio runs
   The Power saving switch (Settings) turns rest and black off; away and off stay because nobody can see the difference. */
(function (root) {
  'use strict';
  const FULL_MS = 2000, BLACK_MS = 60000, P = { t: 'full', on: true, m: { f: 0, ms: 0, since: Date.now() } }, subs = [];
  let lastTouch = Date.now(), rt = 0, blk = null, swallow = 0;
  const $ = s => document.querySelector(s);
  P.playing = () => true;
  const idle = () => Date.now() - lastTouch;
  function want() {
    if (document.hidden) return 'off';
    const pl = $('#v-play'), md = $('#modes');
    if (!((pl && pl.classList.contains('on')) || (md && md.classList.contains('open')))) {
      return P.on && P.playing() && idle() > BLACK_MS ? 'black' : 'away';
    }
    if (!P.on) return 'full';
    const i = idle(); if (i < FULL_MS) return 'full';
    if (i >= BLACK_MS && P.playing()) return 'black';
    return 'rest';
  }
  /* milliseconds between frames while resting: glides 33 -> 66 around 20 s and 66 -> 270 around 40 s */
  const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  P.gap = () => { const s = idle() / 1000; return Math.round(33 + 33 * sm((s - 18) / 4) + 204 * sm((s - 38) / 4)); };
  function mkBlk() {
    if (blk) return blk;
    const st = document.createElement('style');
    st.textContent = '#blk{position:fixed;inset:0;z-index:99999;background:#000;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .5s ease;touch-action:none}' +
      '#blk span{font:300 11px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;color:rgba(255,255,255,.34);opacity:0;transition:opacity 1.6s ease .9s}' +
      'html[data-power=black] #blk{opacity:1;pointer-events:auto;transition:opacity 1.6s cubic-bezier(.4,0,.2,1)}html[data-power=black] #blk span{opacity:1}' +
      'html[data-power=black] #app{visibility:hidden;transition:visibility 0s 1.7s}';
    document.head.appendChild(st);
    blk = document.createElement('div'); blk.id = 'blk'; blk.setAttribute('role', 'button'); blk.setAttribute('aria-label', 'Tap to return to the app');
    blk.innerHTML = '<span>Tap to return</span>'; document.body.appendChild(blk); return blk;
  }
  function ev() {
    const n = want(); clearTimeout(rt);
    const i = idle();
    if (n === 'full') rt = setTimeout(ev, FULL_MS - i + 60);
    else if (n === 'rest' && P.playing()) rt = setTimeout(ev, Math.max(200, BLACK_MS - i + 60));
    else if (n === 'away' && P.on && P.playing()) rt = setTimeout(ev, Math.max(200, BLACK_MS - i + 60));
    if (n === P.t) return;
    const was = P.t; P.t = n; root.document.documentElement.dataset.power = n; mkBlk();
    if (window.Viz && Viz.kick) Viz.kick(); if (window.Companion && Companion.kick) Companion.kick();
    subs.slice().forEach(f => { try { f(n, was); } catch (e) {} });
  }
  P.eval = ev; P.on_ = subs; P.sub = f => subs.push(f);
  P.live = () => P.t === 'full' || P.t === 'rest';
  P.cfg = on => { P.on = !!on; ev(); };
  P.touch = () => { lastTouch = Date.now(); ev(); };
  P.count = ms => { P.m.f++; P.m.ms += ms; };
  P.report = () => { const min = Math.max(1 / 60, (Date.now() - P.m.since) / 6e4); return { tier: P.t, framesPerMin: Math.round(P.m.f / min), msPerMin: Math.round(P.m.ms / min) }; };
  P.reset = () => { P.m = { f: 0, ms: 0, since: Date.now() }; };
  /* the first tap on the black screen only wakes the app; it must not press anything underneath */
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(e => document.addEventListener(e, ev2 => {
    if (P.t === 'black') { ev2.stopPropagation(); if (ev2.cancelable) ev2.preventDefault(); swallow = Date.now() + 450; P.touch(); return; }
    if (e === 'keydown' || Date.now() - lastTouch > 400) P.touch(); else lastTouch = Date.now();
  }, { passive: false, capture: true }));
  document.addEventListener('click', e => { if (Date.now() < swallow) { e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('pointermove', () => { if (P.t !== 'black') { if (Date.now() - lastTouch > 400) P.touch(); else lastTouch = Date.now(); } }, { passive: true, capture: true });
  document.addEventListener('wheel', () => { if (P.t !== 'black') P.touch(); }, { passive: true, capture: true });
  document.addEventListener('visibilitychange', ev);
  root.Power = P; ev();
})(window);
