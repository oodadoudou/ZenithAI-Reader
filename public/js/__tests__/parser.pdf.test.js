import { describe, it, expect, vi } from 'vitest'

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getMetadata: async () => ({ info: { Title: 'Demo PDF', Author: 'A' } }),
      getPage: async () => ({ getTextContent: async () => ({ items: [{ str: 'Chapter 1. Hello world.' }] }) }),
    }),
    destroy: async () => {},
  }),
}))

import { extractPdfMetadata, parsePdf } from '../parser/pdf.js'

describe('pdf parsing', () => {
  it('extracts metadata', async () => {
    const meta = await extractPdfMetadata(new Uint8Array([1,2,3]))
    expect(meta.title).toBe('Demo PDF')
    expect(meta.author).toBe('A')
    expect(meta.mediaType).toBe('application/pdf')
  })
  it('parses paragraphs and detects chapter', async () => {
    const res = await parsePdf(new Uint8Array([1,2,3]))
    expect(res.paragraphs.length).toBeGreaterThan(0)
    expect(res.chapters.length).toBeGreaterThan(0)
  })
})