# Audio package reconciliation report

Generated 2026-11-21 by `tools/audio/reconcile_package.py` from `tools/audio/package/*.csv` against the current `src/`.

* Rows read: **1220** (core 876, interactions 187, manual review 157) → **1068 unique permanent ids** (152 duplicate rows merged: manual-review rows repeat core/interactions rows; no conflicting text/speaker/channel: 0).
* ID scheme verified: `sha1(SPEAKER|channel|text)[:10]` reproduces **1068 / 1068** package ids (mismatches: 0).
* Text still present in the current game source: **1068 / 1068** (not found: 0).
* Status: {'active': 1058, 'blocked_dynamic': 10}. Channels: {'normal': 1036, 'radio': 29, 'phone': 3}.
* Same text, different speakers (distinct ids, fine): ['How many?', 'No.', 'Yes.'].

## Dynamic dialogue (75 expressions)

* `finite_conditional/not_covered`: 1
* `finite_conditional/ok`: 28
* `finite_other/not_covered`: 3
* `finite_other/ok`: 2
* `finite_random/ok`: 12
* `runtime_assembled/not_covered`: 4
* `runtime_assembled/ok`: 25

See `dynamic_resolution.csv` for every line and its required action.

## Coverage gaps

361 spoken-looking strings in the game are **not** in the package (by file: {'src/patches.js': 12, 'src/rooms.js': 146, 'src/story.js': 203}; by guess: {'likely_dialogue': 297, 'likely_hint_or_label': 64}). Most are plain-string handler values (`LOOK: '…'`, `TAKE: '…'` in `rooms.js`) that the extractor did not treat as `say()` calls, plus NPC/scene strings in `story.js`. They are listed in `uncovered_candidates.csv` with **reserved permanent ids** (status `candidate_unextracted`); they are *not* in the manifest until you approve them.

## Rules

* Ids are frozen: never recompute an id from edited text. Edited text ⇒ entry becomes `stale_text` (audio must be regenerated) but keeps its id. Removed lines ⇒ mark `retired` in the registry, never reuse.
* `blocked_dynamic` entries (10) are fragments of runtime-assembled strings; they must not be recorded as-is.
* `file` is null everywhere until audio exists; `python3 tools/audio/link_generated.py` fills it from `planned_file` when the clip is on disk.
