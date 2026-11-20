# MINT MAN — Three.js Break Room Prototype: Notes

Output: `MINT_MAN_TUESDAY_THREE_BREAKROOM.html` (the rebuilt Tuesday game + one extra `<script>`).
Source of the extra script: `src/three_breakroom.js`. Rebuild: `python3 build_three_breakroom.py`.
The original `MINT_MAN_TUESDAY_LOGIC_REBUILD.html` is untouched (sha256 `06e4521644f8b413…`, byte-identical to the file supplied).

## 1. Architecture

```
GAME STATE (G, G.S)  ← authoritative, unchanged
  ├─ existing gameplay / hotspot / input / UI code  (Canvas2D, unchanged)
  └─ Three.js visual adapter  (reads state, draws pictures, writes nothing)
```

* The prototype file = the original file's text, with **one `<script>` appended** (no original line edited).
* Hooks (all by re-binding existing globals, the same pattern the engine itself uses for `onKey`/`drawUI`):
  * `drawScene` – if `G.S.room === 'break'` and the Three renderer is ready and selected, render the 3D scene and clear the Canvas2D scene window; otherwise call the original `drawScene` untouched.
  * `onKey` – adds debug keys `F8` / `F9`, then delegates. No extra event listeners are registered by the adapter.
* **Layering:** a `<div id="stage">` wraps the game canvas. The Three canvas sits *behind* the (now transparent-background) game canvas and is limited to the top 144/240 of it (the scene window), `pointer-events:none`.
  Canvas2D still draws everything above the 3D picture: verb bar, inventory, dialogue box, menus, hints, act cards, fades, toasts, exit arrows, Mint-mode badge/tags. They stay pixel-crisp because they were never moved.
* **Render loop:** no new `requestAnimationFrame`. The Three render happens inside the engine's own `frame()` → `drawScene()`, once per engine frame, with `G.t` as the only clock. Nothing writes `G.t`.
* **Input:** unchanged. `mpos()` → `pickAt()` → hotspot → `perform()`. No Three raycasting.
* **Fallback:** if the Three module fails to load, or the 3D render throws, the adapter sets `status='failed'`, hides its canvas and the classic break room draws exactly as before (tested with the CDN blocked).

## 2. Three.js version / dependency

`three@0.160.0` ES module, loaded with a dynamic `import()` from `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js` (pinned). To go offline/itch.io: change the single `THREE_URL` constant (or set `window.MM3_THREE_URL` before the script runs) to a local copy. No other libraries (no addons, no post-processing library).
(`renderer.useLegacyLights = true` is used for predictable light units; r160 prints a deprecation notice for it. Drop it and rescale light intensities when moving past r160.)

## 3. Coordinate adapter (`L2W`, `W2L` in `src/three_breakroom.js`)

Logical space: `x` (0–320), `y` = the screen row of a point on the **floor**, `h` = height above the floor, all in logical pixels.
The classic renderer draws "a thing standing at floor row *y* with height *h*" at screen row `y − h`.

A **45° orthographic camera with an anisotropic frustum** (`left −160, right 160, top 72/√2, bottom −72/√2`, looking at `(160, 0, 72)`) reproduces exactly that projection when
`world = ( x , h , y )`  →  `screen_x = x`, `screen_y = y − h`.

So every hotspot rectangle (defined in screen space) lines up with the 3D object that stands on the same floor row, with no per-object fudge factors:
`Hollis = L2W(S.jx, S.jy)`, `Juno = L2W(S.ax, S.ay)`, `cat = L2W(c.x, c.y)` (cats whose logical y is above the wall base are *perched*: `z=86`, `h` = top of the prop under them – vending/counter/fridge/ledge). All authoring (boxes) is done in these logical units, so there is a single conversion point.
Test result: the 3D Hollis/Juno positions equal `S.jx/jy`, `S.ax/ay` to within 0.01 px after real-click movement.

## 4. Renderer toggle and hotspot debug

| What | How |
|---|---|
| Switch `BREAKROOM_RENDERER` = `'three'` / `'classic'` | `F8` in game, `?renderer=classic` in the URL, `window.BREAKROOM_RENDERER = …`, or `MM3.setRenderer('classic')` |
| Hotspot debug overlay | `F9`, `?hotspots=1`, `window.BREAKROOM_HOTSPOTS = true`, or `MM3.setHotspots(true)` |
| Inspect | `MM3.status`, `MM3.debugState()`, `MM3.info()`, `MM3.perf` |

