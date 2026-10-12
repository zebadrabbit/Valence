import { decimalsIn, parseDecimal } from '../figures'
import type { DensityModel, ScaleId } from './model'

// An instrument's reading (spec 22.2): what its scale shows, as a page can draw it and as it can be said in words,
// and a typed reading read from its characters. A reading is a whole number of the units of its last figure:
// tenths of a centimetre on the centimetre ruler, hundredths on the millimetre ruler, tenths of a millilitre in
// the cylinder, tenths of a degree on the thermometer, hundredths of a gram on the balance.

/** Where the eye is against a liquid's level (spec 22.2). */
export type Eye = 'above' | 'level' | 'below'
export const EYES = ['above', 'level', 'below'] as const satisfies readonly Eye[]

/** An instrument a reading is taken from. */
export type Instrument = ScaleId | 'balance'

/**
 * Whereabouts between two marks something stands, as it is put into words: no nearer than that, so the words do
 * not hand over the last figure. Each stretch is narrow enough that the reading a reader makes of the words is
 * within the allowance (a test holds it).
 */
export type Position = 'on-lower' | 'just-past' | 'quarter' | 'half' | 'three-quarters' | 'just-short' | 'on-upper'

/** A scale as it shows a value. Everything is in thousandths of the scale's unit. */
export interface ScaleView {
  instrument: ScaleId
  unit: string
  /** The scale: where it begins and ends, how far apart its marks are, and which are numbered. */
  fromE3: number
  toE3: number
  markE3: number
  numberE3: number
  /** Where the edge, the bottom of the curve or the top of the thread stands, as it looks from where the eye is. */
  atE3: number
  /** The two marks it stands between, the lower at or under it, and whereabouts between them. */
  lowerE3: number
  upperE3: number
  position: Position
  /** The stretch of the scale that the closer look shows: two marks on either side of the two it stands between. */
  closeUp: { fromE3: number; toE3: number }
}

/** How many thousandths of its unit one unit of a reading's last figure is: 100 for a reading to a tenth. */
export const stepE3 = (decimals: number) => 10 ** (3 - decimals)

function positionOf(hundredths: number): Position {
  if (hundredths < 5) return 'on-lower'
  if (hundredths < 18) return 'just-past'
  if (hundredths < 38) return 'quarter'
  if (hundredths < 63) return 'half'
  if (hundredths < 83) return 'three-quarters'
  if (hundredths < 96) return 'just-short'
  return 'on-upper'
}

/** A scale showing a value, in thousandths of its unit. */
export function scaleView(m: DensityModel, instrument: ScaleId, atE3: number): ScaleView {
  const { unit, fromE3, toE3, markE3, numberE3 } = m.scales[instrument]
  const lowerE3 = Math.floor(atE3 / markE3) * markE3
  return {
    instrument,
    unit,
    fromE3,
    toE3,
    markE3,
    numberE3,
    atE3,
    lowerE3,
    upperE3: lowerE3 + markE3,
    position: positionOf(Math.floor(((atE3 - lowerE3) * 100) / markE3)),
    closeUp: { fromE3: Math.max(fromE3, lowerE3 - 2 * markE3), toE3: Math.min(toE3, lowerE3 + 3 * markE3) },
  }
}

/** A liquid's level as it looks from where the eye is, in tenths of a millilitre: higher on the scale from above, lower from below, by the model's shift. */
export const seenLevel = (m: DensityModel, tenthMl: number, eye: Eye) => tenthMl + (eye === 'above' ? m.eyeShiftTenthMl : eye === 'below' ? -m.eyeShiftTenthMl : 0)

/** Why a typed reading is not one the instrument can give. */
export type ReadingProblem = 'not-a-number' | 'too-few-figures' | 'too-many-figures' | 'off-the-scale'
export type Parsed = { value: number; problem?: undefined } | { problem: ReadingProblem; value?: undefined }

/**
 * A reading as it was typed (spec 22.2): it must have the figures the instrument gives and no more, which is one
 * figure beyond the finest mark of a scale and every figure the balance shows, a final zero included. The value
 * is in units of the reading's last figure. Only the thermometer reads below zero.
 */
export function parseReading(m: DensityModel, instrument: Instrument, text: string): Parsed {
  const typed = parseDecimal(text)
  if (typed === null) return { problem: 'not-a-number' }
  const decimals = instrument === 'balance' ? m.balanceDecimals : m.scales[instrument].decimals
  if (decimalsIn(typed) < decimals) return { problem: 'too-few-figures' }
  if (decimalsIn(typed) > decimals) return { problem: 'too-many-figures' }
  return isReading(m, instrument, typed.mantissa) ? { value: typed.mantissa } : { problem: 'off-the-scale' }
}

/** True for a value an instrument can show: a whole number of its last figure's units, on its scale. The balance weighs up to 999.99 g. */
export function isReading(m: DensityModel, instrument: Instrument, value: unknown): value is number {
  if (!Number.isSafeInteger(value) || Object.is(value, -0)) return false
  if (instrument === 'balance') return (value as number) >= 0 && (value as number) <= 99999
  const { fromE3, toE3, decimals } = m.scales[instrument]
  const atE3 = (value as number) * stepE3(decimals)
  return atE3 >= fromE3 && atE3 <= toE3
}

/** A reading as it is written, with every figure: 62 on the centimetre ruler is "6.2", 2430 on the balance "24.30", -4 on the thermometer "-0.4". */
export function formatReading(m: DensityModel, instrument: Instrument, value: number): string {
  const decimals = instrument === 'balance' ? m.balanceDecimals : m.scales[instrument].decimals
  const digits = String(Math.abs(value)).padStart(decimals + 1, '0')
  return `${value < 0 ? '-' : ''}${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`
}

/**
 * True when a reading is near enough to what a scale shows (spec 22.2): within the allowance, in units of the
 * reading's last figure. `shownE3` is where the scale stands, in thousandths of its unit. The balance is copied
 * exactly.
 */
export function nearEnough(m: DensityModel, instrument: Instrument, value: number, shown: number): boolean {
  if (instrument === 'balance') return value === shown
  const step = stepE3(m.scales[instrument].decimals)
  return Math.abs(value * step - shown) <= m.readingAllowance * step
}
