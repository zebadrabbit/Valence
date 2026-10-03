# Valence Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running, tested app skeleton for Valence: navigation shell, themes, guest progress storage, settings and About pages, the chem-data schemas and validator, a seeded random generator, and lint rules that keep the chemistry code pure.

**Architecture:** One static Vite + React + TypeScript app, no server. Chemistry code lives in `src/chem-data/`, `src/engine/`, and `src/mechanisms/` and never touches React, Three.js, the DOM, the network, or (in `engine/`) randomness or the clock; ESLint enforces this and a test proves each rule. UI lives in `src/app/`. Guest progress is versioned JSON in `localStorage`, one entry per activity.

**Tech Stack:** Node 24, npm, TypeScript 6, Vite 8, React 19, react-router 8 (hash router), Tailwind CSS 4, shadcn/ui (base-nova style, Base UI primitives), lucide-react, zod 4, Vitest 5, ESLint 10 with typescript-eslint 8.

**Spec:** `docs/superpowers/specs/2026-10-03-valence-v1-design.md` (sections 4, 5, 10, 11, 12, 13, 14). Read it before starting.

**Branch:** do all work on a branch named `phase-1-foundation`.

## Global Constraints

- TypeScript must stay on major version 6 (`typescript@^6`). typescript-eslint 8 requires `typescript <6.1.0`; npm resolves TypeScript 7 by default, which breaks linting.
- `src/engine/`, `src/chem-data/`, and `src/mechanisms/` never import React, react-dom, Three.js, `@react-three/*`, or anything from `src/app/`, and never use `document` or `window`.
- `src/engine/` never calls `Math.random`, `Date.now`, `performance.now`, `Date()`, or `new Date()` with no arguments.
- `fetch` and `XMLHttpRequest` are banned everywhere under `src/`. Nothing is fetched at runtime.
- Routing uses a hash router. `vite.config.ts` sets `base: './'` so the build works on any static host and sub-path.
- The Inter font is self-hosted from `@fontsource-variable/inter`. No CDN URLs anywhere.
- Design tokens are CSS variables in the Tailwind theme (`src/index.css`), not a JS config.
- Every chemistry value needs a source: record-level `sourceId`, or `{ value, sourceId }` for individually cited values. Model parameters are `{ value, rationale }`.
- The repo will become public. Commit no secrets, no personal details, and no institution-specific text. The institution-names denylist lives in an untracked local file, never in the repo.
- User-facing copy never says the app is "WCAG compliant" or "FERPA compliant". State facts only.
- Tests import from `vitest` explicitly and run in the default `node` environment (no jsdom). Test files are `src/**/*.test.ts`.
- Run every command from the repo root.

## Review Focus

1. **`localStorage` is unavailable or throws** (private browsing, storage disabled, quota full): the app still loads and works for the session, and Settings shows a notice that progress cannot be saved. Pinned by tests in Task 6.
2. **Stored progress is corrupt, hand-edited, or from a different version:** that entry starts fresh, the old value is kept under a backup key, and nothing crashes. Pinned by tests in Task 6.
3. **Stored preferences parse as JSON but have the wrong shape** (for example `darkMode: "purple"`): defaults are used. Pinned by a test in Task 7.
4. **The validator is given a malformed registry** (not an object, a collection missing, a bond pointing at an atom index that does not exist): it returns error strings and never throws. Pinned by tests in Task 5.
5. **Legitimate chemistry prose trips the institution denylist** ("room temperature", "at 298 K", "CID 962"): these must pass, while "Room 214" and "CHEM 1411" fail. Pinned by tests in Task 4.

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html` | Project scaffold |
| `eslint.config.js` | Architecture lint rules |
| `src/lint-rules.test.ts` | Proves each lint rule through the ESLint API |
| `src/index.css` | Tailwind import, design tokens, dark theme, reduced-motion rule |
| `src/engine/rng.ts` | Seeded random generator (mulberry32) |
| `src/chem-data/schema.ts` | zod schemas and TypeScript types for sources, species, reagents, observations, stations, molecules |
| `src/chem-data/denylist.ts` | Detects institution-specific text |
| `src/chem-data/validate.ts` | `validateRegistry`: the four failure conditions of spec 5.1 |
| `src/chem-data/sources.json`, `src/chem-data/registry.ts` | The real (currently empty) data registry |
| `src/chem-data/registry.test.ts` | Validates the real registry on every test run and build |
| `src/app/progress/storage.ts` | Versioned entries in `localStorage`, backup on failure, export, clear |
| `src/app/preferences.ts` | Preferences schema, defaults, load/save, System/On/Off resolution |
| `src/app/AppState.tsx` | React context: store, preferences, applies theme to `<html>` |
| `src/app/Layout.tsx`, `src/app/PageHeader.tsx` | Navigation rail, skip link, breadcrumbs, page title |
| `src/app/pages/*.tsx` | Home, Explore, Lab, Learn, Settings, About, NotFound |
| `src/main.tsx` | Router and providers |
| `docs/for-institutions.md` | Reviewer sections that are true as of this phase |

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `src/index.css`, `src/main.tsx`, `src/scaffold.test.ts`
- Generated by shadcn: `components.json`, `src/components/ui/button.tsx`, `src/lib/utils.ts` (and it rewrites `src/index.css`)

**Interfaces:**
- Consumes: nothing.
- Produces: the `@/` import alias for `src/`; npm scripts `dev`, `build`, `typecheck`, `test`, `preview`; the `Button` component at `@/components/ui/button`; Tailwind tokens such as `bg-background`, `text-foreground`, `text-muted-foreground`, `border`, `bg-muted`.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b phase-1-foundation
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "valence",
  "private": true,
  "version": "0.1.0",
  "license": "MIT",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "vite",
    "build": "vitest run && tsc -b && vite build",
    "typecheck": "tsc -b",
    "test": "vitest run",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 3: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Valence: a molecule explorer and virtual general-chemistry lab for self-directed learners." />
    <title>Valence</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 5: Write the three tsconfig files**

`tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

`tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["vite/client"],
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "allowImportingTsExtensions": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Write a one-line `src/index.css`** (shadcn rewrites it in step 8, but it must exist first)

```css
@import "tailwindcss";
```

- [ ] **Step 7: Install dependencies**

```bash
npm install react react-dom react-router @fontsource-variable/inter zod
npm install -D vite @vitejs/plugin-react typescript@^6 @types/react @types/react-dom @types/node tailwindcss @tailwindcss/vite vitest
```

Expected: both finish with exit code 0. `npm ls typescript` shows a 6.x version.

- [ ] **Step 8: Initialise shadcn/ui without prompts and add the button**

```bash
npx --yes shadcn@latest init --defaults --yes --no-monorepo button </dev/null
```

Expected: exit code 0. It creates `components.json`, `src/components/ui/button.tsx`, and `src/lib/utils.ts`, rewrites `src/index.css` with the full token set (including `@custom-variant dark (&:is(.dark *));` and a `.dark { ... }` block), and adds `@base-ui/react`, `class-variance-authority`, `cn`, `lucide-react`, `shadcn`, `tw-animate-css`, and `@fontsource-variable/geist` to `dependencies`.

- [ ] **Step 9: Swap the font to Inter and move the shadcn CLI out of runtime dependencies**

```bash
npm uninstall @fontsource-variable/geist shadcn
npm install -D shadcn
```

The `shadcn` package is only needed at build time, for `@import "shadcn/tailwind.css"`.

Then edit `src/index.css`:

- Replace the line `@import "@fontsource-variable/geist";` with `@import "@fontsource-variable/inter";`
- Replace the `--font-sans` line inside `@theme inline` with:

```css
    --font-sans: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;
```

- Append at the end of the file:

```css
[data-reduced-motion='true'] *,
[data-reduced-motion='true'] *::before,
[data-reduced-motion='true'] *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}
```

Run: `grep -n "geist\|Geist" src/index.css package.json`
Expected: no output.

- [ ] **Step 10: Write a minimal `src/main.tsx`** (replaced in Task 8)

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('missing #root')

createRoot(root).render(
  <StrictMode>
    <h1 className="p-6 text-2xl font-semibold">Valence</h1>
  </StrictMode>,
)
```

- [ ] **Step 11: Write `src/scaffold.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

describe('test environment', () => {
  it('runs in node, without a DOM', () => {
    expect(typeof document).toBe('undefined')
  })
})
```

- [ ] **Step 12: Verify the scaffold**

Run: `npm run typecheck`
Expected: no output, exit code 0.

Run: `npm test`
Expected: `Test Files  1 passed (1)`, `Tests  1 passed (1)`.

Run: `npm run build`
Expected: the test run passes, then Vite prints a `dist/` listing that includes `inter-latin-wght-normal-*.woff2`, one `.css` file, and one `.js` file, ending with `✓ built in`.

Run: `grep -rl "fonts.googleapis\|fonts.gstatic" dist || echo "no external fonts"`
Expected: `no external fonts`.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "Scaffold Vite, React, Tailwind, shadcn/ui, and Vitest"
```

---

### Task 2: Architecture lint rules

**Files:**
- Create: `eslint.config.js`, `src/lint-rules.test.ts`
- Modify: `package.json` (add the `lint` script)

**Interfaces:**
- Consumes: the scaffold from Task 1.
- Produces: `npm run lint`. Later tasks must keep it passing.

- [ ] **Step 1: Install ESLint**

```bash
npm install -D eslint @eslint/js typescript-eslint
npm pkg set scripts.lint="eslint ."
```

- [ ] **Step 2: Write the failing test, `src/lint-rules.test.ts`**

```ts
import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

// Lints code strings against the real eslint.config.js. The file paths are
// virtual (nothing is written to disk); they only select which config blocks
// apply. ESLint resolves them relative to cwd, which Vitest sets to the
// project root.
let eslint: ESLint

beforeAll(async () => {
  eslint = new ESLint()
  // The first lintText loads the config, parser, and plugins (about 2 s).
  await eslint.lintText('export {}\n', { filePath: 'src/engine/warmup.ts' })
}, 30_000)

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const results = await eslint.lintText(code, { filePath })
  // lintText returns [] silently if the path matches no config block, which
  // would make every "is clean" test pass vacuously.
  expect(results).toHaveLength(1)
  const [result] = results
  if (!result) throw new Error('no lint result')
  return result.messages.map((m) => m.ruleId ?? `FATAL: ${m.message}`)
}

describe('architecture lint rules', () => {
  it.each([
    ['react', 'src/engine/x.ts'],
    ['react-dom/client', 'src/engine/x.ts'],
    ['react/jsx-runtime', 'src/chem-data/x.ts'],
    ['three', 'src/chem-data/x.ts'],
    ['@react-three/fiber', 'src/mechanisms/x.ts'],
    ['@/app/foo', 'src/engine/x.ts'],
    ['../app/foo', 'src/mechanisms/x.ts'],
    ['../../app/foo', 'src/engine/sub/x.ts'],
  ])('rejects importing %s in %s', async (source, filePath) => {
    const ids = await ruleIds(`import * as m from "${source}"\nexport const v = m\n`, filePath)
    expect(ids).toEqual(['no-restricted-imports'])
  })

  it('rejects a type-only React import in src/engine', async () => {
    const code = `import type { ReactNode } from "react"\nexport type N = ReactNode\n`
    expect(await ruleIds(code, 'src/engine/x.ts')).toEqual(['no-restricted-imports'])
  })

  it('rejects Math.random in src/engine', async () => {
    expect(await ruleIds('export const r = () => Math.random()\n', 'src/engine/x.ts')).toEqual([
      'no-restricted-properties',
    ])
  })

  it('rejects Date.now in src/engine', async () => {
    expect(await ruleIds('export const t = () => Date.now()\n', 'src/engine/x.ts')).toEqual([
      'no-restricted-properties',
    ])
  })

  it('rejects new Date() in src/engine but allows new Date(ms)', async () => {
    expect(await ruleIds('export const d = () => new Date()\n', 'src/engine/x.ts')).toEqual([
      'no-restricted-syntax',
    ])
    expect(await ruleIds('export const d = (ms: number) => new Date(ms)\n', 'src/engine/x.ts')).toEqual([])
  })

  it('rejects document in src/chem-data and window in src/mechanisms', async () => {
    expect(await ruleIds('export const el = () => document.body\n', 'src/chem-data/x.ts')).toEqual([
      'no-restricted-globals',
    ])
    expect(await ruleIds('export const w = () => window.innerWidth\n', 'src/mechanisms/x.ts')).toEqual([
      'no-restricted-globals',
    ])
  })

  it.each(['src/engine/x.ts', 'src/chem-data/x.ts', 'src/mechanisms/x.ts', 'src/app/x.tsx'])(
    'rejects fetch and XMLHttpRequest in %s',
    async (filePath) => {
      expect(await ruleIds('export const get = () => fetch("/x")\n', filePath)).toEqual(['no-restricted-globals'])
      expect(await ruleIds('export const xhr = () => new XMLHttpRequest()\n', filePath)).toEqual([
        'no-restricted-globals',
      ])
    },
  )

  it('rejects window.fetch in src/app', async () => {
    expect(await ruleIds('export const get = () => window.fetch("/x")\n', 'src/app/x.ts')).toEqual([
      'no-restricted-properties',
    ])
  })

  it('applies the same rules to test files in src/engine', async () => {
    expect(await ruleIds('export const r = () => Math.random()\n', 'src/engine/x.test.ts')).toEqual([
      'no-restricted-properties',
    ])
  })

  it('accepts React, Three.js, the DOM, Math.random, and the clock in src/app', async () => {
    const code = [
      'import { useState } from "react"',
      'import * as THREE from "three"',
      'export const a = [useState, THREE, Math.random(), Date.now(), new Date(), document.title, window.innerWidth]',
      '',
    ].join('\n')
    expect(await ruleIds(code, 'src/app/x.tsx')).toEqual([])
  })

  it('accepts Math.random and the clock in chem-data and mechanisms', async () => {
    const code = 'export const a = [Math.random(), Date.now(), new Date()]\n'
    expect(await ruleIds(code, 'src/chem-data/x.ts')).toEqual([])
    expect(await ruleIds(code, 'src/mechanisms/x.ts')).toEqual([])
  })

  it('reports nothing for a clean pure function in src/engine', async () => {
    const code = 'export function add(a: number, b: number): number {\n  return a + b\n}\n'
    expect(await ruleIds(code, 'src/engine/x.ts')).toEqual([])
  })

  it('lets a pure folder import a sibling pure folder', async () => {
    const code = 'import { data } from "../chem-data/elements"\nexport const v = data\n'
    expect(await ruleIds(code, 'src/engine/x.ts')).toEqual([])
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lint-rules.test.ts`
Expected: FAIL. With no `eslint.config.js`, ESLint reports it could not find a config file (or the "rejects" tests fail with `[]`).

- [ ] **Step 4: Write `eslint.config.js`**

```js
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
const NO_CLOCK = 'engine/ must not read the clock: take time as an argument.'

const NETWORK_GLOBALS = [
  { name: 'fetch', message: NO_NETWORK },
  { name: 'XMLHttpRequest', message: NO_NETWORK },
]
const DOM_GLOBALS = [
  { name: 'document', message: NO_DOM },
  { name: 'window', message: NO_DOM },
]
const NETWORK_PROPERTIES = ['window', 'globalThis', 'self'].flatMap((object) => [
  { object, property: 'fetch', message: NO_NETWORK },
  { object, property: 'XMLHttpRequest', message: NO_NETWORK },
])
const NONDETERMINISM_PROPERTIES = [
  { object: 'Math', property: 'random', message: 'engine/ is deterministic: use the seeded RNG passed in.' },
  { object: 'Date', property: 'now', message: NO_CLOCK },
  { object: 'performance', property: 'now', message: NO_CLOCK },
]

export default defineConfig(
  // src/components/ui is generated by the shadcn CLI and is not ours to lint.
  globalIgnores(['dist/', 'coverage/', 'src/components/ui/']),

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

  // The engine is deterministic: no Math.random, no clock.
  {
    files: ['src/engine/**/*.{ts,tsx}'],
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
```

- [ ] **Step 5: Run the test and the linter**

Run: `npx vitest run src/lint-rules.test.ts`
Expected: PASS, all tests green, about 3 seconds.

Run: `npm run lint`
Expected: no output, exit code 0.

Run: `npm run typecheck`
Expected: no output, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add lint rules that keep chemistry code pure and deterministic"
```

