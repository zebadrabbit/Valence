import { CATEGORIES, describeGroup, elementPosition, NO_VALUE, periodicTable, type Block } from '@/chem-data/periodic'
import type { PeriodicElement } from '@/chem-data/schema'
import { quantityText, TRENDS, type TrendProperty } from './trend'

// The table as drawn (periodic table spec 5.4, 6 and 8): which element sits where, how the keys move
// between elements, what is highlighted, and what a cell and the status line say.

const PLACED = periodicTable.map((element) => ({ element, ...elementPosition(element.atomicNumber) }))

/** The main table: seven rows of 18 places, each holding an element or nothing. */
export const MAIN_ROWS: readonly (readonly (PeriodicElement | undefined)[])[] = Array.from({ length: 7 }, (_, r) =>
  Array.from({ length: 18 }, (_, c) => PLACED.find((p) => p.row === r + 1 && p.column === c + 1)?.element),
)

/**
 * The two rows drawn below the main table, under columns 4 to 17. `after` is the element of the main table
 * they follow, which carries `marker` to point to the row.
 */
export const DETACHED_ROWS = ([[9, '*'], [10, '**']] as const).map(([row, marker]) => {
  const elements = PLACED.filter((p) => p.row === row).map((p) => p.element)
  const first = elements[0]
  const last = elements.at(-1)
  const after = first && periodicTable[first.atomicNumber - 2]
  if (!first || !last || !after) throw new Error(`row ${row} of the periodic table is empty`)
  return {
    marker,
    period: elementPosition(first.atomicNumber).period,
    after,
    elements,
    label: `${first.name} to ${last.name.toLowerCase()}`,
    numbers: `${first.atomicNumber} to ${last.atomicNumber}`,
  }
})

type Key = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'

/**
 * The element a key moves to from the element `from`, by atomic number. An arrow goes to the nearest element in
 * that direction in the same row or column as drawn, over empty places and the gap between the main table and
 * the rows below it; where there is none it stays. Home and End go to the first and last element of the row.
 */
export function move(from: number, key: Key): number {
  const here = PLACED[from - 1]
  if (!here) throw new Error(`no element has atomic number ${from}`)
  const vertical = key === 'ArrowUp' || key === 'ArrowDown'
  // The elements of this element's column, top to bottom, or of its row, left to right.
  const line = PLACED.filter((p) => (vertical ? p.column === here.column : p.row === here.row)).sort((a, b) => (vertical ? a.row - b.row : a.column - b.column))
  const index = line.indexOf(here)
  const to = key === 'Home' ? line[0] : key === 'End' ? line.at(-1) : line[index + (key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1)]
  return (to ?? here).element.atomicNumber
}

export type Highlight =
  | { kind: 'group'; value: number }
  | { kind: 'period'; value: number }
  | { kind: 'block'; value: Block }
  | { kind: 'category'; value: string }
  | null

/** Whether an element belongs to the highlighted set. A group is matched by group number, never by the drawn column. */
export function isHighlighted(element: PeriodicElement, highlight: Highlight): boolean {
  if (!highlight) return false
  if (highlight.kind === 'category') return element.category === highlight.value
  return elementPosition(element.atomicNumber)[highlight.kind] === highlight.value
}

const categoryWords = (category: string) => {
  const words = CATEGORIES.find((c) => c.category === category)
  if (!words) throw new Error(`no category ${category}`)
  return words
}

/**
 * A cell's accessible name: "Fluorine, F, atomic number 9, halogen", then the shown property's value with its
 * unit or NO_VALUE, then "highlighted". Group and period are left to the table's headers.
 */
export function cellLabel(element: PeriodicElement, property: TrendProperty | null, highlighted: boolean): string {
  const quantity = property && element[property]
  return [
    element.name,
    element.symbol,
    `atomic number ${element.atomicNumber}`,
    categoryWords(element.category).member,
    ...(property ? [quantity ? `${TRENDS[property].name} ${quantityText(quantity)}` : `${TRENDS[property].name}: ${NO_VALUE}`] : []),
    ...(highlighted ? ['highlighted'] : []),
  ].join(', ')
}

const listed = new Intl.ListFormat('en-GB', { type: 'conjunction' })
// A status line that read out 38 transition metals would be a wall of speech.
const MOST_LISTED = 8

/** What the status line says of the highlight: the set, its size, and its members where there are 8 or fewer. */
export function highlightStatus(highlight: Highlight): string {
  if (!highlight) return ''
  const members = periodicTable.filter((element) => isHighlighted(element, highlight))
  const groupName = highlight.kind === 'group' ? describeGroup(highlight.value).name : undefined
  const set =
    highlight.kind === 'category'
      ? categoryWords(highlight.value).family.toLowerCase()
      : highlight.kind === 'block'
        ? `${highlight.value} block`
        : `${highlight.kind} ${highlight.value}${groupName ? `, ${groupName.toLowerCase()}` : ''}`
  const names = members.length <= MOST_LISTED ? `: ${listed.format(members.map((e) => e.name.toLowerCase()))}` : ''
  return `Highlighted: ${set}, ${members.length} elements${names}.`
}

type Choice = { label: string; highlight: NonNullable<Highlight> }
const numbered = (count: number) => Array.from({ length: count }, (_, i) => i + 1)
const BLOCKS: readonly Block[] = ['s', 'p', 'd', 'f']

/** Everything that can be highlighted, as the highlight control lists it: four sets of options. */
export const HIGHLIGHT_CHOICES: readonly { label: string; choices: readonly Choice[] }[] = [
  {
    label: 'Group',
    choices: numbered(18).map((value) => {
      const name = describeGroup(value).name
      return { label: `Group ${value}${name ? `: ${name}` : ''}`, highlight: { kind: 'group', value } }
    }),
  },
  { label: 'Period', choices: numbered(7).map((value) => ({ label: `Period ${value}`, highlight: { kind: 'period', value } })) },
  { label: 'Block', choices: BLOCKS.map((value) => ({ label: `${value} block`, highlight: { kind: 'block', value } })) },
  { label: 'Chemical family', choices: CATEGORIES.map(({ category, family }) => ({ label: family, highlight: { kind: 'category', value: category } })) },
]

/** A highlight as the value of its option in the highlight control; '' for none. */
export function highlightKey(highlight: Highlight): string {
  return highlight ? `${highlight.kind}:${highlight.value}` : ''
}
