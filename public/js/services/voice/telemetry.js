const EVENT_NAME = 'paperread:voice-telemetry';

export class VoiceTelemetry extends EventTarget {
  constructor() {
    super();
    this.totalCharacters = 0;
    this.totalSynths = 0;
    this.lastEvent = null;
  }

  recordSynth(event) {
    if (!event) return;
    this.totalSynths += 1;
    this.totalCharacters += event.characters ?? 0;
    this.lastEvent = { ...event, at: Date.now() };
    const detail = { ...this.lastEvent, totalSynths: this.totalSynths, totalCharacters: this.totalCharacters };
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
    }
    this.dispatchEvent(new CustomEvent('synth', { detail }));
  }

  snapshot() {
    return {
      totalSynths: this.totalSynths,
      totalCharacters: this.totalCharacters,
      lastEvent: this.lastEvent,
    };
  }
}
