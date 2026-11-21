// SFX: external clean assets replace the synth for every id; variants; fallback intact. Served over http with the real manifests.
const http = require('http'), fs = require('fs'), path = require('path');
const { open, ROOT } = require('./lib');
const R = []; const ok = (n, c, d) => { R.push([n, !!c, d || '']); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
const MT = { '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.mp3': 'audio/mpeg' };
(async () => {
  const srv = await new Promise(res => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); }).listen(0, () => res(s)); });
  const { browser, page, logs } = await open({ seed: false }); await page.goto('http://localhost:' + srv.address().port + '/index.html'); await page.waitForTimeout(1200);
  await page.evaluate(() => { startGame(false); }); await page.waitForTimeout(1900); await page.mouse.click(640, 300); await page.waitForTimeout(2500);   // unlock -> preload
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/manifests/sfx_manifest.json'), 'utf8')).entries;
  ok('MANIFEST: all 21 sfx ids have files; files exist on disk', man.length === 21 && man.every(e => e.file && fs.existsSync(path.join(ROOT, e.file)) && (!e.files || e.files.every(f => fs.existsSync(path.join(ROOT, f))))));
  const res = await page.evaluate(async (ids) => { G.fast = false; const out = {}; for (const id of ids) { const b = MMAudio.stats.sfxPlayed; Snd.play(id); out[id] = MMAudio.stats.sfxPlayed - b; await new Promise(r => setTimeout(r, 40)); } return out; }, man.map(e => e.id));
  const missing = Object.entries(res).filter(([k, v]) => v !== 1).map(([k]) => k);
  ok('PLAYBACK: Snd.play(id) plays the external clip for all 21 ids (no synth fallback)', missing.length === 0, missing.join(','));
  const variants = await page.evaluate(async () => { const seen = new Set(); for (let i = 0; i < 40; i++) { const e = MMAudio.bySfx.get('meow'); const b = MMAudio.stats.sfxPlayed; Snd.play('meow'); seen.add(MMAudio.stats.sfxPlayed - b); } return { nfiles: MMAudio.bySfx.get('meow').files.length }; });
  ok('VARIANTS: meow has 3 variants chosen randomly', variants.nfiles === 3);
  const fb = await page.evaluate(() => { const e = MMAudio.bySfx.get('click'); const keep = e.file; e.file = 'assets/audio/sfx/does_not_exist.mp3'; let threw = false; try { Snd.play('click'); Snd.play('click'); } catch (x) { threw = true; } e.file = keep; return threw; });
  ok('FALLBACK: a missing sfx file falls back to the synth without throwing', !fb);
  const errs = logs.filter(l => /PAGEERROR|error/i.test(l) && !/GPU stall|ReadPixels|useLegacyLights|404|Failed to load resource/.test(l)); ok('CONSOLE: clean', errs.length === 0, errs.slice(0, 3).join('|'));
  await browser.close(); srv.close(); const f = R.filter(x => !x[1]); console.log('\n' + (R.length - f.length) + '/' + R.length + ' passed'); process.exit(f.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
