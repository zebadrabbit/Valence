import { describe, expect, it } from 'vitest'
import { NO_VALUE, periodicTable, TREND_NOTES, type TrendProperty } from '@/chem-data/periodic'
import type { PeriodicElement } from '@/chem-data/schema'
import { CARD_LABELS } from '@/chem-data/periodicCard'
import { endNotes, quantityText, TRENDS, trendNotes, trendScale } from './trend'

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
