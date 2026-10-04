import { describe, expect, it } from 'vitest'
import { deriveBonds } from '@/chem-data/derive'
import { atomNames } from '@/chem-data/describe'
import { measure } from '@/chem-data/measure'
import { registry } from '@/chem-data/registry'
import { GEOMETRY_SOURCE_LABEL } from '@/chem-data/library'
import {
  bondDerivedNote,
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
  publishedValue,
  radius,
  signed,
} from './format'
import { minusSigns } from './minus'

const molecule = (id: string) => registry.molecules.find((m) => m.id === id)!
const element = (symbol: string) => registry.elements.find((e) => e.symbol === symbol)!

describe('minusSigns', () => {
  it('turns every hyphen of a published list of oxidation states into a real minus sign and changes nothing else', () => {
    expect(minusSigns('+5, +3, -3')).toBe('+5, +3, −3')
    expect(minusSigns('+1, -1')).toBe('+1, −1')
    expect(minusSigns('+6, +4, +2, +1, 0, -1')).toBe('+6, +4, +2, +1, 0, −1')
    expect(minusSigns('-4, -2')).toBe('−4, −2')
    expect(minusSigns('6, 4,2, 1, 0')).toBe('6, 4,2, 1, 0')
  })
})

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
  it('writes the digits the source prints, with the unit of the kind', () => {
    expect(cited({ value: 2.02, published: '2.020', sourceId: 's' }, 'distance')).toBe('2.020 Å')
    expect(cited({ value: 104.4776, published: '104.4776', sourceId: 's' }, 'angle')).toBe('104.4776°')
    expect(cited({ value: -60, published: '-60.0', sourceId: 's' }, 'dihedral')).toBe('−60.0°')
  })

  it('writes the stored number where the source prints none', () => {
    expect(cited({ value: 120, sourceId: 's' }, 'angle')).toBe('120°')
    expect(cited({ value: -60, sourceId: 's' }, 'dihedral')).toBe('−60°')
  })

  it('keeps the trailing zeros of the library values that have them', () => {
    const headline = (id: string, atoms: number[]) => headlineValue(measure(molecule(id), atoms)!)
    const pcl5 = molecule('phosphorus-pentachloride')
    expect(new Set(pcl5.bonds.map((b) => headline(pcl5.id, [b.a, b.b])))).toEqual(new Set(['2.124 Å', '2.020 Å']))
    const peroxide = molecule('hydrogen-peroxide')
    expect(new Set(peroxide.bonds.map((b) => headline(peroxide.id, [b.a, b.b])))).toEqual(new Set(['1.475 Å', '0.950 Å']))
  })
})

