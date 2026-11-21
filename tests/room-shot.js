// usage: node room-shot.js <room> [hot] [cat] -> shots/one_<room>[_hot].png (1280x576)
const { open } = require('./lib'); const path = require('path');
(async () => {
  const id = process.argv[2], hot = process.argv[3] === 'hot', cat = +(process.argv[4] || 1);
  const { browser, page, logs } = await open({ qs: '?renderer=three' + (hot ? '&hotspots=1' : '') });
  await page.evaluate(async (cat) => { await G.newGameFast(); G.fast = false; G.S.cat = cat; }, cat);
  await page.evaluate((id) => { G.S.room = id; G.S.jx = 150; G.S.jy = 118; G.S.ax = 134; G.S.ay = 120; G.catCache = {}; }, id); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'shots', `one_${id}${hot ? '_hot' : ''}.png`), clip: { x: 0, y: 0, width: 1280, height: 576 } });
  console.log(logs.filter(l => /error|PAGEERROR|warn|MM3/i.test(l) && !/GPU stall|ReadPixels|useLegacyLights/.test(l)).slice(0, 12).join('\n'));
  await browser.close();
})();
