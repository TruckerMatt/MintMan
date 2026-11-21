'use strict';
// THREE COMMON: shared Three.js kit used by every room renderer (materials, box helpers, mesh merge/bake, characters).
// Nothing here knows about a particular room. Logical -> world mapping lives here (L2W): world = ( x , h , y ), screen = ( x , y - h ).
window.MM3 = window.MM3 || { rooms: {} };
MM3.makeKit = function (T) {
  const K = { T };
  function L2W(x, y, h, out) { return (out || new T.Vector3()).set(x, h || 0, y); }
  function W2L(v) { return { x: v.x, y: v.z, h: v.y, screenY: v.z - v.y }; }
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
  K.keep = (b) => { KEEP = !!b; };       // meshes created while keep(true) are NOT merged into the static batch (they animate / toggle)
  // ---- static batch merge (draw-call budget)
    function mergeStatic(parent) {
      const list = STATIC.splice(0); parent.updateMatrixWorld(true); const buckets = new Map();
      for (const m of list) { if (!m.parent) continue; const mt = m.material; const plain = !mt.map && !mt.emissiveMap && !(mt.emissiveIntensity > 0 && mt.emissive && mt.emissive.getHex() !== 0) && !mt.vertexColors && !mt.alphaTest;
        // plain-colour materials share ONE vertex-coloured material per (roughness, metalness, transparency): colours are baked into the vertices (fewer buckets -> fewer draw calls, both passes)
        const k = plain ? ['vc', mt.roughness, mt.metalness, mt.transparent, mt.opacity, mt.flatShading, m.castShadow, m.receiveShadow].join('|') : mt.uuid + '|' + m.castShadow + '|' + m.receiveShadow;
        if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(m); }
      let before = 0, after = 0;
      for (const arr of buckets.values()) {
        before += arr.length; if (arr.length < 2) { after += arr.length; continue; }
        let nv = 0, ni = 0; for (const m of arr) { nv += m.geometry.attributes.position.count; ni += m.geometry.index.count; }
        const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni); let vo = 0, io = 0; const v = new T.Vector3(), nm = new T.Matrix3();
        const vcol = arr[0].material.vertexColors || arr[0].material.map || arr[0].material.emissiveMap || arr[0].material.alphaTest ? false : (arr[0].material.emissiveIntensity > 0 && arr[0].material.emissive && arr[0].material.emissive.getHex() !== 0 ? false : true);
        const col = vcol ? new Float32Array(nv * 3) : null;
        for (const m of arr) {
          if (col) { const c = m.material.color; for (let i = 0, n = m.geometry.attributes.position.count; i < n; i++) col.set([c.r, c.g, c.b], (vo + i) * 3); }
          nm.getNormalMatrix(m.matrixWorld); const g = m.geometry, p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
          for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); pos.set([v.x, v.y, v.z], (vo + i) * 3); v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (vo + i) * 3); uv.set([u.getX(i), u.getY(i)], (vo + i) * 2); }
          for (let j = 0; j < g.index.count; j++) idx[io + j] = g.index.getX(j) + vo; vo += p.count; io += g.index.count; m.parent.remove(m); g.dispose();
        }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setIndex(new T.BufferAttribute(idx, 1));
        if (col) geo.setAttribute('color', new T.BufferAttribute(col, 3));
        const m0 = arr[0].material; const mesh = new T.Mesh(geo, col ? vcBucketMat(m0) : m0); mesh.castShadow = arr[0].castShadow; mesh.receiveShadow = arr[0].receiveShadow; parent.add(mesh); after++;
      }
      return { before, after };
    }
  // ---- dispose everything under a group (shared cached materials are kept)
  const shared = new Set(); const _mat = mat, _emi = emi;
  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) { if (matCache_has(m)) continue; for (const k of ['map', 'emissiveMap', 'alphaMap']) if (m[k]) m[k].dispose(); m.dispose && m.dispose(); }
      if (o.isLight && o.shadow && o.shadow.map) o.shadow.map.dispose();
    });
    if (g.parent) g.parent.remove(g);
  }
  const vcBuckets = {};
  function vcBucketMat(m0) { const k = [m0.roughness, m0.metalness, m0.transparent, m0.opacity, m0.flatShading].join('|'); return vcBuckets[k] || (vcBuckets[k] = new T.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: m0.roughness, metalness: m0.metalness, flatShading: m0.flatShading, transparent: m0.transparent, opacity: m0.opacity })); }
  function matCache_has(m) { return m === vcMat || Object.values(vcBuckets).includes(m) || Object.values(matCache).includes(m) || Object.values(catMats).includes(m); }
  // ---- characters
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
    // draw-call budget: the static head boxes (skull, ears, nose) are merged into ONE vertex-coloured mesh at (re)style time; the source boxes stay hidden (never drawn)
    function bakeCatHead(c) {
      if (c.headBake) { c.head.remove(c.headBake); c.headBake.geometry.dispose(); c.headBake = null; }
      const parts = [c.P.head, c.P.earL, c.P.earR, c.P.nose]; let nv = 0, ni = 0; for (const m of parts) { nv += m.geometry.attributes.position.count; ni += m.geometry.index.count; }
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint32Array(ni); let vo = 0, io = 0; const v = new T.Vector3(), nm = new T.Matrix3();
      for (const m of parts) { m.updateMatrix(); nm.getNormalMatrix(m.matrix); const g = m.geometry, p = g.attributes.position, n = g.attributes.normal, cc = m.material.color;
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrix); pos.set([v.x, v.y, v.z], (vo + i) * 3); v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (vo + i) * 3); col.set([cc.r, cc.g, cc.b], (vo + i) * 3); }
        for (let j = 0; j < g.index.count; j++) idx[io + j] = g.index.getX(j) + vo; vo += p.count; io += g.index.count; m.visible = false; }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.setIndex(new T.BufferAttribute(idx, 1));
      const mesh = new T.Mesh(geo, vcMat); mesh.castShadow = true; mesh.receiveShadow = true; c.head.add(mesh); c.headBake = mesh;
    }
    function styleCat(c, seed) {
      const cc = CAT_COLS[Math.floor(rnd(seed + 1) * CAT_COLS.length)]; const eye = ['#ffe040', '#60ff60', '#ffffff'][Math.floor(rnd(seed + 4) * 3)];
      const a = cmat(cc[0]), b = cmat(cc[1]);
      for (const k of ['body', 'head', 'earL', 'earR', 't0', 't1', 't2']) c.P[k].material = a;
      c.P.t2.material = rnd(seed + 5) > .5 ? b : a; c.P.lidL.material = b; c.P.lidR.material = b; for (const l of c.legs) l.material = a;
      c.stripeOn = rnd(seed + 5) > .6; c.stripes.forEach(s => { s.visible = c.stripeOn; s.material = b; }); bakeCatHead(c);
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


  // ---- generic employee/NPC rig built from the classic PEOPLE spec (same proportions language as Hollis; silhouette + colour carry personality)
  function buildPerson(o) {
    const root = new T.Group(); const g = new T.Group(); root.add(g);
    const h = o.h || 36, hw = o.hw || 4, headH = 8, legL = o.bust ? 0 : Math.round(h * .42), torsoH = h - headH - legL - 1, base = o.bust ? 4 : 0;
    const col = (c, d) => mat(c || d); const skin = col(o.skin, '#f0b890'), pants = col(o.pants, '#3a5a98'), boots = col(o.boots, '#4a3020'), shirt = col(o.shirt, '#8a8f98'), sleeve = col(o.sleeve || o.shirt, '#8a8f98');
    const legs = [], arms = []; const tw = Math.max(3.2, hw * 1.05), td = Math.max(2.8, hw * .85);   // torso half-width (lateral) and half-depth (fwd)
    if (!o.bust) for (const s of [-1, 1]) {
      const hip = new T.Group(); hip.position.set(0, legL, s * tw * .5); g.add(hip);
      lbox(hip, -1.8, 1.8, -legL + 3, 0, -1.7, 1.7, pants); lbox(hip, -2.2, 3.6, -legL, -legL + 3.2, -1.8, 1.8, boots); legs.push(hip);
    }
    const ty = base + legL; const torso = new T.Group(); g.add(torso);
    lbox(torso, -td, td, ty, ty + torsoH + (o.bust ? 2 : 0), -tw, tw, shirt);
    if (o.vest) { lbox(torso, -td - .25, td + .25, ty + .4, ty + torsoH - .6, -tw - .25, tw + .25, col(o.vest)); if (o.stripes) { lbox(torso, -td - .35, td + .35, ty + torsoH * .62, ty + torsoH * .62 + 1.1, -tw - .3, tw + .3, col(o.stripes)); lbox(torso, -td - .35, td + .35, ty + 1.6, ty + 2.7, -tw - .3, tw + .3, col(o.stripes)); } }
    if (o.tie) lbox(torso, td - .1, td + .45, ty + torsoH - 8, ty + torsoH - .5, -.9, .9, col(o.tie));
    if (o.belt) lbox(torso, -td - .3, td + .3, ty - .5, ty + 1, -tw - .3, tw + .3, col(o.belt));
    for (const s of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(0, ty + torsoH - 1, s * (tw + 1.4)); g.add(sh); const al = torsoH - 3;
      lbox(sh, -1.4, 1.4, -al, 0, -1.3, 1.3, sleeve); lbox(sh, -1.25, 1.25, -al - 2.4, -al, -1.2, 1.2, o.glove ? col(o.glove) : skin); arms.push(sh);
    }
    const head = new T.Group(); head.position.set(0, ty + torsoH + 1, 0); g.add(head);
    lbox(head, -3.4, 3.4, -.5, headH - .5, -3.4, 3.4, skin);
    for (const s of [-1, 1]) { const zf = s > 0 ? 3.4 : -3.6; lbox(head, 1.2, 2.9, 3.6, 5, zf, zf + .2, mat('#fafafa'), { noCast: true }); lbox(head, 2, 2.9, 3.8, 4.8, s > 0 ? 3.5 : -3.7, s > 0 ? 3.7 : -3.5, mat('#141010'), { noCast: true }); }
    lbox(head, 3.2, 4.4, 1.7, 3.1, -.7, .7, skin);
    if (o.mouth === 'open') lbox(head, 2.6, 3.6, .4, 1.4, -1.1, 1.1, mat('#6a2a2a'), { noCast: true });
    const hc = (c) => col(c, '#222'); const top = headH - .5;
    if (o.hat === 'cap') { lbox(head, -3.8, 3.8, top - 3, top + 1, -3.8, 3.8, hc(o.hatCol)); lbox(head, 2.4, 7.4, top - 2.6, top - 1.4, -3.2, 3.2, hc(o.hatCol)); }
    else if (o.hat === 'hard') { lbox(head, -4, 4, top - 2.6, top + 2.4, -4, 4, hc(o.hatCol)); lbox(head, -4.6, 5.6, top - 2.9, top - 1.8, -4.6, 4.6, hc(o.hatCol)); }
    else if (o.hat === 'beanie') { lbox(head, -3.9, 3.9, top - 2.2, top + 1.8, -3.9, 3.9, hc(o.hatCol)); lbox(head, -3.9, 3.9, top - 2.6, top - 1.6, -3.95, 3.95, mat('#c8c8c8')); }
    else if (o.hair) {
      lbox(head, -3.8, 3.8, top - 2, top + 1.2, -3.8, 3.8, hc(o.hair));
      if (o.hairLong) lbox(head, -3.9, -1, top - 2 - o.hairLong * .9, top - 1, -3.9, 3.9, hc(o.hair));
      if (o.bun) lbox(head, -5.5, -2.5, top, top + 3.2, -1.7, 1.7, hc(o.hair));
      if (o.puff) lbox(head, -5.2, 5, top - 3, top + 4, -5.4, 5.4, hc(o.hair));
    }
    if (o.beard) { lbox(head, -1.5, 3.9, -.5 - (o.beardL || 3) * .5, 1.8, -3.5, 3.5, hc(o.beard)); if (o.braids) for (const z of [-1.8, 1.8]) lbox(head, 1, 2.2, -5.5, -.5, z - .5, z + .5, hc(o.beard)); }
    if (o.glasses) for (const s of [-1, 1]) lbox(head, 1, 3.4, 3.2, 5.3, s > 0 ? 3.55 : -3.8, s > 0 ? 3.8 : -3.55, hc(o.glasses), { noCast: true });
    if (o.horn) for (const s of [-1, 1]) lbox(head, -.5, .9, top + 1, top + 3.4, s * 3.6 - .6, s * 3.6 + .6, mat('#e8e8e0'));
    [...legs, ...arms, torso, head].forEach(bake);
    return { root, g, legs, arms, torso, head, ang: 0, ph: ((o.h || 36) * .37 + (o.hw || 4) * 1.3) % 6, bust: !!o.bust, wave: o.pose === 'wave' };
  }
  Object.assign(K, { buildPerson, L2W, W2L, mat, emi, box, lbox, ctex, seeded, mergeStatic, disposeGroup, lerpAng, bake, buildHollis, buildJuno, buildCat, styleCat, poseCat, vcMat, cmat });
  return K;
};
