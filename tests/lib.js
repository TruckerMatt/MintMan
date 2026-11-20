const { chromium } = require('playwright');
const fs = require('fs');
const THREE_SRC = fs.readFileSync('' + (process.env.THREE_LOCAL || '/tmp/w/t/node_modules/three/build/three.module.js') + '');
exports.open = async function (opts = {}) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
  const logs = []; page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.route('https://cdn.jsdelivr.net/**', r => opts.blockCdn ? r.abort() : r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: THREE_SRC }));
  if (opts.seed !== false) await page.addInitScript(() => { let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  await page.goto('file://' + (opts.file || '/home/user/MintMan/MINT_MAN_TUESDAY_THREE_BREAKROOM.html') + (opts.qs || ''));
  await page.waitForTimeout(800);
  return { browser, page, logs };
};
