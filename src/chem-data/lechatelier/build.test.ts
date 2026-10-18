import { describe, expect, it } from 'vitest'
import cationsHazardManifest from '../../../docs/research/cations/sources/hazard-manifest.json'
import hazards from '../../../docs/research/lechatelier/hazards.json'
import input from '../../../docs/research/lechatelier/lechatelier.json'
import hazardManifest from '../../../docs/research/lechatelier/sources/hazard-manifest.json'
import manifest from '../../../docs/research/lechatelier/sources/MANIFEST.json'
import aqueousHazards from '../../../docs/research/phase-4/hazards.json'
import aqueousHazardManifest from '../../../docs/research/phase-4/sources/hazard-manifest.json'
import { modelFrom } from '../../engine/lechatelier/model'
import periodicTable from '../periodic-table.json'
import allSources from '../sources.json'
import { lechatelierData } from './data'
import stored from './lechatelier.json'

// The checks scripts/build-chem-data.mjs runs on the Le Chatelier's principle lab's record: against its manifest
// of sources, against the periodic table's record, on the values it works out from cited ones, on what its tubes
// are stored as showing against what its numbers give at the bench's amounts (spec 18.4, 18.7) and, for the
// bottles' hazards, whose documents are not kept, against the hazard manifests' account of each. They are tested
// here on the real inputs and on inputs they must refuse. The checks of the manifests and the merge are the
// aqueous lab's (scripts/aqueous-lib.mjs), which that lab's tests cover on its own inputs; what is tested here is
// that they hold this record, what this lab added to them (scripts/lechatelier-lib.mjs), and the one change this
// lab made to the sharing of documents (scripts/calorimetry-lib.mjs).
type Row = { fields: string[]; prints: string; where: string }
type Source = { id: string; url: string; citation: string; file?: string; supports: Row[] }
type Sheet = { id: string; url: string; citation: string; file?: string; supports: { field: string; prints: string; where: string }[] }
type Note = { value: string; sourceId: string; alsoSourceId?: string; moreSourceIds?: string[] }
type Entry = { classifiedAs: string; hazards: { signalWord: string; statements: string[]; note: Note; sourceId: string } }
type Listed = { id: string; url: string; citation: string }
type Lib = {
  citations(record: unknown): { key: string; sourceId: string; published?: string }[]
  checkSupported(record: unknown, sources: Source[], sheets?: Sheet[]): void
  mergeHazards(reagents: unknown[], hazards: Record<string, Entry>, sheets: Sheet[]): { id: string; classifiedAs: string; hazards: Entry['hazards'] }[]
  newSources(sources: Listed[], earlier: Listed[], where: string): Listed[]
}
type SharedLib = {
  withSharedHazards(own: Record<string, Entry>, other: Record<string, Entry>, sharedIds: string[]): Record<string, Entry>
  withSharedSheets(own: Sheet[], other: Sheet[], sharedIds?: string[]): Sheet[]
}
type Tube = { microlitres: number; temperature: string; lead: number; metal: number; chloride: number; acid: number; base: number; ammonia: number }
type Figure = { disturbance: string; stage: number; times?: number; solid?: boolean; hydrogen?: number; leftPercent?: number; comesDownPercent?: number; microlitres: number }
type OwnLib = {
  checkWorkedOut(record: unknown): void
  stagesOf(record: unknown): { systemId: string; disturbanceId: string; tube: string; before: Tube; stages: Tube[] }[]
  checkBench(record: unknown): Figure[]
}
type CationsLib = { checkAtomicWeights(record: unknown, table: unknown): void }
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/aqueous-lib.mjs', { eager: true }))
const [sharedLib] = Object.values(import.meta.glob<SharedLib>('../../../scripts/calorimetry-lib.mjs', { eager: true }))
const [ownLib] = Object.values(import.meta.glob<OwnLib>('../../../scripts/lechatelier-lib.mjs', { eager: true }))
const [cationsLib] = Object.values(import.meta.glob<CationsLib>('../../../scripts/cations-lib.mjs', { eager: true }))
const { citations, checkSupported, mergeHazards, newSources } = lib!
const { withSharedHazards, withSharedSheets } = sharedLib!
const { checkWorkedOut, stagesOf, checkBench } = ownLib!
const { checkAtomicWeights } = cationsLib!

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const sources: Source[] = manifest.sources
const SHARED = ['hcl-6m', 'naoh-6m']
const sheets = withSharedSheets(hazardManifest.sources, aqueousHazardManifest.sources, SHARED)
const allHazards = () => withSharedHazards(copy(hazards) as Record<string, Entry>, aqueousHazards as Record<string, Entry>, SHARED)
type Input = typeof input
const edited = (edit: (record: Input) => void) => {
  const record = copy(input)
  edit(record)
  return record
}
const parameter = (record: Input, name: keyof Input['parameters'], value: number) => void (record.parameters[name].value = value)
const figure = (figures: Figure[], disturbance: string, stage = 0) => figures.find((f) => f.disturbance === disturbance && f.stage === stage)!

