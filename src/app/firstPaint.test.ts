import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyAppearance, firstPaintScript, storedAppearance } from './firstPaint'
import { DEFAULT_PREFS, loadPrefs, PREF_VALUES, PREFS_VERSION, resolveTri, type Prefs } from './preferences'
import { browserStore, createMemoryStore, ENTRY, storageKey } from './progress/storage'

// The theme is applied twice: by a script in index.html before anything is painted, and by the app once it runs.
// The preference is defined in one place, preferences.ts. These hold the script to it.

const KEY = storageKey(ENTRY.prefs)
const SYSTEMS = [
  [false, false],
  [false, true],
  [true, false],
  [true, true],
] as const

/** What the app itself makes of a stored value: loadPrefs, then resolveTri. */
function appAppearance(raw: string | null, systemDark: boolean, systemReduced: boolean) {
  const store = createMemoryStore()
  if (raw !== null) store.setItem(KEY, raw)
  const prefs = loadPrefs(store)
  return { dark: resolveTri(prefs.darkMode, systemDark), reducedMotion: resolveTri(prefs.reducedMotion, systemReduced) }
}
const stored = (data: unknown, version: unknown = PREFS_VERSION) => JSON.stringify({ version, data })
const decide = (raw: string | null, systemDark: boolean, systemReduced: boolean) => storedAppearance(raw, PREFS_VERSION, PREF_VALUES, systemDark, systemReduced)

afterEach(() => vi.unstubAllGlobals())

describe('storedAppearance', () => {
  it('reads the stored theme and reduced motion, each of which overrides the system unless it is set to System', () => {
    expect(decide(stored({ ...DEFAULT_PREFS, darkMode: 'on' }), false, false)).toEqual({ dark: true, reducedMotion: false })
    expect(decide(stored({ ...DEFAULT_PREFS, darkMode: 'off' }), true, false)).toEqual({ dark: false, reducedMotion: false })
    expect(decide(stored({ ...DEFAULT_PREFS, darkMode: 'system' }), true, false)).toEqual({ dark: true, reducedMotion: false })
    expect(decide(stored({ ...DEFAULT_PREFS, reducedMotion: 'on' }), false, false)).toEqual({ dark: false, reducedMotion: true })
    expect(decide(stored({ ...DEFAULT_PREFS, reducedMotion: 'off' }), true, true)).toEqual({ dark: true, reducedMotion: false })
  })

  it('follows the system when nothing is stored', () => {
    for (const [dark, reducedMotion] of SYSTEMS) expect(decide(null, dark, reducedMotion)).toEqual({ dark, reducedMotion })
  })

  it('agrees with the app for every valid stored value, under every system setting', () => {
    let checked = 0
    for (const darkMode of PREF_VALUES.darkMode) {
      for (const reducedMotion of PREF_VALUES.reducedMotion) {
        for (const valenceLevel of PREF_VALUES.valenceLevel) {
          const raw = stored({ darkMode, reducedMotion, valenceLevel } satisfies Prefs)
          for (const [dark, reduced] of SYSTEMS) {
            expect([raw, decide(raw, dark, reduced)]).toEqual([raw, appAppearance(raw, dark, reduced)])
            checked++
          }
        }
      }
    }
    expect(checked).toBe(3 * 3 * 3 * 4)
  })

  it('agrees with the app for a stored value that is corrupt, of another version or of the wrong shape: both fall back to the defaults', () => {
    const valid = { ...DEFAULT_PREFS, darkMode: 'on', reducedMotion: 'on' }
    const broken = [
      '',
      '{not json',
      'null',
      '[]',
      '"on"',
      '7',
      '{}',
      JSON.stringify({ version: PREFS_VERSION }),
      stored(null),
      stored([]),
      stored('on'),
      stored(valid, PREFS_VERSION + 1),
      stored(valid, String(PREFS_VERSION)),
      stored(valid, null),
      stored({ ...valid, darkMode: 'purple' }),
      stored({ ...valid, darkMode: true }),
      stored({ ...valid, reducedMotion: 'ON' }),
      stored({ ...valid, valenceLevel: 4 }),
      stored({ ...valid, valenceLevel: '2' }),
      // Every preference is required: one missing spoils the whole entry, whichever it is.
      ...Object.keys(DEFAULT_PREFS).map((missing) => stored(Object.fromEntries(Object.entries(valid).filter(([key]) => key !== missing)))),
    ]
    for (const raw of broken) {
      for (const [dark, reduced] of SYSTEMS) {
        expect([raw, decide(raw, dark, reduced)]).toEqual([raw, appAppearance(raw, dark, reduced)])
        expect([raw, decide(raw, dark, reduced)]).toEqual([raw, { dark, reducedMotion: reduced }])
      }
    }
    // A key the app does not know is ignored by both.
    const extra = stored({ ...valid, later: 1 })
    expect(decide(extra, false, false)).toEqual(appAppearance(extra, false, false))
    expect(decide(extra, false, false)).toEqual({ dark: true, reducedMotion: true })
  })

  it('agrees with the app when storage can be read but refuses writes: both keep the stored theme', () => {
    const raw = stored({ ...DEFAULT_PREFS, darkMode: 'on', reducedMotion: 'on' })
    const refusing = {
      length: 1,
      key: () => KEY,
      getItem: (key: string) => (key === KEY ? raw : null),
      setItem() {
        throw new Error('QuotaExceededError')
      },
      removeItem() {},
    }
    vi.stubGlobal('window', { localStorage: refusing })
    // The app, as AppState starts it: the store browserStore gives, then loadPrefs.
    const prefs = loadPrefs(browserStore().store)
    for (const [dark, reduced] of SYSTEMS) {
      const app = { dark: resolveTri(prefs.darkMode, dark), reducedMotion: resolveTri(prefs.reducedMotion, reduced) }
      expect(decide(refusing.getItem(KEY), dark, reduced)).toEqual(app)
      expect(app).toEqual({ dark: true, reducedMotion: true })
    }
  })

  it('checks every preference the app defines, so that a new one cannot be forgotten', () => {
    expect(Object.keys(PREF_VALUES)).toEqual(Object.keys(DEFAULT_PREFS))
  })
})