---

### Task 3: Seeded random generator

**Files:**
- Create: `src/engine/rng.ts`
- Test: `src/engine/rng.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Rng = () => number`; `mulberry32(seed: number): Rng` returning floats in [0, 1); `uniform(rng: Rng, min: number, max: number): number`.

- [ ] **Step 1: Write the failing test, `src/engine/rng.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { mulberry32, uniform } from './rng'

describe('mulberry32', () => {
  it('produces the pinned sequence for seed 1', () => {
    const rng = mulberry32(1)
    expect([rng(), rng(), rng()]).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522])
  })

  it('gives the same sequence for the same seed', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })

  it('gives different sequences for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })

  it('stays in [0, 1)', () => {
    const rng = mulberry32(99)
    for (let i = 0; i < 10_000; i++) {
      const x = rng()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })

  it('treats the seed as an unsigned 32-bit integer', () => {
    expect(mulberry32(-1)()).toBe(mulberry32(0xffffffff)())
    expect(mulberry32(Number.NaN)()).toBe(mulberry32(0)())
  })
})

describe('uniform', () => {
  it('stays inside the requested range', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const x = uniform(rng, -0.03, 0.03)
      expect(x).toBeGreaterThanOrEqual(-0.03)
      expect(x).toBeLessThan(0.03)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/rng.test.ts`
Expected: FAIL, cannot resolve `./rng`.

- [ ] **Step 3: Write `src/engine/rng.ts`**

```ts
export type Rng = () => number

/** Seeded PRNG (mulberry32). Returns a function yielding floats in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function uniform(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min)
}
```

- [ ] **Step 4: Run the test and the linter**

Run: `npx vitest run src/engine/rng.test.ts`
Expected: PASS, 6 tests.

Run: `npm run lint`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add seeded random generator"
```

---

### Task 4: chem-data schemas and institution denylist

**Files:**
- Create: `src/chem-data/schema.ts`, `src/chem-data/denylist.ts`
- Test: `src/chem-data/schema.test.ts`, `src/chem-data/denylist.test.ts`

**Interfaces:**
- Consumes: `zod`.
- Produces:
  - `cited(valueSchema)` → schema for `{ value, sourceId }`; `param(valueSchema)` → schema for `{ value, rationale }`.
  - `sourceSchema`, `speciesSchema`, `reagentSchema`, `observationSchema`, `stationSchema`, `moleculeSchema`, `registrySchema`.
  - Types `Source`, `Species`, `Reagent`, `Observation`, `Station`, `Molecule`, `Registry` (each `z.infer` of its schema).
  - `findName(text: string, names: readonly string[]): string | null`
  - `findInstitutionText(text: string, names: readonly string[]): string | null` (returns a reason string, or `null` when the text is clean).

Phase 1 defines the fields the validator needs. Phase 2 adds MO diagrams and experimental geometry to `Molecule`; phase 4 adds equations, tool outcomes, palette species, and hints to `Station`.

- [ ] **Step 1: Write the failing denylist test, `src/chem-data/denylist.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { findInstitutionText, findName } from './denylist'

