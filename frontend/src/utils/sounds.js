// Lightweight sound cues for the live auction, generated on the fly with the Web Audio API —
// no external audio files needed. Browsers block audio until the user has interacted with the
// page at least once, so callers should invoke `unlockAudio()` from a click handler first.

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

// Realistic auctioneer wooden gavel strike sound effect
export function playGavelStrike() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') return;

  // Impact 1: Low-frequency wood resonance
  tone(ctx, { freq: 120, duration: 0.12, type: 'triangle', volume: 0.4, delay: 0 });
  // Impact 2: Sharp crack/strike
  tone(ctx, { freq: 440, duration: 0.06, type: 'sawtooth', volume: 0.35, delay: 0 });
  // Reverb echo: secondary tap
  tone(ctx, { freq: 110, duration: 0.15, type: 'sine', volume: 0.2, delay: 0.08 });
}

// Short punchy chime — played whenever any team places a new bid.
export function playBidSound() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') return;
  tone(ctx, { freq: 587.33, duration: 0.08, type: 'triangle', volume: 0.25, delay: 0 }); // D5
  tone(ctx, { freq: 880.00, duration: 0.12, type: 'sine', volume: 0.3, delay: 0.05 });    // A5
}

// Rising victory fanfare + gavel strike — played when a player is SOLD.
export function playSoldSound() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') return;
  playGavelStrike();
  tone(ctx, { freq: 523.25, duration: 0.12, volume: 0.25, delay: 0.05 }); // C5
  tone(ctx, { freq: 659.25, duration: 0.12, volume: 0.25, delay: 0.15 }); // E5
  tone(ctx, { freq: 783.99, duration: 0.15, volume: 0.3, delay: 0.25 });  // G5
  tone(ctx, { freq: 1046.50, duration: 0.35, volume: 0.35, delay: 0.38 }); // C6
}

// Descending buzzer — played when a player is marked UNSOLD.
export function playUnsoldSound() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') return;
  tone(ctx, { freq: 320, duration: 0.2, type: 'sawtooth', volume: 0.25, delay: 0 });
  tone(ctx, { freq: 220, duration: 0.35, type: 'sawtooth', volume: 0.25, delay: 0.18 });
}

// Subtle countdown tension tick (last 5 seconds)
export function playCountdownTick() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') return;
  tone(ctx, { freq: 900, duration: 0.04, type: 'sine', volume: 0.15 });
}