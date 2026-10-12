import { z } from 'zod'
import { PART_IDS, type PartId, type UnknownPartId } from '@/chem-data/density/data'
import { withinPercent, type Figures } from '../figures'
import type { Candidate, DensityModel } from './model'
import { isReading, seenLevel, type Eye } from './readings'
import { massCg, runSetup, unknownLiquid, unknownMetal } from './setup'
import { FIELDS, isLevel, kindOf, NO_ENTRIES, READ_FROM, verdictOf, WORKED_FROM, type Entries, type Field, type Shown, type Verdict } from './worksheet'

// The lab as plain data: the whole record saved for it. It holds the seed, what the learner did at each bench (in
// order), where the eye is, and what the learner typed, all as whole numbers, booleans and short strings, so a
// round trip through JSON gives back the same value. Anything the seed fixes (which liquid and which metal, every
// length, level, temperature and mass), what an instrument shows, and anything judged (whether an entry is right,
// whether a run counts and why not, whether a part is done) is worked out on reading and stored nowhere, so a
// stored record cannot disagree with its seed; the one stored judgement is the status, and the schema holds it to
// the runs.
//
// The bounds are literals. A change to this shape, or to a value the model judges with, needs the density entry's
// version raised (src/density-version.test.ts).

const count = z.number().int().min(0)
const notNegativeZero = (n: number) => !Object.is(n, -0)
const eye = z.enum(['above', 'level', 'below'])
/** A reading in units of its last figure: up to 999.99 g on the balance; below zero only on the thermometer. */
const reading = z.number().int().min(-99999).max(99999).refine(notNegativeZero, 'not negative zero')
const level = z.strictObject({ value: count.max(99999), eye })
const figures = z.strictObject({ mantissa: z.number().int().min(-999999999).max(999999999).refine(notNegativeZero, 'not negative zero'), exponent: z.number().int().min(-12).max(12).refine(notNegativeZero, 'not negative zero') })
const name = z.string().min(1).max(40)

const entriesSchema = z.strictObject({
  lengthCm: reading.nullable(),
  widthCm: reading.nullable(),
  lengthMm: reading.nullable(),
  widthMm: reading.nullable(),
  firstVolume: level.nullable(),
  temperature: reading.nullable(),
  firstMass: reading.nullable(),
  areaCm: figures.nullable(),
  areaMm: figures.nullable(),
  thermometerOff: figures.nullable(),
  emptyMass: reading.nullable(),
  liquidVolume: level.nullable(),
  fullMass: reading.nullable(),
  liquidMass: figures.nullable(),
  liquidDensity: figures.nullable(),
  liquid: name.nullable(),
  piecesMass: reading.nullable(),
  waterLevel: level.nullable(),
  finalLevel: level.nullable(),
  metalVolume: figures.nullable(),
  metalDensity: figures.nullable(),
  metal: name.nullable(),
})

/** What is done at a bench, in the order it was done. Part 2: weigh the empty cylinder, pour, weigh again. Part 3: weigh the pieces and slide or drop them in, in either order. */
const step = z.enum(['weigh', 'pour', 'slide', 'drop'])

const runSchema = z.strictObject({
  /** 0 for the first run of its part. With the seed it fixes every amount of this run. */
  index: count,
  /** Where the eye is against the liquid in the cylinder. A learner stands at the bench, so it begins above. */
  eye,
  bench: z.array(step).max(3),
  entries: entriesSchema,
  /** The notebook has been checked and the run is over: in Guided at its last entry, in Challenge when the learner asks. */
  closed: z.boolean(),
})

const stateSchema = z.strictObject({
  seed: count.max(4294967295),
  mode: z.enum(['guided', 'challenge']),
  status: z.enum(['in-progress', 'completed']),
  /** Every run of each part in order; the last is the current one. */
  parts: z.strictObject({ reading: z.array(runSchema).min(1), liquid: z.array(runSchema).min(1), metal: z.array(runSchema).min(1) }),
})

