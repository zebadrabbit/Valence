import { z } from 'zod'
import { ENTRY, loadEntry, saveEntry, type KeyValueStore } from './progress/storage.ts'

const TRI = ['system', 'on', 'off'] as const

/**
 * Every preference and the values it can take. The schema is built from this, and so is the script that applies
 * the theme before the app has loaded (firstPaint.ts), so the two read a stored entry alike.
 */
export const PREF_VALUES = { darkMode: TRI, reducedMotion: TRI, valenceLevel: [1, 2, 3] } as const

const prefsSchema = z.object({
  darkMode: z.literal(PREF_VALUES.darkMode),
  reducedMotion: z.literal(PREF_VALUES.reducedMotion),
  valenceLevel: z.literal(PREF_VALUES.valenceLevel),
})

export type Tri = (typeof TRI)[number]
export type Prefs = z.infer<typeof prefsSchema>

/** The valence display levels (spec 6.4) as the level controls list them. */
export const VALENCE_LEVELS: readonly { value: Prefs['valenceLevel']; label: string }[] = [
  { value: 1, label: '1: Bohr shells' },
  { value: 2, label: '2: Lewis dots' },
  { value: 3, label: '3: Orbitals' },
]

export const PREFS_VERSION = 1

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
