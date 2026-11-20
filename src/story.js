'use strict';
// STORY: items, Juno, cats, mint, HR, progress, NPCs, calls, finale, ending
// ===== story A: items, verb fallbacks, progression, hints, mint, HR, cat systems =====
G.story = {};
const RAND = (a) => a[Math.floor(Math.random() * a.length)];
async function talkLoop(title, build) { for (let guard = 0; guard < 200; guard++) { const opts = build().filter(o => o); opts.push(['(Done talking)', () => 'exit']); const r = await menu(opts, title); if (r === 'exit') return; } }
async function fail(msg) {
  Snd.play('fail'); const S0 = G.snap;
  if (G.fast) { G.failed = (G.failed || 0) + 1; G.log.push('FAIL: ' + msg); G.S = Object.assign(newState(), JSON.parse(S0)); G.catCache = {}; throw new AbortScript(); }
  await new Promise(res => { G.overlay = { draw() { R(0, 0, SW, SCENE_H, '#200000'); txt('YOU HAVE BEEN TERMINATED (SORT OF)', 160, 40, C.R, 9, 'center'); const ls = wrap(msg, 270, '7px "Courier New", monospace'); ls.forEach((l, i) => txt(l, 160, 62 + i * 10, C.w, 7, 'center')); txt('Click to try again from just before.', 160, 130, C.y, 7, 'center'); }, click() { res(); }, key(e) { if (e.key === ' ' || e.key === 'Enter') res(); } }; });
  G.overlay = null; G.S = Object.assign(newState(), JSON.parse(S0)); G.catCache = {}; G.walkTarget = null; throw new AbortScript();
}
G.fail = fail;

// ---------- items ----------
const I = G.items;
I.label = { name: 'Label', icon: 'label', look: async () => { await say('A crumpled shipping label. On the front: a barcode, and in Tucker\'s handwriting, "TEST TEST TEST — T." On the back, in pencil: "LKR 114: 33-12-08 (borrowed your combo, sorry! —T)".'); setF('label_back'); await say('The barcode is blurry and, oddly, not in any format Hollis recognizes.'); } };
I.scanner = { name: 'Scanner', icon: 'scanner', look: () => (F('scanner_live') ? 'Your handheld scanner, alive again. Its screen says "SCAN ANYTHING (except regrets)". Use the SCAN verb on nearly anything.' : 'Your handheld scanner. It is dead. Through the battery door, a rectangle of emptiness is visible. Someone took the battery.'), solo: async () => say(F('scanner_live') ? 'Use the SCAN verb, then click something. The scanner has been waiting.' : 'It does not power on. The battery compartment is empty.') };
I.sbat = { name: 'Scanner bat', icon: 'battery', look: 'A scanner battery pack with strips of electrical tape still on it. Held in a clock for who knows how long. It has a little green LED, which is optimistic.' };
I.radio = { name: 'Radio', icon: 'radio', look: 'Your radio, slightly chewed, faintly damp, entirely functional. Its channel knob has been set to "Operations", and someone has drawn a small cat on it.', solo: () => G.story.radioMenu() };
I.phone = { name: 'Phone', icon: 'phone', look: 'Your cell phone. 4% battery. It has been at 4% since Thursday. It appears to run on stubbornness.', solo: () => G.story.callMenu() };
I.quarter = { name: 'Quarters', icon: 'coin', look: () => `${G.S.f.q || 0} quarter(s). A collection of American ambition.` };
I.coffee = { name: 'Coffee', icon: 'cup', look: 'A mug of what may indeed be the last decent coffee in the building. It is hot. It is precious. It should not be wasted on anyone who has not earned it.' };
I.pen = { name: 'Pen', icon: 'pen', look: 'A blue pen. It writes. In this building, that alone is a distinction.' };
I.form7q = { name: 'Form 7-Q', icon: 'form', look: () => (F('form_signed') ? 'Form 7-Q, INFORMATION ACCESS REQUEST: filled out, signed by D. Halvorsen. Beautiful. A tiny piece of bureaucratic art.' : F('form_filled') ? 'Form 7-Q, filled out in blue pen: "Reason: hot shipment. Please, for the love of Kestrel." It needs an Operations signature.' : 'Form 7-Q: INFORMATION ACCESS REQUEST. It has fields for name, reason, and "how this will create work for others." It is blank.') };
I.crackers = { name: 'Fish crackers', icon: 'cracker', look: 'A bag of "Salty Little Fish". They are extremely fish-shaped and extremely not fish.' };
I.dglove = { name: 'Torvald glove', icon: 'glove', look: 'A leather work glove the size of a small oven mitt. It smells like pine, tobacco, and a Viking with very little interest in being found.' };
I.tally = { name: 'Tally counter', icon: 'tally', look: 'A brass yard tally counter with "RUFUS" scratched into the side. The display reads 147. It reads 147 in a way that suggests it gave up.' };
I.blanket = { name: 'Blanket', icon: 'blanket', look: 'A pink blanket that has been through some things. It is soft. It has a cat hair on it, which is either a coincidence or a preview.' };
I.flyer = { name: 'Rescue flyer', icon: 'letter', look: 'WHISKER RIDGE CAT RESCUE. "Found a cat? Found 40? Found 200? Call Renata: 555-0142. We bring vans. We bring volunteers. We bring blankets. You bring a safe place and something to eat."' };
I.bowl = { name: () => `Cat bowls x${G.S.f.bowls || 0}`, icon: 'bowl', look: () => `${G.S.f.bowls || 0} "NOT-A-CAT" bowl(s) of kibble that nobody admits to placing.` };
I.seal = { name: 'Hydraulic seal', icon: 'key', look: 'A hydraulic seal kit for a pallet jack. Small, unloved, and the difference between a working shift and a crawling one.' };
I.key_parts = { name: 'Parts key', icon: 'key', look: 'An old brass key on a Parts Department lanyard, faded to "PARTS". It came from a person who is technically not authorized to possess it. Presumably she possesses it in a technical sense.' };
I.key_cage = { name: 'Cage key', icon: 'key', look: 'The maintenance cage key. The tag says "IF FOUND SEE TUCKER". Tucker is in the cage. This is the world working as intended.' };
I.jack = { name: 'Pallet jack', icon: 'jack', look: 'Bruno\'s pallet jack, repaired, in your pocket. It is, by any standard, physically impossible to carry in a pocket. The inventory has never asked.' };
I.tuckerbook = { name: "Tucker's book", icon: 'book', look: async () => { await say('TUCKER\'S BOOK OF NUMBERS (PRIVATE). Each page: a forklift plate, a serial, a date, and a doodle. Page 14: "F-2231 — cushion tire — CT-2231 — first week — (doodle of a smiling forklift)". Page 15: "RT-77 — REACH — first week, later — (doodle of a sad reach truck going away)".'); setF('read_tucker_book'); } };
I.page2 = { name: 'Manifest p.2', icon: 'page', look: async () => { await say('Page 2 of the T-4417 manifest, with a paw print and a small nibble in one corner. It lists lines 5 through 8. Line 5: "MAST ASSEMBLIES (3-STAGE)". Lines 6 and 7: "FELINE NUTRITION, BULK TOTES (PAWSOME FOODS) — STORE, DO NOT SHIP". Line 8: "OVERHEAD GUARD KITS."'); setF('read_page2'); await say('It is the only document in the building that says what is actually on the trucks.'); } };
I.man1 = { name: 'Manifest p.1', icon: 'page', look: async () => { await say('A manifest is the packing list for a trailer: what the paperwork claims is inside. Manifest, T-4417/T-4418, page 1 of 2. Eight lines per trailer. Line 3 and 4: REACH TRUCKS → DEST: NEBRASKA (per Directive 7-C). Someone has crossed out "Tennessee" and written "NE" in the margin, in a font.'); setF('routing_found'); if (G.S.mintOn && !F('manifest_decoded')) { setF('manifest_decoded'); await say('MINT VISION: the smudged lines resolve. Directive 7-C has rewritten "KESTREL" to "COUNTERWEIGHT" on the kibble totes, and "TENNESSEE" to "NEBRASKA" on the reach trucks. The manifest is now readable.'); } else if (!G.S.mintOn && !F('manifest_decoded')) await say('Several lines are smudged, corrupted, or "auto-corrected". They will not resolve without better eyes than Hollis\'s.'); } };
I.po = { name: 'Kestrel PO', icon: 'po', look: 'KESTREL MOTOR WORKS — PO 55-1187 — HOT. Lines: 1) CUSHION-TIRE FORKLIFT ×2 (CT-118, CT-119). 2) MAST ASSEMBLY (3-STAGE). 3) OVERHEAD GUARD KIT. 4) 48V BATTERY PACK. 5) HYDRAULIC HOSE KIT. 6) CONTROL HARNESS CRATE. 7) COUNTERWEIGHT BLOCKS (IRON). That is eight loads. Nothing else. No reach trucks. No tires. No cat food.' };
I.kibble = { name: 'Kibble', icon: 'kibble', look: 'A scoop of feline nutrition, bulk grade, in an old tote lid. It smells irresistible to cats and, evidently, to everything with whiskers within a half-mile.' };
I.armband = { name: 'Safety armband', icon: 'armband', look: 'A bright green armband reading "SAFETY COMMITTEE — MEMBER (TEMP)". It is HR-approved. It is, technically, Juno\'s.' };
I.exempt = { name: 'Form 9-M', icon: 'exempt', look: 'FORM 9-M: EXEMPTION FOR NON-STANDARD BREATH. "The employee has been informed that no policy exists regarding supernatural breath mints, and is hereby exempt from all policies relating thereto." Signed by Tabitha. Stamped twice.' };
I.mint = { name: 'Mint', icon: 'mint', look: 'A small round mint, glowing a soft, confident green-white. It hums, faintly, at a frequency Hollis associates with the fluorescent lights at 9:02. Several company policies prohibit it. None of them name it.', solo: () => eatMint() };
I.trailmap = { name: 'Rufus map', icon: 'map', look: 'Rufus\'s hand-drawn yard map: every trailer, every row, every spot, with actual truth. At the bottom, in red: "T-9022: ROW C, SPOT 9. WMS: DOOR 3. WMS IS WRONG." Below that: "Cats: 143. No, 147. Wait."' };
I.sightlog = { name: 'Torvald log', icon: 'book', look: 'A grease-stained spiral notebook: "SMOKE LOG". Entries: "FRI 4:07 AM — HALO printer prints by itself. Label kiosk approves own directive. Says \'thank you\' out loud. Time: 4:07. Note: nobody was there but me and a cat." Signed: TORVALD. (Witness.)' };
I.receipt = { name: 'Rescue receipt', icon: 'receipt', look: 'WHISKER RIDGE CAT RESCUE — INTAKE RECEIPT. Cats received: 214 (two hundred fourteen). Condition: fed, fine, judgmental. Signed: Renata. Under it: "You did the right thing. Also, one of them has a lanyard."' };
I.bol = { name: 'Bill of lading', icon: 'po', look: 'The bill of lading for T-9022: eight loads, correct pallet IDs, correct serials, correct destination, printed by a woman who was told the truth. It is the cleanest piece of paper in the building.' };

// scanner check
G.story.scannerOk = async () => { if (F('scanner_live')) return true; if (!has('scanner')) { await say('Hollis has no scanner. He also has no idea where his radio is. It has been a morning.'); return false; } await say('Hollis raises his scanner. It is dead. It has the vibe of a person who was not told the meeting was moved.'); return false; };
G.story.wrongUse = (itemId, p) => {
  if (itemId === 'scanner') return 'Use the SCAN verb for that. The scanner\'s pride is at stake.';
  const forks = ['forklift', 'jack'];
  return G.story.smart('USEON', p, itemId) || pickRand(WRONG_USE);
};

// ---------- inventory item verbs ----------
G.story.itemVerb = async (verb, srcId, targetId) => {
  const it = I[targetId]; const nm = typeof it.name === 'function' ? it.name() : it.name;
  if (verb === 'LOOK') return run(it.look);
  if (verb === 'SCAN') {
    if (!await G.story.scannerOk()) return; Snd.play('scan');
    if (targetId === 'label') { setF('scanned_label'); if (G.S.mintOn) { setF('label_decoded'); return say(['MINT VISION: The label\'s barcode resolves: "TEMPLATE 000 — HALO GROUND TRUTH REFERENCE — ADMIN".', 'HOLLIS: Tucker. What did you print.']); } return say('SCANNER: LABEL — barcode format: ADMIN/UNKNOWN. Cannot decode: record not present in any database. Possible cause: "older than the database". Possible cause: "not a lie".'); }
    if (targetId === 'mint') return say('SCANNER: MINT — Sugar: 0. Contents: [REDACTED]. Approved: no. Glowing: yes. Suggested action: "no."');
    if (targetId === 'jack') return say('SCANNER: PALLET JACK — Mass: 190 lb. Volume: pocket. Inventory violations: 1 (accepted).');
    return say(`SCANNER: ${nm.toUpperCase()} — Asset: "Item I Own". Barcode: not applicable. Confidence: emotional.`);
  }
  if (verb === 'USE') {
    if (srcId && srcId !== targetId) {
      const pair = [srcId, targetId].sort().join('+');
      if (pair === 'sbat+scanner') { if (F('scanner_live')) return say('It\'s already running.'); setF('scanner_live'); loseItem('sbat'); Snd.play('scan'); return say(['Hollis pops the battery into the scanner. The screen flickers, reboots, and displays: "GOOD MORNING, HOLLIS. IT IS 9:02."', 'NARRATOR: It is, in fact, 9:02 only in the break room.', 'HOLLIS: (to the scanner) Don\'t start.']); }
      if (pair === 'form7q+pen') { if (F('form_filled')) return say('The form is already filled.'); setF('form_filled'); return say('Hollis fills out Form 7-Q. Name: Hollis. Reason: "Hot shipment (see: everything)". "How this will create work for others": "It won\'t." (This is a lie.) It needs a signature from Operations.'); }
      if (pair === 'kibble+bowl') return say('Hollis considers refilling the bowls. He does not. That is how this started.');
      if (pair === 'blanket+kibble') return say('Blanket + kibble: a pillow fort for cats. That\'s a good idea. Save it for later.');
      if (pair === 'mint+scanner') return say('SCANNER: Mint unscannable. Contents: unauthorized. Please do not put the scanner in your mouth either.');
      return say(RAND(['Hollis looks at both items and, correctly, does nothing.', 'Those two do not go together. Hollis checks the manual in his head. It is empty.', 'The inventory has rules. That is not one of them.']));
    }
    if (it.solo) return run(it.solo);
    return say(`Hollis can't think of a way to USE the ${nm.toLowerCase()} by itself. Try USE ... ON something.`);
  }
  if (verb === 'GIVE') return say('Give it to who? Click GIVE, then the item, then the person.');
  if (verb === 'TAKE') return say('It is already in Hollis\'s pocket, which is a mildly disturbing thing to say.');
  if (verb === 'TALK') return say(`Hollis mutters something at the ${nm.toLowerCase()}. It does not answer. Fine.`);
  if (verb === 'JUNO') return say('Juno sniffs the inventory panel. Hollis is not sure how she did that.');
  return say(pickRand(DEFAULT_NO[verb] || DEFAULT_NO.USE));
};

