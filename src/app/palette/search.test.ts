import { describe, expect, it } from 'vitest'
import { PALETTE_ITEMS } from './items'
import { searchPalette, stepActive, type PaletteItem } from './search'

const labels = (query: string) => searchPalette(PALETTE_ITEMS, query).map((item) => item.label)

describe('PALETTE_ITEMS', () => {
  it('holds the 31 molecules, the two labs, the mechanism and the six pages, with unique ids', () => {
    expect(PALETTE_ITEMS).toHaveLength(31 + 2 + 1 + 6)
    expect(new Set(PALETTE_ITEMS.map((item) => item.id)).size).toBe(PALETTE_ITEMS.length)
  })

  it('sends the labs to the Lab page and the mechanism to the Learn page', () => {
    expect(PALETTE_ITEMS.filter((item) => item.kind === 'Lab').map((item) => item.to)).toEqual(['/lab', '/lab'])
    expect(PALETTE_ITEMS.filter((item) => item.kind === 'Mechanism').map((item) => item.to)).toEqual(['/learn'])
  })

  it('links a molecule to its page and names its topic', () => {
    expect(PALETTE_ITEMS.find((item) => item.label === 'Water')).toEqual({
      id: 'molecule:water',
      label: 'Water',
      kind: 'Molecule · Basics',
      to: '/explore/water',
      formula: 'H2O',
      charge: 0,
    })
  })
})

describe('searchPalette', () => {
  it('gives every item, in order, for an empty or blank query', () => {
    expect(searchPalette(PALETTE_ITEMS, '')).toEqual(PALETTE_ITEMS)
    expect(searchPalette(PALETTE_ITEMS, '  ')).toEqual(PALETTE_ITEMS)
  })

  it('finds Water first for "h2o", then the formula that starts with it (H2O2), then the one that contains it (CH2O)', () => {
    expect(labels('h2o')).toEqual(['Water', 'Hydrogen peroxide', 'Formaldehyde'])
  })

  it('finds Carbon dioxide for "co2"', () => {
    expect(labels('co2')).toEqual(['Carbon dioxide'])
  })

  it('finds Glycine for "glyc"', () => {
    expect(labels('glyc')).toEqual(['Glycine'])
  })

  it('ignores case and surrounding spaces', () => {
    expect(labels(' WATER ')).toEqual(['Water'])
    expect(labels('H2O')).toEqual(labels('h2o'))
  })

  it('matches a subscript written in a name: "o2" finds Oxygen (O₂)', () => {
    expect(labels('o2')[0]).toBe('Oxygen (O₂)')
    expect(labels('nahco3')).toEqual(['HCl + NaHCO₃, step by step'])
  })

  it('finds the labs, the mechanism and the pages by name', () => {
    expect(labels('titration')).toEqual(['Standardization of a base by titration'])
    expect(labels('aqueous')).toEqual(['Reactions in aqueous solution'])
    expect(labels('settings')).toEqual(['Settings'])
    expect(labels('explore')).toEqual(['Explore'])
  })

  it('ranks exact, then starts-with, then word start, then anywhere', () => {
    const item = (label: string, formula?: string): PaletteItem => ({ id: label, label, kind: 'x', to: '/', formula })
    const items = [item('Methane'), item('Dimethyl ether'), item('Sodium ethanoate'), item('Ethane'), item('Di-ethane'), item('Other', 'ethane')]
    expect(searchPalette(items, 'ethane').map((i) => i.label)).toEqual(['Ethane', 'Other', 'Di-ethane', 'Methane'])
    expect(searchPalette(items, 'eth').map((i) => i.label)).toEqual(['Ethane', 'Other', 'Dimethyl ether', 'Sodium ethanoate', 'Di-ethane', 'Methane'])
  })

  it('treats the query as plain text, not a pattern', () => {
    expect(labels('(o')).toEqual(['Oxygen (O₂)'])
    expect(labels('.*')).toEqual([])
  })

  it('gives nothing when nothing matches', () => {
    expect(labels('zzz')).toEqual([])
  })
})

describe('stepActive', () => {
  it('moves one step and wraps at both ends', () => {
    expect(stepActive(0, 1, 3)).toBe(1)
    expect(stepActive(2, 1, 3)).toBe(0)
    expect(stepActive(0, -1, 3)).toBe(2)
  })

  it('stays at 0 in an empty list', () => {
    expect(stepActive(0, 1, 0)).toBe(0)
  })
})
