import { describe, expect, it } from 'vitest'
import { GEOMETRY_SOURCE_LABEL, libraryGroups, pubchemUrl, topicLabel, TOPICS, variantsOf } from './library'
import { registry } from './registry'

const byId = (id: string) => registry.molecules.find((m) => m.id === id)!

describe('libraryGroups', () => {
  const groups = libraryGroups(registry.molecules)

  it('has the six topic headings of spec 6.1 with 25, 13, 24, 14, 22 and 3 entries', () => {
    expect(groups.map((g) => [g.label, g.entries.length])).toEqual([
      ['Basics', 25],
      ['VSEPR showcase', 13],
      ['Organic functional groups', 24],
      ['Biomolecules', 14],
      ['Everyday molecules', 22],
      ['Mechanism species', 3],
    ])
  })

  it('lists each amino acid once, by its neutral file', () => {
    expect(groups[3]!.entries.map((m) => m.id)).toEqual([
      'beta-d-glucopyranose',
      'glycine',
      'alanine',
      'urea',
      'glycerol',
      'lactic-acid',
      'citric-acid',
      'serine',
      'cysteine',
      'adenine',
      'thymine',
      'beta-d-fructofuranose',
      'sucrose',
      'palmitic-acid',
    ])
  })

  it('keeps file order within a topic', () => {
    expect(groups[5]!.entries.map((m) => m.id)).toEqual(['hydronium', 'bicarbonate', 'carbonic-acid'])
    expect(groups[0]!.entries.slice(0, 10).map((m) => m.id)).toEqual(['water', 'carbon-dioxide', 'ammonia', 'methane', 'oxygen', 'nitrogen', 'hydrogen-chloride', 'hydrogen-peroxide', 'hydrogen', 'chlorine'])
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
    expect(topicLabel('everyday')).toBe('Everyday molecules')
  })

  it('links a molecule to its PubChem compound page', () => {
    expect(pubchemUrl(byId('water'))).toBe('https://pubchem.ncbi.nlm.nih.gov/compound/962')
  })
})
