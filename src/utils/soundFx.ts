class SoundEffects {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (activation && !activation.hasBeenActive) {
      return null;
    }
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(freq: number, durationSec: number, type: OscillatorType = 'sine', gainPeak = 0.06, delaySec = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  public playStart(): void {
    this.playTone(440, 0.14, 'triangle', 0.05, 0);
    this.playTone(554.37, 0.14, 'triangle', 0.05, 0.08);
    this.playTone(659.25, 0.24, 'triangle', 0.06, 0.16);
  }

  public playSelect(): void {
    this.playTone(520, 0.07, 'sine', 0.04, 0);
  }

  public playCorrect(): void {
    this.playTone(523.25, 0.16, 'triangle', 0.06, 0);
    this.playTone(659.25, 0.16, 'triangle', 0.06, 0.07);
    this.playTone(783.99, 0.28, 'triangle', 0.07, 0.14);
  }

  public playWrong(): void {
    this.playTone(220, 0.18, 'sawtooth', 0.035, 0);
    this.playTone(185, 0.28, 'sawtooth', 0.035, 0.11);
  }

  public playFinale(): void {
    this.playTone(440, 0.14, 'triangle', 0.05, 0);
    this.playTone(554.37, 0.14, 'triangle', 0.05, 0.09);
    this.playTone(659.25, 0.16, 'triangle', 0.05, 0.18);
    this.playTone(880, 0.4, 'triangle', 0.07, 0.27);
  }
}

export const soundFx = new SoundEffects();
