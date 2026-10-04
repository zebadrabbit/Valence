import { describe, expect, it } from 'vitest'
import type { Molecule, PeriodicElement } from './schema'
import { validatePeriodicTable, validateRegistry } from './validate'

const hazards = { signalWord: 'Warning', statements: ['Harmful if swallowed'], note: 'Dilute solution.', sourceId: 's1' }

// Only the shells matter to the validator; the other values are placeholders.
function element(symbol: string, atomicNumber: number, shells: number[]) {
  const one = { value: 1, sourceId: 's1' }
  return {
    symbol,
    name: symbol,
    atomicNumber,
    atomicWeight: one,
    electronegativity: one,
    configuration: { value: '1s1', sourceId: 's1' },
    shells: { value: shells, sourceId: 's1' },
    ionizationEnergiesEv: { value: [1], sourceId: 's1' },
    covalentRadius: one,
    vdwRadius: one,
    ionicRadii: [{ charge: 1, coordination: 6, value: 1, sourceId: 's1' }],
    color: { value: '#FF8000', sourceId: 's1' },
    sourceId: 's1',
  }
}

// Hydrogen peroxide with its cited gas-phase geometry: the only fixture with a dihedral.
function hydrogenPeroxide() {
  const molecule = {
    id: 'h2o2',
    name: 'Hydrogen peroxide',
    formula: 'H2O2',
    pubchemCid: 784,
    topic: 'basics',
    charge: 0,
    atoms: [
      { element: 'O', position: [-0.028139, 0, 0.7375], position2d: [0, 0], formalCharge: 0, lonePairs: 2 },
      { element: 'O', position: [-0.028139, 0, -0.7375], position2d: [1, 0], formalCharge: 0, lonePairs: 2 },
      { element: 'H', position: [0.446625, 0.819011, 0.816994], position2d: [0, 1], formalCharge: 0, lonePairs: 0 },
      { element: 'H', position: [0.446625, -0.819011, -0.816994], position2d: [1, -1], formalCharge: 0, lonePairs: 0 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1, aromatic: false },
      { a: 0, b: 2, order: 1, aromatic: false },
      { a: 1, b: 3, order: 1, aromatic: false },
    ],
    geometrySource: 'cited-experimental',
    measurements: {
      lengths: [
        { atoms: [0, 1], value: 1.475, sourceId: 's1' },
        { atoms: [0, 2], value: 0.95, sourceId: 's1' },
        { atoms: [1, 3], value: 0.95, sourceId: 's1' },
      ],
      angles: [
        { atoms: [2, 0, 1], value: 94.8, sourceId: 's1' },
        { atoms: [3, 1, 0], value: 94.8, sourceId: 's1' },
      ],
      dihedrals: [{ atoms: [2, 0, 1, 3], value: 119.8, sourceId: 's1' }],
    },
    sourceId: 's1',
  } satisfies Molecule
  return molecule
}