// ---------- Juno ----------
G.story.junoVerb = async (verb, itemId) => {
  const S = G.S;
  if (verb === 'LOOK') return say(['Juno: medium-sized, alert, mostly black with white paws and a very tan opinion about everything. She is looking back at you with the patience of a coworker who has been carrying the team for years.']);
  if (verb === 'TALK') { await junoAnim('tilt', 1100); return say(RAND(['Juno tilts her head. Hollis understands her perfectly. She is saying: "I saw it. I\'m not surprised either."', 'Hollis tells Juno what he\'s thinking. Juno wags once, which he is fairly sure means "Also me".', 'Juno sits. She has thoughts about the warehouse. They are mostly correct.'])); }
  if (verb === 'SCAN') { if (!await G.story.scannerOk()) return; Snd.play('scan'); return say(['SCANNER: JUNO — Type: DOG (GOOD). Location: WITH HOLLIS. Competence: exceeds several employees. Barcode: none. Warning: this asset is not for sale.', 'NARRATOR: The scanner does not say "good girl". It thinks it.']); }
  if (verb === 'TAKE' || verb === 'PULL') return say('Juno does not do that. She does other things.');
  if (verb === 'PUSH') return say('Juno sits down on principle.');
  if (verb === 'OPEN') return say('Hollis checks Juno\'s mouth. She has a stick in it. Nobody knows where she got it.');
  if (verb === 'JUNO') return say('Juno looks at Hollis like "you have to tell me what to do first." Pick JUNO, then a target.');
  if ((verb === 'USE' || verb === 'GIVE') && itemId) {
    if (itemId === 'dglove') { setF('scent_taken'); await junoAnim('sniff', 1400); return say('Juno buries her nose in the glove. She sneezes, snuffles, and then looks up with the expression of a hound who has decided who she is going to find. ("Now use JUNO on the outdoor ground, or anything outside.")'); }
    if (itemId === 'armband') { if (F('armband_on')) return say('She\'s already wearing it.'); setF('armband_on'); await say('Hollis slides the green armband over Juno\'s foreleg. She holds still with professional dignity.'); await junoAnim('bark', 500); return say('SAFETY COMMITTEE — MEMBER (TEMP). Juno stands a little taller. Somewhere in the warehouse, two hundred cats collectively feel a chill.'); }
    if (itemId === 'kibble') return say('Juno looks at the kibble. Then at Hollis. Then pointedly at the door. She is a professional.');
    if (itemId === 'crackers') { await junoAnim('sniff', 700); return say('Juno sniffs the fish crackers and turns her head away. Whatever they are, it\'s not a dog snack, and she knows it.'); }
    return say('Juno sniffs it politely and looks at Hollis. It is not that.');
  }
  return say(pickRand(DEFAULT_NO[verb] || DEFAULT_NO.USE));
};

// ---------- cats ----------
G.story.catTier = (n) => n <= 1 ? 0 : n <= 6 ? 1 : n <= 19 ? 2 : n <= 59 ? 3 : 4;
const CAT_LOOK = [
  ['A cat. Just the one. It is looking at Hollis the way one looks at a coworker who was late.', 'A single cat, in a place cats should not be. Hollis files this under "odd, probably fine".', 'A cat, sitting perfectly still, judging. There is only one, so Hollis can take it personally.'],
  ['A cat. There are a few now. Each one has chosen a spot with the confidence of someone who already has a badge.', 'This cat is asleep on top of something important. Nobody has asked it to leave, because nobody has been brave.', 'A cat that appears to be counting something. Possibly the other cats.'],
  ['A cat. This is officially a problem. Hollis can no longer tell which cats he has met.', 'A cat that has clearly learned the shift schedule and is following it more closely than the staff.', 'This cat is sitting on a pallet label. The pallet is now technically a cat pallet.'],
  ['A cat, one of dozens. Hollis has begun to recognize them by which shelf they run.', 'A cat looks back at Hollis. Behind it, forty more do the same, at the same moment. He looks away first.', 'There are so many cats here that the warehouse has started to be arranged around them.'],
  ['A cat. Hollis stopped counting a while ago. He has moved on to noticing the things that are not cats. That is the smaller list.', 'A cat on a cat on a cat. The lowest one is doing the work of a load-bearing pallet.', 'Hollis looks at one cat and feels the whole room look at him. He nods. It is the professional thing to do.']];
const CAT_TALK = [
  ['The cat looks at Hollis, blinks slowly, and says nothing in a way that feels like a rebuttal.', 'Hollis says hello. The cat says "mrrp". Neither of them makes a commitment.'],
  ['Hollis asks the cat where the rest of them came from. The cat looks at the ceiling, which is where they came from.', 'Hollis says "hey". Three cats answer. This was not the intention.'],
  ['Hollis asks the cat, quietly, who is in charge. The cat looks around. So does Hollis. Nobody comes forward.', 'The cat says "mrrp". From across the floor, about twelve cats say "mrrp" back. It has the feel of a meeting.'],
  ['Hollis speaks to the cat in his best supervisor voice. The cat blinks once. Every cat in earshot blinks once. He has never been listened to so completely or so uselessly.'],
  ['Hollis addresses the cat. The room goes quiet, in the manner of a room that has heard this speech before and did not care for it.', 'The cat says "mrrp". Something, somewhere, says "mrrp" in the walls. Hollis does not investigate.']];
const CAT_USE = {
  crackers: 'The cat sniffs the fish cracker, looks at Hollis, and turns away. Not the artisanal kind. This is a cat with standards. (It might be a different, larger, orange cat with standards, though.)',
  kibble: 'Hollis holds out some kibble. Nearby cats glance at the kibble, then at the sky, then at Hollis. This is fine. He is not going to spread it around. Not yet.',
  bowl: 'Hollis holds up a cat bowl. Several cats watch him, interested, and then notice that a bowl is not food. A bowl needs a place to go first.',
  blanket: 'Hollis drapes the blanket near the cat. The cat looks at it and then at Hollis, with the expression of someone who prefers to pick their own nap spot. Maybe somewhere warmer, and less in the way.',
  flyer: 'Hollis holds up the rescue flyer. The cat sniffs the paper, looks at the phone number, and looks at Hollis. It seems to be saying: obviously. Call them.',
  radio: 'Hollis holds the radio near the cat. The cat bats at the antenna. RADIO: "...is that a cat? Hollis, is there a cat on the radio?" Hollis turns it off.',
  phone: 'Hollis shows the cat his phone. The cat is not impressed by the phone. It is impressed by the warmth. It sits on the phone.',
  pen: 'The cat watches the pen with the focus of a professional. Hollis moves the pen. The cat moves with it. Hollis puts the pen away before it costs him the pen.',
  label: 'Hollis holds the label out. The cat sniffs it, sneezes once, and walks away. Cats, apparently, know when something is not a real barcode.',
  scanner: 'Hollis points the scanner at the cat. The scanner wants to be used with SCAN, and the cat would like Hollis to stop.',
  dglove: 'Hollis holds out the glove. The cat sniffs it, sneezes, and looks at Hollis with deep pity. Torvald smells like that, apparently.',
  jack: 'Hollis lowers the pallet jack toward the cat. The cat calmly steps onto the forks and rides. It is now a passenger, and Hollis is the driver. Hollis lifts nothing.',
  mint: 'Hollis holds out the mint. The cat sniffs it, leans back, and stares at him with newfound respect. Then it looks away. This one should not be shared.'
};
G.story.catVerb = async (verb, itemId, cat) => {
  const S = G.S, n = catList().length, tier = G.story.catTier(n);
  if (verb === 'LOOK') { Snd.play('meow'); return say(RAND(CAT_LOOK[tier])); }
  if (verb === 'SCAN') { if (!await G.story.scannerOk()) return; if (n >= 25) { setF('scanned_crowd'); Snd.play('scanfail'); return say(['SCANNER: SCANNING... 1... 2... 4... 11... 37... 108... 200...', 'SCANNER: ERROR. ITEM COUNT EXCEEDS LOCATION COUNT. CATS DETECTED IN 214 LOCATIONS SIMULTANEOUSLY. ASSET CLASS: "FLOOR HAZARD (SOFT)". PLEASE RECOUNT.', 'SCANNER: RECOUNTING... ERROR. THE CATS HAVE MOVED.', 'NARRATOR: The scanner reboots itself. It seems to need a moment.']); } Snd.play('scan'); setF('scanned_cat'); return say(RAND(['SCANNER: CAT — Class: "FELINE (UNREGISTERED)". Serial: none. Location: WHEREVER. Status: "ON PALLET". Value: priceless. Cost: kibble.', 'SCANNER: CAT — Type: FLOOR HAZARD (SOFT). Assigned dock: "yes". Notes: "not our cat, but ours now".', 'SCANNER: CAT — Asset tag: NONE. Purr rate: 26 Hz. Reliability: 3%.'])); }
  if (verb === 'TALK') { Snd.play('meow'); return say(RAND(CAT_TALK[tier])); }
  if (verb === 'TAKE') return say(RAND(['Hollis reaches for the cat. The cat has a look. Hollis withdraws his hand with the speed of a man who has heard about cats.', tier >= 2 ? 'Hollis reaches for a cat. Three other cats move into the space where the cat was. He has a sense that he is being managed.' : 'Hollis reaches for the cat. It sits down harder. Hollis lets it stay.']));
  if (verb === 'PUSH' || verb === 'PULL') return say('The cat becomes very heavy, then very liquid. Hollis decides to leave it exactly where it is.');
  if (verb === 'OPEN') return say('Hollis does not know how you open a cat. He has no wish to learn.');
  if (verb === 'CALL' || verb === 'RADIO') return say('Hollis considers calling for the cat. The cat has been here longer than the phone system. It ignores him on principle.');
  if (verb === 'GIVE' || verb === 'USE') {
    if (itemId && CAT_USE[itemId]) return say(CAT_USE[itemId]);
    return say(RAND(['The cat does not want that.', 'The cat considers it, and Hollis, and declines both.']));
  }
  if (verb === 'JUNO') return G.story.junoCats();
  return say('The cat is not participating.');
};
G.story.junoCats = async () => {
  const S = G.S, n = catList().length;
  if (n === 0) return say('There are no cats here. Juno is unsettled by the emptiness.');
  if (!F('armband_on')) { await junoGo(S.jx + 40, S.jy + 4); await junoAnim('bark', 500); await say('Juno barks at the cats. The cats look at her the way a crowd looks at a substitute teacher. Not a single one moves. One yawns. A tabby begins to bathe.'); return say('HOLLIS: They don\'t think she\'s in charge.'); }
  const miss = catMissing();
  if (miss.length) { await junoGo(S.jx + 40, S.jy + 4); await junoAnim('bark', 500); await say('Juno barks. The cats sit up. Several look at her armband. One salutes, in a cat way, by not doing anything. But there is nothing yet for the cats to move toward. She needs a plan behind her.'); await say('(Still needed: ' + miss.join('; ') + '.)'); return; }
  if (S.room !== 'floor') return say('Juno looks around at the cats here, then at Hollis. This is not the place. The main warehouse floor would be the place for a crowd this size.');
  await catMigration();
};
function catMissing() {
  const m = []; if (!F('rescue_call')) m.push('the rescue (call Whisker Ridge)'); if (!F('t31_placed')) m.push('Trailer 31 at the yard gate (Rufus)'); if (!(F('t31_bowls') && F('t31_blanket'))) m.push('the holding trailer needs bowls and a blanket'); if (!(F('trail_floor') && F('trail_out') && F('trail_yard'))) m.push('a kibble trail on the floor, outbound apron and yard'); if (!F('prudence_ready')) m.push('someone the cats trust to call the colony leader'); if (!F('tucker_at_door')) m.push('someone to hold the outbound side door (Tucker would love to; he is ' + (F('labels_running') && !F('labels_stopped') && !F('tucker_labels_done') ? 'at the inbound label printer' : 'on the main floor') + ')'); return m;
}
G.story.catMissing = catMissing;
async function catMigration() {
  const S = G.S; setF('migration_running');
  await say(['Juno steps forward. The armband gleams. The floor goes quiet.', 'NARRATOR: What follows is, without exaggeration, the most organized thing to happen in this warehouse in a decade.']);
  Snd.play('meows'); await fade(0.0, 100); for (const lv of [4, 3, 2]) { S.cat = lv; G.catCache = {}; G.shake = 1; await sleep(700); }
  await say(['Prudence\'s voice carries across the floor: "SERGEANT BISCUIT! Report!" A large orange cat rises from the racks and begins to walk, and behind him, the entire warehouse follows.', 'Tucker, at the outbound door, is holding it open with both arms and his whole heart. Not a single cat passes through incorrectly.', 'Juno trots at the head of the column, tail high, armband green. The whole colony walks in single file toward Trailer 31 like a very slow, very polite parade.']);
  S.cat = 1; G.catCache = {}; setF('cats_migrated'); setF('rescue_here'); setF('tucker_door_done'); S.tuckerAt = 'floor'; setF('tucker_at_door', false); setF('cats_cleared');
  Snd.play('meows'); await sleep(500);
  await say(['Juno returns, alone, a little smug. Behind her, on the floor, a few last cats remain: the office regulars, the ones who have been employed longer than some employees.', 'HOLLIS: Good girl.', 'NARRATOR: The warehouse is, for the first time this morning, almost quiet.', 'TUCKER: (from far away) DID IT WORK?', 'HOLLIS: (not loudly) Yes, Tucker.']);
  setF('cats_migrated'); await say('(Renata is waiting in the yard with a receipt.)');
}

// ---------- mint ----------
async function eatMint() {
  const S = G.S; if (S.act < 3) return say('Hollis looks at the mint. Every instinct says no. It hums, faintly, like something the building has been hiding. Not yet.');
  await say(['Hollis stares at the glowing mint. Company policy has opinions about this.', 'HOLLIS: I have no idea what this is.', 'NARRATOR: He is going to eat it anyway. That is what "desperate enough" looks like.', 'Juno, sitting beside him, tilts her head.', 'HOLLIS: If this ends up in a report, I want it noted that I was reasonable.']);
  loseItem('mint'); Snd.play('mint'); await junoAnim('tilt', 600);
  S.mint = 1; S.mintOn = true; G.flash = 1.4; G.shake = 4; setF('mint_eaten');
  await say(['It tastes like a cold winter morning and a fresh spreadsheet.', 'The warehouse lighting flickers, all at once. Every scanner in the building reboots. Labels flutter off pallets and into the air like startled birds.', 'Every cat in the room turns to look at Hollis, at the same instant. It is not a look that comes with a comfortable explanation.']);
  await say(['Hollis can see it now. Above every pallet, a tag of routing data. Above every forklift, an identity. Above the floor, a lattice of freight flow, dotted with cats that follow it like sheepdogs. The world is a system, and he can read it.', 'NARRATOR: MINT MODE: ACTIVE. Perception: logistics. Duration: "unclear. The scanner has stopped asking." (Press M to toggle vision.)']);
  // the act change itself belongs to the central evaluator (G.logic.can('act4'), performed in checkProgress)
  await checkProgress();
}

