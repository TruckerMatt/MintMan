'use strict';
// CLASSIC RENDERER: procedural pixel art
// ===== procedural pixel art =====
const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
function dith(x, y, w, h, c1, c2) { R(x, y, w, h, c1); ctx.fillStyle = c2; for (let j = 0; j < h; j++) for (let i = (j & 1); i < w; i += 2) ctx.fillRect(x + i, y + j, 1, 1); }
function txt(s, x, y, col = '#fff', size = 6, align = 'left') { ctx.font = size + 'px "Courier New", monospace'; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, Math.round(x), Math.round(y)); ctx.textAlign = 'left'; }
function outline(x, y, w, h, c) { R(x, y, w, 1, c); R(x, y + h - 1, w, 1, c); R(x, y, 1, h, c); R(x + w - 1, y, 1, h, c); }
function hline(x, y, w, c) { R(x, y, w, 1, c); }
function vline(x, y, h, c) { R(x, y, 1, h, c); }

const Art = {};
// --- warehouse props ---
Art.crate = (x, y, w, h, col = C.N) => { R(x, y, w, h, col); outline(x, y, w, h, C.n); hline(x + 1, y + Math.floor(h / 2), w - 2, C.n); vline(x + Math.floor(w / 2), y + 1, h - 2, C.n); };
Art.box = (x, y, w, h, col = C.N) => { R(x, y, w, h, col); outline(x, y, w, h, C.n); R(x + Math.floor(w / 2) - 1, y, 2, Math.max(2, h / 3), C.Y); hline(x, y + 2, w, C.n); };
Art.pallet = (x, y, w) => { R(x, y, w, 2, C.Y); R(x, y + 2, 2, 2, C.n); R(x + Math.floor(w / 2) - 1, y + 2, 2, 2, C.n); R(x + w - 2, y + 2, 2, 2, C.n); hline(x, y + 4, w, C.n); };
Art.loaded = (x, y, w, h, col = C.N) => { Art.pallet(x, y + h, w); Art.box(x + 1, y, w - 2, h, col); ctx.fillStyle = 'rgba(200,220,255,0.45)'; ctx.fillRect(x + 1, y + 1, w - 2, h - 1); hline(x + 1, y + Math.floor(h / 2), w - 2, 'rgba(255,255,255,0.5)'); };
Art.drum = (x, y, col = C.b) => { R(x, y, 10, 14, col); hline(x, y + 3, 10, C.g1); hline(x, y + 9, 10, C.g1); R(x, y, 10, 2, C.g2); vline(x + 2, y + 2, 12, 'rgba(255,255,255,.3)'); outline(x, y, 10, 14, C.k); };
Art.rack = (x, y, w, h, levels = 3, fill = true, seed = 1) => {
  R(x, y, 2, h, C.b); R(x + w - 2, y, 2, h, C.b);
  const step = h / levels;
  for (let i = 0; i <= levels; i++) { const yy = Math.round(y + i * step) - (i == levels ? 2 : 0); R(x, yy, w, 2, C.o); }
  if (fill) for (let i = 0; i < levels; i++) { const yy = Math.round(y + (i + 1) * step) - 2; let xx = x + 3; let k = 0; while (xx < x + w - 8) { const bw = 7 + Math.floor(rnd(seed + i * 9 + k) * 8), bh = 5 + Math.floor(rnd(seed * 3 + i + k) * (step - 9)); if (xx + bw > x + w - 2) break; if (rnd(seed + i * 5 + k * 3) > 0.25) Art.box(xx, yy - bh, bw, bh, [C.N, C.n, '#c89a50', '#a6825a'][Math.floor(rnd(seed + k + i) * 4)]); xx += bw + 1; k++; } }
};
Art.forklift = (x, y, type = 'cushion', dir = 1, mast = 0) => { // x,y = bottom-center
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const body = type === 'propane' ? C.o : type === 'reach' ? C.b : C.y;
  R(-16, -12, 26, 8, body); R(-16, -14, 8, 2, body); R(-6, -22, 12, 2, C.g4); vline(-6, -22, 10, C.g4); vline(5, -22, 10, C.g4); R(-5, -12, 8, 5, C.B);
  R(-16, -16, 5, 4, C.g3); R(10, -30, 3, 30, C.g3); R(13, -28 + mast, 2, 28, C.g2); R(13, -3 + mast, 9, 2, C.g1);
  R(-14, -4, 8, 4, C.k); R(2, -4, 8, 4, C.k); R(-12, -3, 4, 2, C.g2); R(4, -3, 4, 2, C.g2);
  if (type === 'propane') R(-19, -14, 4, 8, C.g1); if (type === 'reach') R(-8, -30, 2, 8, C.g3);
  R(-2, -25, 1, 3, C.R);
  ctx.restore();
};
Art.palletJack = (x, y, dir = 1) => { ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); R(-12, -2, 18, 2, C.r); R(-12, -4, 18, 2, C.g2); R(-12, -3, 4, 1, C.R); R(6, -14, 2, 12, C.g3); R(4, -16, 6, 2, C.g4); R(-13, 0, 3, 2, C.k); R(4, 0, 3, 2, C.k); ctx.restore(); };
Art.trailer = (x, y, w, h, label = '', col = C.g1) => {
  R(x, y, w, h, col); dith(x, y + h - 5, w, 5, C.g2, C.g1); for (let i = x + 6; i < x + w - 3; i += 8) vline(i, y + 1, h - 6, C.g2); outline(x, y, w, h, C.g3);
  R(x + 3, y + h, 6, 6, C.k); R(x + w - 16, y + h, 6, 6, C.k); R(x + w - 8, y + h, 6, 6, C.k); R(x + 4, y + h + 1, 4, 4, C.g2);
  if (label) { R(x + w / 2 - 12, y + 5, 24, 8, C.w); txt(label, x + w / 2, y + 11, C.r, 6, 'center'); }
};
Art.dockDoor = (x, y, w = 30, h = 34, open = false, trailerIn = false) => {
  R(x - 2, y - 2, w + 4, h + 2, C.y); R(x, y, w, h, open ? (trailerIn ? C.g3 : C.k) : C.g1);
  if (!open) for (let i = 0; i < h; i += 3) hline(x, y + i, w, C.g2);
  else { R(x, y, w, 3, C.g2); if (trailerIn) { R(x + 2, y + 5, w - 4, h - 5, '#444'); dith(x + 2, y + 5, w - 4, h - 5, '#404040', '#565656'); } }
  R(x + w / 2 - 6, y - 8, 12, 5, C.k); R(x + w / 2 - 5, y - 7, 3, 3, C.R); R(x + w / 2 + 2, y - 7, 3, 3, C.G);
};
Art.terminal = (x, y, screenCol = C.C) => { R(x, y, 14, 11, C.g2); R(x + 1, y + 1, 12, 8, C.k); R(x + 2, y + 2, 10, 6, screenCol); hline(x + 3, y + 4, 6, C.k); hline(x + 3, y + 6, 8, C.k); R(x + 5, y + 11, 4, 2, C.g3); R(x + 1, y + 13, 12, 2, C.g1); };
Art.vending = (x, y, glow = false) => { R(x, y, 26, 40, C.r); outline(x, y, 26, 40, C.k); R(x + 2, y + 3, 16, 26, C.k); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) R(x + 3 + i * 4, y + 5 + j * 6, 3, 4, [C.y, C.b, C.gr, C.o, C.M][(i + j * 2) % 5]); R(x + 20, y + 5, 4, 10, C.g1); R(x + 20, y + 18, 4, 3, glow ? C.G : C.g3); R(x + 3, y + 31, 20, 6, C.k); if (glow) { R(x + 8, y + 33, 4, 3, C.G); R(x + 9, y + 34, 2, 1, C.w); } };
Art.locker = (x, y, open = false, col = C.g2) => { R(x, y, 12, 34, col); outline(x, y, 12, 34, C.g4); for (let i = 0; i < 4; i++) hline(x + 3, y + 3 + i, 6, C.g4); if (open) { R(x + 2, y + 2, 8, 30, C.k); } else { R(x + 9, y + 16, 2, 4, C.Y); } };
Art.desk = (x, y, w, col = C.N) => { R(x, y, w, 4, C.N); R(x, y + 4, w, 1, C.n); R(x + 2, y + 5, 4, 18, C.n); R(x + w - 6, y + 5, 4, 18, C.n); R(x + 8, y + 5, w - 16, 5, C.n); };
Art.plant = (x, y) => { R(x + 2, y + 10, 6, 6, C.n); R(x, y, 10, 10, C.gr); R(x + 3, y - 3, 4, 5, C.G); R(x + 1, y + 2, 3, 3, C.G); };
Art.shrink = (x, y, w, h) => { R(x, y, w, h, 'rgba(210,230,255,0.55)'); outline(x, y, w, h, 'rgba(255,255,255,0.7)'); };
Art.bollard = (x, y) => { R(x, y, 5, 10, C.y); R(x, y + 3, 5, 2, C.k); R(x, y + 7, 5, 2, C.k); };
Art.sign = (x, y, w, s, bg = C.y, fg = C.k) => { R(x, y, w, 9, bg); outline(x, y, w, 9, C.k); txt(s, x + w / 2, y + 7, fg, 5.5, 'center'); };
Art.lights = (n = 4, y = 3) => { for (let i = 0; i < n; i++) { const x = 20 + i * (SW - 40) / n; R(x, y, 34, 3, C.g1); R(x + 2, y + 3, 30, 1, 'rgba(255,255,220,.7)'); } };
Art.bowl = (x, y, full = true) => { R(x, y, 8, 3, C.r); R(x + 1, y - 1, 6, 1, full ? C.N : C.r); R(x + 1, y + 3, 6, 1, C.g4); };
Art.pawprints = (x, y, n = 4) => { for (let i = 0; i < n; i++) { const px = x + i * 5, py = y + (i % 2) * 3; R(px, py, 2, 2, C.g4); R(px - 1, py - 1, 1, 1, C.g4); R(px + 2, py - 1, 1, 1, C.g4); } };
Art.label = (x, y) => { R(x, y, 6, 4, C.w); hline(x + 1, y + 1, 4, C.k); hline(x + 1, y + 3, 3, C.k); };
Art.clipboard = (x, y) => { R(x, y, 6, 8, C.n); R(x + 1, y + 1, 4, 6, C.w); R(x + 2, y - 1, 2, 2, C.g2); hline(x + 1, y + 3, 4, C.g2); };
Art.tag = (x, y, t, col = C.G) => { const w = t.length * 3.3 + 4; R(x - w / 2, y - 7, w, 8, C.k); outline(x - w / 2, y - 7, w, 8, col); txt(t, x, y - 1, col, 5, 'center'); };

