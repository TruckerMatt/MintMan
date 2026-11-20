'use strict';
// PATCHES + POLISH: engine patches, parser easter eggs, safety net
// ===== late-bound additions & cross-file wiring =====
// Sgt. Biscuit (label/page 2)
G.rooms.racks.props.push({ id: 'biscuit', name: 'orange cat', npc: true, r: [186, 78, 22, 22], vis: (s) => s.act >= 2 && !F('page2_have'), draw() { Art.biscuit(198, 98); }, z: 100,
  on: { LOOK: async () => { await say('A large orange cat, sitting like a sergeant, with a slightly chewed sheet of paper stuck to the fur of his side like a medal. He looks at Hollis with authority and, faintly, hunger.'); setF('saw_biscuit'); }, TALK: 'The cat says "mrrp" in a tone that makes it sound like an order.', TAKE: 'Hollis reaches for the paper. Biscuit looks at Hollis. Hollis retracts his hand. There will need to be a trade.', PULL: 'The paper is stuck to fur. Hollis is not going to pull fur off a sergeant.' },
  scan: async () => { Snd.play('scan'); await say('SCANNER: CAT — SGT. BISCUIT. Rank: colony leader. Attached document: MANIFEST T-4417, PAGE 2 OF 2. Status: "worn as a medal". Weakness: fish crackers (80%).'); setF('saw_biscuit'); },
  giveTo: { crackers: () => biscuitTrade() }, useOn: { crackers: () => biscuitTrade() } });
