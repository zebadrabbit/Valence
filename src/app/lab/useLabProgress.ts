import { useState } from 'react'
import type { z } from 'zod'
import type { Activity } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { loadEntry, saveEntry, wasSetAside, type KeyValueStore } from '@/app/progress/storage'

/** A lab's stored entry, loaded and saved under the activity's own name and version. */
export function labProgress<T>(store: KeyValueStore, activity: Activity, schema: z.ZodType<T>): { load(): T | null; save(next: T): boolean } {
  return {
    load: () => loadEntry(store, activity.entry, activity.version, schema),
    save: (next) => saveEntry(store, activity.entry, activity.version, next),
  }
}

/**
 * The lab's progress (null: not started), loaded once when the page mounts, and a function that sets it and saves
 * it. Call `save` from the handler of each learner action, never from an effect: nothing is saved by opening a lab.
 * `setAside` is true where a saved run could not be loaded and was kept aside, until a new one is saved.
 */
export function useLabProgress<T>(activity: Activity, schema: z.ZodType<T>): [progress: T | null, save: (next: T) => void, about: { setAside: boolean }] {
  const { store } = useAppState()
  const [progress, setProgress] = useState(() => labProgress(store, activity, schema).load())
  return [
    progress,
    (next) => {
      setProgress(next)
      labProgress(store, activity, schema).save(next)
    },
    { setAside: wasSetAside(store, activity.entry) },
  ]
}
