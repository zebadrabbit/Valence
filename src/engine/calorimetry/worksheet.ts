import type { PartId } from '@/chem-data/calorimetry/data'
import { contentsCg, massCg, waterFormedMicromol } from './cup'
import { cutFromAny, fromAny, point, quotients, taken } from '../figures'
import { compare, cutOffFrom, exact, roundsFrom, sizeOf, spanOf, times, type Exact, type Range, type Sig3 } from './entries'
import type { CalorimetryModel } from './model'
import type { RunSetup } from './setup'

// The worksheet (spec 16.2): its entries in the order they are worked out, and whether each follows from the
// learner's own numbers. Nothing here uses a hidden value: an entry is held to what the logger has shown, to what
// the bench shows (the balance, the bath, the molar mass on the tile, the specific heat of water) and to the
// entries above it.
//
// THE ROUNDING CONVENTION. Temperatures are typed to 0.1 °C and the change between two of them is exact. Every
// other number is typed to three significant figures and must be a correct rounding (either neighbour at an exact
// tie) of its relation worked on the values above it. A value above may be taken in two ways, and both are
// accepted: as the entry was typed, already rounded; or as the unrounded value that entry was rounded from, which
// is the same relation worked on the numbers above it. Where the typed entry is itself a correct rounding,
// anything between the two is accepted as well, which takes in a calculator's value rounded part of the way. A
// number read off the bench with more figures than three may likewise be taken in full or rounded: the mass in
// the cup to 0.1 g, the piece of metal and the molar mass to three figures.

export type Field = 'start' | 'extreme' | 'change' | 'heat' | 'direction' | 'moles' | 'perMole' | 'specificHeat' | 'metal'
export type Direction = 'out' | 'in'

/** A part's entries in the order they are worked out. */
export const FIELDS: Record<PartId, readonly Field[]> = {
  neutralisation: ['start', 'extreme', 'change', 'heat', 'direction', 'moles', 'perMole'],
  dissolving: ['start', 'extreme', 'change', 'heat', 'direction', 'moles', 'perMole'],
  metal: ['start', 'extreme', 'change', 'heat', 'specificHeat', 'metal'],
}

/** What a run's worksheet holds; null where nothing is entered. Temperatures and the change are in tenths of a degree. */
export interface Entries {
  start: number | null
  extreme: number | null
  /** The size of the change, or the change with its sign: negative only for a fall. */
  change: number | null
  /** J, as a size. */
  heat: Sig3 | null
  direction: Direction | null
  /** mol. */
  moles: Sig3 | null
  /** kJ/mol, with its sign: negative for heat given out. */
  perMole: Sig3 | null
  /** J/(g·°C). */
  specificHeat: Sig3 | null
  /** One of the candidates, by its id. */
  metal: string | null
}
export type Value = number | Sig3 | string

export const NO_ENTRIES: Entries = { start: null, extreme: null, change: null, heat: null, direction: null, moles: null, perMole: null, specificHeat: null, metal: null }

/** The kind of slip an entry that does not follow looks like, where it looks like one. It names the slip and never the value. */
export type Slip = 'cut-off' | 'wrong-sign' | 'salt-left-out' | 'water-change-used' | 'joules-for-kilojoules'
/** Whether an entry follows; `slip` is null where it follows, and where it does not and looks like no slip the lab knows. */
export interface Verdict {
  follows: boolean
  slip: Slip | null
}
const FOLLOWS: Verdict = { follows: true, slip: null }
const not = (slip: Slip | null = null): Verdict => ({ follows: false, slip })

/** What the logger showed: the level reading before the change and the highest or lowest after it, in tenths of a degree. */
export interface Shown {
  start: number
  extreme: number
}

/** A whole number to three significant figures, a half going up: 5137 becomes 5140. */
const threeFigures = (n: number) => {
  let unit = 1
  while (n / unit >= 1000) unit *= 10
  return Math.round(n / unit) * unit
}
// How a value above may be taken, and the quotients of such values, are the shared rule's (../figures.ts).

/** The heat of a mass, in hundredths of a gram, warming or cooling by a change in tenths of a degree, in joules: mass x specific heat of water x change. */
const heatOf = (m: CalorimetryModel, cg: number, changeTenths: number): Exact => exact(cg * m.specificHeatE2 * Math.abs(changeTenths), 1e5)

/** The heat of the cup's contents for the change entered: with the mass on the bench taken in full, or to 0.1 g. */
function heatRange(m: CalorimetryModel, part: PartId, run: RunSetup, change: number): Range {
  const cg = contentsCg(m, part, run)
  return spanOf(heatOf(m, cg, change), heatOf(m, Math.round(cg / 10) * 10, change))
}

/** The moles of a part: of water formed, from the volumes and the molarity; of the salt, from its mass and its molar mass taken in full or to three figures. */
function molesRange(m: CalorimetryModel, part: PartId, run: RunSetup): Range {
  if (part === 'neutralisation') return point(exact(waterFormedMicromol(m), 1e6))
  return spanOf(exact(run.saltCg * 10, m.saltMolarMassE3), exact(run.saltCg * 10, threeFigures(m.saltMolarMassE3)))
}

/** The fall of the piece of metal, in tenths of a degree: from the bath's temperature to the highest the learner entered. */
const fallOf = (run: RunSetup, entries: Entries) => (entries.extreme === null ? null : run.bathTenths - entries.extreme)

