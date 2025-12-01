import { describe, it, expect } from 'vitest'
import { activateFocusTrap, deactivateFocusTrap } from '../utils/focus-trap.js'

function makeContainer() {
  const container = document.createElement('div')
  const a = document.createElement('button')
  a.id = 'a'
  a.textContent = 'A'
  const b = document.createElement('button')
  b.id = 'b'
  b.textContent = 'B'
  const hidden = document.createElement('button')
  hidden.id = 'hidden'
  hidden.textContent = 'hidden'
  hidden.setAttribute('aria-hidden', 'true')
  container.append(a, b, hidden)
  document.body.appendChild(container)
  return { container, a, b }
}

describe('focus-trap', () => {
  it('activates trap; jsdom treats no elements as visible so container receives focus', async () => {
    const trigger = document.createElement('button')
    trigger.id = 'trigger'
    document.body.appendChild(trigger)
    trigger.focus()
    const { container, a, b } = makeContainer()
    activateFocusTrap(container, { initialFocus: '#b' })
    await new Promise((r) => requestAnimationFrame(r))
    expect(document.activeElement).toBe(b)
    const ev = new KeyboardEvent('keydown', { key: 'Tab' })
    container.dispatchEvent(ev)
    expect(document.activeElement).toBe(container)
    const evShift = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true })
    container.dispatchEvent(evShift)
    expect(document.activeElement).toBe(container)
    deactivateFocusTrap(container)
    expect(document.activeElement).toBe(trigger)
  })
})