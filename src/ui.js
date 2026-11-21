'use strict';
// UI: text/dialogue/menus, input handlers, HUD, title, overlays
// ---------- text ----------
const SPK = { HOLLIS: '#8fd0ff', NARRATOR: '#ffffff', '': '#ffffff', INGRID: '#ffb0d8', BRUNO: '#ffc060', PRUDENCE: '#ff8080', GORDON: '#a0ffa0',
  TUCKER: '#ffff80', OZZIE: '#80e0ff', RUFUS: '#ffa040', TORVALD: '#ffd0a0', HARROW: '#ff70ff', HALVORSEN: '#c0c0ff', TABITHA: '#c0ffe0',
  GUS: '#d0d0d0', RENATA: '#80ffd0', RADIO: '#b0ffb0', PHONE: '#b0ffb0', SCANNER: '#ffe060', JUNO: '#e0b070', SYSTEM: '#ff6060', HR: '#c0ffe0', TABLET: '#c0ffe0' };
function parseLine(l) {
  const m = /^([A-Z][A-Z ]{1,10}): ([\s\S]*)$/.exec(l);
  if (m && SPK[m[1]] !== undefined) return { who: m[1], text: m[2] };
  return { who: 'NARRATOR', text: l };
}
function wrap(text, maxw, font) {
  ctx.font = font; const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxw) cur = t; else { lines.push(cur); cur = w; } }
  if (cur) lines.push(cur); return lines;
}
function say(line) { const p = sayImpl(line); G.pend = G.pend || []; G.pend.push(p); if (G.pend.length > 60) G.pend.shift(); return p; }
async function sayImpl(line) {
  if (Array.isArray(line)) { for (const l of line) await say(l); return; }
  const { who, text } = parseLine(line);
  G.log.push(who + ': ' + text); if (G.log.length > 400) G.log.shift();
  if (G.fast) return;
  ctx.save(); ctx.scale(SCALE, SCALE);
  const lines = wrap(text, 292, '7px "Courier New", monospace'); ctx.restore();
  const pages = []; for (let i = 0; i < lines.length; i += 4) pages.push(lines.slice(i, i + 4));
  for (const p of pages) {
    await new Promise(res => { G.say = { who, lines: p, res, t: G.t }; if (typeof MMAudio !== 'undefined') { try { MMAudio.onSayPage(who, text, pages.indexOf(p)); } catch (e) { } } });   // audio seam: subtitle shows regardless; VO (if any) is fire-and-forget
    if (typeof MMAudio !== 'undefined') { try { MMAudio.stopVoice(); } catch (e) { } }   // advancing interrupts the clip
    G.say = null;
  }
}
const N = (t) => say(t);
async function run(h) { // run handler: string | array | function
  if (h === undefined || h === null) return;
  if (typeof h === 'string' || Array.isArray(h)) return say(h);
  return h();
}
async function menu(opts, title) { // opts: [text, fn] ; last = exit by convention. returns result of fn
  const vis = opts.filter(o => o);
  let idx;
  if (G.fast) {
    const q = G.nextChoices;
    if (q.length) {
      const want = q.shift(); idx = vis.findIndex(o => (want instanceof RegExp ? want.test(o[0]) : o[0].includes(want)));
      if (idx < 0) { G.choiceErrors = (G.choiceErrors || []); G.choiceErrors.push('no option ' + want + ' in ' + vis.map(o => o[0]).join(' | ')); idx = vis.length - 1; }
    } else idx = vis.length - 1;
  } else {
    idx = await new Promise(res => { G.menuState = { opts: vis, title, res }; });
    G.menuState = null;
  }
  if (idx < 0 || !vis[idx]) return 'timeout';
  return vis[idx][1] ? vis[idx][1]() : undefined;
}
const pickMenu = (title, opts) => menu(opts, title);

