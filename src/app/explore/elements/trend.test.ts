import { describe, expect, it } from 'vitest'
import { NO_VALUE, periodicTable, TREND_NOTES, type TrendProperty } from '@/chem-data/periodic'
import type { PeriodicElement } from '@/chem-data/schema'
import { CARD_LABELS } from '@/chem-data/periodicCard'
import { cellValue, digitRoom, endNotes, LEAST_ROOM, quantityText, ROUNDED_NOTE, roundedInCells, TRENDS, trendNotes, trendScale, VALUE_INSETS } from './trend'

const element = (symbol: string): PeriodicElement => {
  const found = periodicTable.find((e) => e.symbol === symbol)
  if (!found) throw new Error(`no element ${symbol}`)
  return found
}
const PROPERTIES = Object.keys(TRENDS) as TrendProperty[]

describe('trendScale', () => {
  it('shades fluorine 1 and the lowest electronegativity 0, and gives helium no shade', () => {
    const scale = trendScale('electronegativity')
    expect(scale.shade(element('F'))).toBe(1)
    expect(scale.shade(element('Fr'))).toBe(0)
    expect(scale.shade(element('He'))).toBeNull()
    expect([scale.lowest.symbol, scale.highest.symbol]).toEqual(['Fr', 'F'])
  })

  it('leaves missing values out of the range', () => {
    const scale = trendScale('electronegativity')
    expect([scale.min.published, scale.max.published]).toEqual(['0.7', '3.98'])
    expect(scale.missing).toBe(23)
    for (const property of PROPERTIES) {
      const { min, max, missing } = trendScale(property)
      expect(min.value).toBeGreaterThan(0)
      expect(max.value).toBeGreaterThan(min.value)
      expect(missing).toBe(periodicTable.filter((e) => e[property] === undefined).length)
    }
  })

  it('runs the covalent radius scale between the smallest and largest of elements 1 to 96, with no shade for einsteinium', () => {
    const scale = trendScale('covalentRadius')
    const radii = periodicTable.slice(0, 96).map((e) => e.covalentRadius!.value)
    expect([scale.min.value, scale.max.value]).toEqual([Math.min(...radii), Math.max(...radii)])
    expect([scale.min.published, scale.max.published, scale.min.unit]).toEqual(['28', '260', 'pm'])
    expect(scale.shade(element('Es'))).toBeNull()
    expect(periodicTable.slice(96).map((e) => scale.shade(e))).toEqual(Array(22).fill(null))
  })

  it('is linear: the shade is the fraction of the way from the lowest value to the highest', () => {
    for (const property of PROPERTIES) {
      const scale = trendScale(property)
      for (const e of periodicTable) {
        const quantity = e[property]
        const shade = scale.shade(e)
        if (!quantity) {
          expect([property, e.symbol, shade]).toEqual([property, e.symbol, null])
          continue
        }
        expect(shade).toBeCloseTo((quantity.value - scale.min.value) / (scale.max.value - scale.min.value), 12)
        expect(shade).toBeGreaterThanOrEqual(0)
        expect(shade).toBeLessThanOrEqual(1)
      }
      expect([property, scale.shade(scale.lowest), scale.shade(scale.highest)]).toEqual([property, 0, 1])
    }
    // Halfway between 0.7 and 3.98 is 2.34; selenium's 2.55 is a little above it.
    expect(trendScale('electronegativity').shade(element('Se'))).toBeCloseTo((2.55 - 0.7) / 3.28, 12)
  })

  it('keeps every gas at the bottom of the linear density scale, below a thousandth of the way up', () => {
    const scale = trendScale('density')
    expect([scale.lowest.symbol, scale.highest.symbol]).toEqual(['H', 'Os'])
    const gases = periodicTable.filter((e) => e.standardState.state === 'Gas' && e.density)
    expect(gases.length).toBe(11)
    for (const gas of gases) expect(scale.shade(gas)).toBeLessThan(0.001)
    expect(scale.shade(element('Li'))).toBeGreaterThan(0.02)
  })

  it('runs the melting point scale from helium to carbon', () => {
    const scale = trendScale('meltingPoint')
    expect([scale.lowest.symbol, scale.min.published, scale.highest.symbol, scale.max.published]).toEqual(['He', '0.95', 'C', '3823'])
  })
})

