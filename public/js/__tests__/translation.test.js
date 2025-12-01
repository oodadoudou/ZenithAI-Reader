import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslationService } from '../services/translation.js';

describe('TranslationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when provider disabled', async () => {
    const service = new TranslationService({ TRANSLATION_PROVIDER: 'none' });
    await expect(service.translate('hola')).rejects.toThrow('disabled');
  });

  it('returns mock translation when provider is mock', async () => {
    const service = new TranslationService({ TRANSLATION_PROVIDER: 'mock' });
    await expect(service.translate('hola mundo')).resolves.toContain('(translated)');
  });

  it('calls remote endpoint when configured', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ translation: 'hello world' }),
    });
    const service = new TranslationService({ TRANSLATION_PROVIDER: 'remote', TRANSLATION_URL: 'https://api.example.com' });
    const result = await service.translate('hola mundo');
    expect(result).toBe('hello world');
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com', expect.objectContaining({ method: 'POST' }));
  });
});