export type Step = z.infer<typeof step>
export type Run = z.infer<typeof runSchema>
export type DensityState = z.infer<typeof stateSchema>
export type Mode = DensityState['mode']

export const newRun = (index: number): Run => ({ index, eye: 'above', bench: [], entries: NO_ENTRIES as Run['entries'], closed: false })

/** A lab that has just been started. The seed is drawn in app/; the engine never makes one. */
export function createLab(seed: number, mode: Mode): DensityState {
  return { seed: seed >>> 0, mode, status: 'in-progress', parts: { reading: [newRun(0)], liquid: [newRun(0)], metal: [newRun(0)] } }
}

export const currentRun = (state: DensityState, part: PartId): Run => state.parts[part][state.parts[part].length - 1]!

/** How a bench stands, from what was done at it. */
export interface Bench {
  /** Part 2: the empty cylinder has been weighed; the liquid is in; the cylinder has been weighed with it. */
  emptyWeighed: boolean
  poured: boolean
  fullWeighed: boolean
  /** Part 3: the pieces have been weighed, dry or after they were in the water; and how they went in. */
  weighed: 'no' | 'dry' | 'wet'
  added: 'no' | 'slid' | 'dropped'
}

export function benchOf(part: PartId, run: Pick<Run, 'bench'>): Bench {
  const { bench } = run
  const add = bench.findIndex((s) => s === 'slide' || s === 'drop')
  const weigh = bench.indexOf('weigh')
  return {
    emptyWeighed: part === 'liquid' && bench[0] === 'weigh',
    poured: part === 'liquid' && bench.includes('pour'),
    fullWeighed: part === 'liquid' && bench.length === 3,
    weighed: part !== 'metal' || weigh < 0 ? 'no' : add >= 0 && add < weigh ? 'wet' : 'dry',
    added: part !== 'metal' || add < 0 ? 'no' : bench[add] === 'slide' ? 'slid' : 'dropped',
  }
}

/** The ways a bench can have been worked, each a list of steps of which any beginning is a bench too. */
const WAYS: Record<PartId, readonly (readonly Step[])[]> = {
  reading: [[]],
  liquid: [['weigh', 'pour', 'weigh']],
  metal: [
    ['weigh', 'slide'],
    ['weigh', 'drop'],
    ['slide', 'weigh'],
    ['drop', 'weigh'],
  ],
}
export const isBench = (part: PartId, bench: readonly Step[]) => WAYS[part].some((way) => bench.length <= way.length && bench.every((s, i) => s === way[i]))

/** The row of its table that a part's unknown is. A hidden value. */
export const unknownOf = (m: DensityModel, seed: number, part: UnknownPartId): Candidate => (part === 'liquid' ? unknownLiquid(m, seed) : unknownMetal(m, seed))

/** What the balance shows, in hundredths of a gram, and what is on it; null where nothing has been put on it, or it has been taken off again. */
export function balanceOf(m: DensityModel, seed: number, part: PartId, run: Run): { cg: number; holds: 'object' | 'empty-cylinder' | 'cylinder-with-liquid' | 'pieces' | 'wet-pieces' } | null {
  const setup = runSetup(m, seed, run.index)
  const bench = benchOf(part, run)
  if (part === 'reading') return { cg: setup.firstMassCg, holds: 'object' }
  if (part === 'liquid') {
    if (bench.fullWeighed) return { cg: setup.emptyCylinderCg + massCg(unknownLiquid(m, seed).densityE3, setup.liquidTenthMl), holds: 'cylinder-with-liquid' }
    // The cylinder comes off the balance to be filled.
    return bench.emptyWeighed && !bench.poured ? { cg: setup.emptyCylinderCg, holds: 'empty-cylinder' } : null
  }
  const pieces = massCg(unknownMetal(m, seed).densityE3, setup.piecesTenthMl)
  // The dry pieces come off the balance to go into the cylinder.
  if (bench.weighed === 'dry') return bench.added === 'no' ? { cg: pieces, holds: 'pieces' } : null
  return bench.weighed === 'wet' ? { cg: pieces + setup.wetWaterCg, holds: 'wet-pieces' } : null
}

