'use strict';
// THREE ROOMS: LOCKER ROOM, REGIONAL SUITE (shell for the HALO climax effects in suite.js), REMOTE RT-77 CALL, GORDON CALL.
// Hand-modelled on the environment kit; state read-only from G.S.f / G.callWho.
window.MM3 = window.MM3 || { rooms: {} };
(function () {
  const F = (k) => !!(G.S.f && G.S.f[k]);
  const OFFICE = { hemi: ['#eaf0ff', '#a4a49a', .9], key: { color: '#f6f9ff', intensity: .85, pos: [40, 230, 215], target: [170, 0, 100] }, clear: 0x121418, points: [60, 200].map(x => ({ pos: [x, 80, 104], color: '#e8f4ff', intensity: .26, distance: 140, decay: 1.4 })) };
  function officeShell(K, g, ctx, o) {
    const E = MM3.envKit(K), { mat, box } = K, WY = o.WY || 83;
    E.floor(g, { x0: -10, x1: 330, z0: WY, z1: 150, base: o.floor, tile: o.tile || 0, c1: o.c1, c2: o.c2, seed: o.seed, noise: 360, rough: .9, scan: o.scan });
    E.wall(g, { x0: -10, x1: 330, z: WY, H: WY, base: o.wall, topDark: .15, botDirt: .12, seed: o.seed, wain: { color: o.wain || '#6a6250', h: 14 }, base2: '#3a3630', scan: o.scan });
    return E;
  }
  const keep = (K, f) => { K.keep(true); const r = f(); K.keep(false); return r; };

  // ------------------------------------------------------------------------------------------------ LOCKERS
  MM3.rooms.lockers = () => MM3.autoRoom('lockers', {
    wallY: 83, lights: OFFICE,
    shell(K, g, ctx) {
      const E = officeShell(K, g, ctx, { wall: '#a8b0b0', floor: '#6a6a70', tile: 20, c1: '#6e6e74', c2: '#64646a', wain: '#5a6a6a', seed: 15 }), { mat, box } = K;
      for (const x of [20, 140, 260]) E.fixture(g, ctx, x, 89, 78, 34);
      // wall of extra lockers (grey bank behind the numbered ones) + HR door + time clock housing
      E.lockerBank(g, { x0: 80, n: 5, w: 12, z: 84, H: 34, d: 7, colors: ['#8a9098', '#7a8088'] });
      E.door(g, { x0: 250, x1: 278, z: 83, H: 44, color: '#5a4a3a', glass: true });
      E.sign(g, { x: 264, z: 86.6, h: 50, w: 14, hh: 5, text: 'H R', bg: '#2a2c32', fg: '#e8e8e2', border: false, size: 6 });
      box(g, 0, 11, 90, 140, .05, .15, mat('#2c2c30'), { cast: false }); box(g, 309, 320, 90, 140, .05, .15, mat('#2c2c30'), { cast: false });   // doorway mats (break / floor)
      E.sign(g, { x: 5, z: 120, h: 28, w: 8, hh: 5, text: 'BREAK', bg: '#2a2c32', fg: '#e8e8e2', border: false, size: 3, off: 0 });
    },
    props: (() => {
      const locker = (x, col, open, extra) => (K, p) => {
        const { T, mat, box } = K, g = new T.Group(); box(g, x, x + 12, 83.5, 91, 0, 34, mat(col)); box(g, x - .3, x + 12.3, 83.5, 91, 34, 35, mat('#6c727a'));
        if (open) { box(g, x + 1, x + 11, 91, 91.4, 1, 33, mat('#08080a'), { cast: false }); box(g, x + 12, x + 12.8, 91, 97, 1, 33, mat(col)); if (extra) extra(g, x, mat, box); }
        else { box(g, x + 2, x + 10, 91, 91.4, 24, 31, mat('#161a1e')); for (let k = 0; k < 3; k++) box(g, x + 3, x + 9, 91, 91.3, 26 + k * 1.2, 26.6 + k * 1.2, mat('#2a2e34'), { cast: false }); box(g, x + 9, x + 10.5, 91, 92, 14, 18, mat('#c8a820', { metalness: .6 })); if (extra) extra(g, x, mat, box, true); }
        return g;
      };
      const tag = (x, mat, box) => { box(g0, 0, 0, 0, 0, 0, 0, mat('#000')); }; const g0 = null;
      return {
        locker114: locker(24, '#8a9098', F('locker_open')), lockerD: (K, p) => { const m = locker(38, '#8a9098', F('dlocker_open'), (g, x, mat, box) => box(g, 40, 48, 91.1, 91.6, 26, 31, mat('#e08020'), { cast: false }))(K, p); return m; },
        lockerX: locker(52, '#8a9098', false), lockerO: locker(66, '#8a6a5a', false),
        timeclock(K) { const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group(); box(g, 150, 184, 84, 88, 10, 28, mat('#16181c')); E.sign(g, { x: 167, z: 88.1, h: 25, w: 30, hh: 4, text: 'TIME CLOCK', bg: '#2a2c32', fg: '#e8e8e2', border: false, size: 5, off: 0 }); E.sign(g, { x: 167, z: 88.2, h: 17, w: 18, hh: 8, text: 'IN', bg: '#0a2a14', fg: '#3aff6a', glow: .6, border: false, size: 9, off: 0 }); box(g, 150, 184, 88, 91, 6, 10, mat('#2a2c32')); return g; },
        bench(K) { const E = MM3.envKit(K), g = new K.T.Group(); E.bench(g, 90, 160, 96, 106, 9); return g; },
        lostfound(K) { const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group(); E.crate(g, 200, 228, 104, 116, 0, 12, '#9a7040'); E.sign(g, { x: 214, z: 116.2, h: 6, w: 22, hh: 4, text: 'LOST&FOUND', bg: '#cba06a', fg: '#222', border: false, size: 5, off: 0 }); if (!F('lf_taken')) box(g, 204, 222, 106, 112, 12, 16, mat('#d430a0')); return g; }
      };
    })(),
    hide: ['prudence']
  });

  // ------------------------------------------------------------------------------------------------ SUITE (HALO)
  MM3.suiteSpec = {
    wallY: 83, lights: { hemi: ['#e4ecff', '#8a8aa0', .9], key: { color: '#f2f6ff', intensity: .82, pos: [60, 230, 215], target: [170, 0, 100] }, clear: 0x0c0c14, points: [{ pos: [160, 70, 110], color: '#dff0ff', intensity: .3, distance: 220, decay: 1.2 }] },
    shell(K, g, ctx) {
      const E = officeShell(K, g, ctx, { wall: '#d0ccdc', floor: '#1a1a2a', wain: '#4a4860', seed: 16 }), { mat, box, emi } = K;
      for (const x of [20, 140, 260]) E.fixture(g, ctx, x, 89, 78, 34);
      box(g, 56, 264, 83.4, 90, 20, 84, mat('#101216'), { cast: true });                          // HALO video wall housing (front face z=90, h 22..82)
      box(g, 60, 260, 90, 90.5, 22, 80, mat('#061a14'), { cast: false });
      for (let i = 0; i < 8; i++) E.sign(g, { x: 244, z: 90.6, h: 75 - i * 6, w: 20, hh: 4, text: '100%', bg: '#061a14', fg: '#3aff7a', border: false, size: 6, glow: .5, off: 0 });
      K.keep(true); ctx.bars0 = []; for (let i = 0; i < 8; i++) ctx.bars0.push(box(g, 70, 71, 90.7, 91.4, 75 - i * 6 - 3, 75 - i * 6, emi('#3aff7a', 1.2), { cast: false })); K.keep(false);
      ctx.anim.push((t, S) => ctx.bars0.forEach((b, i) => { const w = 30 + ((Math.sin(t * .7 + i) + 1) * 40 | 0); b.scale.x = w; b.position.x = 70 + w / 2; }));
      box(g, 56, 264, 83, 86, 0, 3, mat('#2a2a3a'));
      box(g, 0, 10, 100, 142, .05, .15, mat('#2c2c30'), { cast: false }); box(g, 310, 320, 100, 142, .05, .15, mat('#2c2c30'), { cast: false });
    },
    props: {
      wall() { return null; },
      table2(K) {   // conference table with six chairs behind it (HALO ring)
        const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group(); E.table(g, 110, 210, 94, 118, 12, '#6a4a2a'); box(g, 110, 210, 94, 102, 12, 12.6, mat('#1a1a2a'));
        for (let i = 0; i < 6; i++) E.chair(g, 122 + i * 16, 90, 0, '#3a3a4a'); return g;
      }
    },
    hide: ['harrow']
  };
  // the remaining rooms rely on the generic engine NPC rigs for their characters

  // ------------------------------------------------------------------------------------------------ REMOTE (RT-77 call)
  MM3.rooms.remote = () => MM3.autoRoom('remote', {
    wallY: 60, lights: Object.assign({}, MM3.THEMES.outdoor, { clear: 0xa0b8c8 }),
    shell(K, g, ctx) {
      const E = MM3.envKit(K), { T, mat, box } = K, WY = 60;
      E.floor(g, { x0: -10, x1: 330, z0: WY, z1: 150, base: '#7a6a58', seed: 51, noise: 700, rough: .95, scan: true, blots: [[200, 60, 40, .25, '30,20,10']] });
      E.wall(g, { x0: -10, x1: 330, z: WY, H: 6, base: '#585858', seed: 52, scan: true });
      box(g, 20, 120, 60, 64, 0, 34, mat('#787c88')); box(g, 24, 44, 63.8, 64.4, 0, 26, mat('#4a4a54')); box(g, 18, 122, 60, 64, 34, 36, mat('#4a4e56'));     // warehouse annex
      E.sign(g, { x: 80, z: 64.1, h: 22, w: 48, hh: 6, text: 'REMOTE YARD 7', bg: '#2a2c32', fg: '#e2bd24', border: false, size: 5, off: 0 });
      box(g, 0, 320, 0.01, 0.02, 0, 0, mat('#000'), { cast: false });
      for (const [x, h] of [[0, 143], [0, 0]]) { }
      box(g, 0, 320, 142, 144, 0, 1, mat('#2a2a2a'), { cast: false });                    // video-call frame bars
    },
    extra(K, S, ctx) { const E = MM3.envKit(K), g = new K.T.Group(); E.forklift(g, { x: 200, z: 116, dir: -1, type: 'reach', ctx }); E.sign(g, { x: 200, z: 123, h: 24, w: 14, hh: 4, text: 'RT-77', bg: '#101114', fg: '#e2bd24', size: 6, off: 0 }); return g; },
    props: {}, hide: ['ozzie']
  });

  // ------------------------------------------------------------------------------------------------ GORDON CALL
  MM3.rooms.gordoncall = () => MM3.autoRoom('gordoncall', {
    wallY: 90, lights: MM3.THEMES.dark,
    shell(K, g, ctx) {
      const E = MM3.envKit(K), { T, mat, box } = K, WY = 90;
      E.floor(g, { x0: -10, x1: 330, z0: WY, z1: 150, base: '#3a3a40', seed: 61, noise: 300, rough: .9, scan: true, stripes: [{ z: 12, w: 8, color: '#e2bd24', dash: 26 }] });
      E.wall(g, { x0: -10, x1: 330, z: WY, H: 90, base: '#5a7a9a', seed: 62, scan: true, topDark: .1 });
      for (let i = 0; i < 6; i++) E.window(g, 20 + i * 50 + 4, 20 + i * 50 + 36, WY, 24, 58, '#789');
      box(g, -10, 330, 0, 0, 0, 0, mat('#000'), { cast: false });
    },
    extra(K, S, ctx) {   // banner: depends on who is calling and whether the shipment has departed
      const E = MM3.envKit(K), g = new K.T.Group(), rescue = G.callWho === 'rescue', dep = F('departed');
      E.sign(g, { x: 160, z: 90.8, h: 78, w: 150, hh: 20, border: false, bg: '#0a1218', fg: rescue ? '#3aff6a' : dep ? '#3aff6a' : '#ff3a2a', glow: .4, size: 12, text: rescue ? ['WHISKER RIDGE CAT RESCUE', 'INTAKE: OPEN — LARGE GROUPS WELCOME'] : [dep ? 'LINE 3 — PARTS INBOUND' : 'LINE 3 — DOWN (waiting on parts)', dep ? 'PRODUCTION: RESTARTING' : 'PRODUCTION: STALLED'] });
      return g;
    },
    props: {}, hide: ['gordon']
  });
})();
