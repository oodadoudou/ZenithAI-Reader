import { describe, it, expect, vi } from 'vitest'
import { VoiceService } from '../services/voice/service.js'

describe('VoiceService synthesize loop', () => {
  it('chunks text and records telemetry across segments', async () => {
    const svc = new VoiceService({ configPromise: Promise.resolve({}) })
    const synthMock = vi.fn(async (text) => ({ audioUrl: `u:${text.length}`, duration_ms: 120 }))
    vi.spyOn(svc, 'getProvider').mockReturnValue({ id: 'offline', synthesize: synthMock })
    const text = 'Sentence one. Sentence two is here. Another sentence again.'
    const res = await svc.synthesize(text, { provider: 'offline', bookId: 'b1', maxCharacters: 25 })
    expect(res.length).toBeGreaterThan(1)
    expect(synthMock).toHaveBeenCalledTimes(res.length)
    const snap = svc.getTelemetry().snapshot()
    expect(snap.totalSynths).toBe(res.length)
    expect(snap.totalCharacters).toBeGreaterThan(0)
  })
})