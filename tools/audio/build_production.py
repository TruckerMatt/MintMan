#!/usr/bin/env python3
"""Builds the production-side manifests from the reconciled voice_manifest.json (run reconcile_package.py first). No audio is generated, no API is called.
Outputs (assets/audio/manifests/): voice_production_manifest.json/.csv, voice_manual_review_manifest.json, voice_dynamic_manifest.json, cast_sheet.json,
elevenlabs_generation_manifest.json, audition_manifest.json;  docs/audio/CAST_SHEET.md"""
import json, csv, re, collections, pathlib, datetime
ROOT = pathlib.Path(__file__).resolve().parents[2]; MAN = ROOT / 'assets/audio/manifests'
E = json.load(open(MAN / 'voice_manifest.json', encoding='utf-8'))['entries']; today = datetime.date.today().isoformat()
def split_dir(d): b, _, l = d.partition(' Line direction: '); b = re.sub(r' Deliver as radio communication.*$| Deliver as phone.*$', '', b); return b.strip(), l.strip()
def tier(e):
    if '${' in e['text'] or re.match(r'^[.,;)](?!\.)', e['text'].lstrip()): return 'D_blocked_dynamic'
    r = set(e['review']['reasons'])
    if e['status'] == 'blocked_dynamic': return 'D_blocked_dynamic'
    if not e['review']['manual']: return 'A_ready'
    if 'embedded_speaker_change' in r: return 'C_speaker_change'
    return 'B_quoted_narration'
HOLD = {'B_quoted_narration': 'Narration containing quoted speech. Recommended: record as one NARRATOR take (as written). Needs approval.', 'C_speaker_change': 'Line embeds another speaker. Decide: one NARRATOR take, or split into narrator + character clips (needs new ids).', 'D_blocked_dynamic': 'Fragment or template placeholder of a runtime-assembled string; refactor first.'}

# ---- tts_text: what is actually SENT to the TTS model (the on-screen `text` stays untouched: it is the runtime match key)
PAUSE = {'beat': '[pause]', 'a pause': '[pause]', 'a pause.': '[pause]', 'a long pause': '[long pause]', 'a breath': '[pause]'}
DELIVERY = {'nervously': '[nervous]'}
def to_tts(text):
    notes = []
    def sub(m):
        inner = m.group(1).strip(); k = inner.lower()
        if k in PAUSE: notes.append('pause:' + k); return PAUSE[k]
        if k in DELIVERY: notes.append('delivery:' + k); return DELIVERY[k]
        if re.match(r"^(he|she|they|it)\b|^(glanc|click|using)", k) or not k or k in ('bruno','rufus','tucker','torvald','ingrid','prudence','halvorsen','tabitha','harrow','gordon','ozzie','renata','gus','hollis'): notes.append('removed action:' + k[:30]); return ''
        notes.append('aside spoken:' + k[:30]); return '\u0001' + inner + '\u0002'   # spoken aside: keep the words, set off with commas (done below)
    out = re.sub(r'\(([^)]*)\)', sub, text)
    out = re.sub(r'\[(?!(?:pause|long pause|nervous)\])[^\]]*\]', lambda m: (notes.append('removed action:' + m.group(0)[:30]) or ''), out)
    out = re.sub(r'\s*\u0001([^\u0002]*)\u0002(\s*[.!?,;:]|\s*$)?', lambda m: ', ' + m.group(1).strip() + (m.group(2) or '').strip(), out) if '\u0001' in out else out
    out = re.sub(r'([.!?]), ', r'\1 ', out)
    out = re.sub(r'\s+([,.!?])', r'\1', re.sub(r'\s{2,}', ' ', out)).strip()
    return out, notes
prod = []
for e in E:
    base, ldir = split_dir(e['direction']); t = tier(e)
    prod.append({'id': e['id'], 'speaker': e['speaker'], 'channel': e['channel'], 'tier': t, 'generate': t == 'A_ready', 'hold_reason': HOLD.get(t), 'text': e['text'], 'tts_text': to_tts(e['text'])[0], 'tts_notes': to_tts(e['text'])[1], 'chars': len(e['text']), 'scene': e['scene'], 'category': e['category'], 'priority': e['priority'],
                 'voice_direction': base, 'line_direction': ldir, 'post_fx': 'radio' if e['channel'] == 'radio' else ('phone' if e['channel'] == 'phone' else None), 'planned_file': e['planned_file'], 'source': e['source'][:1], 'legacy_lines': e['legacy_lines'], 'review_reasons': e['review']['reasons']})
