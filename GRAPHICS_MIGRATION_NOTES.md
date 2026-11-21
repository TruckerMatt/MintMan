# Graphics migration notes (Three.js across the whole game)

Status: **every room renders through the Three.js layer; fidelity differs by tier** (see "Honest status"). The engine is unchanged and authoritative.

## 1. Rule that was kept
```
GAME LOGIC -> G.S / G (authoritative) -> visual adapter (read-only) -> Three.js
```
Proof, not promise: `tests/states.js` deep-freezes `G.S` and renders every room — a single write from the renderer would throw (the renderer files are `'use strict'`). It rendered all 20 rooms without a write attempt. Input still goes `mpos() -> pickAt() -> hotspot -> perform()`; there is no raycasting anywhere. Hotspot rectangles, exits, walking, saves, dialogue and UI are untouched Canvas2D/engine code.

## 2. Project structure (static, no build)
`index.html` loads plain scripts in this order (classic scripts share one global scope, exactly like the old single file):
`state, engine, ui, save, rendering/classic-art, rendering/classic-renderer, audio, rooms, story, logic, parser, patches, main, tests, rendering/three-common, rendering/rooms/*, rendering/three-renderer, rendering/renderer`.
The split was mechanical (`tools/dev/split_from_single_file.py`, provenance only). Two things surfaced and were handled: the typed-command parser had to load before `patches.js` (it wraps a function that used to be hoisted from the end of the single file → `src/parser.js`), and `drawScene`/`frame` were moved between files without changing their text. Equivalence was verified before any room work (below).

## 3. Rendering architecture
| file | responsibility |
|---|---|
| `rendering/classic-art.js`, `classic-renderer.js` | the original Canvas2D art + `drawScene`/`drawMint`/`drawExitMarkers` — kept intact as fallback/debug renderer and as the *source art* for the generic room builder |
| `rendering/renderer.js` | THREE↔CLASSIC switch (`MM_RENDERER`, `F8`, `?renderer=`), per-room override `?classicrooms=a,b`, stage/canvas layering, the single `drawScene` hook, Mint badge/tags/exit arrows/hotspot overlay (Canvas2D), loader with graceful failure |
| `rendering/three-renderer.js` | renderer/camera, **permanent light pool** (hemisphere + shadow key + 7 points, constant count ⇒ no shader recompiles on room change), room lifecycle `loadThreeRoom / syncThreeRoom / disposeThreeRoom`, Hollis/Juno/NPC/cat animation from engine state, Mint ramp + grade + scanlines |
| `rendering/three-common.js` | shared kit: `L2W` adapter, materials, `box` helpers, static-batch merge, bone baking, `disposeGroup`, **Hollis, Juno, cat, generic `buildPerson` rig** |
| `rendering/rooms/break-room.js` | hand-modelled benchmark room (from the prototype) |
| `rendering/rooms/auto-room.js` | generic state-aware room builder used by every other room (+ per-room wall row / light theme table `MM3.ROOM_CFG`, `MM3.THEMES`) |
| `rendering/rooms/suite.js` | Regional Suite: auto room + HALO instability effects |

Lifecycle: *enter room → dispose previous (`disposeGroup`: geometries, non-shared materials, textures, shadow maps) → build/select → sync every frame → render.* Light pool is reconfigured, never recreated. Measured: 3 full tours of all 20 rooms leave the WebGL geometry/texture counts identical (3838/3838, 126/126) and every load is matched by a dispose.
One render per engine frame from `frame()`; no second rAF loop; the engine's `G.t` is the only clock.

## 4. Coordinate mapping (unchanged from the prototype)
`world = (x, h, y)`, `screen = (x, y − h)`: a 45° orthographic camera with an anisotropic frustum reproduces the pixel game's projection exactly. `S.jx/jy`, `S.ax/ay`, cat positions and every hotspot stay in logical coordinates; Three objects derive from them through `L2W`. That is why generic rooms can be built straight from existing rectangles.

