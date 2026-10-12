import { describe, expect, it } from 'vitest'
import input from '../../../docs/research/freezing/freezing.json'
import hazards from '../../../docs/research/freezing/hazards.json'
import hazardManifest from '../../../docs/research/freezing/sources/hazard-manifest.json'
import manifest from '../../../docs/research/freezing/sources/MANIFEST.json'
import { cupStates, type Timeline } from '../../engine/freezing/cup'
import { modelFrom } from '../../engine/freezing/model'
import { runSetup } from '../../engine/freezing/setup'
import periodicTable from '../periodic-table.json'
import allSources from '../sources.json'
import { freezingData } from './data'
import stored from './freezing.json'

// The checks scripts/build-chem-data.mjs runs on the freezing point depression lab's record: against its manifest
// of sources, against the atomic weights the periodic table keeps, on what it works out from cited figures, on
// the numbers of spec 23.3 and 23.6 and, for the hazards, whose documents are not kept, against the hazard
// manifest's account of each. They are tested here on the real inputs and on inputs they must refuse. The checks
// of the manifests and the merge are the aqueous lab's (scripts/aqueous-lib.mjs), which that lab's tests cover on
// its own inputs; what is tested here is that they hold this record, and what this lab added
// (scripts/freezing-lib.mjs), with its copy of the cup held to the engine's.
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
type Numbers = { smallestFall: number; largestFall: number; leastIceMg: number; leastIceAtLastStepMg: number; mostSteps: number; worstPercent: number }
type Cup = { waterMg: number; iceMg: number; micro: number; level: boolean }
type OwnLib = {
  checkMolarMasses(record: unknown, periodicTable: unknown): void
  checkMeasured(record: unknown): void
  checkNumbers(record: unknown): { gaps: { lower: string; upper: string; percent: number }[]; nearest: { lower: string; upper: string; percent: number }; liquids: Record<string, Numbers>; solutes: Record<string, Numbers> }
  numbersOf(record: unknown): Record<string, unknown>
  cupStates(m: unknown, setup: { startHundredths: number; waterCg: number }, solute: unknown, timeline: Timeline): Cup[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/aqueous-lib.mjs', { eager: true }))
const [ownLib] = Object.values(import.meta.glob<OwnLib>('../../../scripts/freezing-lib.mjs', { eager: true }))
const { checkSupported, mergeHazards, newSources } = lib!
const { checkMolarMasses, checkMeasured, checkNumbers, numbersOf, cupStates: buildCup } = ownLib!

type Input = typeof input
const edited = (edit: (record: Input) => void): Input => {
  const record: Input = JSON.parse(JSON.stringify(input))
  edit(record)
  return record
}
const merged = () => ({ ...input, reagents: mergeHazards(input.reagents, hazards, hazardManifest.sources) })

describe("the build's checks, on the real inputs", () => {
  it('pass, and the merge gives the file the app loads', () => {
    expect(() => checkMolarMasses(input, periodicTable)).not.toThrow()
    expect(() => checkMeasured(input)).not.toThrow()
    expect(() => checkNumbers(input)).not.toThrow()
    expect(() => checkSupported(merged(), manifest.sources, hazardManifest.sources)).not.toThrow()
    expect(merged()).toEqual(stored)
  })

  it('keep no copy of a source in the folder, and list every source of both manifests once in sources.json, with the same address and citation as any lab that read it before', () => {
    for (const source of [...manifest.sources, ...hazardManifest.sources]) {
      expect('file' in source, source.id).toBe(false)
      expect(source.fetchedSha256 === undefined || /^[0-9a-f]{64}$/.test(source.fetchedSha256), source.id).toBe(true)
    }
    for (const { id, url, citation } of [...manifest.sources, ...hazardManifest.sources]) expect(allSources.filter((s) => s.id === id), id).toEqual([{ id, url, citation }])
    expect(newSources(manifest.sources, [], 'x').length).toBe(manifest.sources.length)
    expect(() => newSources(manifest.sources, [{ id: manifest.sources[0]!.id, url: 'https://example.org/', citation: 'Another.' }], 'x')).toThrow(/already in use/)
  })
})

describe('the molar masses', () => {
  it('are held to the atomic weights the periodic table keeps, summed over each formula, to two decimals', () => {
    expect(() => checkMolarMasses(edited((r) => void (r.reagents[0]!.molarMass.value = 58.1)), periodicTable)).toThrow(/reagents\[acetone\].molarMass: 58.1 is not the sum/)
    expect(() => checkMolarMasses(edited((r) => void (r.atomicWeights[1]!.value = 12.01)), periodicTable)).toThrow(/atomicWeights\[C\]: the periodic table gives C the atomic weight 12.011/)
    expect(() => checkMolarMasses(edited((r) => void (r.reagents[2]!.composition = { C: 3, H: 6, O: 1 } as never)), periodicTable)).toThrow(/reagents\[propan-2-ol\].molarMass/)
    expect(() => checkMolarMasses(edited((r) => void (r.reagents[4]!.molarMass.working = 'A sum.')), periodicTable)).toThrow(/the working does not show 22.990/)
  })
})

describe('the measured freezing points', () => {
  it('are worked out again: the molality, the fall of one particle and the ratio, to the figures the source prints', () => {
    expect(() => checkMeasured(edited((r) => void (r.measured[1]!.ratio.value = 1.85)))).toThrow(/measured\[nacl-3\].ratio: 1.85 is not 1.82/)
    expect(() => checkMeasured(edited((r) => void (r.measured[1]!.molality.value = 0.53)))).toThrow(/measured\[nacl-3\].molality/)
    expect(() => checkMeasured(edited((r) => void (r.measured[2]!.ratio.figures = 3)))).toThrow(/prints the freezing point to 1 figures/)
  })

  it('hold the count of particles of sodium chloride to its row, and every other count to the ideal it is marked as', () => {
    expect(() => checkMeasured(edited((r) => void (r.reagents[4]!.particles.value = 1.9)))).toThrow(/reagents\[nacl\].particles: 1.9 is not the ratio of the row "nacl-3"/)
    expect(() => checkMeasured(edited((r) => void (r.reagents[5]!.particles.value = 1.9)))).toThrow(/reagents\[kcl\].particles: a count marked as the ideal/)
    expect(() => checkMeasured(edited((r) => void (r.reagents[4]!.particles.measuredId = 'ethanol-2.5')))).toThrow(/no measured row "ethanol-2.5" of this reagent/)
    expect(input.reagents.map((r) => [r.id, r.particles.kind, r.particles.value])).toEqual([['acetone', 'ideal', 1], ['ethanol', 'ideal', 1], ['propan-2-ol', 'ideal', 1], ['urea', 'ideal', 1], ['nacl', 'measured', 1.82], ['kcl', 'ideal', 2], ['nabr', 'ideal', 2]])
  })
})

describe('the numbers of spec 23.3 and 23.6, by number', () => {
  const numbers = checkNumbers(input)

  it('tell the three liquids apart: acetone and 2-propanol are 3.48% apart, and a careful learner, with every entry rounded the least lucky way, is within 0.72%', () => {
    expect(numbers.nearest.lower).toBe('acetone')
    expect(numbers.nearest.upper).toBe('propan-2-ol')
    expect(numbers.nearest.percent).toBeCloseTo(3.478, 3)
    expect(Object.fromEntries(Object.entries(numbers.liquids).map(([id, n]) => [id, Math.round(n.worstPercent * 100)]))).toEqual({ acetone: 70, ethanol: 60, 'propan-2-ol': 72 })
    expect(Object.fromEntries(Object.entries(numbers.solutes).map(([id, n]) => [id, Math.round(n.worstPercent * 10)]))).toEqual({ urea: 12, nacl: 9, kcl: 9, nabr: 9 })
  })

  it('leave ice in every careful run, keep three figures in every fall, and level within seven presses', () => {
    const all = { ...numbers.liquids, ...numbers.solutes }
    expect(Object.fromEntries(Object.entries(all).map(([id, n]) => [id, [n.smallestFall, n.largestFall]]))).toEqual({ acetone: [1.09, 1.46], ethanol: [1.37, 1.84], 'propan-2-ol': [1.06, 1.41], urea: [1.53, 1.85], nacl: [1.45, 1.8], kcl: [1.59, 1.98], nabr: [1.59, 1.98] })
    expect(Math.min(...Object.values(all).map((n) => n.leastIceMg))).toBe(16439)
    expect(Math.min(...Object.values(all).map((n) => n.leastIceAtLastStepMg))).toBe(14039)
    expect(Math.max(...Object.values(all).map((n) => n.mostSteps))).toBe(14)
  })

  it('refuse a tolerance so wide that a molar mass could count for the wrong liquid', () => {
    expect(() => checkNumbers(edited((r) => void (r.parameters.molarMassTolerancePerMille.value = 17)))).not.toThrow()
    expect(() => checkNumbers(edited((r) => void (r.parameters.molarMassTolerancePerMille.value = 18)))).toThrow(/acetone and propan-2-ol are 3.48% apart in molar mass, too near to tell with a tolerance of 1.8%/)
  })

  it('refuse amounts that give a fall of two figures, too little ice, a tolerance a careful learner misses, and a logger a careful run does not fit', () => {
    expect(() => checkNumbers(edited((r) => void (r.parameters.unknownRangeCg.value = [300, 450])))).toThrow(/a fall of 0\.\d+ °C has fewer than three significant figures/)
    expect(() => checkNumbers(edited((r) => void (r.parameters.iceCg.value = 600)))).toThrow(/no ice is left in a careful run|does not level/)
    expect(() => checkNumbers(edited((r) => void (r.parameters.molarMassTolerancePerMille.value = 6)))).toThrow(/a careful learner can be 0\.\d+% out/)
    expect(() => checkNumbers(edited((r) => void (r.parameters.loggerMaxSteps.value = 8)))).toThrow(/does not level before the logger is full/)
  })
})

describe("the build's copy of the cup", () => {
  it('is the engine\'s, reading for reading: stirred and still, lid on and off, with the solute and without, to the logger\'s last step', () => {
    const m = modelFrom(freezingData)
    const b = numbersOf(input)
    const timelines: Timeline[] = [
      { lidFrom: 0, stirFrom: 0, addedAt: 8, steps: 60 },
      { lidFrom: null, stirFrom: 0, addedAt: 6, steps: 60 },
      { lidFrom: 0, stirFrom: null, addedAt: 10, steps: 60 },
      { lidFrom: 4, stirFrom: 12, addedAt: 2, steps: 40 },
      { lidFrom: 0, stirFrom: 0, addedAt: null, steps: 20 },
    ]
    for (const seed of [1, 2, 57, 4294967295]) {
      const setup = runSetup(m, seed, 'particles', 0)
      for (const solute of [...m.liquids, ...m.solutes]) {
        const dissolved = { ...solute, cg: setup.soluteCg[solute.id] ?? setup.unknownCg }
        for (const timeline of timelines) expect(buildCup(b, setup, dissolved, timeline), `${seed} ${solute.id}`).toEqual(cupStates(m, setup, dissolved, timeline))
      }
    }
  })
})

describe('the hazards (spec 5.2)', () => {
  it('are merged from this lab\'s own file, each held to the rows of the hazard manifest', () => {
    const copy = (): Record<string, Entry> => JSON.parse(JSON.stringify(hazards))
    const changed = copy()
    changed.acetone!.hazards.statements[0] = 'H225: Flammable liquid and vapor'
    expect(() => mergeHazards(input.reagents, changed, hazardManifest.sources)).toThrow(/prints "Highly flammable liquid and vapor \(H225\)"/)
    const word = copy()
    word.urea!.hazards.signalWord = 'Warning'
    expect(() => mergeHazards(input.reagents, word, hazardManifest.sources)).toThrow(/prints the signal word ""/)
    const unread = copy()
    unread.nabr!.hazards.note.alsoSourceId = 'noaa-cameo-946'
    expect(() => mergeHazards(input.reagents, unread, hazardManifest.sources)).toThrow(/has no row for nabr.hazards.note/)
    const missing = copy()
    delete missing.kcl
    expect(() => mergeHazards(input.reagents, missing, hazardManifest.sources)).toThrow(/expected exactly the keys/)
  })
})
