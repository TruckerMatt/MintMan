#!/usr/bin/env python3
"""HISTORICAL provenance tool (one-off): split legacy/MINT_MAN_TUESDAY_LOGIC_REBUILD.html into src/. After running it, src/main.js was hand-split at `G.runCommand = runCommand;` into src/parser.js (it must load before patches.js because patches wraps a function that used to be hoisted). Do not re-run over the maintained src/.
Load order of every top-level statement is preserved; only file boundaries are new."""
import pathlib, re
root = pathlib.Path(__file__).resolve().parents[2]
L = (root / 'legacy' / 'MINT_MAN_TUESDAY_LOGIC_REBUILD.html').read_text(encoding='utf-8').split('\n')
def seg(a, b): return L[a - 1:b]            # 1-indexed inclusive
def func_extent(start_pat):                   # brace-matched top-level function (1-indexed inclusive)
    for i, l in enumerate(L):
        if re.match(start_pat, l):
            depth = 0
            for j in range(i, len(L)):
                depth += L[j].count('{') - L[j].count('}')
                if depth == 0 and j >= i and ('{' in ''.join(L[i:j + 1])): return i + 1, j + 1
    raise SystemExit('not found ' + start_pat)
ds = func_extent(r'^function drawScene\(\)'); dm = func_extent(r'^function drawMint\('); de = func_extent(r'^function drawExitMarkers\(')
fr = func_extent(r'^function frame\(ts\)')
assert ds[1] + 1 == dm[0], (ds, dm)
cut = [ds, dm, de, (fr[0] - 1, fr[1])]       # +'let lastT = 0;' line before frame
def minus(a, b, holes):
    out = []; i = a
    holes = sorted(holes)
    for h in holes:
        if h[1] < a or h[0] > b: continue
        out += seg(i, h[0] - 1); i = h[1] + 1
    return out + seg(i, b)
HDR = "'use strict';\n"
def w(path, title, parts):
    p = root / 'src' / path; p.parent.mkdir(parents=True, exist_ok=True)
    body = '\n'.join(sum(parts, []))
    body = re.sub(r"^// ---- [0-9a-z_]+\.js ----\n'use strict';\n", '', body, flags=re.M)
    p.write_text(HDR + '// ' + title + '\n' + body.rstrip() + '\n', encoding='utf-8')
    print('wrote', p.relative_to(root), len(body.split('\n')), 'lines')
w('state.js', 'STATE: constants, palette, state factory, flag/inventory helpers, time & acts', [seg(8, 33), seg(98, 125)])
w('engine.js', 'ENGINE: canvas/input wiring, rooms, cats, picking, walking, actions, frame loop', [seg(34, 45), seg(126, 291), seg(cut[3][0], cut[3][1])])
w('ui.js', 'UI: text/dialogue/menus, input handlers, HUD, title, overlays', [seg(46, 97), seg(292, 351), minus(586, 731, cut)])
w('save.js', 'SAVE: save/load/repair', [seg(352, 393)])
w('rendering/classic-art.js', 'CLASSIC RENDERER: procedural pixel art', [seg(394, 585)])
w('rendering/classic-renderer.js', 'CLASSIC RENDERER: scene drawing, Mint overlay, exit markers (kept as fallback/debug renderer)', [seg(*ds), seg(*dm), [''], seg(*de)])
w('audio.js', 'AUDIO: WebAudio synth (kept as fallback) + audio manager', [seg(732, 770)])
w('rooms.js', 'ROOMS: room definitions, props/hotspots, exits, call scenes', [seg(771, 1335)])
w('story.js', 'STORY: items, Juno, cats, mint, HR, progress, NPCs, calls, finale, ending', [seg(1336, 2034)])
w('logic.js', 'LOGIC: knowledge/progression evaluator, hints, invariants', [seg(2035, 2165)])
w('patches.js', 'PATCHES + POLISH: engine patches, parser easter eggs, safety net', [seg(2166, 2306)])
n = next(i for i, l in enumerate(L) if l.startswith('// ---------- test API'))
w('main.js', 'MAIN: text-command parser, start/new game, boot', [seg(2307, n)])
w('tests.js', 'TEST API (used by automated tests; harmless in production)', [L[n:next(i for i, l in enumerate(L) if l.strip() == '</script></body></html>')]])
