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
  mechanism: 'mechanism:hcl-nahco3',
} as const

export type ActivityStatus = 'not-started' | 'in-progress' | 'completed'

const PREFIX = 'valence:'
const BACKUP_PREFIX = 'valence:backup:'
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

/** localStorage when it works; otherwise an in-memory store for this session only. */
export function browserStore(): { store: KeyValueStore; persistent: boolean } {
  try {
    const store = window.localStorage
    const probe = `${PREFIX}probe`
    store.setItem(probe, '1')
    store.removeItem(probe)
    return { store, persistent: true }
  } catch {
    return { store: createMemoryStore(), persistent: false }
  }
}

/**
 * The same store, but a write it refuses (storage full, or blocked part-way through a session) is reported to
 * `onFailure` before the error goes on to the caller, so the app can say that progress is no longer being saved.
 */
export function reportingStore(store: KeyValueStore, onFailure: () => void): KeyValueStore {
  return {
    get length() {
      return store.length
    },
    key: (index) => store.key(index),
    getItem: (key) => store.getItem(key),
    removeItem: (key) => store.removeItem(key),
    setItem: (key, value) => {
      try {
        store.setItem(key, value)
      } catch (error) {
        onFailure()
        throw error
      }
    },
  }
}

export function saveEntry(store: KeyValueStore, name: string, version: number, data: unknown): boolean {
  try {
    store.setItem(PREFIX + name, JSON.stringify({ version, data }))
    return true
  } catch {
    return false
  }
}

/**
 * Returns the entry's data, or null if it is absent. An entry that cannot be
 * parsed, has another version, or fails the schema is moved to a backup key
 * (never deleted outright) and null is returned, so the caller starts fresh.
 * A later broken value does not replace an earlier backup: it goes under the
 * same key with ":2", ":3", ... after it.
 */
export function loadEntry<T>(store: KeyValueStore, name: string, version: number, schema: z.ZodType<T>): T | null {
  const key = PREFIX + name
  const raw = store.getItem(key)
  if (raw === null) return null
  try {
    const envelope = envelopeSchema.parse(JSON.parse(raw))
    if (envelope.version === version) {
      const data = schema.safeParse(envelope.data)
      if (data.success) return data.data
    }
  } catch {
    // fall through to the backup
  }
  try {
    // The first backup key that is free, or that already holds this very value.
    // ponytail: backups are never pruned; each is one broken value, and "Clear my progress" removes them all.
    let backup = BACKUP_PREFIX + name
    for (let n = 2, kept = store.getItem(backup); kept !== null && kept !== raw; n++, kept = store.getItem(backup)) {
      backup = `${BACKUP_PREFIX}${name}:${n}`
    }
    store.setItem(backup, raw)
    store.removeItem(key)
  } catch {
    // Storage is full: leave the bad entry where it is.
  }
  return null
}

/**
 * Reads an activity's status without validating or resetting its entry. `version` is the one the activity
 * loads with: an entry of another version is one loadEntry would set aside, so it counts as not started.
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

export function clearAll(store: KeyValueStore): void {
  for (const key of ownKeys(store)) store.removeItem(key)
}