/** The level in the cylinder as it is, in tenths of a millilitre, and what is in it; null for an empty cylinder. */
export function cylinderOf(m: DensityModel, seed: number, part: PartId, run: Run): { tenthMl: number; holds: 'water' | 'unknown-liquid'; pieces: boolean } | null {
  const setup = runSetup(m, seed, run.index)
  const bench = benchOf(part, run)
  if (part === 'reading') return { tenthMl: setup.firstVolumeTenthMl, holds: 'water', pieces: false }
  if (part === 'liquid') return bench.poured ? { tenthMl: setup.liquidTenthMl, holds: 'unknown-liquid', pieces: false } : null
  const lost = bench.added === 'dropped' ? setup.splashTenthMl : 0
  if (bench.added === 'no') return { tenthMl: setup.waterTenthMl, holds: 'water', pieces: false }
  // Taken out to be weighed, the pieces carry off the water that clings to them: a hundredth of a gram of water is a hundredth of a millilitre.
  if (bench.weighed === 'wet') return { tenthMl: setup.waterTenthMl - lost - Math.round(setup.wetWaterCg / 10), holds: 'water', pieces: false }
  return { tenthMl: setup.waterTenthMl + setup.piecesTenthMl - lost, holds: 'water', pieces: true }
}

/**
 * What each instrument shows now for a part's readings, at eye level: a scale in thousandths of its unit, the
 * balance in hundredths of a gram. Null where the bench does not show it: not yet, or no longer.
 */
export function shownNow(m: DensityModel, seed: number, part: PartId, run: Run): Shown {
  const setup = runSetup(m, seed, run.index)
  const bench = benchOf(part, run)
  const balance = balanceOf(m, seed, part, run)?.cg ?? null
  const level = cylinderOf(m, seed, part, run)
  const levelE3 = level === null ? null : level.tenthMl * 100
  if (part === 'reading') return { lengthCm: setup.noteLengthE2 * 10, widthCm: setup.noteWidthE2 * 10, lengthMm: setup.noteLengthE2 * 10, widthMm: setup.noteWidthE2 * 10, firstVolume: levelE3, temperature: setup.thermometerTenths * 100, firstMass: balance }
  if (part === 'liquid') return { emptyMass: bench.poured ? null : balance, liquidVolume: levelE3, fullMass: bench.fullWeighed ? balance : null }
  return { piecesMass: balance ?? (bench.weighed === 'dry' ? massCg(unknownMetal(m, seed).densityE3, setup.piecesTenthMl) : null), waterLevel: bench.added === 'no' ? levelE3 : null, finalLevel: bench.added !== 'no' && bench.weighed !== 'wet' ? levelE3 : null }
}

/**
 * What each instrument showed when its reading could be taken, whatever has been done since: what a reading is
 * judged against. The empty cylinder's mass and the water's first level are no longer on the bench once the
 * liquid or the pieces are in; they were what they were.
 */
export function shownThen(m: DensityModel, seed: number, part: PartId, run: Run): Shown {
  const setup = runSetup(m, seed, run.index)
  const bench = benchOf(part, run)
  if (part === 'reading') return shownNow(m, seed, part, run)
  if (part === 'liquid') {
    return {
      emptyMass: bench.emptyWeighed ? setup.emptyCylinderCg : null,
      liquidVolume: bench.poured ? setup.liquidTenthMl * 100 : null,
      fullMass: bench.fullWeighed ? setup.emptyCylinderCg + massCg(unknownLiquid(m, seed).densityE3, setup.liquidTenthMl) : null,
    }
  }
  const pieces = massCg(unknownMetal(m, seed).densityE3, setup.piecesTenthMl)
  const lost = bench.added === 'dropped' ? setup.splashTenthMl : 0
  return {
    piecesMass: bench.weighed === 'no' ? null : pieces + (bench.weighed === 'wet' ? setup.wetWaterCg : 0),
    waterLevel: setup.waterTenthMl * 100,
    finalLevel: bench.added === 'no' ? null : (setup.waterTenthMl + setup.piecesTenthMl - lost) * 100,
  }
}

