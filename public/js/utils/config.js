const DEFAULTS = {
  APP_MODE: 'local',
  TTS_PROVIDER_DEFAULT: 'offline',
  OFFLINE_TTS_URL: 'http://localhost:8750',
  ONLINE_TTS_BASE_URL: '',
  ONLINE_TTS_API_KEY: '',
  AUDIO_CACHE_LIMIT_MB: 200,
  DICTIONARY_PACK_URL: '/data/dictionary-en.json',
  TRANSLATION_PROVIDER: 'none',
  TRANSLATION_URL: '',
  TRANSLATION_API_KEY: '',
  AI_VOICE_MARKETPLACE_URL: '',
  SYNC_CONNECTOR_URL: '',
  SYNC_API_KEY: '',
  BACKUP_SIGNING_SECRET: '',
  FEATURE_FLAGS: {
    diagnosticsPanel: false,
    voiceMarketplace: false,
    immersivePageFlip: true,
    syncScaffolding: false,
    parserDiagnostics: false,
  },
  performanceBudget: {
    loadMs: 1200,
    readerRenderMs: 800,
    pageTurnMs: 800,
    searchMs: 300,
    audioQueueMs: 1200
  },
  privacyBudget: {
    audioCacheLimitMB: 200
  },
};

let configPromise;

export function loadConfig() {
  if (!configPromise) {
    configPromise = fetch('/config.json')
      .then((res) => (res.ok ? res.json() : DEFAULTS))
      .catch(() => DEFAULTS)
      .then((data) => ({ ...DEFAULTS, ...data }));
  }
  return configPromise;
}

export async function getConfigValue(key) {
  const cfg = await loadConfig();
  return cfg[key] ?? DEFAULTS[key];
}
