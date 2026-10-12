import { describe, expect, it } from 'vitest'
import aqueousHazards from '../../../docs/research/phase-4/hazards.json'
import aqueousSheets from '../../../docs/research/phase-4/sources/hazard-manifest.json'
import hazards from '../../../docs/research/reactions/hazards.json'
import input from '../../../docs/research/reactions/reactions.json'
import hazardManifest from '../../../docs/research/reactions/sources/hazard-manifest.json'
import manifest from '../../../docs/research/reactions/sources/MANIFEST.json'
import allSources from '../sources.json'
import { FIELD_AT, reactionsData, type ReactionsData } from './data'

// The checks scripts/build-chem-data.mjs runs on the types of reactions lab's record: against its manifest of
// sources, on its own chemistry (every equation balanced, the tiles, what is seen, the order of the metals) and,
// for the hazards, whose documents are not kept, against the hazard manifests' account of each. They are tested
// here on the real inputs and on inputs they must refuse. The checks of the manifests and the merge are the
// aqueous lab's (scripts/aqueous-lib.mjs), which that lab's tests cover on its own inputs; what is tested here is
// that they hold this record, and what this lab added (scripts/reactions-lib.mjs).
type Row = { fields: string[]; prints: string; where: string }
type Source = { id: string; url: string; citation: string; file?: string; supports: Row[] }
type Sheet = { id: string; url: string; citation: string; file?: string; supports: { field: string; prints: string; where: string }[] }
type Note = { value: string; sourceId: string; alsoSourceId?: string; moreSourceIds?: string[] }
type Entry = { classifiedAs: string; hazards: { signalWord: string; statements: string[]; note: Note; sourceId: string } }
type Listed = { id: string; url: string; citation: string }
type Lib = {
  checkSupported(record: unknown, sources: Source[], sheets?: Sheet[]): void
  mergeHazards(reagents: unknown[], hazards: Record<string, Entry>, sheets: Sheet[]): { id: string; classifiedAs: string; hazards: Entry['hazards'] }[]
  newSources(sources: Listed[], earlier: Listed[], where: string): Listed[]
}
type Shared = { withSharedHazards(own: Record<string, Entry>, other: Record<string, Entry>, ids: string[]): Record<string, Entry>; withSharedSheets(own: Sheet[], other: Sheet[], ids: string[]): Sheet[] }
type Equation = { reactants: { speciesId: string; coefficient: number }[]; products: { speciesId: string; coefficient: number }[] }
type OwnLib = {
  FIELD_AT: Record<string, string>
  SPARE_TILES: number
  balanced(record: unknown, equation: Equation): boolean
  tally(record: unknown, side: Equation['reactants']): { atoms: Record<string, number>; charge: number }
  checkEquations(record: unknown): void
  checkTiles(record: unknown): void
  checkSeen(record: unknown): void
  checkOrder(record: unknown): void
  checkBench(record: unknown): void
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/aqueous-lib.mjs', { eager: true }))
const [sharedLib] = Object.values(import.meta.glob<Shared>('../../../scripts/calorimetry-lib.mjs', { eager: true }))
const [ownLib] = Object.values(import.meta.glob<OwnLib>('../../../scripts/reactions-lib.mjs', { eager: true }))
const { checkSupported, mergeHazards, newSources } = lib!
const { withSharedHazards, withSharedSheets } = sharedLib!
const { balanced, tally, checkEquations, checkTiles, checkSeen, checkOrder, checkBench } = ownLib!

// The authored record: the stored one before the hazards are merged in.
type Input = Omit<ReactionsData, 'reagents'> & { reagents: Omit<ReactionsData['reagents'][number], 'classifiedAs' | 'hazards'>[] }
const edited = (edit: (record: Input) => void): Input => {
  const record: Input = JSON.parse(JSON.stringify(input))
  edit(record)
  return record
}
const SHARED = ['hcl-1m', 'fecl3-0.5m']
const sheets = withSharedSheets(hazardManifest.sources, aqueousSheets.sources, SHARED)
const allHazards = withSharedHazards(hazards, aqueousHazards as Record<string, Entry>, SHARED)
const merged = () => ({ ...input, reagents: mergeHazards(input.reagents, allHazards, sheets) })
const equations = input.stations.flatMap((station) => station.vessels.flatMap((vessel) => (vessel.equation === null ? [] : [{ where: `${station.letter} ${vessel.id}`, station, equation: vessel.equation }])))

describe('the record and its manifest', () => {
  it('give one account of the sources: every cited value has a row, and every row a value', () => {
    expect(() => checkSupported(merged(), manifest.sources, sheets)).not.toThrow()
    expect(merged()).toEqual(reactionsData)
  })

  it('refuses a value whose source has no row for it, and a row that names a value that does not cite its source', () => {
    const record = merged()
    record.stations[0]!.notes[0]!.sourceId = 'chemguide-reactivity-series'
    expect(() => checkSupported(record, manifest.sources, sheets)).toThrow(/has no row that names it|which does not cite it/)
    expect(() => checkSupported({ ...merged(), activity: { ...input.activity, sourceId: 'nothing' } }, manifest.sources, sheets)).toThrow(/unknown source "nothing"/)
  })

  it('lists every source once among the stored sources, a source another lab lists as that lab wrote it, and keeps no copy', () => {
    for (const source of [...manifest.sources, ...hazardManifest.sources]) {
      const listed = allSources.filter((s) => s.id === source.id)
      expect(listed.length, source.id).toBe(1)
      expect({ url: listed[0]!.url, citation: listed[0]!.citation }, source.id).toEqual({ url: source.url, citation: source.citation })
      expect('file' in source, source.id).toBe(false)
      expect((source as { fetchedSha256: string }).fetchedSha256, source.id).toMatch(/^[0-9a-f]{64}$/)
    }
    expect(() => newSources([{ id: 'birk-zinc', url: 'https://example.org/', citation: 'Another page.' }], allSources, 'test')).toThrow(/already in use/)
  })

  it('has a row marked for the primer on every source the primer alone rests on', () => {
    const forPrimer = manifest.sources.filter((s) => s.supports.some((row) => row.fields.includes('primer'))).map((s) => s.id)
    expect(forPrimer).toEqual(['smc-types-of-reactions', 'soult-types-of-inorganic-reactions', 'ck12-balancing-equations', 'chemguide-metals-dilute-acids', 'chemguide-reactivity-series', 'waterloo-catalysts-hydrogen-peroxide', 'lower-catalysts'])
  })
})

describe('every equation of the record (spec 24.5)', () => {
  it.each(equations)('$where balances in atoms and in charge', ({ equation }) => {
    expect(balanced(input, equation)).toBe(true)
    const left = tally(input, equation.reactants)
    expect(left).toEqual(tally(input, equation.products))
    expect(left.charge).toBe(0)
    expect(Object.keys(left.atoms).length).toBeGreaterThan(0)
  })

  it('is one of the five, as written', () => {
    const written = (side: Equation['reactants']) => side.map((term) => `${term.coefficient === 1 ? '' : term.coefficient}${input.species.find((s) => s.id === term.speciesId)!.formula}(${input.species.find((s) => s.id === term.speciesId)!.state})`).join(' + ')
    expect(equations.map(({ where, equation }) => `${where}: ${written(equation.reactants)} → ${written(equation.products)}`)).toEqual([
      'A tube: Zn(s) + CuSO₄(aq) → ZnSO₄(aq) + Cu(s)',
      'B strip: 2Mg(s) + O₂(g) → 2MgO(s)',
      'C magnesium: Mg(s) + 2HCl(aq) → MgCl₂(aq) + H₂(g)',
      'C zinc: Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂(g)',
      'D tube: CaCl₂(aq) + Na₂CO₃(aq) → CaCO₃(s) + 2NaCl(aq)',
      'E tube: 2H₂O₂(aq) → 2H₂O(l) + O₂(g)',
    ])
  })

  it('is refused by the build when it does not balance, is not in its lowest numbers, repeats a species, stands where nothing reacts or holds its catalyst', () => {
    expect(() => checkEquations(input)).not.toThrow()
    expect(() => checkEquations(edited((r) => void (r.stations[1]!.vessels[0]!.equation!.reactants[0]!.coefficient = 1)))).toThrow(/does not balance/)
    expect(() => checkEquations(edited((r) => void [...r.stations[0]!.vessels[0]!.equation!.reactants, ...r.stations[0]!.vessels[0]!.equation!.products].forEach((term) => (term.coefficient = 2))))).toThrow(/lowest whole numbers/)
    expect(() => checkEquations(edited((r) => void r.stations[4]!.vessels[0]!.equation!.products.push({ speciesId: 'hydrogen-peroxide', coefficient: 1 })))).toThrow(/twice/)
    expect(() => checkEquations(edited((r) => void (r.stations[2]!.vessels[2]!.kind.value = 'single-replacement')))).toThrow(/none when nothing does/)
    expect(() => checkEquations(edited((r) => void (r.stations[4]!.vessels[0]!.catalyst!.speciesId = 'water')))).toThrow(/not in the equation/)
    expect(() => checkEquations(edited((r) => void (r.stations[0]!.vessels[0]!.kind.value = 'exchange' as never)))).toThrow(/none of the kinds/)
  })
})

describe('the tiles (spec 24.5)', () => {
  it('offer every species an equation needs and at least two that none needs, at every station', () => {
    expect(() => checkTiles(input)).not.toThrow()
    for (const station of input.stations) {
      const needed = new Set(station.vessels.flatMap((v) => (v.equation === null ? [] : [...v.equation.reactants, ...v.equation.products].map((term) => term.speciesId))))
      expect(station.tiles.filter((tile) => !needed.has(tile)).length, station.id).toBeGreaterThanOrEqual(2)
    }
    // The tube where nothing reacts could have its wrong equation built: the chloride of its metal is offered.
    expect(input.stations[2]!.tiles).toEqual(expect.arrayContaining(['copper', 'copper-ii-chloride']))
    // The catalyst is offered, and belongs in no equation.
    expect(input.stations[4]!.tiles).toContain('iron-iii-chloride')
  })

  it('are refused where one is missing, where too few are spare, and where a species is offered nowhere', () => {
    expect(() => checkTiles(edited((r) => void (r.stations[3]!.tiles = r.stations[3]!.tiles.filter((t) => t !== 'sodium-chloride'))))).toThrow(/needs "sodium-chloride"/)
    expect(() => checkTiles(edited((r) => void (r.stations[1]!.tiles = ['magnesium', 'oxygen', 'magnesium-oxide', 'water'])))).toThrow(/give the equation away/)
    expect(() => checkTiles(edited((r) => void r.stations[1]!.tiles.push('magnesium')))).toThrow(/twice/)
    expect(() => checkTiles(edited((r) => void (r.stations[2]!.tiles = r.stations[2]!.tiles.filter((t) => t !== 'chlorine'))))).toThrow(/species\[chlorine\]: no station offers it/)
  })
})

describe('what is seen, and the order of the metals', () => {
  it('holds together: every field asked has a stored choice and a look with words, and the build has the same table of looks as the app', () => {
    expect(() => checkSeen(input)).not.toThrow()
    expect(() => checkBench(input)).not.toThrow()
    expect(ownLib!.FIELD_AT).toEqual(FIELD_AT)
  })

  it('is refused where a choice has no stored word, a field no look, a look no field, or a tube no liquid', () => {
    expect(() => checkSeen(edited((r) => void (r.stations[0]!.vessels[0]!.after.coating!.value = 'purple')))).toThrow(/"purple" is no choice/)
    expect(() => checkSeen(edited((r) => void (r.stations[0]!.vessels[0]!.after.coating!.value = 'none')))).toThrow(/what was there before/)
    expect(() => checkSeen(edited((r) => void r.stations[0]!.vessels[0]!.looks.shift()))).toThrow(/nothing opens it/)
    expect(() => checkSeen(edited((r) => void r.stations[3]!.vessels[0]!.looks.push({ at: 'touch', before: 'a', after: 'b' })))).toThrow(/opens nothing that is asked/)
    expect(() => checkSeen(edited((r) => void (r.stations[3]!.vessels[0]!.looks[0]!.after = r.stations[3]!.vessels[0]!.looks[0]!.before)))).toThrow(/other words for after/)
    expect(() => checkSeen(edited((r) => void (r.stations[3]!.vessels[0]!.liquid = null)))).toThrow(/a tube holds a liquid/)
    expect(() => checkSeen(edited((r) => void (r.choices.gas = ['none'])))).toThrow(/two choices or more/)
    expect(() => checkBench(edited((r) => void (r.stations[0]!.reagentIds = ['cuso4-1m'])))).toThrow(/not on the station's bench|no station uses it/)
  })

  it('has the three metals in the order their tubes show, with hydrogen after the last that bubbles', () => {
    expect(() => checkOrder(input)).not.toThrow()
    expect(() => checkOrder(edited((r) => void (r.activity.order = ['zinc', 'magnesium', 'copper'])))).toThrow(/not the order the tubes show/)
    expect(() => checkOrder(edited((r) => void (r.activity.hydrogenAfter = 'magnesium')))).toThrow(/hydrogen stands after "zinc"/)
    expect(() => checkOrder(edited((r) => void (r.stations[0]!.order = true)))).toThrow(/2 stations ask/)
  })
})

describe('the hazards', () => {
  it('are merged from the hazard manifests: every statement is a row of its sheet, and every note has a row of each document under it', () => {
    expect(() => mergeHazards(input.reagents, allHazards, sheets)).not.toThrow()
    const wrong: Record<string, Entry> = JSON.parse(JSON.stringify(allHazards))
    wrong['h2o2-3']!.hazards.statements[0] = 'H315: Causes mild skin irritation'
    expect(() => mergeHazards(input.reagents, wrong, sheets)).toThrow(/not the stored/)
    const unread: Record<string, Entry> = JSON.parse(JSON.stringify(allHazards))
    unread['magnesium-ribbon']!.hazards.note.alsoSourceId = 'flinn-sds-398.5'
    expect(() => mergeHazards(input.reagents, unread, sheets)).toThrow(/has no row for magnesium-ribbon.hazards.note/)
  })

  it("shares two bottles with the aqueous reactions lab unchanged, and has none of its own for them", () => {
    expect(() => withSharedHazards({ ...hazards, 'hcl-1m': hazards['h2o2-3'] }, aqueousHazards as Record<string, Entry>, SHARED)).toThrow(/has no entry here/)
    for (const id of SHARED) expect(reactionsData.reagents.find((r) => r.id === id)!.hazards, id).toEqual(aqueousHazards[id as keyof typeof aqueousHazards].hazards)
  })

  it('records, for each document that says more than the note carries, what was read and not carried and why', () => {
    const notCarried = hazardManifest.sources.flatMap((s) => s.supports.filter((row) => row.field.endsWith('.notCarried')))
    expect(notCarried.length).toBeGreaterThanOrEqual(8)
    for (const row of notCarried) expect(row.where).toMatch(/^Read and not carried.*Why: /s)
  })
})
