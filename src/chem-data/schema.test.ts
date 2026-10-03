import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { cited, moleculeSchema, param, reagentSchema, sourceSchema } from './schema'

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

describe('moleculeSchema', () => {
  it('rejects an unknown geometry source', () => {
    const molecule = {
      id: 'h2',
      name: 'Hydrogen',
      pubchemCid: 783,
      topic: 'basics',
      atoms: [
        { element: 'H', position: [0, 0, 0], position2d: [0, 0], formalCharge: 0, lonePairs: 0 },
        { element: 'H', position: [0.74, 0, 0], position2d: [1, 0], formalCharge: 0, lonePairs: 0 },
      ],
      bonds: [{ a: 0, b: 1, order: 1, aromatic: false }],
      geometrySource: 'guessed',
      sourceId: 's1',
    }
    expect(moleculeSchema.safeParse(molecule).success).toBe(false)
    expect(moleculeSchema.safeParse({ ...molecule, geometrySource: 'cited-experimental' }).success).toBe(true)
  })
})