// --- people ---
Art.person = (x, y, o) => {
  const f = o.facing || 1, fr = o.frame || 0, h = o.h || 36, hw = o.hw || 4;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(f, 1);
  const headH = 8, legL = Math.round(h * 0.42), torsoH = h - headH - legL - 1;
  const swing = o.pose === 'walk' ? [0, 2, 0, -2][fr % 4] : 0;
  const skin = o.skin || C.s;
  if (!o.bust) {
    // legs
    R(-hw + 1 + swing, -legL, 3, legL - 3, o.pants || C.jeans); R(1 - swing, -legL, 3, legL - 3, o.pants || C.jeans);
    R(-hw + swing, -3, 5, 3, o.boots || C.n); R(0 - swing, -3, 5, 3, o.boots || C.n);
  }
  const ty = o.bust ? -torsoH - 4 : -legL - torsoH; const bot = o.bust ? -4 : -legL;
  R(-hw, ty, hw * 2, torsoH + (o.bust ? 6 : 0), o.shirt || C.gray);
  if (o.vest) { R(-hw, ty, 3, torsoH, o.vest); R(hw - 3, ty, 3, torsoH, o.vest); if (o.stripes) { R(-hw, ty + 4, 3, 1, o.stripes); R(hw - 3, ty + 4, 3, 1, o.stripes); R(-hw, ty + torsoH - 3, hw * 2, 1, o.stripes); } }
  if (o.tie) { R(-1, ty, 2, 1, C.w); R(0, ty + 1, 1, 6, o.tie); }
  if (o.belt) R(-hw, ty + torsoH - 2, hw * 2, 2, o.belt);
  // arms
  const ah = Math.round(torsoH * 0.85);
  const aw = o.pose === 'walk' ? [0, -2, 0, 2][fr % 4] : 0;
  const sleeve = o.sleeve || o.shirt || C.gray;
  R(-hw - 2, ty + 1 + aw, 2, ah, sleeve); R(-hw - 2, ty + ah + 1 + aw, 2, 2, o.glove || skin);
  if (o.pose === 'wave') { const wv = (G.t * 6 | 0) % 2; R(hw, ty - 6 - wv, 2, ah - 1, sleeve); R(hw, ty - 8 - wv, 2, 2, o.glove || skin); }
  else if (o.pose === 'point') { R(hw, ty + 2, 6, 2, sleeve); R(hw + 6, ty + 2, 2, 2, skin); }
  else { R(hw, ty + 1 - aw, 2, ah, sleeve); R(hw, ty + ah + 1 - aw, 2, 2, o.glove || skin); }
  // head
  const hy = ty - headH + 1; R(-3, hy, 7, headH - 1, skin); R(-1, hy + headH - 2, 3, 2, skin);
  if (o.stubble) { ctx.fillStyle = 'rgba(60,40,30,.55)'; for (let i = 0; i < 4; i++) ctx.fillRect(-2 + i * 2, hy + 5, 1, 1); }
  R(2, hy + 3, 1, 1, C.k); R(-1, hy + 3, 1, 1, C.k);
  if (o.mouth === 'open') R(0, hy + 5, 2, 1, C.k);
  if (o.glasses) { outline(-2, hy + 2, 3, 3, o.glasses); outline(1, hy + 2, 3, 3, o.glasses); hline(1, hy + 3, 1, o.glasses); }
  if (o.hat === 'cap') { R(-4, hy - 2, 9, 4, o.hatCol || '#1c2230'); R(2, hy + 1, 5, 1, o.hatCol || '#1c2230'); }
  else if (o.hat === 'hard') { R(-4, hy - 3, 9, 5, o.hatCol || C.w); R(-5, hy + 1, 11, 1, o.hatCol || C.w); R(-1, hy - 4, 3, 1, o.hatCol || C.w); }
  else if (o.hat === 'beanie') { R(-4, hy - 2, 9, 4, o.hatCol || C.r); R(-4, hy + 1, 9, 1, C.g1); }
  else if (o.hair) { R(-4, hy - 1, 8, 3, o.hair); if (o.hairLong) { R(-4, hy + 2, 2, o.hairLong, o.hair); } if (o.bun) R(-5, hy - 3, 4, 3, o.hair); if (o.puff) { R(-6, hy - 3, 12, 5, o.hair); } }
  if (o.beard) { R(-3, hy + 5, 7, o.beardL || 3, o.beard); if (o.braids) { R(-2, hy + 8, 1, 6, o.beard); R(1, hy + 8, 1, 6, o.beard); R(-2, hy + 13, 1, 1, C.r); R(1, hy + 13, 1, 1, C.r); } }
  if (o.horn) { R(-5, hy - 2, 2, 2, C.g1); R(-6, hy - 4, 2, 2, C.g1); R(4, hy - 2, 2, 2, C.g1); R(5, hy - 4, 2, 2, C.g1); }
  if (o.extra) o.extra(hy, ty, legL);
  ctx.restore();
};
const PEOPLE = {
  hollis: { h: 38, hw: 3, shirt: C.gray, vest: C.vest, stripes: C.y, pants: C.jeans, boots: '#4a3020', hat: 'cap', hatCol: '#1a1f2c', stubble: true, skin: C.s },
  bruno: { h: 34, hw: 5, shirt: '#5a6a5a', vest: '#e07020', stripes: C.y, pants: '#2a3a4a', glove: C.y, boots: C.g4, hat: 'beanie', hatCol: C.g3, beard: '#4a3020', beardL: 2, belt: C.g4, skin: C.S },
  ingrid: { h: 34, hw: 4, shirt: '#8a4a8a', pants: '#333', hair: '#3a2a3a', bun: true, glasses: C.g4, skin: C.s, bust: true, sleeve: '#a06aa0' },
  prudence: { h: 35, hw: 4, shirt: C.R, pants: '#222a3a', hair: '#2a1a14', puff: true, skin: C.S, boots: C.g4, extra: (hy, ty) => { R(-1, ty, 2, 9, C.g1); R(-2, ty + 8, 4, 3, C.w); R(-1, ty + 9, 2, 1, C.r); } },
  tucker: { h: 33, hw: 4, shirt: '#5a8a5a', vest: '#f0a020', stripes: C.w, pants: '#5a5a3a', boots: C.g3, hat: 'hard', hatCol: C.y, skin: C.s, mouth: 'open', pose: 'wave' },
  rufus: { h: 35, hw: 4, shirt: C.w, vest: '#f0e020', stripes: C.g1, pants: '#3a3a3a', hat: 'cap', hatCol: '#c05010', glasses: C.k, skin: C.S, boots: C.g4 },
  torvald: { h: 39, hw: 7, shirt: '#7a4a2a', vest: '#e0a020', stripes: C.w, pants: '#3a2a1a', boots: C.g4, hair: '#e0c060', hairLong: 8, beard: '#d8b050', beardL: 5, braids: true, skin: C.s, belt: C.k, horn: false, extra: (hy) => { R(3, hy + 5, 4, 1, C.w); R(6, hy + 5, 1, 1, C.o); } },
  halvorsen: { h: 36, hw: 4, shirt: C.w, tie: C.r, pants: '#2a2a3a', hair: '#7a6a5a', skin: C.s, boots: C.k, glasses: null, extra: (hy) => { R(-4, hy + 2, 1, 3, C.k); R(-4, hy + 2, 3, 1, C.k); R(-5, hy + 4, 2, 2, C.g3); } },
  tabitha: { h: 34, hw: 4, shirt: '#40a0a0', pants: '#404060', hair: '#c08040', hairLong: 5, skin: C.s, boots: C.g3, glasses: C.M },
  harrow: { h: 40, hw: 4, shirt: '#14204a', vest: '#14204a', pants: '#14204a', hair: '#0a0a0a', hairLong: 3, skin: C.s, boots: C.k, extra: (hy, ty) => { R(-2, ty, 4, 3, C.w); R(-1, ty + 3, 2, 8, '#c02020'); R(-1, hy + 2, 1, 1, C.G); R(1, hy + 2, 1, 1, C.G); R(3, ty + 12, 5, 7, C.k); R(4, ty + 13, 3, 5, C.C); } },
  gus: { h: 34, hw: 5, shirt: '#404850', pants: '#202830', hat: 'cap', hatCol: '#202830', skin: C.S, boots: C.k, bust: true, belt: C.k },
  renata: { h: 34, hw: 4, shirt: '#20a090', pants: '#4a5a8a', hair: '#301810', hairLong: 5, skin: C.S, boots: C.g4 },
  gordon: { h: 34, hw: 5, shirt: '#3a5a9a', pants: '#333', hair: '#4a3a2a', skin: C.s, bust: true, extra: (hy) => { R(-4, hy + 2, 1, 4, C.k); R(-4, hy + 5, 3, 1, C.k); } },
  ozzie: { h: 34, hw: 5, shirt: '#e08020', vest: '#f0d020', stripes: C.g1, pants: '#333', hat: 'beanie', hatCol: '#204060', skin: C.S, bust: true }
};
Art.npc = (id, x, y, over = {}) => Art.person(x, y, Object.assign({}, PEOPLE[id], over));
Art.hollis = (x, y, face, walking, frame) => { const S = G.S; Art.person(x, y, Object.assign({}, PEOPLE.hollis, { facing: face, pose: walking ? 'walk' : 'stand', frame })); };

