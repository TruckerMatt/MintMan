#!/usr/bin/env python3
"""Expands the runtime-assembled ("dynamic") dialogue into CONCRETE, finite lines so each can be voiced.
Run after reconcile_package.py and before build_production.py (idempotent): appends entries to voice_manifest.json with permanent ids
(vo_<speaker>_<sha1(SPEAKER|channel|text)[:10]>) and activates the one static fragment that is really fixed text.
Variable domains (pallet table, inventory names, Ingrid's request lists, sorted counts) come from dynamic_sources.json (dumped from the live game data).
Deliberately NOT expanded (stay text-only HUD/hint chatter): objective/hint panels ("Still needed:", "Act", "Other open objectives"), the pockets list, evidence lists,
Bruno's radio "Hold up!" corrections (need the nice() phrase per pallet; not part of this pass)."""
import json, hashlib, itertools, pathlib, datetime
ROOT = pathlib.Path(__file__).resolve().parents[2]; MAN = ROOT / 'assets/audio/manifests'; HERE = pathlib.Path(__file__).resolve().parent
today = datetime.date.today().isoformat()
D = json.load(open(HERE / 'dynamic_sources.json')); PAL = D['PAL']
mp = MAN / 'voice_manifest.json'; M = json.load(open(mp, encoding='utf-8')); E = M['entries']; byid = {e['id']: e for e in E}
rp = HERE / 'id_registry.json'; REG = json.load(open(rp)); 
def vid(sp, ch, text): return 'vo_' + sp.lower() + '_' + hashlib.sha1(f'{sp}|{ch}|{text}'.encode()).hexdigest()[:10]
def direction(sp, ch):
    for e in E:
        if e['speaker'] == sp and e['channel'] == ch and e.get('direction'): return e['direction']
    for e in E:
        if e['speaker'] == sp and e.get('direction'): return e['direction']
    return ''
L = []   # (speaker, channel, text, scene)
def add(sp, text, scene='dynamic', ch='normal'): L.append((sp, ch, text, scene))
# --- pallets (staging puzzle)
for p in PAL:
    c = p['code']
    add('NARRATOR', f"Pallet {c}, wrapped and labeled. The label says one thing. The pallet looks like it might mean another." + (" There is a chalk dot on the corner in Bruno's handwriting." if p['dot'] else ' There is no dot from Bruno.'), 'staging')
    if p['bad']:
        add('SCANNER', f'PALLET {c} — LABEL: "{p["sys"]}".', 'staging'); add('NARRATOR', f'MINT VISION: PHYSICAL TRUTH — {p["real"]}.', 'staging')
    else:
        add('SCANNER', f'PALLET {c} — {p["real"]}. Label: "{p["sys"]}". Label matches freight. ' + ('On the Kestrel PO.' if p['dest'] == 'ship' else 'Not on the Kestrel PO.'), 'staging')
    add('NARRATOR', f'Hollis slides the pallet jack under {c}. It groans with mechanical trust.', 'staging')
    add('NARRATOR', f"Pallet {c}: {'OUTBOUND' if p['dest'] == 'ship' else 'STORAGE'}. Correct. The scanner chirps a note of professional respect.", 'staging')
add('NARRATOR', 'MINT VISION: The label and the freight have never met. Something on the Kestrel order matches this.', 'staging'); add('NARRATOR', 'MINT VISION: The label and the freight have never met. Nothing on the Kestrel order matches this.', 'staging')
# --- counts
for n in range(1, 9): add('NARRATOR', f"Eight slots are designated for tonight's storage. Right now {n} of them contain the correct freight, each one scanned into the right rack location.", 'racks')
for n in range(0, 9): add('SCANNER', f'RACK STORAGE — {n}/8 loads stored correctly. The scanner agrees with the rack. This is the first time this week.', 'racks')
for n in range(1, 9): add('NARRATOR', f'The outbound queue, at Door 3. {n} of 8 Kestrel loads are lined up and waiting for a trailer to land.', 'outbound')
# --- Juno tracking Torvald
for d in ['the yard', 'the drainage area', 'the smoking area']: add('NARRATOR', f'Juno sniffs, lifts her head, and looks pointedly toward {d}. She has the scent. It is not here.', 'multiple')
# --- HALO boss integrity readout
for v in (75, 50, 25, 0): add('NARRATOR', f'Reality integrity: {v}%.', 'suite')
# --- Ingrid's request lists (shipping office)
A = ['coffee (a real one, not the pot)', 'a Form 7-Q (blank ones are in the Operations printer), filled out and signed by Operations', 'a reason, meaning proof the records are wrong (scan the forklift Halvorsen mentioned, then show me the scanner)']
for r in range(1, 4):
    for c in itertools.combinations(A, r): add('INGRID', '; '.join(c) + '.', 'shipoffice')
for r in range(1, len(D['DOCS']) + 1):
    for c in itertools.combinations(D['DOCS'], r): add('INGRID', "I can print a bill of lading that's true. But I need: " + '; '.join(c) + '.', 'shipoffice')
# --- generic inventory-item fallbacks (name-dependent; skip items whose name is count-dependent)
for it in D['ITEMS']:
    nm = it['name']
    if 'x0' in nm or 'x1' in nm: continue
    add('SCANNER', f'{nm.upper()} — Asset: "Item I Own". Barcode: not applicable. Confidence: emotional.', 'multiple')
    add('NARRATOR', f"Hollis can't think of a way to USE the {nm.lower()} by itself. Try USE ... ON something.", 'multiple')
    add('NARRATOR', f'Hollis mutters something at the {nm.lower()}. It does not answer. Fine.', 'multiple')
new = 0
# retire an earlier mis-keyed batch (MINT VISION lines are parsed by the game as NARRATOR text, not SYSTEM)
import os
for e in [e for e in E if e.get('category') == 'dynamic_expansion' and e['speaker'] == 'SYSTEM']:
    E.remove(e); byid.pop(e['id'], None); REG['ids'].pop(e['id'], None)
    f = ROOT / e['planned_file']
    if f.exists(): os.remove(f)
for sp, ch, text, scene in L:
    i = vid(sp, ch, text)
    if i in byid: continue
    e = {'id': i, 'speaker': sp, 'channel': ch, 'text': text, 'direction': direction(sp, ch), 'scene': scene, 'category': 'dynamic_expansion', 'priority': 'core_or_triggered_dialogue', 'status': 'active',
         'review': {'manual': False, 'reasons': []}, 'file': None, 'planned_file': f'assets/audio/voice/{sp.lower()}/{i}.mp3', 'source': [{'file': 'tools/audio/expand_dynamic.py', 'line': 0}], 'legacy_lines': [], 'package_files': ['dynamic_expansion']}
    E.append(e); byid[i] = e; new += 1
    REG['ids'].setdefault(i, {'speaker': sp, 'channel': ch, 'text_sha1': hashlib.sha1(text.encode()).hexdigest(), 'first_seen': today, 'origin': 'dynamic_expansion', 'status': 'registered'})
# the one genuinely static fragment
act = 0
for e in E:
    if e['speaker'] == 'INGRID' and e['text'] == "Every request creates work. That's the rule. You want the manifests? I want:" and e['status'] != 'active': e['status'] = 'active'; e['review'] = {'manual': False, 'reasons': []}; act += 1
json.dump(M, open(mp, 'w'), indent=1, ensure_ascii=False); open(mp, 'a').write('\n'); json.dump(REG, open(rp, 'w'), indent=1, ensure_ascii=False); open(rp, 'a').write('\n')
print(f'expanded {len(L)} concrete lines ({new} new), activated {act} static fragment(s)')
