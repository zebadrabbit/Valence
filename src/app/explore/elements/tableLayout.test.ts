import { describe, expect, it } from 'vitest'
import { CATEGORIES, describeGroup, elementPosition, NO_VALUE, periodicTable, type Block } from '@/chem-data/periodic'
import type { PeriodicElement } from '@/chem-data/schema'
import { cellLabel, DETACHED_ROWS, HIGHLIGHT_CHOICES, highlightKey, highlightStatus, isHighlighted, move, type Highlight } from './tableLayout'

const element = (symbol: string): PeriodicElement => {
  const found = periodicTable.find((e) => e.symbol === symbol)
  if (!found) throw new Error(`no element ${symbol}`)
  return found
}
const z = (symbol: string) => element(symbol).atomicNumber
const symbol = (atomicNumber: number) => periodicTable[atomicNumber - 1]!.symbol
const KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'] as const
type Key = (typeof KEYS)[number]
const go = (from: string, key: Key) => symbol(move(z(from), key))
const OPPOSITE = { ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp', ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' } as const
const ARROWS = Object.keys(OPPOSITE) as (keyof typeof OPPOSITE)[]

describe('move', () => {
  it('steps over the empty places in a row', () => {
    expect(go('H', 'ArrowRight')).toBe('He')
    expect(go('He', 'ArrowLeft')).toBe('H')
    expect(go('Be', 'ArrowRight')).toBe('B')
    expect(go('Mg', 'ArrowRight')).toBe('Al')
  })

  it('goes down a column of the main table', () => {
    expect(go('Mg', 'ArrowDown')).toBe('Ca')
    expect(go('Y', 'ArrowDown')).toBe('La')
    expect(go('La', 'ArrowDown')).toBe('Ac')
    expect(go('La', 'ArrowUp')).toBe('Y')
    expect(go('He', 'ArrowDown')).toBe('Ne')
    expect(go('H', 'ArrowDown')).toBe('Li')
  })

  it('goes from lanthanum to hafnium and back along period 6, not into the rows below', () => {
    expect(go('Ba', 'ArrowRight')).toBe('La')
    expect(go('La', 'ArrowRight')).toBe('Hf')
    expect(go('Hf', 'ArrowLeft')).toBe('La')
    expect(go('Ac', 'ArrowRight')).toBe('Rf')
  })

  it('crosses the gap between the main table and the rows below it, in columns 4 to 17', () => {
    expect(go('Rf', 'ArrowDown')).toBe('Ce')
    expect(go('Ce', 'ArrowUp')).toBe('Rf')
    expect(go('Ce', 'ArrowDown')).toBe('Th')
    expect(go('Ts', 'ArrowDown')).toBe('Lu')
    expect(go('Lu', 'ArrowUp')).toBe('Ts')
    expect(go('Lu', 'ArrowDown')).toBe('Lr')
    for (let column = 4; column <= 17; column++) {
      const at = (row: number) => periodicTable.find((e) => elementPosition(e.atomicNumber).row === row && elementPosition(e.atomicNumber).column === column)!
      expect(move(at(7).atomicNumber, 'ArrowDown')).toBe(at(9).atomicNumber)
      expect(move(at(9).atomicNumber, 'ArrowUp')).toBe(at(7).atomicNumber)
      expect(move(at(10).atomicNumber, 'ArrowDown')).toBe(at(10).atomicNumber)
    }
  })

  it('stays where there is no element in that direction', () => {
    expect(go('Ra', 'ArrowDown')).toBe('Ra')
    expect(go('Fr', 'ArrowDown')).toBe('Fr')
    expect(go('Ac', 'ArrowDown')).toBe('Ac')
    expect(go('Og', 'ArrowDown')).toBe('Og')
    expect(go('Ce', 'ArrowLeft')).toBe('Ce')
    expect(go('Th', 'ArrowLeft')).toBe('Th')
    expect(go('Lu', 'ArrowRight')).toBe('Lu')
    expect(go('Lr', 'ArrowRight')).toBe('Lr')
    expect(go('Li', 'ArrowLeft')).toBe('Li')
    expect(go('He', 'ArrowRight')).toBe('He')
    expect(go('H', 'ArrowUp')).toBe('H')
    expect(go('Sc', 'ArrowUp')).toBe('Sc')
    expect(go('Lr', 'ArrowDown')).toBe('Lr')
  })

  it('goes to the ends of a row with Home and End', () => {
    expect([go('Au', 'Home'), go('Au', 'End')]).toEqual(['Cs', 'Rn'])
    expect([go('La', 'Home'), go('La', 'End')]).toEqual(['Cs', 'Rn'])
    expect([go('Gd', 'Home'), go('Gd', 'End')]).toEqual(['Ce', 'Lu'])
    expect([go('U', 'Home'), go('U', 'End')]).toEqual(['Th', 'Lr'])
    expect([go('H', 'Home'), go('H', 'End')]).toEqual(['H', 'He'])
    expect([go('Cs', 'Home'), go('Rn', 'End')]).toEqual(['Cs', 'Rn'])
  })

  it('returns a valid atomic number for every key from every cell', () => {
    for (const e of periodicTable) {
      for (const key of KEYS) {
        const to = move(e.atomicNumber, key)
        expect([e.symbol, key, Number.isInteger(to) && to >= 1 && to <= 118]).toEqual([e.symbol, key, true])
      }
    }
  })

  it('can undo every arrow that moves with the opposite arrow', () => {
    let moved = 0
    for (const e of periodicTable) {
      for (const key of ARROWS) {
        const to = move(e.atomicNumber, key)
        if (to === e.atomicNumber) continue
        moved++
        expect([e.symbol, key, move(to, OPPOSITE[key])]).toEqual([e.symbol, key, e.atomicNumber])
      }
    }
    expect(moved).toBeGreaterThan(400)
  })

  it('keeps left, right, Home and End in the row, and up and down in the column', () => {
    for (const e of periodicTable) {
      const from = elementPosition(e.atomicNumber)
      for (const key of KEYS) {
        const to = elementPosition(move(e.atomicNumber, key))
        if (key === 'ArrowUp' || key === 'ArrowDown') expect([e.symbol, key, to.column]).toEqual([e.symbol, key, from.column])
        else expect([e.symbol, key, to.row]).toEqual([e.symbol, key, from.row])
      }
    }
  })

  it('reaches every element from hydrogen with the arrows alone', () => {
    const reached = new Set([1])
    const queue = [1]
    for (const from of queue) {
      for (const key of ARROWS) {
        const to = move(from, key)
        if (!reached.has(to)) queue.push(to)
        reached.add(to)
      }
    }
    expect(reached.size).toBe(118)
  })

  it('throws for a number that is not an element', () => {
    expect(() => move(0, 'ArrowUp')).toThrow()
    expect(() => move(119, 'Home')).toThrow()
  })
})