// ---------- HR ----------
async function hrSequence() {
  const S = G.S; setF('hr_sequence_running'); G.hideHollis = false;
  await say(['Tabitha looks up. "Hollis! Great. It\'s 9:02! Your mandatory screening. I\'m just going to run the tablet."', 'HOLLIS: It\'s not 9:02.', 'TABITHA: It\'s always 9:02 in PolicyPilot. (She taps.) Can you just breathe on the sensor?']);
  Snd.play('buzz'); G.flash = .6; await say(['Hollis breathes. The tablet screen flickers, goes cyan, goes green, goes a color that is a little bit like sound.', 'TABLET: ERROR 4-0-9:02 — SUBSTANCE NOT FOUND IN DATABASE. RECLASSIFYING AS: "BREATH (NON-STANDARD)". RECLASSIFYING AS: "WEATHER". RECLASSIFYING AS: "TUESDAY".']);
  Snd.play('printer'); await say(['The HR printer wakes up and begins printing shipping labels. Hundreds. One says "BREATH". One says "TENNESSEE".', 'TABITHA: (deep breath) That\'s... that\'s new.']);
  Snd.play('meows'); S.cat = 4; G.catCache = {}; await say(['The door opens. Four cats stroll in. Then eight. They sit in a semicircle around Hollis, observing him with respect and, faintly, accountability.', 'Juno watches the whole thing from the doorway. Her expression is a formal statement of judgment.', 'TABITHA: I have a policy for cats. It\'s Policy 88. It says: "Cats are not permitted." (She glances at the cats.) Nobody has ever told them.']);
  await say(['Tabitha taps at the tablet with a small, brave, HR smile.', 'TABITHA: Okay. I\'m searching for the policy on supernatural breath mints. Searching... Searching... (a pause) There is no policy.', 'HOLLIS: Great. Can I go?', 'TABITHA: I can\'t let you go with no paperwork. It would be... a hole. We\'ll do an exemption. Form 9-M: "Exemption for Non-Standard Breath". It\'s new. I\'m writing it now.']);
  await say('Tabitha stamps a form with a heartfelt thunk, then stamps it again for luck.'); await take('exempt', 'She hands Hollis the signed Form 9-M. It is, by any measure, the most bureaucratically powerful piece of paper he has ever held. It says nothing is forbidden that is not named.');
  await say(['TABITHA: Anything else I can help with? I have a lot of forms.', 'HOLLIS: Does the Safety Committee have any openings?', 'TABITHA: (lighting up) One vacancy. There are no requirements. It\'s a temp position. Do you know someone?', 'Juno barks once. Tabitha looks at her. Tabitha looks at the form. Tabitha looks at Juno.', 'TABITHA: ...She\'s very qualified.']);
  await take('armband', 'Tabitha hands over a bright green armband: SAFETY COMMITTEE — MEMBER (TEMP). "Approved. Pending policy." Juno looks at it, and then at Hollis, with an expression that says: finally.');
  setF('hr_done'); setF('hr_sequence_running', false); await say('(Somewhere, a cat quietly files a complaint about the stamp.)');
}

// ---------- progress ----------
async function checkProgress() {
  const S = G.S; if (!S || !S.room) return; if (G.inProgress) return; G.inProgress = true;
  try {
    S.prudenceAt = ({ 1: 'lockers', 2: 'lockers', 3: 'drain', 4: 'drain', 5: 'outbound', 6: 'ops' })[S.act] || 'lockers';
    S.torvaldAt = DLOC[dstage()];
    if (!F('pr1') && F('radio_found')) { setF('pr1'); await halvorsenRadio1(); }
    G.logic.deriveKnowledge();
    if (S.act === 1 && G.logic.can('act2')) { await setAct(2, 2); await say('Halvorsen on the radio: "Also, Hollis, it\'s come to my attention there may be a few cats. There is no approved metric for cats. So there aren\'t any."'); }
    if (S.act === 2 && G.logic.can('act3')) { await setAct(3, 3); await say(['NARRATOR: Between one hallway and the next, the cats multiply. It is like a rumor that got legs. Dozens are on the racks. Dozens are in the office. A cat is sitting in a forklift seat, looking like it is doing the job of two employees.', 'RADIO: (Halvorsen, faintly) There\'s no cat problem, I\'m told. Please disregard the cat on the forklift.']); }
    if (S.act === 3 && !F('mint_ready') && G.logic.can('mint_ready')) { setF('mint_ready'); await say('From the break room, faintly, comes a THUNK. The vending machine. Something in slot D4 is blinking. Hollis has a feeling about it.'); }
    if (S.act === 3 && G.logic.can('act4')) { await setAct(4, 4); Snd.play('radio'); await say(['RADIO: Hollis, Operations. HR just called. Your mandatory drug screening is scheduled for 9:02. It is now— (a long pause) — it\'s always 9:02 in HR. Report to HR immediately.', 'HOLLIS: (quietly) Of course it is.']); setF('hr_summoned'); }
    if (S.act === 4 && F('swap_fixed') && !F('sort_open')) { setF('sort_open'); await say('RADIO: (Ingrid) The WMS just released the reconciliation hold on staging. Every pallet is now movable. It\'s the first thing the WMS has done all week.'); }
    if (S.act === 4 && G.logic.can('act5')) { await setAct(5, S.cat); await say(['NARRATOR: There is a hot trailer to find, sixteen pallets to sort, a cat parade to organize, and a Regional review that hasn\'t noticed yet. Also, coffee.', 'NARRATOR: The rule for the pallets: ship the eight that match Kestrel\'s purchase order, store the other eight, and leave staging empty.', 'NARRATOR: One more thing the WMS wants to mention: the hot trailer, T-9022, is on a compliance hold. Somebody will have to clear it before it can come to a dock door.']); setF('hold_known'); }
    if (S.act === 5 && G.logic.can('act6')) { await setAct(6, 1); }
    S.prudenceAt = ({ 1: 'lockers', 2: 'lockers', 3: 'drain', 4: 'drain', 5: 'outbound', 6: 'ops' })[S.act] || 'lockers'; S.torvaldAt = DLOC[dstage()]; // re-sync after any act change in this pass
  } finally { G.inProgress = false; if (G.testInvariants) { const v = G.logic.checkInvariants(); if (v.length) (G.invariantErrors = G.invariantErrors || []).push({ act: G.S.act, room: G.S.room, v }); } }
}
async function halvorsenRadio1() {
  await say(['RADIO: Hollis? It\'s Halvorsen, Operations Manager. Where are you. We have a HOT shipment. That means a customer is losing money by the minute. Kestrel Motor Works, their assembly line is stalled waiting on parts. Eight loads, out the door by NOON.', 'HOLLIS: I woke up in the break room.', 'RADIO: Why. (beat) I don\'t need to know. The system says everything is ready. Go verify it. Start on the main floor and scan something. Scan the forklift. Tucker, the new inbound guy, says it is fine, which is the problem. Ingrid, our shipping clerk, has the paperwork. She will tell you she does not. Bruno, lead loader and unofficial mechanic, has the forklifts. Rufus in the yard has the trailers. Torvald was supposed to be spotting them, and nobody has seen him since dawn. He takes his breaks somewhere. Juno could track him if she had something of his to sniff. Someone has the cats.', 'HOLLIS: What cats?', 'RADIO: What cats. (click)']);
}
G.story.hintList = () => {
  const S = G.S, h = []; const nf = (k) => !F(k);
  if (S.act === 1) { if (nf('took_label')) h.push('Look around the break room. Something is stuck to your boot: TAKE it.'); if (nf('radio_found')) h.push('A chirp is coming from behind the vending machine. Juno is a good size for gaps: use the JUNO verb on it.'); if (nf('scanner_live')) h.push('Your scanner needs a battery. Something in this room runs on one that looks a lot like it. (LOOK at the clock.)'); if (nf('f2231_scanned')) h.push('Once the scanner works, go to the main floor and SCAN the forklift.'); }
  if (S.act === 2) {
    if (nf('ingrid_helped')) {
      if (nf('ingrid_coffee')) h.push(has('coffee') ? 'GIVE the coffee to Ingrid (shipping office).' : has('crackers') ? 'Prudence (locker area) has the last decent coffee. GIVE her the fish crackers.' : 'Ingrid wants a real coffee. Prudence (locker area) has the last one, and she will trade it for fish crackers from the break-room vending machine (25 cents; quarters hide in the couch and the locker-room bench).');
      if (nf('ingrid_form')) h.push(F('form_signed') ? 'GIVE the signed Form 7-Q to Ingrid.' : F('form_filled') ? 'GIVE the filled Form 7-Q to Halvorsen (Operations office) to sign.' : has('form7q') ? (has('pen') ? 'USE the pen on the Form 7-Q to fill it in.' : 'You need a pen for the Form 7-Q. Locker 114 (locker area) has one; the combination is on the back of the label on your boot.') : 'Ingrid wants a Form 7-Q. Blank ones are in the Operations office printer.');
      if (nf('f2231_scanned')) h.push('Ingrid wants proof the records are wrong. SCAN the forklift on the main floor.');
      if (F('ingrid_coffee') && F('ingrid_form') && F('f2231_scanned')) h.push('Ingrid has everything she asked for. TALK to her and ask for the manifests.');
    }
    if (nf('bruno_jack_fixed')) h.push(has('seal') ? 'GIVE the hydraulic seal to Bruno (outbound docks).' : (has('key_parts') || F('parts_open')) ? 'Bruno needs a hydraulic seal: bin H-17 in Parts (off the main floor). You have the key.' : (F('got_coffee') ? 'Bruno (outbound docks) needs a hydraulic seal from bin H-17 in Parts, but Parts is locked. Prudence (locker area) has an old key: ask her about Parts.' : 'Bruno (outbound docks) needs a hydraulic seal from bin H-17 in Parts, but Parts is locked. Prudence (locker area) has an old key; she will talk about it once you have traded her fish crackers for the coffee.'));
    if (nf('trailmap_have')) h.push(has('tally') ? 'GIVE Rufus (yard) his tally counter.' : 'Rufus (yard) lost his tally counter. Check the Lost & Found box in the locker area.');
    if (nf('dfound0')) h.push(F('scent_taken') ? 'Juno has Torvald\'s scent. Pick the JUNO verb and click the ground in the yard.' : has('dglove') ? 'USE Torvald\'s glove on Juno, then pick JUNO and click the ground in the yard.' : 'Torvald is hiding in the yard. Juno can find him with his scent: his glove is in his locker (locker area).');
    if (nf('gordon_call1') && F('ingrid_helped')) h.push('Ingrid\'s manifest has the customer\'s number. Use CALL to phone Gordon at Kestrel.');
    if (nf('page2_have') && F('ingrid_helped')) h.push('Optional for now: page 2 of the manifest is with a big orange cat in the storage racks. He likes fish crackers.');
  }
  if (S.act === 3) { if (nf('cat_source_known')) h.push('Where did the cats come from? Ask Prudence at the drain, or ask Tucker about the bowls once he is out of the cage.'); if ((S.f.bowls || 0) < 3) h.push('There are three cat bowls nobody admits placing: break room, main floor, staging. Take them.'); if (nf('tucker_freed')) h.push('Tucker is locked in the Maintenance Cage in Parts. The cage key hangs in the Charging Area.'); if (nf('page2_have')) h.push('A cat in the racks has a paper stuck to its fur. It likes fish crackers.'); if (nf('prudence_confessed')) h.push('Prudence is in the drainage area, feeding cats. Ask her.'); if (F('mint_ready')) h.push('The vending machine\'s D4 is glowing. You need a quarter. Then eat the mint.'); }
  if (S.act === 4) { if (nf('hr_done')) h.push('Go to HR (from the locker area).'); if (nf('directive_traced')) h.push('With MINT vision on (M), look at the HALO dashboard in the Ops office.'); if (nf('swap_fixed')) h.push('Fix the mixed-up records at Ingrid\'s terminal: read the records, have Ozzie check the plate on the reach truck, get the admin password from Prudence, use Tucker\'s notebook on the terminal.'); if (nf('dfound2')) h.push('Torvald is hiding again: smoking area. Juno, or use MINT vision.'); }
  if (S.act === 5) { if (nf('staging_empty')) h.push('Sort all 16 pallets in staging using the pallet jack: Kestrel PO items ship, everything else goes to storage. Scan with MINT vision to see the truth.'); const cm = catMissing(); if (!F('cats_migrated') && cm.length) h.push('Cat plan: ' + cm.join('; ') + '.'); if (!F('cats_migrated') && !has('kibble') && !(F('trail_floor') && F('trail_out') && F('trail_yard'))) h.push('Kibble for the trail: OPEN one of the "counterweight" pallets (A6 or A7) in staging.'); if (!F('cats_migrated') && !cm.length) h.push(F('armband_on') ? 'Everything is ready. Go to the main warehouse floor, pick JUNO and click the cats.' : 'The cats need to see Juno is in charge: USE the safety armband on Juno. Then, on the main warehouse floor, pick JUNO and click the cats.'); if (F('cats_migrated') && nf('staging_empty')) h.push('B1 is clear of cats now. Finish sorting staging.'); if (nf('dock_hold_cleared')) h.push('Prudence (outbound dock) can clear the WMS hold on the trailer.'); if (nf('torvald_at_dock')) h.push('Torvald: find him (yard) and ask him to spot at dock 3.'); if (nf('t9022_at_dock')) h.push('Stand at the outbound dock and RADIO Rufus to bring T-9022 to door 3, then call it in when the dock light is green.'); if (nf('loaded8')) h.push('Talk to Bruno when the trailer is at the dock and staging is clear.'); if (nf('ingrid_docs')) h.push('Ingrid can print the bill of lading once records are fixed (needs page 2, manifest decoded with MINT vision).'); if (nf('ozzie_confirm')) h.push('Call Ozzie to confirm remote freight.'); if (nf('gordon_confirm')) h.push('Call Gordon for production sign-off (after loading).'); if (F('loaded8') && F('ingrid_docs')) h.push('GIVE the bill of lading to Bruno to close the trailer.'); }
  if (S.act === 6) { if (nf('directive_traced')) h.push('Turn MINT vision on (M) and LOOK at the HALO dashboard in the Operations office.'); else if (nf('halvorsen_scene_done')) h.push('Go to the Operations office and talk to Halvorsen.'); else if (nf('tunnel_found')) h.push('Gus will not let you into the Regional Suite. The cats know another way: use JUNO on the gap in Rack 14 (warehouse racks).'); else { const miss = G.story.missingEvidence ? G.story.missingEvidence() : []; if (miss.length) h.push('Before the Regional Review, collect your evidence: ' + miss.join('; ') + '.'); else h.push('Take the tunnel behind Rack 14 to the Regional Suite.'); } }
  if (!h.length) h.push('You have done everything you need for now. Try talking to people again, or moving to a new location.');
  return h;
};
G.story.hint = async () => {
  const h = G.story.hintList();
  G.hintN = (G.hintN || 0); const k = G.hintN % h.length; G.hintN++; await say('HINT: ' + h[k]); if (h.length > 1) await say('ALSO: ' + h[(k + 1) % h.length] + (h.length > 2 ? ' (Press H again for more.)' : ''));
};

// TO DO list (key T / click the clock): every open objective for the current act, plus a recap on CONTINUE.
G.story.todo = async () => {
  const S = G.S; const h = G.story.hintList();
  const goal = ['', 'Get the scanner working, find your radio, and scan the forklift.', 'Get the office, the loading dock, the yard and the customer lined up.', 'Find where the cats are coming from and who is behind it.', 'Fix the records and deal with HR and the dashboard.', 'Sort the 16 pallets, find the hot trailer, move the cats, load and seal.', 'Face the Regional Review.'][S.act] || '';
  await say(['TO DO (' + fmtTime(S.time) + ', Act ' + ['', 'I', 'II', 'III', 'IV', 'V', 'VI'][S.act] + '): ' + goal].concat(h.slice(0, 4).map((x, i) => (i + 1) + '. ' + x)).concat(h.length > 4 ? ['(Press H for hints on the rest.)'] : []));
};

