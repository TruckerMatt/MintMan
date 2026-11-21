'use strict';
// STATE: constants, palette, state factory, flag/inventory helpers, time & acts
// ===== MINT MAN: TUESDAY AT THE DOCK — engine =====
const SW = 320, SH = 240, SCENE_H = 144, SCALE = 3;
const VERBS = ['LOOK', 'TAKE', 'USE', 'TALK', 'OPEN', 'PUSH', 'PULL', 'SCAN', 'GIVE', 'CALL', 'RADIO', 'JUNO'];
const G = { S: null, rooms: {}, items: {}, fast: false, log: [], nextChoices: [], busy: false, hover: null,
  say: null, menuState: null, overlay: null, mouse: { x: 0, y: 0 }, t: 0, fade: 0, snap: null, started: false,
  flash: 0, shake: 0, cardText: null, invPage: 0, cheat: false };
const C = { // palette
  k: '#000000', w: '#f4f4f4', g1: '#c8c8c8', g2: '#8c8c8c', g3: '#5a5a5a', g4: '#2e2e2e',
  r: '#c02828', R: '#ff5a5a', o: '#e08020', y: '#f8e040', Y: '#c8a820', gr: '#28a030', G: '#70e060',
  b: '#2850c0', B: '#60a0f0', c: '#28a0a8', C: '#70e0e0', m: '#a030a0', M: '#f070f0', n: '#7a4a20', N: '#b07840',
  s: '#f0b890', S: '#c88860', d: '#3a2418', vest: '#2a58b8', gray: '#8a8f98', jeans: '#3a5a98', floor: '#9a9a90', floor2: '#8a8a80' };

function newState() {
  return { room: 'break', jx: 120, jy: 122, face: 1, inv: [], f: {}, time: 9 * 60 + 2, act: 1, cat: 1,
    mint: 0, mintOn: false, ax: 100, ay: 124, junoWith: true, pal: {}, verb: null, selItem: null, steps: 0,
    named: {}, biscuitRoom: 'break', torvaldAt: 'yard', tuckerAt: 'floor', prudenceAt: 'lockers', boss: {}, hintLevel: {} };
}
const F = (k) => G.S.f[k];
const setF = (k, v = true) => { G.S.f[k] = v; };
const has = (id) => G.S.inv.includes(id);
const rnd = (seed) => { let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const sleep = (ms) => new Promise(r => setTimeout(r, G.fast ? 0 : ms));
class AbortScript extends Error {}

// ---------- inventory ----------
function giveItem(id, quiet) {
  if (has(id)) return; G.S.inv.push(id); if (!quiet) { Snd.play('pickup'); }
}
async function take(id, msg) { giveItem(id); if (msg) await say(msg); }
function loseItem(id) { const i = G.S.inv.indexOf(id); if (i >= 0) G.S.inv.splice(i, 1); if (G.S.selItem === id) G.S.selItem = null; }

// ---------- time / acts ----------
const ACT_START = { 1: 9 * 60 + 2, 2: 9 * 60 + 45, 3: 10 * 60 + 15, 4: 10 * 60 + 45, 5: 11 * 60 + 10, 6: 12 * 60 + 3 };
const ACT_CAP = { 1: 9 * 60 + 44, 2: 10 * 60 + 14, 3: 10 * 60 + 44, 4: 11 * 60 + 9, 5: 11 * 60 + 58, 6: 12 * 60 + 20 };
function tick(n = 1) { const S = G.S; S.steps++; S.time = Math.min(S.time + n, ACT_CAP[S.act] || 720); }
function fmtTime(m) { let h = Math.floor(m / 60), mm = m % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(mm).padStart(2, '0') + ' ' + ap; }
const ACT_NAMES = { 1: 'ACT I — THE BREAK ROOM', 2: 'ACT II — THE DOCK DISASTER', 3: 'ACT III — WHERE DID ALL THESE CATS COME FROM?', 4: 'ACT IV — MINT MODE',
  5: 'ACT V — THE PERFECT SHIPMENT', 6: 'ACT VI — REGIONAL OPERATIONS' };
async function setAct(n, catLevel) {
  const S = G.S; S.act = n; S.time = Math.max(S.time, ACT_START[n]); if (catLevel !== undefined) S.cat = catLevel;
  if (G.fast) return;
  await card(ACT_NAMES[n]);
}
async function card(text, sub) {
  G.cardText = { text, sub, t: G.t }; Snd.play('card'); await sleep(2200); G.cardText = null;
}
async function fade(to, ms = 350) {
  if (G.fast) { G.fade = to; return; }
  const from = G.fade, t0 = performance.now();
  await new Promise(res => { const step = () => { const p = Math.min(1, (performance.now() - t0) / ms); G.fade = from + (to - from) * p; if (p < 1) requestAnimationFrame(step); else res(); }; step(); });
}
