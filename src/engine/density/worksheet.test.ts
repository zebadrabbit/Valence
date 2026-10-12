import { describe, expect, it } from 'vitest'
import { PART_IDS } from '@/chem-data/density/data'
import { parseDecimal, type Figures } from '../figures'
import { PINNED_MODEL as m } from './pinnedModel'
import { dependents, FIELDS, kindOf, NO_ENTRIES, READ_FROM, verdictOf, WORKED_FROM, type Entries, type Field, type Shown, type Value } from './worksheet'

const typed = (text: string): Figures => parseDecimal(text)!
const level = (value: number, eye: 'above' | 'level' | 'below' = 'level') => ({ value, eye })
const verdict = (entries: Partial<Entries>, field: Field, shown: Shown = {}) => verdictOf(m, shown, { ...NO_ENTRIES, ...entries }, field)
const FOLLOWS = { follows: true, slip: null }
const not = (slip: string | null = null) => ({ follows: false, slip })

describe('the notebook (spec 22.3)', () => {
  it('has each part read its instruments first and then work out, and name the unknown last', () => {
    expect(FIELDS.reading.map(kindOf)).toEqual(['reading', 'reading', 'reading', 'reading', 'reading', 'reading', 'reading', 'product', 'product', 'difference'])
    expect(FIELDS.liquid.map(kindOf)).toEqual(['reading', 'reading', 'reading', 'difference', 'quotient', 'name'])
    expect(FIELDS.metal.map(kindOf)).toEqual(['reading', 'reading', 'reading', 'difference', 'quotient', 'name'])
    expect(new Set(PART_IDS.flatMap((part) => FIELDS[part])).size).toBe(22)
  })

  it('works every worked-out entry from entries of its own part that come before it', () => {
    for (const part of PART_IDS) {
      for (const field of FIELDS[part]) {
        expect(field in READ_FROM, field).toBe(!(field in WORKED_FROM))
        for (const from of WORKED_FROM[field] ?? []) expect(FIELDS[part].indexOf(from), `${field} from ${from}`).toBeLessThan(FIELDS[part].indexOf(field))
      }
    }
    expect(dependents('emptyMass')).toEqual(['liquidMass', 'liquidDensity', 'liquid'])
    expect(dependents('waterLevel')).toEqual(['metalVolume', 'metalDensity', 'metal'])
    expect(dependents('lengthCm')).toEqual(['areaCm'])
    expect(dependents('metal')).toEqual([])
  })
})

describe('a reading', () => {
  it('is right when it is near enough to what its instrument showed', () => {
    expect(verdict({ lengthCm: 156 }, 'lengthCm', { lengthCm: 15620 })).toEqual(FOLLOWS)
    expect(verdict({ lengthCm: 159 }, 'lengthCm', { lengthCm: 15620 })).toEqual(not())
    expect(verdict({ firstMass: 2430 }, 'firstMass', { firstMass: 2430 })).toEqual(FOLLOWS)
    expect(verdict({ firstMass: 2431 }, 'firstMass', { firstMass: 2430 })).toEqual(not())
    expect(verdict({ temperature: -4 }, 'temperature', { temperature: -400 })).toEqual(FOLLOWS)
  })

  it('of a level is right only with the eye level with it: from above or below it is that slip, whatever was typed', () => {
    expect(verdict({ liquidVolume: level(253) }, 'liquidVolume', { liquidVolume: 25300 })).toEqual(FOLLOWS)
    expect(verdict({ liquidVolume: level(258, 'above') }, 'liquidVolume', { liquidVolume: 25300 })).toEqual(not('eye-above'))
    expect(verdict({ liquidVolume: level(248, 'below') }, 'liquidVolume', { liquidVolume: 25300 })).toEqual(not('eye-below'))
    expect(verdict({ liquidVolume: level(253, 'above') }, 'liquidVolume', { liquidVolume: 25300 })).toEqual(not('eye-above'))
    expect(verdict({ liquidVolume: level(260) }, 'liquidVolume', { liquidVolume: 25300 })).toEqual(not())
  })

  it('has no verdict while it is empty or its instrument has shown nothing', () => {
    expect(verdict({}, 'lengthCm', { lengthCm: 15620 })).toBeNull()
    expect(verdict({ fullMass: 9000 }, 'fullMass', { fullMass: null })).toBeNull()
  })
})

