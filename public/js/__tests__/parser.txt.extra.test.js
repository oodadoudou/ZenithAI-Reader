import { describe, it, expect } from 'vitest'

describe('txt parser', () => {
  it('extracts metadata and parses paragraphs/chapters', async () => {
    const mod = await import('../parser/txt.js')
    const text = 'CHAPTER ONE\n\nHello world.\n\nAnother para.'
    const buf = new TextEncoder().encode(text)
    const meta = mod.extractTxtMetadata('hello-world.txt', buf)
    expect(meta.title.toLowerCase()).toContain('chapter')
    const result = mod.parseTxt(buf)
    expect(result.paragraphs.length).toBeGreaterThan(1)
    expect(result.chapters[0].title.toLowerCase()).toContain('chapter')
  })
})