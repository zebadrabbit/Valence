import { describe, expect, it } from 'vitest'
import { GEOMETRY_SOURCE_LABEL, libraryGroups, pubchemUrl, topicLabel, TOPICS, variantsOf } from './library'
import { registry } from './registry'

const byId = (id: string) => registry.molecules.find((m) => m.id === id)!

describe('libraryGroups', () => {
  const groups = libraryGroups(registry.molecules)

  it('has the five topic headings of spec 6.1 with 8, 5, 11, 4 and 3 entries', () => {
    expect(groups.map((g) => [g.label, g.entries.length])).toEqual([
      ['Basics', 8],
      ['VSEPR showcase', 5],
      ['Organic functional groups', 11],
      ['Biomolecules', 4],
      ['Mechanism species', 3],
    ])
  })

  it('lists glycine and alanine once each, by their neutral file', () => {
    expect(groups[3]!.entries.map((m) => m.id)).toEqual(['beta-d-glucopyranose', 'glycine', 'alanine', 'urea'])
  })

  it('keeps file order within a topic', () => {
    expect(groups[4]!.entries.map((m) => m.id)).toEqual(['hydronium', 'bicarbonate', 'carbonic-acid'])
  })
})

describe('variantsOf', () => {
  it('gives both files of a variant group from either one', () => {
    expect(variantsOf(registry.molecules, byId('glycine')).map((m) => m.id)).toEqual(['glycine', 'glycine-zwitterion'])
    expect(variantsOf(registry.molecules, byId('alanine-zwitterion')).map((m) => m.id)).toEqual(['alanine', 'alanine-zwitterion'])
  })

  it('is empty for a molecule without variants', () => {
    expect(variantsOf(registry.molecules, byId('water'))).toEqual([])
  })
})

describe('labels and links', () => {
  it('words the geometry source exactly as spec 5.2 does', () => {
    expect(GEOMETRY_SOURCE_LABEL[byId('water').geometrySource]).toBe('experimental (gas phase)')
    expect(GEOMETRY_SOURCE_LABEL[byId('ethanol').geometrySource]).toBe(
      'computed conformer (PubChem3D, MMFF94s force field); not an experimental structure',
    )
  })

  it('labels every topic', () => {
    expect(TOPICS.map((t) => t.id).sort()).toEqual([...new Set(registry.molecules.map((m) => m.topic))].sort())
    expect(topicLabel('vsepr')).toBe('VSEPR showcase')
  })

  it('links a molecule to its PubChem compound page', () => {
    expect(pubchemUrl(byId('water'))).toBe('https://pubchem.ncbi.nlm.nih.gov/compound/962')
  })
})