async function biscuitTrade() {
  if (F('page2_have')) return; loseItem('crackers');
  await say(['Hollis offers the fish crackers. Sergeant Biscuit sniffs. He considers. He eats one with the dignity of a sommelier.', 'The paper is loosened by a neat sweep of a paw. It slides off his fur and lands at Hollis\'s feet.']);
  setF('page2_have'); Snd.play('meow'); await take('page2', 'Hollis picks up page 2 of the T-4417 manifest. It has a paw print and a bite mark. "Thanks, Sergeant." Biscuit blinks once, which is as close to "you\'re welcome" as a cat can get.');
}
// Prudence/other props in additional rooms
const mkPrudence = (x, y, cond) => ({ id: 'prudence_x', name: 'Prudence', npc: true, r: [x - 12, y - 40, 24, 42], vis: cond, draw() { Art.npc('prudence', x, y, { facing: 1 }); }, on: { TALK: () => talkPrudence(), LOOK: 'Prudence, exactly where she was not supposed to be. She looks like she has always been there.' }, scan: 'SCANNER: PRUDENCE — Status: TERMINATED. Location: WHEREVER. Task: "just finishing something". Note: she appears to know the password to everything.', giveTo: { '*': async () => say('PRUDENCE: Oh, don\'t. I\'m not technically in possession of that.') } });
G.rooms.outbound.props.push(mkPrudence(126, 122, (s) => s.prudenceAt === 'outbound'));
G.rooms.ops.props.push(mkPrudence(60, 122, (s) => s.prudenceAt === 'ops'));
P('lockers', 'prudence').giveTo.crackers = () => crackersToPrudence();
P('drain', 'prudence_d').giveTo.crackers = () => crackersToPrudence();
P('outbound', 'bruno').giveTo.bol = () => sealAndDepart();
G.rooms.floor.props.push({ id: 'route_floor', name: 'aisle', onlyItem: 'kibble', r: [10, 106, 300, 34], z: 0, draw() { if (F('trail_floor')) for (let i = 0; i < 12; i++) R(30 + i * 22, 130 + (i % 2) * 3, 2, 2, C.N); }, on: {}, useOn: { kibble: async () => { if (F('trail_floor')) return say('The trail is already down.'); setF('trail_floor'); await say('Hollis lays a line of kibble along the main aisle, from the racks toward the outbound dock. It\'s like leaving breadcrumbs, except for two hundred hungry witnesses.'); } } });
// A6/A7: kibble pallets
['A6', 'A7'].forEach(c => { const p = P('staging', 'pal_' + c); p.on.OPEN = async () => { if (!F('cat_source_known')) return say('The shrink wrap is committed. Whatever is inside, the pallet is not going to volunteer it.'); if (has('kibble')) return say('Hollis has enough kibble. Nobody needs a buffet.'); await say('Hollis slits the stretched wrap. A small waterfall of brown pellets pours out. It smells like fish, tuna, and the entire history of feline temptation. This is not a counterweight.'); await take('kibble', 'Hollis scoops some kibble into a tote lid. It goes in his pocket. It smells like victory. It also smells like fish.'); setF('cat_source_known'); setF('took_kibble'); }; });
// vending machine: PULL death
P('break', 'vending').on.PULL = async () => { await say('Hollis grabs the vending machine and pulls. It tilts. It considers. It commits.'); Snd.play('bump'); await fail('Vending Machine 1, Hollis 0. The machine wins. The machine always wins. Juno, standing safely to the side, files it under "expected".'); };
// forklift: death by driving
P('floor', 'f2231').on.USE = async () => { await say('Hollis looks at the forklift. The keys are in it. Nobody is watching.'); await menu([['Drive it anyway', async () => { Snd.play('reverse'); await say('Hollis climbs aboard. The forklift starts. Hollis backs up, turns, and puts a fork through a rack of tires. From a great distance, a small voice says "HR to the floor."'); Snd.play('bump'); await fail('Operating equipment without authorization. Tabitha arrives with a clipboard. Hollis is walked out. It is barely later than before, and he has been terminated by a form.'); }], ['Step away from the forklift', () => say('Hollis has operated enough equipment without authorization today.')]], 'FORKLIFT'); };
// break room extras
G.rooms.break.bg = ((o) => function (t) { o(F('lights_calm') ? 0 : t); })(G.rooms.break.bg);
G.rooms.break.fg = function () { if (G.endMint) { R(240, 83, 4, 3, C.G); R(241, 84, 2, 1, C.w); } if (G.endCat) { Art.cat(G.endCat.x, G.endCat.y, 33, 'stand'); } };
// tucker label event: done once lprinter labels stopped
const _lpp = P('inbound', 'lprinter'); const _oldPull = _lpp.on.PULL; _lpp.on.PULL = async () => { await _oldPull(); setF('tucker_labels_done'); await say('TUCKER: Oh thank goodness! I thought I broke it! (beat) I did break it.'); };
// Ops: Halvorsen scene trigger
G.rooms.ops.onEnter = async function () { if (G.S.act >= 6 && !F('halvorsen_scene_done')) await halvorsenScene(); };
// Torvald position tweaks
P('yard', 'torvald').r = [168, 64, 24, 44]; P('yard', 'torvald_ghost').r = [168, 64, 24, 44];
G.rooms.yard.props.find(p => p.id === 'torvald').draw = function (t) { Art.npc('torvald', 180, 106, { facing: -1 }); ctx.fillStyle = 'rgba(220,220,220,.5)'; for (let i = 0; i < 3; i++) ctx.fillRect(188 + Math.sin(t * 2 + i) * 2, 64 - i * 4 - ((t * 6) % 6), 3, 2); };
G.rooms.yard.props.find(p => p.id === 'torvald_ghost').draw = function (t) { ctx.globalAlpha = 0.5 + Math.sin(t * 5) * 0.2; Art.npc('torvald', 180, 106, { facing: -1 }); ctx.globalAlpha = 1; };

// ---- engine patches ----
const _pickAt = pickAt;
pickAt = function (x, y) {
  if (y >= SCENE_H) return null; const S = G.S; if (!S || !S.room) return null;
  const props = propsNow().filter(p => !(p.onlyVerb && S.verb !== p.onlyVerb) && !(p.onlyItem && S.selItem !== p.onlyItem)).sort((a, b) => { const la = a.z !== undefined && a.z < 5, lb = b.z !== undefined && b.z < 5; if (la !== lb) return la ? 1 : -1; return (a.r[2] * a.r[3]) - (b.r[2] * b.r[3]); });
  if (S.junoWith && !room().noJuno && x > S.ax - 10 && x < S.ax + 10 && y > S.ay - 14 && y < S.ay + 2) return { kind: 'juno', name: 'JUNO', obj: null };
  for (const p of props) if (p.npc && inRect(x, y, p.r)) return { kind: 'prop', name: p.name, obj: p };
  for (const c of catList()) if (x >= c.x - 5 && x < c.x + 5 && y >= c.y - 6 && y < c.y + 2) return { kind: 'cat', name: 'CAT', obj: c };
  for (const e of exitsNow()) if (inRect(x, y, e.r)) { const under = props.filter(p => inRect(x, y, p.r) && p.r[2] * p.r[3] < e.r[2] * e.r[3] * 0.8); if (!under.length) return { kind: 'exit', name: e.label, obj: e }; }
  for (const p of props) if (inRect(x, y, p.r)) return { kind: 'prop', name: p.name, obj: p };
  for (const e of exitsNow()) if (inRect(x, y, e.r)) return { kind: 'exit', name: e.label, obj: e };
  return { kind: 'floor', name: '', obj: null };
};

