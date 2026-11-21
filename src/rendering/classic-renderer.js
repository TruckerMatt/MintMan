'use strict';
// CLASSIC RENDERER: scene drawing, Mint overlay, exit markers (kept as fallback/debug renderer)
function drawScene() {
  const S = G.S, r = room();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, SW, SCENE_H); ctx.clip();
  if (G.shake > 0) ctx.translate((Math.random() - .5) * G.shake, (Math.random() - .5) * G.shake);
  r.bg(G.t);
  const list = [];
  for (const p of propsNow()) if (p.draw) list.push({ z: p.z !== undefined ? p.z : p.r[1] + p.r[3], f: () => p.draw(G.t, S) });
  for (const c of catList()) list.push({ z: c.y, f: () => Art.cat(c.x, c.y, c.seed, c.pose) });
  if (G.vignetteNpc && G.vignetteNpc.room === S.room) { const v = G.vignetteNpc; list.push({ z: v.y, f: () => Art.npc(v.who, v.x, v.y, { facing: -1 }) }); }
  if (!r.noHollis) list.push({ z: S.jy, f: () => { if (!G.hideHollis) Art.hollis(S.jx, S.jy, S.face, G.walking, Math.floor(G.t * 8) % 4); } });
  if (S.junoWith && !r.noJuno) list.push({ z: S.ay, f: () => Art.juno(S.ax, S.ay, G.junoFace || 1, G.junoPose || (G.junoMoving ? 'walk' : (G.junoIdle || 'stand')), Math.floor(G.t * 8) % 2) });
  list.sort((a, b) => a.z - b.z); for (const it of list) it.f();
  if (r.fg) r.fg(G.t);
  drawExitMarkers(r);
  // mint vision
  if (S.mintOn) drawMint(r);
  ctx.restore();
}
function drawMint(r) {
  const t = G.t, lvl = G.S.mint;
  ctx.globalCompositeOperation = 'color'; ctx.fillStyle = lvl >= 3 ? `hsla(${(t * 120) % 360},90%,55%,.42)` : 'rgba(0,255,200,.3)'; ctx.fillRect(0, 0, SW, SCENE_H); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0,255,180,0.07)'; for (let y = (t * 20) % 4; y < SCENE_H; y += 4) ctx.fillRect(0, y, SW, 1);
  for (const p of propsNow()) if (p.mintTag) { const tg = typeof p.mintTag === 'function' ? p.mintTag(G.S) : p.mintTag; if (tg) Art.tag(p.r[0] + p.r[2] / 2, Math.max(16, p.r[1] - 2 + Math.sin(t * 3 + p.r[0]) * 1.5), tg, lvl >= 3 ? C.M : C.G); }
  R(250, 2, 68, 10, 'rgba(0,20,15,.85)'); txt('MINT MODE' + (lvl >= 3 ? ' MAX' : ''), 316, 10, C.G, 6, 'right');
}

function drawExitMarkers(r) {
  const pulse = 0.45 + 0.35 * Math.sin(G.t * 4);
  for (const e of exitsNow()) {
    const [x, y, w, h] = e.r; const cx = Math.round(x + w / 2), cy = Math.round(y + h / 2);
    const hov = G.hover && G.hover.kind === 'exit' && G.hover.obj === e;
    ctx.fillStyle = hov ? 'rgba(255,255,120,0.95)' : 'rgba(255,255,120,' + pulse.toFixed(2) + ')';
    let dir = 'd'; if (x + w >= 300 && w <= 20) dir = 'r'; else if (x <= 12 && w <= 20) dir = 'l'; else if (y + h < 100 && y < 40) dir = 'u'; else if (y + h >= 128) dir = 'd'; else dir = 'o';
    const px = (dx, dy, ww = 1, hh = 1) => ctx.fillRect(cx + dx, cy + dy, ww, hh);
    if (dir === 'd') { const by = Math.min(cy, 134) - 8; for (let i = 0; i < 5; i++) ctx.fillRect(cx - 4 + i, by + i, 9 - 2 * i, 1); ctx.fillRect(cx - 1, by - 4, 3, 4); }
    else if (dir === 'u') { for (let i = 0; i < 5; i++) ctx.fillRect(cx - i, cy + 6 - i, 1 + 2 * i, 1); ctx.fillRect(cx - 1, cy + 7, 3, 4); }
    else if (dir === 'l') { for (let i = 0; i < 5; i++) ctx.fillRect(cx - 2 + i, cy - 4 + i, 1, 9 - 2 * i); ctx.fillRect(cx + 3, cy - 1, 4, 3); }
    else if (dir === 'r') { for (let i = 0; i < 5; i++) ctx.fillRect(cx + 4 - i, cy - 4 + i, 1, 9 - 2 * i); ctx.fillRect(cx - 6, cy - 1, 4, 3); }
    else { ctx.fillRect(cx - 2, cy - 2, 5, 5); }
    if (hov || dir === 'o') txt(e.label.toUpperCase(), Math.max(30, Math.min(290, cx)), Math.max(10, cy - 8), '#ffff90', 4.4, 'center');
  }
}
