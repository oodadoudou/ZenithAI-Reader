import { loadConfig } from '../../utils/config.js';

export const DEFAULT_VOICES = [
  { id: 'en_US', name: 'English (US)', locale: 'en-US', installed: true },
  { id: 'en_GB', name: 'English (UK)', locale: 'en-GB', installed: true },
  { id: 'es_ES', name: 'Español', locale: 'es-ES', installed: true },
  { id: 'fr_FR', name: 'Français', locale: 'fr-FR', installed: true },
  { id: 'zh_CN_female', name: '中文（女声）· Mandarin', locale: 'zh-CN', installed: true },
];

function normalizeBaseUrl(value, fallback) {
  const base = value || fallback;
  if (!base) return '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

export class VoiceProvider {
  constructor(id, label, { configPromise, telemetry } = {}) {
    this.id = id;
    this.label = label;
    this.configPromise = configPromise || loadConfig();
    this.telemetry = telemetry;
  }

  describe() {
    return {
      id: this.id,
      label: this.label,
      supportsDownloads: false,
      supportsMarketplace: false,
    };
  }

  async listVoices() {
    return DEFAULT_VOICES;
  }

  async downloadVoice() {
    return { status: 'unsupported' };
  }

  async synthesize() {
    throw new Error('synthesize not implemented');
  }
}

export class OfflineVoiceProvider extends VoiceProvider {
  constructor(options = {}) {
    super('offline', 'Offline voices', options);
  }

  async getBaseUrl() {
    const config = await this.configPromise;
    return normalizeBaseUrl(config.OFFLINE_TTS_URL, 'http://localhost:8750');
  }

  describe() {
    return {
      ...super.describe(),
      supportsDownloads: true,
      supportsMarketplace: false,
    };
  }

  async listVoices() {
    const base = await this.getBaseUrl();
    if (!base) return DEFAULT_VOICES;
    try {
      const response = await fetch(`${base}/voices`);
      if (!response.ok) throw new Error(`offline voices failed with ${response.status} ${response.statusText}`);
      const payload = await response.json();
      if (Array.isArray(payload?.voices)) {
        return payload.voices;
      }
    } catch (err) {
      console.warn('offline voice catalog unavailable', err);
    }
    return DEFAULT_VOICES;
  }

  async downloadVoice(voiceId) {
    const base = await this.getBaseUrl();
    if (!base) throw new Error('offline provider unavailable');
    const response = await fetch(`${base}/voices/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_id: voiceId }),
    });
    if (!response.ok) {
      throw new Error(`download failed with ${response.status}`);
    }
    return response.json().catch(() => ({ status: 'ok' }));
  }

  async synthesize(text, { voiceId, rate, pitch, bookId } = {}) {
    const base = await this.getBaseUrl();
    if (!base) throw new Error('offline provider unavailable');
    const response = await fetch(`${base}/tts?json=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_id: voiceId, rate, pitch, book_id: bookId }),
    });
    if (!response.ok) {
      throw new Error(`Offline TTS failed with ${response.status}`);
    }
    const payload = await response.json();
    const audioUrl = /^https?:/i.test(payload.audio_url)
      ? payload.audio_url
      : `${base}${payload.audio_url?.startsWith('/') ? '' : '/'}${payload.audio_url}`;
    return { audioUrl, duration_ms: payload.duration_ms };
  }
}

export class OnlineVoiceProvider extends VoiceProvider {
  constructor(options = {}) {
    super('online', 'Online voices', options);
  }

  async getBaseUrl() {
    const config = await this.configPromise;
    const base = normalizeBaseUrl(config.ONLINE_TTS_BASE_URL, '');
    if (!base) {
      throw new Error('Online TTS not configured');
    }
    return base;
  }

  describe() {
    return {
      ...super.describe(),
      supportsDownloads: false,
      supportsMarketplace: true,
    };
  }

  async listVoices() {
    const config = await this.configPromise;
    const marketplace = config.AI_VOICE_MARKETPLACE_URL;
    if (!marketplace) {
      return DEFAULT_VOICES;
    }
    try {
      const response = await fetch(marketplace);
      if (!response.ok) throw new Error(`marketplace failed with ${response.status}`);
      const payload = await response.json();
      if (Array.isArray(payload?.voices)) {
        return payload.voices;
      }
    } catch (err) {
      console.warn('voice marketplace unavailable', err);
    }
    return DEFAULT_VOICES;
  }

  async downloadVoice() {
    return { status: 'unsupported' };
  }

  async synthesize(text, { voiceId, rate, pitch, bookId } = {}) {
    const base = await this.getBaseUrl();
    const headers = { 'Content-Type': 'application/json' };
    const config = await this.configPromise;
    if (config.ONLINE_TTS_API_KEY) {
      headers.Authorization = `Bearer ${config.ONLINE_TTS_API_KEY}`;
    }
    const response = await fetch(`${base}/tts/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, voice_id: voiceId, rate, pitch, book_id: bookId }),
    });
    if (!response.ok) {
      throw new Error(`Online TTS failed with ${response.status}`);
    }
    const payload = await response.json();
    return { audioUrl: payload.audio_url, duration_ms: payload.duration_ms };
  }
}