## 5. How other rooms are built (generic builder)
For any room without a hand-built module:
1. `bg()` is run into an offscreen canvas (the real classic art, at the classic 3×) and mapped onto a **wall plane** (rows above the room's wall row) and a **floor plane** (rows below). Exact screen mapping ⇒ looks like the classic art, but lights/shadows now fall on it.
2. Every visible prop's `draw()` is captured separately and becomes an **extruded standee**: textured front (alpha-cut) standing on its base row + solid sides/tops coloured from the art's own pixels, real depth, real shadows. `z:0` props (kibble trails, ground) become flat floor decals.
3. `Art.person()/Art.npc()` calls made by prop art are **intercepted**: the pixel person is not drawn, a 3D person (`buildPerson`, from the existing `PEOPLE` spec: colours, hat, hair, beard, glasses, vest, proportions) is placed at the same logical position, facing and pose (Tucker waves). `Art.cat()` (e.g. Biscuit, cats the room art draws) likewise.
4. Rebuild happens only when the game state (minus volatile fields like position/time) changes, so taken items, opened doors, moved trailers, sorted freight, calm/panic states, ending states, etc. follow the existing flags automatically — no duplicate visual-only flags. NPC positions are refreshed every frame by replaying only NPC props into a null canvas.
5. Props with a `mintTag` get a neon data-cage in Mint Mode; the tag text/badge stay Canvas2D.

## 6. Characters, cats, performance
* **Hollis / Juno**: one model each, used in all rooms (poses mapped from `G.junoPose`, `G.junoMoving`, `G.junoIdle`; armband from `armband_on`). **NPCs**: one parametric rig (`buildPerson`) – Ingrid, Bruno, Prudence, Tucker, Rufus, Torvald, Halvorsen, Tabitha, Harrow, Gus, Renata, Gordon, Ozzie – all from the existing `PEOPLE` table; stance/silhouette/colour carry the personality, idle breathing and head turns.
* **Cats**: one pooled cat model (≤40 live), colour/pose/stripes from the same `CAT_COLS`/`rnd(seed)` the pixel cats use, deterministic placement from `catList()`, half-lidded eyes, tail flicks, head turns toward Hollis; cats beyond the 12th do not cast shadows. Perching on racks/props in generic rooms is derived from the prop rectangle under the cat. *Not instanced*: cats are animated, so instancing would not help; the cost lever is the shadow caster count.
* Static room geometry merged per material, character bones baked into vertex-coloured meshes, one 1024² shadow map, no post-processing library. Software-GL numbers (no GPU in the sandbox): worst case 879 draw calls (floor, Mint 3, 40 cats); Act-1 break room ≈ 260. **No real GPU/phone measurement was possible** – measure before shipping.

## 7. Mint Mode
Shared: time-based ramp (frame-rate independent), cyan-green multiply grade (hue-cycling at level ≥3, like classic), additive scan lines, dimmer lights, floor grid, neon cages on `mintTag` props, classic tag text and `MINT MODE` badge. Cats are plainly visible in Mint Mode. `NORMAL WORLD muted / FALSE RECORDS ghosted`: implemented for the HALO wall (below). Per-room "routing lines / identity labels / true-vs-false record geometry" beyond what the classic Mint tags already say were **not** added (that would require new per-puzzle visual data; the brief forbids inventing information).

## 8. HALO climax (visual only)
`rooms/suite.js`: while `boss_started && !boss_done`, instability = `1 − S.boss.integrity/100` drives chromatic-split ghost copies of the HALO wall (additive red/cyan/green planes jittering harder as integrity drops), flickering KPI bars, key/hemisphere light flicker and a red fixture shift; with Mint on (or climax) the ghost layer is shown. Mechanics, KPIs, dialogue and the finale script are unchanged.

## 9. Hotspot debug (every room)
`F9` / `?hotspots=1`: cyan props, pink NPC props, yellow exits, magenta Juno box, orange cats, green Hollis, with ids and the room name. Alignment is exact by construction for generic rooms (the geometry *is* the classic art on the same coordinates). Break-room hand-built props were aligned by eye + overlay (see `docs/THREE_BREAKROOM_NOTES.md`).

## 10. Classic fallback
`F8`, `?renderer=classic`, `?classicrooms=…`. Verified pixel-identical to the original file for all 20 rooms in classic mode, and for any room forced classic while the others are Three (`tests/final.js`). Toggling changes no state (byte-identical `G.S` in 5 rooms). CDN failure ⇒ classic everywhere, no page errors.

## 11. Honest status / known limitations
* **Tiering.** Break room = hand-modelled low-poly diorama (the benchmark). The other 19 rooms = *state-accurate extruded classic art with real lighting, shadows, 3D people and cats*. That is consistent and fully aligned, but **it is not the "low-poly modelled" look yet**: racks, pallets, forklifts, trailers, desks, terminals, lockers etc. are still pixel-art silhouettes with depth, and room walls/floors are the classic paintings. The structure is ready for per-room upgrades: drop `rendering/rooms/<id>.js` registering `MM3.rooms[<id>] = {lights, build, sync, catPlace}` (or a factory) and it replaces the generic builder for that room. Suggested order from the brief: floor, shipoffice, outbound, staging, lockers, yard, hr, ops, mgmt, suite (rack/pallet/forklift/trailer/desk/terminal archetypes should be built once in `three-common.js` and reused).
* **Not done in this pass:** a fresh-game→credits canonical playthrough, alternate-order puzzle playthroughs and per-act save/reload sweeps (the project's own full regression suite was not supplied and there is no solver; see section 12 for what *was* run); real-GPU/phone profiling; Safari/Firefox checks; outdoor wind/ambient motion; routing/identity Mint overlays beyond the classic tags; the ending credits are Canvas2D overlays (unchanged).
* The generic builder snapshots art at rebuild time: purely time-animated bits of classic art (blinking lights drawn in props) are frozen between state changes.
* Props whose art is one huge opaque rectangle get a block-shaped extrusion; very large silhouettes can produce several thousand side quads (still one draw call).
* Cats/NPCs drawn by room *art* (e.g. staging shows cats the classic art draws) are shown as 3D cats too, so 3D cat count = `catList()` + room-art cats.

## 12. Tests executed (`tests/`, Playwright + Chromium, SwiftShader software GL, ≈10 min; `./run-all.sh`)
| suite | what | result |
|---|---|---|
| `regress.js` | scripted ~30-step break-room puzzle chain via the test API, strict clickability + engine invariants, run with `renderer=classic` and `renderer=three`; full `G.S`, dialogue log, step results identical | **11/11** |
| `real.js` | real mouse/keyboard: new game, walking, Juno, radio, scanner battery, vending menu, cat, exit/return (Three rebuilds), dialogue, save→reload→continue, Mint, F8/F9 | **26/26** |
| `rooms-suite.js` | strict clickability (all props+exits in 20 rooms), every room renders in Three, 3 full tours leak check, load/dispose balance, F8 toggle in 4 rooms, NPC visibility in all rooms, cat escalation 0–4 (3 rooms), console | **13/13** |
| `final.js` | pixel diff of all 20 rooms vs the original file (classic mode; `?classicrooms`), CDN-blocked fallback | **5/5** |
| `audio.js` | missing/present VO, SFX fallback, ambience crossfade, dialogue never blocked | **12/12** |
| `states.js` | Mint 3 / cats 4 / act 6 sweep, HALO integrity sweep, frozen-state read-only proof, new game after completion, phone portrait+landscape taps | **15/15** |
Last full run: **82/82** checks (regress 11, real 26, rooms-suite 13, final 5, audio 12, states 15). Equivalence of the restructure was verified *before* any room work (regress 11/11, real 26/26, final 5/5 on the multi-file build).

Performance counters (software GL, so only draw-call/triangle budgets are meaningful): Act-1 break room ≈ 260 calls; worst case 879 calls (floor, Mint 3, 40 cats); room rebuild on a state change is a few ms of canvas capture; no GPU memory growth across room tours.

---

## 13. Remaining-rooms graphics upgrade (hand-modelled environments)

Baseline commit before this pass: `27d9b2d`. All 19 non-break rooms are now hand-modelled; the generic extruded-cutout builder is kept as a fallback (`?generic=1` forces it for every room except `break`, `?classicrooms=` / F8 still force the classic renderer). Gameplay, hotspots, save data, dialogue and audio are untouched.

### Room inventory
| Room | Module | Renderer |
|---|---|---|
| break | `rooms/break-room.js` (benchmark) | hand-modelled |
| floor | `rooms/floor.js` | hand-modelled |
| shipoffice, ops, hr, mgmt | `rooms/offices.js` | hand-modelled |
| staging, parts, charging, racks, tunnel | `rooms/warehouse.js` | hand-modelled |
| inbound, outbound | `rooms/docks.js` | hand-modelled |
| yard, smoke, drain | `rooms/outdoor.js` | hand-modelled |
| lockers, remote, gordoncall (+ suite shell) | `rooms/misc.js` | hand-modelled |
| suite | `rooms/suite.js` (HALO effects) over `MM3.suiteSpec` | hand-modelled + HALO effects |

### How a hand room is declared
`MM3.autoRoom(id, spec)` (auto-room.js) accepts a spec: `shell(K, group, ctx)` (built once per visit: floor, walls, fixed fixtures, doors), `props[propId](K, prop, ctx, S)` (one model per hotspot prop, rebuilt when state changes), `extra(K, S, ctx)` (state-dependent room geometry), `hide[]` (props that are part of the shell), `sync`, `catPlace`, `lights`. NPC props are always skipped: their rigs come from the engine, so NPC desks/vehicles are modelled by the room. Unlisted non-NPC props fall back to the generic standee/decal (used for floor route decals). Shell animations (blinkers, LED rows, flicker, bar charts) live in `ctx.anim/flicker` and survive prop rebuilds. Every room module owns disposal through the generic path (`K.disposeGroup`), so the leak test covers them.

### Environment kit (`three-kit.js`, `MM3.envKit(K)`)
Textures: floor (tile/joints/stripes/blots/scanlines), wall (panels/blocks/wainscot). Shell: floor, wall, fixture (flickering tube), truss, sign (canvas text, optional glow). Freight: pallet, cartons, wrapped, loadedPallet, rack (blue uprights / orange beams / loads). Equipment: forklift (cushion/propane/reach, blinking beacon), pallet jack, bollard. Docks: dockDoor, trailer. Office: desk, chair, monitor, cabinet, printer, plant, shelf, window, clock. Employee/utility: lockerBank, bench, door, table, crate, pipe, cableTray. Palette `E.C`.

### State mappings read by the models (read-only, from `G.S.f` etc.)
floor: `swap_fixed` (F-2231 OK plate), `departed` (whiteboard), `tucker_cleared`/`bowl2_taken` (prop visibility). staging: sorted pallets (`S.pal`), `staging_empty` board, `bowl3_taken`. racks: `tunnel_found` (rack 14 gap vs rack with service opening), stored pallets. outbound/inbound: `t9022_at_dock`, `departed`, `G.dockLight`, `loaded8`, queue of shipped pallets, `door9_closed`, `labels_stopped`. yard: `t9022_found`, `t31_placed/bowls/blanket`. charging: `took_cagekey`. lockers: `locker_open`, `dlocker_open`, `lf_taken`. ops: `took_form`. mgmt: `suite_open` (reader LED). gordoncall: `callWho`, `departed` banner. suite: HALO ghosts/bars from `boss_started/boss_done`, `boss.integrity`, `mintOn`.

### Mint additions
Every prop with `mintTag` still gets its neon cage (generic). Room-specific hooks: floor HALO screen bars turn red in Mint Mode; global grade/scanlines/rainbow level 3 unchanged. HALO suite effects unchanged. No new information is revealed.

### Performance (draw calls, `tests/perf-compare.js`, hand-modelled vs the generic builder; low = cat 1/Mint off, high = cat 4/Mint 3/act 6)
Optimisations in this pass: (1) `mergeStatic` now folds every plain-colour material into shared vertex-coloured buckets (colours baked into vertices); (2) cat head (skull+ears+nose) merged into one mesh at styling time; (3) cat LOD: only the 8 nearest cats keep eyes, lids and stripes; (4) blinkers toggle `scale` instead of `visible` so GPU resource counts stay stable (leak test).
Worst case: 879 draw calls (floor, cat 4 / Mint 3) before → 538 after (generic builder with the same optimisations: 532). Per-room worst case now 17 (remote) to 538 (floor). Triangles in the worst room ≈ 15k. These are SwiftShader counts: **frame-rate on real phones/tablets still has to be profiled on devices**; nothing here claims 60 fps on hardware.

### Simplified / honest limitations
- Sign text is canvas-rendered and small at 1× on a phone (hotspot labels and dialogue remain the reading path).
- Smoking shelter roof, tunnel pipes, yard fence and the video-call rooms (remote, gordoncall) are intentionally simple; the call rooms use scanline textures on surfaces rather than a full-screen overlay.
- Far cats (index ≥ 8) lose eyes/stripes/lids; sleeping far cats show no closed-eye lids.
- Hand rooms are built from the room's own prop list; story-changed art for NPC vignettes (e.g. Gordon/Renata call portrait) still comes from the engine rigs.
- Scripted full fresh-game-to-credits playthrough was NOT run (no scripted solution exists in the repo); the ending/credits/post-credit sequence was run directly via `ending()` in fast mode.

### Validation added (`tests/graphics-validation.js`, `tests/perf-compare.js`, `tests/room-shot.js`, `tests/leak-diff.js`)
Alternate-order tours through real exits (3 orders), save→reload per act in hand rooms (act 1–6), high-cat Mint in five rooms, HALO integrity 100/60/20/0, ending→credits→post-credit, new game after completion. Screenshots of every room (normal + F9 hotspot overlay) are in `docs/screenshots/graphics/`.
