const { open } = require('./lib');
(async () => {
  const { browser, page, logs } = await open({});
  await page.evaluate(async () => { await G.newGameFast(); G.fast = false; });
  for (const lv of [1, 2, 3, 4]) {
    await page.evaluate((lv) => { G.S.cat = lv; G.catCache = {}; }, lv); await page.waitForTimeout(600);
    const r = await page.evaluate(async () => { MM3.perf.n = 0; MM3.perf.ms = 0; MM3.perf.max = 0; let f = 0; const t0 = performance.now(); await new Promise(res => { const l = () => { f++; if (performance.now() - t0 > 2500) res(); else requestAnimationFrame(l); }; requestAnimationFrame(l); }); return { cats: catList().length, fps: +(f / 2.5).toFixed(1), jsMsAvg: +(MM3.perf.ms / MM3.perf.n).toFixed(2), jsMsMax: +MM3.perf.max.toFixed(1), ...MM3.info() }; });
    console.log('cat level', lv, JSON.stringify(r));
  }
  await browser.close();
})();