describe('a difference: given to the decimal place of its least exact term', () => {
  const masses = { fullMass: 11243, emptyMass: 7815 } // 112.43 g - 78.15 g = 34.28 g

  it('follows as the exact difference, with the decimal places of the readings', () => {
    expect(verdict({ ...masses, liquidMass: typed('34.28') }, 'liquidMass')).toEqual(FOLLOWS)
    expect(verdict({ waterLevel: level(253), finalLevel: level(412), metalVolume: typed('15.9') }, 'metalVolume')).toEqual(FOLLOWS)
    expect(verdict({ waterLevel: level(253), finalLevel: level(453), metalVolume: typed('20.0') }, 'metalVolume')).toEqual(FOLLOWS)
  })

  it('is told when it has more decimal places than its terms, or fewer: the rule for sums and differences', () => {
    expect(verdict({ ...masses, liquidMass: typed('34.280') }, 'liquidMass')).toEqual(not('decimals-too-many'))
    expect(verdict({ ...masses, liquidMass: typed('34.3') }, 'liquidMass')).toEqual(not('decimals-too-few'))
    expect(verdict({ ...masses, liquidMass: typed('34') }, 'liquidMass')).toEqual(not('decimals-too-few'))
    expect(verdict({ waterLevel: level(253), finalLevel: level(453), metalVolume: typed('20') }, 'metalVolume')).toEqual(not('decimals-too-few'))
    expect(verdict({ waterLevel: level(253), finalLevel: level(412), metalVolume: typed('15.90') }, 'metalVolume')).toEqual(not('decimals-too-many'))
  })

  it('is told when it is taken the wrong way round, and has no slip when it is simply wrong', () => {
    expect(verdict({ ...masses, liquidMass: typed('-34.28') }, 'liquidMass')).toEqual(not('wrong-sign'))
    expect(verdict({ ...masses, liquidMass: typed('34.38') }, 'liquidMass')).toEqual(not())
    expect(verdict({ ...masses, liquidMass: typed('190.58') }, 'liquidMass')).toEqual(not())
  })

  it('gives how far the thermometer is off as its reading less the ice point, with its sign', () => {
    expect(verdict({ temperature: 4, thermometerOff: typed('0.4') }, 'thermometerOff')).toEqual(FOLLOWS)
    expect(verdict({ temperature: 4, thermometerOff: typed('+0.4') }, 'thermometerOff')).toEqual(FOLLOWS)
    expect(verdict({ temperature: -6, thermometerOff: typed('-0.6') }, 'thermometerOff')).toEqual(FOLLOWS)
    expect(verdict({ temperature: -6, thermometerOff: typed('0.6') }, 'thermometerOff')).toEqual(not('wrong-sign'))
    expect(verdict({ temperature: 4, thermometerOff: typed('0.40') }, 'thermometerOff')).toEqual(not('decimals-too-many'))
    expect(verdict({ temperature: 0, thermometerOff: typed('0.0') }, 'thermometerOff')).toEqual(FOLLOWS)
  })
})

