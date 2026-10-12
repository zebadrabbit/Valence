// Scripted learners, for tests only: nothing in the app imports this file.
import type { PartId } from '@/chem-data/density/data'
import { exact, exactOf, figuresIn, formatDecimal, parseDecimal, toDecimals, toFigures, type Exact, type Figures } from '../figures'
import { scripted } from '../scripted'
import { can, reduce, type Action } from './actions'
import type { DensityModel } from './model'
import { stepE3, type Eye, type ScaleView } from './readings'
import { partView } from './select'
import { currentRun, type DensityState } from './state'
import { FIELDS, isLevel, kindOf, READ_FROM, type Field, type Level, type Value } from './worksheet'

/** Applies the actions in order; throws on one that cannot be done (see `scripted`). */
export const run = scripted<DensityModel, DensityState, Action>(can, reduce)

export interface How {
  /** Where the eye is for every level read: level unless told otherwise. */
  eye?: Eye
  /** Every reading of a scale taken so many units of its last figure from what the scale shows. */
  off?: number
  /** Part 3: weigh the pieces after they have been in the water; drop them in. */
  weigh?: 'first' | 'after'
  add?: 'slide' | 'drop'
  /** One slip in what is worked out: a product or a quotient kept to a figure too many or too few, or cut off, or upside down; a difference kept to a decimal place too few; the unknown named as another row of the table. */
  slip?: 'figures-too-many' | 'figures-too-few' | 'cut-off' | 'upside-down' | 'decimals-too-few' | 'wrong-name'
}

/** The scale a reading field is taken from, as the bench shows it now; null for the balance's fields and for a scale not on the bench. */
export function scaleOf(m: DensityModel, state: DensityState, part: PartId, field: Field): ScaleView | null {
  const { bench } = partView(m, state, part)
  switch (field) {
    case 'lengthCm':
      return bench.rulerCm?.length ?? null
    case 'widthCm':
      return bench.rulerCm?.width ?? null
    case 'lengthMm':
      return bench.rulerMm?.length ?? null
    case 'widthMm':
      return bench.rulerMm?.width ?? null
    case 'temperature':
      return bench.thermometer
    default:
      return READ_FROM[field] === 'cylinder' ? bench.cylinder.scale : null
  }
}

/** What a learner reads for a field off the bench as it stands, from the views alone: what the scale shows from where the eye is, at the figures the instrument gives. */
export function readingOf(m: DensityModel, state: DensityState, part: PartId, field: Field, off = 0): number | Level {
  const instrument = READ_FROM[field]!
  const { bench } = partView(m, state, part)
  if (instrument === 'balance') return bench.balance.cg!
  const value = Math.round(scaleOf(m, state, part, field)!.atE3 / stepE3(m.scales[instrument].decimals)) + off
  return instrument === 'cylinder' ? { value, eye: bench.cylinder.eye } : value
}

/** A reading as a number with its figures. */
const asFigures = (m: DensityModel, field: Field, value: Value): Figures => {
  const instrument = READ_FROM[field]
  if (instrument === undefined) return value as Figures
  return { mantissa: isLevel(value) ? value.value : (value as number), exponent: -(instrument === 'balance' ? m.balanceDecimals : m.scales[instrument].decimals) }
}
const minus = (a: Exact, b: Exact): Exact => [a[0] * b[1] - b[0] * a[1], a[1] * b[1]]
const product = (a: Exact, b: Exact): Exact => [a[0] * b[0], a[1] * b[1]]
/** An exact value cut off after so many figures, with no rounding. */
export function cut(value: Exact, figures: number): Figures {
  const rounded = toFigures(value, figures)!
  const above = exactOf(rounded)
  return above[0] * value[1] > value[0] * above[1] ? { ...rounded, mantissa: rounded.mantissa - 1 } : rounded
}

/**
 * What a learner enters for a worked-out field, from the entries already in the notebook and the table on the
 * bench, by the two rounding rules. Careful unless a slip is asked for.
 */
export function workedValue(m: DensityModel, state: DensityState, part: PartId, field: Field, slip?: How['slip']): Value {
  const value = workedOut(m, state, part, field, slip)
  // A number goes in as the page takes it: written out and read back, so that 70 of two figures is the "70" a learner can type.
  return typeof value === 'object' && 'mantissa' in value ? parseDecimal(formatDecimal(value))! : value
}

