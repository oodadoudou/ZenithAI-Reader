import { describe, it, expect } from 'vitest'
import { emitMetric, getMetricEventName, measureMetric } from '../utils/telemetry.js'

describe('telemetry', () => {
  it('emits metric events', () => {
    let received = null
    window.addEventListener(getMetricEventName(), (e) => { received = e.detail })
    emitMetric({ label: 'x', durationMs: 1 })
    expect(received.label).toBe('x')
  })

  it('measures sync function', () => {
    let received = null
    window.addEventListener(getMetricEventName(), (e) => { received = e.detail })
    const res = measureMetric('m', () => 42)
    expect(res).toBe(42)
    expect(received.label).toBe('m')
    expect(typeof received.durationMs).toBe('number')
  })
})