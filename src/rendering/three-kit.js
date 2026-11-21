'use strict';
// THREE ENVIRONMENT KIT: reusable low-poly industrial/office factories shared by every hand-modelled room.
// All geometry is authored in LOGICAL units through K.box (x across, z = floor row, h = height): world = (x, h, z), screen = (x, z - h).
// Factories build into a group and return nothing unless noted. Static boxes are merged per material by K.mergeStatic after the room/prop build.
window.MM3 = window.MM3 || { rooms: {} };
MM3.envKit = function (K) {
  if (K._env) return K._env;
  const { T, mat, emi, box, ctex, seeded, L2W } = K; const E = K._env = {};
  const M = mat;
  // ---- palette (industrial, subdued; same family as the break room)
  const C = E.C = { conc: '#8c8e92', concD: '#6c6e74', steel: '#6d727a', steelL: '#9aa0a8', blue: '#2f5fb0', orange: '#d98324', yellow: '#e2bd24', red: '#b83a32', carton: '#b98a54', cartonL: '#cba06a', cartonD: '#9a7040', wrap: '#cfe1ee', dark: '#23252b', black: '#101114', white: '#e8e8e2', wall: '#a9acb2', wallW: '#c8c4b0', office: '#b4b8a8', green: '#2fa04a', cream: '#d8d2b4', wood: '#8a6038', plastic: '#7a8a9a' };
  const rand = (n) => { let s = n | 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  // ---- textures --------------------------------------------------------------------------------------------------------
  E.floorTex = (w, h, o) => ctex(Math.round(w * 3), Math.round(h * 3), (g, W, H) => {
    const r = seeded(o.seed || 5), sx = W / w, sy = H / h; g.fillStyle = o.base || '#8c8e92'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < (o.noise === undefined ? 520 : o.noise); i++) { g.fillStyle = r() > .5 ? 'rgba(30,30,36,' + (.03 + r() * .06) + ')' : 'rgba(230,230,236,' + (.03 + r() * .05) + ')'; g.fillRect(r() * W, r() * H, (2 + r() * 16) * sx / 3, 1 + r() * 3); }
    if (o.tile) { const t = o.tile; for (let j = 0; j < h / t; j++) for (let i = 0; i < w / t; i++) { g.fillStyle = (i + j) & 1 ? (o.c2 || '#808286') : (o.c1 || '#94969a'); g.fillRect(i * t * sx, j * t * sy, t * sx, t * sy); } g.strokeStyle = 'rgba(30,30,34,.45)'; g.lineWidth = 1.5; for (let i = 0; i <= w / t; i++) { g.beginPath(); g.moveTo(i * t * sx, 0); g.lineTo(i * t * sx, H); g.stroke(); } for (let j = 0; j <= h / t; j++) { g.beginPath(); g.moveTo(0, j * t * sy); g.lineTo(W, j * t * sy); g.stroke(); } }
    if (o.joints) { g.strokeStyle = 'rgba(25,25,30,.4)'; g.lineWidth = 1.5; for (let x = 0; x < w; x += o.joints) { g.beginPath(); g.moveTo(x * sx, 0); g.lineTo(x * sx, H); g.stroke(); } for (let z = 0; z < h; z += o.joints * .8) { g.beginPath(); g.moveTo(0, z * sy); g.lineTo(W, z * sy); g.stroke(); } }
    for (const s of o.stripes || []) { g.fillStyle = s.color || '#e2bd24'; if (s.dash) { for (let x = 0; x < w; x += s.dash * 2) g.fillRect(x * sx, (s.z - s.w / 2) * sy, s.dash * sx, s.w * sy); } else g.fillRect(0, (s.z - s.w / 2) * sy, W, s.w * sy); }
    for (const b of o.blots || []) { const gr = g.createRadialGradient(b[0] * sx, b[1] * sy, 0, b[0] * sx, b[1] * sy, b[2] * sx); gr.addColorStop(0, 'rgba(' + (b[4] || '30,26,18') + ',' + (b[3] || .25) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect((b[0] - b[2]) * sx, (b[1] - b[2]) * sy, b[2] * 2 * sx, b[2] * 2 * sy); }
  });
  E.wallTex = (w, h, o) => ctex(Math.round(w * 2), Math.round(h * 2), (g, W, H) => {
    const r = seeded(o.seed || 3), sx = W / w, sy = H / h; g.fillStyle = o.base || '#a9acb2'; g.fillRect(0, 0, W, H);
    if (o.block) { g.strokeStyle = 'rgba(20,22,28,.22)'; g.lineWidth = 1; for (let y = 0; y < h; y += o.block) { g.beginPath(); g.moveTo(0, y * sy); g.lineTo(W, y * sy); g.stroke(); for (let x = ((y / o.block) & 1) * o.block; x < w; x += o.block * 2) { g.beginPath(); g.moveTo(x * sx, y * sy); g.lineTo(x * sx, (y + o.block) * sy); g.stroke(); } } }
    if (o.panels) { g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; for (let x = 0; x < w; x += o.panels) { g.beginPath(); g.moveTo(x * sx, 0); g.lineTo(x * sx, H); g.stroke(); } }
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,' + (o.topDark || 0) + ')'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,50,30,' + (o.botDirt || .2) + ')'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < (o.noise === undefined ? 160 : o.noise); i++) { g.fillStyle = 'rgba(40,36,28,' + (.03 + r() * .06) + ')'; g.fillRect(r() * W, H * .35 + r() * H * .65, 2 + r() * 16, 1 + r() * 2); }
    if (o.wain) { g.fillStyle = o.wain.color; g.fillRect(0, (h - o.wain.h) * sy, W, o.wain.h * sy); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, (h - o.wain.h) * sy, W, 1.5); }
  });
  // ---- shell pieces ----------------------------------------------------------------------------------------------------
  E.floor = (g, o) => {   // o: x0,x1,z0,z1 + floorTex options
    const w = o.x1 - o.x0, d = o.z1 - o.z0; const tex = E.floorTex(w, d, o); const m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshStandardMaterial({ map: tex, roughness: o.rough || .85, metalness: 0 }));
    m.rotation.x = -Math.PI / 2; m.position.set((o.x0 + o.x1) / 2, 0, (o.z0 + o.z1) / 2); m.receiveShadow = true; g.add(m); return m;
  };
  E.wall = (g, o) => {    // vertical wall plane at z=o.z from x0..x1, height H
    const w = o.x1 - o.x0, tex = E.wallTex(w, o.H, o); const m = new T.Mesh(new T.PlaneGeometry(w, o.H), new T.MeshStandardMaterial({ map: tex, roughness: .95 }));
    m.position.set((o.x0 + o.x1) / 2, o.H / 2, o.z); m.receiveShadow = true; g.add(m);
    box(g, o.x0, o.x1, o.z, o.z + 1.4, 0, 3, M(o.base2 || C.dark)); return m;   // baseboard
  };
  E.fixture = (g, ctx, x, z, h, len) => {   // hanging fluorescent fixture, emissive front face readable at the top of the view
    len = len || 36; box(g, x, x + len, z - 4, z + 3, h, h + 5, M('#8c8c90', { metalness: .3, roughness: .5 }), { recv: false });
    K.keep(true); const tube = box(g, x + 2, x + len - 2, z + 3, z + 3.8, h + .4, h + 4.6, emi('#f2ffe6', 1.4), { cast: false, recv: false }); K.keep(false); if (ctx) ctx.flicker.push(tube); return tube;
  };
  E.truss = (g, x0, x1, z, h) => { box(g, x0, x1, z, z + 3, h, h + 3, M(C.steel)); for (let x = x0 + 10; x < x1; x += 30) box(g, x, x + 3, z, z + 3, h - 14, h, M(C.steel)); };
  // ---- signs / text ----------------------------------------------------------------------------------------------------
  E.sign = (g, o) => {   // o: x, z (mount row), h (centre height), w, hh, text(lines), bg, fg, rot, thick, size
    const lines = Array.isArray(o.text) ? o.text : [o.text]; const px = 8, W = Math.round(o.w * px), H = Math.round(o.hh * px);
    const tex = ctex(W, H, (c) => { c.fillStyle = o.bg || '#e8e6d4'; c.fillRect(0, 0, W, H); if (o.border !== false) { c.strokeStyle = o.fg || '#1a1a1a'; c.lineWidth = 3; c.strokeRect(2, 2, W - 4, H - 4); } c.fillStyle = o.fg || '#1a1a1a'; c.textAlign = 'center'; const fs = o.size || Math.min(H / (lines.length + .4), W / (Math.max(...lines.map(l => l.length)) * .62)); c.font = 'bold ' + fs + 'px "Courier New",monospace'; lines.forEach((l, i) => c.fillText(l, W / 2, (i + .85) * (H / lines.length) - (lines.length > 1 ? 0 : -fs * .08))); });
    const m = new T.Mesh(new T.PlaneGeometry(o.w, o.hh), new T.MeshStandardMaterial({ map: tex, roughness: .8, emissive: o.glow ? '#ffffff' : '#000000', emissiveMap: o.glow ? tex : null, emissiveIntensity: o.glow || 0 }));
    m.position.set(o.x, o.h, o.z + (o.off || .3)); m.rotation.z = o.rot || 0; m.castShadow = false; m.receiveShadow = true; g.add(m); return m;
  };
  // ---- freight ---------------------------------------------------------------------------------------------------------
  E.pallet = (g, x0, x1, z0, z1, h0) => {   // wooden pallet deck + 3 runners, returns top height
    const m = M('#a9865a', { roughness: .95 }); h0 = h0 || 0; box(g, x0, x1, z0, z1, h0 + 3.6, h0 + 5, m);
    for (const f of [0, .5, 1]) { const x = x0 + (x1 - x0 - 3) * f; box(g, x, x + 3, z0, z1, h0, h0 + 3.6, m); } return h0 + 5;
  };
  E.cartons = (g, x0, x1, z0, z1, h0, rows, seed, o) => {   // stack of cartons filling a footprint, returns top
    const r = rand(seed || 1); o = o || {}; const cols = [C.carton, C.cartonL, C.cartonD]; let top = h0;
    const nx = Math.max(1, Math.round((x1 - x0) / (o.cw || 9))), nz = Math.max(1, Math.round((z1 - z0) / (o.cd || 8)));
    for (let k = 0; k < rows; k++) { const ch = (o.ch || 6) + (r() * 1.2); for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const w = (x1 - x0) / nx, d = (z1 - z0) / nz; if (k === rows - 1 && r() > .75) continue; const m = box(g, x0 + i * w + .25, x0 + (i + 1) * w - .25, z0 + j * d + .25, z0 + (j + 1) * d - .25, top, top + ch, M(cols[(r() * 3) | 0])); } top += ch; }
    return top;
  };
  E.wrapped = (g, x0, x1, z0, z1, h0, load, seed) => {   // pallet + cartons + translucent shrink wrap
    const t = E.pallet(g, x0, x1, z0, z1, h0), top = E.cartons(g, x0 + 1, x1 - 1, z0 + 1, z1 - 1, t, load || 3, seed, { cw: 8, cd: 7 });
    box(g, x0, x1, z0, z1, t, top + .6, M(C.wrap, { transparent: true, opacity: .22, roughness: .2 }), { cast: false }); return top;
  };
  E.loadedPallet = (g, x0, x1, z0, z1, h0, color, tall, seed) => {   // single-colour block load (used for labelled staging pallets)
    const t = E.pallet(g, x0, x1, z0, z1, h0); const top = t + (tall || 14); box(g, x0 + .8, x1 - .8, z0 + .8, z1 - .8, t, top, M(color || C.carton)); box(g, x0 + .8, x1 - .8, z0 + .8, z1 - .8, top, top + .5, M(C.wrap, { transparent: true, opacity: .25 }), { cast: false }); return top;
  };
  // ---- storage racks ---------------------------------------------------------------------------------------------------
  E.rack = (g, o) => {   // o: x0,x1 (outer), z0 (back), z1 (front), H, levels, bays, seed, load(0..1)
    const r = rand(o.seed || 7), bays = o.bays || Math.max(1, Math.round((o.x1 - o.x0) / 30)), bw = (o.x1 - o.x0) / bays, lv = o.levels || 3, up = M(C.blue), bm = M(C.orange);
    for (let b = 0; b <= bays; b++) { const x = o.x0 + b * bw; box(g, x - 1, x + 1, o.z0, o.z0 + 2, 0, o.H, up); box(g, x - 1, x + 1, o.z1 - 2, o.z1, 0, o.H, up); }
    for (let k = 0; k < lv; k++) { const h = 3 + k * ((o.H - 4) / lv) * 1; for (let b = 0; b < bays; b++) { const x0 = o.x0 + b * bw + 1, x1 = o.x0 + (b + 1) * bw - 1; box(g, x0, x1, o.z1 - 1.6, o.z1, h, h + 2.2, bm); box(g, x0, x1, o.z0, o.z0 + 1.6, h, h + 2.2, bm);
      if (r() < (o.load === undefined ? .8 : o.load)) { const lw = (x1 - x0) * (.6 + r() * .3), lx = x0 + (x1 - x0 - lw) / 2 + (r() - .5) * 2; if (r() > .45) { const t = E.pallet(g, lx, lx + lw, o.z0 + 1.2, o.z1 - 1.2, h + 2.2); E.cartons(g, lx + .5, lx + lw - .5, o.z0 + 2, o.z1 - 2, t, 1 + ((r() * 2) | 0), (r() * 99) | 0, { ch: 7 }); } else E.cartons(g, lx, lx + lw, o.z0 + 1.5, o.z1 - 1.5, h + 2.2, 1 + ((r() * 2) | 0), (r() * 99) | 0, { cw: 10 }); } } }
    box(g, o.x0, o.x1, o.z0, o.z0 + .5, 0, o.H, M('#262a34'), { cast: false });   // dark back
  };
  // ---- vehicles / equipment --------------------------------------------------------------------------------------------
  E.forklift = (g, o) => {   // o: x (centre), z (floor row of front axle), dir 1/-1, type cushion|propane|reach, H mast
    const d = o.dir || 1, x = o.x, z = o.z, col = o.type === 'propane' ? '#d9791c' : o.type === 'reach' ? '#2d66b8' : '#e2bd24', bd = M(col, { roughness: .6 }), dk = M('#26282e'), st = M(C.steel);
    const X = (a, b) => d > 0 ? [x + a, x + b] : [x - b, x - a];
    let [a, b] = X(-14, 10); box(g, a, b, z - 6, z + 6, 5, 13, bd);               // chassis
    [a, b] = X(-14, -3); box(g, a, b, z - 6, z + 6, 13, 19, bd);                  // counterweight
    [a, b] = X(-3, 8); box(g, a, b, z - 5, z + 5, 13, 15, dk);                    // floor plate/seat base
    [a, b] = X(-8, -3); box(g, a, b, z - 3.5, z + 3.5, 15, 19, M('#33363e'));     // seat
    for (const dz of [-5.4, 5.4]) { [a, b] = X(-3, 8); box(g, a, b, z + dz - .5, z + dz + .5, 15, 30, dk); }   // overhead guard posts
    [a, b] = X(-10, 10); box(g, a, b, z - 6, z + 6, 30, 31.4, dk);                // overhead guard roof
    for (const dx of [-9, 6]) for (const dz of [-6.6, 6.6]) { [a, b] = X(dx - 3, dx + 3); box(g, a, b, z + dz - 1.2, z + dz + 1.2, 0, 6, dk); }   // wheels
    [a, b] = X(10, 12); box(g, a, b, z - 5, z + 5, 4, 26, st);                    // mast
    for (const dz of [-3, 3]) { [a, b] = X(10, 24); box(g, a, b, z + dz - 1, z + dz + 1, 2, 3.4, st); }   // forks
    [a, b] = X(-12, -9); K.keep(true); const bl = box(g, a, b, z - 1.2, z + 1.2, 31.6, 33, emi('#ff9a20', 1.4), { cast: false }); K.keep(false); if (o.ctx) o.ctx.anim.push((t) => { bl.visible = Math.sin(t * 6) > 0; });   // beacon
    return;
  };
  E.palletJack = (g, o) => { const d = o.dir || 1, x = o.x, z = o.z, m = M(C.red), dk = M(C.dark); const X = (a, b) => d > 0 ? [x + a, x + b] : [x - b, x - a]; let [a, b] = X(0, 18); for (const dz of [-3.4, 1.8]) box(g, a, b, z + dz, z + dz + 1.6, 1, 3, m); [a, b] = X(-2, 2); box(g, a, b, z - 3.4, z + 3.4, 2, 5, m); [a, b] = X(-2, 0); box(g, a, b, z - .5, z + .5, 5, 20, dk); [a, b] = X(-5, 0); box(g, a, b, z - 2.4, z + 2.4, 18, 20.4, dk); };
  E.bollard = (g, x, z, h) => { h = h || 14; box(g, x - 1.8, x + 1.8, z - 1.8, z + 1.8, 0, h, M(C.yellow)); box(g, x - 1.9, x + 1.9, z - 1.9, z + 1.9, h * .45, h * .6, M('#1a1a1a')); box(g, x - 2.6, x + 2.6, z - 2.6, z + 2.6, 0, .8, M('#60646a')); };
  // ---- docks / trailers ------------------------------------------------------------------------------------------------
  E.dockDoor = (g, ctx, o) => {   // o: x0,x1,z (wall row), H, open, light ('green'|'red'|null), trailer
    const w = o.x1 - o.x0, fr = M(C.yellow); box(g, o.x0 - 3, o.x0, o.z, o.z + 5, 0, o.H + 3, fr); box(g, o.x1, o.x1 + 3, o.z, o.z + 5, 0, o.H + 3, fr); box(g, o.x0 - 3, o.x1 + 3, o.z, o.z + 5, o.H, o.H + 3, fr);
    box(g, o.x0, o.x1, o.z + .3, o.z + .8, 0, o.H, M(C.black), { cast: false });                     // dark opening
    if (!o.open) box(g, o.x0, o.x1, o.z + 1, o.z + 2.2, 4, o.H, M('#8a8e96'));                     // door leaf down
    for (const x of [o.x0 + 1, o.x1 - 5]) box(g, x, x + 4, o.z + 5, o.z + 9, 8, 22, M('#15161a'));   // rubber bumpers
    box(g, o.x0 + 2, o.x1 - 2, o.z + 5, o.z + 14, 0, 2.2, M('#555a62', { metalness: .4 }));            // dock leveler plate
    const lc = o.light === 'red' ? '#ff3a2a' : '#3aff6a'; if (o.light) { K.keep(true); const l = box(g, o.x0 + w / 2 - 2, o.x0 + w / 2 + 2, o.z + 1, o.z + 3, o.H + 6, o.H + 10, emi(lc, 1.6), { cast: false }); K.keep(false); if (ctx) ctx.anim.push(() => { }); return l; }
  };
  E.trailer = (g, o) => {   // box trailer seen from the rear/side: o: x0,x1,z0,z1,H,y0 (floor h), color, label
    const y0 = o.y0 || 4, body = M(o.color || '#d8dcdf', { roughness: .6 }); box(g, o.x0, o.x1, o.z0, o.z1, y0, y0 + o.H, body); box(g, o.x0 - .5, o.x1 + .5, o.z0, o.z1, y0 + o.H, y0 + o.H + 1, M('#9aa0a6')); box(g, o.x0, o.x1, o.z0 + 1, o.z1, y0 - 3, y0, M('#2a2c32'));
    for (const dx of [.18, .82]) { const x = o.x0 + (o.x1 - o.x0) * dx; box(g, x - 4, x + 4, o.z1 - 8, o.z1 - 1, 0, 8, M('#17181b')); }
    for (let i = 1; i < 6; i++) box(g, o.x0, o.x1, o.z1 - .1, o.z1 + .3, y0 + i * o.H / 6, y0 + i * o.H / 6 + .5, M('#aeb3b8'), { cast: false });   // rear ribs
    if (o.label) E.sign(g, { x: (o.x0 + o.x1) / 2, z: o.z1, h: y0 + o.H * .55, w: Math.min(30, (o.x1 - o.x0) * .7), hh: 8, text: o.label, bg: '#f2f2ee', fg: '#222', off: .5 });
  };
  // ---- office ----------------------------------------------------------------------------------------------------------
  E.desk = (g, x0, x1, z0, z1, h) => { h = h || 11; const top = M(C.wood), leg = M('#4a3220'); box(g, x0, x1, z0, z1, h - 1.6, h, top); for (const x of [x0 + .8, x1 - 2.8]) for (const z of [z0 + .8, z1 - 2.8]) box(g, x, x + 2, z, z + 2, 0, h - 1.6, leg); box(g, x0 + 3, x1 - 3, z0 + .5, z0 + 1.5, 2, h - 1.6, M('#5a3e26')); return h; };
  E.chair = (g, x, z, dir, col) => { col = col || '#3a3e48'; box(g, x - 4, x + 4, z - 4, z + 4, 6, 8, M(col)); box(g, x - 4 - (dir || 0) * 0, x + 4, z - 4, z - 2.6, 8, 17, M(col)); box(g, x - .8, x + .8, z - .8, z + .8, 0, 6, M('#222')); box(g, x - 4, x + 4, z - 1, z + 1, 0, 1.2, M('#222')); };
  E.monitor = (g, ctx, x, z, h, o) => { o = o || {}; box(g, x - 4, x + 4, z - 2, z + 2, h, h + .8, M('#2a2c32')); box(g, x - 1, x + 1, z - .8, z + .8, h + .8, h + 3, M('#2a2c32')); const w = o.w || 12, hh = o.h || 8; box(g, x - w / 2, x + w / 2, z - 1.4, z + 1.4, h + 3, h + 3 + hh, M('#1a1c20')); const sc = o.screen === false ? null : E.sign(g, { x, z: z + 1.4, h: h + 3 + hh / 2, w: w - 1.4, hh: hh - 1.4, text: o.text || ['> _'], bg: o.bg || '#0f2a22', fg: o.fg || '#6af0a0', border: false, glow: o.glow === undefined ? .55 : o.glow, off: .2, size: 5 }); return sc; };
  E.cabinet = (g, x0, x1, z0, z1, H, drawers) => { box(g, x0, x1, z0, z1, 0, H, M('#8f969e')); const n = drawers || 3; for (let i = 0; i < n; i++) { const h0 = 1 + i * ((H - 2) / n); box(g, x0 + 1, x1 - 1, z1, z1 + .5, h0, h0 + (H - 2) / n - .8, M('#a4abb3')); box(g, (x0 + x1) / 2 - 2, (x0 + x1) / 2 + 2, z1 + .5, z1 + 1.1, h0 + (H - 2) / n / 2 - .5, h0 + (H - 2) / n / 2 + .4, M('#3a3e44')); } };
  E.printer = (g, ctx, x0, x1, z0, z1, h0, paper) => { box(g, x0, x1, z0, z1, h0, h0 + 7, M('#b8bcc0')); box(g, x0 + 1, x1 - 1, z0 + 1, z1 - 1, h0 + 7, h0 + 8.4, M('#8a8e94')); box(g, x0 + 2, x1 - 2, z1 - .4, z1 + .4, h0 + 2.5, h0 + 4, M('#2a2c32')); if (paper !== false) box(g, x0 + 3, x1 - 3, z0 + 1, z0 + 6, h0 + 8.4, h0 + 12, M('#f2f2ee')); K.keep(true); const led = box(g, x1 - 4, x1 - 2.6, z1, z1 + .6, h0 + 5, h0 + 5.8, emi('#3aff6a', 1.2), { cast: false }); K.keep(false); return led; };
  E.plant = (g, x, z, s) => { s = s || 1; box(g, x - 3 * s, x + 3 * s, z - 3 * s, z + 3 * s, 0, 5 * s, M('#7a5a40')); const lm = M('#2f8a3e', { roughness: .8 }), l2 = M('#3aa04c'); for (const [dx, dz, h, c] of [[0, 0, 15, lm], [-3, 1, 11, l2], [3, -1, 12, lm], [1, 3, 9, l2], [-1, -3, 10, lm]]) box(g, x + dx * s - 2.4 * s, x + dx * s + 2.4 * s, z + dz * s - 2.4 * s, z + dz * s + 2.4 * s, 5 * s, (5 + h) * s, c); };
  E.shelf = (g, x0, x1, z0, z1, H, levels, seed) => { const r = rand(seed || 3); box(g, x0, x0 + 1.2, z0, z1, 0, H, M('#5a5e66')); box(g, x1 - 1.2, x1, z0, z1, 0, H, M('#5a5e66')); for (let k = 0; k <= levels; k++) { const h = 1 + k * ((H - 2) / levels); box(g, x0, x1, z0, z1, h, h + 1, M('#6e737b')); if (k < levels) for (let i = 0; i < 3; i++) if (r() > .25) box(g, x0 + 2 + i * ((x1 - x0 - 4) / 3), x0 + 2 + (i + .8) * ((x1 - x0 - 4) / 3), z0 + 1, z1 - 1, h + 1, h + 1 + 3 + r() * 4, M([C.carton, '#d8d8d0', '#5a7aa8'][(r() * 3) | 0])); } };
  E.window = (g, x0, x1, z, h0, h1, sky) => { box(g, x0 - 1.2, x1 + 1.2, z, z + 1.8, h0 - 1.2, h1 + 1.2, M('#d0d2d6')); box(g, x0, x1, z + 1.2, z + 1.8, h0, h1, M(sky || '#8ab4d4', { roughness: .15, emissive: sky || '#6a94b4', emissiveIntensity: .35 }), { cast: false }); box(g, (x0 + x1) / 2 - .5, (x0 + x1) / 2 + .5, z + 1.8, z + 2.3, h0, h1, M('#d0d2d6')); };
  E.clock = (g, x, z, h) => { const d = new T.Mesh(new T.CylinderGeometry(4, 4, 1, 24), [M('#222'), M('#f4f4f0'), M('#222')]); d.rotation.x = Math.PI / 2; L2W(x, z + .5, h, d.position); g.add(d); };
  // ---- employee areas --------------------------------------------------------------------------------------------------
  E.lockerBank = (g, o) => {   // o: x0, n, w, z (wall), H, d, colors[]
    const cols = o.colors || ['#8a9098']; for (let i = 0; i < o.n; i++) { const x0 = o.x0 + i * o.w, col = cols[i % cols.length]; box(g, x0 + .2, x0 + o.w - .2, o.z, o.z + (o.d || 7), 0, o.H, M(col)); box(g, x0 + 1.5, x0 + o.w - 1.5, o.z + (o.d || 7), o.z + (o.d || 7) + .4, o.H - 9, o.H - 3, M('#161a1e')); for (let k = 0; k < 3; k++) box(g, x0 + 2.5, x0 + o.w - 2.5, o.z + (o.d || 7), o.z + (o.d || 7) + .3, o.H - 12 - k * 1.1, o.H - 11.4 - k * 1.1, M('#2a2e34'), { cast: false }); box(g, x0 + o.w - 3.2, x0 + o.w - 1.6, o.z + (o.d || 7), o.z + (o.d || 7) + 1, o.H * .45, o.H * .45 + 4, M('#c8a820', { metalness: .6 })); }
    box(g, o.x0, o.x0 + o.n * o.w, o.z, o.z + (o.d || 7), o.H, o.H + 1, M('#6c727a'));
  };
  E.bench = (g, x0, x1, z0, z1, h) => { h = h || 8; box(g, x0, x1, z0, z1, h - 1.4, h, M('#a8794a')); for (const x of [x0 + 2, x1 - 4]) box(g, x, x + 2, z0 + .6, z1 - .6, 0, h - 1.4, M('#3c4048')); };
  E.door = (g, o) => { // o: x0,x1,z,H,color,glass,sign
    box(g, o.x0 - 1.4, o.x1 + 1.4, o.z, o.z + 3, 0, o.H + 1.4, M('#3c3a36')); box(g, o.x0, o.x1, o.z + 2.6, o.z + 3.6, 0, o.H, M(o.color || '#6a4a2a'));
    if (o.glass) box(g, o.x0 + 3, o.x1 - 3, o.z + 3.6, o.z + 3.9, o.H * .55, o.H * .9, M('#9ac8d8', { roughness: .15, emissive: '#6aa0b0', emissiveIntensity: .3 }), { cast: false });
    box(g, o.x1 - 4, o.x1 - 2, o.z + 3.6, o.z + 5.2, o.H * .42, o.H * .42 + 2.5, M('#c8a820', { metalness: .6 })); };
  E.table = (g, x0, x1, z0, z1, h, col) => { box(g, x0, x1, z0, z1, h - 2, h, M(col || '#cfc8b8')); for (const x of [x0 + 2, x1 - 4]) for (const z of [z0 + 1.5, z1 - 3.5]) box(g, x, x + 2, z, z + 2, 0, h - 2, M('#4a4c52')); };
  E.crate = (g, x0, x1, z0, z1, h0, h1, col) => { box(g, x0, x1, z0, z1, h0, h1, M(col || C.cartonD)); box(g, x0 - .2, x1 + .2, z0 - .2, z0 + .6, h0, h1, M('#5a4028')); };
  E.pipe = (g, x0, x1, z, h, r, col) => { r = r || 1.4; box(g, x0, x1, z - r, z + r, h - r, h + r, M(col || '#6a7078', { metalness: .4, roughness: .5 })); };
  E.cableTray = (g, x0, x1, z, h) => { box(g, x0, x1, z, z + 6, h, h + 1, M('#5a5e66')); box(g, x0, x1, z, z + .8, h, h + 4, M('#5a5e66')); box(g, x0, x1, z + 5.2, z + 6, h, h + 4, M('#5a5e66')); for (let x = x0 + 4; x < x1; x += 9) box(g, x, x + 2, z + 1, z + 5, h + 1, h + 2.4, M(['#c83a32', '#2a2a2a', '#2f5fb0'][(x / 9 | 0) % 3])); };
  E.light = null;
  return E;
};
