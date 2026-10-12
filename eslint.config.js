// @ts-check
import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

// Folders that must stay free of React, Three.js, the DOM, and the app layer.
const PURE = ['src/engine/**/*.{ts,tsx}', 'src/chem-data/**/*.{ts,tsx}', 'src/mechanisms/**/*.{ts,tsx}']

// Flat config does not merge rule options: when two blocks set the same rule
// for the same file, the LAST block wins outright. So every block below
// restates the full option list it wants, built from these shared pieces.
const NO_NETWORK = 'No network at runtime: all chem-data is bundled.'
const NO_DOM = 'engine/, chem-data/ and mechanisms/ must not touch the DOM.'
const NO_CLOCK = 'engine/ and mechanisms/ must not read the clock: take time as an argument.'
const NO_EAGER_THREE =
  'Three.js is imported only inside a scene/ folder, which the app loads lazily. A static import anywhere else puts about 900 kB into an eagerly loaded chunk.'
const NO_ENGINE_INTERNALS =
  "Import a lab's engine from its index only: '@/engine/titration', '@/engine/aqueous', '@/engine/flame', '@/engine/calorimetry', '@/engine/cations', '@/engine/lechatelier', '@/engine/clock', '@/engine/acetone', '@/engine/cabbage', '@/engine/density', '@/engine/freezing', '@/engine/reactions'. The files below the titration index hold each run's hidden values, which no screen may show; those below the aqueous index work on any tube, and the app is given the ten stations and nothing else; those below the flame index hold what a correct observation is, which a page is given only where it may be shown; those below the calorimetry index hold which metal the piece is, the readings the logger has not yet taken and the value a result is held to; those below the cations index hold which ions an unknown holds, what each tube is made of and whether an observation is right; those below the lechatelier index hold what a tube will show after a press not yet made and whether an observation or an answer is right before it has been judged; those below the clock index and the acetone index, and all of the kinetics engine the two run on, hold the time of a run before its watch is stopped, whether an entry follows before that may be said, and the orders, the rate constant and the activation energy a result is held to; those below the cabbage index hold the pH of each household thing before the meter has been read in it, the right answer to each question, and whether an answer is right before it has been judged; those below the density index hold which liquid and which metal an unknown is, the density a result is held to, and whether an entry is right before that may be said; those below the freezing index hold which liquid the unknown is, how far the probe is off, the readings the logger has not yet taken, whether the cup has levelled, and the figure a result is held to."
const NO_MECHANISM_INTERNALS =
  "Import the mechanism timeline from its index only: '@/mechanisms'. A screen draws from state(mechanism, t) and from nothing below the index, so that every frame is a function of the scrub position."

// The scripting APIs that open a connection. navigator.sendBeacon is a method, so it is banned as a property below.
// Not every way a page can reach a server: the address of an image, a worker or an import is not looked at.
const NETWORK_NAMES = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'WebTransport', 'RTCPeerConnection']
const NETWORK_GLOBALS = NETWORK_NAMES.map((name) => ({ name, message: NO_NETWORK }))
const DOM_GLOBALS = [
  { name: 'document', message: NO_DOM },
  { name: 'window', message: NO_DOM },
]
const NETWORK_PROPERTIES = [
  ...['window', 'globalThis', 'self'].flatMap((object) => NETWORK_NAMES.map((property) => ({ object, property, message: NO_NETWORK }))),
  // On any object, so that window.navigator.sendBeacon and a destructured sendBeacon are caught too.
  { property: 'sendBeacon', message: NO_NETWORK },
]
const NONDETERMINISM_PROPERTIES = [
  { object: 'Math', property: 'random', message: 'engine/ and mechanisms/ are deterministic: in engine/, use the seeded RNG passed in.' },
  { object: 'Date', property: 'now', message: NO_CLOCK },
  { object: 'performance', property: 'now', message: NO_CLOCK },
]

