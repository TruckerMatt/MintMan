'use strict';
// LOGIC: knowledge/progression evaluator, hints, invariants
// ===== central narrative logic: declarative gates, pure predicates, progressive hints =====
// Rule: interactions only set facts (flags / items). Act changes happen ONLY in checkProgress(), which asks G.logic.can(...).
// Every requirement a line of dialogue or UI claims is listed here once, and the code that enforces it reads the same list.
const _f = (k, label) => ({ k, label: label || k });
const _i = (i, label) => ({ i, label: label || i });
const _fn = (fn, label) => ({ fn, label });
const _met = (r) => r.k ? !!F(r.k) : r.i ? has(r.i) : !!r.fn();
G.logic = {
  GATES: {
    act2: [_f('radio_found', 'find the radio'), _f('f2231_scanned', 'scan forklift F-2231'), _f('scanner_live', 'get the scanner working')],
    act3: [_f('ingrid_helped'), _f('bruno_jack_fixed'), _f('trailmap_have'), _f('dfound0', 'find Torvald'), _f('gordon_call1', 'call Gordon')],
    mint_ready: [_f('cat_source_known'), _i('tuckerbook'), _f('page2_have'), _f('prudence_confessed')],
    act4: [_f('mint_eaten')],
    act5: [_f('hr_done'), _f('swap_fixed')],
    act6: [_f('departed')],
    docs: [_f('swap_fixed', 'the swapped forklift/reach truck records fixed'), _f('page2_have', 'page 2 of the 4417 manifest'), _f('manifest_decoded', 'the manifest\'s corrupted lines decoded (I can\'t read them either; you may have a way)'), _f('staging_empty', 'the staging lanes sorted')],
    dock: [_f('dock_hold_cleared'), _f('torvald_at_dock'), _f('trailmap_have')],
    load: [_f('staging_empty'), _f('t9022_at_dock')],
    depart: [_f('staging_empty', 'the staging lanes sorted'), _f('t9022_at_dock', 'the trailer at Door 3'), _fn(() => _shipOK() && PAL.filter(p => G.S.pal[p.code] === 'ship').length === 8, 'the eight Kestrel pallets sorted for shipping'), _f('loaded8', 'a loaded trailer'), _f('ozzie_confirm', 'Ozzie\'s remote-freight confirmation'), _f('gordon_confirm', 'Gordon\'s production sign-off'), _f('ingrid_docs', 'the correct bill of lading')],
    rescue: [_f('cat_source_known'), _f('colony_known')],
    halvorsen: [_f('directive_traced')],
    review: [_fn(() => G.story.missingEvidence().length === 0, 'all evidence'), _f('halvorsen_scene_done')]
  },
  missing(g) { return G.logic.GATES[g].filter(r => !_met(r)).map(r => r.label); },
  can(g) { return G.logic.GATES[g].every(_met); },
  P: {
    labelKnown: () => !!(F('label_decoded') || F('saw_template000')),
    colonyKnown: () => !!(F('saw_colony') || F('dfound1') || F('prudence_confessed')),
    mintVisionOn: () => !!(G.S.mintOn && G.S.mint > 0)   // current perception only; what was learned under it is stored in flags
  },
  // knowledge that is derived from other knowledge (never from items)
  deriveKnowledge() { if (G.logic.P.colonyKnown()) setF('colony_known'); if (G.logic.P.labelKnown()) setF('label_known'); },
  // the single transition table: [from, to, gate]. checkProgress performs the narration for each.
  NEXT: [[1, 2, 'act2'], [2, 3, 'act3'], [3, 4, 'act4'], [4, 5, 'act5'], [5, 6, 'act6']],
  nextAct() { const S = G.S; const t = G.logic.NEXT.find(x => x[0] === S.act); return t && G.logic.can(t[2]) ? t[1] : 0; }
};