describe('quantityText', () => {
  it("prints a value in its source's digits, with its unit where it has one", () => {
    expect(quantityText(element('F').electronegativity)).toBe('3.98')
    expect(quantityText(element('Ca').electronegativity)).toBe('1')
    expect(quantityText(element('F').covalentRadius)).toBe('57 pm')
    expect(quantityText(element('H').ionizationEnergy)).toBe('13.598434599702 eV')
    expect(quantityText(element('H').density)).toBe('0.00008988 g/cm³')
    expect(quantityText(element('Al').meltingPoint)).toBe('933.437 K')
  })

  it('reads NO_VALUE for an absent value', () => {
    expect(quantityText(element('He').electronegativity)).toBe(NO_VALUE)
    expect(quantityText(element('Og').density)).toBe(NO_VALUE)
  })
})

describe('cellValue', () => {
  const digits = (text: string) => text.replace('.', '').length

  it('prints a value that fits as its source publishes it, trailing zeros and all', () => {
    expect(cellValue('3.98', 7)).toBe('3.98')
    expect(cellValue('1', 7)).toBe('1')
    expect(cellValue('1.0080', 5)).toBe('1.0080')
    expect(cellValue('9.322699', 7)).toBe('9.322699')
    expect(cellValue('13.598434599702', 14)).toBe('13.598434599702')
  })

  it('rounds a value that does not fit to the most decimal places that do', () => {
    expect(cellValue('13.598434599702', 13)).toBe('13.59843459970')
    expect(cellValue('13.598434599702', 8)).toBe('13.598435')
    expect(cellValue('13.598434599702', 7)).toBe('13.59843')
    expect(cellValue('6.1131549210', 7)).toBe('6.113155')
    expect(cellValue('11.2602880', 7)).toBe('11.26029')
    expect(cellValue('0.00008988', 7)).toBe('0.000090')
    expect(cellValue('0.0001785', 7)).toBe('0.000179')
    expect(cellValue('933.437', 4)).toBe('933.4')
    expect(cellValue('933.437', 3)).toBe('933')
  })

  it('rounds a half up, on the digits as published and not on a binary fraction', () => {
    expect(cellValue('0.125', 3)).toBe('0.13')
    expect(cellValue('2.5', 1)).toBe('3')
    // As a binary fraction 1.45 is a little under 1.45, and (1.45).toFixed(1) is 1.4.
    expect(cellValue('1.45', 2)).toBe('1.5')
    expect(cellValue('1.005', 3)).toBe('1.01')
    expect(cellValue('0.4', 0)).toBe('0.4')
    expect(cellValue('-0.754', 3)).toBe('-0.8')
  })

  it('gives up a decimal place when rounding carries into a new digit', () => {
    expect(cellValue('9.96', 2)).toBe('10')
    expect(cellValue('99.995', 4)).toBe('100.0')
    expect(cellValue('0.9996', 3)).toBe('1.00')
  })

  it('never rounds a value away to zero, and never cuts a whole number short', () => {
    expect(cellValue('0.00008988', 4)).toBe('0.0001')
    expect(cellValue('0.00008988', 1)).toBe('0.0001')
    expect(cellValue('3823', 3)).toBe('3823')
    expect(cellValue('3823.5', 3)).toBe('3824')
  })

  it('leaves alone a text that is not a plain decimal number', () => {
    expect(cellValue('1.5e-7', 2)).toBe('1.5e-7')
  })

  it('fits every value of every property in the least room a cell has, correctly rounded, with no digit the source does not publish', () => {
    for (const property of PROPERTIES) {
      for (const e of periodicTable) {
        const quantity = e[property]
        if (!quantity) continue
        const shown = cellValue(quantity.published, LEAST_ROOM)
        const where = [property, e.symbol, shown]
        expect([...where, digits(shown) <= LEAST_ROOM]).toEqual([...where, true])
        expect([...where, shown.length <= quantity.published.length]).toEqual([...where, true])
        expect([...where, Number(shown) > 0]).toEqual([...where, true])
        if (shown === quantity.published) continue
        // Within half a unit of the last place printed.
        const places = shown.split('.')[1]?.length ?? 0
        expect(Math.abs(Number(shown) - quantity.value)).toBeLessThanOrEqual(0.5 * 10 ** -places * (1 + 1e-6))
      }
    }
  })

  it('prints all 13 ionization energies and the density of hydrogen that a laptop screen used to cut short', () => {
    // At 1366 pixels a cell has room for eight digits; these have nine or more.
    const long = (property: TrendProperty) => periodicTable.filter((e) => e[property] && digits(e[property].published) > 8).map((e) => `${e.symbol} ${cellValue(e[property]!.published, 8)}`)
    expect(long('ionizationEnergy')).toEqual([
      'H 13.598435', 'He 24.587389', 'Li 5.3917150', 'C 11.260288', 'Na 5.1390770', 'S 10.360017', 'Ar 15.759612', 'K 4.3406637', 'Ca 6.1131549', 'Kr 13.999606', 'Sr 5.6948675', 'Xe 12.129844', 'Cs 3.8939057',
    ])
    expect(long('density')).toEqual(['H 0.0000899'])
  })
})

