const DEFAULTS = {
  APP_MODE: 'local',
  TTS_PROVIDER_DEFAULT: 'offline',
  OFFLINE_TTS_URL: 'http://localhost:8750',
  ONLINE_TTS_BASE_URL: '',
  ONLINE_TTS_API_KEY: '',
  AUDIO_CACHE_LIMIT_MB: 200,
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
