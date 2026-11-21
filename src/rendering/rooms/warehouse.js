'use strict';
// THREE ROOMS: STAGING LANES, PARTS/CAGE, BATTERY CHARGING, WAREHOUSE RACKS, MAINTENANCE TUNNEL (hand-modelled warehouse family on the environment kit).
// Everything reads existing state (G.S.f flags, G.S.pal sorting). Visual only.
window.MM3 = window.MM3 || { rooms: {} };
(function () {
  const F = (k) => !!(G.S.f && G.S.f[k]);
  const WY = 80;
  const WH = { hemi: ['#d8e2ff', '#9a9680', .85], key: { color: '#f0f5ff', intensity: .9, pos: [40, 230, 215], target: [170, 0, 100] }, clear: 0x101216, points: [40, 160, 280].map(x => ({ pos: [x, 90, 104], color: '#e4f6f0', intensity: .3, distance: 150, decay: 1.4 })) };
  function shell(K, g, ctx, o) {
    const E = MM3.envKit(K), { mat, box } = K;
    E.floor(g, { x0: -10, x1: 330, z0: WY, z1: 150, base: o.floor || '#8a8a84', seed: o.seed || 3, joints: 40, rough: .8, stripes: o.stripes || [], blots: o.blots || [[80, 50, 24, .2], [240, 40, 20, .16], [160, 20, 30, .12]] });
    E.wall(g, { x0: -10, x1: 330, z: WY, H: 80, base: o.wall || '#585c66', panels: 6, topDark: .35, botDirt: .3, seed: o.seed || 3 });
    box(g, -10, 330, WY - .5, WY + 1.4, 56, 58, mat('#3a3d46'), { cast: false });
    E.truss(g, -10, 330, WY + 3, 77.5); for (const x of o.fx || [20, 100, 180, 260]) E.fixture(g, ctx, x, WY + 6, 73, 36);
    return E;
  }
  const pal = (id) => PAL.find((q) => 'pal_' + q.code === id);

  // ------------------------------------------------------------------------------------------------ STAGING
  MM3.rooms.staging = () => MM3.autoRoom('staging', {
    wallY: WY, lights: WH,
    shell(K, g, ctx) {
      const E = shell(K, g, ctx, { wall: '#4f535e', floor: '#8c8c84', seed: 6 }), { mat, box } = K, Y = mat('#e2bd24');
      for (let l = 0; l < 4; l++) {   // four painted staging lanes: A (back row) and B (front row)
        const x = 10 + l * 76;
        for (const [z0, z1] of [[80, 100], [112, 132]]) { box(g, x, x + 70, z0, z0 + 1, .02, .12, Y, { cast: false }); box(g, x, x + 70, z1 - 1, z1, .02, .12, Y, { cast: false }); box(g, x, x + 1, z0, z1, .02, .12, Y, { cast: false }); box(g, x + 69, x + 70, z0, z1, .02, .12, Y, { cast: false }); }
        E.sign(g, { x: x + 35, z: WY + .6, h: 62, w: 28, hh: 7, text: 'LANE ' + 'ABCD'[l], bg: '#2a2c32', fg: '#e2bd24', border: false });
      }
      box(g, 10, 310, 134, 136, .02, .1, Y, { cast: false });
      for (let x = 12; x < 300; x += 20) box(g, x, x + 8, 138, 144, .02, .08, mat('#a8a8a0'), { cast: false });
      for (const dx of [0, 312]) for (let z = 100; z < 138; z += 8) box(g, dx, dx + 8, z, z + 4, .05, .15, Y, { cast: false });   // hazard ticks at the side exits
      E.bollard(g, 6, 94, 12); E.bollard(g, 314, 94, 12);
    },
    props: Object.assign({
      plan_board(K) {
        const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group(), clear = F('staging_empty');
        box(g, 9, 71, WY + .6, WY + 2, 41, 69, mat('#8a8e96'));
        E.sign(g, { x: 40, z: WY + 2.1, h: 55, w: 58, hh: 26, border: false, bg: '#f0f0ea', fg: clear ? '#2fa04a' : '#b83a32', size: 6, text: clear ? ['STAGING: CLEAR', '', '8 shipped / 8 stored'] : ['STAGING: OCCUPIED', 'by INBOUND freight', 'outbound cannot stage'] });
        return g;
      },
      bowl3(K) { const { T, mat, box } = K, g = new T.Group(); box(g, 23, 29, 130, 136, 0, 2.4, mat('#c8cdd2')); box(g, 24, 28, 131, 135, 2.4, 2.9, mat('#9a6a3a')); return g; }
    }, (() => {
      const o = {}; PAL.forEach((q) => {
        o['pal_' + q.code] = (K, p) => {
          const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group(), x = p.r[0], bot = p.r[1] + p.r[3];
          const top = E.loadedPallet(g, x, x + 32, bot - 11, bot, 0, q.col, 17, q.code.charCodeAt(1));
          if (q.dot) box(g, x + 24, x + 29, bot + .1, bot + .7, 12, 17, mat(q.dot === 'o' ? '#e08020' : '#2f5fb0'), { cast: false });
          E.sign(g, { x: x + 16, z: bot + .15, h: 9, w: 11, hh: 6, text: q.code, bg: '#f2f2ee', fg: '#222', off: 0 });
          return g;
        }; }); return o;
    })()),
    hide: ['bowl_x']
  });

  // ------------------------------------------------------------------------------------------------ PARTS / CAGE
  MM3.rooms.parts = () => MM3.autoRoom('parts', {
    wallY: WY, lights: WH,
    shell(K, g, ctx) {
      const E = shell(K, g, ctx, { wall: '#5a5e68', floor: '#84847c', seed: 7 }), { mat, box } = K;
      for (let i = 0; i < 4; i++) E.rack(g, { x0: 12 + i * 58, x1: 64 + i * 58, z0: WY + 1, z1: WY + 9, H: 54, levels: 4, bays: 2, seed: 40 + i, load: .9 });
      for (let x = 12; x < 64; x += 52) E.sign(g, { x: 38, z: WY + 9.2, h: 57, w: 20, hh: 4, text: 'PARTS', bg: '#2f5fb0', fg: '#fff', size: 4, off: 0 });
      E.bollard(g, 6, 128, 14); E.bollard(g, 312, 128, 14);
      box(g, 140, 200, 138, 144, .05, .2, mat('#2c2c30'), { cast: false });
    },
    props: {
      bins() { return null; },
      h17(K) { const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group(); box(g, 76, 96, WY + 9.4, WY + 15, 22, 36, mat('#2f5fb0')); E.sign(g, { x: 86, z: WY + 15.1, h: 29, w: 14, hh: 5, text: 'H-17', bg: '#2f5fb0', fg: '#fff', border: false, off: 0 }); return g; },
      cage(K, p, ctx) {   // wire-mesh maintenance cage: posts, bars, locked gate; Tucker (state) is rendered by the engine NPC rig
        const { T, mat, box } = K, g = new T.Group(), st = mat('#6a7078', { metalness: .4 }); const x0 = 238, x1 = 314, z0 = 84, z1 = 98;
        box(g, x0, x1, z0, z1, 0, .4, mat('#3a3c42'), { cast: false });
        for (let x = x0; x <= x1; x += 4) { box(g, x, x + .8, z1 - .8, z1, 0, 50, st); box(g, x, x + .8, z0, z0 + .8, 0, 50, st); }
        for (let h = 0; h <= 50; h += 8) { box(g, x0, x1, z1 - .8, z1, h, h + .8, st); box(g, x0, x1, z0, z0 + .8, h, h + .8, st); }
        box(g, x0, x1, z0, z1, 50, 51, st); box(g, x0, x0 + .8, z0, z1, 0, 50, st); box(g, x1 - .8, x1, z0, z1, 0, 50, st);
        box(g, 262, 274, z1 - 1, z1 + 1.4, 20, 26, mat('#c8a820', { metalness: .6 }));  // padlock hasp
        E_crate(K, g, 246, 258, 86, 94, 0, 14); E_crate(K, g, 292, 308, 88, 96, 0, 10);
        return g;
      },
      seal_bell(K) { const { T, mat, box } = K, g = new T.Group(); box(g, 180, 190, 100, 108, 0, 1.6, mat('#e2bd24')); box(g, 183, 187, 102, 106, 1.6, 4.2, mat('#e2bd24', { metalness: .6 })); return g; }
    },
    hide: []
  });
  function E_crate(K, g, x0, x1, z0, z1, h0, h1) { MM3.envKit(K).crate(g, x0, x1, z0, z1, h0, h1); }

  // ------------------------------------------------------------------------------------------------ CHARGING
  MM3.rooms.charging = () => MM3.autoRoom('charging', {
    wallY: WY, lights: WH,
    shell(K, g, ctx) {
      const E = shell(K, g, ctx, { wall: '#585c66', floor: '#8a8a82', seed: 8, blots: [[100, 60, 30, .3, '30,50,20'], [200, 50, 26, .25, '40,40,20']] }), { mat, box, emi } = K;
      E.cableTray(g, -10, 330, WY + 1, 58);
      const leds = [];
      for (let i = 0; i < 5; i++) {   // five battery charger cabinets with status LEDs
        const x = 20 + i * 60; box(g, x, x + 30, WY + 1, WY + 9, 4, 42, mat('#6a6e76')); box(g, x + 3, x + 27, WY + 9, WY + 9.5, 26, 38, mat('#101216')); box(g, x + 6, x + 24, WY + 9, WY + 9.6, 6, 22, mat('#4a4e56'));
        K.keep(true); leds.push([box(g, x + 6, x + 10, WY + 9.5, WY + 10.1, 28, 34, emi(i % 2 ? '#3aff6a' : '#ff3a2a', 1.3), { cast: false }), box(g, x + 12, x + 16, WY + 9.5, WY + 10.1, 28, 34, emi('#e2bd24', 1.3), { cast: false })]); K.keep(false);
        box(g, x + 4, x + 7, WY + 9, WY + 16, 0, 12, mat('#2a2c32'));   // cable stub
      }
      ctx.anim.push((t) => { leds.forEach(([a, b], i) => { a.visible = Math.sin(t * 2 + i) > -.6; b.visible = Math.sin(t * 3 + i * 2) > 0; }); });
      for (const x of [14, 296]) E.bollard(g, x, 134, 14);
    },
    props: {
      charger() { return null; },
      hook(K) { const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group(); box(g, 98, 118, WY + 1, WY + 2, 26, 44, mat('#6a4a2a')); if (!F('took_cagekey')) { box(g, 103, 106, WY + 2, WY + 2.8, 30, 38, mat('#e2bd24', { metalness: .6 })); box(g, 102, 107, WY + 2, WY + 2.8, 38, 41, mat('#e2bd24', { metalness: .6 })); } E.sign(g, { x: 108, z: WY + 2.1, h: 44.8, w: 14, hh: 3, text: 'CAGE', bg: '#6a4a2a', fg: '#fff', border: false, size: 4 }); return g; },
      f_old(K, p, ctx) { const E = MM3.envKit(K), g = new K.T.Group(); E.forklift(g, { x: 212, z: 110, dir: -1, type: 'propane', ctx }); E.sign(g, { x: 220, z: 117, h: 12, w: 9, hh: 3, text: 'P-114', bg: '#101114', fg: '#e2bd24', size: 5, off: 0 }); return g; },
      sign_lockout(K) { const E = MM3.envKit(K), g = new K.T.Group(); E.sign(g, { x: 280, z: WY + 1.2, h: 16, w: 38, hh: 12, text: ['LOCKOUT /', 'TAGOUT'], bg: '#e2bd24', fg: '#b83a32', size: 7 }); return g; }
    },
    hide: []
  });

  // ------------------------------------------------------------------------------------------------ RACKS
  MM3.rooms.racks = () => MM3.autoRoom('racks', {
    wallY: WY, lights: WH,
    shell(K, g, ctx) {
      const E = shell(K, g, ctx, { wall: '#4f535e', floor: '#84847c', seed: 9, stripes: [{ z: 124 - WY, w: 1.2, color: '#e2bd24' }, { z: 138 - WY, w: 2, color: '#e2bd24', dash: 8 }] }), { mat, box } = K;
      for (let i = 0; i < 5; i++) { if (i === 2) continue; E.rack(g, { x0: 8 + i * 62, x1: 64 + i * 62, z0: WY + 1, z1: WY + 9, H: 64, levels: 4, bays: 2, seed: 60 + i, load: .8 }); }
      E.sign(g, { x: 190, z: WY + 9.2, h: 70, w: 42, hh: 8, text: 'MAX LOAD 4000 LB', bg: '#e2bd24', fg: '#1a1a1a', size: 6, off: 0 });
      box(g, 230, 316, 100, 116, .02, .1, mat('#a8a8a0'), { cast: false });                                   // painted storage slots
      for (let i = 0; i < 4; i++) { box(g, 232 + i * 19, 233 + i * 19, 100, 116, .02, .12, mat('#e2bd24'), { cast: false }); }
    },
    props: {
      rack14(K) {   // rack 14: the gap in the line (state: opens onto the tunnel after tunnel_found)
        const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group();
        box(g, 138, 142, WY + 1, WY + 9, 0, 56, mat(E.C.blue)); box(g, 160, 164, WY + 1, WY + 9, 0, 56, mat(E.C.blue));
        box(g, 140, 162, WY + .9, WY + 1.4, 0, 52, mat('#050506'), { cast: false });
        E.sign(g, { x: 151, z: WY + 9.2, h: 59, w: 10, hh: 5, text: '14', bg: '#101114', fg: '#e2bd24', size: 8, off: 0 });
        return g;
      },
      storage(K, p, ctx, S) {   // stored (sorted) pallets from the staging puzzle, in painted slots
        const E = MM3.envKit(K), g = new K.T.Group(); const list = PAL.filter((q) => S.pal && S.pal[q.code] === 'store');
        list.slice(0, 8).forEach((q, i) => E.loadedPallet(g, 234 + (i % 4) * 19, 248 + (i % 4) * 19, 102 + Math.floor(i / 4) * 0 + 0, 114, 0, q.col, 9, i + 2));
        return g;
      },
      sign14() { return null; },
    },
    extra(K, S) {   // rack 14 is a gap until the tunnel is found; afterwards the rack stands again with a dark service opening
      if (!F('tunnel_found')) return null; const E = MM3.envKit(K), g = new K.T.Group();
      E.rack(g, { x0: 132, x1: 188, z0: WY + 1, z1: WY + 9, H: 64, levels: 4, bays: 2, seed: 62, load: .8 }); K.box(g, 143, 159, WY + 9.1, WY + 9.5, 0, 52, K.mat('#050506'), { cast: false }); return g;
    },
    hide: ['biscuit']
  });

  // ------------------------------------------------------------------------------------------------ TUNNEL
  const TUN = { hemi: ['#8a9ac0', '#50505a', .45], key: { color: '#c8d8ff', intensity: .45, pos: [40, 230, 215], target: [170, 0, 100] }, clear: 0x06060a, points: [{ pos: [160, 70, 110], color: '#ffe8b0', intensity: .5, distance: 190, decay: 1.2 }, { pos: [40, 40, 118], color: '#ffd890', intensity: .25, distance: 110, decay: 1.4 }, { pos: [280, 40, 118], color: '#ffd890', intensity: .25, distance: 110, decay: 1.4 }] };
  MM3.rooms.tunnel = () => MM3.autoRoom('tunnel', {
    wallY: 104, lights: TUN,
    shell(K, g, ctx) {
      const E = MM3.envKit(K), { mat, box, emi } = K, WT = 104;
      E.floor(g, { x0: -10, x1: 330, z0: WT, z1: 150, base: '#1c1c20', seed: 12, joints: 30, rough: .9, blots: [[160, 18, 40, .3, '60,50,30'], [60, 30, 20, .3, '10,10,10']] });
      E.wall(g, { x0: -10, x1: 330, z: WT, H: 104, base: '#12121a', block: 8, topDark: .5, botDirt: .35, seed: 13, noise: 260 });
      for (let x = 0; x < 330; x += 32) { box(g, x, x + 3, WT, WT + 4, 0, 100, mat('#1c1c26')); }                      // ribs
      E.pipe(g, -10, 330, WT + 2.5, 92, 2.2, '#4a4a54'); E.pipe(g, -10, 330, WT + 2.5, 80, 1.4, '#6a5040'); E.cableTray(g, -10, 330, WT + .5, 66);
      K.keep(true); const bulbs = []; for (const x of [40, 160, 280]) { box(g, x - 6, x + 6, WT + 4, WT + 8, 94, 97, mat('#2a2a30')); bulbs.push(box(g, x - 4, x + 4, WT + 8, WT + 9, 94.4, 96.6, emi('#ffe0a0', 1.4), { cast: false })); } K.keep(false);
      ctx.anim.push((t) => { bulbs.forEach((b, i) => { b.material.emissiveIntensity = Math.sin(t * 17 + i * 3) > .92 ? .3 : 1.3; }); });
      box(g, 0, 10, WT, WT + 3, 0, 40, mat('#1a1a22')); box(g, 308, 320, WT, WT + 3, 0, 40, mat('#1a1a22'));         // end doorways
    },
    props: {
      graffiti(K) { const E = MM3.envKit(K), g = new K.T.Group(); E.sign(g, { x: 105, z: 105, h: 66, w: 90, hh: 22, text: ['PRUDENCE WAS HERE', '(officially)'], bg: '#1a1a22', fg: '#c08040', border: false, size: 12, off: 0 }); return g; },
      conv9(K, p, ctx) {   // conveyor 9: belt with rollers, running when its flag says so (visual only)
        const { T, mat, box } = K, g = new T.Group(); box(g, 0, 320, 106, 124, 3, 5, mat('#2a2a30'));
        K.keep(true); const rolls = []; for (let x = 4; x < 320; x += 8) rolls.push(box(g, x, x + 3, 106.5, 123.5, 5, 6.4, mat(x % 16 ? '#5a5e66' : '#3a3e46'))); K.keep(false);
        for (let x = 0; x < 320; x += 40) box(g, x, x + 2, 106, 124, 0, 3, mat('#3a3a44')); box(g, 0, 320, 106, 107, 5, 9, mat('#c8a820')); box(g, 0, 320, 123, 124, 5, 8, mat('#c8a820'));
        return g;
      },
      mug(K) { const { T, mat, box } = K, g = new T.Group(); box(g, 236, 242, 104, 110, 8, 14, mat('#f0f0ea')); box(g, 242, 244, 106, 108, 9, 12, mat('#f0f0ea')); return g; }
    },
    hide: []
  });
})();
