import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { applyAppearance } from './firstPaint'
import { DEFAULT_PREFS, loadPrefs, resolveTri, savePrefs, type Prefs } from './preferences'
import { browserStore, clearAll, reportingStore, type KeyValueStore } from './progress/storage'

interface AppState {
  store: KeyValueStore
  /** False when localStorage is unavailable, or has refused a save, and progress lasts only for this session. */
  persistent: boolean
  prefs: Prefs
  /** The theme in effect: the learner's choice, or the system's when set to System. */
  dark: boolean
  /** True when motion should be avoided: the learner's choice, or the system's. */
  reducedMotion: boolean
  updatePrefs(patch: Partial<Prefs>): void
  resetAll(): void
}

const AppStateContext = createContext<AppState | null>(null)

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [browser] = useState(browserStore)
  const [saveFailed, setSaveFailed] = useState(false)
  // Every save in the app goes through this store, so one that is refused part-way through a session is noticed.
  // The report is put off until the caller has finished: a load that fails to write its backup runs during a render.
  const [store] = useState(() => reportingStore(browser.store, () => queueMicrotask(() => setSaveFailed(true))))
  const persistent = browser.persistent && !saveFailed
  const [prefs, setPrefs] = useState(() => loadPrefs(store))

  const dark = resolveTri(prefs.darkMode, useMediaQuery('(prefers-color-scheme: dark)'))
  const reducedMotion = resolveTri(prefs.reducedMotion, useMediaQuery('(prefers-reduced-motion: reduce)'))

  // On load the script in index.html has done this already, before first paint (firstPaint.ts).
  useEffect(() => applyAppearance(document.documentElement, { dark, reducedMotion }), [dark, reducedMotion])

  const updatePrefs = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    savePrefs(store, next)
  }

  const resetAll = () => {
    clearAll(store)
    setPrefs(DEFAULT_PREFS)
  }

  return (
    <AppStateContext.Provider value={{ store, persistent, prefs, dark, reducedMotion, updatePrefs, resetAll }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState(): AppState {
  const state = useContext(AppStateContext)
  if (!state) throw new Error('useAppState must be used inside AppStateProvider')
  return state
}
