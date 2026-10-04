import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { cited, elementSchema, moleculeSchema, param, periodicElementSchema, reagentSchema, sourceSchema } from './schema'

const hazards = { signalWord: 'Danger', statements: ['Causes severe skin burns'], note: 'Dilute.', sourceId: 's1' }

describe('cited and param', () => {
  it('cited requires a sourceId', () => {
    const schema = cited(z.number())
    expect(schema.safeParse({ value: 1, sourceId: 's1' }).success).toBe(true)
    expect(schema.safeParse({ value: 1 }).success).toBe(false)
    expect(schema.safeParse({ value: 1, sourceId: '' }).success).toBe(false)
  })

  it('param requires a rationale', () => {
    const schema = param(z.number())
    expect(schema.safeParse({ value: 1, rationale: 'tuned' }).success).toBe(true)
    expect(schema.safeParse({ value: 1 }).success).toBe(false)
  })
})

describe('sourceSchema', () => {
  it('requires an http(s) url', () => {
    expect(sourceSchema.safeParse({ id: 's1', url: 'https://example.org', citation: 'Example' }).success).toBe(true)
    expect(sourceSchema.safeParse({ id: 's1', url: 'example.org', citation: 'Example' }).success).toBe(false)
  })
})

describe('reagentSchema', () => {
  const solution = {
    id: 'naoh-1m',
    name: 'Sodium hydroxide',
    formula: 'NaOH',
    pubchemCid: 14798,
    form: 'solution',
    molarity: 1,
    ions: [{ speciesId: 'na', ratio: 1 }],
    hazards,
    sourceId: 's1',
  }

  it('accepts a solution with a molarity', () => {
    expect(reagentSchema.safeParse(solution).success).toBe(true)
  })

  it('rejects a reagent with no sourceId', () => {
    expect(reagentSchema.safeParse({ ...solution, sourceId: undefined }).success).toBe(false)
  })

  it('rejects a solution with no molarity', () => {
    expect(reagentSchema.safeParse({ ...solution, molarity: undefined }).success).toBe(false)
  })

  it('requires molar mass and appearance for a solid', () => {
    const solid = { ...solution, id: 'caco3', form: 'solid', molarity: undefined }
    expect(reagentSchema.safeParse(solid).success).toBe(false)
    const complete = {
      ...solid,
      molarMass: { value: 100.09, sourceId: 's1' },
      appearance: { value: 'white powder', sourceId: 's1' },
    }
    expect(reagentSchema.safeParse(complete).success).toBe(true)
  })
})

describe('elementSchema', () => {
  const oxygen = {
    symbol: 'O',
    name: 'Oxygen',
    atomicNumber: 8,
    atomicWeight: { value: 15.999, sourceId: 's1' },
    electronegativity: { value: 3.44, sourceId: 's1' },
    configuration: { value: '1s2 2s2 2p4', sourceId: 's1' },
    shells: { value: [2, 6], sourceId: 's1' },
    ionizationEnergiesEv: { value: [13.618055, 35.12112], sourceId: 's1' },
    covalentRadius: { value: 0.66, sourceId: 's1' },
    vdwRadius: { value: 1.52, sourceId: 's1' },
    ionicRadii: [{ charge: -2, coordination: 6, value: 1.4, sourceId: 's1' }],
    color: { value: '#FF0D0D', sourceId: 's1' },
    sourceId: 's1',
  }

  it('accepts an element, with or without notes', () => {
    expect(elementSchema.safeParse(oxygen).success).toBe(true)
    expect(elementSchema.safeParse({ ...oxygen, notes: ['A note.'] }).success).toBe(true)
  })

  it('accepts the published text of an atomic weight and an electronegativity, and of no other value', () => {
    const published = { ...oxygen, atomicWeight: { ...oxygen.atomicWeight, published: '15.999' }, electronegativity: { ...oxygen.electronegativity, published: '3.44' } }
    expect(elementSchema.safeParse(published).success).toBe(true)
    expect(elementSchema.safeParse({ ...oxygen, electronegativity: { ...oxygen.electronegativity, published: '' } }).success).toBe(false)
    expect(elementSchema.safeParse({ ...oxygen, vdwRadius: { ...oxygen.vdwRadius, published: '1.52' } }).success).toBe(false)
  })

  it('rejects a value with no source', () => {
    expect(elementSchema.safeParse({ ...oxygen, vdwRadius: 1.52 }).success).toBe(false)
    expect(elementSchema.safeParse({ ...oxygen, vdwRadius: { value: 1.52 } }).success).toBe(false)
    expect(elementSchema.safeParse({ ...oxygen, sourceId: undefined }).success).toBe(false)
  })

  it('rejects an unknown key', () => {
    expect(elementSchema.safeParse({ ...oxygen, uncertainty: 0.001 }).success).toBe(false)
    const radius = { ...oxygen.ionicRadii[0]!, kind: 'crystal' }
    expect(elementSchema.safeParse({ ...oxygen, ionicRadii: [radius] }).success).toBe(false)
  })
})

