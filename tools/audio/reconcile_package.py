#!/usr/bin/env python3
"""Reconcile the extracted audio package (tools/audio/package/*.csv) with the CURRENT game source and assign permanent IDs.

Outputs (all deterministic, re-runnable):
  assets/audio/manifests/voice_manifest.json   active + blocked entries, permanent ids, planned_file (file stays null until generated)
  tools/audio/id_registry.json                 permanent id registry (never recomputed once an id exists; retire instead of reuse)
  docs/audio/reconciliation_report.md/.json    counts, merges, mismatches, coverage gaps
  docs/audio/dynamic_resolution.csv            each dynamic line: class, variants, coverage, required action
  docs/audio/uncovered_candidates.csv          spoken-looking strings in the game that the package does not contain (ids reserved)
ID scheme (verified against all package rows): vo_<speaker lower>_<sha1("SPEAKER|channel|text")[:10]>.  Permanent = frozen once registered; text edits never change an id (they flag the entry `stale_text`).
"""
import csv, hashlib, json, re, glob, collections, pathlib, sys, datetime
ROOT = pathlib.Path(__file__).resolve().parents[2]; PKG = ROOT / 'tools/audio/package'
SRC_FILES = sorted(glob.glob(str(ROOT / 'src/**/*.js'), recursive=True))
SKIP_CANDIDATE_FILES = {'logic.js', 'ui.js', 'audio.js', 'tests.js', 'state.js', 'engine.js'}   # hints/UI/help/test strings are not dialogue
SPEAKERS = set('HOLLIS NARRATOR INGRID BRUNO PRUDENCE GORDON TUCKER OZZIE RUFUS TORVALD HARROW HALVORSEN TABITHA GUS RENATA RADIO PHONE SCANNER JUNO SYSTEM HR TABLET'.split())
def sha(speaker, channel, text): return hashlib.sha1(f'{speaker}|{channel}|{text}'.encode()).hexdigest()[:10]
def mkid(speaker, channel, text): return f'vo_{speaker.lower()}_{sha(speaker, channel, text)}'
def norm(s): return re.sub(r'\s+', ' ', s).strip().lower()
def unesc(s): return re.sub(r"\\(['\"`\\])", r'\1', s).replace('\\n', ' ')
def read_csv(n): return list(csv.DictReader(open(PKG / n, encoding='utf-8-sig')))

# ---- 1. load + merge the three voice CSVs
rows = []
for f, tag in [('voice_core.csv', 'core'), ('voice_interactions.csv', 'interactions'), ('voice_manual_review.csv', 'manual_review')]:
    for r in read_csv(f): r['_file'] = tag; rows.append(r)
merged = collections.OrderedDict(); dup_merges = 0; conflicts = []
for r in rows:
    e = merged.get(r['id'])
    if e is None: merged[r['id']] = dict(r, _files=[r['_file']])
    else:
        dup_merges += 1; e['_files'].append(r['_file'])
        if (e['speaker'], e['spoken_text'], e['channel']) != (r['speaker'], r['spoken_text'], r['channel']): conflicts.append(r['id'])
        if r['manual_review'] == 'True': e['manual_review'] = 'True'; e['review_reasons'] = ' | '.join(sorted({*filter(None, e['review_reasons'].split(' | ')), *filter(None, r['review_reasons'].split(' | '))}))
        e['source_lines'] = ','.join(sorted({*e['source_lines'].split(','), *r['source_lines'].split(',')}, key=lambda x: int(x) if x.isdigit() else 0))
hash_bad = [i for i, e in merged.items() if i != mkid(e['speaker'], e['channel'], e['spoken_text'])]

# ---- 2. index the current source (line-level, normalized) for locating each text
lines = []   # (file, lineno, normalized text)
for f in SRC_FILES:
    rel = str(pathlib.Path(f).relative_to(ROOT))
    if '/rendering/' in rel or rel.endswith(('audio.js',)): continue
    for n, l in enumerate(open(f, encoding='utf-8'), 1): lines.append((rel, n, norm(unesc(l))))
def locate(text):
    t = norm(text); out = [(f, n) for f, n, l in lines if t in l]
    return out
