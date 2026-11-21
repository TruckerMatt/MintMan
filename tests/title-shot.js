const { open } = require('./lib');
(async () => { const { browser, page, logs } = await open({ qs: '?renderer=three' });
  await page.waitForTimeout(2500); await page.screenshot({ path: 'shots/title.png' });
  console.log(await page.evaluate(() => ({ started: G.started, shown: MM3.shown, status: MM3.status })), logs.filter(l => /error|warn|PAGEERROR/i.test(l) && !/GPU stall|ReadPixels|useLegacy/.test(l)).slice(0, 6).join('\n'));
  await browser.close(); })();
