import { describe, expect, it } from 'vitest'
import { HYBRIDIZATION, deriveAtoms } from './derive'
import { dot } from './geometry'
import { DELOCALISED_PAIR_NOTE, VALENCE_BOND_NOTE, describeHybridLobes, hybridLobes, valenceBondNote } from './hybrid'
import { bondOrder, unpairedElectrons } from './mo'
import { registry } from './registry'

const { elements } = registry
const moleculeOf = (id: string) => {
  const found = registry.molecules.find((m) => m.id === id)
  if (!found) throw new Error(`no molecule ${id}`)
  return found
}
/** The lobes of the first atom of the element in the molecule. */
const lobesOf = (id: string, symbol: string) => {
  const molecule = moleculeOf(id)
  return hybridLobes(molecule, molecule.atoms.findIndex((a) => a.element === symbol), elements)
}
const count = (id: string, symbol: string) => {
  const lobes = lobesOf(id, symbol)
  return lobes && [lobes.hybridization, lobes.bonds.length, lobes.lonePairs.length]
}

describe('hybridLobes', () => {
  it('gives the carbons of methane, ethene and ethyne four, three and two lobes', () => {
    expect(count('methane', 'C')).toEqual(['sp³', 4, 0])
    expect(count('ethene', 'C')).toEqual(['sp²', 3, 0])
    expect(count('ethyne', 'C')).toEqual(['sp', 2, 0])
  })

  it('puts lone pairs in hybrid lobes', () => {
    expect(count('water', 'O')).toEqual(['sp³', 2, 2])
    expect(count('ammonia', 'N')).toEqual(['sp³', 3, 1])
    expect(count('formaldehyde', 'O')).toEqual(['sp²', 1, 2])
    expect(count('nitrogen', 'N')).toEqual(['sp', 1, 1])
  })

  it('spreads the lobes of methane at the tetrahedral angle', () => {
    const { bonds } = lobesOf('methane', 'C')!
    for (const a of bonds) for (const b of bonds) if (a !== b) expect(dot(a, b)).toBeCloseTo(-1 / 3, 2)
  })

  it('has none for hydrogen, for a terminal halogen, or for steric numbers 5 and 6', () => {
    expect(lobesOf('methane', 'H')).toBeNull()
    expect(lobesOf('hydrogen-chloride', 'Cl')).toBeNull()
    expect(lobesOf('phosphorus-pentachloride', 'P')).toBeNull()
    expect(lobesOf('sulfur-hexafluoride', 'S')).toBeNull()
    expect(lobesOf('xenon-tetrafluoride', 'Xe')).toBeNull()
  })

  it('leaves the delocalised lone pair of an amide or urea nitrogen without a lobe, and says why', () => {
    for (const id of ['acetamide', 'urea']) {
      const lobes = lobesOf(id, 'N')!
      expect([lobes.hybridization, lobes.bonds.length, lobes.lonePairs.length]).toEqual(['sp²', 3, 0])
      expect(lobes.note).toBe(DELOCALISED_PAIR_NOTE)
    }
    expect(lobesOf('ammonia', 'N')!.note).toBeUndefined()
  })

  it('names what the lone pair is shared with where that is not a C=O', () => {
    // The ring N–H of indigo is next to a benzene ring and to the C=C that joins the two halves, and to no C=O.
    expect(lobesOf('indigo', 'N')!.note).toBe(
      'The lone pair of this nitrogen is in a p orbital at right angles to the plane of its bonds, delocalised into the neighbouring aromatic ring. It is not a hybrid orbital, so it has no lobe.',
    )
    // Every overridden nitrogen of the library names something, and an amide names its C=O.
    for (const molecule of registry.molecules) {
      deriveAtoms(molecule, elements).forEach((derived, i) => {
        if (!derived.resonanceOverride) return
        expect(hybridLobes(molecule, i, elements)!.note, `${molecule.id} atom ${i}`).toMatch(/delocalised into the neighbouring (C=O|C=C|C=N|aromatic ring)\. /)
      })
    }
    expect(lobesOf('acetaminophen', 'N')!.note).toBe(DELOCALISED_PAIR_NOTE)
  })

  it('draws lobes for every sp, sp² and sp³ atom in the library and for no other, one per electron domain', () => {
    const drawn = [HYBRIDIZATION[2], HYBRIDIZATION[3], HYBRIDIZATION[4]]
    for (const molecule of registry.molecules) {
      deriveAtoms(molecule, elements).forEach((derived, i) => {
        const lobes = hybridLobes(molecule, i, elements)
        const where = `${molecule.id} atom ${i}`
        expect(lobes !== null, where).toBe(drawn.includes(derived.hybridization))
        if (!lobes) return
        expect(molecule.atoms[i]!.element, where).not.toBe('H')
        expect(lobes.bonds.length + lobes.lonePairs.length, where).toBe(drawn.indexOf(lobes.hybridization) + 2)
      })
    }
  })
})

describe('describeHybridLobes', () => {
  it('counts the lobes along bonds and those holding lone pairs', () => {
    expect(describeHybridLobes(lobesOf('methane', 'C')!)).toBe('sp³: 4 lobes, 4 along bonds.')
    expect(describeHybridLobes(lobesOf('water', 'O')!)).toBe('sp³: 4 lobes, 2 along bonds and 2 holding lone pairs.')
    expect(describeHybridLobes(lobesOf('nitrogen', 'N')!)).toBe('sp: 2 lobes, 1 along a bond and 1 holding a lone pair.')
  })
})

describe('valenceBondNote', () => {
  const diagramOf = (id: string) => registry.moDiagrams.find((d) => d.moleculeId === id)!

  it('says the molecular orbital diagram is the better description of O₂, whose unpaired electrons the lobes do not show', () => {
    expect(valenceBondNote(diagramOf('oxygen'), moleculeOf('oxygen'))).toBe(VALENCE_BOND_NOTE)
  })

  it('says both pictures give N₂ a triple bond', () => {
    expect(valenceBondNote(diagramOf('nitrogen'), moleculeOf('nitrogen'))).toBe(
      'The lobes are the valence bond picture. The molecular orbital diagram below agrees with it here: both give a triple bond with every electron paired.',
    )
  })

  it('claims agreement only where the diagram gives the bond order the Lewis structure draws', () => {
    const nitrogen = moleculeOf('nitrogen')
    const diagram = diagramOf('nitrogen')
    // With the σ2p pair removed every electron is still paired, but the order is 2 against a drawn triple bond.
    const levels = diagram.levels.map((level) => (level.label === 'σ2p' ? { ...level, electrons: 0 } : level))
    expect(bondOrder({ ...diagram, levels })).toBe(2)
    expect(unpairedElectrons({ ...diagram, levels })).toBe(0)
    expect(valenceBondNote({ ...diagram, levels }, nitrogen)).toBe(VALENCE_BOND_NOTE)
    // A half-integer order is never worded as a kind of bond.
    const odd = diagram.levels.map((level) => (level.label === 'σ2p' ? { ...level, electrons: 1 } : level))
    expect(bondOrder({ ...diagram, levels: odd })).toBe(2.5)
    expect(valenceBondNote({ ...diagram, levels: odd }, nitrogen)).toBe(VALENCE_BOND_NOTE)
  })
})
