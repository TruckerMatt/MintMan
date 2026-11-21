'use strict';
// THREE ROOMS: SHIPPING OFFICE, OPERATIONS, HR, SECURED MANAGEMENT AREA (hand-modelled office family on the shared environment kit).
// NPC desks are modelled here (the NPC rigs themselves come from the engine's NPC props). State is only read from G.S.f.
window.MM3 = window.MM3 || { rooms: {} };
(function () {
  const F = (k) => !!(G.S.f && G.S.f[k]);
  const WY = 83;
  const LIGHT = { hemi: ['#eaf0ff', '#a4a49a', .9], key: { color: '#f6f9ff', intensity: .85, pos: [40, 230, 215], target: [170, 0, 100] }, clear: 0x121418, points: [60, 200].map(x => ({ pos: [x, 80, 104], color: '#e8f4ff', intensity: .26, distance: 140, decay: 1.4 })) };
  // common office shell: tile/carpet floor, painted wall + wainscot, ceiling light panels, doormat for the south exit
  function shell(K, g, ctx, o) {
    const E = MM3.envKit(K), C = E.C, { mat, box } = K;
    E.floor(g, { x0: -10, x1: 330, z0: WY, z1: 150, base: o.floor, tile: o.tile || 0, c1: o.c1, c2: o.c2, seed: o.seed || 2, noise: 360, rough: .9, blots: o.blots });
    E.wall(g, { x0: -10, x1: 330, z: WY, H: 83, base: o.wall, topDark: .15, botDirt: .12, seed: o.seed || 2, wain: { color: o.wain || '#6a6250', h: 14 }, base2: '#3a3630' });
    box(g, -10, 330, WY - .2, WY + 1, 80, 83, mat(o.trim || '#d4d0c0'), { cast: false });
    for (const x of [20, 140, 260]) { E.fixture(g, ctx, x, WY + 6, 78, 34); }
    if (o.mat !== false) { box(g, 140, 200, 138, 144, .05, .2, mat('#2c2c30'), { cast: false }); box(g, 142, 198, 139, 143, .2, .3, mat('#3a3a40'), { cast: false }); }
    return E;
  }
  const bustDesk = (K, g, x0, x1, z0, z1, h, col) => { const E = MM3.envKit(K); E.desk(g, x0, x1, z0, z1, h || 12); };

  MM3.rooms.shipoffice = () => MM3.autoRoom('shipoffice', {
    wallY: WY, lights: LIGHT,
    shell(K, g, ctx) {
      const E = shell(K, g, ctx, { wall: '#b4b8a6', floor: '#6a6a58', tile: 20, c1: '#6e6e5c', c2: '#64644f', wain: '#6a6250' }), { mat, box } = K, C = E.C;
      E.window(g, 200, 264, WY, 49, 70, '#7ab0d0'); E.trailer(g, { x0: 236, x1: 260, z0: WY + 2.5, z1: WY + 3, H: 14, y0: 50, color: '#cfd4d8', label: 'T-' });   // trailer glimpsed through the dock window
      E.cabinet(g, 24, 48, 86, 94, 34, 3);                                                            // filing cabinet
      E.cabinet(g, 52, 70, 88, 94, 28, 2);
      box(g, 180, 214, 84, 92, 0, 11, mat('#7a5a3a')); box(g, 179, 215, 83, 93, 11, 12, mat('#8a6a48'));  // counter under the terminal
      box(g, 228, 258, 84, 92, 0, 8, mat('#7a5a3a')); box(g, 227, 259, 83, 93, 8, 9, mat('#8a6a48'));     // counter under the printer
    },
    props: {
      board(K) {
        const E = MM3.envKit(K), { mat, box, T } = K, g = new T.Group();
        box(g, 29, 107, WY + .6, WY + 2, 31, 69, mat('#8a8e96'));
        E.sign(g, { x: 68, z: WY + 2.1, h: 50, w: 74, hh: 34, bg: '#f0f0ea', fg: '#1a1a1a', border: false, size: 6, text: ['DOOR  TRAILER  STATUS', '', '2  T-4417  UNLOADED*', '', '6  T-4418  UNLOADED*', '', 'DOOR 9  (BLANK)'] });
        return g;
      },
      cabinet() { return null; },
      terminal(K, p, ctx) {
        const E = MM3.envKit(K), { T } = K, g = new T.Group(); E.monitor(g, ctx, 196, 88, 12, { text: ['TERMINAL', 'READY_'], w: 14, h: 9 });
        K.keep(true); const led = E.printer; K.keep(false); return g;
      },
      printer(K) { const E = MM3.envKit(K), g = new K.T.Group(); E.printer(g, null, 232, 254, 85, 91, 9, true); return g; },
      phone(K) { const { T, mat, box } = K, g = new T.Group(); box(g, 168, 178, 88, 94, 12, 14.4, mat('#2a2c32')); box(g, 168, 172, 88.5, 93.5, 14.4, 15.6, mat('#2a2c32')); return g; },
      desk(K) { const E = MM3.envKit(K), g = new K.T.Group(); E.desk(g, 108, 174, 90, 104, 12); E.chair(g, 140, 114, 0, '#3a3e48'); return g; },
      plant(K) { const E = MM3.envKit(K), g = new K.T.Group(); E.plant(g, 276, 98, 1.1); return g; }
    },
    hide: ['ingrid']
  });

  MM3.rooms.ops = () => MM3.autoRoom('ops', {
    wallY: WY, lights: LIGHT,
    shell(K, g, ctx) {
      const E = shell(K, g, ctx, { wall: '#a0a8b8', floor: '#3a4a5a', tile: 20, c1: '#3e4e60', c2: '#36465a', wain: '#4a5266', seed: 5 }), { mat, box } = K;
      E.window(g, 200, 250, WY, 52, 70, '#7ab0d0');
      E.door(g, { x0: 280, x1: 310, z: WY, H: 43, color: '#5a5666', glass: false });                     // to management
      E.sign(g, { x: 295, z: WY + 3.6, h: 49, w: 28, hh: 5, text: 'MANAGEMENT', bg: '#2a2c32', fg: '#e8e8e2', border: false, size: 5 });
      box(g, 24, 58, WY + .2, WY + 1.4, 29, 31, mat('#6a6e76'));                                          // shelf under the dashboard
      box(g, 186, 216, 84, 90, 0, 11, mat('#6a5a46')); box(g, 185, 217, 83, 91, 11, 12, mat('#7a6a54'));   // binder counter
      box(g, 226, 258, 84, 92, 0, 8, mat('#6a5a46')); box(g, 225, 259, 83, 93, 8, 9, mat('#7a6a54'));     // printer counter
      bustDesk(K, g, 126, 186, 99, 110, 12); E.chair(g, 156, 118, 0, '#3a3e48');                            // Halvorsen's desk
    },
    props: {
      dash(K, p, ctx) {
        const E = MM3.envKit(K), { mat, box, emi, T } = K, g = new T.Group();
        box(g, 23, 125, WY + .6, WY + 3, 29, 75, mat('#101216')); box(g, 26, 122, WY + 3, WY + 3.6, 32, 72, mat('#08201a'));
        K.keep(true); const bars = []; for (let i = 0; i < 6; i++) bars.push(box(g, 31, 32, WY + 3.7, WY + 4.5, 71 - i * 6.4 - 3, 71 - i * 6.4, emi(i === 4 ? '#e2bd24' : '#3aff7a', 1.2), { cast: false })); K.keep(false);
        ctx.anim.push((t, S) => { bars.forEach((b, i) => { const w = 20 + ((Math.sin(t * .8 + i) + 1) * 30 | 0); b.scale.x = w; b.position.x = 31 + w / 2; }); });
        E.sign(g, { x: 108, z: WY + 3.8, h: 52, w: 24, hh: 38, text: ['100%', '100%', '100%', '100%', '100%', '100%'], bg: '#08201a', fg: '#3aff7a', glow: .5, border: false, size: 5 });
        return g;
      },
      form_printer(K) { const E = MM3.envKit(K), g = new K.T.Group(); E.printer(g, null, 232, 254, 85, 91, 9, !F('took_form')); return g; },
      binder(K) { const { T, mat, box } = K, g = new T.Group(); box(g, 190, 212, 85, 90, 12, 18, mat('#2f5fb0')); box(g, 190, 212, 85, 86, 12, 18, mat('#d8d8d0')); box(g, 192, 210, 85.2, 89.8, 18, 19.2, mat('#f0f0ea')); return g; },
      photo(K) { const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group(); box(g, 269, 297, WY + .6, WY + 2, 43, 64, mat('#5a4a32')); E.sign(g, { x: 283, z: WY + 2.1, h: 53.5, w: 22, hh: 16, text: ['DIRECTOR', 'EXCELLENCE'], bg: '#e8d8c0', fg: '#3a3a3a', border: false, size: 4 }); return g; },
      cat_prt(K) { const { T, mat, box } = K, g = new T.Group(); box(g, 188, 196, 86, 90, 12, 12.4, mat('#f2f2ee')); return g; }
    },
    hide: ['halvorsen', 'prudence_x']
  });

  MM3.rooms.hr = () => MM3.autoRoom('hr', {
    wallY: WY, lights: LIGHT,
    shell(K, g, ctx) {
      const E = shell(K, g, ctx, { wall: '#b0c4b8', floor: '#7a6a8a', tile: 20, c1: '#7e6e8e', c2: '#74647f', wain: '#5a6a60', seed: 8 }), { mat, box } = K;
      E.sign(g, { x: 48, z: WY + .6, h: 54, w: 46, hh: 28, text: ['SAFETY IS', "EVERYONE'S", 'SHARED IDEA'], bg: '#f0f0ea', fg: '#b83a32', size: 8 });
      E.sign(g, { x: 250, z: WY + .6, h: 56, w: 38, hh: 24, text: ['NO POLICY FOR:', 'Supernatural', 'Breath Mints'], bg: '#f0f0ea', fg: '#222', size: 6 });
      box(g, 180, 210, 84, 92, 0, 11, mat('#8a6a48')); box(g, 179, 211, 83, 93, 11, 12, mat('#9a7a56'));     // side counter (tablet)
      box(g, 228, 260, 84, 92, 0, 8, mat('#8a6a48')); box(g, 227, 261, 83, 93, 8, 9, mat('#9a7a56'));       // printer counter
      bustDesk(K, g, 122, 186, 100, 112, 12); E.chair(g, 154, 120, 0, '#6a4a7a');                              // Tabitha's desk
      E.plant(g, 290, 98, 1); E.shelf(g, 8, 36, 86, 94, 40, 3, 2);
    },
    props: {
      tablet(K) { const { T, mat, box } = K, g = new T.Group(); box(g, 182, 196, 86, 92, 12, 13, mat('#2a2c32')); box(g, 183, 195, 86.4, 91.6, 13, 13.4, mat('#cfe8ff', { emissive: '#8ac8ff', emissiveIntensity: .5 })); return g; },
      hr_printer(K) { const E = MM3.envKit(K), g = new K.T.Group(); E.printer(g, null, 232, 254, 85, 91, 9, true); return g; },
      poster(K) { const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group(); box(g, 99, 131, WY + .6, WY + 1.4, 33, 64, mat('#d430a0')); E.sign(g, { x: 115, z: WY + 1.5, h: 50, w: 26, hh: 14, text: ['(=^..^=)'], bg: '#40d8e8', fg: '#222', border: false, size: 8 }); E.sign(g, { x: 115, z: WY + 1.6, h: 38, w: 26, hh: 6, text: 'BREATHE', bg: '#d430a0', fg: '#f8f8f8', border: false, size: 6 }); return g; }
    },
    hide: ['tabitha']
  });

  MM3.rooms.mgmt = () => MM3.autoRoom('mgmt', {
    wallY: WY, lights: { hemi: ['#e4ecff', '#8a8aa0', .9], key: { color: '#f2f6ff', intensity: .84, pos: [60, 230, 215], target: [170, 0, 100] }, clear: 0x0c0c14, points: [{ pos: [160, 70, 110], color: '#dff0ff', intensity: .32, distance: 220, decay: 1.2 }] },
    shell(K, g, ctx) {
      const E = shell(K, g, ctx, { wall: '#c0bcd0', floor: '#2a2a3a', tile: 0, wain: '#4a4860', trim: '#e8e4f0', seed: 9, mat: false, blots: [[160, 50, 40, .12, '200,200,255']] }), { mat, box } = K, C = E.C;
      for (let x = 0; x < 320; x += 40) E.window(g, x + 10, x + 40, WY, 20, 63, '#9ab0d0');               // continuous window wall
      box(g, 130, 190, 90, 130, .05, .25, mat('#101014'), { cast: false });                              // black executive rug
      box(g, 230, 282, WY - .2, WY + 2.4, 0, 46, mat('#1a1a26'));                                           // suite doorway frame
      box(g, 240, 270, WY + 2.4, WY + 3.2, 0, 34, mat('#6a6a72', { metalness: .5 }));                       // suite door leaf
      E.sign(g, { x: 255, z: WY + 3.3, h: 41, w: 46, hh: 6, text: 'REGIONAL OPERATIONS SUITE', bg: '#1a1a26', fg: '#e2bd24', border: false, size: 4 });
      E.door(g, { x0: 0, x1: 10, z: WY, H: 44, color: '#5a5666', glass: false });                         // back to ops (left edge)
      bustDesk(K, g, 124, 184, 102, 114, 13); box(g, 124, 184, 114, 115, 3, 12, mat('#1a1a22'));            // Gus's reception desk
      E.chair(g, 154, 124, 0, '#1a1a22');
    },
    props: {
      reader(K) { const { T, mat, box, emi } = K, g = new T.Group(); box(g, 248, 260, WY + 3.3, WY + 4.6, 34, 46, mat('#101216')); K.keep(true); const l = box(g, 251, 257, WY + 4.6, WY + 5, 38, 44, emi(F('suite_open') ? '#3aff6a' : '#ff3030', 1.4), { cast: false }); K.keep(false); return g; },
      plant2(K) { const E = MM3.envKit(K), g = new K.T.Group(); E.plant(g, 27, 100, 1.2); return g; }
    },
    hide: ['gus']
  });
})();