describe('findInstitutionText', () => {
  it.each([
    'room temperature',
    'building block',
    'CID 962',
    'CAS 7732',
    'NIST 2022',
    'at 298 K',
    'about 800 nm',
    'computed model (MMFF94s, PubChem3D)',
    'shelf life of 2 years',
    'White BaSO4; liquid stays blue',
  ])('passes legitimate text: %s', (text) => {
    expect(findInstitutionText(text, [])).toBeNull()
  })

  it.each(['Room 214', 'CHEM 1411', 'CHEM1411', 'cabinet B3', 'Stored in stockroom 4', 'building C-12'])(
    'flags institution-specific text: %s',
    (text) => {
      expect(findInstitutionText(text, [])).not.toBeNull()
    },
  )

  it('flags a configured name, ignoring case', () => {
    expect(findInstitutionText('as done at Example State College', ['example state'])).toContain('example state')
  })
})

describe('findName', () => {
  it('checks names only', () => {
    expect(findName('Room 214', [])).toBeNull()
    expect(findName('Example State lab manual', ['Example State'])).not.toBeNull()
  })

  it('ignores empty names', () => {
    expect(findName('anything', ['', '  '])).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/chem-data/denylist.test.ts`
Expected: FAIL, cannot resolve `./denylist`.

- [ ] **Step 3: Write `src/chem-data/denylist.ts`**

```ts
// A location word followed by a number or a letter-number code: "Room 214", "cabinet B3".
const LOCATION = /\b(room|building|cabinet|shelf|stockroom)\s+(?=[A-Za-z-]*\d)[A-Za-z0-9-]+/i

// A course-number shape: two to four capital letters, then three or four digits.
// ponytail: capitals only, so "at 298 K" passes; a lower-case course code would slip
// through. Add the code to the names list if that ever matters.
const COURSE = /\b([A-Z]{2,4})\s?(\d{3,4})\b/g
const IDENTIFIER_PREFIXES = new Set(['CID', 'CAS'])

function isYear(digits: string): boolean {
  const n = Number(digits)
  return digits.length === 4 && n >= 1800 && n <= 2099
}

export function findName(text: string, names: readonly string[]): string | null {
  const lower = text.toLowerCase()
  for (const name of names) {
    const needle = name.trim().toLowerCase()
    if (needle && lower.includes(needle)) return `contains the name "${needle}"`
  }
  return null
}

export function findInstitutionText(text: string, names: readonly string[]): string | null {
  const location = LOCATION.exec(text)
  if (location) return `looks like a location ("${location[0]}")`
  for (const match of text.matchAll(COURSE)) {
    const [whole, letters, digits] = match
    if (!letters || !digits) continue
    if (IDENTIFIER_PREFIXES.has(letters) || isYear(digits)) continue
    return `looks like a course number ("${whole}")`
  }
  return findName(text, names)
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/chem-data/denylist.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing schema test, `src/chem-data/schema.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { cited, moleculeSchema, param, reagentSchema, sourceSchema } from './schema'

const hazards = { signalWord: 'Danger', statements: ['Causes severe skin burns'], note: 'Dilute.', sourceId: 's1' }

describe('cited and param', () => {
  it('cited requires a sourceId', () => {
    const schema = cited(z.number())
    expect(schema.safeParse({ value: 1, sourceId: 's1' }).success).toBe(true)
    expect(schema.safeParse({ value: 1 }).success).toBe(false)
    expect(schema.safeParse({ value: 1, sourceId: '' }).success).toBe(false)
  })

  it('param requires a rationale', () => {
    const schema = param(z.number())
    expect(schema.safeParse({ value: 1, rationale: 'tuned' }).success).toBe(true)
    expect(schema.safeParse({ value: 1 }).success).toBe(false)
  })
})

describe('sourceSchema', () => {
  it('requires an http(s) url', () => {
    expect(sourceSchema.safeParse({ id: 's1', url: 'https://example.org', citation: 'Example' }).success).toBe(true)
    expect(sourceSchema.safeParse({ id: 's1', url: 'example.org', citation: 'Example' }).success).toBe(false)
  })
})

describe('reagentSchema', () => {
  const solution = {
    id: 'naoh-1m',
    name: 'Sodium hydroxide',
    formula: 'NaOH',
    pubchemCid: 14798,
    form: 'solution',
    molarity: 1,
    ions: [{ speciesId: 'na', ratio: 1 }],
    hazards,
    sourceId: 's1',
  }

  it('accepts a solution with a molarity', () => {
    expect(reagentSchema.safeParse(solution).success).toBe(true)
  })

  it('rejects a reagent with no sourceId', () => {
    expect(reagentSchema.safeParse({ ...solution, sourceId: undefined }).success).toBe(false)
  })

  it('rejects a solution with no molarity', () => {
    expect(reagentSchema.safeParse({ ...solution, molarity: undefined }).success).toBe(false)
  })

  it('requires molar mass and appearance for a solid', () => {
    const solid = { ...solution, id: 'caco3', form: 'solid', molarity: undefined }
    expect(reagentSchema.safeParse(solid).success).toBe(false)
    const complete = {
      ...solid,
      molarMass: { value: 100.09, sourceId: 's1' },
      appearance: { value: 'white powder', sourceId: 's1' },
    }
    expect(reagentSchema.safeParse(complete).success).toBe(true)
  })
})

describe('moleculeSchema', () => {
  it('rejects an unknown geometry source', () => {
    const molecule = {
      id: 'h2',
      name: 'Hydrogen',
      pubchemCid: 783,
      topic: 'basics',
      atoms: [
        { element: 'H', position: [0, 0, 0], position2d: [0, 0], formalCharge: 0, lonePairs: 0 },
        { element: 'H', position: [0.74, 0, 0], position2d: [1, 0], formalCharge: 0, lonePairs: 0 },
      ],
      bonds: [{ a: 0, b: 1, order: 1, aromatic: false }],
      geometrySource: 'guessed',
      sourceId: 's1',
    }
    expect(moleculeSchema.safeParse(molecule).success).toBe(false)
    expect(moleculeSchema.safeParse({ ...molecule, geometrySource: 'cited-experimental' }).success).toBe(true)
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/chem-data/schema.test.ts`
Expected: FAIL, cannot resolve `./schema`.

- [ ] **Step 7: Write `src/chem-data/schema.ts`**

```ts
import { z } from 'zod'

const id = z.string().min(1)
const text = z.string().min(1)

/** An individually cited value: `{ value, sourceId }`. */
export const cited = <T extends z.ZodType>(value: T) => z.object({ value, sourceId: id })

/** A model parameter, exempt from citation: `{ value, rationale }`. */
export const param = <T extends z.ZodType>(value: T) => z.object({ value, rationale: text })

export const sourceSchema = z.object({
  id,
  url: z.string().regex(/^https?:\/\//, 'must be an http(s) URL'),
  citation: text,
})

export const speciesSchema = z.object({
  id,
  formula: text,
  composition: z.record(z.string(), z.number().int().positive()),
  charge: z.number().int(),
  state: z.enum(['aq', 's', 'l', 'g']),
  solutionColor: cited(z.object({ name: text, hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).optional(),
  sourceId: id,
})

const hazardsSchema = z.object({
  signalWord: z.enum(['Danger', 'Warning', 'None']),
  statements: z.array(text),
  note: text,
  sourceId: id,
})

export const reagentSchema = z
  .object({
    id,
    name: text,
    formula: text,
    pubchemCid: z.number().int().positive(),
    form: z.enum(['solution', 'solid', 'metal']),
    molarity: z.number().positive().optional(),
    molarMass: cited(z.number().positive()).optional(),
    appearance: cited(text).optional(),
    ions: z.array(z.object({ speciesId: id, ratio: z.number().int().positive() })),
    hazards: hazardsSchema,
    sourceId: id,
  })
  .superRefine((reagent, ctx) => {
    if (reagent.form === 'solution') {
      if (reagent.molarity === undefined) {
        ctx.addIssue({ code: 'custom', path: ['molarity'], message: 'a solution needs a molarity' })
      }
      return
    }
    if (reagent.molarMass === undefined) {
      ctx.addIssue({ code: 'custom', path: ['molarMass'], message: 'a solid or metal needs a molar mass' })
    }
    if (reagent.appearance === undefined) {
      ctx.addIssue({ code: 'custom', path: ['appearance'], message: 'a solid or metal needs an appearance' })
    }
  })

export const observationSchema = z.object({
  productId: id,
  color: text,
  texture: text.optional(),
  odor: text.optional(),
  sourceId: id,
})

const amountSchema = z.object({ value: z.number().positive(), unit: z.enum(['mL', 'g']) })

export const stationSchema = z.object({
  id,
  reagentIds: z.tuple([id, id]),
  amounts: z.tuple([amountSchema, amountSchema]),
  observationTools: z.array(z.enum(['eye', 'waft', 'litmus', 'touch', 'thermometer', 'splint'])).min(1),
  expected: z.object({
    precipitate: id.nullable(),
    gas: id.nullable(),
    temperature: z.enum(['none', 'warm', 'hot']),
    liquidColor: text,
    odor: text.nullable(),
  }),
  notes: z.array(text),
})

const atomSchema = z.object({
  element: text,
  position: z.tuple([z.number(), z.number(), z.number()]),
  position2d: z.tuple([z.number(), z.number()]),
  formalCharge: z.number().int(),
  lonePairs: z.number().int().min(0),
})

const bondSchema = z.object({
  a: z.number().int().min(0),
  b: z.number().int().min(0),
  order: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  aromatic: z.boolean(),
  resonanceNote: text.optional(),
})

export const moleculeSchema = z.object({
  id,
  name: text,
  pubchemCid: z.number().int().positive(),
  topic: z.enum(['basics', 'vsepr', 'organic', 'biomolecules', 'mechanism']),
  variantGroup: id.optional(),
  variantLabel: text.optional(),
  atoms: z.array(atomSchema).min(1),
  bonds: z.array(bondSchema),
  geometrySource: z.enum(['pubchem-computed', 'ideal-vsepr', 'cited-experimental']),
  sourceId: id,
})

export const registrySchema = z.object({
  sources: z.array(sourceSchema),
  species: z.array(speciesSchema),
  reagents: z.array(reagentSchema),
  observations: z.array(observationSchema),
  stations: z.array(stationSchema),
  molecules: z.array(moleculeSchema),
})

export type Source = z.infer<typeof sourceSchema>
export type Species = z.infer<typeof speciesSchema>
export type Reagent = z.infer<typeof reagentSchema>
export type Observation = z.infer<typeof observationSchema>
export type Station = z.infer<typeof stationSchema>
export type Molecule = z.infer<typeof moleculeSchema>
export type Registry = z.infer<typeof registrySchema>
```

- [ ] **Step 8: Run the tests, type check, and lint**

Run: `npx vitest run src/chem-data`
Expected: PASS, both files.

Run: `npm run typecheck && npm run lint`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add chem-data schemas and institution denylist"
```

---

### Task 5: chem-data validator and registry

**Files:**
- Create: `src/chem-data/validate.ts`, `src/chem-data/sources.json`, `src/chem-data/registry.ts`
- Test: `src/chem-data/validate.test.ts`, `src/chem-data/registry.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `registrySchema`, `Registry` from `./schema`; `findInstitutionText`, `findName` from `./denylist`.
- Produces:
  - `validateRegistry(input: unknown, options?: { institutionNames?: readonly string[] }): string[]` (empty array means valid; never throws).
  - `registry` (the real data, from `./registry`), with `registry.sources` used by the About page.

The four failure conditions come from spec 5.1: (1) a missing or unknown source, (2) a dangling ID reference, (3) coordinates that look like a 2D drawing, (4) institution-specific text.

Spec 5.1 also has the validator cover `src/mechanisms/` and lab primers. Neither exists yet; phase 5 and phase 3 extend the registry and reuse `findInstitutionText` when they add that text.

- [ ] **Step 1: Write the failing test, `src/chem-data/validate.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { validateRegistry } from './validate'

const hazards = { signalWord: 'Warning', statements: ['Harmful if swallowed'], note: 'Dilute solution.', sourceId: 's1' }

function validRegistry() {
  return {
    sources: [{ id: 's1', url: 'https://pubchem.ncbi.nlm.nih.gov/', citation: 'PubChem' }],
    species: [
      { id: 'ba', formula: 'Ba2+', composition: { Ba: 1 }, charge: 2, state: 'aq', sourceId: 's1' },
      { id: 'cl', formula: 'Cl-', composition: { Cl: 1 }, charge: -1, state: 'aq', sourceId: 's1' },
      {
        id: 'cu',
        formula: 'Cu2+',
        composition: { Cu: 1 },
        charge: 2,
        state: 'aq',
        solutionColor: { value: { name: 'blue', hex: '#3b82f6' }, sourceId: 's1' },
        sourceId: 's1',
      },
      { id: 'so4', formula: 'SO4 2-', composition: { S: 1, O: 4 }, charge: -2, state: 'aq', sourceId: 's1' },
      { id: 'baso4', formula: 'BaSO4', composition: { Ba: 1, S: 1, O: 4 }, charge: 0, state: 's', sourceId: 's1' },
    ],
    reagents: [
      {
        id: 'bacl2-0.5m',
        name: 'Barium chloride',
        formula: 'BaCl2',
        pubchemCid: 25204,
        form: 'solution',
        molarity: 0.5,
        ions: [
          { speciesId: 'ba', ratio: 1 },
          { speciesId: 'cl', ratio: 2 },
        ],
        hazards,
        sourceId: 's1',
      },
      {
        id: 'cuso4-0.5m',
        name: 'Copper(II) sulfate',
        formula: 'CuSO4',
        pubchemCid: 24462,
        form: 'solution',
        molarity: 0.5,
        ions: [
          { speciesId: 'cu', ratio: 1 },
          { speciesId: 'so4', ratio: 1 },
        ],
        hazards,
        sourceId: 's1',
      },
    ],
    observations: [{ productId: 'baso4', color: 'white', texture: 'fine powder', sourceId: 's1' }],
    stations: [
      {
        id: 'aq-04',
        reagentIds: ['bacl2-0.5m', 'cuso4-0.5m'],
        amounts: [
          { value: 2, unit: 'mL' },
          { value: 2, unit: 'mL' },
        ],
        observationTools: ['eye'],
        expected: { precipitate: 'baso4', gas: null, temperature: 'none', liquidColor: 'blue', odor: null },
        notes: ['Spectator ions keep their colour at room temperature.'],
      },
    ],
    molecules: [
      {
        id: 'water',
        name: 'Water',
        pubchemCid: 962,
        topic: 'basics',
        atoms: [
          { element: 'O', position: [0, 0, 0], position2d: [0, 0], formalCharge: 0, lonePairs: 2 },
          { element: 'H', position: [0.757, 0.586, 0], position2d: [1, 0.5], formalCharge: 0, lonePairs: 0 },
          { element: 'H', position: [-0.757, 0.586, 0], position2d: [-1, 0.5], formalCharge: 0, lonePairs: 0 },
        ],
        bonds: [
          { a: 0, b: 1, order: 1, aromatic: false },
          { a: 0, b: 2, order: 1, aromatic: false },
        ],
        geometrySource: 'cited-experimental',
        sourceId: 's1',
      },
    ],
  }
}

describe('validateRegistry', () => {
  it('accepts a valid registry', () => {
    expect(validateRegistry(validRegistry())).toEqual([])
  })

  it('accepts an empty registry', () => {
    const empty = { sources: [], species: [], reagents: [], observations: [], stations: [], molecules: [] }
    expect(validateRegistry(empty)).toEqual([])
  })

  describe('never throws on malformed input', () => {
    it.each([null, 42, 'registry', [], {}, { sources: 'nope' }])('returns schema errors for %j', (input) => {
      const errors = validateRegistry(input)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.every((e) => e.startsWith('schema:'))).toBe(true)
    })
  })

  describe('condition 1: sources', () => {
    it('rejects a record with no sourceId', () => {
      const r = validRegistry()
      delete (r.species[0] as { sourceId?: string }).sourceId
      expect(validateRegistry(r).join('\n')).toMatch(/schema: species\.0\.sourceId/)
    })

    it('rejects a sourceId that does not exist', () => {
      const r = validRegistry()
      r.reagents[0]!.sourceId = 'missing'
      expect(validateRegistry(r)).toContain('registry.reagents[0].sourceId: unknown source "missing"')
    })

    it('rejects an unknown sourceId on an individually cited value', () => {
      const r = validRegistry()
      r.species[2]!.solutionColor!.sourceId = 'nope'
      expect(validateRegistry(r)).toContain('registry.species[2].solutionColor.sourceId: unknown source "nope"')
    })

    it('rejects duplicate source ids', () => {
      const r = validRegistry()
      r.sources.push({ ...r.sources[0]! })
      expect(validateRegistry(r)).toContain('sources: duplicate id "s1"')
    })
  })

  describe('condition 2: references', () => {
    it('rejects a station that names an unknown reagent', () => {
      const r = validRegistry()
      r.stations[0]!.reagentIds[1] = 'ghost'
      expect(validateRegistry(r)).toContain('station "aq-04": unknown reagent "ghost"')
    })

    it('rejects a station whose expected precipitate is unknown', () => {
      const r = validRegistry()
      r.stations[0]!.expected.precipitate = 'ghost'
      expect(validateRegistry(r)).toContain('station "aq-04": unknown species "ghost"')
    })

    it('rejects a reagent that releases an unknown ion', () => {
      const r = validRegistry()
      r.reagents[0]!.ions[0]!.speciesId = 'ghost'
      expect(validateRegistry(r)).toContain('reagent "bacl2-0.5m": unknown species "ghost"')
    })

    it('rejects an observation for an unknown product', () => {
      const r = validRegistry()
      r.observations[0]!.productId = 'ghost'
      expect(validateRegistry(r)).toContain('observation: unknown species "ghost"')
    })

    it('rejects duplicate ids within a collection', () => {
      const r = validRegistry()
      r.species.push({ ...r.species[0]! })
      expect(validateRegistry(r)).toContain('species: duplicate id "ba"')
    })
  })

  describe('condition 3: 2D-looking coordinates', () => {
    it('rejects a bond to hydrogen shorter than 0.80 Å', () => {
      const r = validRegistry()
      r.molecules[0]!.atoms[1]!.position = [0.5, 0, 0]
      expect(validateRegistry(r).join('\n')).toMatch(/molecule "water": bond 0-1 is 0\.500 Å/)
    })

    it('rejects a bond between heavy atoms shorter than 1.05 Å', () => {
      const r = validRegistry()
      const m = r.molecules[0]!
      m.atoms.push({ element: 'O', position: [1, 0, 0], position2d: [1, 0], formalCharge: 0, lonePairs: 2 })
      m.bonds.push({ a: 0, b: 3, order: 1, aromatic: false })
      expect(validateRegistry(r).join('\n')).toMatch(/molecule "water": bond 0-3 is 1\.000 Å/)
    })

    it('rejects a bond that points at a missing atom', () => {
      const r = validRegistry()
      r.molecules[0]!.bonds[0]!.b = 9
      expect(validateRegistry(r)).toContain('molecule "water": bond 0-9 refers to a missing atom')
    })

    it('accepts a linear molecule with every z equal to 0', () => {
      const r = validRegistry()
      r.molecules.push({
        id: 'co2',
        name: 'Carbon dioxide',
        pubchemCid: 280,
        topic: 'basics',
        atoms: [
          { element: 'C', position: [0, 0, 0], position2d: [0, 0], formalCharge: 0, lonePairs: 0 },
          { element: 'O', position: [1.162, 0, 0], position2d: [1, 0], formalCharge: 0, lonePairs: 2 },
          { element: 'O', position: [-1.162, 0, 0], position2d: [-1, 0], formalCharge: 0, lonePairs: 2 },
        ],
        bonds: [
          { a: 0, b: 1, order: 1, aromatic: false },
          { a: 0, b: 2, order: 1, aromatic: false },
        ],
        geometrySource: 'cited-experimental',
        sourceId: 's1',
      })
      expect(validateRegistry(r)).toEqual([])
    })
  })

  describe('condition 4: institution-specific text', () => {
    it('rejects a location in a note', () => {
      const r = validRegistry()
      r.stations[0]!.notes.push('Reagents are kept in Room 214.')
      expect(validateRegistry(r).join('\n')).toMatch(/registry\.stations\[0\]\.notes\[1\]: looks like a location/)
    })

    it('rejects a course number in a name', () => {
      const r = validRegistry()
      r.reagents[0]!.name = 'Barium chloride for CHEM 1411'
      expect(validateRegistry(r).join('\n')).toMatch(/registry\.reagents\[0\]\.name: looks like a course number/)
    })

    it('rejects a configured institution name, including in a citation', () => {
      const r = validRegistry()
      r.sources[0]!.citation = 'Example State lab manual'
      const errors = validateRegistry(r, { institutionNames: ['Example State'] })
      expect(errors.join('\n')).toMatch(/registry\.sources\[0\]\.citation: contains the name/)
    })

    it('does not apply the location and course patterns to citations or ids', () => {
      const r = validRegistry()
      r.sources[0]!.citation = 'NIST SRD 101, release 22'
      expect(validateRegistry(r)).toEqual([])
    })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/chem-data/validate.test.ts`
Expected: FAIL, cannot resolve `./validate`.

- [ ] **Step 3: Write `src/chem-data/validate.ts`**

```ts
import { findInstitutionText, findName } from './denylist'
import { registrySchema, type Registry } from './schema'

export interface ValidateOptions {
  institutionNames?: readonly string[]
}

// Keys whose strings are identifiers or codes, not prose.
const CODE_KEYS = new Set(['id', 'formula', 'hex', 'element', 'unit', 'precipitate', 'gas', 'variantGroup'])
const isProseKey = (key: string) => !CODE_KEYS.has(key) && !/Ids?$/.test(key)

type Visit = (key: string, text: string, path: string) => void

function walkStrings(value: unknown, key: string, path: string, visit: Visit): void {
  if (typeof value === 'string') {
    visit(key, value, path)
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => walkStrings(item, key, `${path}[${i}]`, visit))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walkStrings(v, k, `${path}.${k}`, visit)
  }
}

function duplicates(ids: readonly string[], label: string): string[] {
  const seen = new Set<string>()
  const errors: string[] = []
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${label}: duplicate id "${id}"`)
    seen.add(id)
  }
  return errors
}

function checkSources(registry: Registry): string[] {
  const errors = duplicates(
    registry.sources.map((s) => s.id),
    'sources',
  )
  const known = new Set(registry.sources.map((s) => s.id))
  walkStrings(registry, '', 'registry', (key, text, path) => {
    if (key === 'sourceId' && !known.has(text)) errors.push(`${path}: unknown source "${text}"`)
  })
  return errors
}

function checkReferences(registry: Registry): string[] {
  const errors = [
    ...duplicates(registry.species.map((s) => s.id), 'species'),
    ...duplicates(registry.reagents.map((r) => r.id), 'reagents'),
    ...duplicates(registry.stations.map((s) => s.id), 'stations'),
    ...duplicates(registry.molecules.map((m) => m.id), 'molecules'),
  ]
  const species = new Set(registry.species.map((s) => s.id))
  const reagents = new Set(registry.reagents.map((r) => r.id))

  for (const reagent of registry.reagents) {
    for (const ion of reagent.ions) {
      if (!species.has(ion.speciesId)) errors.push(`reagent "${reagent.id}": unknown species "${ion.speciesId}"`)
    }
  }
  for (const observation of registry.observations) {
    if (!species.has(observation.productId)) errors.push(`observation: unknown species "${observation.productId}"`)
  }
  for (const station of registry.stations) {
    for (const reagentId of station.reagentIds) {
      if (!reagents.has(reagentId)) errors.push(`station "${station.id}": unknown reagent "${reagentId}"`)
    }
    for (const productId of [station.expected.precipitate, station.expected.gas]) {
      if (productId !== null && !species.has(productId)) {
        errors.push(`station "${station.id}": unknown species "${productId}"`)
      }
    }
  }
  return errors
}

// A PubChem 2D drawing has unit-length heavy-atom bonds and shorter bonds to H.
const MIN_BOND_TO_H = 0.8
const MIN_HEAVY_BOND = 1.05

function checkGeometry(registry: Registry): string[] {
  const errors: string[] = []
  for (const molecule of registry.molecules) {
    for (const bond of molecule.bonds) {
      const a = molecule.atoms[bond.a]
      const b = molecule.atoms[bond.b]
      const label = `molecule "${molecule.id}": bond ${bond.a}-${bond.b}`
      if (!a || !b || bond.a === bond.b) {
        errors.push(`${label} refers to a missing atom`)
        continue
      }
      const length = Math.hypot(
        a.position[0] - b.position[0],
        a.position[1] - b.position[1],
        a.position[2] - b.position[2],
      )
      const minimum = a.element === 'H' || b.element === 'H' ? MIN_BOND_TO_H : MIN_HEAVY_BOND
      if (length < minimum) {
        errors.push(`${label} is ${length.toFixed(3)} Å, shorter than ${minimum} Å (looks like a 2D drawing)`)
      }
    }
  }
  return errors
}

function checkProse(registry: Registry, names: readonly string[]): string[] {
  const errors: string[] = []
  walkStrings(registry, '', 'registry', (key, text, path) => {
    // Citations and URLs legitimately contain codes and years: check names only.
    const reason =
      key === 'citation' || key === 'url'
        ? findName(text, names)
        : isProseKey(key)
          ? findInstitutionText(text, names)
          : null
    if (reason) errors.push(`${path}: ${reason}`)
  })
  return errors
}

/** Returns a list of problems; an empty list means the registry is valid. Never throws. */
export function validateRegistry(input: unknown, options: ValidateOptions = {}): string[] {
  const parsed = registrySchema.safeParse(input)
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => `schema: ${issue.path.map(String).join('.')}: ${issue.message}`)
  }
  const registry = parsed.data
  return [
    ...checkSources(registry),
    ...checkReferences(registry),
    ...checkGeometry(registry),
    ...checkProse(registry, options.institutionNames ?? []),
  ]
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/chem-data/validate.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Create the real registry**

`src/chem-data/sources.json`:

```json
[]
```

`src/chem-data/registry.ts`:

```ts
import type { Registry } from './schema'
import sources from './sources.json'

// The real curated data. Later phases add molecules, reagents, and stations.
export const registry: Registry = {
  sources,
  species: [],
  reagents: [],
  observations: [],
  stations: [],
  molecules: [],
}
```

- [ ] **Step 6: Write `src/chem-data/registry.test.ts`**

This is the check that runs "in tests and in the build" (`npm run build` runs the tests first). Institution names come from an untracked local file so they never enter the public repo.

```ts
import { describe, expect, it } from 'vitest'
import { registry } from './registry'
import { validateRegistry } from './validate'

// Optional, untracked: src/chem-data/denylist.local.json, a JSON array of names
// (for example ["Example State"]). Absent on a fresh clone, which is fine.
const local = import.meta.glob<string[]>('./denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

describe('the real chem-data registry', () => {
  it('passes validation', () => {
    expect(validateRegistry(registry, { institutionNames })).toEqual([])
  })
})
```

- [ ] **Step 7: Ignore the local denylist file**

Append to `.gitignore`:

```
src/chem-data/denylist.local.json
```

- [ ] **Step 8: Run everything**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all test files pass; no type or lint output.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add chem-data validator and empty registry"
```

---

### Task 6: Progress storage

**Files:**
- Create: `src/app/progress/storage.ts`
- Test: `src/app/progress/storage.test.ts`

**Interfaces:**
- Consumes: `zod`.
- Produces:
  - `interface KeyValueStore { readonly length: number; key(index: number): string | null; getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }` (`window.localStorage` satisfies it).
  - `createMemoryStore(): KeyValueStore`
  - `browserStore(): { store: KeyValueStore; persistent: boolean }`
  - `ENTRY = { prefs: 'prefs', titration: 'lab:titration', aqueous: 'lab:aqueous', mechanism: 'mechanism:hcl-nahco3' }`
  - `loadEntry<T>(store: KeyValueStore, name: string, version: number, schema: z.ZodType<T>): T | null`
  - `saveEntry(store: KeyValueStore, name: string, version: number, data: unknown): boolean`
  - `type ActivityStatus = 'not-started' | 'in-progress' | 'completed'`
  - `peekStatus(store: KeyValueStore, name: string): ActivityStatus`
  - `exportAll(store: KeyValueStore): string`
  - `clearAll(store: KeyValueStore): void`

Every key is prefixed `valence:`. Each entry is stored as `{ "version": n, "data": ... }`. Backups go under `valence:backup:<name>`.

- [ ] **Step 1: Write the failing test, `src/app/progress/storage.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  browserStore,
  clearAll,
  createMemoryStore,
  exportAll,
  loadEntry,
  peekStatus,
  saveEntry,
  type KeyValueStore,
} from './storage'

