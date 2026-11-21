#!/usr/bin/env python3
"""Resumable VO generator (dev-time only; the game never talks to ElevenLabs). Reads voice_generation_queue.json, writes assets/audio/voice/<speaker>/<id>.mp3,
keeps the production ledger voice_generation_log.json. Skips jobs already generated from the SAME tts_text+voice+model+settings; marks changed ones stale and regenerates.
Auth: the key comes from the environment's network proxy (set ELEVENLABS_KEY_PLACEHOLDER=proxy-injected); no key is stored in the repo.
Usage: generate_vo.py [--max-chars N] [--limit N] [--ids a,b] [--workers 2] [--dry-run]"""
import json, os, sys, time, pathlib, hashlib, subprocess, argparse, threading, datetime, concurrent.futures as cf
import requests
ROOT = pathlib.Path(__file__).resolve().parents[2]; MAN = ROOT / 'assets/audio/manifests'
ap = argparse.ArgumentParser(); ap.add_argument('--max-chars', type=int, default=10**9); ap.add_argument('--limit', type=int, default=10**9); ap.add_argument('--ids', default=''); ap.add_argument('--workers', type=int, default=2); ap.add_argument('--dry-run', action='store_true'); ap.add_argument('--retries', type=int, default=2)
a = ap.parse_args()
Q = json.load(open(MAN / 'voice_generation_queue.json')); LOGP = MAN / 'voice_generation_log.json'; LOG = json.load(open(LOGP)); lock = threading.Lock()
MODEL, FMT, SETTINGS = Q['model_id'], Q['output_format'], None            # voice default settings (eleven_v4 is directed with tags/punctuation)
KEY = os.environ.get('ELEVENLABS_KEY_PLACEHOLDER', 'proxy-injected')
def sig(j): return hashlib.sha1(json.dumps([j['tts_text'], j['voice_id'], MODEL, SETTINGS, FMT]).encode()).hexdigest()[:16]
def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_name', '-of', 'json', str(path)], capture_output=True, text=True)
    try: d = json.loads(r.stdout); return float(d['format']['duration']), d['streams'][0]['codec_name']
    except Exception: return None, None
def tech_qa(j, path):
    flags = []; size = path.stat().st_size if path.exists() else 0
    if size < 2000: flags.append('file_tiny')
    dur, codec = probe(path) if size else (None, None)
    if dur is None or codec != 'mp3': flags.append('not_decodable_mp3'); return flags, dur
    cps = j['chars'] / dur if dur else 0
    if cps > 30: flags.append('too_fast_or_truncated')
    if cps < 4: flags.append('too_slow_or_silence')
    if dur < 0.4: flags.append('too_short')
    sil = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(path), '-af', 'silencedetect=n=-45dB:d=1.2', '-f', 'null', '-'], capture_output=True, text=True).stderr.count('silence_start')
    if sil: flags.append(f'long_silence x{sil}')
    return flags, dur
def one(j):
    out = ROOT / j['output_path']; out.parent.mkdir(parents=True, exist_ok=True); s = sig(j); ent = LOG['entries'].get(j['id'], {})
    if ent.get('status') in ('GENERATED', 'QA_REQUIRED') and ent.get('sig') == s and out.exists(): return ('skip', j, 0)
    rec = {'id': j['id'], 'speaker': j['speaker'], 'voice_id': j['voice_id'], 'model_id': MODEL, 'settings': SETTINGS, 'output_format': FMT, 'tts_text': j['tts_text'], 'sig': s, 'output_path': j['output_path'], 'retries': 0}
    if ent.get('sig') and ent.get('sig') != s: rec['stale_from'] = ent.get('sig')
    for attempt in range(a.retries + 1):
        rec['retries'] = attempt
        try:
            body = {'text': j['tts_text'], 'model_id': MODEL}
            r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{j['voice_id']}?output_format={FMT}", headers={'xi-api-key': KEY, 'content-type': 'application/json'}, json=body, timeout=120)
            if r.status_code == 200 and r.headers.get('content-type', '').startswith('audio'):
                out.write_bytes(r.content); flags, dur = tech_qa(j, out)
                rec.update({'status': 'QA_REQUIRED', 'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'history_id': r.headers.get('history-item-id'), 'credits': int(r.headers['character-cost']) if r.headers.get('character-cost', '').isdigit() else None, 'chars': j['chars'], 'duration_secs': dur, 'bytes': out.stat().st_size, 'tech_qa': 'PASS' if not flags else 'FLAGGED', 'tech_flags': flags, 'qa': 'listening_pending'})
                return ('ok', j, rec)
            rec['error'] = f'{r.status_code} {r.text[:200]}'
            if r.status_code in (400, 401, 402, 403, 404, 422): break      # not transient
        except Exception as e: rec['error'] = repr(e)[:200]
        time.sleep(2 + attempt * 3)
    rec.update({'status': 'FAILED', 'tech_qa': 'FAIL'}); return ('fail', j, rec)
jobs = [j for j in Q['jobs'] if (not a.ids or j['id'] in a.ids.split(','))]
pending = []; chars = 0
for j in jobs:
    ent = LOG['entries'].get(j['id'], {})
    if ent.get('status') in ('GENERATED', 'QA_REQUIRED') and ent.get('sig') == sig(j) and (ROOT / j['output_path']).exists(): continue
    if len(pending) >= a.limit or chars + j['chars'] > a.max_chars: break
    pending.append(j); chars += j['chars']
print(f'{len(jobs)} queued, {len(pending)} to generate now, {chars} chars')
if a.dry_run or not pending: sys.exit(0)
done = fails = credits = 0
with cf.ThreadPoolExecutor(a.workers) as ex:
    for st, j, rec in ex.map(one, pending):
        if st == 'skip': continue
        with lock:
            LOG['entries'][j['id']] = rec; json.dump(LOG, open(LOGP, 'w'), indent=1, ensure_ascii=False)
        if st == 'ok': done += 1; credits += rec.get('credits') or 0
        else: fails += 1; print('FAILED', j['id'], rec.get('error'))
print(f'generated {done}, failed {fails}, credits {credits}')
