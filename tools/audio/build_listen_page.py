#!/usr/bin/env python3
"""Builds listen.html at the repo root: a standalone audition/QA page with a play button for every generated VO line (relative paths to assets/audio/voice/)."""
import json, csv, pathlib, html
ROOT = pathlib.Path(__file__).resolve().parents[2]; MAN = ROOT / 'assets/audio/manifests'
E = json.load(open(MAN / 'voice_production_manifest.json', encoding='utf-8'))['entries']
cast = json.load(open(MAN / 'voice_cast_locked.json'))['voices']
rank = {}
for i, r in enumerate(csv.DictReader(open(ROOT / 'docs/VOICE_QA_QUEUE.csv', encoding='utf-8')), 1): rank[r['id']] = i
par = {e['id']: e for e in E}
rows = []
for e in E:
    if e['production_status'] not in ('QA_REQUIRED', 'GENERATED') or not (ROOT / e['output_path']).exists(): continue
    g = e.get('generation') or {}
    rows.append({'id': e['id'], 's': e['speaker'], 'v': cast.get(e['speaker'], {}).get('voice_name', ''), 'sc': e['scene'].split('/')[0], 't': e['text'], 'tt': e['tts_text'] if e['tts_text'] != e['text'] else '', 'f': e['output_path'], 'd': round(g.get('duration_secs') or 0, 1), 'fl': g.get('tech_flags') or [], 'q': rank.get(e['id'], 9999), 'ch': e.get('channel', 'normal'), 'p': par[e['parent']]['text'] if e.get('parent') else '', 'si': e.get('segment_index', 0)})
sl = json.load(open(MAN / 'sfx_generation_log.json'))['entries']
for name, x in sorted(sl.items()):
    if x.get('status') == 'QA_REQUIRED': rows.append({'id': name, 's': 'SFX', 'v': 'clean set (gain-matched)', 'sc': x['id'], 't': x['prompt'].split('. ')[0], 'tt': '', 'f': x['file'], 'd': round(x.get('duration_secs') or 0, 1), 'fl': [], 'q': 20000, 'ch': 'normal', 'p': '', 'si': 0})
