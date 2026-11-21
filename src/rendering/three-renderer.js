'use strict';
// THREE RENDERER: scene, camera, lights, room lifecycle (load / sync / dispose), characters, cats, Mint visuals.
// Reads game state only. Never writes G / G.S. Called once per engine frame from renderer.js (no animation loop of its own).
window.MM3 = window.MM3 || { rooms: {} };
(function () {
  const RES = 3;                          // Three canvas pixels per logical pixel (960x432 for the 320x144 scene window)
  const CATS_MAX = 40;
  let T = null, K = null, X = null, cur = null;
  const perf = { n: 0, ms: 0, max: 0, rooms: 0, disposed: 0 };
  MM3.perf = perf;

  // ------------------------------------------------------------------ init: renderer, camera, permanent lights, characters, Mint overlay
  MM3.init = function (THREE, canvas) {
    T = THREE; K = MM3.makeKit(T);
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1); renderer.setSize(320 * RES, 144 * RES, false);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.useLegacyLights = true;      // simple, predictable light units (pinned r160)
    renderer.autoClear = false; renderer.info.autoReset = false; renderer.setClearColor(0x14151a, 1);
    const scene = new T.Scene();
    // fixed 45deg orthographic camera, anisotropic frustum so that 1 world unit == 1 logical pixel on screen: screen = (x, y - h)
    const cam = new T.OrthographicCamera(-160, 160, 72 / Math.SQRT2, -72 / Math.SQRT2, 1, 3000);
    const CAM_TARGET = new T.Vector3(160, 0, 72), CAM_D = 700;
    cam.position.set(CAM_TARGET.x, CAM_D * Math.SQRT1_2, CAM_TARGET.z + CAM_D * Math.SQRT1_2); cam.lookAt(CAM_TARGET); cam.updateMatrixWorld();
    // permanent light pool (constant light count => no shader recompiles on room changes); rooms only configure it
    const hemi = new T.HemisphereLight('#d8e8ff', '#9a9680', .9); scene.add(hemi);
    const key = new T.DirectionalLight('#eef6ff', 1); scene.add(key, key.target);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0012; key.shadow.normalBias = .4; key.shadow.radius = 3;
    Object.assign(key.shadow.camera, { left: -230, right: 230, top: 120, bottom: -120, near: 1, far: 700 });
    const pts = []; for (let i = 0; i < 7; i++) { const l = new T.PointLight('#ffffff', 0, 100, 1.6); scene.add(l); pts.push(l); }
    K.L = { hemi, key, pts };
    // characters shared by every room
    const hollis = K.buildHollis(); scene.add(hollis.root); const juno = K.buildJuno(); scene.add(juno.root);
    // Mint overlay (screen-space grade + scanlines)
    const ovScene = new T.Scene(), ovCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
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
      fragmentShader: 'varying vec2 v; uniform float t; uniform float k; uniform vec3 col; void main(){ float y=v.y*144.; float s=step(.5,fract((y+t*20.)/4.))*0.07; gl_FragColor=vec4(col*s*k,1.); }'
    });
    const q1 = new T.Mesh(new T.PlaneGeometry(2, 2), gradeMat), q2 = new T.Mesh(new T.PlaneGeometry(2, 2), lineMat); q1.frustumCulled = q2.frustumCulled = false; q1.renderOrder = 1; q2.renderOrder = 2; ovScene.add(q1, q2);
    const gridTex = K.ctex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(80,255,200,.9)'; c.lineWidth = 2; c.strokeRect(0, 0, w, h); c.strokeStyle = 'rgba(80,255,200,.35)'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, h); c.moveTo(0, i * 32); c.lineTo(w, i * 32); c.stroke(); } }, { wrapS: T.RepeatWrapping, wrapT: T.RepeatWrapping });
    gridTex.repeat.set(320 / 16, 120 / 16);
    const mintGroup = new T.Group(); scene.add(mintGroup); mintGroup.visible = false;
    const gridM = new T.Mesh(new T.PlaneGeometry(320, 120), new T.MeshBasicMaterial({ map: gridTex, transparent: true, opacity: .32, depthWrite: false, blending: T.AdditiveBlending })); gridM.rotation.x = -Math.PI / 2; gridM.position.set(160, .12, 145); mintGroup.add(gridM);
    X = { renderer, scene, cam, hollis, juno, cats: [], gradeMat, lineMat, ovScene, ovCam, gridTex, mintGroup, mintK: 0, mintTint: new T.Color(), mintCol: new T.Color(), mintCages: new T.Group(), base: { hemi: 1, key: 1 }, lastT: undefined };
    mintGroup.add(X.mintCages);
    MM3.X = X; MM3.K = K; MM3.T = T;
  };

  // ------------------------------------------------------------------ lights
  function applyLights(cfg) {
    const { hemi, key, pts } = K.L; cfg = cfg || {};
    const h = cfg.hemi || ['#d8e8ff', '#9a9680', .8]; hemi.color.set(h[0]); hemi.groundColor.set(h[1]); hemi.intensity = h[2];
    const k = cfg.key || { color: '#eef6ff', intensity: .8, pos: [40, 230, 215], target: [170, 0, 100] };
    key.color.set(k.color); key.intensity = k.intensity; key.position.set(...k.pos); key.target.position.set(...(k.target || [170, 0, 100]));
    pts.forEach((p) => { p.intensity = 0; }); (cfg.points || []).forEach((c, i) => { const p = pts[i]; if (!p) return; p.color.set(c.color); p.position.set(...c.pos); p.intensity = c.intensity; p.distance = c.distance; p.decay = c.decay; });
    X.renderer.setClearColor(cfg.clear === undefined ? 0x14151a : cfg.clear, 1); X.base.hemi = hemi.intensity; X.base.key = key.intensity;
  }

  // ------------------------------------------------------------------ room lifecycle:  enter room -> dispose previous -> build/select -> sync -> render
  MM3.loadThreeRoom = function (id) {
    MM3.disposeThreeRoom();
    const group = new T.Group(); X.scene.add(group);
    let def = MM3.rooms[id]; if (MM3.forceGeneric && id !== 'break') def = null;   // ?generic=1: bypass hand-modelled rooms (measurement / regression comparison)
    if (typeof def === 'function') def = def(); else if (!def) def = MM3.autoRoom(id);   // rooms[id] may be a hand-built module or a factory
    applyLights(def.lights);
    def.build(K, group, X);
    cur = { id, group, def }; perf.rooms++;
    return cur;
  };
  MM3.syncThreeRoom = function (id, S, t) { if (!cur || cur.id !== id) MM3.loadThreeRoom(id); cur.def.sync(K, S, t, X); return cur; };
  MM3.disposeThreeRoom = function () {
    if (!cur) return; try { cur.def.dispose && cur.def.dispose(K); } catch (e) { console.warn('[MM3] dispose hook failed', e); }
    K.disposeGroup(cur.group); K.L.pts.forEach(p => { p.intensity = 0; });
    while (X.mintCages.children.length) { const c = X.mintCages.children.pop(); c.geometry.dispose(); c.material.dispose(); }
    for (const c of X.cats) if (c) c.root.visible = false;
    cur = null; perf.disposed++;
  };
  MM3.currentRoom = () => cur && cur.id;

  // ------------------------------------------------------------------ per-frame render. Returns Juno's pose (for the Canvas2D "WOOF!" text).
  MM3.render = function (S, r, t) {
    const { renderer, scene, cam, hollis, juno } = X; const def = MM3.syncThreeRoom(S.room, S, t).def;
    // --- Hollis (position/face/walking come only from the engine)
    const showH = !r.noHollis && !G.hideHollis; hollis.root.visible = showH;
    if (showH) {
      K.L2W(S.jx, S.jy, 0, hollis.root.position);
      hollis.ang = K.lerpAng(hollis.ang, S.face === -1 ? -Math.PI : 0, .25); hollis.g.rotation.y = hollis.ang;
      const walking = !!G.walking; hollis.ph = walking ? t * 11 : hollis.ph * .85; const sw = walking ? Math.sin(hollis.ph) * .7 : 0;
      hollis.legs[0].rotation.z = sw; hollis.legs[1].rotation.z = -sw; hollis.arms[0].rotation.z = -sw * .8; hollis.arms[1].rotation.z = sw * .8;
      hollis.g.position.y = walking ? Math.abs(Math.sin(hollis.ph)) * .9 : 0;
      hollis.torso.scale.y = walking ? 1 : 1 + Math.sin(t * 1.9) * .012; hollis.head.position.y = 31 + (walking ? 0 : Math.sin(t * 1.9) * .18); hollis.head.rotation.z = walking ? 0 : Math.sin(t * .7) * .03;
    }
    // --- Juno
    const showJ = S.junoWith && !r.noJuno; juno.root.visible = showJ; let jpose = null;
    if (showJ) {
      jpose = G.junoPose || (G.junoMoving ? 'walk' : (G.junoIdle || 'stand'));
      K.L2W(S.ax, S.ay, 0, juno.root.position);
      juno.ang = K.lerpAng(juno.ang, (G.junoFace || 1) === -1 ? -Math.PI : 0, .3); juno.g.rotation.y = juno.ang;
      const mv = jpose === 'walk' || !!G.junoMoving; const L = juno.legs; const ph = t * 14; const s = mv ? Math.sin(ph) * .8 : 0;
      L.fl.rotation.z = s; L.hr.rotation.z = s; L.fr.rotation.z = -s; L.hl.rotation.z = -s;
      juno.tail.position.set(-8.4, 9.4, 0); juno.tail.rotation.set(0, Math.sin(t * (mv ? 14 : 9)) * .5, .35);
      juno.body.rotation.z = 0; juno.body.position.set(-8, 0, 0); juno.haunch.visible = false; juno.head.position.set(5.6, 10, 0); juno.head.rotation.set(0, 0, 0); juno.jaw.visible = false;
      for (const k in L) { L[k].visible = true; L[k].position.y = 5; L[k].scale.y = 1; }
      juno.g.position.y = mv ? Math.abs(Math.sin(ph)) * .6 : 0;
      if (jpose === 'sit') { juno.body.rotation.z = .6; juno.body.position.set(-8, 0, 0); juno.haunch.visible = true; L.hl.visible = L.hr.visible = false;
        for (const k of ['fl', 'fr']) { L[k].position.set(-1.6, 10.4, L[k].position.z); L[k].scale.y = 2.08; L[k].rotation.z = 0; }
        juno.head.position.set(-2.4, 15.2, 0); juno.head.rotation.z = -.45 + Math.sin(t * 1.3) * .03; juno.tail.position.set(-9.6, 2.4, 0); juno.tail.rotation.set(0, Math.sin(t * 6) * .4, .05); }
      else if (jpose === 'lay') { juno.body.position.set(-8, -3.6, 0); juno.head.position.set(6.4, 4.4, 0); juno.head.rotation.z = -.15; for (const k in L) L[k].visible = false; juno.tail.position.set(-8.4, 3.2, 0); juno.tail.rotation.set(0, Math.sin(t * 3) * .3, -.15); }
      else if (jpose === 'sniff') { juno.head.position.set(8.2, 5.2, 0); juno.head.rotation.z = -.75 + Math.sin(t * 12) * .06; }
      else if (jpose === 'bark') { const j = Math.abs(Math.sin(t * 18)); juno.head.position.set(6, 11.4, 0); juno.head.rotation.z = .35; juno.jaw.visible = j > .3; juno.g.position.y = j * .5; }
      else if (jpose === 'tilt') { juno.head.rotation.x = .5; juno.head.rotation.z = -.15; }
      else if (!mv) { juno.head.rotation.z = Math.sin(t * 1.3) * .04; }
      juno.band.visible = !!(S.f && S.f.armband_on);
    }
    // --- NPC people owned by the room def (positions/specs come from the classic draw data the engine already evaluates)
    if (def.persons) for (const p of def.persons) {
      if (!p.rig) continue; const g = p.rig;
      K.L2W(p.x, p.y, 0, g.root.position); g.ang = K.lerpAng(g.ang, (p.o.facing || 1) === -1 ? -Math.PI : 0, .2); g.g.rotation.y = g.ang;
      const ph = t * 1.9 + g.ph; g.torso.scale.y = 1 + Math.sin(ph) * .012; g.head.rotation.z = Math.sin(t * .6 + g.ph) * .04; g.head.rotation.y = Math.sin(t * .31 + g.ph) > .8 ? .5 : 0;
      if (g.wave) { g.arms[1].rotation.z = -2.5 + Math.sin(t * 7) * .35; } else { g.arms[0].rotation.z = Math.sin(ph) * .03; g.arms[1].rotation.z = -Math.sin(ph) * .03; }
    }
    // --- cats: classic catList() (+ cats the room's classic art draws, e.g. Biscuit); position/pose/colour deterministic from existing seeds
    const list = (r.spots && !r.nocats ? catList() : []).concat(def.extraCats || []);
    for (let i = 0; i < CATS_MAX; i++) { const c = X.cats[i]; if (c && i >= list.length) c.root.visible = false; }
    for (let i = 0; i < Math.min(list.length, CATS_MAX); i++) {
      const cd = list[i]; let c = X.cats[i]; if (!c) { c = X.cats[i] = K.buildCat(); scene.add(c.root); } c.root.visible = true;
      if (c.shadowOn !== (i < 12)) { c.shadowOn = i < 12; c.root.traverse(o => { if (o.isMesh) o.castShadow = c.shadowOn; }); }
      if (c.seedKey !== cd.seed) K.styleCat(c, cd.seed);
      const pose = cd.pose || ['sit', 'loaf', 'sleep', 'stand', 'sit', 'loaf'][Math.floor(rnd(cd.seed + 2) * 6)];
      if (c.pose !== pose) K.poseCat(c, pose);
      const pl = def.catPlace ? def.catPlace(cd) : { z: cd.y, h: 0 }; K.L2W(cd.x, pl.z, pl.h, c.root.position);
      c.ang = K.lerpAng(c.ang, c.face === 1 ? 0 : -Math.PI, .2); c.g.rotation.y = c.ang;
      const dx = S.jx - cd.x; const toward = (dx * c.face) < 0 ? 1 : 0; const yaw = pose === 'sleep' ? 0 : (Math.sin(t * .4 + cd.seed) > .55 ? (toward ? .9 : -.6) : 0);
      c.head.rotation.y += (yaw - c.head.rotation.y) * .08;
      const flick = Math.sin(t * 1.6 + cd.seed * 2.1) > .8 ? 1 : 0.1; c.segs.forEach((sg, k) => { sg.rotation.y = Math.sin(t * (2.2 + flick * 6) + k * .8 + cd.seed) * (.18 + flick * .35) * (k + 1) * .6; });
      const lid = pose === 'sleep' ? 1 : (.35 + .3 * (Math.sin(t * .23 + cd.seed) > .93 ? 1 : 0)); c.P.lidL.scale.y = c.P.lidR.scale.y = lid + .01;
      const near = i < 8;   // cat LOD (draw-call budget): only the 8 first cats keep eyes / lids / stripes; the rest are body + merged head + tail + legs
      c.P.eyeL.visible = c.P.eyeR.visible = c.P.pupL.visible = c.P.pupR.visible = near && pose !== 'sleep'; c.P.lidL.visible = c.P.lidR.visible = near; for (const s of c.stripes) s.visible = near && c.stripeOn;
    }
    // --- Mint Mode (visual only; driven by S.mintOn / S.mint). Time-based ramp.
    const dtv = Math.min(.1, Math.max(0, t - (X.lastT === undefined ? t : X.lastT))); X.lastT = t;
    X.mintK += ((S.mintOn ? 1 : 0) - X.mintK) * (1 - Math.exp(-dtv * 9)); const mk = X.mintK, lvl = S.mint;
    X.mintGroup.visible = mk > .02; if (X.mintGroup.visible) { X.gridTex.offset.y = (t * .6) % 1; for (const c of X.mintCages.children) c.material.opacity = .45 + .45 * Math.sin(t * 5 + c.position.x); }
    X.mintCol.set(lvl >= 3 ? new T.Color().setHSL((t * .33) % 1, .9, .55) : new T.Color('#00ffc8'));
    X.mintTint.copy(X.mintCol).lerp(new T.Color('#ffffff'), .55); X.gradeMat.uniforms.tint.value.copy(X.mintTint); X.gradeMat.uniforms.k.value = mk * (lvl >= 3 ? 1 : .9);
    X.lineMat.uniforms.t.value = t; X.lineMat.uniforms.k.value = mk; X.lineMat.uniforms.col.value.copy(X.mintCol);
    K.L.hemi.intensity = X.base.hemi * (1 - .3 * mk); K.L.key.intensity = X.base.key * (1 - .25 * mk);
    // --- camera shake (engine's G.shake) as a jitter in logical pixels
    const sh = G.shake > 0 ? G.shake : 0; cam.position.x = 160 + (sh ? (Math.random() - .5) * sh : 0); cam.position.y = 700 * Math.SQRT1_2 + (sh ? (Math.random() - .5) * sh * .7 : 0);
    renderer.info.reset(); renderer.clear(); renderer.render(scene, cam); renderer.render(X.ovScene, X.ovCam);
    return jpose;
  };
  MM3.info = () => X ? { calls: X.renderer.info.render.calls, triangles: X.renderer.info.render.triangles, geometries: X.renderer.info.memory.geometries, textures: X.renderer.info.memory.textures, room: cur && cur.id } : null;
  MM3.debugState = function () { if (!X) return null; const P = (o) => [+o.position.x.toFixed(2), +o.position.y.toFixed(2), +o.position.z.toFixed(2), o.visible]; const def = cur && cur.def; return { room: cur && cur.id, hollis: P(X.hollis.root), juno: P(X.juno.root), cats: X.cats.filter(c => c && c.root.visible).map(c => [+c.root.position.x.toFixed(1), +c.root.position.y.toFixed(1), +c.root.position.z.toFixed(1)]), persons: def && def.persons ? def.persons.filter(p => p.rig).map(p => [p.x, p.y, p.o.shirt]) : [], dyn: def && def.dyn ? Object.fromEntries(Object.entries(def.dyn).filter(([k, v]) => v && v.visible !== undefined).map(([k, v]) => [k, v.visible])) : {}, d4: !!(def && def.EM_ON && def.dyn.d4 && def.dyn.d4.material === def.EM_ON), mintK: +X.mintK.toFixed(2), extraCats: def && def.extraCats ? def.extraCats.length : 0 }; };
})();
