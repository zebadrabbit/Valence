import { describe, expect, it } from 'vitest'
import { registry } from './registry'
import { validateRegistry } from './validate'

// Optional, untracked: src/chem-data/denylist.local.json, a JSON array of names
// (for example ["Example State"]). Absent on a fresh clone, which is fine.
const local = import.meta.glob<string[]>('./denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

// Spec 6.1: 31 library entries; glycine and alanine each have a neutral and a zwitterion file.
const LIBRARY_IDS = [
  'acetamide',
  'acetic-acid',
  'acetone',
  'alanine',
  'alanine-zwitterion',
  'ammonia',
  'benzene',
  'beta-d-glucopyranose',
  'bicarbonate',
  'boron-trifluoride',
  'carbon-dioxide',
  'carbonic-acid',
  'ethane',
  'ethanol',
  'ethene',
  'ethyl-acetate',
  'ethyne',
  'formaldehyde',
  'glycine',
  'glycine-zwitterion',
  'hydrogen-chloride',
  'hydrogen-peroxide',
  'hydronium',
  'methane',
  'methylamine',
  'nitrogen',
  'oxygen',
  'phosphorus-pentachloride',
  'sulfur-dioxide',
  'sulfur-hexafluoride',
  'urea',
  'water',
  'xenon-tetrafluoride',
]

describe('the real chem-data registry', () => {
  it('passes validation', () => {
    expect(validateRegistry(registry, { institutionNames })).toEqual([])
  })

  it('contains exactly the 33 library structures', () => {
    expect(registry.molecules.map((m) => m.id).sort()).toEqual(LIBRARY_IDS)
  })

  it('contains exactly the 11 elements', () => {
    expect(registry.elements.map((e) => e.symbol)).toEqual(['H', 'B', 'C', 'N', 'O', 'F', 'Na', 'P', 'S', 'Cl', 'Xe'])
  })

  it('pairs each neutral amino acid with its zwitterion', () => {
    const variants = registry.molecules.filter((m) => m.variantGroup).map((m) => [m.id, m.variantGroup, m.variantLabel])
    expect(variants).toEqual([
      ['glycine', 'glycine', 'Neutral'],
      ['glycine-zwitterion', 'glycine', 'Zwitterion'],
      ['alanine', 'alanine', 'Neutral'],
      ['alanine-zwitterion', 'alanine', 'Zwitterion'],
    ])
  })

  it('cites experimental geometry for the Basics and VSEPR groups and PubChem for the rest', () => {
    for (const m of registry.molecules) {
      const experimental = m.topic === 'basics' || m.topic === 'vsepr'
      expect([m.id, m.geometrySource]).toEqual([m.id, experimental ? 'cited-experimental' : 'pubchem-computed'])
      expect([m.id, m.measurements !== undefined]).toEqual([m.id, experimental])
    }
  })
})
