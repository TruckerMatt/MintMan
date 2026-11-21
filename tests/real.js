const { open } = require('./lib');
const R = []; const ok = (n, c, d) => { R.push([n, !!c, d || '']); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
const noise = l => /GPU stall|useLegacyLights|ReadPixels|\[MM3\] Three/.test(l);
const SH = require('path').join(__dirname,'shots')+'/';
(async () => {
  let { browser, page, logs } = await open({ seed: false });
  const rect = async () => page.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const click = async (lx, ly, right) => { const r = await rect(); await page.mouse.click(r.x + lx / 320 * r.w, r.y + ly / 240 * r.h, { button: right ? 'right' : 'left' }); };
  const advance = async (max = 80) => { for (let i = 0; i < max; i++) { const st = await page.evaluate(() => ({ say: !!G.say, menu: !!G.menuState, busy: G.busy })); if (!st.say && !st.menu && !st.busy) return i; if (st.say) await click(160, 70); else await page.waitForTimeout(60); await page.waitForTimeout(40); } return -1; };
  const st = () => page.evaluate(() => ({ room: G.S.room, jx: G.S.jx, jy: G.S.jy, ax: G.S.ax, ay: G.S.ay, face: G.S.face, inv: G.S.inv.slice(), f: Object.assign({}, G.S.f), time: G.S.time, mm: MM3.debugState(), active: MM3.active, shown: document.getElementById('three').style.display }));
  const verb = async (v) => { const r = await page.evaluate((v) => verbBtns.find(b => b.v === v).r, v); await click(r[0] + r[2] / 2, r[1] + r[3] / 2); };
  const invSlot = async (id) => { const i = await page.evaluate((id) => G.S.inv.indexOf(id), id); const r = await page.evaluate((i) => invRect(i), i); await click(r[0] + r[2] / 2, r[1] + r[3] / 2); };
  const center = async (id) => page.evaluate((id) => { const p = G.rooms.break.props.find(q => q.id === id); return [p.r[0] + p.r[2] / 2, p.r[1] + p.r[3] / 2]; }, id);

  // ---- TEST 1: new game through the real title/opening path
  await page.evaluate(() => { startGame(false); });
  await page.waitForTimeout(1900);
  const n = await advance(300);
  let s = await st();
  ok('TEST 1: new game opens in break room, Three active, canvas shown', s.room === 'break' && s.active && s.shown === 'block' && n >= 0, 'dialogue pages advanced=' + n);
  await page.screenshot({ path: SH + 't1_newgame_three.png' });
  ok('TEST 1: three-state flags at start (flyer, battery, bowl, label, radio blink all shown)', s.mm.dyn.flyer && s.mm.dyn.battery && s.mm.dyn.bowl && s.mm.dyn.label && s.mm.dyn.blink);

  // ---- TEST 2: movement via real clicks on the floor
  for (const [x, y] of [[200, 125], [60, 130], [150, 100], [240, 120]]) {
    await click(x, y); await page.waitForTimeout(150);
    for (let i = 0; i < 60; i++) { const w = await page.evaluate(() => !!G.walkTarget || G.busy); if (!w) break; await page.waitForTimeout(100); }
    await page.waitForTimeout(150); s = await st();
    const dh = Math.hypot(s.mm.hollis[0] - s.jx, s.mm.hollis[2] - s.jy);
    ok(`TEST 2: click floor (${x},${y}) -> Hollis logical (${s.jx.toFixed(1)},${s.jy.toFixed(1)}), 3D Hollis delta=${dh.toFixed(2)}`, Math.abs(s.jx - x) < 1.5 && Math.abs(s.jy - y) < 1.5 && dh < .5);
  }
  // ---- TEST 3: Juno follows; 3D Juno tracks S.ax/S.ay
  await page.waitForTimeout(1200); s = await st();
  const dj = Math.hypot(s.mm.juno[0] - s.ax, s.mm.juno[2] - s.ay);
  ok('TEST 3: Juno follows Hollis (' + s.ax.toFixed(1) + ',' + s.ay.toFixed(1) + ') and 3D Juno delta=' + dj.toFixed(2), Math.abs(s.ax - (s.jx - s.face * 16)) < 5 && dj < .5);
  const jp = await page.evaluate(() => { const r = [G.S.ax, G.S.ay - 5]; return { r, pick: pickAt(r[0], r[1]).kind }; });
  await click(jp.r[0], jp.r[1]); ok('TEST 3: clicking Juno hits Juno hotspot (pickAt=' + jp.pick + ')', jp.pick === 'juno' && (await page.evaluate(() => !!G.say || G.busy)));
  await advance();

  // ---- TEST 5a/4: clock battery then scanner; radio via Juno at the gap
  await verb('TAKE'); let c = await center('clock'); await click(c[0], c[1]); await advance(); s = await st();
  ok('TEST 5: TAKE clock gives scanner battery (3D battery pack hidden)', s.inv.includes('sbat') && !s.mm.dyn.battery);
  await verb('USE'); await invSlot('sbat'); await invSlot('scanner'); await advance(); s = await st();
  ok('TEST 5: USE battery on scanner -> scanner_live', s.f.scanner_live && !s.inv.includes('sbat'));
  await verb('JUNO'); c = await center('gap'); await click(c[0], c[1]);
  for (let i = 0; i < 100; i++) { await advance(2); const done = await page.evaluate(() => G.S.f.radio_found && !G.busy); if (done) break; await page.waitForTimeout(150); }
  await advance(); s = await st();
  ok('TEST 4: Juno fetches radio from the gap (radio in inventory, blink hidden in 3D)', s.inv.includes('radio') && s.f.radio_found && !s.mm.dyn.blink);
  await page.screenshot({ path: SH + 't4_after_radio.png' });

  // ---- TEST 6: vending machine (quarters from couch, buy crackers via menu)
  await verb('OPEN'); c = await center('couch'); await click(c[0], c[1]); await advance(); s = await st();
  ok('TEST 6: OPEN couch yields quarters', s.inv.includes('quarter'));
  await verb('USE'); await invSlot('quarter'); c = await center('vending'); await click(c[0], c[1]);
  let ms = false; for (let i = 0; i < 80 && !ms; i++) { await page.waitForTimeout(100); ms = await page.evaluate(() => !!G.menuState); }
  ok('TEST 6: USE quarter on vending opens the vending menu', ms);
  await click(100, 160); await advance(); s = await st();
  ok('TEST 6: vending sells crackers (one of two quarters spent)', s.inv.includes('crackers') && s.f.q === 1 && s.f.crackers_bought === 1);
  await verb('LOOK'); c = await center('vending'); await click(c[0], c[1]); await page.waitForTimeout(500);
  await page.screenshot({ path: SH + 't9_dialogue.png' });
  const boxPix = await page.evaluate(() => { const d = G.cv.getContext('2d').getImageData(30 * SCALE, 10 * SCALE, 1, 1).data; return [d[0], d[1], d[2], d[3]]; });
  ok('TEST 9: dialogue box renders (opaque Canvas2D) over the Three scene', !!(await page.evaluate(() => G.say)) && boxPix[3] === 255, 'px=' + boxPix);
  await advance();

  // ---- TEST 7: cat (spot 0 sits on the vending machine)
  const cat = await page.evaluate(() => { const c = catList()[0]; return { x: c.x, y: c.y, kind: pickAt(c.x, c.y - 2).kind }; });
  s = await st(); ok('TEST 7: one 3D cat exists, perched on vending machine; pickAt=' + cat.kind, s.mm.cats.length === 1 && cat.kind === 'cat', JSON.stringify(s.mm.cats));
  await verb('LOOK'); await click(cat.x, cat.y - 2); await advance(); ok('TEST 7: LOOK cat via real click runs existing cat dialogue', (await page.evaluate(() => G.log.some(l => /cat/i.test(l)))));

  // ---- TEST 12 (toggle via real key presses) + hotspot + classic screenshots
  await page.waitForTimeout(2500); const before = JSON.stringify(await page.evaluate(() => G.S));
  await page.keyboard.press('F9'); await page.waitForTimeout(250); await page.screenshot({ path: SH + 't_hotspots.png' });
  await page.keyboard.press('F9'); await page.keyboard.press('F8'); await page.waitForTimeout(300); s = await st(); await page.screenshot({ path: SH + 't_classic.png' });
  ok('TEST 12: F8 -> classic: Three canvas hidden, state untouched', !s.active && s.shown === 'none' && before === JSON.stringify(await page.evaluate(() => G.S)), 'active=' + s.active + ' shown=' + s.shown + ' room=' + s.room);
  await page.keyboard.press('F8'); await page.waitForTimeout(300); s = await st();
  ok('TEST 12: F8 -> three again, state untouched', s.active && s.shown === 'block' && before === JSON.stringify(await page.evaluate(() => G.S)));

  // ---- TEST 8: exits (leave -> classic, return -> three)
  await click(305, 70); await page.waitForTimeout(2500); await advance(); s = await st();
  ok('TEST 8: exit to lockers: room=lockers, rendered by Three (built room == lockers)', s.room === 'lockers' && s.active && s.shown === 'block' && s.mm.room === 'lockers');
  await page.screenshot({ path: SH + 't8_lockers_classic.png' });
  const ex = await page.evaluate(() => { const e = G.rooms.lockers.exits.find(e => e.to === 'break'); return [e.r[0] + e.r[2] / 2, e.r[1] + 4]; });   // top of the exit rect (Juno stands over its middle on arrival; same in classic)
  await click(ex[0], ex[1]); for (let i = 0; i < 120; i++) { await page.waitForTimeout(100); if ((await page.evaluate(() => G.S.room)) === 'break') break; } await page.waitForTimeout(600); await advance(); s = await st();
  ok('TEST 8: returned to break room, 3D break room rebuilt (' + s.room + ')', s.room === 'break' && s.active && s.shown === 'block');

  // ---- TEST 10: save / reload / continue
  await page.evaluate(() => { G.pendingSave = false; return saveGame(); }); const savedState = await page.evaluate(() => JSON.stringify(G.S)); const sbefore = await st();
  await page.reload(); await page.waitForTimeout(900);
  await page.evaluate(() => { startGame(true); }); await page.waitForTimeout(700); await advance(60); await page.waitForTimeout(500); s = await st();
  const same = await page.evaluate((a) => { const b = JSON.parse(a), g = G.S; return b.room === g.room && JSON.stringify(b.inv) === JSON.stringify(g.inv) && JSON.stringify(b.f) === JSON.stringify(g.f); }, savedState);
  ok('TEST 10: save/load restores room, inventory, flags', same);
  ok('TEST 10: 3D visuals match loaded game flags (flyer/battery/bowl/label/radio-blink)', s.active && s.mm.dyn.flyer === !s.f.took_flyer && s.mm.dyn.battery === !s.f.clock_battery && s.mm.dyn.bowl === !s.f.bowl1_taken && s.mm.dyn.label === !s.f.took_label && s.mm.dyn.blink === !s.f.radio_found && s.f.clock_battery && s.f.radio_found && !s.mm.dyn.battery && !s.mm.dyn.blink, JSON.stringify(s.mm));
  await page.screenshot({ path: SH + 't10_after_load.png' });

  // ---- TEST 11: Mint Mode (test-state setup; real 'M' key)
  await page.evaluate(() => { G.S.mint = 1; G.S.f.mint_ready = true; G.S.f.mint_taken = false; G.S.cat = 2; G.catCache = {}; });
  await page.keyboard.press('m'); await page.waitForTimeout(900); s = await st(); ok('TEST 11: mint on -> 3D mint effect ramps in (mintK=' + s.mm.mintK + '), D4 glow=' + s.mm.d4, s.mm.mintK > .9 && s.mm.d4);
  await page.screenshot({ path: SH + 't11_mint1.png' });
  await page.evaluate(() => { G.S.mint = 3; }); await page.waitForTimeout(500); await page.screenshot({ path: SH + 't11_mint3.png' });
  await page.keyboard.press('m'); await page.waitForTimeout(900); s = await st(); ok('TEST 11: mint off -> effect off', s.mm.mintK < .05);
  await page.screenshot({ path: SH + 't11_mint_off_cats3.png' });

  // ---- perf (software GL in this sandbox; relative numbers only)
  const perf = await page.evaluate(async () => { MM3.perf.n = 0; MM3.perf.ms = 0; MM3.perf.max = 0; let f = 0; const t0 = performance.now(); await new Promise(res => { const l = () => { f++; if (performance.now() - t0 > 3000) res(); else requestAnimationFrame(l); }; requestAnimationFrame(l); }); return { fps: f / 3, avgMs: MM3.perf.ms / MM3.perf.n, maxMs: MM3.perf.max, info: MM3.info() }; });
  console.log('PERF (swiftshader software GL):', JSON.stringify(perf));
  const bad = logs.filter(l => !noise(l) && /error|PAGEERROR/i.test(l)); ok('console: no errors during real-input run', bad.length === 0, bad.join(' | ').slice(0, 400));
  const failed = R.filter(r => !r[1]); console.log('\n' + (R.length - failed.length) + '/' + R.length + ' passed'); await browser.close(); process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