const schema = z.object({ status: z.enum(['in-progress', 'completed']), seed: z.number() })

function fullStore(): KeyValueStore {
  const store = createMemoryStore()
  return {
    ...store,
    get length() {
      return store.length
    },
    setItem() {
      throw new Error('QuotaExceededError')
    },
  }
}

describe('saveEntry and loadEntry', () => {
  it('round-trips an entry, as a page reload would', () => {
    const store = createMemoryStore()
    expect(saveEntry(store, 'lab:titration', 1, { status: 'in-progress', seed: 42 })).toBe(true)
    expect(loadEntry(store, 'lab:titration', 1, schema)).toEqual({ status: 'in-progress', seed: 42 })
  })

  it('returns null for an entry that was never saved', () => {
    expect(loadEntry(createMemoryStore(), 'lab:titration', 1, schema)).toBeNull()
  })

  it('stores under the valence: prefix in a versioned envelope', () => {
    const store = createMemoryStore()
    saveEntry(store, 'prefs', 3, { a: 1 })
    expect(JSON.parse(store.getItem('valence:prefs') ?? '')).toEqual({ version: 3, data: { a: 1 } })
  })

  it.each([
    ['unparseable JSON', '{not json'],
    ['a missing envelope', '"just a string"'],
    ['an unknown version', JSON.stringify({ version: 99, data: { status: 'completed', seed: 1 } })],
    ['data of the wrong shape', JSON.stringify({ version: 1, data: { status: 'purple' } })],
  ])('starts fresh and keeps a backup for %s', (_label, raw) => {
    const store = createMemoryStore()
    store.setItem('valence:lab:titration', raw)
    expect(loadEntry(store, 'lab:titration', 1, schema)).toBeNull()
    expect(store.getItem('valence:lab:titration')).toBeNull()
    expect(store.getItem('valence:backup:lab:titration')).toBe(raw)
  })

  it('resets only the broken entry', () => {
    const store = createMemoryStore()
    saveEntry(store, 'lab:aqueous', 1, { status: 'completed', seed: 7 })
    store.setItem('valence:lab:titration', '{not json')
    loadEntry(store, 'lab:titration', 1, schema)
    expect(loadEntry(store, 'lab:aqueous', 1, schema)).toEqual({ status: 'completed', seed: 7 })
  })

  it('returns false instead of throwing when storage is full', () => {
    expect(saveEntry(fullStore(), 'prefs', 1, { a: 1 })).toBe(false)
  })

  it('does not throw when a broken entry cannot be backed up', () => {
    const store = createMemoryStore()
    store.setItem('valence:lab:titration', '{not json')
    const full: KeyValueStore = { ...fullStore(), getItem: (k) => store.getItem(k) }
    expect(loadEntry(full, 'lab:titration', 1, schema)).toBeNull()
  })
})

