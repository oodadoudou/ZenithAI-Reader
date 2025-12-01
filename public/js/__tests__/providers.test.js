import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OfflineVoiceProvider, OnlineVoiceProvider, DEFAULT_VOICES } from '../services/voice/providers.js'

describe('voice providers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn()
  })

  it('offline listVoices falls back to DEFAULT_VOICES on error', async () => {
    const provider = new OfflineVoiceProvider({ configPromise: Promise.resolve({ OFFLINE_TTS_URL: 'http://localhost:8750' }) })
    global.fetch.mockRejectedValue(new Error('fail'))
    const voices = await provider.listVoices()
    expect(Array.isArray(voices)).toBe(true)
    expect(voices.length).toBe(DEFAULT_VOICES.length)
  })

  it('offline synthesize returns absolute audioUrl', async () => {
    const provider = new OfflineVoiceProvider({ configPromise: Promise.resolve({ OFFLINE_TTS_URL: 'http://localhost:8750' }) })
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ audio_url: '/media/test.wav', duration_ms: 123 }) })
    const res = await provider.synthesize('hi', { voiceId: 'en_US' })
    expect(res.audioUrl).toMatch(/^http:\/\/localhost:8750\/media\/test\.wav$/)
    expect(res.duration_ms).toBe(123)
  })

  it('online provider throws when base url not configured', async () => {
    const online = new OnlineVoiceProvider({ configPromise: Promise.resolve({ ONLINE_TTS_BASE_URL: '' }) })
    await expect(online.getBaseUrl()).rejects.toThrow()
  })
})