#!/usr/bin/env python3
"""Generates the clean SFX set from tools/audio/sfx_prompts.json via the ElevenLabs sound-generation API (dev time only). One take per file; resumable via sfx_generation_log.json.
Usage: generate_sfx.py [--ids click,beep] [--force]"""
import json, os, sys, time, pathlib, argparse, subprocess, datetime, requests
ROOT = pathlib.Path(__file__).resolve().parents[2]; MAN = ROOT / 'assets/audio/manifests'
ap = argparse.ArgumentParser(); ap.add_argument('--ids', default=''); ap.add_argument('--force', action='store_true'); a = ap.parse_args()
P = json.load(open(ROOT / 'tools/audio/sfx_prompts.json')); LOGP = MAN / 'sfx_generation_log.json'; LOG = json.load(open(LOGP)) if LOGP.exists() else {'entries': {}}
KEY = os.environ.get('ELEVENLABS_KEY_PLACEHOLDER', 'proxy-injected'); out_dir = ROOT / 'assets/audio/sfx'; out_dir.mkdir(parents=True, exist_ok=True)
def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(p)], capture_output=True, text=True)
    try: return float(json.loads(r.stdout)['format']['duration'])
    except Exception: return None
for sid, it in P['items'].items():
    if a.ids and sid not in a.ids.split(','): continue
    for v in range(1, it.get('variants', 1) + 1):
        name = f'{sid}_{v}' if it.get('variants', 1) > 1 else sid; path = out_dir / f'{name}.mp3'
        if path.exists() and not a.force and name in LOG['entries']: continue
        text = it['p'] + '. ' + P['style']
        for attempt in range(3):
            r = requests.post('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', headers={'xi-api-key': KEY, 'content-type': 'application/json'}, json={'text': text, 'duration_seconds': it['d'], 'prompt_influence': 0.6}, timeout=120)
            if r.status_code == 200 and r.headers.get('content-type', '').startswith('audio'): break
            print('retry', name, r.status_code, r.text[:160]); time.sleep(3)
        else: LOG['entries'][name] = {'status': 'FAILED', 'error': r.text[:200]}; continue
        path.write_bytes(r.content); LOG['entries'][name] = {'id': sid, 'file': f'assets/audio/sfx/{name}.mp3', 'prompt': text, 'duration_requested': it['d'], 'duration_secs': probe(path), 'credits': r.headers.get('character-cost'), 'history_id': r.headers.get('history-item-id'), 'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'status': 'QA_REQUIRED'}
        json.dump(LOG, open(LOGP, 'w'), indent=1); print(name, LOG['entries'][name]['duration_secs'], LOG['entries'][name]['credits'])
