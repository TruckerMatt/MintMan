const { open } = require('./lib');
(async () => { const { browser, page } = await open({ qs: '?renderer=classic' });
  const out = await page.evaluate((ids) => ids.map(id => { const r = G.rooms[id]; return id + ' walk' + JSON.stringify(r.walk) + '\n' + (r.props || []).map(p => '  ' + p.id + (p.npc ? '*' : '') + ' ' + JSON.stringify(p.r) + (p.z !== undefined ? ' z' + p.z : '') + (p.vis ? ' vis:' + p.vis.toString().slice(0, 60) : '')).join('\n') + '\n  exits: ' + (r.exits || []).map(e => e.id + JSON.stringify(e.r)).join(' ') }).join('\n'), process.argv.slice(2));
  console.log(out); await browser.close(); })();