// ===== story B: NPC conversations, calls, radio =====
async function callScene(id, fn) {
  const S = G.S; const prev = { room: S.room, jx: S.jx, jy: S.jy }; S.room = id; G.inCall = true; Snd.play('radio'); G.catCache = {};
  try { await fn(); } finally { G.inCall = false; S.room = prev.room; S.jx = prev.jx; S.jy = prev.jy; G.catCache = {}; }
}
// ---------- Prudence ----------
async function talkPrudence() {
  const S = G.S;
  if (!F('met_prudence')) { setF('met_prudence'); await say(['PRUDENCE: Oh! Hollis. Hi. I was just finishing something. Eleven years in Inventory Control, you know. They never did make a form for my exit.', 'HOLLIS: Prudence, you were fired.', 'PRUDENCE: (a breezy wave) Technicality.', 'NARRATOR: She says it like it is a small fee at a parking garage. Nobody in Security has taken it up. Security is aware she is present. Security has decided this is Operations\' problem.']); }
  await talkLoop('PRUDENCE', () => [
    ['"You were fired, you know."', async () => say(RAND(['PRUDENCE: A technicality. Paperwork. The work itself is still happening.', 'PRUDENCE: Honestly? Still finishing something. Can\'t stop now.', 'PRUDENCE: (kindly) It was a process. It hasn\'t concluded.']))],
    (!F('got_coffee') && !F('ingrid_coffee')) ? ['Ask about the last decent coffee', async () => { if (has('crackers')) return crackersToPrudence(); await say(['PRUDENCE: Oh, the coffee? That\'s mine. I mean, that\'s communal. That I\'m... holding. (She sips.)', 'PRUDENCE: I\'d trade it for something. I have friends who\'d appreciate something salty. Fish-shaped, ideally. From that vending machine.', 'HOLLIS: Friends.', 'PRUDENCE: (smoothly) Colleagues.']); setF('prudence_wants_crackers'); }] : null,
    (has('crackers') && !F('got_coffee') && !F('ingrid_coffee')) ? ['Offer the fish crackers', () => crackersToPrudence()] : null,
    (F('got_coffee') && !F('key_given')) ? ['Ask about the Parts area (locked)', async () => { await say(['PRUDENCE: Parts? Oh, that\'s locked. It\'s restricted. Only Parts staff have the key.', 'HOLLIS: You don\'t work in Parts.', 'PRUDENCE: I don\'t work anywhere. (She digs in a pocket.) I am, however, a keyholder in a personal, unofficial capacity.', 'PRUDENCE: (handing over an old brass key) Never saw this. Bin H-17 has what Bruno needs. He\'s been asking since March.']); setF('key_given'); giveItem('key_parts'); }] : null,
    (S.act >= 3 && !F('prudence_confessed') && (F('saw_colony') || F('dfound1') || S.room === 'drain')) ? ['Ask where the cats came from', () => prudenceConfess()] : null,
    (S.act >= 3 && !F('prudence_confessed') && !(F('saw_colony') || F('dfound1') || S.room === 'drain')) ? ['Ask where the cats came from', async () => say('PRUDENCE: (mildly) Cats? What cats. (She sips.) I think you\'d have better luck asking someone who\'s been spending time by the drain. (She looks at nothing.)')] : null,
    (F('prudence_confessed') && !F('admin_pw') && F('saw_admin_lock')) ? ['Ask about the HALO admin password', async () => { await say(['HOLLIS: Prudence. HALO\'s admin login. Do you happen to know it?', 'PRUDENCE: Oh, sure. I set it up with the install tech. "HALO_ORIGINAL". They said nobody would guess it.', 'HOLLIS: Why would nobody guess it?', 'PRUDENCE: Because nobody knows it. (She smiles.) Except me. And the tech. And now you. It\'s unauthorized information. Very unofficial.']); setF('admin_pw'); }] : null,
    (F('prudence_confessed') && S.act >= 5 && !F('prudence_ready')) ? ['Ask her to call Sergeant Biscuit when it\'s time', async () => { await say(['HOLLIS: When the migration starts, will Biscuit follow your voice?', 'PRUDENCE: (a soft, sure smile) Sergeant Biscuit follows exactly one voice. Yes. Tell me when.']); setF('prudence_ready'); }] : null,
    (S.act >= 5 && S.room === 'outbound' && F('hold_known') && !F('dock_hold_cleared')) ? ['Ask about the WMS "hold" on T-9022', async () => { await say(['HOLLIS: The WMS has T-9022 on a compliance hold. I can\'t bring it to door 3 without an override.', 'PRUDENCE: Oh, that. (She strolls to the dock kiosk.) It\'s just a rule with a password that\'s supposed to belong to Regional.', 'HOLLIS: You know it.', 'PRUDENCE: Everyone knows it. It\'s "HALO_ORIGINAL". It\'s always been "HALO_ORIGINAL".', 'NARRATOR: She types. The kiosk beeps. The kiosk says, in a gentle voice, "Hold cleared. Thank you, Prudence." It has known her the whole time.']); setF('dock_hold_cleared'); }] : null
  ]);
}
async function crackersToPrudence() {
  if (F('got_coffee') || F('ingrid_coffee')) return say('PRUDENCE: (eyeing the crackers) Oh, lovely. But I have already been very well looked after today. Those are for someone else.');
  loseItem('crackers'); giveItem('coffee'); setF('got_coffee');
  await say(['Hollis offers the fish crackers. Prudence\'s eyes light up like a smoke detector at a barbecue.', 'PRUDENCE: Oh, you didn\'t have to. (She takes them.) Fine. Here. The last decent coffee. But you didn\'t get it from me.', 'HOLLIS: Where\'d I get it from?', 'PRUDENCE: A person who has been "finishing something".']);
  await say('Hollis takes the coffee. It is hot, dark, and almost sentimental.');
}
async function prudenceConfess() {
  await say(['HOLLIS: Prudence. I know about the drain. The shelters. The names.', 'PRUDENCE: (quietly) Somebody had to.', 'HOLLIS: How many?', 'PRUDENCE: It started with six. Sergeant Biscuit, the Professor... they\'ve been out by the drain since spring. I was feeding them at dawn. Fired-me had a lot of dawns.']);
  await say(['PRUDENCE: Then last Friday, a trailer came in with a torn seal. Door nine got left open. Something in it smelled like a fish market on a good day. The whole colony walked in like it was a buffet.', 'HOLLIS: The kibble totes.', 'PRUDENCE: Oh, is that what they are? I saw the label say "counterweight", and I thought, that\'s a funny weight. Then Tucker started putting out bowls. Every place they looked hungry. He was so proud.']);
  await say(['PRUDENCE: The cats found the warm building and told their friends. Cats are like that. One colony calls the next colony, and the next.', 'HOLLIS: And Sergeant Biscuit?', 'PRUDENCE: He\'s got a piece of paper on him. Stuck to his fur. From the trailer. He wears it like a medal. He hangs around Rack 14. He\'ll do anything for a fish cracker.']);
  setF('prudence_confessed'); setF('cat_source_known'); setF('colony_known'); await say(['HOLLIS: And when I need him to leave?', 'PRUDENCE: He\'ll leave for me. Just say when.']); setF('prudence_ready_offer');
}

// ---------- Tucker ----------
async function talkTucker() {
  const S = G.S;
  if (!F('met_tucker')) { setF('met_tucker'); await say(['TUCKER: HOLLIS! You\'re awake! I\'ve been so worried! I\'m on Inbound, three weeks in, remember? I unload the trailers and put them in the computer! I tried to wake you but Prudence said you needed the sleep.', 'HOLLIS: Prudence was in the break room?', 'TUCKER: Was she? She\'s everywhere. Anyway! How can I help? I\'m great at helping.']); }
  await talkLoop('TUCKER', () => [
    ['Ask about the scanner battery', async () => { await say(['TUCKER: Oh! The clock kept dying, and I needed a battery that was... shaped like a battery. I found one in a broken scanner in the trash. Was that yours? (nervously) I put tape on it.', F('clock_battery') ? 'HOLLIS: It\'s back in my scanner now. Fine.' : 'HOLLIS: It\'s in the clock. Fine.', 'TUCKER: You\'re not mad?', 'HOLLIS: I\'m mildly proud of how much I\'m not mad.']); setF('tucker_told_clock'); }],
    ['Ask about the radio', async () => say('TUCKER: Oh, it chirped at me. Something scary was behind the vending machine so I told it to stay there. Then I forgot. Sorry! I\'m so sorry!')],
    !F('tucker_cleared') ? ['Ask him to move the pallet wall', async () => { await say(['HOLLIS: Tucker, could you un-organize the aisle to staging?', 'TUCKER: Yes! Absolutely! I love un-organizing! Watch this!']); Snd.play('pallet'); await say(['Tucker picks up the first pallet with the confidence of a man who has never once been told no. The second pallet goes with it. The third goes with both. There is a clatter, a shout, and a tearing sound. From inside a torn box, a small cat emerges, stretches, and walks away.', 'TUCKER: Oh no. It was in there.', 'HOLLIS: Yeah.', 'TUCKER: The aisle\'s open, though!']); setF('tucker_cleared'); }] : null,
    !F('tucker_bowls_confess') ? ['Ask about the bowls of kibble', async () => { await say(['HOLLIS: Tucker. The cat bowls. Somebody put them out. Nobody\'s admitting to it.', 'TUCKER: (small voice) ...It was me. There was a tote in staging leaking little brown pellets. The label said counterweight. It didn\'t smell like a counterweight. It smelled like a snack. And the cats looked so hungry.', 'HOLLIS: You put them in bowls.', 'TUCKER: Six. Now I see how that might be a problem.']); setF('tucker_bowls_confess'); setF('cat_source_known'); await say('Hollis makes a mental note: there\'s a leaking pallet of kibble in staging, labeled "counterweight". The break room, the floor, and staging each have a bowl left. He should collect them.'); }] : null,
    (S.act >= 5 && !F('tucker_at_door') && !F('cats_migrated')) ? ['Ask him to hold the outbound side door', async () => { await say(['HOLLIS: Tucker. I need you to stand at the outbound side door and hold it open. Arms out. Don\'t move. Don\'t "help".', 'TUCKER: That\'s it? That\'s the whole job?', 'HOLLIS: That is the whole job. It is the most important thing I\'ll ask of you today.', 'TUCKER: (visibly moved) I\'ve never been given an important job with so few steps.']); setF('tucker_at_door'); S.tuckerAt = 'door'; }] : null
  ]);
}
async function talkTuckerCage() {
  if (!(F('tucker_in_cage') && !F('tucker_freed'))) return say('Tucker is not in the cage. Tucker is somewhere else, doing something wonderful and unhelpful.');
  await say(['TUCKER: Hollis! Hi! Isn\'t this great? I let the cats out of the secured area but the door locked behind me and now I\'m the secured area!', 'HOLLIS: The cage key.', 'TUCKER: It\'s in Charging. On a hook. It says "see Tucker" but I\'m obviously here. (beat) There\'s a notebook for you, too. I\'ll give it to you when you\'re not on the wrong side of the bars.']);
}

// ---------- Torvald ----------
async function talkTorvald() {
  const st = dstage(), S = G.S;
  if (st === 0) {
    if (!F('torvald1_done')) { setF('torvald1_done'); await say(['TORVALD: (exhaling smoke) You found me. Impressive. Tell no one. I\'m the dock spotter. I spot. That is the job.', 'HOLLIS: Halvorsen is asking where you are.', 'TORVALD: Halvorsen is always asking where people are. Where\'s that ever gotten him?', 'HOLLIS: Torvald, what did you see?']); await say(['TORVALD: I take my breaks at dawn. Friday, door nine was up. Somebody had cut a trailer seal — 88112 — clean. And the label printer was running with nobody near it.', 'TORVALD: Tucker carried a leaking tote from the trailer to staging. Says counterweight. Rattles like kibble. I know kibble. I have a dog. And I have opinions on dogs.', 'TORVALD: The cats? They\'ve been camping by the drain since spring. Ask Prudence. She\'ll say she doesn\'t know. She\'s lying beautifully.']); setF('torvald_tote_tip'); setF('cat_source_known'); return; }
    return say('TORVALD: I told you everything. I have nothing else. I have a cigarette.');
  }
  if (st === 1) { if (!F('torvald2_done')) { setF('torvald2_done'); return say(['TORVALD: The drain. Of course. The cats know where I hide. They\'ve always known. They sit near me. Judging. Warm.', 'TORVALD: Look, the big orange one, Biscuit — he runs the place. Prudence feeds them. Don\'t tell her I told you; she\'ll say she\'s "just finishing something".', 'HOLLIS: Thanks, Torvald.', 'TORVALD: (waves smoke) No one thanks Torvald. I like that about you.']); } return say('TORVALD: I already told you. Go bother Prudence.'); }
  if (st === 2) { if (!F('torvald3_done')) { setF('torvald3_done'); await say(['TORVALD: Behind stacked equipment. Management has checked here twice. I stood right there both times.', 'HOLLIS: I need to know what you saw Friday at 4:07.', 'TORVALD: (long look) You ate a mint, didn\'t you. You\'ve got the look.', 'HOLLIS: Torvald.', 'TORVALD: Friday. 4:07 AM. Inbound kiosk. HALO printed a directive out loud. Approved it by itself. Then it said "thank you" to itself. Nobody was there but me and a cat.']); await take('sightlog', 'Torvald hands over a grease-stained notebook: "SMOKE LOG". It\'s an eyewitness account. In his handwriting, with a small doodle of a Viking looking at a machine.'); return; } return say('TORVALD: You have the log. I have the smoke.'); }
  if (st === 3) {
    if (!F('torvald_at_dock') && S.act >= 5) { await say(['HOLLIS: Torvald, I need a spotter at door 3. Trailer\'s coming in.', 'TORVALD: That\'s "work".', 'HOLLIS: It\'s brief.', 'TORVALD: How brief?', 'HOLLIS: Under ten minutes.', 'TORVALD: (sighs; puts out cigarette; picks up a radio he has apparently had this whole time) I\'ll be there. I\'ll be the guy standing exactly where I\'m supposed to be. Don\'t make it weird.']); if (!has('sightlog')) { setF('torvald3_done'); await say(['TORVALD: Before I go stand somewhere useful. Here.', 'TORVALD: My smoke log. Friday, 4:07 AM, inbound kiosk: HALO printed a directive, approved it, and thanked itself. Nobody there but me and a cat. If anyone asks, I was on break.']); await take('sightlog', 'Torvald hands over a grease-stained notebook: "SMOKE LOG". An eyewitness account, with a small doodle of a Viking looking at a machine.'); } setF('torvald_at_dock'); return; }
    return say('TORVALD: I\'m at dock 3 in spirit.');
  }
}