// ---------- progressive hints: 4 levels per objective, remembered per objective, driven by live state ----------
const _have = has, _is = (k) => !!F(k);
const OBJ = [
  // ACT I
  { id: 'take_label', a: [1, 6], done: () => _is('took_label'), L: ['Something is stuck to Hollis.', 'Look at his feet, in the break room.', 'The crumpled label on his boot.', 'TAKE the crumpled label on the floor of the break room (by Hollis\'s boot).'] },
  { id: 'radio', a: [1, 1], done: () => _is('radio_found'), L: ['Something is chirping.', 'It is in the break room, behind a machine.', 'There is a gap too small for Hollis. Juno is the right size.', 'Pick JUNO, then click the gap behind the vending machine.'] },
  { id: 'scanner', a: [1, 1], done: () => _is('scanner_live'), L: ['Hollis\'s scanner is dead.', 'Something nearby runs on a battery like it.', 'Check what is on the break-room wall.', 'LOOK at the wall clock, then TAKE its battery and USE it on the scanner.'] },
  { id: 'scan_forklift', a: [1, 2], need: () => _is('scanner_live'), done: () => _is('f2231_scanned'), L: ['The scanner works now. Use it.', 'There is a forklift on the main floor.', 'Pick SCAN.', 'SCAN forklift F-2231 on the main floor.'] },
  // ACT II
  { id: 'ingrid_coffee', a: [2, 2], done: () => _is('ingrid_helped') || _is('ingrid_coffee'), L: ['Ingrid is in the shipping office, and she wants things.', 'She wants a coffee. Someone nearby has one.', () => _have('crackers') ? 'Prudence will trade the coffee for what you are holding.' : 'Prudence has coffee. She will trade for a snack from the break room.', () => _have('coffee') ? 'GIVE the coffee to Ingrid.' : _have('crackers') ? 'GIVE the fish crackers to Prudence (locker area), then GIVE the coffee to Ingrid.' : 'Quarters hide in the couch and lockers. Buy fish crackers from the break-room vending machine, GIVE them to Prudence, then GIVE the coffee to Ingrid.'] },
  { id: 'ingrid_form', a: [2, 2], done: () => _is('ingrid_helped') || _is('ingrid_form'), L: ['Ingrid wants a form handled.', 'Form 7-Q needs filling out and a signature.', () => _have('pen') ? 'You have a pen. Then someone in Operations signs.' : 'You need a pen. Locker 114 has one, and its combination is written somewhere on you.', () => _is('form_signed') ? 'GIVE the signed Form 7-Q to Ingrid.' : _is('form_filled') ? 'GIVE the filled form to Halvorsen (Operations office) to sign, then to Ingrid.' : _have('form7q') ? 'USE the pen on the Form 7-Q, GIVE it to Halvorsen to sign, then GIVE it to Ingrid.' : 'TAKE a Form 7-Q, get the pen from locker 114 (combination: LOOK at the back of the label), fill the form, have Halvorsen sign it, GIVE it to Ingrid.'] },
  { id: 'ingrid_manifests', a: [2, 2], need: () => _is('ingrid_coffee') && _is('ingrid_form') && _is('f2231_scanned'), done: () => _is('ingrid_helped'), L: ['Ingrid should be satisfied now.', 'Go back to her.', 'TALK to her.', 'TALK to Ingrid and ask for the manifests.'] },
  { id: 'bruno_jack', a: [2, 2], done: () => _is('bruno_jack_fixed'), L: ['The pallet jack at the outbound docks is broken.', 'It needs a part. Parts is a locked room off the main floor.', () => _have('seal') || _is('parts_open') ? 'You have what you need for the part.' : 'Someone unofficial has a key, and she likes coffee.', () => _have('seal') ? 'GIVE the hydraulic seal to Bruno.' : (_have('key_parts') || _is('parts_open')) ? 'Take the hydraulic seal from bin H-17 in Parts, GIVE it to Bruno.' : 'Ask Prudence about Parts after she has traded you coffee, take the seal from bin H-17, GIVE it to Bruno.'] },
  { id: 'rufus_tally', a: [2, 2], done: () => _is('trailmap_have'), L: ['A yard worker lost something.', 'Rufus lost his tally counter.', 'Lost things end up in the locker area.', () => _have('tally') ? 'GIVE the tally counter to Rufus in the yard.' : 'TAKE the tally counter from the Lost & Found box (locker area), GIVE it to Rufus in the yard.'] },
  { id: 'torvald1', a: [2, 2], done: () => _is('dfound0'), L: ['The dock spotter is missing.', 'He is hiding in the yard.', 'Juno can follow a scent.', () => _is('scent_taken') ? 'Pick JUNO and click the ground in the yard.' : _have('dglove') ? 'USE the glove on Juno, then use JUNO in the yard.' : 'Take Torvald\'s glove from his locker, USE it on Juno, then use JUNO in the yard.'] },
  { id: 'gordon1', a: [2, 2], need: () => _is('ingrid_helped'), done: () => _is('gordon_call1'), L: ['A customer is waiting to hear from you.', 'The manifests list a phone number.', 'Pick CALL.', 'CALL Gordon at Kestrel.'] },
  // ACT III
  { id: 'cat_source', a: [3, 3], done: () => _is('prudence_confessed'), L: ['The cats came from somewhere.', 'Look near the drain.', 'Someone has been feeding them there.', 'Go to the drainage area and ask Prudence where the cats came from.'] },
  { id: 'page2', a: [3, 3], done: () => _is('page2_have'), L: ['A cat is wearing something.', 'He lives in the storage racks.', 'He likes a cheap snack.', () => _have('crackers') ? 'GIVE the fish crackers to the big orange cat (Sgt. Biscuit) in the racks.' : 'Buy fish crackers, then GIVE them to the big orange cat in the racks.'] },
  { id: 'tucker', a: [3, 3], done: () => _have('tuckerbook'), L: ['Someone is locked away.', 'Tucker is in the cage in Parts.', 'The key hangs in the Charging Area.', () => _have('key_cage') ? 'USE the cage key on the Maintenance Cage in Parts, then ask Tucker for his notebook.' : 'TAKE the cage key (Charging Area), USE it on the cage in Parts, then ask Tucker for his notebook.'] },
  { id: 'mint', a: [3, 3], need: () => G.logic.can('mint_ready') || _is('mint_ready'), done: () => _is('mint_eaten'), L: ['The vending machine is glowing.', 'Slot D4.', 'It costs one quarter.', () => _have('mint') ? 'EAT the mint (USE it on Hollis).' : 'Press D4 on the break-room vending machine (25 cents), then eat the mint.'] },
  // ACT IV
  { id: 'hr', a: [4, 4], done: () => _is('hr_done'), L: ['HR is expecting Hollis.', 'It is off the locker area.', 'Tabitha is waiting.', 'Go to HR from the locker area and talk to Tabitha.'] },
  { id: 'swap', a: [4, 4], done: () => _is('swap_fixed'), L: ['Two records are mixed up at Ingrid\'s terminal.', 'You need proof of the swap and access.', () => _is('rec_read') ? 'You read the records. Now confirm the reach truck plate (Ozzie), get the admin password (Prudence, who now trusts you), and use Tucker\'s notebook.' : 'Read the records on Ingrid\'s terminal first.', 'Read the records, CALL Ozzie to check the plate, ask Prudence for the admin password, then USE Tucker\'s book on the terminal and RESTORE the identities.'] },
  { id: 'directive', a: [4, 6], done: () => _is('directive_traced'), L: ['The dashboard in Operations is hiding something.', 'You need to see through it.', 'MINT vision (M).', 'With MINT vision on, LOOK at the HALO dashboard in the Operations office.'] },
  // ACT V
  { id: 'sort', a: [5, 5], done: () => _is('staging_empty'), L: ['Staging is full of pallets.', 'Only the Kestrel order ships.', 'The pallet jack moves them; MINT vision shows the truth.', 'Sort all 16 pallets in staging: ship the eight on the Kestrel PO, store the rest.'] },
  { id: 'cats', a: [5, 5], done: () => _is('cats_migrated'), L: ['The cats need somewhere to go.', () => G.story.catMissing().length ? 'Something is missing from the plan.' : 'The plan is ready.', () => G.story.catMissing().length ? 'Still needed: ' + G.story.catMissing().join('; ') + '.' : 'Juno leads.', () => G.story.catMissing().length ? 'Still needed: ' + G.story.catMissing().join('; ') + '. (Kibble comes from opening a "counterweight" pallet in staging.)' : 'On the main floor, pick JUNO and click the cats.'] },
  { id: 'hold', a: [5, 5], need: () => _is('hold_known'), done: () => _is('dock_hold_cleared'), L: ['The trailer is on a hold.', 'Someone can clear it.', 'Someone near the outbound dock knows the password.', 'Ask Prudence at the outbound dock about the hold.'] },
  { id: 'spotter', a: [5, 5], need: () => _is('dock_hold_cleared'), done: () => _is('torvald_at_dock') || _is('t9022_at_dock'), L: ['The trailer driver needs a second pair of eyes.', 'Torvald is big enough.', 'Find him (he moves around).', 'Find Torvald and ask him to spot at dock 3.'] },
  { id: 'dock', a: [5, 5], need: () => _is('torvald_at_dock'), done: () => _is('t9022_at_dock'), L: ['The trailer must reach the door.', 'Use the radio at the outbound dock.', 'Timing matters.', 'At the outbound dock, RADIO Rufus, then click on GREEN.'] },
  { id: 'load', a: [5, 5], need: () => G.logic.can('load'), done: () => _is('loaded8'), L: ['The trailer is waiting.', 'Bruno loads.', 'He needs eight shipping pallets and a clear floor.', 'Talk to Bruno: "Ready to load?"'] },
  { id: 'docs', a: [5, 5], done: () => _is('ingrid_docs'), L: ['The paperwork has to be true.', 'Ingrid prints it.', () => 'She needs: ' + (G.logic.missing('docs').join('; ') || 'nothing else') + '.', 'Ask Ingrid to fix the documentation once all of those are done.'] },
  { id: 'ozzie_confirm', a: [5, 5], need: () => _is('loaded8'), done: () => _is('ozzie_confirm'), L: ['Someone remote must confirm.', 'Ozzie.', 'CALL.', 'CALL Ozzie to confirm the remote freight.'] },
  { id: 'gordon_confirm', a: [5, 5], need: () => _is('loaded8'), done: () => _is('gordon_confirm'), L: ['The customer must sign off.', 'Gordon.', 'CALL.', 'CALL Gordon for production sign-off.'] },
  { id: 'seal', a: [5, 5], need: () => G.logic.can('depart') || (_is('loaded8') && _have('bol')), done: () => _is('departed'), L: ['Nothing leaves without a seal.', 'Bruno closes the trailer.', 'He wants the paper.', 'GIVE the bill of lading to Bruno.'] },
  // ACT VI
  { id: 'halvorsen', a: [6, 6], need: () => _is('directive_traced'), done: () => _is('halvorsen_scene_done'), L: ['Halvorsen has something to say.', 'He is in the Operations office.', 'Go there.', 'Go to the Operations office and TALK to Halvorsen.'] },
  { id: 'tunnel', a: [6, 6], need: () => _is('halvorsen_scene_done'), done: () => _is('tunnel_found'), L: ['Gus will not let you through.', 'The cats know another way.', 'Rack 14.', 'USE Juno on the gap in Rack 14 (warehouse racks).'] },
  { id: 'evidence', a: [6, 6], need: () => _is('halvorsen_scene_done'), done: () => G.story.missingEvidence().length === 0, L: ['The review will need proof.', 'Some of it is paper, some is what you know.', () => 'Missing: ' + G.story.missingEvidence().length + ' item(s).', () => 'Missing: ' + G.story.missingEvidence().join('; ') + '.'] },
  { id: 'review', a: [6, 6], need: () => _is('tunnel_found'), done: () => _is('boss_done'), L: ['It is time.', 'The tunnel leads to the suite.', 'Walk through it.', 'Take the tunnel behind Rack 14 to the Regional Suite and present the evidence.'] }
];
G.OBJ = OBJ;
const _text = (x) => typeof x === 'function' ? x() : x;
G.story.openObjectives = () => OBJ.filter(o => G.S.act >= o.a[0] && G.S.act <= o.a[1] && (!o.need || o.need()) && !o.done());
G.story.hintFor = (o) => {
  const S = G.S; S.hintLevel = S.hintLevel || {};
  const lv = Math.min(4, (S.hintLevel[o.id] || 0) + 1); S.hintLevel[o.id] = lv;
  return 'HINT ' + lv + '/4: ' + _text(o.L[lv - 1]);
};
G.story.hint = async () => {
  const open = G.story.openObjectives();
  if (!open.length) return say('HINT: There is nothing specific you need right now. Try talking to people again, or moving to a new location.');
  await say(G.story.hintFor(open[0]));
  if (open.length > 1) await say('(Other open objectives: ' + (open.length - 1) + '. Press T for the to-do list.)');
};

