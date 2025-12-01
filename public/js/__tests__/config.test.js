import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadConfig, getConfigValue } from '../utils/config.js'

describe('config loader', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn()
  })

  it('loads config.json and merges defaults', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ APP_MODE: 'server' }) })
    const cfg = await loadConfig()
    expect(cfg.APP_MODE).toBe('server')
    expect(cfg.TTS_PROVIDER_DEFAULT).toBe('offline')
  })

  it('falls back to defaults on fetch error', async () => {
    global.fetch.mockRejectedValue(new Error('network'))
    const value = await getConfigValue('AUDIO_CACHE_LIMIT_MB')
    expect(value).toBe(200)
  })
})