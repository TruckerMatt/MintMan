// Late-game / special-state rendering, read-only proof (frozen state), new-game-after-completion, mobile/touch.
const { open, ROOT } = require('./lib'); const path = require('path'); const fs = require('fs');
const R = []; const ok = (n, c, d) => { R.push([n, !!c, d || '']); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
const noise = l => /GPU stall|useLegacyLights|ReadPixels|\[MM3\] Three/.test(l);
const SH = path.join(__dirname, 'shots') + '/';
(async () => {
  const { browser, page, logs } = await open({ seed: false });
  await page.evaluate(async () => { await G.newGameFast(); G.fast = false; });
  const ids = await page.evaluate(() => Object.keys(G.rooms));
  // 1. late-state sweep: Mint level 3 on, cat level 4, act 6, assorted state flags, in every room
  const sweep = await page.evaluate(async (ids) => {
    const S = G.S; Object.assign(S, { act: 6, mint: 3, mintOn: true, cat: 4 }); Object.assign(S.f, { t9022_at_dock: true, mgmt_open: true, mint_ready: true, mint_taken: true, radio_found: true, took_flyer: true, clock_battery: true, bowl1_taken: true, took_label: true, lights_calm: true });
    const out = []; for (const id of ids) { S.room = id; G.catCache = {}; await new Promise(r => setTimeout(r, 450)); const d = MM3.debugState(); out.push({ id, ok: MM3.active && d.room === id, cats: d.cats.length, persons: d.persons.length, calls: MM3.info().calls }); } return out;
  }, ids);
  ok('LATE STATE: all rooms render in Mint level 3 / cat level 4 / act 6', sweep.every(x => x.ok), JSON.stringify(sweep.filter(x => !x.ok)));
  console.log('  worst-case draw calls:', Math.max(...sweep.map(x => x.calls)), 'in', sweep.sort((a, b) => b.calls - a.calls)[0].id);
  await page.evaluate(() => { G.S.room = 'floor'; }); await page.waitForTimeout(600); await page.screenshot({ path: SH + 'late_floor_mint3_cats4.png', clip: { x: 0, y: 0, width: 1280, height: 576 } });
  // 2. HALO climax sweep (visual only): integrity 100 -> 0 with Mint on; screenshots + state untouched by rendering
  await page.evaluate(() => { G.S.room = 'suite'; G.S.f.boss_started = true; G.S.f.boss_done = false; G.S.boss = { integrity: 100 }; G.S.mintOn = true; G.S.mint = 3; });
  const snap0 = await page.evaluate(() => JSON.stringify(G.S));
  for (const v of [100, 60, 20]) { await page.evaluate((v) => { G.S.boss.integrity = v; }, v); await page.waitForTimeout(500); await page.screenshot({ path: SH + 'halo_integrity_' + v + '.png', clip: { x: 0, y: 0, width: 1280, height: 576 } }); }
  const snap1 = await page.evaluate(() => { G.S.boss.integrity = 100; return JSON.stringify(G.S); }); ok('HALO: rendering integrity 100/60/20 only reads state (S identical apart from the test-set integrity)', snap0 === snap1);
  // 3. read-only proof: deep-freeze G.S while idle; any renderer write throws in strict mode and would show up as a console error
  const before = logs.length;
  const frozenOk = await page.evaluate(async (ids) => {
    const deepFreeze = (o) => { Object.freeze(o); for (const k of Object.keys(o)) if (o[k] && typeof o[k] === 'object' && !Object.isFrozen(o[k])) deepFreeze(o[k]); return o; };
    for (const id of ids) { G.S.room = id; G.catCache = {}; await new Promise(r => setTimeout(r, 350)); deepFreeze(G.S); await new Promise(r => setTimeout(r, 450)); G.S = JSON.parse(JSON.stringify(G.S)); }
    return true;
  }, ids);
  const frozenErrs = logs.slice(before).filter(l => !noise(l) && /error|PAGEERROR|Cannot assign|read only/i.test(l)); ok('READ-ONLY: renderer rendered every room with a deep-frozen G.S without a single write attempt', frozenOk && frozenErrs.length === 0, frozenErrs.join(' | ').slice(0, 300));
  // 4. new game after "completion": no stale 3D state
  await page.evaluate(() => { G.S.room = 'break'; G.S.f.took_flyer = true; G.S.f.clock_battery = true; G.S.f.radio_found = true; G.S.mintOn = true; }); await page.waitForTimeout(500);
  await page.evaluate(() => { startGame(false); }); await page.waitForTimeout(2200);
  const ng = await page.evaluate(() => { const d = MM3.debugState(); return { room: G.S.room, d: d.dyn, mint: d.mintK, cats: d.cats.length }; });
  ok('NEW GAME AFTER COMPLETION: break room visuals reset (flyer/battery/blink back, Mint off, 1 cat)', ng.room === 'break' && ng.d.flyer && ng.d.battery && ng.d.blink && ng.mint < .3 && ng.cats === 1, JSON.stringify(ng));
  const errs = logs.filter(l => !noise(l) && /error|PAGEERROR|warn/i.test(l)); ok('CONSOLE: clean through late-state sweep', errs.length === 0, errs.slice(0, 5).join(' | ').slice(0, 400));
  await browser.close();

  // 5. mobile / touch: portrait + landscape phone viewports, taps instead of mouse
  const { chromium } = require('playwright');
  for (const vp of [{ w: 390, h: 844, n: 'portrait' }, { w: 844, h: 390, n: 'landscape' }]) {
    const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage(); const lg = []; p.on('console', m => lg.push(m.type() + ': ' + m.text())); p.on('pageerror', e => lg.push('PAGEERROR: ' + e.message));
    await p.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(path.join(__dirname, 'node_modules/three/build/three.module.js')) }));
    await p.goto('file://' + path.join(ROOT, 'index.html')); await p.waitForTimeout(1000); await p.evaluate(async () => { await G.newGameFast(); G.fast = false; }); await p.waitForTimeout(800);
    const geo = await p.evaluate(() => { const g = document.getElementById('game').getBoundingClientRect(), t = document.getElementById('three').getBoundingClientRect(); return { g: [g.left, g.top, g.width, g.height].map(Math.round), t: [t.left, t.top, t.width, t.height].map(Math.round), shown: MM3.shown }; });
    ok('MOBILE ' + vp.n + ': Three canvas covers exactly the scene window (top 60% of the game canvas) ' + JSON.stringify(geo), geo.shown === 'block' && Math.abs(geo.t[0] - geo.g[0]) <= 1 && Math.abs(geo.t[1] - geo.g[1]) <= 1 && Math.abs(geo.t[2] - geo.g[2]) <= 1 && Math.abs(geo.t[3] - geo.g[3] * .6) <= 2);
    const tap = async (lx, ly) => { const r = await p.evaluate(() => { const g = document.getElementById('game').getBoundingClientRect(); return { x: g.left, y: g.top, w: g.width, h: g.height }; }); await p.touchscreen.tap(r.x + lx / 320 * r.w, r.y + ly / 240 * r.h); };
    await tap(220, 125); for (let i = 0; i < 40; i++) { await p.waitForTimeout(150); if (!(await p.evaluate(() => G.busy || !!G.walkTarget))) break; }
    const mv = await p.evaluate(() => ({ jx: G.S.jx, jy: G.S.jy, mm: MM3.debugState().hollis })); ok('MOBILE ' + vp.n + ': tap on floor walks Hollis (' + mv.jx.toFixed(0) + ',' + mv.jy.toFixed(0) + ') and 3D Hollis follows', Math.abs(mv.jx - 220) < 2 && Math.abs(mv.mm[0] - mv.jx) < .5);
    await tap(26, 158); const vb = await p.evaluate(() => G.S.verb); ok('MOBILE ' + vp.n + ': tap on verb button selects it (' + vb + ')', vb === 'LOOK');
    await tap(119, 17); await p.waitForTimeout(300); ok('MOBILE ' + vp.n + ': tap on clock (hotspot) opens dialogue', await p.evaluate(() => !!G.say || G.busy));
    await p.screenshot({ path: SH + 'mobile_' + vp.n + '.png' });
    const e = lg.filter(l => !noise(l) && /error|PAGEERROR/i.test(l)); ok('MOBILE ' + vp.n + ': console clean', e.length === 0, e.join('|').slice(0, 200)); await b.close();
  }
  const failed = R.filter(x => !x[1]); console.log('\n' + (R.length - failed.length) + '/' + R.length + ' passed'); process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
