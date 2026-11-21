#!/usr/bin/env python3
"""Pre-flight for the VO production pass. Reads the current manifests (source of truth), classifies EVERY entry into exactly one final state,
validates READY jobs, writes: voice_manifest_pre_generation.json (frozen snapshot, written once), voice_production_manifest.json (adds production_status/voice/order/output),
voice_generation_queue.json (READY jobs only, story order) and an empty voice_generation_log.json ledger if none exists. Spends no credits.
States: READY -> GENERATED | FAILED | QA_REQUIRED (set by generate_vo.py)   TEXT_ONLY | HOLD_DYNAMIC | HOLD_SPLIT_REQUIRED | APPROVED_EXISTING"""
import json, re, pathlib, collections, shutil, datetime, hashlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[2]; MAN = ROOT / 'assets/audio/manifests'
prod = json.load(open(MAN / 'voice_production_manifest.json', encoding='utf-8')); gen = json.load(open(MAN / 'elevenlabs_generation_manifest.json', encoding='utf-8'))
snap = MAN / 'voice_manifest_pre_generation.json'
if not snap.exists():
    json.dump({'frozen': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'note': 'Frozen pre-generation state (production + generation manifests).', 'voice_production_manifest': prod, 'elevenlabs_generation_manifest': gen}, open(snap, 'w'), ensure_ascii=False)
E = [e for e in prod['entries'] if not e.get('parent')]; V = gen['voices']    # segment entries are re-created below
DEC = json.load(open(ROOT / 'tools/audio/split_decisions.json', encoding='utf-8'))
reg_path = ROOT / 'tools/audio/id_registry.json'; REG = json.load(open(reg_path))
def sid(sp, ch, text): return f'vo_{sp.lower()}_' + hashlib.sha1(f'{sp}|{ch}|{text}'.encode()).hexdigest()[:10]
base_dir = {}
for e in E: base_dir.setdefault(e['speaker'], e['voice_direction'])

TUTORIAL = re.compile(r"controls:|\bF5\b|pick a verb|press h\b|press t\b|click give|right-click|click the floor|yellow arrows|menus:|use the scan verb|scan works on|call = phone|panel at the bottom|keys 1-9|to-do list|\bclick (a|the) (thing|item)|enter types a command|click, or arrow keys|music\. ?$|select a verb|pick an item from the inventory", re.I)
SIGN = re.compile(r"\b(sign|label|board|note|screen|whiteboard|poster|sticker|flyer|plate|clipboard|door|machine|manifest|printout|tag|tablet|dashboard|wall|display|monitor|reads?|labeled|labelled|says|written|caption|lanyard|nameplate|binder|mug|sheet|form|banner|badge|report|memo|chart|log|notebook|map|receipt|ticket|slip|stamp)\b", re.I)
SPEECH = re.compile(r"\b(says|said|asks|asked|replies|replied|mutters|calls|tells|snaps|whispers|shouts|answers|adds|announces|responds|hands|offers|tells|offers|declares|explains|yells|sighs|laughs|speaks|dials|puts him on speaker|glances up|looks over|looks up|turns|nods|shrugs|waves|smiles)\b", re.I)
def quote_type(t):
    """A = narrator quoting inanimate text (one narrator clip is correct). B/unclear = a character may be speaking -> hold for splitting."""
    qs = [(m.start(), m.group(0)) for m in re.finditer(r'"[^"]{2,}"', t)]
    if not qs: return 'A'
    for pos, q in qs:
        pre = t[max(0, pos - 70):pos]
        if SPEECH.search(pre) and not re.search(r"\b(sign|label|note|screen|whiteboard|poster|reads?|labeled|caption|flyer|board|clipboard|tag|sticker)\b", pre, re.I): return 'B'
        if not SIGN.search(pre): return 'B'
    return 'A'
ROOM_ORDER = ['break', 'lockers', 'floor', 'shipoffice', 'ops', 'hr', 'parts', 'charging', 'racks', 'tunnel', 'staging', 'inbound', 'outbound', 'yard', 'smoke', 'drain', 'mgmt', 'suite', 'finale', 'remote', 'phone', 'inventory', 'multiple']
PRIO = {'core_or_triggered_dialogue': 0, 'core_ui_voice_optional': 1, 'interaction_voice': 2, 'optional_interaction_voice': 3, 'hint_voice_optional': 4}
def room_rank(scene):
    s = scene.split('/')[0]; return ROOM_ORDER.index(s) if s in ROOM_ORDER else len(ROOM_ORDER)
