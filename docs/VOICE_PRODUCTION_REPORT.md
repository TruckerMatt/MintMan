# Voice production report

Generated 2026-11-21 by `tools/audio/report_vo.py` from the ledger `assets/audio/manifests/voice_generation_log.json`.

## Counts

* Manifest entries at generation start: **1068** (frozen in `voice_manifest_pre_generation.json`).
* Eligible/READY at preflight: **1309** (tts_text characters at preflight: 110,810).
* **Generated this pass: 1299** (QA_REQUIRED 1309, GENERATED 0); characters generated **109,538**; credits reported by the API headers **46,335**.
* Failed: **0**. Still READY but not generated: **0** (0 chars).
* TEXT_ONLY (tutorial/control/hint, no credits spent): **4**.
* HOLD_DYNAMIC (runtime-assembled): **27**.
* HOLD_SPLIT_REQUIRED (embedded speaker / unclear quoted speech): **0**.
* APPROVED_EXISTING: **0** (the audition clips were never saved to the repo, so none are reused).
* Manual QA required: **1299** (every generated clip: listening QA not yet performed).

## Settings

Model `eleven_v4`, `mp3_44100_128`, voice default settings (no overrides), one take per job, 2 technical retries max, no post-processing/normalisation applied. Text sent = `tts_text`; on-screen text untouched. Radio/phone clips are clean (filter belongs in the game audio layer).

## Speaker totals

| speaker | voice | entries | generated | chars generated | credits |
|---|---|---|---|---|---|
| NARRATOR | Daniel - Steady Broadcaster | 714 | 690 | 63,349 | 26,790 |
| SCANNER | Vector - Tec Voice | 117 | 113 | 10,365 | 4,481 |
| HOLLIS | James (cloned) | 109 | 109 | 3,802 | 1,572 |
| INGRID | Matilda | 61 | 60 | 5,827 | 2,477 |
| PRUDENCE | Jessica | 38 | 38 | 3,061 | 1,330 |
| BRUNO | Rich - Southern US | 38 | 38 | 2,918 | 1,198 |
| RUFUS | Callum | 32 | 32 | 2,166 | 908 |
| TORVALD | Brian | 31 | 31 | 2,083 | 897 |
| TUCKER | Jordan - Warm & Gritty | 30 | 30 | 2,362 | 1,015 |
| SYSTEM | The Curator | 30 | 28 | 1,651 | 697 |
| HALVORSEN | Will | 27 | 27 | 2,384 | 985 |
| HARROW | Lily | 23 | 23 | 1,884 | 770 |
| TABITHA | Hollie Sue | 21 | 21 | 1,561 | 662 |
| GORDON | Adam | 18 | 18 | 1,456 | 583 |
| RENATA | Hollie - Kind, Enthusiastic | 17 | 17 | 1,271 | 539 |
| OZZIE | Topher | 14 | 14 | 1,294 | 521 |
| GUS | Bill | 13 | 13 | 881 | 377 |
| RADIO | Eric | 6 | 6 | 1,074 | 467 |
| TABLET | AGEIS-7 4/10 | 1 | 1 | 149 | 66 |

## Generated clips by room/scene (act numbers are not present in the data; order = priority, room progression, source order)

multiple: 550, shipoffice: 85, inventory: 83, staging: 80, outbound: 65, phone: 63, finale: 62, ops: 49, break: 47, yard: 40, lockers: 26, hr: 26, racks: 24, inbound: 21, floor: 19, suite: 18, parts: 14, mgmt: 10, drain: 7, charging: 5, tunnel: 3, smoke: 2

## Unresolved

* Dynamic lines held: 27 — see `docs/audio/dynamic_resolution.csv` (finite variants / restructure / text-only decision still needed).
* Quoted narration with embedded speech or speaker change held for splitting: 0 — needs multi-segment voice entries (new ids) before generation.
* Failed: []

## Files

* Audio: `assets/audio/voice/<speaker>/<id>.mp3`
* Manifests: `assets/audio/manifests/voice_production_manifest.json|csv`, `voice_manifest.json` (file links), `voice_generation_queue.json`, `voice_generation_log.json` (ledger), `voice_manifest_pre_generation.json` (frozen), `voice_cast_locked.json`
* QA: `docs/VOICE_QA_QUEUE.md|csv`
