'use strict';
// THREE ROOM: BREAK ROOM (hand-modelled benchmark room). Registers MM3.rooms.break = { lights, build(K, room), sync(K, S, t, X) }.
// Everything here only READS game state (G.S.f flags) to decide what to show.
window.MM3 = window.MM3 || { rooms: {} };
MM3.rooms.break = {
  // cats whose logical y is above the wall row perch on these (x range, height of the support top)
  perch: [{ x0: 232, x1: 258, top: 34.5 }, { x0: 128, x1: 197, top: 19.2 }, { x0: 200, x1: 224, top: 38 }, { x0: 96, x1: 111, top: 64.5 }],
  wallY: 83,
  lights: {
    hemi: ['#d8e8ff', '#9a9680', .95], key: { color: '#eef6ff', intensity: 1.25, pos: [40, 230, 215], target: [170, 0, 100] }, clear: 0x14151a,
    points: [30, 150, 250].map((fx) => ({ pos: [fx + 20, 80, 104], color: '#e4f6f0', intensity: .8, distance: 170, decay: 1.4 }))
      .concat([{ pos: [245, 20, 108], color: '#ffe9b8', intensity: .75, distance: 70, decay: 1.6 }, { pos: [254, 14, 101], color: '#70ff90', intensity: 0, distance: 44, decay: 2 }, { pos: [30, 30, 118], color: '#ffcf98', intensity: .22, distance: 90, decay: 1.6 }])
  },
  catPlace(cd) { let h = 0, z = cd.y; if (cd.y < 84) { z = 86; h = 86 - cd.y; for (const p of this.perch) if (cd.x >= p.x0 - 4 && cd.x <= p.x1 + 4) { h = p.top; break; } } return { z, h }; },
  build(K, room) {
    const { T, mat, emi, box, ctex, seeded, L2W } = K; const WALL_Y = this.wallY; const dyn = this.dyn = {};
    this.EM_ON = new T.MeshStandardMaterial({ color: '#70e060', emissive: '#70e060', emissiveIntensity: 1.3, roughness: .4 }); this.EM_OFF = new T.MeshStandardMaterial({ color: '#2a2a2a', roughness: .6 });
    
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
      K.keep(true); const tube = box(g, fx + 2, fx + 38, 98.6, 99.4, 93.5, 98.5, emi('#f2ffe6', 1.4), { cast: false, recv: false }); K.keep(false); dyn.tubes.push(tube);
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
      K.keep(true); const batt = new T.Group(); box(batt, 115.5, 122.5, 84, 86.4, 55.6, 58.8, mat('#2e2e30')); box(batt, 115.5, 122.5, 86.4, 86.9, 56.6, 57.5, mat('#c8b070'));  // tape
      box(batt, 116, 118, 86.4, 86.8, 58, 58.5, mat('#e0a020')); K.keep(false); g.add(batt); dyn.battery = batt;
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
      K.keep(true); dyn.d4 = box(g, 252.4, 255.8, zf + .8, zf + 1.4, 12, 14, emi('#70e060', 0), { cast: false });                         // D4 light
      box(g, 234, 250, zf, zf + .9, 2.4, 8.6, mat('#050505'));                                                            // dispenser tray
      dyn.tray = box(g, 238, 246, zf + .9, zf + 1.2, 3.4, 5.2, emi('#70e060', 0), { cast: false }); K.keep(false);                        // glowing mint
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
      K.keep(true); dyn.blink = box(g, 260.4, 262.4, WALL_Y + .6, WALL_Y + 1.4, 17.6, 19.2, emi('#50ff70', 1.4), { cast: false }); K.keep(false);
      dyn.blinkLight = K.L.pts[6]; dyn.blinkLight.color.set('#50ff70'); dyn.blinkLight.position.set(261.4, 19, 88); dyn.blinkLight.distance = 26; dyn.blinkLight.decay = 2; dyn.blinkLight.intensity = 0;
    }
    // -- floor items: cat bowl + paw prints, crumpled label, paw trail
    {
      K.keep(true); const bg = new T.Group(); room.add(bg); dyn.bowl = bg;
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
      box(lb, 113, 115.6, 130.8, 132.4, 1.2, 2.5, mat('#e8e8e2')).rotation.y = .9; K.keep(false);
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
    K.mergeStatic(room);
    return dyn;
  },
  sync(K, S, t) {
    const dyn = this.dyn; const fl = (k) => !!(S.f && S.f[k]); const P = K.L.pts;
    dyn.flyer.visible = !fl('took_flyer'); dyn.battery.visible = !fl('clock_battery');
    dyn.bowl.visible = !fl('bowl1_taken'); dyn.label.visible = !fl('took_label');
    const mintReady = fl('mint_ready') && !fl('mint_taken'); dyn.d4.material = mintReady ? this.EM_ON : this.EM_OFF; dyn.tray.material = mintReady ? this.EM_ON : this.EM_OFF;
    const pulse = .6 + .4 * Math.sin(t * 3); if (mintReady) this.EM_ON.emissiveIntensity = 1.1 + .6 * pulse;
    P[4].intensity = mintReady ? .55 + .35 * pulse : 0;
    const radioHere = !fl('radio_found'); dyn.blink.visible = radioHere; P[6].intensity = radioHere ? (Math.sin(t * 7) > 0 ? 1.1 : .15) : 0; dyn.blink.material.emissiveIntensity = radioHere ? (Math.sin(t * 7) > 0 ? 1.8 : .25) : 0;
    // fluorescent flicker: same trigger as the classic renderer; lights_calm freezes it
    const flick = fl('lights_calm') ? 0 : (Math.sin(t * 22) > 0.7 ? 1 : 0);
    for (const tb of dyn.tubes) tb.material.emissiveIntensity = flick ? 1.8 : 1.15; for (let i = 0; i < 3; i++) P[i].intensity = flick ? .95 : .8;
  }
};