// --- Juno ---
Art.juno = (x, y, face, pose, frame) => {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(face, 1);
  const B = '#1e1e26', W = C.w, T = '#b8782c'; const fr = (frame | 0) % 2; const wag = ((G.t * 8) | 0) % 2;
  let hy = -12, hx = 5, lay = pose === 'lay';
  if (pose === 'sit') { R(-7, -9, 8, 9, B); R(-6, -3, 3, 3, W); R(0, -12, 4, 12, B); R(1, -8, 3, 8, W); R(-8, -3 + wag, 3, 2, B); hx = 2; hy = -16; }
  else if (lay) { R(-8, -6, 16, 6, B); R(2, -5, 5, 4, W); hx = 6; hy = -9; R(-11, -3, 3, 2, B); }
  else { const lf = pose === 'walk' || G.junoMoving ? fr : 0; R(-8, -10, 14, 6, B); R(0, -9, 5, 5, W); R(-8, -4, 2, 4 - lf, B); R(-4 + lf * 2, -4, 2, 4, T); R(2 - lf * 2, -4, 2, 4, B); R(5, -4, 2, 4 - (1 - lf), T);
    R(-11, -12 + wag * 2, 3, 2, B); R(-12, -13 + wag * 2, 2, 2, W); if (pose === 'sniff') { hy = -6; hx = 7; } else { hy = -13; hx = 5; } }
  // head
  if (pose === 'tilt') { R(hx, hy - 1, 6, 6, B); R(hx + 1, hy - 4, 2, 3, B); R(hx + 5, hy - 3, 2, 3, B); R(hx + 3, hy + 2, 3, 2, W); R(hx + 4, hy, 1, 1, W); }
  else { R(hx, hy, 6, 6, B); R(hx + 1, hy - 3, 2, 3, B); R(hx + 4, hy - 3, 2, 3, B); R(hx + 4, hy + 3, 4, 3, pose === 'sniff' ? W : W); R(hx + 4, hy + 1, 1, 1, C.w); R(hx + 7, hy + 3, 1, 1, C.k); R(hx + 1, hy - 1, 2, 1, T); }
  if (pose === 'bark') { R(hx + 4, hy + 5, 4, 1, C.R); }
  R(hx + 3, hy + 1, 1, 1, C.w);
  if (o_armband()) { R(-4, -10, 2, 6, C.G); R(-4, -8, 2, 1, C.k); }
  ctx.restore();
  if (pose === 'bark') txt('WOOF!', x + face * 14, y - 20, C.y, 6, 'center');
};
function o_armband() { return G.S && G.S.f.armband_on; }

