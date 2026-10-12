import type { PartId } from '@/chem-data/freezing/data'
import { compare, cutFromAny, exact, fromAny, parseFall, parseKilograms, parseSig3, parseTemperature, point, products, quotients, sizeOf, spanOf, taken, type Exact, type Range, type Sig3 } from './entries'
import type { FreezingModel } from './model'

// The notebook (spec 23.2): its entries in the order they are worked out, and whether each follows from the
// learner's own numbers. Nothing here uses a hidden value: an entry is held to what the logger has shown, to what
// the bench shows (the balance, the freezing point constant, the molar masses in the table) and to the entries
// above it.
//
// THE ROUNDING CONVENTION is the calorimetry lab's (spec 16.2, ../figures.ts). The two temperatures are typed to
// 0.01 °C as the logger shows them, and the fall between them is exact. The mass of water is the solution's mass
// less the solute's, in kilograms, with every figure the balance gave: exact too. Every other number is typed to
// three significant figures and must be a correct rounding (either neighbour at an exact tie) of its relation
// worked on the values above it. A value above may be taken as the entry was typed, already rounded, or as the
// unrounded value that entry was rounded from; where the typed entry is itself a correct rounding, anything
// between the two is accepted as well. A number read off the bench with more figures than three may be taken in
// full or to three figures: the mass of water and a molar mass of the table.

export type Field = 'water' | 'solution' | 'fall' | 'waterKg' | 'molality' | 'moles' | 'molarMass' | 'liquid' | 'idealFall' | 'ratio'

/** A part's entries in the order they are worked out. */
export const FIELDS: Record<PartId, readonly Field[]> = {
  water: ['water'],
  unknown: ['water', 'solution', 'fall', 'waterKg', 'molality', 'moles', 'molarMass', 'liquid'],
  particles: ['water', 'solution', 'fall', 'waterKg', 'moles', 'molality', 'idealFall', 'ratio'],
}

/** What a run's notebook holds; null where nothing is entered. */
export interface Entries {
  /** The level reading of ice and water, in hundredths of a degree. */
  water: number | null
  /** The level reading of the solution with ice, in hundredths of a degree. */
  solution: number | null
  /** The fall between the two, in hundredths of a degree: a size, or the change with its sign, negative for a fall. */
  fall: number | null
  /** The water in the solution, in hundredths of a gram: typed in kilograms to five decimals. */
  waterKg: number | null
  /** mol/kg. */
  molality: Sig3 | null
  /** mol. */
  moles: Sig3 | null
  /** g/mol. */
  molarMass: Sig3 | null
  /** One of the liquids of the table, by its id. */
  liquid: string | null
  /** °C: the fall the molality would give with one particle for each formula unit. */
  idealFall: Sig3 | null
  /** The fall found over that one: the particles each formula unit gave. */
  ratio: Sig3 | null
}
export type Value = number | Sig3 | string

export const NO_ENTRIES: Entries = { water: null, solution: null, fall: null, waterKg: null, molality: null, moles: null, molarMass: null, liquid: null, idealFall: null, ratio: null }

/** How a field is written: a temperature to 0.01 °C, a mass in kilograms to five decimals, a number of three significant figures, or a choice. */
export type Kind = 'temperature' | 'kilograms' | 'figures' | 'choice'
export const kindOf = (field: Field): Kind => (field === 'water' || field === 'solution' || field === 'fall' ? 'temperature' : field === 'waterKg' ? 'kilograms' : field === 'liquid' ? 'choice' : 'figures')

/** What is typed in a field, read as that field is written; null where it is not written that way. A choice is its id. */
export function parseEntry(field: Field, text: string): Value | null {
  switch (kindOf(field)) {
    case 'temperature':
      return field === 'fall' ? parseFall(text) : parseTemperature(text)
    case 'kilograms':
      return parseKilograms(text)
    case 'figures':
      return parseSig3(text)
    case 'choice':
      return text === '' ? null : text
  }
}

