/**
 * SoundGenerator - Generates synthetic notification sounds using Web Audio API
 */
export class SoundGenerator {
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      // @ts-ignore - AudioContext might not be available in all environments
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  private async ensureAudioContext() {
    if (!this.audioContext) return null;

    // Resume context if suspended (required by browser policies)
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('🔊 AudioContext resumed successfully');
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
        return null;
      }
    }

    return this.audioContext;
  }

  async activate(): Promise<boolean> {
    const context = await this.ensureAudioContext();
    return context !== null && context.state === 'running';
  }

  get isReady(): boolean {
    return this.audioContext !== null && this.audioContext.state === 'running';
  }

  private createOscillator(frequency: number, type: OscillatorType = 'sine') {
    if (!this.audioContext) return null;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = type;

    return { oscillator, gainNode };
  }

  async playSound(type: 'message' | 'visitor' | 'alert', volume: number = 0.8) {
    const context = await this.ensureAudioContext();
    if (!context) return;

    const now = context.currentTime;

    switch (type) {
      case 'message':
        // Gentle ascending tone (like WhatsApp)
        this.playMessage(now, volume);
        break;
      
      case 'visitor':
        // Double beep (like Slack notification)
        this.playVisitor(now, volume);
        break;
      
      case 'alert':
        // Triple urgent beep (like Discord alert)
        this.playAlert(now, volume);
        break;
    }
  }

  private playMessage(startTime: number, volume: number) {
    const nodes = this.createOscillator(800, 'sine');
    if (!nodes) return;

    const { oscillator, gainNode } = nodes;
    
    // Gentle ascending tone
    oscillator.frequency.setValueAtTime(800, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, startTime + 0.3);
    
    // Smooth envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.4);
  }

  private playVisitor(startTime: number, volume: number) {
    // First beep
    const nodes1 = this.createOscillator(600, 'square');
    if (nodes1) {
      const { oscillator: osc1, gainNode: gain1 } = nodes1;
      
      gain1.gain.setValueAtTime(0, startTime);
      gain1.gain.linearRampToValueAtTime(volume * 0.4, startTime + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      
      osc1.start(startTime);
      osc1.stop(startTime + 0.15);
    }

    // Second beep
    const nodes2 = this.createOscillator(900, 'square');
    if (nodes2) {
      const { oscillator: osc2, gainNode: gain2 } = nodes2;
      
      gain2.gain.setValueAtTime(0, startTime + 0.2);
      gain2.gain.linearRampToValueAtTime(volume * 0.4, startTime + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
      
      osc2.start(startTime + 0.2);
      osc2.stop(startTime + 0.35);
    }
  }

  private playAlert(startTime: number, volume: number) {
    const frequency = 1200;
    const beepDuration = 0.08;
    const beepGap = 0.05;
    
    // Triple urgent beeps
    for (let i = 0; i < 3; i++) {
      const nodes = this.createOscillator(frequency + (i * 100), 'sawtooth');
      if (!nodes) continue;

      const { oscillator, gainNode } = nodes;
      const beepStart = startTime + (i * (beepDuration + beepGap));
      
      gainNode.gain.setValueAtTime(0, beepStart);
      gainNode.gain.linearRampToValueAtTime(volume * 0.5, beepStart + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, beepStart + beepDuration);
      
      oscillator.start(beepStart);
      oscillator.stop(beepStart + beepDuration);
    }
  }

  // Clean up resources
  dispose() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

// Singleton instance
let soundGenerator: SoundGenerator | null = null;

export const getSoundGenerator = (): SoundGenerator => {
  if (!soundGenerator) {
    soundGenerator = new SoundGenerator();
  }
  return soundGenerator;
};