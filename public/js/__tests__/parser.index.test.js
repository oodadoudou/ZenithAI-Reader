import { describe, it, expect } from 'vitest'
import { parseBook } from '../parser/index.js'

describe('parseBook index dispatcher', () => {
  it('parses TXT via index and returns paragraphs/chapters', async () => {
    const text = 'Chapter ONE\n\nParagraph A\n\nParagraph B'
    const buf = new TextEncoder().encode(text)
    const book = { fileName: 'demo.txt', title: 'Demo', author: 'Author' }
    const parsed = await parseBook(book, buf)
    expect(parsed.paragraphs.length).toBeGreaterThan(0)
    expect(parsed.chapters.length).toBeGreaterThan(0)
  })
})