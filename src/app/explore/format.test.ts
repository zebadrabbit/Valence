import { describe, expect, it } from 'vitest'
import { deriveBonds } from '@/chem-data/derive'
import { atomNames } from '@/chem-data/describe'
import { measure } from '@/chem-data/measure'
import { registry } from '@/chem-data/registry'
import { GEOMETRY_SOURCE_LABEL } from '@/chem-data/library'
import {
  bondOrder,
  cited,
  degrees,
  electrons,
  headlineValue,
  kjPerMol,
  length,
  measuredNote,
  measurementText,
  measurementValue,
  ordinal,
  polarity,
  radius,
  signed,
} from './format'

const molecule = (id: string) => registry.molecules.find((m) => m.id === id)!
const element = (symbol: string) => registry.elements.find((e) => e.symbol === symbol)!

describe('signed', () => {
  it.each([
    [1, '+1'],
    [6, '+6'],
    [0, '0'],
    [-1, '−1'],
    [-2, '−2'],
  ])('writes %i as %s', (value, text) => {
    expect(signed(value)).toBe(text)
  })

  it('uses a real minus sign, not a hyphen', () => {
    expect(signed(-2)).not.toContain('-')
  })
})

describe('radius, length and degrees', () => {
  it('keeps the trailing zero of a radius', () => {
    expect(radius(element('Xe').covalentRadius.value)).toBe('1.40 Å')
    expect(radius(element('H').vdwRadius.value)).toBe('1.10 Å')
  })

  it('writes a length to 0.001 Å', () => {
    expect(length(0.9579999)).toBe('0.958 Å')
  })

  it('writes an angle to 0.1 degree with a real minus sign', () => {
    expect(degrees(104.4776)).toBe('104.5°')
    expect(degrees(-119.8)).toBe('−119.8°')
  })

  it('does not write minus zero', () => {
    expect(degrees(-0.01)).toBe('0.0°')
  })
})

describe('cited', () => {
  it('writes the stored digits with the unit of the kind', () => {
    expect(cited(0.958, 'distance')).toBe('0.958 Å')
    expect(cited(104.4776, 'angle')).toBe('104.4776°')
    expect(cited(-60, 'dihedral')).toBe('−60°')
  })
})

describe('polarity and electrons', () => {
  it('writes an electronegativity difference to two places', () => {
    const [oh] = deriveBonds(molecule('water'), registry.elements)
    expect(polarity(oh!.electronegativityDifference)).toBe('1.24')
    expect(polarity(0)).toBe('0.00')
    expect(polarity(0.3)).toBe('0.30')
  })

  it('counts electrons in the singular and the plural', () => {
    expect([1, 2, 8].map(electrons)).toEqual(['1 electron', '2 electrons', '8 electrons'])
  })
})

describe('headlineValue and measuredNote', () => {
  const water = molecule('water')
  const o = water.atoms.findIndex((a) => a.element === 'O')
  const [h1, h2] = water.atoms.flatMap((a, i) => (a.element === 'H' ? [i] : []))

  it('shows the cited value of an experimental bond and says what the model gives', () => {
    const bond = measure(water, [o, h1!])!
    expect(headlineValue(bond)).toBe('0.958 Å')
    expect(measuredNote(water, bond)).toBe("Cited value, experimental (gas phase). The model's coordinates give 0.958 Å.")
  })

  it('shows the cited angle with its stored digits, and the model angle in the note', () => {
    const angle = measure(water, [h1!, o, h2!])!
    expect(headlineValue(angle)).toBe('104.4776°')
    expect(measuredNote(water, angle)).toBe("Cited value, experimental (gas phase). The model's coordinates give 104.5°.")
  })

  it('shows the model value where the experimental molecule has no cited value for the atoms', () => {
    const across = measure(water, [h1!, h2!])!
    expect(across.cited).toBeUndefined()
    expect(headlineValue(across)).toBe(measurementValue(across))
    expect(measuredNote(water, across)).toBe("Measured from the model's coordinates. Model geometry: experimental (gas phase).")
  })

  it('labels every value of a computed conformer as computed, never as cited (spec 5.2)', () => {
    const ethanol = molecule('ethanol')
    const bond = measure(ethanol, [ethanol.bonds[0]!.a, ethanol.bonds[0]!.b])!
    expect(headlineValue(bond)).toBe(measurementValue(bond))
    expect(measuredNote(ethanol, bond)).toBe(`Measured from the model's coordinates. Model geometry: ${GEOMETRY_SOURCE_LABEL['pubchem-computed']}.`)
    expect(measuredNote(ethanol, bond)).toContain('not an experimental structure')
  })
})

