// In-game technical integration test with the REAL manifests and generated clips (served over http). Not a subjective listening QA.
const http = require('http'), fs = require('fs'), path = require('path');
const { open, ROOT } = require('./lib');
const R = []; const ok = (n, c, d) => { R.push([n, !!c, d || '']); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
const MT = { '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.mp3': 'audio/mpeg' };
(async () => {
  const srv = await new Promise(res => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); }).listen(0, () => res(s)); });
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/manifests/voice_production_manifest.json'), 'utf8')).entries.filter(e => ['QA_REQUIRED', 'GENERATED'].includes(e.production_status));
  const by = {}; for (const e of man) (by[e.speaker] = by[e.speaker] || []).push(e);
  const picks = Object.entries(by).map(([s, l]) => l[0]);                       // first generated clip of every speaker that has audio
  const { browser, page, logs } = await open({ seed: false }); await page.goto('http://localhost:' + srv.address().port + '/index.html'); await page.waitForTimeout(1200);
  await page.evaluate(() => { startGame(false); }); await page.waitForTimeout(1900); await page.mouse.click(640, 300); await page.waitForTimeout(800);
  const st = () => page.evaluate(() => ({ say: !!G.say, who: G.say && G.say.who, vp: MMAudio.stats.voicePlayed, node: !!MMAudio.voiceNode, entries: MMAudio.manifests.voice.entries.filter(e => e.file).length, indexed: MMAudio.byVoiceText.size }));
  let s = await st(); ok('MANIFEST: runtime loaded voice manifest with linked files (' + s.entries + ' with audio, ' + s.indexed + ' indexed)', s.entries > 0 && s.indexed === s.entries);
  // clear opening dialogue so we control the sequence
  for (let i = 0; i < 80; i++) { const a = await page.evaluate(() => ({ say: !!G.say, busy: G.busy })); if (!a.busy && !a.say) break; if (a.say) await page.mouse.click(640, 100); await page.waitForTimeout(80); }
  let played = 0, wrong = [];
  for (const e of picks) {
    const line = e.speaker === 'NARRATOR' ? null : e.speaker + ': ';
    const before = await st();
    const shown = await page.evaluate(async (a) => { const t = a.sp === 'NARRATOR' ? a.text : a.sp + ': ' + a.text; const p = say(t); window.__p = p; await new Promise(r => setTimeout(r, 900)); return { say: !!G.say, who: G.say && G.say.who, node: !!MMAudio.voiceNode, vp: MMAudio.stats.voicePlayed, lookup: (MMAudio.lookupVoice(a.sp, a.text) || {}).id }; }, { sp: e.speaker, text: e.text });
    if (shown.say && shown.lookup === e.id && shown.vp > before.vp) played++; else wrong.push(e.speaker + ':' + JSON.stringify(shown));
    await page.mouse.click(640, 100); await page.waitForTimeout(150);
    const after = await st(); if (after.node) wrong.push('voice kept playing after advance: ' + e.speaker);
    for (let i = 0; i < 20 && (await st()).say; i++) { await page.mouse.click(640, 100); await page.waitForTimeout(80); }
  }
  ok('PLAYBACK: for each of ' + picks.length + ' speakers the right clip is selected, subtitle shows and the clip starts (' + played + ')', played === picks.length, wrong.slice(0, 4).join(' | '));
  ok('ADVANCE: clicking stops the current clip for every speaker', !wrong.some(w => w.startsWith('voice kept')));
  // consecutive lines: next line starts the next voice (no overlap)
  const two = man.filter(e => e.speaker === 'NARRATOR').slice(1, 3);
  const ov = await page.evaluate(async (L) => { const out = []; for (const e of L) { say(e.text); await new Promise(r => setTimeout(r, 700)); out.push(!!MMAudio.voiceNode); const id = (MMAudio.lookupVoice(e.speaker, e.text) || {}).id; out.push(id === e.id); G.say && G.say.res(); await new Promise(r => setTimeout(r, 200)); } return out; }, two);
  ok('SEQUENCE: next line starts its own clip with no leftover from the previous', ov.every(Boolean));
  // missing optional VO must not block
  const miss = await page.evaluate(async () => { const t0 = performance.now(); const p = say('HOLLIS: This line has no recorded audio anywhere.'); await new Promise(r => setTimeout(r, 500)); const shown = !!G.say; G.say.res(); await p; return { shown, node: !!MMAudio.voiceNode }; });
  ok('MISSING VO: subtitle shown, nothing blocks, no clip', miss.shown && !miss.node);
  // room transition / save+load / new game leave no stale voice
  const stale = await page.evaluate(async () => { const e = MMAudio.manifests.voice.entries.find(x => x.file && x.speaker === 'NARRATOR'); const p = say(e.text); await new Promise(r => setTimeout(r, 600)); const playing = !!MMAudio.voiceNode; G.say.res(); await p; await new Promise(r => setTimeout(r, 150)); return { playing, after: !!MMAudio.voiceNode }; });
  ok('STALE VOICE: no clip left playing after the line ends', stale.playing && !stale.after);
  const ng = await page.evaluate(async () => { const e = MMAudio.manifests.voice.entries.find(x => x.file && x.speaker === 'NARRATOR'); say(e.text); await new Promise(r => setTimeout(r, 700)); const before = !!MMAudio.voiceNode; startGame(false); const after = !!MMAudio.voiceNode; return { before, after }; });
  ok('NEW GAME: a clip playing when a new game starts is stopped (before=' + ng.before + ', after=' + ng.after + ')', ng.before && !ng.after);
  const errs = logs.filter(l => /PAGEERROR|error/i.test(l) && !/GPU stall|ReadPixels|useLegacyLights|404|Failed to load resource/.test(l)); ok('CONSOLE: clean', errs.length === 0, errs.slice(0, 4).join('|'));
  await browser.close(); srv.close(); const f = R.filter(x => !x[1]); console.log('\n' + (R.length - f.length) + '/' + R.length + ' passed'); process.exit(f.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
