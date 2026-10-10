import { describe, expect, it } from 'vitest'
import { atomNames, bondNames, describeLonePairs, describeMolecule, describeMoleculeParts } from './describe'
import { formulaElements } from './formula'
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
      'Glycine (zwitterion), formula NH3CH2COO. It has 10 atoms, joined by 8 single bonds and 1 double bond; ' +
        'the double bond and one single bond to oxygen are drawn as one of two equivalent resonance structures, ' +
        'and the two real bonds are equal. ' +
        'Formal charges: one oxygen minus 1, nitrogen plus 1. ' +
        'The nitrogen atom has tetrahedral geometry and is bonded to 1 carbon atom and 3 hydrogen atoms. ' +
        'One carbon atom has tetrahedral geometry and is bonded to 1 carbon atom, 2 hydrogen atoms, and 1 nitrogen atom. ' +
        'One carbon atom has trigonal planar geometry and is bonded to 1 carbon atom and 2 oxygen atoms.',
    )
  })

  it('says that the single and double bond of sulfur dioxide are one resonance structure', () => {
    expect(describeById('sulfur-dioxide')).toBe(
      'Sulfur dioxide, formula SO2. It has 3 atoms, joined by 1 single bond and 1 double bond; ' +
        'the double bond and the single bond to oxygen are drawn as one of two equivalent resonance structures, ' +
        'and the two real bonds are equal. ' +
        'Formal charges: sulfur plus 1, one oxygen minus 1. ' +
        'The sulfur atom has bent geometry and is bonded to 2 oxygen atoms.',
    )
  })

  it('says the same of every molecule with a resonance note, and of no other', () => {
    for (const molecule of registry.molecules) {
      const noted = molecule.bonds.some((b) => b.resonanceNote)
      expect([molecule.id, /equivalent resonance structures/.test(describeById(molecule.id))]).toEqual([molecule.id, noted])
    }
    expect(registry.molecules.filter((m) => m.bonds.some((b) => b.resonanceNote)).map((m) => m.id)).toEqual([
      'ozone',
      'nitric-acid',
      'nitrate',
      'carbonate',
      'acetate',
      'sulfur-dioxide',
      'sulfur-trioxide',
      'glycine-zwitterion',
      'alanine-zwitterion',
      'serine-zwitterion',
      'cysteine-zwitterion',
      'bicarbonate',
    ])
  })

  it('says of nitrate that one double and two single bonds are one of three resonance structures', () => {
    expect(describeById('nitrate')).toBe(
      'Nitrate ion, formula NO3 with a charge of minus 1. It has 4 atoms, joined by 2 single bonds and 1 double bond; ' +
        'the double bond and the two single bonds to oxygen are drawn as one of three equivalent resonance structures, ' +
        'and the three real bonds are equal. ' +
        'Formal charges: 2 oxygen atoms minus 1, nitrogen plus 1. ' +
        'The nitrogen atom has trigonal planar geometry and is bonded to 3 oxygen atoms.',
    )
    // Nitric acid has a third single bond from the nitrogen, to the oxygen that carries the hydrogen: "one single bond" of its pair.
    expect(describeById('nitric-acid')).toContain(
      'the double bond and one single bond to oxygen are drawn as one of two equivalent resonance structures, and the two real bonds are equal',
    )
  })

  it('counts the atoms of a large molecule by element and geometry, where a sentence for each kind of atom would run past seven', () => {
    expect(describeById('capsaicin')).toBe(
      'Capsaicin, formula C18H27NO3. It has 49 atoms, joined by 41 single bonds, 2 double bonds, and 6 aromatic bonds. ' +
        'Each of 2 oxygen atoms has bent geometry. ' +
        'The nitrogen atom has trigonal planar geometry. ' +
        'Of the 18 carbon atoms, 9 have tetrahedral geometry and 9 have trigonal planar geometry.',
    )
    expect(describeById('nicotine')).toContain('Of the 2 nitrogen atoms, 1 has trigonal pyramidal geometry and 1 has bent geometry.')
    // A molecule that fits keeps the sentence for each kind of atom, with its neighbours.
    expect(describeById('acetic-acid')).toContain('is bonded to 1 carbon atom and 3 hydrogen atoms')
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
    ['ethanol', 'C2H5OH'],
    ['acetamide', 'CH3CONH2'],
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
      const written = formulaElements(molecule.formula)
      expect(written.sort(), molecule.id).toEqual(molecule.atoms.map((a) => a.element).sort())
    }
  })
})

describe('atomNames and bondNames', () => {
  it('numbers atoms per element in file order', () => {
    expect(atomNames(moleculeOf('carbon-dioxide'), registry.elements)).toEqual(['Carbon 1', 'Oxygen 1', 'Oxygen 2'])
    expect(atomNames(moleculeOf('hydrogen-chloride'), registry.elements)).toEqual(['Hydrogen 1', 'Chlorine 1'])
  })

  it('names a bond by its two atoms and its kind', () => {
    expect(bondNames(moleculeOf('carbon-dioxide'), registry.elements)).toEqual([
      'Carbon 1 to Oxygen 1, double bond',
      'Carbon 1 to Oxygen 2, double bond',
    ])
    expect(bondNames(moleculeOf('nitrogen'), registry.elements)).toEqual(['Nitrogen 1 to Nitrogen 2, triple bond'])
    expect(bondNames(moleculeOf('water'), registry.elements)[0]).toBe('Oxygen 1 to Hydrogen 1, single bond')
  })

  it('calls the ring bonds of benzene aromatic, not single or double', () => {
    const names = bondNames(moleculeOf('benzene'), registry.elements)
    expect(names.filter((n) => n.endsWith(', aromatic bond'))).toHaveLength(6)
    expect(names.filter((n) => n.endsWith(', single bond'))).toHaveLength(6)
  })

  it('gives every atom and bond of every library molecule a distinct name', () => {
    for (const m of registry.molecules) {
      const names = [...atomNames(m, registry.elements), ...bondNames(m, registry.elements)]
      expect([m.id, new Set(names).size]).toEqual([m.id, m.atoms.length + m.bonds.length])
    }
  })
})

describe('describeLonePairs', () => {
  const said = (id: string) => describeLonePairs(moleculeOf(id), registry.elements)

  it('counts the lone pairs of water and of xenon tetrafluoride', () => {
    expect(said('water')).toBe('Lone pairs: 2 on the oxygen atom.')
    expect(said('xenon-tetrafluoride')).toBe('Lone pairs: 2 on the xenon atom and 3 on each fluorine atom.')
  })

  it('names the atoms of an element that hold different numbers', () => {
    expect(said('sulfur-dioxide')).toBe('Lone pairs: 1 on the sulfur atom, 2 on Oxygen 1, and 3 on Oxygen 2.')
  })

  it('says when there are none', () => {
    expect(said('methane')).toBe('No lone pairs.')
  })
})

describe('describeMoleculeParts', () => {
  it('splits the description round the plain formula, for every molecule', () => {
    for (const molecule of registry.molecules) {
      const { lead, formula, rest } = describeMoleculeParts(molecule, registry.elements)
      expect(formula, molecule.id).toBe(molecule.formula)
      expect(lead.endsWith(', formula '), molecule.id).toBe(true)
      expect(lead + formula + rest, molecule.id).toBe(describeMolecule(molecule, registry.elements))
    }
  })
})
