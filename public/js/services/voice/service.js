import { OfflineVoiceProvider, OnlineVoiceProvider } from './providers.js';
import { VoiceTelemetry } from './telemetry.js';
import { loadConfig } from '../../utils/config.js';

const DEFAULT_MAX_CHARS = 4800;

export function chunkText(text, limit = DEFAULT_MAX_CHARS) {
  if (!text) return [];
  if (text.length <= limit) return [text];
  const chunks = [];
  let remaining = text.trim();
  while (remaining.length) {
    let chunk = remaining.slice(0, limit);
    const fallback = chunk.lastIndexOf('.')
      || chunk.lastIndexOf('!')
      || chunk.lastIndexOf('?');
    const splitIndex = fallback > limit * 0.6 ? fallback + 1 : chunk.length;
    chunk = chunk.slice(0, splitIndex).trim();
    chunks.push(chunk);
    remaining = remaining.slice(splitIndex).trimStart();
  }
  return chunks.filter(Boolean);
}

export class VoiceService {
  constructor({ configPromise } = {}) {
    this.configPromise = configPromise || loadConfig();
    this.telemetry = new VoiceTelemetry();
    this.providers = {
      offline: new OfflineVoiceProvider({ configPromise: this.configPromise, telemetry: this.telemetry }),
      online: new OnlineVoiceProvider({ configPromise: this.configPromise, telemetry: this.telemetry }),
    };
  }

  getTelemetry() {
    return this.telemetry;
  }

  getProvider(providerId = 'offline') {
    return this.providers[providerId] || this.providers.offline;
  }

  async describeProviders() {
    return Promise.all(
      Object.values(this.providers).map(async (provider) => ({
        id: provider.id,
        label: provider.label,
        ...(provider.describe() || {}),
      })),
    );
  }

  async listVoices(providerId = 'offline') {
    const provider = this.getProvider(providerId);
    return provider?.listVoices() ?? [];
  }

  async downloadVoice(voiceId, providerId = 'offline') {
    const provider = this.getProvider(providerId);
    if (!provider || typeof provider.downloadVoice !== 'function') {
      throw new Error(`Provider ${providerId} does not support downloads`);
    }
    return provider.downloadVoice(voiceId);
  }

  async synthesize(text, options = {}) {
    const provider = this.getProvider(options.provider);
    if (!provider) {
      throw new Error(`Unknown provider: ${options.provider}`);
    }
    const limit = options.maxCharacters || DEFAULT_MAX_CHARS;
    const chunks = chunkText(text, limit);
    const responses = [];
    for (const chunk of chunks) {
      const payload = await provider.synthesize(chunk, options);
      responses.push(payload);
      this.telemetry.recordSynth({
        provider: provider.id,
        characters: chunk.length,
        durationMs: payload.duration_ms,
        bookId: options.bookId,
      });
    }
    return responses;
  }
}