const NO_THREE_PATHS = [{ name: 'three', message: NO_EAGER_THREE }]
const NO_THREE_PATTERNS = [
  { group: ['three/*', '@react-three/*'], message: NO_EAGER_THREE },
  {
    // A value import of a scene module would drag Three.js along with it.
    regex: '/scene/',
    allowTypeImports: true,
    message: 'Import scene/ modules with import type, or load them with React.lazy(() => import(...)).',
  },
]
// "@/engine/titration/flask", "../../../engine/aqueous/react": anything below a lab engine's index, by alias or by relative path.
// The kinetics engine has no door of its own for the app: each lab that runs on it does ("@/engine/clock", "@/engine/acetone"), so
// "@/engine/kinetics" is refused with or without a file after it. Nor are the shared figures the app's to import:
// a lab's index hands on what a page needs of them.
const ENGINE_INTERNALS = { regex: '(^|/)engine/((titration|aqueous|flame|calorimetry|cations|lechatelier|clock|acetone|cabbage|density|freezing|reactions)/|kinetics(/|$)|figures$)', message: NO_ENGINE_INTERNALS }
const ENGINE_INTERNALS_BUT_TESTKIT = { regex: '(^|/)engine/((titration|aqueous|flame|calorimetry|cations|lechatelier|clock|acetone|cabbage|density|freezing|reactions)/(?!testkit$)|kinetics(/|$)|figures$)', message: NO_ENGINE_INTERNALS }
// "@/mechanisms/state", "../../mechanisms/hcl-nahco3.json": anything below the mechanisms index.
const MECHANISM_INTERNALS = { regex: '(^|/)mechanisms/', message: NO_MECHANISM_INTERNALS }

export default defineConfig(
  // src/components/ui is generated by the shadcn CLI and is not ours to lint.
  globalIgnores(['dist/', 'coverage/', 'docs/', '.superpowers/', 'src/components/ui/']),

  js.configs.recommended,
  // Non-type-aware preset on purpose: with no parserOptions.project, the lint
  // test can call ESLint.lintText() on file paths that do not exist on disk.
  tseslint.configs.recommended,

  // No network anywhere under src/.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': ['error', ...NETWORK_GLOBALS],
      'no-restricted-properties': ['error', ...NETWORK_PROPERTIES],
    },
  },

  // Pure folders import no UI code and use no DOM globals.
  {
    files: PURE,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'No React in engine/, chem-data/ or mechanisms/.' },
            { name: 'react-dom', message: 'No React in engine/, chem-data/ or mechanisms/.' },
            { name: 'three', message: 'No Three.js in engine/, chem-data/ or mechanisms/.' },
          ],
          patterns: [
            {
              group: ['react/*', 'react-dom/*', 'three/*', '@react-three/*'],
              message: 'No React or Three.js in engine/, chem-data/ or mechanisms/.',
            },
            {
              // "../app", "../../app/foo", "@/app", "@/app/foo"
              regex: '^((\\.{1,2}/)+(.*/)?|@/)app(/|$)',
              message: 'engine/, chem-data/ and mechanisms/ must not import from app/.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', ...NETWORK_GLOBALS, ...DOM_GLOBALS],
    },
  },

  // Three.js stays in the lazily loaded scene/ folders, and the app reaches each lab's engine and the mechanism
  // timeline through their indexes.
  // (The pure folders have their own, stricter block above.)
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/main.tsx'],
    ignores: ['src/app/**/scene/**'],
    rules: { 'no-restricted-imports': ['error', { paths: NO_THREE_PATHS, patterns: [...NO_THREE_PATTERNS, ENGINE_INTERNALS, MECHANISM_INTERNALS] }] },
  },
  // A test may also use the engine's scripted learners.
  {
    files: ['src/app/**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { paths: NO_THREE_PATHS, patterns: [...NO_THREE_PATTERNS, ENGINE_INTERNALS_BUT_TESTKIT, MECHANISM_INTERNALS] }] },
  },
  // After the two blocks above, so that it is the one that holds for a scene/ folder, its tests included.
  {
    files: ['src/app/**/scene/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [ENGINE_INTERNALS, MECHANISM_INTERNALS] }] },
  },

  // The engine and the mechanism timeline are deterministic: no Math.random, no clock.
  {
    files: ['src/engine/**/*.{ts,tsx}', 'src/mechanisms/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-properties': ['error', ...NETWORK_PROPERTIES, ...NONDETERMINISM_PROPERTIES],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: NO_CLOCK },
        { selector: "CallExpression[callee.name='Date']", message: NO_CLOCK },
      ],
    },
  },
)