counts = collections.Counter(); outp = {}; ids = set(); bad = []
for e in E:
    t = e['text']; why = None
    if e['tier'] == 'D_blocked_dynamic': st, why = 'HOLD_DYNAMIC', 'runtime-assembled fragment/template'
    elif e['tier'] == 'C_speaker_change': st, why = 'HOLD_SPLIT_REQUIRED', 'embedded speaker change'
    elif TUTORIAL.search(e.get('tts_text') or t) or e['priority'] == 'hint_voice_optional': st, why = 'TEXT_ONLY', 'tutorial/control/hint text'
    elif e['tier'] == 'B_quoted_narration' and quote_type(t) == 'B': st, why = 'HOLD_SPLIT_REQUIRED', 'quoted narration: embedded character speech (Type B/unclear)'
    else: st = 'READY'; why = 'quoted narration Type A (sign/label text)' if e['tier'] == 'B_quoted_narration' else None
    suf = e['id'][-6:]
    if st == 'HOLD_SPLIT_REQUIRED' and suf in DEC['splits']: st, why = 'SPLIT', 'multi-segment (different characters speak): see segments'
    elif st == 'HOLD_SPLIT_REQUIRED' and e['tier'] != 'D_blocked_dynamic' and not re.search(r'\$\{', t): st, why = 'READY', 'approved single clip (Type A: quoted text is a sign/label/readout/scare quote)'
    if suf in DEC['tts_overrides'] and st == 'READY': e['tts_text'] = DEC['tts_overrides'][suf]; e['tts_notes'] = e.get('tts_notes', []) + ['manual override: tutorial/instruction sentence dropped']
    voice = V.get(e['speaker'], {}); vid = voice.get('voice_id')
    if st == 'READY':
        probs = []
        if not vid or voice.get('status') != 'locked': probs.append('no approved voice')
        tt = e.get('tts_text') or ''
        if not tt.strip(): probs.append('empty tts_text')
        if re.search(r'\$\{|\}|`', tt): probs.append('template syntax')
        if re.search(r'\((?!\))[^)]*\)', tt): probs.append('leftover parenthetical')
        if re.search(r'\[(?!pause\]|long pause\]|nervous\]|quietly\]|softly\])[^\]]*\]', tt): probs.append('unknown tag')
        if e['id'] in ids: probs.append('duplicate id')
        out = e['planned_file']
        if out in outp: probs.append('duplicate output path')
        if probs: bad.append((e['id'], probs)); st, why = 'HOLD_DYNAMIC' if 'template syntax' in probs else 'HOLD_SPLIT_REQUIRED', '; '.join(probs)
    ids.add(e['id']); outp[e['planned_file']] = e['id']
    e['production_status'] = st; e['status_reason'] = why; e['voice_id'] = vid; e['voice_name'] = voice.get('voice_name'); e['output_path'] = e['planned_file']
    e['order_key'] = [PRIO.get(e['priority'], 9), room_rank(e['scene']), (e['legacy_lines'] or [0])[0]]
    counts[st] += 1
NEW = []
for e in E:
    suf = e['id'][-6:]
    if e['production_status'] != 'SPLIT': continue
    segs = []
    for k, (sp, ch, text) in enumerate(DEC['splits'][suf], 1):
        i = sid(sp, ch, text); vv = V[sp]; tt = DEC.get('segment_tts_overrides', {}).get(text, text)
        NEW.append({'id': i, 'speaker': sp, 'channel': ch, 'tier': 'A_ready', 'generate': True, 'hold_reason': None, 'text': text, 'tts_text': tt, 'tts_notes': ['segment of ' + e['id']], 'chars': len(text), 'scene': e['scene'], 'category': e['category'], 'priority': e['priority'], 'voice_direction': base_dir.get(sp, ''), 'line_direction': '', 'post_fx': ch if ch != 'normal' else None, 'planned_file': f"assets/audio/voice/{sp.lower()}/{i}.mp3", 'source': e['source'], 'legacy_lines': e['legacy_lines'], 'review_reasons': [], 'parent': e['id'], 'segment_index': k, 'production_status': 'READY', 'status_reason': 'segment of ' + e['id'], 'voice_id': vv['voice_id'], 'voice_name': vv['voice_name'], 'output_path': f"assets/audio/voice/{sp.lower()}/{i}.mp3", 'order_key': e['order_key'][:2] + [e['order_key'][2], k]})
        segs.append(i)
        REG['ids'].setdefault(i, {'speaker': sp, 'channel': ch, 'text_sha1': hashlib.sha1(text.encode()).hexdigest(), 'first_seen': str(datetime.date.today()), 'origin': 'split of ' + e['id'], 'status': 'registered'})
    e['segments'] = segs
E += NEW; json.dump(REG, open(reg_path, 'w'), indent=1, ensure_ascii=False)
counts = collections.Counter(e['production_status'] for e in E)
E.sort(key=lambda e: e['order_key'])
prod['entries'] = E; prod['production_counts'] = dict(counts); prod['production_note'] = 'production_status set by tools/audio/preflight.py; story order = priority tier, then room progression, then source order (act numbers are not present in the data)'
json.dump(prod, open(MAN / 'voice_production_manifest.json', 'w'), indent=1, ensure_ascii=False)
ready = [e for e in E if e['production_status'] == 'READY']
queue = {'version': 1, 'model_id': 'eleven_v4', 'output_format': 'mp3_44100_128', 'jobs': [{'id': e['id'], 'speaker': e['speaker'], 'voice_id': e['voice_id'], 'tts_text': e['tts_text'], 'chars': len(e['tts_text']), 'output_path': e['output_path'], 'scene': e['scene'], 'priority': e['priority'], 'post_fx': e.get('post_fx'), 'tier': e['tier']} for e in ready]}
json.dump(queue, open(MAN / 'voice_generation_queue.json', 'w'), indent=1, ensure_ascii=False)
log = MAN / 'voice_generation_log.json'
if not log.exists(): json.dump({'version': 1, 'entries': {}}, open(log, 'w'), indent=1)
print('ENTRIES', len(E), dict(counts)); print('READY chars (tts_text):', sum(len(e['tts_text']) for e in ready), '| on-screen chars:', sum(e['chars'] for e in ready))
print('preflight rejections:', bad[:10], len(bad)); print('READY by tier:', dict(collections.Counter(e['tier'] for e in ready)))
