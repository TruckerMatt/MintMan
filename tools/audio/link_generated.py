#!/usr/bin/env python3
"""After generating audio: set `file` on every voice entry whose planned_file exists on disk (and clear it if the file vanished).
Never changes ids/text. Usage: python3 tools/audio/link_generated.py"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parents[2]; p = root / 'assets/audio/manifests/voice_manifest.json'
m = json.load(open(p, encoding='utf-8')); linked = cleared = 0
for e in m['entries']:
    ok = (root / e['planned_file']).exists() and e.get('status') == 'active'
    if ok and e.get('file') != e['planned_file']: e['file'] = e['planned_file']; linked += 1
    elif not ok and e.get('file'): e['file'] = None; cleared += 1
json.dump(m, open(p, 'w'), indent=1, ensure_ascii=False); open(p, 'a').write('\n'); print(f'linked {linked}, cleared {cleared}, total with audio {sum(1 for e in m["entries"] if e.get("file"))}/{len(m["entries"])}')
