import { describe, expect, it } from 'vitest'
import { bondCitations, citations, elementCitations, measurementCitations, periodicCitations, titrationCitations } from './citations'
import { measure } from './measure'
import { registry } from './registry'
import { FIXTURE_SOURCES, titrationFixture } from './titration/fixture'

const { sources, elements } = registry
const element = (symbol: string) => elements.find((e) => e.symbol === symbol)!
const molecule = (id: string) => registry.molecules.find((m) => m.id === id)!
const summary = (list: ReturnType<typeof citations>) => list.map((c) => [c.source.id, c.covers])

describe('citations', () => {
  const two = [
    { id: 'a', url: 'https://example.org/a', citation: 'A' },
    { id: 'b', url: 'https://example.org/b', citation: 'B' },
  ]

  it('lists each source once, in first-seen order, with everything it covers', () => {
    const list = citations([['x', 'b'], ['y', 'a'], ['z', 'b'], ['x', 'b']], two)
    expect(summary(list)).toEqual([
      ['b', ['x', 'z']],
      ['a', ['y']],
    ])
    expect(list[0]!.source).toBe(two[1])
  })

  it('throws on a source id that does not resolve', () => {
    expect(() => citations([['x', 'missing']], two)).toThrow(/unknown source "missing"/)
  })
})

describe('elementCitations', () => {
  it('covers every stored value on the atom card for carbon', () => {
    expect(summary(elementCitations(element('C'), sources))).toEqual([
      ['ciaaw-abridged-2024', ['Symbol, name and atomic number', 'Standard atomic weight']],
      ['pubchem-ptable', ['Electronegativity']],
      ['nist-asd-ie', ['Valence electrons', 'Electron configuration', 'Ionization energies']],
      ['cordero-2008', ['Covalent radius']],
      ['mantina-2009', ['Van der Waals radius']],
      ['jmol-pal-source', ['Display colour in the models']],
    ])
  })

  it('adds the ionic radius source for an element that has one', () => {
    expect(summary(elementCitations(element('O'), sources)).at(-2)).toEqual(['shannon-1976', ['Ionic radius']])
  })

  it('resolves for every element', () => {
    for (const e of elements) expect(elementCitations(e, sources).length).toBeGreaterThanOrEqual(5)
  })
})

describe('measurementCitations and bondCitations', () => {
  it('cites the coordinates and the cited value of an experimental molecule from the same page', () => {
    const water = molecule('water')
    const bond = water.bonds[0]!
    expect(summary(measurementCitations(water, measure(water, [bond.a, bond.b])!, sources))).toEqual([
      ['cccbdb-water', ['Atom coordinates of the model', 'Cited length']],
    ])
  })

  it('cites the page for the point group, not for a figure, where the value follows from symmetry', () => {
    const pcl5 = molecule('phosphorus-pentachloride')
    const { atoms } = pcl5.measurements!.angles[0]!
    expect(summary(measurementCitations(pcl5, measure(pcl5, atoms)!, sources))).toEqual([
      ['cccbdb-phosphorus-pentachloride', ['Atom coordinates of the model', 'Point group of the molecule (D3h)']],
    ])
  })

  it('cites the page for both the figure and the point group, where the page prints an angle its point group fixes', () => {
    const bf3 = molecule('boron-trifluoride')
    const { atoms } = bf3.measurements!.angles[0]!
    expect(summary(measurementCitations(bf3, measure(bf3, atoms)!, sources))).toEqual([
      ['cccbdb-boron-trifluoride', ['Atom coordinates of the model', 'Cited angle', 'Point group of the molecule (D3h)']],
    ])
  })

  it('cites only the coordinates when the atoms have no cited value', () => {
    const benzene = molecule('benzene')
    expect(summary(measurementCitations(benzene, measure(benzene, [0, 1, 2])!, sources))).toEqual([
      ['pubchem-cid-241', ['Atom coordinates of the model']],
    ])
  })

  it('adds the electronegativity source to a bond', () => {
    const water = molecule('water')
    const bond = water.bonds[0]!
    expect(summary(bondCitations(water, measure(water, [bond.a, bond.b])!, elements, sources))).toEqual([
      ['cccbdb-water', ['Atom coordinates of the model', 'Cited length']],
      ['pubchem-ptable', ['Electronegativity']],
    ])
  })
})

