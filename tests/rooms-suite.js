// Multi-room Three.js checks: hotspots, transitions/leaks, toggle, NPC/cat visibility, console cleanliness.
const { open } = require('./lib');
const R = []; const ok = (n, c, d) => { R.push([n, !!c, d || '']); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
const noise = l => /GPU stall|useLegacyLights|ReadPixels|\[MM3\] Three/.test(l);
(async () => {
  const { browser, page, logs } = await open({ seed: false });
  await page.evaluate(async () => { await G.newGameFast(); G.fast = false; G.S.cat = 1; });
  const ids = await page.evaluate(() => Object.keys(G.rooms));
  const goto = async (id, ms = 350) => { await page.evaluate((id) => { G.S.room = id; G.S.jx = 150; G.S.jy = 118; G.S.ax = 134; G.S.ay = 120; G.catCache = {}; }, id); await page.waitForTimeout(ms); };

  // 1. strict clickability for every prop/exit in every room (pickAt is renderer independent; this must match the classic baseline)
  const strict = await page.evaluate((ids) => { G.strict = true; const out = {}; for (const id of ids) { G.S.room = id; G.S.mintOn = false; G.strictErrors = []; for (const p of propsNow()) if (p.r && p.id !== 'ground' && !p.onlyItem && !p.onlyVerb && p.r[0] > -5) G.strictCheck({ kind: 'prop', obj: p, name: p.name }, 'LOOK'); for (const e of exitsNow()) G.strictCheck({ kind: 'exit', obj: e }, 'WALK'); out[id] = G.strictErrors.slice(); } G.strict = false; G.S.room = 'break'; return out; }, ids);
  const bad = Object.entries(strict).filter(([k, v]) => v.length);
  ok('HOTSPOTS: strict clickability in all ' + ids.length + ' rooms (props + exits)', bad.length === 0, bad.map(([k, v]) => k + ':' + v.join(',')).join(' | '));

  // 2. every room renders in 3D without errors; transitions do not leak GPU resources
  const cycle = async () => { const mem = []; for (const id of ids) { await goto(id); const st = await page.evaluate(() => ({ r: G.S.room, a: MM3.active, i: MM3.info() })); mem.push([id, st.a, st.i && st.i.geometries, st.i && st.i.textures, st.i && st.i.room]); } return mem; };
  const c1 = await cycle(), c2 = await cycle(), c3 = await cycle();
  ok('ROOMS: all rooms rendered by Three (active + built room == current room)', c1.every(m => m[1] && m[4] === m[0]), JSON.stringify(c1.filter(m => !(m[1] && m[4] === m[0]))));
  const gsum = (c) => c.reduce((a, m) => a + (m[2] || 0), 0), tsum = (c) => c.reduce((a, m) => a + (m[3] || 0), 0);
  ok('TRANSITIONS: geometry/texture counts identical after 2nd and 3rd full tour (no leak): geo ' + gsum(c2) + '/' + gsum(c3) + ' tex ' + tsum(c2) + '/' + tsum(c3), gsum(c2) === gsum(c3) && tsum(c2) === tsum(c3));
  const perRoom = c3.map(m => m[0] + ':' + m[2] + 'g/' + m[3] + 't').join(' '); console.log('  per-room memory:', perRoom);
  const perf = await page.evaluate(() => ({ loads: MM3.perf.rooms, disposed: MM3.perf.disposed })); ok('TRANSITIONS: every load was matched by a dispose (' + JSON.stringify(perf) + ')', perf.loads - perf.disposed <= 1);

  // 3. classic/three toggle in several rooms: state byte-identical, canvas visibility follows
  for (const id of ['floor', 'outbound', 'suite', 'yard']) {
    await goto(id, 600); await page.waitForTimeout(1500); const before = await page.evaluate(() => JSON.stringify(G.S)); const keep = await page.evaluate(() => ({ jx: G.S.jx, jy: G.S.jy }));
    await page.keyboard.press('F8'); await page.waitForTimeout(300); const mid = await page.evaluate(() => ({ s: JSON.stringify(G.S), shown: MM3.shown, active: MM3.active }));
    await page.keyboard.press('F8'); await page.waitForTimeout(300); const after = await page.evaluate(() => ({ s: JSON.stringify(G.S), shown: MM3.shown, active: MM3.active }));
    ok('TOGGLE ' + id + ': F8 x2 leaves G.S identical; classic hides Three, three shows it', mid.s === before && after.s === before && mid.shown === 'none' && !mid.active && after.shown === 'block' && after.active);
  }

  // 4. NPC visibility: a 3D person exists near every visible NPC prop, and none where no NPC prop is visible
  const npc = await page.evaluate(async (ids) => { const out = []; for (const id of ids) { G.S.room = id; await new Promise(r => setTimeout(r, 350)); const dbg = MM3.debugState(); const props = propsNow().filter(p => p.npc && p.r && p.r[0] > -5); const persons = dbg.persons; const miss = props.filter(p => !persons.some(q => q[0] >= p.r[0] - 20 && q[0] <= p.r[0] + p.r[2] + 20 && q[1] >= p.r[1] - 10 && q[1] <= p.r[1] + p.r[3] + 20)).map(p => p.id); out.push({ id, props: props.map(p => p.id), persons: persons.length, miss }); } return out; }, ids);
  console.log('  NPC props -> 3D persons:', npc.filter(n => n.props.length || n.persons).map(n => n.id + '[' + n.props.join(',') + ']=' + n.persons).join(' '));
  const npcBad = npc.filter(n => n.persons < n.props.length || (!n.props.length && n.persons)); ok('NPC VISIBILITY: 3D people match logically-present NPC props in all rooms', npcBad.length === 0, JSON.stringify(npcBad));

  // 5. cat escalation: 3D cat count == min(40, catList().length) at every level, in a crowded room and the break room
  for (const id of ['floor', 'break', 'staging']) for (const lv of [0, 1, 2, 3, 4]) {
    await page.evaluate((lv) => { G.S.cat = lv; G.catCache = {}; }, lv); await goto(id, 500); const r = await page.evaluate(() => ({ want: Math.min(40, catList().length + MM3.debugState().extraCats), got: MM3.debugState().cats.length, calls: MM3.info().calls }));
    if (lv === 4 || r.want !== r.got) ok('CATS ' + id + ' level ' + lv + ': 3D cats ' + r.got + ' == catList()+room-art cats ' + r.want + ' (draw calls ' + r.calls + ')', r.want === r.got);
  }
  const errs = logs.filter(l => !noise(l) && /error|PAGEERROR|warn/i.test(l)); ok('CONSOLE: no errors/warnings during multi-room run', errs.length === 0, errs.slice(0, 6).join(' | ').slice(0, 500));
  await browser.close(); const failed = R.filter(x => !x[1]); console.log('\n' + (R.length - failed.length) + '/' + R.length + ' passed'); process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
