import { describe, expect, it } from 'vitest'
import { validateRegistry } from './validate'

const hazards = { signalWord: 'Warning', statements: ['Harmful if swallowed'], note: 'Dilute solution.', sourceId: 's1' }

function validRegistry() {
  return {
    sources: [{ id: 's1', url: 'https://pubchem.ncbi.nlm.nih.gov/', citation: 'PubChem' }],
    species: [
      { id: 'ba', formula: 'Ba2+', composition: { Ba: 1 }, charge: 2, state: 'aq', sourceId: 's1' },
      { id: 'cl', formula: 'Cl-', composition: { Cl: 1 }, charge: -1, state: 'aq', sourceId: 's1' },
      {
        id: 'cu',
        formula: 'Cu2+',
        composition: { Cu: 1 },
        charge: 2,
        state: 'aq',
        solutionColor: { value: { name: 'blue', hex: '#3b82f6' }, sourceId: 's1' },
        sourceId: 's1',
      },
      { id: 'so4', formula: 'SO4 2-', composition: { S: 1, O: 4 }, charge: -2, state: 'aq', sourceId: 's1' },
      { id: 'baso4', formula: 'BaSO4', composition: { Ba: 1, S: 1, O: 4 }, charge: 0, state: 's', sourceId: 's1' },
    ],
    reagents: [
      {
        id: 'bacl2-0.5m',
        name: 'Barium chloride',
        formula: 'BaCl2',
        pubchemCid: 25204,
        form: 'solution',
        molarity: 0.5,
        ions: [
          { speciesId: 'ba', ratio: 1 },
          { speciesId: 'cl', ratio: 2 },
        ],
        hazards,
        sourceId: 's1',
      },
      {
        id: 'cuso4-0.5m',
        name: 'Copper(II) sulfate',
        formula: 'CuSO4',
        pubchemCid: 24462,
        form: 'solution',
        molarity: 0.5,
        ions: [
          { speciesId: 'cu', ratio: 1 },
          { speciesId: 'so4', ratio: 1 },
        ],
        hazards,
        sourceId: 's1',
      },
    ],
    observations: [{ productId: 'baso4', color: 'white', texture: 'fine powder', sourceId: 's1' }],
    stations: [
      {
        id: 'aq-04',
        reagentIds: ['bacl2-0.5m', 'cuso4-0.5m'],
        amounts: [
          { value: 2, unit: 'mL' },
          { value: 2, unit: 'mL' },
        ],
        observationTools: ['eye'],
        expected: { precipitate: 'baso4', gas: null, temperature: 'none', liquidColor: 'blue', odor: null },
        notes: ['Spectator ions keep their colour at room temperature.'],
      },
    ],
    molecules: [
      {
        id: 'water',
        name: 'Water',
        pubchemCid: 962,
        topic: 'basics',
        atoms: [
          { element: 'O', position: [0, 0, 0], position2d: [0, 0], formalCharge: 0, lonePairs: 2 },
          { element: 'H', position: [0.757, 0.586, 0], position2d: [1, 0.5], formalCharge: 0, lonePairs: 0 },
          { element: 'H', position: [-0.757, 0.586, 0], position2d: [-1, 0.5], formalCharge: 0, lonePairs: 0 },
        ],
        bonds: [
          { a: 0, b: 1, order: 1, aromatic: false },
          { a: 0, b: 2, order: 1, aromatic: false },
        ],
        geometrySource: 'cited-experimental',
        sourceId: 's1',
      },
    ],
  }
}

