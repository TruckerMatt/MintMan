# Voice production report

Generated 2026-11-21 by `tools/audio/report_vo.py` from the ledger `assets/audio/manifests/voice_generation_log.json`.

## Counts

* Manifest entries at generation start: **1068** (frozen in `voice_manifest_pre_generation.json`).
* Eligible/READY at preflight: **1063** (tts_text characters at preflight: 89,183).
* **Generated this pass: 1053** (QA_REQUIRED 1063, GENERATED 0); characters generated **87,911**; credits reported by the API headers **36,813**.
* Failed: **0**. Still READY but not generated: **0** (0 chars).
* TEXT_ONLY (tutorial/control/hint, no credits spent): **4**.
* HOLD_DYNAMIC (runtime-assembled): **28**.
* HOLD_SPLIT_REQUIRED (embedded speaker / unclear quoted speech): **0**.
* APPROVED_EXISTING: **0** (the audition clips were never saved to the repo, so none are reused).
* Manual QA required: **1053** (every generated clip: listening QA not yet performed).

## Settings

Model `eleven_v4`, `mp3_44100_128`, voice default settings (no overrides), one take per job, 2 technical retries max, no post-processing/normalisation applied. Text sent = `tts_text`; on-screen text untouched. Radio/phone clips are clean (filter belongs in the game audio layer).

## Speaker totals

| speaker | voice | entries | generated | chars generated | credits |
|---|---|---|---|---|---|
| NARRATOR | Daniel - Steady Broadcaster | 568 | 544 | 50,726 | 21,224 |
| HOLLIS | James (cloned) | 109 | 109 | 3,802 | 1,572 |
| SCANNER | Vector - Tec Voice | 62 | 58 | 5,686 | 2,427 |
| PRUDENCE | Jessica | 37 | 37 | 3,036 | 1,319 |
| INGRID | Matilda | 37 | 35 | 2,478 | 1,005 |
| BRUNO | Rich - Southern US | 35 | 35 | 2,849 | 1,168 |
| RUFUS | Callum | 32 | 32 | 2,166 | 908 |
| TORVALD | Brian | 30 | 30 | 2,069 | 891 |
| TUCKER | Jordan - Warm & Gritty | 29 | 29 | 2,338 | 1,004 |
| HALVORSEN | Will | 26 | 26 | 2,261 | 931 |
| HARROW | Lily | 23 | 23 | 1,884 | 770 |
| TABITHA | Hollie Sue | 20 | 20 | 1,476 | 625 |
| SYSTEM | The Curator | 19 | 17 | 1,053 | 433 |
| GORDON | Adam | 18 | 18 | 1,456 | 583 |
| RENATA | Hollie - Kind, Enthusiastic | 17 | 17 | 1,271 | 539 |
| OZZIE | Topher | 14 | 14 | 1,294 | 521 |
| GUS | Bill | 13 | 13 | 881 | 377 |
| RADIO | Eric | 5 | 5 | 1,036 | 450 |
| TABLET | AGEIS-7 4/10 | 1 | 1 | 149 | 66 |

## Generated clips by room/scene (act numbers are not present in the data; order = priority, room progression, source order)

multiple: 443, inventory: 83, phone: 63, shipoffice: 62, finale: 59, outbound: 52, ops: 49, break: 44, yard: 40, lockers: 26, hr: 24, inbound: 21, floor: 19, parts: 14, suite: 14, mgmt: 10, racks: 7, drain: 7, staging: 6, charging: 5, tunnel: 3, smoke: 2

## Unresolved

* Dynamic lines held: 28 — see `docs/audio/dynamic_resolution.csv` (finite variants / restructure / text-only decision still needed).
* Quoted narration with embedded speech or speaker change held for splitting: 0 — needs multi-segment voice entries (new ids) before generation.
* Failed: []

## Files

* Audio: `assets/audio/voice/<speaker>/<id>.mp3`
* Manifests: `assets/audio/manifests/voice_production_manifest.json|csv`, `voice_manifest.json` (file links), `voice_generation_queue.json`, `voice_generation_log.json` (ledger), `voice_manifest_pre_generation.json` (frozen), `voice_cast_locked.json`
* QA: `docs/VOICE_QA_QUEUE.md|csv`
