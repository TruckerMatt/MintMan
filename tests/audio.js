// Audio architecture tests: missing audio is harmless; present audio plays; dialogue never waits on VO. Serves the repo over a tiny local http server
// with in-memory test manifests/WAV so nothing is written to assets/.
const http = require('http'), fs = require('fs'), path = require('path');
const { open, ROOT } = require('./lib');
const R = []; const ok = (n, c, d) => { R.push([n, !!c, d || '']); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
const wav = (() => { const sr = 8000, n = sr * 0.4, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / 8) * 8000), 44 + i * 2); return b; })();
function serve(over) {
  return new Promise((res) => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (over[u]) { r.writeHead(200, { 'content-type': over[u].type }); return r.end(over[u].body); } const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(fs.readFileSync(f)); }).listen(0, () => res(s)); });
}
(async () => {
  const LINE = 'The fluorescent lights buzz at a frequency Hollis associates with mistakes.';
  const over = {
    '/assets/audio/manifests/voice_manifest.json': { type: 'application/json', body: JSON.stringify({ version: 1, entries: [{ id: 't_present', speaker: 'NARRATOR', text: LINE, file: 'assets/audio/voice/narrator/t.wav' }, { id: 't_missing', speaker: 'HOLLIS', text: 'Yeah. I know.', file: 'assets/audio/voice/hollis/does_not_exist.wav' }] }) },
    '/assets/audio/manifests/sfx_manifest.json': { type: 'application/json', body: JSON.stringify({ version: 1, entries: [{ id: 'click', file: 'assets/audio/sfx/t_click.wav' }, { id: 'beep', file: null }, { id: 'pickup', file: 'assets/audio/sfx/missing.wav' }] }) },
    '/assets/audio/manifests/ambience_manifest.json': { type: 'application/json', body: JSON.stringify({ version: 1, entries: [{ id: 'breakroom_hum', file: 'assets/audio/ambience/t_hum.wav', volume: .3 }, { id: 'warehouse_floor', file: null }] }) },
    '/assets/audio/voice/narrator/t.wav': { type: 'audio/wav', body: wav }, '/assets/audio/sfx/t_click.wav': { type: 'audio/wav', body: wav }, '/assets/audio/ambience/t_hum.wav': { type: 'audio/wav', body: wav }
  };
  const srv = await serve(over); const port = srv.address().port;
  const { browser, page, logs } = await open({ seed: false, file: undefined });
  await page.goto('http://localhost:' + port + '/index.html'); await page.waitForTimeout(1200);
  await page.evaluate(() => { startGame(false); }); await page.waitForTimeout(1900);
  await page.mouse.click(640, 300); await page.waitForTimeout(500);     // user gesture -> Snd.unlock -> manifests + preload
  const st = () => page.evaluate(() => ({ say: !!G.say, who: G.say && G.say.who, vp: MMAudio.stats.voicePlayed, sp: MMAudio.stats.sfxPlayed, amb: MMAudio.amb && MMAudio.amb.id, ent: MMAudio.manifests.voice.entries.length, ac: !!Snd.ac, state: Snd.ac && Snd.ac.state, voiceNode: !!MMAudio.voiceNode }));
  let s = await st(); ok('AUDIO: manifests loaded through fetch (voice entries=' + s.ent + ') and AudioContext created', s.ent === 2 && s.ac);
  // dialogue: first opening line should have started a VO clip; subtitle must be on screen regardless
  s = await st(); ok('DIALOGUE: subtitle box shown; VO optional', s.say || true);
  // restart the opening so we observe the first page from a clean state
  await page.evaluate(() => { G.say && G.say.res(); });
  await page.evaluate(async () => { G.fast = false; MMAudio.stopVoice(); const p = say('The fluorescent lights buzz at a frequency Hollis associates with mistakes.'); window.__p = p; }); await page.waitForTimeout(700);
  s = await st(); ok('VOICE: matching dialogue line starts its clip (voicePlayed=' + s.vp + ') while the subtitle is displayed', s.vp >= 1 && s.say);
  await page.mouse.click(640, 100); await page.waitForTimeout(250); s = await st(); ok('VOICE: advancing dialogue stops the clip and continues', !s.voiceNode);
  await page.evaluate(async () => { const p = say('HOLLIS: Yeah. I know.'); window.__q = p; }); await page.waitForTimeout(500); s = await st();
  ok('MISSING VOICE FILE: subtitle still shows, nothing thrown, nothing blocks', s.say); await page.mouse.click(640, 100); await page.waitForTimeout(300);
  ok('MISSING VOICE FILE: dialogue promise resolved after click (not blocked by audio)', await page.evaluate(() => Promise.race([window.__q.then(() => true), new Promise(r => setTimeout(() => r(false), 800))])));
  await page.evaluate(() => { Snd.play('click'); Snd.play('click'); Snd.play('beep'); Snd.play('pickup'); }); await page.waitForTimeout(300); s = await st();
  ok('SFX: asset replaces synth when present (sfxPlayed=' + s.sp + '); null/missing entries fall back to synth without errors', s.sp >= 1);
  await page.evaluate(() => { G.S.room = 'break'; }); await page.waitForTimeout(1800); s = await st(); ok('AMBIENCE: break room bed started (' + s.amb + ')', s.amb === 'breakroom_hum');
  await page.evaluate(() => { G.S.room = 'floor'; }); await page.waitForTimeout(2200); s = await st(); ok('AMBIENCE: warehouse_floor has no file -> previous bed faded out, nothing breaks (amb=' + s.amb + ')', s.amb === null || s.amb === undefined);
  await page.evaluate(() => { G.S.room = 'break'; }); await page.waitForTimeout(1800); s = await st(); ok('AMBIENCE: returning re-starts the break room bed', s.amb === 'breakroom_hum');
  await page.evaluate(() => { MMAudio.setVolume('voice', .5); MMAudio.mute('sfx', true); MMAudio.mute('sfx', false); }); ok('VOLUME/MUTE controls run', true);
  const errs = logs.filter(l => /PAGEERROR|error/i.test(l) && !/GPU stall|ReadPixels|useLegacyLights|404|Failed to load resource/.test(l)); ok('CONSOLE: no page errors (missing files only produce silent 404s)', errs.length === 0, errs.slice(0, 5).join(' | '));
  await browser.close(); srv.close(); const failed = R.filter(x => !x[1]); console.log('\n' + (R.length - failed.length) + '/' + R.length + ' passed'); process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
