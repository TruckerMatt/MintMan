// ---- 09_three_breakroom.js ----  (Three.js break-room VISUAL ADAPTER — rendering layer only)
// The adventure engine stays authoritative. This file only READS G / G.S and draws pictures.
// It never writes story state, never adds input listeners, never owns a requestAnimationFrame loop
// (it is called from the engine's own frame() via the drawScene hook).
(function () {
  'use strict';
  if (typeof G === 'undefined' || typeof drawScene !== 'function') { console.warn('[MM3] engine not found; Three.js break room disabled'); return; }

  const THREE_VERSION = '0.160.0';
  const THREE_URL = window.MM3_THREE_URL || ('https://cdn.jsdelivr.net/npm/three@' + THREE_VERSION + '/build/three.module.js');
  const RES = 3;                         // Three canvas pixels per logical pixel (960x432 for the 320x144 scene)
  const qs = new URLSearchParams(location.search);
  window.BREAKROOM_RENDERER = qs.get('renderer') === 'classic' ? 'classic' : 'three';   // 'three' | 'classic'
  window.BREAKROOM_HOTSPOTS = qs.get('hotspots') === '1';                               // debug overlay of the real hotspot rectangles

  let T = null;                          // THREE namespace once loaded
  let status = 'loading';                // loading | ready | failed
  let X = null;                          // renderer bundle (once ready)

  // ------------------------------------------------------------------ DOM: stage with the Three canvas BEHIND the game canvas
  const gameCv = document.getElementById('game');
  const stage = document.createElement('div'); stage.id = 'stage';
  gameCv.parentNode.insertBefore(stage, gameCv); stage.appendChild(gameCv);
  const threeCv = document.createElement('canvas'); threeCv.id = 'three'; stage.insertBefore(threeCv, gameCv);
  const style = document.createElement('style');
  style.textContent = '#stage{position:relative;width:min(100vw,133.33vh);aspect-ratio:4/3;background:#000;flex:none}' +
    '#game{position:absolute!important;left:0;top:0;width:100%!important;height:100%!important;aspect-ratio:auto!important;background:transparent!important;z-index:1}' +
    '#three{position:absolute;left:0;top:0;width:100%;height:60%;pointer-events:none;display:none;z-index:0}';
  document.head.appendChild(style);

  // ------------------------------------------------------------------ COORDINATE ADAPTER (the ONE place logical <-> world conversion lives)
  // Logical space: x (0..320) across, y (0..144) = screen row of a point on the FLOOR, h = height above the floor in the same pixel units.
  // The classic renderer draws a thing standing at floor-row y with height h at screen row (y - h).
  // A 45-degree orthographic camera with an anisotropic frustum reproduces exactly that projection, so:
  //     world = ( x , h , y )        and        screen_x = x , screen_y = y - h
  // => every hotspot rectangle (which lives in screen space) lines up with the 3D object that stands on that floor row.
  // World +Z is toward the viewer, +Y is up.  Hollis = L2W(S.jx, S.jy), Juno = L2W(S.ax, S.ay), cats = L2W(c.x, c.y).
  function L2W(x, y, h, out) { return (out || new T.Vector3()).set(x, h || 0, y); }
  function W2L(v) { return { x: v.x, y: v.z, h: v.y, screenY: v.z - v.y }; }
  const WALL_Y = 83;                     // z of the back-wall plane (floor row where wall meets floor, matches classic baseboard row)

  // ------------------------------------------------------------------ helpers
  const fl = (k) => !!(G.S && G.S.f && G.S.f[k]);
  const active = () => status === 'ready' && window.BREAKROOM_RENDERER === 'three' && G.started && G.S && G.S.room === 'break';

  function init(THREE) {
    T = THREE;
    const renderer = new T.WebGLRenderer({ canvas: threeCv, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1); renderer.setSize(320 * RES, 144 * RES, false);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.useLegacyLights = true;     // simple, predictable light units (pinned r160)
    renderer.autoClear = false; renderer.info.autoReset = false; renderer.setClearColor(0x14151a, 1);
    const scene = new T.Scene();

    // ---- camera: fixed 45deg orthographic, anisotropic so that 1 world unit == 1 logical pixel on screen in both axes
    const cam = new T.OrthographicCamera(-160, 160, 72 / Math.SQRT2, -72 / Math.SQRT2, 1, 3000);
    const CAM_TARGET = new T.Vector3(160, 0, 72), CAM_D = 700;
    cam.position.set(CAM_TARGET.x, CAM_D * Math.SQRT1_2, CAM_TARGET.z + CAM_D * Math.SQRT1_2); cam.lookAt(CAM_TARGET);
    cam.updateMatrixWorld();

    // ---- materials / geometry helpers (all authoring is in logical units via L2W)
    const matCache = {};
    const mat = (color, o) => { const k = color + JSON.stringify(o || {}); return matCache[k] || (matCache[k] = new T.MeshStandardMaterial(Object.assign({ color, roughness: .86, metalness: 0, flatShading: true }, o || {}))); };
    const emi = (color, k, o) => { const kk = 'E' + color + k + JSON.stringify(o || {}); return matCache[kk] || (matCache[kk] = new T.MeshStandardMaterial(Object.assign({ color, emissive: color, emissiveIntensity: k == null ? 1 : k, roughness: .5, flatShading: true }, o || {}))); };
    const STATIC = []; let KEEP = false;   // static room boxes are baked + merged per material after the build (draw-call budget)
    function box(parent, x0, x1, y0, y1, h0, h1, m, o) {   // logical box: x range, floor-row range, height range
      o = o || {}; const mesh = new T.Mesh(new T.BoxGeometry(x1 - x0, h1 - h0, y1 - y0), m);
      L2W((x0 + x1) / 2, (y0 + y1) / 2, (h0 + h1) / 2, mesh.position);
      mesh.castShadow = o.cast !== false; mesh.receiveShadow = o.recv !== false; parent.add(mesh); if (!KEEP) STATIC.push(mesh); return mesh;
    }
    function lbox(parent, x0, x1, y0, y1, z0, z1, m, o) { // local-axes box (characters): x forward, y up, z lateral
      const mesh = new T.Mesh(new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m);
      mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); mesh.castShadow = !(o && o.noCast); mesh.receiveShadow = true; parent.add(mesh); return mesh;
    }
    function ctex(w, h, fn, o) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; if (o) Object.assign(t, o); return t; }
    const seeded = (n) => { let s = n; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };

    // ================================================================== ROOM
    const room = new T.Group(); scene.add(room);
    const dyn = {};                      // objects that react to game state

    // -- floor (checker tiles like the classic floor, plus seams, wear, stains)
    const floorTex = ctex(256, 256, (g, w, h) => {
      const r = seeded(7);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = (i + j) & 1 ? '#8c8c7c' : '#9a9a88'; g.fillRect(i * 64, j * 64, 64, 64); }
      for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(' + (r() > .5 ? '40,38,30' : '210,208,190') + ',' + (.03 + r() * .05) + ')'; g.fillRect(r() * w, r() * h, 2 + r() * 14, 1 + r() * 3); }
      g.strokeStyle = 'rgba(40,40,32,.55)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
    }, { wrapS: T.RepeatWrapping, wrapT: T.RepeatWrapping });
    floorTex.repeat.set(440 / 16, 220 / 16);
    const floor = new T.Mesh(new T.PlaneGeometry(440, 220), new T.MeshStandardMaterial({ map: floorTex, roughness: .7, metalness: .05 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(160, 0, WALL_Y + 110 - 0.0); floor.receiveShadow = true; room.add(floor);
    // floor wear: a darker walking lane in front of the counter / door, a few stains
    const stains = ctex(512, 256, (g, w, h) => {
      const r = seeded(21); g.clearRect(0, 0, w, h);
      const blot = (x, y, rad, a, c) => { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(' + c + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
      blot(300, 90, 38, .22, '40,30,15'); blot(120, 170, 30, .16, '30,30,30'); blot(420, 150, 26, .14, '60,40,20'); blot(210, 60, 22, .12, '30,25,15');
      g.fillStyle = 'rgba(25,20,10,.3)'; g.beginPath(); g.ellipse(335, 104, 9, 5, .4, 0, 7); g.fill(); // coffee ring on the floor
      g.strokeStyle = 'rgba(20,20,20,.18)'; g.lineWidth = 3; for (let i = 0; i < 10; i++) { g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + 30 + r() * 40, y + (r() - .5) * 8); g.stroke(); }
    });
    const stainMesh = new T.Mesh(new T.PlaneGeometry(320, 160), new T.MeshBasicMaterial({ map: stains, transparent: true, depthWrite: false }));
    stainMesh.rotation.x = -Math.PI / 2; stainMesh.position.set(160, .05, WALL_Y + 80); room.add(stainMesh);

    // -- back wall
    const wallTex = ctex(512, 512, (g, w, h) => {
      const r = seeded(3);
      g.fillStyle = '#cfc9a8'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 24) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x, 0, 2, h); }
      const gr = g.createLinearGradient(0, h * .35, 0, h); gr.addColorStop(0, 'rgba(120,110,70,0)'); gr.addColorStop(1, 'rgba(120,110,70,.38)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 180; i++) { g.fillStyle = 'rgba(90,80,40,' + (.03 + r() * .06) + ')'; g.fillRect(r() * w, h * .45 + r() * h * .55, 3 + r() * 20, 1 + r() * 2); }
      // water stain near the ceiling
      const bl = g.createRadialGradient(w * .62, h * .06, 0, w * .62, h * .06, 70); bl.addColorStop(0, 'rgba(140,110,60,.28)'); bl.addColorStop(1, 'rgba(140,110,60,0)'); g.fillStyle = bl; g.fillRect(w * .62 - 70, 0, 140, 140);
    });
    const wall = new T.Mesh(new T.PlaneGeometry(380, 130), new T.MeshStandardMaterial({ map: wallTex, roughness: .95 }));
    wall.position.set(160, 65, WALL_Y); wall.receiveShadow = true; room.add(wall);
    // wainscot (scuffed lower wall) + rail + baseboard
    const wains = mat('#a39f84'); box(room, -20, 340, WALL_Y, WALL_Y + .7, 0, 21, wains);
    box(room, -20, 340, WALL_Y, WALL_Y + 1.3, 20.5, 22.2, mat('#7a7250'));
    box(room, -20, 340, WALL_Y, WALL_Y + 1.6, 0, 3.2, mat('#7a7250'));
    const scuff = ctex(512, 32, (g, w, h) => { const r = seeded(11); g.clearRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(40,36,24,' + (.08 + r() * .14) + ')'; g.fillRect(r() * w, r() * h, 4 + r() * 22, 1 + r() * 2); } });
    const scuffM = new T.Mesh(new T.PlaneGeometry(360, 22), new T.MeshBasicMaterial({ map: scuff, transparent: true, depthWrite: false })); scuffM.position.set(160, 11, WALL_Y + .75); room.add(scuffM);

    // -- fluorescent fixtures hanging at the very top of the view
    dyn.tubes = [];
    for (const fx of [30, 150, 250]) {
      const g = new T.Group(); room.add(g);
      box(g, fx, fx + 40, 92, 99, 93, 99, mat('#8c8c90', { metalness: .3, roughness: .5 }), { recv: false });
      KEEP = true; const tube = box(g, fx + 2, fx + 38, 98.6, 99.4, 93.5, 98.5, emi('#f2ffe6', 1.4), { cast: false, recv: false }); KEEP = false; dyn.tubes.push(tube);
      box(g, fx + 4, fx + 5, 90, 92, 99, 110, mat('#555'), { cast: false });
    }
    // -- LOCKERS door (exit), recessed frame + wire-glass window
    {
      const g = new T.Group(); room.add(g);
      box(g, 288, 321, WALL_Y, 86.8, 0, 47.4, mat('#4a3320'));                        // frame
      box(g, 290, 321, 86.8, 87.6, 0, 46.4, mat('#6a4a2a'));                          // door leaf
      const glass = box(g, 294, 316, 87.6, 87.9, 29, 42.4, mat('#9ac8d8', { roughness: .15, metalness: .2, emissive: '#6aa0b0', emissiveIntensity: .35 }), { cast: false });
      for (let i = 1; i < 4; i++) box(g, 294 + i * 5.5, 294 + i * 5.5 + .5, 87.9, 88.2, 29, 42.4, mat('#32424a'), { cast: false });
      for (let j = 1; j < 3; j++) box(g, 294, 316, 87.9, 88.2, 29 + j * 4.5, 29 + j * 4.5 + .5, mat('#32424a'), { cast: false });
      box(g, 291, 295, 87.6, 90, 17, 20, mat('#c8a820', { metalness: .6, roughness: .35 })); // lever handle
      box(g, 291.5, 294.5, 87.6, 88.4, 22.5, 24.5, mat('#b0b0b0', { metalness: .7, roughness: .3 })); // lock
      box(g, 289, 290.4, 87.6, 88.4, 4, 40, mat('#22160c'));                         // hinge-side shadow gap
      box(g, 292, 318, 87.6, 87.9, 1, 3, mat('#3a2616'));                             // kick plate
      const sign = ctex(128, 40, (c, w, h) => { c.fillStyle = '#e8e6d4'; c.fillRect(0, 0, w, h); c.strokeStyle = '#222'; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4); c.fillStyle = '#1a1a1a'; c.font = 'bold 22px "Courier New",monospace'; c.textAlign = 'center'; c.fillText('LOCKERS', w / 2, 27); });
      const sm = new T.Mesh(new T.BoxGeometry(24, 7, 1), [mat('#444'), mat('#444'), mat('#444'), mat('#444'), new T.MeshStandardMaterial({ map: sign, roughness: .6 }), mat('#444')]); L2W(305, WALL_Y + 1.5, 53, sm.position); sm.castShadow = true; g.add(sm);
    }
    // -- bulletin board
    {
      const g = new T.Group(); room.add(g);
      box(g, 70, 106, WALL_Y, 84.6, 34, 62, mat('#6a4a2a'));
      const face = ctex(144, 112, (c, w, h) => {
        const r = seeded(5); c.fillStyle = '#a7773f'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 220; i++) { c.fillStyle = 'rgba(' + (r() > .5 ? '60,35,10' : '230,190,120') + ',.25)'; c.fillRect(r() * w, r() * h, 2, 2); }
        c.fillStyle = '#f2f2ec'; c.fillRect(12, 12, 50, 40); c.fillStyle = '#555'; c.font = 'bold 7px "Courier New",monospace'; c.textAlign = 'left';
        c.fillText('SAFETY', 16, 22); c.font = '6px "Courier New",monospace'; c.fillText('Forms 3-41', 16, 31); c.fillText('(please see)', 16, 39); c.fillRect(16, 44, 40, 1);
        c.fillStyle = '#e8d048'; c.fillRect(70, 16, 60, 32); c.fillStyle = '#4a3a10'; c.font = 'bold 6px "Courier New",monospace'; c.fillText('EMPLOYEE OF', 73, 26); c.fillText('THE MONTH:', 73, 33); c.fillText('VACANT', 73, 41); c.font = '5px "Courier New",monospace'; c.fillText('(since 2019)', 90, 45);
        c.fillStyle = 'rgba(230,220,180,.8)'; for (const p of [[10, 10], [60, 10], [68, 14], [128, 14]]) c.fillRect(p[0], p[1], 6, 3);   // tape
      });
      const bm = new T.Mesh(new T.PlaneGeometry(32, 24), new T.MeshStandardMaterial({ map: face, roughness: .9 })); L2W(88, 84.7, 48, bm.position); bm.receiveShadow = true; g.add(bm);
      const flyerTex = ctex(60, 44, (c, w, h) => { c.fillStyle = '#d6d6d2'; c.fillRect(0, 0, w, h); c.fillStyle = '#b02828'; c.font = 'bold 6px "Courier New",monospace'; c.fillText('WHISKER RIDGE', 4, 11); c.fillText('CAT RESCUE', 6, 19); c.fillStyle = '#333'; c.font = '5px "Courier New",monospace'; c.fillText('We handle LARGE', 4, 28); c.fillText('groups.  555-0147', 4, 35); c.fillStyle = '#222'; c.fillRect(30, 29, 22, 1); });
      const fm = new T.Mesh(new T.PlaneGeometry(10, 8), new T.MeshStandardMaterial({ map: flyerTex, roughness: .9 })); L2W(82, 84.9, 41.5, fm.position); fm.rotation.z = .05; g.add(fm); dyn.flyer = fm;
      box(g, 96, 111, WALL_Y, 89, 62, 64.5, mat('#7a7a7e', { metalness: .35, roughness: .5 }));            // little ledge where a cat likes to sit
      box(g, 98, 100, WALL_Y, 84.2, 58, 62, mat('#5a5a5e')); box(g, 107, 109, WALL_Y, 84.2, 58, 62, mat('#5a5a5e'));
    }
    // -- wall clock (battery pack hangs below until the battery is taken)
    {
      const g = new T.Group(); room.add(g); const cx = 119, cy = 17, zf = 84.6;
      const face = ctex(128, 128, (c, w, h) => { c.fillStyle = '#f4f4f0'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 6; c.stroke(); c.fillStyle = '#111'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.save(); c.translate(64 + Math.sin(a) * 50, 64 - Math.cos(a) * 50); c.rotate(a); c.fillRect(-2, -5, 4, i % 3 ? 8 : 12); c.restore(); }
        c.strokeStyle = '#111'; c.lineCap = 'round'; c.lineWidth = 6; c.beginPath(); c.moveTo(64, 64); c.lineTo(34, 64.5); c.stroke();      // hour hand at 9
        c.lineWidth = 4; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.sin(2 * Math.PI * 2 / 60) * 44, 64 - Math.cos(2 * Math.PI * 2 / 60) * 44); c.stroke(); c.fillStyle = '#b02020'; c.beginPath(); c.arc(64, 64, 4, 0, 7); c.fill(); });
      const disc = new T.Mesh(new T.CylinderGeometry(7.2, 7.2, 1.6, 28), [mat('#222'), new T.MeshStandardMaterial({ map: face, roughness: .5 }), mat('#222')]);
      disc.rotation.x = Math.PI / 2; L2W(cx, zf - .2, zf - cy, disc.position); disc.castShadow = true; g.add(disc);   // screen row of centre = zf - h = cy
      KEEP = true; const batt = new T.Group(); box(batt, 115.5, 122.5, 84, 86.4, 55.6, 58.8, mat('#2e2e30')); box(batt, 115.5, 122.5, 86.4, 86.9, 56.6, 57.5, mat('#c8b070'));  // tape
      box(batt, 116, 118, 86.4, 86.8, 58, 58.5, mat('#e0a020')); KEEP = false; g.add(batt); dyn.battery = batt;
    }
    // -- couch
    {
      const g = new T.Group(); room.add(g); const body = mat('#7a4a3a'), arm = mat('#6a3a2a'), cush = mat('#8a5a4a'), foot = mat('#151515');
      for (const fx of [10, 56]) for (const fy of [100, 108]) box(g, fx, fx + 2.4, fy, fy + 2.4, 0, 2, foot);
      box(g, 8, 60, 98, 110, 2, 7.4, body);                                      // frame
      box(g, 14, 54, 103.2, 110, 7.4, 10.6, cush);                               // seat cushions (2)
      box(g, 33.4, 34.6, 103.4, 110.2, 7.4, 10.8, mat('#4a2a20'));               // seam between them
      box(g, 8, 60, 98, 103.6, 7.4, 14, body);                                   // back
      box(g, 14, 54, 100, 103.6, 10.6, 13.6, cush);                              // back cushions
      box(g, 8, 14, 98, 110, 7.4, 11.8, arm); box(g, 54, 60, 98, 110, 7.4, 11.8, arm);   // arms
      box(g, 20, 27, 104, 108, 10.6, 12.4, mat('#a48a40'));                      // pancake-flat throw pillow
      box(g, 40.5, 41.4, 109.5, 110.4, 8, 9, mat('#c0c0c0'));                    // the lost pen cap
    }
    // -- table, chairs, tabletop litter
    {
      const g = new T.Group(); room.add(g);
      box(g, 72, 124, 110, 120, 9.2, 12, mat('#c8c8c4', { roughness: .45 }));                     // top
      box(g, 71.4, 124.6, 109.4, 120.6, 8.4, 9.4, mat('#8d8d88'));                                 // edge trim
      for (const lx of [74, 119.5]) for (const ly of [111.4, 116.8]) box(g, lx, lx + 2.4, ly, ly + 2.4, 0, 8.4, mat('#5a5a5a', { metalness: .5, roughness: .4 }));
      box(g, 76, 82.5, 112, 117.4, 12, 12.35, mat('#f4f4f2'));                                     // napkin
      const dr = box(g, 77.4, 79.8, 113.6, 115.4, 12.35, 12.55, mat('#b8bcb8')); dr.rotation.y = .4; // drool situation
      const form = box(g, 98, 108, 111.5, 118, 12, 12.3, mat('#eeeadc')); form.rotation.y = -.18;     // half-completed Form 3
      box(g, 100, 106, 113, 114, 12.3, 12.5, mat('#4a5a9a'));
      box(g, 112, 116, 113, 117, 12, 16, mat('#e8e8e4', { roughness: .4 })); box(g, 112.6, 115.4, 113.6, 116.4, 15.6, 16.1, mat('#2e1a0e'));   // mug
      const chair = (x0, back) => {   // cheap plastic chair seen end-on
        const c = new T.Group(); g.add(c); const pl = mat('#7a8a9a', { roughness: .55 });
        box(c, x0, x0 + 9, 110.6, 119, 7, 9, pl);
        if (back < 0) box(c, x0 - 2.2, x0, 110.6, 119, 8, 17, pl); else box(c, x0 + 9, x0 + 11.2, 110.6, 119, 8, 17, pl);
        for (const lx of [x0 + .6, x0 + 7.2]) for (const ly of [111, 117]) box(c, lx, lx + 1.2, ly, ly + 1.2, 0, 7, mat('#aaa', { metalness: .6, roughness: .35 }));
        return c;
      };
      const c1 = chair(62, -1), c2 = chair(125.6, 1);
      const pv = (grp, cx, cz, ry) => { grp.position.set(cx, 0, cz); grp.children.forEach(ch => { ch.position.x -= cx; ch.position.z -= cz; }); grp.rotation.y = ry; };
      pv(c2, 131, 115, .22); pv(c1, 66.5, 115, -.06);
    }
    // -- counter, coffee maker, microwave, sugar
    {
      const g = new T.Group(); room.add(g);
      box(g, 131, 196, WALL_Y, 91, 2, 17.2, mat('#7a6a5a'));                                         // cabinet
      box(g, 131, 196, WALL_Y, 91.6, 0, 2, mat('#2a2018'));                                          // kick
      for (const dx of [133, 164]) { box(g, dx, dx + 28, 91.1, 91.7, 3.4, 15.4, mat('#6a5a4a')); box(g, dx + 20, dx + 22, 91.7, 92.3, 8, 11, mat('#b8b8b8', { metalness: .6 })); }
      box(g, 130, 197, WALL_Y, 92.4, 17.2, 19.2, mat('#b07840', { roughness: .55 }));              // counter top
      box(g, 130, 197, 92.4, 93, 17.2, 19.2, mat('#7a5028'));
      // coffee maker
      const cm = new T.Group(); g.add(cm);
      box(cm, 142, 154, 83.4, 89.4, 19.2, 21, mat('#2e2e2e')); box(cm, 142, 154, 83.4, 85.6, 21, 31, mat('#2e2e2e')); box(cm, 141.5, 154.5, 83.4, 89.8, 29.4, 31.4, mat('#222'));
      box(cm, 144, 152, 85.8, 89, 21, 28.6, mat('#e8f0f0', { transparent: true, opacity: .55, roughness: .1 }), { cast: false }); box(cm, 144.4, 151.6, 86, 88.8, 21, 22.2, mat('#3a2410'));
      box(cm, 152, 153.4, 89.4, 89.9, 22.6, 23.6, emi('#ff3030', 1.1), { cast: false });
      // microwave
      const mw = new T.Group(); g.add(mw);
      box(mw, 160, 180, 83.4, 89.6, 19.2, 31, mat('#5a5a5e', { roughness: .5 }));
      box(mw, 161.6, 173.4, 89.6, 90.1, 21, 29.6, mat('#0c0c10', { roughness: .1, metalness: .3 })); box(mw, 174.6, 178.4, 89.6, 90.1, 21, 29.6, mat('#3a3a3e'));
      box(mw, 175, 176, 90.1, 91, 22.4, 28.2, mat('#c8c8c8', { metalness: .7 })); box(mw, 176.6, 178, 90.1, 90.4, 26, 28, emi('#40ff80', .9), { cast: false });
      const sugar = [['#f4f4f4', 183], ['#f0b0c0', 185.8], ['#f4f4f4', 188.6]]; for (const s of sugar) { const sb = box(g, s[1], s[1] + 2, 86, 89, 19.2, 20, mat(s[0])); sb.rotation.y = .3; }
      const sign = ctex(100, 40, (c, w, h) => { c.fillStyle = '#eaeadc'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = 'bold 8px "Courier New",monospace'; c.fillText('CLEAN AS', 12, 17); c.fillText('YOU GO', 18, 29); });
      const sg = new T.Mesh(new T.PlaneGeometry(10, 4), new T.MeshStandardMaterial({ map: sign, roughness: .9 })); L2W(189, WALL_Y + .6, 40, sg.position); g.add(sg);
      const mwn = ctex(120, 56, (c, w, h) => { c.fillStyle = '#f0ecd2'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = 'bold 8px "Courier New",monospace'; c.fillText('PLEASE DO NOT', 8, 14); c.fillText('MICROWAVE FISH', 4, 25); c.fillStyle = '#b02020'; c.font = 'bold 12px "Courier New",monospace'; c.fillText('SERIOUSLY.', 6, 45); });
      const mn = new T.Mesh(new T.PlaneGeometry(13, 6), new T.MeshStandardMaterial({ map: mwn, roughness: .9 })); L2W(170, WALL_Y + .6, 40, mn.position); mn.rotation.z = -.03; g.add(mn);
      box(g, 168, 172, WALL_Y, WALL_Y + .8, 36.2, 37.4, mat('#d8d0a0'), { cast: false });
      // waste bin to the left of the counter
      box(g, 118, 128, 86, 94, 0, 11, mat('#4a4e50', { roughness: .6 })); box(g, 117.4, 128.6, 85.4, 94.6, 11, 12, mat('#33383a'));
      box(g, 121, 125, 88, 91, 12, 13, mat('#e0e0d8')); // crumpled cup in the bin
    }
    // -- fridge (+ Tucker's note, magnets)
    {
      const g = new T.Group(); room.add(g);
      box(g, 200, 224, WALL_Y, 90, 0, 38, mat('#c8c8c4', { roughness: .55 }));
      box(g, 200.4, 223.6, 90, 90.4, 1, 25.6, mat('#bcbcb8')); box(g, 200.4, 223.6, 90, 90.4, 26.6, 37.2, mat('#bcbcb8'));
      box(g, 200, 224, 90, 90.5, 25.6, 26.6, mat('#5a5a5a'));
      box(g, 218, 220, 90.4, 92, 29, 35.4, mat('#8a8a8c', { metalness: .6, roughness: .35 })); box(g, 218, 220, 90.4, 92, 8, 22, mat('#8a8a8c', { metalness: .6, roughness: .35 }));
      const note = ctex(80, 56, (c, w, h) => { c.fillStyle = '#f6f2d8'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = 'bold 8px "Courier New",monospace'; c.fillText('TUCKER —', 6, 14); c.fillText('DO NOT EAT', 4, 28); c.fillText('— TUCKER', 6, 42); });
      const nm = new T.Mesh(new T.PlaneGeometry(10, 8), new T.MeshStandardMaterial({ map: note, roughness: .9 })); L2W(209, 90.6, 12, nm.position); nm.rotation.z = .06; g.add(nm);
      for (const [mx, mh, c] of [[205, 20.5, '#d03030'], [212, 22.5, '#3070d0'], [204.4, 9, '#e0c020'], [215, 11, '#30a040']]) box(g, mx, mx + 1.6, 90.4, 91.2, mh, mh + 1.6, mat(c));
      const grime = ctex(64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); const gr = c.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(60,50,30,.5)'); gr.addColorStop(.4, 'rgba(60,50,30,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
      const gm = new T.Mesh(new T.PlaneGeometry(23, 24), new T.MeshBasicMaterial({ map: grime, transparent: true, depthWrite: false })); L2W(212, 90.55, 12, gm.position); g.add(gm);
    }
    // -- vending machine
    {
      const g = new T.Group(); room.add(g); dyn.vend = g;
      const red = mat('#b82828', { roughness: .5 }); const zf = 92;
      box(g, 232, 258, WALL_Y, zf, 0, 34, red);
      box(g, 231.4, 258.6, WALL_Y, zf + .4, 32, 34.4, mat('#8a1c1c'));
      // header sign
      const hd = ctex(160, 20, (c, w, h) => { c.fillStyle = '#f8e8b0'; c.fillRect(0, 0, w, h); c.fillStyle = '#b82828'; c.font = 'bold 13px "Courier New",monospace'; c.textAlign = 'center'; c.fillText('SNACK DEPOT 3', w / 2, 15); });
      const hm = new T.Mesh(new T.PlaneGeometry(22, 2.6), new T.MeshStandardMaterial({ map: hd, emissive: '#ffffff', emissiveMap: hd, emissiveIntensity: .55, roughness: .6 })); L2W(242.6, zf + .55, 30.4, hm.position); g.add(hm);
      box(g, 233.5, 250.6, zf, zf + .8, 10, 28.6, mat('#050608', { roughness: .08, metalness: .4 }), { cast: false });   // glass
      const prod = ['#f8e040', '#2850c0', '#28a030', '#e08020', '#f070f0'];
      dyn.prod = [];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) {
        const pm = box(g, 235 + i * 3.9, 235 + i * 3.9 + 3, zf + .8, zf + 1.9, 12 + j * 5.6, 12 + j * 5.6 + 3.8, emi(prod[(i + j * 2) % 5], .55), { cast: false }); dyn.prod.push(pm);
        box(g, 233.6, 250.4, zf + .8, zf + 1.1, 11.4 + j * 5.6, 11.8 + j * 5.6, mat('#9a9a9a', { metalness: .5 }), { cast: false });   // coil shelf
      }
      box(g, 251.6, 256.6, zf, zf + .8, 3, 30, mat('#c8c8c8', { roughness: .4, metalness: .3 }));                          // control column
      box(g, 252.6, 255.6, zf + .8, zf + 1.4, 23, 27.4, mat('#1a1a1a'));                                                  // coin slot panel
      box(g, 253.4, 254.8, zf + 1.4, zf + 1.8, 24, 26, mat('#555'));
      for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) box(g, 252.6 + i * 1.7, 252.6 + i * 1.7 + 1.2, zf + .8, zf + 1.3, 17.4 + j * 1.7, 17.4 + j * 1.7 + 1.2, mat('#e8e8e8'), { cast: false });   // keypad
      KEEP = true; dyn.d4 = box(g, 252.4, 255.8, zf + .8, zf + 1.4, 12, 14, emi('#70e060', 0), { cast: false });                         // D4 light
      box(g, 234, 250, zf, zf + .9, 2.4, 8.6, mat('#050505'));                                                            // dispenser tray
      dyn.tray = box(g, 238, 246, zf + .9, zf + 1.2, 3.4, 5.2, emi('#70e060', 0), { cast: false }); KEEP = false;                        // glowing mint
      // dents + a taped warning
      for (const [dx, dh, dw] of [[236, 6, 4], [248, 31, 3]]) box(g, dx, dx + dw, zf + .02, zf + .3, dh, dh + 2, mat('#8a2020'), { cast: false });
      const wn = ctex(80, 40, (c, w, h) => { c.fillStyle = '#f4f0c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#b02020'; c.font = 'bold 7px "Courier New",monospace'; c.fillText('MACHINE KEEPS', 4, 13); c.fillText('YOUR CHANGE.', 6, 22); c.fillText('IT KNOWS.', 12, 32); });
      const wm = new T.Mesh(new T.PlaneGeometry(6.6, 3.3), new T.MeshStandardMaterial({ map: wn, roughness: .9 })); L2W(255, zf + .85, 8, wm.position); wm.rotation.z = -.08; g.add(wm);
      // radio-blink gap lives next to it
    }
    // -- the gap behind the vending machine (and the blinking radio)
    {
      const g = new T.Group(); room.add(g); dyn.gap = g;
      box(g, 258, 266, WALL_Y, WALL_Y + .6, 0, 25, mat('#050505', { roughness: 1 }), { cast: false });
      const sh = ctex(32, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
      const shm = new T.Mesh(new T.PlaneGeometry(7, 19), new T.MeshBasicMaterial({ map: sh, transparent: true, depthWrite: false })); shm.rotation.x = -Math.PI / 2; shm.position.set(262, .06, 93); g.add(shm);
      KEEP = true; dyn.blink = box(g, 260.4, 262.4, WALL_Y + .6, WALL_Y + 1.4, 17.6, 19.2, emi('#50ff70', 1.4), { cast: false }); KEEP = false;
      dyn.blinkLight = new T.PointLight('#50ff70', 0, 26, 2); dyn.blinkLight.position.set(261.4, 19, 88); g.add(dyn.blinkLight);
    }
    // -- floor items: cat bowl + paw prints, crumpled label, paw trail
    {
      KEEP = true; const bg = new T.Group(); room.add(bg); dyn.bowl = bg;
      box(bg, 34, 44, 127, 133, 0, 2.6, mat('#c02828', { roughness: .4 })); box(bg, 35, 43, 128, 132, 2.6, 3.6, mat('#7a4a20')); box(bg, 36, 42, 129, 131, 3.6, 4.4, mat('#8a5a2a'));
      for (const [kx, ky] of [[31, 134], [46, 131.5], [47.5, 134]]) box(bg, kx, kx + 1, ky, ky + 1, 0, .7, mat('#7a4a20'), { cast: false });
      const card = ctex(64, 40, (c, w, h) => { c.fillStyle = '#e8f0f0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#b02020'; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4); c.fillStyle = '#b02020'; c.font = 'bold 9px "Courier New",monospace'; c.textAlign = 'center'; c.fillText('NOT A', w / 2, 17); c.fillText('CAT BOWL', w / 2, 30); });
      const cd = new T.Mesh(new T.PlaneGeometry(8, 5), new T.MeshStandardMaterial({ map: card, roughness: .4 })); cd.position.set(26.4, 3.2, 131.4); cd.rotation.x = -.18; cd.rotation.y = .3; cd.castShadow = true; bg.add(cd);
      box(bg, 25.8, 27, 131, 132, 0, 3, mat('#aaa'), { cast: false });
      const prints = ctex(256, 64, (c, w, h) => {
        c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(30,26,22,.62)';
        const pawp = (x, y) => { c.beginPath(); c.ellipse(x, y, 5, 4, 0, 0, 7); c.fill(); for (const [dx, dy] of [[-6, -6], [-2, -9], [3, -9], [7, -6]]) { c.beginPath(); c.arc(x + dx, y + dy, 2.2, 0, 7); c.fill(); } };
        for (let i = 0; i < 4; i++) pawp(22 + i * 54, 40 + (i % 2) * 14);
      });
      const pm = new T.Mesh(new T.PlaneGeometry(26, 6.5), new T.MeshBasicMaterial({ map: prints, transparent: true, depthWrite: false })); pm.rotation.x = -Math.PI / 2; pm.position.set(152, .08, 132.6); room.add(pm);
      const pm2 = new T.Mesh(new T.PlaneGeometry(18, 4.5), new T.MeshBasicMaterial({ map: prints, transparent: true, depthWrite: false })); pm2.rotation.x = -Math.PI / 2; pm2.position.set(56, .08, 131.5); bg.add(pm2);
      const lb = new T.Group(); room.add(lb); dyn.label = lb;
      const lt = ctex(64, 40, (c, w, h) => { c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; for (let i = 0; i < 18; i++) c.fillRect(6 + i * 3, 6, i % 3 ? 1 : 2, 18); c.font = '6px monospace'; c.fillText('9 4 1 7 0 0 0', 8, 34); });
      const lm = box(lb, 110.4, 117, 129.6, 133.6, 0, 1.2, new T.MeshStandardMaterial({ map: lt, roughness: .9, flatShading: true })); lm.rotation.y = .5; lm.rotation.z = .08;
      box(lb, 113, 115.6, 130.8, 132.4, 1.2, 2.5, mat('#e8e8e2')).rotation.y = .9; KEEP = false;
    }
    function mergeStatic(list, parent) {
      parent.updateMatrixWorld(true); const buckets = new Map();
      for (const m of list) { if (!m.parent) continue; const k = m.material.uuid + '|' + m.castShadow + '|' + m.receiveShadow; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(m); }
      let before = 0, after = 0;
      for (const arr of buckets.values()) {
        before += arr.length; if (arr.length < 2) { after += arr.length; continue; }
        let nv = 0, ni = 0; for (const m of arr) { nv += m.geometry.attributes.position.count; ni += m.geometry.index.count; }
        const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni); let vo = 0, io = 0; const v = new T.Vector3(), nm = new T.Matrix3();
        for (const m of arr) {
          nm.getNormalMatrix(m.matrixWorld); const g = m.geometry, p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
          for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); pos.set([v.x, v.y, v.z], (vo + i) * 3); v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (vo + i) * 3); uv.set([u.getX(i), u.getY(i)], (vo + i) * 2); }
          for (let j = 0; j < g.index.count; j++) idx[io + j] = g.index.getX(j) + vo; vo += p.count; io += g.index.count; m.parent.remove(m); g.dispose();
        }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setIndex(new T.BufferAttribute(idx, 1));
        const mesh = new T.Mesh(geo, arr[0].material); mesh.castShadow = arr[0].castShadow; mesh.receiveShadow = arr[0].receiveShadow; parent.add(mesh); after++;
      }
      return { before, after };
    }
    const mergeInfo = mergeStatic(STATIC, room); console.info('[MM3] static room meshes merged: ' + mergeInfo.before + ' -> ' + mergeInfo.after);
    // -- cat-spot support heights (for cats whose logical y is above the floor row of the wall): used to perch them
    const PERCH = [{ x0: 232, x1: 258, top: 34.5 }, { x0: 128, x1: 197, top: 19.2 }, { x0: 200, x1: 224, top: 38 }, { x0: 96, x1: 111, top: 64.5 }];

    // ================================================================== LIGHTING
    const hemi = new T.HemisphereLight('#d8e8ff', '#9a9680', .95); scene.add(hemi);
    const key = new T.DirectionalLight('#eef6ff', 1.25); key.position.set(40, 230, 215); key.target.position.set(170, 0, 100); scene.add(key, key.target);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0012; key.shadow.normalBias = .4; key.shadow.radius = 3;
    Object.assign(key.shadow.camera, { left: -230, right: 230, top: 120, bottom: -120, near: 1, far: 700 });
    const fix = [30, 150, 250].map((fx) => { const l = new T.PointLight('#e4f6f0', .8, 170, 1.4); l.position.set(fx + 20, 80, 104); scene.add(l); return l; });
    const vendLight = new T.PointLight('#ffe9b8', .75, 70, 1.6); vendLight.position.set(245, 20, 108); scene.add(vendLight);
    const greenLight = new T.PointLight('#70ff90', 0, 44, 2); greenLight.position.set(254, 14, 101); scene.add(greenLight);
    const warm = new T.PointLight('#ffcf98', .22, 90, 1.6); warm.position.set(30, 30, 118); scene.add(warm);   // dusty couch corner

    // ================================================================== CHARACTERS
    const lerpAng = (a, b, k) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * k; };
    // bake a bone's static boxes into ONE vertex-coloured mesh (characters have ~40 tiny boxes; this keeps draw calls low). Parts flagged keep stay separate.
    const vcMat = new T.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: .86, metalness: 0, flatShading: true });
    function bake(group) {
      const parts = group.children.filter(c => c.isMesh && !c.userData.keep && c.material && c.material.color && !Array.isArray(c.material)); if (parts.length < 2) return;
      let nv = 0, ni = 0; for (const m of parts) { nv += m.geometry.attributes.position.count; ni += m.geometry.index.count; }
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint32Array(ni); let vo = 0, io = 0; const v = new T.Vector3(), nm = new T.Matrix3();
      for (const m of parts) {
        m.updateMatrix(); nm.getNormalMatrix(m.matrix); const g = m.geometry, p = g.attributes.position, n = g.attributes.normal, c = m.material.color;
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrix); pos.set([v.x, v.y, v.z], (vo + i) * 3); v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (vo + i) * 3); col.set([c.r, c.g, c.b], (vo + i) * 3); }
        for (let j = 0; j < g.index.count; j++) idx[io + j] = g.index.getX(j) + vo; vo += p.count; io += g.index.count; group.remove(m); g.dispose();
      }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.setIndex(new T.BufferAttribute(idx, 1));
      const mesh = new T.Mesh(geo, vcMat); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    }
    // -- Hollis
    function buildHollis() {
      const root = new T.Group(); const g = new T.Group(); root.add(g);
      const skin = mat('#f0b890'), jeans = mat('#3a5a98'), boot = mat('#4a3020'), gray = mat('#8a8f98'), vest = mat('#2a58b8'), stripe = mat('#f8e040', { emissive: '#f8e040', emissiveIntensity: .12 }), cap = mat('#1a1f2c');
      const legs = [], arms = [];
      for (const s of [-1, 1]) {
        const hip = new T.Group(); hip.position.set(0, 17, s * 1.9); g.add(hip);
        lbox(hip, -1.9, 1.9, -13, 0, -1.8, 1.8, jeans); lbox(hip, -2.2, 3.8, -17, -12.6, -1.7, 1.7, boot); lbox(hip, -2.3, 3.9, -17, -16, -1.8, 1.8, mat('#2a1c12'), { noCast: true });
        legs.push(hip);
        const sh = new T.Group(); sh.position.set(0, 29, s * 4.7); g.add(sh);
        lbox(sh, -1.4, 1.4, -9, 0, -1.3, 1.3, gray); lbox(sh, -1.2, 1.2, -11.6, -9, -1.2, 1.2, skin);
        arms.push(sh);
      }
      const torso = new T.Group(); g.add(torso);
      lbox(torso, -3.2, 3.2, 17, 30, -3.7, 3.7, gray);
      lbox(torso, -3.45, 3.45, 17.4, 29, -3.95, 3.95, vest);                                           // vest
      lbox(torso, -3.6, 3.6, 22, 23.2, -4.05, 4.05, stripe); lbox(torso, -3.6, 3.6, 18.2, 19.4, -4.05, 4.05, stripe);   // reflective stripes
      lbox(torso, 2.9, 3.3, 17.4, 29, -.8, .8, mat('#1c4090'), { noCast: true });                       // zip line
      lbox(torso, -3.3, 3.3, 16.6, 17.6, -3.8, 3.8, mat('#2a2018'));                                   // belt
      const head = new T.Group(); head.position.set(0, 31, 0); g.add(head);
      lbox(head, -3.4, 3.4, -1, 7.6, -3.5, 3.5, skin);
      lbox(head, -3.5, 3.5, -1.2, 2.4, -3.6, 3.6, mat('#a98a70'), { noCast: true }).scale.set(1, 1, 1);  // stubble shadow (jaw)
      lbox(head, -3.9, 3.9, 5, 9, -3.9, 3.9, cap); lbox(head, 2.4, 7.8, 5.2, 6.4, -3.2, 3.2, cap);        // cap + brim
      for (const s of [-1, 1]) { const zf = s > 0 ? 3.5 : -3.7;   // eyes + heavy lids on the side the camera sees
        lbox(head, 1.2, 3, 3.3, 4.8, zf, zf + .2, mat('#fafafa'), { noCast: true }); lbox(head, 2.1, 3, 3.5, 4.5, s > 0 ? 3.6 : -3.8, s > 0 ? 3.75 : -3.65, mat('#141010'), { noCast: true });
        lbox(head, 1, 3.2, 4.4, 5.3, zf - .05, zf + .3, mat('#a07a60'), { noCast: true });                     // tired lid
        lbox(head, 1, 3.4, 5.5, 6, zf - .05, zf + .3, mat('#3a2a20'), { noCast: true }); }                      // brow
      lbox(head, -3.6, 1, 0, 1.4, 3.45, 3.62, mat('#8a6a58'), { noCast: true }); lbox(head, -3.6, 1, 0, 1.4, -3.62, -3.45, mat('#8a6a58'), { noCast: true });   // stubble patch
      lbox(head, 3.2, 4.4, 1.6, 3.2, -.7, .7, mat('#e0a880'));                                           // nose
      root.scale.setScalar(.95); [...legs, ...arms, torso, head].forEach(bake);
      return { root, g, legs, arms, torso, head, face: 1, ang: 0, ph: 0 };
    }
    // -- Juno (black/white border-collie type with tan eyebrows). Local axes: +x forward (nose), +y up, z lateral (camera sees the +z side)
    function buildJuno() {
      const root = new T.Group(); const g = new T.Group(); root.add(g);
      const B = mat('#1e1e26'), W = mat('#f4f4f4'), Tn = mat('#b8782c');
      const body = new T.Group(); body.position.set(-8, 0, 0); g.add(body);           // pivot at the rump so sit/lay can tilt it
      lbox(body, 0, 14, 4, 10.6, -2.9, 2.9, B); lbox(body, 6.4, 13.8, 3.5, 8.2, -2.7, 2.7, W);   // torso + white chest
      const haunch = lbox(body, -.4, 6, 0, 5.4, -3.1, 3.1, B); haunch.visible = false; haunch.userData.keep = true;
      const legs = {};
      for (const [n, x, wh, c] of [['fl', 4.2, 1, W], ['fr', 4.2, -1, W], ['hl', -3.8, 1, B], ['hr', -3.8, -1, B]]) {
        const l = new T.Group(); l.position.set(x, 5, wh * 1.9); g.add(l); lbox(l, -1.1, 1.1, -5, 0, -1, 1, c); lbox(l, -1.2, 1.6, -5, -3.6, -1.1, 1.1, W);
        legs[n] = l;
      }
      const tail = new T.Group(); tail.position.set(-8.4, 9.4, 0); g.add(tail); lbox(tail, -6.4, .5, -.9, .9, -.9, .9, B); lbox(tail, -7.6, -5.6, -1, 1, -1, 1, W);
      const head = new T.Group(); head.position.set(5.6, 10, 0); g.add(head);
      lbox(head, -1.5, 4.2, -1, 5.4, -2.7, 2.7, B); lbox(head, 3.6, 8.6, -1, 2.8, -1.8, 1.8, W); lbox(head, 8.2, 9.6, 1.4, 2.9, -.9, .9, mat('#050505'));   // skull, white muzzle, nose
      for (const s of [-1, 1]) {   // eyes on the visible side: white sclera + dark pupil, tan brow above
        const z0 = s > 0 ? 2.7 : -2.9; lbox(head, 1.6, 3.4, 2.1, 3.7, z0, z0 + .2, mat('#fafafa', { roughness: .3 }), { noCast: true }); lbox(head, 2.4, 3.2, 2.4, 3.4, s > 0 ? 2.9 : -3.0, s > 0 ? 3.0 : -2.9, mat('#0a0a0a'), { noCast: true });
        lbox(head, 1.2, 3.8, 3.9, 4.8, s > 0 ? 2.6 : -3, s > 0 ? 3 : -2.6, Tn, { noCast: true });
      }
      lbox(head, -1.2, 1, 3.4, 7.8, -2.9, -1.2, B); lbox(head, -1.2, 1, 3.4, 7.8, 1.2, 2.9, B);           // ears
      const jaw = lbox(head, 3.6, 7.8, -2.2, -1, -1.5, 1.5, mat('#d84040')); jaw.visible = false; jaw.userData.keep = true;
      const band = lbox(body, 3, 4.6, 3.8, 10.8, -3.1, 3.1, mat('#70e060', { emissive: '#40c040', emissiveIntensity: .3 })); band.visible = false; band.userData.keep = true;
      root.scale.setScalar(1.05); [body, head, tail, ...Object.values(legs)].forEach(bake);
      return { root, g, body, haunch, legs, tail, head, jaw, band, face: 1, ang: 0 };
    }
    // -- cats
    const catMats = {};
    const cmat = (c) => catMats[c] || (catMats[c] = mat(c, { roughness: .9 }));
    function buildCat() {
      const root = new T.Group(); const g = new T.Group(); root.add(g);
      const P = { body: lbox(g, -.5, .5, -.5, .5, -.5, .5, cmat('#e08a30')) };
      const head = new T.Group(); g.add(head);
      P.head = lbox(head, -2, 2, -2, 2, -2.1, 2.1, cmat('#e08a30'));
      P.earL = lbox(head, -.6, .6, 1.8, 3.6, -2, -.7, cmat('#e08a30')); P.earR = lbox(head, -.6, .6, 1.8, 3.6, .7, 2, cmat('#e08a30'));
      const em = () => new T.MeshStandardMaterial({ color: '#ffe040', emissive: '#ffe040', emissiveIntensity: .9 });
      P.eyeL = lbox(head, .3, 1.7, .1, 1.5, -2.35, -1.95, em(), { noCast: true }); P.eyeR = lbox(head, .3, 1.7, .1, 1.5, 1.95, 2.35, em(), { noCast: true });   // eyes on BOTH flanks: the camera sees whichever side the cat faces
      P.pupL = lbox(head, .8, 1.3, .2, 1.4, -2.45, -2.3, cmat('#101010'), { noCast: true }); P.pupR = lbox(head, .8, 1.3, .2, 1.4, 2.3, 2.45, cmat('#101010'), { noCast: true });
      P.lidL = lbox(head, .2, 1.8, .75, 1.7, -2.5, -1.9, cmat('#a85a10'), { noCast: true }); P.lidR = lbox(head, .2, 1.8, .75, 1.7, 1.9, 2.5, cmat('#a85a10'), { noCast: true });   // half-lidded: judgmental
      P.nose = lbox(head, 1.9, 2.4, -.7, -.1, -.35, .35, cmat('#e0a0a0'), { noCast: true });
      const tail = new T.Group(); g.add(tail); const segs = [];
      for (let i = 0; i < 3; i++) { const s = new T.Group(); segs.push(s); (i ? segs[i - 1] : tail).add(s); s.position.x = i ? -1.9 : 0; P['t' + i] = lbox(s, -2, 0, -.55, .55, -.55, .55, cmat('#e08a30')); }
      const legs = []; for (const [x, z] of [[-2.5, -1.4], [-2.5, 1.4], [2.2, -1.4], [2.2, 1.4]]) { const l = lbox(g, x - .6, x + .6, 0, 2, z - .6, z + .6, cmat('#e08a30')); legs.push(l); }
      const stripes = [lbox(g, -1.4, -.8, 0, 1, -1, 1, cmat('#a85a10'), { noCast: true }), lbox(g, .4, 1, 0, 1, -1, 1, cmat('#a85a10'), { noCast: true })];
      return { root, g, head, tail, segs, legs, stripes, P, pose: null, seedKey: null, ang: 0 };
    }
    function styleCat(c, seed) {
      const cc = CAT_COLS[Math.floor(rnd(seed + 1) * CAT_COLS.length)]; const eye = ['#ffe040', '#60ff60', '#ffffff'][Math.floor(rnd(seed + 4) * 3)];
      const a = cmat(cc[0]), b = cmat(cc[1]);
      for (const k of ['body', 'head', 'earL', 'earR', 't0', 't1', 't2']) c.P[k].material = a;
      c.P.t2.material = rnd(seed + 5) > .5 ? b : a; c.P.lidL.material = b; c.P.lidR.material = b; for (const l of c.legs) l.material = a;
      c.stripes.forEach(s => { s.visible = rnd(seed + 5) > .6; s.material = b; });
      for (const e of [c.P.eyeL, c.P.eyeR]) { e.material = e.material.clone(); e.material.color.set(eye); e.material.emissive.set(eye); }
      c.face = rnd(seed + 3) > .5 ? 1 : -1; c.seedKey = seed;
    }
    function poseCat(c, pose) {
      const P = c.P; c.pose = pose; const set = (m, x0, x1, y0, y1, z0, z1) => { m.scale.set((x1 - x0), (y1 - y0), (z1 - z0)); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); };
      const hp = (x, y) => c.head.position.set(x, y, 0);
      for (const l of c.legs) l.visible = false; c.tail.rotation.set(0, 0, 0);
      if (pose === 'sit') { set(P.body, -2.2, 2.6, 0, 5.4, -2.2, 2.2); hp(1.2, 7.4); c.tail.position.set(-2.2, .7, 0); c.tail.rotation.z = -.15; c.legs[2].visible = c.legs[3].visible = true; c.legs[2].scale.set(1, 1, 1); c.legs[2].position.set(2.2, 0, -1.4); c.legs[3].position.set(2.2, 0, 1.4); }
      else if (pose === 'loaf') { set(P.body, -4, 4, 0, 4.4, -2.3, 2.3); hp(3.6, 5.6); c.tail.position.set(-4, 1.4, 0); c.tail.rotation.z = -.5; }
      else if (pose === 'sleep') { set(P.body, -4, 4, 0, 3, -2.3, 2.3); hp(3.6, 3.2); c.tail.position.set(-3.8, 1, 1.2); c.tail.rotation.y = -1.6; }
      else { set(P.body, -4, 4, 2, 5.4, -2, 2); hp(4.4, 7.2); c.tail.position.set(-4, 4.4, 0); c.tail.rotation.z = .9; for (const l of c.legs) { l.visible = true; l.position.y = 0; } c.legs[0].position.x = -2.5; c.legs[2].position.x = 2.4; }
      c.lids = pose === 'sleep' ? 1 : 0;
    }
    // pools
    const hollis = buildHollis(); scene.add(hollis.root);
    const juno = buildJuno(); scene.add(juno.root);
    const cats = [];
    const getCat = (i) => { if (!cats[i]) { const c = buildCat(); scene.add(c.root); cats[i] = c; } return cats[i]; };
    const zSprite = { }; // 2D overlay helpers live in the draw hook

    // ================================================================== MINT MODE (visual only; driven by S.mintOn / S.mint)
    const ovScene = new T.Scene(); const ovCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const gradeMat = new T.ShaderMaterial({
      transparent: true, depthTest: false, depthWrite: false, blending: T.CustomBlending, blendSrc: T.DstColorFactor, blendDst: T.ZeroFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor,
      uniforms: { tint: { value: new T.Color(1, 1, 1) }, k: { value: 0 }, vig: { value: .5 } },
      vertexShader: 'varying vec2 v; void main(){ v=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: 'varying vec2 v; uniform vec3 tint; uniform float k; uniform float vig; void main(){ vec2 d=v-.5; d.x*=1.25; float vg=1.-vig*smoothstep(.3,.95,length(d)); vec3 c=mix(vec3(1.),tint,k)*vg; gl_FragColor=vec4(c,1.); }'
    });
    const lineMat = new T.ShaderMaterial({
      transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { t: { value: 0 }, k: { value: 0 }, col: { value: new T.Color('#00ffb4') } },
      vertexShader: 'varying vec2 v; void main(){ v=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: 'varying vec2 v; uniform float t; uniform float k; uniform vec3 col; void main(){ float y=v.y*144.; float s=step(.5,fract((y+t*20.)/4.))*0.07; float roll=smoothstep(.0,.03,abs(fract(v.y*1.0-t*.12)-.5)-.47)*0.; gl_FragColor=vec4(col*(s+roll)*k,1.); }'
    });
    const q1 = new T.Mesh(new T.PlaneGeometry(2, 2), gradeMat), q2 = new T.Mesh(new T.PlaneGeometry(2, 2), lineMat); q1.frustumCulled = q2.frustumCulled = false; q1.renderOrder = 1; q2.renderOrder = 2; ovScene.add(q1, q2);
    // data-cage around the vending machine + translucent floor grid (shown only in Mint Mode)
    const mintGroup = new T.Group(); scene.add(mintGroup); mintGroup.visible = false;
    const cage = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(27.6, 36, 11)), new T.LineBasicMaterial({ color: '#40ffc0', transparent: true, opacity: .9, depthTest: false })); L2W(245, 87.5, 17.5, cage.position); mintGroup.add(cage);
    const gridTex = ctex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(80,255,200,.9)'; c.lineWidth = 2; c.strokeRect(0, 0, w, h); c.strokeStyle = 'rgba(80,255,200,.35)'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, h); c.moveTo(0, i * 32); c.lineTo(w, i * 32); c.stroke(); } }, { wrapS: T.RepeatWrapping, wrapT: T.RepeatWrapping });
    gridTex.repeat.set(320 / 16, 120 / 16);
    const gridM = new T.Mesh(new T.PlaneGeometry(320, 120), new T.MeshBasicMaterial({ map: gridTex, transparent: true, opacity: .32, depthWrite: false, blending: T.AdditiveBlending })); gridM.rotation.x = -Math.PI / 2; gridM.position.set(160, .12, 145); mintGroup.add(gridM);
    const mintTint = new T.Color(), mintCol = new T.Color();

    const baseHemi = hemi.intensity, baseKey = key.intensity; let mintK = 0;

    X = { renderer, scene, cam, hollis, juno, cats, getCat, styleCat, poseCat, lerpAng, dyn, fix, key, hemi, vendLight, greenLight, warm, PERCH, mintGroup, gradeMat, lineMat, ovScene, ovCam, cage, gridTex, mintTint, mintCol, baseHemi, baseKey, get mintK() { return mintK; }, set mintK(v) { mintK = v; }, L2W };
    status = 'ready';
    console.info('[MM3] Three.js r' + T.REVISION + ' break-room renderer ready');
  }

  // ------------------------------------------------------------------ per-frame visual sync + render (called from the engine's own frame())
  const CATS_MAX = 40;
  function renderThree() {
    const S = G.S, r = G.rooms[S.room], t = G.t; const { renderer, scene, cam, hollis, juno, dyn } = X;
    // size follows the displayed canvas (kept at a fixed RES multiple of the logical scene)
    // --- state-driven props
    dyn.flyer.visible = !fl('took_flyer'); dyn.battery.visible = !fl('clock_battery');
    dyn.bowl.visible = !fl('bowl1_taken'); dyn.label.visible = !fl('took_label');
    const mintReady = fl('mint_ready') && !fl('mint_taken'); dyn.d4.material = mintReady ? EM_ON : EM_OFF; dyn.tray.material = mintReady ? EM_ON : EM_OFF;
    const pulse = .6 + .4 * Math.sin(t * 3); if (mintReady) { EM_ON.emissiveIntensity = 1.1 + .6 * pulse; }
    X.greenLight.intensity = mintReady ? .55 + .35 * pulse : 0;
    const radioHere = !fl('radio_found'); dyn.blink.visible = radioHere; dyn.blinkLight.intensity = radioHere ? (Math.sin(t * 7) > 0 ? 1.1 : .15) : 0; dyn.blink.material.emissiveIntensity = radioHere ? (Math.sin(t * 7) > 0 ? 1.8 : .25) : 0;
    // --- fluorescent flicker (same trigger as the classic renderer; lights_calm freezes it)
    const calm = fl('lights_calm'), flick = calm ? 0 : (Math.sin(t * 22) > 0.7 ? 1 : 0);
    for (const tb of dyn.tubes) tb.material.emissiveIntensity = flick ? 1.8 : 1.15; X.fix.forEach(l => l.intensity = flick ? .95 : .8);
    // --- Hollis
    const showH = !r.noHollis && !G.hideHollis; hollis.root.visible = showH;
    if (showH) {
      X.L2W(S.jx, S.jy, 0, hollis.root.position);
      const want = S.face === -1 ? -Math.PI : 0; hollis.ang = X.lerpAng(hollis.ang, want, .25); hollis.g.rotation.y = hollis.ang;
      const walking = !!G.walking; hollis.ph = walking ? t * 11 : hollis.ph * .85;
      const sw = walking ? Math.sin(hollis.ph) * .7 : 0;
      hollis.legs[0].rotation.z = sw; hollis.legs[1].rotation.z = -sw; hollis.arms[0].rotation.z = -sw * .8; hollis.arms[1].rotation.z = sw * .8;
      hollis.g.position.y = walking ? Math.abs(Math.sin(hollis.ph)) * .9 : 0;
      const br = 1 + Math.sin(t * 1.9) * .012; hollis.torso.scale.y = walking ? 1 : br; hollis.head.position.y = 31 + (walking ? 0 : Math.sin(t * 1.9) * .18);
      hollis.head.rotation.z = walking ? 0 : Math.sin(t * .7) * .03;
    }
    // --- Juno
    const showJ = S.junoWith && !r.noJuno; juno.root.visible = showJ;
    let jpose = null;
    if (showJ) {
      jpose = G.junoPose || (G.junoMoving ? 'walk' : (G.junoIdle || 'stand'));
      X.L2W(S.ax, S.ay, 0, juno.root.position);
      const want = (G.junoFace || 1) === -1 ? -Math.PI : 0; juno.ang = X.lerpAng(juno.ang, want, .3); juno.g.rotation.y = juno.ang;
      const mv = jpose === 'walk' || !!G.junoMoving; const L = juno.legs; const ph = t * 14; const s = mv ? Math.sin(ph) * .8 : 0;
      L.fl.rotation.z = s; L.hr.rotation.z = s; L.fr.rotation.z = -s; L.hl.rotation.z = -s;
      juno.tail.position.set(-8.4, 9.4, 0); juno.tail.rotation.set(0, Math.sin(t * (mv ? 14 : 9)) * .5, .35);
      juno.body.rotation.z = 0; juno.body.position.set(-8, 0, 0); juno.haunch.visible = false; juno.head.position.set(5.6, 10, 0); juno.head.rotation.set(0, 0, 0); juno.jaw.visible = false;
      for (const k in L) { L[k].visible = true; L[k].position.y = 5; L[k].scale.y = 1; }
      juno.g.position.y = mv ? Math.abs(Math.sin(ph)) * .6 : 0;
      if (jpose === 'sit') { juno.body.rotation.z = .6; juno.body.position.set(-8, 0, 0); juno.haunch.visible = true; L.hl.visible = L.hr.visible = false;
        for (const k of ['fl', 'fr']) { L[k].position.set(-1.6, 10.4, L[k].position.z); L[k].scale.y = 2.08; L[k].rotation.z = 0; }
        juno.head.position.set(-2.4, 15.2, 0); juno.head.rotation.z = -.45 + Math.sin(t * 1.3) * .03; juno.tail.position.set(-9.6, 2.4, 0); juno.tail.rotation.set(0, Math.sin(t * 6) * .4, .05); }
      else if (jpose === 'lay') { juno.body.position.set(-8, -3.6, 0); juno.haunch.visible = false; juno.head.position.set(6.4, 4.4, 0); juno.head.rotation.z = -.15; for (const k in L) L[k].visible = false; juno.tail.position.set(-8.4, 3.2, 0); juno.tail.rotation.set(0, Math.sin(t * 3) * .3, -.15); }
      else if (jpose === 'sniff') { juno.head.position.set(8.2, 5.2, 0); juno.head.rotation.z = -.75 + Math.sin(t * 12) * .06; }
      else if (jpose === 'bark') { const j = Math.abs(Math.sin(t * 18)); juno.head.position.set(6, 11.4, 0); juno.head.rotation.z = .35; juno.jaw.visible = j > .3; juno.g.position.y = j * .5; }
      else if (jpose === 'tilt') { juno.head.rotation.x = .5; juno.head.rotation.z = -.15; }
      else if (!mv) { juno.head.rotation.z = Math.sin(t * 1.3) * .04; }
      juno.band.visible = !!fl('armband_on');
    }
    // --- cats (positions/poses come from catList(); head turns toward Hollis, tail flicks)
    const list = G.rooms[S.room].spots && !G.rooms[S.room].nocats ? catList() : [];
    for (let i = 0; i < CATS_MAX; i++) { const c = X.cats[i]; if (c && i >= list.length) c.root.visible = false; }
    for (let i = 0; i < Math.min(list.length, CATS_MAX); i++) {
      const cd = list[i], c = X.getCat(i); c.root.visible = true; if (c.shadowOn !== (i < 12)) { c.shadowOn = i < 12; c.root.traverse(o => { if (o.isMesh) o.castShadow = c.shadowOn && !o.userData.noShadow; }); }
      if (c.seedKey !== cd.seed) X.styleCat(c, cd.seed);
      const pose = cd.pose || ['sit', 'loaf', 'sleep', 'stand', 'sit', 'loaf'][Math.floor(rnd(cd.seed + 2) * 6)];
      if (c.pose !== pose) X.poseCat(c, pose);
      let y = cd.y, h = 0, zz = cd.y;
      if (cd.y < 84) { zz = 86; h = (cd.y - 84 + 86 - cd.y); for (const p of X.PERCH) if (cd.x >= p.x0 - 4 && cd.x <= p.x1 + 4) h = p.top; if (!X.PERCH.some(p => cd.x >= p.x0 - 4 && cd.x <= p.x1 + 4)) h = 86 - cd.y; }
      X.L2W(cd.x, zz, h, c.root.position);
      const wantA = c.face === 1 ? 0 : -Math.PI; c.ang = X.lerpAng(c.ang, wantA, .2);
      const dx = S.jx - cd.x; const look = Math.max(-.7, Math.min(.7, Math.atan2(S.jy - cd.y, dx) * 0)) ; // (kept simple: tilt toward Hollis in x)
      c.g.rotation.y = c.ang;
      // judge Hollis: head yaw toward him when he is on the far side of the facing direction
      const toward = (dx * c.face) < 0 ? 1 : 0; const yaw = pose === 'sleep' ? 0 : (toward ? Math.PI * .85 : 0) * 0 + (Math.sin(t * .4 + cd.seed) > .55 ? (toward ? .9 : -.6) : 0);
      c.head.rotation.y = c.head.rotation.y + (yaw - c.head.rotation.y) * .08;
      const flick = Math.sin(t * 1.6 + cd.seed * 2.1) > .8 ? 1 : 0.1; c.segs.forEach((s, k) => { s.rotation.y = Math.sin(t * (2.2 + flick * 6) + k * .8 + cd.seed) * (.18 + flick * .35) * (k + 1) * .6; });
      const lid = pose === 'sleep' ? 1 : (.35 + .3 * (Math.sin(t * .23 + cd.seed) > .93 ? 1 : 0)); c.P.lidL.scale.y = c.P.lidR.scale.y = lid * 1.0 + .01; c.P.eyeL.visible = c.P.eyeR.visible = c.P.pupL.visible = c.P.pupR.visible = pose !== 'sleep';
    }
    // --- mint mode (visual only)
    const S_mint = !!S.mintOn, lvl = S.mint;
    const dtv = Math.min(.1, Math.max(0, t - (X.lastT === undefined ? t : X.lastT))); X.lastT = t;
    X.mintK += ((S_mint ? 1 : 0) - X.mintK) * (1 - Math.exp(-dtv * 9)); const mk = X.mintK;   // frame-rate independent ramp
    X.mintGroup.visible = mk > .02;
    if (X.mintGroup.visible) { X.cage.material.opacity = .45 + .45 * Math.sin(t * 5); X.gridTex.offset.y = (t * .6) % 1; X.cage.visible = true; }
    X.mintCol.set(lvl >= 3 ? new T.Color().setHSL((t * .33) % 1, .9, .55) : new T.Color('#00ffc8'));
    X.mintTint.copy(X.mintCol).lerp(new T.Color('#ffffff'), .55); X.gradeMat.uniforms.tint.value.copy(X.mintTint); X.gradeMat.uniforms.k.value = mk * (lvl >= 3 ? 1 : .9);
    X.lineMat.uniforms.t.value = t; X.lineMat.uniforms.k.value = mk; X.lineMat.uniforms.col.value.copy(X.mintCol);
    X.hemi.intensity = X.baseHemi * (1 - .3 * mk); X.key.intensity = X.baseKey * (1 - .25 * mk);
    // --- shake (engine's G.shake) as a camera jitter in logical pixels
    const sh = G.shake > 0 ? G.shake : 0; cam.position.x = 160 + (sh ? (Math.random() - .5) * sh : 0); cam.position.y = 700 * Math.SQRT1_2 + (sh ? (Math.random() - .5) * sh * .7 : 0);
    renderer.info.reset(); renderer.clear(); renderer.render(scene, cam); renderer.render(X.ovScene, X.ovCam);
    return jpose;
  }
  let EM_ON = null, EM_OFF = null; const perf = { n: 0, ms: 0, max: 0 };

  // ------------------------------------------------------------------ the hook into the engine's drawScene
  const _drawScene = drawScene;
  let hotspotLabelAlpha = 1;
  drawScene = function () {
    if (!active()) { if (threeCv.style.display !== 'none') threeCv.style.display = 'none'; return _drawScene(); }
    const S = G.S, r = room();
    if (!EM_ON) { EM_ON = new T.MeshStandardMaterial({ color: '#70e060', emissive: '#70e060', emissiveIntensity: 1.3, roughness: .4 }); EM_OFF = new T.MeshStandardMaterial({ color: '#2a2a2a', roughness: .6 }); }
    let jpose = null;
    const _t0 = performance.now();
    try { jpose = renderThree(); perf.n++; perf.ms += performance.now() - _t0; perf.max = Math.max(perf.max, performance.now() - _t0); }
    catch (e) { console.error('[MM3] render failed, falling back to classic break room', e); status = 'failed'; threeCv.style.display = 'none'; return _drawScene(); }
    if (threeCv.style.display !== 'block') threeCv.style.display = 'block';
    // Canvas2D: transparent scene window, then only the things that must stay Canvas2D (text tags, HUD badge, exit arrows, debug)
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, SW, SCENE_H); ctx.clip();
    ctx.clearRect(0, 0, SW, SCENE_H);
    if (G.shake > 0) ctx.translate(0, 0);
    if (r.fg) r.fg(G.t);
    drawExitMarkers(r);
    for (const c of catList()) if ((c.pose || ['sit', 'loaf', 'sleep', 'stand', 'sit', 'loaf'][Math.floor(rnd(c.seed + 2) * 6)]) === 'sleep') txt('z', c.x + 4 * (rnd(c.seed + 3) > .5 ? 1 : -1), c.y - 6 - (Math.floor(G.t * 2) % 2), C.w, 4);
    if (jpose === 'bark') txt('WOOF!', S.ax + (G.junoFace || 1) * 14, S.ay - 20, C.y, 6, 'center');
    if (S.mintOn) {
      const lvl = S.mint;
      for (const p of propsNow()) if (p.mintTag) { const tg = typeof p.mintTag === 'function' ? p.mintTag(S) : p.mintTag; if (tg) Art.tag(p.r[0] + p.r[2] / 2, Math.max(16, p.r[1] - 2 + Math.sin(G.t * 3 + p.r[0]) * 1.5), tg, lvl >= 3 ? C.M : C.G); }
      R(250, 2, 68, 10, 'rgba(0,20,15,.85)'); txt('MINT MODE' + (lvl >= 3 ? ' MAX' : ''), 316, 10, C.G, 6, 'right');
    }
    if (window.BREAKROOM_HOTSPOTS) drawHotspotDebug(r);
    ctx.restore();
  };

  // ------------------------------------------------------------------ DEBUG HOTSPOT OVERLAY: the real, authoritative hit rectangles from pickAt()'s data
  function drawHotspotDebug(r) {
    const S = G.S; ctx.save(); ctx.lineWidth = 1;
    const box = (rc, col, label, fill) => { ctx.strokeStyle = col; ctx.strokeRect(Math.round(rc[0]) + .5, Math.round(rc[1]) + .5, rc[2] - 1, rc[3] - 1); if (fill) { ctx.fillStyle = fill; ctx.fillRect(rc[0], rc[1], rc[2], rc[3]); } if (label) txt(label, rc[0] + 1, rc[1] + 5, col, 4); };
    for (const p of propsNow()) if (p.r && p.r[0] > -5) box(p.r, '#40d8ff', p.id, 'rgba(64,216,255,.07)');
    for (const e of exitsNow()) box(e.r, '#ffe040', 'EXIT:' + e.id, 'rgba(255,224,64,.10)');
    if (S.junoWith && !r.noJuno) box([S.ax - 10, S.ay - 14, 20, 16], '#ff60ff', 'JUNO', 'rgba(255,96,255,.10)');
    for (const c of catList()) box([c.x - 5, c.y - 6, 10, 8], '#ff9030', 'CAT', 'rgba(255,144,48,.12)');
    box([S.jx - 3, S.jy - 38, 6, 38], '#80ff80', 'HOLLIS', null);
    txt('HOTSPOT DEBUG  (F9)   RENDERER: THREE r' + (T ? T.REVISION : '?') + '  (F8 = classic)', 4, 141, '#ffffff', 4.5);
    ctx.restore();
  }

  // ------------------------------------------------------------------ debug keys, wrapped into the engine's single keydown handler (no extra listeners)
  const _onKey = onKey;
  onKey = function (e) {
    if (e.key === 'F8') { e.preventDefault(); window.BREAKROOM_RENDERER = window.BREAKROOM_RENDERER === 'three' ? 'classic' : 'three'; if (G.started && G.toast !== undefined) toast('BREAK ROOM: ' + window.BREAKROOM_RENDERER.toUpperCase()); return; }
    if (e.key === 'F9') { e.preventDefault(); window.BREAKROOM_HOTSPOTS = !window.BREAKROOM_HOTSPOTS; if (G.started) toast('HOTSPOT DEBUG ' + (window.BREAKROOM_HOTSPOTS ? 'ON' : 'OFF')); return; }
    return _onKey(e);
  };

  // ------------------------------------------------------------------ load Three.js (pinned) — failure leaves the classic break room fully working
  window.MM3 = {
    get status() { return status; }, version: THREE_VERSION, url: THREE_URL, L2W: (x, y, h) => (T ? L2W(x, y, h) : null), W2L,
    setRenderer(m) { window.BREAKROOM_RENDERER = m === 'classic' ? 'classic' : 'three'; }, setHotspots(b) { window.BREAKROOM_HOTSPOTS = !!b; },
    perf, get _x() { return X; }, get active() { return active(); },
    debugState() { if (!X) return null; const P = (o) => [+o.position.x.toFixed(2), +o.position.y.toFixed(2), +o.position.z.toFixed(2), o.visible]; return { hollis: P(X.hollis.root), juno: P(X.juno.root), cats: X.cats.filter(c => c && c.root.visible).map(c => [+c.root.position.x.toFixed(1), +c.root.position.y.toFixed(1), +c.root.position.z.toFixed(1)]), flyer: X.dyn.flyer.visible, battery: X.dyn.battery.visible, bowl: X.dyn.bowl.visible, label: X.dyn.label.visible, blink: X.dyn.blink.visible, d4: X.dyn.d4.material === EM_ON, mintK: +X.mintK.toFixed(2), canvasShown: threeCv.style.display }; }, info() { return X ? { calls: X.renderer.info.render.calls, triangles: X.renderer.info.render.triangles, geometries: X.renderer.info.memory.geometries, textures: X.renderer.info.memory.textures } : null; }
  };
  import(THREE_URL).then(init).catch((e) => { status = 'failed'; console.warn('[MM3] Three.js failed to load; using classic break room.', e && e.message); });
})();
