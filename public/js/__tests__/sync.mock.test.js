import { describe, it, expect } from 'vitest'
import { MockSyncConnector } from '../sync/mock-connector.js'

describe('MockSyncConnector', () => {
  it('enqueues and drains with backoff', async () => {
    const mock = new MockSyncConnector({ failRate: 0, delayMs: 1 })
    await mock.enqueue('book', { id: 'b1' })
    await mock.enqueue('meta', { id: 'b1', title: 't' })
    const res = await mock.drainWithBackoff()
    expect(res.length).toBe(2)
  })
  it('encrypt stub applied on upload', async () => {
    const mock = new MockSyncConnector({ failRate: 0, delayMs: 1, encrypt: (p) => ({ ...p, enc: true }) })
    const res = await mock.upload('book', { id: 'b1' })
    expect(res.ok).toBe(true)
  })
})