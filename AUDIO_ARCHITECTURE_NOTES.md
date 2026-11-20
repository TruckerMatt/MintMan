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
No manifest package was supplied with this task, so none was integrated and **no dialogue ids were invented**.

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