/** A level as it looks from where the run's eye is now, in thousandths of a millilitre. */
export const seenE3 = (m: DensityModel, levelE3: number, at: Eye) => seenLevel(m, levelE3 / 100, at) * 100

/** Why a run does not count. */
export type Reason = 'eye-not-level' | 'reading-not-shown' | 'weighed-wet' | 'dropped-in' | 'entries-do-not-follow' | 'outside-tolerance'

export interface Judged {
  /** Each entered field's verdict. */
  verdicts: Partial<Record<Field, Verdict>>
  /** Why the run does not count; empty when it does. */
  reasons: Reason[]
}

/** Every field's verdict as the entries stand, checked or not. This reads what the instruments showed and is not part of the public surface. */
export function verdictsOf(m: DensityModel, seed: number, part: PartId, run: Run): Partial<Record<Field, Verdict>> {
  const shown = shownThen(m, seed, part, run)
  const verdicts: Partial<Record<Field, Verdict>> = {}
  for (const field of FIELDS[part]) {
    const verdict = verdictOf(m, shown, run.entries, field)
    if (verdict) verdicts[field] = verdict
  }
  return verdicts
}

/**
 * A run judged (spec 22.3): it counts when its readings are right, each entry follows, its technique was right,
 * and, in parts 2 and 3, its density is within the tolerance of the stored figure and the unknown named is the
 * one it was. The result is held to the stored figure only where every reading is right and every entry follows;
 * otherwise the reasons already say what is wrong. Null for a run whose notebook has not been checked. This reads
 * the hidden values and is not part of the public surface.
 */
export function judge(m: DensityModel, seed: number, part: PartId, run: Run): Judged | null {
  if (!run.closed) return null
  const verdicts = verdictsOf(m, seed, part, run)
  const wrong = FIELDS[part].filter((field) => verdicts[field]?.follows !== true)
  const bench = benchOf(part, run)
  const reasons: Reason[] = [...(bench.weighed === 'wet' ? (['weighed-wet'] as const) : []), ...(bench.added === 'dropped' ? (['dropped-in'] as const) : [])]
  const readings = wrong.filter((field) => kindOf(field) === 'reading')
  if (readings.some((field) => verdicts[field]?.slip === 'eye-above' || verdicts[field]?.slip === 'eye-below')) reasons.push('eye-not-level')
  if (readings.some((field) => verdicts[field]?.slip == null)) reasons.push('reading-not-shown')
  if (wrong.some((field) => kindOf(field) !== 'reading')) reasons.push('entries-do-not-follow')
  if (wrong.length === 0 && part !== 'reading' && !resultWithin(m, seed, part, run.entries)) reasons.push('outside-tolerance')
  return { verdicts, reasons }
}

/** A part's density as it was entered, and the name chosen. */
export const resultOf = (part: UnknownPartId, entries: Entries): { density: Figures | null; named: string | null } => {
  const [density, named] = part === 'liquid' ? [entries.liquidDensity, entries.liquid] : [entries.metalDensity, entries.metal]
  return { density: density !== null && typeof density === 'object' && 'mantissa' in density ? density : null, named: typeof named === 'string' ? named : null }
}

function resultWithin(m: DensityModel, seed: number, part: UnknownPartId, entries: Entries): boolean {
  const { density, named } = resultOf(part, entries)
  const unknown = unknownOf(m, seed, part)
  return density !== null && density.mantissa > 0 && withinPercent(density, unknown.densityE3, 1000, m.tolerancePercent) && named === unknown.id
}

export const runCounts = (m: DensityModel, seed: number, part: PartId, run: Run): boolean => judge(m, seed, part, run)?.reasons.length === 0

