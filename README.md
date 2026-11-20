# MINT MAN: Tuesday at the Dock

A static HTML5 point-and-click adventure. Open `index.html` (any static host / itch.io upload works; `tools/serve.sh` starts a local server).
No build step, no framework, no backend. Three.js (r160, pinned) is loaded from the jsDelivr CDN and is optional: if it cannot load, the classic Canvas2D renderer runs the whole game.

```
index.html                  loads src/*.js as plain scripts, in dependency order
src/                        game (state, engine, ui, save, rooms, story, logic, patches, parser, main, tests API, audio)
src/rendering/              classic Canvas2D renderer + Three.js visual layer (see GRAPHICS_MIGRATION_NOTES.md)
assets/audio/               voice / sfx / ambience folders + manifests (empty; see AUDIO_ARCHITECTURE_NOTES.md)
assets/models, textures/    reserved (nothing needed yet: all geometry/textures are procedural)
legacy/                     known-good rollback builds (single-file original + the break-room-only Three.js prototype)
tests/                      Playwright suites (dev only): cd tests && npm i && ./run-all.sh
tools/                      serve.sh, audio/validate_manifests.js, dev/ provenance
docs/                       earlier break-room prototype notes + screenshots
```

Dev toggles: `F8` classic/three renderer, `F9` hotspot debug overlay (works in every room); URL `?renderer=classic`, `?hotspots=1`, `?classicrooms=yard,suite`.
Docs: `GRAPHICS_MIGRATION_NOTES.md`, `AUDIO_ARCHITECTURE_NOTES.md`.