// ---------- input ----------
const verbBtns = VERBS.map((v, i) => ({ v, r: [6 + (i % 6) * 52, 152 + Math.floor(i / 6) * 14, 50, 12] }));
const INV_SLOT = { x0: 6, y0: 191, w: 38, h: 22, cols: 8, rows: 2 };
function invRect(i) { return [INV_SLOT.x0 + (i % INV_SLOT.cols) * (INV_SLOT.w + 1), INV_SLOT.y0 + Math.floor(i / INV_SLOT.cols) * (INV_SLOT.h + 1), INV_SLOT.w, INV_SLOT.h]; }
const perPage = INV_SLOT.cols * INV_SLOT.rows - 0;
function invIndexAt(x, y) {
  const inv = G.S.inv; const off = G.invPage * (perPage - 1); const per = inv.length > perPage ? perPage - 1 : perPage;
  for (let i = 0; i < per; i++) { if (inRect(x, y, invRect(i))) { const idx = off + i; if (idx < inv.length) return idx; } }
  return -1;
}
function onKey(e) {
  if (!G.started) { if (G.title) G.title.key(e); return; }
  if (e.key === 'F5') { e.preventDefault(); if (G.started) { if (saveGame()) toast('SAVED'); else toast('WILL SAVE WHEN THIS FINISHES'); } return; }
  if (G.overlay && G.overlay.key) return G.overlay.key(e);
  if (G.menuState) { const n = parseInt(e.key); if (n >= 1 && n <= G.menuState.opts.length) G.menuState.res(n - 1); return; }
  if (G.say) { if (e.key === ' ' || e.key === 'Enter') { const r = G.say.res; G.say = null; r(); } return; }
  if (e.key === 'h' || e.key === 'H') { if (!G.busy) G.story.hint(); }
  if (e.key === 't' || e.key === 'T') { if (!G.busy && G.story.todo) G.story.todo(); }
  if (e.key === 'm' || e.key === 'M') { if (G.S.mint > 0) { G.S.mintOn = !G.S.mintOn; Snd.play('beep'); } }
  if (e.key === 'n' || e.key === 'N') Snd.toggleMusic();
  if (e.key === 'Escape') { G.S.verb = null; G.S.selItem = null; }
  if (!G.busy) { const n = parseInt(e.key, 10); if (n >= 1 && n <= 9) { G.S.verb = VERBS[n - 1]; } if (e.key === '0') G.S.verb = VERBS[9]; if (e.key === '-') G.S.verb = VERBS[10]; if (e.key === '=') G.S.verb = VERBS[11]; }
}
async function onClick(p, right) {
  Snd.unlock();
  if (!G.started) { if (G.title) G.title.click(p); return; }
  if (G.overlay && G.overlay.click) return G.overlay.click(p);
  if (G.menuState) {
    const ms = G.menuState; const y0 = SCENE_H + 8;
    ms.opts.forEach((o, i) => { if (p.y >= y0 + i * 10 && p.y < y0 + i * 10 + 10) ms.res(i); }); return;
  }
  if (G.say) { const r = G.say.res; G.say = null; r(); return; }
  if (G.busy) return;
  const S = G.S;
  if (p.y >= SCENE_H) {
    for (const b of verbBtns) if (inRect(p.x, p.y, b.r)) { S.verb = b.v; S.selItem = null; Snd.play('click'); if (b.v === 'CALL' || b.v === 'RADIO') perform(b.v, null, { kind: 'floor' }); return; }
    if (!G.busy && inRect(p.x, p.y, [230, 180, 90, 10]) && G.story.todo) { G.story.todo(); return; }
    // inventory pages
    if (S.inv.length > perPage && inRect(p.x, p.y, invRect(perPage - 1))) { G.invPage = (G.invPage + 1) % Math.ceil(S.inv.length / (perPage - 1)); return; }
    const idx = invIndexAt(p.x, p.y);
    if (idx >= 0) {
      const id = S.inv[idx];
      if (right) return perform('LOOK', null, { kind: 'item', obj: id, name: id });
      if (S.selItem) { if (S.selItem === id) { return perform(S.verb || 'USE', id, { kind: 'item', obj: id, name: id, solo: true }); } return perform(S.verb || 'USE', S.selItem, { kind: 'item', obj: id }); }
      const v = S.verb || 'LOOK';
      if (v === 'USE' || v === 'GIVE') { if (v === 'USE' && G.items[id].solo) return perform('USE', null, { kind: 'item', obj: id, solo: true }); S.selItem = id; S.verb = v; return; }
      return perform(v, null, { kind: 'item', obj: id });
    }
    return;
  }
  const t = pickAt(p.x, p.y);
  if (right) { if (t.kind === 'floor') return; return perform('LOOK', null, t); }
  if (t.kind === 'floor') { G.busy = true; try { await walkTo(p.x, p.y); } finally { G.busy = false; G.walkTarget = null; } return; }
  if (!S.verb) { if (t.kind === 'exit') return perform('WALK', null, t); if (t.kind === 'prop' || t.kind === 'cat' || t.kind === 'juno') return perform('LOOK', null, t); }
  const v = S.verb || 'LOOK';
  if (S.selItem) return perform(v, S.selItem, t);
  if (v === 'GIVE' || (v === 'USE' && false)) { return say('Pick an item from the inventory first.'); }
  return perform(v, null, t);
}

