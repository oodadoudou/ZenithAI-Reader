export class TranslationService {
  constructor(config = {}) {
    this.provider = config.TRANSLATION_PROVIDER || 'none';
    this.apiKey = config.TRANSLATION_API_KEY || '';
    this.endpoint = config.TRANSLATION_URL || '';
    this.targetLang = config.TRANSLATION_TARGET_LANG || 'en';
  }

  get enabled() {
    return this.provider && this.provider !== 'none';
  }

  async translate(text, options = {}) {
    if (!this.enabled) {
      throw new Error('Translation provider disabled');
    }
    const trimmed = text?.trim();
    if (!trimmed) {
      throw new Error('Nothing to translate');
    }
    if (this.provider === 'mock') {
      return `${trimmed} (translated)`;
    }
    if (!this.endpoint) {
      throw new Error('Translation endpoint missing');
    }
    const payload = {
      text: trimmed,
      targetLang: options.targetLang || this.targetLang,
      sourceLang: options.sourceLang || 'auto',
    };
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Translation failed (${response.status})`);
    }
    const data = await response.json();
    return data.translation || data.translatedText || '';
  }
}