describe('digitRoom', () => {
  it('counts the whole digits that fit beside a decimal point', () => {
    // The smallest cell, 56 pixels wide: 50 inside its border and padding, 48 inside the border of the selected cell.
    expect(digitRoom(50, 6, 2)).toBe(8)
    expect(digitRoom(48, 6, 2)).toBe(7)
    expect(digitRoom(117, 8, 3)).toBe(14)
    expect(digitRoom(49.9, 6, 2)).toBe(7)
    expect(digitRoom(1, 6, 2)).toBe(0)
  })

  it('counts the digits of the selected cell for less than the space inside its border, so that they do not touch it', () => {
    const [cell, selected] = VALUE_INSETS
    // At 1366 pixels a cell is 58.1 wide and its digits 6: eight fit in a cell, and would fit the selected one
    // with nothing to spare (50 in 50.1). It prints seven, which leaves 3 pixels on each side.
    expect(digitRoom(58.1 - 2 * cell, 6, 2)).toBe(8)
    expect(digitRoom(58.1 - 2 * 4, 6, 2)).toBe(8)
    expect(digitRoom(58.1 - 2 * selected, 6, 2)).toBe(7)
    // The smallest cell, selected, still has the least room, with something to spare if the type is a little wider.
    expect(digitRoom(56 - 2 * selected, 6, 2)).toBe(LEAST_ROOM)
    expect(digitRoom(56 - 2 * selected, 6.2, 2)).toBe(LEAST_ROOM)
  })

  it('is the least room where the type has not been measured', () => {
    expect(digitRoom(50, 0, 0)).toBe(LEAST_ROOM)
    expect(digitRoom(0, NaN, NaN)).toBe(LEAST_ROOM)
  })
})

describe('roundedInCells', () => {
  it('is true of the properties with a value too long for the smallest cell, which the legend then says', () => {
    expect(PROPERTIES.filter(roundedInCells)).toEqual(['ionizationEnergy', 'density'])
    expect(ROUNDED_NOTE).toBe("A value too long for its cell is rounded in the cell. Each element's card gives it in full.")
  })
})

