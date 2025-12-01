import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as config from '../utils/config.js'
import { loadFeatureFlags, isFeatureEnabled, getFeatureFlag } from '../utils/feature-flags.js'

describe('feature flags', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('merges defaults with config FEATURE_FLAGS', async () => {
    vi.spyOn(config, 'loadConfig').mockResolvedValue({ FEATURE_FLAGS: { diagnosticsPanel: true } })
    const flags = await loadFeatureFlags()
    expect(flags.diagnosticsPanel).toBe(true)
    expect(flags.immersivePageFlip).toBe(true)
  })

  it('reads flag state and fallback', async () => {
    vi.spyOn(config, 'loadConfig').mockResolvedValue({ FEATURE_FLAGS: { voiceMarketplace: false } })
    expect(await isFeatureEnabled('voiceMarketplace')).toBe(false)
    expect(await getFeatureFlag('nonexistent', 'x')).toBe('x')
  })
})