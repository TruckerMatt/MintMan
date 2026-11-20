const { open } = require('./lib');
const R = []; const ok = (n, c, d) => { R.push([n, !!c, d || '']); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
const ORIG = require('path').join(require('./lib').ROOT, 'legacy', 'MINT_MAN_TUESDAY_LOGIC_REBUILD.html');
const hashRooms = async (page, qs) => page.evaluate(async () => {
  await G.newGameFast(); G.fast = false; const out = {};
  for (const id of Object.keys(G.rooms)) {
    G.S.room = id; G.S.jx = 150; G.S.jy = 120; G.S.ax = 134; G.S.ay = 122; G.catCache = {}; G.t = 3.3; G.S.cat = 3; G.junoIdle = null;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.clearRect(0, 0, SW, SH); drawScene();
    const d = ctx.getImageData(0, 0, SW * SCALE, SCENE_H * SCALE).data; let h = 2166136261; for (let i = 0; i < d.length; i += 7) h = Math.imul(h ^ d[i], 16777619) >>> 0; out[id] = h;
  } return out;
});
(async () => {
  const a = await open({ file: ORIG, seed: false }); const ha = await hashRooms(a.page); await a.browser.close();
  const b = await open({ qs: '?renderer=three', seed: false }); await b.page.waitForTimeout(600);
  // in three mode every room except break must be pixel-identical to the original
  const hb = await hashRooms(b.page); await b.browser.close();
  const c = await open({ qs: '?renderer=classic', seed: false }); const hc = await hashRooms(c.page); await c.browser.close();
  const rooms = Object.keys(ha);
  const diffThree = rooms.filter(r => ha[r] !== hb[r]); const diffClassic = rooms.filter(r => ha[r] !== hc[r]);
  ok('OTHER ROOMS: ' + (rooms.length - 1) + ' non-break rooms render pixel-identical to original in THREE mode', diffThree.filter(r => r !== 'break').length === 0, 'diff rooms: ' + diffThree.join(','));
  ok('CLASSIC FALLBACK: all ' + rooms.length + ' rooms (incl. break) pixel-identical to original with renderer=classic', diffClassic.length === 0, 'diff: ' + diffClassic.join(','));
  ok('(sanity) break room DOES differ in three mode (transparent scene window)', diffThree.includes('break'));
  // CDN failure -> graceful classic fallback, game fully playable
  const d = await open({ blockCdn: true, seed: false }); await d.page.waitForTimeout(800);
  const r = await d.page.evaluate(async () => { await G.newGameFast(); await G.do('LOOK', 'clock'); return { status: MM3.status, active: MM3.active, room: G.S.room, shown: document.getElementById('three').style.display }; });
  ok('CDN FAILURE: status=failed, classic break room active, game still works', r.status === 'failed' && !r.active && r.shown !== 'block' && r.room === 'break', JSON.stringify(r));
  const errs = d.logs.filter(l => /PAGEERROR/.test(l)); ok('CDN FAILURE: no uncaught page errors', errs.length === 0, errs.join('|'));
  await d.browser.close();
  const failed = R.filter(x => !x[1]); console.log('\n' + (R.length - failed.length) + '/' + R.length + ' passed'); process.exit(failed.length ? 1 : 0);
})();
