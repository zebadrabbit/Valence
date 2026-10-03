import { z } from 'zod'
import { ENTRY, loadEntry, saveEntry, type KeyValueStore } from './progress/storage'

const triSchema = z.enum(['system', 'on', 'off'])

const prefsSchema = z.object({
  darkMode: triSchema,
  reducedMotion: triSchema,
  valenceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
})

export type Tri = z.infer<typeof triSchema>
export type Prefs = z.infer<typeof prefsSchema>

const PREFS_VERSION = 1

export const DEFAULT_PREFS: Prefs = { darkMode: 'system', reducedMotion: 'system', valenceLevel: 2 }

export function resolveTri(pref: Tri, system: boolean): boolean {
  return pref === 'system' ? system : pref === 'on'
}

export function loadPrefs(store: KeyValueStore): Prefs {
  return loadEntry(store, ENTRY.prefs, PREFS_VERSION, prefsSchema) ?? DEFAULT_PREFS
}

export function savePrefs(store: KeyValueStore, prefs: Prefs): boolean {
  return saveEntry(store, ENTRY.prefs, PREFS_VERSION, prefs)
}