describe('trendNotes', () => {
  const texts = (property: TrendProperty) => trendNotes(property).map((note) => note.text)

  it('says of the melting point scale that neither end is an ordinary-pressure melting point', () => {
    const [helium, carbon, ...rest] = texts('meltingPoint')
    expect(helium).toBe('Lowest, helium: Helium becomes solid only under pressure. At ordinary pressure it stays liquid however far it is cooled.')
    expect(carbon).toMatch(/^Highest, carbon: At ordinary pressure carbon does not melt: it turns from solid straight to gas\./)
    expect(rest).toEqual([])
  })

  it("says of the electronegativity scale that its low end, francium's value, could not be traced", () => {
    const [francium, ...rest] = texts('electronegativity')
    expect(francium).toMatch(/^Lowest, francium: PubChem's francium page has no Pauling electronegativity line/)
    expect(rest).toEqual(TREND_NOTES.electronegativity.map((note) => note.text))
  })

  it('says of the density scale that its low end is a gas, and that the gases sit at the bottom', () => {
    const [hydrogen, gases, ...rest] = texts('density')
    expect(hydrogen).toMatch(/^Lowest, hydrogen: This is the density of hydrogen gas, H₂, at 0 °C and atmospheric pressure\./)
    expect(gases).toMatch(/^The 11 elements that are gases at room temperature have the lowest densities/)
    expect(rest).toEqual([])
  })

  it('says of the covalent radius scale that both its ends are radii the source gives with no uncertainty', () => {
    const note = "PubChem's page for this element gives this radius with no uncertainty, unlike its radii for 88 other elements. Treat it as an estimate."
    expect(texts('covalentRadius')).toEqual([`Lowest, helium: ${note}`, `Highest, francium: ${note}`])
    expect(trendNotes('covalentRadius').map((n) => n.sourceIds)).toEqual([['pubchem-element-pages'], ['pubchem-element-pages']])
  })

  it('has nothing to say of the scale whose ends carry no note', () => {
    expect(texts('ionizationEnergy')).toEqual([])
  })

  it('gives every note an end of a scale carries on that property, not only the first, and none from another row', () => {
    const carbon = element('C')
    expect(endNotes('Highest', carbon, 'meltingPoint')).toEqual([{ text: `Highest, carbon: ${carbon.notes!.find((n) => n.row === 'meltingPoint')!.text}`, sourceIds: ['pubchem-element-pages'] }])
    const twice: PeriodicElement = {
      ...carbon,
      notes: [
        { row: 'meltingPoint', text: 'One.', sourceId: 'a' },
        { row: 'density', text: 'Not this.', sourceId: 'b' },
        { row: 'meltingPoint', text: 'Two.', sourceId: 'c' },
      ],
    }
    expect(endNotes('Lowest', twice, 'meltingPoint')).toEqual([
      { text: 'Lowest, carbon: One.', sourceIds: ['a'] },
      { text: 'Lowest, carbon: Two.', sourceIds: ['c'] },
    ])
    expect(endNotes('Lowest', { ...carbon, notes: undefined }, 'meltingPoint')).toEqual([])
  })

  it('gives every note its sources, all of them known', () => {
    for (const property of PROPERTIES) {
      for (const note of trendNotes(property)) expect(note.sourceIds.length).toBeGreaterThan(0)
    }
    expect(trendNotes('meltingPoint').map((note) => note.sourceIds)).toEqual([['pubchem-element-pages'], ['pubchem-element-pages']])
  })
})

describe('the trend properties', () => {
  it('are the five of the spec, each with the name a cell is read with and the label a control shows', () => {
    expect(TRENDS).toEqual({
      electronegativity: { name: 'electronegativity', label: 'Electronegativity (Pauling scale)' },
      covalentRadius: { name: 'covalent radius', label: 'Covalent radius' },
      ionizationEnergy: { name: 'first ionization energy', label: 'First ionization energy' },
      meltingPoint: { name: 'melting point', label: 'Melting point' },
      density: { name: 'density', label: 'Density' },
    })
    expect(PROPERTIES).toEqual(Object.keys(TREND_NOTES))
  })

  it("are labelled as the element card labels the same rows", () => {
    for (const property of PROPERTIES) expect([property, TRENDS[property].label]).toEqual([property, CARD_LABELS[property]])
  })
})