describe('checkWorkedOut', () => {
  it('accepts the record as authored', () => {
    expect(() => checkWorkedOut(input)).not.toThrow()
  })

  it('refuses a Gibbs energy that is not the sum of its terms, a constant that does not follow from it, and one shown otherwise than it is stored', () => {
    expect(() => checkWorkedOut(edited((r) => void (r.equilibriumConstants[0]!.gibbs.value = 93.52)))).toThrow(/equilibriumConstants\[zinc-hydroxide\]\.gibbs: 93.52 is not the sum of its terms, 93.522/)
    expect(() => checkWorkedOut(edited((r) => void (r.equilibriumConstants[2]!.terms[2]!.coefficient = -2)))).toThrow(/equilibriumConstants\[zincate-ion\]\.gibbs: -82.484 is not the sum of its terms/)
    expect(() => checkWorkedOut(edited((r) => void (r.equilibriumConstants[1]!.constant.value = 5.6e-12)))).toThrow(/equilibriumConstants\[magnesium-hydroxide\]\.constant: 5.6e-12 is not e\^\(−ΔG° ÷ RT\) to three significant figures, 5.61e-12/)
    expect(() => checkWorkedOut(edited((r) => void (r.equilibriumConstants[3]!.constant.shown = '3.6 × 10⁹')))).toThrow(/equilibriumConstants\[zinc-ammonia-ion\]\.constant: shown as "3.6 × 10⁹"/)
    expect(() => checkWorkedOut(edited((r) => void (r.gibbs[0]!.value = -147.6)))).toThrow(/equilibriumConstants\[zinc-hydroxide\]\.gibbs: 93.522 is not the sum of its terms/)
    expect(() => checkWorkedOut(edited((r) => void (r.parameters.temperatureKelvin.value = 300)))).toThrow(/is not e\^\(−ΔG° ÷ RT\)/)
  })

  it('refuses a working that does not show the figures it was made from', () => {
    expect(() => checkWorkedOut(edited((r) => void (r.equilibriumConstants[0]!.gibbs.working = '93.522 kJ/mol')))).toThrow(/equilibriumConstants\[zinc-hydroxide\]\.gibbs: the working does not show 147.06/)
    expect(() => checkWorkedOut(edited((r) => void (r.equilibriumConstants[0]!.constant.working = 'worked out')))).toThrow(/equilibriumConstants\[zinc-hydroxide\]\.constant: the working does not show 8.314462618/)
    expect(() => checkWorkedOut(edited((r) => void (r.heats[0]!.enthalpy.working = 'about 23')))).toThrow(/heats\[lead-chloride-dissolving\]\.enthalpy: the working does not show 1.7/)
    expect(() => checkWorkedOut(edited((r) => void (r.leadChloride.saturationCold.working = '4s³')))).toThrow(/leadChloride\.saturationCold: the working does not show 10/)
  })

  it('refuses a heat, a molar mass and a product at saturation that are not what the cited figures give', () => {
    expect(() => checkWorkedOut(edited((r) => void (r.heats[0]!.enthalpy.value = 23.4)))).toThrow(/heats\[lead-chloride-dissolving\]\.enthalpy: 23.4 is not the sum of its terms, 23.392/)
    expect(() => checkWorkedOut(edited((r) => void (r.leadChloride.molarMass.value = 278)))).toThrow(/leadChloride\.molarMass: 278 is not 207.2 \+ 2 × 35.45, 278.1/)
    expect(() => checkWorkedOut(edited((r) => void (r.leadChloride.saturationCold.value = 1.71e-5)))).toThrow(/leadChloride\.saturationCold: 0.0000171 is not 4s³ for 10 g\/L ÷ 278.10 g\/mol to three significant figures, 0.000186/)
    expect(() => checkWorkedOut(edited((r) => void (r.leadChloride.solubilityHot.value = 30)))).toThrow(/leadChloride\.saturationHot: 0.00699 is not 4s³/)
    expect(() => checkWorkedOut(edited((r) => void (r.leadChloride.saturationHot.shown = '7 × 10⁻³')))).toThrow(/leadChloride\.saturationHot: shown as/)
  })

  it('holds the two atomic weights to the periodic table, by the check the Group I cations lab made', () => {
    expect(() => checkAtomicWeights(input, periodicTable)).not.toThrow()
    expect(() => checkAtomicWeights(edited((r) => void (r.leadChloride.atomicWeights[0]!.published = '207.19')), periodicTable)).toThrow(/leadChloride\.atomicWeights\[Pb\]: the periodic table gives Pb the atomic weight 207.2/)
  })
})