function validRegistry() {
  const water = {
    id: 'water',
    name: 'Water',
    formula: 'H2O',
    pubchemCid: 962,
    topic: 'basics',
    charge: 0,
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
    measurements: {
      lengths: [
        { atoms: [0, 1], value: 0.957, sourceId: 's1' },
        { atoms: [0, 2], value: 0.957, sourceId: 's1' },
      ],
      angles: [{ atoms: [1, 0, 2], value: 104.5, sourceId: 's1' }],
      dihedrals: [],
    },
    sourceId: 's1',
  } satisfies Molecule
  const molecules: Molecule[] = [water]
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
    elements: [element('H', 1, [1]), element('C', 6, [2, 4]), element('O', 8, [2, 6])],
    molecules,
    // Water's eight valence electrons. The labels are placeholders.
    moDiagrams: [
      {
        moleculeId: 'water',
        levels: [
          { label: 'σ', degeneracy: 2, electrons: 4, type: 'bonding' },
          { label: 'π', degeneracy: 2, electrons: 4, type: 'bonding' },
          { label: 'σ*', degeneracy: 2, electrons: 0, type: 'antibonding' },
        ],
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
    const empty = { sources: [], species: [], reagents: [], observations: [], stations: [], elements: [], molecules: [], moDiagrams: [] }
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

  it.each(['sources', 'species', 'reagents', 'observations', 'stations', 'elements', 'molecules'])(
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

    it('rejects a variantGroup without a variantLabel, and the reverse; accepts both or neither', () => {
      const r = validRegistry()
      const m = r.molecules[0]!
      expect(validateRegistry(r)).toEqual([])
      m.variantGroup = 'water'
      expect(validateRegistry(r)).toContain('molecule "water": variantGroup and variantLabel must be given together')
      m.variantLabel = 'Neutral'
      expect(validateRegistry(r)).toEqual([])
      delete m.variantGroup
      expect(validateRegistry(r)).toContain('molecule "water": variantGroup and variantLabel must be given together')
    })

    it('rejects a display formula that is not the formula with charge markers', () => {
      const r = validRegistry()
      const m = r.molecules[0]!
      m.displayFormula = `${m.formula}+`
      expect(validateRegistry(r)).toEqual([])
      m.displayFormula = 'XeF4+'
      expect(validateRegistry(r)).toContain('molecule "water": displayFormula must be the formula with charge markers added')
    })

    it('rejects two bonds joining the same pair of atoms, in either order; accepts distinct bonds', () => {
      const r = validRegistry()
      const m = r.molecules[0]!
      expect(validateRegistry(r).join('\n')).not.toMatch(/duplicate bond/)
      m.bonds.push({ a: 1, b: 0, order: 1, aromatic: false })
      expect(validateRegistry(r)).toContain('molecule "water": duplicate bond 0-1')
    })

    it('accepts a linear molecule with every z equal to 0', () => {
      const r = validRegistry()
      r.molecules.push({
        id: 'co2',
        name: 'Carbon dioxide',
        formula: 'CO2',
        pubchemCid: 280,
        topic: 'basics',
        charge: 0,
        atoms: [
          { element: 'C', position: [0, 0, 0], position2d: [0, 0], formalCharge: 0, lonePairs: 0 },
          { element: 'O', position: [1.162, 0, 0], position2d: [1, 0], formalCharge: 0, lonePairs: 2 },
          { element: 'O', position: [-1.162, 0, 0], position2d: [-1, 0], formalCharge: 0, lonePairs: 2 },
        ],
        bonds: [
          { a: 0, b: 1, order: 2, aromatic: false },
          { a: 0, b: 2, order: 2, aromatic: false },
        ],
        geometrySource: 'cited-experimental',
        measurements: {
          lengths: [
            { atoms: [0, 1], value: 1.162, sourceId: 's1' },
            { atoms: [0, 2], value: 1.162, sourceId: 's1' },
          ],
          angles: [{ atoms: [1, 0, 2], value: 180, sourceId: 's1' }],
          dihedrals: [],
        },
        sourceId: 's1',
      })
      expect(validateRegistry(r)).toEqual([])
    })
  })

  describe('elements and Lewis structures', () => {
    it('rejects duplicate element symbols', () => {
      const r = validRegistry()
      r.elements.push(element('O', 8, [2, 6]))
      expect(validateRegistry(r)).toContain('elements: duplicate id "O"')
    })

    it('rejects an atom whose element is not in the registry', () => {
      const r = validRegistry()
      r.molecules[0]!.atoms[1]!.element = 'D'
      expect(validateRegistry(r)).toContain('molecule "water": atom 1 has unknown element "D"')
    })

    it('rejects a stored formal charge that the lone pairs and bond orders do not give', () => {
      const r = validRegistry()
      r.molecules[0]!.atoms[0]!.lonePairs = 1
      expect(validateRegistry(r)).toContain('molecule "water": atom 0 (O) has formal charge 0, expected 2')
    })

    it('accepts an ion whose formal charges sum to its charge', () => {
      const r = validRegistry()
      const water = r.molecules[0]!
      water.atoms[0]!.formalCharge = 1
      water.atoms[0]!.lonePairs = 1
      water.atoms.push({ element: 'H', position: [0, 0, 0.96], position2d: [0, 1], formalCharge: 0, lonePairs: 0 })
      water.bonds.push({ a: 0, b: 3, order: 1, aromatic: false })
      water.measurements!.lengths.push({ atoms: [0, 3], value: 0.96, sourceId: 's1' })
      water.charge = 1
      expect(validateRegistry(r)).toEqual([])
    })

    it('rejects formal charges that do not sum to the charge', () => {
      const r = validRegistry()
      r.molecules[0]!.charge = 1
      expect(validateRegistry(r)).toContain('molecule "water": formal charges sum to 0, but charge is 1')
    })
  })

  describe('cited experimental measurements', () => {
    it('accepts lengths within 0.01 Å and angles and dihedrals within 1°', () => {
      const r = validRegistry()
      const m = hydrogenPeroxide()
      m.measurements!.lengths[0]!.value = 1.484
      m.measurements!.angles[0]!.value = 95.7
      m.measurements!.dihedrals[0]!.value = 120.7
      r.molecules.push(m)
      expect(validateRegistry(r)).toEqual([])
    })

    it('rejects a cited length the coordinates miss by more than 0.01 Å', () => {
      const r = validRegistry()
      r.molecules[0]!.measurements!.lengths[1]!.value = 0.97
      expect(validateRegistry(r)).toEqual(['molecule "water": length 0-2 measures 0.957 Å, cited 0.97 Å'])
    })

    it('rejects a cited angle the coordinates miss by more than 1°', () => {
      const r = validRegistry()
      r.molecules[0]!.measurements!.angles[0]!.value = 109.5
      expect(validateRegistry(r)).toEqual(['molecule "water": angle 1-0-2 measures 104.512 °, cited 109.5 °'])
    })

    it('rejects a cited angle 1.5° from the coordinates, so the tolerance stays at 1°', () => {
      const r = validRegistry()
      r.molecules[0]!.measurements!.angles[0]!.value = 106.0
      expect(validateRegistry(r)).toEqual(['molecule "water": angle 1-0-2 measures 104.512 °, cited 106 °'])
    })

    it('rejects a cited dihedral 1.6° from the coordinates', () => {
      const r = validRegistry()
      const m = hydrogenPeroxide()
      m.measurements!.dihedrals[0]!.value = 121.4
      r.molecules.push(m)
      expect(validateRegistry(r)).toEqual(['molecule "h2o2": dihedral 2-0-1-3 measures 119.800 °, cited 121.4 °'])
    })

    it('rejects a cited dihedral the coordinates miss by more than 1°, including its mirror image', () => {
      const r = validRegistry()
      const m = hydrogenPeroxide()
      m.measurements!.dihedrals[0]!.value = -119.8
      r.molecules.push(m)
      expect(validateRegistry(r)).toEqual(['molecule "h2o2": dihedral 2-0-1-3 measures 119.800 °, cited -119.8 °'])
    })

    it('treats a dihedral of -179.5° as 0.5° from 180°', () => {
      const r = validRegistry()
      const m = hydrogenPeroxide()
      // Rotate the second hydrogen to just past anti.
      const t = (-0.5 * Math.PI) / 180
      const [x, y] = [0.446625 + 0.028139, 0.819011]
      m.atoms[3]!.position = [-(x * Math.cos(t) - y * Math.sin(t)) - 0.028139, -(x * Math.sin(t) + y * Math.cos(t)), -0.816994]
      m.measurements!.dihedrals[0]!.value = 180
      expect(validateRegistry({ ...r, molecules: [m], moDiagrams: [] })).toEqual([])
    })

    it('rejects a measurement that names a missing atom', () => {
      const r = validRegistry()
      r.molecules[0]!.measurements!.angles[0]!.atoms = [1, 0, 7]
      expect(validateRegistry(r)).toEqual(['molecule "water": angle 1-0-7 refers to a missing atom'])
    })

    it('accepts a computed conformer with no measurements', () => {
      const r = validRegistry()
      r.molecules[0]!.geometrySource = 'pubchem-computed'
      delete r.molecules[0]!.measurements
      expect(validateRegistry(r)).toEqual([])
    })

    it('rejects measurements on a computed conformer instead of ignoring them', () => {
      const r = validRegistry()
      r.molecules[0]!.geometrySource = 'pubchem-computed'
      expect(validateRegistry(r)).toEqual(['molecule "water": a computed conformer must not carry measurements'])
    })

    it('rejects a cited-experimental molecule with no measurements', () => {
      const r = validRegistry()
      delete r.molecules[0]!.measurements
      expect(validateRegistry(r)).toEqual(['molecule "water": cited experimental geometry needs measurements'])
    })

    it('rejects a cited-experimental molecule with a bond that has no cited length', () => {
      const r = validRegistry()
      r.molecules[0]!.measurements!.lengths.pop()
      expect(validateRegistry(r)).toEqual(['molecule "water": bond 0-2 has no cited length'])
      r.molecules[0]!.measurements = { lengths: [], angles: [{ atoms: [1, 0, 2], value: 104.5, sourceId: 's1' }], dihedrals: [] }
      expect(validateRegistry(r)).toEqual([
        'molecule "water": bond 0-1 has no cited length',
        'molecule "water": bond 0-2 has no cited length',
      ])
    })

    it('rejects a cited-experimental molecule with a bent atom and no cited angle', () => {
      const r = validRegistry()
      r.molecules[0]!.measurements!.angles = []
      expect(validateRegistry(r)).toEqual(['molecule "water": atom 0 is bonded to 2 atoms but has no cited angle'])
    })

    it('accepts a published string that reads as the stored number, trailing zeros included', () => {
      const r = validRegistry()
      const m = hydrogenPeroxide()
      Object.assign(m.measurements!.lengths[1]!, { published: '0.950' })
      Object.assign(m.measurements!.dihedrals[0]!, { published: '119.8' })
      r.molecules.push(m)
      // A copy: the fixture's element values share one object.
      r.elements[0]!.atomicWeight = Object.assign({ ...r.elements[0]!.atomicWeight }, { published: '1.0' })
      expect(validateRegistry(r)).toEqual([])
    })

    it.each(['0.96', '0.95 Å', '9.5e-1', '.95'])('rejects the published string "%s" beside the stored number 0.95', (published) => {
      const r = validRegistry()
      const m = hydrogenPeroxide()
      Object.assign(m.measurements!.lengths[1]!, { published })
      r.molecules.push(m)
      expect(validateRegistry(r)).toEqual([`registry.molecules[1].measurements.lengths[1]: published "${published}" is not the stored value 0.95`])
    })

    it('rejects a published string on an element value that it does not match', () => {
      const r = validRegistry()
      r.elements[0]!.electronegativity = Object.assign({ ...r.elements[0]!.electronegativity }, { published: '2.20' })
      expect(validateRegistry(r)).toEqual(['registry.elements[0].electronegativity: published "2.20" is not the stored value 1'])
    })

    it('matches a cited length to its bond in either atom order', () => {
      const r = validRegistry()
      r.molecules[0]!.measurements!.lengths[1]!.atoms = [2, 0]
      expect(validateRegistry(r)).toEqual([])
    })
  })

  describe('molecular orbital diagrams', () => {
    it('rejects a diagram for a molecule that does not exist', () => {
      const r = validRegistry()
      r.moDiagrams[0]!.moleculeId = 'dioxygen'
      expect(validateRegistry(r)).toEqual(['MO diagram "dioxygen": unknown molecule "dioxygen"'])
    })

    it('rejects a diagram whose electrons are not the valence electrons of the molecule', () => {
      const r = validRegistry()
      r.moDiagrams[0]!.levels[1]!.electrons = 2
      expect(validateRegistry(r)).toEqual(['MO diagram "water": holds 6 electrons, but the molecule has 8 valence electrons'])
    })

    it('counts the charge of an ion', () => {
      // OH-: 6 + 1 valence electrons, plus one for the charge.
      const r = validRegistry()
      const water = r.molecules[0]!
      water.atoms.pop()
      water.bonds.pop()
      water.atoms[0]!.formalCharge = -1
      water.atoms[0]!.lonePairs = 3
      water.charge = -1
      water.measurements!.lengths.pop()
      water.measurements!.angles.pop()
      expect(validateRegistry(r)).toEqual([])
      water.charge = 0
      expect(validateRegistry(r)).toContain('MO diagram "water": holds 8 electrons, but the molecule has 7 valence electrons')
    })

    it('rejects more than two electrons per orbital', () => {
      const r = validRegistry()
      r.moDiagrams[0]!.levels[0]!.electrons = 6
      r.moDiagrams[0]!.levels[1]!.electrons = 2
      expect(validateRegistry(r)).toEqual(['MO diagram "water": level "σ" holds 6 electrons, more than 4'])
    })

    it('rejects two diagrams for one molecule', () => {
      const r = validRegistry()
      r.moDiagrams.push(structuredClone(r.moDiagrams[0]!))
      expect(validateRegistry(r)).toEqual(['MO diagrams: duplicate id "water"'])
    })

    it('rejects an unknown source and an unknown key', () => {
      const r = validRegistry()
      r.moDiagrams[0]!.sourceId = 'nope'
      expect(validateRegistry(r)).toEqual(['registry.moDiagrams[0].sourceId: unknown source "nope"'])
      const extra = validRegistry()
      Object.assign(extra.moDiagrams[0]!.levels[0]!, { energy: 1 })
      expect(validateRegistry(extra).join('\n')).toMatch(/^schema: moDiagrams\.0\.levels\.0/)
    })
  })

  describe('condition 4: institution-specific text', () => {
    it('treats a hex colour as a code, not prose', () => {
      // "FF8000" has the letters-then-digits shape of a course number.
      expect(validRegistry().elements[0]!.color.value).toBe('#FF8000')
      expect(validateRegistry(validRegistry())).toEqual([])
    })

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

// 118 records with made-up symbols ("Aa", "Ab", ...): only the shape and the numbering matter to the validator.
function validTable(): PeriodicElement[] {
  return Array.from({ length: 118 }, (_, i) => ({
    atomicNumber: i + 1,
    symbol: String.fromCharCode(65 + Math.floor(i / 26), 97 + (i % 26)),
    name: `Element ${i + 1}`,
    category: 'Nonmetal',
    configuration: { text: '1s1' },
    standardState: { state: 'Gas', expected: false },
    yearDiscovered: 1766,
    atomicMass: { value: 1.008, published: '1.0080', unit: 'u', sourceId: 's1', kind: 'standard-atomic-weight' },
    sourceId: 's1',
  }))
}

describe('validatePeriodicTable', () => {
  const sources = [{ id: 's1', url: 'https://pubchem.ncbi.nlm.nih.gov/', citation: 'PubChem' }]

  it('accepts a valid table', () => {
    expect(validatePeriodicTable(validTable(), sources)).toEqual([])
  })

  describe('never throws on malformed input', () => {
    it.each([null, 42, [], 'table', {}, [null], validTable().slice(0, 117)])('returns schema errors for %j', (input) => {
      const errors = validatePeriodicTable(input, sources)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.every((e) => e.startsWith('schema:'))).toBe(true)
    })
  })

  it('rejects an unknown key instead of silently dropping it', () => {
    const table = validTable() as Record<string, unknown>[]
    table[0] = { ...table[0]!, cpkHexColor: 'FFFFFF' }
    expect(validatePeriodicTable(table, sources).some((e) => e.startsWith('schema:'))).toBe(true)
  })

  it('rejects a table that is not exactly atomic numbers 1 to 118, in order', () => {
    const repeated = validTable()
    repeated[5]!.atomicNumber = 5
    expect(validatePeriodicTable(repeated, sources).join('\n')).toMatch(/position 6 holds atomic number 5/)
    const shifted = validTable().map((e) => ({ ...e, atomicNumber: e.atomicNumber + 1 }))
    expect(validatePeriodicTable(shifted, sources).length).toBe(118)
    const swapped = validTable()
    ;[swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!]
    expect(validatePeriodicTable(swapped, sources).length).toBe(2)
  })

  it('rejects a duplicate symbol', () => {
    const table = validTable()
    table[7]!.symbol = table[0]!.symbol
    expect(validatePeriodicTable(table, sources)).toEqual(['periodic table: duplicate id "Aa"'])
  })

  it('rejects a published text that does not parse to the stored value', () => {
    const table = validTable()
    table[0]!.atomicMass.published = '1.0081'
    table[1]!.density = { value: 7, published: 'about 7', unit: 'g/cm³', sourceId: 's1' }
    const errors = validatePeriodicTable(table, sources)
    expect(errors).toEqual([
      'periodicTable[0].atomicMass: published "1.0081" is not the stored value 1.008',
      'periodicTable[1].density: published "about 7" is not the stored value 7',
    ])
  })

  it('accepts a published text with trailing zeros', () => {
    const table = validTable()
    table[0]!.density = { value: 2.267, published: '2.2670', unit: 'g/cm³', sourceId: 's1' }
    expect(validatePeriodicTable(table, sources)).toEqual([])
  })

  it('rejects an unknown sourceId on a record, a quantity and a note', () => {
    const table = validTable()
    table[0]!.sourceId = 'nowhere'
    table[1]!.atomicMass.sourceId = 'nowhere'
    table[2]!.notes = [{ row: 'atomicMass', text: 'A note.', sourceId: 'nowhere' }]
    expect(validatePeriodicTable(table, sources)).toEqual([
      'periodicTable[0].sourceId: unknown source "nowhere"',
      'periodicTable[1].atomicMass.sourceId: unknown source "nowhere"',
      'periodicTable[2].notes[0].sourceId: unknown source "nowhere"',
    ])
    expect(validatePeriodicTable(validTable(), []).length).toBe(236)
  })

  it('rejects an isotope mass that does not round to its mass number', () => {
    const table = validTable()
    const isotope = { value: 96.90636, published: '96.90636', unit: 'u', sourceId: 's1', kind: 'isotope-mass', estimated: false } as const
    table[42]!.atomicMass = { ...isotope, massNumber: 97 }
    expect(validatePeriodicTable(table, sources)).toEqual([])
    table[42]!.atomicMass = { ...isotope, massNumber: 98 }
    expect(validatePeriodicTable(table, sources).join('\n')).toMatch(/mass 96\.90636 does not round to mass number 98/)
  })

  it('accepts a melting point above the boiling point (arsenic)', () => {
    const table = validTable()
    table[32]!.meltingPoint = { value: 1090, published: '1090', unit: 'K', sourceId: 's1' }
    table[32]!.boilingPoint = { value: 887, published: '887', unit: 'K', sourceId: 's1' }
    expect(validatePeriodicTable(table, sources)).toEqual([])
  })

  it('rejects institution-specific text in a note', () => {
    const table = validTable()
    table[0]!.notes = [{ row: 'density', text: 'Measured in Room 214.', sourceId: 's1' }]
    expect(validatePeriodicTable(table, sources).join('\n')).toMatch(/periodicTable\[0\]\.notes\[0\]\.text: looks like a location/)
    table[0]!.notes = [{ row: 'density', text: 'Weighed at Example State.', sourceId: 's1' }]
    expect(validatePeriodicTable(table, sources)).toEqual([])
    expect(validatePeriodicTable(table, sources, { institutionNames: ['Example State'] }).join('\n')).toMatch(/contains the name/)
  })
})
