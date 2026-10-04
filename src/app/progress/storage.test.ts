import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  browserStore,
  clearAll,
  createMemoryStore,
  exportAll,
  loadEntry,
  peekStatus,
  reportingStore,
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

  it('keeps the first backup when a second broken value arrives, and numbers the later ones', () => {
    const store = createMemoryStore()
    const broken = ['{first', JSON.stringify({ version: 99, data: { status: 'completed', seed: 1 } }), '{third']
    for (const raw of broken) {
      store.setItem('valence:lab:titration', raw)
      expect(loadEntry(store, 'lab:titration', 1, schema)).toBeNull()
      expect(store.getItem('valence:lab:titration')).toBeNull()
    }
    expect(store.getItem('valence:backup:lab:titration')).toBe(broken[0])
    expect(store.getItem('valence:backup:lab:titration:2')).toBe(broken[1])
    expect(store.getItem('valence:backup:lab:titration:3')).toBe(broken[2])
    expect(store.length).toBe(3)
  })

  it('does not back the same broken value up twice', () => {
    const store = createMemoryStore()
    for (let i = 0; i < 2; i++) {
      store.setItem('valence:lab:titration', '{not json')
      loadEntry(store, 'lab:titration', 1, schema)
    }
    expect(store.getItem('valence:backup:lab:titration')).toBe('{not json')
    expect(store.length).toBe(1)
  })

  it('keeps the backups of different entries apart, and exports and clears the numbered ones', () => {
    const store = createMemoryStore()
    for (const raw of ['{a', '{b']) {
      store.setItem('valence:lab:titration', raw)
      loadEntry(store, 'lab:titration', 1, schema)
    }
    store.setItem('valence:lab:aqueous', '{c')
    loadEntry(store, 'lab:aqueous', 1, schema)
    expect(JSON.parse(exportAll(store))).toEqual({
      'valence:backup:lab:titration': '{a',
      'valence:backup:lab:titration:2': '{b',
      'valence:backup:lab:aqueous': '{c',
    })
    clearAll(store)
    expect(store.length).toBe(0)
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
    expect(peekStatus(store, 'lab:titration', 1)).toBe('not-started')
    store.setItem('valence:lab:titration', '{not json')
    expect(peekStatus(store, 'lab:titration', 1)).toBe('not-started')
    expect(store.getItem('valence:lab:titration')).toBe('{not json')
  })

  it('reports the stored status', () => {
    const store = createMemoryStore()
    saveEntry(store, 'lab:titration', 1, { status: 'completed' })
    expect(peekStatus(store, 'lab:titration', 1)).toBe('completed')
    saveEntry(store, 'lab:aqueous', 1, { seed: 3 })
    expect(peekStatus(store, 'lab:aqueous', 1)).toBe('in-progress')
  })

  it('reports not-started for an entry of another version, which loadEntry would reject, and leaves it in place', () => {
    const store = createMemoryStore()
    saveEntry(store, 'lab:titration', 1, { status: 'in-progress', seed: 42 })
    saveEntry(store, 'lab:aqueous', 3, { status: 'completed', seed: 7 })
    expect(peekStatus(store, 'lab:titration', 2)).toBe('not-started')
    expect(peekStatus(store, 'lab:aqueous', 2)).toBe('not-started')
    // Peeking resets nothing: the entry is still there for loadEntry to back up.
    expect(store.getItem('valence:lab:titration')).not.toBeNull()
    expect(store.getItem('valence:backup:lab:titration')).toBeNull()
    // What peekStatus says agrees with what loadEntry then does.
    expect(loadEntry(store, 'lab:titration', 2, schema)).toBeNull()
    expect(loadEntry(store, 'lab:aqueous', 3, schema)).toEqual({ status: 'completed', seed: 7 })
    expect(peekStatus(store, 'lab:aqueous', 3)).toBe('completed')
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

describe('reportingStore', () => {
  it('reads and writes through to the store it wraps, and reports nothing while writes succeed', () => {
    const inner = createMemoryStore()
    let failures = 0
    const store = reportingStore(inner, () => failures++)
    expect(saveEntry(store, 'lab:titration', 1, { status: 'in-progress', seed: 42 })).toBe(true)
    expect(inner.getItem('valence:lab:titration')).not.toBeNull()
    expect(loadEntry(store, 'lab:titration', 1, schema)).toEqual({ status: 'in-progress', seed: 42 })
    expect([store.length, store.key(0)]).toEqual([1, 'valence:lab:titration'])
    clearAll(store)
    expect(inner.length).toBe(0)
    expect(failures).toBe(0)
  })

  it('reports a save that fails mid-session, and the save still returns false', () => {
    const inner = createMemoryStore()
    let full = false
    let failures = 0
    const store = reportingStore(
      {
        ...inner,
        setItem(key, value) {
          if (full) throw new Error('QuotaExceededError')
          inner.setItem(key, value)
        },
      },
      () => failures++,
    )
    expect(saveEntry(store, 'prefs', 1, { a: 1 })).toBe(true)
    expect(failures).toBe(0)
    full = true
    expect(saveEntry(store, 'prefs', 1, { a: 2 })).toBe(false)
    expect(failures).toBe(1)
    // What was saved before the failure is still there.
    expect(JSON.parse(inner.getItem('valence:prefs') ?? '')).toEqual({ version: 1, data: { a: 1 } })
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