/** A part is done when one of its runs counts (spec 22.3). */
export const partDone = (m: DensityModel, state: Pick<DensityState, 'seed' | 'parts'>, part: PartId): boolean => state.parts[part].some((run) => runCounts(m, state.seed, part, run))

/** The status the runs give: completed when all three parts are done. */
export const statusOf = (m: DensityModel, state: Pick<DensityState, 'seed' | 'parts'>): DensityState['status'] => (PART_IDS.every((part) => partDone(m, state, part)) ? 'completed' : 'in-progress')

/** True for a value of the kind a field takes, whatever the bench shows: a reading its instrument can give, a level with an eye, a number as typed, or a row of the field's table. */
export function isValueOf(m: DensityModel, field: Field, value: unknown): boolean {
  const instrument = READ_FROM[field]
  if (instrument === 'cylinder') return isLevel(value) && Object.keys(value).length === 2 && eye.safeParse(value.eye).success && isReading(m, instrument, value.value)
  if (instrument !== undefined) return isReading(m, instrument, value)
  if (field === 'liquid' || field === 'metal') return (field === 'liquid' ? m.liquids : m.metals).some((c) => c.id === value)
  return figures.safeParse(value).success
}

/**
 * The stored shape, held to the model it is read with: nothing stored that the reducer would not have stored (a
 * run whose index is not its place, a bench worked in no order the lab allows, an entry of another part's
 * notebook, a reading the bench had not shown or one no instrument can give, a liquid poured before the empty
 * cylinder's mass was read, pieces put in before the water's level was read or taken out before the last level
 * was, a worked-out entry with nothing to work it from, a name that is no row of the table, a checked notebook
 * with an entry missing); and the status the runs give. A run left unfinished behind a later one is as the
 * reducer leaves it: running a part again abandons the run before.
 */
export const densityStateSchema = (m: DensityModel): z.ZodType<DensityState> =>
  stateSchema.superRefine((state, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    for (const part of PART_IDS) {
      state.parts[part].forEach((run, place) => {
        const at = (key: string) => ['parts', part, place, key]
        // A run's seeded values are found by stepping the seed's stream forward by its index, so an index that is not its place (a hand-edited 1e12, say) would hang the page on load.
        if (run.index !== place) return issue(at('index'), "a run's index is its place in the list")
        if (!isBench(part, run.bench)) return issue(at('bench'), 'the bench was worked in no order the lab allows')
        const fields = FIELDS[part]
        const { entries } = run
        const entered = (Object.keys(entries) as Field[]).filter((field) => entries[field] !== null)
        if (entered.some((field) => !fields.includes(field))) issue(at('entries'), "only the part's own entries")
        const shown = shownThen(m, state.seed, part, run)
        for (const field of entered.filter((f) => fields.includes(f))) {
          if (!isValueOf(m, field, entries[field])) issue(at('entries'), `"${field}" holds what its field cannot`)
          if (kindOf(field) === 'reading' && (shown[field] === null || shown[field] === undefined)) issue(at('entries'), `"${field}" was read before the bench showed it`)
          if ((WORKED_FROM[field] ?? []).some((from) => entries[from] === null)) issue(at('entries'), `"${field}" has nothing to be worked from`)
        }
        const bench = benchOf(part, run)
        if (bench.poured && entries.emptyMass === null) issue(at('bench'), "the liquid was poured before the empty cylinder's mass was read")
        if (bench.added !== 'no' && entries.waterLevel === null) issue(at('bench'), "the pieces went in before the water's level was read")
        if (bench.weighed === 'wet' && entries.finalLevel === null) issue(at('bench'), 'the pieces were taken out before the last level was read')
        if (run.closed && fields.some((field) => entries[field] === null)) issue(at('closed'), 'a notebook is checked when every entry is made')
      })
    }
    if (state.status !== statusOf(m, state)) issue(['status'], 'the status is not the one the runs give')
  })
