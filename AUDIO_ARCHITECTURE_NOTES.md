# Audio architecture notes (architecture only — no audio was generated)

Audio is presentation. **A missing file, manifest, decode error or blocked autoplay never throws, never delays dialogue, never gates a puzzle or a room.** The existing WebAudio synth (`Snd`) is the fallback for every effect.

## 1. Layout
```
assets/audio/
  voice/<speaker>/   hollis narrator ingrid bruno prudence tucker rufus torvald halvorsen tabitha harrow
                     ozzie gus renata gordon juno radio phone scanner system hr tablet other   (.gitkeep)
  sfx/               (.gitkeep)
  ambience/          (.gitkeep)
  manifests/         voice_manifest.json  sfx_manifest.json  ambience_manifest.json
tools/audio/validate_manifests.js
src/audio.js         Snd (synth, unchanged) + MMAudio (manager)
```
`Audio` (the browser's built-in constructor) is deliberately not shadowed: the manager is `MMAudio`.

## 2. Manifests (schema v1; fetched only over http(s) — `file://` runs silently without external audio)
**Voice** — matched at runtime by `(speaker, exact text)`; engine ids are not needed.
```json
{ "id": "hollis_act6_warehouse_right", "speaker": "HOLLIS",
  "text": "The warehouse never stopped being right. It was just underreported.",
  "file": "assets/audio/voice/hollis/vo_hollis_act6_warehouse_right.mp3", "volume": 1, "notes": "optional" }
```
`speaker` is the tag used on screen (`NARRATOR` for untagged lines). `text` excludes the `SPEAKER: ` prefix.
**SFX** — `{ "id": "click", "file": null | "assets/audio/sfx/click.mp3", "volume": 1 }`. Ids are the names the engine already passes to `Snd.play` (21 pre-listed: click beep scan scanfail pickup reverse dock bump pallet printer radio buzz vend bark meow meows card mint fail win kpi). `file: null` ⇒ keep the synth. Replace entries one at a time.
**Ambience** — `{ "id": "breakroom_hum", "file": null | "...", "volume": 0.6, "rooms": ["break"] }`; 16 ids pre-listed. Room→id map is `MMAudio.ROOM_AMBIENCE` (`break→breakroom_hum`, `floor→warehouse_floor`, `yard/smoke/drain/remote→yard_exterior`, `shipoffice→shipping_office`, `outbound/inbound→loading_dock`, `suite→regional_suite`, …).
The extracted package has since been supplied and reconciled (section 8).

## 3. API (`MMAudio`, `src/audio.js`)
`voice(idOrEntry)`, `stopVoice()`, `sfx(id)` (true if an asset played, else caller uses synth), `setRoomAmbience(roomId, fadeSec)`, `stopAmbience(fade)`, `setVolume(cat, 0..1)` / `mute(cat, bool)` (cats: master, voice, sfx, ambience, music; volumes persisted in `localStorage`), `preload(kind)`, `loadManifests()`, `lookupVoice(who, text)`, `stats`. Buffers are decoded once and cached; failed loads are cached as `null` (no retry storm).

## 4. Integration seams (the only engine edits are 2 guarded lines in `ui.js:sayImpl`)
* **Dialogue**: when a dialogue page appears, `MMAudio.onSayPage(who, text, pageIndex)` starts the matching clip *fire-and-forget* (page 0 only); the subtitle always displays and the existing click/space advance is untouched. Advancing calls `stopVoice()`, so the player interrupts VO. No lip sync.
* **SFX**: `Snd.play` is wrapped: external asset if loaded, otherwise the original synth runs. Test mode (`G.fast`) stays silent as before.
* **Ambience**: a 300 ms watcher reads `G.S.room` and cross-fades beds (1.5 s) — works for loads, scripted moves and normal exits without touching `enterRoom`. No file ⇒ the previous bed fades out and the room is quiet.
* Music (`Snd` synth loop, `N` toggle) is unchanged.

## 5. Validation
`node tools/audio/validate_manifests.js [--strict]` checks schema/duplicate ids/missing files/speaker folders and **whether each voice `text` still exists in the current dialogue source** (reports stale entries; never edits dialogue). Run it against any extracted ElevenLabs manifest package before wiring files.

## 6. Next phase — plugging in generated assets
1. Drop the extracted manifest entries into `voice_manifest.json` (keep the `speaker`+`text` exactly as in game), run the validator, fix/report mismatches (do not edit dialogue to fit).
2. Put files under `assets/audio/voice/<speaker>/` (mp3 or wav); paths in the manifest are project-root relative.
3. SFX: set `file` on the matching ids; ambience: set `file` (looping, seamless) on the 16 ids.
4. Host over http(s) (itch.io/static host/`tools/serve.sh`). Audio starts after the first click/tap (browser policy; the game already unlocks on first click).
5. Optional later: per-speaker volume, subtitle-synchronised hold-until-clip-end (currently never waits), VO preload per act via `MMAudio.preload('voice')`.

## 7. Tested (`tests/audio.js`, served over http with in-memory test manifests/WAV)
Voice clip starts for a matching line while the subtitle shows; advancing stops it; a manifest entry whose file is missing leaves dialogue fully functional; SFX asset replaces the synth when loaded and `null`/missing entries fall back silently; ambience starts, fades out for a room with no file, and restarts on return; volume/mute calls run; console clean (missing files = silent 404).

## 8. Extracted package reconciliation & permanent IDs (`tools/audio/reconcile_package.py`)
Inputs (kept in `tools/audio/package/`): `voice_core.csv` (876 rows), `voice_interactions.csv` (187), `voice_manual_review.csv` (157), `dynamic_dialogue_review.csv` (75 expressions).
* **1,220 rows → 1,068 unique permanent ids.** 152 rows were duplicates (the manual-review file repeats core/interactions rows) and merged without any text/speaker/channel conflict; review flags were unioned.
* **ID scheme (reverse-engineered and verified on 1,068/1,068 rows):** `vo_<speaker>_<sha1("SPEAKER|channel|text")[:10]>`. Ids are **frozen once registered** in `tools/audio/id_registry.json`: edited text never changes an id (the entry becomes `stale_text` and its audio must be regenerated); removed lines are `retired`, never reused. New lines get ids with the same scheme.
* All 1,068 texts still exist in the current source. Status: **1,058 `active`**, **10 `blocked_dynamic`** (fragments of runtime-assembled strings such as `has nothing to say to Hollis right now.` — not recordable as-is), 0 `stale_text`.
* Manifest (`voice_manifest.json`, schema v2) now holds all 1,068 entries with `file: null` and the agreed `planned_file` (`assets/audio/voice/<speaker>/<id>.mp3`), current `src` file:line and the legacy line numbers. After generating audio run `python3 tools/audio/link_generated.py` to link files; only entries with a file are indexed by the runtime.
* **Runtime match** is `(speaker, text)` after removing a leading stage direction, exactly how the package stored `spoken_text` (`BRUNO: (radio) I don't…` → BRUNO / `I don't…`; the direction lives in `direction`). `tests/voice-ids.js` proves all 1,058 active entries resolve to their own id.
* **Dynamic dialogue** (`docs/audio/dynamic_resolution.csv`): per expression, class (`finite_conditional`, `finite_random`, `runtime_assembled`, `finite_other`), how many literals the package already covers and the action. Finite ones are fixed full strings → already matchable when covered; `runtime_assembled` ones (item names, counts, joined lists, template literals) need a refactor into fixed sentences before they can be voiced — nothing was changed in the game.
* **Coverage gap:** the extractor treated only `say(...)`-style calls as dialogue, so bare-string prop handlers (`LOOK: '…'` in `rooms.js`) and some `story.js` narration are missing. 361 such strings are in `docs/audio/uncovered_candidates.csv` with **reserved ids** (`candidate_unextracted`; 297 look like dialogue, 64 like hints/labels). They are *not* in the manifest until approved.
Full numbers: `docs/audio/reconciliation_report.md`.

## 9. Production-side manifests (built by `tools/audio/build_production.py`; nothing generated, no API calls)
In `assets/audio/manifests/`: `source_package/*.csv` (the original extraction, imported as-is) · `voice_manifest.json` (reconciled, permanent ids) · **`voice_production_manifest.json/.csv`** (final VO production list, 1,068 lines tiered) · `voice_manual_review_manifest.json` (held lines, `decision` field open) · `voice_dynamic_manifest.json` (75 dynamic expressions + blocked fragments) · `cast_sheet.json` + `docs/audio/CAST_SHEET.md` · `audition_manifest.json` · `elevenlabs_generation_manifest.json` (911 jobs, 73,000 characters, voice slots unassigned, model undecided).
Tiers: **A ready 911** (generate=true) · **B quoted narration 118** (pending approval, recommend one narrator take) · **C embedded speaker change 29** (decide: one take or split) · **D blocked dynamic 10** (do not record). Audition next: pick voices per speaker from `audition_manifest.json`, then fill `voices[<speaker>].voice_id` and run the generator.

## 10. Status after the production passes
* **Voice:** 1,053 clips generated (923 single lines, 103 approved quoted-text lines, 27 clips for 10 multi-segment passages). A multi-segment entry has the full on-screen text as its match key and a `segments` list; the runtime plays the clips in order, and advancing stops all. Remaining: 28 `HOLD_DYNAMIC`, 4 text-only. See `docs/VOICE_PRODUCTION_REPORT.md`, `tools/audio/split_decisions.json`.
* **SFX:** all 21 effect ids have clean generated clips (`assets/audio/sfx/*.mp3`, `meow` has 3 random variants); originals kept in `assets/audio/sfx/_raw/`, loudness-matched with a gain-only pass (+ safety limiter). The synth remains the fallback. Prompts: `tools/audio/sfx_prompts.json`; ledger: `assets/audio/manifests/sfx_generation_log.json`; regenerate one with `python3 tools/audio/generate_sfx.py --ids click --force`.
* **Ambience:** all 16 looping beds generated (20 s, `loop=true`, clean steady room tone; `assets/audio/ambience/*.mp3`, originals in `_raw/`), level-matched to about -34 dB mean with a gain-only pass and played at 0.55 x the ambience bus. Room -> bed map: `MMAudio.ROOM_AMBIENCE`; rooms cross-fade over 1.5 s. Five beds (hr_office, operations_office, regional_lobby, locker_room, warehouse_racks) came out of the generator very quiet and were boosted 16-40 dB: audition for hiss. Prompts `tools/audio/ambience_prompts.json`, ledger `ambience_generation_log.json`, tests `tests/ambience.js`.
* **PARKED:** the 28 `HOLD_DYNAMIC` lines (item names, counts, joined lists) - decision pending; see `docs/audio/dynamic_resolution.csv`.
* Audition everything in `listen.html` (voices + SFX).

> Note: the 2025 graphics pass (GRAPHICS_MIGRATION_NOTES.md §13) did not touch the audio system, assets, manifests or ledgers.
