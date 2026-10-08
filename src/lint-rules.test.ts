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

  // The other ways a page can talk to a server: none is used, so none is allowed.
  it.each(['src/engine/x.ts', 'src/chem-data/x.ts', 'src/mechanisms/x.ts', 'src/app/x.tsx', 'src/main.tsx'])(
    'rejects WebSocket, EventSource and navigator.sendBeacon in %s',
    async (filePath) => {
      expect(await ruleIds('export const socket = () => new WebSocket("wss://example.org")\n', filePath)).toEqual(['no-restricted-globals'])
      expect(await ruleIds('export const events = () => new EventSource("/x")\n', filePath)).toEqual(['no-restricted-globals'])
      expect(await ruleIds('export const beacon = () => navigator.sendBeacon("/x")\n', filePath)).toEqual(['no-restricted-properties'])
      expect(await ruleIds('export const beacon = () => { const { sendBeacon } = navigator; return sendBeacon }\n', filePath)).toEqual(['no-restricted-properties'])
    },
  )

  it.each([
    ['WebTransport', '("https://example.org")'],
    ['RTCPeerConnection', '()'],
  ])('rejects %s, the other two scripting APIs that open a connection, bare and through window', async (name, args) => {
    for (const filePath of ['src/engine/x.ts', 'src/chem-data/x.ts', 'src/mechanisms/x.ts', 'src/app/x.tsx', 'src/main.tsx']) {
      expect([filePath, await ruleIds(`export const open = () => new ${name}${args}\n`, filePath)]).toEqual([filePath, ['no-restricted-globals']])
    }
    expect(await ruleIds(`export const open = () => new window.${name}${args}\n`, 'src/app/x.ts')).toEqual(['no-restricted-properties'])
    expect(await ruleIds(`export const open = () => new globalThis.${name}${args}\n`, 'src/engine/x.ts')).toEqual(['no-restricted-properties'])
  })

  it('rejects them when reached through window, globalThis or self in src/app', async () => {
    for (const code of [
      'export const socket = () => new window.WebSocket("wss://example.org")\n',
      'export const socket = () => new globalThis.WebSocket("wss://example.org")\n',
      'export const events = () => new self.EventSource("/x")\n',
      'export const beacon = () => window.navigator.sendBeacon("/x")\n',
      'export const beacon = () => globalThis.navigator.sendBeacon("/x")\n',
    ]) {
      expect([code, await ruleIds(code, 'src/app/x.ts')]).toEqual([code, ['no-restricted-properties']])
    }
  })

  it('still accepts the rest of navigator in src/app', async () => {
    expect(await ruleIds('export const language = () => navigator.language\n', 'src/app/x.ts')).toEqual([])
  })

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

  it('accepts React, the DOM, Math.random, and the clock in src/app', async () => {
    const code = [
      'import { useState } from "react"',
      'export const a = [useState, Math.random(), Date.now(), new Date(), document.title, window.innerWidth]',
      '',
    ].join('\n')
    expect(await ruleIds(code, 'src/app/x.tsx')).toEqual([])
  })

  it('accepts Three.js and React Three Fiber inside a scene folder', async () => {
    const code = [
      'import * as THREE from "three"',
      'import { Canvas } from "@react-three/fiber"',
      'import { OrbitControls } from "three/addons/controls/OrbitControls.js"',
      'import { helper } from "./helper"',
      'export const a = [THREE, Canvas, OrbitControls, helper]',
      '',
    ].join('\n')
    expect(await ruleIds(code, 'src/app/explore/scene/x.tsx')).toEqual([])
    expect(await ruleIds(code, 'src/app/learn/scene/x.test.ts')).toEqual([])
  })

  it.each(['three', 'three/addons/controls/OrbitControls.js', '@react-three/fiber'])(
    'rejects importing %s in src/app outside a scene folder',
    async (source) => {
      const code = `import * as m from "${source}"\nexport const v = m\n`
      expect(await ruleIds(code, 'src/app/pages/x.tsx')).toEqual(['no-restricted-imports'])
      expect(await ruleIds(code, 'src/main.tsx')).toEqual(['no-restricted-imports'])
    },
  )

  it('rejects a static import of a scene module outside a scene folder, but allows type imports and lazy loading', async () => {
    const eager = 'import { MoleculeViewer } from "@/app/explore/scene/MoleculeViewer"\nexport const v = MoleculeViewer\n'
    expect(await ruleIds(eager, 'src/app/pages/x.tsx')).toEqual(['no-restricted-imports'])
    const relative = 'import { MoleculeViewer } from "./scene/MoleculeViewer"\nexport const v = MoleculeViewer\n'
    expect(await ruleIds(relative, 'src/app/explore/x.tsx')).toEqual(['no-restricted-imports'])
    const typeOnly = 'import type { ViewHandle } from "@/app/explore/scene/MoleculeViewer"\nexport type V = ViewHandle\n'
    expect(await ruleIds(typeOnly, 'src/app/pages/x.tsx')).toEqual([])
    const lazy = 'export const load = () => import("@/app/explore/scene/MoleculeViewer")\n'
    expect(await ruleIds(lazy, 'src/app/pages/x.tsx')).toEqual([])
  })

  // The titration engine below its index holds each run's hidden values: the app is given the index only.
  it.each([
    ['@/engine/titration/flask', 'src/app/lab/titration/benchView.ts'],
    ['../../../engine/titration/setup', 'src/app/lab/titration/benchView.ts'],
    ['@/engine/titration/actions', 'src/app/pages/x.tsx'],
    ['@/engine/titration/flask', 'src/app/lab/titration/benchView.test.ts'],
    ['@/engine/titration/pinnedModel', 'src/app/lab/titration/benchView.test.ts'],
    ['@/engine/titration/testkit/internals', 'src/app/lab/titration/benchView.test.ts'],
    ['@/engine/titration/testkit', 'src/app/lab/titration/TitrationBench.tsx'],
    ['@/engine/titration/flask', 'src/app/explore/scene/x.tsx'],
    ['@/engine/titration/flask', 'src/main.tsx'],
    // The aqueous engine below its index works on any tube: the app is given the ten stations only.
    ['@/engine/aqueous/react', 'src/app/lab/aqueous/messages.ts'],
    ['../../../engine/aqueous/state', 'src/app/lab/aqueous/x.tsx'],
    ['@/engine/aqueous/react', 'src/app/lab/aqueous/messages.test.ts'],
    ['@/engine/aqueous/testkit', 'src/app/lab/aqueous/x.tsx'],
  ])('rejects importing %s in %s', async (source, filePath) => {
    expect(await ruleIds(`import * as m from "${source}"\nexport const v = m\n`, filePath)).toEqual(['no-restricted-imports'])
    // A type import is refused too: the types below the index describe the hidden values.
    expect(await ruleIds(`import type * as M from "${source}"\nexport type V = typeof M\n`, filePath)).toEqual(['no-restricted-imports'])
  })

  it.each([
    ['@/engine/titration', 'src/app/lab/titration/benchView.ts'],
    ['../../../engine/titration', 'src/app/lab/titration/benchView.ts'],
    ['@/engine/titration', 'src/app/lab/titration/benchView.test.ts'],
    ['@/engine/titration/testkit', 'src/app/lab/titration/benchView.test.ts'],
    ['../../../engine/titration/testkit', 'src/app/lab/titration/controller.test.tsx'],
    ['@/engine/aqueous', 'src/app/lab/aqueous/messages.ts'],
    ['@/engine/aqueous/testkit', 'src/app/lab/aqueous/messages.test.ts'],
    // Another folder whose name ends the same way is not the engine's.
    ['@/app/lab/titration/benchView', 'src/app/pages/x.tsx'],
    ['./titration/benchView', 'src/app/lab/x.tsx'],
  ])('accepts importing %s in %s', async (source, filePath) => {
    expect(await ruleIds(`import * as m from "${source}"\nexport const v = m\n`, filePath)).toEqual([])
  })

  it('still rejects Three.js and a scene module in a test file under src/app outside a scene folder', async () => {
    for (const source of ['three', '@react-three/fiber', '@/app/explore/scene/MoleculeViewer']) {
      expect([source, await ruleIds(`import * as m from "${source}"\nexport const v = m\n`, 'src/app/lab/titration/x.test.ts')]).toEqual([source, ['no-restricted-imports']])
    }
  })

  it('accepts Math.random and the clock in chem-data', async () => {
    const code = 'export const a = [Math.random(), Date.now(), new Date()]\n'
    expect(await ruleIds(code, 'src/chem-data/x.ts')).toEqual([])
  })

  // The scene of a mechanism is a function of the scrub position and of nothing else (spec 9.1).
  it('rejects Math.random and the clock in src/mechanisms, in a test file too', async () => {
    for (const filePath of ['src/mechanisms/x.ts', 'src/mechanisms/x.test.ts']) {
      expect(await ruleIds('export const r = () => Math.random()\n', filePath)).toEqual(['no-restricted-properties'])
      expect(await ruleIds('export const t = () => Date.now()\n', filePath)).toEqual(['no-restricted-properties'])
      expect(await ruleIds('export const t = () => performance.now()\n', filePath)).toEqual(['no-restricted-properties'])
      expect(await ruleIds('export const d = () => new Date()\n', filePath)).toEqual(['no-restricted-syntax'])
    }
    expect(await ruleIds('export const a = (u: number) => Math.sqrt(u) + Math.log(u)\n', 'src/mechanisms/x.ts')).toEqual([])
  })

  // The app draws the mechanism from its index: state(mechanism, t) and what stands beside it.
  it.each([
    ['@/mechanisms/state', 'src/app/learn/MechanismPage.tsx'],
    ['@/mechanisms/hcl-nahco3.json', 'src/app/learn/MechanismPage.tsx'],
    ['../../mechanisms/progress', 'src/app/learn/x.tsx'],
    ['@/mechanisms/schema', 'src/app/learn/scene/MechanismScene.tsx'],
    ['@/mechanisms/data', 'src/app/learn/x.test.ts'],
    ['@/mechanisms/wording', 'src/main.tsx'],
  ])('rejects importing %s in %s', async (source, filePath) => {
    expect(await ruleIds(`import * as m from "${source}"\nexport const v = m\n`, filePath)).toEqual(['no-restricted-imports'])
    expect(await ruleIds(`import type * as M from "${source}"\nexport type V = typeof M\n`, filePath)).toEqual(['no-restricted-imports'])
  })

  it.each([
    ['@/mechanisms', 'src/app/learn/MechanismPage.tsx'],
    ['../../mechanisms', 'src/app/learn/x.tsx'],
    ['@/mechanisms', 'src/app/learn/scene/MechanismScene.tsx'],
    ['@/mechanisms', 'src/app/learn/x.test.ts'],
    // Inside the folder, its own files import each other.
    ['./state', 'src/mechanisms/describe.ts'],
    ['@/chem-data/geometry', 'src/mechanisms/state.ts'],
  ])('accepts importing %s in %s', async (source, filePath) => {
    expect(await ruleIds(`import * as m from "${source}"\nexport const v = m\n`, filePath)).toEqual([])
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
