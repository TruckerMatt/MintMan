# Voice production report

Generated 2026-11-21 by `tools/audio/report_vo.py` from the ledger `assets/audio/manifests/voice_generation_log.json`.

## Counts

* Manifest entries at generation start: **1068** (frozen in `voice_manifest_pre_generation.json`).
* Eligible/READY at preflight: **923** (tts_text characters at preflight: 74,559).
* **Generated this pass: 559** (QA_REQUIRED 559, GENERATED 0); characters generated **46,510**; credits reported by the API headers **18,598**.
* Failed: **364**. Still READY but not generated: **0** (0 chars).
* TEXT_ONLY (tutorial/control/hint, no credits spent): **4**.
* HOLD_DYNAMIC (runtime-assembled): **28**.
* HOLD_SPLIT_REQUIRED (embedded speaker / unclear quoted speech): **113**.
* APPROVED_EXISTING: **0** (the audition clips were never saved to the repo, so none are reused).
* Manual QA required: **559** (every generated clip: listening QA not yet performed).

## Settings

Model `eleven_v4`, `mp3_44100_128`, voice default settings (no overrides), one take per job, 2 technical retries max, no post-processing/normalisation applied. Text sent = `tts_text`; on-screen text untouched. Radio/phone clips are clean (filter belongs in the game audio layer).

## Speaker totals

| speaker | voice | entries | generated | chars generated | credits |
|---|---|---|---|---|---|
| NARRATOR | Daniel - Steady Broadcaster | 553 | 283 | 27,228 | 10,889 |
| HOLLIS | James (cloned) | 109 | 69 | 2,498 | 998 |
| SCANNER | Vector - Tec Voice | 62 | 20 | 1,924 | 769 |
| PRUDENCE | Jessica | 36 | 4 | 435 | 175 |
| INGRID | Matilda | 35 | 28 | 2,048 | 816 |
| BRUNO | Rich - Southern US | 32 | 21 | 2,100 | 839 |
| RUFUS | Callum | 32 | 17 | 1,093 | 435 |
| TORVALD | Brian | 29 | 7 | 445 | 178 |
| TUCKER | Jordan - Warm & Gritty | 28 | 9 | 663 | 266 |
| HALVORSEN | Will | 25 | 18 | 1,574 | 629 |
| HARROW | Lily | 23 | 18 | 1,521 | 611 |
| TABITHA | Hollie Sue | 19 | 8 | 592 | 236 |
| SYSTEM | The Curator | 18 | 13 | 761 | 305 |
| GORDON | Adam | 18 | 17 | 1,437 | 575 |
| RENATA | Hollie - Kind, Enthusiastic | 17 | 7 | 550 | 220 |
| OZZIE | Topher | 14 | 13 | 1,220 | 488 |
| GUS | Bill | 13 | 5 | 247 | 99 |
| RADIO | Eric | 4 | 2 | 174 | 70 |
| TABLET | AGEIS-7 4/10 | 1 | 0 | 0 | 0 |

## Generated clips by room/scene (act numbers are not present in the data; order = priority, room progression, source order)

multiple: 79, phone: 61, shipoffice: 57, finale: 51, inventory: 46, ops: 43, outbound: 41, yard: 35, break: 32, lockers: 21, inbound: 18, hr: 17, floor: 12, parts: 11, mgmt: 8, drain: 6, suite: 6, staging: 5, racks: 4, charging: 3, tunnel: 2, smoke: 1

## Unresolved

* Dynamic lines held: 28 — see `docs/audio/dynamic_resolution.csv` (finite variants / restructure / text-only decision still needed).
* Quoted narration with embedded speech or speaker change held for splitting: 113 — needs multi-segment voice entries (new ids) before generation.
* Failed: [('vo_ingrid_c3b222f546', '401 {"detail":{"type":"invalid_request","code":"quota_exceeded","message":"This request exceeds your quota of 40000. You have 9 credits remaining, while 54 credits are required for this request.","status"'), ('vo_narrator_71ff504bba', '401 {"detail":{"type":"invalid_request","code":"quota_exceeded","message":"This request exceeds your quota of 40000. You have 9 credits remaining, while 50 credits are required for this request.","status"'), ('vo_narrator_9467dd2007', '401 {"detail":{"type":"invalid_request","code":"quota_exceeded","message":"This request exceeds your quota of 40000. You have 9 credits remaining, while 57 credits are required for this request.","status"'), ('vo_narrator_fa58fdda97', '401 {"detail":{"type":"invalid_request","code":"quota_exceeded","message":"This request exceeds your quota of 40000. You have 5 credits remaining, while 62 credits are required for this request.","status"'), ('vo_hollis_56d81c31f4', '401 {"detail":{"type":"invalid_request","code":"quota_exceeded","message":"This request exceeds your quota of 40000. You have 5 credits remaining, while 11 credits are required for this request.","status"')]

## Files

* Audio: `assets/audio/voice/<speaker>/<id>.mp3`
* Manifests: `assets/audio/manifests/voice_production_manifest.json|csv`, `voice_manifest.json` (file links), `voice_generation_queue.json`, `voice_generation_log.json` (ledger), `voice_manifest_pre_generation.json` (frozen), `voice_cast_locked.json`
* QA: `docs/VOICE_QA_QUEUE.md|csv`

## Credit limit reached (read this first)
The ElevenLabs account is on the **Starter** plan with a hard 40,000-credit monthly limit (`can_extend_character_limit: false`); 21,401 were already used before this pass and the pass consumed **18,598** (API headers; ~0.4 credits per character on `eleven_v4`). The remaining **364 READY lines (28049 chars, ≈11220 credits)** returned `quota_exceeded` and are recorded in the ledger as FAILED with `failure_kind: quota_exceeded` — they are **not** synthesis failures. The account is at ~1 credit until the reset (Dec 9) or a plan upgrade/top-up. To finish: top up, then `python3 tools/audio/generate_vo.py --workers 3` (resume-safe; skips the 559 done).

Generated by priority tier: {'core_or_triggered_dialogue': 559}. Still pending: {'core_or_triggered_dialogue': 199, 'interaction_voice': 34, 'optional_interaction_voice': 131}.
