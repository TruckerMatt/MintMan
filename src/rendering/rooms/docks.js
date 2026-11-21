'use strict';
// THREE ROOMS: INBOUND DOCKS, OUTBOUND DOCKS (hand-modelled dock family). Doors, trailers, dock lights, load boards, queue pallets.
// State (door9_closed, t9022_at_dock, departed, dockLight, labels_running, sorted pallets...) is read in extra()/props so a state change rebuilds them.
window.MM3 = window.MM3 || { rooms: {} };
(function () {
  const F = (k) => !!(G.S.f && G.S.f[k]);
  const WY = 80;
  const WH = { hemi: ['#d8e2ff', '#9a9680', .85], key: { color: '#f0f5ff', intensity: .9, pos: [40, 230, 215], target: [170, 0, 100] }, clear: 0x101216, points: [40, 160, 280].map(x => ({ pos: [x, 90, 104], color: '#e4f6f0', intensity: .3, distance: 150, decay: 1.4 })) };
  function shell(K, g, ctx, seed) {
    const E = MM3.envKit(K), { mat, box } = K;
    E.floor(g, { x0: -10, x1: 330, z0: WY, z1: 150, base: '#8a8a82', seed, joints: 40, rough: .8, stripes: [{ z: 124 - WY, w: 1.2, color: '#e2bd24' }, { z: 138 - WY, w: 2, color: '#e2bd24', dash: 8 }], blots: [[60, 40, 26, .25], [200, 50, 22, .2, '60,40,20'], [270, 30, 24, .16]] });
    E.wall(g, { x0: -10, x1: 330, z: WY, H: 80, base: '#585c68', panels: 6, topDark: .35, botDirt: .3, seed });
    E.truss(g, -10, 330, WY + 3, 77.5); for (const x of [20, 100, 180, 260]) E.fixture(g, ctx, x, WY + 6, 73, 36);
    return E;
  }
  // rear of a backed-in trailer standing in a dock opening (open rear doors, interior dark, bumper chocks)
  function rearTrailer(K, g, x0, x1, label, col) {
    const E = MM3.envKit(K), { mat, box } = K, C = E.C;
    box(g, x0 - 1, x1 + 1, WY + 1, WY + 7, 3, 35, mat(col || '#d8dcdf')); box(g, x0 + 1, x1 - 1, WY + 7, WY + 7.4, 5, 33, mat('#101114'), { cast: false });
    for (let h = 8; h < 33; h += 6) box(g, x0 - 1, x1 + 1, WY + 6.8, WY + 7.6, h, h + .6, mat('#8a9096'), { cast: false });
    box(g, x0 - 3, x0, WY + 5, WY + 9, 3, 35, mat('#a8adb2')); box(g, x1, x1 + 3, WY + 5, WY + 9, 3, 35, mat('#a8adb2'));                 // opened rear doors
    box(g, x0 + 4, x1 - 4, WY + 6, WY + 10, 0, 3, mat('#17181b')); E.sign(g, { x: (x0 + x1) / 2, z: WY + 7.6, h: 36.5, w: Math.min(30, x1 - x0), hh: 4, text: label, bg: '#f2f2ee', fg: '#222', border: false, size: 5, off: 0 });
  }
  function doorLight(K, g, x, h, col, ctx, lit) {
    const { mat, box, emi } = K; box(g, x - 7, x + 7, WY + .6, WY + 2, h, h + 6, mat('#101114'));
    for (const [i, c] of [['red', '#ff3a2a'], ['yellow', '#e2bd24'], ['green', '#3aff6a']].map((a, i) => [i, a[1]])) { K.keep(true); box(g, x - 6 + i * 4, x - 3 + i * 4, WY + 2, WY + 2.5, h + 1.5, h + 4.5, lit === ['red', 'yellow', 'green'][i] ? emi(c, 1.6) : mat('#2a2a2a'), { cast: false }); K.keep(false); }
  }

  // ------------------------------------------------------------------------------------------------ INBOUND
  MM3.rooms.inbound = () => MM3.autoRoom('inbound', {
    wallY: WY, lights: WH,
    shell(K, g, ctx) {
      const E = shell(K, g, ctx, 20), { mat, box } = K;
      for (let i = 0; i < 3; i++) { const x = 20 + i * 70; E.dockDoor(g, ctx, { x0: x, x1: x + 44, z: WY, H: 44, open: true }); box(g, x, x + 44, WY + 5, WY + 12, .05, .2, mat('#e2bd24'), { cast: false }); E.sign(g, { x: x + 22, z: WY + 5.2, h: 51, w: 26, hh: 6, text: 'DOOR ' + (i * 2 + 2), bg: '#2a2c32', fg: '#e2bd24', border: false, size: 6 }); }
      E.bollard(g, 8, 130, 14); E.bollard(g, 312, 130, 14);
      for (let x = 130; x < 190; x += 8) box(g, x, x + 4, 138, 144, .05, .2, mat('#e2bd24'), { cast: false });
      for (let z = 100; z < 138; z += 8) box(g, 312, 320, z, z + 4, .05, .15, mat('#e2bd24'), { cast: false });
    },
    extra(K, S, ctx) {
      const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group(), C = E.C;
      rearTrailer(K, g, 24, 58, 'T-4417'); rearTrailer(K, g, 164, 198, 'T-4418');
      if (!F('door9_closed')) { box(g, 250, 294, WY + .4, WY + 1, 0, 46, mat('#050506'), { cast: false }); box(g, 247, 250, WY, WY + 5, 0, 49, mat(C.yellow)); box(g, 294, 297, WY, WY + 5, 0, 49, mat(C.yellow)); box(g, 247, 297, WY, WY + 5, 46, 49, mat(C.yellow)); }
      else { box(g, 247, 297, WY, WY + 5, 0, 49, mat(C.yellow)); box(g, 250, 294, WY + 1, WY + 2.4, 0, 46, mat('#8a8e96')); for (let h = 4; h < 46; h += 6) box(g, 250, 294, WY + 2.4, WY + 2.8, h, h + .8, mat('#6a6e76'), { cast: false }); }
      E.sign(g, { x: 272, z: WY + 5.2, h: 53, w: 26, hh: 6, text: 'DOOR 9', bg: '#2a2c32', fg: '#e2bd24', border: false, size: 6 });
      return g;
    },
    props: {
      t4417() { return null; }, t4418() { return null; }, door9() { return null; },
      lprinter(K) {
        const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group(); box(g, 106, 136, 88, 98, 0, 8, mat('#6a6e76')); E.printer(g, null, 110, 132, 89, 97, 8, true);
        if (F('labels_stopped')) for (let k = 0; k < 10; k++) box(g, 100 + k * 4, 103 + k * 4, 130 + (k % 2) * 3, 134 + (k % 2) * 3, 0, .3, mat('#f2f2ee'), { cast: false });
        return g;
      },
      clip(K) { const { T, mat, box } = K, g = new T.Group(); box(g, 60, 80, 90, 98, 0, 12, mat('#6a4a2a')); box(g, 62, 78, 90.5, 97.5, 12, 12.6, mat('#d8d4c4')); box(g, 64, 76, 91, 97, 12.6, 13.2, mat('#f2f2ee')); return g; },
      seal(K) { const { T, mat, box } = K, g = new T.Group(); box(g, 210, 232, 114, 118, 0, 1, mat('#222')); box(g, 216, 220, 112, 114, 0, 1.2, mat('#b83a32')); box(g, 224, 227, 112, 114, 0, 1.2, mat('#b83a32')); return g; }
    },
    hide: ['tucker_lbl']
  });

  // ------------------------------------------------------------------------------------------------ OUTBOUND
  MM3.rooms.outbound = () => MM3.autoRoom('outbound', {
    wallY: WY, lights: WH,
    shell(K, g, ctx) {
      const E = shell(K, g, ctx, 21), { mat, box } = K;
      for (let i = 0; i < 4; i++) { const x = 40 + i * 66; E.dockDoor(g, ctx, { x0: x, x1: x + 44, z: WY, H: 44, open: true }); box(g, x, x + 44, WY + 5, WY + 12, .05, .2, mat('#e2bd24'), { cast: false }); E.sign(g, { x: x + 22, z: WY + 5.2, h: 51, w: 26, hh: 6, text: 'DOOR ' + (i + 1), bg: '#2a2c32', fg: '#e2bd24', border: false, size: 6 }); }
      E.bollard(g, 6, 134, 14);
      for (let x = 130; x < 230; x += 8) box(g, x, x + 4, 138, 144, .05, .2, mat('#e2bd24'), { cast: false });
      for (let z = 96; z < 140; z += 8) { box(g, 0, 8, z, z + 4, .05, .15, mat('#e2bd24'), { cast: false }); }
    },
    extra(K, S, ctx) {   // state-dependent dock scene: trailer at door 3, dock status light
      const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group();
      if (F('t9022_at_dock') && !F('departed')) rearTrailer(K, g, 176, 210, 'T-9022', '#f0f0ee');
      const l = F('departed') ? 'red' : (G.dockLight || (F('t9022_at_dock') ? 'green' : 'red')); doorLight(K, g, 138, 56, l, ctx, l);
      return g;
    },
    props: {
      brokenjack(K) { const E = MM3.envKit(K), g = new K.T.Group(); E.palletJack(g, { x: 100, z: 120, dir: 1 }); K.box(g, 100, 110, 122, 124, .02, .1, K.mat('#1c1408'), { cast: false }); return g; },
      whiteout(K) {
        const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group(), sh = F('departed'), l8 = F('loaded8');
        for (const x of [224, 268]) box(g, x, x + 2, 100, 103, 0, 22, mat('#6a6e76')); box(g, 222, 272, 100, 102, 20, 40, mat('#9aa0a8'));
        E.sign(g, { x: 247, z: 102.1, h: 30, w: 46, hh: 18, border: false, bg: '#f0f0ea', fg: '#b83a32', size: 5, text: ['LOAD PLAN: KESTREL', 'DOOR 3 / T-9022', sh ? 'SHIPPED 11:59 ✓' : l8 ? '8 LOADS ✓' : '8 LOADS — ?'] }); return g;
      },
      door3() { return null; },
      queue(K, p, ctx, S) {
        const E = MM3.envKit(K), g = new K.T.Group(); PAL.filter((q) => S.pal && S.pal[q.code] === 'ship').forEach((q, i) => E.loadedPallet(g, 134 + (i % 4) * 14, 145 + (i % 4) * 14 - 2, 114 - Math.floor(i / 4) * 12, 124 - Math.floor(i / 4) * 12, 0, q.col, 9, i + 4)); return g;
      },
      wrapped(K) { const E = MM3.envKit(K), g = new K.T.Group(); E.wrapped(g, 10, 34, 112, 126, 0, 3, 8); return g; }
    },
    hide: ['bruno', 'torvald_dock', 'tucker_door', 'prudence_x']
  });
})();
