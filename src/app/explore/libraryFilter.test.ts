import { describe, expect, it } from 'vitest'
import { LIBRARY_INDEX } from '@/chem-data/libraryIndex'
import { filterStatus, libraryView } from './libraryFilter'

const ids = (query: string) => libraryView(query).groups.flatMap((group) => group.entries.map((m) => m.id))

describe('libraryView', () => {
  it('gives every entry under its topic, in library order, for an empty query', () => {
    const view = libraryView('  ')
    expect(view.groups.map((g) => g.label)).toEqual(['Basics', 'VSEPR showcase', 'Organic functional groups', 'Biomolecules', 'Everyday molecules', 'Mechanism species'])
    expect(ids('')).toEqual(LIBRARY_INDEX.map((m) => m.id))
    expect([view.shown, view.total]).toEqual([101, 101])
  })

  it('keeps the entries whose name holds the query, whatever its case, under their topics and in library order', () => {
    expect(ids('ACID')).toEqual([
      'nitric-acid',
      'sulfuric-acid',
      'phosphoric-acid',
      'acetic-acid',
      'formic-acid',
      'lactic-acid',
      'citric-acid',
      'palmitic-acid',
      'aspirin',
      'ascorbic-acid',
      'carbonic-acid',
    ])
    expect(libraryView('acid').groups.map((g) => [g.label, g.entries.length])).toEqual([
      ['Basics', 3],
      ['Organic functional groups', 2],
      ['Biomolecules', 3],
      ['Everyday molecules', 2],
      ['Mechanism species', 1],
    ])
  })

  it('matches a formula as well as a name, with plain digits or the subscripts of a name', () => {
    expect(ids('c6h12o6')).toEqual(['beta-d-glucopyranose', 'beta-d-fructofuranose'])
    expect(ids('ch3cooh')).toEqual(['acetic-acid'])
    expect(ids('o₃')).toEqual(ids('o3'))
    expect(ids('o3')).toContain('ozone')
  })

  it('finds an everyday molecule by either of its names', () => {
    expect(ids('paracetamol')).toEqual(['acetaminophen'])
    expect(ids('vitamin')).toEqual(['ascorbic-acid'])
  })

  it('drops a topic with nothing left in it, and gives none when nothing matches', () => {
    expect(libraryView('caffeine').groups.map((g) => g.label)).toEqual(['Everyday molecules'])
    const none = libraryView('zzz')
    expect([none.groups, none.shown, none.total]).toEqual([[], 0, 101])
  })
})

describe('filterStatus', () => {
  it('counts the molecules shown, and says so when there are none', () => {
    expect(filterStatus(libraryView(''), '')).toBe('101 molecules')
    expect(filterStatus(libraryView('acid'), 'acid')).toBe('11 of 101 molecules')
    expect(filterStatus(libraryView('caffeine'), 'caffeine')).toBe('1 of 101 molecules')
    expect(filterStatus(libraryView('zzz'), ' zzz ')).toBe('No molecule matches “zzz”.')
  })
})
