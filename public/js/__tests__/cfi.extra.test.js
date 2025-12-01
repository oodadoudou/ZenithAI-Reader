import { describe, it, expect } from 'vitest'

describe('CFI utils', () => {
  it('builds and parses CFIs; resolves fallbacks', async () => {
    const mod = await import('../utils/cfi.js')
    const cfi = mod.buildCfi(3, 15)
    expect(cfi).toContain('para-3')
    expect(cfi.endsWith(':15)')).toBe(true)
    const parsed = mod.parseCfi(cfi)
    expect(parsed.paraIndex).toBe(3)
    expect(parsed.offset).toBe(15)
    const resolved = mod.resolveCfi('bad-cfi', -2)
    expect(resolved.paraIndex).toBe(0)
    expect(resolved.offset).toBe(0)
    const resolved2 = mod.resolveCfi(mod.buildCfi(-1, -5))
    expect(resolved2.paraIndex).toBe(0)
    expect(resolved2.offset).toBe(0)
  })
})