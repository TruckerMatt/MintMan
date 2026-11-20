'use strict';
// ENGINE: canvas/input wiring, rooms, cats, picking, walking, actions, frame loop
// ---------- canvas ----------
let cv, ctx;
function initCanvas() {
  cv = document.getElementById('game'); cv.width = SW * SCALE; cv.height = SH * SCALE;
  ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; G.cv = cv;
  cv.addEventListener('mousemove', e => { G.mouse = mpos(e); G.hover = pickAt(G.mouse.x, G.mouse.y); });
  cv.addEventListener('mousedown', e => { e.preventDefault(); onClick(mpos(e), e.button === 2); });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', onKey);
}
function mpos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * SW, y: (e.clientY - r.top) / r.height * SH }; }

// ---------- rooms ----------
const room = () => G.rooms[G.S.room];
async function enterRoom(id, x, y, opts = {}) {
  const S = G.S;
  if (S.room && !opts.noFade) await fade(1, 250);
  S.room = id; const r = G.rooms[id]; S.jx = x !== undefined ? x : (r.start ? r.start[0] : 160); S.jy = y !== undefined ? y : (r.start ? r.start[1] : 122);
  S.ax = S.jx - 16; S.ay = S.jy + 2; G.catCache = {};
  tick(1);
  await fade(0, 250);
  if (r.onEnter) await r.onEnter();
  await checkProgress();
}
function propsNow() {
  const r = room(); const out = [];
  for (const p of r.props || []) { if (p.vis && !p.vis(G.S)) continue; if (p.mintOnly && !G.S.mintOn) continue; out.push(p); }
  return out;
}
function exitsNow() { const r = room(); return (r.exits || []).filter(e => !e.vis || e.vis(G.S)); }

// cats
function catList() {
  const S = G.S, r = room(); if (!r.spots || r.nocats) return [];
  const spots = r.spots; let n;
  const lv = S.cat;
  if (lv <= 0) n = 0; else if (lv === 1) n = Math.min(spots.length, r.c1 || 0);
  else n = Math.min(spots.length, Math.max(r.c1 || 0, Math.ceil(spots.length * [0, 0, 0.22, 0.6, 1][lv])));
  if (F('cats_cleared_' + S.room) && lv >= 2) n = Math.min(n, Math.ceil(n * 0.2));
  const key = S.room + ':' + n; if (G.catCache && G.catCache.key === key) return G.catCache.list;
  const list = []; for (let i = 0; i < n; i++) { const sp = spots[i]; list.push({ x: sp[0], y: sp[1], seed: i * 7 + S.room.length * 13 + (sp[2] || 0), pose: sp[3] }); }
  G.catCache = { key, list }; return list;
}

// ---------- picking ----------
function inRect(x, y, r) { return x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]; }
function pickAt(x, y) {
  if (y >= SCENE_H) return null;
  const S = G.S; if (!S || !S.room) return null;
  const props = propsNow().slice().sort((a, b) => (b.z || (b.r[1] + b.r[3])) - (a.z || (a.r[1] + a.r[3])));
  // juno
  if (S.junoWith && !room().noJuno && x > S.ax - 10 && x < S.ax + 10 && y > S.ay - 14 && y < S.ay + 2) return { kind: 'juno', name: 'JUNO', obj: null };
  for (const p of props) if (p.npc && inRect(x, y, p.r)) return { kind: 'prop', name: p.name, obj: p };
  for (const c of catList()) if (x >= c.x - 5 && x < c.x + 5 && y >= c.y - 6 && y < c.y + 2) return { kind: 'cat', name: 'CAT', obj: c };
  for (const p of props) if (inRect(x, y, p.r)) return { kind: 'prop', name: p.name, obj: p };
  for (const e of exitsNow()) if (inRect(x, y, e.r)) return { kind: 'exit', name: e.label, obj: e };
  return { kind: 'floor', name: '', obj: null };
}

