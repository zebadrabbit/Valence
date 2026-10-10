import { describe, expect, it } from 'vitest'
import { libraryGroups } from './library'
import { LIBRARY_INDEX } from './libraryIndex'
import { registry } from './registry'

describe('LIBRARY_INDEX', () => {
  it('matches the library entries of the registry, field for field and in order', () => {
    const entries = libraryGroups(registry.molecules).flatMap((group) => group.entries)
    expect(LIBRARY_INDEX).toEqual(entries.map(({ id, name, formula, charge, topic }) => ({ id, name, formula, charge, topic })))
  })

  it('has the 101 entries of spec 6.1', () => {
    expect(LIBRARY_INDEX).toHaveLength(101)
  })
})