// parts area locked until Prudence's old key
G.rooms.floor.exits.find(e => e.id === 'to_parts').lock = (s) => { if (F('parts_open')) return false; if (has('key_parts')) { setF('parts_open'); say('The parts gate is locked. Hollis tries the old brass key. It fits like it was cut for a fired employee. Click. He\'s in.'); return false; } say('The parts gate is locked. A sign reads "PARTS: AUTHORIZED PERSONNEL ONLY". Someone with an old key would be very useful here.'); return true; };

// ===== polish: context-aware responses to unusual actions =====
const NPC_LINES = {
  tucker: { TAKE: 'Hollis tries to take Tucker. Tucker helpfully goes limp, then helpfully stands up, then helpfully offers to carry himself.', PUSH: 'Hollis nudges Tucker. Tucker assumes it is a drill, and evacuates the wrong way with great enthusiasm.', PULL: 'Hollis tugs Tucker\'s vest. Tucker says "Yes! Where are we going?" with no fear at all.', OPEN: 'Tucker opens his arms for a hug. Hollis reconsiders.', USE: 'Tucker volunteers to be useful. That is exactly how Hollis got into this.', GIVE: 'TUCKER: Oh, for me?! (He takes it. He looks at it. He looks up.) What is it for?' },
  bruno: { TAKE: 'Bruno is about six-two and does not take well to being taken.', PUSH: 'Hollis pushes Bruno. Bruno does not move. Bruno notes the attempt in a look.', PULL: 'Bruno lets himself be pulled exactly one step, out of courtesy.', OPEN: 'Bruno has no zippers, doors, or hatches. He is a very simple machine.', USE: 'BRUNO: I am not equipment. I work with equipment.', GIVE: 'BRUNO: I don\'t need that. Unless it\'s a seal, a jack, or a signed bill.' },
  ingrid: { TAKE: 'Ingrid looks at Hollis over her glasses. Hollis puts his hands back where they were.', PUSH: 'Ingrid is at her desk. She will be at her desk when this is over.', PULL: 'Ingrid has not moved from that chair since the last time the printer worked.', OPEN: 'Hollis opens his mouth to ask something. Ingrid says "No" before he does.', USE: 'INGRID: I am not a resource. I am a bottleneck. Big difference.', GIVE: 'INGRID: If that creates work for me, I will hand it back.' },
  prudence: { TAKE: 'Prudence has been taken away before. It did not take.', PUSH: 'Prudence drifts a step in the direction Hollis pushed and is now standing somewhere more useful.', PULL: 'PRUDENCE: (patting Hollis\'s hand) We\'re not really touching people today.', OPEN: 'PRUDENCE: I\'m only technically closed.', USE: 'PRUDENCE: I have been used before. I get paid in coffee.', GIVE: 'PRUDENCE: Oh, don\'t. I am not technically in possession of anything.' },
  torvald: { TAKE: 'Torvald is a Viking. Hollis does not take Vikings. Hollis is not that kind of raider.', PUSH: 'Hollis pushes Torvald. Torvald is pushed about one inch and then decides that is far enough.', PULL: 'TORVALD: Pull as hard as you want. I sit where I sit.', OPEN: 'TORVALD: (exhaling smoke) I am not that kind of open.', USE: 'TORVALD: I am on my break. You cannot use me during my break.', GIVE: 'TORVALD: Nah. But thanks.' },
  rufus: { TAKE: 'Rufus is in the cab of the yard truck. Hollis would have to take the truck too.', PUSH: 'RUFUS: (without looking) 144.', PULL: 'RUFUS: (without looking) I lost count again.', OPEN: 'Rufus opens the truck door, looks at Hollis, closes it.', USE: 'RUFUS: I am used exactly once a day, at the right time.', GIVE: 'RUFUS: Just put it on the dash.' },
  halvorsen: { TAKE: 'Halvorsen has already been taken. By the job.', PUSH: 'Halvorsen is already leaning on the edge. Hollis doesn\'t want to be the one.', PULL: 'HALVORSEN: If you\'re going to pull me into it, it needs to be a signed Form 7-Q.', OPEN: 'Halvorsen is closed. He has been closed since Q2.', USE: 'HALVORSEN: I am not a metric. (glances at dashboard) Am I?', GIVE: 'HALVORSEN: Put it in the tray. There is no tray. Just put it on the pile.' },
  tabitha: { TAKE: 'TABITHA: That would need to be a formal incident report. I have the form!', PUSH: 'TABITHA: (a warm smile) That is not a policy-compliant interaction.', PULL: 'TABITHA: We have a policy for that. It says please don\'t.', OPEN: 'TABITHA: I am always open. My door is open. My mind is... in policy.', USE: 'TABITHA: I\'m here to help, not to be used. Different form.', GIVE: 'TABITHA: I\'ll need that in triplicate.' },
  gus: { TAKE: 'Gus is bigger than the door he guards. Hollis leaves him where he is.', PUSH: 'Gus is the stairs. Nobody moves the stairs.', PULL: 'GUS: Sir.', OPEN: 'GUS: No.', USE: 'GUS: Can\'t be used. Can\'t be moved. Can\'t let you through.', GIVE: 'GUS: I don\'t accept gifts. The last one had a cat in it.' },
  renata: { TAKE: 'Renata is not for taking. She is for calling.', PUSH: 'RENATA: (gently) Please don\'t.', PULL: 'RENATA: (gently) Also no.', OPEN: 'Renata\'s clipboard is open. That is as open as she gets.', USE: 'RENATA: I am on your side. That is different from being used.', GIVE: 'RENATA: Kibble is fine. Otherwise, no thank you.' },
  harrow: { TAKE: 'Harrow is not for taking. Harrow is for reviewing.', PUSH: 'Harrow is already on the edge. Hollis is not going to be the reason.', PULL: 'HARROW: Please keep your hands in the meeting.', OPEN: 'HARROW: The review is open. The floor is not.', USE: 'HARROW: I am the regional director. I am the one who uses.', GIVE: 'HARROW: Submit that through the proper channel. (There is no proper channel.)' },
  gordon: {}, ozzie: {}
};
const NPC_GENERIC = { TAKE: 'People are not for taking. It says so in the handbook. Somewhere.', PUSH: 'Hollis decides not to push a coworker. Growth.', PULL: 'Hollis tugs a sleeve. The sleeve is unimpressed.', OPEN: 'Hollis is not qualified to open a person.', USE: 'Hollis does not use people. He uses the "TALK" verb, like a grown-up.', GIVE: 'They do not want that. Hollis is not sure anyone does.' };
const CATS_ = {
  equip: { TAKE: 'Hollis cannot take a piece of equipment. His pockets are big, but they are not that big.', PUSH: 'Hollis pushes. It is heavier than it looks. It is heavier than it sounds.', PULL: 'Hollis pulls. Equipment has a way of being where it is.', OPEN: 'There is a hood, a hatch and a warning label. He leaves all three alone.', TALK: 'Hollis talks to the machine. It is diesel, and does not care.', USE: 'Hollis is not certified on that today. The narrator checks. He is not.' },
  freight: { TAKE: 'Hollis cannot take a pallet. He can move it with the correct equipment.', PUSH: 'Hollis leans on it. Freight remains freight.', PULL: 'Best practice is not to pull loaded freight by hand. The narrator has read the module.', OPEN: 'The wrap is very committed.', TALK: 'The freight declines to comment. It has been in staging for a week and has a lot to be quiet about.', USE: 'Hollis is not going to use that on anything without a jack and a plan.' },
  machine: { TAKE: 'It is bolted, plugged in, and probably audited.', PUSH: 'Hollis pushes. It beeps, out of habit.', PULL: 'Hollis pulls the cord. It complains in one long tone. He puts it back.', OPEN: 'There is a panel. Behind it there is another panel. Hollis stops there.', TALK: 'Hollis talks to it. It beeps politely, which is more than most machines do.', USE: 'Hollis presses a few buttons. Nothing useful. It rebooted itself out of spite.' },
  sign: { TAKE: 'It is stapled to the wall by someone who meant it.', PUSH: 'Pushing paper is, technically, what most of Operations does.', PULL: 'Hollis pulls. A corner comes off, and he sticks it back.', OPEN: 'It has no flap. It is a poster with intentions.', TALK: 'Hollis reads it aloud. It is no better out loud.', USE: 'Hollis briefly considers acting on it. Then he reads it again.' },
  furniture: { TAKE: 'Hollis has taken enough things that were not his today. He declines.', PUSH: 'It scrapes a few inches and settles. It preferred the old spot.', PULL: 'It moves a little. It is heavier than a piece of furniture has a right to be.', OPEN: 'Hollis opens it. Everything inside is exactly what he expected.', TALK: 'Hollis asks it how its day is going. It looks like a piece of furniture.', USE: 'Hollis sits, stands, and sits again. It does not solve anything.' },
  door: { TAKE: 'Hollis cannot take a door. He has considered it.', PUSH: 'Hollis pushes. The door was not designed to be pushed by an employee.', PULL: 'Hollis pulls. The door is about as excited as he is.', OPEN: 'It does not open the way Hollis wants. It opens like a bureaucracy: slowly, and on a different day.', TALK: 'Hollis talks to the door. A cat on the other side does not answer.', USE: 'Hollis uses the door to go in and out. This does not count as a puzzle.' }
};
function catOf(p) { const n = (p.name + ' ' + p.id).toLowerCase();
  if (/forklift|truck|jack|charger|reach|tugger|yard|battery/.test(n)) return 'equip';
  if (/pallet|crate|box|drum|tote|wrap|freight|load|counterweight|pal_/.test(n)) return 'freight';
  if (/microwave|fridge|refrigerator|pot|coffee|printer|kiosk|terminal|screen|monitor|computer|dashboard|vending|machine|tablet|radio|scanner|sign_lockout|\bpa\b|speaker|intercom/.test(n)) return 'machine';
  if (/board|sign|flyer|poster|manifest|form|map|calendar|clock|photo|binder|label|whiteboard|chart|notice/.test(n)) return 'sign';
  if (/door|gate|trailer|cage|dock|fence|tunnel|shutter/.test(n)) return 'door';
  return 'furniture'; }
