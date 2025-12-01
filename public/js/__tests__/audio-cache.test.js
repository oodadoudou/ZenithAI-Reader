import { describe, it, expect, beforeEach } from 'vitest'
import { recordAudioUrl, consumeAudioUrls, peekAudioCache, summarizeAudioCache } from '../storage/audio-cache.js'

describe('audio-cache', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('records and summarizes offline/online urls', () => {
    recordAudioUrl('book1', 'offline', '/media/a.wav')
    recordAudioUrl('book1', 'online', 'https://tts.example/a.wav')
    recordAudioUrl('book2', 'offline', '/media/b.wav')
    const peek = peekAudioCache()
    expect(peek.book1.offline).toContain('/media/a.wav')
    expect(peek.book1.online).toContain('https://tts.example/a.wav')
    expect(peek.book2.offline).toContain('/media/b.wav')
    const summary = summarizeAudioCache()
    expect(summary.booksWithAudio).toBe(2)
    expect(summary.offlineEntries).toBe(2)
    expect(summary.onlineEntries).toBe(1)
  })

  it('consumes and clears per book', () => {
    recordAudioUrl('book1', 'offline', '/media/a.wav')
    recordAudioUrl('book1', 'online', 'https://tts.example/a.wav')
    const payload = consumeAudioUrls('book1')
    expect(payload.offline).toContain('/media/a.wav')
    expect(payload.online).toContain('https://tts.example/a.wav')
    const peek = peekAudioCache()
    expect(peek.book1).toBeUndefined()
  })
})