// --- cats ---
const CAT_COLS = [['#e08a30', '#a85a10'], ['#2a2a30', '#111'], ['#9a9aa0', '#666'], ['#f0f0f0', '#bbb'], ['#7a5a3a', '#4a3020'], ['#d8c8a0', '#a08850'], ['#cfcfcf', '#3a3a3a'], ['#e0a060', '#f0f0f0']];
Art.cat = (x, y, seed, pose, tint) => {
  const cc = CAT_COLS[Math.floor(rnd(seed + 1) * CAT_COLS.length)]; const p = pose || ['sit', 'loaf', 'sleep', 'stand', 'sit', 'loaf'][Math.floor(rnd(seed + 2) * 6)]; const f = rnd(seed + 3) > 0.5 ? 1 : -1;
  const eye = ['#ffe040', '#60ff60', '#ffffff'][Math.floor(rnd(seed + 4) * 3)]; const stripe = rnd(seed + 5) > 0.6;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(f, 1);
  const a = cc[0], b = cc[1];
  if (p === 'sit') { R(-2, -5, 5, 5, a); R(-1, -8, 4, 4, a); R(-1, -10, 1, 2, a); R(2, -10, 1, 2, a); R(0, -7, 1, 1, eye); R(2, -7, 1, 1, eye); R(-4, -2, 2, 2, b); if (stripe) { R(-1, -4, 1, 3, b); R(1, -4, 1, 3, b); } }
  else if (p === 'loaf') { R(-4, -4, 8, 4, a); R(2, -7, 4, 4, a); R(3, -9, 1, 2, a); R(5, -9, 1, 2, a); R(3, -6, 1, 1, eye); R(5, -6, 1, 1, eye); if (stripe) { R(-2, -4, 1, 2, b); R(0, -4, 1, 2, b); } }
  else if (p === 'sleep') { R(-4, -3, 8, 3, a); R(2, -4, 3, 2, a); R(-5, -2, 2, 2, b); if (stripe) { R(-1, -3, 1, 2, b); } txt('z', 4, -6, C.w, 4); }
  else { R(-4, -5, 8, 3, a); R(-4, -2, 1, 2, b); R(-2, -2, 1, 2, b); R(2, -2, 1, 2, b); R(3, -2, 1, 2, b); R(3, -8, 4, 4, a); R(4, -10, 1, 2, a); R(6, -10, 1, 2, a); R(4, -7, 1, 1, eye); R(6, -7, 1, 1, eye); R(-6, -7, 2, 3, b); if (stripe) { R(-1, -5, 1, 2, b); R(1, -5, 1, 2, b); } }
  ctx.restore();
};
Art.biscuit = (x, y) => { // hero cat: orange w/ label
  Art.cat(x, y, 4242, 'sit'); Art.label(x - 5, y - 6);
};

