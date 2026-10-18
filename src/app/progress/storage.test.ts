import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  browserStore,
  clearAll,
  createMemoryStore,
  exportAll,
  loadEntry,
  NOT_SAVING_TEXT,
  peekStatus,
  readEntry,
  saveEntry,
  sessionStore,
  wasSetAside,
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

describe('an entry that cannot be loaded, on a store too full to take its backup (spec 10: the old value is kept, not deleted)', () => {
  /** A store with a byte quota, as localStorage has: a write that would take the total past it is refused. */
  function quotaStore(limit: number): KeyValueStore {
    const store = createMemoryStore()
    const size = () => Array.from({ length: store.length }, (_, i) => store.key(i)!).reduce((n, key) => n + key.length + store.getItem(key)!.length, 0)
    return {
      ...store,
      get length() {
        return store.length
      },
      setItem(key, value) {
        const held = store.getItem(key)
        if (size() - (held === null ? 0 : key.length + held.length) + key.length + value.length > limit) throw new Error('QuotaExceededError')
        store.setItem(key, value)
      },
    }
  }
  const KEY = 'valence:lab:titration'
  const BACKUP = 'valence:backup:lab:titration'
  const FILLER = 'valence:lab:aqueous'
  const fresh = { status: 'in-progress', seed: 9 } as const

  /** The unloadable value under the lab's key and a filler beside it, with no room left for a backup; then the load. */
  function loadedOnAFullStore(raw: string) {
    const filler = 'x'.repeat(BACKUP.length + raw.length)
    const inner = quotaStore(KEY.length + raw.length + FILLER.length + filler.length)
    inner.setItem(KEY, raw)
    inner.setItem(FILLER, filler)
    const told: boolean[] = []
    const store = sessionStore({ store: inner, persistent: true }, (persistent) => told.push(persistent))
    expect(loadEntry(store, 'lab:titration', 1, schema)).toBeNull()
    expect([store.getItem(KEY), store.getItem(BACKUP)]).toEqual([raw, null])
    return { store, told }
  }

  it.each([
    ['of another version', JSON.stringify({ version: 2, data: { status: 'in-progress', seed: 1, trials: [1, 2, 3] } })],
    // Each is longer than the fresh record, so that only the rule, and not the quota, can refuse the save.
    ['of this version with data of the wrong shape', JSON.stringify({ version: 1, data: { status: 'purple', seed: 1, trials: [1, 2, 3] } })],
    ['that is not JSON', '{not json, and a good deal longer than the fresh record'],
  ])('one %s is not saved over: the save is refused, the old value stays, and the notice shows', (_label, raw) => {
    const { store, told } = loadedOnAFullStore(raw)
    expect(saveEntry(store, 'lab:titration', 1, fresh)).toBe(false)
    expect(saveEntry(store, 'lab:titration', 1, { ...fresh, seed: 10 })).toBe(false)
    expect(store.getItem(KEY)).toBe(raw)
    expect(store.getItem(BACKUP)).toBeNull()
    // Not saving, and saying so: the lab's run is held for the session only.
    expect(told.every((persistent) => !persistent)).toBe(true)
    expect(told.length).toBeGreaterThan(0)
  })

  it('once there is room, the next save backs the old value up first and is then taken, and the notice goes', () => {
    const raw = JSON.stringify({ version: 2, data: { status: 'in-progress', seed: 1, trials: [1, 2, 3] } })
    const { store, told } = loadedOnAFullStore(raw)
    expect(saveEntry(store, 'lab:titration', 1, fresh)).toBe(false)
    store.removeItem(FILLER)
    expect(saveEntry(store, 'lab:titration', 1, fresh)).toBe(true)
    expect(store.getItem(BACKUP)).toBe(raw)
    expect(loadEntry(store, 'lab:titration', 1, schema)).toEqual(fresh)
    expect(told.at(-1)).toBe(true)
    // And from then on it is an ordinary entry.
    expect(saveEntry(store, 'lab:titration', 1, { ...fresh, seed: 10 })).toBe(true)
    expect(store.getItem(BACKUP)).toBe(raw)
  })

  it('other entries are saved as before, and "Clear my progress" lets the entry itself be saved again', () => {
    const raw = JSON.stringify({ version: 2, data: { status: 'in-progress', seed: 1, trials: [1, 2, 3] } })
    const { store, told } = loadedOnAFullStore(raw)
    store.removeItem(FILLER)
    expect(saveEntry(store, 'prefs', 1, { a: 1 })).toBe(true)
    clearAll(store)
    expect(store.length).toBe(0)
    expect(saveEntry(store, 'lab:titration', 1, fresh)).toBe(true)
    expect(store.getItem(BACKUP)).toBeNull()
    expect(told.at(-1)).toBe(true)
  })
})

