import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, loadPrefs, resolveTri, savePrefs } from './preferences'
import { createMemoryStore } from './progress/storage'

describe('resolveTri', () => {
  it('follows the system when set to system', () => {
    expect(resolveTri('system', true)).toBe(true)
    expect(resolveTri('system', false)).toBe(false)
  })

  it('overrides the system when set to on or off', () => {
    expect(resolveTri('on', false)).toBe(true)
    expect(resolveTri('off', true)).toBe(false)
  })
})

describe('loadPrefs and savePrefs', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(loadPrefs(createMemoryStore())).toEqual(DEFAULT_PREFS)
    expect(DEFAULT_PREFS).toEqual({ darkMode: 'system', reducedMotion: 'system', valenceLevel: 2 })
  })

  it('round-trips saved preferences', () => {
    const store = createMemoryStore()
    const prefs = { darkMode: 'on', reducedMotion: 'off', valenceLevel: 3 } as const
    expect(savePrefs(store, prefs)).toBe(true)
    expect(loadPrefs(store)).toEqual(prefs)
  })

  it('falls back to the defaults when stored preferences have the wrong shape', () => {
    const store = createMemoryStore()
    store.setItem('valence:prefs', JSON.stringify({ version: 1, data: { darkMode: 'purple' } }))
    expect(loadPrefs(store)).toEqual(DEFAULT_PREFS)
    expect(store.getItem('valence:backup:prefs')).not.toBeNull()
  })
})
