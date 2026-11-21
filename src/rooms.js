'use strict';
// ROOMS: room definitions, props/hotspots, exits, call scenes
// ===== rooms A: break room, lockers, floor, shipping office, ops, HR =====
const P = (r, id) => G.rooms[r].props.find(p => p.id === id);
const J = (t) => say('HOLLIS: ' + t);
const cl = (x1, x2, y, n, pose) => { const a = []; for (let i = 0; i < n; i++) a.push([Math.round(x1 + (x2 - x1) * (n === 1 ? 0.5 : i / (n - 1)) + (rnd(i * 3 + x1) - .5) * 5), y + Math.round((rnd(i + y) - .5) * 4), i, pose]); return a; };
const spotsMix = (...g) => [].concat(...g);
const ex = (id, to, r, label, enter, extra = {}) => Object.assign({ id, to, r, label, enter }, extra);

// ---------- background builders ----------
function bgWarehouse(t, o = {}) {
  R(0, 0, SW, 80, o.wall || '#5f6470'); for (let i = 0; i < SW; i += 6) vline(i, 0, 80, 'rgba(255,255,255,.06)'); dith(0, 66, SW, 14, o.wall2 || '#4d515c', o.wall || '#5f6470'); R(0, 78, SW, 2, C.g3);
  R(0, 80, SW, 64, o.floor || '#8f8f86'); for (let y = 82; y < 144; y += 14) dith(0, y, SW, 1, '#7c7c74', '#8f8f86');
  if (!o.nolane) { R(0, 124, SW, 1, C.y); for (let x = 0; x < SW; x += 16) R(x, 138, 8, 2, C.y); }
  Art.lights(5, 2); const fl = Math.sin(t * 30) > 0.97 ? 0.3 : 0.08; ctx.fillStyle = `rgba(255,255,200,${fl})`; ctx.fillRect(0, 0, SW, 80);
}
function bgOffice(t, wall = '#b8b09a', floor = '#5a6a7a') {
  R(0, 0, SW, 82, wall); dith(0, 60, SW, 22, '#a8a08a', wall); R(0, 80, SW, 3, '#6a6250'); R(0, 83, SW, 61, floor); for (let x = 0; x < SW; x += 20) vline(x, 83, 61, 'rgba(0,0,0,.12)'); for (let y = 90; y < 144; y += 14) hline(0, y, SW, 'rgba(0,0,0,.1)');
  R(20, 0, 34, 3, C.g1); R(140, 0, 34, 3, C.g1); R(260, 0, 34, 3, C.g1); const fl = Math.sin(t * 25 + 1) > 0.95 ? 0.35 : 0.1; ctx.fillStyle = `rgba(255,255,210,${fl})`; ctx.fillRect(0, 0, SW, 80);
}
function bgOutside(t, o = {}) {
  R(0, 0, SW, 60, o.sky || '#8ab0d0'); dith(0, 46, SW, 14, '#a8c4d8', o.sky || '#8ab0d0'); for (let i = 0; i < 4; i++) { const cx = (i * 90 + t * 3) % 380 - 30; R(cx, 12 + i * 5, 30, 6, '#e8f0f8'); R(cx + 6, 8 + i * 5, 18, 5, '#e8f0f8'); }
  R(0, 60, SW, 84, o.ground || '#6c6c68'); dith(0, 60, SW, 8, '#585856', o.ground || '#6c6c68'); for (let x = 0; x < SW; x += 40) R(x, 100 + (x % 3), 20, 1, 'rgba(0,0,0,.18)');
}
const wall = (x, y, w, h, col = '#9a9a92') => { R(x, y, w, h, col); outline(x, y, w, h, C.g3); };
const person = (id, over = {}) => ({ });

// ---------- BREAK ROOM ----------
G.rooms.break = {
  name: 'EMPLOYEE BREAK ROOM', start: [120, 122], walk: [10, 96, 285, 138], c1: 1,
  bg(t) {
    R(0, 0, SW, 82, '#cfc9a8'); dith(0, 58, SW, 24, '#bdb794', '#cfc9a8'); R(0, 80, SW, 3, '#7a7250');
    for (let y = 83; y < 144; y += 8) for (let x = ((y / 8) & 1) * 8; x < SW; x += 16) R(x, y, 8, 8, '#8c8c7c'); R(0, 83, SW, 61, 'rgba(70,70,60,.25)');
    const fl = Math.sin(t * 22) > 0.7 ? 0.28 : 0.1; R(30, 0, 40, 3, C.g1); R(150, 0, 40, 3, C.g1); R(250, 0, 40, 3, C.g1); ctx.fillStyle = `rgba(255,255,200,${fl})`; ctx.fillRect(0, 0, SW, 84);
    R(290, 40, 30, 46, '#6a4a2a'); outline(290, 40, 30, 46, C.k); R(294, 44, 22, 14, '#9ac8d8'); R(292, 66, 4, 3, C.Y); txt('LOCKERS', 305, 37, C.k, 4.6, 'center');
  },
  props: [
    { id: 'bulletin', name: 'bulletin board', r: [70, 22, 36, 28], draw() { R(70, 22, 36, 28, C.n); outline(70, 22, 36, 28, C.k); R(73, 25, 12, 10, C.w); R(88, 26, 14, 8, C.y); if (!F('took_flyer')) { R(76, 37, 12, 10, C.g1); R(78, 39, 8, 2, C.r); } txt('EOM: —', 89, 45, C.w, 4); },
      on: { LOOK: async () => { await say('The bulletin board. "EMPLOYEE OF THE MONTH: VACANT (since 2019)". "Your safety is our priority (please see Forms 3 through 41)." And a hand-lettered flyer at the bottom.'); if (!F('took_flyer')) await say('It says WHISKER RIDGE CAT RESCUE, with a phone number. "We handle LARGE groups." Someone has underlined LARGE.'); if (!F('c_rescue')) { setF('c_rescue'); await say('Hollis puts the number in his phone. You never know.'); } }, TAKE: async () => { if (F('took_flyer')) return say('The flyer is already in your pocket. The board looks relieved.'); setF('took_flyer'); await take('flyer', 'Hollis takes the Whisker Ridge flyer. It seems like the kind of thing that becomes relevant.'); setF('c_rescue'); } } },
    { id: 'clock', name: 'wall clock', r: [112, 10, 14, 14], draw() { R(112, 10, 14, 14, C.w); outline(112, 10, 14, 14, C.k); vline(119, 12, 6, C.k); hline(119, 17, 4, C.k); if (!F('clock_battery')) R(116, 24, 6, 3, C.g4); },
      on: { LOOK: async () => { await say('The clock reads 9:02. It has read 9:02 for as long as anyone can remember, which the break room finds comforting.'); if (!F('clock_battery')) await say('Something about it is off: its battery pack looks a lot like a handheld scanner battery, held in with electrical tape and confidence.'); },
        TAKE: async () => { if (F('clock_battery')) return say('The clock is now a decorative circle. It is at peace.'); setF('clock_battery'); await say('Hollis lifts the clock off its nail and pops out the taped-in battery. It is, in fact, a scanner battery.'); await J('Tucker.'); await take('sbat', 'The clock keeps reading 9:02. Now it has an excuse.'); },
        OPEN: async () => { if (F('clock_battery')) return say('Already open, already empty.'); return G.rooms.break.props[1].on.TAKE(); } } },
    { id: 'couch', name: 'couch', r: [8, 84, 52, 26], draw() { R(8, 92, 52, 18, '#7a4a3a'); R(8, 84, 6, 26, '#6a3a2a'); R(54, 84, 6, 26, '#6a3a2a'); R(14, 92, 40, 8, '#8a5a4a'); vline(34, 92, 8, '#6a3a2a'); R(10, 110, 3, 3, C.k); R(55, 110, 3, 3, C.k); },
      on: { LOOK: () => say('A couch that has absorbed a decade of lunch breaks, three union meetings and, allegedly, a nap by Torvald that lasted through a shift change.' + (F('couch_q') ? '' : ' Something metallic glints between the cushions.')),
        OPEN: async () => { if (F('couch_q')) return say('Nothing else in the cushions but structural regret.'); setF('couch_q'); G.S.f.q = (G.S.f.q || 0) + 2; giveItem('quarter'); await say('Hollis checks the cushions like a professional. He finds two quarters, a pen cap, and a tiny sock. Two quarters go in his pocket.'); },
        USE: () => G.rooms.break.props[2].on.OPEN(), PUSH: 'The couch does not move. It has roots.' } },
    { id: 'table', name: 'break table', r: [72, 98, 52, 22], draw() { R(72, 100, 52, 4, C.g1); R(74, 104, 3, 14, C.g3); R(119, 104, 3, 14, C.g3); R(78, 96, 6, 4, C.w); R(100, 97, 8, 3, '#7a5a3a'); R(64, 108, 8, 10, C.g2); R(124, 108, 8, 10, C.g2); },
      on: { LOOK: 'The table where Hollis woke up. There is a drool situation on a napkin and a half-completed Form 3. He does not remember starting either.', USE: 'Hollis is already done sleeping on it. Probably.' } },
    { id: 'pot', name: 'coffee maker', r: [142, 54, 12, 14], draw() { R(142, 54, 12, 14, C.g4); R(144, 58, 8, 8, '#e8e8e8'); R(144, 64, 8, 2, F('coffee_gone') ? '#3a2410' : '#3a2410'); R(146, 52, 4, 2, C.g2); },
      on: { LOOK: 'The pot is empty. A note: "LAST DECENT COFFEE WAS HERE — WHO TOOK IT?" Below it, in different handwriting: "not me."', USE: 'There is nothing to brew but regret and stale filter.', TAKE: 'Hollis takes the pot, thinks better of it, and puts it back.' } },
    { id: 'microwave', name: 'microwave', r: [160, 52, 20, 13], draw() { R(160, 52, 20, 13, C.g3); R(162, 54, 11, 9, C.k); R(175, 55, 3, 7, C.g1); },
      on: { LOOK: 'A microwave with a label: "PLEASE DO NOT MICROWAVE FISH." Someone has microwaved fish. The label has been updated to "SERIOUSLY."', OPEN: 'Hollis opens it. Something inside looks back, then remembers it is a burrito.' } },
    { id: 'counter', name: 'counter', r: [136, 66, 60, 24], draw() { R(136, 66, 60, 4, C.N); R(136, 70, 60, 20, '#7a6a5a'); R(138, 72, 26, 16, '#6a5a4a'); R(168, 72, 26, 16, '#6a5a4a'); },
      on: { LOOK: 'A counter with three sugar packets and a sign that says "CLEAN AS YOU GO". It is not clean and no one is going.', OPEN: 'Empty. A single fork remains. It has seen things.' } },
    { id: 'fridge', name: 'refrigerator', r: [200, 46, 24, 44], draw() { R(200, 46, 24, 44, C.g1); outline(200, 46, 24, 44, C.g3); hline(200, 66, 24, C.g3); R(218, 52, 2, 8, C.g3); R(218, 72, 2, 12, C.g3); R(204, 74, 10, 8, C.w); },
      on: { LOOK: 'Covered in magnets. One holds a note: "TUCKER — DO NOT EAT — TUCKER." Tucker has written this himself, twice.', OPEN: 'Inside: one yogurt (expired), a lunch labeled "TUCKER (DO NOT EAT — TUCKER)", and a dish of cat kibble that nobody will explain.' } },
    { id: 'vending', name: 'vending machine', r: [232, 50, 26, 40], draw() { Art.vending(232, 50, F('mint_ready') && !F('mint_taken')); }, mintTag: 'DISPENSES: ???',
      on: { LOOK: async () => { await say('A vending machine with the ambition of a small vending machine. One slot, D4, is empty except for a warm blink.'); if (!F('radio_found')) await say('From somewhere behind it comes a faint chirp. Radio-like. Ashamed.'); if (F('mint_ready') && !F('mint_taken')) await say('Slot D4 is glowing. Softly. Minty. A sign says "PLEASE ENJOY."'); }, USE: 'It wants 25 cents. It has wanted 25 cents since before Hollis was hired. (There are always quarters somewhere in a break room.)', PUSH: 'Hollis shoves the machine. It rocks, judges him, and settles back.', PULL: 'It weighs as much as a decision.', TAKE: 'It is a vending machine. Hollis is a tall skinny guy, not a moving company.' },
      scan: async () => { await say('SCANNER: VENDING MACHINE — Asset class: "Snack Depot 3". Contents: 6 items, 1 rumor. Last serviced: "yes".'); }, useOn: { quarter: () => vendMenu() } },
    { id: 'gap', name: 'gap behind vending machine', r: [258, 58, 8, 44], draw() { R(258, 58, 6, 44, '#1a1a1a'); if (!F('radio_found')) { txt('~', 261, 64, C.G, 5); } },
      on: { LOOK: async () => { if (!F('radio_found')) await say('A gap behind the vending machine, about the width of a dog and a half. Something in there is blinking green.'); else await say('A gap. Empty now. Hollis is a little proud of the dog.'); }, PUSH: 'Pushing the machine to reach the gap will take at least two people and an incident report.', OPEN: 'It is a gap. It does not open. It is just there.' },
      juno: async () => { if (F('radio_found')) return say('Juno has already been a hero here.'); await junoGo(248, 112); await junoGo(262, 96, 'sniff'); await sleep(700); await junoAnim('bark', 500); await say('Juno wedges into the gap. There is a clatter, a beep, and a muffled complaint.'); await junoGo(238, 112); setF('radio_found'); await take('radio', 'Juno trots back with a walkie-talkie in her mouth, slightly chewed but chirping. She drops it in Hollis\'s hand with the dignity of a well-paid courier.'); await J('Good girl.'); await say('The radio crackles: "...Hollis? Anyone have eyes on Hollis?" It sounds like Operations. It sounds tired.'); } },
    { id: 'bowl1', name: 'cat food bowl', r: [34, 126, 10, 6], vis: () => !F('bowl1_taken'), draw() { Art.bowl(34, 126); Art.pawprints(48, 128, 3); },
      on: { LOOK: 'A bowl of kibble on the break-room floor with a laminated sign: "NOT A CAT BOWL". Nobody has admitted placing it. There are paw prints leading away from it, in a very orderly line.', TAKE: async () => { setF('bowl1_taken'); G.S.f.bowls = (G.S.f.bowls || 0) + 1; giveItem('bowl'); await say('Hollis takes the bowl. Several sets of eyes track the bowl as it leaves.'); } },
      scan: 'SCANNER: BOWL — Asset class: "Not A Cat Bowl". Contents: 0.3 lb of the wrong kind of temptation.' },
    { id: 'label_on_boot', name: 'crumpled label', r: [110, 128, 12, 8], vis: () => !F('took_label'), draw() { Art.label(112, 130); },
      on: { LOOK: 'A crumpled shipping label, stuck to the toe of Hollis\'s boot with something that used to be a sticker and is now a lifestyle.', TAKE: async () => { setF('took_label'); await take('label', 'Hollis peels the label off his boot. It clings for a moment out of loyalty, then gives up. It goes in his pocket.'); await say('(Items live in the inventory panel at the bottom. Right-click any item to LOOK at it.)'); } } },
    { id: 'paws', name: 'paw prints', r: [140, 128, 24, 8], draw() { Art.pawprints(142, 130, 4); },
      on: { LOOK: 'Small, muddy, purposeful paw prints crossing the break-room floor from the door to the vending machine. Whoever made them knew exactly where they were going.' }, juno: 'Juno sniffs the prints. She looks up at Hollis with an expression that says "I know them, and I do not like it."' },
    { id: 'hollis_self', name: 'Hollis', r: [-10, -10, 1, 1], draw() {}, on: {} }
  ],
  spots: spotsMix([[245, 52, 0, 'sit'], [131, 66, 0, 'loaf'], [22, 84, 0, 'sleep'], [86, 100, 0, 'sit'], [211, 46, 0, 'loaf'], [108, 22, 0, 'sit']], cl(20, 280, 132, 12), cl(70, 120, 98, 4), cl(140, 190, 66, 4), cl(10, 55, 90, 4)),
  exits: [ex('to_lockers', 'lockers', [290, 40, 30, 60], 'lockers', [30, 118], { stand: [286, 116], look: 'The door to the locker area. Beyond it, the sounds of a warehouse having a day.' })],
  onEnter() {}
};
async function vendMenu() {
  const S = G.S;
  return menu([
    (G.S.f.crackers_bought || 0) < 3 ? ['Buy FISH-SHAPED CRACKERS (25¢)', async () => { if (has('crackers')) return say('Hollis already has a bag of crackers. Quarters are not infinite. He keeps his hands in his pockets.'); if (!(S.f.q > 0)) return say('You are out of quarters.'); S.f.q--; if (S.f.q <= 0) loseItem('quarter'); S.f.crackers_bought = (S.f.crackers_bought || 0) + 1; Snd.play('vend'); giveItem('crackers'); await say('KA-CHUNK. A bag of "Salty Little Fish" drops. It smells like an idea.'); }] : ['(Crackers: SOLD OUT)', null],
    F('mint_ready') && !F('mint_taken') ? ['Press D4 (25¢)', async () => { if (!(S.f.q > 0)) return say('You are out of quarters.'); S.f.q--; if (S.f.q <= 0) loseItem('quarter'); setF('mint_taken'); Snd.play('vend'); await say('You press D4. The machine hums a note that does not exist. A single mint tumbles into the tray, glowing with the calm confidence of something that has never been audited.'); await take('mint', 'It is warm. It is faintly luminous. Company policy, in at least four places, says Hollis should not eat this.'); await J('Definitely not.'); }] : ['Press D4 (blinking "SOLD OUT")', async () => say('D4 blinks "SOLD OUT" at you and hums. It is waiting for something.')],
    ['Never mind', null]
  ], 'VENDING MACHINE');
}