describe('validateRegistry', () => {
  it('accepts a valid registry', () => {
    expect(validateRegistry(validRegistry())).toEqual([])
  })

  it('accepts an empty registry', () => {
    const empty = { sources: [], species: [], reagents: [], observations: [], stations: [], molecules: [] }
    expect(validateRegistry(empty)).toEqual([])
  })

  describe('never throws on malformed input', () => {
    it.each([null, 42, 'registry', [], {}, { sources: 'nope' }])('returns schema errors for %j', (input) => {
      const errors = validateRegistry(input)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.every((e) => e.startsWith('schema:'))).toBe(true)
    })
  })

  it('rejects an unknown key instead of silently dropping it', () => {
    const r = validRegistry() as Record<string, unknown>
    r.sources = [{ id: 's1', url: 'https://pubchem.ncbi.nlm.nih.gov/', citation: 'PubChem', storage: 'Room 214' }]
    expect(validateRegistry(r).some((e) => e.startsWith('schema:'))).toBe(true)
    expect(validateRegistry({ ...validRegistry(), extra: 1 }).some((e) => e.startsWith('schema:'))).toBe(true)
  })

  it.each(['sources', 'species', 'reagents', 'observations', 'stations', 'molecules'])(
    'rejects an unknown key on a %s record',
    (key) => {
      const r = validRegistry() as Record<string, unknown>
      const list = r[key] as Record<string, unknown>[]
      list[0] = { ...list[0]!, bogus: 1 }
      expect(validateRegistry(r).some((e) => e.startsWith('schema:'))).toBe(true)
    },
  )

  describe('condition 1: sources', () => {
    it('rejects a record with no sourceId', () => {
      const r = validRegistry()
      delete (r.species[0] as { sourceId?: string }).sourceId
      expect(validateRegistry(r).join('\n')).toMatch(/schema: species\.0\.sourceId/)
    })

    it('rejects a sourceId that does not exist', () => {
      const r = validRegistry()
      r.reagents[0]!.sourceId = 'missing'
      expect(validateRegistry(r)).toContain('registry.reagents[0].sourceId: unknown source "missing"')
    })

    it('rejects an unknown sourceId on an individually cited value', () => {
      const r = validRegistry()
      r.species[2]!.solutionColor!.sourceId = 'nope'
      expect(validateRegistry(r)).toContain('registry.species[2].solutionColor.sourceId: unknown source "nope"')
    })

    it('rejects duplicate source ids', () => {
      const r = validRegistry()
      r.sources.push({ ...r.sources[0]! })
      expect(validateRegistry(r)).toContain('sources: duplicate id "s1"')
    })
  })

  describe('condition 2: references', () => {
    it('rejects a station that names an unknown reagent', () => {
      const r = validRegistry()
      r.stations[0]!.reagentIds[1] = 'ghost'
      expect(validateRegistry(r)).toContain('station "aq-04": unknown reagent "ghost"')
    })

    it('rejects a station whose expected precipitate is unknown', () => {
      const r = validRegistry()
      r.stations[0]!.expected.precipitate = 'ghost'
      expect(validateRegistry(r)).toContain('station "aq-04": unknown species "ghost"')
    })

    it('rejects a reagent that releases an unknown ion', () => {
      const r = validRegistry()
      r.reagents[0]!.ions[0]!.speciesId = 'ghost'
      expect(validateRegistry(r)).toContain('reagent "bacl2-0.5m": unknown species "ghost"')
    })

    it('rejects an observation for an unknown product', () => {
      const r = validRegistry()
      r.observations[0]!.productId = 'ghost'
      expect(validateRegistry(r)).toContain('observation: unknown species "ghost"')
    })

    it('rejects duplicate ids within a collection', () => {
      const r = validRegistry()
      r.species.push({ ...r.species[0]! })
      expect(validateRegistry(r)).toContain('species: duplicate id "ba"')
    })
  })

  describe('condition 3: 2D-looking coordinates', () => {
    it('rejects a bond to hydrogen shorter than 0.80 Å', () => {
      const r = validRegistry()
      r.molecules[0]!.atoms[1]!.position = [0.5, 0, 0]
      expect(validateRegistry(r).join('\n')).toMatch(/molecule "water": bond 0-1 is 0\.500 Å/)
    })

    it('rejects a bond between heavy atoms shorter than 1.05 Å', () => {
      const r = validRegistry()
      const m = r.molecules[0]!
      m.atoms.push({ element: 'O', position: [1, 0, 0], position2d: [1, 0], formalCharge: 0, lonePairs: 2 })
      m.bonds.push({ a: 0, b: 3, order: 1, aromatic: false })
      expect(validateRegistry(r).join('\n')).toMatch(/molecule "water": bond 0-3 is 1\.000 Å/)
    })

    it('rejects a bond that points at a missing atom', () => {
      const r = validRegistry()
      r.molecules[0]!.bonds[0]!.b = 9
      expect(validateRegistry(r)).toContain('molecule "water": bond 0-9 refers to a missing atom')
    })

    it('accepts a linear molecule with every z equal to 0', () => {
      const r = validRegistry()
      r.molecules.push({
        id: 'co2',
        name: 'Carbon dioxide',
        pubchemCid: 280,
        topic: 'basics',
        atoms: [
          { element: 'C', position: [0, 0, 0], position2d: [0, 0], formalCharge: 0, lonePairs: 0 },
          { element: 'O', position: [1.162, 0, 0], position2d: [1, 0], formalCharge: 0, lonePairs: 2 },
          { element: 'O', position: [-1.162, 0, 0], position2d: [-1, 0], formalCharge: 0, lonePairs: 2 },
        ],
        bonds: [
          { a: 0, b: 1, order: 1, aromatic: false },
          { a: 0, b: 2, order: 1, aromatic: false },
        ],
        geometrySource: 'cited-experimental',
        sourceId: 's1',
      })
      expect(validateRegistry(r)).toEqual([])
    })
  })

  describe('condition 4: institution-specific text', () => {
    it('rejects a location in a note', () => {
      const r = validRegistry()
      r.stations[0]!.notes.push('Reagents are kept in Room 214.')
      expect(validateRegistry(r).join('\n')).toMatch(/registry\.stations\[0\]\.notes\[1\]: looks like a location/)
    })

    it('rejects a course number in a name', () => {
      const r = validRegistry()
      r.reagents[0]!.name = 'Barium chloride for CHEM 1411'
      expect(validateRegistry(r).join('\n')).toMatch(/registry\.reagents\[0\]\.name: looks like a course number/)
    })

    it('rejects a configured institution name, including in a citation', () => {
      const r = validRegistry()
      r.sources[0]!.citation = 'Example State lab manual'
      const errors = validateRegistry(r, { institutionNames: ['Example State'] })
      expect(errors.join('\n')).toMatch(/registry\.sources\[0\]\.citation: contains the name/)
    })

    it('does not apply the location and course patterns to citations or ids', () => {
      const r = validRegistry()
      r.sources[0]!.citation = 'NIST SRD 101, release 22'
      expect(validateRegistry(r)).toEqual([])
    })
  })
})
