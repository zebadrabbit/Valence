import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { cited, elementSchema, moleculeSchema, param, reagentSchema, sourceSchema } from './schema'

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
