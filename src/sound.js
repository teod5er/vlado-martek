// Small synthesized UI sounds (no audio files needed). Swap for samples later if wanted.
let ctx = null;
let master = null;
let noiseBuf = null;
let enabled = true;

try { enabled = localStorage.getItem('vm-sound') !== 'off'; } catch { /* storage unavailable */ }

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

// Phones only let audio start inside a real tap, so every gesture tries to wake the context;
// a silent one-sample buffer completes the unlock on iOS.
let primed = false, lastTry = -1e9;
export function unlock() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* Safari only */ }
  const c = ensure();
  if (!c) return;
  if (c.state === 'running' && primed) return;
  const now = performance.now(); // mouse moves call this often; try at most a few times a second
  if (now - lastTry < 250) return;
  lastTry = now;
  c.resume?.();
  {
    primed = true;
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, c.sampleRate);
    src.connect(c.destination);
    src.start(0);
  }
}

export function isEnabled() { return enabled; }
export function setEnabled(v) {
  enabled = v;
  try { localStorage.setItem('vm-sound', v ? 'on' : 'off'); } catch { /* ignore */ }
}

function ready() {
  if (!enabled) return null;
  unlock(); // sounds are triggered by taps, so this also wakes audio on mobile
  if (!ctx || ctx.state === 'closed') return null;
  return ctx;
}

function noise(t, dur, { type = 'bandpass', freq = 2000, q = 1, gain = 0.2, attack = 0.001, sweepTo = null }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.3);
  src.stop(t + dur + 0.02);
}

function tone(t, dur, { freq = 200, to = null, gain = 0.2, type = 'sine' }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// ---------- a light tick in the hand, as each work comes to the front (phones only) ----------
// Android: the Vibration API. iPhone has none; from iOS 18 a switch (<input switch>) gives a system
// haptic when it is toggled inside a touch, so a hidden one is toggled (only felt while a finger is
// on the screen; elsewhere it simply does nothing). Off with the sound, under the same switch.
const coarse = matchMedia('(pointer: coarse)');
let iosSwitch = null, lastTick = 0;
function iosTick() {
  if (!iosSwitch) {
    iosSwitch = document.createElement('label');
    iosSwitch.setAttribute('aria-hidden', 'true');
    iosSwitch.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    iosSwitch.append(input);
    document.head.append(iosSwitch);
  }
  iosSwitch.click();
}
export function haptic() {
  if (!enabled || !coarse.matches) return;
  const now = performance.now();
  if (now - lastTick < 45) return; // a fast flick: not a buzz, still separate ticks
  lastTick = now;
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(10);
    else iosTick();
  } catch { /* not allowed yet (before the first tap) */ }
}

// A click for every press (opening, closing, menu), a page turn for books and the notch of a
// mechanical scroll wheel.
export const sound = {
  click() {
    const c = ready(); if (!c) return;
    const t = c.currentTime;
    noise(t, 0.03, { freq: 2600, q: 1.4, gain: 0.32 });
    tone(t, 0.04, { freq: 1400, to: 500, gain: 0.08, type: 'triangle' });
    noise(t + 0.045, 0.02, { freq: 3800, q: 2, gain: 0.12 });
  },
  // one detent of a mouse wheel: a dry plastic tick with a hint of the ratchet spring behind it
  notch() {
    haptic(); // felt as well as heard
    const c = ready(); if (!c) return;
    const t = c.currentTime;
    const v = 0.85 + Math.random() * 0.3; // no two notches sound quite the same
    noise(t, 0.012, { type: 'highpass', freq: 3200 * v, q: 0.8, gain: 0.22 });
    tone(t, 0.014, { freq: 1900 * v, to: 900, gain: 0.05, type: 'square' });
    noise(t + 0.004, 0.02, { freq: 1200 * v, q: 3, gain: 0.06 });
  },
  page() {
    const c = ready(); if (!c) return;
    const t = c.currentTime;
    noise(t, 0.28, { freq: 900, sweepTo: 4200, q: 0.7, gain: 0.16, attack: 0.05 });
    noise(t + 0.22, 0.05, { freq: 2200, q: 1, gain: 0.12 });
  },
};