describe('publishedValue', () => {
  it('writes the digits the source prints, not the stored number', () => {
    expect(publishedValue(element('H').atomicWeight)).toBe('1.0080')
    expect(publishedValue(element('Na').atomicWeight)).toBe('22.990')
    expect(publishedValue({ value: 2.2, published: '2.20', sourceId: 's' })).toBe('2.20')
  })

  it('writes electronegativities as PubChem prints them, hydrogen and xenon to one decimal', () => {
    expect(['H', 'Xe', 'C'].map((symbol) => publishedValue(element(symbol).electronegativity))).toEqual(['2.2', '2.6', '2.55'])
  })

  it('writes the stored number where no published text is stored', () => {
    expect(publishedValue({ value: 3.44, sourceId: 's' })).toBe('3.44')
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

  it('says an angle of PCl5 follows from symmetry and is not a figure the source prints', () => {
    const pcl5 = molecule('phosphorus-pentachloride')
    const names = atomNames(pcl5, registry.elements)
    const basis = "From the molecule's symmetry (D3h); the source prints no figure."
    for (const [value, count] of [
      [90, 6],
      [120, 3],
      [180, 1],
    ] as const) {
      const angles = pcl5.measurements!.angles.filter((angle) => angle.value === value).map((angle) => measure(pcl5, angle.atoms)!)
      expect(angles).toHaveLength(count)
      for (const angle of angles) {
        expect(headlineValue(angle)).toBe(`${value}°`)
        expect(measuredNote(pcl5, angle)).toBe(`${basis} The model's coordinates give ${value}.0°.`)
        expect(measuredNote(pcl5, angle)).not.toContain('Cited value')
        expect(measurementText(angle, names)).toMatch(new RegExp(`: ${value}° \\(from the molecule's symmetry\\)\\.$`))
      }
    }
    // Its two lengths are figures the source prints, and stay labelled as cited.
    const bond = measure(pcl5, [pcl5.bonds[0]!.a, pcl5.bonds[0]!.b])!
    expect(measuredNote(pcl5, bond)).toMatch(/^Cited value, experimental \(gas phase\)\./)
    expect(measurementText(bond, names)).toContain('(cited value)')
  })

  it('says of a printed angle that the point group fixes that it is cited and fixed by symmetry, so that BF3 and PCl5 read alike', () => {
    for (const [id, pointGroup, values] of [
      ['carbon-dioxide', 'D∞h', ['180']],
      ['methane', 'Td', ['109.471']],
      ['boron-trifluoride', 'D3h', ['120']],
      ['sulfur-hexafluoride', 'Oh', ['90', '180']],
      ['xenon-tetrafluoride', 'D4h', ['90', '180']],
    ] as const) {
      const m = molecule(id)
      const names = atomNames(m, registry.elements)
      expect([id, [...new Set(m.measurements!.angles.map((angle) => angle.published))]]).toEqual([id, values])
      for (const entry of m.measurements!.angles) {
        const angle = measure(m, entry.atoms)!
        expect(headlineValue(angle)).toBe(`${entry.published}°`)
        expect([id, measuredNote(m, angle)]).toEqual([id, `Cited value, experimental (gas phase); the molecule's symmetry (${pointGroup}) fixes it. The model's coordinates give ${entry.value.toFixed(1)}°.`])
        expect([id, measurementText(angle, names)]).toEqual([id, expect.stringMatching(new RegExp(`: ${entry.published}° \\(cited value, fixed by the molecule's symmetry\\)\\.$`))])
      }
      // A length is never fixed by the point group.
      const bond = measure(m, [m.bonds[0]!.a, m.bonds[0]!.b])!
      expect([id, measuredNote(m, bond)]).toEqual([id, expect.stringMatching(/^Cited value, experimental \(gas phase\)\. /)])
    }
  })

  it('says nothing of symmetry for an angle that had to be measured', () => {
    for (const id of ['water', 'ammonia', 'sulfur-dioxide', 'hydrogen-peroxide']) {
      const m = molecule(id)
      const angle = measure(m, m.measurements!.angles[0]!.atoms)!
      expect([id, measuredNote(m, angle)]).toEqual([id, expect.stringMatching(/^Cited value, experimental \(gas phase\)\. /)])
      expect([id, measurementText(angle, atomNames(m, registry.elements))]).toEqual([id, expect.stringContaining('(cited value).')])
    }
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

  it('reads both bonds of a resonance pair as order 1.5, whichever is drawn double', () => {
    for (const id of ['sulfur-dioxide', 'glycine-zwitterion', 'alanine-zwitterion', 'bicarbonate']) {
      const pair = orders(id).filter((_, i) => molecule(id).bonds[i]!.resonanceNote)
      expect(pair, id).toEqual(['resonance pair, order 1.5', 'resonance pair, order 1.5'])
    }
    // The protonated C–O of bicarbonate is not in the pair.
    expect(orders('bicarbonate').filter((order) => order === '1 (single)').length).toBeGreaterThan(0)
  })

  it('names single, double and triple bonds', () => {
    expect(orders('water')[0]).toBe('1 (single)')
    expect(orders('carbon-dioxide')[0]).toBe('2 (double)')
    expect(orders('nitrogen')[0]).toBe('3 (triple)')
  })
})

describe('bondDerivedNote', () => {
  const POLARITY = ' Polarity is the difference between the two cited electronegativities.'
  const notes = (id: string) => {
    const derived = deriveBonds(molecule(id), registry.elements)
    return [...new Set(molecule(id).bonds.map((b, i) => `${b.aromatic ? 'aromatic' : b.resonanceNote ? 'pair' : 'plain'}: ${bondDerivedNote(derived[i]!)}`))]
  }

  it('says of an ordinary bond only that its order is the drawn one', () => {
    expect(notes('water')).toEqual([`plain: Bond order and the σ and π count come from the Lewis structure as drawn.${POLARITY}`])
  })

  it('explains the order 1.5 of a resonance pair, and of no other bond of the molecule', () => {
    expect(notes('bicarbonate').sort()).toEqual([
      `pair: The Lewis structure draws one double and one single bond; the pair shares one π bond, so each bond has an effective order of 1.5.${POLARITY}`,
      `plain: Bond order and the σ and π count come from the Lewis structure as drawn.${POLARITY}`,
    ])
  })

  it('explains the order 1.5 of an aromatic bond', () => {
    expect(notes('benzene').sort()).toEqual([
      `aromatic: The Lewis structure draws the ring with alternating double and single bonds; the ring bonds share the π bonds equally, so each has an effective order of 1.5.${POLARITY}`,
      `plain: Bond order and the σ and π count come from the Lewis structure as drawn.${POLARITY}`,
    ])
  })
})

describe('measurementText and measurementValue', () => {
  const water = molecule('water')
  const names = atomNames(water, registry.elements)
  const o = water.atoms.findIndex((a) => a.element === 'O')
  const [h1, h2] = water.atoms.flatMap((a, i) => (a.element === 'H' ? [i] : []))

  it('names both atoms of a distance', () => {
    expect(measurementText(measure(water, [o, h1!])!, names)).toBe('Distance from Oxygen 1 to Hydrogen 1: 0.958 Å (cited value).')
  })

  it('names the vertex of an angle first, and gives the cited value the card shows, labelled as cited', () => {
    const angle = measure(water, [h1!, o, h2!])!
    expect(measurementText(angle, names)).toBe('Angle at Oxygen 1, between Hydrogen 1 and Hydrogen 2: 104.4776° (cited value).')
    expect(measurementText(angle, names)).toContain(headlineValue(angle))
  })

  it('gives the model value where nothing is cited, labelled as the model value', () => {
    expect(measurementText(measure(water, [h1!, h2!])!, names)).toMatch(/^Distance from Hydrogen 1 to Hydrogen 2: 1\.\d{3} Å \(measured from the model\)\.$/)
  })

  it('lists the four atoms of a dihedral in order', () => {
    const peroxide = molecule('hydrogen-peroxide')
    const atoms = peroxide.measurements!.dihedrals[0]!.atoms
    expect(measurementText(measure(peroxide, atoms)!, atomNames(peroxide, registry.elements))).toBe(
      'Dihedral Hydrogen 1, Oxygen 1, Oxygen 2, Hydrogen 2: 119.8° (cited value).',
    )
  })

  it('says so when a dihedral has no value', () => {
    const undefinedDihedral = { kind: 'dihedral', atoms: [0, 1, 2, 3], value: null } as const
    expect(measurementValue(undefinedDihedral)).toBe('not defined (three of the atoms lie in a line)')
    expect(measurementText(undefinedDihedral, ['A', 'B', 'C', 'D'])).toBe('Dihedral A, B, C, D: not defined (three of the atoms lie in a line).')
  })
})
