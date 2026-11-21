'use strict';
// THREE ROOM: REGIONAL SUITE (HALO climax). Wraps the generic state-aware room and adds visual-only instability effects driven by existing state:
//   boss active  = F('boss_started') && !F('boss_done');  integrity = S.boss.integrity (100 -> 0);  Mint Mode = S.mintOn.
// FALSE RECORDS -> ghosted, offset, flickering copies of the HALO wall; SYSTEM/REALITY CONFLICT -> chromatic split + light flicker. Reveals nothing new.
window.MM3 = window.MM3 || { rooms: {} };
MM3.rooms.suite = function () {
  const d = MM3.autoRoom('suite', MM3.suiteSpec); const build = d.build, sync = d.sync;
  d.build = function (K, group, X) {
    build.call(this, K, group, X); const T = K.T; const g = this.halo = new T.Group(); group.add(g);
    const z = this.wallY + 7, hc = z - 40;                       // HALO wall occupies screen x 60..260, y 8..68 -> centre (160, 38)
    const mk = (color) => { const m = new T.Mesh(new T.PlaneGeometry(196, 50), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })); m.position.set(160, z - 38, z); g.add(m); return m; };
    this.ghostA = mk('#ff3060'); this.ghostB = mk('#30e0ff'); this.ghostC = mk('#80ff90');
    this.bars = []; for (let i = 0; i < 8; i++) { const b = new T.Mesh(new T.BoxGeometry(1, 2.2, 1.2), new T.MeshBasicMaterial({ color: '#70ff90', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })); b.position.set(70, z - (19 + i * 6), z + 3); g.add(b); this.bars.push(b); }
  };
  d.sync = function (K, S, t, X) {
    sync.call(this, K, S, t, X); if (!this.halo || !this.ghostA.parent) return;
    const f = (k) => !!(S.f && S.f[k]); const boss = f('boss_started') && !f('boss_done'); const integ = S.boss && S.boss.integrity !== undefined ? S.boss.integrity : 100;
    const inst = boss ? Math.max(0, Math.min(1, 1 - integ / 100)) : 0; const on = boss || S.mintOn; const k = on ? (boss ? .35 + .65 * inst : .25) : 0;
    const j = (a) => Math.sin(t * a) * (1 + 5 * inst);
    this.ghostA.position.x = 160 + j(13) + 2; this.ghostB.position.x = 160 - j(11) - 2; this.ghostC.position.y = this.ghostA.position.y + Math.sin(t * 5) * (.5 + 2 * inst);
    this.ghostA.material.opacity = k * (.10 + .08 * (Math.sin(t * 30) > .6 ? 1 : 0)); this.ghostB.material.opacity = k * .10; this.ghostC.material.opacity = k * (Math.sin(t * 17 + 1) > .2 ? .06 : 0);
    this.bars.forEach((b, i) => { const w = (boss ? 20 + 120 * Math.abs(Math.sin(t * (1 + inst * 3) + i * 1.7)) : 40 + 90 * (.5 + .5 * Math.sin(t * .7 + i))); b.scale.x = w; b.position.x = 70 + w / 2; b.material.opacity = on ? (boss ? .5 : .22) * (Math.sin(t * 40 + i * 3) > .93 - inst * .3 ? .3 : 1) : 0; });
    if (boss) { const fl = Math.sin(t * 37) > .55 + (1 - inst) * .4 ? 1 : 0; K.L.key.intensity = X.base.key * (1 - .4 * inst * fl); K.L.hemi.intensity = X.base.hemi * (1 - .3 * inst * fl); K.L.pts[0].color.set(inst > .5 ? '#ff6070' : '#dff0ff'); }
  };
  return d;
};
