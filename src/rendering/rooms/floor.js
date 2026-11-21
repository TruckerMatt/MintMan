'use strict';
// THREE ROOM: MAIN WAREHOUSE FLOOR (hand-modelled). Shell = concrete floor with safety lanes, steel back wall, rack bays, three doors, fixtures.
// Props are individually modelled (forklift F-2231, HALO wall screen, whiteboard, PA, bollards, Tucker's pallet wall, bowl). State only READ from G.S.f.
window.MM3 = window.MM3 || { rooms: {} };
MM3.rooms.floor = function () {
  const F = (k) => !!(G.S.f && G.S.f[k]);
  return MM3.autoRoom('floor', {
    wallY: 80,
    shell(K, g, ctx) {
      const E = MM3.envKit(K), C = E.C, { T, mat, emi, box } = K, WY = 80;
      E.floor(g, { x0: -10, x1: 330, z0: WY, z1: 150, base: '#8c8e92', seed: 11, joints: 40, rough: .8, stripes: [{ z: 124 - WY, w: 1.2, color: '#e2bd24' }, { z: 138 - WY, w: 2, color: '#e2bd24', dash: 8 }], blots: [[120, 60, 26, .22], [230, 40, 22, .16], [60, 30, 18, .14, '20,20,24'], [280, 54, 20, .2]] });
      E.wall(g, { x0: -10, x1: 330, z: WY, H: 80, base: '#5a5e68', panels: 6, topDark: .35, botDirt: .3, seed: 4 });
      box(g, -10, 330, WY - .5, WY + 1.4, 56, 58, mat('#3a3d46'), { cast: false });            // wall girt
      box(g, 0, 80, WY, WY + .8, 20, 60, mat(C.dark), { cast: false });                         // dark panel (left back wall)
      // rack bays against the back wall (three bays like the classic art)
      E.rack(g, { x0: 96, x1: 156, z0: WY + 1, z1: WY + 9, H: 50, levels: 3, bays: 2, seed: 3, load: .85 });
      E.rack(g, { x0: 160, x1: 220, z0: WY + 1, z1: WY + 9, H: 50, levels: 3, bays: 2, seed: 9, load: .7 });
      E.rack(g, { x0: 226, x1: 286, z0: WY + 1, z1: WY + 9, H: 50, levels: 3, bays: 2, seed: 14, load: .8 });
      // doors: shipping (left), operations, parts roll-up
      E.door(g, { x0: 14, x1: 44, z: WY, H: 44, color: '#6a4a2a', glass: true });
      E.sign(g, { x: 29, z: WY + 3.6, h: 52, w: 26, hh: 6, text: 'SHIPPING', bg: '#2a2c32', fg: '#e8e8e2', border: false });
      E.door(g, { x0: 60, x1: 90, z: WY, H: 50, color: '#4a5a7a', glass: false });
      E.sign(g, { x: 75, z: WY + 3.6, h: 56, w: 28, hh: 6, text: 'OPERATIONS', bg: '#2a2c32', fg: '#e8e8e2', border: false });
      box(g, 291, 317, WY, WY + 3, 0, 49, mat(C.yellow)); box(g, 292, 316, WY + 2.6, WY + 3.6, 0, 46, mat('#6a6a6a'));
      for (let h = 3; h < 46; h += 4) box(g, 292, 316, WY + 3.6, WY + 4.1, h, h + 1, mat('#5a5a5a'), { cast: false });
      E.sign(g, { x: 304, z: WY + 4.2, h: 52, w: 20, hh: 6, text: 'PARTS', bg: '#2a2c32', fg: '#e8e8e2', border: false });
      // outbound opening (right edge) + hazard-stripe strip to staging (bottom)
      E.sign(g, { x: 296, z: WY + .6, h: 70, w: 34, hh: 6, text: 'OUTBOUND >', bg: '#e2bd24', fg: '#1a1a1a' });
      for (let x = 120; x < 190; x += 8) box(g, x, x + 4, 138, 144, .1, .3, mat('#e2bd24'), { cast: false });
      box(g, 120, 190, 138, 144, .05, .15, mat('#1b1c20'), { cast: false });
      // ceiling steel + hanging fixtures (readable along the top of the frame)
      E.truss(g, -10, 330, WY + 3, 77.5);
      for (const x of [20, 100, 180, 260]) E.fixture(g, ctx, x, WY + 6, 73, 36);
      // wet-floor sign next to the bowl, fire extinguisher at the left wall, caution stripes at the lockers exit
      box(g, 258, 266, 124, 130, 0, 12, mat('#e2bd24')); box(g, 259, 265, 124.1, 124.6, 3, 10, mat('#e2bd24'), { cast: false });
      E.sign(g, { x: 262, z: 130.1, h: 7, w: 5, hh: 7, text: ['WET', 'FLOOR'], bg: '#e2bd24', fg: '#1a1a1a', size: 3, off: 0 });
      box(g, 3, 8, 90, 95, 0, 22, mat(C.red)); box(g, 3, 8, 90, 95, 22, 25, mat('#1a1a1a'));
      for (let z = 94; z < 138; z += 8) box(g, 0, 10, z, z + 4, .05, .15, mat('#e2bd24'), { cast: false });
    },
    props: {
      f2231(K, p, ctx) {
        const E = MM3.envKit(K), { T, mat, emi, box } = K, g = new T.Group();
        E.forklift(g, { x: 142, z: 116, dir: 1, type: 'cushion', ctx });
        E.sign(g, { x: 134, z: 123, h: 24, w: 8, hh: 3, text: 'F-2231', bg: '#101114', fg: '#e2bd24', size: 5, off: 0 });
        if (F('swap_fixed')) E.sign(g, { x: 142, z: 121, h: 41, w: 22, hh: 5, text: 'F-2231 OK', bg: '#103018', fg: '#6af0a0', glow: .6, border: false });
        return g;
      },
      kiosk(K, p, ctx) {
        const E = MM3.envKit(K), { T, mat, emi, box } = K, g = new T.Group();
        box(g, 231, 265, 80.6, 83.4, 51, 73, mat('#16181c')); box(g, 233, 263, 83.4, 84, 53, 71, mat('#0a2a1a'));
        K.keep(true); const bars = []; for (let i = 0; i < 4; i++) bars.push(box(g, 236, 237, 83.8, 84.6, 56 + i * 3.4, 58 + i * 3.4, emi('#3aff7a', 1.2), { cast: false })); K.keep(false);
        ctx.anim.push((t, S) => { bars.forEach((b, i) => { const w = 6 + Math.floor((Math.sin(t + i) + 1) * 9); b.scale.x = w; b.position.x = 236 + w / 2; const hot = S.mintOn; b.material = hot ? (ctx._red || (ctx._red = emi('#ff4060', 1.2))) : (ctx._grn || (ctx._grn = emi('#3aff7a', 1.2))); }); });
        E.sign(g, { x: 248, z: 84.7, h: 55, w: 26, hh: 3, text: 'ALL GREEN', bg: '#0a2a1a', fg: '#3aff7a', glow: .8, border: false, size: 5 });
        return g;
      },
      whiteboard(K, p) {
        const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group(), done = F('departed');
        box(g, 165, 219, 80.6, 82, 45, 66, mat('#9aa0a8')); box(g, 166.5, 217.5, 82, 82.5, 46.5, 64.5, mat('#f0f0ea'), { cast: false });
        E.sign(g, { x: 192, z: 82.6, h: 60, w: 48, hh: 5, text: 'HOT: KESTREL', bg: '#f0f0ea', fg: '#b83a32', border: false, size: 7 });
        E.sign(g, { x: 192, z: 82.6, h: 52, w: 48, hh: 5, text: done ? 'OUT 11:59 ✓' : '8 LOADS OUT BY 12', bg: '#f0f0ea', fg: done ? '#2fa04a' : '#1a1a1a', border: false, size: 6 });
        box(g, 170, 214, 82, 83, 45.2, 46, mat('#6a6e76'));                                  // marker tray
        return g;
      },
      pa(K) {
        const { T, mat, box } = K, g = new T.Group();
        box(g, 150, 164, 80.6, 86, 70, 78, mat('#6a6e76')); box(g, 153, 161, 86, 87, 72, 76, mat('#2a2c32'), { cast: false });
        return g;
      },
      bollard(K) { const E = MM3.envKit(K), g = new K.T.Group(); for (const x of [102, 126, 150]) E.bollard(g, x + 4, 108, 14); return g; },
      pallets_blk(K) {
        const E = MM3.envKit(K), g = new K.T.Group();
        E.loadedPallet(g, 98, 122, 130, 142, 0, '#b98a54', 7, 1); E.loadedPallet(g, 124, 148, 130, 142, 0, '#c89a50', 9, 2);
        E.sign(g, { x: 123, z: 142.2, h: 6, w: 30, hh: 4, text: 'TUCKER WAS HERE (HELPING)', bg: '#f2f2ee', fg: '#222', size: 3, off: 0 });
        return g;
      },
      bowl2(K) { const { T, mat, box } = K, g = new T.Group(); box(g, 257, 263, 127, 133, 0, 2.4, mat('#c8cdd2')); box(g, 258, 262, 128, 132, 2.4, 2.9, mat('#9a6a3a')); return g; }
    },
    hide: ['tucker', 'bg']
  });
};
