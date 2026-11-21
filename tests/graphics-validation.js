// Graphics-upgrade validation (hand-modelled rooms). Everything here is run for real; nothing is claimed beyond what the checks assert.
const { open } = require('./lib');
const R = []; const ok = (n, c, d) => { R.push([n, !!c, d || '']); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
const noise = l => /GPU stall|useLegacyLights|ReadPixels|\[MM3\] Three/.test(l);
(async () => {
  const { browser, page, logs } = await open({ qs: '?renderer=three' });
  await page.evaluate(async () => { await G.newGameFast(); G.fast = true; G.S.cat = 1; });
  await page.evaluate(() => { Object.assign(G.S.f, { parts_open: true, tucker_cleared: true, mgmt_open: true, tunnel_found: true, suite_open: true, mint_ready: false }); G.S.act = 6; });   // open the story gates so every exit is walkable
  const room = () => page.evaluate(() => ({ r: G.S.room, a: MM3.active, b: MM3.debugState() && MM3.debugState().room }));
  // 1. alternate-order tours through REAL exits (graph walk with G.go), two different orders
  const exitGraph = await page.evaluate(() => { const g = {}, was = G.S.room; for (const id of Object.keys(G.rooms)) { G.S.room = id; g[id] = exitsNow().map(e => e.to); } G.S.room = was; return g; });
  const tour = async (order, label) => {
    let bad = []; let cur = await page.evaluate(() => G.S.room);
    for (const id of order) {
      // BFS path on the exit graph to the target room
      const prev = { [cur]: null }; const q = [cur]; while (q.length) { const x = q.shift(); for (const y of exitGraph[x] || []) if (!(y in prev)) { prev[y] = x; q.push(y); } }
      if (!(id in prev)) { bad.push('unreachable ' + id); continue; } const path = []; for (let x = id; x !== cur; x = prev[x]) path.unshift(x);
      for (const step of path) { try { await page.evaluate(async (s) => { await G.go(s); }, step); } catch (e) { bad.push('go ' + step + ': ' + e.message.slice(0, 60)); } await page.waitForTimeout(120); const st = await room(); if (!(st.a && st.b === st.r)) bad.push(st.r + ' not built (built=' + st.b + ')'); }
      cur = await page.evaluate(() => G.S.room);
    }
    ok('ALT ORDER TOUR ' + label + ': ' + order.length + ' hops through real exits, 3D room built after every step', bad.length === 0, bad.slice(0, 4).join(' | '));
  };
  const all = Object.keys(exitGraph).filter(r => !['remote', 'gordoncall'].includes(r));
  await tour(all, 'A (declaration order)'); await tour(all.slice().reverse(), 'B (reverse order)'); await tour(['yard', 'tunnel', 'hr', 'smoke', 'suite', 'charging', 'drain', 'ops', 'outbound', 'parts', 'break'], 'C (scattered)');
  // 2. save / reload per act in a hand-modelled room, state + 3D build match
  for (const [act, rid] of [[1, 'floor'], [2, 'staging'], [3, 'outbound'], [4, 'yard'], [5, 'ops'], [6, 'suite']]) {
    await page.evaluate(([act, rid]) => { G.fast = false; G.busy = false; G.inProgress = false; G.say = null; G.menuState = null; G.overlay = null; G.S.act = act; G.S.room = rid; G.S.jx = 150; G.S.jy = 118; G.pendingSave = false; const r = saveGame(); G.saveRet = r; G.fast = true; }, [act, rid]);
    const savedOk = await page.evaluate(() => G.saveRet);
    const before = await page.evaluate(() => JSON.stringify({ r: G.S.room, a: G.S.act, f: G.S.f, inv: G.S.inv }));
    await page.reload(); await page.waitForTimeout(1200);
    await page.evaluate(() => { startGame(true); }); await page.waitForTimeout(900);
    const after = await page.evaluate(() => ({ s: JSON.stringify({ r: G.S.room, a: G.S.act, f: G.S.f, inv: G.S.inv }) })); const built = await page.evaluate(() => MM3.debugState() && MM3.debugState().room);
    ok('SAVE/RELOAD act ' + act + ' in ' + rid + ': every saved flag/inventory/room preserved (load may add derived flags via repairState), 3D room rebuilt', savedOk && (() => { const a = JSON.parse(before), b = JSON.parse(after.s); return a.r === b.r && a.a === b.a && JSON.stringify(a.inv) === JSON.stringify(b.inv) && Object.keys(a.f).every(k => JSON.stringify(a.f[k]) === JSON.stringify(b.f[k])); })() && built === rid, 'saved=' + savedOk + ' built=' + built + (after.s === before ? '' : ' DIFF ' + (() => { const a = JSON.parse(before), b = JSON.parse(after.s); const d = []; for (const k of new Set([...Object.keys(a.f), ...Object.keys(b.f)])) if (JSON.stringify(a.f[k]) !== JSON.stringify(b.f[k])) d.push(k + ':' + JSON.stringify(a.f[k]) + '->' + JSON.stringify(b.f[k])); if (a.r !== b.r) d.push('room'); if (JSON.stringify(a.inv) !== JSON.stringify(b.inv)) d.push('inv'); return d.join(','); })()));
  }
  // 3. high-cat Mint in hand rooms (cat 4, Mint 3) + HALO climax integrity sweep in the suite
  const hi = await page.evaluate(async () => { G.fast = false; const S = G.S; Object.assign(S, { act: 6, mint: 3, mintOn: true, cat: 4 }); const out = []; for (const id of ['floor', 'staging', 'yard', 'suite', 'mgmt']) { S.room = id; G.catCache = {}; await new Promise(r => setTimeout(r, 500)); const d = MM3.debugState(); out.push([id, d.room === id, d.cats.length, MM3.info().calls]); } return out; });
  ok('HIGH-CAT MINT: floor/staging/yard/suite/mgmt render (cat 4, Mint 3)', hi.every(x => x[1]), JSON.stringify(hi));
  const halo = await page.evaluate(async () => { const S = G.S; S.room = 'suite'; S.f.boss_started = true; S.f.boss_done = false; const o = []; for (const integ of [100, 60, 20, 0]) { S.boss = S.boss || {}; S.boss.integrity = integ; await new Promise(r => setTimeout(r, 350)); o.push([integ, MM3.debugState().room === 'suite']); } return o; });
  ok('HALO CLIMAX: suite renders through integrity 100/60/20/0', halo.every(x => x[1]), JSON.stringify(halo));
  // 4. ending sequence -> credits -> post-credit, then NEW GAME AFTER COMPLETION
  const errs0 = await page.evaluate(() => (G.errors || []).length);
  const end = await page.evaluate(async () => { try { G.fast = true; G.S.f.boss_started = true; G.S.f.boss_done = true; await ending(); return { complete: !!G.gameComplete, postcredit: !!G.postcredit, room: G.S.room, active: MM3.active }; } catch (e) { return { err: e.message }; } });
  ok('ENDING: vignettes -> break room -> credits -> post-credit complete (3D renderer stayed active)', end.complete && end.postcredit && end.active, JSON.stringify(end));
  const ng = await page.evaluate(async () => { await G.newGameFast(); G.fast = false; await new Promise(r => setTimeout(r, 900)); const d = MM3.debugState(); return { room: G.S.room, built: d.room, mint: G.S.mintOn, complete: !!G.gameComplete, endMint: !!G.endMint }; });
  ok('NEW GAME AFTER COMPLETION: break room rebuilt, Mint off', ng.room === 'break' && ng.built === 'break' && !ng.mint, JSON.stringify(ng));
  const errs = await page.evaluate(() => (G.errors || []).length);
  ok('console/G.errors clean through all graphics validation runs', errs === errs0 && !logs.filter(l => /error|PAGEERROR|warn/i.test(l) && !noise(l)).length, logs.filter(l => /error|PAGEERROR|warn/i.test(l) && !noise(l)).slice(0, 4).join(' | '));
  const f = R.filter(r => !r[1]).length; console.log('\n' + (R.length - f) + '/' + R.length + ' passed'); await browser.close(); process.exit(f ? 1 : 0);
})();
