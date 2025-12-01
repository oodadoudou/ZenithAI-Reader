import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OfflineVoiceProvider, OnlineVoiceProvider } from '../services/voice/providers.js'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('OfflineVoiceProvider', () => {
  it('lists voices from backend', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ voices: [{ id: 'x', name: 'X', language: 'en-US', installed: true }] }) })
    const p = new OfflineVoiceProvider({ configPromise: Promise.resolve({ OFFLINE_TTS_URL: 'http://localhost:8750' }) })
    const voices = await p.listVoices()
    expect(voices[0].id).toBe('x')
  })

  it('downloads voice pack', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: 'ready' }) })
    const p = new OfflineVoiceProvider({ configPromise: Promise.resolve({ OFFLINE_TTS_URL: 'http://localhost:8750' }) })
    const res = await p.downloadVoice('en_US')
    expect(res.status).toBe('ready')
  })

  it('synthesizes text and returns absolute url', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ audio_url: '/media/a.wav', duration_ms: 123 }) })
    const p = new OfflineVoiceProvider({ configPromise: Promise.resolve({ OFFLINE_TTS_URL: 'http://localhost:8750' }) })
    const res = await p.synthesize('hello', { voiceId: 'en_US', rate: 1 })
    expect(res.audioUrl).toBe('http://localhost:8750/media/a.wav')
    expect(res.duration_ms).toBe(123)
  })
})

describe('OnlineVoiceProvider', () => {
  it('lists voices from marketplace', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ voices: [{ id: 'y', name: 'Y', language: 'en-US', installed: false }] }) })
    const p = new OnlineVoiceProvider({ configPromise: Promise.resolve({ ONLINE_TTS_BASE_URL: 'https://api.example', AI_VOICE_MARKETPLACE_URL: 'https://market.example' }) })
    const voices = await p.listVoices()
    expect(voices[0].id).toBe('y')
  })

  it('synthesizes with API key', async () => {
    const json = () => Promise.resolve({ audio_url: 'https://cdn.example/a.wav', duration_ms: 456 })
    fetch.mockResolvedValueOnce({ ok: true, json })
    const p = new OnlineVoiceProvider({ configPromise: Promise.resolve({ ONLINE_TTS_BASE_URL: 'https://api.example', ONLINE_TTS_API_KEY: 'key-123' }) })
    const res = await p.synthesize('hello', { voiceId: 'en_GB', rate: 1 })
    expect(res.audioUrl).toContain('https://cdn.example')
    expect(res.duration_ms).toBe(456)
  })
})