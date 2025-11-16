import { getConfigValue, loadConfig } from './utils/config.js';

const MAX_CHARS = 4800;

function buildUrl(base, path) {
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized}${path}`;
}

export class TTSClient {
  constructor() {
    this.configPromise = loadConfig();
  }

  async synthesize(text, { provider = 'offline', voiceId = 'en_US', rate, pitch, bookId } = {}) {
    const chunks = chunkText(text, MAX_CHARS);
    const results = [];
    for (const chunk of chunks) {
      if (provider === 'online') {
        results.push(await this.callOnline(chunk, { voiceId, rate, pitch, bookId }));
      } else {
        results.push(await this.callOffline(chunk, { voiceId, rate, pitch, bookId }));
      }
    }
    return results;
  }

  async callOffline(text, { voiceId, rate, pitch, bookId }) {
    const config = await this.configPromise;
    const base = config.OFFLINE_TTS_URL || 'http://localhost:8750';
    const res = await fetch(buildUrl(base, '/tts?json=1'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_id: voiceId, rate, pitch, book_id: bookId }),
    });
    if (!res.ok) throw new Error(`Offline TTS failed: ${res.status}`);
    const payload = await res.json();
    const audioUrl = /^https?:/.test(payload.audio_url)
      ? payload.audio_url
      : buildUrl(base, payload.audio_url);
    return { audioUrl, duration_ms: payload.duration_ms };
  }

  async callOnline(text, { voiceId, rate, pitch, bookId }) {
    const config = await this.configPromise;
    if (!config.ONLINE_TTS_BASE_URL) {
      throw new Error('Online TTS not configured');
    }
    const endpoint = buildUrl(config.ONLINE_TTS_BASE_URL, '/tts/generate');
    const headers = { 'Content-Type': 'application/json' };
    if (config.ONLINE_TTS_API_KEY) {
      headers.Authorization = `Bearer ${config.ONLINE_TTS_API_KEY}`;
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, voice_id: voiceId, rate, pitch, book_id: bookId }),
    });
    if (!res.ok) throw new Error(`Online TTS failed: ${res.status}`);
    const payload = await res.json();
    return { audioUrl: payload.audio_url, duration_ms: payload.duration_ms };
  }
}

export function chunkText(text, limit = MAX_CHARS) {
  if (text.length <= limit) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length) {
    let chunk = remaining.slice(0, limit);
    const lastPeriod = chunk.lastIndexOf('.');
    if (lastPeriod > limit * 0.6) {
      chunk = chunk.slice(0, lastPeriod + 1);
    }
    chunks.push(chunk.trim());
    remaining = remaining.slice(chunk.length);
  }
  return chunks.filter(Boolean);
}
