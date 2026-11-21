'use strict';
// THREE ROOM (generic, state-aware): builds a Three scene for ANY room straight from its classic room definition.
//  * bg()     -> painted wall plane + floor plane (exact screen mapping, real lights/shadows land on them)
//  * props    -> each visible prop's classic art becomes an EXTRUDED STANDEE (textured front + solid coloured sides) standing on its base row
//  * persons  -> Art.person()/Art.npc() calls made by prop art are intercepted and replaced by 3D people (K.buildPerson); Art.cat() likewise
//  * floor decals (z:0 props) lie flat on the floor
// Everything is rebuilt only when the (volatile-field-stripped) game state changes, and disposed when the room is left.
// Hand-modelled rooms (rooms/break-room.js, ...) override this by registering MM3.rooms[<id>].
window.MM3 = window.MM3 || { rooms: {} };
MM3.ROOM_CFG = {
  lockers: { wallY: 83, theme: 'office' }, floor: { wallY: 80, theme: 'warehouse' }, shipoffice: { wallY: 83, theme: 'office' }, ops: { wallY: 83, theme: 'office' }, hr: { wallY: 83, theme: 'office' },
  parts: { wallY: 80, theme: 'warehouse' }, charging: { wallY: 80, theme: 'warehouse' }, racks: { wallY: 80, theme: 'warehouse' }, tunnel: { wallY: 104, theme: 'dark' }, staging: { wallY: 80, theme: 'warehouse' },
  inbound: { wallY: 80, theme: 'warehouse' }, outbound: { wallY: 80, theme: 'warehouse' }, yard: { wallY: 60, theme: 'outdoor' }, smoke: { wallY: 60, theme: 'outdoor' }, drain: { wallY: 60, theme: 'outdoor' },
  mgmt: { wallY: 83, theme: 'corporate' }, suite: { wallY: 83, theme: 'corporate' }, remote: { wallY: 60, theme: 'outdoor' }, gordoncall: { wallY: 90, theme: 'dark' }
};
MM3.THEMES = {
  warehouse: { hemi: ['#d8e2ff', '#9a9680', .78], key: { color: '#f0f5ff', intensity: .88, pos: [40, 230, 215], target: [170, 0, 100] }, clear: 0x101216, points: [40, 160, 280].map(x => ({ pos: [x, 90, 104], color: '#e4f6f0', intensity: .28, distance: 150, decay: 1.4 })) },
  office: { hemi: ['#eaf0ff', '#a4a49a', .84], key: { color: '#f6f9ff', intensity: .8, pos: [40, 230, 215], target: [170, 0, 100] }, clear: 0x121418, points: [60, 200].map(x => ({ pos: [x, 80, 104], color: '#e8f4ff', intensity: .24, distance: 140, decay: 1.4 })) },
  outdoor: { hemi: ['#cfe3ff', '#9a9078', .9], key: { color: '#fff2d2', intensity: 1.05, pos: [-110, 240, 170], target: [170, 0, 100] }, clear: 0x8ab0d0, points: [] },
  dark: { hemi: ['#8a9ac0', '#50505a', .42], key: { color: '#c8d8ff', intensity: .45, pos: [40, 230, 215], target: [170, 0, 100] }, clear: 0x06060a, points: [{ pos: [160, 70, 110], color: '#ffe8b0', intensity: .45, distance: 170, decay: 1.2 }] },
  corporate: { hemi: ['#e4ecff', '#8a8aa0', .88], key: { color: '#f2f6ff', intensity: .82, pos: [60, 230, 215], target: [170, 0, 100] }, clear: 0x0c0c14, points: [{ pos: [160, 70, 110], color: '#dff0ff', intensity: .3, distance: 220, decay: 1.2 }] }
};
(function () {
  const SC = 3;                                            // capture scale (same as the classic canvas)
  const NULLCTX = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 0 }) : () => { }), set: () => true });
  let scratch = null, sg = null;
  function capture(fn, rec) {                              // run classic drawing code into an offscreen canvas; record people/cats instead of drawing them
    if (!scratch) { scratch = document.createElement('canvas'); scratch.width = SW * SC; scratch.height = SCENE_H * SC; sg = scratch.getContext('2d', { willReadFrequently: true }); }
    const real = rec && rec.noPixels ? NULLCTX : sg;
    if (real === sg) { sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, scratch.width, scratch.height); sg.setTransform(SC, 0, 0, SC, 0, 0); sg.imageSmoothingEnabled = false; }
    const savedCtx = ctx, sp = Art.person, sc = Art.cat; ctx = real;
    Art.person = (x, y, o) => { if (rec) rec.persons.push({ x, y, o }); }; Art.cat = (x, y, seed, pose) => { if (rec) rec.cats.push({ x, y, seed, pose }); };
    try { fn(); } catch (e) { console.warn('[MM3] classic art capture failed', e && e.message); } finally { ctx = savedCtx; Art.person = sp; Art.cat = sc; }
    return real === sg ? scratch : null;
  }
  function stateKey() {
    const S = G.S; const o = {}; for (const k in S) if (!['jx', 'jy', 'ax', 'ay', 'time', 'steps', 'face', 'verb', 'selItem', 'hintLevel'].includes(k)) o[k] = S[k];
    return JSON.stringify(o) + '|' + [G.dockLight, G.endMint, G.callWho, G.hideHollis, G.vignetteNpc && G.vignetteNpc.who].join(',');
  }

  MM3.autoRoom = function (id, spec) {
    spec = spec || null;
    const cfg = MM3.ROOM_CFG[id] || { wallY: 80, theme: 'warehouse' }; const theme = MM3.THEMES[cfg.theme] || MM3.THEMES.warehouse;
    const def = {
      id, spec, wallY: (spec && spec.wallY) || cfg.wallY, lights: (spec && spec.lights) || theme, persons: [], extraCats: [], dyn: {}, stateKey: '', npcProps: [],
      build(K, group) { this.K = K; this.group = group; this.T = K.T; this.bg = new K.T.Group(); this.props = new K.T.Group(); group.add(this.bg, this.props);
        this.sideMat = new K.T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, side: K.T.DoubleSide, roughness: .9 });
        this.ctx = { anim: [], flicker: [], dyn: {}, perch: [] };
        if (spec && spec.shell) { spec.shell(K, this.bg, this.ctx, this); K.mergeStatic(this.bg); }   // hand-modelled room shell: built ONCE per room visit
        this.rebuild(); },
      dispose(K) { for (const p of this.persons) p.rig = null; if (this.sideMat) this.sideMat.dispose(); },
      rebuild() {
        const K = this.K, T = this.T, r = G.rooms[id], S = G.S;
        const shell = spec && spec.shell; K.disposeGroup(this.props); this.props = new T.Group(); this.group.add(this.props);
        if (!shell) { K.disposeGroup(this.bg); this.bg = new T.Group(); this.group.add(this.bg); }
        this.ctx.anim.length = 0; this.ctx.flicker.length = 0; if (spec && spec.shell) { this.ctx.anim = this.shellAnim || this.ctx.anim; }
        MM3_clearCages();
        this.stateKey = stateKey(); this.persons = []; this.extraCats = []; this.npcProps = [];
        // background
        const rec0 = { persons: [], cats: [] }; const c0 = capture(() => r.bg(0), rec0); if (!shell) this.addBackdrop(c0);
        // props
        for (const p of propsNow()) {
          if (!p.draw || !p.r || p.r[0] < -5) continue;
          const rec = { persons: [], cats: [] }; const c = capture(() => p.draw(G.t, S), rec);
          for (const q of rec.persons) this.persons.push({ x: q.x, y: q.y, o: q.o, prop: p.id }); for (const q of rec.cats) this.extraCats.push(q);
          if (p.npc || rec.persons.length) this.npcProps.push(p);
          this.addProp(p, c);
          if (p.mintTag) this.addCage(p);
        }
        for (const q of rec0.persons) this.persons.push({ x: q.x, y: q.y, o: q.o, prop: 'bg' }); for (const q of rec0.cats) this.extraCats.push(q);
        if (spec && spec.shell) K.mergeStatic(this.props);
        this.buildRigs();
      },
      buildRigs() { for (const p of this.persons) { const key = JSON.stringify(p.o); if (!p.rig || p.rigKey !== key) { if (p.rig) this.K.disposeGroup(p.rig.root); p.rig = this.K.buildPerson(p.o); p.rigKey = key; this.group.add(p.rig.root); } } },
      addBackdrop(c) {
        const K = this.K, T = this.T, wy = this.wallY; if (!c) return;
        const tex = new T.CanvasTexture(copyCanvas(c)); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8; tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
        const wallTex = tex.clone(); wallTex.needsUpdate = true; wallTex.repeat.set(1, wy / SCENE_H); wallTex.offset.set(0, 1 - wy / SCENE_H);
        // wall plane: screen rows 0..wy  <->  heights wy..0 at z = wy
        const wall = new T.Mesh(new T.PlaneGeometry(SW, wy), new T.MeshStandardMaterial({ map: wallTex, color: 0xf2f2f2, roughness: .95 })); wall.position.set(160, wy / 2, wy); wall.receiveShadow = true; this.bg.add(wall);
        const fh = SCENE_H - wy; const floorTex = tex; floorTex.repeat.set(1, fh / SCENE_H); floorTex.offset.set(0, 0);
        const floor = new T.Mesh(new T.PlaneGeometry(SW, fh), new T.MeshStandardMaterial({ map: floorTex, color: 0xe6e6e6, roughness: .9 })); floor.rotation.x = -Math.PI / 2; floor.position.set(160, 0, wy + fh / 2); floor.receiveShadow = true; this.bg.add(floor);
      },
      addProp(p, c) {
        const K = this.K, T = this.T, SCx = SC; const wy = this.wallY;
        if (spec && spec.props && spec.props[p.id]) {                                     // hand-modelled prop: owns its geometry
          try { const m = spec.props[p.id](K, p, this.ctx, G.S, this); if (m) this.props.add(m); } catch (e) { console.warn('[MM3] prop model failed', id, p.id, e && e.message); }
          return;
        }
        if (spec && ((spec.hide && spec.hide.includes(p.id)) || p.npc || spec.generic === false)) return;   // part of the shell / NPC (rig is separate) / fallback disabled
        if (!c) return;
        const bb = bboxMask(c); if (!bb) return;
        const flat = p.z === 0 || /^route_|^ground$/.test(p.id);
        const crop = document.createElement('canvas'); crop.width = bb.w * SCx; crop.height = bb.h * SCx; crop.getContext('2d').drawImage(c, bb.x0 * SCx, bb.y0 * SCx, bb.w * SCx, bb.h * SCx, 0, 0, bb.w * SCx, bb.h * SCx);
        const tex = new T.CanvasTexture(crop); tex.colorSpace = T.SRGBColorSpace; tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
        if (flat) {   // floor decal: screen row == floor z
          const m = new T.Mesh(new T.PlaneGeometry(bb.w, bb.h), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
          m.rotation.x = -Math.PI / 2; m.position.set(bb.x0 + bb.w / 2, .2, bb.y0 + bb.h / 2); this.props.add(m); return;
        }
        const base = Math.max(p.r[1] + p.r[3], wy + 1.5); const wallMounted = p.r[1] + p.r[3] <= wy + 4; const D = wallMounted ? 1.6 : Math.max(3, Math.min(9, p.r[3] * .22));
        const front = new T.Mesh(new T.PlaneGeometry(bb.w, bb.h), new T.MeshStandardMaterial({ map: tex, color: 0xffffff, alphaTest: .5, roughness: .9 }));
        front.position.set(bb.x0 + bb.w / 2, base - (bb.y0 + bb.h / 2), base); front.castShadow = true; front.receiveShadow = true; this.props.add(front);
        const sides = sideGeometry(T, bb, base, D); if (sides) { const sm = new T.Mesh(sides, this.sideMat); sm.castShadow = true; sm.receiveShadow = true; this.props.add(sm); }
        p._ext = { base, D };
      },
      addCage(p) {   // Mint Mode: neon data-cage around props that carry a mintTag (reveals nothing new; the classic tag text is drawn in Canvas2D)
        const T = this.T, w = p.r[2], h = p.r[3], base = Math.max(p.r[1] + p.r[3], this.wallY + 1.5);
        const cage = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(w + 1.5, h + 1.5, 8)), new T.LineBasicMaterial({ color: '#40ffc0', transparent: true, opacity: .9, depthTest: false }));
        cage.position.set(p.r[0] + w / 2, base - (p.r[1] + h / 2), base - 3); MM3.X.mintCages.add(cage);
      },
      sync(K, S, t) {
        const key = stateKey(); if (key !== this.stateKey) { this.rebuild(); return; }
        if (spec) { if (spec.sync) spec.sync(K, S, t, this.ctx, this); for (const f of this.ctx.anim) f(t, S); const fl = !(S.f && S.f.lights_calm) && Math.sin(t * 22) > .7; for (const m of this.ctx.flicker) m.material.emissiveIntensity = fl ? 1.8 : 1.15; }
        // cheap per-frame refresh of NPC positions: replay only NPC props' draw code into a null context
        let n = 0; for (const p of this.npcProps) {
          const rec = { persons: [], cats: [], noPixels: true }; capture(() => p.draw(G.t, S), rec);
          for (const q of rec.persons) { const slot = this.persons.filter(x => x.prop === p.id)[rec.persons.indexOf(q)]; if (slot) { slot.x = q.x; slot.y = q.y; slot.o = q.o; } } n += rec.persons.length;
        }
        // engine-level vignette NPC (finale), outside props
        this.persons = this.persons.filter(p => p.prop !== '__vig'); if (G.vignetteNpc && G.vignetteNpc.room === S.room && typeof PEOPLE !== 'undefined' && PEOPLE[G.vignetteNpc.who]) { const v = G.vignetteNpc; this.persons.push({ x: v.x, y: v.y, o: Object.assign({}, PEOPLE[v.who], { facing: -1 }), prop: '__vig' }); }
        this.buildRigs();
      },
      catPlace(cd) {
        const wy = this.wallY; if (cd.y >= wy + 2) return { z: cd.y, h: 0 };
        if (spec && spec.catPlace) { const r = spec.catPlace(cd, this); if (r) return r; }
        for (const p of propsNow()) if (p.r && cd.x >= p.r[0] && cd.x <= p.r[0] + p.r[2] && cd.y + 4 >= p.r[1] && cd.y + 4 <= p.r[1] + p.r[3] + 2) { const zb = Math.max(p.r[1] + p.r[3], wy + 1.5) + .5; return { z: zb, h: zb - cd.y }; }
        return { z: wy + 2, h: wy + 2 - cd.y };
      }
    };
    return def;
  };
  function MM3_clearCages() { const X = MM3.X; while (X.mintCages.children.length) { const c = X.mintCages.children.pop(); c.geometry.dispose(); c.material.dispose(); } }
  function copyCanvas(c) { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; o.getContext('2d').drawImage(c, 0, 0); return o; }
  // opaque mask at logical-pixel resolution (a cell is opaque if its centre texel is) + bounding box
  function bboxMask(c) {
    const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; const W = c.width; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; const mask = new Uint8Array(SW * SCENE_H);
    for (let j = 0; j < SCENE_H; j++) for (let i = 0; i < SW; i++) { let a = 0; for (let dy = 0; dy < SC; dy++) for (let dx = 0; dx < SC; dx++) a = Math.max(a, d[((j * SC + dy) * W + i * SC + dx) * 4 + 3]); if (a > 90) { mask[j * SW + i] = 1; if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; } }
    if (x1 < 0) return null; return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, mask, data: d, W };
  }
  // solid sides of the extruded silhouette: left/right faces (vertical runs) and top faces (horizontal runs), vertex-coloured from the art's own pixels
  function sideGeometry(T, bb, base, D) {
    const pos = [], nor = [], col = [], idx = []; const { mask, data, W } = bb;
    const on = (i, j) => i >= 0 && i < SW && j >= 0 && j < SCENE_H && mask[j * SW + i] === 1;
    const colorAt = (i, j, k) => { const o = ((j * SC + 1) * W + i * SC + 1) * 4; return [data[o] / 255 * k, data[o + 1] / 255 * k, data[o + 2] / 255 * k]; };
    const lin = (v) => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
    const quad = (p0, p1, p2, p3, n, c) => { const b = pos.length / 3; for (const p of [p0, p1, p2, p3]) { pos.push(...p); nor.push(...n); col.push(lin(c[0]), lin(c[1]), lin(c[2])); } idx.push(b, b + 1, b + 2, b, b + 2, b + 3); };
    const hz = (j) => base - j;                                // height of the TOP edge of screen row j
    for (let i = bb.x0; i <= bb.x1; i++) for (const dir of [-1, 1]) {   // left (-1) and right (+1) faces: vertical runs of exposed cells
      for (let j = bb.y0; j <= bb.y1 + 1; ) {
        if (!(j <= bb.y1 && on(i, j) && !on(i + dir, j))) { j++; continue; } let j2 = j; while (j2 + 1 <= bb.y1 && on(i, j2 + 1) && !on(i + dir, j2 + 1)) j2++;
        const x = dir < 0 ? i : i + 1; quad([x, hz(j), base], [x, hz(j), base - D], [x, hz(j2 + 1), base - D], [x, hz(j2 + 1), base], [dir, 0, 0], colorAt(i, j, dir < 0 ? .62 : .7)); j = j2 + 1;
      }
    }
    for (let j = bb.y0; j <= bb.y1; j++) for (let i = bb.x0; i <= bb.x1; ) {   // top faces: horizontal runs whose upper neighbour is empty
      if (!(on(i, j) && !on(i, j - 1))) { i++; continue; } let i2 = i; while (i2 + 1 <= bb.x1 && on(i2 + 1, j) && !on(i2 + 1, j - 1)) i2++;
      quad([i, hz(j), base], [i2 + 1, hz(j), base], [i2 + 1, hz(j), base - D], [i, hz(j), base - D], [0, 1, 0], colorAt(i, j, 1)); i = i2 + 1;
    }
    if (!idx.length) return null;
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g;
  }
})();