// ---------- LOCKERS ----------
G.rooms.lockers = {
  name: 'LOCKER AREA', start: [40, 118], walk: [12, 100, 300, 138], c1: 0,
  bg(t) { bgOffice(t, '#a8b0b0', '#6a6a70'); R(0, 0, SW, 3, C.g3); for (let i = 0; i < 4; i++) Art.locker(24 + i * 14, 50, false, i == 3 ? '#8a6a5a' : C.g2); R(250, 40, 28, 44, '#5a4a3a'); outline(250, 40, 28, 44, C.k); R(254, 44, 20, 12, '#9ac8d8'); txt('H R', 264, 38, C.k, 5, 'center'); R(150, 55, 34, 18, C.k); outline(150, 55, 34, 18, C.g1); txt('TIME CLOCK', 167, 53, C.w, 4.5, 'center'); R(158, 60, 18, 8, '#204020'); txt('IN', 167, 66, C.G, 5, 'center'); },
  props: [
    { id: 'locker114', name: "Hollis's locker", r: [24, 50, 12, 34], draw() { if (F('locker_open')) { R(24, 50, 12, 34, C.k); outline(24, 50, 12, 34, C.g4); R(28, 56, 6, 4, C.g2); } }, stand: [30, 112],
      on: { LOOK: async () => { await say(F('locker_open') ? 'Locker 114. Yours, in theory. The padlock hangs open, and the dent still looks intentional.' : 'Locker 114. Yours, in theory. It has a combination padlock and a dent that looks intentional.'); }, OPEN: async () => { if (F('locker_open')) return say('Open. The interior smells like work boots and possibility.'); await say('A combination lock. Three numbers. Hollis stares at it like a man who has forgotten his own PIN, because he has.'); await menu([['Try 12-34-56', () => say('Click. Nope. The lock rolls its eyes.')], (F('label_back') ? ['Try 33-12-08 (from the label)', async () => { await say('Click! The numbers on the back of that label were right.'); setF('locker_open'); await say('The locker swings open. Inside: a pen, and a cell phone with 4% battery, both exactly where Hollis would have put them.'); giveItem('pen'); giveItem('phone'); await say('Hollis takes the pen and his phone.'); }] : ['Try 99-99-99', () => say('Click. No. Hollis has no idea what the numbers are. Someone, somewhere, wrote them down.')]), ['Try 00-00-00', () => say('Click. Also no. The lock was not born yesterday.')], ['Walk away', null]], 'COMBINATION'); },
        TAKE: 'Hollis does not take the locker. The locker takes Hollis, most mornings.', USE: () => G.rooms.lockers.props[0].on.OPEN() } },
    { id: 'lockerD', name: "Torvald's locker", r: [38, 50, 12, 34], draw() { if (F('dlocker_open')) { R(38, 50, 12, 34, C.k); outline(38, 50, 12, 34, C.g4); } R(40, 54, 8, 5, C.o); R(41, 55, 6, 1, C.w); }, stand: [44, 112],
      on: { LOOK: 'A locker with a sticker of a Viking helmet and a sign in runes that says either "TORVALD" or "GO AWAY". It is unlocked.', OPEN: async () => { if (F('dlocker_open')) { return say('Already open. Nothing else in there but pine-scented resignation.'); } setF('dlocker_open'); await say('Inside: seven hi-vis vests, a thermos, a sleeping bag, and a single work glove that smells strongly of tobacco and pine.'); await take('dglove', 'Hollis takes the glove. Somewhere, a dog will find this interesting.'); }, TAKE: () => G.rooms.lockers.props[1].on.OPEN() } },
    { id: 'lockerX', name: 'old locker', r: [52, 50, 12, 34], draw() { R(53, 60, 6, 3, C.w); }, stand: [58, 112],
      on: { LOOK: 'A locker with a nameplate that has been crossed out and re-written as "PRUDENCE" and crossed out again. The padlock is cut. It contains a mug and, faintly, hope.', OPEN: 'Empty except a mug with "WORLD\'S OKAYEST EMPLOYEE" on it. The mug is still warm.' } },
    { id: 'lockerO', name: 'lockers', r: [66, 50, 12, 34], draw() {}, on: { LOOK: 'More lockers. One is labeled "PPE (for the safety of persons who wear PPE)". Another is full of orange cones.', OPEN: 'Locked, dented, or full of cones. Sometimes all three.' } },
    { id: 'timeclock', name: 'time clock', r: [150, 55, 34, 18], draw() {}, on: { LOOK: 'The time clock shows PRUDENCE as clocked IN. It has for eleven weeks. The system considers this a data-entry error and Prudence considers it a schedule.', USE: 'Hollis punches in. The clock says "You have been at work since 9:02." He has.' }, scan: 'SCANNER: TIME CLOCK — Status: 1 employee "present", 0 employees "employed". Payroll has filed this under Weather.' },
    { id: 'bench', name: 'bench', r: [90, 90, 70, 20], draw() { R(90, 100, 70, 4, C.N); R(92, 104, 3, 8, C.n); R(155, 104, 3, 8, C.n); }, on: { LOOK: () => say('A long bench with worn boot scuffs.' + (F('bench_q') ? '' : ' A quarter has been lodged in the seam.')), OPEN: async () => { if (F('bench_q')) return say('Just splinters.'); setF('bench_q'); G.S.f.q = (G.S.f.q || 0) + 1; giveItem('quarter'); await say('Hollis pries a quarter out of the seam with a fingernail. Modest, but real.'); }, TAKE: () => P('lockers','bench').on.OPEN() } },
    { id: 'lostfound', name: 'lost & found box', r: [200, 100, 28, 16], draw() { R(200, 104, 28, 12, C.N); outline(200, 104, 28, 12, C.n); txt('LOST&FOUND', 214, 112, C.k, 4, 'center'); if (!F('lf_taken')) { R(204, 100, 18, 5, C.M); } },
      on: { LOOK: () => say(F('lf_taken') ? 'The Lost & Found box. A single boot and a Bluetooth speaker that plays only static. The blanket and the tally counter are gone.' : 'The Lost & Found box. It contains a single boot, a Bluetooth speaker that plays only static, and a folded pink blanket that has clearly been thoroughly loved. A tally counter peeks from underneath.'), OPEN: async () => { if (F('lf_taken')) return say('The box is now "Found & Lost". Hollis feels good about that.'); setF('lf_taken'); await take('blanket', 'Hollis lifts out the pink blanket. Underneath: a yard tally clicker labeled "RUFUS". '); await take('tally', 'He takes that too. Rufus has been looking for this, presumably by counting the places it is not.'); }, TAKE: () => P('lockers','lostfound').on.OPEN() } },
    { id: 'prudence', name: 'Prudence', npc: true, r: [176, 84, 16, 38], vis: (s) => s.prudenceAt === 'lockers', draw() { Art.npc('prudence', 184, 118, { facing: -1 }); },
      on: { TALK: () => talkPrudence(), LOOK: 'Prudence sits on the bench like she works here, which she does not. She has the posture of someone who "just needs a second".' },
      giveTo: { '*': async () => say('PRUDENCE: Oh, I can\'t accept things. I\'m not technically on the payroll. But put it on the bench.') }, scan: async () => { await say('SCANNER: PRUDENCE — Employment status: TERMINATED. Location: HERE. Badge: EXPIRED (functional). Task: "just finishing something". Task duration: 11 weeks.'); } }
  ],
  spots: spotsMix([[196, 100, 0, 'sleep'], [70, 84, 0, 'sit'], [140, 60, 0, 'loaf']], cl(20, 290, 134, 10), cl(90, 160, 98, 5), cl(200, 235, 64, 3)),
  exits: [ex('to_break', 'break', [0, 90, 12, 50], 'break room', [270, 118], { stand: [16, 116], look: 'Back to the break room.' }),
    ex('to_floor', 'floor', [300, 90, 20, 50], 'warehouse floor', [30, 122], { stand: [300, 116], look: 'Through the door: the warehouse floor. You can hear it from here.' }),
    ex('to_hr', 'hr', [250, 40, 28, 46], 'H R', [160, 122], { stand: [264, 108], look: 'The door to Human Resources. A sign reads "HR: please don\'t".', lock: (s) => { if (s.act < 4) { say('The HR door is closed. A sticky note: "Back at 9:02." It has been 9:02 in HR for about a year.'); return true; } return false; } })]
};

// ---------- FLOOR ----------
G.rooms.floor = {
  name: 'MAIN WAREHOUSE FLOOR', start: [40, 122], walk: [10, 96, 308, 140], c1: 1,
  bg(t) { bgWarehouse(t); R(0, 20, 80, 40, C.g4); // back wall features
    Art.rack(96, 30, 60, 48, 3, true, 3); Art.rack(160, 30, 60, 48, 3, true, 9); Art.rack(226, 30, 60, 48, 3, true, 14);
    R(14, 36, 30, 44, '#6a4a2a'); outline(14, 36, 30, 44, C.k); R(18, 40, 22, 14, '#9ac8d8'); txt('SHIPPING', 29, 33, C.w, 4.5, 'center');
    R(60, 30, 30, 50, '#4a5a7a'); outline(60, 30, 30, 50, C.k); txt('OPERATIONS', 75, 28, C.w, 4.2, 'center');
    R(292, 34, 24, 46, '#6a6a6a'); outline(292, 34, 24, 46, C.k); txt('PARTS', 304, 32, C.w, 4.5, 'center'); for (let i = 34; i < 80; i += 4) hline(292, i, 24, '#5a5a5a');
    R(0, 118, SW, 2, 'rgba(0,0,0,.15)'); },
  props: [
    { id: 'f2231', name: 'forklift', r: [120, 88, 42, 32], draw() { Art.forklift(142, 120, 'cushion', 1); if (F('swap_fixed')) Art.tag(142, 82, 'F-2231 OK'); txt('F-2231', 142, 112, C.k, 4.5, 'center'); }, mintTag: () => (F('swap_fixed') ? 'F-2231: CUSHION ✓' : 'SYSTEM: PROPANE?!'),
      on: { LOOK: async () => { await say('A cushion-tire forklift, unmistakable to anyone who has ever touched one: solid tires, low seat, no propane tank, a dent in the guard that Hollis has personal history with. The plate says F-2231.'); }, USE: 'Hollis has operated enough equipment without authorization today.', PUSH: 'It is a forklift. The forklift wins.', OPEN: 'There is no OPEN on a forklift. There is only "hope it starts".' },
      scan: async () => { Snd.play('scan'); setF('f2231_scanned'); if (!F('swap_fixed')) { await say(['SCANNER: F-2231 — Type per plate: CUSHION-TIRE, serial CT-2231. Type per system: PROPANE SIT-DOWN. Location per system: TENNESSEE.', 'NARRATOR: The warehouse computer says this forklift is currently in Tennessee.', 'HOLLIS: It\'s right there.', 'NARRATOR: The computer remains confident.', 'SCANNER: MISMATCH LOGGED to scan history: "F-2231, plate vs. records disagree."', 'HOLLIS: A record that is wrong is a reason. Ingrid keeps saying she needs one of those before she touches the paperwork. This might be it.']); } else await say('SCANNER: F-2231 — CUSHION-TIRE. System agrees. Location: HERE. The scanner sounds almost smug.'); },
      useOn: { scanner: () => G.rooms.floor.props[0].scan(), '*': async (...a) => say(WRONG_USE[1]) } },
    { id: 'kiosk', name: 'HALO wall screen', r: [232, 8, 32, 20], draw(t) { R(232, 8, 32, 20, C.k); outline(232, 8, 32, 20, C.g2); R(234, 10, 28, 16, '#0a2a1a'); for (let i = 0; i < 4; i++) { R(236, 12 + i * 4, 6 + Math.floor((Math.sin(t + i) + 1) * 9), 2, C.G); } txt('ALL GREEN', 248, 25, C.G, 4.5, 'center'); }, mintTag: 'HALO: LIES',
      on: { LOOK: async () => { await say('The HALO regional dashboard, mounted on the wall like a saint. Every bar is green. Every number is 100%. Below it, a cat is sitting on a shelf, indifferent to metrics.'); await J('Everything is green.'); await say('NARRATOR: It has never once been correct and has never once been red.'); }, PUSH: 'It is on the wall. It cannot be pushed. It can only be believed.' },
      scan: 'SCANNER: HALO WALL SCREEN — Reports: "Everything is fine." Confidence: 100%. Correlation with physical reality: pending since 2021.' },
    { id: 'whiteboard', name: 'whiteboard', r: [166, 14, 52, 20], draw() { R(166, 14, 52, 20, C.w); outline(166, 14, 52, 20, C.g2); txt('HOT: KESTREL', 192, 22, C.r, 5, 'center'); txt(F('departed') ? 'OUT 11:59 ✓' : '8 LOADS OUT BY 12', 192, 28, F('departed') ? C.G : C.k, 3.8, 'center'); },
      on: { LOOK: async () => { await say('The whiteboard. "HOT SHIPMENT (rush order: the customer is losing money every hour) — KESTREL MOTOR WORKS — 8 LOADS (eight pallets of parts) — OUT BY 12:00 (NOON). NO EXCEPTIONS." Under it, someone has written "CATS: " and then nothing, as if the marker died in the attempt.' + (F('departed') ? ' Someone has added "OUT 11:59" in green, with a tick.' : '')); setF('knows_hot'); } } },
    { id: 'bowl2', name: 'cat food bowl', r: [260, 130, 10, 6], vis: () => !F('bowl2_taken'), draw() { Art.bowl(260, 130); }, on: { LOOK: 'Another bowl of kibble, this one on the warehouse floor next to a "Wet Floor" sign. It is not wet. Nobody put it there. The bowl is aware of this.', TAKE: async () => { setF('bowl2_taken'); G.S.f.bowls = (G.S.f.bowls || 0) + 1; giveItem('bowl'); await say('Hollis takes the bowl. A dozen cats stare. One of them says something rude in cat.'); } } },
    { id: 'pallets_blk', name: "Tucker's pallet wall", r: [98, 122, 50, 20], vis: () => !F('tucker_cleared'), z: 141, draw() { Art.loaded(98, 122, 22, 10); Art.loaded(122, 120, 24, 12, '#c89a50'); Art.pallet(100, 134, 44); }, stand: [86, 124],
      on: { LOOK: 'A neat wall of pallets that Tucker "organized" across the aisle to the staging lanes. The lane is now a philosophical concept. A sign says "Tucker was here (helping)".', PUSH: 'Hollis pushes. The pallets, stacked with Tucker\'s unwavering optimism, weigh about a car. Maybe he should ask Tucker to un-help.', PULL: 'The wall of pallets does not care.' } },
    { id: 'tucker', name: 'Tucker', npc: true, r: [190, 88, 18, 36], vis: (s) => s.tuckerAt === 'floor' && !(s.act >= 2 && F('labels_running') && !F('labels_stopped') && !F('tucker_labels_done')) && !F('tucker_at_door'), draw() { Art.npc('tucker', 200, 122, { facing: -1 }); }, on: { TALK: () => talkTucker(), LOOK: 'Tucker: hard hat two sizes too large, vest one size too large, energy exactly the right size for a much bigger man. He is waving at you. He has been waving since you walked in.' }, giveTo: { '*': async () => say('TUCKER: Oh! Is this for me?! I mean, I\'ll hold it! I\'ll... hold it! [he holds it, then hands it back with great ceremony]') }, scan: async () => { await say('SCANNER: TUCKER — Enthusiasm: 100%. Competence: (loading...). Loyalty: OVERFLOW. Warning: this employee has been scanned into fourteen wrong locations.'); } },
    { id: 'pa', name: 'loudspeaker', r: [150, 6, 14, 8], draw() { R(150, 6, 14, 8, C.g3); R(153, 8, 8, 4, C.g4); }, on: { LOOK: 'The PA speaker. It announces things, none of which matter, all of which are urgent.' }, scan: 'SCANNER: PA SPEAKER — Says: "Attention, all associates: please attend to your attentions."' },
    { id: 'bollard', name: 'bollards', r: [100, 100, 40, 14], draw() { Art.bollard(102, 104); Art.bollard(126, 104); Art.bollard(150, 104); }, on: { LOOK: 'Yellow bollards, dented in patterns that tell the history of every forklift driver. One of the dents is shaped like a mistake.' } }
  ],
  spots: spotsMix([[142, 92, 0, 'sit'], [250, 34, 0, 'sit'], [178, 33, 0, 'loaf'], [106, 30, 0, 'sleep']], cl(18, 300, 134, 10), cl(100, 152, 60, 3), cl(160, 215, 56, 3), cl(226, 286, 58, 4), cl(20, 90, 138, 4), cl(96, 156, 50, 3), cl(160, 220, 38, 3), cl(226, 286, 40, 4), cl(100, 140, 70, 4)),
  exits: [ex('to_lockers', 'lockers', [0, 90, 10, 50], 'lockers', [290, 116], { stand: [14, 118] }),
    ex('to_ship', 'shipoffice', [14, 36, 30, 46], 'shipping office', [150, 122], { stand: [30, 100] }),
    ex('to_ops', 'ops', [60, 30, 30, 52], 'operations office', [150, 122], { stand: [75, 100] }),
    ex('to_racks', 'racks', [96, 30, 190, 40], 'warehouse racks', [160, 124], { stand: [240, 98], look: 'The racking aisles, going back further than anyone has surveyed.' }),
    ex('to_parts', 'parts', [292, 34, 24, 48], 'parts area', [160, 122], { stand: [304, 98] }),
    ex('to_out', 'outbound', [312, 90, 8, 50], 'outbound docks', [30, 120], { stand: [306, 118] }),
    ex('to_staging', 'staging', [120, 138, 70, 6], 'staging lanes', [160, 100], { stand: [150, 138], lock: (s) => { if (!F('tucker_cleared')) { say('Tucker\'s pallet wall blocks the aisle to the staging lanes. It would take a small army, or one person who understands the difference between "organized" and "obstructed".'); return true; } return false; } })]
};