describe('periodicCitations', () => {
  const rows = [
    { label: 'Symbol', sourceIds: ['pubchem-periodic-table'] },
    { label: 'Group', sourceIds: [] },
    { label: 'Atomic mass', sourceIds: ['ciaaw-abridged-2024'] },
    { label: 'Density', sourceIds: ['pubchem-periodic-table', 'pubchem-element-pages'] },
  ]

  it('lists each source of the card rows once, with the rows it covers; a row worked out by the app cites nothing', () => {
    expect(summary(periodicCitations(rows, undefined, sources))).toEqual([
      ['pubchem-periodic-table', ['Symbol', 'Density']],
      ['ciaaw-abridged-2024', ['Atomic mass']],
      ['pubchem-element-pages', ['Density']],
    ])
  })

  it('adds the source of the emission lines when the curated record has them', () => {
    expect(summary(periodicCitations(rows, element('H'), sources)).at(-1)).toEqual(['nist-asd-lines-h', ['Emission lines']])
    expect(periodicCitations(rows, element('C'), sources).length).toBe(3)
  })

  it('throws on a source id that does not resolve', () => {
    expect(() => periodicCitations([{ label: 'Density', sourceIds: ['missing'] }], undefined, sources)).toThrow(/unknown source "missing"/)
  })
})

describe('titrationCitations', () => {
  it("lists each constant, each bottle's classification and each bottle's note under its own source, each source once; a note that rests on two sources is under both", () => {
    expect(summary(titrationCitations(titrationFixture(), FIXTURE_SOURCES))).toEqual([
      ['water', ['Ion product of water']],
      ['indicator-paper', ['Acid constants of phenolphthalein']],
      ['indicator-record', ['Molar mass of phenolphthalein', 'Phenolphthalein indicator solution: hazard classification']],
      ['listing', ['Strength of the indicator solution']],
      ['drop', ['Volume of one drop of indicator']],
      ['henry', ["Henry's law constant of carbon dioxide in water"]],
      ['air', ['Carbon dioxide in air, 2025']],
      ['carbonic', ['Acid constants of carbonic acid']],
      ['hcl-record', ['Hydrochloric acid: hazard classification']],
      ['hcl-sheet', ['Hydrochloric acid: hazards at the strength used']],
      ['hcl-sheet-2', ['Hydrochloric acid: hazards at the strength used']],
      ['naoh-record', ['Sodium hydroxide solution: hazard classification']],
      ['naoh-sheet', ['Sodium hydroxide solution: hazards at the strength used']],
      ['indicator-sheet', ['Phenolphthalein indicator solution: hazards at the strength used']],
    ])
  })

  it('names every source of the record, and no other', () => {
    const cited = titrationCitations(titrationFixture(), [...FIXTURE_SOURCES, { id: 'unused', url: 'https://example.org/unused', citation: 'Unused' }])
    expect(cited.map((c) => c.source.id).sort()).toEqual(FIXTURE_SOURCES.map((s) => s.id).sort())
  })

  it('lists a constant of a list under its own source when the two differ', () => {
    const data = titrationFixture()
    data.constants.carbonicPKas[1]!.sourceId = 'water'
    const cited = summary(titrationCitations(data, FIXTURE_SOURCES))
    expect(cited[0]).toEqual(['water', ['Ion product of water', 'Acid constants of carbonic acid']])
    expect(cited.find(([id]) => id === 'carbonic')).toEqual(['carbonic', ['Acid constants of carbonic acid']])
  })

  it('throws on a source id that does not resolve', () => {
    expect(() => titrationCitations(titrationFixture(), FIXTURE_SOURCES.slice(1))).toThrow(/unknown source "water"/)
  })
})
