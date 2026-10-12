import { candidatesOf, type DensityData } from '@/chem-data/density/data'

/** The four instruments with a drawn scale. The balance shows its figures and has none. */
export type ScaleId = 'ruler-cm' | 'ruler-mm' | 'cylinder' | 'thermometer'
export const SCALE_IDS = ['ruler-cm', 'ruler-mm', 'cylinder', 'thermometer'] as const satisfies readonly ScaleId[]

/** A drawn scale, in thousandths of its unit: how far apart its marks are, which are numbered, where it begins and ends, and the decimal places of a reading (one figure beyond the finest mark). */
export interface Scale {
  unit: string
  markE3: number
  numberE3: number
  fromE3: number
  toE3: number
  decimals: number
}

/** A row of a table of candidates: its id, and its density in g/mL x 1000. */
export interface Candidate {
  id: string
  densityE3: number
}

/**
 * The plain numbers the density engine runs on, all whole: every engine function takes one as an argument, so a
 * test can vary a value. Lengths are in hundredths of a centimetre, volumes in tenths of a millilitre,
 * temperatures in tenths of a degree, masses in hundredths of a gram, densities in thousandths of a gram for each
 * millilitre.
 */
export interface DensityModel {
  // cited values, and values worked out from cited ones
  /** The table of liquids, and which of its rows the unknown liquid may be. */
  liquids: readonly Candidate[]
  unknownLiquids: readonly string[]
  /** The table of metals, and which of its rows the unknown metal may be. */
  metals: readonly Candidate[]
  unknownMetals: readonly string[]
  /** The temperature of ice and water together, to the tenth of a degree the thermometer is read to. */
  icePointTenths: number
  // the set-up
  scales: Record<ScaleId, Scale>
  /** The decimal places the balance shows. */
  balanceDecimals: number
  // model parameters
  readingAllowance: number
  eyeShiftTenthMl: number
  tolerancePercent: number
  noteLengthRangeE2: readonly [number, number]
  noteWidthRangeE2: readonly [number, number]
  firstVolumeRangeTenthMl: readonly [number, number]
  thermometerOffRangeTenths: readonly [number, number]
  firstMassRangeCg: readonly [number, number]
  emptyCylinderRangeCg: readonly [number, number]
  liquidRangeTenthMl: readonly [number, number]
  waterRangeTenthMl: readonly [number, number]
  piecesRangeTenthMl: readonly [number, number]
  wetWaterRangeCg: readonly [number, number]
  splashRangeTenthMl: readonly [number, number]
}

/** The engine's numbers, from the stored record. */
export function modelFrom(data: DensityData): DensityModel {
  const { parameters: p } = data
  const [, liquid, metal] = data.parts
  const e3 = (value: number) => Math.round(value * 1000)
  const scale = (id: ScaleId): Scale => {
    const instrument = data.instruments.find((i) => i.id === id)
    if (!instrument?.estimated) throw new Error(`the record has no scale "${id}" that is read between its marks`)
    return { unit: instrument.unit, markE3: e3(instrument.markEvery), numberE3: e3(instrument.numberEvery), fromE3: e3(instrument.from), toE3: e3(instrument.to), decimals: instrument.decimals }
  }
  const balance = data.instruments.find((i) => i.id === 'balance')
  if (!balance || balance.estimated) throw new Error('the record has no balance that shows its figures')
  const table = (part: 'liquid' | 'metal') => candidatesOf(data, part).map((row) => ({ id: row.id, densityE3: e3(row.density.value) }))
  return {
    liquids: table('liquid'),
    unknownLiquids: liquid.unknownIds,
    metals: table('metal'),
    unknownMetals: metal.unknownIds,
    icePointTenths: Math.round(data.constants.icePoint.value * 10),
    scales: { 'ruler-cm': scale('ruler-cm'), 'ruler-mm': scale('ruler-mm'), cylinder: scale('cylinder'), thermometer: scale('thermometer') },
    balanceDecimals: balance.decimals,
    readingAllowance: p.readingAllowance.value,
    eyeShiftTenthMl: p.eyeShiftTenthMl.value,
    tolerancePercent: p.tolerancePercent.value,
    noteLengthRangeE2: p.noteLengthRangeE2.value,
    noteWidthRangeE2: p.noteWidthRangeE2.value,
    firstVolumeRangeTenthMl: p.firstVolumeRangeTenthMl.value,
    thermometerOffRangeTenths: p.thermometerOffRangeTenths.value,
    firstMassRangeCg: p.firstMassRangeCg.value,
    emptyCylinderRangeCg: p.emptyCylinderRangeCg.value,
    liquidRangeTenthMl: p.liquidRangeTenthMl.value,
    waterRangeTenthMl: p.waterRangeTenthMl.value,
    piecesRangeTenthMl: p.piecesRangeTenthMl.value,
    wetWaterRangeCg: p.wetWaterRangeCg.value,
    splashRangeTenthMl: p.splashRangeTenthMl.value,
  }
}
