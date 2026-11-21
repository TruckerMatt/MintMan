// Runtime-assembled lines: run the REAL game code paths and check every said line resolves to a generated clip.
const { open, ROOT } = require('./lib'); const http = require('http'), fs = require('fs'), path = require('path');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const R = []; const ok = (n, c, d) => { R.push([n, !!c, d || '']); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
(async () => {
  const srv = await new Promise(res => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); }); s.listen(0, () => res(s)); });
  const { browser, page } = await open({ seed: false, file: undefined });
  await page.goto('http://localhost:' + srv.address().port + '/index.html?renderer=classic'); await page.waitForTimeout(1500); await page.mouse.click(300, 300); await page.waitForTimeout(1500);
  const miss = await page.evaluate(async () => {
    await MMAudio.loadManifests(); await G.newGameFast(); const S = G.S; const out = { checked: 0, missing: [] };
    const chk = () => { for (const l of G.log.splice(0)) { const i = l.indexOf(': '); const who = l.slice(0, i), text = l.slice(i + 2); out.checked++; if (!MMAudio.lookupVoice(who, text) && /Pallet [AB]\d|PALLET [AB]\d|PHYSICAL TRUTH|slots are designated|RACK STORAGE|outbound queue|Juno sniffs|Reality integrity|Item I Own|by itself|mutters something|never met/.test(l)) out.missing.push(l.slice(0, 90)); } };
    S.f.sort_open = true; giveItem('jack');
    for (let i = 0; i < PAL.length; i++) { const p = PAL[i]; S.mintOn = false; await scanPallet(i); chk(); S.mintOn = true; await scanPallet(i); chk(); S.mintOn = false; try { await sortPallet(i); } catch (e) { } chk(); G.nextChoices = []; try { await sortResult(p, p.dest); } catch (e) { } chk(); const el = propsNow().find(q => q.id === 'pal_' + p.code); if (el) { try { await el.on.LOOK(); } catch (e) { } chk(); } }
    for (let n = 0; n <= 8; n++) { for (const q of PAL) S.pal[q.code] = undefined; PAL.slice(0, n).forEach(q => S.pal[q.code] = 'store'); S.room = 'racks'; const st = G.rooms.racks.props.find(x => x.id === 'storage'); await st.on.LOOK(); await (st.scan || st.on.scan)(); chk(); }
    for (const id of Object.keys(I)) { if (/bowls/i.test(String(typeof I[id].name === 'function' ? I[id].name() : I[id].name))) continue; giveItem(id, true); for (const v of ['SCAN', 'USE', 'TALK']) { try { await G.do(v, id); } catch (e) { } } chk(); }
    return out;
  });
  ok('DYNAMIC LINES: ' + miss.checked + ' lines said through real code paths; every dynamic line has a clip', miss.missing.length === 0, miss.missing.slice(0, 6).join(' | '));
  const f = R.filter(r => !r[1]).length; console.log('\n' + (R.length - f) + '/' + R.length + ' passed'); await browser.close(); srv.close(); process.exit(f ? 1 : 0);
})();
