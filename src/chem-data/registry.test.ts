import { describe, expect, it } from 'vitest'
import { angleDeg } from './geometry'
import { formulaElements } from './formula'
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

  it('pins the names that must not be mistaken for an element or another ion', () => {
    const name = (id: string) => registry.molecules.find((m) => m.id === id)?.name
    expect([name('oxygen'), name('nitrogen'), name('bicarbonate')]).toEqual(['Oxygen (O₂)', 'Nitrogen (N₂)', 'Bicarbonate ion'])
  })

  it('gives no molecule the name of an element', () => {
    const elementNames = new Set(registry.elements.map((e) => e.name))
    for (const m of registry.molecules) expect(elementNames.has(m.name), m.id).toBe(false)
  })

  it('writes every formula with the element counts of its atom list, parentheses included', () => {
    expect(formulaElements('CO(NH2)2').sort()).toEqual(['C', 'H', 'H', 'H', 'H', 'N', 'N', 'O'])
    expect(() => formulaElements('C((OH)2)3')).toThrow()
    for (const m of registry.molecules) {
      expect(formulaElements(m.formula).sort(), m.id).toEqual(m.atoms.map((a) => a.element).sort())
    }
  })

  it('writes the organic molecules in condensed form', () => {
    const formula = (id: string) => registry.molecules.find((m) => m.id === id)?.formula
    expect(['ethanol', 'urea', 'alanine-zwitterion', 'ethyl-acetate', 'glycine'].map(formula)).toEqual([
      'C2H5OH',
      'CO(NH2)2',
      'CH3CH(NH3)COO',
      'CH3COOC2H5',
      'NH2CH2COOH',
    ])
  })

  it('draws sulfur dioxide bent and carbon dioxide straight in 2D', () => {
    const angle2d = (id: string, centre: string) => {
      const atoms = registry.molecules.find((m) => m.id === id)!.atoms
      const at = (element: string) => atoms.filter((a) => a.element === element).map((a) => [...a.position2d, 0] as const)
      const [o1, o2] = at('O')
      return angleDeg(o1!, at(centre)[0]!, o2!)
    }
    expect(angle2d('sulfur-dioxide', 'S')).toBeGreaterThan(110)
    expect(angle2d('sulfur-dioxide', 'S')).toBeLessThan(130)
    expect(Math.abs(angle2d('carbon-dioxide', 'C') - 180)).toBeLessThan(1)
  })

  it('keeps the 90°, 120° and 180° angles of PCl5 (spec 6.5)', () => {
    const pcl5 = registry.molecules.find((m) => m.id === 'phosphorus-pentachloride')
    const counts: Record<number, number> = {}
    for (const { value } of pcl5?.measurements?.angles ?? []) counts[value] = (counts[value] ?? 0) + 1
    expect(counts).toEqual({ 90: 6, 120: 3, 180: 1 })
  })
})
