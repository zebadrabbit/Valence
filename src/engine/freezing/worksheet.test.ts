import { describe, expect, it } from 'vitest'
import { formatGrams, formatKilograms, formatTemperature, parseFall, parseKilograms, parseSig3, parseTemperature } from './entries'
import { PINNED_MODEL as m } from './pinnedModel'
import { FIELDS, kindOf, NO_ENTRIES, parseEntry, verdictOf, withinPerMille, WORKED_FROM, type Bench, type Entries, type Field, type Shown } from './worksheet'

// The notebook (spec 23.2): how each entry is read from what is typed, and whether it follows from the learner's
// own numbers by the calorimetry lab's rounding rule. The bench and the readings here are made up for the tests.
const sig = (text: string) => parseSig3(text)!
const shown: Shown = { water: 12, solution: -148 }
const bench: Bench = { soluteCg: 412, solutionCg: 10646, soluteMolarMassE2: null }
const verdict = (part: 'unknown' | 'particles', entries: Partial<Entries>, field: Field, b: Bench = bench) => verdictOf(m, part, b, shown, { ...NO_ENTRIES, ...entries }, field)
// Part 2 on the bench above: a fall of 1.60 °C, 0.10234 kg of water.
const unknown: Partial<Entries> = { water: 12, solution: -148, fall: 160, waterKg: 10234, molality: sig('0.860'), moles: sig('0.0880'), molarMass: sig('46.8'), liquid: 'ethanol' }
// Part 3 with 2.90 g of sodium chloride on the same readings: 0.10356 kg of water.
const salt: Bench = { soluteCg: 290, solutionCg: 10646, soluteMolarMassE2: 5844 }
const particles: Partial<Entries> = { water: 12, solution: -148, fall: 160, waterKg: 10356, moles: sig('0.0496'), molality: sig('0.479'), idealFall: sig('0.891'), ratio: sig('1.80') }

describe('what is typed', () => {
  it('reads a temperature to a hundredth of a degree, with or without a sign, and nothing else', () => {
    expect(['0.12', '-1.48', '+0.05', '−1.48', ' 12.30 ', '-0.00'].map(parseTemperature)).toEqual([12, -148, 5, -148, 1230, 0])
    expect(Object.is(parseTemperature('-0.00'), -0)).toBe(false)
    expect(['1.5', '1.480', '.48', '-1', '1,48', 'abc', '', '100.00'].map(parseTemperature)).toEqual([null, null, null, null, null, null, null, null])
    expect(parseFall('-1.60')).toBe(-160)
  })

  it('reads a mass of water in kilograms with five decimals, every figure the balance gave, and nothing else', () => {
    expect(['0.10234', '.09876', '1.00000', ' 0.10234 '].map(parseKilograms)).toEqual([10234, 9876, 100000, 10234])
    expect(['0.1023', '0.102340', '102.34', '0.102', '-0.10234', '10.00000'].map(parseKilograms)).toEqual([null, null, null, null, null, null])
  })

  it('writes a temperature, a mass in grams and a mass in kilograms as they are typed, so that each reads back as itself', () => {
    for (const hundredths of [0, 5, -5, 12, -148, 240, -1999, 1230]) expect(parseTemperature(formatTemperature(hundredths))).toBe(hundredths)
    expect([formatTemperature(-148), formatTemperature(5), formatTemperature(-5), formatGrams(412), formatGrams(10307)]).toEqual(['-1.48', '0.05', '-0.05', '4.12', '103.07'])
    for (const cg of [10234, 9876, 100000, 5]) expect(parseKilograms(formatKilograms(cg))).toBe(cg)
    expect(formatKilograms(9876)).toBe('0.09876')
  })

  it('reads each field as its kind: a temperature, kilograms, three significant figures, or a choice', () => {
    expect(Object.fromEntries((['water', 'solution', 'fall', 'waterKg', 'molality', 'moles', 'molarMass', 'liquid', 'idealFall', 'ratio'] as const).map((field) => [field, kindOf(field)]))).toEqual({ water: 'temperature', solution: 'temperature', fall: 'temperature', waterKg: 'kilograms', molality: 'figures', moles: 'figures', molarMass: 'figures', liquid: 'choice', idealFall: 'figures', ratio: 'figures' })
    expect(parseEntry('water', '-0.16')).toBe(-16)
    expect(parseEntry('waterKg', '0.10234')).toBe(10234)
    expect(parseEntry('molarMass', '58.1')).toEqual({ mantissa: 581, exponent: -1 })
    expect(parseEntry('ratio', '1.9')).toBeNull()
    expect(parseEntry('liquid', 'acetone')).toBe('acetone')
    expect(parseEntry('liquid', '')).toBeNull()
  })
})

