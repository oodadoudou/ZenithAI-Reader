import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'
vi.mock('../storage/library.js', () => ({
  listBooks: async () => [],
}))
import { buildManifests } from '../export/backup.js'

describe('backup manifest', () => {
  it('builds payload and signature', async () => {
    const payload = await buildManifests()
    expect(payload.manifest).toBeTruthy()
    expect(typeof payload.signature).toBe('string')
  })
})