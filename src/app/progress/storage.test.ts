import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  browserStore,
  clearAll,
  createMemoryStore,
  exportAll,
  loadEntry,
  peekStatus,
  saveEntry,
  type KeyValueStore,
} from './storage'

const schema = z.object({ status: z.enum(['in-progress', 'completed']), seed: z.number() })

function fullStore(): KeyValueStore {
  const store = createMemoryStore()
  return {
    ...store,
    get length() {
      return store.length
    },
    setItem() {
      throw new Error('QuotaExceededError')
    },
  }
}

describe('saveEntry and loadEntry', () => {
  it('round-trips an entry, as a page reload would', () => {
    const store = createMemoryStore()
    expect(saveEntry(store, 'lab:titration', 1, { status: 'in-progress', seed: 42 })).toBe(true)
    expect(loadEntry(store, 'lab:titration', 1, schema)).toEqual({ status: 'in-progress', seed: 42 })
  })

  it('returns null for an entry that was never saved', () => {
    expect(loadEntry(createMemoryStore(), 'lab:titration', 1, schema)).toBeNull()
  })

  it('stores under the valence: prefix in a versioned envelope', () => {
    const store = createMemoryStore()
    saveEntry(store, 'prefs', 3, { a: 1 })
    expect(JSON.parse(store.getItem('valence:prefs') ?? '')).toEqual({ version: 3, data: { a: 1 } })
  })

  it.each([
    ['unparseable JSON', '{not json'],
    ['a missing envelope', '"just a string"'],
    ['an unknown version', JSON.stringify({ version: 99, data: { status: 'completed', seed: 1 } })],
    ['data of the wrong shape', JSON.stringify({ version: 1, data: { status: 'purple' } })],
  ])('starts fresh and keeps a backup for %s', (_label, raw) => {
    const store = createMemoryStore()
    store.setItem('valence:lab:titration', raw)
    expect(loadEntry(store, 'lab:titration', 1, schema)).toBeNull()
    expect(store.getItem('valence:lab:titration')).toBeNull()
    expect(store.getItem('valence:backup:lab:titration')).toBe(raw)
  })

  it('resets only the broken entry', () => {
    const store = createMemoryStore()
    saveEntry(store, 'lab:aqueous', 1, { status: 'completed', seed: 7 })
    store.setItem('valence:lab:titration', '{not json')
    loadEntry(store, 'lab:titration', 1, schema)
    expect(loadEntry(store, 'lab:aqueous', 1, schema)).toEqual({ status: 'completed', seed: 7 })
  })

  it('returns false instead of throwing when storage is full', () => {
    expect(saveEntry(fullStore(), 'prefs', 1, { a: 1 })).toBe(false)
  })

  it('does not throw when a broken entry cannot be backed up', () => {
    const store = createMemoryStore()
    store.setItem('valence:lab:titration', '{not json')
    const full: KeyValueStore = { ...fullStore(), getItem: (k) => store.getItem(k) }
    expect(loadEntry(full, 'lab:titration', 1, schema)).toBeNull()
  })
})

describe('peekStatus', () => {
  it('reports not-started when there is no entry or it is unreadable', () => {
    const store = createMemoryStore()
    expect(peekStatus(store, 'lab:titration')).toBe('not-started')
    store.setItem('valence:lab:titration', '{not json')
    expect(peekStatus(store, 'lab:titration')).toBe('not-started')
    expect(store.getItem('valence:lab:titration')).toBe('{not json')
  })

  it('reports the stored status', () => {
    const store = createMemoryStore()
    saveEntry(store, 'lab:titration', 1, { status: 'completed' })
    expect(peekStatus(store, 'lab:titration')).toBe('completed')
    saveEntry(store, 'lab:aqueous', 1, { seed: 3 })
    expect(peekStatus(store, 'lab:aqueous')).toBe('in-progress')
  })
})

describe('exportAll and clearAll', () => {
  it('exports only valence entries, parsed where possible', () => {
    const store = createMemoryStore()
    store.setItem('other-app', 'x')
    saveEntry(store, 'prefs', 1, { darkMode: 'on' })
    store.setItem('valence:backup:lab:titration', '{not json')
    expect(JSON.parse(exportAll(store))).toEqual({
      'valence:prefs': { version: 1, data: { darkMode: 'on' } },
      'valence:backup:lab:titration': '{not json',
    })
  })

  it('clears every valence entry and nothing else', () => {
    const store = createMemoryStore()
    store.setItem('other-app', 'x')
    saveEntry(store, 'prefs', 1, {})
    saveEntry(store, 'lab:titration', 1, {})
    store.setItem('valence:backup:lab:aqueous', 'old')
    clearAll(store)
    expect(store.length).toBe(1)
    expect(store.getItem('other-app')).toBe('x')
  })
})

describe('browserStore', () => {
  it('falls back to a working in-memory store when localStorage is unavailable', () => {
    // In the node test environment there is no window at all.
    const { store, persistent } = browserStore()
    expect(persistent).toBe(false)
    expect(saveEntry(store, 'prefs', 1, { a: 1 })).toBe(true)
  })
})