describe('the parts\' entries', () => {
  it('are in the order they are worked out, and each worked-out number names the entries it is worked from', () => {
    expect(FIELDS).toEqual({
      water: ['water'],
      unknown: ['water', 'solution', 'fall', 'waterKg', 'molality', 'moles', 'molarMass', 'liquid'],
      particles: ['water', 'solution', 'fall', 'waterKg', 'moles', 'molality', 'idealFall', 'ratio'],
    })
    for (const part of ['unknown', 'particles'] as const) {
      for (const [field, from] of Object.entries(WORKED_FROM[part])) for (const above of from!) expect(FIELDS[part].indexOf(above), `${part} ${field}`).toBeLessThan(FIELDS[part].indexOf(field as Field))
    }
  })
})

describe('the two temperatures, their difference and the mass of water', () => {
  it("are the logger's own readings, to the hundredth: one a hundredth off does not follow", () => {
    expect(verdict('unknown', { water: 12 }, 'water')).toEqual({ follows: true, slip: null })
    for (const off of [11, 13, -12]) expect(verdict('unknown', { water: off }, 'water')?.follows).toBe(false)
    expect(verdict('unknown', { water: 12, solution: -148 }, 'solution')?.follows).toBe(true)
    for (const off of [-147, -149, 148]) expect(verdict('unknown', { water: 12, solution: off }, 'solution')?.follows).toBe(false)
    expect(verdict('unknown', {}, 'water')).toBeNull()
  })

  it('take the fall as the exact difference of the two entered, as a size or with its own sign', () => {
    expect(verdict('unknown', { water: 12, solution: -148, fall: 160 }, 'fall')?.follows).toBe(true)
    expect(verdict('unknown', { water: 12, solution: -148, fall: -160 }, 'fall')?.follows).toBe(true)
    expect(verdict('unknown', { water: 12, solution: -148, fall: 136 }, 'fall')?.follows).toBe(false)
    expect(verdict('unknown', { water: 12, solution: -148, fall: 161 }, 'fall')?.follows).toBe(false)
    // A rise entered as a fall has the wrong sign; the difference is taken from the learner's own two entries, right or not.
    expect(verdict('unknown', { water: -148, solution: 12, fall: -160 }, 'fall')).toEqual({ follows: false, slip: 'wrong-sign' })
    expect(verdict('unknown', { water: 10, solution: -148, fall: 158 }, 'fall')?.follows).toBe(true)
  })

  it("take the mass of water as the solution's mass less the solute's, exactly, and name the solute left in", () => {
    expect(verdict('unknown', { waterKg: 10234 }, 'waterKg')).toEqual({ follows: true, slip: null })
    expect(verdict('unknown', { waterKg: 10646 }, 'waterKg')).toEqual({ follows: false, slip: 'solute-not-taken-off' })
    expect(verdict('unknown', { waterKg: 10233 }, 'waterKg')?.follows).toBe(false)
    expect(verdict('unknown', { waterKg: 10234 }, 'waterKg', { ...bench, solutionCg: null })).toBeNull()
  })
})

