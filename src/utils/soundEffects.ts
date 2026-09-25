/**
 * Web Audio API synthesizer for supplement dose notifications and reminder chimes.
 * Works 100% offline and on all mobile / desktop browsers without external media files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a warm double-bell notification chime (e.g., when a dose reminder fires)
 */
export function playReminderChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Bell 1: 587.33 Hz (D5)
    playTone(ctx, 587.33, now, 0.28, 0.15);
    // Bell 2: 880 Hz (A5)
    playTone(ctx, 880.00, now + 0.16, 0.45, 0.2);
  } catch (e) {
    console.warn('Audio chime playback blocked or not supported', e);
  }
}

/**
 * Play an uplifting success chord (when dose taken or synchronized)
 */
export function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Arpeggio C6 -> E6 -> G6
    playTone(ctx, 523.25, now, 0.15, 0.12);
    playTone(ctx, 659.25, now + 0.1, 0.18, 0.14);
    playTone(ctx, 783.99, now + 0.2, 0.35, 0.18);
  } catch (e) {
    console.warn('Audio success chime error', e);
  }
}

function playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, maxGain: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(maxGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/**
 * Trigger mobile haptic feedback if available (Android vibration API)
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' = 'light') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'light') navigator.vibrate(20);
      else if (type === 'medium') navigator.vibrate(45);
      else if (type === 'success') navigator.vibrate([30, 50, 40]);
    } catch {
      // Haptics suppressed
    }
  }
}
