'use strict';
// MAIN: input/draw hooks, start/new game, boot
const _onKey = onKey;
onKey = function (e) {
  if (G.started && !G.overlay && !G.menuState && !G.say && !G.busy) {
    if (G.typing !== undefined && G.typing !== null) { e.preventDefault(); if (e.key === 'Enter') { const t = G.typing; G.typing = null; runCommand(t).catch(x => { if (!(x instanceof AbortScript)) console.error(x); }); } else if (e.key === 'Escape') G.typing = null; else if (e.key === 'Backspace') G.typing = G.typing.slice(0, -1); else if (e.key.length === 1) G.typing += e.key; return; }
    if (e.key === 'Enter') { G.typing = ''; return; }
  }
  _onKey(e);
};
// input bar drawing hook
const _drawUI = drawUI;
drawUI = function () { _drawUI(); if (G.drawToast) G.drawToast(); if (G.typing !== undefined && G.typing !== null) { R(0, 180, SW, 10, '#202050'); txt('> ' + G.typing + (((G.t * 2) | 0) % 2 ? '_' : ' '), 6, 188, C.w, 7); } if (G.bossTimer && G.menuState) { const l = 1 - (G.t - G.bossTimer.t0) / G.bossTimer.limit; R(4, SCENE_H - 5, 312, 3, '#301010'); R(4, SCENE_H - 5, 312 * Math.max(0, l), 3, l < .25 ? C.R : C.G); if (l <= 0 && G.menuState && !G.fast) G.menuState.res(-1); } };
// status names for function-named items
G.itemName = (id) => { const n = G.items[id].name; return typeof n === 'function' ? n() : n; };

// ---------- start ----------
// clears every run-scoped global so a new game after completion (or a CONTINUE) starts from a clean slate
function resetRun() {
  if (typeof MMAudio !== 'undefined') { try { MMAudio.stopVoice(); } catch (e) { } }   // a new run never inherits a playing voice clip
  G.overlay = null; G.postcredit = false; G.endCat = null; G.endMint = false; G.gameComplete = false; G.dockLight = null; G.vignetteNpc = null; G.hideHollis = false; G.bossTimer = null; G.menuState = null; G.say = null; G.cardText = null; G.walkTarget = null; G.junoTarget = null; G.junoScript = null; G.nextChoices = []; G.hintN = 0; G.catCache = {}; G.pendingSave = false; G.callWho = null; G.inCall = false; G.inProgress = false; G.invariantErrors = [];
}
async function startGame(cont) {
  G.started = true; resetRun();
  if (cont && loadGame()) { G.catCache = {}; G.fade = 0; G.busy = true; try { await say('Hollis is back where he left off.'); await G.story.todo(); } finally { G.busy = false; } return; }
  G.S = newState(); giveItem('scanner', true); G.catCache = {}; G.fade = 1; G.junoIdle = 'lay'; G.hideHollis = false;
  G.S.ax = 92; G.S.ay = 126; G.junoFace = 1;
  await fade(0, 1200);
  await opening();
}
async function opening() {
  const S = G.S; G.busy = true;
  try {
    await say(['The fluorescent lights buzz at a frequency Hollis associates with mistakes.', 'Hollis wakes up at a break-room table. He does not remember falling asleep.', 'NARRATOR: This is Building 9 of the Gantry-Voss Logistics distribution center. Hollis is the shift lead here: he scans freight in, scans freight out, and is blamed in both directions.']);
    await say(['The clock on the wall says 9:02. The clock has said 9:02 for as long as anyone can remember, so this is not information.', 'His radio is missing. His handheld scanner (the thing that tells the warehouse computer where every pallet is) is dead. Someone has taken the last decent coffee. There is a crumpled shipping label stuck to his boot.']);
    await say(['Through the door, faintly, reverse beepers and alarms. Somewhere, a forklift has an opinion.', 'On top of the vending machine, a cat sits looking at him. Nobody acknowledges this. Nobody is here. This is a warehouse. There are not supposed to be cats.']);
    G.junoIdle = null; await junoAnim('bark', 500); await junoGo(S.jx - 18, S.jy + 2); junoFree(); await junoAnim('tilt', 900);
    await say(['Juno trots over. She has the expression of a dog who tried to wake him twice and has decided to be gracious about it.', 'HOLLIS: (rubbing his face) Yeah. I know.', 'NARRATOR: It is a Tuesday. It is humid. It is going to get worse. (Controls: pick a verb, then click a thing. Right-click LOOKs. Enter types a command. Press H for a hint. Juno is your dog; the JUNO verb sends her to sniff or fetch.)', 'NARRATOR: Today\'s job, such as it is: find out what everyone is so upset about, and get the scanner working so Hollis can check.']);
  } finally { G.busy = false; }
}
function boot() { initCanvas(); G.fade = 0; G.S = newState(); requestAnimationFrame(frame); }
window.addEventListener('load', boot);
