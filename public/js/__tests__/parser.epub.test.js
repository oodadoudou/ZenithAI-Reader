import { describe, it, expect, vi } from 'vitest'

const enc = new TextEncoder()
const files = {
  'META-INF/container.xml': enc.encode(
    `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+zip"/></rootfiles></container>`
  ),
  'OEBPS/content.opf': enc.encode(
    `<?xml version="1.0" encoding="UTF-8"?>
     <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
       <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
         <dc:title>Sample Book</dc:title>
         <dc:creator>Author</dc:creator>
         <meta name="cover" content="cover" />
       </metadata>
       <manifest>
         <item id="cover" href="cover.jpg" media-type="image/jpeg" />
         <item id="chap1" href="chapter1.xhtml" media-type="application/xhtml+xml" />
       </manifest>
       <spine>
         <itemref idref="chap1" />
       </spine>
     </package>`
  ),
  'OEBPS/chapter1.xhtml': enc.encode(
    `<?xml version="1.0" encoding="UTF-8"?>
     <html xmlns="http://www.w3.org/1999/xhtml"><head><title>Ch1</title></head>
     <body><h1>Chapter 1</h1><p>This is a paragraph with more than twenty characters to be included.</p></body></html>`
  ),
  'OEBPS/cover.jpg': new Uint8Array([0,1,2,3,4,5,6,7,8,9])
}

vi.mock('fflate', async () => {
  const td = new TextDecoder()
  return {
    unzipSync: () => files,
    strFromU8: (u) => td.decode(u),
  }
})

async function getParser() {
  const mod = await import('../parser/epub.js')
  return { parseEpub: mod.parseEpub, extractEpubMetadata: mod.extractEpubMetadata }
}

describe('epub parser', () => {
  it('parses minimal epub content', async () => {
    const { parseEpub } = await getParser()
    const result = parseEpub(new Uint8Array([1,2,3]))
    expect(Array.isArray(result.paragraphs)).toBe(true)
    expect(result.paragraphs.length).toBeGreaterThan(0)
    expect(result.chapters[0].title).toContain('Chapter')
  })

  it('extracts metadata including cover', async () => {
    const { extractEpubMetadata } = await getParser()
    const meta = extractEpubMetadata(new Uint8Array([1,2,3]))
    expect(meta.title).toBe('Sample Book')
    expect(meta.author).toBe('Author')
    expect(meta.cover?.startsWith('data:image')).toBe(true)
    expect(meta.rootPath).toBe('OEBPS/content.opf')
  })
})