// ===== rooms A2: shipping office, operations, HR =====
G.rooms.shipoffice = {
  name: 'SHIPPING OFFICE', start: [150, 124], walk: [10, 100, 305, 138], c1: 1,
  bg(t) { bgOffice(t, '#b4b8a6', '#6a6a58');
    R(24, 60, 24, 34, C.g2); outline(24, 60, 24, 34, C.g4); for (let i = 0; i < 3; i++) { R(26, 63 + i * 10, 20, 8, C.g1); R(34, 66 + i * 10, 4, 2, C.g4); }
    R(200, 14, 64, 34, '#7ab0d0'); outline(200, 14, 64, 34, C.g4); vline(232, 14, 34, C.g4); R(204, 30, 16, 18, C.g1); R(206, 20, 10, 6, C.w); R(240, 28, 20, 20, C.g2); Art.trailer(236, 34, 24, 12, 'T-', C.g1); },
  props: [
    { id: 'board', name: 'trailer board', r: [30, 14, 76, 36], draw() { R(30, 14, 76, 36, C.w); outline(30, 14, 76, 36, C.g3); for (let i = 0; i < 5; i++) { hline(34, 24 + i * 6, 68, C.g1); } txt('DOOR  TRAILER  STATUS', 68, 21, C.k, 4, 'center'); txt('2  T-4417  UNLOADED*', 34, 30, C.b, 4); txt('6  T-4418  UNLOADED*', 34, 36, C.b, 4); txt(F('departed') ? '3  T-9022  DEPARTED' : F('t9022_at_dock') ? '3  T-9022  AT DOOR' : '3  T-9022  READY (?)', 34, 42, F('t9022_at_dock') ? C.G : C.r, 4); txt(F('staging_empty') ? 'all pallets verified' : '*pallets not verified', 34, 48, C.g3, 3.6); },
      on: { LOOK: async () => { await say(F('departed') ? 'The trailer assignment board. Door 3: T-9022, DEPARTED. Someone has drawn a tiny trailer driving off the edge of the board.' : F('t9022_at_dock') ? 'The trailer assignment board. Door 3: T-9022, AT DOOR. For the first time today, the board is telling the truth.' : 'The trailer assignment board. Door 3: T-9022, READY. Doors 2 and 6: the two inbound trailers, "UNLOADED*". The asterisk is doing an enormous amount of work.'); setF('saw_board'); } }, mintTag: () => (F('t9022_at_dock') ? 'T-9022: AT DOOR 3 ✓' : 'T-9022: NOT AT DOOR 3') },
    { id: 'cabinet', name: 'filing cabinet', r: [24, 60, 24, 34], draw() {}, on: { LOOK: 'A filing cabinet containing everything anyone has ever done. Alphabetized by the concept of "later".', OPEN: 'Ingrid glances up. "Don\'t." Hollis doesn\'t.', PULL: 'Ingrid glances up. "Don\'t." Hollis doesn\'t.' } },
    { id: 'ingrid', name: 'Ingrid', npc: true, r: [118, 56, 24, 34], draw() { Art.npc('ingrid', 130, 96, { facing: 1 }); }, z: 92,
      on: { TALK: () => talkIngrid(), LOOK: async () => { await say('Ingrid, the shipping clerk. Every piece of paper in the building eventually stops at her desk to rest. She has the look of someone who has said "that\'s not my department" for so long it became her department.'); } },
      giveTo: { coffee: async () => { if (F('ingrid_coffee')) return say('She already has coffee. She\'s not greedy. She just needs it.'); setF('ingrid_coffee'); loseItem('coffee'); await say(['INGRID: ...Is this the last decent coffee?', 'HOLLIS: I believe so.', 'INGRID: Who had it?', 'HOLLIS: Someone who is technically not here.', 'INGRID: Ah.', 'NARRATOR: Ingrid drinks. Something in the room relaxes by about four degrees.']); },
        form7q: async () => { if (F('form_signed')) { setF('ingrid_form'); await say('INGRID: Form 7-Q, filled, signed. Where did you find a pen? I\'m genuinely impressed.'); } else if (F('form_filled')) return say('INGRID: It needs a signature from Operations. That\'s literally the point of the form.'); else return say('INGRID: It\'s blank. That\'s a piece of paper, not a request.'); },
        scanner: async () => { if (!F('f2231_scanned')) return say('INGRID: (glances at the screen) It says nothing is wrong yet. Scan something that is wrong and come back.'); setF('ingrid_saw_scan'); await say(['INGRID: (squints at the scanner) Cushion-tire, per the plate. Propane, per the system. Tennessee, per the system. And it is standing forty feet from my desk.', 'INGRID: ...Fine. That is a reason. I will note it. (She does not write anything down. She is noting it.)']); }, '*': async () => say('INGRID: If it creates work, no.') }, scan: 'SCANNER: INGRID — Knows: everything. Says: 11%. Owes: nobody. Needs: coffee (CRITICAL).' },
    { id: 'terminal', name: 'WMS terminal', r: [188, 68, 16, 17], draw(t) { Art.terminal(188, 68, F('swap_fixed') ? C.G : (Math.sin(t * 4) > 0 ? C.C : '#20a0a8')); }, mintTag: () => (F('swap_fixed') ? 'RECORDS: TRUE' : 'RECORDS: MIXED UP'),
      on: { LOOK: async () => { if (!F('ingrid_helped')) return say('Ingrid\'s WMS terminal. A sticky note on the screen: "IF YOU TOUCH THIS I WILL KNOW". Hollis respects the sticky note.'); await terminalMenu(); }, USE: async () => { if (!F('ingrid_helped')) return say('Ingrid\'s eyes rise slowly from her work and meet yours over the top of her monitor. Hollis takes his hand off the mouse.'); await terminalMenu(); } },
      useOn: { tuckerbook: () => terminalSwap(), scanner: () => say('SCANNER: WMS TERMINAL — Status: "Reconciled". Reality: "Pending." The scanner and the terminal have never gotten along.'), label: async () => { await say('Hollis holds the crumpled label up to the terminal. The terminal makes a noise like a very small door closing. Nothing else happens. Yet.'); } },
      scan: 'SCANNER: WMS TERMINAL — Status: "Reconciled". Reality: "Pending." The scanner and the terminal have never gotten along.' },
    { id: 'printer', name: 'printer', r: [232, 70, 22, 16], draw() { R(232, 74, 22, 12, C.g1); R(234, 70, 18, 4, C.w); outline(232, 74, 22, 12, C.g3); }, on: { LOOK: 'A printer that prints things. It once printed the same Form 2 for fifty minutes. Ingrid does not talk about that day.', USE: 'It hums at Hollis in a tone that suggests he would rather not.' } },
    { id: 'phone', name: 'desk phone', r: [166, 84, 12, 8], draw() { R(166, 86, 12, 6, C.k); R(167, 84, 10, 2, C.g4); }, on: { LOOK: 'A desk phone with a very long cord, which Ingrid uses to leave the world on hold.', USE: () => G.story.callMenu() } },
    { id: 'desk', name: "Ingrid's desk", r: [108, 84, 66, 20], z: 100, draw() { Art.desk(108, 90, 66); R(112, 84, 14, 6, C.w); R(130, 85, 10, 5, C.y); R(146, 84, 14, 6, '#f0e8c8'); Art.cat(158, 88, 900, 'sleep'); },
      on: { LOOK: async () => { await say('Ingrid\'s desk. It is a stable ecosystem of manifests, bills of lading, sticky notes, and one small orange cat asleep on a stack of shipping papers.'); if (F('saw_orange_cat')) return; setF('saw_orange_cat'); await J('There\'s a cat on your paperwork.'); await say('INGRID: There\'s always a cat on my paperwork. He\'s been there since Friday. He\'s a coworker now.'); }, TAKE: 'Ingrid does not look up. "Put it back." Hollis was not going to take it. He puts it back anyway.' } },
    { id: 'plant', name: 'plant', r: [270, 84, 12, 18], draw() { Art.plant(270, 86); }, on: { LOOK: 'A plant that has survived three managers and a flood. It is the only employee with perfect attendance.' } }
  ],
  spots: spotsMix([[158, 88, 0, 'sleep'], [218, 68, 0, 'sit'], [68, 60, 0, 'loaf']], cl(20, 290, 134, 8), cl(30, 100, 60, 3), cl(110, 175, 84, 4), cl(200, 270, 46, 4), cl(24, 48, 60, 2)),
  exits: [ex('to_floor', 'floor', [140, 138, 60, 6], 'warehouse floor', [30, 106], { stand: [150, 138] })]
};

async function terminalMenu() {
  await say('Ingrid\'s terminal, the WMS (warehouse management system: the computer that claims to know where everything is). Guest access. The screen offers "TRAILERS", "ASSETS" and "DIRECTIVES (LOCKED)".');
  await menu([
    ['TRAILERS', async () => { await say(['WMS: T-4417 — INBOUND, DOOR 2, 8 loads, status: RECONCILED.', 'WMS: T-4418 — INBOUND, DOOR 6, 8 loads, status: RECONCILED.', ].concat(F('departed') ? ['WMS: T-9022 — DEPARTED 11:59, 8 loads, seal 88120.', 'NARRATOR: For once, the computer and the parking lot agree.'] : F('t9022_at_dock') ? ['WMS: T-9022 — OUTBOUND, DOOR 3, status: READY.', 'NARRATOR: For once, it is.'] : ['WMS: T-9022 — OUTBOUND, DOOR 3, EMPTY, status: READY.', 'NARRATOR: There is an empty trailer at door 3 in the computer. There is not one at door 3 in real life. The computer is completely sure.'])); setF('sys_t9022'); }],
    ['ASSETS', async () => { await say((F('swap_fixed') ? ['WMS: F-2231 — CUSHION-TIRE — location: HERE.', 'WMS: RT-77 — REACH TRUCK — location: REMOTE SITE.', 'NARRATOR: The screen and the floor finally agree.'] : ['WMS: F-2231 — PROPANE SIT-DOWN — location: TENNESSEE.', 'WMS: RT-77 — CUSHION-TIRE — location: REMOTE SITE.', 'WMS: LOADS A3, A4 — REACH TRUCKS — dest: NEBRASKA (per Directive 7-C).', 'NARRATOR: Nothing on the screen agrees with anything outside it.'])); setF('rec_read'); }],
    ['DIRECTIVES (LOCKED)', async () => { await say(['WMS: ACCESS LEVEL REQUIRED: ADMIN.', 'WMS: Hint: "HALO engineering password (original)."']); setF('saw_admin_lock'); }],
    ['Log out', null]], 'WMS (GUEST)');
}
async function terminalSwap() {
  if (!F('rec_read')) return say('Hollis has a vague sense he should read the records before rewriting them. That is the kind of discipline that comes with experience.');
  if (F('swap_fixed')) return say('The terminal already agrees with reality. It seems to be holding its breath.');
  if (!F('admin_pw')) { setF('saw_admin_lock'); return say('The terminal wants an ADMIN password to change asset identities. Its install hint says "HALO engineering password (original)". Hollis has none. He suspects someone who is technically not employed here does.'); }
  if (!F('ozzie_plate')) return say('Hollis has the serials from Tucker\'s notebook, but the system\'s claim about the remote site should be confirmed by someone standing next to that reach truck. Ozzie, maybe.');
  await say('Hollis logs in as admin (using a password he was not supposed to be told). He opens the identity table. RT-77 is carrying F-2231\'s cushion-tire spec, and F-2231 has been handed a propane spec and a Tennessee address off Directive 7-C. Tucker\'s notebook has the original plates and serials for both.');
  await menu([['RESTORE identities: F-2231 and RT-77 (from Tucker\'s notebook)', async () => { setF('swap_fixed'); Snd.play('printer'); await say(['WMS: Identities restored. F-2231: CUSHION-TIRE (HERE). RT-77: REACH TRUCK (REMOTE SITE).', 'NARRATOR: Somewhere, two pieces of equipment are handed back the personalities they had all along.', 'INGRID: ...Did you just fix that?', 'HOLLIS: I found the notebook.', 'INGRID: Whose?', 'HOLLIS: Tucker\'s.', 'INGRID: (very long pause) ...Huh.']); }], ['Do not merge anything yet', null]], 'ADMIN: ASSET IDENTITIES');
}