describe('stagesOf', () => {
  const all = stagesOf(input)
  const of = (id: string) => all.find((d) => d.disturbanceId === id)!

  it('gives every tube whole amounts at every stage: microlitres, and nanomoles of what went in', () => {
    expect(all.map((d) => d.disturbanceId)).toEqual(lechatelierData.systems.flatMap((s) => s.disturbances.map((d) => d.id)))
    for (const d of all) for (const tube of [d.before, ...d.stages]) for (const amount of [tube.microlitres, tube.lead, tube.metal, tube.chloride, tube.acid, tube.base, tube.ammonia]) expect(Number.isInteger(amount), d.disturbanceId).toBe(true)
    // 30 drops of 0.3 M lead nitrate, and three portions of two drops of the 0.3 M acid.
    expect(of('lead-acid').before).toMatchObject({ microlitres: 1500, lead: 450000, chloride: 0 })
    expect(of('lead-acid').stages.map((t) => [t.microlitres, t.chloride])).toEqual([[1600, 30000], [1700, 60000], [1800, 90000]])
    expect(of('lead-water').stages[0]).toMatchObject({ microlitres: 4800, lead: 450000, chloride: 90000, temperature: 'room' })
    // The indicator: two portions of three drops of 6 M acid, then as much base.
    expect(of('indicator-base').stages.map((t) => [t.microlitres, t.acid, t.base])).toEqual([[1550, 1800000, 900000], [1700, 1800000, 1800000]])
  })

  it('shares a tube by volume, to the whole nanomole', () => {
    // 3050 µL hold 300 000 nmol of the metal and 300 000 of hydroxide; ten drops are 500 of them.
    expect(of('zinc-drop').stages[0]).toMatchObject({ microlitres: 3050, metal: 300000, base: 300000 })
    for (const id of ['zinc-acid', 'zinc-base', 'zinc-ammonia', 'magnesium-acid', 'magnesium-base', 'magnesium-ammonia']) expect(of(id).before, id).toMatchObject({ microlitres: 500, metal: 49180, base: 49180, acid: 0, ammonia: 0 })
    expect(Math.round((300000 * 500) / 3050)).toBe(49180)
    expect(of('zinc-ammonia').stages[0]).toMatchObject({ microlitres: 4500, ammonia: 24000000 })
    expect(() => stagesOf(edited((r) => parameter(r, 'shareDrops', 30)))).toThrow(/the shares of the tube "zinc" are more than it holds/)
  })

  it("gives the volumes and the places the engine's model gives", () => {
    const model = modelFrom(lechatelierData)
    const engine = model.systems.flatMap((s) => s.disturbances.map((d) => [d.id, d.tube, d.before.microlitres, d.before.temperature, ...d.stages.map((stage) => `${stage.microlitres} ${stage.temperature}`)]))
    expect(all.map((d) => [d.disturbanceId, d.tube, d.before.microlitres, d.before.temperature, ...d.stages.map((stage) => `${stage.microlitres} ${stage.temperature}`)])).toEqual(engine)
  })
})

