import { mulberry32 } from '../rng'
import type { Candidate, DensityModel } from './model'

/** What the seed fixes for the whole lab: which of the things it may be each unknown is, by its place among them. Hidden until a run of its part counts. */
export interface LabSetup {
  liquidIndex: number
  metalIndex: number
}

/**
 * What the seed fixes for one run. Each part uses its own share: part 1 the note, the water in its cylinder, what
 * the thermometer shows in ice water and the object on the balance; part 2 the empty cylinder and the liquid
 * poured; part 3 the water, the pieces, and what the two errors of technique cost.
 */
export interface RunSetup {
  /** The paper note, in hundredths of a centimetre. */
  noteLengthE2: number
  noteWidthE2: number
  /** The water in the cylinder of part 1, in tenths of a millilitre. */
  firstVolumeTenthMl: number
  /** What the thermometer shows in ice and water, in tenths of a degree: above or below the ice point. */
  thermometerTenths: number
  /** The object on the balance of part 1, in hundredths of a gram. */
  firstMassCg: number
  /** Part 2: the empty, dry cylinder, in hundredths of a gram, and the liquid poured, in tenths of a millilitre. */
  emptyCylinderCg: number
  liquidTenthMl: number
  /** Part 3: the water before the pieces go in and the volume of the pieces, in tenths of a millilitre. */
  waterTenthMl: number
  piecesTenthMl: number
  /** Part 3: the water that clings to pieces weighed wet, in hundredths of a gram, and the water lost when they are dropped in, in tenths of a millilitre. */
  wetWaterCg: number
  splashTenthMl: number
}

/** A whole number from lo to hi, each equally likely, from a draw in [0, 1). */
const pick = (u: number, [lo, hi]: readonly [number, number]) => lo + Math.floor(u * (hi - lo + 1))

// One stream per seed, read in a fixed order: draws 1 and 2 the liquid and the metal, then twelve for each run
// index, in the order of RunSetup's fields with the thermometer taking two (how far off, then which way). Every
// seeded value in the lab depends on this order; changing it changes every lab.
const LAB_DRAWS = 2
const RUN_DRAWS = 12

export function labSetup(m: DensityModel, seed: number): LabSetup {
  const rng = mulberry32(seed)
  return { liquidIndex: pick(rng(), [0, m.unknownLiquids.length - 1]), metalIndex: pick(rng(), [0, m.unknownMetals.length - 1]) }
}

/** Run `index` (from 0) of any part. It takes no state, so it cannot depend on what the learner did before. */
export function runSetup(m: DensityModel, seed: number, index: number): RunSetup {
  const rng = mulberry32(seed)
  for (let skip = 0; skip < LAB_DRAWS + RUN_DRAWS * index; skip++) rng()
  const noteLengthE2 = pick(rng(), m.noteLengthRangeE2)
  const noteWidthE2 = pick(rng(), m.noteWidthRangeE2)
  const firstVolumeTenthMl = pick(rng(), m.firstVolumeRangeTenthMl)
  const off = pick(rng(), m.thermometerOffRangeTenths)
  const thermometerTenths = m.icePointTenths + (rng() < 0.5 ? -off : off)
  const firstMassCg = pick(rng(), m.firstMassRangeCg)
  const emptyCylinderCg = pick(rng(), m.emptyCylinderRangeCg)
  const liquidTenthMl = pick(rng(), m.liquidRangeTenthMl)
  const waterTenthMl = pick(rng(), m.waterRangeTenthMl)
  const piecesTenthMl = pick(rng(), m.piecesRangeTenthMl)
  const wetWaterCg = pick(rng(), m.wetWaterRangeCg)
  const splashTenthMl = pick(rng(), m.splashRangeTenthMl)
  return { noteLengthE2, noteWidthE2, firstVolumeTenthMl, thermometerTenths, firstMassCg, emptyCylinderCg, liquidTenthMl, waterTenthMl, piecesTenthMl, wetWaterCg, splashTenthMl }
}

/** The row of the table that the unknown liquid is, and the one the unknown metal is. Hidden values. */
export const unknownLiquid = (m: DensityModel, seed: number): Candidate => m.liquids.find((c) => c.id === m.unknownLiquids[labSetup(m, seed).liquidIndex])!
export const unknownMetal = (m: DensityModel, seed: number): Candidate => m.metals.find((c) => c.id === m.unknownMetals[labSetup(m, seed).metalIndex])!

/** What a volume of something weighs on the balance, in hundredths of a gram: its density times the volume, to the hundredth the balance shows. */
export const massCg = (densityE3: number, tenthMl: number) => Math.round((densityE3 * tenthMl) / 100)
