// Procedural dark-roguelite music synthesizer.
// Uses a 32-step (4-bar) looping sequencer scheduled via AudioContext timing.

let _ctx: AudioContext | null = null;
let _gain: GainNode | null = null;
let _vol = 0.25;
let _active = false;
let _timer: ReturnType<typeof setInterval> | null = null;
let _nextT = 0;
let _step = 0;

const BPM   = 128;
const STEP  = (60 / BPM) * 0.5;  // eighth-note duration (s)
const AHEAD = 0.25;               // schedule this far ahead
const TICK  = 50;                 // ms between scheduler ticks

// A-minor pentatonic: A, C, D, E, G
const B0 = [55.00, 65.41, 73.42, 82.41, 98.00, 110.00]; // A1–A2 (bass)
const M0 = [110.0, 130.81, 146.83, 164.81, 196.0];       // A2–G3 (mid/chord)
const L0 = [220.0, 261.63, 293.66, 329.63, 392.0];        // A3–G4 (lead)

function gc(): AudioContext {
  if (!_ctx) {
    _ctx = new AudioContext();
    _gain = _ctx.createGain();
    _gain.gain.value = _vol;
    _gain.connect(_ctx.destination);
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

export function setMusicVolume(v: number): void {
  _vol = Math.max(0, Math.min(1, v));
  if (_gain) _gain.gain.value = _vol;
}

export function getMusicVolume(): number { return _vol; }

function osc(freq: number, t: number, dur: number, g: number, type: OscillatorType, detune = 0): void {
  const c = gc();
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  const gn = c.createGain();
  gn.gain.setValueAtTime(0.001, t);
  gn.gain.linearRampToValueAtTime(g, t + Math.min(0.012, dur * 0.15));
  gn.gain.setValueAtTime(g * 0.75, t + dur * 0.6);
  gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(gn); gn.connect(_gain!);
  o.start(t); o.stop(t + dur + 0.05);
}

function nz(t: number, dur: number, g: number, freq: number, Q = 1.2): void {
  const c = gc();
  const len = Math.floor(c.sampleRate * Math.min(dur, 0.5));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = Q;
  const gn = c.createGain();
  gn.gain.setValueAtTime(g, t);
  gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(bp); bp.connect(gn); gn.connect(_gain!);
  src.start(t);
}

function kick(t: number): void {
  const c = gc();
  const ko = c.createOscillator();
  const kg = c.createGain();
  ko.type = 'sine';
  ko.frequency.setValueAtTime(130, t);
  ko.frequency.exponentialRampToValueAtTime(42, t + 0.15);
  kg.gain.setValueAtTime(0.40, t);
  kg.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  ko.connect(kg); kg.connect(_gain!);
  ko.start(t); ko.stop(t + 0.38);
  nz(t, 0.06, 0.08, 180, 0.8); // kick click
}

// ── 32-step sequences (4 bars × 8 eighth notes) ─────────────────────────────

// Bass: indices into B0
const BASS = [0,0,0,2, 3,3,4,3, 0,0,2,2, 4,4,2,0, 0,0,0,3, 4,4,3,2, 0,2,4,2, 0,0,5,5];
// Lead: indices into L0, -1 = rest
const LEAD = [2,-1,-1,-1,4,-1,3,-1,-1,-1,4,-1,-1,-1,2,-1,4,-1,-1,-1,3,-1,2,0,-1,-1,2,-1,-1,-1,4,-1];
// Chord on/off: 1 = play minor chord (root from M0[1])
const CHRD = [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0];

function sched(t: number, s: number): void {
  const beat8 = s % 8; // position within bar (eighth notes)

  // Bass
  osc(B0[BASS[s]], t, STEP * 0.88, 0.16, 'sawtooth');
  osc(B0[BASS[s]] * 0.5, t, STEP * 0.88, 0.05, 'sine'); // sub

  // Lead melody
  if (LEAD[s] >= 0) {
    osc(L0[LEAD[s]], t, STEP * 0.80, 0.065, 'triangle');
    osc(L0[LEAD[s]], t, STEP * 0.80, 0.025, 'sine', 8); // slight detune
  }

  // Minor chord stab
  if (CHRD[s]) {
    const r = M0[1]; // C3 (minor third of A)
    osc(r,          t, STEP * 3.2, 0.04, 'square');
    osc(r * 1.1892, t, STEP * 3.2, 0.03, 'square'); // minor third
    osc(r * 1.4983, t, STEP * 3.2, 0.03, 'square'); // fifth
  }

  // Kick on beats 1 & 5 (quarter beats 1 & 3)
  if (beat8 === 0 || beat8 === 4) kick(t);

  // Snare on beats 3 & 7 (quarter beats 2 & 4)
  if (beat8 === 2 || beat8 === 6) {
    nz(t, 0.13, 0.13, 1900, 1.5);
    nz(t, 0.09, 0.07, 550, 0.7);
  }

  // Closed hi-hat every step; open on off-beats
  nz(t, beat8 % 2 === 0 ? 0.04 : 0.09, beat8 % 2 === 0 ? 0.04 : 0.025, 8500, 2.5);
}

function tick(): void {
  if (!_active) return;
  const c = gc();
  while (_nextT < c.currentTime + AHEAD) {
    sched(_nextT, _step % 32);
    _step++;
    _nextT += STEP;
  }
}

export function startMusic(): void {
  if (_active) return;
  _active = true;
  const c = gc();
  _nextT = c.currentTime + 0.15;
  _step = 0;
  _timer = setInterval(tick, TICK);
}

export function stopMusic(): void {
  _active = false;
  if (_timer) { clearInterval(_timer); _timer = null; }
}
