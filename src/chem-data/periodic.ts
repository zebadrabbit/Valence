import data from './periodic-table.json'
import { periodicTableSchema, type PeriodicElement } from './schema'

/**
 * Shown wherever a source lists no value for an element. Deliberately not "not measured": an empty
 * cell in these sources does not always mean that (periodic table spec 5.1).
 */
export const NO_VALUE = 'no value listed'

// periodic-table.json is written by `npm run build:data` from the saved downloads and decisions.json under
// docs/research/periodic-table/; edit the script or its inputs, not that file.
/** All 118 elements, by atomic number. */
export const periodicTable: readonly PeriodicElement[] = periodicTableSchema.parse(data)

export type Block = 's' | 'p' | 'd' | 'f'
export type ElementPosition = { period: number; group: number | null; block: Block; row: number; column: number }

// The atomic number that ends each period: the noble gases.
const PERIOD_ENDS = [2, 10, 18, 36, 54, 86, 118]

/**
 * Where an element sits (periodic table spec 5.4). Rows 1 to 7 are the main table, where the row is the
 * period and the column is the group. Lanthanum and actinium are in group 3, in the d block. The f block,
 * cerium to lutetium and thorium to lawrencium, has no group number and is drawn in rows 9 and 10 under
 * columns 4 to 17. Helium is in group 18 and in the s block.
 */
export function elementPosition(atomicNumber: number): ElementPosition {
  const period = PERIOD_ENDS.findIndex((end) => atomicNumber <= end) + 1
  const end = PERIOD_ENDS[period - 1]
  if (!Number.isInteger(atomicNumber) || atomicNumber < 1 || end === undefined) throw new Error(`no element has atomic number ${atomicNumber}`)
  const fromLeft = atomicNumber - (PERIOD_ENDS[period - 2] ?? 0)
  if (period >= 6 && fromLeft >= 4 && fromLeft <= 17) return { period, group: null, block: 'f', row: period + 3, column: fromLeft }
  // The first columns are counted from the left (three of them once there is an f block to step over), the
  // rest from the noble gas at the right. Helium is a noble gas.
  const column = atomicNumber !== 2 && fromLeft <= (period >= 6 ? 3 : 2) ? fromLeft : 18 - (end - atomicNumber)
  const block = column <= 2 || atomicNumber === 2 ? 's' : column <= 12 ? 'd' : 'p'
  return { period, group: column, block, row: period, column }
}

// The noble-gas cores a configuration can start from, each written as a configuration itself.
const CORES: Record<string, string> = {
  He: '1s2',
  Ne: '[He]2s2 2p6',
  Ar: '[Ne]3s2 3p6',
  Kr: '[Ar]4s2 3d10 4p6',
  Xe: '[Kr]5s2 4d10 5p6',
  Rn: '[Xe]6s2 4f14 5d10 6p6',
}

/**
 * Electrons per shell, innermost first, counted from a configuration as PubChem writes it: an optional
 * noble-gas core, with or without a space after it, then subshells in any order ("[Ar]4s1 3d10"). Takes
 * the stored text, which carries no "(predicted)" or "(calculated)" marking. Throws on anything else.
 */
export function shellsFromConfiguration(text: string): number[] {
  const fail = (): never => {
    throw new Error(`unreadable electron configuration "${text}"`)
  }
  const subshells = (part: string): string[] => {
    const [, core, rest = ''] = /^(?:\[(\w*)\])? ?(.*)$/.exec(part) ?? fail()
    return [...(core === undefined ? [] : subshells(CORES[core] ?? fail())), ...rest.split(' ')]
  }
  const shells: number[] = []
  const seen = new Set<string>()
  for (const subshell of subshells(text)) {
    const [, shell = '', letter = '', count] = /^([1-7])([spdf])(\d+)$/.exec(subshell) ?? fail()
    const n = Number(shell)
    const l = 'spdf'.indexOf(letter)
    const electrons = Number(count)
    // Shell n has subshells up to l = n - 1, and a subshell holds 2(2l + 1) electrons.
    if (l >= n || electrons < 1 || electrons > 4 * l + 2 || seen.has(shell + letter)) fail()
    seen.add(shell + letter)
    shells[n - 1] = (shells[n - 1] ?? 0) + electrons
  }
  return Array.from(shells, (electrons) => electrons ?? 0)
}
