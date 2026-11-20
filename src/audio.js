'use strict';
// AUDIO: WebAudio synth (kept as fallback) + audio manager
// ===== WebAudio synth: all sounds and music are generated =====
const Snd = {
  ac: null, master: null, music: true, mtimer: null, step: 0,
  unlock() { if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; } try { const A = window.AudioContext || window.webkitAudioContext; if (!A) return; this.ac = new A(); this.master = this.ac.createGain(); this.master.gain.value = 0.35; this.master.connect(this.ac.destination); if (this.music) this.startMusic(); } catch (e) {} },
  tone(f, d, type = 'square', vol = 0.2, when = 0, slide = 0) { const a = this.ac; if (!a) return; const t = a.currentTime + when; const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + 0.02); },
  noise(d, vol = 0.2, when = 0, hp = 0) { const a = this.ac; if (!a) return; const t = a.currentTime + when; const n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = a.createBufferSource(); s.buffer = b; const g = a.createGain(); g.gain.value = vol; let node = s; if (hp) { const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.connect(f); node = f; } node.connect(g); g.connect(this.master); s.start(t); },
  play(name) {
    if (!this.ac || G.fast) return; const T = (...a) => this.tone(...a), Ns = (...a) => this.noise(...a);
    switch (name) {
      case 'click': T(880, .04, 'square', .1); break;
      case 'beep': T(1800, .08, 'square', .15); break;
      case 'scan': T(2200, .06, 'square', .15); T(2900, .08, 'square', .15, .07); break;
      case 'scanfail': T(300, .2, 'sawtooth', .15); T(200, .3, 'sawtooth', .15, .15); break;
      case 'pickup': T(660, .07, 'square', .15); T(990, .1, 'square', .15, .07); break;
      case 'reverse': for (let i = 0; i < 4; i++) T(1000, .18, 'square', .1, i * .4); break;
      case 'dock': Ns(.5, .25, 0); T(90, .4, 'sawtooth', .2, 0, -40); break;
      case 'bump': Ns(.2, .4); T(60, .3, 'sine', .4, 0, -30); break;
      case 'pallet': Ns(.15, .2, 0, 800); T(150, .1, 'square', .1); break;
      case 'printer': for (let i = 0; i < 10; i++) Ns(.05, .15, i * .07, 2000); break;
      case 'radio': T(1200, .06, 'square', .12); T(900, .06, 'square', .12, .08); break;
      case 'buzz': T(120, .6, 'sawtooth', .1); T(122, .6, 'sawtooth', .1); break;
      case 'vend': Ns(.3, .2, 0, 500); T(200, .2, 'square', .15, .2); T(150, .3, 'square', .15, .4); break;
      case 'bark': T(400, .08, 'sawtooth', .25, 0, -150); T(380, .1, 'sawtooth', .25, .13, -150); break;
      case 'meow': { const f = 500 + Math.random() * 300; T(f, .3, 'triangle', .18, 0, 250); T(f + 250, .25, 'triangle', .12, .1, -350); break; }
      case 'meows': for (let i = 0; i < 24; i++) { const f = 400 + Math.random() * 500; T(f, .35, 'triangle', .07, Math.random() * .8, 250); } break;
      case 'card': [392, 523, 659, 784].forEach((f, i) => T(f, .3, 'square', .12, i * .12)); break;
      case 'mint': for (let i = 0; i < 14; i++) T(300 + i * 90, .15, 'sine', .14, i * .06); T(1600, 1, 'sawtooth', .1, .9, 800); Ns(.8, .15, .5, 3000); break;
      case 'fail': [300, 250, 200, 140].forEach((f, i) => T(f, .3, 'sawtooth', .16, i * .2)); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => T(f, .2, 'square', .14, i * .11)); break;
      case 'kpi': T(700, .05, 'square', .1); T(500, .07, 'square', .1, .06); break;
    }
  },
  startMusic() { if (this.mtimer || !this.ac) return; const bass = [55, 55, 82, 55, 73, 73, 82, 65], mel = [0, 330, 0, 392, 440, 0, 392, 330, 0, 294, 0, 330, 392, 0, 330, 0];
    this.mtimer = setInterval(() => { if (!this.music || !this.ac) return; const i = this.step++ % 16; if (i % 2 === 0) this.tone(bass[(i / 2) % 8], .22, 'triangle', .13); if (mel[i]) this.tone(mel[i] * (G.S && G.S.mintOn ? 1.5 : 1), .16, 'square', .04); if (i % 4 === 0) this.noise(.03, .05, 0, 6000); }, 210); },
  toggleMusic() { this.music = !this.music; if (this.music) this.startMusic(); }
};