describe('kjPerMol', () => {
  it('converts the stored eV values to whole kJ/mol', () => {
    expect(kjPerMol(element('H').ionizationEnergiesEv.value[0]!)).toBe('1312 kJ/mol')
    expect(element('C').ionizationEnergiesEv.value.map(kjPerMol)).toEqual(['1086 kJ/mol', '2353 kJ/mol', '4620 kJ/mol'])
    expect(kjPerMol(element('Xe').ionizationEnergiesEv.value[2]!)).toBe('2996 kJ/mol')
  })
})

describe('ordinal', () => {
  it('writes English ordinals', () => {
    expect([1, 2, 3, 4, 11, 21].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '21st'])
  })
})

describe('bondOrder', () => {
  const orders = (id: string) => deriveBonds(molecule(id), registry.elements).map(bondOrder)

  it('reads every benzene ring bond as aromatic, order 1.5', () => {
    const benzene = molecule('benzene')
    const ring = orders('benzene').filter((_, i) => benzene.bonds[i]!.aromatic)
    expect(ring).toHaveLength(6)
    expect(new Set(ring)).toEqual(new Set(['aromatic (delocalised), order 1.5']))
  })

  it('names single, double and triple bonds', () => {
    expect(orders('water')[0]).toBe('1 (single)')
    expect(orders('carbon-dioxide')[0]).toBe('2 (double)')
    expect(orders('nitrogen')[0]).toBe('3 (triple)')
  })
})

describe('measurementText and measurementValue', () => {
  const water = molecule('water')
  const names = atomNames(water, registry.elements)
  const o = water.atoms.findIndex((a) => a.element === 'O')
  const [h1, h2] = water.atoms.flatMap((a, i) => (a.element === 'H' ? [i] : []))

  it('names both atoms of a distance', () => {
    expect(measurementText(measure(water, [o, h1!])!, names)).toBe('Distance from Oxygen 1 to Hydrogen 1: 0.958 Å.')
  })

  it('names the vertex of an angle first, and gives the cited value the card shows', () => {
    const angle = measure(water, [h1!, o, h2!])!
    expect(measurementText(angle, names)).toBe('Angle at Oxygen 1, between Hydrogen 1 and Hydrogen 2: 104.4776°.')
    expect(measurementText(angle, names)).toContain(headlineValue(angle))
  })

  it('gives the model value where nothing is cited', () => {
    expect(measurementText(measure(water, [h1!, h2!])!, names)).toMatch(/^Distance from Hydrogen 1 to Hydrogen 2: 1\.\d{3} Å\.$/)
  })

  it('lists the four atoms of a dihedral in order', () => {
    const peroxide = molecule('hydrogen-peroxide')
    const atoms = peroxide.measurements!.dihedrals[0]!.atoms
    expect(measurementText(measure(peroxide, atoms)!, atomNames(peroxide, registry.elements))).toBe(
      'Dihedral Hydrogen 1, Oxygen 1, Oxygen 2, Hydrogen 2: 119.8°.',
    )
  })

  it('says so when a dihedral has no value', () => {
    expect(measurementValue({ kind: 'dihedral', atoms: [0, 1, 2, 3], value: null })).toBe('not defined (three of the atoms lie in a line)')
  })
})