describe('part 2: the molality, the moles and the molar mass', () => {
  it('follow by the rounding rule: three figures, either neighbour at a tie, from the entry above as typed or as it stood unrounded', () => {
    // 1.60 / 1.86 = 0.86021...
    expect(verdict('unknown', unknown, 'molality')?.follows).toBe(true)
    for (const wrong of ['0.861', '0.859', '0.86', '8.60']) expect(verdict('unknown', { ...unknown, molality: parseSig3(wrong) }, 'molality')?.follows, wrong).not.toBe(true)
    // 0.860 x 0.10234 = 0.088012, and 0.86021... x 0.10234 = 0.088034: both give 0.0880.
    expect(verdict('unknown', unknown, 'moles')?.follows).toBe(true)
    // The mass of water is used with every figure: 0.860 x 0.102 = 0.08772 does not follow.
    expect(verdict('unknown', { ...unknown, moles: sig('0.0877') }, 'moles')?.follows).toBe(false)
    expect(verdict('unknown', { ...unknown, moles: sig('0.0885') }, 'moles')?.follows).toBe(false)
    // 4.12 / 0.0880 = 46.818, and 4.12 / 0.088034 = 46.80.
    expect(verdict('unknown', unknown, 'molarMass')?.follows).toBe(true)
    expect(verdict('unknown', { ...unknown, molarMass: sig('46.9') }, 'molarMass')?.follows).toBe(false)
  })

  it('take a value above that was typed wrong as it was typed: what follows from the learner\'s own number follows', () => {
    const off = { ...unknown, molality: sig('0.900') }
    expect(verdict('unknown', off, 'molality')?.follows).toBe(false)
    // 0.900 x 0.10234 = 0.0921.
    expect(verdict('unknown', { ...off, moles: sig('0.0921') }, 'moles')?.follows).toBe(true)
  })

  it('name a number cut off where it should be rounded, one with a minus sign, and a relation worked the wrong way up', () => {
    // 4.12 / 0.0880 = 46.818: cut off, 46.8 is right too, so take moles of 0.0879, where 4.12 / 0.0879 = 46.871.
    const entries = { ...unknown, moles: sig('0.0879') }
    expect(verdict('unknown', { ...entries, molarMass: sig('46.9') }, 'molarMass')?.follows).toBe(true)
    expect(verdict('unknown', { ...entries, molarMass: sig('46.8') }, 'molarMass')?.follows).toBe(true)
    expect(verdict('unknown', { ...unknown, molality: sig('0.861') }, 'molality')).toEqual({ follows: false, slip: null })
    expect(verdict('unknown', { ...unknown, moles: sig('0.0881'), molality: sig('0.861') }, 'moles')?.follows).toBe(true)
    expect(verdict('unknown', { ...unknown, molality: sig('-0.860') }, 'molality')).toEqual({ follows: false, slip: 'wrong-sign' })
    // 1.86 / 1.60 = 1.1625, and 0.0880 / 4.12 = 0.02136.
    expect(verdict('unknown', { ...unknown, molality: sig('1.16') }, 'molality')).toEqual({ follows: false, slip: 'upside-down' })
    expect(verdict('unknown', { ...unknown, molarMass: sig('0.0214') }, 'molarMass')).toEqual({ follows: false, slip: 'upside-down' })
    // 0.86021 cut off is 0.860, which is also its rounding; 1.59 / 1.86 = 0.85484 cut off is 0.854.
    expect(verdict('unknown', { water: 12, solution: -147, fall: 159, molality: sig('0.854') }, 'molality')).toEqual({ follows: false, slip: 'cut-off' })
  })

  it('name the liquid of the table whose molar mass is nearest the learner\'s own', () => {
    expect(verdict('unknown', unknown, 'liquid')).toEqual({ follows: true, slip: null })
    expect(verdict('unknown', { ...unknown, liquid: 'acetone' }, 'liquid')?.follows).toBe(false)
    // 59.09 is midway between 58.08 and 60.10: 59.0 is acetone's, 59.1 is 2-propanol's.
    expect(verdict('unknown', { ...unknown, molarMass: sig('59.0'), liquid: 'acetone' }, 'liquid')?.follows).toBe(true)
    expect(verdict('unknown', { ...unknown, molarMass: sig('59.0'), liquid: 'propan-2-ol' }, 'liquid')?.follows).toBe(false)
    expect(verdict('unknown', { ...unknown, molarMass: sig('59.1'), liquid: 'propan-2-ol' }, 'liquid')?.follows).toBe(true)
    expect(verdict('unknown', { ...unknown, liquid: 'water' }, 'liquid')?.follows).toBe(false)
  })

  it('are empty of a verdict until what they are worked from is entered, and follow from nothing where the fall or the water is nothing', () => {
    expect(verdict('unknown', { molality: sig('0.860') }, 'molality')).toBeNull()
    expect(verdict('unknown', { ...unknown, waterKg: null }, 'moles')).toBeNull()
    expect(verdict('unknown', { water: 12, solution: 12, fall: 0, molality: sig('0.860') }, 'molality')).toEqual({ follows: false, slip: null })
    expect(verdict('unknown', { ...unknown, waterKg: 0 }, 'moles')).toEqual({ follows: false, slip: null })
  })
})