// ===================================================================================================================
// MMAudio: OPTIONAL external audio (voice acting, generated SFX, room ambience) layered over the synth above.
//  - Audio is presentation only. Every entry point is a silent no-op when a manifest entry or file is missing, never throws,
//    never blocks dialogue, never gates progression. The synth (Snd) stays the fallback for every effect.
//  - Manifests (assets/audio/manifests/*.json) are optional; see AUDIO_ARCHITECTURE_NOTES.md.
// ===================================================================================================================
const MMAudio = (function () {
  const ROOT = 'assets/audio/';
  const ROOM_AMBIENCE = { break: 'breakroom_hum', floor: 'warehouse_floor', lockers: 'locker_room', shipoffice: 'shipping_office', ops: 'operations_office', hr: 'hr_office', parts: 'warehouse_parts', charging: 'charging_bay',
    racks: 'warehouse_racks', tunnel: 'tunnel_drone', staging: 'warehouse_staging', inbound: 'loading_dock', outbound: 'loading_dock', yard: 'yard_exterior', smoke: 'yard_exterior', drain: 'yard_exterior',
    mgmt: 'regional_lobby', suite: 'regional_suite', remote: 'yard_exterior', gordoncall: 'phone_line' };
  const M = { manifests: { voice: { entries: [] }, sfx: { entries: [] }, ambience: { entries: [] } }, ready: false, loading: null,
    vol: { master: 1, voice: 1, sfx: 1, ambience: .6, music: 1 }, muted: { master: false, voice: false, sfx: false, ambience: false, music: false },
    byVoiceId: new Map(), byVoiceText: new Map(), bySfx: new Map(), byAmb: new Map(), cache: new Map(), stats: { voicePlayed: 0, sfxPlayed: 0, missing: 0 },
    mix: null, voiceNode: null, voiceToken: 0, amb: null, ambRoom: null };
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const safe = (fn) => { try { return fn(); } catch (e) { return undefined; } };

  // ---- manifests (optional; a missing/blocked fetch just leaves them empty)
  M.loadManifests = function () {
    if (M.loading) return M.loading;
    if (!/^https?:$/.test(location.protocol)) { M.ready = true; M.loading = Promise.resolve(M); return M.loading; }   // file:// cannot fetch: run without external audio, silently
    const get = (name) => fetch(ROOT + 'manifests/' + name + '_manifest.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
    M.loading = Promise.all([get('voice'), get('sfx'), get('ambience')]).then(([v, s, a]) => {
      if (v && Array.isArray(v.entries)) M.manifests.voice = v; if (s && Array.isArray(s.entries)) M.manifests.sfx = s; if (a && Array.isArray(a.entries)) M.manifests.ambience = a;
      M.byVoiceId.clear(); M.byVoiceText.clear(); M.bySfx.clear(); M.byAmb.clear();
      for (const e of M.manifests.voice.entries) { if (!e || !e.id) continue; M.byVoiceId.set(e.id, e); if (e.text) M.byVoiceText.set(norm(e.speaker) + '|' + norm(e.text), e); }
      for (const e of M.manifests.sfx.entries) if (e && e.id) M.bySfx.set(e.id, e);
      for (const e of M.manifests.ambience.entries) if (e && e.id) M.byAmb.set(e.id, e);
      M.ready = true; if (M.manifests.sfx.entries.length) M.preload('sfx'); return M;
    }).catch(() => { M.ready = true; return M; });
    return M.loading;
  };
  // ---- WebAudio plumbing (reuses the synth's AudioContext after the first user gesture)
  function mixer() {
    const a = Snd.ac; if (!a) return null; if (M.mix && M.mix.ctx === a) return M.mix;
    const mk = (n) => { const g = a.createGain(); g.connect(a.destination); return g; };
    M.mix = { ctx: a, voice: mk(), sfx: mk(), ambience: mk() }; M.applyVolumes(); return M.mix;
  }
  M.applyVolumes = function () { const x = M.mix; if (!x) return; for (const c of ['voice', 'sfx', 'ambience']) x[c].gain.value = (M.muted.master || M.muted[c]) ? 0 : M.vol.master * M.vol[c]; if (Snd.master && Snd.master.gain) Snd.master.gain.value = (M.muted.master || M.muted.sfx) ? 0 : Snd.master.gain.value; };
  M.setVolume = (cat, v) => { M.vol[cat] = Math.max(0, Math.min(1, +v)); M.applyVolumes(); safe(() => localStorage.setItem('mintman_vol', JSON.stringify(M.vol))); };
  M.mute = (cat, b) => { M.muted[cat === undefined ? 'master' : cat] = b === undefined ? true : !!b; M.applyVolumes(); };
  safe(() => { const v = JSON.parse(localStorage.getItem('mintman_vol') || 'null'); if (v) Object.assign(M.vol, v); });
  M._sync = new Map();             // decoded buffers available synchronously (SFX must start instantly)
  function load(file) {            // -> Promise<AudioBuffer|null>; cached; never rejects
    if (!file) return Promise.resolve(null); if (M.cache.has(file)) return M.cache.get(file);
    const a = Snd.ac; if (!a) return Promise.resolve(null);
    const p = fetch(file).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(b => new Promise((res, rej) => a.decodeAudioData(b, res, rej))).then(buf => { M._sync.set(file, buf); return buf; }).catch(() => { M.stats.missing++; return null; });
    M.cache.set(file, p); return p;
  }
  M.preload = function (kind) { const list = kind === 'sfx' ? M.manifests.sfx.entries : kind === 'voice' ? M.manifests.voice.entries : M.manifests.ambience.entries; if (!Snd.ac) return; for (const e of list) if (e && e.file) load(e.file); };
  function playBuf(buf, bus, vol, loop) { const x = mixer(); if (!x || !buf) return null; const s = x.ctx.createBufferSource(); s.buffer = buf; s.loop = !!loop; const g = x.ctx.createGain(); g.gain.value = vol === undefined ? 1 : vol; s.connect(g); g.connect(x[bus]); s.start(); return { s, g }; }

  // ---- VOICE: fire-and-forget; resolves when the clip ends / is stopped / is missing. Dialogue never awaits it.
  M.voice = function (idOrEntry) {
    return new Promise((resolve) => {
      try {
        const e = typeof idOrEntry === 'string' ? M.byVoiceId.get(idOrEntry) : idOrEntry; if (!e || !e.file || !Snd.ac) return resolve(false);
        M.stopVoice(); const tok = ++M.voiceToken;
        load(e.file).then((buf) => { if (!buf || tok !== M.voiceToken) return resolve(false); const n = playBuf(buf, 'voice', e.volume); if (!n) return resolve(false); M.voiceNode = n; M.stats.voicePlayed++; n.s.onended = () => { if (M.voiceNode === n) M.voiceNode = null; resolve(true); }; }).catch(() => resolve(false));
      } catch (err) { resolve(false); }
    });
  };
  M.stopVoice = function () { M.voiceToken++; const n = M.voiceNode; M.voiceNode = null; if (n) safe(() => { n.s.onended = null; n.s.stop(); }); };
  // dialogue seam: called by sayImpl when a dialogue page appears (page 0 starts the line's clip) and when the player advances
  M.onSayPage = function (who, text, pageIndex) { if (pageIndex !== 0 || !M.byVoiceText.size) return; const e = M.byVoiceText.get(norm(who) + '|' + norm(text)); if (e) M.voice(e); };
  M.lookupVoice = (who, text) => M.byVoiceText.get(norm(who) + '|' + norm(text)) || null;

  // ---- SFX: returns true when an external asset was played; false => caller (Snd.play) uses the synth
  M.sfx = function (id) {
    return !!safe(() => { const e = M.bySfx.get(id); if (!e || !e.file || !Snd.ac) return false; const buf = M._sync.get(e.file); if (!buf) { load(e.file); return false; } const n = playBuf(buf, 'sfx', e.volume); if (n) M.stats.sfxPlayed++; return !!n; });
  };

  // ---- AMBIENCE: one looping bed per room, cross-faded; absent file => silence for that room
  M.setRoomAmbience = function (roomId, fadeSec) {
    safe(() => {
      const id = ROOM_AMBIENCE[roomId]; const e = id && M.byAmb.get(id); const a = Snd.ac; if (!a) return; mixer(); const f = fadeSec === undefined ? 1.5 : fadeSec;
      if (M.amb && M.amb.id === (e && e.id)) return;
      const old = M.amb; M.amb = null;
      if (old) { const t = a.currentTime; old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.g.gain.value, t); old.g.gain.linearRampToValueAtTime(0, t + f); setTimeout(() => safe(() => old.s.stop()), f * 1000 + 100); }
      if (!e || !e.file) return;
      load(e.file).then((buf) => { if (!buf || ROOM_AMBIENCE[M.ambRoom] !== id) return; const n = playBuf(buf, 'ambience', 0, true); if (!n) return; const t = a.currentTime; n.g.gain.setValueAtTime(0, t); n.g.gain.linearRampToValueAtTime(e.volume === undefined ? 1 : e.volume, t + f); M.amb = { id: e.id, s: n.s, g: n.g }; });
    });
  };
  M.stopAmbience = function (fade) { safe(() => { const o = M.amb; M.amb = null; M.ambRoom = null; if (o) { const a = Snd.ac, t = a.currentTime; o.g.gain.linearRampToValueAtTime(0, t + (fade || .5)); setTimeout(() => safe(() => o.s.stop()), (fade || .5) * 1000 + 100); } }); };
  M.roomAmbienceId = (roomId) => ROOM_AMBIENCE[roomId] || null;
  M.ROOM_AMBIENCE = ROOM_AMBIENCE;

  // ---- wiring (no engine edits needed): wrap Snd.unlock / Snd.play, watch the current room
  const _unlock = Snd.unlock.bind(Snd); Snd.unlock = function () { _unlock(); safe(() => { if (Snd.ac) { mixer(); M.loadManifests().then(() => { M.preload('sfx'); M.setRoomAmbience(M.ambRoom); }); } }); };
  const _play = Snd.play.bind(Snd); Snd.play = function (name) { if (!G.fast && M.sfx(name)) return; return _play(name); };
  setInterval(() => safe(() => { if (!G.started || !G.S || !G.S.room) return; if (G.S.room !== M.ambRoom) { M.ambRoom = G.S.room; M.setRoomAmbience(G.S.room); } }), 300);
  M.loadManifests();
  return M;
})();
