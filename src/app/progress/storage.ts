import { z } from 'zod'

export interface KeyValueStore {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const ENTRY = {
  prefs: 'prefs',
  titration: 'lab:titration',
  aqueous: 'lab:aqueous',
  flame: 'lab:flame',
  calorimetry: 'lab:calorimetry',
  cations: 'lab:cations',
  lechatelier: 'lab:le-chatelier',
  clock: 'lab:clock-reaction',
  acetone: 'lab:iodination-of-acetone',
  cabbage: 'lab:red-cabbage-ph',
  density: 'lab:measurement-and-density',
  freezing: 'lab:freezing-point-depression',
  reactions: 'lab:types-of-reactions',
  mixing: 'lab:polarity-and-mixing',
  hotcold: 'lab:endothermic-and-exothermic',
  mechanism: 'mechanism:hcl-nahco3',
} as const

export type ActivityStatus = 'not-started' | 'in-progress' | 'completed'

const PREFIX = 'valence:'
const BACKUP_PREFIX = 'valence:backup:'

/** The key an entry is stored under. */
export const storageKey = (name: string) => PREFIX + name
const envelopeSchema = z.object({ version: z.number(), data: z.unknown() })

export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

/** localStorage when it works; otherwise an in-memory store for this session only, starting from the stored preferences where they can be read. */
export function browserStore(): { store: KeyValueStore; persistent: boolean } {
  try {
    const store = window.localStorage
    const probe = `${PREFIX}probe`
    store.setItem(probe, '1')
    store.removeItem(probe)
    return { store, persistent: true }
  } catch {
    const store = createMemoryStore()
    try {
      // Storage that can be read but takes no write (it is full, say). The script in index.html has read the
      // stored theme from it before first paint (firstPaint.ts), so the app keeps the stored preferences too.
      // ponytail: only the preferences. Stored progress stays out of the session: shown, it would be a copy that
      // "Clear my progress" clears without touching what is stored, and that comes back on the next load.
      const key = storageKey(ENTRY.prefs)
      const prefs = window.localStorage.getItem(key)
      if (prefs !== null) store.setItem(key, prefs)
    } catch {
      // It cannot be read either.
    }
    return { store, persistent: false }
  }
}

export interface SessionStore extends KeyValueStore {
  /** Forgets every refused save. clearAll calls it: once everything is cleared, nothing unsaved is left to lose. */
  forgetRefused(): void
}

/**
 * The store the app saves through, made from what browserStore gave. After every write, removal or clearing,
 * `onPersistent` is told whether progress now outlasts the session: never with an in-memory store; with
 * localStorage, only while no key's latest write was refused (storage full, or blocked part-way through a
 * session). A refused write is reported before its error goes on to the caller.
 */
export function sessionStore(browser: { store: KeyValueStore; persistent: boolean }, onPersistent: (persistent: boolean) => void): SessionStore {
  const { store } = browser
  /** The keys whose latest write was refused. */
  const refused = new Set<string>()
  const report = () => onPersistent(browser.persistent && refused.size === 0)
  return {
    get length() {
      return store.length
    },
    key: (index) => store.key(index),
    getItem: (key) => store.getItem(key),
    setItem: (key, value) => {
      try {
        store.setItem(key, value)
        refused.delete(key)
      } catch (error) {
        refused.add(key)
        throw error
      } finally {
        report()
      }
    },
    removeItem: (key) => {
      store.removeItem(key)
      refused.delete(key)
      report()
    },
    forgetRefused: () => {
      refused.clear()
      report()
    },
  }
}

/** The not-saving notice, held once so that every page that shows it says the same sentence. */
export const NOT_SAVING_TEXT =
  'This browser is not allowing Valence to save data. Your progress and settings will last only until you reload this page or close this tab.'

/**
 * The entries a load has set aside in this session, by the store they were in, until something is saved under them
 * or everything is cleared. A page that starts fresh because of one says so (wasSetAside): without it the learner
 * sees a lab that was never started and no word that a saved run existed and was kept.
 */
const setAside = new WeakMap<KeyValueStore, Set<string>>()

/** True when a load of this entry found a value it could not use, and no new one has been saved under it since. */
export const wasSetAside = (store: KeyValueStore, name: string) => setAside.get(store)?.has(PREFIX + name) ?? false

/**
 * The entries a load set aside but could not back up, by the store they are in. Until the old value has its
 * backup, nothing is saved over it (spec 10: it is kept, not deleted), so the entry lasts for the session only.
 * The refused backup keeps the not-saving notice up for as long as that is so.
 */
const notBackedUp = new WeakMap<KeyValueStore, Set<string>>()

/**
 * Copies a value that could not be loaded to the first backup key that is free, or that already holds this very
 * value. Throws when the store will not take it.
 */
function backUp(store: KeyValueStore, name: string, raw: string): void {
  // ponytail: backups are never pruned; each is one broken value, and "Clear my progress" removes them all.
  let backup = BACKUP_PREFIX + name
  for (let n = 2, kept = store.getItem(backup); kept !== null && kept !== raw; n++, kept = store.getItem(backup)) {
    backup = `${BACKUP_PREFIX}${name}:${n}`
  }
  store.setItem(backup, raw)
}

/** False when the store refused the write, or when the entry still holds a value that could not be loaded and has no backup yet. */
export function saveEntry(store: KeyValueStore, name: string, version: number, data: unknown): boolean {
  const key = PREFIX + name
  try {
    const waiting = notBackedUp.get(store)
    if (waiting?.has(key)) {
      // There may be room now. If not, this throws and the old value stays where it is.
      const old = store.getItem(key)
      if (old !== null) backUp(store, name, old)
      waiting.delete(key)
    }
    store.setItem(key, JSON.stringify({ version, data }))
    setAside.get(store)?.delete(key)
    return true
  } catch {
    return false
  }
}

/** The data a stored value holds for this version and schema, or undefined where it cannot be read as that. Changes nothing. */
export function readEntry<T>(raw: string, version: number, schema: z.ZodType<T>): T | undefined {
  try {
    const envelope = envelopeSchema.parse(JSON.parse(raw))
    if (envelope.version !== version) return undefined
    const data = schema.safeParse(envelope.data)
    return data.success ? data.data : undefined
  } catch {
    return undefined
  }
}

/**
 * Returns the entry's data, or null if it is absent. An entry that cannot be
 * parsed, has another version, or fails the schema is moved to a backup key
 * (never deleted outright) and null is returned, so the caller starts fresh.
 * A later broken value does not replace an earlier backup: it goes under the
 * same key with ":2", ":3", ... after it. Where the store is too full for the
 * backup, the value stays under its own key and saveEntry refuses to write
 * over it until a save finds room to back it up first.
 */
export function loadEntry<T>(store: KeyValueStore, name: string, version: number, schema: z.ZodType<T>): T | null {
  const key = PREFIX + name
  const raw = store.getItem(key)
  if (raw === null) return null
  const data = readEntry(raw, version, schema)
  if (data !== undefined) return data
  setAside.set(store, (setAside.get(store) ?? new Set()).add(key))
  try {
    backUp(store, name, raw)
    store.removeItem(key)
  } catch {
    // Storage is full: the bad entry stays where it is, and saveEntry will not write over it.
    notBackedUp.set(store, (notBackedUp.get(store) ?? new Set()).add(key))
  }
  return null
}

/**
 * Reads an activity's status without validating or resetting its entry. `version` is the one the activity
 * loads with: an entry of another version is one loadEntry would set aside, so it counts as not started.
 * ponytail: an entry of this version that its activity's schema refuses still reads here as begun, until the
 * activity's page has loaded it, set it aside and said so. Home would have to load the activity's schema, and
 * with it the lab, to know sooner.
 */
export function peekStatus(store: KeyValueStore, name: string, version: number): ActivityStatus {
  const raw = store.getItem(PREFIX + name)
  if (raw === null) return 'not-started'
  try {
    const envelope = envelopeSchema.parse(JSON.parse(raw))
    if (envelope.version !== version) return 'not-started'
    const status = z.object({ status: z.string() }).safeParse(envelope.data)
    return status.success && status.data.status === 'completed' ? 'completed' : 'in-progress'
  } catch {
    return 'not-started'
  }
}

function ownKeys(store: KeyValueStore): string[] {
  const keys: string[] = []
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i)
    if (key?.startsWith(PREFIX)) keys.push(key)
  }
  return keys
}

export function exportAll(store: KeyValueStore): string {
  const out: Record<string, unknown> = {}
  for (const key of ownKeys(store)) {
    const raw = store.getItem(key) ?? ''
    try {
      out[key] = JSON.parse(raw)
    } catch {
      out[key] = raw
    }
  }
  return JSON.stringify(out, null, 2)
}

export function clearAll(store: KeyValueStore & { forgetRefused?(): void }): void {
  for (const key of ownKeys(store)) store.removeItem(key)
  notBackedUp.delete(store)
  setAside.delete(store)
  // An entry whose every save was refused was never stored, so no removal above answers for it.
  store.forgetRefused?.()
}
