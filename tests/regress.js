const { open } = require('./lib');
const R = []; const ok = (n, c, d) => { R.push([n, !!c, d || '']); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
const noise = l => /GPU stall|useLegacyLights|ReadPixels|\[MM3\] Three/.test(l);
async function chain(page) {   // scripted break-room puzzle chain via the engine's test API (identical for both renderers)
  return page.evaluate(async () => {
    { let a = 999; Math.random = () => { if (/drawScene|renderThree|audio\.js|three\.module|src\/rendering\//.test(new Error().stack)) return .5; a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; } G.testInvariants = true; await G.newGameFast(); G.strict = true; const out = [];
    const step = async (name, fn) => { try { await fn(); out.push(name + ':ok'); } catch (e) { out.push(name + ':ERR ' + e.message); } };
    await step('look clock', () => G.do('LOOK', 'clock'));
    await step('take clock', () => G.do('TAKE', 'clock'));
    await step('sbat->scanner', () => G.do('USE', 'sbat', 'scanner'));
    await step('look bulletin', () => G.do('LOOK', 'bulletin'));
    await step('take flyer', () => G.do('TAKE', 'bulletin'));
    await step('look couch', () => G.do('LOOK', 'couch'));
    await step('open couch', () => G.do('OPEN', 'couch'));
    await step('look table', () => G.do('LOOK', 'table'));
    await step('look pot', () => G.do('LOOK', 'pot'));
    await step('look microwave', () => G.do('LOOK', 'microwave'));
    await step('look counter', () => G.do('LOOK', 'counter'));
    await step('look fridge', () => G.do('LOOK', 'fridge'));
    await step('open fridge', () => G.do('OPEN', 'fridge'));
    await step('look vending', () => G.do('LOOK', 'vending'));
    await step('scan vending', () => G.do('SCAN', 'vending'));
    await step('look gap', () => G.do('LOOK', 'gap'));
    await step('juno gap (radio)', () => G.do('JUNO', 'gap'));
    await step('look bowl', () => G.do('LOOK', 'bowl1'));
    await step('take bowl', () => G.do('TAKE', 'bowl1'));
    await step('look label', () => G.do('LOOK', 'label_on_boot'));
    await step('take label', () => G.do('TAKE', 'label_on_boot'));
    await step('look paws', () => G.do('LOOK', 'paws'));
    await step('juno paws', () => G.do('JUNO', 'paws'));
    await step('look juno', () => G.do('LOOK', 'juno'));
    await step('look cat', () => G.do('LOOK', 'cat'));
    await step('talk cat', () => G.do('TALK', 'cat'));
    await step('vend crackers', async () => { G.choose(/crackers/i); await G.do('USE', 'quarter', 'vending'); });
    await step('look exit', () => G.do('LOOK', 'to_lockers'));
    await step('go lockers', () => G.go('lockers'));
    out.push('room:' + G.S.room);
    await step('back to break', () => G.go('break'));
    out.push('room:' + G.S.room);
    return { out, strictErrors: G.strictErrors || [], errors: G.errors || [], invariants: G.invariantErrors || [], S: JSON.parse(JSON.stringify(G.S)), log: G.log.slice(-60) };
  });
}
(async () => {
  // ---------- differential: classic vs three, identical scripted run, state must be byte-identical
  const res = {};
  for (const mode of ['classic', 'three']) {
    const { browser, page, logs } = await open({ qs: '?renderer=' + mode });
    await page.waitForTimeout(500);
    const r = await chain(page); res[mode] = r;
    const bad = logs.filter(l => !noise(l) && /error|PAGEERROR|warn/i.test(l));
    ok('chain/' + mode + ' no step errors', !r.out.some(x => /ERR/.test(x)), r.out.filter(x => /ERR/.test(x)).join('; '));
    ok('chain/' + mode + ' strict clickability (all verbs/props/exits)', r.strictErrors.length === 0, r.strictErrors.join('; '));
    ok('chain/' + mode + ' engine errors + invariants clean', r.errors.length === 0 && r.invariants.length === 0, JSON.stringify(r.errors.concat(r.invariants)).slice(0, 300));
    ok('chain/' + mode + ' console clean', bad.length === 0, bad.join(' | ').slice(0, 300));
    await browser.close();
  }
  ok('TEST 12: final G.S identical classic vs three', JSON.stringify(res.classic.S) === JSON.stringify(res.three.S));
  { const a = res.classic.log, b = res.three.log; let d = ''; for (let i = 0; i < Math.max(a.length, b.length); i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) { d = i + ': ' + JSON.stringify(a[i]).slice(0, 160) + ' VS ' + JSON.stringify(b[i]).slice(0, 160); break; } ok('TEST 12: dialogue log identical classic vs three', !d, d); }
  ok('TEST 12: step results identical', JSON.stringify(res.classic.out) === JSON.stringify(res.three.out), res.three.out.join(','));
  console.log('S.f keys after chain:', Object.keys(res.three.S.f).join(','), 'inv:', res.three.S.inv.join(','));
  const failed = R.filter(r => !r[1]); console.log('\n' + (R.length - failed.length) + '/' + R.length + ' passed'); process.exit(failed.length ? 1 : 0);
})();