/** The kind of slip an entry that does not follow looks like, where it looks like one. It names the slip and never the value. */
export type Slip = 'cut-off' | 'wrong-sign' | 'upside-down' | 'solute-not-taken-off'
/** Whether an entry follows; `slip` is null where it follows, and where it does not and looks like no slip the lab knows. */
export interface Verdict {
  follows: boolean
  slip: Slip | null
}
const FOLLOWS: Verdict = { follows: true, slip: null }
const not = (slip: Slip | null = null): Verdict => ({ follows: false, slip })

/** What the logger showed: the level reading before the solute and the reading when the cup was strained or weighed, in hundredths of a degree. Part 1 has the first alone. */
export interface Shown {
  water: number
  solution: number | null
}

/** What the bench shows for a run: the solute weighed out and, once it is weighed, the solution, in hundredths of a gram; and the molar mass the table gives the solute of part 3, x 100. Null where there is none. */
export interface Bench {
  soluteCg: number | null
  solutionCg: number | null
  soluteMolarMassE2: number | null
}

/** The entries each worked-out number of a part is worked from, beside the bench's own figures: the constant, the solute's mass and, in part 3, its molar mass. */
export const WORKED_FROM: Record<Exclude<PartId, 'water'>, Partial<Record<Field, readonly Field[]>>> = {
  unknown: { molality: ['fall'], moles: ['molality', 'waterKg'], molarMass: ['moles'] },
  particles: { moles: [], molality: ['moles', 'waterKg'], idealFall: ['molality'], ratio: ['fall', 'idealFall'] },
}

/** A whole number to three significant figures, a half going up: 10234 becomes 10200. */
const threeFigures = (n: number) => {
  let unit = 1
  while (n / unit >= 1000) unit *= 10
  return Math.round(n / unit) * unit
}
/** A bench number over a scale, taken in full or to three figures. */
const benchRange = (n: number, scale: number): Range => spanOf(exact(n, scale), exact(threeFigures(n), scale))
/** Every way of taking an entry above: for each range it may have been rounded from, that range and the entry as typed. */
const takenAll = (typed: Sig3, ranges: Range[]): Range[] => ranges.flatMap((range) => taken(typed, range))
const flipped = (ranges: Range[]): Range[] => ranges.map(([low, high]): Range => [exact(1, high), exact(1, low)])

/**
 * The unrounded values a worked-out entry may be a rounding of, from the entries above it and the bench; null
 * where something it is worked from is missing or is nothing a quotient can be taken of.
 */
function rangesOf(m: FreezingModel, part: PartId, bench: Bench, entries: Entries, field: Field): Range[] | null {
  const { fall, waterKg, molality, moles, idealFall } = entries
  const size = fall === null || fall === 0 ? null : point(exact(Math.abs(fall), 100))
  const kg = waterKg === null || waterKg <= 0 ? null : benchRange(waterKg, 100000)
  const grams = bench.soluteCg === null ? null : benchRange(bench.soluteCg, 100)
  const kf = point(exact(m.kfE2, 100))
  const above = (typed: Sig3 | null, from: Field) => {
    const ranges = typed === null ? null : rangesOf(m, part, bench, entries, from)
    return typed === null || ranges === null ? null : takenAll(typed, ranges)
  }
  if (part === 'unknown') {
    switch (field) {
      case 'molality':
        // The fall over the constant.
        return size && quotients([size], [kf])
      case 'moles': {
        // The molality times the kilograms of water.
        const m1 = above(molality, 'molality')
        return m1 && kg && products(m1, [kg])
      }
      case 'molarMass': {
        // The grams of the unknown over its moles.
        const n = above(moles, 'moles')
        return n && grams && quotients([grams], n)
      }
    }
  }
  if (part === 'particles') {
    switch (field) {
      case 'moles':
        // The grams of the solute over its molar mass.
        return grams && bench.soluteMolarMassE2 !== null ? quotients([grams], [benchRange(bench.soluteMolarMassE2, 100)]) : null
      case 'molality': {
        const n = above(moles, 'moles')
        return n && kg && quotients(n, [kg])
      }
      case 'idealFall': {
        const m1 = above(molality, 'molality')
        return m1 && products(m1, [kf])
      }
      case 'ratio': {
        const ideal = above(idealFall, 'idealFall')
        return ideal && size && quotients([size], ideal)
      }
    }
  }
  return null
}

