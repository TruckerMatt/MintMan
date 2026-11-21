// Per-room draw calls / triangles: hand-modelled vs generic extruded builder, at cat level 1 and in the late-state worst case (cat 4, Mint 3).
const { open } = require('./lib');
async function run(generic) {
  const { browser, page } = await open({ qs: '?renderer=three' + (generic ? '&generic=1' : '') });
  await page.evaluate(async () => { await G.newGameFast(); G.fast = false; });
  const ids = await page.evaluate(() => Object.keys(G.rooms)); const out = {};
  for (const [tag, set] of [['lo', { act: 1, mint: 0, mintOn: false, cat: 1 }], ['hi', { act: 6, mint: 3, mintOn: true, cat: 4 }]]) {
    await page.evaluate((s) => Object.assign(G.S, s), set);
    for (const id of ids) { await page.evaluate((id) => { G.S.room = id; G.catCache = {}; }, id); await page.waitForTimeout(500); const i = await page.evaluate(() => MM3.info()); (out[id] = out[id] || {})[tag] = i.calls; (out[id][tag + 'T'] = i.triangles); }
  }
  await browser.close(); return out;
}
(async () => { const A = await run(true), B = await run(false); console.log('room        generic lo/hi      hand lo/hi      tris(hand hi)'); let wa = 0, wb = 0;
  for (const id of Object.keys(A)) { console.log(id.padEnd(12), String(A[id].lo).padStart(5), String(A[id].hi).padStart(5), '      ', String(B[id].lo).padStart(5), String(B[id].hi).padStart(5), '      ', B[id].hiT); wa = Math.max(wa, A[id].hi); wb = Math.max(wb, B[id].hi); }
  console.log('worst-case hi: generic', wa, 'hand', wb); })();
