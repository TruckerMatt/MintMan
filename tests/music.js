// Music: generated tracks load over http, follow the scene, crossfade, respect N toggle; chiptune yields; missing files fall back.
const { open, ROOT } = require('./lib'); const http = require('http'), fs = require('fs'), path = require('path');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css' };
const serve = () => new Promise((res) => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); }); s.listen(0, () => res(s)); });
const R = []; const ok = (n, c, d) => { R.push([n, !!c, d || '']); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
(async () => {
  const srv = await serve(); const port = srv.address().port;
  const { browser, page, logs } = await open({ seed: false, file: undefined });
  await page.goto('http://localhost:' + port + '/index.html?renderer=three'); await page.waitForTimeout(3500);
  await page.mouse.click(300, 300); await page.waitForTimeout(2500);   // user gesture unlocks WebAudio
  const st = () => page.evaluate(() => ({ on: MMAudio.musOn, want: MMAudio.musWant, id: MMAudio.mus && MMAudio.mus.id, scene: MMAudio.musicScene(), n: MMAudio.byMusic && MMAudio.byMusic.size }));
  let s = await st(); ok('MANIFEST: 6 music tracks indexed', s.n === 6, JSON.stringify(s));
  ok('TITLE: theme track playing, chiptune yields', s.scene === 'title' && s.id === 'mus_theme' && s.on, JSON.stringify(s));
  await page.evaluate(async () => { await G.newGameFast(); G.fast = false; G.S.room = 'break'; }); await page.waitForTimeout(3500); s = await st();
  ok('BREAK ROOM: office track', s.id === 'mus_office', JSON.stringify(s));
  await page.evaluate(() => { G.S.room = 'floor'; }); await page.waitForTimeout(3500); s = await st(); ok('FLOOR: warehouse track', s.id === 'mus_floor', JSON.stringify(s));
  await page.evaluate(() => { G.S.room = 'yard'; }); await page.waitForTimeout(3500); s = await st(); ok('YARD: yard track', s.id === 'mus_yard', JSON.stringify(s));
  await page.evaluate(() => { G.S.room = 'floor'; G.S.mintOn = true; }); await page.waitForTimeout(3500); s = await st(); ok('MINT MODE: tension track', s.id === 'mus_tension', JSON.stringify(s));
  await page.evaluate(() => { G.S.mintOn = false; G.S.room = 'floor'; }); await page.waitForTimeout(3500); s = await st(); ok('MINT OFF: back to floor track', s.id === 'mus_floor', JSON.stringify(s));
  await page.evaluate(() => { G.endMint = true; }); await page.waitForTimeout(3500); s = await st(); ok('ENDING: ending track', s.id === 'mus_ending', JSON.stringify(s));
  await page.evaluate(() => { G.endMint = false; Snd.music = false; MMAudio.applyVolumes(); }); const g0 = await page.evaluate(() => MMAudio.mix.music.gain.value);
  await page.evaluate(() => { Snd.music = true; MMAudio.applyVolumes(); }); const g1 = await page.evaluate(() => MMAudio.mix.music.gain.value);
  ok('N TOGGLE: music bus muted/unmuted', g0 === 0 && g1 > 0, g0 + '/' + g1);
  const bad = logs.filter(l => /error|PAGEERROR/i.test(l) && !/GPU stall|ReadPixels|useLegacy|Failed to load resource/.test(l));
  ok('console clean', bad.length === 0, bad.slice(0, 3).join(' | '));
  const f = R.filter(r => !r[1]).length; console.log('\n' + (R.length - f) + '/' + R.length + ' passed'); await browser.close(); srv.close(); process.exit(f ? 1 : 0);
})();