/**
 * Whether one entry follows; null where it is empty or something it is worked from is. `shown` is what the logger
 * showed, for the two temperatures, and `bench` what the balance and the table show.
 */
export function verdictOf(m: FreezingModel, part: PartId, bench: Bench, shown: Shown, entries: Entries, field: Field): Verdict | null {
  const { water, solution, fall, waterKg, liquid, molarMass } = entries
  switch (field) {
    case 'water':
      return water === null ? null : water === shown.water ? FOLLOWS : not()
    case 'solution':
      return solution === null || shown.solution === null ? null : solution === shown.solution ? FOLLOWS : not()
    case 'fall': {
      if (fall === null || water === null || solution === null) return null
      const real = solution - water
      if (Math.abs(fall) !== Math.abs(real)) return not()
      // A size needs no sign; a sign that is given must be the change's own.
      return fall >= 0 || real < 0 ? FOLLOWS : not('wrong-sign')
    }
    case 'waterKg': {
      if (waterKg === null || bench.solutionCg === null || bench.soluteCg === null) return null
      if (waterKg === bench.solutionCg - bench.soluteCg) return FOLLOWS
      return not(waterKg === bench.solutionCg ? 'solute-not-taken-off' : null)
    }
    case 'liquid': {
      if (liquid === null || molarMass === null) return null
      // The liquid of the table whose molar mass is nearest the learner's own; at an exact tie, either.
      const size = sizeOf(molarMass)
      const distance = (e2: number): Exact => {
        const d = exact([size[0] * 100n - BigInt(e2) * size[1], size[1] * 100n])
        return d[0] < 0n ? [-d[0], d[1]] : d
      }
      const chosen = m.liquids.find((c) => c.id === liquid)
      return chosen !== undefined && molarMass.mantissa > 0 && m.liquids.every((c) => compare(distance(chosen.molarMassE2), distance(c.molarMassE2)) <= 0) ? FOLLOWS : not()
    }
    default: {
      const needs = part === 'water' ? undefined : WORKED_FROM[part][field]
      const typed = entries[field] as Sig3 | null
      if (typed === null || needs === undefined || needs.some((from) => entries[from] === null)) return null
      if (typed.mantissa < 0) return not('wrong-sign')
      const ranges = rangesOf(m, part, bench, entries, field)
      if (ranges === null) return not()
      if (fromAny(typed, ranges)) return FOLLOWS
      // The one relation each part ends on, worked the wrong way up: moles over grams, or the ideal fall over the fall found.
      if ((field === 'molarMass' || field === 'ratio' || (field === 'molality' && part === 'unknown')) && fromAny(typed, flipped(ranges))) return not('upside-down')
      return not(cutFromAny(typed, ranges) ? 'cut-off' : null)
    }
  }
}

/** True when a result of three figures is within so many parts in a thousand of a stored value, the edge included. Exact: the stored value is `stored` / `scale`, of whole numbers. */
export function withinPerMille(result: Sig3, stored: number, scale: number, perMille: number): boolean {
  const size = sizeOf(result)
  const signed: Exact = result.mantissa < 0 ? [-size[0], size[1]] : size
  // |result - stored/scale| x 1000 <= perMille x |stored/scale|
  const gap = signed[0] * BigInt(scale) - BigInt(stored) * signed[1]
  return (gap < 0n ? -gap : gap) * 1000n <= BigInt(perMille) * BigInt(Math.abs(stored)) * signed[1]
}

/** How far a result is from the stored value, in percent of the stored one: negative where the result is the smaller. For display: nothing is decided on it. */
export const percentOff = (result: Sig3, stored: number, scale: number) => ((result.mantissa * 10 ** result.exponent - stored / scale) / (stored / scale)) * 100