The overlay (Canvas2D, drawn over the 3D scene) outlines the **real** rectangles used by `pickAt()`: props (cyan), exits (yellow), Juno hit box (magenta), cat hit boxes (orange), plus Hollis's feet/height (green). The toggle changes no state (tested: `G.S` byte-identical before/after F8).

## 5. What was recreated

Floor (checker tiles, seams, wear, stains, coffee ring) · back wall with scuffed wainscot, rail, baseboard · three hanging fluorescent fixtures · LOCKERS door (frame, wire-glass window, lever, kick plate, sign) = the exit · bulletin board (EOM: VACANT, safety notice, flyer that disappears when taken) · wall clock fixed at 9:02 (battery pack disappears when taken) + the ledge a cat sits on · couch (frame, cushions, arms, lost pen cap) · break table (battered edge, napkin, "Form 3", mug) + two plastic chairs · counter (cabinet doors, wood top, sugar packets) · coffee maker · microwave (+ "PLEASE DO NOT MICROWAVE FISH / SERIOUSLY.") · fridge (+ Tucker's note, magnets, grime) · vending machine (lit glass, 12 product slots, keypad, coin slot, D4 light, dispenser tray, dents, taped warning; D4/tray glow when `mint_ready && !mint_taken`) · the dark gap behind it with the blinking radio (until `radio_found`) · waste bin · cat bowl + "NOT A CAT BOWL" card (until taken) · crumpled label (until taken) · paw-print trails.
Decorations were limited to text that restates existing LOOK text (or is generic dressing: "CLEAN AS YOU GO" – already in the counter's LOOK text; vending "MACHINE KEEPS YOUR CHANGE. IT KNOWS." – decoration, no puzzle meaning). Nothing implies a new puzzle.

State-driven visuals (read each frame from `G.S.f`): `took_flyer`, `clock_battery`, `bowl1_taken`, `took_label`, `radio_found`, `mint_ready`/`mint_taken`, `lights_calm` (stops the fluorescent flicker, as classic), `armband_on` (Juno's green band), `junoWith`, `hideHollis`, `rooms.break.noHollis/noJuno`, `G.endMint`/`G.endCat` (their classic `fg()` overlay still runs).

## 6. Lighting

Hemisphere fill (cool sky/warm ground) · one shadow-casting directional "ceiling" key (1024² PCF-soft map) · 3 cool-green point lights at the fluorescent fixtures (no shadows) · warm vending-machine point light + a green D4 light · a warm dusty light over the couch · emissive tubes/vending glass/microwave LED/coffee-maker LED · classic's flicker trigger (`sin(t·22) > 0.7`) reproduced on tube emissive + fixture lights · full-screen multiply vignette for darker corners. Fixture shadows fall on the wall like real hanging lights.

## 7. Characters (all boxes, animation is visual only)

* **Hollis** – cap + brim, skin head with stubble patch and heavy-lidded eyes, gray shirt/sleeves, blue vest with two yellow stripes, belt, jeans, brown boots. ~40 boxes baked into 6 vertex-coloured meshes. Walk cycle when `G.walking`; breathing and tiny head sway when idle; turns smoothly through the camera when `S.face` flips.
* **Juno** – black/white dog with white chest/muzzle/socks, tan brows, tail wag. Poses mapped from the engine's real values: `stand`, `walk` (`G.junoMoving`), `sit`, `lay` (opening), `sniff`, `bark` (open jaw + the classic "WOOF!" text), `tilt`; green armband when `armband_on`.
* **Cats** – pooled (up to 40), position/pose/colour come from `catList()` and the same `CAT_COLS`/`rnd(seed)` as the pixel cats, so colours match. Half-lidded eyes (judgmental), tail flicks, occasional head turn; sleepers keep the classic "z".

## 8. Mint Mode (visual only – driven by `S.mintOn`, `S.mint`)

Time-based ramp into: cyan-green multiply grade (hue-cycling at level ≥ 3, like classic), scrolling additive scan lines, dimmer lights, a pulsing neon "data cage" around the vending machine, a faint scrolling floor grid. The classic text pieces are kept in Canvas2D: `DISPENSES: ???` tag (from the prop's own `mintTag`) and the `MINT MODE` badge. No new information is shown.

## 9. Hotspot alignment approach

Single projection (section 3) + the debug overlay. Furniture was authored so that its projected silhouette ≈ its rect: e.g. vending machine `z 83→92`, `h 34` ⇒ rect top `83−34 = 49` vs rect 50. Where 3D depth makes an object a few px taller on screen than its pixel sprite (microwave/vending bottoms +3–6 px, couch top, etc.) the *object* was left as is and the hotspot rectangle untouched. **No hotspot rectangle was changed.**
Known quirk (existing in classic as well): when entering the locker area Juno stands over the middle of the "break room" exit rect, so clicking that exact spot hits Juno (the top/bottom of the rect still works).

## 10. Tests actually executed (Playwright + Chromium, SwiftShader software GL; scripts in `tests/`)

| Suite | Result |
|---|---|
| `tests/real.js` – real mouse/keyboard, non-fast mode: TEST 1 new game (full opening dialogue), 2 movement (4 floor clicks; 3D Hollis == `S.jx/jy` ±0.01), 3 Juno follow + Juno hotspot, 4 radio via JUNO on the gap, 5 clock battery → scanner, 6 vending (quarters from couch, menu, crackers), 7 cat, 8 exit to lockers (classic renderer) and back (Three resumes), 9 dialogue box over the 3D scene, 10 save → reload → continue (3D props match flags), 11 Mint Mode on/off (level 1 and 3 screenshots), 12 `F8` classic/three toggle (state JSON byte-identical) | **26 / 26 pass**, no console errors |
| `tests/regress.js` – the same scripted break-room puzzle chain (~30 steps through `G.do`/`G.go`, `G.strict` clickability on every prop/exit/verb, `G.testInvariants`) run once with `renderer=classic` and once with `renderer=three` | **11 / 11 pass**; final `G.S`, dialogue log, step results, engine errors and invariants identical between renderers |
| `tests/final.js` – pixel diff of `drawScene()` at fixed time for all 20 rooms against the original file; CDN-blocked run | **5 / 5 pass**: 19 non-break rooms identical in `three` mode, all 20 rooms (incl. break) identical in `classic` mode, blocked CDN → `status=failed`, classic break room, game still plays, no page errors |

**TEST 13 caveat (honest):** the project's own full story regression suite was not part of the files supplied, so it was *not* run. What was run is listed above. The Three.js script contains no writes to `G`/`G.S` (grep-able: it only assigns `window.*`, its own objects and the debug toggles), and the differential tests show identical state with and without it. The only flake met while building the harness was engine-side: the classic renderer's screen-shake calls `Math.random` per frame, which makes `RAND()` dialogue picks depend on frame timing; the test now ignores `Math.random` calls made from the render functions.

## 11. Performance

Scene budget (WebGL counters after merging static meshes and baking character bones, shadow pass included): ~260 draw calls / ~5k triangles in Act 1 (1 cat), ~440 / ~7k with 7 cats, ~860 / ~12k with all 30 cats (Act 3+). One 1024² shadow map, 960×432 canvas, no post-processing library, no physics.
The sandbox has no GPU: software GL (SwiftShader) ran ≈ 7 fps at 960×432 and ≈ 32 fps at 320×144, i.e. strictly fill-rate bound, so those numbers say nothing about a real GPU — only that cost scales with pixels. JS-side cost of the adapter was ≈ 3–5 ms/frame (includes issuing the GL commands). On real hardware this scene is expected to be trivial; **it should still be measured on a mid-range phone** before the approach is expanded. Cheap levers if needed: `RES` 3→2, shadows off for cats (already off beyond the 12th cat), fewer cats in the shadow pass.

## 12. Limitations

* 45° anisotropic projection means depth is "squeezed" the way the pixel game squeezes it: very deep objects (couch, table, counter) are chunky/shallow. This is what keeps hotspots exact; a lower, more natural camera would need a hotspot re-author.
* Side/ceiling not visible (flat-fronted diorama); "ceiling impression" is the fixtures + shadows only.
* Hollis/Juno/cats are deliberately blocky; faces are tiny at 1× logical scale.
* The CDN is a runtime dependency until `THREE_URL` is made local.
* Sleeping-cat "z" and Juno's "WOOF!" are Canvas2D text (kept from classic).
* Not tested on a real GPU/phone, and not visually reviewed in Safari/Firefox.

## 13. To expand to other rooms

1. Per-room 3D scene builders keyed by `G.rooms[id]` (props authored in logical units against the same `L2W`).
2. Generalise the `drawScene` hook from "break" to a `THREE_ROOMS` set; move the room-specific `PERCH` table, wall row (`WALL_Y`) and light set into the room builder.
3. Extract the box/merge/bake helpers into a tiny kit; add NPC builders (the `PEOPLE` table in `02_art.js` already has the colours/props).
4. Decide on a local bundle (or a single self-hosted `three.module.min.js`) and add a texture-atlas budget.
5. Keep the rules proven here: engine authoritative, canvas2D UI on top, no raycasting, classic fallback per room, pixel-diff tests for untouched rooms.