describe('moleculeSchema', () => {
  const molecule = {
    id: 'h2',
    name: 'Hydrogen',
    formula: 'H2',
    pubchemCid: 783,
    topic: 'basics',
    charge: 0,
    atoms: [
      { element: 'H', position: [0, 0, 0], position2d: [0, 0], formalCharge: 0, lonePairs: 0 },
      { element: 'H', position: [0.74, 0, 0], position2d: [1, 0], formalCharge: 0, lonePairs: 0 },
    ],
    bonds: [{ a: 0, b: 1, order: 1, aromatic: false }],
    geometrySource: 'cited-experimental',
    sourceId: 's1',
  }

  it('requires an integer charge', () => {
    expect(moleculeSchema.safeParse({ ...molecule, charge: undefined }).success).toBe(false)
    expect(moleculeSchema.safeParse({ ...molecule, charge: 0.5 }).success).toBe(false)
  })

  it('accepts cited measurements and notes, and rejects a malformed measurement', () => {
    const length = { atoms: [0, 1], value: 0.741, sourceId: 's1' }
    const measurements = { lengths: [length], angles: [], dihedrals: [] }
    expect(moleculeSchema.safeParse({ ...molecule, measurements, notes: ['A note.'] }).success).toBe(true)
    const bad = [
      { ...length, sourceId: undefined },
      { ...length, atoms: [0, 1, 2] },
      { ...length, label: 'r(H-H)' },
    ]
    for (const entry of bad) {
      expect(moleculeSchema.safeParse({ ...molecule, measurements: { ...measurements, lengths: [entry] } }).success).toBe(false)
    }
  })

  it('accepts the published text of a measurement, and rejects an empty one and an unknown key', () => {
    const length = { atoms: [0, 1], value: 0.95, sourceId: 's1' }
    const parse = (entry: object) => moleculeSchema.safeParse({ ...molecule, measurements: { lengths: [entry], angles: [], dihedrals: [] } }).success
    expect(parse({ ...length, published: '0.950' })).toBe(true)
    expect(parse({ ...length, published: '' })).toBe(false)
    expect(parse({ ...length, published: '0.950', printed: '0.950' })).toBe(false)
  })

  it('accepts the point group a measurement follows from, and rejects an empty one', () => {
    const angle = { atoms: [0, 1, 0], value: 120, sourceId: 's1' }
    const parse = (entry: object) => moleculeSchema.safeParse({ ...molecule, measurements: { lengths: [], angles: [entry], dihedrals: [] } }).success
    expect(parse({ ...angle, symmetry: 'D3h' })).toBe(true)
    expect(parse({ ...angle, symmetry: '' })).toBe(false)
  })

  it('rejects an unknown geometry source', () => {
    const molecule = {
      id: 'h2',
      name: 'Hydrogen',
      formula: 'H2',
      pubchemCid: 783,
      topic: 'basics',
      charge: 0,
      atoms: [
        { element: 'H', position: [0, 0, 0], position2d: [0, 0], formalCharge: 0, lonePairs: 0 },
        { element: 'H', position: [0.74, 0, 0], position2d: [1, 0], formalCharge: 0, lonePairs: 0 },
      ],
      bonds: [{ a: 0, b: 1, order: 1, aromatic: false }],
      geometrySource: 'guessed',
      sourceId: 's1',
    }
    expect(moleculeSchema.safeParse(molecule).success).toBe(false)
    expect(moleculeSchema.safeParse({ ...molecule, geometrySource: 'ideal-vsepr' }).success).toBe(false)
    expect(moleculeSchema.safeParse({ ...molecule, geometrySource: 'cited-experimental' }).success).toBe(true)
  })
})