describe('checkBench: what each tube shows, against the numbers', () => {
  const figures = checkBench(input)

  it('accepts the record as authored, with a figure for every stage the numbers decide', () => {
    expect(figures.map((f) => `${f.disturbance} ${f.stage}`)).toEqual([
      ...['lead-acid 0', 'lead-acid 1', 'lead-acid 2', 'lead-heat 0', 'lead-cool 0', 'lead-water 0'],
      ...['indicator-acid 0', 'indicator-acid 1', 'indicator-base 0', 'indicator-base 1'],
      ...['zinc-drop 0', 'zinc-acid 0', 'zinc-base 0', 'zinc-ammonia 0', 'magnesium-drop 0', 'magnesium-acid 0', 'magnesium-base 0', 'magnesium-ammonia 0'],
    ])
    // No number decides from the edge: every one is at least the margin away from what it is compared with.
    for (const f of figures) if (f.times !== undefined) expect(f.times, `${f.disturbance} ${f.stage}`).toBeGreaterThanOrEqual(input.parameters.clearOfEdge.value)
  })

  it('lead chloride: under saturation after the first portion, over after the second, far under hot, over again cold, under after the water', () => {
    const rounded = (id: string, stage = 0) => [figure(figures, id, stage).solid, Number(figure(figures, id, stage).times!.toFixed(2))]
    expect([rounded('lead-acid', 0), rounded('lead-acid', 1), rounded('lead-acid', 2)]).toEqual([[false, 1.88], [true, 1.77], [true, 3.36]])
    expect([rounded('lead-heat'), rounded('lead-cool'), rounded('lead-water')]).toEqual([[false, 11.18], [true, 3.36], [false, 5.64]])
  })

  it('methyl violet: inside its range after one portion of acid, past the yellow end after two, inside again after one of base, and with no acid left after two', () => {
    expect(figures.filter((f) => f.disturbance.startsWith('indicator')).map((f) => Number(f.hydrogen!.toFixed(3)))).toEqual([0.72, 1.286, 0.581, 0])
    expect(Number(figure(figures, 'indicator-acid', 1).times!.toFixed(2))).toBe(1.29)
  })

  it('the hydroxides: a drop brings each down; acid dissolves both; more base and ammonia dissolve zinc hydroxide, by 5.4 and 3.8 times, and not magnesium hydroxide', () => {
    expect(figures.filter((f) => /zinc|magnesium/.test(f.disturbance)).map((f) => [f.disturbance, f.solid])).toEqual([
      ['zinc-drop', true],
      ['zinc-acid', false],
      ['zinc-base', false],
      ['zinc-ammonia', false],
      ['magnesium-drop', true],
      ['magnesium-acid', false],
      ['magnesium-base', true],
      ['magnesium-ammonia', true],
    ])
    expect([figure(figures, 'zinc-base').times!, figure(figures, 'zinc-ammonia').times!].map((t) => Number(t.toFixed(1)))).toEqual([5.4, 3.8])
    // One drop puts all but a trace of its hydroxide into the solid.
    expect(figure(figures, 'magnesium-drop').leftPercent!).toBeLessThan(0.02)
    expect(figure(figures, 'zinc-drop').leftPercent!).toBeLessThan(0.001)
  })

  it('magnesium hydroxide with ammonia: the ammonium that forms does not dissolve it, and the ammonia brings down what was still dissolved', () => {
    const f = figure(figures, 'magnesium-ammonia')
    expect(f.solid).toBe(true)
    expect(f.times!).toBeGreaterThan(100000)
    expect(f.comesDownPercent!).toBeGreaterThan(99.99)
  })

  it('stops where the numbers give something other than what the record stores', () => {
    // A bigger portion of acid: by the stored solubility the first portion already gives a solid.
    expect(() => checkBench(edited((r) => parameter(r, 'leadAcidDrops', 6)))).toThrow(/systems\[lead-chloride\]\.disturbances\[lead-acid\]\.stages\[0\]: the record stores a colourless liquid and no solid, and the numbers give a colourless liquid and a white solid/)
    // Too little water to dissolve the solid again.
    expect(() => checkBench(edited((r) => parameter(r, 'leadWaterDrops', 10)))).toThrow(/disturbances\[lead-water\]\.stages\[0\]: the record stores a colourless liquid and no solid, and the numbers give a colourless liquid and a white solid/)
    // The solubility product of the tables in place of the product at saturation: a solid at the first portion.
    expect(() => checkBench(edited((r) => void (r.leadChloride.saturationCold.value = 1.71e-5)))).toThrow(/disturbances\[lead-acid\]\.stages\[0\]: the record stores a colourless liquid and no solid, and the numbers give a colourless liquid and a white solid/)
    // A hot solubility no better than the cold: the solid would not dissolve in the bath.
    expect(() => checkBench(edited((r) => void (r.leadChloride.saturationHot.value = r.leadChloride.saturationCold.value)))).toThrow(/disturbances\[lead-heat\]\.stages\[0\]/)
    // Too little ammonia, or too little base, for zinc hydroxide to dissolve.
    expect(() => checkBench(edited((r) => parameter(r, 'ammoniaDrops', 20)))).toThrow(/disturbances\[zinc-ammonia\]\.stages\[0\]: the record stores a colourless liquid and no solid, and the numbers give a colourless liquid and a white solid/)
    expect(() => checkBench(edited((r) => parameter(r, 'excessBaseDrops', 5)))).toThrow(/disturbances\[zinc-base\]\.stages\[0\]: the record stores a colourless liquid and no solid, and the numbers give a colourless liquid and a white solid/)
    // A record that had magnesium hydroxide dissolve in ammonia.
    expect(() => checkBench(edited((r) => void (r.systems[3]!.disturbances[7]!.stages[0]!.solid = 'none')))).toThrow(/disturbances\[magnesium-ammonia\]\.stages\[0\]: the record stores a colourless liquid and no solid, and the numbers give a colourless liquid and a white solid/)
    // An indicator stored as yellow after one portion.
    expect(() => checkBench(edited((r) => void (r.systems[1]!.disturbances[0]!.stages[0]!.liquid = 'yellow')))).toThrow(/disturbances\[indicator-acid\]\.stages\[0\]: the record stores a yellow liquid and no solid, and the numbers give a between blue and yellow liquid and no solid/)
  })

  it('stops where a number is too near its edge to decide, and at a state the lab has no look for', () => {
    // Three drops into thirty: the product is nine parts in a hundred over saturation.
    expect(() => checkBench(edited((r) => parameter(r, 'leadAcidDrops', 3)))).toThrow(/disturbances\[lead-acid\]\.stages\[0\]: the product of the lead and the square of the chloride is 2\.029e-4, which is within 1\.25 times of 1\.860e-4: too near the edge to decide/)
    // Two drops at a time: after two portions the hydrogen ion is just under 1 M.
    expect(() => checkBench(edited((r) => parameter(r, 'indicatorPortionDrops', 2)))).toThrow(/disturbances\[indicator-acid\]\.stages\[1\]: the hydrogen ion is 9\.231e-1, which is within 1\.25 times of 1\.000e\+0/)
    // Ammonia that is only just enough.
    expect(() => checkBench(edited((r) => parameter(r, 'ammoniaDrops', 45)))).toThrow(/disturbances\[zinc-ammonia\]\.stages\[0\]: the quotient with all of the metal held by ammonia .* too near the edge to decide/)
    // A margin that is no margin.
    expect(() => checkBench(edited((r) => parameter(r, 'clearOfEdge', 1)))).toThrow(/parameters\.clearOfEdge: the margin must be over 1/)
    // More base than acid at the indicator.
    expect(() =>
      checkBench(
        edited((r) => {
          r.systems[1]!.disturbances[1]!.action = { kind: 'add', reagentId: 'naoh-6m', drops: 'excessBaseDrops', portions: 'indicatorPortions' }
        }),
      ),
    ).toThrow(/disturbances\[indicator-base\]\.stages\[0\]: base is left over, and the lab has no look for the indicator in base/)
    // So little acid that the liquid is above the indicator's range with acid still in it.
    expect(() =>
      checkBench(
        edited((r) => {
          parameter(r, 'indicatorWaterDrops', 2000)
          parameter(r, 'indicatorPortionDrops', 1)
        }),
      ),
    ).toThrow(/disturbances\[indicator-acid\]\.stages\[0\]: acid is left over and the liquid is above the indicator's range, which the lab has no look for/)
  })

  it('takes each constant where the record names it: a metal with no complex ion keeps its solid', () => {
    // Were magnesium given zinc's complex ions, the numbers would have its hydroxide dissolve, and the build would stop.
    expect(() => checkBench(edited((r) => void (r.equilibria[4]!.numbers = { ...r.equilibria[3]!.numbers!, solubilityProduct: 'magnesium-hydroxide' })))).toThrow(/disturbances\[magnesium-base\]\.stages\[0\]/)
    // Were zinc given none, its hydroxide would stay.
    expect(() => checkBench(edited((r) => void (r.equilibria[3]!.numbers = { solubilityProduct: 'zinc-hydroxide' } as never)))).toThrow(/disturbances\[zinc-base\]\.stages\[0\]: the record stores a colourless liquid and no solid, and the numbers give a colourless liquid and a white solid/)
  })
})

describe('the manifest', () => {
  const built = () => ({ ...copy(input), reagents: mergeHazards(copy(input.reagents), allHazards(), sheets) })

  it('names every value that cites a source, and no value that does not', () => {
    expect(() => checkSupported(built(), sources, sheets)).not.toThrow()
    expect(citations(input).length).toBeGreaterThan(140)
  })

  it('refuses a citation with no row, a published figure with no row that prints it, and a row for a value that does not cite its source', () => {
    const without = (id: string, field: string) => sources.map((s) => (s.id === id ? { ...s, supports: s.supports.map((row) => ({ ...row, fields: row.fields.filter((f) => f !== field) })).filter((row) => row.fields.length > 0) } : s))
    expect(() => checkSupported(built(), without('nuffield-cobalt-equilibrium', 'systems[cobalt].disturbances[cobalt-heat].stages[0]'), sheets)).toThrow(/systems\[cobalt\]\.disturbances\[cobalt-heat\]\.stages\[0\]: the source "nuffield-cobalt-equilibrium" has no row that names it/)
    const record = built()
    record.gibbs[0]!.published = '-147.6'
    expect(() => checkSupported(record, sources, sheets)).toThrow(/gibbs\[zinc-ion\]: the source "nbs-tables-1982" has no row that prints -147.6 for it/)
    const uncited = built()
    ;(uncited.systems[2]!.disturbances[1]!.notes[0] as Note).alsoSourceId = 'lower-le-chatelier'
    expect(() => checkSupported(uncited, sources, sheets)).toThrow(/cobalt-heat\]\.notes\[0\]: the source "lower-le-chatelier" has no row that names it/)
  })

  it('lists three sheets of the hazard manifest for what their solutions look like, each written as that manifest writes it', () => {
    const tubes = built().systems.flatMap((system) => system.tubes.flatMap((tube) => ('shows' in tube ? [[tube.id, (tube.shows as { sourceId?: string }).sourceId]] : [])))
    expect(tubes).toEqual([['lead', 'flinn-sds-438'], ['indicator', undefined], ['cobalt', 'nuffield-cobalt-equilibrium'], ['zinc', 'flinn-sds-863.2'], ['magnesium', 'flinn-sds-477']])
    for (const id of ['flinn-sds-438', 'flinn-sds-863.2', 'flinn-sds-477']) {
      const [mine, theirs] = [manifest.sources.find((s) => s.id === id)!, hazardManifest.sources.find((s) => s.id === id)!]
      expect([mine.url, mine.citation, mine.fetchedSha256], id).toEqual([theirs.url, theirs.citation, theirs.fetchedSha256])
      expect(mine.supports.map((row) => row.prints), id).toEqual(['Clear, colorless liquid.'])
      // Each is a sheet under its bottle's tile, so the app lists it whether or not the tube cites it.
      expect(stored.reagents.some((r) => r.hazards.note.sourceId === id), id).toBe(true)
    }
  })

  it('lets a note cite a document of the hazard manifest only where a bottle\'s hazards cite it too', () => {
    const note = built().systems[2]!.disturbances[0]!.notes[1] as Note
    expect([note.sourceId, note.alsoSourceId, note.moreSourceIds]).toEqual(['flinn-sds-395', 'noaa-cameo-3598', ['nuffield-cobalt-equilibrium']])
    const record = built()
    ;(record.systems[2]!.disturbances[0]!.notes[1] as Note).alsoSourceId = 'flinn-sds-435'
    expect(() => checkSupported(record, sources, sheets)).toThrow(/cites the safety data sheet "flinn-sds-435", which no reagent's hazards cite/)
  })

  it('keeps no copy of a source, and writes the sources it shares with other labs as they write them', () => {
    expect([...manifest.sources, ...hazardManifest.sources].filter((s) => 'file' in s)).toEqual([])
    // Six that earlier labs' manifests list, and one sheet that the Group I cations lab's hazards rest on too.
    const shared = ['nbs-tables-1982', 'nist-codata-2022', 'ciaaw-abridged-2024', 'birk-lead', 'malik-varying-solubility', 'birk-magnesium', 'flinn-sds-438']
    for (const id of shared) {
      const mine = manifest.sources.find((s) => s.id === id)!
      const listed = allSources.find((s) => s.id === id)!
      expect([mine.url, mine.citation], id).toEqual([listed.url, listed.citation])
    }
    expect(manifest.sources.map((s) => s.id).filter((id) => !shared.includes(id))).toEqual(['birk-zinc', 'bellevue-le-chatelier', 'nuffield-cobalt-equilibrium', 'chemguide-ligand-exchange', 'chemguide-indicators', 'libretexts-acid-base-indicators', 'lower-le-chatelier', 'chemguide-le-chatelier', 'chemguide-equilibria-introduction', 'flinn-sds-863.2', 'flinn-sds-477'])
    // Every source of the lab is listed for the app.
    for (const source of manifest.sources) expect(allSources.some((s) => s.id === source.id), source.id).toBe(true)
  })
})

describe('the hazards', () => {
  it('are merged into the built record: eight of the lab\'s own and two shared from the aqueous reactions lab', () => {
    const merged = mergeHazards(copy(input.reagents), allHazards(), sheets)
    expect(merged).toEqual(stored.reagents)
    expect(merged.map((r) => r.hazards.signalWord)).toEqual(['Danger', 'Danger', 'Danger', 'Danger', 'Warning', 'Danger', 'Danger', 'Danger', 'Danger', 'Danger'])
  })

  it('refuses a shared bottle with an entry of its own, and one the other lab has none for', () => {
    const all = allHazards()
    expect(() => withSharedHazards({ ...copy(hazards), 'hcl-6m': all['hcl-6m']! } as Record<string, Entry>, aqueousHazards as Record<string, Entry>, SHARED)).toThrow(/"hcl-6m" carries another lab's record and has no entry here/)
    expect(() => withSharedHazards(copy(hazards) as Record<string, Entry>, {}, SHARED)).toThrow(/the other lab's hazards.json has no entry for "hcl-6m"/)
  })

  it('lists for the app the documents under a tile and those read for the safety card, and no other', () => {
    const under = new Set(stored.reagents.flatMap(({ hazards: h }) => [h.sourceId, h.note.sourceId, ...('alsoSourceId' in h.note && h.note.alsoSourceId ? [h.note.alsoSourceId] : []), ...('moreSourceIds' in h.note && h.note.moreSourceIds ? h.note.moreSourceIds : [])]))
    const forPrimer = hazardManifest.sources.filter((s) => s.supports.some((row) => row.field === 'primer.safety')).map((s) => s.id)
    expect(forPrimer.sort()).toEqual(['fisher-sds-mgoh2', 'fisher-sds-pbcl2', 'flinn-sds-255.6', 'flinn-sds-395', 'flinn-sds-435', 'flinn-sds-435.5', 'flinn-sds-475', 'mpbio-sds-zinc-hydroxide', 'noaa-cameo-3598', 'noaa-cameo-3735'])
    // A document read and cited by nothing here is listed only where an earlier lab cites it for a bottle or a card of its own.
    const earlier = new Set([...cationsHazardManifest.sources, ...aqueousHazardManifest.sources].map((s) => s.id))
    for (const sheet of hazardManifest.sources) {
      const listed = allSources.some((s) => s.id === sheet.id)
      if (under.has(sheet.id) || forPrimer.includes(sheet.id)) expect(listed, sheet.id).toBe(true)
      else expect(listed && !earlier.has(sheet.id), sheet.id).toBe(false)
    }
    // A document an earlier lab lists is written as that lab writes it, so that it is listed once.
    expect(() => newSources(sheets, allSources.filter((s) => !manifest.sources.some((m) => m.id === s.id)), 'lechatelier hazard-manifest.json')).not.toThrow()
  })
})

describe('withSharedSheets', () => {
  const own = hazardManifest.sources as Sheet[]
  const other = aqueousHazardManifest.sources as Sheet[]
  const inBoth = own.filter((s) => other.some((o) => o.id === s.id)).map((s) => s.id)

  it('lists a document both labs read once, with the rows of the shared bottles after its own', () => {
    // Since 2026-10-18 the aqueous lab's notes rest on four of this lab's documents too: the 0.5 M acid's sheet and NOAA's
    // record of the acid, under its three acids, and the two stricter sheets for the cobalt salt, under its solution.
    expect(inBoth).toEqual(['flinn-sds-395', 'flinn-sds-395.2', 'wards-sds-hh0093', 'noaa-cameo-3598', 'flinn-sds-255', 'wards-sds-cc0349', 'fisher-sds-cocl2-hexahydrate'])
    expect(new Set(sheets.map((s) => s.id)).size).toBe(sheets.length)
    const acid = sheets.find((s) => s.id === 'flinn-sds-395')!
    const mine = own.find((s) => s.id === 'flinn-sds-395')!
    const theirs = other.find((s) => s.id === 'flinn-sds-395')!.supports.filter((row) => row.field.startsWith('hcl-6m.'))
    expect(theirs.length).toBeGreaterThan(4)
    expect(acid.supports).toEqual([...mine.supports, ...theirs])
    expect([acid.url, acid.citation]).toEqual([mine.url, mine.citation])
    // The cobalt sheet is behind this lab's solid and the other lab's solution, which this lab does not share: its rows stay this lab's alone.
    expect(sheets.find((s) => s.id === 'flinn-sds-255')!.supports).toEqual(own.find((s) => s.id === 'flinn-sds-255')!.supports)
  })

  it('without the shared bottles named, keeps this lab\'s rows alone, and the merge then stops at the shared acid', () => {
    const plain = withSharedSheets(own, other)
    expect(plain.find((s) => s.id === 'flinn-sds-395')!.supports).toEqual(own.find((s) => s.id === 'flinn-sds-395')!.supports)
    expect(() => mergeHazards(copy(input.reagents), allHazards(), plain)).toThrow(/hcl-6m: the source "flinn-sds-395" has no row for hcl-6m\.classifiedAs/)
  })

  it('leaves a bottle that two labs each have a record of with its own rows: the Group I cations lab\'s silver nitrate', () => {
    const cations = cationsHazardManifest.sources as Sheet[]
    const silver = cations.find((s) => s.id === 'flinn-sds-691')!
    expect(other.find((s) => s.id === 'flinn-sds-691')!.supports.some((row) => row.field.startsWith('agno3-0.1m.'))).toBe(true)
    // That lab shares the 6 M acid alone, and no document of the acid is in its own manifest.
    expect(withSharedSheets(cations, other, ['hcl-6m']).find((s) => s.id === 'flinn-sds-691')).toEqual(silver)
    expect(withSharedSheets(cations, other, ['hcl-6m'])).toEqual(withSharedSheets(cations, other))
  })
})