describe('readEntry', () => {
  const good = { status: 'in-progress', seed: 42 }

  it('gives the data of a value of this version that fits the schema', () => {
    expect(readEntry(JSON.stringify({ version: 1, data: good }), 1, schema)).toEqual(good)
  })

  it.each([
    ['unparseable JSON', '{not json'],
    ['a missing envelope', '"just a string"'],
    ['another version', JSON.stringify({ version: 2, data: good })],
    ['data of the wrong shape', JSON.stringify({ version: 1, data: { status: 'purple' } })],
  ])('gives undefined for %s', (_label, raw) => {
    expect(readEntry(raw, 1, schema)).toBeUndefined()
  })
})

describe('wasSetAside', () => {
  const bad = JSON.stringify({ version: 99, data: { status: 'completed', seed: 1 } })

  it('is false of an entry that was never stored, and of one that loaded', () => {
    const store = createMemoryStore()
    loadEntry(store, 'lab:titration', 1, schema)
    expect(wasSetAside(store, 'lab:titration')).toBe(false)
    saveEntry(store, 'lab:titration', 1, { status: 'in-progress', seed: 42 })
    loadEntry(store, 'lab:titration', 1, schema)
    expect(wasSetAside(store, 'lab:titration')).toBe(false)
  })

  it('is true once a load has set the entry aside, of that entry in that store only, and on every later load of the session', () => {
    const store = createMemoryStore()
    store.setItem('valence:lab:titration', bad)
    loadEntry(store, 'lab:titration', 1, schema)
    expect(wasSetAside(store, 'lab:titration')).toBe(true)
    expect(wasSetAside(store, 'lab:aqueous')).toBe(false)
    expect(wasSetAside(createMemoryStore(), 'lab:titration')).toBe(false)
    // The entry is gone from its key by now: the page that is opened again is still told.
    expect(loadEntry(store, 'lab:titration', 1, schema)).toBeNull()
    expect(wasSetAside(store, 'lab:titration')).toBe(true)
  })

  it('is true where the store had no room for the backup, too: the value is kept in place', () => {
    // Stored before the store filled up.
    const store = createMemoryStore()
    store.setItem('valence:lab:titration', bad)
    const refusing: KeyValueStore = {
      ...store,
      get length() {
        return store.length
      },
      setItem() {
        throw new Error('QuotaExceededError')
      },
    }
    expect(loadEntry(refusing, 'lab:titration', 1, schema)).toBeNull()
    expect(refusing.getItem('valence:lab:titration')).toBe(bad)
    expect(wasSetAside(refusing, 'lab:titration')).toBe(true)
  })

  it('is false again once something is saved under the entry, or everything is cleared', () => {
    const store = createMemoryStore()
    store.setItem('valence:lab:titration', bad)
    loadEntry(store, 'lab:titration', 1, schema)
    saveEntry(store, 'lab:titration', 1, { status: 'in-progress', seed: 42 })
    expect(wasSetAside(store, 'lab:titration')).toBe(false)
    store.setItem('valence:lab:titration', bad)
    loadEntry(store, 'lab:titration', 1, schema)
    expect(wasSetAside(store, 'lab:titration')).toBe(true)
    clearAll(store)
    expect(wasSetAside(store, 'lab:titration')).toBe(false)
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

/** A store that refuses writes while `full` is set, as localStorage does when it is full. */
function fillable() {
  const inner = createMemoryStore()
  const state = { full: false }
  const store: KeyValueStore = {
    ...inner,
    get length() {
      return inner.length
    },
    setItem(key, value) {
      if (state.full) throw new Error('QuotaExceededError')
      inner.setItem(key, value)
    },
  }
  return { inner, store, state }
}

/**
 * The store the app saves through, on storage that works unless told otherwise, with what `onPersistent` was told,
 * in order. `refuse` is a save made while the storage is full.
 */
function session(persistent = true) {
  const { inner, store: refusing, state } = fillable()
  const told: boolean[] = []
  const store = sessionStore({ store: refusing, persistent }, (now) => told.push(now))
  const save = (name: string) => saveEntry(store, name, 1, { status: 'in-progress', seed: 42 })
  const refuse = (name: string) => {
    state.full = true
    const saved = save(name)
    state.full = false
    return saved
  }
  return { inner, store, state, told, save, refuse }
}

describe('the not-saving notice: what sessionStore tells onPersistent, in order', () => {
  it('a lab save refused, then preferences saved: false, false', () => {
    const { inner, store, state, told, save, refuse } = session()
    expect(refuse('lab:titration')).toBe(false)
    expect(save('prefs')).toBe(true)
    expect(told).toEqual([false, false])
    // The save that was taken went to the store it wraps, and the refused one did not.
    expect(inner.getItem('valence:prefs')).not.toBeNull()
    expect(inner.getItem('valence:lab:titration')).toBeNull()
    // A refused write is reported before its error reaches the caller.
    state.full = true
    let toldWhenThrown: boolean[] = []
    try {
      store.setItem('valence:lab:aqueous', '{}')
    } catch {
      toldWhenThrown = [...told]
    }
    expect(toldWhenThrown).toEqual([false, false, false])
  })

  it('... then the lab saved: false, false, true', () => {
    const { told, save, refuse } = session()
    refuse('lab:titration')
    save('prefs')
    expect(save('lab:titration')).toBe(true)
    expect(told).toEqual([false, false, true])
  })

  it('two labs refused, the first saved, the second saved: false, false, false, true', () => {
    const { told, save, refuse } = session()
    refuse('lab:titration')
    refuse('lab:aqueous')
    save('lab:titration')
    save('lab:aqueous')
    expect(told).toEqual([false, false, false, true])
  })

  it('a lab refused, then its key removed: false, true', () => {
    const { store, told, refuse } = session()
    refuse('lab:titration')
    store.removeItem('valence:lab:titration')
    expect(told).toEqual([false, true])
  })

  it('preferences saved, a lab refused that was never stored, then clearAll: true, false, false, true', () => {
    const { inner, store, told, save, refuse } = session()
    save('prefs')
    refuse('lab:titration')
    // What was saved before the refusal is still there, and it is all there is.
    expect(JSON.parse(exportAll(inner))).toEqual({ 'valence:prefs': { version: 1, data: { status: 'in-progress', seed: 42 } } })
    clearAll(store)
    // The third is the removal of the preferences key: the lab was never stored, so no removal clears its refusal.
    // The fourth is forgetRefused.
    expect(told).toEqual([true, false, false, true])
    expect(inner.length).toBe(0)
  })

  it('an in-memory store, a save and forgetRefused: false, false', () => {
    const { store, told, save } = session(false)
    expect(save('prefs')).toBe(true)
    store.forgetRefused()
    expect(told).toEqual([false, false])
  })

  it('nothing refused, two saves: true, true', () => {
    const { inner, store, told, save } = session()
    expect(save('lab:titration')).toBe(true)
    expect(save('prefs')).toBe(true)
    expect(told).toEqual([true, true])
    // It reads through to the store it wraps, and reading reports nothing.
    expect(inner.getItem('valence:lab:titration')).not.toBeNull()
    expect(loadEntry(store, 'lab:titration', 1, schema)).toEqual({ status: 'in-progress', seed: 42 })
    expect([store.length, store.key(0)]).toEqual([2, 'valence:lab:titration'])
    expect(told).toEqual([true, true])
  })
})

describe('NOT_SAVING_TEXT', () => {
  it('says that what is done lasts only until the page is reloaded or the tab closed: the store is then in memory, which a reload empties', () => {
    expect(NOT_SAVING_TEXT).toBe('This browser is not allowing Valence to save data. Your progress and settings will last only until you reload this page or close this tab.')
  })
})

describe('sessionStore', () => {
  it('says after each save whether progress outlasts the session: not after a refused save, and again after the next that succeeds', () => {
    const { store: refusing, state } = fillable()
    const persistent: boolean[] = []
    const store = sessionStore({ store: refusing, persistent: true }, (now) => persistent.push(now))
    expect(saveEntry(store, 'lab:titration', 1, { status: 'in-progress' })).toBe(true)
    state.full = true
    expect(saveEntry(store, 'lab:titration', 1, { status: 'completed' })).toBe(false)
    state.full = false
    expect(saveEntry(store, 'lab:titration', 1, { status: 'completed' })).toBe(true)
    expect(persistent).toEqual([true, false, true])
    // The saves went to the store it was given.
    expect(peekStatus(refusing, 'lab:titration', 1)).toBe('completed')
  })

  it('never calls an in-memory store persistent, however many saves succeed', () => {
    const persistent: boolean[] = []
    const store = sessionStore({ store: createMemoryStore(), persistent: false }, (now) => persistent.push(now))
    expect(saveEntry(store, 'prefs', 1, { a: 1 })).toBe(true)
    expect(saveEntry(store, 'prefs', 1, { a: 2 })).toBe(true)
    expect(persistent).toEqual([false, false])
  })
})

describe('browserStore', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('falls back to a working in-memory store when localStorage is unavailable', () => {
    // In the node test environment there is no window at all.
    const { store, persistent } = browserStore()
    expect(persistent).toBe(false)
    expect(store.length).toBe(0)
    expect(saveEntry(store, 'prefs', 1, { a: 1 })).toBe(true)
  })

  it('uses localStorage itself when it takes a write, and leaves no probe behind', () => {
    const localStorage = createMemoryStore()
    vi.stubGlobal('window', { localStorage })
    const { store, persistent } = browserStore()
    expect(persistent).toBe(true)
    expect(store).toBe(localStorage)
    expect(localStorage.length).toBe(0)
  })

  it('keeps the stored preferences, and only those, when localStorage can be read but refuses writes', () => {
    const { inner, store: localStorage, state } = fillable()
    saveEntry(inner, 'prefs', 1, { darkMode: 'on' })
    saveEntry(inner, 'lab:titration', 1, { status: 'completed' })
    state.full = true
    vi.stubGlobal('window', { localStorage })
    const { store, persistent } = browserStore()
    expect(persistent).toBe(false)
    expect(store.getItem('valence:prefs')).toBe(inner.getItem('valence:prefs'))
    expect(store.length).toBe(1)
    // What the session saves goes to memory, and what is stored stays as it was.
    expect(saveEntry(store, 'prefs', 1, { darkMode: 'off' })).toBe(true)
    clearAll(store)
    expect(JSON.parse(inner.getItem('valence:prefs') ?? '')).toEqual({ version: 1, data: { darkMode: 'on' } })
    expect(peekStatus(inner, 'lab:titration', 1)).toBe('completed')
  })

  it('falls back to an empty store when localStorage can be neither written nor read', () => {
    const blocked = () => {
      throw new Error('SecurityError')
    }
    vi.stubGlobal('window', { localStorage: { length: 0, key: blocked, getItem: blocked, setItem: blocked, removeItem: blocked } })
    expect(browserStore().store.length).toBe(0)
    vi.stubGlobal('window', {
      get localStorage() {
        return blocked()
      },
    })
    const { store, persistent } = browserStore()
    expect([store.length, persistent]).toEqual([0, false])
  })
})
