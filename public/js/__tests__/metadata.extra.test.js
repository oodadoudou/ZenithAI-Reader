import { describe, it, expect, vi } from 'vitest'

describe('metadata extractor routing', () => {
  it('routes by extension and throws on unsupported', async () => {
    const mod = await import('../utils/metadata.js')
    const spyTxt = vi.spyOn(await import('../parser/txt.js'), 'extractTxtMetadata').mockResolvedValue({ title: 'T', mediaType: 'text/plain' })
    const spyEpub = vi.spyOn(await import('../parser/epub.js'), 'extractEpubMetadata').mockResolvedValue({ title: 'E', mediaType: 'application/epub+zip' })
    const spyPdf = vi.spyOn(await import('../parser/pdf.js'), 'extractPdfMetadata').mockResolvedValue({ title: 'P', mediaType: 'application/pdf' })
    const buf = new Uint8Array([1,2,3])
    const t = await mod.extractMetadata('book.txt', buf)
    expect(t.title).toBe('T')
    const e = await mod.extractMetadata('book.epub', buf)
    expect(e.title).toBe('E')
    const p = await mod.extractMetadata('book.pdf', buf)
    expect(p.title).toBe('P')
    await expect(mod.extractMetadata('book.docx', buf)).rejects.toThrow()
    spyTxt.mockRestore(); spyEpub.mockRestore(); spyPdf.mockRestore()
  })
})