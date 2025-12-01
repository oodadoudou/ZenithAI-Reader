export class MockSyncConnector {
  constructor({ failRate = 0.2, delayMs = 50, encrypt = (p) => p } = {}) {
    this.failRate = failRate
    this.delayMs = delayMs
    this.encrypt = encrypt
    this.queue = []
  }
  async upload(entity, payload) {
    const body = this.encrypt({ entity, payload, ts: Date.now() })
    await new Promise((r) => setTimeout(r, this.delayMs))
    if (Math.random() < this.failRate) throw new Error('mock 503')
    return { ok: true, id: Math.random().toString(36).slice(2) }
  }
  async pull(sinceTs = 0) {
    await new Promise((r) => setTimeout(r, this.delayMs))
    return { entities: [] }
  }
  async enqueue(entity, payload) {
    this.queue.push({ entity, payload })
  }
  async drainWithBackoff(maxAttempts = 5) {
    const results = []
    while (this.queue.length) {
      const item = this.queue[0]
      let attempt = 0
      let done = false
      let delay = this.delayMs
      while (!done && attempt < maxAttempts) {
        try {
          await new Promise((r) => setTimeout(r, delay))
          const res = await this.upload(item.entity, item.payload)
          results.push(res)
          done = true
        } catch (err) {
          attempt++
          delay *= 2
        }
      }
      if (!done) throw new Error('queue drain failed')
      this.queue.shift()
    }
    return results
  }
}