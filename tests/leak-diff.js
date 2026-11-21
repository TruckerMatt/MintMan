const { open } = require('./lib');
(async () => { const { browser, page } = await open({ qs: '?renderer=three' });
  await page.evaluate(async () => { await G.newGameFast(); G.fast = false; G.S.cat = 1; });
  const ids = await page.evaluate(() => Object.keys(G.rooms)); const cyc = [];
  for (let c = 0; c < 4; c++) { const m = {}; for (const id of ids) { await page.evaluate((id) => { G.S.room = id; G.S.jx = 150; G.S.jy = 118; G.S.ax = 134; G.S.ay = 120; G.catCache = {}; }, id); await page.waitForTimeout(350); m[id] = await page.evaluate(() => MM3.info().geometries); } cyc.push(m); }
  for (const id of ids) console.log(id, cyc.map(m => m[id]).join(' '));
  await browser.close(); })();
