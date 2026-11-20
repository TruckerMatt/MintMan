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