describe('the rows below the main table', () => {
  it('are cerium to lutetium after lanthanum and thorium to lawrencium after actinium, each with its marker', () => {
    expect(DETACHED_ROWS.map((row) => [row.marker, row.period, row.after.symbol, row.label, row.numbers, row.elements.length])).toEqual([
      ['*', 6, 'La', 'Cerium to lutetium', '58 to 71', 14],
      ['**', 7, 'Ac', 'Thorium to lawrencium', '90 to 103', 14],
    ])
    for (const row of DETACHED_ROWS) {
      expect(row.elements.map((e) => elementPosition(e.atomicNumber).column)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])
      expect(row.elements[0]!.atomicNumber).toBe(row.after.atomicNumber + 1)
    }
    expect(DETACHED_ROWS.map((row) => row.note)).toEqual([
      'Cerium to lutetium, atomic numbers 58 to 71, come after lanthanum and are drawn below the main table.',
      'Thorium to lawrencium, atomic numbers 90 to 103, come after actinium and are drawn below the main table.',
    ])
  })
})

describe('isHighlighted', () => {
  const members = (highlight: Highlight) => periodicTable.filter((e) => isHighlighted(e, highlight)).map((e) => e.symbol)

  it('highlights nothing when no highlight is set', () => {
    expect(members(null)).toEqual([])
  })

  it('highlights a group by its number, never by the drawn column', () => {
    expect(members({ kind: 'group', value: 17 })).toEqual(['F', 'Cl', 'Br', 'I', 'At', 'Ts'])
    expect(members({ kind: 'group', value: 3 })).toEqual(['Sc', 'Y', 'La', 'Ac'])
    // Cerium and thorium are drawn under column 4 and have no group.
    expect(members({ kind: 'group', value: 4 })).toEqual(['Ti', 'Zr', 'Hf', 'Rf'])
    expect(members({ kind: 'group', value: 18 })).toContain('He')
  })

  it('highlights a period with the elements drawn below the main table', () => {
    const period6 = members({ kind: 'period', value: 6 })
    expect(period6.length).toBe(32)
    expect(period6).toContain('Ce')
    expect(period6).toContain('Lu')
    expect(members({ kind: 'period', value: 1 })).toEqual(['H', 'He'])
  })

  it('highlights a block', () => {
    const sizes = (['s', 'p', 'd', 'f'] as Block[]).map((value) => members({ kind: 'block', value }).length)
    expect(sizes).toEqual([14, 36, 40, 28])
    expect(members({ kind: 'block', value: 'f' })).not.toContain('La')
    expect(members({ kind: 'block', value: 's' })).toContain('He')
  })

  it("highlights a category by PubChem's name for it", () => {
    expect(members({ kind: 'category', value: 'Noble gas' })).toEqual(['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'Og'])
    expect(members({ kind: 'category', value: 'Nonmetal' })).toEqual(['H', 'C', 'N', 'O', 'P', 'S', 'Se'])
  })
})

describe('cellLabel', () => {
  it('gives the name, symbol, atomic number and category', () => {
    expect(cellLabel(element('F'), null, false)).toBe('Fluorine, F, atomic number 9, halogen')
    expect(cellLabel(element('Ce'), null, false)).toBe('Cerium, Ce, atomic number 58, lanthanide')
  })

  it('adds the value of the shown property', () => {
    expect(cellLabel(element('F'), 'electronegativity', false)).toBe('Fluorine, F, atomic number 9, halogen, electronegativity 3.98')
    expect(cellLabel(element('Ca'), 'electronegativity', false)).toBe('Calcium, Ca, atomic number 20, alkaline earth metal, electronegativity 1')
  })

  it('gives a value its unit', () => {
    expect(cellLabel(element('F'), 'covalentRadius', false)).toBe('Fluorine, F, atomic number 9, halogen, covalent radius 57 pm')
    expect(cellLabel(element('H'), 'ionizationEnergy', false)).toBe('Hydrogen, H, atomic number 1, other nonmetal, first ionization energy 13.598434599702 eV')
    expect(cellLabel(element('Os'), 'density', false)).toBe('Osmium, Os, atomic number 76, transition metal, density 22.57 g/cm³')
    expect(cellLabel(element('C'), 'meltingPoint', false)).toBe('Carbon, C, atomic number 6, other nonmetal, melting point 3823 K')
  })

  it('says so when the shown property has no value', () => {
    expect(cellLabel(element('He'), 'electronegativity', false)).toBe(`Helium, He, atomic number 2, noble gas, electronegativity: ${NO_VALUE}`)
    expect(cellLabel(element('Og'), 'density', false)).toMatch(new RegExp(`, density: ${NO_VALUE}$`))
    expect(cellLabel(element('Es'), 'covalentRadius', false)).toMatch(new RegExp(`, covalent radius: ${NO_VALUE}$`))
  })

  it('ends ", highlighted" for a highlighted cell', () => {
    expect(cellLabel(element('F'), null, true)).toBe('Fluorine, F, atomic number 9, halogen, highlighted')
    expect(cellLabel(element('F'), 'electronegativity', true)).toBe('Fluorine, F, atomic number 9, halogen, electronegativity 3.98, highlighted')
    expect(cellLabel(element('He'), 'electronegativity', true)).toBe(`Helium, He, atomic number 2, noble gas, electronegativity: ${NO_VALUE}, highlighted`)
  })

  it('reads PubChem\'s "Nonmetal" as "other nonmetal"', () => {
    expect(cellLabel(element('O'), null, false)).toBe('Oxygen, O, atomic number 8, other nonmetal')
    for (const e of periodicTable) expect(cellLabel(e, null, false)).not.toMatch(/, nonmetal/i)
  })
})

describe('highlightStatus', () => {
  it('says nothing when no highlight is set', () => {
    expect(highlightStatus(null)).toBe('')
  })

  it('names the set and its size, and lists the members of a set of 8 or fewer', () => {
    expect(highlightStatus({ kind: 'group', value: 17 })).toBe('Highlighted: group 17, halogens, 6 elements: fluorine, chlorine, bromine, iodine, astatine and tennessine.')
    expect(highlightStatus({ kind: 'group', value: 3 })).toBe('Highlighted: group 3, 4 elements: scandium, yttrium, lanthanum and actinium.')
    expect(highlightStatus({ kind: 'group', value: 1 })).toBe(
      'Highlighted: group 1, hydrogen and the alkali metals, 7 elements: hydrogen, lithium, sodium, potassium, rubidium, cesium and francium.',
    )
    expect(highlightStatus({ kind: 'period', value: 1 })).toBe('Highlighted: period 1, 2 elements: hydrogen and helium.')
    expect(highlightStatus({ kind: 'period', value: 2 })).toBe('Highlighted: period 2, 8 elements: lithium, beryllium, boron, carbon, nitrogen, oxygen, fluorine and neon.')
    expect(highlightStatus({ kind: 'category', value: 'Nonmetal' })).toBe(
      'Highlighted: other nonmetals, 7 elements: hydrogen, carbon, nitrogen, oxygen, phosphorus, sulfur and selenium.',
    )
  })

  it('gives only the name and size of a larger set', () => {
    expect(highlightStatus({ kind: 'period', value: 6 })).toBe('Highlighted: period 6, 32 elements.')
    expect(highlightStatus({ kind: 'period', value: 4 })).toBe('Highlighted: period 4, 18 elements.')
    expect(highlightStatus({ kind: 'block', value: 'f' })).toBe('Highlighted: f block, 28 elements.')
    expect(highlightStatus({ kind: 'block', value: 's' })).toBe('Highlighted: s block, 14 elements.')
    expect(highlightStatus({ kind: 'category', value: 'Transition metal' })).toBe('Highlighted: transition metals, 38 elements.')
  })
})

describe('the highlight choices', () => {
  const all = HIGHLIGHT_CHOICES.flatMap((group) => group.choices)

  it('are four sets of options: 18 groups, 7 periods, 4 blocks and the 10 families', () => {
    expect(HIGHLIGHT_CHOICES.map((group) => [group.label, group.choices.length])).toEqual([
      ['Group', 18],
      ['Period', 7],
      ['Block', 4],
      ['Chemical family', 10],
    ])
  })

  it('label a group with its family name where it has one', () => {
    const labels = HIGHLIGHT_CHOICES[0]!.choices.map((choice) => choice.label)
    expect(labels[0]).toBe(`Group 1: ${describeGroup(1).name}`)
    expect(labels[2]).toBe('Group 3')
    expect(labels[16]).toBe('Group 17: Halogens')
    expect(HIGHLIGHT_CHOICES[2]!.choices.map((choice) => choice.label)).toEqual(['s block', 'p block', 'd block', 'f block'])
    expect(HIGHLIGHT_CHOICES[3]!.choices.map((choice) => choice.label)).toEqual(CATEGORIES.map((c) => c.family))
  })

  it('each have their own key, which finds the choice again, and each highlight at least one element', () => {
    const keys = all.map((choice) => highlightKey(choice.highlight))
    expect(new Set(keys).size).toBe(39)
    expect(keys).not.toContain('')
    expect(highlightKey(null)).toBe('')
    expect(highlightKey({ kind: 'group', value: 17 })).toBe('group:17')
    for (const choice of all) expect(periodicTable.some((e) => isHighlighted(e, choice.highlight))).toBe(true)
  })
})