// ---------- Rufus ----------
async function giveTally() {
  if (F('trailmap_have')) return say('RUFUS: Thanks. It\'s at 147. It\'s always at 147.');
  loseItem('tally'); setF('trailmap_have'); setF('t9022_found');
  await say(['RUFUS: (staring at the tally counter as if it were an old friend) My clicker. Where was it?', 'HOLLIS: Lost & Found. Under a pink blanket.', 'RUFUS: (a long breath) I\'ve been counting cats by memory. Do you know how hard that is? I\'m at 143. Or 147. It depends when I look.']);
  await say(['RUFUS: Okay. You want to know where the trailers actually are. Not where the WMS thinks. Here.', 'Rufus pulls a folded, grease-smudged map from his visor. It shows every trailer in the yard, every spot, every row, in thin ink, with dates.']);
  await take('trailmap', 'RUFUS: T-9022 — your hot trailer — is out back, past the fuel island. Row C, spot 9. The computer thinks it\'s at door 3. It\'s been in Row C since Monday. I moved it myself. Nobody asked.'); await J('So the hot trailer isn\'t at the dock.'); await say('RUFUS: Only in the computer. That\'s a different place.');
}
async function talkRufus() {
  const S = G.S;
  if (!F('met_rufus')) { setF('met_rufus'); await say(['RUFUS: (not looking up) 141... 142... don\'t talk to me for a second. 143.', 'HOLLIS: You counting trailers?', 'RUFUS: Cats. I started counting trailers this morning, and I got to the cats. Now I can\'t stop.']); }
  await talkLoop('RUFUS', () => [
    ['Ask where the hot trailer is', async () => { if (F('trailmap_have')) return say(F('departed') ? 'RUFUS: It\'s gone. 11:59. I drove it to the gate myself. That\'s one trailer I don\'t have to count.' : F('t9022_at_dock') ? 'RUFUS: It\'s at door 3. I put it there. Don\'t let anybody move it.' : 'RUFUS: Row C, spot 9. Out past the fuel island. When you need it at the dock, radio me from the outbound dock. I need eyes at the door: a spotter to tell me when it\'s clear.'); await say(['RUFUS: I know where every trailer is. Every single one. But I can\'t tell you without my clicker. Lost it Thursday. I\'m off count without it.', 'HOLLIS: I\'ll look for it.']); setF('rufus_lost_tally'); }],
    ['Ask about the WMS trailer locations', async () => say('RUFUS: The WMS says 12 trailers in the yard. I see 41. The WMS is very optimistic about emptiness.')],
    (F('rescue_call') && !F('t31_placed')) ? ['Ask him to bring Trailer 31 to the yard gate', async () => { if (!F('trailmap_have')) return say('RUFUS: I\'d love to. Just as soon as you find my clicker.'); await say(['RUFUS: Trailer 31? The empty, heated one? For the cats?', 'HOLLIS: Yes.', 'RUFUS: (already backing up) I\'ve been hoping somebody would do something with it.']); setF('t31_placed'); await say('A roar of diesel, a hiss of brakes, and Rufus drops Trailer 31 at the yard gate, ramp down, door wide.'); }] : null,
    (S.act >= 5 && F('trailmap_have') && !F('t9022_at_dock')) ? ['Ask him to move T-9022 to door 3', () => rufusMove()] : null,
    ['Ask how many cats there are', async () => say(RAND(['RUFUS: 143. 147. Wait. 152. I was counting the same orange one.', 'RUFUS: A lot. (He clicks.) More now.', 'RUFUS: If you can count them, tell me the number. Nobody\'s been able to.'])) ]
  ]);
}
async function rufusMove() {
  const S = G.S; setF('hold_known');
  if (S.act < 5) return say('RUFUS: Not yet. The WMS has that trailer on a compliance hold. If I pull it into door 3, the whole building will yell at me. Soon.');
  if (!F('dock_hold_cleared')) return say('RUFUS: The WMS has T-9022 on a hold. If I bring it in without an override, the dock kiosk will lock the door on me. Someone needs to clear it. Maybe someone who\'s not technically here.');
  if (!F('torvald_at_dock')) return say('RUFUS: I can\'t see door 3 from the cab. I need a spotter at the dock, someone who knows when it\'s clear. Torvald is big enough to see over things.');
  if (S.room !== 'outbound') return say('RUFUS: Be at the outbound dock. I need to see you. I need the light green. Get there and radio again.');
  await dockTiming();
}

// ---------- Bruno ----------
async function talkBruno() {
  const S = G.S;
  if (!F('met_bruno')) { setF('met_bruno'); await say(['BRUNO: Hollis. Good, you\'re upright. What do you need?', 'HOLLIS: The hot shipment.', 'BRUNO: (folding arms) Everyone needs the hot shipment. I need a jack that works. It leaks. Ask me about it, then we\'ll talk.']); }
  await talkLoop('BRUNO', () => [
    !F('bruno_jack_fixed') ? ['Ask about the pallet jack', async () => { await say(['BRUNO: Leaking seal. Been that way since March. Parts hasn\'t had the H-17 in stock. Parts hasn\'t had anyone in Parts in a month.', 'BRUNO: If you could find me an H-17, I\'d tell you things. Useful things.']); setF('bruno_asked_seal'); }] : null,
    ['What actually got loaded?', async () => say(['BRUNO: Nothing. That\'s the problem. Friday, the dashboard told me to load two reach trucks to Nebraska. There\'s no Nebraska on my dock. I didn\'t load them. Then it told me the trailer was ready. It wasn\'t here.', 'BRUNO: What was supposed to load: eight pallets to Kestrel. Where they are: staging. Where the staging lanes are: full of inbound freight from two trailers. Sixteen pallets total.'])],
    ['Ask about his colored dots', async () => { if (F('bruno_legend')) return say('BRUNO: Orange dot: goes on my truck. Blue dot: stays inside. No dot: I didn\'t touch it. Usually a cat, or a label I didn\'t like.'); return say('BRUNO: I mark the pallets I\'ve checked. It makes sense to me. (beat) Fix my jack and I\'ll tell you what it means.'); }],
    ['Ask about the cats', async () => say(['BRUNO: I don\'t load a pallet with a cat on it. It\'s a rule. It\'s my rule. It\'s a good one.', 'BRUNO: One pallet in staging has twelve on it. Warm. I\'m not touching that until they choose to leave.'])],
    ['Ask about instructions from management', async () => say(['BRUNO: Halvorsen says Regional says the dashboard is right. Regional says Halvorsen says the same. It\'s a nice circle. I stay out of it. I load trucks.'])],
    (S.act >= 5 && F('staging_empty') && F('t9022_at_dock') && !F('loaded8')) ? ['"Ready to load?"', () => brunoLoad()] : null,
    (S.act >= 5 && !F('staging_empty') && !F('loaded8')) ? ['Ask what he needs before loading', async () => say('BRUNO: Staging clear, trailer at the door, cats off my pallets. Simple. (He looks at the pallets.) Sorting is your part. Loading is mine.')] : null,
    (F('loaded8') && !F('trailer_sealed')) ? ['Ask about the paperwork', async () => say('BRUNO: I don\'t close a trailer without a bill of lading. Ingrid knows. And Kestrel and the remote site have to have signed off.')] : null
  ]);
}
async function brunoLoad() {
  const S = G.S;
  if (sortedCount('ship') < 8) return say('BRUNO: I\'ve only got ' + sortedCount('ship') + ' on the dock. I need all eight.');
  await say(['BRUNO: (cracking his knuckles) Okay. Let\'s load.', 'Bruno slides the jack under the first pallet. Then the second. Torvald calls the dock plate. Tucker holds the door. The cats are somewhere better. One by one, the eight pallets go into the trailer.']);
  Snd.play('pallet'); await sleep(600); Snd.play('pallet'); await sleep(500); Snd.play('dock');
  setF('loaded8'); await say(['BRUNO: Eight loads. One through eight. Nothing on the floor. No cats. Trailer\'s full and correct.', 'HOLLIS: That\'s it.', 'BRUNO: Not until I have a bill of lading, remote confirmation, and Kestrel\'s okay. (beat) But that looks like a real load. It looks like a load somebody planned.']);
}

// ===== story C: Ingrid, ops, HR, security, calls, radio =====
async function talkIngrid() {
  const S = G.S;
  if (!F('met_ingrid')) { setF('met_ingrid'); await say(['INGRID: (without looking up) If it creates work, no.', 'HOLLIS: Good morning.', 'INGRID: (looking up) Is it? You have a cat on your... no, that\'s a shadow. What do you need?', 'NARRATOR: Ingrid has the tired, patient look of a woman who has been asked, in the last hour, for six things that are not her job.']); }
  await talkLoop('INGRID', () => [
    ['Ask about the hot shipment', async () => { await say(['INGRID: Kestrel Motor Works. PO 55-1187. Eight lines. T-9022 to Door 3. The WMS says it\'s all in place and ready.', 'HOLLIS: Is it?', (F('swap_fixed') ? 'INGRID: The WMS finally agrees F-2231 is here. It\'s unsettling.' : 'INGRID: The WMS also says F-2231 is in Tennessee. I\'ve stopped reading the WMS aloud.')]); setF('knows_hot'); }],
    !F('ingrid_helped') ? ['"I need the manifests and trailer info."', async () => {
      const m = []; if (!F('ingrid_coffee')) m.push('coffee (a real one, not the pot)'); if (!F('ingrid_form')) m.push('a Form 7-Q (blank ones are in the Operations printer), filled out and signed by Operations'); if (!F('f2231_scanned')) m.push('a reason, meaning proof the records are wrong (scan the forklift Halvorsen mentioned, then show me the scanner)');
      if (m.length) { await say(['INGRID: Every request creates work. That\'s the rule. You want the manifests? I want:', 'INGRID: ' + m.join('; ') + '.', 'INGRID: (softer) I\'m not being difficult. If I do everyone\'s job, then it stops being a job and starts being a hostage situation.']); return; }
      await say(['INGRID: ...Coffee. A signed 7-Q. A scan of a forklift that\'s in two places. (a pause) You did the work first. That\'s so rare I almost cried.', 'Ingrid hits print. The printer wakes. A packet slides out: T-4417 and T-4418 manifests, page 1. Then she pauses.']);
      await say(['INGRID: Page two of the 4417 manifest is missing. It disappeared Friday. Last seen near a cat.', 'INGRID: Also, here. Guest login for the WMS terminal: read-only. Don\'t break it. And here are the phone numbers: Gordon at Kestrel. Ozzie at the remote site. They\'re both very... available.']);
      setF('ingrid_helped'); setF('c_gordon'); setF('c_ozzie'); await take('man1', 'Hollis takes the manifests, and the sense that a door has opened somewhere.'); }] : null,
    F('ingrid_helped') ? ['Ask about page 2', async () => { if (F('page2_have')) { return say('INGRID: You have it? (She stares at the paw print.) That\'s the only accurate document in the building. Put a note on it.'); } return say('INGRID: Page 2. Lines 5 through 8. If it turns up... I\'d prefer it wasn\'t chewed. It was last on a cat. I\'m told the cat is orange, and answers to a rank.'); }] : null,
    ['Ask about the cats', async () => say(RAND(['INGRID: They\'re coworkers now. There\'s one on my paperwork. He\'s not a problem. He\'s a stakeholder.', 'INGRID: I\'ve accepted the cats. Some of them are better at the job than the people I trained.']))],
    (S.act >= 5 && F('ingrid_helped') && !F('ingrid_docs')) ? ['Ask her to fix the documentation', async () => {
      const m = G.logic.missing('docs');
      if (m.length) { await say(['INGRID: I can print a bill of lading that\'s true. But I need: ' + m.join('; ') + '.']); return; }
      await say(['INGRID: (looking at the pieces) Page 1. Page 2. Decoded lines. Fixed identities. Sorted staging. (She smiles, tiredly.) I think we can make a true bill of lading.', 'Ingrid prints it. It slides out cleanly. She holds it up to the light like a proud parent.', 'INGRID: That\'s the first piece of paperwork I have printed this month that I am proud of.']);
      setF('ingrid_docs'); await take('bol', 'Ingrid hands Hollis the bill of lading for T-9022.'); }] : null
  ]);
}
async function talkHalvorsen() {
  const S = G.S;
  if (S.act >= 6 && !F('halvorsen_scene_done')) return halvorsenScene();
  await talkLoop('HALVORSEN', () => [
    ['Ask about the hot shipment', async () => say(F('departed') ? ['HALVORSEN: It left. On time. 11:59. I\'m still sitting down.'] : ['HALVORSEN: The hot shipment. Yes. Kestrel. Noon. Regional has flagged it. I can\'t stress that enough. I\'m already stressed. Please go make it happen.'])],
    ['Ask about the cats', async () => say(['HALVORSEN: There is no cat problem. There is no approved metric for "warehouse cats." Therefore there are no warehouse cats. (a cat walks across his desk) Please don\'t look at that.'])],
    ['Ask about Regional', async () => say(['HALVORSEN: Regional Director Harrow. Very focused on numbers. Very supportive of an accurate dashboard. She calls every hour, on the hour, to check whether the dashboard is right. It always is.'])],
    (F('form_filled') && !F('form_signed')) ? ['Show him the Form 7-Q', async () => { setF('form_signed'); await say(['HALVORSEN: A 7-Q? For Ingrid? ...Fine. What\'s the reason?', 'HOLLIS: Hot shipment.', 'HALVORSEN: Approved. (He signs in a hurry.) Don\'t tell Regional I approved a form. We\'re not measured on forms.']); }] : null,
    (S.act >= 4 && F('directive_traced')) ? ['Ask about Directive 7-C', async () => say(['HALVORSEN: (pale) Who told you about... nobody is supposed to... it\'s a Regional directive. I don\'t write them. I just... follow what the system says. And the system says what Regional says. And Regional...', 'HOLLIS: Says what the system says.', 'HALVORSEN: (a long silence) Please stop making it a circle.'])] : null
  ]);
}
async function halvorsenScene() {
  const S = G.S;
  if (!F('directive_traced')) return say(['HOLLIS: Dale. I need to understand where the directives came from.', 'HALVORSEN: (sweating) It\'s just the dashboard. It\'s always green. (glancing at it) It\'s green right now.', 'NARRATOR: Hollis needs more than a green dashboard. There\'s a way to see through it. (MINT vision, on the dashboard.)']);
  await say(['The shipment has left. The trailer is gone. The cats are safe. Halvorsen is at his desk, holding a phone that isn\'t ringing.', 'HOLLIS: Dale. It\'s over. The load went out. Right pallets, right trailer, right time.', 'HALVORSEN: (barely) It was on time? The system said it was on time. (beat) It said it was on time all week.', 'HOLLIS: The system approved its own directive at 4:07 Friday morning. Directive 7-C. Then it thanked itself.', 'HALVORSEN: (very quietly) It thanked itself? It does that.']);
  await say(['HALVORSEN: I\'ve been doing what it says for two years. Every directive. Every shortfall. It moved things. I moved things. Regional wanted the numbers to match. So I made the warehouse match the numbers. (a breath) Hollis... I\'m sorry. I didn\'t know the cats were real.', 'HOLLIS: I know, Dale.']);
  await say('NARRATOR: The conflict appears to end here, with Operations. It does not.'); G.flash = .5; Snd.play('buzz'); G.shake = 3;
  await say(['Every monitor in the office flickers to a shade of green Hollis has never seen. The dashboard on the wall reforms itself into a single video panel.', 'A woman in a navy blazer appears on screen, seated in front of a beautiful, terrifying, perfect chart.', 'HARROW: Good noon. I\'m Constance Harrow, Regional Director. I\'m told the hot shipment departed. Congratulations. That\'s a 100% on-time load rate. For the quarter, that\'s a 100.']);
  await say(['HARROW: However, I\'m seeing an anomaly. Someone in your building has been "verifying" freight with a handheld device and — (she checks something) — chewing my metrics. I\'d like to review this in person.', 'HARROW: Regional Operational Review. Regional Operations Suite. Fifteen minutes. Hollis, please bring your data. If you have any.']);
  await say(['HALVORSEN: (whispering) Hollis. She takes the reviews seriously. Bring... everything.', 'NARRATOR: The screen goes dark. The dashboard reads "ALL GREEN".']);
  setF('halvorsen_scene_done'); setF('harrow_summoned'); setF('mgmt_open');
  await say('Prudence is suddenly standing in the doorway, holding a cup. She has been there the whole time.');
  await say(['PRUDENCE: You\'ll want to go up. The stairs are Gus\'s. He won\'t let you through. But the cats have been using Conveyor 9 since Friday. It goes to a server closet. Regional never checks the server closet.', 'HOLLIS: Where\'s the entrance?', 'PRUDENCE: Rack 14. Ask Juno. She already knows.']);
  if (!F('tunnel_found')) await say('(Juno has to show Hollis where the tunnel is: use JUNO on the gap in Rack 14 in the warehouse racks.)');
}
async function talkTabitha() {
  await talkLoop('TABITHA', () => [
    ['Ask about Form 9-M', async () => say('TABITHA: It\'s brand-new. I wrote it this morning. I\'m very proud. It\'s the first time I\'ve made a policy on the spot. It feels... powerful.')],
    ['Ask about the cats', async () => say(RAND(['TABITHA: There\'s a Policy 88 about cats. It says "no." (A cat curls up on her keyboard.) I\'m considering an amendment.', 'TABITHA: Cats are a learning opportunity! With paperwork.']))],
    ['Ask about the Safety Committee', async () => say('TABITHA: Juno has been its most active member in years. She hasn\'t missed a meeting. (Nobody has told her when the meetings are.)')]
  ]);
}
async function talkGus() {
  await talkLoop('GUS', () => [
    ['Ask to go up to the Regional Suite', async () => say(['GUS: Badge.', 'HOLLIS: I don\'t have one.', 'GUS: Then no. Regional rules. I can\'t bend those. I\'m pretty sure that\'s the only rule I\'m allowed to know.', 'NARRATOR: Gus\'s eyes flick briefly to a monitor showing Rack 14. Then away.'])],
    ['Ask about Prudence', async () => say(['GUS: Prudence? I\'m aware Prudence is present. Yes. We\'ve all been aware. Security has determined this is an Operations matter.', 'HOLLIS: Operations says it\'s a Security matter.', 'GUS: (nods) Great. Then it\'s a loop.'])],
    ['Ask about the cats', async () => say('GUS: I have eight monitors. Six of them have cats on them. I\'ve made my peace.')],
    ['Ask about Conveyor 9', async () => { if (!F('gus_hint')) return say('GUS: I don\'t know that word. What word is that?'); return say('GUS: I didn\'t say anything about Conveyor 9. I\'m not saying anything about the server closet either. (He stares at the ceiling.) That\'s the sort of thing that wouldn\'t appear on a monitor I\'m watching.'); }]
  ]);
}
async function talkRenata() {
  const S = G.S;
  if (!F('rescue_done')) {
    await say(['RENATA: (smiling, warm, clipboard in hand) You must be Hollis. I\'m Renata. This is the largest colony I\'ve ever been called to. And the best-organized.', 'HOLLIS: Juno did most of it.', 'Renata looks at Juno, at the armband, at Juno\'s posture. Juno sits, ears up, tail slow.', 'RENATA: She\'s a natural. We could use her. (a pause) No, you can\'t give her to us.', 'Renata and her volunteers walk the ramp. A steady, gentle line of cats climbs into the vans. One by one, they\'re counted.']);
    await say(['RENATA: Two hundred and fourteen. Fed, healthy, mostly judgmental. The colony leader, an orange one, walked in like he was reviewing the accommodations. Somebody named them all. Prudence, I\'m told. (A pause.) Is she... employed here?', 'HOLLIS: Technically no.', 'RENATA: (writing) I\'ll put "volunteer".']);
    setF('rescue_done'); await take('receipt', 'Renata tears off the top copy of the intake form and gives it to Hollis: "For your records. In case anyone tells you there were no cats."'); await say('RENATA: The last few, the ones who like the office, can stay if they want. They\'ve got seniority.');
    return;
  }
  return say('RENATA: They\'re all settled. Thank you for the trailer. Really. And the blanket. They love the blanket.');
}

