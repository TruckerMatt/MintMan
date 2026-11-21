// Permanent-ID / package reconciliation checks against the real manifest + the live runtime matcher.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { open, ROOT } = require('./lib');
const R = []; const ok = (n, c, d) => { R.push([n, !!c, d || '']); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
(async () => {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/manifests/voice_manifest.json'), 'utf8')); const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/audio/id_registry.json'), 'utf8'));
  const E = man.entries; const sha = (e) => crypto.createHash('sha1').update(`${e.speaker}|${e.channel}|${e.text}`).digest('hex').slice(0, 10);
  ok('IDS: ' + E.length + ' entries, all unique', new Set(E.map(e => e.id)).size === E.length);
  ok('IDS: every id reproduces from sha1(SPEAKER|channel|text)', E.every(e => e.id === `vo_${e.speaker.toLowerCase()}_${sha(e)}`));
  ok('IDS: every manifest id is in the permanent registry', E.every(e => reg.ids[e.id]));
  ok('IDS: no duplicate (speaker,text) keys', new Set(E.map(e => e.speaker + '|' + e.text.toLowerCase())).size === E.length);
  ok('IDS: planned files follow assets/audio/voice/<speaker>/<id>.mp3 and the speaker folder exists', E.every(e => e.planned_file === `assets/audio/voice/${e.speaker.toLowerCase()}/${e.id}.mp3` && fs.existsSync(path.join(ROOT, 'assets/audio/voice', e.speaker.toLowerCase()))));
  ok('IDS: no audio linked yet and no blocked entry has a file', E.every(e => !e.file));
  const { browser, page, logs } = await open({ seed: false });
  const res = await page.evaluate((man) => {
    const m = JSON.parse(JSON.stringify(man)); for (const e of m.entries) e.file = 'x/' + e.id + '.mp3';          // pretend every clip exists so the matcher indexes everything
    MMAudio.setManifest('voice', m); const bad = [], blocked = []; let hit = 0;
    for (const e of m.entries) { const got = MMAudio.lookupVoice(e.speaker, e.text); if (e.status === 'blocked_dynamic') { if (got) blocked.push(e.id); continue; } if (got && got.id === e.id) hit++; else bad.push(e.id); }
    const radio = m.entries.find(e => e.channel === 'radio' && e.status === 'active'); const viaDisplay = MMAudio.lookupVoice(radio.speaker, '(radio) ' + radio.text);
    const opening = MMAudio.lookupVoice('HOLLIS', '(rubbing his face) Yeah. I know.');
    return { hit, bad: bad.slice(0, 8), badN: bad.length, blocked, viaDisplay: viaDisplay && viaDisplay.id === radio.id, opening: opening && opening.id, active: m.entries.filter(e => e.status === 'active').length };
  }, man);
  ok('MATCHER: all ' + res.active + ' active entries resolve to their own id by (speaker,text)', res.hit === res.active && res.badN === 0, JSON.stringify(res.bad));
  ok('MATCHER: blocked_dynamic entries never resolve (not recordable as-is)', res.blocked.length === 0);
  ok('MATCHER: displayed form with leading "(radio) " / "(rubbing his face) " resolves (' + res.opening + ')', res.viaDisplay && res.opening === 'vo_hollis_4029769567');
  const errs = logs.filter(l => /PAGEERROR|error/i.test(l) && !/GPU stall|ReadPixels|useLegacyLights/.test(l)); ok('CONSOLE clean', errs.length === 0, errs.join('|').slice(0, 200));
  await browser.close(); const f = R.filter(x => !x[1]); console.log('\n' + (R.length - f.length) + '/' + R.length + ' passed'); process.exit(f.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