rows.sort(key=lambda r: (r['q'], r['si']))
page = r'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>MINT MAN voice audition</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:#fff;--fg:#1c1f26;--mut:#6b7280;--card:#f4f5f7;--line:#dfe2e8;--acc:#2f5fd0;--ok:#1f8a4c;--bad:#c0392b}
@media(prefers-color-scheme:dark){:root{--bg:#14161b;--fg:#e8eaee;--mut:#98a0ae;--card:#1d2027;--line:#2b2f38;--acc:#7aa2ff;--ok:#4cc27f;--bad:#ff7a6b}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}
header{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 16px;z-index:5}
h1{font-size:17px;margin:0 0 8px}.row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
input[type=search]{flex:1;min-width:180px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg)}
button,select{font:inherit;padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg);cursor:pointer}
button.on{background:var(--acc);color:#fff;border-color:var(--acc)}.chip{padding:3px 9px;font-size:13px}
main{padding:8px 16px 80px;max-width:980px;margin:auto}.line{display:grid;grid-template-columns:44px 1fr auto;gap:10px;padding:10px;border:1px solid var(--line);border-radius:10px;margin:8px 0;background:var(--card)}
.line.playing{border-color:var(--acc);box-shadow:0 0 0 2px color-mix(in srgb,var(--acc) 30%,transparent)}
.play{width:44px;height:44px;border-radius:50%;font-size:18px;padding:0}.meta{color:var(--mut);font-size:12.5px}.text{margin:2px 0}.tts{font-size:12.5px;color:var(--mut);font-style:italic}
.flag{color:var(--bad);font-size:12.5px}.marks{display:flex;gap:4px;align-items:center}.marks button{padding:4px 8px}.marks .ok.on{background:var(--ok);border-color:var(--ok)}.marks .bad.on{background:var(--bad);border-color:var(--bad)}
.note{width:150px;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg);font-size:12.5px}
@media(max-width:620px){.line{grid-template-columns:44px 1fr}.marks{grid-column:1/-1}.note{flex:1}}
</style></head><body>
<header><h1>MINT MAN voice audition <span class="meta" id="count"></span></h1>
<div class="row"><input type="search" id="q" placeholder="Search text, id, speaker…"><select id="sort"><option value="q">Listening-QA priority</option><option value="story">Story order</option><option value="sp">By speaker</option></select><label class="meta"><input type="checkbox" id="auto"> auto-play next</label><label class="meta"><input type="checkbox" id="flagged"> flagged only</label><label class="meta"><input type="checkbox" id="unrated"> unrated only</label><button id="exp">Export ratings CSV</button></div>
<div class="row" id="chips" style="margin-top:6px"></div></header><main id="list"></main>
<script>
const DATA=__DATA__;let cur=null,audio=new Audio(),shown=[],sel='';const R=(()=>{try{return JSON.parse(localStorage.getItem('mm_vo_ratings')||'{}')}catch(e){return{}}})();
const save=()=>{try{localStorage.setItem('mm_vo_ratings',JSON.stringify(R))}catch(e){}};
const E=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sp=[...new Set(DATA.map(d=>d.s))].sort((a,b)=>DATA.filter(d=>d.s==b).length-DATA.filter(d=>d.s==a).length);
document.getElementById('chips').innerHTML=['ALL',...sp].map(s=>`<button class="chip${s=='ALL'?' on':''}" data-s="${s}">${s} ${s=='ALL'?DATA.length:DATA.filter(d=>d.s==s).length}</button>`).join('');
document.getElementById('chips').onclick=e=>{const b=e.target.closest('button');if(!b)return;sel=b.dataset.s=='ALL'?'':b.dataset.s;[...document.querySelectorAll('.chip')].forEach(x=>x.classList.toggle('on',x===b));render()};
function render(){const q=document.getElementById('q').value.toLowerCase(),so=document.getElementById('sort').value,fl=document.getElementById('flagged').checked,un=document.getElementById('unrated').checked;
shown=DATA.filter(d=>(!sel||d.s==sel)&&(!q||(d.t+d.id+d.s+d.v).toLowerCase().includes(q))&&(!fl||d.fl.length)&&(!un||!R[d.id]||!R[d.id].r));
if(so=='sp')shown.sort((a,b)=>a.s.localeCompare(b.s)||a.q-b.q);else if(so=='story')shown.sort((a,b)=>DATA.indexOf(a)-DATA.indexOf(b)&&0||a.id.localeCompare(b.id));
document.getElementById('count').textContent=shown.length+' of '+DATA.length+' lines · '+Object.values(R).filter(x=>x.r).length+' rated';
document.getElementById('list').innerHTML=shown.map((d,i)=>{const r=R[d.id]||{};return `<div class="line${cur==d.id?' playing':''}" data-id="${d.id}"><button class="play" data-i="${i}">${cur==d.id&&!audio.paused?'❚❚':'▶'}</button><div><div class="meta"><b>${d.s}</b> · ${E(d.v)} · ${d.sc}${d.ch!='normal'?' · '+d.ch:''} · ${d.d}s · <code>${d.id}</code></div><div class="text">${E(d.t)}</div>${d.tt?`<div class="tts">sent as: ${E(d.tt)}</div>`:''}${d.p?`<div class="tts">part ${d.si} of: ${E(d.p)}</div>`:''}${d.fl.length?`<div class="flag">⚠ ${E(d.fl.join(', '))}</div>`:''}</div><div class="marks"><button class="ok${r.r=='ok'?' on':''}" data-m="ok" title="Good">👍</button><button class="bad${r.r=='bad'?' on':''}" data-m="bad" title="Redo">👎</button><input class="note" placeholder="note" value="${E(r.n||'')}"></div></div>`}).join('')}
function play(d){if(cur==d.id&&!audio.paused){audio.pause();render();return}cur=d.id;audio.src=d.f;audio.play().catch(()=>{});render()}
audio.onended=()=>{const i=shown.findIndex(d=>d.id==cur);if(document.getElementById('auto').checked&&shown[i+1]){play(shown[i+1]);document.querySelector(`[data-id="${shown[i+1].id}"]`)?.scrollIntoView({block:'center'})}else{cur=null;render()}};
document.getElementById('list').onclick=e=>{const l=e.target.closest('.line');if(!l)return;const id=l.dataset.id,d=DATA.find(x=>x.id==id);if(e.target.closest('.play'))play(d);const m=e.target.closest('[data-m]');if(m){R[id]=R[id]||{};R[id].r=R[id].r==m.dataset.m?'':m.dataset.m;save();render()}};
document.getElementById('list').onchange=e=>{if(e.target.classList.contains('note')){const id=e.target.closest('.line').dataset.id;R[id]=R[id]||{};R[id].n=e.target.value;save()}};
['q','sort','flagged','unrated'].forEach(i=>document.getElementById(i).oninput=render);document.getElementById('sort').onchange=render;
document.getElementById('exp').onclick=()=>{const rows=[['id','speaker','rating','note','text']].concat(DATA.filter(d=>R[d.id]&&(R[d.id].r||R[d.id].n)).map(d=>[d.id,d.s,R[d.id].r||'',R[d.id].n||'',d.t]));const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='voice_ratings.csv';a.click()};
document.addEventListener('keydown',e=>{if(e.target.tagName=='INPUT'||e.target.tagName=='SELECT')return;if(e.code=='Space'&&cur){e.preventDefault();audio.paused?audio.play():audio.pause();render()}});
render();
</script></body></html>'''
(ROOT / 'listen.html').write_text(page.replace('__DATA__', json.dumps(rows, ensure_ascii=False)), encoding='utf-8'); print(len(rows), 'lines')