describe('part 3: the moles, the molality, the fall of one particle and the ratio', () => {
  it('follow by the same rule, with the molar mass of the table taken in full or to three figures', () => {
    // 2.90 / 58.44 = 0.049624, and 2.90 / 58.4 = 0.049658: 0.0496 and 0.0497 are both a rounding of one of them.
    expect(verdict('particles', particles, 'moles', salt)?.follows).toBe(true)
    expect(verdict('particles', { ...particles, moles: sig('0.0497') }, 'moles', salt)?.follows).toBe(true)
    expect(verdict('particles', { ...particles, moles: sig('0.0498') }, 'moles', salt)?.follows).toBe(false)
    // 0.0496 / 0.10356 = 0.47895.
    expect(verdict('particles', particles, 'molality', salt)?.follows).toBe(true)
    expect(verdict('particles', { ...particles, molality: sig('0.481') }, 'molality', salt)?.follows).toBe(false)
    // 1.86 x 0.479 = 0.89094.
    expect(verdict('particles', particles, 'idealFall', salt)?.follows).toBe(true)
    expect(verdict('particles', { ...particles, idealFall: sig('0.893') }, 'idealFall', salt)?.follows).toBe(false)
    // 1.60 / 0.891 = 1.7957.
    expect(verdict('particles', particles, 'ratio', salt)?.follows).toBe(true)
    expect(verdict('particles', { ...particles, ratio: sig('1.82') }, 'ratio', salt)?.follows).toBe(false)
  })

  it('name the ratio worked the wrong way up, and need the solute\'s molar mass from the table', () => {
    // 0.891 / 1.60 = 0.5569.
    expect(verdict('particles', { ...particles, ratio: sig('0.557') }, 'ratio', salt)).toEqual({ follows: false, slip: 'upside-down' })
    expect(verdict('particles', particles, 'moles', bench)).toEqual({ follows: false, slip: null })
    expect(verdict('particles', { ...particles, molality: null }, 'idealFall', salt)).toBeNull()
  })
})

describe('the tolerance', () => {
  it('is in parts in a thousand of the stored figure, exact, the edge included', () => {
    // 1.5% of 58.08 is 0.8712: from 57.21 to 58.95.
    expect(['57.3', '58.1', '58.9'].map((text) => withinPerMille(sig(text), 5808, 100, 15))).toEqual([true, true, true])
    expect(['57.2', '59.0'].map((text) => withinPerMille(sig(text), 5808, 100, 15))).toEqual([false, false])
    // 3% of 2.00 is exactly 0.06: 1.94 and 2.06 are on the edge.
    expect(['1.94', '2.06', '1.93', '2.07'].map((text) => withinPerMille(sig(text), 200, 100, 30))).toEqual([true, true, false, false])
    expect(withinPerMille(sig('-1.00'), 100, 100, 30)).toBe(false)
  })
})
