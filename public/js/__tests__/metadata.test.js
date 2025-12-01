import { describe, it, expect } from 'vitest'
import { extractMetadata } from '../utils/metadata.js'

describe('metadata extraction', () => {
  it('extracts txt metadata with mediaType', async () => {
    const buf = new TextEncoder().encode('Hello world')
    const meta = await extractMetadata('Sample.txt', buf)
    expect(meta.mediaType).toBe('text/plain')
    expect(meta.title).toBe('Sample')
  })

  it('throws on unsupported extension', async () => {
    const buf = new Uint8Array([1,2,3])
    await expect(extractMetadata('file.xyz', buf)).rejects.toThrow()
  })
})