'use strict';
// SAVE: save/load/repair
// ---------- save ----------
function canSaveNow() { return !G.busy && !G.inProgress && !G.say && !G.menuState && !G.overlay && !G.inCall && !(G.S && G.S.f && G.S.f.boss_started && !G.S.f.boss_done) && !G.gameComplete; }
// Saves happen only at safe points: never in the middle of an interaction, so a save can't capture a half-finished trade.
function saveGame() { if (!canSaveNow()) { G.pendingSave = true; return false; } try { const old = localStorage.getItem('mintman_save'); if (old) localStorage.setItem('mintman_save_bak', old); localStorage.setItem('mintman_save', JSON.stringify(Object.assign({}, G.S, { verb: null, selItem: null }))); G.pendingSave = false; return true; } catch (e) { return false; } }
function safePoint() { if (G.fast) return; if (canSaveNow()) saveGame(); }
G.toast = null; function toast(t) { G.toast = { t: G.t, text: t }; }
function autosave() { if (!G.fast) saveGame(); }
setInterval(() => { if (G.pendingSave && canSaveNow()) { saveGame(); toast('SAVED'); } }, 500);
function loadGame() { for (const key of ['mintman_save', 'mintman_save_bak']) { try { const s = localStorage.getItem(key); if (!s) continue; const o = JSON.parse(s); if (!o || typeof o !== 'object' || !G.rooms[o.room] || !Array.isArray(o.inv) || !o.f) continue; if (o.room === 'gordoncall' || o.room === 'remote') o.room = 'floor'; if (o.f.boss_started && !o.f.boss_done) delete o.f.boss_started; G.S = Object.assign(newState(), o); try { repairState(G.S); } catch (e) {} G.S.verb = null; G.S.selItem = null; if (!(G.S.mint > 0)) G.S.mintOn = false; return true; } catch (e) {} } return false; }

// Repair saves made by older builds (or any state) where a required item was consumed but its result never landed.
function repairState(S) {
  const f = S.f, has_ = (i) => S.inv.includes(i), give = (i) => { if (!has_(i)) S.inv.push(i); };
  const all3 = f.trail_floor && f.trail_out && f.trail_yard;
  if (!S.hintLevel) S.hintLevel = {};
  // older saves: knowledge flags introduced by the state model
  if (f.prudence_confessed || f.saw_colony || f.dfound1) f.colony_known = true;
  if (f.label_decoded || f.saw_template000) f.label_known = true;
  if (S.act >= 5 && !f.hold_known) f.hold_known = true;
  const R = [
    ['scanner', true], ['radio', f.radio_found], ['sbat', f.clock_battery && !f.scanner_live], ['coffee', f.got_coffee && !f.ingrid_coffee],
    ['key_parts', f.key_given && !f.parts_open], ['seal', f.took_seal && !f.bruno_jack_fixed], ['jack', f.bruno_jack_fixed],
    ['tally', f.lf_taken && !f.trailmap_have], ['blanket', f.lf_taken && !f.t31_blanket], ['trailmap', f.trailmap_have],
    ['dglove', f.dlocker_open && !f.scent_taken], ['pen', f.locker_open && !f.form_filled], ['form7q', f.took_form && !f.ingrid_form],
    ['man1', f.ingrid_helped], ['po', f.gordon_call1], ['key_cage', f.took_cagekey && !f.tucker_freed], ['tuckerbook', f.tucker_freed],
    ['page2', f.page2_have], ['kibble', f.took_kibble && !all3], ['mint', f.mint_taken && !f.mint_eaten], ['exempt', f.hr_done],
    ['armband', f.hr_done && !f.armband_on], ['bol', f.ingrid_docs], ['receipt', f.rescue_done], ['sightlog', f.torvald3_done], ['label', f.took_label]
  ];
  for (const [id, cond] of R) if (cond && G.items[id]) give(id);
  if (!f.t31_bowls && (f.bowls || 0) > 0) give('bowl');
  // older builds: kibble pallets already stored without ever taking kibble (hard lock before the safety net)
  if (S.pal && (S.pal.A6 || S.pal.A7) && !all3 && !f.cats_migrated && G.items.kibble && !has_('kibble')) { give('kibble'); f.took_kibble = 1; f.cat_source_known = 1; }
  // fish-cracker economy: make sure every remaining cracker need can still be met
  const needCr = ((!f.got_coffee && !f.ingrid_coffee) ? 1 : 0) + (!f.page2_have ? 1 : 0);
  const needMint = (!f.mint_taken && !f.mint_eaten) ? 1 : 0;
  const quarters = (f.q || 0) + (f.couch_q ? 0 : 2) + (f.bench_q ? 0 : 1) + (f.grate_q ? 0 : 1); const buyable = Math.max(0, Math.min(quarters - needMint, 3 - (f.crackers_bought || 0)));
  if (needCr > (has_('crackers') ? 1 : 0) + buyable && !has_('crackers')) give('crackers');
  if (needMint && quarters < 1) { f.q = 1; give('quarter'); }
  if ((f.q || 0) > 0) give('quarter');
}
G.repairState = repairState;
