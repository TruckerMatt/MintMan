'use strict';
// PARSER: Sierra-style typed-command parser (hoisted functions that patches.js wraps at load time)
// ===== text-command parser (hybrid), start, test API =====
const VERB_WORDS = { look: 'LOOK', examine: 'LOOK', inspect: 'LOOK', read: 'LOOK', l: 'LOOK', take: 'TAKE', get: 'TAKE', grab: 'TAKE', pick: 'TAKE', use: 'USE', operate: 'USE', drive: 'USE', talk: 'TALK', speak: 'TALK', ask: 'TALK', open: 'OPEN', push: 'PUSH', shove: 'PUSH', pull: 'PULL', scan: 'SCAN', give: 'GIVE', hand: 'GIVE', call: 'CALL', phone: 'CALL', radio: 'RADIO', juno: 'JUNO', sniff: 'JUNO', fetch: 'JUNO', herd: 'JUNO', eat: 'USE', hint: 'HINT', help: 'HINT' };
function findNoun(txt) {
  txt = txt.trim().toLowerCase().replace(/^(the|a|an|my)\s+/, ''); if (!txt) return null;
  const S = G.S; const words = txt.split(/\s+/);
  const score = (name) => { name = name.toLowerCase(); if (name === txt) return 100; if (name.includes(txt)) return 60; let s = 0; for (const w of words) if (w.length > 2 && name.includes(w)) s += 20; return s; };
  let best = null, bs = 0;
  for (const id of S.inv) { const it = G.items[id]; const nm = typeof it.name === 'function' ? it.name() : it.name; const sc = score(nm) + (id === txt ? 100 : 0); if (sc > bs) { bs = sc; best = { kind: 'item', obj: id, name: nm }; } }
  for (const p of propsNow()) { const sc = score(p.name) + (p.id === txt ? 100 : 0); if (sc > bs) { bs = sc; best = { kind: 'prop', obj: p, name: p.name }; } }
  for (const e of exitsNow()) { const sc = score(e.label) - 5; if (sc > bs) { bs = sc; best = { kind: 'exit', obj: e, name: e.label }; } }
  if (/\b(juno|dog|girl)\b/.test(txt) && S.junoWith) return { kind: 'juno', name: 'JUNO' };
  if (/\bcats?\b/.test(txt) && catList().length) return { kind: 'cat', obj: catList()[0], name: 'CAT' };
  return bs >= 20 ? best : null;
}
async function runCommand(text) {
  const raw = text.trim().toLowerCase(); if (!raw) return;
  const w = raw.split(/\s+/); let verb = VERB_WORDS[w[0]]; let rest = w.slice(1).join(' ');
  if (raw === 'inventory' || raw === 'i') return say('Hollis checks his pockets: ' + (G.S.inv.length ? G.S.inv.map(i => (typeof G.items[i].name === 'function' ? G.items[i].name() : G.items[i].name)).join(', ') : 'nothing') + '. (The panel at the bottom shows them, too.)');
  if (!verb) { if (/^(go|walk|enter)\b/.test(raw)) { const t = findNoun(rest); if (t && t.kind === 'exit') return perform('WALK', null, t); return say('Hollis looks for a way to go there. He does not find one.'); } return say(RAND(['Hollis considers that command. The parser considers Hollis. Neither is moved.', 'That is not something Hollis knows how to do. He has tried "use", "look" and "scan"; these are his three verbs of choice.'])); }
  if (verb === 'HINT') return G.story.hint();
  if (verb === 'CALL' || verb === 'RADIO') return perform(verb, null, { kind: 'floor' });
  const m = /^(.*?)\s+(?:on|with|to|at|onto|into)\s+(.*)$/.exec(rest);
  let a = m ? m[1] : rest, b = m ? m[2] : null;
  if (/^(to|at)\s+/.test(a)) a = a.replace(/^(to|at)\s+/, '');
  const ta = findNoun(a), tb = b ? findNoun(b) : null;
  if ((verb === 'USE' || verb === 'GIVE') && b) {
    if (!tb) return say('Hollis doesn\'t see that here.');
    if (ta && ta.kind === 'item') return perform(verb, ta.obj, tb);
    if (/forklift|truck|jack|reach|yard truck|lift/.test(a)) return say(RAND(['Hollis has operated enough equipment without authorization today.', 'NARRATOR: Using a forklift on that is technically a workplace incident. Hollis declines.']));
    return say('Hollis doesn\'t have that.');
  }
  if (!ta) { if (/forklift|truck|jack/.test(a) && verb === 'USE') return say('Hollis has operated enough equipment without authorization today.'); return say('Hollis doesn\'t see that here.'); }
  return perform(verb, ta.kind === 'item' && (verb === 'USE' || verb === 'GIVE') ? ta.obj : null, ta.kind === 'item' && (verb === 'USE') ? { kind: 'item', obj: ta.obj, name: ta.name, solo: true } : ta);
}
G.runCommand = runCommand;