const USEON = ['Hollis thinks about using the ITEM on the THING. The THING has not done anything to deserve it.', 'Hollis lines up the ITEM with the THING, and then notices a cat watching. He lowers the ITEM.', 'The ITEM and the THING have no business together. HR would need a form for that.', 'Hollis holds up the ITEM. The THING is unmoved. The narrator is a little impressed.', 'That is not how the ITEM works. That is not how the THING works. That is not how anything works.'];
const niceItem = (id) => { const n = G.itemName(id); return /^(Torvald|Tucker|Kestrel|Rufus|Form|Safety|Manifest|Bill|Rescue|Scanner|Hydraulic|Fish|Tally|Parts|Cage|Pallet|Cat)/.test(n) ? n.replace(/^(Safety|Rescue|Scanner|Hydraulic|Fish|Tally|Parts|Cage|Pallet|Cat) /, (m) => m.toLowerCase()).replace(/^Tucker's book$/, 'notebook').replace(/^Bill/, 'bill') : n.toLowerCase(); };
G.story.smart = (verb, p, itemId) => {
  const nm = p.name || 'that';
  if (verb === 'USEON') { const it = G.items[itemId]; const inm = it ? niceItem(itemId) : 'thing'; if (p.npc) return 'Hollis considers using the ' + inm + ' on ' + p.name + '. ' + p.name + ' considers it back. Nobody moves.'; const poss = /'s /.test(nm), lowered = /^[A-Z]{2}|^[A-Z][a-z]+ [A-Z0-9]/.test(nm) ? nm : nm[0].toLowerCase() + nm.slice(1); return pickRand(USEON).replace(/ITEM/g, inm).replace(/([Tt])he THING/g, (m, t) => poss ? (t === 'T' ? nm[0].toUpperCase() + nm.slice(1) : nm) : t + 'he ' + lowered).replace(/THING/g, lowered); }
  if (verb === 'GIVE' && !p.npc && itemId) { const inm = niceItem(itemId); return pickRand(['Hollis offers the ' + inm + ' to the ' + nm + '. The ' + nm + ' declines, which is fair.', 'The ' + nm + ' is not accepting donations. Also, it is a ' + nm + '.', 'Hollis holds out the ' + inm + '. Nothing reaches back.']); }
  if (p.npc) { const t = NPC_LINES[p.id] || NPC_LINES[(p.id || '').replace(/_.*/, '')] || {}; const l = t[verb] || NPC_GENERIC[verb]; if (l) return l; }
  const c = CATS_[catOf(p)]; if (c && c[verb]) return c[verb];
  return pickRand(DEFAULT_NO[verb] || DEFAULT_NO.USE);
};

// ---- Sierra-style parser easter eggs (typed commands) ----
const _runCommand = runCommand;
const SILLY = [
  [/^(pet|scratch|hug|cuddle)\b.*\b(juno|dog|girl)\b/, async () => { if (!G.S.junoWith) return say('Juno is not here. Hollis pets the air out of habit.'); await junoAnim('sit', 600); return say(['NARRATOR: Hollis pets Juno. Juno accepts this as her due.', 'HOLLIS: Good girl.']); }],
  [/^(pet|scratch|hug|cuddle)\b.*\bcats?\b/, () => say(catList().length ? 'Hollis extends a hand toward a cat. The cat considers it, allows exactly two strokes, and then files a complaint with its eyes.' : 'There is no cat here. It is a strange thing to miss.')],
  [/^(feed)\b.*\bcats?\b/, () => say('Feeding the cats is how this started. Nobody is going to say that out loud, but the narrator is thinking it.')],
  [/^(kill|attack|hit|punch|kick|fight)\b/, () => say('Hollis has never hit anything at work. It is why he is still employed. Mostly.')],
  [/^(kiss|flirt)\b/, () => say('Hollis considers it. HR, somewhere, sits up in its chair. He does not.')],
  [/^(sleep|nap|rest|lie down)\b/, () => say('Hollis is tempted. That is how the day started. He stays standing.')],
  [/^(jump|dance|sing|whistle)\b/, () => say('Hollis does none of that. He is a professional. He is also very tall, and it would not end well near the racks.')],
  [/^(yell|shout|scream)\b/, () => say('Hollis yells. The warehouse, which has heard everything, has no response. A cat blinks.')],
  [/^(smoke)\b/, () => say('Hollis does not smoke. That is Torvald\'s department, and Torvald would like it to stay that way.')],
  [/^(drink|eat)\b.*\bcoffee\b/, () => say(G.S.inv.includes('coffee') ? 'It is the last decent coffee. It is not Hollis\'s. It has a destination.' : 'Hollis does not have any coffee. The break room pot smells like a rumor.')],
  [/^(eat)\b.*\b(mint)\b/, () => G.S.inv.includes('mint') && G.S.act >= 3 ? eatMint() : say(G.S.inv.includes('mint') ? 'Hollis holds the mint at arm\'s length. Not yet. Not until it is a real problem.' : 'Hollis does not have a mint. Yet.')],
  [/^(xyzzy|plugh|klaatu)\b/, () => say('Nothing happens. Wrong game. (The vending machine hums, judgmentally.)')],
  [/^(look|examine|l)\s*(at )?(me|self|myself|hollis)\b/, () => say('Hollis: tall, skinny, cap, gray shirt, blue vest, boots, stubble. He looks like a man who has already seen the incident report.')],
  [/^(save)\b/, () => say('The game saves itself as you go. (F5 also saves.) The warehouse does not.')],
  [/^(quit|exit)\b/, () => say('Hollis considers quitting. He has considered it since 2019. He is still here.')],
  [/^(help|\?)$/, () => G.story.hint()],
  [/^(swear|curse)\b/, () => say('Hollis swears mildly. A cat looks away, out of courtesy.')],
  [/^(wait|z)\b/, async () => { tick(2); return say('Hollis waits. The clock in the break room agrees it is 9:02.'); }],
  [/^(open|use)\b.*\bmicrowave\b.*$/, null]
];
runCommand = async function (text) {
  const raw = (text || '').trim().toLowerCase();
  for (const [re, fn] of SILLY) if (fn && re.test(raw)) return fn();
  return _runCommand(text);
};
G.runCommand = runCommand;

// ---- safety net: if the game is "busy" with nothing on screen or moving for a long time, release the input lock ----
(function () {
  let last = performance.now(), warned = 0;
  setInterval(() => {
    if (!G.started || !G.S) { last = performance.now(); return; }
    const active = G.say || G.menuState || G.cardText || G.overlay || G.walking || G.junoMoving || G.junoScript || G.fade > 0.02 || G.typing;
    if (!G.busy || active) { last = performance.now(); return; }
    if (performance.now() - last > 15000) { G.busy = false; G.inProgress = false; G.walkTarget = null; G.junoTarget = null; junoFree(); last = performance.now(); warned++; G.watchdogFires = (G.watchdogFires || 0) + 1; console.warn('input lock released by watchdog'); }
  }, 1000);
})();
