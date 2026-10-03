import { describe, expect, it } from 'vitest'
import { deriveBonds } from '@/chem-data/derive'
import { atomNames } from '@/chem-data/describe'
import { measure } from '@/chem-data/measure'
import { registry } from '@/chem-data/registry'
import { bondOrder, cited, degrees, kjPerMol, length, measurementText, measurementValue, ordinal, radius, signed } from './format'

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

  it('names the vertex of an angle first', () => {
    expect(measurementText(measure(water, [h1!, o, h2!])!, names)).toBe('Angle at Oxygen 1, between Hydrogen 1 and Hydrogen 2: 104.5°.')
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
