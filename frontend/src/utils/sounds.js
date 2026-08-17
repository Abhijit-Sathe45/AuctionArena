// Lightweight sound cues for the live auction, generated on the fly with the Web Audio API —
// no external audio files needed. Browsers block audio until the user has interacted with the
// page at least once, so callers should invoke `unlockAudio()` from a click handler first
// (e.g. an "Enable Sound" button) before relying on these to actually play.

let audioCtx;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// Call this from within a user click handler to satisfy the browser's autoplay policy.
export function unlockAudio() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(ctx, { freq, duration, type = 'sine', volume = 0.2, delay = 0 }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const startTime = ctx.currentTime + delay;
  osc.start(startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.stop(startTime + duration + 0.02);
}

// Short click/beep — played whenever any team places a new bid.
export function playBidSound() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') return; // audio not unlocked yet — fail silently
  tone(ctx, { freq: 720, duration: 0.1, type: 'square', volume: 0.15 });
}

// Rising three-note chime — played when a player is SOLD.
export function playSoldSound() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') return;
  tone(ctx, { freq: 523.25, duration: 0.15, volume: 0.25, delay: 0 });    // C5
  tone(ctx, { freq: 659.25, duration: 0.15, volume: 0.25, delay: 0.15 }); // E5
  tone(ctx, { freq: 783.99, duration: 0.3, volume: 0.3, delay: 0.3 });    // G5
}

// Descending buzzer — played when a player is marked UNSOLD.
export function playUnsoldSound() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') return;
  tone(ctx, { freq: 300, duration: 0.25, type: 'sawtooth', volume: 0.2, delay: 0 });
  tone(ctx, { freq: 200, duration: 0.35, type: 'sawtooth', volume: 0.2, delay: 0.2 });
}