import { describe, it, expect } from 'vitest'

describe('theme utils', () => {
  it('sets and toggles theme', async () => {
    const mod = await import('../utils/theme.js')
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
    localStorage.clear()
    mod.applySavedTheme()
    expect(document.documentElement.classList.contains('light')).toBe(true)
    const next = mod.setTheme('dark')
    expect(next).toBe('dark')
    expect(localStorage.getItem('paperread-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    const toggled = mod.toggleTheme()
    expect(toggled).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })
})