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
