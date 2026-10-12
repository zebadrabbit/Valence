import { describe, expect, it } from 'vitest'
import { ELEMENT_INDEX } from '@/chem-data/elementIndex'
import { PALETTE_ITEMS } from './items'
import { searchPalette, stepActive, type PaletteItem } from './search'

const labels = (query: string) => searchPalette(PALETTE_ITEMS, query).map((item) => item.label)

describe('PALETTE_ITEMS', () => {
  it('holds the 101 molecules, the ten labs, the mechanism, the six pages, the periodic table and its 118 elements, with unique ids', () => {
    expect(PALETTE_ITEMS).toHaveLength(101 + 10 + 1 + 6 + 1 + 118)
    expect(new Set(PALETTE_ITEMS.map((item) => item.id)).size).toBe(PALETTE_ITEMS.length)
  })

  it('lists the periodic table and then the elements, by atomic number, after the molecules, labs and pages', () => {
    const kinds = PALETTE_ITEMS.map((item) => item.kind.replace(/ .*/, ''))
    expect(kinds.slice(0, 118)).toEqual([...Array<string>(101).fill('Molecule'), ...Array<string>(10).fill('Lab'), 'Mechanism', ...Array<string>(6).fill('Page')])
    expect(PALETTE_ITEMS[118]).toEqual({ id: 'page:/explore/elements', label: 'Periodic table', kind: 'Page', to: '/explore/elements' })
    expect(PALETTE_ITEMS.slice(119).map((item) => item.label)).toEqual(ELEMENT_INDEX.map((e) => e.name))
  })

  it('links an element to its page, with its symbol where a molecule has its formula', () => {
    expect(PALETTE_ITEMS.find((item) => item.label === 'Xenon')).toEqual({
      id: 'element:Xe',
      label: 'Xenon',
      kind: 'Element 54',
      to: '/explore/elements/Xe',
      formula: 'Xe',
    })
  })

  it('gives an element another spelling only where the alias list has one', () => {
    expect(PALETTE_ITEMS.filter((item) => item.alias !== undefined).map((item) => [item.label, item.alias])).toEqual([
      ['Aluminum', 'Aluminium'],
      ['Cesium', 'Caesium'],
    ])
  })

  it('sends each lab and the mechanism to its own page', () => {
    expect(PALETTE_ITEMS.filter((item) => item.kind === 'Lab').map((item) => item.to)).toEqual(['/lab/titration', '/lab/aqueous', '/lab/flame', '/lab/calorimetry', '/lab/cations', '/lab/le-chatelier', '/lab/clock-reaction', '/lab/iodination-of-acetone', '/lab/red-cabbage-ph', '/lab/measurement-and-density'])
    expect(PALETTE_ITEMS.find((item) => item.to === '/lab/flame')).toEqual({ id: 'lab:flame', label: 'Flame tests', kind: 'Lab', to: '/lab/flame' })
    expect(PALETTE_ITEMS.find((item) => item.to === '/lab/calorimetry')).toEqual({ id: 'lab:calorimetry', label: 'Calorimetry', kind: 'Lab', to: '/lab/calorimetry' })
    expect(PALETTE_ITEMS.find((item) => item.to === '/lab/cations')).toEqual({ id: 'lab:cations', label: 'Group I cations', kind: 'Lab', to: '/lab/cations' })
    expect(PALETTE_ITEMS.find((item) => item.to === '/lab/le-chatelier')).toEqual({ id: 'lab:le-chatelier', label: "Le Chatelier's principle", kind: 'Lab', to: '/lab/le-chatelier' })
    expect(PALETTE_ITEMS.find((item) => item.to === '/lab/clock-reaction')).toEqual({ id: 'lab:clock-reaction', label: 'Clock reaction', kind: 'Lab', to: '/lab/clock-reaction' })
    expect(PALETTE_ITEMS.find((item) => item.to === '/lab/iodination-of-acetone')).toEqual({ id: 'lab:iodination-of-acetone', label: 'Iodination of acetone', kind: 'Lab', to: '/lab/iodination-of-acetone' })
    expect(PALETTE_ITEMS.find((item) => item.to === '/lab/red-cabbage-ph')).toEqual({ id: 'lab:red-cabbage-ph', label: 'Red cabbage pH', kind: 'Lab', to: '/lab/red-cabbage-ph' })
    expect(PALETTE_ITEMS.find((item) => item.to === '/lab/measurement-and-density')).toEqual({ id: 'lab:measurement-and-density', label: 'Measurement and density', kind: 'Lab', to: '/lab/measurement-and-density' })
    expect(PALETTE_ITEMS.filter((item) => item.kind === 'Mechanism').map((item) => item.to)).toEqual(['/learn/hcl-nahco3'])
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

  it('finds Glycine and Glycerol for "glyc", and Glycine alone for "glyci"', () => {
    expect(labels('glyc')).toEqual(['Glycine', 'Glycerol'])
    expect(labels('glyci')).toEqual(['Glycine'])
  })

  it('finds a molecule of the Everyday topic by either of its names, and says which topic it is in', () => {
    expect(labels('paracetamol')).toEqual(['Acetaminophen (paracetamol)'])
    expect(labels('vitamin c')).toEqual(['Ascorbic acid (vitamin C)'])
    expect(labels('isooctane')).toEqual(['2,2,4-Trimethylpentane (isooctane)'])
    expect(labels('fructose')).toEqual(['Fructose (β-D-fructofuranose)'])
    expect(searchPalette(PALETTE_ITEMS, 'caffeine')[0]).toMatchObject({ kind: 'Molecule · Everyday molecules', to: '/explore/caffeine' })
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

  it('finds an element by its symbol or its name, ahead of the molecules that contain it', () => {
    expect(labels('Xe').slice(0, 3)).toEqual(['Xenon', 'Xenon tetrafluoride', 'Xenon difluoride'])
    expect(labels('xenon')).toEqual(['Xenon', 'Xenon tetrafluoride', 'Xenon difluoride'])
    expect(labels('gold')).toEqual(['Gold'])
    expect(labels('c')[0]).toBe('Carbon')
  })

  it('tells a formula from a symbol by its capitals where the two spell alike, and puts the molecule first when the query has none', () => {
    expect(labels('Co')[0]).toBe('Cobalt')
    expect(labels('CO')[0]).toBe('Carbon monoxide')
    expect(labels('Hf')[0]).toBe('Hafnium')
    expect(labels('HF')[0]).toBe('Hydrogen fluoride')
    expect(labels('co').slice(0, 2)).toEqual(['Carbon monoxide', 'Cobalt'])
  })

  it('finds aluminum and cesium by the spellings PubChem does not use', () => {
    expect(labels('aluminium')).toEqual(['Aluminum'])
    expect(labels('caesium')).toEqual(['Cesium'])
    expect(labels('alumin')).toEqual(['Aluminum'])
  })

  it('finds the periodic table page', () => {
    expect(labels('periodic')).toEqual(['Periodic table'])
  })

  it('searches another spelling as it does the label', () => {
    const items: PaletteItem[] = [
      { id: 'a', label: 'Aluminum hydroxide', kind: 'x', to: '/' },
      { id: 'b', label: 'Aluminum', kind: 'x', to: '/', alias: 'Aluminium' },
    ]
    expect(searchPalette(items, 'aluminium').map((i) => i.id)).toEqual(['b'])
    expect(searchPalette(items, 'alumin').map((i) => i.id)).toEqual(['a', 'b'])
    expect(searchPalette(items, 'ALUMINIUM').map((i) => i.id)).toEqual(['b'])
  })

  it('ranks exact, then starts-with, then word start, then anywhere', () => {
    const item = (label: string, formula?: string): PaletteItem => ({ id: label, label, kind: 'x', to: '/', formula })
    const items = [item('Methane'), item('Dimethyl ether'), item('Sodium ethanoate'), item('Ethane'), item('Di-ethane'), item('Other', 'ethane')]
    expect(searchPalette(items, 'ethane').map((i) => i.label)).toEqual(['Ethane', 'Other', 'Di-ethane', 'Methane'])
    expect(searchPalette(items, 'eth').map((i) => i.label)).toEqual(['Ethane', 'Other', 'Dimethyl ether', 'Sodium ethanoate', 'Di-ethane', 'Methane'])
  })

  it('treats the query as plain text, not a pattern', () => {
    expect(labels('(o2')).toEqual(['Oxygen (O₂)'])
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