// ===== rendering / HUD / overlays =====
function drawSayBox() {
  const s = G.say; if (!s) return;
  const named = s.who !== 'NARRATOR', rows = s.lines.length + (named ? 1 : 0), h = 6 + rows * 9;
  R(6, 5, 308, h, '#101018'); outline(6, 5, 308, h, SPK[s.who] || '#fff'); outline(7, 6, 306, h - 2, '#303048');
  let y = 13;
  if (named) { txt(s.who, 11, y, SPK[s.who] || '#fff', 6.5); y += 9; }
  for (const l of s.lines) { txt(l, 11, y, named ? '#ffffff' : '#d8d8ff', 7); y += 9; }
  if (((G.t * 2) | 0) % 2) txt('▼', 306, 5 + h - 3, C.y, 6);
}
function drawUI() {
  const S = G.S;
  R(0, SCENE_H, SW, SH - SCENE_H, '#0c0c14'); hline(0, SCENE_H, SW, '#5566aa'); hline(0, SCENE_H + 1, SW, '#223');
  if (G.menuState) {
    const ms = G.menuState; if (ms.title) txt(ms.title, 8, SCENE_H + 7, C.y, 6.5);
    ms.opts.forEach((o, i) => { const y = SCENE_H + 8 + i * 10; const hov = G.mouse.y >= y && G.mouse.y < y + 10; if (hov) R(4, y, 312, 10, '#20306a'); txt((i + 1) + '. ' + o[0], 8, y + 8, hov ? C.y : C.w, 7); });
    return;
  }
  for (const b of verbBtns) {
    const sel = S.verb === b.v; const dis = (b.v === 'RADIO' && !has('radio')) || (b.v === 'JUNO' && (!S.junoWith || room().noJuno));
    R(b.r[0], b.r[1], b.r[2], b.r[3], sel ? '#3050c0' : dis ? '#1a1a22' : '#22284a'); outline(b.r[0], b.r[1], b.r[2], b.r[3], sel ? C.y : dis ? '#333' : '#5060a0');
    txt(b.v, b.r[0] + b.r[2] / 2, b.r[1] + 9, sel ? C.y : dis ? '#555' : C.w, 7, 'center');
  }
  // status line
  let st = ''; const h = G.hover;
  if (S.selItem) st = (S.verb || 'USE') + ' ' + G.itemName(S.selItem).toUpperCase() + ' ON ' + (h && h.name ? h.name.toUpperCase() : '...');
  else if (S.verb) st = S.verb + ' ' + (h && h.name ? h.name.toUpperCase() : '');
  else st = h && h.name ? (h.kind === 'exit' ? 'GO TO ' : '') + h.name.toUpperCase() : '';
  R(0, 180, SW, 10, '#141428'); txt(st, 6, 188, C.y, 7);
  txt(fmtTime(S.time) + '  ACT ' + ['', 'I', 'II', 'III', 'IV', 'V', 'VI'][S.act], 314, 188, S.mintOn ? C.G : C.g1, 6.5, 'right');
  // inventory
  const inv = S.inv, off = G.invPage * (perPage - 1);
  const pager = inv.length > perPage;
  for (let i = 0; i < perPage; i++) {
    const rr = invRect(i); const idx = off + i;
    if (pager && i === perPage - 1) { R(rr[0], rr[1], rr[2], rr[3], '#26264a'); outline(rr[0], rr[1], rr[2], rr[3], C.y); txt('MORE >', rr[0] + rr[2] / 2, rr[1] + 9, C.y, 5, 'center'); txt((G.invPage + 1) + '/' + Math.ceil(inv.length / (perPage - 1)), rr[0] + rr[2] / 2, rr[1] + rr[3] - 2, C.g1, 4, 'center'); continue; }
    R(rr[0], rr[1], rr[2], rr[3], '#181830'); outline(rr[0], rr[1], rr[2], rr[3], '#2a2a58');
    if (idx < inv.length) {
      const id = inv[idx], it = G.items[id]; if (S.selItem === id) outline(rr[0], rr[1], rr[2], rr[3], C.y);
      Art.icon(it.icon, rr[0] + 11, rr[1] - 1); txt((G.ITEM_SHORT[id] || G.itemName(id)).slice(0, 11), rr[0] + rr[2] / 2, rr[1] + rr[3] - 2, C.g1, 4, 'center');
    }
  }
  
}
function drawCard() {
  const c = G.cardText; if (!c) return;
  R(0, 0, SW, SCENE_H, '#000'); ctx.save(); const w = wrap(c.text, 280, '10px "Courier New", monospace');
  let y = 60 - (w.length - 1) * 7; for (const l of w) { txt(l, 160, y, C.y, 10, 'center'); y += 14; }
  if (c.sub) txt(c.sub, 160, y + 6, C.g1, 7, 'center'); ctx.restore();
}
function drawFade() { if (G.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${G.fade})`; ctx.fillRect(0, 0, SW, SH); } if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, G.flash)})`; ctx.fillRect(0, 0, SW, SCENE_H); G.flash -= 0.03; } if (G.shake > 0) G.shake -= 0.15; }

