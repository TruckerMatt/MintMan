#!/usr/bin/env node
// Validates assets/audio/manifests/*.json against the project: schema, duplicate ids, missing files, and (for voice) whether each
// entry's text still exists in the current dialogue source. Usage: node tools/audio/validate_manifests.js [--strict]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'); const strict = process.argv.includes('--strict');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/manifests', p), 'utf8'));
const src = (function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.js$/.test(e.name) ? [fs.readFileSync(path.join(d, e.name), 'utf8')] : []); })(path.join(ROOT, 'src')).join('\n');
const norm = (s) => String(s).replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase(); const hay = norm(src);
let errors = 0, warnings = 0; const err = (m) => { errors++; console.log('ERROR  ' + m); }, warn = (m) => { warnings++; console.log('WARN   ' + m); };
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/audio/id_registry.json'), 'utf8')); const keys = new Map();
const speakers = new Set(Object.keys(fs.readdirSync(path.join(ROOT, 'assets/audio/voice')).reduce((o, d) => (o[d.toUpperCase()] = 1, o), {})));
for (const kind of ['voice', 'sfx', 'ambience']) {
  const m = read(kind + '_manifest.json'); const seen = new Set(); let withFile = 0, textMiss = 0;
  if (m.version !== 1 && m.version !== 2) warn(kind + ': unexpected manifest version ' + m.version);
  for (const e of m.entries) {
    if (!e.id) { err(kind + ': entry without id'); continue; } if (seen.has(e.id)) err(kind + ': duplicate id ' + e.id); seen.add(e.id);
    if (e.file) { withFile++; if (!fs.existsSync(path.join(ROOT, e.file))) (strict ? err : warn)(kind + ': file not found for ' + e.id + ' -> ' + e.file); }
    if (kind === 'voice') {
      const sha = require('crypto').createHash('sha1').update(`${e.speaker}|${e.channel || 'normal'}|${e.text}`).digest('hex').slice(0, 10);
      if (m.version >= 2) { if (e.id !== `vo_${String(e.speaker).toLowerCase()}_${sha}` && !(registry.ids[e.id])) err('voice: ' + e.id + ' is neither hash-derived nor in the permanent registry'); if (!registry.ids[e.id]) err('voice: ' + e.id + ' missing from tools/audio/id_registry.json'); if (!/^assets\/audio\/voice\//.test(e.planned_file || '')) err('voice: ' + e.id + ' needs planned_file'); if (e.status === 'blocked_dynamic' && e.file) err('voice: blocked_dynamic entry ' + e.id + ' must not have audio'); if (e.status === 'stale_text') warn('voice: ' + e.id + ' is stale_text (regenerate audio)'); const k = `${e.speaker}|${norm(e.text)}`; if (keys.has(k)) err('voice: duplicate speaker+text ' + e.id + ' / ' + keys.get(k)); keys.set(k, e.id); }
      if (!e.speaker || !e.text) err('voice: ' + e.id + ' needs speaker and text'); else { if (!speakers.has(String(e.speaker).toUpperCase()) && e.speaker !== 'NARRATOR') warn('voice: ' + e.id + ' speaker ' + e.speaker + ' has no assets/audio/voice/<speaker>/ folder');
        if (e.category !== 'dynamic_expansion' && !hay.includes(norm(e.text))) {   // expanded runtime-assembled lines are generated, not literal source text
           textMiss++; warn('voice: ' + e.id + ' text not found in current dialogue source: "' + String(e.text).slice(0, 60) + '"'); } }
    }
  }
  console.log(`${kind}: ${m.entries.length} entries, ${withFile} with files${kind === 'voice' ? ', ' + textMiss + ' not matching current dialogue' : ''}`);
}
console.log(`\n${errors} error(s), ${warnings} warning(s)`); process.exit(errors ? 1 : 0);
