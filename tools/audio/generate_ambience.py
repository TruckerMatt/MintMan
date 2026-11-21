#!/usr/bin/env python3
"""Generates looping room ambience beds (sound-generation API, loop=true). Resumable via ambience_generation_log.json. Usage: generate_ambience.py [--ids a,b] [--force]"""
import json, os, time, pathlib, argparse, subprocess, datetime, requests
ROOT = pathlib.Path(__file__).resolve().parents[2]; MAN = ROOT / 'assets/audio/manifests'
ap = argparse.ArgumentParser(); ap.add_argument('--ids', default=''); ap.add_argument('--force', action='store_true'); a = ap.parse_args()
P = json.load(open(ROOT / 'tools/audio/ambience_prompts.json')); LOGP = MAN / 'ambience_generation_log.json'; LOG = json.load(open(LOGP)) if LOGP.exists() else {'entries': {}}
KEY = os.environ.get('ELEVENLABS_KEY_PLACEHOLDER', 'proxy-injected'); od = ROOT / 'assets/audio/ambience'; od.mkdir(parents=True, exist_ok=True)
for aid, prompt in P['items'].items():
    if a.ids and aid not in a.ids.split(','): continue
    path = od / f'{aid}.mp3'
    if path.exists() and aid in LOG['entries'] and not a.force: continue
    text = prompt + '. ' + P['style']
    for attempt in range(3):
        r = requests.post('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', headers={'xi-api-key': KEY, 'content-type': 'application/json'}, json={'text': text, 'duration_seconds': P['duration'], 'prompt_influence': 0.5, 'loop': True, 'model_id': 'eleven_text_to_sound_v2'}, timeout=180)
        if r.status_code == 200 and r.headers.get('content-type', '').startswith('audio'): break
        print('retry', aid, r.status_code, r.text[:200]); time.sleep(3)
    else: LOG['entries'][aid] = {'status': 'FAILED', 'error': r.text[:200]}; json.dump(LOG, open(LOGP, 'w'), indent=1); continue
    path.write_bytes(r.content); o = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(path)], capture_output=True, text=True)
    LOG['entries'][aid] = {'id': aid, 'file': f'assets/audio/ambience/{aid}.mp3', 'prompt': text, 'duration_secs': float(json.loads(o.stdout)['format']['duration']), 'credits': r.headers.get('character-cost'), 'history_id': r.headers.get('history-item-id'), 'loop': True, 'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'status': 'QA_REQUIRED'}
    json.dump(LOG, open(LOGP, 'w'), indent=1); print(aid, LOG['entries'][aid]['duration_secs'], LOG['entries'][aid]['credits'])
