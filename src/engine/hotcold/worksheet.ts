import type { Shown } from '../calorimetry/worksheet'
import type { HotcoldModel } from './model'

// The notebook (spec 26.2): its six entries in the order they are made, and whether each follows. Nothing here
// uses a hidden value: the two temperatures are held to what the logger has shown, and every entry after them to
// the learner's own entries above it. No heat in joules and no moles are asked.

export type Field = 'start' | 'extreme' | 'change' | 'temperature' | 'heat' | 'word'
/** The entries in the order they are made. */
export const FIELDS: readonly Field[] = ['start', 'extreme', 'change', 'temperature', 'heat', 'word']

/** What the water did, which way the heat went, and the word for it: the three entries that are choices. */
export const CHOICES = { temperature: ['warmer', 'colder'], heat: ['out', 'in'], word: ['exothermic', 'endothermic'] } as const
export type Went = (typeof CHOICES.temperature)[number]
export type Heat = (typeof CHOICES.heat)[number]
export type Word = (typeof CHOICES.word)[number]
export type Choice = keyof typeof CHOICES
export const isChoice = (field: Field): field is Choice => field in CHOICES

/** What a run's notebook holds; null where nothing is entered. Temperatures and the change are in tenths of a degree. */
export interface Entries {
  start: number | null
  extreme: number | null
  /** The size of the change, or the change with its sign: negative only for a fall. */
  change: number | null
  temperature: Went | null
  heat: Heat | null
  word: Word | null
}
export type Value = number | string

export const NO_ENTRIES: Entries = { start: null, extreme: null, change: null, temperature: null, heat: null, word: null }

/** The kind of slip an entry that does not follow looks like, where it looks like one. */
export type Slip = 'wrong-sign'
/** Whether an entry follows; `slip` is null where it follows, and where it does not and looks like no slip the lab knows. */
export interface Verdict {
  follows: boolean
  slip: Slip | null
}
const FOLLOWS: Verdict = { follows: true, slip: null }
const not = (slip: Slip | null = null): Verdict => ({ follows: false, slip })
const when = (follows: boolean): Verdict => (follows ? FOLLOWS : not())

/**
 * Whether one entry follows; null where it is empty or something it is worked from is. `shown` is what the logger
 * showed, for the two temperatures. The change follows from the two temperatures entered; whether the water got
 * warmer or colder, from the same two; which way the heat went, from that; and the word, from which way the heat went.
 */
export function verdictOf(m: HotcoldModel, shown: Shown, entries: Entries, field: Field): Verdict | null {
  const { start, extreme, change, temperature, heat, word } = entries
  switch (field) {
    case 'start':
      return start === null ? null : when(Math.abs(start - shown.start) <= m.readingToleranceTenths)
    case 'extreme':
      return extreme === null ? null : when(Math.abs(extreme - shown.extreme) <= m.readingToleranceTenths)
    case 'change': {
      if (change === null || start === null || extreme === null) return null
      const real = extreme - start
      if (Math.abs(change) !== Math.abs(real)) return not()
      // A size needs no sign; a sign that is given must be the change's own.
      return change >= 0 || real < 0 ? FOLLOWS : not('wrong-sign')
    }
    case 'temperature':
      if (temperature === null || start === null || extreme === null) return null
      return when((extreme > start && temperature === 'warmer') || (extreme < start && temperature === 'colder'))
    case 'heat':
      if (heat === null || temperature === null) return null
      return when((temperature === 'warmer') === (heat === 'out'))
    case 'word':
      if (word === null || heat === null) return null
      return when((heat === 'out') === (word === 'exothermic'))
  }
}