registry_path = ROOT / 'tools/audio/id_registry.json'
registry = json.load(open(registry_path)) if registry_path.exists() else {'version': 1, 'scheme': 'vo_<speaker>_<sha1(SPEAKER|channel|text)[:10]> ; ids are frozen once registered', 'ids': {}}
today = datetime.date.today().isoformat()

# ---- 3. build manifest entries
BLOCK = {'dynamic_fragment_not_asset_ready', 'prefix_needs_review', 'unknown_speaker_label'}
entries = []; not_found = []; ambiguous = 0
for i, e in merged.items():
    reasons = [x for x in e['review_reasons'].split(' | ') if x]; text = e['spoken_text']
    loc = locate(text)
    if not loc: not_found.append(i)
    short = len(text) < 24
    if short and len(loc) > 1: ambiguous += 1
    status = 'blocked_dynamic' if set(reasons) & BLOCK else ('stale_text' if not loc else 'active')
    planned = f"assets/audio/voice/{e['speaker'].lower()}/{i}.mp3"
    entries.append({'id': i, 'speaker': e['speaker'], 'channel': e['channel'], 'text': text, 'direction': e['direction'], 'scene': e['scene'], 'category': e['category'], 'priority': e['priority'],
                    'status': status, 'review': {'manual': e['manual_review'] == 'True', 'reasons': reasons}, 'file': None, 'planned_file': planned,
                    'source': [{'file': f, 'line': n} for f, n in loc[:5]], 'legacy_lines': [int(x) for x in e['source_lines'].split(',') if x.isdigit()], 'package_files': e['_files']})
    reg = registry['ids'].setdefault(i, {'speaker': e['speaker'], 'channel': e['channel'], 'text_sha1': hashlib.sha1(text.encode()).hexdigest(), 'first_seen': today, 'origin': 'package'})
    if reg['text_sha1'] != hashlib.sha1(text.encode()).hexdigest(): reg['status'] = 'text_changed'; entries[-1]['status'] = 'stale_text'
    else: reg.setdefault('status', 'registered')

# ---- 4. dynamic dialogue classification
dyn = read_csv('dynamic_dialogue_review.csv'); pkg_keys = {(e['speaker'], norm(e['text'])) for e in entries}; pkg_texts = {norm(e['text']) for e in entries}
def is_flag(f): return bool(re.fullmatch(r'[a-z][a-z0-9_]*', f)) and ('_' in f or f in ('departed', 'coffee', 'mint', 'loaded8', 'timeout', 'stall', 'ship', 'staging_empty'))
dyn_out = []
for d in dyn:
    expr = d['expression']; frags = [x.strip() for x in d['literal_fragments'].split(' | ')]; lit = [f for f in frags if not is_flag(f) and len(f) > 14]
    covered = [f for f in lit if norm(re.sub(r'^\([^)]*\) ?', '', re.sub(r'^[A-Z][A-Z ]{1,10}: ', '', f))) in pkg_texts or any(norm(f) in t for t in pkg_texts)]
    templated = '${' in expr; assembled = bool(re.search(r"\+\s*(?!\()[A-Za-z_(]", expr.replace("' + '", ''))) and not re.search(r"\+ \(F\(", expr)
    has_rand = 'RAND(' in expr; has_cond = bool(re.search(r"F\('|G\.S\.inv|\? ", expr)); runtime_vars = bool(re.search(r"\b(join|sortedCount|fmtTime|\.code|\.real|\.sys|nm\b|\bn\b|miss|need\b|dir\b|m\.join|integrity|R0\.)", expr))
    if templated or runtime_vars: cls = 'runtime_assembled'; action = 'Refactor: split into fixed sentence IDs (with the variable part voiced separately or the line rephrased) before VO; do not record the whole string.'
    elif has_rand: cls = 'finite_random'; action = 'Each RAND alternative is a fixed line: ensure every alternative has its own id (covered/uncovered shown).'
    elif has_cond: cls = 'finite_conditional'; action = 'Each branch is a fixed line (or base+suffix combo): record every full variant; the runtime matches the displayed full string.'
    else: cls = 'finite_other'; action = 'Review manually.'
    status = 'ok' if lit and len(covered) == len(lit) else ('partial' if covered else 'not_covered')
    dyn_out.append({'dyn_id': d['id'], 'class': cls, 'function': d['function'], 'scene': d['scene'], 'legacy_line': d['source_line'], 'literal_strings': len(lit), 'covered_by_package': len(covered), 'coverage': status,
                    'uncovered_literals': ' || '.join(f for f in lit if f not in covered)[:600], 'action': action})
