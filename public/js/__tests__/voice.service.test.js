import { describe, expect, test, vi } from 'vitest';
import { chunkText } from '../services/voice/service.js';
import { VoiceTelemetry } from '../services/voice/telemetry.js';

describe('chunkText', () => {
  test('returns single chunk when under limit', () => {
    const text = 'hello world';
    expect(chunkText(text, 100)).toEqual(['hello world']);
  });

  test('splits long text at sentence boundaries when possible', () => {
    const text = 'Sentence one. Sentence two is here. Another sentence to ensure length.';
    const chunks = chunkText(text, 25);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toMatch(/Sentence one\./);
  });
});

describe('VoiceTelemetry', () => {
  test('records synth events and exposes snapshot', () => {
    const telemetry = new VoiceTelemetry();
    const handler = vi.fn();
    telemetry.addEventListener('synth', handler);
    telemetry.recordSynth({ provider: 'offline', characters: 120, durationMs: 300 });
    telemetry.recordSynth({ provider: 'online', characters: 60 });
    expect(handler).toHaveBeenCalledTimes(2);
    const snapshot = telemetry.snapshot();
    expect(snapshot.totalSynths).toBe(2);
    expect(snapshot.totalCharacters).toBe(180);
    expect(snapshot.lastEvent.provider).toBe('online');
  });
});
