// Tiny WebAudio synth. No assets. Created lazily on the first user gesture.
class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) this.ctx = new AC();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone({ freq, to = freq, type = 'square', dur = 0.06, vol = 0.12, at = 0 }) {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const t0 = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  play(name) {
    switch (name) {
      case 'hit': this.tone({ freq: 520, dur: 0.06 }); break;
      case 'serve': this.tone({ freq: 440, dur: 0.07 }); break;
      case 'smash': this.tone({ freq: 320, to: 90, type: 'sawtooth', dur: 0.16, vol: 0.16 }); break;
      case 'net': this.tone({ freq: 150, to: 110, type: 'triangle', dur: 0.12 }); break;
      case 'point': this.tone({ freq: 660, dur: 0.08 }); this.tone({ freq: 880, dur: 0.12, at: 0.09 }); break;
      case 'gameover':
        [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: 0.14, at: i * 0.13 }));
        break;
      case 'menu': this.tone({ freq: 880, dur: 0.03, vol: 0.08 }); break;
      case 'pause': this.tone({ freq: 330, dur: 0.05, vol: 0.08 }); break;
      default: break;
    }
  }
}

export const audio = new Sfx();