describe('a product or a quotient: given to the significant figures of its factor with the fewest', () => {
  // The centimetre ruler: 15.6 cm x 6.2 cm = 96.72 cm², of two figures since 6.2 has two.
  const cm = { lengthCm: 156, widthCm: 62 }
  // The millimetre ruler: 15.62 cm x 6.24 cm = 97.4688 cm², of three figures since 6.24 has three.
  const mm = { lengthMm: 1562, widthMm: 624 }

  it('follows at the figures of the factor with the fewest: two for the centimetre ruler, three for the millimetre ruler', () => {
    expect(verdict({ ...cm, areaCm: typed('97') }, 'areaCm')).toEqual(FOLLOWS)
    expect(verdict({ ...mm, areaMm: typed('97.5') }, 'areaMm')).toEqual(FOLLOWS)
  })

  it('is told when it has more significant figures than that, or fewer: the rule for products and quotients', () => {
    expect(verdict({ ...cm, areaCm: typed('96.7') }, 'areaCm')).toEqual(not('figures-too-many'))
    expect(verdict({ ...cm, areaCm: typed('96.72') }, 'areaCm')).toEqual(not('figures-too-many'))
    expect(verdict({ ...cm, areaCm: typed('100') }, 'areaCm')).toEqual(not('figures-too-few'))
    expect(verdict({ ...mm, areaMm: typed('97') }, 'areaMm')).toEqual(not('figures-too-few'))
    expect(verdict({ ...mm, areaMm: typed('97.47') }, 'areaMm')).toEqual(not('figures-too-many'))
    expect(verdict({ ...mm, areaMm: typed('97.4688') }, 'areaMm')).toEqual(not('figures-too-many'))
  })

  it('is told when it is cut off where it should be rounded, and has no slip when it is simply wrong', () => {
    expect(verdict({ ...cm, areaCm: typed('96') }, 'areaCm')).toEqual(not('cut-off'))
    expect(verdict({ ...mm, areaMm: typed('97.4') }, 'areaMm')).toEqual(not('cut-off'))
    expect(verdict({ ...cm, areaCm: typed('95') }, 'areaCm')).toEqual(not())
    expect(verdict({ ...cm, areaCm: typed('21.8') }, 'areaCm')).toEqual(not())
  })

  it('takes either neighbour at an exact tie', () => {
    // 12.5 cm x 4.2 cm = 52.5 cm² exactly.
    for (const tie of ['52', '53']) expect(verdict({ lengthCm: 125, widthCm: 42, areaCm: typed(tie) }, 'areaCm'), tie).toEqual(FOLLOWS)
  })

  // 20.34 g / 25.3 mL = 0.80395... g/mL, of three figures since 25.3 has three.
  const liquid = { emptyMass: 7815, fullMass: 9849, liquidMass: typed('20.34'), liquidVolume: level(253) }

  it('holds a density to the learner’s own mass and volume, at three figures', () => {
    expect(verdict({ ...liquid, liquidDensity: typed('0.804') }, 'liquidDensity')).toEqual(FOLLOWS)
    expect(verdict({ ...liquid, liquidDensity: typed('.804') }, 'liquidDensity')).toEqual(FOLLOWS)
    expect(verdict({ ...liquid, liquidDensity: typed('0.8040') }, 'liquidDensity')).toEqual(not('figures-too-many'))
    expect(verdict({ ...liquid, liquidDensity: typed('0.80395') }, 'liquidDensity')).toEqual(not('figures-too-many'))
    expect(verdict({ ...liquid, liquidDensity: typed('0.80') }, 'liquidDensity')).toEqual(not('figures-too-few'))
    expect(verdict({ ...liquid, liquidDensity: typed('0.8') }, 'liquidDensity')).toEqual(not('figures-too-few'))
    expect(verdict({ ...liquid, liquidDensity: typed('0.803') }, 'liquidDensity')).toEqual(not('cut-off'))
    expect(verdict({ ...liquid, liquidDensity: typed('0.810') }, 'liquidDensity')).toEqual(not())
    expect(verdict({ ...liquid, liquidDensity: typed('-0.804') }, 'liquidDensity')).toEqual(not('wrong-sign'))
  })

  it('follows from a volume read off the mark too: the entries are the learner’s own', () => {
    // Read as 25.5 mL: 20.34 / 25.5 = 0.7976...
    expect(verdict({ ...liquid, liquidVolume: level(255), liquidDensity: typed('0.798') }, 'liquidDensity')).toEqual(FOLLOWS)
    expect(verdict({ ...liquid, liquidVolume: level(255), liquidDensity: typed('0.804') }, 'liquidDensity')).toEqual(not())
  })

  it('knows a density upside down, and one worked from the cylinder and the liquid together', () => {
    expect(verdict({ ...liquid, liquidDensity: typed('1.24') }, 'liquidDensity')).toEqual(not('upside-down')) // 25.3 / 20.34
    expect(verdict({ ...liquid, liquidDensity: typed('3.89') }, 'liquidDensity')).toEqual(not('cylinder-not-taken-off')) // 98.49 / 25.3
    expect(verdict({ ...liquid, liquidDensity: typed('3.893') }, 'liquidDensity')).toEqual(not('cylinder-not-taken-off'))
  })

  // 109.24 g / 15.3 mL = 7.1399... g/mL.
  const metal = { piecesMass: 10924, waterLevel: level(253), finalLevel: level(406), metalVolume: typed('15.3') }

  it('holds the metal’s density to the mass over the rise, and knows the last level taken for the rise', () => {
    expect(verdict({ ...metal, metalDensity: typed('7.14') }, 'metalDensity')).toEqual(FOLLOWS)
    expect(verdict({ ...metal, metalDensity: typed('7.140') }, 'metalDensity')).toEqual(not('figures-too-many'))
    expect(verdict({ ...metal, metalDensity: typed('7.1') }, 'metalDensity')).toEqual(not('figures-too-few'))
    expect(verdict({ ...metal, metalDensity: typed('7.13') }, 'metalDensity')).toEqual(not('cut-off'))
    expect(verdict({ ...metal, metalDensity: typed('2.69') }, 'metalDensity')).toEqual(not('level-not-rise')) // 109.24 / 40.6
    expect(verdict({ ...metal, metalDensity: typed('0.140') }, 'metalDensity')).toEqual(not('upside-down'))
  })

  it('gives a rise of two figures a density of two: the rule is worked on the learner’s own numbers', () => {
    // A rise entered as 9.8 mL has two figures: 109.24 / 9.8 = 11.14..., so 11.
    const short = { ...metal, finalLevel: level(351), metalVolume: typed('9.8') }
    expect(verdict({ ...short, metalDensity: typed('11') }, 'metalDensity')).toEqual(FOLLOWS)
    expect(verdict({ ...short, metalDensity: typed('11.1') }, 'metalDensity')).toEqual(not('figures-too-many'))
  })

  it('has no density follow from a volume or a mass that is not above zero', () => {
    expect(verdict({ ...metal, metalVolume: typed('0.0'), metalDensity: typed('7.14') }, 'metalDensity')).toEqual(not())
    expect(verdict({ ...metal, metalVolume: typed('-15.3'), metalDensity: typed('7.14') }, 'metalDensity')).toEqual(not())
    expect(verdict({ ...liquid, liquidMass: typed('-20.34'), liquidDensity: typed('0.804') }, 'liquidDensity')).toEqual(not())
  })
})