function workedOut(m: DensityModel, state: DensityState, part: PartId, field: Field, slip?: How['slip']): Value {
  const entries = currentRun(state, part).entries
  const of = (from: Field) => asFigures(m, from, entries[from]!)
  const quotient = (top: Figures, bottom: Figures): Figures => {
    const figures = Math.min(figuresIn(top), figuresIn(bottom))
    const value = slip === 'upside-down' ? exact(exactOf(bottom), exactOf(top)) : exact(exactOf(top), exactOf(bottom))
    if (slip === 'cut-off') return cut(value, figures)
    return toFigures(value, figures + (slip === 'figures-too-many' ? 1 : slip === 'figures-too-few' ? -1 : 0))!
  }
  const nearest = (table: DensityModel['liquids'], density: Figures) => {
    const size = Number(density.mantissa) * 10 ** density.exponent
    const ranked = [...table].sort((a, b) => Math.abs(a.densityE3 / 1000 - size) - Math.abs(b.densityE3 / 1000 - size))
    return ranked[slip === 'wrong-name' ? 1 : 0]!.id
  }
  switch (field) {
    case 'areaCm':
    case 'areaMm': {
      const [length, width] = field === 'areaCm' ? [of('lengthCm'), of('widthCm')] : [of('lengthMm'), of('widthMm')]
      const figures = Math.min(figuresIn(length), figuresIn(width))
      const value = product(exactOf(length), exactOf(width))
      if (slip === 'cut-off') return cut(value, figures)
      return toFigures(value, figures + (slip === 'figures-too-many' ? 1 : slip === 'figures-too-few' ? -1 : 0))!
    }
    case 'thermometerOff':
      return toDecimals(minus(exactOf(of('temperature')), exact(m.icePointTenths, 10)), slip === 'decimals-too-few' ? 0 : 1)
    case 'liquidMass':
      return toDecimals(minus(exactOf(of('fullMass')), exactOf(of('emptyMass'))), slip === 'decimals-too-few' ? 1 : 2)
    case 'metalVolume':
      return toDecimals(minus(exactOf(of('finalLevel')), exactOf(of('waterLevel'))), slip === 'decimals-too-few' ? 0 : 1)
    case 'liquidDensity':
      return quotient(of('liquidMass'), of('liquidVolume'))
    case 'metalDensity':
      return quotient(of('piecesMass'), of('metalVolume'))
    case 'liquid':
      return nearest(m.liquids, of('liquidDensity'))
    case 'metal':
      return nearest(m.metals, of('metalDensity'))
    default:
      throw new Error(`"${field}" is a reading`)
  }
}

/** Takes a part's readings, working its bench on the way, from a run that has not been begun. `through` is applied after every action. */
export function takeReadings(m: DensityModel, state: DensityState, part: PartId, { eye = 'level', off = 0, weigh = 'first', add = 'slide' }: How = {}, through: (s: DensityState) => DensityState = (s) => s): DensityState {
  const go = (actions: Action[]) => (state = run(m, state, actions, through))
  const read = (field: Field) => go([{ type: 'enter', part, field, value: readingOf(m, state, part, field, off) }])
  if (currentRun(state, part).eye !== eye) go([{ type: 'moveEye', part, eye }])
  if (part === 'reading') for (const field of FIELDS.reading.filter((f) => kindOf(f) === 'reading')) read(field)
  if (part === 'liquid') {
    go([{ type: 'weigh', part }])
    read('emptyMass')
    go([{ type: 'pour', part }])
    read('liquidVolume')
    go([{ type: 'weigh', part }])
    read('fullMass')
  }
  if (part === 'metal') {
    const weighing = () => {
      go([{ type: 'weigh', part }])
      read('piecesMass')
    }
    if (weigh === 'first') weighing()
    read('waterLevel')
    go([{ type: 'addPieces', part, how: add }])
    read('finalLevel')
    if (weigh === 'after') weighing()
  }
  return state
}

/** The worked-out entries of a part in order, each from the notebook as it then stands; a slip goes into the entry it is a slip of. */
export function workOut(m: DensityModel, state: DensityState, part: PartId, slip?: How['slip'], through: (s: DensityState) => DensityState = (s) => s): DensityState {
  const slipOf = (field: Field) => {
    const kind = kindOf(field)
    if (slip === 'wrong-name') return kind === 'name' ? slip : undefined
    if (slip === 'decimals-too-few') return kind === 'difference' ? slip : undefined
    if (slip === 'upside-down') return kind === 'quotient' ? slip : undefined
    return kind === 'product' || kind === 'quotient' ? slip : undefined
  }
  for (const field of FIELDS[part].filter((f) => kindOf(f) !== 'reading')) state = run(m, state, [{ type: 'enter', part, field, value: workedValue(m, state, part, field, slipOf(field)) }], through)
  return state
}

/**
 * One whole run of a part from an untouched bench: the readings taken, the notebook filled and, in Challenge,
 * checked. Careful unless told otherwise. A script that Guided would refuse throws.
 */
export function wholeRun(m: DensityModel, state: DensityState, part: PartId, how: How = {}, through: (s: DensityState) => DensityState = (s) => s): DensityState {
  state = takeReadings(m, state, part, how, through)
  state = workOut(m, state, part, how.slip, through)
  return state.mode === 'challenge' ? run(m, state, [{ type: 'check', part }], through) : state
}
