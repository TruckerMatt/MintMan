// Ambience: every room gets its looping bed with the real manifests/files; beds cross-fade; no-file rooms stay silent. Served over http.
const http = require('http'), fs = require('fs'), path = require('path');
const { open, ROOT } = require('./lib');
const R = []; const ok = (n, c, d) => { R.push([n, !!c, d || '']); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
const MT = { '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.mp3': 'audio/mpeg' };
(async () => {
  const srv = await new Promise(res => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); }).listen(0, () => res(s)); });
  const am = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/manifests/ambience_manifest.json'), 'utf8')).entries;
  ok('MANIFEST: 16 ambience entries, all with existing files', am.length === 16 && am.every(e => e.file && fs.existsSync(path.join(ROOT, e.file))));
  const { browser, page, logs } = await open({ seed: false }); await page.goto('http://localhost:' + srv.address().port + '/index.html'); await page.waitForTimeout(1200);
  await page.evaluate(() => { startGame(false); }); await page.waitForTimeout(1900); await page.mouse.click(640, 300); await page.waitForTimeout(800);
  await page.evaluate(() => { G.fast = false; });
  const rooms = await page.evaluate(() => Object.keys(G.rooms)); const bad = []; let prev = null; let loopOk = true, gainSeen = false;
  for (const r of rooms) {
    await page.evaluate((r) => { G.S.room = r; }, r); const want = await page.evaluate((r) => MMAudio.ROOM_AMBIENCE[r], r);
    let got = null; for (let i = 0; i < 40 && got !== want; i++) { await page.waitForTimeout(150); got = await page.evaluate(() => MMAudio.amb && MMAudio.amb.id); }
    if (got !== want) bad.push(r + ':' + got + '!=' + want); else { const l = await page.evaluate(() => MMAudio.amb.s.loop); if (!l) loopOk = false; }
  }
  ok('ROOMS: all ' + rooms.length + ' rooms start their own bed (' + bad.join(',') + ')', bad.length === 0);
  ok('LOOP: beds are looping sources', loopOk);
  const cf = await page.evaluate(async () => { G.S.room = 'break'; await new Promise(r => setTimeout(r, 2500)); const a = MMAudio.amb; G.S.room = 'yard'; await new Promise(r => setTimeout(r, 2500)); const b = MMAudio.amb; return { a: a && a.id, b: b && b.id, oldGain: a ? a.g.gain.value : null, newGain: b ? b.g.gain.value : null }; });
  ok('CROSSFADE: break -> yard hands over (old bed faded to ~0, new bed up) ' + JSON.stringify(cf), cf.a === 'breakroom_hum' && cf.b === 'yard_exterior' && cf.oldGain < 0.05 && cf.newGain > 0.3);
  const nf = await page.evaluate(async () => { const e = MMAudio.byAmb.get('hr_office'); const keep = e.file; e.file = null; G.S.room = 'hr'; await new Promise(r => setTimeout(r, 2500)); const amb = MMAudio.amb; e.file = keep; return { amb: amb && amb.id }; });
  ok('NO FILE: a room whose bed has no file is silent and nothing breaks', !nf.amb);
  const errs = logs.filter(l => /PAGEERROR|error/i.test(l) && !/GPU stall|ReadPixels|useLegacyLights|404|Failed to load resource/.test(l)); ok('CONSOLE: clean', errs.length === 0, errs.slice(0, 3).join('|'));
  await browser.close(); srv.close(); const f = R.filter(x => !x[1]); console.log('\n' + (R.length - f.length) + '/' + R.length + ' passed'); process.exit(f.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