// ---------- title ----------
function drawTitle() {
  const t = G.t; R(0, 0, SW, SH, '#080814');
  for (let i = 0; i < 40; i++) { R((i * 53 + t * 8) % SW, (i * 37) % 90, 1, 1, i % 3 ? '#556' : C.y); }
  // warehouse silhouette
  R(0, 100, SW, 60, '#151530'); for (let i = 0; i < 8; i++) { Art.rack(i * 42 + 4, 106, 34, 40, 3, true, i + 5); }
  R(0, 146, SW, 94, '#20203a'); dith(0, 146, SW, 6, '#2a2a4a', '#20203a');
  Art.forklift(50 + (t * 14 % 260), 150, 'cushion', 1);
  Art.cat(250, 118, 11, 'sit'); Art.cat(180, 130, 3, 'loaf'); Art.cat(120, 120, 6, 'sit');
  Art.juno(232, 150, -1, 'sit', 0); Art.person(210, 152, Object.assign({}, PEOPLE.hollis, { facing: 1 }));
  const glow = 0.6 + 0.4 * Math.sin(t * 3); ctx.fillStyle = `rgba(112,255,200,${glow * .3})`; ctx.fillRect(0, 0, SW, 0);
  txt('MINT MAN', 160, 44, C.G, 26, 'center'); txt('MINT MAN', 161, 45, '#004030', 26, 'center'); txt('MINT MAN', 160, 44, C.G, 26, 'center');
  txt('TUESDAY AT THE DOCK', 160, 62, C.y, 11, 'center'); txt('a warehouse adventure in six acts', 160, 74, C.g1, 6.5, 'center');
  const opts = G.title.opts(); opts.forEach((o, i) => { const y = 166 + i * 13; if (G.title.sel === i) R(90, y - 9, 140, 12, '#2a3a8a'); txt(o, 160, y, G.title.sel === i ? C.y : C.w, 8, 'center'); });
  txt('Click, or arrow keys + Enter.  This is a work of fiction. Characters, companies, events and', 160, 214, '#ccd', 5, 'center'); txt('situations are fictional; any resemblance to actual persons or organizations is coincidental.', 160, 222, '#ccd', 5, 'center');
  txt('Original pixel art & synth sound. No cats were harmed.', 160, 232, '#667', 4.6, 'center');
}
function drawHowTo() {
  R(0, 0, SW, SH, '#080814'); txt('HOW TO PLAY', 160, 20, C.y, 10, 'center');
  const L = ['Pick a VERB (keys 1-9, 0, -, =), then click a thing.', 'USE/GIVE: click an inventory item, then the target.', 'Right-click anything to LOOK. Click the floor to walk.', 'Yellow arrows mark exits. Click one to change rooms.', 'CALL = phone menu. RADIO once Hollis has one.', 'SCAN works on nearly everything. Try it.', 'JUNO: sniff, fetch, herd. She is competent.', 'Menus: click or press 1-9.  Enter = type a command.', 'H hint. T to-do list (or click the clock). M MINT. N music.', '', 'Click to return.'];
  L.forEach((l, i) => txt(l, 16, 44 + i * 14, C.w, 7));
}
G.title = { sel: (function () { try { return hasSave() ? 1 : 0; } catch (e) { return 0; } })(), mode: 'main', opts() { return this.mode === 'main' ? ['NEW GAME'].concat(hasSave() ? ['CONTINUE'] : []).concat(['HOW TO PLAY']) : []; },
  act(i) { const o = this.opts()[i]; if (o === 'NEW GAME') startGame(false); else if (o === 'CONTINUE') startGame(true); else if (o === 'HOW TO PLAY') this.mode = 'how'; },
  key(e) { if (this.mode === 'how') { this.mode = 'main'; return; } const n = this.opts().length; if (e.key === 'ArrowDown') this.sel = (this.sel + 1) % n; else if (e.key === 'ArrowUp') this.sel = (this.sel + n - 1) % n; else if (e.key === 'Enter' || e.key === ' ') this.act(this.sel); },
  click(p) { if (this.mode === 'how') { this.mode = 'main'; return; } this.opts().forEach((o, i) => { const y = 166 + i * 13; if (p.y > y - 9 && p.y < y + 4) this.act(i); }); } };