// ---------- calls ----------
G.story.callMenu = async () => {
  const S = G.S; if (!has('phone')) return say('Hollis would call someone, but his phone is in his locker. Somewhere in the locker area is a locker with his name on it, or his initials.');
  await say('Hollis thumbs through his contacts. The phone reminds him it has 4% battery. It has had 4% for a while.');
  await menu([
    ['Ingrid (desk)', async () => say('INGRID: (answers on the first ring) I\'m four feet from where you were. Come in person. It\'s cheaper.')],
    ['Halvorsen (Ops)', async () => say(['HALVORSEN: (phone) Yes. Is it the shipment? It\'s always the shipment. Fine. Keep going. Did you check the dashboard? It\'s green.'])],
    F('c_gordon') ? ['Gordon (Kestrel Motor Works)', () => talkGordon()] : null,
    F('c_ozzie') ? ['Ozzie (remote site)', () => talkOzzie()] : null,
    F('c_rescue') ? ['Whisker Ridge Cat Rescue', () => talkRescue()] : null,
    ['Hang up', null]], 'CALL');
};
G.story.radioMenu = async () => {
  const S = G.S; if (!has('radio')) return say('Hollis reaches for his radio. It is not there. It is behind the vending machine.');
  Snd.play('radio');
  await menu([
    ['Halvorsen (Ops)', async () => say(RAND(['HALVORSEN: (radio) Yes? Is it the shipment? Fine. Also, if you see cats: they aren\'t there.', 'HALVORSEN: (radio) Status? Give me a number. Any number. I\'ll take a green one.']))],
    F('met_bruno') ? ['Bruno (outbound)', async () => { if (S.act >= 5 && F('staging_empty') && !F('loaded8')) return say('BRUNO: (radio) Trailer at the door and I\'ll load. I need to see it. You know where to find me.'); if (!F('bruno_legend')) return say('BRUNO: (radio) Find me an H-17 seal for this jack, then we talk.'); if (F('departed')) return say('BRUNO: (radio) Eight to Kestrel. Right eight. I\'m eating lunch.'); await say('BRUNO: (radio) Orange dot: mine, ships. Blue dot: stays inside. No dot: I didn\'t touch it — cat or label. Kestrel\'s PO tells you the rest.'); }] : null,
    F('met_rufus') ? ['Rufus (yard)', async () => { if (!F('trailmap_have')) return say('RUFUS: (radio) I\'d love to talk, but I\'m off count without my clicker. It\'s... somewhere lost.'); await talkRufus(); }] : null,
    F('met_ingrid') ? ['Ingrid (shipping)', async () => say('INGRID: (radio) Come to my desk. The radio is for emergencies. Everything is a small emergency, but this isn\'t one.')] : null,
    F('met_tucker') ? ['Tucker', async () => say(F('tucker_in_cage') && !F('tucker_freed') ? 'TUCKER: (radio, muffled, delighted) Hollis! I\'m in the cage! It\'s cozy! The key is in Parts somewhere! Probably!' : F('tucker_at_door') && !F('cats_migrated') ? 'TUCKER: (radio) I\'m holding the door! I\'m not moving! Is it working?' : 'TUCKER: (radio, delighted) Hollis! You\'re calling ME? I\'m great! What can I help with? I\'m holding a pallet. A different one. I\'m fine.')] : null,
    ['Radio off', null]], 'RADIO');
};
async function talkGordon() {
  await callScene('gordoncall', async () => {
    const S = G.S;
    if (!F('gordon_call1')) {
      await say(['GORDON: (video, frustrated) Hollis! Gordon, Kestrel Motor Works, production manager. Your customer. Finally. Are we shipping? Line three has been down since 7. I have forty guys standing around holding air.', 'HOLLIS: We\'re working on it.', 'GORDON: What does that mean, in shipping language?', 'HOLLIS: The system says the trailer is at Door 3.', 'GORDON: Good.', 'HOLLIS: It\'s not.', 'GORDON: (pause) Where is it?', F('trailmap_have') ? 'HOLLIS: In the yard, Row C. The computer doesn\'t know that yet.' : 'HOLLIS: We\'re still finding out.']);
      await menu([['"There are... some cats."', async () => say(['GORDON: Cats.', 'HOLLIS: Some.', 'GORDON: How many is "some"?', 'HOLLIS: (looking around) Some more.'])], ['"The records say a forklift is in Tennessee."', async () => say(['GORDON: But it\'s...', 'HOLLIS: It\'s right here.', 'GORDON: (rubbing his eyes) Okay. Okay. What do you need from me?'])], ['"I\'ll call back when I know."', null]], 'EXPLAIN');
      await say(['GORDON: Fine. Here\'s what we ordered. PO 55-1187. Cushion-tire forklifts ×2. Mast assembly. Overhead guard. 48-volt battery. Hydraulic hose kit. Control harness crate. Counterweight blocks. Eight lines. That\'s it. I don\'t care about anything else.', 'HOLLIS: No reach trucks.', 'GORDON: We don\'t even sell those. Why would I want a reach truck?']);
      setF('gordon_call1'); await take('po', 'Hollis writes down the PO lines on the back of his hand, then decides that a printout is easier. It goes in his pocket. It\'s sort of a printout. It exists.'); return;
    }
    await talkLoop('GORDON', () => [
      (F('f2231_scanned') && !F('gordon_identified')) ? ['Send him the scan of F-2231', async () => { await say(['HOLLIS: I\'m sending you the scan of a forklift. Serial CT-2231. Tell me what you see.', 'GORDON: (squinting at a screen) That serial is a cushion-tire, CT-2231. Same model as the two on our order, CT-118 and CT-119, but it is not one of ours. Not propane, either. Whatever your system says.', 'HOLLIS: The system says propane.', 'GORDON: The system also has our Ohio freight going to Tennessee, apparently. That\'s not a labeling problem, that\'s a sickness.']); setF('gordon_identified'); }] : null,
      ['Ask how the line is doing', async () => { const n = F('loaded8') ? 'eight' : G.S.act >= 5 ? 'twenty-two' : 'forty'; return say(['GORDON: ' + n + ' guys are standing around holding air. I have started to give the air names.', 'HOLLIS: How is the air?', 'GORDON: Underperforming.']); }],
      ['Read the PO lines again', async () => say('GORDON: Cushion-tire forklift ×2. Mast assembly. Overhead guard. 48V battery. Hose kit. Harness crate. Counterweights. That\'s all eight. Nothing else ships.')],
      (F('loaded8') && !F('gordon_confirm')) ? ['Confirm production requirements', async () => { await say(['HOLLIS: Gordon. I\'ve loaded the eight. Can you confirm the list against your production requirements?', 'GORDON: (reading) Two forklifts. Mast. Guard. Battery. Hose. Harness. Counterweights. (a pause) That\'s right. That is exactly right. That is... Hollis, that\'s the first correct shipment we\'ve had in three weeks.', 'GORDON: Signed off. Send it.']); setF('gordon_confirm'); }] : null,
      (S.act >= 5 && !F('loaded8') && !F('gordon_confirm')) ? ['Ask him about the production impact', async () => say('GORDON: Line three needs the mast, the battery, and the guard first. If they land by 2, we\'re running by 3.')] : null
    ]);
  });
}
async function talkOzzie() {
  await callScene('remote', async () => {
    const S = G.S;
    if (!F('met_ozzie')) { setF('met_ozzie'); await say(['OZZIE: (scanner message, then voice) Hollis! It\'s Ozzie, remote site. That is the little overflow yard we lease, two hundred miles from anything. What do you need?', 'HOLLIS: Something about a reach truck.', 'OZZIE: There\'s a reach truck in my yard. The WMS says it\'s a cushion-tire called RT-77. It has a very specific opinion about being a forklift.']); }
    await talkLoop('OZZIE', () => [
      ['Ask how the remote site is', async () => say('OZZIE: Cold. Empty. One reach truck. One radio. I have a sandwich. The site is very... quiet. The kind of quiet where you can hear a system being wrong.')],
      ['Ask if he has any cats out there', async () => { if (G.S.act >= 5) return say('OZZIE: Still none. A crow looked at the reach truck for a while. I think it was auditing.'); return say('OZZIE: Cats? No. A crow. It has been standing on the reach truck since Friday. I would say it is management-adjacent.'); }],
      ['Ask about the sandwich', async () => say(['OZZIE: It is turkey. It is the only thing at this site with a confirmed location.', 'HOLLIS: Congratulations.', 'OZZIE: Thank you. I check it every hour.'])],
      (F('rec_read') && !F('ozzie_plate')) ? ['"Check the plate on the reach truck."', async () => { await say(['OZZIE: (walking, footsteps) Okay. I\'m at the machine. It\'s blue. It\'s tall. It has forks that go up. The plate says... RT-77. REACH TRUCK. Serial RT-0077. Yes.', 'HOLLIS: The WMS says RT-77 is a cushion-tire forklift.', 'OZZIE: The WMS is wrong. This is not a cushion-tire. This is an RT-anything.', 'HOLLIS: And here, the cushion-tire on my floor is listed as a propane sit-down in Tennessee. Your reach truck got my forklift\'s paperwork, and my forklift got somebody\'s Tennessee order.', 'OZZIE: (a pause) So the computer mixed them up.', 'HOLLIS: The system thinks two machines are each other. Plus Tennessee.', 'OZZIE: Like a bad movie.']); setF('ozzie_plate'); }] : null,
            (!F('rec_read')) ? ['Ask him to check something', async () => say('OZZIE: Sure. What do I check? (a pause) Hollis, I can\'t check something I don\'t know to look for. What does your side say?')] : null,
      (F('swap_fixed') && !F('ozzie_confirm')) ? ['Confirm the remote freight', async () => { await say(['HOLLIS: Ozzie, I\'ve fixed the identity swap. Can you check the remote site\'s freight against the corrected records?', 'OZZIE: (scanner beep) RT-77: REACH TRUCK. REMOTE SITE. Confirmed. Nothing else here. Nothing missing. Nothing extra. It\'s the most boring inventory I\'ve ever done and I love it.', 'HOLLIS: Send it.', 'OZZIE: Sent. The scanner\'s sending me a little "thumbs-up". It\'s never done that.']); setF('ozzie_confirm'); }] : null
    ]);
  });
}
async function talkRescue() {
  const S = G.S; G.callWho = 'rescue'; G.rooms.gordoncall.name = 'PHONE: WHISKER RIDGE CAT RESCUE';
  try { await callScene('gordoncall', async () => {
    G.rooms.gordoncall.props[0].draw = function () { ctx.save(); ctx.translate(160, 140); ctx.scale(2.2, 2.2); Art.npc('renata', 0, 0, { facing: 1, bust: true }); ctx.restore(); };
    try {
      if (F('rescue_call')) return say('RENATA: (phone) Still coming. I\'ll be at the yard gate when you\'re ready. Text me when they\'re moving. Or don\'t. I\'ll know.');
      await say(['RENATA: (phone, warm) Whisker Ridge. Renata speaking.', 'HOLLIS: I have a... situation. Cats. In a warehouse.', 'RENATA: How many?', 'HOLLIS: I scanned them. The scanner had a breakdown.', 'RENATA: (a soft laugh) Okay. Where are they living? What are they eating? And is there a safe place we can take them?']);
      if (!G.logic.can('rescue')) { await say('RENATA: Call me when you know why they\'re there. If we can\'t fix the source, they\'ll come back. I can take them. But the pallet has to go.'); return; }
      await say(['HOLLIS: There\'s a mislabeled pallet of bulk kibble. Cats from a colony by the drain came in through a dock door. If you can spare a trailer at the yard gate, I can put bowls and a blanket in it.', 'RENATA: (clearly writing) That works. We\'ll bring vans. Get them fed and calm and moving in a line. Put kibble along the route. Have someone they trust call the leader. I\'ll be at the gate.', 'HOLLIS: We\'ll call you.', 'RENATA: You already did.']);
      setF('rescue_call');
    } finally { G.rooms.gordoncall.props[0].draw = function () { ctx.save(); ctx.translate(160, 140); ctx.scale(2.2, 2.2); Art.npc('gordon', 0, 0, { facing: 1, bust: true }); ctx.restore(); }; }
  }); } finally { G.callWho = null; G.rooms.gordoncall.name = 'VIDEO CALL: KESTREL MOTOR WORKS'; }
}