// ---------- OPERATIONS ----------
G.rooms.ops = {
  name: 'OPERATIONS OFFICE', start: [150, 124], walk: [10, 100, 305, 138], c1: 0,
  bg(t) { bgOffice(t, '#a0a8b8', '#3a4a5a'); R(24, 52, 34, 4, C.g2); R(200, 14, 50, 30, '#7ab0d0'); outline(200, 14, 50, 30, C.g4); vline(225, 14, 30, C.g4); R(270, 20, 26, 20, C.w); outline(270, 20, 26, 20, C.g3); R(273, 23, 20, 14, '#e8d8c0'); },
  props: [
    { id: 'dash', name: 'HALO regional dashboard', r: [24, 8, 100, 46], draw(t) { R(24, 8, 100, 46, C.k); outline(24, 8, 100, 46, C.g2); R(27, 11, 94, 40, '#08201a'); for (let i = 0; i < 6; i++) { const w = 20 + ((Math.sin(t * .8 + i) + 1) * 30) | 0; R(31, 15 + i * 6, w, 3, i == 4 ? C.y : C.G); txt('100%', 116, 18 + i * 6, C.G, 4, 'right'); } txt('HALO — REGIONAL OPS — ALL GREEN', 74, 10, C.G, 4, 'center'); }, mintTag: () => (F('directive_traced') ? 'DIRECTIVE 7-C ← HALO ← HALO' : 'HALO: LIES'),
      on: { LOOK: async () => { await say('The big HALO dashboard (corporate\'s scoreboard for every site), showing every regional site at a serene 100%. The glow flickers oddly, as if there is more underneath. A graph shows "Cat Population" as a flat line at zero, labeled "N/A (no approved metric)".');
        if (G.S.mintOn && !F('directive_traced')) { setF('directive_traced'); await say(['NARRATOR: With MINT vision, the dashboard\'s glow peels back like a wet label. Lines of routing data run up out of it to the ceiling. Hollis follows one.', 'NARRATOR: DIRECTIVE 7-C: "Any freight with an unassigned destination shall be assigned to the nearest site with a shortfall." ORIGIN: Regional Operations (automated template). AUTO-APPROVED BY: HALO. FIRST APPLIED: FRIDAY 4:07 AM.', 'HOLLIS: It approved its own directive.', 'NARRATOR: And then it thanked itself for its service.', 'NARRATOR: Below the directive, another line — the identity swap. Below THAT, a metric labeled "Cats" pointing at nothing at all.']); await say('Hollis has traced the chaos upward: Operations followed the system, the system followed a Regional directive, and the Regional directive followed the system. It is a circle. It is a perfectly green circle.'); } }, PUSH: 'It is on the wall. It is the wall now.' },
      scan: async () => { Snd.play('scanfail'); await say('' + (F('staging_empty') ? 'SCANNER: HALO DASHBOARD — Accuracy: 100%. Physical inventory match: 16 of 16. The dashboard reports 100% either way. Warehouse cats: N/A.' : 'SCANNER: HALO DASHBOARD — Accuracy: 100%. Physical inventory match: 0 of 16. Warehouse cats: N/A. Note: this device is not used to being asked questions.')); } },
    { id: 'halvorsen', name: 'Halvorsen', npc: true, r: [140, 52, 30, 44], draw() { Art.npc('halvorsen', 156, 96, { facing: -1, bust: true }); Art.desk(126, 92, 60); R(148, 84, 12, 8, '#3a3a3a'); }, z: 96,
      on: { TALK: () => talkHalvorsen(), LOOK: 'Dale Halvorsen, Operations Manager. His shirt has a fresh sweat ring on it and the expression of a man who was told by a spreadsheet that everything is fine, and now feels a little sick.' },
      giveTo: { form7q: async () => { if (F('form_signed')) return say('HALVORSEN: It\'s signed. Go. GO.'); if (!F('form_filled')) return say('HALVORSEN: It\'s blank. I can\'t approve nothing. (He considers it.) Actually I can. But I won\'t.'); setF('form_signed'); await say(['HALVORSEN: A 7-Q? For Ingrid? ...Fine. What\'s the reason?', 'HOLLIS: Hot shipment.', 'HALVORSEN: Approved. (He signs in a hurry.) Don\'t tell Regional I approved a form. We\'re not measured on forms.']); }, '*': async () => say('HALVORSEN: I don\'t have time for that. Or for anything.') }, scan: 'SCANNER: HALVORSEN — Stress: CRITICAL. Confidence in dashboard: 91%. Confidence in warehouse: pending. Currently waiting on: a call from someone.' },
    { id: 'form_printer', name: 'printer', r: [230, 70, 24, 16], draw() { R(230, 74, 24, 12, C.g1); outline(230, 74, 24, 12, C.g3); R(233, 70, 18, 4, C.w); if (!F('took_form')) { R(236, 68, 10, 5, C.w); } },
      on: { LOOK: async () => { await say(F('took_form') ? 'The Ops printer. The tray is empty. It hums like it is already printing the next problem.' : 'The Ops printer. A single sheet sits in the tray. It says FORM 7-Q: INFORMATION ACCESS REQUEST (For requests that will create work for Shipping, please submit for Approval).'); }, TAKE: async () => { if (F('took_form')) return say('The tray is empty. It is already regretting.'); setF('took_form'); await take('form7q', 'Hollis takes Form 7-Q. It is blank, cheerful, and dangerous.'); }, USE: () => P('ops', 'form_printer').on.TAKE() } },
    { id: 'binder', name: 'directive binder', r: [190, 70, 22, 14], draw() { R(190, 72, 22, 12, C.b); R(192, 74, 18, 3, C.w); txt('DIRECTIVES', 201, 82, C.w, 3.6, 'center'); }, on: { LOOK: 'A three-inch binder of Regional directives. Each one is signed "HALO". Someone has bookmarked directive 7-C with a sticky note reading "OH NO."', OPEN: 'Hollis flips through. Directives seven through nine all say, in different fonts, "meet your numbers".' } },
    { id: 'photo', name: 'framed photo', r: [270, 20, 26, 20], draw() {}, on: { LOOK: 'A framed photo of a woman in a navy blazer shaking hands with a dashboard. The caption: "REGIONAL DIRECTOR — RECOGNIZING EXCELLENCE (of numbers)".' } },
    { id: 'cat_prt', name: 'stress ball', r: [188, 84, 8, 6], draw() { R(188, 84, 6, 6, C.R); }, on: { LOOK: 'A stress ball. It is flat. It is doing its best.' } }
  ],
  spots: spotsMix(cl(30, 300, 132, 8), cl(30, 120, 8, 3), cl(140, 190, 88, 2), cl(190, 250, 84, 3), cl(126, 190, 92, 3)),
  exits: [ex('to_floor', 'floor', [140, 138, 60, 6], 'warehouse floor', [75, 106], { stand: [150, 138] }),
    ex('to_mgmt', 'mgmt', [280, 40, 30, 48], 'stairs to management', [40, 122], { stand: [292, 100], look: 'A staircase that leads up to the Regional Operations Suite. A sign at the top: "AUTHORIZED PERSONNEL. NO CATS. (See: cats.)"', vis: (s) => s.act >= 6 || F('mgmt_open') })]
};
G.rooms.ops.bg = ((orig) => function (t) { orig(t); if (G.S.act >= 6 || F('mgmt_open')) { R(280, 40, 30, 48, '#2a2a3a'); outline(280, 40, 30, 48, C.k); for (let i = 0; i < 8; i++) hline(284 + i, 50 + i * 4, 22 - i, '#4a4a6a'); } })(G.rooms.ops.bg);

// ---------- HR ----------
G.rooms.hr = {
  name: 'HUMAN RESOURCES', start: [160, 124], walk: [10, 100, 305, 138], c1: 0,
  bg(t) { bgOffice(t, '#b0c4b8', '#7a6a8a'); R(24, 14, 48, 30, C.w); outline(24, 14, 48, 30, C.g3); txt('SAFETY IS', 48, 24, C.r, 5.5, 'center'); txt('EVERYONE\'S ', 48, 31, C.k, 4.5, 'center'); txt('SHARED IDEA', 48, 38, C.k, 4.5, 'center'); R(230, 14, 40, 26, C.w); outline(230, 14, 40, 26, C.g3); txt('NO POLICY FOR:', 250, 22, C.r, 4, 'center'); txt('Supernatural', 250, 29, C.k, 4, 'center'); txt('Breath Mints', 250, 35, C.k, 4, 'center'); },
  props: [
    { id: 'tabitha', name: 'Tabitha', npc: true, r: [140, 56, 26, 44], draw() { Art.npc('tabitha', 154, 98, { facing: -1, bust: true }); Art.desk(122, 94, 64); R(146, 86, 12, 8, C.k); R(147, 87, 10, 6, C.C); }, z: 98,
      on: { TALK: () => talkTabitha(), LOOK: 'Tabitha, HR. Warm, calm, lanyard fully loaded, and possessed of an unshakeable belief that every problem is a "learning opportunity with paperwork".' }, giveTo: { '*': async () => say('TABITHA: I\'m not authorized to receive that, but I can note that you tried.') }, scan: 'SCANNER: TABITHA — Empathy: OVERFLOW. Policy references: 412. Ability to say the word "no": [FILE NOT FOUND].' },
    { id: 'tablet', name: 'HR tablet', r: [180, 84, 14, 10], draw() { R(180, 86, 14, 8, C.k); R(181, 87, 12, 6, C.C); }, on: { LOOK: 'The HR tablet. It runs "PolicyPilot 7", which sometimes knows the answer.' }, scan: 'SCANNER: HR TABLET — Contents: 412 policies. Missing: 1 relevant policy.' },
    { id: 'hr_printer', name: 'HR printer', r: [232, 70, 24, 16], draw() { R(232, 74, 24, 12, C.g1); outline(232, 74, 24, 12, C.g3); R(235, 70, 18, 4, C.w); if (F('hr_sequence_running')) { for (let i = 0; i < 4; i++) Art.label(238 + i * 5, 62 + ((G.t * 30 + i * 9) % 40)); } }, on: { LOOK: 'The HR printer. It prints forms, and, when very stressed, unrelated shipping labels.' } },
    { id: 'poster', name: 'wellness poster', r: [100, 20, 30, 30], draw() { R(100, 20, 30, 30, C.M); R(104, 24, 22, 14, C.C); txt('BREATHE', 115, 45, C.w, 4.5, 'center'); }, on: { LOOK: 'A wellness poster with a cat on it. HR says it was there before the cats. Nobody believes this.' } }
  ],
  spots: spotsMix([[70, 44, 0, 'sit'], [186, 88, 0, 'loaf']], cl(20, 300, 132, 8), cl(122, 186, 94, 4), cl(100, 130, 26, 2), cl(230, 270, 44, 3)),
  exits: [ex('to_lockers', 'lockers', [140, 138, 60, 6], 'locker area', [264, 110], { stand: [150, 138] })],
  async onEnter() { if (G.S.act >= 4 && G.S.mint > 0 && !F('hr_done')) await hrSequence(); }
};

