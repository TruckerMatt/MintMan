'use strict';
// THREE ROOM: TITLE SCENE ("Tuesday at the Dock", night). Not a game room: a pseudo room registered NON-ENUMERABLY in G.rooms so every
// room loop (tests, tours, saves) ignores it. Rendered from renderer.js with a private title state while G.started is false.
window.MM3 = window.MM3 || { rooms: {} };
(function () {
  const WY = 70;
  Object.defineProperty(G.rooms, '__title', {
    enumerable: false, configurable: true, writable: true,
    value: { name: 'TITLE', walk: [0, 0, 0, 0], c1: 3, bg() { }, props: [], exits: [], spots: [[262, 118, 0, 'sit'], [176, 126, 1, 'loaf'], [104, 120, 2, 'sit'], [32, 128, 3, 'sleep'], [288, 108, 4, 'loaf'], [140, 112, 5, 'sit']] }
  });
  const LIGHTS = {
    hemi: ['#4a5a9a', '#1c1c2c', .55], key: { color: '#9ab4ff', intensity: .55, pos: [260, 230, 120], target: [170, 0, 100] }, clear: 0x070a1c,
    points: [
      { pos: [60, 40, 84], color: '#ffb050', intensity: 1.1, distance: 120, decay: 1.4 }, { pos: [130, 40, 84], color: '#ffb050', intensity: 1.0, distance: 120, decay: 1.4 },
      { pos: [200, 40, 84], color: '#ffb050', intensity: 1.0, distance: 120, decay: 1.4 }, { pos: [18, 34, 96], color: '#70ffc8', intensity: 1.3, distance: 90, decay: 1.6 },
      { pos: [286, 60, 100], color: '#ffe8a0', intensity: .9, distance: 130, decay: 1.5 }]
  };
  MM3.rooms.__title = () => MM3.autoRoom('__title', {
    wallY: WY, lights: LIGHTS,
    shell(K, g, ctx) {
      const E = MM3.envKit(K), C = E.C, { T, mat, emi, box, ctex, seeded } = K;
      // night sky gradient + moon + stars (behind the building roofline)
      const skyTex = ctex(8, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#04061a'); gr.addColorStop(1, '#27346a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
      const sky = new T.Mesh(new T.PlaneGeometry(420, 70), new T.MeshBasicMaterial({ map: skyTex })); sky.position.set(160, 35 - 4, 20); g.add(sky);
      K.keep(true); const r = seeded(9), stars = []; for (let i = 0; i < 46; i++) { const m = box(g, 0, 1.2, 0, 1.2, 0, 1.2, emi('#dfe8ff', 1.4), { cast: false, recv: false }); m.position.set(r() * 330 - 5, 8 + r() * 24, 24); stars.push(m); } K.keep(false);
      ctx.anim.push((t) => stars.forEach((m, i) => { m.scale.setScalar(.6 + .6 * (Math.sin(t * (1 + i % 5) + i) * .5 + .5)); }));
      box(g, 262, 276, 21, 22, 26, 40, emi('#f2f6ff', .9), { cast: false, recv: false }); box(g, 264, 278, 21.5, 22.5, 24, 38, emi('#0b1030', 0), { cast: false });  // moon + shadow crescent
      // ground: wet asphalt, lane stripes, puddles
      E.floor(g, { x0: -10, x1: 330, z0: WY, z1: 150, base: '#262833', seed: 77, joints: 0, noise: 600, rough: .5, stripes: [{ z: 124 - WY, w: 1.2, color: '#a08a2a' }, { z: 140 - WY, w: 2, color: '#a08a2a', dash: 9 }], blots: [[60, 40, 30, .35, '10,20,60'], [180, 50, 36, .3, '10,20,60'], [270, 30, 26, .3, '10,20,60']] });
      for (const [x, z, w, d] of [[40, 118, 30, 12], [150, 106, 40, 14], [240, 134, 34, 10]]) box(g, x, x + w, z, z + d, .03, .12, mat('#1c2850', { roughness: .08, metalness: .4, emissive: '#101a40', emissiveIntensity: .25 }), { cast: false });
      // building facade
      E.wall(g, { x0: -10, x1: 330, z: WY, H: 50, base: '#2a2e3c', panels: 6, topDark: .3, botDirt: .35, seed: 71 });
      box(g, -10, 330, WY - 1, WY + 2, 50, 54, mat('#1c1e28')); box(g, -10, 330, WY - 1, WY + 1.4, 40, 42, mat('#3a3e4c'), { cast: false });
      // four lit dock doors, two with trailers backed in
      const lits = [];
      for (let i = 0; i < 4; i++) {
        const x = 40 + i * 70; E.dockDoor(g, ctx, { x0: x, x1: x + 44, z: WY, H: 38, open: true });
        K.keep(true); lits.push(box(g, x + 1, x + 43, WY + .5, WY + 1, 3, 37, emi('#ffb050', .9), { cast: false })); K.keep(false);
        box(g, x, x + 44, WY + 2, WY + 22, .03, .1, mat('#ffb050', { transparent: true, opacity: .1, emissive: '#ffb050', emissiveIntensity: .5 }), { cast: false });   // spill of light on the asphalt
        if (i % 2 === 0) { box(g, x + 3, x + 41, WY + 1.4, WY + 8, 3, 33, mat('#d8dcdf')); box(g, x + 5, x + 39, WY + 8, WY + 8.4, 5, 31, mat('#101114'), { cast: false }); }
      }
      ctx.anim.push((t) => lits.forEach((m, i) => { m.material.emissiveIntensity = .8 + .15 * Math.sin(t * 2 + i * 1.7) + (Math.sin(t * 23 + i * 5) > .985 ? -.4 : 0); }));
      // the mint vending machine, glowing at the left edge
      box(g, 8, 30, 90, 100, 0, 44, mat('#1a2a28')); box(g, 10, 26, 100, 100.6, 12, 40, emi('#70ffc8', 1.1), { cast: false }); box(g, 10, 26, 100, 100.8, 4, 9, mat('#0a1210'), { cast: false });
      E.sign(g, { x: 18, z: 100.7, h: 43, w: 16, hh: 3.5, text: 'MINTS', bg: '#0a1210', fg: '#70ffc8', glow: .8, border: false, size: 6, off: 0 });
      // yard lights, pallets, bollards, a parked forklift route
      for (const x of [110, 290]) { box(g, x, x + 2, 90, 92, 0, 62, mat('#3a3e4c')); box(g, x - 6, x + 8, 88, 94, 60, 63, mat('#3a3e4c')); box(g, x - 5, x + 7, 89, 93, 59.2, 60, emi('#ffe8a0', 1.8), { cast: false }); }
      E.wrapped(g, 128, 152, 104, 118, 0, 3, 5); E.loadedPallet(g, 54, 78, 108, 122, 0, '#b98a54', 12, 3); E.pallet(g, 186, 210, 100, 112, 0);
      for (const x of [96, 120, 216]) E.bollard(g, x, 140, 14);
      // forklift patrolling the lane (kept out of the static merge so it can move)
      K.keep(true); const fg = new T.Group(); E.forklift(fg, { x: 0, z: 130, dir: 1, type: 'cushion', ctx }); K.keep(false); g.add(fg);
      ctx.anim.push((t) => { fg.position.x = ((t * 14) % 380) - 40; });
    },
    props: {}, hide: []
  });
})();