/**
 * Whether one entry follows; null where it is empty or something it is worked from is. `shown` is what the logger
 * showed, for the two temperatures.
 */
export function verdictOf(m: CalorimetryModel, part: PartId, run: RunSetup, shown: Shown, entries: Entries, field: Field): Verdict | null {
  const { start, extreme, change, heat, direction, moles, perMole, specificHeat, metal } = entries
  switch (field) {
    case 'start':
      return start === null ? null : Math.abs(start - shown.start) <= m.readingToleranceTenths ? FOLLOWS : not()
    case 'extreme':
      return extreme === null ? null : Math.abs(extreme - shown.extreme) <= m.readingToleranceTenths ? FOLLOWS : not()
    case 'change': {
      if (change === null || start === null || extreme === null) return null
      const real = extreme - start
      if (Math.abs(change) !== Math.abs(real)) return not()
      // A size needs no sign; a sign that is given must be the change's own.
      return change >= 0 || real < 0 ? FOLLOWS : not('wrong-sign')
    }
    case 'heat': {
      if (heat === null || change === null) return null
      if (heat.mantissa < 0) return not('wrong-sign')
      const range = heatRange(m, part, run, change)
      if (roundsFrom(heat, range)) return FOLLOWS
      if (part === 'dissolving' && roundsFrom(heat, point(heatOf(m, massCg(m, m.waterTenthMl), change)))) return not('salt-left-out')
      return not(cutOffFrom(heat, range) ? 'cut-off' : null)
    }
    case 'direction':
      if (direction === null || start === null || extreme === null) return null
      return (extreme > start && direction === 'out') || (extreme < start && direction === 'in') ? FOLLOWS : not()
    case 'moles': {
      if (moles === null) return null
      if (moles.mantissa < 0) return not('wrong-sign')
      const range = molesRange(m, part, run)
      return roundsFrom(moles, range) ? FOLLOWS : not(cutOffFrom(moles, range) ? 'cut-off' : null)
    }
    case 'perMole': {
      if (perMole === null || heat === null || moles === null || direction === null || change === null) return null
      // kJ for each mole: joules over moles, over 1000.
      const ranges = quotients(taken(heat, heatRange(m, part, run, change)), taken(moles, molesRange(m, part, run)), exact(1, 1000))
      const rightSign = perMole.mantissa < 0 === (direction === 'out')
      if (fromAny(perMole, ranges)) return rightSign ? FOLLOWS : not('wrong-sign')
      if (fromAny(perMole, ranges.map(([low, high]): Range => [times(low, 1000), times(high, 1000)]))) return not('joules-for-kilojoules')
      return not(cutFromAny(perMole, ranges) ? 'cut-off' : null)
    }
    case 'specificHeat': {
      const fall = fallOf(run, entries)
      if (specificHeat === null || heat === null || change === null || fall === null) return null
      if (specificHeat.mantissa < 0) return not('wrong-sign')
      const heats = taken(heat, heatRange(m, part, run, change))
      // J over (g x °C): the mass of the piece taken in full or to three figures.
      const per = (tenths: number): Range[] => (tenths <= 0 ? [] : quotients(heats, [spanOf(exact(run.metalCg * tenths, 1000), exact(threeFigures(run.metalCg) * tenths, 1000))]))
      const ranges = per(fall)
      if (fromAny(specificHeat, ranges)) return FOLLOWS
      if (fromAny(specificHeat, per(Math.abs(change)))) return not('water-change-used')
      return not(cutFromAny(specificHeat, ranges) ? 'cut-off' : null)
    }
    case 'metal': {
      if (metal === null || specificHeat === null) return null
      // The candidate whose specific heat is nearest the learner's own; at an exact tie, either.
      const distance = (e3: number): Exact => {
        const d = exact([sizeOf(specificHeat)[0] * 1000n - BigInt(e3) * sizeOf(specificHeat)[1], sizeOf(specificHeat)[1] * 1000n])
        return d[0] < 0n ? [-d[0], d[1]] : d
      }
      const chosen = m.candidates.find((c) => c.id === metal)
      return chosen !== undefined && specificHeat.mantissa > 0 && m.candidates.every((c) => compare(distance(chosen.specificHeatE3), distance(c.specificHeatE3)) <= 0) ? FOLLOWS : not()
    }
  }
}

/** True when a signed result is within the tolerance of the stored value, the edge included. Exact. `stored` and `scale` are whole: the stored value is stored / scale. */
export function withinTolerance(m: CalorimetryModel, result: Sig3, stored: number, scale: number): boolean {
  const size = sizeOf(result)
  const signed: Exact = result.mantissa < 0 ? [-size[0], size[1]] : size
  // |result - stored/scale| x 100 <= tolerance x |stored/scale|
  const gap = signed[0] * BigInt(scale) - BigInt(stored) * signed[1]
  return (gap < 0n ? -gap : gap) * 100n <= BigInt(m.tolerancePercent) * BigInt(Math.abs(stored)) * signed[1]
}

/** How far the size of a result is from the size of the stored value, in percent of the stored size: negative where the result is the smaller. For display: nothing is decided on it. */
export const percentOff = (result: Sig3, stored: number, scale: number) => ((Math.abs(result.mantissa) * 10 ** result.exponent - Math.abs(stored) / scale) / (Math.abs(stored) / scale)) * 100
