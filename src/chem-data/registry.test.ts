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