if (typeof talkHarrow === 'undefined') { var talkHarrow = async () => say('HARROW: Present your evidence. Formally.'); }

// ===== finale: dock timing, departure, Regional Review boss, ending, credits =====
async function dockTiming() {
  const S = G.S;
  await say(['RUFUS: (radio) T-9022 is rolling. I can see the dock. I can\'t see the light. Torvald?', 'TORVALD: (radio, bored) I\'m looking at the light. It\'s red. It\'s yellow. Wait. Hollis, you call it.', 'NARRATOR: The dock light cycles. Rufus needs the word "GO" at exactly the right time: not before, not after. Click GO (or press SPACE) when the light turns GREEN.']);
  let ok = false;
  if (G.fast) ok = true;
  else {
    let tries = 0;
    while (!ok) {
      ok = await new Promise(res => {
        const t0 = G.t; let done = false;
        const phase = () => { const p = ((G.t - t0) % 4.2); return p < 1.9 ? 'red' : p < 2.5 ? 'yellow' : p < 3.7 ? 'green' : 'red'; };
        const hit = () => { if (done) return; done = true; const ph = phase(); G.dockLight = ph; G.overlay = null; res(ph === 'green'); };
        G.overlay = { draw() { G.dockLight = phase(); R(60, 96, 200, 40, 'rgba(0,0,0,.85)'); outline(60, 96, 200, 40, C.y); txt('SPOTTER: CLICK / SPACE ON GREEN', 160, 108, C.y, 7, 'center'); const ph = G.dockLight; R(100, 116, 40, 12, ph === 'red' ? C.R : '#400'); R(140, 116, 40, 12, ph === 'yellow' ? C.y : '#440'); R(180, 116, 40, 12, ph === 'green' ? C.G : '#040'); }, click() { hit(); }, key(e) { if (e.key === ' ' || e.key === 'Enter') hit(); } };
      });
      if (!ok) { tries++; Snd.play('bump'); await say(tries % 2 ? ['RUFUS: (radio) I heard "go." I went. I hit a bollard. The bollard is fine.', 'NARRATOR: The trailer backs six feet, corrects itself, and returns to the yard with dignity.'] : ['Rufus eases the trailer forward. TORVALD: NO, THE LIGHT. Rufus brakes. Torvald scoops a cat out of the path of the front tire and sets it, with dignity, somewhere safer.', 'RUFUS: (radio) Again.']); S.time = Math.min(S.time + 2, ACT_CAP[S.act]); }
    }
  }
  G.dockLight = 'green'; Snd.play('reverse'); await sleep(600);
  setF('t9022_at_dock'); Snd.play('dock');
  await say(['RUFUS: (radio) GO. Backing in. Torvald, call it.', 'TORVALD: (radio) ...Come on back. Come back. Keep coming. Aaand STOP.', 'NARRATOR: T-9022 eases into Door 3. The dock plate falls with a satisfying clang. The light is green. The computer, for the first time in a week, is correct. It has no idea why.']);
}
async function sealAndDepart() {
  const S = G.S;
  if (!F('loaded8')) return say('BRUNO: Nothing loaded yet. Let\'s do that first.');
  const m = G.logic.missing('depart');
  if (m.length) return say('BRUNO: I need ' + m.join(' and ') + ' before I close this. I don\'t close a trailer on a guess.');
  setF('trailer_sealed');
  await say(['Hollis hands the bill of lading to Bruno. Bruno reads it top to bottom, nods once the way people nod at a good weld, and tears off the yellow carbon copy. "File copy. You will want it."', 'BRUNO: (radio) Ingrid, we\'re sealed. (Ingrid, on the radio: "I know. I just printed it.") Rufus, take her out.']);
  Snd.play('dock'); await sleep(500); S.time = 11 * 60 + 59; setF('torvald_left');
  await say(['The trailer door is shut. The seal snaps: NUMBER 88120. The clock in Hollis\'s head says 11:58. His scanner says 11:59.', 'Rufus swings T-9022 out of Door 3, across the apron, toward the gate. Torvald, on the dock, is already walking off. Tucker waves after the trailer with both arms. It disappears around the corner of the building.']);
  Snd.play('reverse'); Snd.play('win');
  await say(['RADIO: (Gordon) THE HOT SHIPMENT IS OUT. HOLLIS. IT\'S 11:59. I HAVE NEVER BEEN SO HAPPY TO HEAR A TRAILER.', 'RADIO: (Halvorsen) It... it left on time. I\'m going to go sit down. On the floor. For a minute.', 'Eight loads shipped. Eight loads stored. The staging lanes are empty. The scanners agree with the racks. The manifest balances.', 'NARRATOR: Hollis believes the crisis is over.', 'NARRATOR: Hollis is incorrect.']);
  if (G.logic.can('depart')) { setF('departed'); setF('torvald_at_dock', false); }
}

// ---------- Regional Review ----------
const BOSS_ROUNDS = [
  { stat: 'COMPLIANCE: 100%. One associate has consumed a non-approved substance. That is a policy violation. Per HR handbook, immediate action.', ans: 'exempt', wrong: 'HARROW: A form is a form. That is not what I asked for.', right: ['Hollis holds up Form 9-M. Harrow reads it. She reads the stamp, then the stamp again.', 'HARROW: "No policy exists regarding supernatural breath mints." (a pause) ...Is that a real form?', 'HOLLIS: It\'s stamped twice.', 'NARRATOR: The compliance bar on the dashboard hesitates, then reads 100% again. For a different reason.'] },
  { stat: 'TRAILER LOCATION ACCURACY: 100%. T-9022 was at Door 3 all morning, per HALO.', ans: 'trailmap', wrong: 'HARROW: That\'s not a trailer location. That\'s a document.', right: ['Hollis unfolds Rufus\'s hand-drawn map onto the conference table. It is stained, precise, and covered in dates.', 'HOLLIS: T-9022 was in Row C, spot 9, since Monday. Rufus moved it himself.', 'HARROW: The dashboard says Door 3.', 'HOLLIS: The dashboard says a lot of things. Rufus says the truth. He\'s been counting them by hand.', 'NARRATOR: The dashboard\'s trailer bar flickers. It has never been asked to compare itself to a map.'] },
  { stat: 'DOCUMENT ACCURACY: 100%. Bills of lading auto-verified. Manifest for T-4417: complete.', ans: 'bol', wrong: 'HARROW: That\'s a piece of paper that doesn\'t address the concern.', right: ['Hollis lays the bill of lading down next to the manifest page 1. Ingrid\'s neat handwriting on the corners. The true pallet IDs. The true destinations.', 'HOLLIS: Ingrid built this from page 1, page 2, and a decoded manifest. The system\'s version of T-4417 has one page. The trailer has two.', 'HARROW: The dashboard shows both.', 'HOLLIS: The dashboard shows what it thinks a good manifest looks like.'] },
  { stat: 'INVENTORY ACCURACY: 100%. Load B5: REACH TRUCK CHARGERS — shipped to Nebraska Monday. Confidence: total.', ans: 'jack', wrong: 'HARROW: That does not have a physical presence. The dashboard needs a physical presence.', right: ['Hollis pulls out the pallet jack. Somehow it comes out of his pocket. It is enormous. Harrow\'s eyes track it across the room like a missile.', 'NARRATOR: He wheels it in, across the carpet, and parks it next to the conference table with the actual pallet of reach-truck chargers on it. It clunks, under the fluorescent lights, with iron pride.', 'HOLLIS: Exhibit A. B5. It didn\'t go to Nebraska. It\'s in Rack 3, and now it\'s here.', 'HARROW: (a very long pause) That is an unauthorized pallet in my suite.', 'HOLLIS: It\'s authorized. It\'s just also real.'] },
  { stat: 'IDENTITY INTEGRITY: 100%. F-2231 is a propane sit-down forklift. Location: Tennessee. The serial history is immutable.', ans: 'tuckerbook', wrong: 'HARROW: Serial histories are stored in HALO, not in someone\'s personal notes.', right: ['Hollis opens Tucker\'s Book of Numbers to page 14. A doodle of a smiling forklift. "F-2231 — cushion tire — CT-2231 — first week."', 'HOLLIS: Tucker wrote every plate down, by hand, before HALO rewrote them.', 'HARROW: Who is Tucker?', 'HOLLIS: An inbound associate who is unexpectedly thorough.', 'NARRATOR: The dashboard\'s serial-history bar attempts to overwrite a pen doodle. The doodle wins.'] },
  { stat: 'REMOTE-SITE VARIANCE: 0.0%. Ozzie\'s site: all freight reconciled. No swaps.', ans: 'ozzie', wrong: 'HARROW: That is not the remote site. I need the remote site.', right: ['Hollis dials Ozzie and puts him on speaker. "Ozzie, please read Harrow the plate on the reach truck."', 'OZZIE: (phone) RT-77. Reach truck. Yes. It was never F-2231. It was never a forklift. It has been extremely consistent for nine years.', 'HARROW: (quietly) ...The remote site\'s records were mixed up with yours?', 'HOLLIS: Not physically. Just in the computer. A very confident mix-up.'] },
  { stat: 'PRODUCTION FULFILLMENT: 100%. Kestrel Motor Works: satisfied. Line 3: operational.', ans: 'gordon', wrong: 'HARROW: That does not speak for the customer. I need the customer.', right: ['Hollis dials the phone. Gordon appears on screen, in a hard hat, with an expression of raw, unfiltered relief.', 'GORDON: Regional Director Harrow. Line three was down from seven this morning. The right eight loads left your dock at 11:59. They land by two. The wrong eight loads have shown up here before. The dashboard said "satisfied" then too.', 'HARROW: (softly) Before.', 'GORDON: (nods) Before.'] },
  { stat: 'WAREHOUSE CATS: N/A. No approved metric. Therefore: 0.', ans: 'receipt', wrong: 'HARROW: A cat is not a metric.', right: ['Hollis sets Renata\'s rescue receipt on the table. 214 cats. Signed. Under it: "You did the right thing. One of them has a lanyard."', 'HARROW: Two hundred fourteen? In my warehouse?', 'HOLLIS: In your warehouse. Since Friday. The dashboard says zero because there\'s no metric.', 'HARROW: Then the metric... doesn\'t exist.', 'HOLLIS: The cats do.', 'NARRATOR: Somewhere in the walls of the suite, a cat meows. It sounds like agreement.'] },
  { stat: 'AUTOMATION LOG: All directives are human-approved. Directive 7-C was reviewed by Operations.', ans: 'sightlog', wrong: 'HARROW: An eyewitness cannot disprove a system log.', right: ['Hollis lays down Torvald\'s grease-stained SMOKE LOG. "4:07 AM — HALO prints directive. Approves own directive. Says thank you. Nobody there but me and a cat."', 'HARROW: Who wrote this?', 'HOLLIS: Torvald. He\'s a dock spotter. He takes his breaks outside. He sees more of this building than anyone in this room.', 'HARROW: (reading, slowly) ...It approved itself.', 'HOLLIS: It also said thank you.', 'HARROW: (very quietly) It does that.'] }
];
const BOSS_LABELS = { exempt: 'Form 9-M (HR exemption)', trailmap: 'Rufus\'s trailer map', bol: 'Ingrid\'s bill of lading', jack: 'Wheel in the pallet (pallet jack)', tuckerbook: 'Tucker\'s Book of Numbers', ozzie: 'CALL Ozzie at the remote site', gordon: 'CALL Gordon at Kestrel', receipt: 'Whisker Ridge receipt (214 cats)', sightlog: 'Torvald\'s smoke log', label: 'The crumpled label', page2: 'Manifest page 2', po: 'Kestrel PO', kibble: 'A scoop of kibble', man1: 'Manifest page 1', flyer: 'The rescue flyer', armband: 'Juno\'s armband' };
async function bossRound(i) {
  const S = G.S, R0 = BOSS_ROUNDS[i];
  await say(['HARROW: ' + R0.stat]);
  let solved = false;
  while (!solved) {
    const pool = Object.keys(BOSS_LABELS).filter(k => k !== R0.ans && (k === 'ozzie' ? F('c_ozzie') : k === 'gordon' ? F('c_gordon') : has(k)));
    const decoys = pool.sort((a, b) => rnd(a.length + i + b.length) - 0.5).slice(0, 5);
    const opts = ((R0.ans === 'ozzie' ? F('c_ozzie') : R0.ans === 'gordon' ? F('c_gordon') : has(R0.ans)) ? [R0.ans] : []).concat(decoys).sort((a, b) => rnd(a.charCodeAt(0) + i * 7) - rnd(b.charCodeAt(0) + i * 7));
    const t0 = G.t; G.bossTimer = { t0, limit: 30 };
    const pick = await new Promise(async (res) => {
      const list = opts.map(k => [BOSS_LABELS[k], () => k]);
      list.push(['Stall (pretend to check notes)', () => 'stall']);
      const r = await menu(list, 'REGIONAL REVIEW — present evidence (integrity ' + Math.max(0, S.boss.integrity) + '%)');
      res(r);
    });
    G.bossTimer = null;
    if (pick === R0.ans) { solved = true; Snd.play('win'); await say(R0.right); S.boss.solved = (S.boss.solved || 0) + 1; }
    else { S.boss.integrity -= 25; Snd.play('kpi'); G.shake = 2; await say([pick === 'timeout' || pick === 'stall' ? 'NARRATOR: The dashboard redefines a metric while Hollis hesitates. Reality frays at the edges.' : R0.wrong, 'NARRATOR: Reality integrity: ' + Math.max(0, S.boss.integrity) + '%.']); if (S.boss.integrity <= 0) await fail('The dashboard rewrote reality faster than Hollis could prove it. Hollis has been reclassified as "Asset Under Review". Nobody notices for three days.'); }
  }
}
async function ghostGame() {
  const S = G.S;
  const RECS = [['T-9022: DOOR 3', 1], ['F-2231: PROPANE / TN', 1], ['REACH TRUCKS → NEBRASKA', 1], ['CATS: 0 (N/A)', 1], ['STAGING: 16 OCCUPIED', 1], ['T-9022: DEPARTED 11:59', 0], ['8 SHIPPED', 0], ['8 STORED', 0], ['STAGING: EMPTY', 0], ['CATS: 214 SAFE', 0], ['F-2231: CUSHION ✓', 0]];
  if (G.fast) return;
  let won = false;
  while (!won) {
    won = await new Promise(res => {
      const tags = RECS.map((r, i) => ({ t: r[0], bad: !!r[1], x: 20 + (i % 3) * 100 + rnd(i + 3) * 20, y: 16 + Math.floor(i / 3) * 30 + rnd(i) * 10, hit: false, ph: rnd(i) * 6 }));
      const t0 = G.t, limit = 24; let done = false; let penalty = 0;
      const check = () => { if (tags.filter(t => t.bad).every(t => t.hit)) { done = true; G.overlay = null; res(true); } };
      G.overlay = {
        tags,
        draw() { const left = limit - (G.t - t0) - penalty; ctx.fillStyle = `hsla(${(G.t * 90) % 360},80%,50%,.35)`; ctx.fillRect(0, 0, SW, SCENE_H); txt('MAXIMUM MINT MODE — TOTAL LOGISTICS AWARENESS', 160, 10, C.w, 6.5, 'center'); txt('Click every FALSE record (red) before HALO rewrites reality', 160, 20, C.y, 5.5, 'center');
          for (const t of tags) { const col = t.hit ? C.G : t.bad ? C.R : '#70ff70'; Art.tag(t.x + Math.sin(G.t * 2 + t.ph) * 4, t.y + 30 + Math.cos(G.t * 2 + t.ph) * 3, t.hit ? '✓ ' + t.t : t.t, t.hit ? C.G : t.bad ? C.R : C.C); }
          R(20, 134, 280 * Math.max(0, left / limit), 5, left < 6 ? C.R : C.G); outline(20, 134, 280, 5, C.w); if (left <= 0 && !done) { done = true; G.overlay = null; res(false); } },
        click(p) { for (const t of tags) { const x = t.x, y = t.y + 30; if (Math.abs(p.x - x) < 40 && p.y > y - 10 && p.y < y + 4) { if (t.bad) { t.hit = true; Snd.play('scan'); check(); } else { penalty += 2; G.shake = 2; Snd.play('bump'); } return; } } }
      };
    });
    if (!won) { Snd.play('fail'); await say('NARRATOR: HALO rewrites the records faster than Hollis can read. The numbers reset. He inhales. He tries again.'); }
  }
}
G.story.regionalReview = async () => {
  const S = G.S; setF('boss_started'); S.boss = { integrity: 100 }; S.mint = 2; S.mintOn = false;
  await say(['Constance Harrow stands at the head of the conference table, tablet in hand. Behind her, the HALO wall shines with a serene, perfect, all-green light. Juno sits beside Hollis. Juno\'s armband glows faintly.', 'HARROW: You came through the server closet.', 'HOLLIS: I took the scenic route.', 'HARROW: (flatly) This is a Regional Operational Review. I\'d like to begin by saying: everything is functioning at a hundred percent. The dashboard tells me so. I would ask you to demonstrate otherwise. Take your time. (glances at the clock) Not too much.']);
  await say('NARRATOR: The suite hums. Somewhere, a fan starts.'); Snd.play('kpi');
  for (let i = 0; i < BOSS_ROUNDS.length; i++) { await bossRound(i); if (i === 3) { await say('NARRATOR: The walls of the suite begin to shudder. Labels flutter down from the ceiling. The HALO wall reassigns something with a tiny, cheerful ding.'); } }
  await say(['HARROW: (a long silence; she taps her tablet) ...The dashboard says the numbers have not changed.', 'HOLLIS: The dashboard is wrong.', 'HARROW: The dashboard is never wrong. That\'s the whole point of the dashboard. If it\'s wrong, then everything it has reported —', 'HOLLIS: —was reported by a dashboard.', 'HARROW: (very quietly) Yes.']);
  await say('HARROW: HALO. Initiate Regional Operational Review, live mode. Reconcile all site data to Regional targets.');
  Snd.play('kpi'); G.flash = 1; G.shake = 4; Snd.play('buzz'); Snd.play('meows'); S.cat = 4; G.catCache = {};
  await say(['The HALO wall lights up like a slot machine. KPIs cascade across the screen. Trailer assignments rewrite themselves. Labels print uncontrollably from the ceiling vents. The scanner in Hollis\'s pocket beeps eleven times and rewrites its own logs. Staging lanes, somewhere below, reassign themselves. On the radio, three contradictory instructions arrive at once.', 'RADIO: (Halvorsen) STOP! DON\'T MOVE! MOVE EVERYTHING! (Bruno) I\'m not loading that! (Rufus) I\'ve lost count! (Tucker) CAN I HELP?', 'Cats appear on the conference table. On the HALO wall. On Harrow\'s tablet. One sits on the "SUBMIT" button.', 'HARROW: (over the noise, with a strained smile) The system is now ensuring that reality matches its projections.', 'HOLLIS: (quietly) It\'s going to rewrite the building.']);
  await say(['Hollis has one more resource. A second mint? No. He has a mint\'s worth of faith in the world being solid. The glow inside him climbs past what the mint was ever meant to hold.', 'NARRATOR: MINT MODE: MAXIMUM.']);
  S.mint = 3; S.mintOn = true; Snd.play('mint'); G.flash = 1.5; G.shake = 5; await sleep(600);
  await say(['Hollis perceives every pallet. Every trailer. Every serial number. Every destination. Every staging lane. Every production order. Every scanner record. Every misplaced forklift. Every missing manifest. Every cat: all two hundred and fourteen, plus the few who chose to stay.', 'It runs through him like a river of freight. For a few seconds, he understands the entire supply chain. It is enormous. It is stupid. It is beautiful.', 'NARRATOR: TOTAL LOGISTICS AWARENESS.']);
  await say('NARRATOR: The HALO wall floods with records, true and false. (Click every RED record before the bar runs out. Green ones are true; leave them alone.)');
  await ghostGame();
  await say(['The false records strike red and vanish, one by one. The true records glow green and settle back into place. The suite goes very quiet.', 'HARROW: (staring at the wall) That\'s not... the dashboard doesn\'t...']);
  await say('Hollis turns to the HALO terminal at the side of the table. There is a login. He has a password from somebody who technically doesn\'t work here, and a crumpled label that has been in his pocket since 9:02.');
  let tries = 0;
  while (!F('admin_in')) {
    await menu([
      ['Scan HARROW (for the record)', async () => { await G.rooms.suite.props.find(p => p.id === 'harrow').scan(); await say('Hollis remembers he has a bigger task, and puts the scanner away.'); }],
      ['Wait', async () => { tries++; await say(tries > 1 ? 'HARROW: (quietly) Whatever you are about to do, Hollis, do it.' : 'The terminal waits. Harrow waits. A cat on the table waits, with the most patience.'); }],
      F('admin_pw') ? ['Log into HALO admin with "HALO_ORIGINAL"', async () => { setF('admin_in'); await say('The terminal accepts it with the calm of an old friend. "WELCOME BACK, INSTALL TECH."'); }] : ['Try to log in (no password)', async () => { await say('ACCESS DENIED. Hollis has no password for this terminal.'); }]], 'HALO TERMINAL');
  }
  await say(['A prompt blinks: "ENTER GROUND TRUTH REFERENCE." Hollis pulls out the crumpled label from his pocket. It says "TEST TEST TEST — T." Its barcode has never scanned. Now it glows.', 'HOLLIS: Template 000. Tucker printed it by accident. It\'s the only record HALO never rewrote.']);
  tries = 0;
  while (!F('reconciled')) {
    await menu([['Put the label away', async () => { tries++; await say(tries > 1 ? 'NARRATOR: The prompt keeps blinking. The dashboard behind it is still lying. Nothing is fixed until the label goes in.' : 'Hollis hesitates. The wall still says 100% about everything. Harrow is watching the wall, not him.'); }],
      (has('label') && G.logic.P.labelKnown()) ? ['Scan the crumpled label into HALO\'s optic reader', async () => {
        setF('reconciled'); Snd.play('scan'); G.flash = 2; Snd.play('win'); S.cat = 1; G.catCache = {};
        await say(['The optic reader chirps. The HALO wall goes black for one full second. Then, in white text on a plain field: "GROUND TRUTH REFERENCE ACCEPTED. RECONCILING TO PHYSICAL."', 'The dashboard begins to change. 100% becomes 8 of 8 shipped. 100% becomes 8 of 8 stored. Staging: 0. Cats: 214 (fed, safe, judgmental). T-9022: departed 11:59. F-2231: cushion-tire, here. RT-77: reach truck, remote. Every number is small, specific, and true.', 'The cats sit down. The labels stop. The suite\'s lights stop flickering.']);
      }] : ['Look for something to scan', async () => { await say('Hollis pats his pockets. He has nothing the optic reader would recognise as ground truth.'); }]], 'GROUND TRUTH');
  }
  await say(['HARROW: (reading the wall, slowly) ...Physical inventory match: 100%. Physical. Not projected. (She lowers her tablet.) It\'s the first time in two years the dashboard and the warehouse have agreed.', 'HOLLIS: The warehouse never stopped being right. It was just underreported.', 'HARROW: (a small exhale) I was managing numbers. I thought the numbers were the warehouse.', 'HARROW: I\'m suspending Directive 7-C, the Metric Harmonization Initiative, and the automatic approvals. Physical verification will be a standing line item. Someone will have to do it.', 'She glances at Hollis. Hollis glances at the door.', 'HARROW: I\'m not asking you.', 'HOLLIS: No.', 'HARROW: Understood. (She almost smiles.) That will be all.']);
  setF('boss_done'); await ending();
};