describe('peekStatus', () => {
  it('reports not-started when there is no entry or it is unreadable', () => {
    const store = createMemoryStore()
    expect(peekStatus(store, 'lab:titration')).toBe('not-started')
    store.setItem('valence:lab:titration', '{not json')
    expect(peekStatus(store, 'lab:titration')).toBe('not-started')
    expect(store.getItem('valence:lab:titration')).toBe('{not json')
  })

  it('reports the stored status', () => {
    const store = createMemoryStore()
    saveEntry(store, 'lab:titration', 1, { status: 'completed' })
    expect(peekStatus(store, 'lab:titration')).toBe('completed')
    saveEntry(store, 'lab:aqueous', 1, { seed: 3 })
    expect(peekStatus(store, 'lab:aqueous')).toBe('in-progress')
  })
})

describe('exportAll and clearAll', () => {
  it('exports only valence entries, parsed where possible', () => {
    const store = createMemoryStore()
    store.setItem('other-app', 'x')
    saveEntry(store, 'prefs', 1, { darkMode: 'on' })
    store.setItem('valence:backup:lab:titration', '{not json')
    expect(JSON.parse(exportAll(store))).toEqual({
      'valence:prefs': { version: 1, data: { darkMode: 'on' } },
      'valence:backup:lab:titration': '{not json',
    })
  })

  it('clears every valence entry and nothing else', () => {
    const store = createMemoryStore()
    store.setItem('other-app', 'x')
    saveEntry(store, 'prefs', 1, {})
    saveEntry(store, 'lab:titration', 1, {})
    store.setItem('valence:backup:lab:aqueous', 'old')
    clearAll(store)
    expect(store.length).toBe(1)
    expect(store.getItem('other-app')).toBe('x')
  })
})

