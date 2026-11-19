/* MOrb: the one floating button of the music app, adapted from the Goal and Budget orb.
   A soft, shape-shifting glass blob that always offers the best next step for what is playing.
   The app gives it pick() -> { icon, label, act } or null, hide() -> true to step aside, and place(orb, tag) to position it.
   It is a real button with data-act, so the app's own click handler does the work. When its step changes, it squashes and settles. */
(function (root) {
  'use strict';
  const IC = {
    mark: '<path d="M6 3h12v18l-6-4.5L6 21z"/><path d="M12 7.5v4"/><path d="M10 9.5h4"/>',
    loop: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 014-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 01-4 4H4"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>'
  };
  let cfg = null, orb = null, tag = null, cur = '', tagT = null;
  const svg = k => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || IC.plus}</svg>`;
  const showTag = ms => { if (!tag) return; tag.classList.add('on'); clearTimeout(tagT); tagT = setTimeout(() => tag.classList.remove('on'), ms || 2200); };
  function refresh() {
    if (!cfg || !orb) return;
    let p = null; try { p = cfg.pick(); } catch (e) {}
    const vv = root.visualViewport, kb = (vv && vv.height < root.innerHeight - 140) || (document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'range');
    let off = !p || kb; try { off = off || !!cfg.hide(); } catch (e) {}
    if (p) {
      const key = p.icon + '|' + p.label + '|' + p.act;
      orb.dataset.act = p.act; orb.setAttribute('aria-label', p.label);
      if (key !== cur) { const first = !cur; cur = key; orb.innerHTML = svg(p.icon); tag.textContent = p.label; if (!first && !off) { orb.classList.remove('squash'); void orb.offsetWidth; orb.classList.add('squash'); } if (!off) showTag(first ? 3000 : 2200); }
    }
    if (cfg.place && !off) cfg.place(orb, tag);
    orb.classList.toggle('off', off); if (off) tag.classList.remove('on');
  }
  function init(c) {
    cfg = c; if (orb) return;
    const host = document.getElementById('app') || document.body;
    orb = document.createElement('button'); orb.type = 'button'; orb.id = 'morb'; orb.className = 'morb off';
    tag = document.createElement('div'); tag.id = 'morb-tag'; tag.className = 'morb-tag'; tag.setAttribute('aria-hidden', 'true');
    host.appendChild(tag); host.appendChild(orb);
    let lp = null; orb.addEventListener('pointerdown', () => { lp = setTimeout(() => showTag(2200), 450); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(e => orb.addEventListener(e, () => clearTimeout(lp)));
    ['focusin', 'focusout', 'resize'].forEach(e => addEventListener(e, () => setTimeout(refresh, 80)));
    if (root.visualViewport) root.visualViewport.addEventListener('resize', () => setTimeout(refresh, 40));
    setInterval(() => { if (window.Power && !Power.live()) return; refresh(); }, 900); refresh();
  }
  root.MOrb = { init, refresh };
})(window);
