import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { DEFAULT_PREFS, loadPrefs, resolveTri, savePrefs, type Prefs } from './preferences'
import { browserStore, clearAll, type KeyValueStore } from './progress/storage'

interface AppState {
  store: KeyValueStore
  /** False when localStorage is unavailable and progress lasts only for this session. */
  persistent: boolean
  prefs: Prefs
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
  const [{ store, persistent }] = useState(browserStore)
  const [prefs, setPrefs] = useState(() => loadPrefs(store))

  const dark = resolveTri(prefs.darkMode, useMediaQuery('(prefers-color-scheme: dark)'))
  const reducedMotion = resolveTri(prefs.reducedMotion, useMediaQuery('(prefers-reduced-motion: reduce)'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.dataset.reducedMotion = String(reducedMotion)
  }, [dark, reducedMotion])

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
    <AppStateContext.Provider value={{ store, persistent, prefs, updatePrefs, resetAll }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState(): AppState {
  const state = useContext(AppStateContext)
  if (!state) throw new Error('useAppState must be used inside AppStateProvider')
  return state
}