// ===== rooms B: parts/cage, charging, racks, tunnel, staging, inbound, outbound =====
const nice = (t) => 'the ' + t.split(' ').map(w => /\d/.test(w) || /^\(?(Tennessee|Nebraska|Ohio|Kestrel|PO)\b/i.test(w) ? w.replace(/^\(?(tennessee|nebraska|ohio|kestrel)/i, (m) => m[0] === '(' ? '(' + m[1].toUpperCase() + m.slice(2).toLowerCase() : m[0].toUpperCase() + m.slice(1).toLowerCase()) : w.toLowerCase()).join(' ');
const PAL = [
  { code: 'A1', real: 'CUSHION-TIRE FORKLIFT CT-118', sys: 'PROPANE SIT-DOWN LIFT — dest TENNESSEE', dest: 'ship', dot: 'o', bad: true, col: '#e8d040' },
  { code: 'A2', real: 'CUSHION-TIRE FORKLIFT CT-119', sys: 'PROPANE SIT-DOWN LIFT — dest TENNESSEE', dest: 'ship', dot: 'o', bad: true, col: '#e8d040' },
  { code: 'A3', real: 'REACH TRUCK RT-79 (Tennessee order)', sys: 'REACH TRUCK — dest NEBRASKA', dest: 'store', dot: 'b', bad: true, col: '#5080d0' },
  { code: 'A4', real: 'REACH TRUCK RT-80 (Tennessee order)', sys: 'REACH TRUCK — dest NEBRASKA', dest: 'store', dot: 'b', bad: true, col: '#5080d0' },
  { code: 'A5', real: 'MAST ASSEMBLIES (3-stage)', sys: 'MAST ASSY — dest KESTREL', dest: 'ship', dot: 'o', col: '#a0a0a8' },
  { code: 'A6', real: 'FELINE KIBBLE, bulk totes (Pawsome Foods)', sys: 'COUNTERWEIGHT BLOCKS — dest KESTREL', dest: 'store', dot: null, bad: true, col: '#c89a50' },
  { code: 'A7', real: 'FELINE KIBBLE, bulk totes (Pawsome Foods)', sys: 'COUNTERWEIGHT BLOCKS — dest KESTREL', dest: 'store', dot: null, bad: true, col: '#c89a50' },
  { code: 'A8', real: 'OVERHEAD GUARD KITS', sys: 'O/H GUARD — dest KESTREL', dest: 'ship', dot: 'o', col: '#707078' },
  { code: 'B1', real: '48V BATTERY PACK (Kestrel PO line)', sys: 'BATTERY 48V — dest KESTREL', dest: 'ship', dot: 'o', col: '#308050' },
  { code: 'B2', real: 'HYDRAULIC HOSE KITS', sys: 'HOSE KIT — dest KESTREL', dest: 'ship', dot: 'o', col: '#303038' },
  { code: 'B3', real: 'CONTROL HARNESS CRATES', sys: 'HARNESS — dest KESTREL', dest: 'ship', dot: 'o', col: '#b08030' },
  { code: 'B4', real: 'COUNTERWEIGHT BLOCKS (actual iron)', sys: 'COUNTERWEIGHT — dest KESTREL', dest: 'ship', dot: 'o', col: '#606068' },
  { code: 'B5', real: 'REACH TRUCK CHARGERS', sys: 'CHARGERS — dest NEBRASKA', dest: 'store', dot: 'b', bad: true, col: '#d05030' },
  { code: 'B6', real: 'SPARE CUSHION TIRES (not on PO)', sys: 'TIRES — dest KESTREL (?)', dest: 'store', dot: 'b', bad: true, col: '#282830' },
  { code: 'B7', real: 'SPARE FORK SETS', sys: 'FORKS — (no destination)', dest: 'store', dot: 'b', col: '#8a8a90' },
  { code: 'B8', real: 'HALO KIOSK HARDWARE (unopened return)', sys: 'HALO KIOSK — status INSTALLED', dest: 'store', dot: null, bad: true, col: '#28a0b0' }
];
const palIdx = (c) => PAL.findIndex(p => p.code === c);
function palPos(i) { const col = i % 8, row = Math.floor(i / 8); return [10 + col * 38, 66 + row * 38]; }
const sortedCount = (d) => PAL.filter(p => G.S.pal[p.code] === d).length;

// ---------- PARTS / CAGE ----------
G.rooms.parts = {
  name: 'PARTS AREA / MAINTENANCE CAGE', start: [160, 124], walk: [10, 100, 305, 138], c1: 1,
  bg(t) { bgWarehouse(t, { wall: '#5a5e68', floor: '#84847c', nolane: true }); for (let i = 0; i < 4; i++) Art.rack(12 + i * 58, 24, 52, 54, 4, true, 40 + i); R(238, 28, 76, 50, '#222'); for (let i = 0; i < 20; i++) vline(240 + i * 4, 28, 50, C.g3); hline(238, 28, 76, C.g2); hline(238, 77, 76, C.g2); },
  props: [
    { id: 'bins', name: 'parts bins', r: [12, 24, 224, 54], draw() {}, mintTag: null, on: { LOOK: async () => { await say('Rows and rows of small parts bins labeled with codes only the Parts Department understands (and, at night, the Parts Department\'s ghost). One label reads "H-17 — HYDRAULIC SEALS, PALLET JACK, MISC".'); setF('saw_h17'); } } },
    { id: 'h17', name: 'bin H-17', r: [76, 44, 20, 18], draw() { R(76, 44, 20, 18, C.b); outline(76, 44, 20, 18, C.k); txt('H-17', 86, 56, C.w, 5, 'center'); }, stand: [88, 100],
      on: { LOOK: () => say(F('took_seal') ? 'Bin H-17: "HYDRAULIC SEALS". Empty now, apart from a tiny fossilized donut.' : 'Bin H-17: "HYDRAULIC SEALS". One seal remains in the bin, next to a tiny fossilized donut.'), TAKE: async () => { if (F('took_seal')) return say('The bin is empty. The donut remains.'); setF('took_seal'); await take('seal', 'Hollis takes the hydraulic seal kit. It smells like a repair that might work.'); }, OPEN: () => P('parts', 'h17').on.TAKE() },
      scan: 'SCANNER: BIN H-17 — HYDRAULIC SEAL KIT x1 (last one). Donut: unclassified.' },
    { id: 'cage', name: 'maintenance cage', r: [238, 28, 76, 52], vis: () => true, draw() { if (F('tucker_in_cage') && !F('tucker_freed')) { Art.npc('tucker', 268, 78, { facing: -1, pose: 'stand' }); } }, z: 90, stand: [250, 102],
      on: { LOOK: async () => { if (!F('tucker_in_cage') && G.S.act >= 3 && !F('tucker_freed')) return G.rooms.parts.onEnter(); if (F('tucker_in_cage') && !F('tucker_freed')) await say('The maintenance cage. The door is padlocked from the OUTSIDE. Tucker is on the inside, waving through the bars with the enthusiasm of a man on a parade float.'); else await say('The maintenance cage: torque wrenches, drum keys, one very brave mop. Neatly locked. Neatly.'); }, TALK: () => talkTuckerCage(), OPEN: async () => { if (F('tucker_in_cage') && !F('tucker_freed')) return say('The padlock needs the cage key. Hollis is looking at a lock designed by a person who did not anticipate Tucker.'); return say('It is locked and there is nothing in there Hollis needs.'); } },
      useOn: { key_cage: async () => { if (!F('tucker_in_cage') && G.S.act >= 3 && !F('tucker_freed')) { await G.rooms.parts.onEnter(); return; } if (!F('tucker_in_cage')) return say('The cage is locked and nobody is in it. Hollis keeps the key. He has a feeling.'); if (F('tucker_freed')) return say('It is already unlocked. Tucker got out the way Tucker gets out of things: eventually.'); await freeTucker(); }, '*': (function () { return async () => say('It does not help. The cage is a cage. The lock is a lock.'); })() } },
    { id: 'seal_bell', name: 'service bell', r: [180, 98, 10, 8], draw() { R(180, 102, 10, 3, C.Y); R(183, 99, 4, 3, C.Y); }, on: { LOOK: 'A parts counter service bell. The sign says "RING ONCE". It has been rung eighty-one thousand times.', USE: 'Hollis rings. Nobody comes. Somewhere a cat looks up and, judging by its face, files a complaint.', PUSH: 'It goes ding, like a tiny alarm nobody set.' } }
  ],
  spots: spotsMix([[190, 100, 0, 'sleep'], [90, 40, 0, 'sit']], cl(20, 290, 134, 10), cl(14, 228, 42, 6), cl(14, 228, 60, 5), cl(240, 310, 70, 3), cl(20, 230, 82, 5)),
  exits: [ex('to_floor', 'floor', [140, 138, 60, 6], 'warehouse floor', [304, 104], { stand: [150, 138] }), ex('to_charging', 'charging', [0, 96, 10, 44], 'charging area', [290, 120], { stand: [12, 120] })],
  async onEnter() { if (G.S.act >= 3 && !F('tucker_in_cage') && !F('tucker_freed')) { setF('tucker_in_cage'); G.S.tuckerAt = 'cage'; await say('BANG. BANG. BANG. A rhythmic, cheerful sound is coming from the maintenance cage.'); await say('TUCKER: (muffled) HI HOLLIS! I\'M FINE! I JUST HAD TO LET THE CATS OUT OF THE SECURED AREA AND THEN THE DOOR LOCKED! BUT THEY\'RE OUT! ALL OF THEM! (a pause) ...THEY\'RE ALL IN HERE NOW ACTUALLY.'); } }
};
async function freeTucker() {
  setF('tucker_freed'); G.S.tuckerAt = 'floor'; loseItem('key_cage'); await say(['Hollis works the padlock free. The cage door swings open. A dozen cats stream out past Tucker like commuters.', 'TUCKER: Hollis! You saved me! I\'d have been in there until lunch. Or Wednesday.']);
  await say('TUCKER: Oh — wait. Here. I always write serial numbers down when I move stuff. It\'s a thing I do. Nobody\'s ever asked for it before.'); await take('tuckerbook', 'Tucker hands Hollis a small notebook labeled "TUCKER\'S BOOK OF NUMBERS (PRIVATE)". Each page is a forklift plate number, a date, and a doodle of the forklift.'); await J('Tucker, this is the most useful notebook in the building.'); await say('TUCKER: (lights up like a trailer at night) REALLY?');
}

// ---------- CHARGING ----------
G.rooms.charging = {
  name: 'FORKLIFT STORAGE / CHARGING AREA', start: [280, 122], walk: [10, 100, 305, 138], c1: 1,
  bg(t) { bgWarehouse(t, { wall: '#585c66', floor: '#8a8a82', nolane: true }); for (let i = 0; i < 5; i++) { const x = 20 + i * 60; R(x, 40, 30, 38, C.g3); outline(x, 40, 30, 38, C.g4); R(x + 4, 44, 22, 10, C.k); R(x + 6, 46, 4, 6, i % 2 ? C.G : C.R); R(x + 12, 46, 4, 6, C.y); R(x + 8, 60, 14, 2, C.k); R(x - 1, 70, 5, 12, C.g4); } },
  props: [
    { id: 'charger', name: 'battery chargers', r: [20, 40, 290, 40], draw() {}, on: { LOOK: 'A row of battery chargers, humming in five slightly different keys. Each has a lockout-tag hook labeled "DO NOT ENERGIZE THIS HOOK". Nobody does.' }, scan: 'SCANNER: CHARGER BANK — 5 chargers, 3 forklifts. Charge status: "yes".' },
    { id: 'hook', name: 'key hook', r: [98, 36, 20, 18], draw() { R(98, 36, 20, 18, C.n); outline(98, 36, 20, 18, C.k); if (!F('took_cagekey')) { R(104, 42, 3, 8, C.Y); R(103, 40, 5, 3, C.Y); } txt('CAGE', 108, 35, C.w, 3.8, 'center'); },
      on: { LOOK: async () => { if (!F('took_cagekey')) await say('A hook labeled "CAGE KEY — DO NOT LOSE". A key hangs from it. Below, a sign: "IF KEY IS MISSING SEE TUCKER." The key is not missing, which is exciting.'); else await say('The hook is empty. Its sign still says "SEE TUCKER".'); }, TAKE: async () => { if (F('took_cagekey')) return say('Empty hook. Not empty of meaning.'); setF('took_cagekey'); await take('key_cage', 'Hollis takes the maintenance cage key. It is heavier than it should be. It is carrying a lot.'); } } },
    { id: 'f_old', name: 'propane sit-down lift', r: [190, 84, 38, 32], draw() { Art.forklift(212, 116, 'propane', -1); txt('P-114', 212, 108, C.k, 4.5, 'center'); },
      on: { LOOK: 'A genuine propane sit-down forklift, which the system has never once identified correctly.', USE: 'Hollis has operated enough equipment without authorization today.' }, scan: 'SCANNER: P-114 — PROPANE SIT-DOWN. System says: PROPANE SIT-DOWN. Correct. P-114 is the one forklift in the building the computer is right about.' },
    { id: 'sign_lockout', name: 'lockout sign', r: [260, 58, 40, 14], draw() { Art.sign(260, 58, 40, 'LOCKOUT / TAGOUT'); }, on: { LOOK: 'A sign that says "LOCKOUT / TAGOUT" over a tag reading "IT WAS LOCKED OUT BEFORE I GOT HERE". A cat sits on it as though supervising.' } }
  ],
  spots: spotsMix([[205, 82, 0, 'sit'], [33, 40, 0, 'loaf']], cl(20, 300, 134, 10), cl(20, 300, 38, 6), cl(30, 300, 84, 6)),
  exits: [ex('to_parts', 'parts', [300, 96, 20, 44], 'parts area', [20, 120], { stand: [304, 118] })]
};

// ---------- RACKS ----------
G.rooms.racks = {
  name: 'WAREHOUSE RACKS', start: [160, 126], walk: [10, 100, 305, 140], c1: 1,
  bg(t) { bgWarehouse(t, { wall: '#4f535e', floor: '#84847c' });
    for (let i = 0; i < 5; i++) { const x = 8 + i * 62; Art.rack(x, 14, 56, 64, 4, true, 60 + i); }
    // stored pallets shown
    const n = sortedCount('store'); for (let i = 0; i < Math.min(8, n); i++) { const x = 12 + (i % 4) * 14, y = 96 + Math.floor(i / 4) * 0; Art.loaded(240 + (i % 4) * 16, 84 + Math.floor(i / 4) * 16, 12, 8, PAL.filter(p => G.S.pal[p.code] === 'store')[i].col); } },
  props: [
    { id: 'rack14', name: 'rack 14 (gap)', r: [140, 30, 22, 48], vis: () => !F('tunnel_found'), draw() { R(140, 30, 22, 48, '#0a0a0a'); outline(140, 30, 22, 48, C.b); if (F('tunnel_found')) { R(146, 36, 10, 40, '#181818'); R(150, 60, 2, 10, C.Y); } txt('14', 151, 27, C.y, 5, 'center'); },
      on: { LOOK: async () => { if (!F('tunnel_found')) { await say('Rack 14. The bottom two levels are empty except for shadow. Cats keep walking into this gap, one after another, with purpose. None come out. It is a very organized disappearance.'); setF('saw_rack14'); } else await say('Rack 14: behind the pallet wall, an old conveyor tunnel. The cats knew.'); }, PUSH: 'It\'s a rack. It is bolted to the concrete and to a series of legal disclaimers.' },
      juno: async () => { if (F('tunnel_found')) return say('Juno wags at the tunnel. She thinks she invented it.'); await junoGo(146, 120); await junoGo(150, 100, 'sniff'); await sleep(600); await say('Juno noses along the base of the rack. A pallet that looked bolted down is just leaning. She shoulders it. Behind it: a dark opening, and a cat-shaped silhouette sitting in it like a doorman.'); await junoAnim('bark', 500); setF('tunnel_found'); await say('NARRATOR: A disused conveyor tunnel, hidden behind Rack 14, still marked "CONVEYOR 9". It goes somewhere. Cats go there.'); } },
    { id: 'storage', name: 'storage slots', r: [236, 78, 76, 36], draw() {}, on: { LOOK: async () => { const n = sortedCount('store'); await say(n === 0 ? 'The storage slots are ready to receive freight. A sign says "STORAGE: PLEASE PUT WHERE IT BELONGS" and someone has added "(WMS: HAHA)".' : `Eight slots are designated for tonight's storage. Right now ${n} of them contain the correct freight, each one scanned into the right rack location.`); }, scan: async () => { await say(`SCANNER: RACK STORAGE — ${sortedCount('store')}/8 loads stored correctly. The scanner agrees with the rack. This is the first time this week.`); } } },
    { id: 'sign14', name: 'rack sign', r: [168, 16, 44, 10], draw() { Art.sign(168, 16, 44, 'MAX LOAD 4000 LB'); }, on: { LOOK: 'MAX LOAD: 4,000 LB. Under it, a piece of paper: "MAX CATS: (see: cats)."' } }
  ],
  spots: spotsMix([[150, 92, 0, 'sit'], [84, 12, 0, 'loaf']], cl(14, 300, 136, 10), cl(10, 300, 42, 8), cl(10, 300, 64, 8), cl(10, 300, 26, 8), cl(20, 300, 130, 6)),
  exits: [ex('to_floor', 'floor', [140, 140, 50, 4], 'warehouse floor', [250, 108], { stand: [160, 140] }),
    ex('to_tunnel', 'tunnel', [140, 30, 22, 48], 'conveyor tunnel', [30, 122], { stand: [150, 100], vis: () => F('tunnel_found'), look: 'The hidden tunnel behind rack 14.' })]
};
G.rooms.racks.exits[0].r = [110, 138, 100, 6];

// ---------- TUNNEL ----------
G.rooms.tunnel = {
  name: 'CONVEYOR 9 TUNNEL', start: [30, 122], walk: [10, 106, 305, 138], c1: 1,
  bg(t) { R(0, 0, SW, SH, '#0a0a10'); R(0, 0, SW, 144, '#101018'); for (let x = 0; x < SW; x += 32) { R(x, 0, 2, 100, '#1a1a24'); } R(0, 96, SW, 8, '#2a2a32'); for (let x = 0; x < SW; x += 6) vline(x, 96, 8, '#3a3a44'); R(0, 106, SW, 38, '#1c1c20'); dith(0, 104, SW, 4, '#303038', '#1c1c20'); ctx.fillStyle = 'rgba(255,240,180,.16)'; ctx.beginPath(); ctx.arc(160, 40, 90, 0, 6.3); ctx.fill(); R(150, 20, 20, 3, C.g1); R(148, 3, 24, 3, C.g1); },
  props: [
    { id: 'graffiti', name: 'graffiti', r: [60, 30, 90, 30], draw() { txt('PRUDENCE WAS HERE', 104, 42, '#c08040', 7, 'center'); txt('(officially)', 104, 52, '#80604a', 5, 'center'); }, on: { LOOK: 'Painted on the tunnel wall: PRUDENCE WAS HERE (officially). Under it, in a different hand: "no she wasn\'t." Under that: "yes she was."' } },
    { id: 'conv9', name: 'conveyor 9', r: [0, 92, 320, 14], draw() {}, on: { LOOK: 'An abandoned conveyor, silent since a Regional "efficiency" audit in 2016 decided it was efficient to stop.', PUSH: 'It has not moved in years. Hollis is not going to be the one to change that.' } },
    { id: 'mug', name: 'coffee mug', r: [236, 92, 8, 8], draw() { R(236, 94, 6, 6, C.w); R(242, 96, 2, 3, C.w); }, on: { LOOK: 'A coffee mug, cold. It says WORLD\'S OKAYEST EMPLOYEE. A very small cat is asleep in it.' } }
  ],
  spots: spotsMix([[240, 96, 0, 'sleep'], [80, 96, 0, 'sit']], cl(12, 300, 126, 8), cl(20, 300, 92, 6)),
  exits: [ex('to_racks', 'racks', [0, 100, 10, 40], 'back to the racks', [160, 122], { stand: [14, 120] }),
    ex('to_suite', 'suite', [300, 100, 20, 40], 'toward the light', [40, 122], { stand: [306, 120], look: 'The tunnel ends at a service door marked "SERVER CLOSET — REGIONAL". It is open a crack. A cat is holding it.', lock: (s) => { if (!F('halvorsen_scene_done')) { say('Hollis can hear voices beyond the door and decides now is not the moment. He should wrap up the shift first.'); return true; } const miss = G.story.missingEvidence(); if (miss.length) { say(['Hollis stops at the door. He is not walking into a Regional Review without proof.', 'Still missing: ' + miss.join('; ') + '.']); return true; } return false; } })]
};

// ---------- STAGING ----------
G.rooms.staging = {
  name: 'STAGING LANES', start: [160, 104], walk: [10, 100, 305, 140], c1: 2,
  bg(t) { bgWarehouse(t, { wall: '#4f535e', floor: '#8c8c84', nolane: true });
    for (let l = 0; l < 4; l++) { const x = 10 + l * 76; R(x, 60, 70, 2, C.y); R(x, 96, 70, 2, C.y); R(x, 60, 2, 38, C.y); R(x + 68, 60, 2, 38, C.y); txt('LANE ' + 'ABCD'[l], x + 35, 58, C.y, 5, 'center'); }
    R(10, 100, 300, 2, C.y); for (let x = 10; x < 300; x += 20) R(x, 104, 8, 34, 'rgba(255,255,255,.05)'); },
  props: (function () {
    const arr = [];
    PAL.forEach((p, i) => { const [x, y] = palPos(i); arr.push({ id: 'pal_' + p.code, name: 'pallet ' + p.code, r: [x, y - 10, 32, 34], vis: (s) => !s.pal[p.code], z: y + 22, stand: [x + 16, Math.min(y + 40, 138)],
      draw() { Art.pallet(x, y + 18, 32); Art.box(x + 1, y + 2, 30, 16, p.col); if (p.dot) { R(x + 24, y + 4, 4, 4, p.dot === 'o' ? C.o : C.b); } if (p.code === 'B1' && !F('cats_migrated')) { for (let k = 0; k < 12; k++) Art.cat(x + 3 + (k % 6) * 5, y + 8 + Math.floor(k / 6) * 6, 500 + k, 'sleep'); } txt(p.code, x + 14, y + 13, 'rgba(0,0,0,.6)', 5, 'center'); },
      mintTag: () => p.real.split(' (')[0].slice(0, 22),
      on: { LOOK: async () => { await say(`Pallet ${p.code}, wrapped and labeled. The label says one thing. The pallet looks like it might mean another.` + (p.dot ? ' There is a chalk dot on the corner in Bruno\'s handwriting.' : ' There is no dot from Bruno.')); if (p.code === 'B1' && !F('cats_migrated')) await say('There are twelve cats sleeping on it. It is the warmest pallet in the building: a 48-volt battery pack, quietly radiating.'); },
        PUSH: 'Hollis leans on it. He needs a pallet jack to do this properly, and possibly a plan.', PULL: 'Best practice is not to pull a loaded pallet by hand. The narrator has read the module.', OPEN: 'The shrink wrap is very committed.', TAKE: 'Hollis cannot take a pallet. He can move a pallet with the correct equipment.' },
      scan: async () => { await scanPallet(i); },
      useOn: { jack: () => sortPallet(i), scanner: () => scanPallet(i) } }); });
    arr.push({ id: 'bowl3', name: 'cat food bowl', r: [24, 130, 10, 6], vis: () => !F('bowl3_taken'), draw() { Art.bowl(24, 130); }, on: { LOOK: 'A bowl of kibble under a sign: "STAGING LANE NOT-A-FEEDING-STATION". Tucker\'s handwriting. Tucker\'s pawprints. A truly heroic quantity of cat prints.', TAKE: async () => { setF('bowl3_taken'); G.S.f.bowls = (G.S.f.bowls || 0) + 1; giveItem('bowl'); await say('Hollis collects the third bowl. He feels like he has just closed a very small door on a very big problem.'); } } });
    arr.push({ id: 'plan_board', name: 'staging board', r: [10, 12, 60, 26], draw() { R(10, 12, 60, 26, C.w); outline(10, 12, 60, 26, C.g3); if (F('staging_empty')) { txt('STAGING: CLEAR', 40, 22, C.G, 4.6, 'center'); txt('8 shipped / 8 stored', 40, 29, C.k, 4, 'center'); return; } txt('STAGING: OCCUPIED', 40, 22, C.r, 4.6, 'center'); txt('by INBOUND freight', 40, 29, C.k, 4, 'center'); txt('outbound cannot stage', 40, 35, C.k, 4, 'center'); }, on: { LOOK: () => say(F('staging_empty') ? 'The staging board now reads CLEAR. Someone has drawn a small, smug cat next to it.' : 'A board announcing that staging is occupied by inbound freight and that outbound freight will therefore be "assigned space at a later date". It is the later date.') } });
    return arr;
  })(),
  spots: spotsMix([[60, 58, 0, 'sit']], cl(12, 305, 140, 12), cl(12, 305, 100, 10), cl(12, 305, 62, 8), cl(12, 305, 30, 6)),
  exits: [ex('to_floor', 'floor', [130, 96, 60, 6], 'warehouse floor', [150, 136], { stand: [160, 100] }), ex('to_inbound', 'inbound', [0, 100, 8, 40], 'inbound docks', [280, 118], { stand: [12, 120] }), ex('to_out', 'outbound', [312, 100, 8, 40], 'outbound docks', [30, 118], { stand: [306, 120] })]
};
G.rooms.staging.exits[0].r = [130, 138, 60, 6]; G.rooms.staging.exits[0].stand = [160, 139]; G.rooms.staging.exits[0].enter = [150, 108];
async function scanPallet(i) {
  const p = PAL[i]; Snd.play('scan');
  if (p.bad && !G.S.mintOn && p.code !== 'A1' && p.code !== 'A2' && !F('swap_fixed_scan_' + p.code)) { }
  const truthVisible = !p.bad || G.S.mintOn || F('pal_true_' + p.code);
  if (!G.S.mintOn && p.bad) { setF('scanned_' + p.code); await say([`SCANNER: PALLET ${p.code} — LABEL: "${p.sys}".`, 'SCANNER: PHYSICAL CHECK: serial data CORRUPTED. Label and freight do not correlate. Confidence: low. Try again with better vision.']); if (p.code === 'A3' || p.code === 'A4') { setF('routing_found'); await say('HOLLIS: Reach trucks. Marked for Nebraska. The manifest said Tennessee.'); } return; }
  if (G.S.mintOn && p.bad) { setF('true_' + p.code); await say([`SCANNER: PALLET ${p.code} — LABEL: "${p.sys}".`, `MINT VISION: PHYSICAL TRUTH — ${p.real}.`, `MINT VISION: The label and the freight have never met. ${p.dest === 'ship' ? 'It matches the Kestrel order.' : 'It is not on the Kestrel order.'}`.replace(/It matches.*|It is not on.*/, p.dest === 'ship' ? 'Something on the Kestrel order matches this.' : 'Nothing on the Kestrel order matches this.')]); return; }
  setF('scanned_' + p.code); await say([`SCANNER: PALLET ${p.code} — ${p.real}. Label: "${p.sys}". Label matches freight. ${p.dest === 'ship' ? 'On the Kestrel PO.' : 'Not on the Kestrel PO.'}`]);
}
async function sortPallet(i) {
  const p = PAL[i], S = G.S;
  if (!has('jack')) return say('Hollis needs a pallet jack for this. Something that doesn\'t leak hydraulic fluid on his boots. Ideally Bruno\'s.');
  if (!F('sort_open')) return say(['NARRATOR: The WMS has this pallet on "RECONCILIATION HOLD" until its records are fixed. The system will not let Hollis move it, or, more accurately, will not let the system move it, which is the same thing.', 'HOLLIS: I\'m not asking the system.', 'NARRATOR: The pallet jack disagrees. The pallet jack has a chip in it.']);
  if (p.code === 'B1' && !F('cats_migrated')) return say(['Twelve cats are sleeping on it.', 'BRUNO: (radio) I don\'t load pallets with a cat on it. Or twelve. I have a policy.', 'NARRATOR: The policy is his own. It is sound.']);
  await say(`Hollis slides the pallet jack under ${p.code}. It groans with mechanical trust.`);
  await menu([['Send to OUTBOUND (ships to Kestrel)', async () => { await sortResult(p, 'ship'); }], ['Send to RACKS (storage)', async () => { await sortResult(p, 'store'); }], ['Leave it', null]], 'PALLET ' + p.code + ' — WHERE?');
}
async function sortResult(p, where) {
  const S = G.S;
  if (p.dest !== where) {
    Snd.play('bump'); S.time = Math.min(S.time + 3, ACT_CAP[S.act]); S.f.sortmistakes = (S.f.sortmistakes || 0) + 1;
    const msg = where === 'ship' ? [`BRUNO: (radio) Hold up! That's not on the Kestrel PO. It's ${nice(p.real)}. Bring it back.`] : [`BRUNO: (radio) Hold up! That's ${nice(p.real)}. That's on the Kestrel PO. It's supposed to ship.`];
    await say(['Hollis starts to move it. Two seconds later the jack pulls hard to one side and a small chorus of forklift horns delivers a verdict.'].concat(msg).concat(['Hollis brings it back to its lane, as though nothing happened. Three minutes of the morning are gone.'])); return;
  }
  if ((p.code === 'A6' || p.code === 'A7') && !has('kibble') && !(F('trail_floor') && F('trail_out') && F('trail_yard'))) { await say('Before it goes, Hollis slits the wrap and scoops some kibble into a tote lid. This pallet is not a counterweight, and the cats will need a trail.'); giveItem('kibble'); setF('took_kibble'); setF('cat_source_known'); }
  S.pal[p.code] = where; Snd.play('pallet');
  await say(`Pallet ${p.code}: ${where === 'ship' ? 'OUTBOUND' : 'STORAGE'}. Correct. The scanner chirps a note of professional respect.`);
  const n = PAL.filter(q => S.pal[q.code]).length;
  if (n === 16) { setF('staging_empty'); await say(['The last pallet leaves the lane. The staging lanes are empty. Every line is painted concrete. It is beautiful.', `NARRATOR: Eight loads to the outbound dock. Eight loads to storage. Nothing duplicated. Nothing missing. Somewhere, a spreadsheet feels seen.`, 'HOLLIS: That\'s sixteen.']); }
}

// ---------- INBOUND ----------
G.rooms.inbound = {
  name: 'INBOUND DOCKS', start: [280, 118], walk: [10, 104, 305, 140], c1: 1,
  bg(t) { bgWarehouse(t, { wall: '#585c68', floor: '#8a8a82' }); for (let i = 0; i < 4; i++) { const x = 20 + i * 70; const isT = i === 0 || i === 2; Art.dockDoor(x, 30, 44, 44, true, isT); if (isT) { Art.trailer(x + 4, 42, 36, 30, i === 0 ? 'T-4417' : 'T-4418', C.g1); } R(x, 74, 44, 4, C.Y); txt((i === 3 ? 'DOOR 9' : 'DOOR ' + (i * 2 + 2)), x + 22, 28, C.y, 5, 'center'); }
    R(250, 30, 44, 44, F('door9_closed') ? C.g1 : '#101010'); },
  props: [
    { id: 't4417', name: 'trailer T-4417', r: [24, 42, 38, 34], draw() {}, mintTag: 'T-4417: 8 LOADS (TN)', on: { LOOK: async () => { await say('Trailer T-4417, inbound from Tennessee. It is empty now — the pallets have all been moved to staging. The manifest says 8 loads.' + (F('page2_have') ? ' Both pages are accounted for now. One has a paw print.' : ' The manifest is missing page 2.')); }, OPEN: 'Already open, and empty, and smelling faintly of fish.' }, scan: async () => { Snd.play('scan'); await say('SCANNER: T-4417 — 8 loads inbound (Tennessee). ' + (F('page2_have') ? 'Manifest pages: 2 of 2 (page 2 recovered from a cat).' : 'Manifest pages: 1 of 2. Page 2: NOT FOUND. Cat: FOUND.')); if (G.S.mintOn) setF('t4417_scanned'); } },
    { id: 't4418', name: 'trailer T-4418', r: [164, 42, 38, 34], draw() {}, mintTag: 'T-4418: 8 LOADS', on: { LOOK: 'Trailer T-4418, the second inbound. Another eight loads, now sitting in staging. The dock plate has a small collection of paw prints across it.', OPEN: 'Empty. Something in the corner has left.' }, scan: async () => { Snd.play('scan'); await say('SCANNER: T-4418 — 8 loads inbound. Manifest pages: 2 of 2. Match: partial. Confidence: "meh".'); } },
    { id: 'door9', name: 'dock door 9', r: [250, 30, 44, 46], draw() { if (!F('door9_closed')) { R(252, 32, 40, 42, '#101010'); Art.pawprints(256, 90, 6); R(250, 74, 44, 4, C.Y); } }, stand: [272, 96],
      on: { LOOK: async () => { if (F('door9_closed')) return say('Dock door 9, shut for the first time in weeks. The seal is torn but the door works.'); await say('Dock door 9, ROLLED UP since who-knows-when. The seal is torn. There is a line of paw prints leading in from the yard and a second line, much smaller, leading in behind them.'); setF('saw_door9'); }, PUSH: async () => { if (F('door9_closed')) return say('It is shut. It is done.'); if (!F('cats_migrated')) { return say('A cat is sitting in the doorway, not moving. Closing it would be theft of a cat\'s front door. It may be best to solve the actual problem first.'); } setF('door9_closed'); await say('Hollis rolls door 9 shut. It closes with a satisfying WHUMP. The last of the outside comes to an end.'); }, PULL: () => P('inbound', 'door9').on.PUSH(), OPEN: 'It\'s open. That is the problem.' } },
    { id: 'lprinter', name: 'label printer', r: [110, 84, 22, 16], draw() { R(110, 88, 22, 12, C.g2); outline(110, 88, 22, 12, C.g4); R(113, 84, 16, 4, C.w); if (F('labels_running') && !F('labels_stopped')) { for (let k = 0; k < 5; k++) Art.label(112 + k * 3, 100 + ((G.t * 30 + k * 7) % 32)); } if (F('labels_stopped')) { for (let k = 0; k < 10; k++) Art.label(100 + k * 4, 130 + (k % 2) * 3); } },
      on: { LOOK: async () => { await say('The inbound label printer. It has a small screen showing "TEMPLATES: 000 (TEST), 001 (RECEIVING), 002 (OUTBOUND)...". Template 000 is marked "ADMIN — GROUND TRUTH REFERENCE — DO NOT USE".'); setF('saw_template000'); }, USE: 'It is printing. It will print until it stops. It is not currently interested in negotiations.', PULL: async () => { if (F('labels_stopped')) return say('The plug is already out.'); setF('labels_stopped'); await say('Hollis yanks the plug. The printer exhales one last label and dies. Four hundred labels cover the floor like confetti at a very boring parade.'); } },
      scan: async () => { Snd.play('scan'); setF('saw_template000'); await say('SCANNER: LABEL PRINTER — TEMPLATE 000: "GROUND TRUTH REFERENCE (ADMIN, HALO INSTALL TECH USE ONLY)". Last printed: 1 label. By: TUCKER. "Test".'); await J('Tucker printed the admin label.'); } },
    { id: 'tucker_lbl', name: 'Tucker', npc: true, r: [170, 84, 18, 36], vis: (s) => s.tuckerAt === 'floor' && s.act >= 2 && !F('labels_stopped') && !F('tucker_labels_done'), draw() { Art.npc('tucker', 180, 122, { facing: -1 }); }, on: { TALK: () => talkTucker(), LOOK: 'Tucker is standing in a river of labels, holding the printer\'s cable in one hand and a cheerful expression.' } },
    { id: 'clip', name: 'dock clipboard', r: [64, 90, 12, 12], draw() { Art.clipboard(66, 90); }, on: { LOOK: 'The dock clipboard: seal numbers, receiving times, one entry that says "cat?" with a question mark and a checkmark simultaneously.' } },
    { id: 'seal', name: 'seal broken', r: [208, 110, 26, 12], draw() { R(210, 114, 22, 4, C.k); R(216, 112, 4, 2, C.R); R(224, 112, 3, 2, C.R); }, on: { LOOK: 'A broken trailer seal on the floor, number 88112, cut cleanly. Not by any tool in the building. By a very, very determined person or an extremely sharp cat.' }, scan: 'SCANNER: SEAL 88112 — Status: BROKEN. Trailer: T-4417. Time cut: Friday, 4:07 AM. Wait... that\'s the time the label printer was also printing. Coincidence: rated 3%.' }
  ],
  spots: spotsMix([[272, 76, 0, 'sit'], [116, 82, 0, 'loaf']], cl(14, 300, 136, 10), cl(16, 300, 74, 8), cl(24, 62, 76, 3), cl(164, 202, 76, 3), cl(20, 300, 120, 6)),
  exits: [ex('to_staging', 'staging', [310, 100, 10, 40], 'staging lanes', [20, 120], { stand: [306, 120] }), ex('to_yard', 'yard', [130, 138, 60, 6], 'trailer yard', [110, 104], { stand: [160, 139] })],
  async onEnter() { if (G.S.act >= 2 && !F('tucker_labels_done') && !F('labels_stopped') && G.S.tuckerAt === 'floor') { setF('labels_running'); Snd.play('printer'); await say(['TUCKER: HOLLIS! GOOD NEWS AND BAD NEWS! The label printer is printing labels!', 'HOLLIS: What\'s the bad news?', 'TUCKER: It won\'t stop! (beat) Also I\'ve been standing here for eleven minutes.', 'NARRATOR: Labels are landing everywhere. Each says "TEST TEST TEST" and, in tiny print, "T."']); } }
};

// ===== rooms C: outbound, yard, smoking, drain, management, suite, call scenes =====
const DLOC = ['yard', 'drain', 'smoke', 'yard'];
const dstage = () => ({ 1: 0, 2: 0, 3: 1, 4: 2, 5: 3, 6: 3 })[G.S.act] || 0;
const torvaldHere = (rid) => DLOC[dstage()] === rid && !(F('torvald_at_dock') && !F('torvald_left'));
const torvaldVisible = (rid) => torvaldHere(rid) && F('dfound' + dstage());
const torvaldProps = (rid, pos, hideDraw) => [
  { id: 'torvald', name: 'Torvald', npc: true, r: [pos[0] - 11, pos[1] - 42, 24, 44], vis: () => torvaldVisible(rid), draw(t) { Art.npc('torvald', pos[0], pos[1], { facing: -1 }); ctx.fillStyle = 'rgba(220,220,220,.5)'; for (let i = 0; i < 3; i++) ctx.fillRect(pos[0] + 8 + Math.sin(t * 2 + i) * 2, pos[1] - 42 - i * 4 - ((t * 6) % 6), 3, 2); },
    on: { TALK: () => talkTorvald(), LOOK: 'Torvald. Six-foot-four of Viking, in a hi-vis vest and a fur collar, holding a cigarette like a very small torch. He looks at Hollis with the patience of a tide.' }, giveTo: { '*': async () => say('TORVALD: (taking it, turning it over, handing it back) No.') }, scan: 'SCANNER: TORVALD — Class: SPOTTER (in principle). Location: OUTSIDE. Confidence: 0%. Notes: "always has what you need; nobody asked why."' },
  { id: 'torvald_ghost', name: 'something warm', mintOnly: true, r: [pos[0] - 11, pos[1] - 42, 24, 44], vis: () => torvaldHere(rid) && !torvaldVisible(rid), mintTag: 'TORVALD (SMOKING)', draw(t) { ctx.globalAlpha = 0.5 + Math.sin(t * 5) * 0.2; Art.npc('torvald', pos[0], pos[1], { facing: -1 }); ctx.globalAlpha = 1; },
    on: { LOOK: async () => { await revealTorvald(rid); }, TALK: async () => { await revealTorvald(rid); talkTorvald(); } } },
  { id: 'ground', name: 'the ground', onlyVerb: 'JUNO', r: [0, 96, 320, 44], z: 0, draw() {}, juno: null, on: { JUNO: async () => { await junoSearchTorvald(rid); } } }
];
async function revealTorvald(rid) { setF('dfound' + dstage()); await say('MINT VISION: a warm, tall, cigarette-shaped heat signature resolves into Torvald, who is standing exactly where he was standing.'); }
async function junoSearchTorvald(rid) {
  const stage = dstage();
  if (F('dfound' + stage)) return say('Juno has already found Torvald this round. She looks smug about it.');
  if (!has('dglove') && !F('scent_taken')) return say('Juno sniffs around, but doesn\'t know who Hollis wants. She needs a scent: something Torvald wore or touched.');
  if (torvaldHere(rid)) {
    await junoGo(G.S.jx + 30, G.S.jy, 'sniff'); await sleep(500); await junoAnim('bark', 700);
    setF('dfound' + stage); await say(['Juno freezes, points her nose at a spot that looks entirely like nothing, and barks twice.', 'TORVALD: (from behind an object) ...Aw, c\'mon.']);
  } else {
    const dir = { yard: 'the yard', drain: 'the drainage area', smoke: 'the smoking area' }[DLOC[stage]];
    await junoGo(G.S.jx + 20, G.S.jy, 'sniff'); await sleep(500); await say(`Juno sniffs, lifts her head, and looks pointedly toward ${dir}. She has the scent. It is not here.`);
  }
}
const reachTruck = (x, y, dir = 1) => Art.forklift(x, y, 'reach', dir);

// ---------- OUTBOUND ----------
G.rooms.outbound = {
  name: 'OUTBOUND DOCKS', start: [30, 120], walk: [10, 104, 305, 140], c1: 1,
  bg(t) { bgWarehouse(t, { wall: '#585c68', floor: '#8a8a82' }); for (let i = 0; i < 4; i++) { const x = 40 + i * 66; const has3 = i === 2 && F('t9022_at_dock') && !F('departed'); Art.dockDoor(x, 30, 44, 44, true, has3); if (has3) { Art.trailer(x + 2, 40, 40, 34, 'T-9022', C.w); } R(x, 74, 44, 4, C.Y); txt('DOOR ' + (i + 1), x + 22, 28, C.y, 5, 'center'); }
    const l = F('departed') ? 'red' : (G.dockLight || (F('t9022_at_dock') ? 'green' : 'red')); R(132, 20, 12, 5, C.k); R(133, 21, 3, 3, l === 'red' ? C.R : '#400'); R(137, 21, 3, 3, l === 'yellow' ? C.y : '#440'); R(140, 21, 3, 3, l === 'green' ? C.G : '#040'); },
  props: [
    { id: 'bruno', name: 'Bruno', npc: true, r: [62, 82, 22, 42], vis: () => true, draw() { Art.npc('bruno', 74, 120, { facing: 1 }); }, on: { TALK: () => talkBruno(), LOOK: 'Bruno, lead loader. Forearms like drums, gloves like hams, and the calm of a man who knows which pallet is going where and won\'t discuss it before coffee.' }, giveTo: { seal: async () => { await repairJack(); }, '*': async () => say('BRUNO: Not a loader thing. What do you need?') }, scan: 'SCANNER: BRUNO — Reliability: 96%. Shortcuts: 14. Explainability of shortcuts: pending. Notes: "does not load pallets containing a cat".' },
    { id: 'brokenjack', name: 'broken pallet jack', r: [96, 108, 28, 16], vis: () => !F('bruno_jack_fixed'), draw() { Art.palletJack(112, 124, 1); ctx.fillStyle = 'rgba(30,20,10,.5)'; ctx.fillRect(100, 124, 10, 2); R(100, 122, 2, 2, C.k); }, stand: [110, 128],
      on: { LOOK: 'Bruno\'s pallet jack. It has a slow hydraulic leak leaving a tiny puddle the shape of a bad week. It lowers slowly. It raises when it feels like it.', PUSH: 'Hollis pushes the pallet jack. It goes about eight inches and then reconsiders.', TAKE: 'It\'s Bruno\'s. Hollis is not going to take it. Not until it works, anyway.', USE: 'Hollis tries to lift the jack. The forks fall like a sigh.' }, useOn: { seal: () => repairJack() }, scan: 'SCANNER: PALLET JACK #4 — LEAK: yes. Seals: 0/1. Bruno\'s notes: "I keep meaning to."' },
    { id: 'whiteout', name: 'load plan board', r: [222, 84, 50, 22], draw() { R(222, 84, 50, 22, C.w); outline(222, 84, 50, 22, C.g3); txt('LOAD PLAN: KESTREL', 247, 92, C.r, 4, 'center'); txt('DOOR 3 / T-9022', 247, 99, C.k, 4.4, 'center'); txt(F('departed') ? 'SHIPPED 11:59 ✓' : F('loaded8') ? '8 LOADS ✓' : '8 LOADS — ?', 247, 105, F('loaded8') ? C.G : C.b, 4.4, 'center'); },
      on: { LOOK: async () => { await say('The load plan. "KESTREL — DOOR 3 — TRAILER T-9022 — 8 LOADS." Bruno has drawn eight little boxes and, next to each, a small colored dot. Two colors: orange and blue.' + (F('departed') ? ' All eight boxes are ticked. Next to them: "11:59".' : F('loaded8') ? ' All eight boxes are ticked.' : '')); setF('saw_dots'); } } },
    { id: 'door3', name: 'dock door 3', r: [172, 30, 44, 46], draw() {}, on: { LOOK: async () => { if (F('departed')) await say('Door 3 is empty again. T-9022 pulled out at 11:59, sealed 88120, eight loads aboard. The dock plate is up. The light is red, which is correct.'); else if (F('t9022_at_dock')) await say('Door 3. T-9022 is finally in it, doors open, dock plate down, and the light is green. It is a pretty sight.'); else await say('Door 3 is empty. The computer says T-9022 is here. The computer has said that since Friday.'); }, PUSH: () => say(F('t9022_at_dock') && !F('departed') ? 'The trailer is seated. Pushing it would be a strange way to celebrate.' : 'The dock door is up. It does not need to be pushed. It needs a trailer.') }, scan: async () => { Snd.play('scan'); if (!F('t9022_at_dock')) { await say('SCANNER: DOOR 3 — TRAILER: T-9022 (per WMS). PHYSICAL: EMPTY. Search radius 0.5 miles: NOT FOUND.'); setF('door3_scanned'); } else if (F('departed')) await say('SCANNER: DOOR 3 — EMPTY. Last trailer: T-9022, DEPARTED 11:59, seal 88120. Confidence: high.'); else await say('SCANNER: DOOR 3 — T-9022 SEATED. Seal: available. Confidence: high.'); } },
    { id: 'queue', name: 'outbound queue', r: [130, 100, 60, 26], vis: () => sortedCount('ship') > 0 && !F('loaded8'), z: 130, draw() { const ship = PAL.filter(p => G.S.pal[p.code] === 'ship'); ship.forEach((p, i) => Art.loaded(134 + (i % 4) * 14, 108 + Math.floor(i / 4) * -10, 12, 8, p.col)); }, on: { LOOK: async () => { await say(`The outbound queue, at Door 3. ${sortedCount('ship')} of 8 Kestrel loads are lined up and waiting for a trailer to land.`); } } },
    { id: 'torvald_dock', name: 'Torvald', npc: true, r: [176, 84, 24, 42], vis: () => F('torvald_at_dock') && !F('torvald_left'), draw() { Art.npc('torvald', 188, 122, { facing: -1 }); }, on: { TALK: async () => { if (!has('sightlog')) { setF('torvald3_done'); await say(['TORVALD: Before I go stand somewhere useful. Here.', 'TORVALD: My smoke log. Friday, 4:07 AM, inbound kiosk: HALO printed a directive, approved it, and thanked itself. Nobody there but me and a cat. If anyone asks, I was on break.']); await take('sightlog', 'Torvald hands over a grease-stained notebook: "SMOKE LOG". An eyewitness account, with a small doodle of a Viking looking at a machine.'); } return say('TORVALD: I\'m standing here. It\'s dock 3. I\'m holding a radio. I\'m being a spotter. Don\'t make it weird.'); }, LOOK: 'Torvald, at dock 3. On time. It is like watching a rare bird. Nobody is speaking too loudly.' } },
    { id: 'tucker_door', name: 'Tucker', npc: true, r: [260, 84, 18, 40], vis: () => F('tucker_at_door'), draw() { Art.npc('tucker', 268, 122, { facing: -1, pose: 'stand' }); }, on: { TALK: () => say('TUCKER: I\'m holding the door. I\'m doing it. I\'m not moving. (a long pause) Is it working?'), LOOK: 'Tucker, standing in the outbound side door with his arms out. It is the most disciplined thing anyone has ever seen him do.' } },
    { id: 'route_out', name: 'kibble trail spot', onlyItem: 'kibble', r: [130, 116, 150, 24], z: 0, draw() { if (F('trail_out')) for (let i = 0; i < 10; i++) R(140 + i * 14, 132 + (i % 2) * 3, 2, 2, C.N); }, on: {}, useOn: { kibble: async () => { if (F('trail_out')) return say('The trail is laid. Any more and it becomes a buffet.'); setF('trail_out'); await say('Hollis lays a thin line of kibble along the outbound apron toward the yard. It smells like a suggestion.'); } } },
    { id: 'wrapped', name: 'shrink wrap', r: [10, 92, 26, 34], draw() { Art.shrink(10, 92, 26, 34); R(14, 108, 18, 10, C.N); }, on: { LOOK: 'A pallet, shrink-wrapped by someone who was clearly working out feelings. There is a cat inside. A cat has set up in the gap under the wrap, entirely free and unbothered.', OPEN: 'The cat regards Hollis. Hollis regards the cat. They leave it there.' } }
  ],
  spots: spotsMix([[20, 100, 0, 'sleep'], [200, 100, 0, 'sit'], [250, 84, 0, 'loaf']], cl(14, 300, 136, 10), cl(40, 290, 76, 8), cl(40, 290, 122, 6)),
  exits: [ex('to_floor', 'floor', [0, 96, 10, 44], 'warehouse floor', [296, 118], { stand: [12, 118] }), ex('to_staging', 'staging', [130, 138, 100, 6], 'staging lanes', [300, 122], { stand: [160, 139] }), ex('to_yard', 'yard', [290, 96, 30, 44], 'trailer yard', [40, 112], { stand: [300, 118] })]
};
G.rooms.outbound.props.push(...torvaldProps('outbound', [200, 120]).slice(0, 0));

async function repairJack() {
  if (F('bruno_jack_fixed')) return say('The jack is fixed. It hisses only in contentment.');
  await say('Hollis holds up the hydraulic seal kit. Bruno\'s eyes go wide, then narrow, then wide.');
  await say('BRUNO: Is that an H-17? Where did you find that? I\'ve been asking Parts for that seal since March. (He stops.) Nobody\'s in Parts. (He starts again.) Who let you into Parts?');
  await J('Someone with an old key.');
  await say('BRUNO: Don\'t tell me. Actually, do tell me.'); await say('Bruno drops to a knee and works the seal into the jack. It fizzes, then hums. The jack rises. It lowers. It rises again. The puddle stops.');
  setF('bruno_jack_fixed'); loseItem('seal'); setF('bruno_legend_offer'); await say('BRUNO: She\'s alive. (He pats it.) Here — keep it. You\'ll need it more than me. I\'ve got another one, older, meaner. As for my dots — you were wondering, right?');
  await say('BRUNO: Orange dot: goes on my truck. Blue dot: stays inside. No dot: I never touched it, usually because there was a cat on it, or I didn\'t like the look of the label.');
  setF('bruno_legend'); await take('jack', 'Bruno hands Hollis the pallet jack. It is, somehow, going into Hollis\'s pocket. The inventory has no size limit; this is a design decision shared by every adventure game since 1984.');
}

// ---------- YARD ----------
G.rooms.yard = {
  name: 'TRAILER YARD', start: [110, 108], walk: [10, 100, 308, 140], c1: 1,
  bg(t) { bgOutside(t); R(0, 40, SW, 24, '#585c68'); for (let i = 0; i < SW; i += 6) vline(i, 40, 24, 'rgba(255,255,255,.06)'); R(0, 60, SW, 4, C.g3);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { const x = 6 + i * 52; if (rnd(r * 9 + i) > 0.3 || F('t9022_found') && r === 2 && i === 5) { Art.trailer(x, 70 + r * 6, 44, 20, r === 2 && i === 5 ? 'T-9022' : '', [C.g1, '#c8d0d8', '#d8c8b0'][(r + i) % 3]); } }
    R(0, 100, SW, 1, C.y); for (let x = 0; x < SW; x += 24) R(x, 122, 12, 1, C.y); txt('YARD ROW C', 30, 56, C.y, 5); },
  props: [
    { id: 'rufus', name: 'Rufus', npc: true, r: [22, 86, 44, 38], vis: () => true, z: 122, draw() { R(24, 108, 40, 14, C.o); R(28, 100, 22, 10, C.o); R(30, 102, 16, 8, C.B); R(24, 122, 10, 6, C.k); R(50, 122, 10, 6, C.k); R(58, 104, 6, 4, C.g1); Art.npc('rufus', 40, 104, { facing: 1, bust: true }); },
      on: { TALK: () => talkRufus(), LOOK: 'Rufus, yard driver. He drives a yard truck the way other people drive a chessboard: three moves ahead and no one else allowed to know why.' }, giveTo: { tally: async () => { await giveTally(); }, '*': async () => say('RUFUS: (not looking) Not now. I\'m counting.') }, scan: 'SCANNER: RUFUS — Trailers located: 41/41. Trailers per WMS: 12. Cats counted: 143 (last checked 40 seconds ago). Note: reliable.' },
    { id: 'row_c', name: 'trailer row C', r: [6, 70, 308, 24], draw() {}, on: { LOOK: async () => { await say('Row C, where the trailers sleep. The WMS says row C is empty and has been since Monday. There are five trailers in it, and a small tabby on each.'); } }, scan: async () => { await say('SCANNER: ROW C — WMS: 0 trailers. PHYSICAL: 5 trailers, 41 cats (approximate). Reconciliation: "ha".'); } },
    { id: 't9022', name: 'trailer T-9022', r: [266, 82, 46, 24], vis: () => F('t9022_found') && !F('t9022_at_dock'), draw() {}, on: { LOOK: async () => { await say('There it is: T-9022, the hot trailer, parked behind the building, exactly where Rufus\'s map says it is and exactly where the computer says it is not.'); }, PUSH: 'It is a trailer. Rufus drives it. Hollis does not.' }, scan: 'SCANNER: T-9022 — Location per WMS: DOOR 3. Physical: YARD, ROW C, SPOT 9. Seal: none (empty). Cats: 3 (visible).' },
    { id: 't31', name: 'trailer 31 (holding)', r: [176, 96, 76, 40], vis: () => F('t31_placed'), z: 128, draw() { Art.trailer(176, 100, 70, 26, 'T-31', '#d8e0e8'); R(178, 118, 66, 6, '#5a6a7a'); if (F('t31_bowls')) { Art.bowl(186, 118); Art.bowl(198, 118); Art.bowl(210, 118); } if (F('t31_blanket')) { R(218, 114, 20, 6, C.M); dith(218, 114, 20, 6, C.M, C.m); } },
      on: { LOOK: async () => { if (F('rescue_done')) return say('Trailer 31, empty again except for the pink blanket and three licked-clean bowls. Renata\'s vans took everyone. It still smells faintly of fish and gratitude.'); if (F('cats_migrated')) return say('Trailer 31, at the yard gate. It is full of cats, all of them asleep, most of them on the pink blanket. Renata\'s van is parked beside it. It is the calmest place on the property.'); await say((F('t31_bowls') || F('t31_blanket')) ? 'Trailer 31, set at the yard gate. Heated, with a loading ramp. It is starting to look like somewhere a cat would choose.' : 'Trailer 31, set at the yard gate. Empty, heated, with a loading ramp. Not much of a home yet. The interior is wide open and welcoming.'); const need = []; if (!F('t31_bowls')) need.push('food bowls'); if (!F('t31_blanket')) need.push('a blanket'); if (need.length) await say('It could use: ' + need.join(' and ') + '.'); else await say('It has bowls and bedding. It is, actually, kind of nice.'); }, OPEN: 'The trailer is already open. It is waiting for tenants.' },
      useOn: { bowl: async () => { if (F('t31_bowls') || (G.S.f.bowls || 0) < 3) { if (!F('t31_bowls')) return say('Hollis needs all three of the bowls for this. There should be one in the break room, one on the floor, and one in staging.'); return say('The bowls are already in place.'); } setF('t31_bowls'); loseItem('bowl'); await say('Hollis sets three bowls inside the trailer and fills them with a little of the good kibble. It looks intentional. It looks like a plan.'); }, blanket: async () => { if (F('t31_blanket')) return say('The blanket is already there. It looks luxurious.'); setF('t31_blanket'); loseItem('blanket'); await say('Hollis spreads the pink blanket on the trailer floor. The trailer looks, for the first time in its life, like it has a purpose beyond the transportation of cargo.'); }, kibble: async () => { if (F('t31_kibble')) return say('There\'s enough kibble in there to make a cat cry with joy.'); setF('t31_kibble'); await say('Hollis sprinkles some kibble at the far end of the trailer. Far-end kibble: the oldest trick in the book.'); } },
      scan: () => say(F('rescue_done') ? 'SCANNER: TRAILER 31 — Status: EMPTY (214 cats transferred to Whisker Ridge). Bedding: 1 pink blanket. Bowls: licked clean.' : F('cats_migrated') ? 'SCANNER: TRAILER 31 — Status: OCCUPIED (214). Function: "Temporary Holding". Confidence: "cautiously feline".' : 'SCANNER: TRAILER 31 — Status: EMPTY. Function: "Temporary Holding". Capacity: 250 cats (est.). Confidence: "cautiously feline".') },
    { id: 'route_yard', name: 'kibble trail spot', onlyItem: 'kibble', r: [10, 116, 300, 24], z: 0, draw() { if (F('trail_yard')) for (let i = 0; i < 10; i++) R(120 + i * 16, 128 + (i % 2) * 3, 2, 2, C.N); }, on: {}, useOn: { kibble: async () => { if (F('trail_yard')) return say('Already laid.'); setF('trail_yard'); await say('Hollis lays a kibble line from the dock door toward the yard gate.'); } } },
    { id: 'renata', name: 'Renata', npc: true, r: [270, 88, 22, 40], vis: () => F('rescue_here') && !F('rescue_done'), draw() { Art.npc('renata', 282, 126, { facing: -1 }); R(250, 112, 34, 14, '#e8e8e8'); R(252, 110, 28, 4, '#20a090'); }, on: { TALK: () => talkRenata(), LOOK: 'Renata from Whisker Ridge, holding a clipboard, a carrier, and a very serious commitment to kindness. Behind her: a van the size of a small apartment, marked with paw prints.' } },
    { id: 'gate', name: 'yard gate', r: [300, 60, 20, 60], draw() { R(308, 60, 12, 60, C.g2); for (let y = 62; y < 120; y += 4) hline(308, y, 12, C.g4); }, on: { LOOK: 'The yard gate. A sign says "ALL VISITORS MUST SIGN IN". Somebody has answered "I\'m a cat."' } }
  ].concat(torvaldProps('yard', [156, 104]).map(p => (p.id === 'torvald' || p.id === 'torvald_ghost') ? Object.assign(p, {}) : p)),
  spots: spotsMix([[290, 86, 0, 'sit'], [120, 92, 0, 'loaf'], [58, 74, 0, 'sleep']], cl(12, 300, 134, 10), cl(10, 300, 66, 10), cl(10, 300, 76, 8), cl(20, 300, 108, 8)),
  exits: [ex('to_inbound', 'inbound', [100, 96, 40, 10], 'inbound docks', [160, 122], { stand: [110, 102] }), ex('to_out', 'outbound', [200, 96, 40, 10], 'outbound docks', [290, 122], { stand: [220, 102] }),
    ex('to_smoke', 'smoke', [312, 100, 8, 40], 'smoking area', [30, 118], { stand: [304, 120] }), ex('to_drain', 'drain', [0, 100, 8, 40], 'drainage area', [290, 118], { stand: [16, 120] })]
};
// Torvald's hiding trailer in the yard: he's "behind trailer T-4418 (yard)"
G.rooms.yard.props.push({ id: 'hide_trailer', name: 'parked trailer', r: [140, 76, 34, 26], draw() { Art.trailer(140, 80, 34, 20, '', '#c8c8d0'); }, on: { LOOK: 'A trailer parked way, way out of place. The gap behind it is exactly Viking-shaped. Coincidence: 4%.' } });

// ---------- SMOKING ----------
G.rooms.smoke = {
  name: 'SMOKING AREA (OUTSIDE)', start: [30, 118], walk: [10, 100, 305, 140], c1: 1,
  bg(t) { bgOutside(t, { ground: '#727068' }); R(0, 40, 130, 34, '#585c68'); for (let i = 0; i < 130; i += 6) vline(i, 40, 34, 'rgba(255,255,255,.06)'); R(150, 62, 100, 6, C.g3); R(155, 68, 4, 34, C.g3); R(240, 68, 4, 34, C.g3); R(150, 58, 100, 4, '#886a3a'); for (let i = 0; i < 6; i++) R(150 + i * 17, 58, 2, 6, '#664a2a'); },
  props: [
    { id: 'shelter', name: 'smoking shelter', r: [150, 58, 100, 44], draw() {}, on: { LOOK: 'The smoking shelter. A bench, a bucket of sand, a sign that says "THANK YOU FOR NOT SMOKING HERE (We\'ve stopped checking)". A cat is on the roof, supervising.' } },
    { id: 'ashtray', name: 'butt bucket', r: [214, 100, 12, 12], draw() { R(214, 102, 12, 10, C.g3); R(214, 100, 12, 2, C.g1); R(218, 98, 1, 3, C.r); }, on: { LOOK: 'A bucket of sand containing the archaeology of a thousand breaks. On top: a fresh, neat Viking-brand cigarette, still warm. Torvald was here. Recently. And will be again.' }, scan: 'SCANNER: BUTT BUCKET — 1,204 cigarette butts. Estimated torvald-hours: 61. Note: "management has checked here. Twice. He was not here." Note: "he was."' },
    { id: 'stack', name: 'stacked equipment', r: [252, 70, 50, 34], draw() { Art.pallet(256, 96, 40); Art.pallet(256, 88, 40); Art.pallet(256, 80, 40); R(262, 72, 30, 4, C.Y); Art.forklift(280, 104, 'cushion', -1); R(252, 70, 8, 34, C.g3); }, on: { LOOK: async () => { await say('A stack of pallets and a parked forklift, leaning against each other like old friends. Someone has cleared a small, cozy gap between them. Management has checked here twice.'); }, PUSH: 'It is stable in ways Hollis does not want to test.' } },
    { id: 'route_smoke', name: 'ground', onlyItem: 'kibble', r: [10, 116, 300, 24], z: 0, draw() {}, on: {}, useOn: { kibble: 'This is not on the cat route. The cats will have to get to the yard on their own.' } }
  ].concat(torvaldProps('smoke', [220, 118])),
  spots: spotsMix([[200, 54, 0, 'sit'], [280, 68, 0, 'sleep']], cl(12, 300, 136, 8), cl(12, 300, 108, 6), cl(150, 250, 56, 4)),
  exits: [ex('to_yard', 'yard', [0, 100, 8, 40], 'trailer yard', [290, 118], { stand: [14, 120] })]
};
G.rooms.smoke.props.forEach(p => { if (p.id === 'torvald' || p.id === 'torvald_ghost') p.r = [200, 76, 24, 44]; });

// ---------- DRAIN ----------
G.rooms.drain = {
  name: 'DRAINAGE AREA', start: [290, 118], walk: [10, 100, 305, 140], c1: 2,
  bg(t) { bgOutside(t, { ground: '#605c58' }); R(0, 40, SW, 22, '#585c68'); R(30, 88, 150, 30, '#1a1a20'); dith(30, 88, 150, 5, '#3a3a40', '#1a1a20'); R(32, 94, 146, 2, '#2a3a4a'); for (let x = 30; x < 180; x += 6) vline(x, 88, 30, 'rgba(0,0,0,.4)'); R(196, 86, 30, 30, '#2a2a30'); for (let x = 198; x < 226; x += 4) vline(x, 88, 26, C.g3); R(6, 100, 14, 12, C.n); R(2, 108, 12, 8, C.n); R(250, 104, 20, 14, C.n); outline(250, 104, 20, 14, C.k); },
  props: [
    { id: 'colony', name: 'cat shelters', r: [246, 100, 30, 20], draw() { R(246, 100, 30, 20, '#7a5a3a'); outline(246, 100, 30, 20, C.n); R(254, 106, 14, 14, C.k); R(256, 108, 10, 12, '#1a1a1a'); if (rnd(1) > 0) { R(248, 116, 4, 3, C.M); } }, on: { LOOK: async () => { await say('A row of cardboard cat shelters, lined with old towels and one very organized blanket system. Each has a name on it in marker: SGT. BISCUIT, THE PROFESSOR, LITTLE TUCKER, BIG TORVALD. Someone has put real effort into this.'); setF('saw_colony'); }, PUSH: 'Absolutely not. There are people in there.' } },
    { id: 'ditch', name: 'drainage ditch', r: [30, 88, 150, 30], draw() {}, on: { LOOK: 'A drainage ditch that has held rainwater, cigarette butts, two shopping-cart wheels, and a lot of history. In the mud: paw prints by the hundreds.', PUSH: 'It is a ditch. It is very ditch.' } },
    { id: 'grate', name: 'storm grate', r: [196, 86, 30, 30], draw() {}, on: { LOOK: async () => { await say('A storm grate. From below, a soft chorus of meows echoes upward. It is oddly musical.' + (F('grate_q') ? '' : ' There is a quarter lodged in the grate\'s frame.')); }, OPEN: async () => { if (F('grate_q')) return say('Nothing else but cold water and moral complications.'); setF('grate_q'); G.S.f.q = (G.S.f.q || 0) + 1; giveItem('quarter'); await say('Hollis fishes a quarter out of the frame with a fingernail. A cat watches him with what looks like professional curiosity.'); }, TAKE: () => P('drain', 'grate').on.OPEN() } },
    { id: 'prudence_d', name: 'Prudence', npc: true, r: [104, 74, 24, 42], vis: (s) => s.prudenceAt === 'drain', draw() { Art.npc('prudence', 116, 116, { facing: 1, pose: 'stand' }); Art.bowl(126, 116); }, on: { TALK: () => talkPrudence(), LOOK: 'Prudence, crouched by the drainage ditch with a scoop of kibble and a very sensible jacket. She does not look caught. She looks like she has been waiting for you to catch her.' }, scan: 'SCANNER: PRUDENCE — Status: TERMINATED / FEEDING. Cats fed: yes. Guilt: no. Hours: 11 weeks.', giveTo: { '*': async () => say('PRUDENCE: Oh, put it down, please. I would rather not be technically in possession. I don\'t want to be technically in possession.') } }
  ].concat(torvaldProps('drain', [70, 118])),
  spots: spotsMix([[258, 100, 0, 'sit'], [250, 102, 0, 'loaf'], [30, 92, 0, 'sleep']], cl(10, 300, 136, 12), cl(10, 300, 112, 10), cl(30, 180, 90, 8), cl(200, 230, 90, 4)),
  exits: [ex('to_yard', 'yard', [310, 100, 10, 40], 'trailer yard', [24, 118], { stand: [304, 120] })]
};
G.rooms.drain.props.forEach(p => { if (p.id === 'torvald' || p.id === 'torvald_ghost') p.r = [58, 74, 24, 46]; });

// ---------- MANAGEMENT LOBBY ----------
G.rooms.mgmt = {
  name: 'SECURED MANAGEMENT AREA', start: [40, 122], walk: [10, 104, 305, 140], c1: 1,
  bg(t) { bgOffice(t, '#b8b4c8', '#2a2a3a'); R(0, 0, SW, 82, '#c0bcd0'); for (let x = 0; x < SW; x += 40) R(x + 10, 20, 30, 40, '#9ab0d0'); R(130, 84, 60, 40, C.k); R(230, 40, 50, 44, '#2a2a3a'); outline(230, 40, 50, 44, C.g2); txt('REGIONAL OPERATIONS SUITE', 255, 38, C.y, 4.2, 'center'); R(240, 50, 30, 34, C.g3); R(258, 66, 3, 3, C.R); },
  props: [
    { id: 'gus', name: 'Gus', npc: true, r: [130, 62, 44, 42], vis: () => true, z: 100, draw() { R(120, 92, 80, 30, '#4a4a58'); outline(120, 92, 80, 30, C.k); Art.npc('gus', 160, 96, { facing: -1, bust: true }); txt('SECURITY', 160, 104, C.y, 5, 'center'); }, on: { TALK: () => talkGus(), LOOK: 'Gus, security. He has the look of someone who has watched a hundred monitors and decided most of them were not his problem.' }, scan: 'SCANNER: GUS — Vigilance: 100% (for the right things). Aware of: Prudence (yes), cats (yes), Conveyor 9 (no comment).', giveTo: { exempt: async () => { await say(['GUS: An HR Exemption 9-M? For Non-Standard Breath?', 'HOLLIS: It\'s an approved form.', 'GUS: It\'s beautiful. It\'s also not a Regional badge. I can\'t let you up. Rules.', 'NARRATOR: Gus glances at the corridor, then at the ceiling, then at a security monitor showing Rack 14.', 'GUS: ...I\'m not saying anything about Conveyor 9. I didn\'t say anything about Conveyor 9.']); setF('gus_hint'); }, '*': async () => say('GUS: I can\'t accept things. Regional rules.') } },
    { id: 'reader', name: 'badge reader', r: [248, 66, 12, 12], draw() { R(248, 66, 12, 12, C.k); R(251, 69, 6, 6, F('suite_open') ? C.G : C.R); }, on: { LOOK: 'A badge reader with a little red light. It does not like Hollis\'s face. Or his inventory.', USE: 'It beeps twice and stays red. Very Regional of it.' }, scan: 'SCANNER: BADGE READER — Access: REGIONAL. Your access: "hah".' },
    { id: 'plant2', name: 'executive plant', r: [20, 84, 14, 22], draw() { Art.plant(20, 86); }, on: { LOOK: 'A plant that has never been watered by a human hand. It is real. It has survived on the memory of water.' } }
  ],
  spots: spotsMix([[190, 90, 0, 'sit']], cl(20, 300, 136, 6), cl(30, 220, 110, 4)),
  exits: [ex('to_ops', 'ops', [0, 100, 10, 44], 'stairs down to ops', [290, 110], { stand: [14, 120] }), ex('to_suite', 'suite', [230, 40, 50, 46], 'regional suite', [40, 122], { stand: [255, 102], lock: (s) => { if (!F('suite_open')) { say(['GUS: (without looking up) Badge.', 'The reader stays red. Gus doesn\'t move. The only other way in is not through Gus.']); return true; } return false; } })]
};

// ---------- SUITE ----------
G.rooms.suite = {
  name: 'REGIONAL OPERATIONS SUITE', start: [40, 122], walk: [10, 106, 305, 140], c1: 0,
  bg(t) { bgOffice(t, '#c8c4d8', '#1a1a2a'); R(0, 0, SW, 82, '#d0ccdc'); R(60, 8, 200, 60, C.k); outline(60, 8, 200, 60, C.g2); R(64, 12, 192, 52, '#061a14'); for (let i = 0; i < 8; i++) { const w = 30 + ((Math.sin(t * 0.7 + i) + 1) * 40) | 0; R(70, 16 + i * 6, w, 3, C.G); txt('100%', 250, 19 + i * 6, C.G, 4, 'right'); } R(110, 90, 100, 8, C.N); R(110, 98, 100, 22, '#6a4a2a'); for (let i = 0; i < 6; i++) R(114 + i * 16, 80, 10, 10, '#3a3a4a'); },
  props: [
    { id: 'wall', name: 'HALO regional wall', r: [60, 8, 200, 60], draw() {}, mintTag: 'HALO: ALL LIES', on: { LOOK: 'The regional HALO wall: every site, every trailer, every load, every cat metric, all green, all 100%. It lights the room like a small sun that is very, very sure of itself.' }, scan: 'SCANNER: HALO WALL — Accuracy: unmeasured. Authority: ABSOLUTE. Correlation with reality: [ERROR: divide by zero].' },
    { id: 'table2', name: 'conference table', r: [110, 90, 100, 30], draw() {}, on: { LOOK: 'A conference table with a bowl of complimentary mints. The mints are not glowing. Hollis is grateful.', TAKE: 'The mints are ordinary. The last thing Hollis needs is another mint.' } },
    { id: 'harrow', name: 'Constance Harrow', npc: true, r: [216, 76, 24, 50], vis: (s) => s.act >= 6, draw() { Art.npc('harrow', 228, 124, { facing: -1 }); }, on: { TALK: () => talkHarrow(), LOOK: 'Constance Harrow, Regional Director. Sharp blazer, sharp posture, tablet under her arm displaying a dashboard that seems to have been trained to tell her what she wants to hear. She looks at Hollis the way she looks at a variance she hasn\'t decided to forgive.' },
      scan: async () => { Snd.play('scanfail'); setF('scanned_harrow'); await say(['SCANNER: CONSTANCE HARROW — Regional Director. Reading... reading...', 'SCANNER: ERROR. SUBJECT DETECTED AS "KPI". Please rephrase as a physical object.', 'SCANNER: Attempting to scan a person as a metric... Result: 100.0%. Confidence: 100.0%. Note: this device is now on a Performance Improvement Plan.']); }, giveTo: { '*': async () => say('HARROW: I don\'t take deliverables from the floor. Send them through the proper channel. (There is no proper channel.)') } }
  ],
  spots: spotsMix([[80, 70, 0, 'sit']], cl(20, 300, 136, 6), cl(110, 210, 90, 4)),
  exits: [ex('to_mgmt', 'mgmt', [0, 104, 10, 40], 'back to security', [240, 110], { stand: [14, 120], lock: (s) => { if (F('boss_started') && !F('boss_done')) { say('There is no leaving during a Regional Review. It is in the calendar.'); return true; } return false; } }), ex('to_tunnel', 'tunnel', [300, 104, 20, 40], 'server closet (tunnel)', [290, 120], { stand: [306, 120], lock: (s) => { if (F('boss_started') && !F('boss_done')) { say('There is no leaving during a Regional Review.'); return true; } return false; } })],
  async onEnter() { if (G.S.act >= 6 && F('harrow_summoned') && !F('boss_started')) await G.story.regionalReview(); }
};

// ---------- CALL SCENES ----------
G.rooms.remote = { name: 'REMOTE SITE (VIA RADIO)', walk: [10, 100, 300, 140], noHollis: true, noJuno: true, nocats: true,
  bg(t) { bgOutside(t, { sky: '#a0b8c8', ground: '#7a6a58' }); R(0, 60, SW, 6, '#585858'); R(20, 30, 100, 34, '#787c88'); R(24, 38, 20, 26, '#4a4a54'); for (let i = 0; i < SW; i += 10) R(i, 100 + (i % 20), 5, 1, 'rgba(0,0,0,.2)'); reachTruck(200, 122, -1); txt('RT-77', 200, 116, C.k, 4.5, 'center'); ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < 144; y += 3) ctx.fillRect(0, y, SW, 1); R(0, 0, SW, 2, C.g4); R(0, 142, SW, 2, C.g4); },
  props: [{ id: 'ozzie', name: 'Ozzie', npc: true, r: [120, 74, 24, 44], draw() { Art.npc('ozzie', 134, 122, { facing: 1, pose: 'point', bust: false }); }, on: { LOOK: 'Ozzie, at the remote site, wearing a beanie, holding a scanner and a small, dry look of a man who is a long way from anything.' } }], spots: [], exits: [] };
G.rooms.gordoncall = { name: 'VIDEO CALL: KESTREL MOTOR WORKS', walk: [10, 100, 300, 140], noHollis: true, noJuno: true, nocats: true,
  bg(t) { R(0, 0, SW, 144, '#2a3a4a'); R(0, 0, SW, 90, '#5a7a9a'); for (let i = 0; i < 6; i++) { R(20 + i * 50, 30, 40, 40, '#3a4a5a'); R(24 + i * 50, 34, 32, 32, '#789'); } R(0, 90, SW, 54, '#3a3a40'); for (let i = 0; i < 8; i++) R(10 + i * 40, 100 + (i % 2) * 6, 26, 8, i === 3 ? C.R : C.y); if (G.callWho === 'rescue') { txt('WHISKER RIDGE CAT RESCUE', 160, 18, C.G, 6, 'center'); txt('INTAKE: OPEN — LARGE GROUPS WELCOME', 160, 26, C.y, 5, 'center'); } else { txt(F('departed') ? 'LINE 3 — PARTS INBOUND' : 'LINE 3 — DOWN (waiting on parts)', 160, 18, F('departed') ? C.G : C.R, 6, 'center'); txt(F('departed') ? 'PRODUCTION: RESTARTING' : 'PRODUCTION: STALLED', 160, 26, C.y, 5, 'center'); } ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < 144; y += 3) ctx.fillRect(0, y, SW, 1); R(0, 0, SW, 2, C.g4); R(0, 142, SW, 2, C.g4); },
  props: [{ id: 'gordon', name: 'Gordon', npc: true, r: [130, 60, 60, 80], draw() { ctx.save(); ctx.translate(160, 140); ctx.scale(2.2, 2.2); Art.npc('gordon', 0, 0, { facing: 1, bust: true }); ctx.restore(); }, z: 200, on: {} }], spots: [], exits: [] };