function hasSave() { try { return !!localStorage.getItem('mintman_save'); } catch (e) { return false; } }

// ---------- overlay screens (fail, credits, boss hud) ----------
function drawOverlays() {
  const o = G.overlay; if (o && o.draw) o.draw();
}


G.ITEM_SHORT = { crackers: 'Crackers', dglove: 'Glove', tally: 'Tally', flyer: 'Flyer', seal: 'Seal', tuckerbook: 'Tucker book', page2: 'Manifest 2', man1: 'Manifest 1', armband: 'Armband', receipt: 'Receipt', bol: 'BOL', trailmap: 'Yard map', sightlog: 'Smoke log', sbat: 'Scanner bat', key_parts: 'Parts key', key_cage: 'Cage key', bowl: 'Bowls' };

// Pulsing arrows at every usable exit so doors are hard to miss. The hovered exit is brighter.

G.drawToast = () => { if (!G.toast) return; const a = G.t - G.toast.t; if (a > 2) { G.toast = null; return; } const w = G.toast.text.length * 4.2 + 10; R(SW - w - 4, 150, w, 11, 'rgba(10,10,30,.9)'); outline(SW - w - 4, 150, w, 11, C.G); txt(G.toast.text, SW - 4 - w / 2, 158, C.G, 5.5, 'center'); };