describe('browserStore', () => {
  it('falls back to a working in-memory store when localStorage is unavailable', () => {
    // In the node test environment there is no window at all.
    const { store, persistent } = browserStore()
    expect(persistent).toBe(false)
    expect(saveEntry(store, 'prefs', 1, { a: 1 })).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/app/progress/storage.test.ts`
Expected: FAIL, cannot resolve `./storage`.

- [ ] **Step 3: Write `src/app/progress/storage.ts`**

```ts
import { z } from 'zod'

export interface KeyValueStore {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const ENTRY = {
  prefs: 'prefs',
  titration: 'lab:titration',
  aqueous: 'lab:aqueous',
  mechanism: 'mechanism:hcl-nahco3',
} as const

export type ActivityStatus = 'not-started' | 'in-progress' | 'completed'

const PREFIX = 'valence:'
const BACKUP_PREFIX = 'valence:backup:'
const envelopeSchema = z.object({ version: z.number(), data: z.unknown() })

export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

/** localStorage when it works; otherwise an in-memory store for this session only. */
export function browserStore(): { store: KeyValueStore; persistent: boolean } {
  try {
    const store = window.localStorage
    const probe = `${PREFIX}probe`
    store.setItem(probe, '1')
    store.removeItem(probe)
    return { store, persistent: true }
  } catch {
    return { store: createMemoryStore(), persistent: false }
  }
}

export function saveEntry(store: KeyValueStore, name: string, version: number, data: unknown): boolean {
  try {
    store.setItem(PREFIX + name, JSON.stringify({ version, data }))
    return true
  } catch {
    return false
  }
}

/**
 * Returns the entry's data, or null if it is absent. An entry that cannot be
 * parsed, has another version, or fails the schema is moved to a backup key
 * (never deleted outright) and null is returned, so the caller starts fresh.
 */
export function loadEntry<T>(store: KeyValueStore, name: string, version: number, schema: z.ZodType<T>): T | null {
  const key = PREFIX + name
  const raw = store.getItem(key)
  if (raw === null) return null
  try {
    const envelope = envelopeSchema.parse(JSON.parse(raw))
    if (envelope.version === version) {
      const data = schema.safeParse(envelope.data)
      if (data.success) return data.data
    }
  } catch {
    // fall through to the backup
  }
  try {
    store.setItem(BACKUP_PREFIX + name, raw)
    store.removeItem(key)
  } catch {
    // Storage is full: leave the bad entry where it is.
  }
  return null
}

/** Reads an activity's status without validating or resetting its entry. */
export function peekStatus(store: KeyValueStore, name: string): ActivityStatus {
  const raw = store.getItem(PREFIX + name)
  if (raw === null) return 'not-started'
  try {
    const envelope = envelopeSchema.parse(JSON.parse(raw))
    const status = z.object({ status: z.string() }).safeParse(envelope.data)
    return status.success && status.data.status === 'completed' ? 'completed' : 'in-progress'
  } catch {
    return 'not-started'
  }
}

function ownKeys(store: KeyValueStore): string[] {
  const keys: string[] = []
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i)
    if (key?.startsWith(PREFIX)) keys.push(key)
  }
  return keys
}

export function exportAll(store: KeyValueStore): string {
  const out: Record<string, unknown> = {}
  for (const key of ownKeys(store)) {
    const raw = store.getItem(key) ?? ''
    try {
      out[key] = JSON.parse(raw)
    } catch {
      out[key] = raw
    }
  }
  return JSON.stringify(out, null, 2)
}

export function clearAll(store: KeyValueStore): void {
  for (const key of ownKeys(store)) store.removeItem(key)
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/app/progress/storage.test.ts`
Expected: PASS, all tests.

Run: `npm run typecheck && npm run lint`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add versioned guest progress storage"
```

---

### Task 7: Preferences and app state

**Files:**
- Create: `src/app/preferences.ts`, `src/app/AppState.tsx`
- Test: `src/app/preferences.test.ts`

**Interfaces:**
- Consumes: `KeyValueStore`, `ENTRY`, `loadEntry`, `saveEntry`, `clearAll`, `browserStore` from `@/app/progress/storage`.
- Produces:
  - `type Tri = 'system' | 'on' | 'off'`
  - `type Prefs = { darkMode: Tri; reducedMotion: Tri; valenceLevel: 1 | 2 | 3 }`
  - `DEFAULT_PREFS: Prefs` (`system`, `system`, `2`)
  - `resolveTri(pref: Tri, system: boolean): boolean`
  - `loadPrefs(store: KeyValueStore): Prefs`, `savePrefs(store: KeyValueStore, prefs: Prefs): boolean`
  - `<AppStateProvider>` and `useAppState(): { store: KeyValueStore; persistent: boolean; prefs: Prefs; updatePrefs(patch: Partial<Prefs>): void; resetAll(): void }`

The provider puts the `dark` class and a `data-reduced-motion` attribute on `<html>`.

- [ ] **Step 1: Write the failing test, `src/app/preferences.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, loadPrefs, resolveTri, savePrefs } from './preferences'
import { createMemoryStore } from './progress/storage'

describe('resolveTri', () => {
  it('follows the system when set to system', () => {
    expect(resolveTri('system', true)).toBe(true)
    expect(resolveTri('system', false)).toBe(false)
  })

  it('overrides the system when set to on or off', () => {
    expect(resolveTri('on', false)).toBe(true)
    expect(resolveTri('off', true)).toBe(false)
  })
})

describe('loadPrefs and savePrefs', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(loadPrefs(createMemoryStore())).toEqual(DEFAULT_PREFS)
    expect(DEFAULT_PREFS).toEqual({ darkMode: 'system', reducedMotion: 'system', valenceLevel: 2 })
  })

  it('round-trips saved preferences', () => {
    const store = createMemoryStore()
    const prefs = { darkMode: 'on', reducedMotion: 'off', valenceLevel: 3 } as const
    expect(savePrefs(store, prefs)).toBe(true)
    expect(loadPrefs(store)).toEqual(prefs)
  })

  it('falls back to the defaults when stored preferences have the wrong shape', () => {
    const store = createMemoryStore()
    store.setItem('valence:prefs', JSON.stringify({ version: 1, data: { darkMode: 'purple' } }))
    expect(loadPrefs(store)).toEqual(DEFAULT_PREFS)
    expect(store.getItem('valence:backup:prefs')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/app/preferences.test.ts`
Expected: FAIL, cannot resolve `./preferences`.

- [ ] **Step 3: Write `src/app/preferences.ts`**

```ts
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
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/app/preferences.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write `src/app/AppState.tsx`**

```tsx
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
```

- [ ] **Step 6: Type check and lint**

Run: `npm run typecheck && npm run lint`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add preferences and app state provider"
```

---

### Task 8: App shell and navigation

**Files:**
- Create: `src/app/Layout.tsx`, `src/app/PageHeader.tsx`, `src/app/pages/Home.tsx`, `src/app/pages/Explore.tsx`, `src/app/pages/Lab.tsx`, `src/app/pages/Learn.tsx`, `src/app/pages/NotFound.tsx`
- Modify: `src/main.tsx` (replace entirely)

**Interfaces:**
- Consumes: `AppStateProvider`, `useAppState` from `@/app/AppState`; `ENTRY`, `peekStatus`, `ActivityStatus` from `@/app/progress/storage`; `Button` from `@/components/ui/button`; icons `House`, `Atom`, `FlaskConical`, `GraduationCap`, `Settings`, `Info`, `PanelLeftClose`, `PanelLeftOpen` from `lucide-react`.
- Produces: `<Layout>` (rail + `<Outlet>`), `<PageHeader title="...">`, and routes `/`, `/explore`, `/lab`, `/learn`, plus a not-found page. Task 9 adds `/settings` and `/about` to the router in `src/main.tsx`.

- [ ] **Step 1: Write `src/app/PageHeader.tsx`**

```tsx
import { useEffect } from 'react'
import { Link } from 'react-router'

/** The predictable header on every screen: breadcrumb, then the page's h1. */
export function PageHeader({ title }: { title: string }) {
  useEffect(() => {
    document.title = title === 'Home' ? 'Valence' : `${title} · Valence`
  }, [title])

  return (
    <header className="mb-6">
      {title !== 'Home' && (
        <nav aria-label="Breadcrumb" className="mb-1 text-sm text-muted-foreground">
          <Link to="/" className="underline-offset-4 hover:underline">
            Home
          </Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{title}</span>
        </nav>
      )}
      <h1 className="text-2xl font-semibold">{title}</h1>
    </header>
  )
}
```

- [ ] **Step 2: Write `src/app/Layout.tsx`**

```tsx
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Atom, FlaskConical, GraduationCap, House, Info, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

const NAV = [
  { to: '/', label: 'Home', icon: House },
  { to: '/explore', label: 'Explore', icon: Atom },
  { to: '/lab', label: 'Lab', icon: FlaskConical },
  { to: '/learn', label: 'Learn', icon: GraduationCap },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/about', label: 'About', icon: Info },
]

export function Layout() {
  // The rail starts collapsed on narrow screens.
  const [expanded, setExpanded] = useState(() => window.matchMedia('(min-width: 768px)').matches)

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2"
      >
        Skip to content
      </a>

      <nav
        id="rail"
        aria-label="Main"
        className={`flex shrink-0 flex-col gap-1 border-r bg-sidebar p-2 ${expanded ? 'w-52' : 'w-14'}`}
      >
        <Button
          variant="ghost"
          className="mb-2 justify-start"
          aria-expanded={expanded}
          aria-controls="rail"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}
          <span className={expanded ? '' : 'sr-only'}>{expanded ? 'Collapse menu' : 'Expand menu'}</span>
        </Button>

        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={expanded ? undefined : label}
            className={({ isActive }) =>
              `flex h-9 items-center gap-2 rounded-md px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive ? 'bg-sidebar-accent font-medium' : 'hover:bg-sidebar-accent/60'
              }`
            }
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className={expanded ? '' : 'sr-only'}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <main id="main" tabIndex={-1} className="min-w-0 flex-1 p-6 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Write the pages**

`src/app/pages/Home.tsx`:

```tsx
import { Link } from 'react-router'
import { useAppState } from '@/app/AppState'
import { PageHeader } from '@/app/PageHeader'
import { ENTRY, peekStatus, type ActivityStatus } from '@/app/progress/storage'

const ACTIVITIES = [
  { entry: ENTRY.titration, kind: 'Lab', title: 'Standardization of a base by titration', to: '/lab' },
  { entry: ENTRY.aqueous, kind: 'Lab', title: 'Reactions in aqueous solution', to: '/lab' },
  { entry: ENTRY.mechanism, kind: 'Mechanism', title: 'HCl + NaHCO₃, step by step', to: '/learn' },
]

const STATUS_LABEL: Record<ActivityStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
}

export function Home() {
  const { store } = useAppState()

  return (
    <>
      <PageHeader title="Home" />
      <p className="mb-6 max-w-prose text-muted-foreground">
        Valence is a molecule explorer and virtual general-chemistry lab. No account is needed; your progress is saved
        in this browser.
      </p>
      <ul className="grid max-w-3xl gap-3">
        {ACTIVITIES.map((activity) => (
          <li key={activity.entry} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{activity.kind}</p>
            <Link to={activity.to} className="font-medium underline-offset-4 hover:underline">
              {activity.title}
            </Link>
            <p className="mt-1 text-sm">{STATUS_LABEL[peekStatus(store, activity.entry)]}</p>
          </li>
        ))}
      </ul>
    </>
  )
}
```

`src/app/pages/Explore.tsx`:

```tsx
import { PageHeader } from '@/app/PageHeader'

export function Explore() {
  return (
    <>
      <PageHeader title="Explore" />
      <p className="max-w-prose text-muted-foreground">
        The molecule explorer is not built yet. It will show about 30 molecules in 3D and explain every atom and bond.
      </p>
    </>
  )
}
```

`src/app/pages/Lab.tsx`:

```tsx
import { PageHeader } from '@/app/PageHeader'

export function Lab() {
  return (
    <>
      <PageHeader title="Lab" />
      <p className="max-w-prose text-muted-foreground">
        The labs are not built yet. Two are planned first: standardization of a base by titration, and ten reactions in
        aqueous solution.
      </p>
    </>
  )
}
```

`src/app/pages/Learn.tsx`:

```tsx
import { PageHeader } from '@/app/PageHeader'

export function Learn() {
  return (
    <>
      <PageHeader title="Learn" />
      <p className="max-w-prose text-muted-foreground">
        The mechanism timeline is not built yet. The first one will follow hydrochloric acid reacting with sodium
        bicarbonate, step by step.
      </p>
    </>
  )
}
```

`src/app/pages/NotFound.tsx`:

```tsx
import { Link } from 'react-router'
import { PageHeader } from '@/app/PageHeader'

export function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <p className="max-w-prose text-muted-foreground">
        There is nothing at this address.{' '}
        <Link to="/" className="underline underline-offset-4">
          Go to the home page
        </Link>
        .
      </p>
    </>
  )
}
```

- [ ] **Step 4: Replace `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import './index.css'
import { AppStateProvider } from '@/app/AppState'
import { Layout } from '@/app/Layout'
import { Explore } from '@/app/pages/Explore'
import { Home } from '@/app/pages/Home'
import { Lab } from '@/app/pages/Lab'
import { Learn } from '@/app/pages/Learn'
import { NotFound } from '@/app/pages/NotFound'

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'explore', element: <Explore /> },
      { path: 'lab', element: <Lab /> },
      { path: 'learn', element: <Learn /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

const root = document.getElementById('root')
if (!root) throw new Error('missing #root')

createRoot(root).render(
  <StrictMode>
    <AppStateProvider>
      <RouterProvider router={router} />
    </AppStateProvider>
  </StrictMode>,
)
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint && npm test`
Expected: no type or lint output; all tests pass.

Run: `npm run dev` and open the printed URL.
Expected, checked by hand:
- The rail shows Home, Explore, Lab, Learn, Settings, About; the current page is highlighted.
- Clicking Explore changes the address to end in `#/explore` and the browser tab title to "Explore · Valence".
- The collapse button narrows the rail to icons only.
- Typing a nonsense address such as `#/nope` shows "Page not found".
- Settings and About show "Page not found" for now (Task 9 adds them).

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add app shell, navigation rail, and placeholder pages"
```

---

### Task 9: Settings and About pages

**Files:**
- Create: `src/app/pages/Settings.tsx`, `src/app/pages/About.tsx`
- Modify: `src/main.tsx` (add two imports and two routes)

**Interfaces:**
- Consumes: `useAppState` (`prefs`, `updatePrefs`, `resetAll`, `store`, `persistent`); `exportAll` from `@/app/progress/storage`; `Tri`, `Prefs` from `@/app/preferences`; `registry` from `@/chem-data/registry`; `PageHeader`; `Button`.
- Produces: routes `/settings` and `/about`.

- [ ] **Step 1: Write `src/app/pages/Settings.tsx`**

```tsx
import { useId } from 'react'
import { useAppState } from '@/app/AppState'
import { PageHeader } from '@/app/PageHeader'
import type { Prefs, Tri } from '@/app/preferences'
import { exportAll } from '@/app/progress/storage'
import { Button } from '@/components/ui/button'

const SELECT_CLASS = 'h-9 rounded-md border bg-background px-2 text-sm'

function TriSelect({ label, value, onChange }: { label: string; value: Tri; onChange: (value: Tri) => void }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id}>{label}</label>
      <select id={id} className={SELECT_CLASS} value={value} onChange={(e) => onChange(e.target.value as Tri)}>
        <option value="system">System</option>
        <option value="on">On</option>
        <option value="off">Off</option>
      </select>
    </div>
  )
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function Settings() {
  const { store, persistent, prefs, updatePrefs, resetAll } = useAppState()
  const levelId = useId()

  return (
    <>
      <PageHeader title="Settings" />

      {!persistent && (
        <p role="status" className="mb-6 max-w-prose rounded-md border p-3 text-sm">
          This browser is not allowing Valence to save data. Your progress and settings will last only until you close
          this tab.
        </p>
      )}

      <section aria-labelledby="display-heading" className="mb-8 grid max-w-md gap-3">
        <h2 id="display-heading" className="text-lg font-medium">
          Display
        </h2>
        <TriSelect label="Dark mode" value={prefs.darkMode} onChange={(darkMode) => updatePrefs({ darkMode })} />
        <TriSelect
          label="Reduced motion"
          value={prefs.reducedMotion}
          onChange={(reducedMotion) => updatePrefs({ reducedMotion })}
        />
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={levelId}>Valence display level</label>
          <select
            id={levelId}
            className={SELECT_CLASS}
            value={prefs.valenceLevel}
            onChange={(e) => updatePrefs({ valenceLevel: Number(e.target.value) as Prefs['valenceLevel'] })}
          >
            <option value={1}>1: Bohr shells</option>
            <option value={2}>2: Lewis dots</option>
            <option value={3}>3: Orbitals</option>
          </select>
        </div>
        <p className="text-sm text-muted-foreground">System follows your operating system's setting.</p>
      </section>

      <section aria-labelledby="progress-heading" className="grid max-w-md gap-3">
        <h2 id="progress-heading" className="text-lg font-medium">
          My progress
        </h2>
        <p className="text-sm text-muted-foreground">
          Progress is saved only in this browser. On a shared computer, the next person using this browser can see it;
          clear it when you finish.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => download('valence-progress.json', exportAll(store))}>
            Export my progress
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (window.confirm('Clear all Valence progress and settings in this browser? This cannot be undone.')) {
                resetAll()
              }
            }}
          >
            Clear my progress
          </Button>
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 2: Write `src/app/pages/About.tsx`**