// ---------- story invariants (machine-checkable; asserted by tests whenever G.testInvariants is on) ----------
const _shipOK = () => PAL.every(p => (G.S.pal[p.code] === undefined) || G.S.pal[p.code] === p.dest);
G.logic.INV = [
  ['act-range', 'act 1..6, cat 0..4, mint 0..3', () => G.S.act >= 1 && G.S.act <= 6 && G.S.cat >= 0 && G.S.cat <= 4 && G.S.mint >= 0 && G.S.mint <= 3],
  ['mintOn-needs-mint', 'vision cannot be on without the mint', () => !G.S.mintOn || G.S.mint > 0],
  ['no-duplicate-items', 'inventory has no duplicates', () => new Set(G.S.inv).size === G.S.inv.length],
  ['act>=2', 'Act II prerequisites', () => G.S.act < 2 || G.logic.GATES.act2.every(_met)],
  ['act>=3', 'Act III prerequisites', () => G.S.act < 3 || G.logic.GATES.act3.every(_met)],
  ['act>=4', 'Act IV prerequisites', () => G.S.act < 4 || G.logic.GATES.act4.every(_met)],
  ['act>=5', 'Act V prerequisites', () => G.S.act < 5 || G.logic.GATES.act5.every(_met)],
  ['act>=6', 'Act VI prerequisites', () => G.S.act < 6 || G.logic.GATES.act6.every(_met)],
  ['departed', 'departure needs loaded + documents + both confirmations + seal + correct freight', () => !F('departed') || (G.logic.can('depart') && F('trailer_sealed') && F('staging_empty') && _shipOK() && PAL.filter(p => G.S.pal[p.code] === 'ship').length === 8)],
  ['loaded8', 'loading needs the dock gate and an empty staging area', () => !F('loaded8') || (F('staging_empty') && F('t9022_at_dock'))],
  ['docs', 'bill of lading needs its four prerequisites', () => !F('ingrid_docs') || G.logic.GATES.docs.every(_met)],
  ['at-dock', 'trailer at dock needs hold cleared + spotter + map (spotter leaves after departure)', () => !F('t9022_at_dock') || F('departed') || G.logic.GATES.dock.every(_met)],
  ['cats-migrated', 'migration needs the whole plan', () => !F('cats_migrated') || (F('rescue_call') && F('t31_placed') && F('t31_bowls') && F('t31_blanket') && F('trail_floor') && F('trail_out') && F('trail_yard') && F('armband_on') && F('prudence_ready'))],
  ['rescue-done', 'rescue needs the call and the migration', () => !F('rescue_done') || (F('rescue_call') && F('cats_migrated'))],
  ['rescue-call', 'rescue call needs kibble + colony knowledge', () => !F('rescue_call') || G.logic.can('rescue')],
  ['swap-fixed', 'swap fix needs records, password, plate, notebook', () => !F('swap_fixed') || (F('rec_read') && F('admin_pw') && F('ozzie_plate') && has('tuckerbook'))],
  ['admin_pw', 'password knowledge needs the confession and the lock sighting', () => !F('admin_pw') || (F('prudence_confessed') && F('saw_admin_lock'))],
  ['directive', 'Directive 7-C knowledge needs the mint (discovered under vision)', () => !F('directive_traced') || F('mint_eaten')],
  ['mint-learned', 'decode knowledge needs the mint', () => (!F('manifest_decoded') && !F('label_decoded')) || F('mint_eaten')],
  ['mint-lifecycle', 'mint: bought before eaten; consumed when eaten; held while only bought', () => (!F('mint_eaten') || (F('mint_taken') && !has('mint'))) && (!(F('mint_taken') && !F('mint_eaten')) || has('mint'))],
  ['colony', 'colony knowledge has a source', () => !F('colony_known') || G.logic.P.colonyKnown()],
  ['label-known', 'label knowledge has a source', () => !F('label_known') || G.logic.P.labelKnown()],
  ['halvorsen', 'Halvorsen scene needs Act VI and the trace', () => !F('halvorsen_scene_done') || (G.S.act >= 6 && F('directive_traced'))],
  ['evidence-legit', 'evidence items only after their sources', () => (!has('bol') || F('ingrid_docs')) && (!has('receipt') || F('rescue_done')) && (!has('sightlog') || F('torvald3_done')) && (!has('exempt') || F('hr_done')) && (!has('trailmap') || F('trailmap_have')) && (!has('jack') || F('bruno_jack_fixed')) && (!has('tuckerbook') || F('tucker_freed'))],
  ['consumed-after-use', 'consumed items were used first', () => (!F('took_seal') || has('seal') || F('bruno_jack_fixed')) && (!F('got_coffee') || has('coffee') || F('ingrid_coffee')) && (!F('took_cagekey') || has('key_cage') || F('tucker_freed'))],
  ['boss-done', 'ending needs every gate before it', () => !F('boss_done') || (F('halvorsen_scene_done') && F('tunnel_found') && G.story.missingEvidence().length === 0 && F('admin_in') && F('reconciled'))],
  ['npc-rooms', 'NPC locations are real rooms', () => ['tuckerAt', 'torvaldAt', 'prudenceAt', 'biscuitRoom'].every(k => !G.S[k] || G.rooms[G.S[k]] || ['cage', 'door'].includes(G.S[k]))],
  ['torvald-stage', 'Torvald stands where his stage says', () => G.S.torvaldAt === DLOC[dstage()] || G.S.torvaldAt === undefined],
  ['room-valid', 'current room exists', () => !!G.rooms[G.S.room]]
];
G.logic.checkInvariants = () => G.logic.INV.filter(([id, d, fn]) => { try { return !fn(); } catch (e) { return true; } }).map(x => x[0]);