describe('naming the unknown', () => {
  const named = (field: 'liquid' | 'metal', density: string, id: Value) => verdict(field === 'liquid' ? { liquidDensity: typed(density), liquid: id } : { metalDensity: typed(density), metal: id }, field)

  it('follows when it is the row of the table nearest the learner’s own density', () => {
    expect(named('liquid', '0.804', 'ethanol-95')).toEqual(FOLLOWS)
    expect(named('liquid', '0.812', 'ethanol-95')).toEqual(FOLLOWS)
    expect(named('liquid', '0.804', 'ethanol-50')).toEqual(not())
    expect(named('liquid', '1.14', 'nacl-20')).toEqual(FOLLOWS)
    expect(named('liquid', '1.10', 'nacl-10')).toEqual(FOLLOWS)
    expect(named('metal', '7.34', 'zinc')).toEqual(FOLLOWS)
    expect(named('metal', '7.60', 'iron')).toEqual(FOLLOWS)
    expect(named('metal', '2.69', 'aluminium')).toEqual(FOLLOWS)
    expect(named('metal', '8.9', 'copper')).toEqual(FOLLOWS)
    expect(named('metal', '8.9', 'iron')).toEqual(not())
  })

  it('takes either row at an exact tie, and no row that is not in the table', () => {
    // 1.11 is as far from 1.07 as from 1.15.
    for (const id of ['nacl-10', 'nacl-20']) expect(named('liquid', '1.11', id), id).toEqual(FOLLOWS)
    expect(named('liquid', '1.11', 'water')).toEqual(not())
    expect(named('metal', '7.14', 'tin')).toEqual(not())
    expect(named('metal', '7.14', 'ethanol-95')).toEqual(not())
  })

  it('has no verdict before there is a density', () => {
    expect(verdict({ metal: 'zinc' }, 'metal')).toBeNull()
    expect(verdict({}, 'metal')).toBeNull()
  })
})
