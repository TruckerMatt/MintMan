'use strict';
// RENDERER SWITCH: owns the THREE <-> CLASSIC choice, the stage/canvas layering, the drawScene hook, debug keys and the hotspot overlay.
// Three.js is a VISUAL layer only; the engine stays authoritative for everything (see GRAPHICS_MIGRATION_NOTES.md).
(function () {
  if (typeof G === 'undefined' || typeof drawScene !== 'function') { console.warn('[MM3] engine not found; Three renderer disabled'); return; }
  window.MM3 = window.MM3 || { rooms: {} };
  const THREE_VERSION = '0.160.0';
  const THREE_URL = window.MM3_THREE_URL || ('https://cdn.jsdelivr.net/npm/three@' + THREE_VERSION + '/build/three.module.js');   // pinned; point at a local copy for offline/itch.io builds
  const qs = new URLSearchParams(location.search);
  window.MM_RENDERER = qs.get('renderer') === 'classic' ? 'classic' : 'three';            // 'three' | 'classic'  (dev toggle: F8)
  MM3.forceGeneric = qs.get('generic') === '1';
  window.MM_HOTSPOTS = qs.get('hotspots') === '1';                                        // hotspot debug overlay (dev toggle: F9)
  window.MM_CLASSIC_ROOMS = new Set((qs.get('classicrooms') || '').split(',').filter(Boolean));   // rooms forced to the classic renderer
  for (const [alias, real] of [['BREAKROOM_RENDERER', 'MM_RENDERER'], ['BREAKROOM_HOTSPOTS', 'MM_HOTSPOTS']]) Object.defineProperty(window, alias, { get: () => window[real], set: (v) => { window[real] = v; } });   // names used by the first prototype
  let status = 'loading';                                                                 // loading | ready | failed

  // ---- DOM: stage with the Three canvas BEHIND the (transparent-window) game canvas; limited to the 144/240 scene window, never receives events
  const gameCv = document.getElementById('game'); const stage = document.createElement('div'); stage.id = 'stage';
  gameCv.parentNode.insertBefore(stage, gameCv); stage.appendChild(gameCv);
  const threeCv = document.createElement('canvas'); threeCv.id = 'three'; stage.insertBefore(threeCv, gameCv);
  const style = document.createElement('style');
  style.textContent = '#stage{position:relative;width:min(100vw,133.33vh);aspect-ratio:4/3;background:#000;flex:none}' +
    '#game{position:absolute!important;left:0;top:0;width:100%!important;height:100%!important;aspect-ratio:auto!important;background:transparent!important;z-index:1;touch-action:none}' +
    '#three{position:absolute;left:0;top:0;width:100%;height:60%;pointer-events:none;display:none;z-index:0}';
  document.head.appendChild(style);

  const active = () => status === 'ready' && window.MM_RENDERER === 'three' && G.started && G.S && G.S.room && !window.MM_CLASSIC_ROOMS.has(G.S.room);

  // ---- hook into the engine's drawScene (called once per engine frame from frame()); classic drawScene is kept intact as fallback
  const _drawScene = drawScene;
  drawScene = function () {
    if (!active()) { if (threeCv.style.display !== 'none') threeCv.style.display = 'none'; return _drawScene(); }
    const S = G.S, r = room(); let jpose = null; const t0 = performance.now();
    try { jpose = MM3.render(S, r, G.t); MM3.perf.n++; const dt = performance.now() - t0; MM3.perf.ms += dt; MM3.perf.max = Math.max(MM3.perf.max, dt); }
    catch (e) { console.error('[MM3] 3D render failed; falling back to the classic renderer', e); status = 'failed'; threeCv.style.display = 'none'; return _drawScene(); }
    if (threeCv.style.display !== 'block') threeCv.style.display = 'block';
    // Canvas2D keeps: transparent scene window + everything that is UI/text (exit arrows, Mint tags/badge, foreground overlay, debug)
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, SW, SCENE_H); ctx.clip(); ctx.clearRect(0, 0, SW, SCENE_H);
    if (r.fg) r.fg(G.t);
    drawExitMarkers(r);
    for (const c of catList()) if ((c.pose || ['sit', 'loaf', 'sleep', 'stand', 'sit', 'loaf'][Math.floor(rnd(c.seed + 2) * 6)]) === 'sleep') txt('z', c.x + 4 * (rnd(c.seed + 3) > .5 ? 1 : -1), c.y - 6 - (Math.floor(G.t * 2) % 2), C.w, 4);
    if (jpose === 'bark') txt('WOOF!', S.ax + (G.junoFace || 1) * 14, S.ay - 20, C.y, 6, 'center');
    if (S.mintOn) {
      const lvl = S.mint;
      for (const p of propsNow()) if (p.mintTag) { const tg = typeof p.mintTag === 'function' ? p.mintTag(S) : p.mintTag; if (tg) Art.tag(p.r[0] + p.r[2] / 2, Math.max(16, p.r[1] - 2 + Math.sin(G.t * 3 + p.r[0]) * 1.5), tg, lvl >= 3 ? C.M : C.G); }
      R(250, 2, 68, 10, 'rgba(0,20,15,.85)'); txt('MINT MODE' + (lvl >= 3 ? ' MAX' : ''), 316, 10, C.G, 6, 'right');
    }
    if (window.MM_HOTSPOTS) drawHotspotDebug(r);
    ctx.restore();
  };

  // ---- hotspot debug overlay: the REAL rectangles pickAt() uses, in every room
  function drawHotspotDebug(r) {
    const S = G.S; ctx.save(); ctx.lineWidth = 1;
    const box = (rc, col, label, fill) => { ctx.strokeStyle = col; ctx.strokeRect(Math.round(rc[0]) + .5, Math.round(rc[1]) + .5, rc[2] - 1, rc[3] - 1); if (fill) { ctx.fillStyle = fill; ctx.fillRect(rc[0], rc[1], rc[2], rc[3]); } if (label) txt(label, rc[0] + 1, rc[1] + 5, col, 4); };
    for (const p of propsNow()) if (p.r && p.r[0] > -5) box(p.r, p.npc ? '#ffa0a0' : '#40d8ff', (p.npc ? 'NPC:' : '') + p.id, p.npc ? 'rgba(255,160,160,.10)' : 'rgba(64,216,255,.07)');
    for (const e of exitsNow()) box(e.r, '#ffe040', 'EXIT:' + e.id, 'rgba(255,224,64,.10)');
    if (S.junoWith && !r.noJuno) box([S.ax - 10, S.ay - 14, 20, 16], '#ff60ff', 'JUNO', 'rgba(255,96,255,.10)');
    for (const c of catList()) box([c.x - 5, c.y - 6, 10, 8], '#ff9030', 'CAT', 'rgba(255,144,48,.12)');
    if (!r.noHollis) box([S.jx - 3, S.jy - 38, 6, 38], '#80ff80', 'HOLLIS', null);
    txt('HOTSPOT DEBUG (F9)  ROOM: ' + S.room.toUpperCase() + '  RENDERER: THREE' + (MM3.T ? ' r' + MM3.T.REVISION : '') + ' (F8 = classic)', 4, 141, '#ffffff', 4.5);
    ctx.restore();
  }

  // ---- debug keys, wrapped into the engine's single keydown handler (no extra listeners). Visual toggles only: no state is touched.
  const _onKey = onKey;
  onKey = function (e) {
    if (e.key === 'F8') { e.preventDefault(); window.MM_RENDERER = window.MM_RENDERER === 'three' ? 'classic' : 'three'; if (G.started) toast('RENDERER: ' + window.MM_RENDERER.toUpperCase()); return; }
    if (e.key === 'F9') { e.preventDefault(); window.MM_HOTSPOTS = !window.MM_HOTSPOTS; if (G.started) toast('HOTSPOT DEBUG ' + (window.MM_HOTSPOTS ? 'ON' : 'OFF')); return; }
    return _onKey(e);
  };

  // ---- public/dev API
  Object.assign(MM3, {
    version: THREE_VERSION, url: THREE_URL,
    setRenderer(m) { window.MM_RENDERER = m === 'classic' ? 'classic' : 'three'; }, setHotspots(b) { window.MM_HOTSPOTS = !!b; },
    setClassicRooms(list) { window.MM_CLASSIC_ROOMS = new Set(list); }
  });
  Object.defineProperty(MM3, 'status', { get: () => status });
  Object.defineProperty(MM3, 'active', { get: () => active() });
  Object.defineProperty(MM3, 'shown', { get: () => threeCv.style.display });
  // ---- load Three.js (pinned). Failure => classic renderer keeps working everywhere.
  import(THREE_URL).then((T) => { MM3.init(T, threeCv); status = 'ready'; console.info('[MM3] Three.js r' + T.REVISION + ' renderer ready'); })
    .catch((e) => { status = 'failed'; console.warn('[MM3] Three.js failed to load; using classic renderer.', e && e.message); });
})();