```tsx
import { PageHeader } from '@/app/PageHeader'
import { registry } from '@/chem-data/registry'

export function About() {
  return (
    <>
      <PageHeader title="About" />
      <div className="grid max-w-prose gap-6">
        <section aria-labelledby="independence-heading">
          <h2 id="independence-heading" className="mb-1 text-lg font-medium">
            Independent project
          </h2>
          <p>
            Valence is an independent personal project for anyone learning chemistry. It is not an official tool of any
            school, has no connection to any school's systems or student records, and does not replace bench labs or
            laboratory safety training.
          </p>
        </section>

        <section aria-labelledby="privacy-heading">
          <h2 id="privacy-heading" className="mb-1 text-lg font-medium">
            Your data
          </h2>
          <p>
            Valence has no accounts and no server. It collects no personal information and uses no analytics. Your
            progress and settings are stored only in this browser, and you can export or clear them in Settings.
          </p>
        </section>

        <section aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="mb-1 text-lg font-medium">
            Data sources
          </h2>
          <p className="mb-2">
            Every chemistry value in Valence is curated by hand with a cited source and checked by automated tests.
            Where data comes from PubChem, it is provided by the National Library of Medicine without warranty; see the{' '}
            <a
              href="https://www.ncbi.nlm.nih.gov/home/about/policies/"
              className="underline underline-offset-4"
              rel="noreferrer"
            >
              NCBI policies and disclaimers
            </a>
            .
          </p>
          {registry.sources.length === 0 ? (
            <p className="text-muted-foreground">No chemistry data is bundled yet.</p>
          ) : (
            <ul className="list-disc pl-5">
              {registry.sources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} className="underline underline-offset-4" rel="noreferrer">
                    {source.citation}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="licence-heading">
          <h2 id="licence-heading" className="mb-1 text-lg font-medium">
            Licence
          </h2>
          <p>Valence is free software under the MIT licence.</p>
        </section>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Add the routes to `src/main.tsx`**

Add these imports with the other page imports:

```tsx
import { About } from '@/app/pages/About'
import { Settings } from '@/app/pages/Settings'
```

Add these two entries to the `children` array, directly before the `{ path: '*', element: <NotFound /> }` entry:

```tsx
      { path: 'settings', element: <Settings /> },
      { path: 'about', element: <About /> },
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint && npm test`
Expected: no type or lint output; all tests pass.

Run: `npm run dev`, open the app, and check by hand:
- Settings: set Dark mode to On. The page turns dark at once.
- Reload the page. It is still dark and the select still reads On. (This is "progress survives a reload".)
- Set Dark mode back to System; the page follows the operating system.
- Export my progress downloads `valence-progress.json` containing a `valence:prefs` entry.
- Clear my progress asks for confirmation, then all three selects return to their defaults.
- About shows the four sections and "No chemistry data is bundled yet."

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add Settings and About pages"
```