// ---------- walking ----------
async function walkTo(x, y) {
  const S = G.S, r = room();
  const w = r.walk || [10, 96, 310, 138];
  x = Math.max(w[0], Math.min(w[2], x)); y = Math.max(w[1], Math.min(w[3], y));
  if (G.fast) { S.jx = x; S.jy = y; S.ax = x - 16; S.ay = y + 2; return; }
  G.walkTarget = { x, y };
  await new Promise(res => { G.walkRes = res; });
}
function updateWalk(dt) {
  const S = G.S; if (!S || !S.room) return;
  const wt = G.walkTarget;
  G.walking = false;
  if (wt) {
    const dx = wt.x - S.jx, dy = wt.y - S.jy, d = Math.hypot(dx, dy), sp = 70 * dt;
    if (d <= sp) { S.jx = wt.x; S.jy = wt.y; G.walkTarget = null; if (G.walkRes) { const r = G.walkRes; G.walkRes = null; r(); } }
    else { S.jx += dx / d * sp; S.jy += dy / d * sp; if (Math.abs(dx) > 1) S.face = dx > 0 ? 1 : -1; G.walking = true; }
  }
  // juno follow / animation
  if (S.junoWith && !G.junoScript) {
    const tx = S.jx - S.face * 16, ty = S.jy + 2, dx = tx - S.ax, dy = ty - S.ay, d = Math.hypot(dx, dy);
    G.junoMoving = false;
    if (d > 4) { const sp = Math.min(d * 3, 80) * dt; S.ax += dx / d * sp; S.ay += dy / d * sp; G.junoFace = dx > 0 ? 1 : -1; G.junoMoving = true; }
  }
}
async function junoGo(x, y, pose) { // scripted Juno movement
  const S = G.S; if (G.fast) { S.ax = x; S.ay = y; G.junoPose = pose || null; return; }
  G.junoScript = true; G.junoPose = null;
  await new Promise(res => { G.junoTarget = { x, y, res }; });
  G.junoPose = pose || null; G.junoScript = G.junoScript && !!pose;
}
function updateJuno(dt) {
  const S = G.S, at = G.junoTarget; if (!at) return;
  const dx = at.x - S.ax, dy = at.y - S.ay, d = Math.hypot(dx, dy), sp = 95 * dt; G.junoMoving = true;
  if (d <= sp) { S.ax = at.x; S.ay = at.y; G.junoTarget = null; G.junoMoving = false; at.res(); } else { S.ax += dx / d * sp; S.ay += dy / d * sp; G.junoFace = dx > 0 ? 1 : -1; }
}
async function junoAnim(pose, ms = 900) { G.junoPose = pose; if (pose === 'bark') Snd.play('bark'); await sleep(ms); G.junoPose = null; }
function junoFree() { G.junoScript = false; G.junoPose = null; }

// ---------- actions ----------
const DEFAULT_NO = {
  TAKE: ['Hollis has taken enough things that were not his today. He declines.', 'It is bolted down, in a way that suggests someone else has already tried.', 'Taking that would create paperwork. Hollis is at capacity.'],
  OPEN: ['It does not open. Or it does, and nothing interesting happens.', 'Hollis checks. It is as open as it is going to get.'],
  PUSH: ['Hollis pushes. It stays. The warehouse wins again.', 'Pushing it would only relocate the problem.'],
  PULL: ['Hollis pulls. Nothing. The universe declines the transaction.', 'It does not budge. It has clearly been there longer than Hollis has.'],
  TALK: ['Hollis talks to it. It has no comment at this time.', 'A conversation with that would be one-sided, even by warehouse standards.'],
  GIVE: ['That is not a recipient.', 'It does not want anything from Hollis. Rare.'],
  USE: ['Hollis cannot think of a productive use for that. Or a safe one.', 'Using that would be a procedure. There is no procedure.'],
  SCAN: ['SCANNER: No barcode found. Item reclassified as "Miscellaneous Thing".', 'SCANNER: Beep. Nothing. The scanner does not care either.'],
  LOOK: ['It looks like it belongs here.', 'Hollis has seen it a thousand times. It has not improved.'],
  JUNO: ['Juno looks at it, then at Hollis. She has no notes.', 'Juno sniffs. It smells like warehouse. Everything does.']
};
const pickRand = (a, s) => a[Math.floor(rnd(s || G.S.steps + 1) * a.length)];
const WRONG_USE = ['Hollis has operated enough equipment without authorization today.', 'That combination is not in any training module. Possibly for good reason.',
  'Hollis considers it, then considers the incident report. Hard pass.', 'Nothing happens. The narrator is relieved.', 'That would work in a world with fewer rules. This is not that world.'];