describe('periodicElementSchema', () => {
  const quantity = (published: string, unit: string) => ({ value: Number(published), published, unit, sourceId: 's1' })
  const fluorine = {
    atomicNumber: 9,
    symbol: 'F',
    name: 'Fluorine',
    category: 'Halogen',
    configuration: { text: '[He]2s2 2p5' },
    standardState: { state: 'Gas', expected: false },
    oxidationStates: '-1',
    yearDiscovered: 1670,
    atomicMass: { ...quantity('18.998', 'u'), kind: 'standard-atomic-weight' },
    electronegativity: quantity('3.98', ''),
    covalentRadius: quantity('57', 'pm'),
    vdwRadius: quantity('135', 'pm'),
    electronAffinity: quantity('3.339', 'eV'),
    ionizationEnergy: { ...quantity('17.42282', 'eV'), flag: 'measured' },
    meltingPoint: quantity('53.53', 'K'),
    boilingPoint: quantity('85.03', 'K'),
    density: quantity('0.001696', 'g/cm³'),
    notes: [{ row: 'yearDiscovered', text: 'A note.', sourceId: 's1' }],
    sourceId: 's1',
  }
  const accepts = (element: unknown) => periodicElementSchema.safeParse(element).success

  it('accepts a full record, and one with only the fields every element has', () => {
    expect(accepts(fluorine)).toBe(true)
    const { atomicNumber, symbol, name, category, configuration, standardState, yearDiscovered, atomicMass, sourceId } = fluorine
    expect(accepts({ atomicNumber, symbol, name, category, configuration, standardState, yearDiscovered, atomicMass, sourceId })).toBe(true)
  })

  it('accepts the two kinds of atomic mass, and an isotope mass only with its mass number and estimated flag', () => {
    const isotope = { ...quantity('96.90636', 'u'), kind: 'isotope-mass', massNumber: 97, estimated: false }
    expect(accepts({ ...fluorine, atomicMass: isotope })).toBe(true)
    expect(accepts({ ...fluorine, atomicMass: { ...isotope, massNumber: undefined } })).toBe(false)
    expect(accepts({ ...fluorine, atomicMass: { ...isotope, estimated: undefined } })).toBe(false)
    expect(accepts({ ...fluorine, atomicMass: { ...fluorine.atomicMass, massNumber: 19 } })).toBe(false)
    expect(accepts({ ...fluorine, atomicMass: quantity('18.998', 'u') })).toBe(false)
  })

  it('accepts a marked configuration, an expected state and an ancient year', () => {
    expect(accepts({ ...fluorine, configuration: { text: '[Rn]7s2 5f14 6d7', qualifier: 'calculated' } })).toBe(true)
    expect(accepts({ ...fluorine, configuration: { text: '[Rn]7s2 5f14 6d8', qualifier: 'guessed' } })).toBe(false)
    expect(accepts({ ...fluorine, standardState: { state: 'Solid', expected: true } })).toBe(true)
    expect(accepts({ ...fluorine, standardState: { state: 'Plasma', expected: false } })).toBe(false)
    expect(accepts({ ...fluorine, yearDiscovered: 'Ancient' })).toBe(true)
    expect(accepts({ ...fluorine, yearDiscovered: 'Unknown' })).toBe(false)
  })

  it('rejects an unknown key', () => {
    expect(accepts({ ...fluorine, cpkHexColor: '90E050' })).toBe(false)
    expect(accepts({ ...fluorine, density: { ...fluorine.density, uncertainty: 0.000001 } })).toBe(false)
    expect(accepts({ ...fluorine, notes: [{ ...fluorine.notes[0]!, author: 'someone' }] })).toBe(false)
  })

  it('rejects an unknown category', () => {
    expect(accepts({ ...fluorine, category: 'Other nonmetal' })).toBe(false)
  })

  it('rejects a quantity with no published text', () => {
    expect(accepts({ ...fluorine, density: { value: 0.001696, unit: 'g/cm³', sourceId: 's1' } })).toBe(false)
    expect(accepts({ ...fluorine, density: { ...fluorine.density, published: '' } })).toBe(false)
  })

  it('rejects a unit on electronegativity, and any quantity in a unit other than its own', () => {
    expect(accepts({ ...fluorine, electronegativity: quantity('3.98', 'Pauling') })).toBe(false)
    expect(accepts({ ...fluorine, covalentRadius: quantity('0.57', 'Å') })).toBe(false)
    expect(accepts({ ...fluorine, meltingPoint: quantity('-219.62', '°C') })).toBe(false)
    expect(accepts({ ...fluorine, ionizationEnergy: { ...quantity('1681', 'kJ/mol'), flag: 'measured' } })).toBe(false)
  })

  it('rejects a quantity that is zero or negative: an absent value is left out, never stored as zero', () => {
    expect(accepts({ ...fluorine, electronAffinity: quantity('0', 'eV') })).toBe(false)
    expect(accepts({ ...fluorine, density: quantity('0.0', 'g/cm³') })).toBe(false)
    expect(accepts({ ...fluorine, meltingPoint: quantity('-219.62', 'K') })).toBe(false)
    expect(accepts({ ...fluorine, atomicMass: { ...quantity('0', 'u'), kind: 'standard-atomic-weight' } })).toBe(false)
  })

  it('rejects an empty list of notes: an element with none has no notes key', () => {
    expect(accepts({ ...fluorine, notes: [] })).toBe(false)
    const { notes, ...without } = fluorine
    expect(notes.length).toBe(1)
    expect(accepts(without)).toBe(true)
  })

  it('rejects configuration text that is not a core and subshells, or that still carries a marking', () => {
    for (const text of ['1s1', '[He] 2s2 2p3', '[Ar]4s1 3d10', '[Rn]7s2 7p2 5f14 6d10']) expect([text, accepts({ ...fluorine, configuration: { text } })]).toEqual([text, true])
    for (const text of ['garbage', '1s1 (predicted)', '[Rn]7s2 5f14 6d7 (calculated)', '1s1 ', ' 1s1', '[He]2s2  2p5', '[He]', '[helium]2s1', '2s']) {
      expect([text, accepts({ ...fluorine, configuration: { text } })]).toEqual([text, false])
    }
  })

  it('rejects an ionization energy with no NIST flag, and a note on a row the card does not have', () => {
    expect(accepts({ ...fluorine, ionizationEnergy: quantity('17.42282', 'eV') })).toBe(false)
    expect(accepts({ ...fluorine, notes: [{ row: 'colour', text: 'A note.', sourceId: 's1' }] })).toBe(false)
    expect(accepts({ ...fluorine, notes: [{ row: 'density', text: 'A note.' }] })).toBe(false)
  })
})