---

### Task 10: Documentation and phase sign-off

**Files:**
- Create: `docs/for-institutions.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the reviewer documentation that is true as of this phase (spec section 12), developer instructions, and the completed hand checklist that spec section 13 requires.

- [ ] **Step 1: Write `docs/for-institutions.md`**

```markdown
# Valence: information for institutional reviewers

Valence is an independent, free project made for any learner. It is not affiliated with any school and there is no vendor relationship: no contract, no account manager, and no support agreement. An institution that chooses to point students to Valence does its own review. This page gives each reviewing department the facts it needs.

Each section states only what is true of the current version. Sections for accessibility services, faculty, and lab safety will be added as the features they describe are built.

## IT and security

- **What it is:** a static website (HTML, CSS, JavaScript). There is no server-side code, database, or API.
- **Install:** none. It runs in a current version of Chrome, Edge, Firefox, or Safari.
- **Accounts:** none. There is no sign-in of any kind.
- **Network:** after the page loads, the app makes no network requests. Fonts and all data are bundled; nothing is loaded from a third-party CDN.
- **Storage:** preferences and learning progress are stored in the browser's `localStorage` under keys beginning `valence:`. Nothing is stored anywhere else.
- **Shared computers:** on a shared browser profile, the next person can see the previous learner's saved progress. Settings has a "Clear my progress" button, and clearing site data in the browser has the same effect.
- **Self-hosting:** run `npm ci && npm run build`, then serve the `dist/` folder from any static web server. No rewrite rules are needed, and it works from a sub-path.
- **Source code:** public under the MIT licence.

## Legal and privacy

- **Personal data:** Valence collects none. It has no accounts, no forms that ask for personal information, no analytics, and no cookies.
- **Data leaving the device:** none. Progress never leaves the learner's browser unless the learner uses "Export my progress" to download their own file.
- **Education records:** because nothing is collected or transmitted, Valence creates and holds no records about any student. Whether and how an institution uses Valence under FERPA or similar rules is the institution's determination; this page states the facts for that review and is not legal advice.
- **Children's privacy (COPPA) and GDPR:** the same facts apply. No personal information is collected from anyone, of any age, in any location.
- **Third-party data:** chemistry data is cited to its sources on the About page.
- **Licence:** MIT.

## Finance and procurement

- **Cost:** free. There are no paid tiers.
- **Licence:** MIT, which permits use, copying, modification, and redistribution, including by institutions.
- **Contract and vendor:** none. There is no company behind Valence, no service-level agreement, and no guaranteed support.
- **Hosting cost if self-hosted:** that of serving a few megabytes of static files.
```

- [ ] **Step 2: Update `README.md`**

Replace the `## Status` section (heading and its body, up to but not including `## v1 scope`) with:

```markdown
## Status

Phase 1 of 5 (foundation) is built: the app shell, themes, guest progress storage, and the chemistry-data validator. The explorer, labs, and mechanism timeline come next.

- [v1 design spec](docs/superpowers/specs/2026-10-03-valence-v1-design.md): what is being built first.
- [Original design document](Chem%20Lab%20Explorer%20-%20Design%20Document.md): the full vision, including labs planned after v1.
- [Information for institutional reviewers](docs/for-institutions.md): IT, privacy, and procurement facts.

## Development

Requires Node 22 or newer.

    npm install
    npm run dev        # start the app locally
    npm test           # run the tests, including chem-data validation
    npm run lint       # architecture rules: chemistry code stays pure and deterministic
    npm run build      # test, type-check, and build to dist/

To have the validator reject specific institution names, create `src/chem-data/denylist.local.json` containing a JSON array of names. The file is ignored by git.
```

- [ ] **Step 3: Run the full automated check**

Run: `npm run lint && npm run build`
Expected: lint prints nothing; the build runs every test (all pass), type-checks, and writes `dist/`.

Run: `npm run preview` and open the printed URL to confirm the production build loads and navigation works. Stop the server.

- [ ] **Step 4: Hand checklist (spec section 13)**

Run `npm run dev` and confirm each item. Fix anything that fails before continuing.

Spec requirements:
- [ ] The home page lists the two labs and the mechanism, each with a status of "Not started".
- [ ] The rail reaches Explore, Lab, and Learn, and collapses and expands.
- [ ] Every page has a breadcrumb (except Home) and one `h1`.
- [ ] Dark mode, reduced motion, and valence display level each persist across a reload.
- [ ] With the operating system set to dark, Dark mode "System" gives a dark page; "Off" gives a light page.
- [ ] Export downloads a JSON file; Clear resets everything after confirmation.
- [ ] At 1366×768 nothing is cut off or scrolls sideways.
- [ ] At a 400 px wide window the rail starts collapsed and pages remain readable.

Keyboard-only walkthrough (do not touch the mouse):
- [ ] Tab from page load: the first stop is "Skip to content"; pressing Enter moves focus to the main area.
- [ ] Every rail link and the collapse button can be reached with Tab and activated with Enter, and each shows a visible focus ring.
- [ ] With the rail collapsed, a screen reader (or the accessibility tree in browser dev tools) still exposes each link's name.
- [ ] On Settings, each select can be changed with the arrow keys, and both buttons work with Enter or Space.
- [ ] The Clear confirmation can be accepted and cancelled from the keyboard.

Private-browsing check:
- [ ] In a browser with site storage blocked for the page, the app still loads and Settings shows the notice that progress cannot be saved.

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "Add reviewer documentation and developer instructions"
git push -u origin phase-1-foundation
```

---

## Done when (spec section 14, phase 1)

- The validator rejects each of its four failure conditions: Task 5 tests, "condition 1" to "condition 4".
- The lint rules reject a React import and a `Math.random` call in `engine/`: Task 2 tests.
- Progress survives a reload: Task 6 round-trip test and the Task 9 and Task 10 hand checks.
