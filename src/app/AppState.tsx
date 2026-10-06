import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { applyAppearance } from './firstPaint'
import { DEFAULT_PREFS, loadPrefs, resolveTri, savePrefs, type Prefs } from './preferences'
import { browserStore, clearAll, sessionStore, type KeyValueStore } from './progress/storage'
import { useMediaQuery } from './useMediaQuery'

interface AppState {
  store: KeyValueStore
  /** False when localStorage is unavailable, or the latest save of any entry was refused, and progress lasts only for this session. */
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

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [browser] = useState(browserStore)
  const [persistent, setPersistent] = useState(browser.persistent)
  // Every save in the app goes through this store, so one that is refused part-way through a session is noticed,
  // and so is the save of that entry that next succeeds. The report is put off until the caller has finished: a
  // load that fails to write its backup runs during a render.
  const [store] = useState(() => sessionStore(browser, (now) => queueMicrotask(() => setPersistent(now))))
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