// --- item icons (16x16 area at x,y) ---
Art.icon = (kind, x, y) => {
  ctx.save(); ctx.translate(x, y);
  switch (kind) {
    case 'label': R(2, 4, 12, 8, C.w); hline(3, 6, 8, C.k); hline(3, 8, 6, C.k); R(3, 10, 8, 1, C.k); vline(5, 10, 1, C.w); break;
    case 'scanner': R(4, 2, 8, 12, C.g4); R(5, 3, 6, 4, C.C); R(5, 8, 6, 5, C.g3); R(6, 0, 4, 2, C.R); break;
    case 'battery': R(3, 5, 10, 7, C.g4); R(13, 7, 2, 3, C.g2); R(4, 6, 3, 5, C.G); R(8, 6, 2, 5, C.y); break;
    case 'radio': R(4, 3, 8, 11, C.g4); R(5, 1, 1, 3, C.g2); R(5, 5, 6, 3, C.G); R(5, 9, 6, 4, C.g3); break;
    case 'phone': R(5, 2, 6, 12, C.k); R(6, 3, 4, 8, C.B); R(7, 12, 2, 1, C.g2); break;
    case 'coin': R(5, 5, 7, 7, C.g1); R(6, 6, 5, 5, C.g2); R(8, 7, 1, 3, C.g1); break;
    case 'cup': R(4, 5, 8, 8, C.w); R(12, 7, 2, 4, C.w); R(5, 6, 6, 2, '#5a3a1a'); break;
    case 'pen': R(3, 12, 10, 2, C.b); R(11, 10, 2, 2, C.g2); R(2, 13, 1, 1, C.k); break;
    case 'form': R(3, 2, 10, 12, C.w); for (let i = 0; i < 4; i++) hline(5, 4 + i * 3, 6, C.g2); R(4, 12, 4, 1, C.b); break;
    case 'mint': R(4, 4, 8, 8, C.C); R(5, 5, 6, 6, C.w); R(6, 6, 4, 4, C.G); R(7, 7, 2, 2, C.w); R(2, 8, 1, 1, C.G); R(13, 4, 1, 1, C.G); break;
    case 'jack': R(1, 11, 14, 2, C.r); R(1, 9, 14, 2, C.g2); R(12, 2, 2, 8, C.g3); R(10, 1, 5, 2, C.g4); break;
    case 'key': R(3, 3, 4, 4, C.Y); R(4, 4, 2, 2, C.k); R(6, 6, 2, 8, C.Y); R(8, 10, 2, 1, C.Y); R(8, 13, 3, 1, C.Y); break;
    case 'book': R(3, 2, 10, 12, C.r); R(4, 3, 8, 10, C.w); for (let i = 0; i < 4; i++) hline(5, 5 + i * 2, 6, C.g2); R(3, 2, 2, 12, C.R); break;
    case 'cracker': R(3, 6, 10, 6, C.y); R(5, 7, 2, 2, C.o); R(9, 8, 2, 2, C.o); outline(3, 6, 10, 6, C.o); break;
    case 'armband': R(2, 6, 12, 5, C.G); R(6, 6, 4, 5, C.k); R(7, 7, 2, 3, C.G); break;
    case 'glove': R(5, 6, 7, 7, C.n); R(4, 3, 2, 4, C.n); R(6, 2, 2, 4, C.n); R(8, 2, 2, 4, C.n); R(10, 3, 2, 3, C.n); break;
    case 'map': R(2, 3, 12, 10, '#e8d8a0'); R(3, 5, 4, 1, C.r); R(7, 5, 1, 5, C.r); R(8, 9, 4, 1, C.b); R(4, 11, 3, 1, C.k); break;
    case 'tally': R(3, 4, 10, 9, C.g3); R(4, 5, 8, 3, C.G); txt('147', 8, 7.5, C.k, 3.4, 'center'); R(6, 10, 4, 2, C.R); break;
    case 'bowl': R(2, 9, 12, 4, C.r); R(3, 7, 10, 2, C.N); break;
    case 'blanket': R(2, 5, 12, 8, C.M); dith(2, 5, 12, 8, C.M, C.m); outline(2, 5, 12, 8, C.m); break;
    case 'page': R(3, 2, 10, 12, '#f0e8c8'); R(3, 2, 10, 12, '#f0e8c8'); for (let i = 0; i < 4; i++) hline(5, 4 + i * 3, 6, C.g2); R(9, 10, 3, 3, C.o); break;
    case 'receipt': R(4, 1, 8, 14, C.w); for (let i = 0; i < 5; i++) hline(5, 3 + i * 2, 5, C.g2); R(5, 12, 6, 1, C.G); break;
    case 'kibble': R(3, 5, 10, 9, C.n); R(4, 3, 8, 3, C.N); R(6, 8, 4, 3, C.w); break;
    case 'exempt': R(3, 2, 10, 12, C.w); R(4, 3, 8, 2, C.G); R(5, 8, 5, 4, C.R); outline(5, 8, 5, 4, C.r); break;
    case 'po': R(3, 2, 10, 12, C.w); R(3, 2, 10, 3, C.b); for (let i = 0; i < 3; i++) hline(5, 7 + i * 2, 6, C.g2); break;
    case 'badge': R(4, 3, 8, 11, C.w); R(5, 4, 6, 3, C.r); R(6, 8, 4, 4, C.s); R(7, 1, 2, 2, C.g2); break;
    case 'letter': R(2, 4, 12, 9, C.w); for (let i = 0; i < 6; i++) hline(2 + i, 4 + i * 0.5, 1, C.g2); break;
    default: R(4, 4, 8, 8, C.g1); break;
  }
  ctx.restore();
};