async function walkToTarget(t) {
  const S = G.S;
  if (t.kind === 'prop') { const p = t.obj; const st = p.stand || [p.r[0] + p.r[2] / 2, Math.min(p.r[1] + p.r[3] + 3, 136)]; await walkTo(st[0], st[1]); if (p.r[0] + p.r[2] / 2 !== S.jx) S.face = (p.r[0] + p.r[2] / 2) > S.jx ? 1 : -1; }
  else if (t.kind === 'cat') { await walkTo(t.obj.x - 12, t.obj.y + 4); S.face = 1; }
  else if (t.kind === 'exit') { const e = t.obj; await walkTo(e.stand ? e.stand[0] : e.r[0] + e.r[2] / 2, e.stand ? e.stand[1] : Math.min(e.r[1] + e.r[3], 130)); }
}

async function perform(verb, itemId, t) {
  if (G.busy) return; G.busy = true;
  const S = G.S; G.snap = JSON.stringify(S);
  try {
    S.verb = null; S.selItem = null;
    tick(1);
    await doVerb(verb, itemId, t);
  } catch (e) { if (!(e instanceof AbortScript)) { console.error(e); G.errors = (G.errors || []); G.errors.push(String(e && e.stack || e)); } }
  finally { G.walkTarget = null; junoFree(); G.junoTarget = null; try { await checkProgress(); } catch (e) { if (!(e instanceof AbortScript)) { console.error(e); G.errors = (G.errors || []); G.errors.push(String(e && e.stack || e)); } } finally { G.busy = false; safePoint(); } }
}

async function doVerb(verb, itemId, t) {
  const S = G.S;
  if (verb === 'CALL') return G.story.callMenu();
  if (verb === 'RADIO') return G.story.radioMenu();
  if (t.kind === 'floor') return;
  if (t.kind === 'exit') {
    if (verb === 'LOOK') { return say(t.obj.look || 'An exit. Hollis has used it before.'); }
    await walkToTarget(t); return goExit(t.obj);
  }
  // inventory-item target
  if (t.kind === 'item') return G.story.itemVerb(verb, itemId, t.obj);
  await walkToTarget(t);
  if (t.kind === 'juno') return G.story.junoVerb(verb, itemId);
  if (t.kind === 'cat') return G.story.catVerb(verb, itemId, t.obj);
  const p = t.obj;
  if (verb === 'USE' && itemId) {
    const h = p.useOn && (p.useOn[itemId] !== undefined ? p.useOn[itemId] : p.useOn['*']);
    if (h !== undefined) return run(h);
    return say(G.story.wrongUse(itemId, p));
  }
  if (verb === 'GIVE') {
    if (!itemId) return say('Hollis needs to pick something to give first.');
    const h = p.giveTo && (p.giveTo[itemId] !== undefined ? p.giveTo[itemId] : p.giveTo['*']);
    if (h !== undefined) return run(h);
    return say(G.story.smart('GIVE', p, itemId));
  }
  if (verb === 'SCAN') {
    if (!(await G.story.scannerOk())) return;
    if (p.scan !== undefined) return run(p.scan);
    return say(pickRand(DEFAULT_NO.SCAN));
  }
  if (verb === 'JUNO' && p.juno !== undefined && p.juno !== null) return run(p.juno);
  const h = p.on && p.on[verb];
  if (h !== undefined) return run(h);
  if (verb === 'LOOK' && p.look) return run(p.look);
  if (verb === 'TALK' && p.npc) return say(p.name + ' has nothing to say to Hollis right now.');
  return say(G.story.smart(verb, p));
}

async function goExit(e) {
  if (e.lock) { G.pend = []; const locked = e.lock(G.S); await Promise.all(G.pend); if (locked) return; }
  const to = G.rooms[e.to];
  await enterRoom(e.to, e.enter ? e.enter[0] : undefined, e.enter ? e.enter[1] : undefined);
}

let lastT = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastT) / 1000); lastT = ts; G.t += dt;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.imageSmoothingEnabled = false;
  if (!G.started) { if (G.title.mode === 'how') drawHowTo(); else drawTitle(); }
  else {
    updateWalk(dt); updateJuno(dt);
    drawScene(); drawUI(); drawCard(); drawOverlays(); drawSayBox(); drawFade();
  }
  requestAnimationFrame(frame);
}
