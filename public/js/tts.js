import { VoiceService, chunkText } from './services/voice/service.js';

export const MAX_TTS_CHARACTERS = 4800;

export class TTSClient {
  constructor(options = {}) {
    this.voiceService = new VoiceService(options);
  }

  synthesize(text, options = {}) {
    return this.voiceService.synthesize(text, options);
  }

  listVoices(providerId = 'offline') {
    return this.voiceService.listVoices(providerId);
  }

  downloadVoice(voiceId, providerId = 'offline') {
    return this.voiceService.downloadVoice(voiceId, providerId);
  }

  describeProviders() {
    return this.voiceService.describeProviders();
  }

  getTelemetry() {
    return this.voiceService.getTelemetry();
  }
}

export { chunkText };