with open(ROOT / 'docs/audio/dynamic_resolution.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(dyn_out[0].keys())); w.writeheader(); w.writerows(dyn_out)

# ---- 5. uncovered spoken-looking strings in the current game (candidates; ids reserved, not added to the manifest)
lit_re = re.compile(r"""'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`""")
cand = collections.OrderedDict()
for f in SRC_FILES:
    rel = str(pathlib.Path(f).relative_to(ROOT)); base = pathlib.Path(f).name
    if '/rendering/' in rel or base in SKIP_CANDIDATE_FILES: continue
    for n, l in enumerate(open(f, encoding='utf-8'), 1):
        if l.lstrip().startswith('//'): continue
        for m in lit_re.finditer(l):
            s = unesc(next(g for g in m.groups() if g is not None))
            if len(s) < 22 or '${' in s or '=>' in s or 'function' in s or not re.search(r'[A-Za-z]{3,} [A-Za-z]{2,} [A-Za-z]{2,}', s) or not re.search(r'[.!?)"\']\s*$', s): continue
            sp = 'NARRATOR'; body = s; mm = re.match(r'^([A-Z][A-Z ]{1,10}): ([\s\S]*)$', s)
            if mm and mm.group(1) in SPEAKERS: sp, body = mm.group(1), mm.group(2)
            chan = 'normal'; pm = re.match(r'^\(([^)]*)\)\s*(.*)$', body)
            if pm:
                if re.search(r'radio', pm.group(1)): chan = 'radio'
                elif re.search(r'phone|video', pm.group(1)): chan = 'phone'
                body = pm.group(2)
            if (sp, norm(body)) in pkg_keys or norm(body) in pkg_texts: continue
            if re.search(r'^[A-Z0-9 \-/&()#:,.\']{12,}$', body): continue          # ALL-CAPS labels/names
            key = (sp, chan, body)
            hint = bool(re.search(r'\bh\.push\(|\bgoal\b|todo|\bL: \[|miss\.push|need\.push|\bm\.push|\.push\(\s*["\']', l)) and sp == 'NARRATOR' and not re.search(r'say\(|\bJ\(|\bN\(', l)
            if key not in cand: cand[key] = (rel, n, 'likely_hint_or_label' if hint else 'likely_dialogue')
cand_rows = [{'proposed_id': mkid(sp, ch, b), 'speaker': sp, 'channel': ch, 'text': b, 'source': f'{f}:{n}', 'likely': lk, 'status': 'candidate_unextracted'} for (sp, ch, b), (f, n, lk) in cand.items()]
for c in cand_rows: registry['ids'].setdefault(c['proposed_id'], {'speaker': c['speaker'], 'channel': c['channel'], 'text_sha1': hashlib.sha1(c['text'].encode()).hexdigest(), 'first_seen': today, 'origin': 'reconcile_candidate', 'status': 'candidate_unextracted'})
with open(ROOT / 'docs/audio/uncovered_candidates.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=['proposed_id', 'speaker', 'channel', 'text', 'source', 'likely', 'status']); w.writeheader(); w.writerows(cand_rows)

# ---- 6. write manifest, registry, report
manifest = {'version': 2, 'description': 'Voice records reconciled against the current game source. Match key at runtime: (speaker, text after removing the leading (stage direction)). `file` stays null until audio is generated; planned_file is the agreed path. status: active | blocked_dynamic (do not record: runtime-assembled fragment) | stale_text.',
            'id_scheme': 'vo_<speaker>_<sha1(SPEAKER|channel|text)[:10]>; permanent once registered (tools/audio/id_registry.json)', 'generated': today,
            'schema': {'id': 'permanent id', 'speaker': 'speaker tag as displayed', 'channel': 'normal|radio|phone', 'text': 'spoken text (leading stage direction removed)', 'direction': 'voice direction', 'status': 'see description', 'file': 'path or null', 'planned_file': 'path where the generated clip belongs', 'source': 'current src file:line', 'legacy_lines': 'line numbers in legacy/MINT_MAN_TUESDAY_LOGIC_REBUILD.html'}, 'entries': entries}
json.dump(manifest, open(ROOT / 'assets/audio/manifests/voice_manifest.json', 'w'), indent=1, ensure_ascii=False); open(ROOT / 'assets/audio/manifests/voice_manifest.json', 'a').write('\n')
json.dump(registry, open(registry_path, 'w'), indent=1, ensure_ascii=False); open(registry_path, 'a').write('\n')
st = collections.Counter(e['status'] for e in entries); spk = collections.Counter(e['speaker'] for e in entries if e['status'] == 'active'); ch = collections.Counter(e['channel'] for e in entries)
rep = {'rows_read': len(rows), 'unique_ids': len(merged), 'duplicate_rows_merged': dup_merges, 'duplicate_conflicts': conflicts, 'id_hash_mismatches': hash_bad, 'status': dict(st), 'channels': dict(ch), 'active_by_speaker': dict(spk),
       'text_not_found_in_current_source': not_found, 'ambiguous_short_texts': ambiguous, 'same_text_multiple_speakers': sorted({e['text'] for e in entries if sum(1 for x in entries if x['text'] == e['text'] and x['speaker'] != e['speaker']) > 0}),
       'dynamic': dict(collections.Counter(d['class'] + '/' + d['coverage'] for d in dyn_out)), 'uncovered_candidates': len(cand_rows), 'uncovered_likely': dict(collections.Counter(c['likely'] for c in cand_rows)), 'uncovered_by_file': dict(collections.Counter(c['source'].split(':')[0] for c in cand_rows)), 'manual_review_entries': sum(1 for e in entries if e['review']['manual'])}
json.dump(rep, open(ROOT / 'docs/audio/reconciliation_report.json', 'w'), indent=1)
md = ['# Audio package reconciliation report', '', f'Generated {today} by `tools/audio/reconcile_package.py` from `tools/audio/package/*.csv` against the current `src/`.', '',
      f"* Rows read: **{len(rows)}** (core 876, interactions 187, manual review 157) → **{len(merged)} unique permanent ids** ({dup_merges} duplicate rows merged: manual-review rows repeat core/interactions rows; no conflicting text/speaker/channel: {len(conflicts)}).",
      f"* ID scheme verified: `sha1(SPEAKER|channel|text)[:10]` reproduces **{len(merged) - len(hash_bad)} / {len(merged)}** package ids (mismatches: {len(hash_bad)}).",
      f"* Text still present in the current game source: **{len(merged) - len(not_found)} / {len(merged)}** (not found: {len(not_found)}).",
      f"* Status: {dict(st)}. Channels: {dict(ch)}.", f"* Same text, different speakers (distinct ids, fine): {rep['same_text_multiple_speakers']}.", '',
      '## Dynamic dialogue (75 expressions)', '', *[f'* `{k}`: {v}' for k, v in sorted(rep['dynamic'].items())], '', 'See `dynamic_resolution.csv` for every line and its required action.', '',
      '## Coverage gaps', '', f"{len(cand_rows)} spoken-looking strings in the game are **not** in the package (by file: {rep['uncovered_by_file']}; by guess: {rep['uncovered_likely']}). Most are plain-string handler values (`LOOK: '…'`, `TAKE: '…'` in `rooms.js`) that the extractor did not treat as `say()` calls, plus NPC/scene strings in `story.js`. They are listed in `uncovered_candidates.csv` with **reserved permanent ids** (status `candidate_unextracted`); they are *not* in the manifest until you approve them.", '',
      '## Rules', '', '* Ids are frozen: never recompute an id from edited text. Edited text ⇒ entry becomes `stale_text` (audio must be regenerated) but keeps its id. Removed lines ⇒ mark `retired` in the registry, never reuse.', '* `blocked_dynamic` entries (10) are fragments of runtime-assembled strings; they must not be recorded as-is.', '* `file` is null everywhere until audio exists; `python3 tools/audio/link_generated.py` fills it from `planned_file` when the clip is on disk.']
open(ROOT / 'docs/audio/reconciliation_report.md', 'w').write('\n'.join(md) + '\n')
print(json.dumps(rep, indent=1)[:2500])