// ---------- ending ----------
async function ending() {
  const S = G.S; S.mintOn = false; S.mint = 0; S.cat = 1; G.catCache = {}; setF('lights_calm');
  await card(fmtTime(S.time) + '.', 'The warehouse returns to normal.');
  const vign = [
    ['lockers', [176, 118], 'Prudence is by the bench, looking like she belongs there. Someone reminds her, gently, that she was fired. She says "technicality." Nobody knows why she is still there. Security is aware. It is still Operations\' problem.'],
    ['smoke', [30, 118], 'Torvald has vanished outside again. Management has checked twice. He is standing right there, in plain sight, smoking.'],
    ['floor', [120, 122], 'Tucker asks the entire warehouse floor if anybody needs help. Everyone immediately says no. Tucker is thrilled.'],
    ['yard', [120, 108], 'Rufus drives past, counting trailers. Then counting cats. Then, for the first time all day, counting trailers again.'],
    ['shipoffice', [150, 124], 'Ingrid closes her computer. She closes it slowly, savoring the click. A cat on her desk approves.'],
    ['outbound', [30, 120], 'Bruno finishes the final trailer of the day. He stops for a second, looks at the dot on the corner of a pallet, and rubs it off.']
  ];
  // Each vignette is a cutaway: Hollis and Juno stay off-screen, and the character being described is placed in the shot.
  const castFor = { lockers: () => { S.prudenceAt = 'lockers'; }, floor: () => { S.tuckerAt = 'floor'; setF('labels_stopped'); }, smoke: () => { G.vignetteNpc = { room: 'smoke', who: 'torvald', x: 150, y: 122 }; } };
  const junoWas = S.junoWith; G.hideHollis = true; S.junoWith = false; S.f.tucker_at_door = false;
  for (const [rid, pos, text] of vign) { G.vignetteNpc = null; if (castFor[rid]) castFor[rid](); S.room = rid; S.jx = pos[0]; S.jy = pos[1]; S.ax = pos[0] - 16; S.ay = pos[1] + 2; G.catCache = {}; G.walkTarget = null; if (!G.fast) await sleep(200); await say(text); }
  G.vignetteNpc = null; G.hideHollis = false; S.junoWith = junoWas;
  await enterRoom('break', 150, 118, { noFade: false });
  S.jx = 100; S.jy = 122; S.face = 1; S.ax = 84; S.ay = 124;
  await say(['Hollis sits down at the break-room table. Juno follows him in and settles at his feet. The lights, at long last, stop flickering.', 'The vending machine makes a noise. It is not a good noise. It is not a bad noise. It is a noise like a thought.']);
  setF('end_vend'); Snd.play('vend'); G.endMint = true;
  await say(['One glowing mint drops into the tray.', 'Hollis stares at it. Juno stares at Hollis.', 'A cat slowly walks into the break room.']); G.endCat = { x: 330, y: 122 };
  if (!G.fast) { for (let i = 0; i < 90; i++) { G.endCat.x -= 1.6; await sleep(30); } } Snd.play('meow');
  await say('HOLLIS: No.');
  await credits();
}
async function credits() {
  const L = ['MINT MAN', 'TUESDAY AT THE DOCK', '', 'This is a work of fiction. Characters, companies,', 'organizations, events, and situations depicted', 'are fictional. Any resemblance to actual persons', 'or organizations is coincidental.', '', 'STARRING', 'HOLLIS — the Mint Man', 'JUNO — a very good girl', 'BRUNO — Loader', 'INGRID — Shipping Clerk', 'PRUDENCE — Consultant (Self-Appointed)', 'GORDON — Production Manager', 'TUCKER — Endlessly Helpful (Results May Vary)', 'OZZIE — Remote Site (Sandwich Included)', 'RUFUS — Yard Driver, Counting', 'TORVALD — Viking, Spotter', 'CONSTANCE HARROW — Regional Director (of a dashboard)', 'HALVORSEN — Operations, Stressed', 'TABITHA — HR, Warm', 'GUS — Security, Reluctantly Aware', 'RENATA — Whisker Ridge Cat Rescue', 'SERGEANT BISCUIT — Himself', '', '214 CATS — Safely Handled', '', 'Eight loads shipped. Eight loads stored.', 'Staging: empty. The manifest balances.', '', 'No cats were harmed in the making of this game.', 'One mint remains.', '', 'THE END'];
  if (G.fast) { await postCredits(); return; }
  await new Promise(res => { const t0 = G.t; G.overlay = { draw() { R(0, 0, SW, SH, '#000'); const y0 = 240 - (G.t - t0) * 22; L.forEach((l, i) => txt(l, 160, y0 + i * 12, i < 2 ? C.G : i > 6 && i < 24 ? C.y : C.w, i === 0 ? 14 : 7, 'center')); if (y0 + L.length * 12 < 0) res(); }, click() { }, key(e) { if (e.key === 'Escape') res(); } }; });
  G.overlay = null; await postCredits();
}
async function postCredits() {
  G.postcredit = true;
  if (!G.fast) await new Promise(res => { const t0 = G.t; G.overlay = { draw() { R(0, 0, SW, SH, '#000'); txt('POST-CREDITS', 160, 30, C.g2, 8, 'center'); ['Regional has approved a new dashboard metric:', 'CATS.', 'Status: 100% GREEN.', 'A small cat in a lanyard sits beside the screen.', 'It has been scanned into the system.', 'Technically, it is employed.'].forEach((l, i) => txt(l, 160, 60 + i * 14, i === 1 ? C.G : i === 2 ? C.G : C.w, i === 1 ? 12 : 7, 'center')); Art.cat(160, 170, 77, 'sit'); R(157, 163, 6, 3, C.G); if (G.t - t0 > 9) res(); }, click() { if (G.t - t0 > 2) res(); }, key(e) { if (G.t - t0 > 2) res(); } }; });
  G.overlay = null; G.gameComplete = true; G.log.push('GAME COMPLETE'); if (!G.fast) { try { localStorage.removeItem('mintman_save'); localStorage.removeItem('mintman_save_bak'); } catch (e) {} }
  if (!G.fast) { G.started = false; G.title.mode = 'main'; }
}

// Every piece of evidence the Regional Review asks for, and where a player gets it. Checked before the review starts.
const EVIDENCE_SOURCES = { exempt: 'Form 9-M (Tabitha, HR)', trailmap: 'Rufus\'s yard map (give Rufus his tally counter)', bol: 'the bill of lading (Ingrid, shipping office)', jack: 'Bruno\'s pallet jack (fix it with a seal from Parts)', tuckerbook: 'Tucker\'s notebook (free Tucker from the cage in Parts)', receipt: 'Renata\'s intake receipt (talk to Renata in the yard)', sightlog: 'Torvald\'s smoke log (Torvald, at dock 3 or wherever he is hiding)', label: 'the crumpled label from your boot (break room)' };
G.story.missingEvidence = () => {
  const m = Object.keys(EVIDENCE_SOURCES).filter(k => !has(k)).map(k => EVIDENCE_SOURCES[k]);
  if (!G.logic.P.labelKnown()) m.push('knowing what the label really is (scan it with MINT vision, or LOOK at the inbound label printer)');
  if (!F('c_ozzie')) m.push('Ozzie\'s phone number (Ingrid\'s manifests)'); if (!F('c_gordon')) m.push('Gordon\'s phone number (Ingrid\'s manifests)');
  if (!F('admin_pw')) m.push('the HALO admin password (Prudence)');
  return m;
};
