import { describe, it, expect } from 'vitest'
import { setTheme, toggleTheme } from '../utils/theme.js'

describe('theme', () => {
  it('sets theme and toggles classes', () => {
    const mode = setTheme('dark')
    expect(mode).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    const next = toggleTheme()
    expect(next).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })
})