order = {'core_or_triggered_dialogue': 0, 'core_ui_voice_optional': 1, 'interaction_voice': 2, 'optional_interaction_voice': 3, 'hint_voice_optional': 4}
prod.sort(key=lambda p: (order.get(p['priority'], 9), p['speaker'], (p['legacy_lines'] or [0])[0], p['id']))
cnt = collections.Counter(p['tier'] for p in prod); chars = collections.Counter()
for p in prod: chars[p['tier']] += p['chars']
json.dump({'version': 1, 'generated': today, 'description': 'FINAL VO PRODUCTION MANIFEST. Source of truth for recording. generate=true only for tier A (no review flag). Nothing has been generated.', 'ids': 'permanent, see tools/audio/id_registry.json', 'tiers': {'A_ready': 'clean single-speaker line', 'B_quoted_narration': 'narration with embedded quotes, pending approval', 'C_speaker_change': 'embedded speaker change, pending decision', 'D_blocked_dynamic': 'do not record'}, 'counts': dict(cnt), 'characters': dict(chars), 'entries': prod}, open(MAN / 'voice_production_manifest.json', 'w'), indent=1, ensure_ascii=False)
with open(MAN / 'voice_production_manifest.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['id', 'speaker', 'channel', 'tier', 'generate', 'priority', 'scene', 'chars', 'text', 'voice_direction', 'line_direction', 'post_fx', 'planned_file', 'hold_reason'])
    for p in prod: w.writerow([p[k] for k in ['id', 'speaker', 'channel', 'tier', 'generate', 'priority', 'scene', 'chars', 'text', 'voice_direction', 'line_direction', 'post_fx', 'planned_file', 'hold_reason']])
# split manifests
man_rev = [p for p in prod if p['tier'] in ('B_quoted_narration', 'C_speaker_change', 'D_blocked_dynamic')]
json.dump({'version': 1, 'generated': today, 'description': 'Lines held out of the first generation pass, split by reason. Decisions are recorded in `decision` (null = open).', 'entries': [dict(p, decision=None) for p in man_rev]}, open(MAN / 'voice_manual_review_manifest.json', 'w'), indent=1, ensure_ascii=False)
dyn = list(csv.DictReader(open(ROOT / 'docs/audio/dynamic_resolution.csv', encoding='utf-8')))
frag = [p for p in prod if p['tier'] == 'D_blocked_dynamic']
json.dump({'version': 1, 'generated': today, 'description': 'Dynamic (runtime-assembled / conditional) dialogue. finite_* classes are fixed full strings: record each variant. runtime_assembled needs a refactor first. `blocked_fragments` are package rows that must not be recorded.', 'expressions': dyn, 'blocked_fragments': frag, 'candidates_file': 'docs/audio/uncovered_candidates.csv'}, open(MAN / 'voice_dynamic_manifest.json', 'w'), indent=1, ensure_ascii=False)
# cast sheet
ROLE = {'NARRATOR': 'Omniscient narrator (most lines)', 'HOLLIS': 'Protagonist, warehouse lead', 'SCANNER': 'Handheld scanner device', 'SYSTEM': 'Corporate system voice', 'TABLET': 'HR tablet device', 'RADIO': 'Anonymous radio voice (Operations)', 'PRUDENCE': 'Terminated employee who never left', 'BRUNO': 'Lead loader, outbound docks', 'INGRID': 'Shipping office clerk', 'TUCKER': 'Eager floor associate', 'HALVORSEN': 'Operations manager', 'RUFUS': 'Yard driver', 'TORVALD': 'Spotter / smoker', 'HARROW': 'Regional director (finale)', 'GORDON': 'Customer (Kestrel Motor Works)', 'TABITHA': 'HR', 'OZZIE': 'Remote-site contact', 'RENATA': 'Whisker Ridge cat rescue', 'GUS': 'Security'}
cast = []
by = collections.defaultdict(list)
for p in prod:
    if p['tier'] != 'D_blocked_dynamic': by[p['speaker']].append(p)
for sp, ps in sorted(by.items(), key=lambda kv: -sum(p['chars'] for p in kv[1])):
    ready = [p for p in ps if p['generate']]; pool = ready or ps; shortlist = []
    def add(p):
        if p and p['id'] not in {x['id'] for x in shortlist}: shortlist.append(p)
    srt = sorted(pool, key=lambda p: p['chars']); mid = [p for p in srt if 40 <= p['chars'] <= 110]
    add(mid[len(mid) // 2] if mid else srt[len(srt) // 2]); add(srt[-1] if srt[-1]['chars'] <= 260 else next((p for p in reversed(srt) if p['chars'] <= 260), srt[-1]))
    add(next((p for p in pool if re.search(r'[!?]', p['text']) and p['chars'] > 25), None)); add(next((p for p in pool if p['line_direction']), None)); add(next((p for p in pool if p['channel'] != 'normal'), None))
    dirs = [p['voice_direction'] for p in ps]; vd = collections.Counter(dirs).most_common(1)[0][0]
    cast.append({'speaker': sp, 'role': ROLE.get(sp, ''), 'lines': len(ps), 'lines_ready': len(ready), 'characters': sum(p['chars'] for p in ps), 'characters_ready': sum(p['chars'] for p in ready), 'channels': dict(collections.Counter(p['channel'] for p in ps)), 'scenes': sorted({p['scene'] for p in ps})[:8],
                 'voice_direction': vd, 'post_fx': 'radio/phone filtering applied in-game, not baked in' if any(p['channel'] != 'normal' for p in ps) else None, 'device_voice': sp in ('SCANNER', 'SYSTEM', 'TABLET', 'RADIO'),
                 'elevenlabs_voice_id': None, 'voice_status': 'unassigned (audition pending)', 'audition_lines': [{'id': p['id'], 'text': p['text'], 'line_direction': p['line_direction']} for p in shortlist[:5]]})
json.dump({'version': 1, 'generated': today, 'cast': cast}, open(MAN / 'cast_sheet.json', 'w'), indent=1, ensure_ascii=False)
md = ['# Cast sheet (voice audition brief)', '', f'Generated {today}. {len(cast)} speakers, {sum(c["lines"] for c in cast)} recordable lines ({sum(c["lines_ready"] for c in cast)} tier-A ready), {sum(c["characters"] for c in cast):,} characters. **No voices assigned yet.**', '',
      '| speaker | role | lines (ready) | characters (ready) | channels | device voice |', '|---|---|---|---|---|---|']
md += [f"| {c['speaker']} | {c['role']} | {c['lines']} ({c['lines_ready']}) | {c['characters']:,} ({c['characters_ready']:,}) | {', '.join(f'{k} {v}' for k, v in c['channels'].items())} | {'yes' if c['device_voice'] else ''} |" for c in cast]
md += ['', 'Radio/phone clips are recorded clean; the radio/phone filter is applied in-game later.', '']
for c in cast:
    md += [f"## {c['speaker']}", f"*{c['role'] or 'Character'}* — {c['lines']} lines, {c['characters']:,} chars. Scenes: {', '.join(c['scenes'])}", '', f"**Direction:** {c['voice_direction']}", '', '**Audition lines:**'] + [f"* `{a['id']}` — “{a['text']}”" + (f" _(direction: {a['line_direction']})_" if a['line_direction'] else '') for a in c['audition_lines']] + ['', '**Voice:** _unassigned_', '']
open(ROOT / 'docs/audio/CAST_SHEET.md', 'w').write('\n'.join(md))
json.dump({'version': 1, 'generated': today, 'description': 'Audition set: a few lines per speaker. Use with the cast sheet; assign the chosen voice ids in cast_sheet.json / elevenlabs_generation_manifest.json.', 'speakers': [{'speaker': c['speaker'], 'direction': c['voice_direction'], 'lines': c['audition_lines']} for c in cast]}, open(MAN / 'audition_manifest.json', 'w'), indent=1, ensure_ascii=False)
# ElevenLabs generation manifest (job list only; no API calls)
jobs = [{'id': p['id'], 'speaker': p['speaker'], 'text': p['text'], 'tts_text': p['tts_text'], 'voice_slot': p['speaker'], 'output_file': p['planned_file'], 'direction': (p['voice_direction'] + (' ' + p['line_direction'] if p['line_direction'] else '')).strip(), 'post_fx': p['post_fx'], 'priority': p['priority'], 'chars': len(p['tts_text']), 'status': 'pending'} for p in prod if p['generate']]
json.dump({'version': 1, 'generated': today, 'description': 'ElevenLabs generation job list. NOT executed. Assign `voices[<speaker>].voice_id` after auditioning, then run the generator against `jobs`. Tier B/C/D lines are excluded (see voice_manual_review_manifest.json).',
           'defaults': {'model_id': 'DECIDE_AT_AUDITION', 'output_format': 'mp3_44100_128', 'voice_settings': {'stability': None, 'similarity_boost': None, 'style': None, 'use_speaker_boost': None}, 'generations_per_line': 1, 'rule': 'one take per job; never auto-retry (each generation spends credits)', 'send': 'tts_text (NOT text). text is the on-screen line = runtime match key; tts_text converts inline stage directions: pauses -> [pause]/[long pause], delivery words -> tags, actions removed, spoken asides keep their words'},
           'voices': {c['speaker']: {'voice_id': None, 'voice_name': None, 'status': 'unassigned', 'settings_override': None, 'jobs': c['lines_ready'], 'chars': c['characters_ready']} for c in cast}, 'totals': {'jobs': len(jobs), 'characters': sum(j['chars'] for j in jobs)}, 'jobs': jobs}, open(MAN / 'elevenlabs_generation_manifest.json', 'w'), indent=1, ensure_ascii=False)
print(dict(cnt), dict(chars), len(jobs), sum(j['chars'] for j in jobs), len(cast))
