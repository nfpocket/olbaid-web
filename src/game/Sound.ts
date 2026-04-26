let _ctx: AudioContext | null = null;
let _master: GainNode | null = null;
let _volume = 0.5;

function ctx(): AudioContext {
  if (!_ctx) {
    _ctx = new AudioContext();
    _master = _ctx.createGain();
    _master.gain.value = _volume;
    _master.connect(_ctx.destination);
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function dest(): AudioNode {
  ctx();
  return _master!;
}

export function setVolume(v: number): void {
  _volume = Math.max(0, Math.min(1, v));
  if (_master) _master.gain.value = _volume;
}

export function getVolume(): number {
  return _volume;
}

function noise(
  c: AudioContext,
  duration: number,
  gain: number,
  decayExp = 0.35,
  filterFreq?: number,
): void {
  const len = Math.floor(c.sampleRate * duration);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decayExp);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  g.connect(dest());
  if (filterFreq !== undefined) {
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = filterFreq;
    bp.Q.value = 0.7;
    src.connect(bp);
    bp.connect(g);
  } else {
    src.connect(g);
  }
  src.start();
}

function sweep(
  c: AudioContext,
  f0: number,
  f1: number,
  duration: number,
  gain: number,
  type: OscillatorType = 'sine',
): void {
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(f1, c.currentTime + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(g);
  g.connect(dest());
  osc.start();
  osc.stop(c.currentTime + duration);
}

// ── Public API ───────────────────────────────────────────────────────────────

let _lastHitT = 0;
let _lastKillT = 0;

export function playHit(): void {
  const now = performance.now();
  if (now - _lastHitT < 35) return;
  _lastHitT = now;
  const c = ctx();
  noise(c, 0.07, 0.22, 0.5, 1400);
  sweep(c, 320, 90, 0.07, 0.10);
}

export function playBounceHit(): void {
  const c = ctx();
  noise(c, 0.10, 0.38, 0.45, 1100);
  sweep(c, 650, 160, 0.10, 0.20);
}

export function playKill(): void {
  const now = performance.now();
  if (now - _lastKillT < 60) return;
  _lastKillT = now;
  const c = ctx();
  noise(c, 0.14, 0.55, 0.40, 700);
  sweep(c, 480, 70, 0.14, 0.28, 'square');
  setTimeout(() => noise(c, 0.08, 0.20, 0.6, 1800), 30);
}

export function playQFire(): void {
  const c = ctx();
  sweep(c, 1100, 780, 0.09, 0.16);
  noise(c, 0.04, 0.09, 1.0, 3500);
}

export function playExplosion(): void {
  const c = ctx();
  noise(c, 0.45, 0.80, 0.28);
  sweep(c, 170, 28, 0.45, 0.65);
  setTimeout(() => noise(c, 0.22, 0.40, 0.45, 380), 25);
}

export function playMegaExplosion(): void {
  const c = ctx();
  noise(c, 0.90, 1.00, 0.22);
  sweep(c, 220, 18, 0.90, 0.85);
  for (let i = 1; i <= 5; i++) {
    setTimeout(() => {
      noise(c, 0.55 - i * 0.06, 0.75 - i * 0.10, 0.35);
      sweep(c, 190 - i * 28, 22, 0.38, 0.52 - i * 0.07);
    }, i * 75);
  }
}
