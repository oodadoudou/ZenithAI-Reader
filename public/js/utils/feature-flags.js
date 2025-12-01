import { loadConfig } from './config.js';

const FLAG_DEFAULTS = {
  diagnosticsPanel: false,
  voiceMarketplace: false,
  immersivePageFlip: true,
  syncScaffolding: false,
  parserDiagnostics: false,
};

let flagsPromise;
const FLAGS_KEY = 'paperread-flags';

export function loadFeatureFlags() {
  if (!flagsPromise) {
    flagsPromise = loadConfig().then((config) => {
      let overrides = {};
      try { overrides = JSON.parse(localStorage.getItem(FLAGS_KEY) || '{}') } catch {}
      return {
        ...FLAG_DEFAULTS,
        ...(config.FEATURE_FLAGS || {}),
        ...overrides,
      };
    });
  }
  return flagsPromise;
}

export async function isFeatureEnabled(flagName) {
  const flags = await loadFeatureFlags();
  return Boolean(flags[flagName]);
}

export async function getFeatureFlag(flagName, fallback = null) {
  const flags = await loadFeatureFlags();
  return flags.hasOwnProperty(flagName) ? flags[flagName] : fallback;
}

export function setFeatureFlag(flagName, value) {
  try {
    const raw = localStorage.getItem(FLAGS_KEY) || '{}';
    const obj = JSON.parse(raw);
    obj[flagName] = Boolean(value);
    localStorage.setItem(FLAGS_KEY, JSON.stringify(obj));
    flagsPromise = null;
  } catch {}
}
