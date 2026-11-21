#!/usr/bin/env python3
"""Syncs the ledger into the production manifest + voice_manifest.json (file links) and writes docs/VOICE_PRODUCTION_REPORT.md and docs/VOICE_QA_QUEUE.(md|csv). No credits spent."""
import json, re, csv, pathlib, collections, subprocess, datetime
ROOT = pathlib.Path(__file__).resolve().parents[2]; MAN = ROOT / 'assets/audio/manifests'
prod = json.load(open(MAN / 'voice_production_manifest.json', encoding='utf-8')); E = prod['entries']; LOG = json.load(open(MAN / 'voice_generation_log.json'))['entries']
snap = json.load(open(MAN / 'voice_manifest_pre_generation.json'))['voice_production_manifest']['entries']
vm = json.load(open(MAN / 'voice_manifest.json', encoding='utf-8')); vmi = {e['id']: e for e in vm['entries']}
lg = json.load(open(MAN / 'voice_generation_log.json'))
for e in E:
    l = LOG.get(e['id'])
    if l and l['status'] in ('QA_REQUIRED', 'GENERATED') and (ROOT / e['output_path']).exists():
        e['production_status'] = 'QA_REQUIRED' if l.get('qa') != 'approved' else 'GENERATED'; e['generation'] = {k: l.get(k) for k in ('history_id', 'credits', 'duration_secs', 'tech_qa', 'tech_flags', 'generated_at', 'model_id', 'voice_id')}
        vmi[e['id']]['file'] = e['output_path']
    elif l and l['status'] == 'FAILED': e['production_status'] = 'FAILED'; e['generation'] = {'error': l.get('error')}
json.dump(prod, open(MAN / 'voice_production_manifest.json', 'w'), indent=1, ensure_ascii=False); json.dump(vm, open(MAN / 'voice_manifest.json', 'w'), indent=1, ensure_ascii=False)
C = collections.Counter(e['production_status'] for e in E); gen = [e for e in E if e['production_status'] in ('QA_REQUIRED', 'GENERATED')]
gchars = sum(len(e['tts_text']) for e in gen); gcred = sum((e['generation'].get('credits') or 0) for e in gen)
pending = [e for e in E if e['production_status'] == 'READY']
# ---- QA queue
def score(e):
    s = 0; t = e['tts_text']; g = e.get('generation', {})
    if g.get('tech_flags'): s += 100
    if '[pause]' in t or '[long pause]' in t or '[nervous]' in t: s += 40
    if re.search(r'[!?]{1,}', t) and len(re.findall(r'[A-Z]{4,}', t)): s += 25
    if re.search(r'—|\.\.\.|…', t): s += 20
    if e.get('channel') in ('radio', 'phone'): s += 30
    if e['scene'].startswith(('finale', 'suite', 'mgmt')): s += 30
    if len(t) > 220: s += 15
    if any(n.startswith(('removed action', 'pause', 'delivery', 'removed tutorial')) for n in e.get('tts_notes', [])): s += 35
    return s
