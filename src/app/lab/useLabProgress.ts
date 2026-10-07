import { useEffect, useState } from 'react'
import type { z } from 'zod'
import type { Activity } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { loadEntry, readEntry, saveEntry, storageKey, wasSetAside, type KeyValueStore } from '@/app/progress/storage'

/** A lab's stored entry, loaded and saved under the activity's own name and version. */
export function labProgress<T>(store: KeyValueStore, activity: Activity, schema: z.ZodType<T>): { load(): T | null; save(next: T): boolean } {
  return {
    load: () => loadEntry(store, activity.entry, activity.version, schema),
    save: (next) => saveEntry(store, activity.entry, activity.version, next),
  }
}

/**
 * What a write of the entry by another tab leaves this tab to show: the record that tab saved, null where it
 * removed the entry, or undefined to keep this tab's own. `newValue` is the storage event's. Nothing is written
 * and nothing is set aside: a value this version cannot read may be a newer version's, open in the other tab.
 */
export function writtenElsewhere<T>(store: KeyValueStore, activity: Activity, schema: z.ZodType<T>, newValue: string | null): T | null | undefined {
  // Only what this tab's own store holds too. The fallback store of a browser that is not saving does not, and shows no stored progress.
  if (store.getItem(storageKey(activity.entry)) !== newValue) return undefined
  return newValue === null ? null : readEntry(newValue, activity.version, schema)
}

/**
 * The lab's progress (null: not started), loaded once when the page mounts, and a function that sets it and saves
 * it. Call `save` from the handler of each learner action, never from an effect: nothing is saved by opening a lab.
 * `setAside` is true where a saved run could not be loaded and was kept aside, until a new one is saved.
 *
 * Every save is of the whole record, so a tab that went on from an old one would write over what another tab had
 * done since. A tab therefore takes the record another tab saves, when it is saved; `taken` counts those, for the
 * page to drop what it held of the record before (an open stopcock, a warning, what was last said).
 */
export function useLabProgress<T>(
  activity: Activity,
  schema: z.ZodType<T>,
): [progress: T | null, save: (next: T) => void, about: { setAside: boolean; taken: number }] {
  const { store } = useAppState()
  const [state, setState] = useState(() => ({ progress: labProgress(store, activity, schema).load(), taken: 0 }))
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      // A null key is a whole store cleared.
      if (event.key !== null && event.key !== storageKey(activity.entry)) return
      const progress = writtenElsewhere(store, activity, schema, event.newValue)
      if (progress !== undefined) setState(({ taken }) => ({ progress, taken: taken + 1 }))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [store, activity, schema])
  return [
    state.progress,
    (next) => {
      setState(({ taken }) => ({ progress: next, taken }))
      labProgress(store, activity, schema).save(next)
    },
    { setAside: wasSetAside(store, activity.entry), taken: state.taken },
  ]
}
