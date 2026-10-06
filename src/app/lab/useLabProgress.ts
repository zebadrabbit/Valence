import { useState } from 'react'
import type { z } from 'zod'
import type { Activity } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { loadEntry, saveEntry, type KeyValueStore } from '@/app/progress/storage'

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
 */
export function useLabProgress<T>(activity: Activity, schema: z.ZodType<T>): [progress: T | null, save: (next: T) => void] {
  const { store } = useAppState()
  const [progress, setProgress] = useState(() => labProgress(store, activity, schema).load())
  return [
    progress,
    (next) => {
      setProgress(next)
      labProgress(store, activity, schema).save(next)
    },
  ]
}