by = collections.defaultdict(list)
for e in gen: by[e['speaker']].append(e)
first = {x['id'] for sp, ps in by.items() for x in ps[:12]}
qa = sorted(gen, key=lambda e: (-(score(e) + (50 if e['id'] in first else 0)), e['order_key']))
with open(ROOT / 'docs/VOICE_QA_QUEUE.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['rank', 'id', 'speaker', 'reason', 'file', 'duration_secs', 'tech_qa', 'tts_text', 'qa_result']); 
    for i, e in enumerate(qa, 1):
        why = [r for r, c in [('first-12-for-speaker', e['id'] in first), ('pause/tag', bool(re.search(r'\[(long )?pause\]|\[nervous\]', e['tts_text']))), ('radio/phone', e.get('channel') != 'normal'), ('climax', e['scene'].startswith(('finale', 'suite', 'mgmt'))), ('long', len(e['tts_text']) > 220), ('unusual punctuation', bool(re.search(r'—|\.\.\.|…', e['tts_text']))), ('stage-direction fix', any(n.startswith(('removed action', 'delivery')) for n in e.get('tts_notes', []))), ('tech flag', bool(e['generation'].get('tech_flags')))] if c]
        w.writerow([i, e['id'], e['speaker'], '; '.join(why) or 'sample', e['output_path'], round(e['generation'].get('duration_secs') or 0, 2), e['generation'].get('tech_qa'), e['tts_text'], ''])
open(ROOT / 'docs/VOICE_QA_QUEUE.md', 'w').write('# Listening QA queue\n\nPrioritised list of generated clips for human listening (see `VOICE_QA_QUEUE.csv` for all %d, with a qa_result column). **No listening QA has been performed by the pipeline; only technical checks.**\n\n| # | id | speaker | why | file |\n|---|---|---|---|---|\n' % len(qa) + '\n'.join(f"| {i} | `{e['id']}` | {e['speaker']} | {[r for r in ['first-12' if e['id'] in first else '', 'pause/tag' if '[pause]' in e['tts_text'] or '[long pause]' in e['tts_text'] else '', 'radio/phone' if e.get('channel') != 'normal' else '', 'climax' if e['scene'].startswith(('finale', 'suite', 'mgmt')) else '', 'long' if len(e['tts_text']) > 220 else ''] if r]} | `{e['output_path']}` |" for i, e in enumerate(qa[:60], 1)) + '\n')
# ---- report
sp = collections.defaultdict(lambda: collections.Counter()); spc = collections.Counter(); spcr = collections.Counter(); spt = collections.Counter()
for e in E:
    sp[e['speaker']][e['production_status']] += 1; spt[e['speaker']] += 1
for e in gen: spc[e['speaker']] += len(e['tts_text']); spcr[e['speaker']] += e['generation'].get('credits') or 0
sc = collections.Counter(); 
for e in gen: sc[e['scene'].split('/')[0]] += 1
voices = json.load(open(MAN / 'voice_cast_locked.json'))
fails = [e for e in E if e['production_status'] == 'FAILED']
L = ['# Voice production report', '', f'Generated {datetime.date.today()} by `tools/audio/report_vo.py` from the ledger `assets/audio/manifests/voice_generation_log.json`.', '', '## Counts', '',
     f'* Manifest entries at generation start: **{len(snap)}** (frozen in `voice_manifest_pre_generation.json`).', f"* Eligible/READY at preflight: **{C['READY'] + C['QA_REQUIRED'] + C['GENERATED'] + C['FAILED']}** (tts_text characters at preflight: {sum(len(e['tts_text']) for e in E if e['production_status'] in ('READY','QA_REQUIRED','GENERATED','FAILED')):,}).",
     f"* **Generated this pass: {len(gen)}** (QA_REQUIRED {C['QA_REQUIRED']}, GENERATED {C['GENERATED']}); characters generated **{gchars:,}**; credits reported by the API headers **{gcred:,}**.", f"* Failed: **{C['FAILED']}**. Still READY but not generated: **{len(pending)}** ({sum(len(e['tts_text']) for e in pending):,} chars).", f"* TEXT_ONLY (tutorial/control/hint, no credits spent): **{C['TEXT_ONLY']}**.", f"* HOLD_DYNAMIC (runtime-assembled): **{C['HOLD_DYNAMIC']}**.", f"* HOLD_SPLIT_REQUIRED (embedded speaker / unclear quoted speech): **{C['HOLD_SPLIT_REQUIRED']}**.", f"* APPROVED_EXISTING: **{C['APPROVED_EXISTING']}** (the audition clips were never saved to the repo, so none are reused).", f"* Manual QA required: **{len(gen)}** (every generated clip: listening QA not yet performed).", '',
     '## Settings', '', 'Model `eleven_v4`, `mp3_44100_128`, voice default settings (no overrides), one take per job, 2 technical retries max, no post-processing/normalisation applied. Text sent = `tts_text`; on-screen text untouched. Radio/phone clips are clean (filter belongs in the game audio layer).', '',
     '## Speaker totals', '', '| speaker | voice | entries | generated | chars generated | credits |', '|---|---|---|---|---|---|'] + [f"| {s} | {voices['voices'][s]['voice_name']} | {spt[s]} | {sp[s]['QA_REQUIRED'] + sp[s]['GENERATED']} | {spc[s]:,} | {spcr[s]:,} |" for s in sorted(spt, key=lambda s: -spt[s])] + ['', '## Generated clips by room/scene (act numbers are not present in the data; order = priority, room progression, source order)', '', ', '.join(f'{k}: {v}' for k, v in sc.most_common()), '',
     '## Unresolved', '', f'* Dynamic lines held: {C["HOLD_DYNAMIC"]} — see `docs/audio/dynamic_resolution.csv` (finite variants / restructure / text-only decision still needed).', f'* Quoted narration with embedded speech or speaker change held for splitting: {C["HOLD_SPLIT_REQUIRED"]} — needs multi-segment voice entries (new ids) before generation.', f'* Failed: {[ (e["id"], (e.get("generation") or {}).get("error")) for e in fails][:5]}', '',
     '## Files', '', '* Audio: `assets/audio/voice/<speaker>/<id>.mp3`', '* Manifests: `assets/audio/manifests/voice_production_manifest.json|csv`, `voice_manifest.json` (file links), `voice_generation_queue.json`, `voice_generation_log.json` (ledger), `voice_manifest_pre_generation.json` (frozen), `voice_cast_locked.json`', '* QA: `docs/VOICE_QA_QUEUE.md|csv`']
open(ROOT / 'docs/VOICE_PRODUCTION_REPORT.md', 'w').write('\n'.join(L) + '\n')
print(dict(C), 'generated', len(gen), gchars, gcred)
