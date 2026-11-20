// Renders every room in the THREE renderer (and optionally CLASSIC) and writes a contact sheet to tests/shots/.
const { open, ROOT } = require('./lib'); const path = require('path');
(async () => {
  const mode = process.argv[2] || 'three'; const cat = +(process.argv[3] || 1); const hot = process.argv[4] === 'hot';
  const { browser, page, logs } = await open({ qs: '?renderer=' + mode + (hot ? '&hotspots=1' : '') });
  await page.evaluate(async (cat) => { await G.newGameFast(); G.fast = false; G.S.cat = cat; }, cat);
  const ids = await page.evaluate(() => Object.keys(G.rooms));
  for (const id of ids) {
    await page.evaluate((id) => { G.S.room = id; G.S.jx = 150; G.S.jy = 118; G.S.ax = 134; G.S.ay = 120; G.catCache = {}; }, id); await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(__dirname, 'shots', `room_${mode}_${id}.png`), clip: { x: 0, y: 0, width: 1280, height: 576 } });
  }
  console.log(logs.filter(l => /error|PAGEERROR|warn/i.test(l) && !/GPU stall|ReadPixels|useLegacyLights/.test(l)).slice(0, 12).join('\n'));
  await browser.close();
  const py = `from PIL import Image, ImageDraw
import sys
ids=${JSON.stringify(ids)}
W,H=640,288; cols=2; rows=(len(ids)+1)//2
S=Image.new('RGB',(W*cols,H*rows))
for i,n in enumerate(ids):
    im=Image.open('${path.join(__dirname, 'shots')}/room_${mode}_'+n+'.png').resize((W,H)); d=ImageDraw.Draw(im); d.rectangle((0,0,80,12),fill=(0,0,0)); d.text((2,1),n,fill=(255,255,0)); S.paste(im,((i%cols)*W,(i//cols)*H))
S.save('${path.join(__dirname, 'shots')}/sheet_${mode}${hot ? '_hot' : ''}.png')`;
  require('child_process').execSync('python3 -', { input: py });
})();