describe('the script that runs before first paint', () => {
  /** Runs the script as index.html does, with nothing in scope but what a page gives it. */
  function run(raw: string | null | Error, systemDark: boolean, systemReduced: boolean) {
    const classes = new Set<string>(['other'])
    const dataset: Record<string, string> = {}
    const read: string[] = []
    const page = {
      localStorage: {
        getItem(key: string) {
          read.push(key)
          if (raw instanceof Error) throw raw
          return raw
        },
      },
      matchMedia: (query: string) => ({ matches: query === '(prefers-color-scheme: dark)' ? systemDark : query === '(prefers-reduced-motion: reduce)' ? systemReduced : false }),
      document: { documentElement: { classList: { toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)) }, dataset } },
    }
    new Function(...Object.keys(page), firstPaintScript())(...Object.values(page))
    return { dark: classes.has('dark'), reducedMotion: dataset.reducedMotion, read, classes: [...classes] }
  }

  it('reads the entry the app saves its preferences under, and sets the class and the attribute the app sets', () => {
    const seen = run(stored({ ...DEFAULT_PREFS, darkMode: 'on', reducedMotion: 'on' }), false, false)
    expect(seen.read).toEqual(['valence:prefs'])
    expect(seen.classes).toEqual(['other', 'dark'])
    expect(seen.reducedMotion).toBe('true')
    expect(run(stored({ ...DEFAULT_PREFS, darkMode: 'off', reducedMotion: 'off' }), true, true)).toMatchObject({ dark: false, reducedMotion: 'false' })
  })

  it('follows the system when nothing is stored, when what is stored is corrupt, and when storage cannot be read', () => {
    for (const raw of [null, '{not json', stored({ darkMode: 'on' }), new Error('blocked')]) {
      for (const [dark, reduced] of SYSTEMS) expect([String(raw), run(raw, dark, reduced)]).toMatchObject([String(raw), { dark, reducedMotion: String(reduced) }])
    }
  })

  it('does what the app does once it runs', () => {
    const classes = new Set<string>()
    const root = { classList: { toggle: (name: string, on?: boolean) => (on ? classes.add(name) : classes.delete(name), !!on) }, dataset: {} as Record<string, string> }
    applyAppearance(root, { dark: true, reducedMotion: false })
    expect([[...classes], root.dataset]).toEqual([['dark'], { reducedMotion: 'false' }])
    applyAppearance(root, { dark: false, reducedMotion: true })
    expect([[...classes], root.dataset]).toEqual([[], { reducedMotion: 'true' }])
    expect(firstPaintScript()).toContain(applyAppearance.toString())
    expect(firstPaintScript()).toContain(storedAppearance.toString())
  })

  it('is plain script with no closing tag in it, which would end the script element early', () => {
    expect(firstPaintScript()).not.toMatch(/<\/script|<!--/i)
    expect(firstPaintScript()).not.toMatch(/\bimport\b|\bexport\b/)
  })
})
