// With their extensions, here and in preferences.ts: vite.config.ts imports this file, and Vite asks that of what its config imports.
import { PREF_VALUES, PREFS_VERSION } from './preferences.ts'
import { ENTRY, storageKey } from './progress/storage.ts'

// The theme and reduced motion at first paint. The app applies them once it runs, which is after the browser has
// painted the page: a learner using the dark theme would see a light page flash on every load. So the build puts
// a small script in index.html that applies them before anything is painted (vite.config.ts). That script is
// made here, from the key, the version and the values preferences.ts defines, and firstPaint.test.ts holds it to
// what the app does. The two functions below are written into it as text: each uses nothing outside itself.

type Appearance = { dark: boolean; reducedMotion: boolean }

/**
 * The theme and reduced motion in effect for what is stored under the preferences entry, as loadPrefs and
 * resolveTri make them: the stored choice, or the system's where the choice is System, nothing is stored, or what
 * is stored is corrupt, of another version, or not one of `values` for every preference.
 */
export function storedAppearance(raw: string | null, version: number, values: Readonly<Record<string, readonly unknown[]>>, systemDark: boolean, systemReduced: boolean): Appearance {
  let prefs: { darkMode?: unknown; reducedMotion?: unknown } = {}
  try {
    const envelope = JSON.parse(raw ?? '')
    if (envelope.version === version && Object.keys(values).every((key) => values[key]?.includes(envelope.data[key]))) prefs = envelope.data
  } catch {
    // Nothing stored, or nothing usable: the defaults, which follow the system.
  }
  const resolve = (pref: unknown, system: boolean) => (pref === 'on' ? true : pref === 'off' ? false : system)
  return { dark: resolve(prefs.darkMode, systemDark), reducedMotion: resolve(prefs.reducedMotion, systemReduced) }
}

/** Puts an appearance on the root element, where index.css reads it: the class `dark` and data-reduced-motion. */
export function applyAppearance(root: { classList: Pick<DOMTokenList, 'toggle'>; dataset: Record<string, string | undefined> }, appearance: Appearance): void {
  root.classList.toggle('dark', appearance.dark)
  root.dataset.reducedMotion = String(appearance.reducedMotion)
}

/** The script index.html runs before first paint. Storage that cannot be read counts as nothing stored. */
export function firstPaintScript(): string {
  const system = (query: string) => `matchMedia(${JSON.stringify(query)}).matches`
  return [
    '(function () {',
    'var raw = null',
    `try { raw = localStorage.getItem(${JSON.stringify(storageKey(ENTRY.prefs))}) } catch (e) {}`,
    `var appearance = (${storedAppearance})(raw, ${PREFS_VERSION}, ${JSON.stringify(PREF_VALUES)}, ${system('(prefers-color-scheme: dark)')}, ${system('(prefers-reduced-motion: reduce)')})`,
    `;(${applyAppearance})(document.documentElement, appearance)`,
    '})()',
  ].join('\n')
}
