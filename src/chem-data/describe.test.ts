import { describe, expect, it } from 'vitest'
import { describeMolecule } from './describe'
import { registry } from './registry'
import type { Molecule } from './schema'

function moleculeOf(id: string): Molecule {
  const found = registry.molecules.find((m) => m.id === id)
  if (!found) throw new Error(`no molecule ${id}`)
  return found
}
const describeById = (id: string) => describeMolecule(moleculeOf(id), registry.elements)

describe('describeMolecule', () => {
  it('describes water', () => {
    expect(describeById('water')).toBe(
      'Water, formula H2O. It has 3 atoms, joined by 2 single bonds. ' +
        'The oxygen atom has bent geometry and is bonded to 2 hydrogen atoms.',
    )
  })

  it('describes benzene, saying its six equal carbons once', () => {
    expect(describeById('benzene')).toBe(
      'Benzene, formula C6H6. It has 12 atoms, joined by 6 single bonds and 6 aromatic bonds. ' +
        'Each of the 6 carbon atoms has trigonal planar geometry and is bonded to 2 carbon atoms and 1 hydrogen atom.',
    )
  })

  it('describes the glycine zwitterion with its variant and formal charges', () => {
    expect(describeById('glycine-zwitterion')).toBe(
      'Glycine (zwitterion), formula C2H5NO2. It has 10 atoms, joined by 8 single bonds and 1 double bond. ' +
        'Formal charges: oxygen minus 1, nitrogen plus 1. ' +
        'The nitrogen atom has tetrahedral geometry and is bonded to 1 carbon atom and 3 hydrogen atoms. ' +
        'One carbon atom has tetrahedral geometry and is bonded to 1 carbon atom, 2 hydrogen atoms, and 1 nitrogen atom. ' +
        'One carbon atom has trigonal planar geometry and is bonded to 1 carbon atom and 2 oxygen atoms.',
    )
  })

  it('states the charge of an ion and describes a molecule with no central atom', () => {
    expect(describeById('hydronium')).toMatch(/^Hydronium ion, formula H3O with a charge of plus 1\. /)
    expect(describeById('bicarbonate')).toMatch(/, formula HCO3 with a charge of minus 1\. /)
    expect(describeById('oxygen')).toBe('Oxygen, formula O2. It has 2 atoms, joined by 1 double bond.')
  })

  it('describes every molecule in the registry in at most seven sentences', () => {
    for (const molecule of registry.molecules) {
      const text = describeMolecule(molecule, registry.elements)
      expect(text.split('. ').length, molecule.id).toBeLessThanOrEqual(7)
    }
  })
})

describe('the formula in a description', () => {
  it.each([
    ['ethanol', 'C2H6O'],
    ['acetamide', 'C2H5NO'],
    ['beta-d-glucopyranose', 'C6H12O6'],
    ['carbon-dioxide', 'CO2'],
    // As textbooks write them, not in Hill order (ClH, H3N, F4Xe).
    ['hydrogen-chloride', 'HCl'],
    ['ammonia', 'NH3'],
    ['xenon-tetrafluoride', 'XeF4'],
    ['sulfur-hexafluoride', 'SF6'],
    ['phosphorus-pentachloride', 'PCl5'],
    ['carbonic-acid', 'H2CO3'],
  ])('writes %s as %s', (id, formula) => {
    expect(describeById(id)).toContain(`, formula ${formula}. `)
  })

  it('has the same element counts as the atom list for every molecule', () => {
    for (const molecule of registry.molecules) {
      const written = [...molecule.formula.matchAll(/([A-Z][a-z]?)(\d*)/g)].flatMap(([, symbol, count]) =>
        Array<string>(Number(count || 1)).fill(symbol!),
      )
      expect(written.sort(), molecule.id).toEqual(molecule.atoms.map((a) => a.element).sort())
    }
  })
})
