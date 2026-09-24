/**
 * Synthesizes a soothing harmonic bell/chime using the browser's Web Audio API.
 * No external audio files needed!
 */
export function playChimeSound(type: 'dose_due' | 'dose_taken' = 'dose_due') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'dose_taken') {
      // Pleasant celebratory ascending arpeggio (C5 -> E5 -> G5)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        
        gain.gain.setValueAtTime(0.01, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.1 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.6);
      });
    } else {
      // Dose Due Reminder: Gentle modern double chime (E5 -> A5)
      const freqs = [659.25, 880.0];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);
        
        gain.gain.setValueAtTime(0.01, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.18 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.8);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.9);
      });
    }
  } catch (err) {
    console.warn('Could not play audio notification:', err);
  }
}
