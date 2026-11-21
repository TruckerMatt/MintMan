'use strict';
// TEST API (used by automated tests; harmless in production)
// ---------- test API ----------
G.enableTest = () => { G.fast = true; };
G.findTarget = (id) => {
  const S = G.S;
  if (id === 'juno') return { kind: 'juno', name: 'JUNO' };
  if (id === 'cat') return { kind: 'cat', obj: catList()[0] || { x: 100, y: 120, seed: 1 }, name: 'CAT' };
  if (S.inv.includes(id) && !propsNow().some(p => p.id === id)) return { kind: 'item', obj: id, name: id };
  const p = room().props.find(q => q.id === id && (!q.vis || q.vis(S)) && (!q.mintOnly || S.mintOn) && !(q.onlyVerb && S.verb !== q.onlyVerb)); if (p) return { kind: 'prop', obj: p, name: p.name };
  const p2 = room().props.find(q => q.id === id); if (p2 && (p2.onlyVerb || p2.onlyItem)) return { kind: 'prop', obj: p2, name: p2.name };
  const e = exitsNow().find(q => q.id === id || q.to === id); if (e) return { kind: 'exit', obj: e, name: e.label };
  throw new Error('no target ' + id + ' in room ' + S.room);
};
G.strictCheck = (tgt, verb, item) => {
  if (!G.strict || !tgt) return; const S = G.S;
  if (tgt.kind === 'prop') { const p = tgt.obj; if (p.id === 'ground' || !p.r) return; const sv = S.verb, si = S.selItem; S.verb = verb; S.selItem = item || null; let ok = false;
    for (let fx = .1; fx < 1 && !ok; fx += .2) for (let fy = .1; fy < 1 && !ok; fy += .2) { const x = p.r[0] + p.r[2] * fx, y = Math.min(SCENE_H - 1, p.r[1] + p.r[3] * fy); const h = pickAt(x, y); if (h && h.obj === p) ok = true; }
    S.verb = sv; S.selItem = si; if (!ok) (G.strictErrors = G.strictErrors || []).push(S.room + '/' + p.id + ' not clickable (' + verb + ')'); }
  if (tgt.kind === 'exit') { const e = tgt.obj; let ok = false; for (let fx = .1; fx < 1 && !ok; fx += .2) for (let fy = .1; fy < 1 && !ok; fy += .2) { const h = pickAt(e.r[0] + e.r[2] * fx, Math.min(SCENE_H - 1, e.r[1] + e.r[3] * fy)); if (h && h.kind === 'exit' && h.obj.to === e.to) ok = true; } if (!ok) { const hs = {}; for (let fx = .1; fx < 1; fx += .2) { const h = pickAt(e.r[0] + e.r[2] * fx, e.r[1] + e.r[3] * .5); const k = h.kind + ':' + (h.obj && (h.obj.id || h.obj.to) || ''); hs[k] = 1; } (G.strictErrors = G.strictErrors || []).push(S.room + ' exit ' + (e.to) + ' not clickable; blockers ' + Object.keys(hs).join(',') + ' act' + S.act); } }
};
G.do = async (verb, a, b) => {
  const S = G.S; S.verb = null; S.selItem = null; let item = null, tgt;
  if ((verb === 'USE' || verb === 'GIVE') && b) { item = a; if (G.items[a] && !S.inv.includes(a)) throw new Error('test: item not held: ' + a); tgt = G.findTarget(b); }
  else if (verb === 'CALL' || verb === 'RADIO') tgt = { kind: 'floor' };
  else if (verb === 'USE' && G.items[a] && S.inv.includes(a) && !room().props.some(p => p.id === a)) { tgt = { kind: 'item', obj: a, name: a, solo: true }; }
  else tgt = G.findTarget(a);
  G.strictCheck(tgt, verb, item);
  const errs = (G.errors || []).length; G.busy = false;
  await perform(verb, item, tgt);
  if ((G.errors || []).length > errs) throw new Error('script error: ' + G.errors[G.errors.length - 1]);
};
G.go = async (to) => { const e = exitsNow().find(q => q.to === to || q.id === to); if (!e) throw new Error('no exit to ' + to + ' from ' + G.S.room); G.strictCheck({ kind: 'exit', obj: e }, 'WALK'); G.busy = false; const errs = (G.errors || []).length; await perform('WALK', null, { kind: 'exit', obj: e, name: e.label }); if ((G.errors || []).length > errs) throw new Error('script error: ' + G.errors[G.errors.length - 1]); };
G.choose = (...c) => { G.nextChoices.push(...c); };
G.newGameFast = async () => { G.fast = true; G.started = true; resetRun(); G.S = newState(); giveItem('scanner', true); G.catCache = {}; G.fade = 0; G.busy = false; };
