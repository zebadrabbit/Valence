import { describe, expect, it } from 'vitest'
import { bondCitations, citations, elementCitations, measurementCitations } from './citations'
import { measure } from './measure'
import { registry } from './registry'

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
