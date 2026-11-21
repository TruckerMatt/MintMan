'use strict';
// THREE ROOMS: LOADING YARD, SMOKING SHELTER, DRAINAGE DITCH (hand-modelled outdoor family). Sky = renderer clear colour + drifting low-poly clouds.
// Trailers rows, holding trailer T-31, gate, shelter, ditch/grate, cat colony. State read-only (t9022_found, t31_*, rescue_*, etc).
window.MM3 = window.MM3 || { rooms: {} };
(function () {
  const F = (k) => !!(G.S.f && G.S.f[k]);
  const WY = 60;
  function ground(K, g, ctx, o) {
    const E = MM3.envKit(K), { mat, box, T } = K;
    E.floor(g, { x0: -10, x1: 330, z0: WY, z1: 150, base: o.ground, seed: o.seed, joints: 0, noise: 700, rough: .95, stripes: o.stripes || [], blots: o.blots || [[60, 50, 28, .25, '20,20,20'], [200, 60, 30, .2, '20,20,20']] });
    // distant curb strip + clouds (a few drifting boxes behind everything)
    box(g, -10, 330, WY - .5, WY + 3, 0, 1.2, mat('#7a7a78'), { cast: false });
    K.keep(true); const cl = []; for (let i = 0; i < 4; i++) { const m = mat('#f2f6fa', { roughness: 1 }); const a = box(g, 0, 30, 24, 30, 0, 6, m, { cast: false, recv: false }), b = box(g, 6, 24, 24, 30, 6, 11, m, { cast: false, recv: false }); const grp = new T.Group(); grp.add(a, b); g.add(grp); cl.push([grp, i]); } K.keep(false);
    ctx.anim.push((t) => { cl.forEach(([grp, i]) => { grp.position.x = (i * 90 + t * 3) % 380 - 30; grp.position.y = 10 + (i * 7) % 16; grp.position.z = 0; }); });
    return E;
  }
  const brick = (K, g, x0, x1, z, H, col) => MM3.envKit(K).wall(g, { x0, x1, z, H, base: col || '#585c68', panels: 6, topDark: .2, botDirt: .3, seed: 31 });
  function trailerSide(K, g, x0, w, z0, z1, H, col, label) {   // side view of a parked box trailer
    const E = MM3.envKit(K), { mat, box } = K; box(g, x0, x0 + w, z0, z1, 4, 4 + H, mat(col)); box(g, x0 - .4, x0 + w + .4, z0, z1, 4 + H, 5 + H, mat('#9aa0a6')); box(g, x0 + 1, x0 + w - 1, z0 + 1, z1, 1, 4, mat('#2a2c32'));
    for (const dx of [.2, .26, .78, .84]) { const x = x0 + w * dx; box(g, x - 2.5, x + 2.5, z1 - 3, z1 + .8, 0, 5, mat('#17181b')); }
    for (let h = 8; h < 4 + H; h += 6) box(g, x0, x0 + w, z1 - .1, z1 + .3, h, h + .5, mat('#aeb3b8'), { cast: false });
    if (label) E.sign(g, { x: x0 + w / 2, z: z1 + .2, h: 4 + H * .5, w: Math.min(26, w * .6), hh: 6, text: label, bg: '#f2f2ee', fg: '#222', size: 6, off: 0 });
  }

  // ------------------------------------------------------------------------------------------------ YARD
  MM3.rooms.yard = () => MM3.autoRoom('yard', {
    wallY: WY, lights: MM3.THEMES.outdoor,
    shell(K, g, ctx) {
      const E = ground(K, g, ctx, { ground: '#6c6c68', seed: 41, stripes: [{ z: 100 - WY, w: 1.2, color: '#e2bd24' }, { z: 122 - WY, w: 1, color: '#e2bd24', dash: 12 }] });
      brick(K, g, -10, 330, WY, 20, '#585c68'); K.box(g, -10, 330, WY - .2, WY + 1, 0, 4, K.mat('#6a6e76'), { cast: false });
      E.sign(g, { x: 30, z: WY + .4, h: 8, w: 38, hh: 6, text: 'YARD ROW C', bg: '#2a2c32', fg: '#e2bd24', border: false, size: 6 });
      for (let x = -4; x < 330; x += 60) { K.box(g, x, x + 2, WY + 1, WY + 3, 0, 24, K.mat('#5a5e66')); }   // light poles against the building
    },
    extra(K, S, ctx) {   // parked trailer rows (random subset like the classic art) + holding trailer + gate; rebuilt with state
      const E = MM3.envKit(K), { T } = K, g = new T.Group(), cols = ['#9aa0a6', '#c8d0d8', '#d8c8b0'];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { const x = 6 + i * 52, is9022 = r === 2 && i === 5; if (rnd(r * 9 + i) > .3 || (F('t9022_found') && is9022)) trailerSide(K, g, x, 44, 70 + r * 6 + 4, 70 + r * 6 + 14, 14, is9022 ? '#f0f0ee' : cols[(r + i) % 3], is9022 ? 'T-9022' : ''); }
      // gate (right edge): chain-link panel + posts
      const { mat, box } = K; for (const z of [64, 120]) box(g, 308, 311, z, z + 3, 0, 30, mat('#5a5e66'));
      for (let z = 66; z < 120; z += 4) box(g, 309, 310, z, z + .6, 0, 28, mat('#8a909a'), { cast: false }); for (const h of [0, 14, 28]) box(g, 309, 311, 64, 120, h, h + .8, mat('#8a909a'));
      return g;
    },
    props: {
      row_c() { return null; }, t9022() { return null; },
      t31(K, p) {   // holding trailer T-31 with state: bowls and blanket for the cats inside
        const { T, mat, box } = K, g = new T.Group(); trailerSide(K, g, 176, 70, 108, 126, 18, '#d8e0e8', 'T-31');
        box(g, 178, 244, 122, 130, 0, 2, mat('#5a6a7a')); if (F('t31_bowls')) for (const x of [186, 198, 210]) { box(g, x, x + 6, 122, 128, 2, 4.4, mat('#c8cdd2')); }
        if (F('t31_blanket')) box(g, 218, 238, 120, 128, 2, 3.4, mat('#d430a0')); return g;
      },
      gate() { return null; },
      hide_trailer(K) { const g = new K.T.Group(); trailerSide(K, g, 140, 34, 86, 100, 14, '#c8c8d0', ''); return g; },
    },
    hide: ['rufus', 'renata', 'torvald']
  });

  // ------------------------------------------------------------------------------------------------ SMOKING SHELTER
  MM3.rooms.smoke = () => MM3.autoRoom('smoke', {
    wallY: WY, lights: MM3.THEMES.outdoor,
    shell(K, g, ctx) {
      const E = ground(K, g, ctx, { ground: '#727068', seed: 43 }), { mat, box } = K;
      box(g, 0, 130, WY, WY + 14, 0, 34, mat('#585c68')); E.sign(g, { x: 65, z: WY + 14.2, h: 28, w: 40, hh: 7, text: 'EMPLOYEE ENTRANCE', bg: '#2a2c32', fg: '#e8e8e2', border: false, size: 5, off: 0 }); E.door(g, { x0: 100, x1: 124, z: WY + 14, H: 28, color: '#4a4e56', glass: false });
      // shelter: four posts, wooden roof, bench, wall board
      const post = mat('#6a6e76', { metalness: .4 }); for (const [x, z] of [[155, 70], [240, 70], [155, 100], [240, 100]]) box(g, x, x + 3, z, z + 3, 0, 34, post);
      box(g, 150, 250, 68, 104, 34, 37, mat('#886a3a')); for (let i = 0; i < 6; i++) box(g, 150 + i * 17, 152 + i * 17, 68, 104, 37, 39, mat('#664a2a'));
      box(g, 158, 236, 70, 72, 0, 20, mat('#4a4e56')); E.bench(g, 175, 215, 84, 90, 8);
      E.bollard(g, 14, 128, 14);
    },
    props: {
      shelter() { return null; },
      ashtray(K) { const { T, mat, box } = K, g = new T.Group(); box(g, 214, 226, 102, 112, 0, 10, mat('#6a6e76', { metalness: .4 })); box(g, 214, 226, 102, 112, 10, 11.4, mat('#9aa0a8')); box(g, 217, 219, 105, 107, 11.4, 14, mat('#b83a32')); return g; },
      stack(K, p, ctx) {
        const E = MM3.envKit(K), { T, mat, box } = K, g = new T.Group();
        for (let k = 0; k < 3; k++) E.pallet(g, 256, 296, 90, 104, k * 5.4); box(g, 262, 292, 94, 100, 16, 20, mat('#e2bd24')); E.forklift(g, { x: 282, z: 100, dir: -1, type: 'cushion', ctx }); box(g, 252, 260, 70, 104, 0, 34, mat('#6a6e76')); return g;
      }
    },
    hide: ['torvald']
  });

  // ------------------------------------------------------------------------------------------------ DRAINAGE DITCH
  MM3.rooms.drain = () => MM3.autoRoom('drain', {
    wallY: WY, lights: MM3.THEMES.outdoor,
    shell(K, g, ctx) {
      const E = ground(K, g, ctx, { ground: '#605c58', seed: 47, blots: [[100, 80, 40, .35, '10,20,30'], [210, 70, 22, .3, '10,20,30']] }), { mat, box } = K;
      brick(K, g, -10, 330, WY, 20, '#585c68');
      // the ditch: concrete rim, dark trench, water sheen, rungs
      box(g, 28, 182, 86, 120, 0, 1.4, mat('#7a7a78')); box(g, 30, 180, 88, 118, 0, 1.45, mat('#0e0e12'), { cast: false });
      box(g, 32, 178, 92, 96, 1.46, 1.6, mat('#2a3a4a', { roughness: .15, emissive: '#1a2a3a', emissiveIntensity: .35 }), { cast: false });
      for (let x = 30; x < 180; x += 6) box(g, x, x + .8, 88, 118, 1.5, 1.7, mat('#1a1a20'), { cast: false });
      // junk heaps
      box(g, 6, 20, 100, 112, 0, 6, mat('#6a4a2a')); box(g, 2, 14, 108, 116, 0, 4, mat('#5a3e22'));
    },
    props: {
      ditch() { return null; },
      grate(K) { const { T, mat, box } = K, g = new T.Group(); box(g, 196, 226, 86, 116, 0, .6, mat('#2a2a30')); for (let x = 198; x < 226; x += 4) box(g, x, x + 1.2, 88, 114, .6, 1.4, mat('#5a5e66', { metalness: .5 })); return g; },
      colony(K) {   // cat shelters (wooden houses with dark doorways and a bit of bedding)
        const { T, mat, box } = K, g = new T.Group(); box(g, 246, 276, 102, 120, 0, 14, mat('#7a5a3a')); box(g, 244, 278, 100, 122, 14, 16, mat('#5a3e22')); box(g, 254, 268, 120, 120.8, 0, 12, mat('#1a1a1a'), { cast: false }); box(g, 248, 252, 116, 120, 0, 2, mat('#d430a0')); return g;
      }
    },
    hide: ['prudence_d', 'torvald']
  });
})();
