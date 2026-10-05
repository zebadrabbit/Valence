import { describe, expect, it } from 'vitest'
import { followsFromNotebook, parseDeviation, parseMolarity, parseReading, percentError, summarise, withinTolerance } from './entries'
import { PINNED_MODEL as m } from './pinnedModel'

describe('typed entries', () => {
  it('reads a burette reading typed to 0.01 mL, and nothing else', () => {
    expect(parseReading('12.34')).toBe(12340)
    expect(parseReading('0.00')).toBe(0)
    expect(parseReading(' 2.56 ')).toBe(2560)
    expect(parseReading('05.07')).toBe(5070)
    expect(parseReading('8.29')).toBe(8290)
    expect(parseReading('33.33')).toBe(33330)
    // 2.01 x 1000 is 2009.99... in floating point: the parser never multiplies a float.
    expect(parseReading('2.01')).toBe(2010)
    // Past the burette's last mark: whether a reading is in range is for `can` to say, not the parser.
    expect(parseReading('50.01')).toBe(50010)
    for (const bad of ['12.3', '12.345', '12', '24.', '.50', '12,34', '-1.00', '1e1', '24.37 mL', '124.37', '']) {
      expect(parseReading(bad), bad).toBeNull()
    }
  })

  it('reads every hundredth below 100 mL exactly', () => {
    for (let hundredths = 0; hundredths < 10000; hundredths++) {
      const text = `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, '0')}`
      expect(parseReading(text), text).toBe(hundredths * 10)
    }
  })

  it('reads a molarity typed to exactly four decimal places', () => {
    expect(parseMolarity('0.0949')).toBe(94900)
    expect(parseMolarity('.0949')).toBe(94900)
    expect(parseMolarity('0.1000')).toBe(100000)
    expect(parseMolarity('0.0000')).toBe(0)
    for (const bad of ['0.095', '0.09494', '0.094942', '1.0949', '0,0949', '9.49e-2', ' ', '']) {
      expect(parseMolarity(bad), bad).toBeNull()
    }
  })

  it('reads a relative deviation in parts per thousand', () => {
    expect(parseDeviation('0.47')).toBe(47)
    expect(parseDeviation('1.3')).toBe(130)
    expect(parseDeviation('2')).toBe(200)
    expect(parseDeviation('.5')).toBe(50)
    expect(parseDeviation('0')).toBe(0)
    for (const bad of ['1.333', '1.', '-1', '1,5', '']) expect(parseDeviation(bad), bad).toBeNull()
  })
})

describe('grading', () => {
  it('passes within 1.0% of 0.10000 M and fails outside it', () => {
    expect(withinTolerance(m, 100900, 10000)).toBe(true)
    expect(withinTolerance(m, 101100, 10000)).toBe(false)
    expect(withinTolerance(m, 99100, 10000)).toBe(true)
    expect(withinTolerance(m, 98900, 10000)).toBe(false)
  })

  it('includes the edge, exactly', () => {
    // +1.0% exactly: 0.101 / 0.1 - 1 is more than 0.01 in floating point, and would fail.
    expect(withinTolerance(m, 101000, 10000)).toBe(true)
    expect(withinTolerance(m, 99000, 10000)).toBe(true)
  })

  it('judges against 0.09502 M, where 1.0% is 0.00095020', () => {
    expect(withinTolerance(m, 95900, 9502)).toBe(true) // off by 0.00088
    expect(withinTolerance(m, 96000, 9502)).toBe(false) // 0.00098
    expect(withinTolerance(m, 94100, 9502)).toBe(true) // 0.00092
    expect(withinTolerance(m, 94000, 9502)).toBe(false) // 0.00102
    expect(withinTolerance(m, 95969, 9502)).toBe(true) // the edge is 95 970.2
    expect(withinTolerance(m, 95971, 9502)).toBe(false)
  })

  it('gives the signed percent error', () => {
    expect(percentError(94900, 9502)).toBeCloseTo(-0.126, 3)
    expect(percentError(96800, 9502)).toBeCloseTo(1.873, 3)
    expect(percentError(93000, 9502)).toBeCloseTo(-2.126, 3)
    expect(percentError(100600, 9960)).toBeCloseTo(1.004, 3)
  })
})

describe('a molarity that follows from the notebook', () => {
  it('accepts the rounded value and neither neighbour', () => {
    // 0.0976 M x 25.00 mL / 25.70 mL = 0.0949416
    expect(followsFromNotebook(m, 94900, 97600, 25700)).toBe(true)
    expect(followsFromNotebook(m, 95000, 97600, 25700)).toBe(false)
    expect(followsFromNotebook(m, 94800, 97600, 25700)).toBe(false)
  })

  it('refuses a value cut off and not rounded', () => {
    // 2.4400 / 25.67 = 0.0950526, which rounds to 0.0951 and cuts off to 0.0950.
    expect(95100 * 25670 - 97600 * 25000).toBe(1217000)
    expect(m.molarityRoundingE6 * 25670).toBe(1283500)
    expect(followsFromNotebook(m, 95100, 97600, 25670)).toBe(true)
    expect(95000 * 25670 - 97600 * 25000).toBe(-1350000)
    expect(followsFromNotebook(m, 95000, 97600, 25670)).toBe(false)
    expect(followsFromNotebook(m, 95200, 97600, 25670)).toBe(false)
  })

  it('accepts both neighbours at an exact tie', () => {
    // 0.0960 M and 25.60 mL: 2.4000 / 25.60 = 0.09375 exactly.
    expect(93800 * 25600 - 96000 * 25000).toBe(1280000)
    expect(m.molarityRoundingE6 * 25600).toBe(1280000)
    expect(followsFromNotebook(m, 93800, 96000, 25600)).toBe(true)
    expect(followsFromNotebook(m, 93700, 96000, 25600)).toBe(true)
    expect(93900 * 25600 - 96000 * 25000).toBe(3840000)
    expect(followsFromNotebook(m, 93900, 96000, 25600)).toBe(false)
    expect(followsFromNotebook(m, 93600, 96000, 25600)).toBe(false)
    // A tie a bottle here can give, 0.0972 M and 24.00 mL: 2.4300 / 24.00 = 0.10125 exactly.
    expect(101300 * 24000 - 97200 * 25000).toBe(1200000)
    expect(m.molarityRoundingE6 * 24000).toBe(1200000)
    expect(followsFromNotebook(m, 101300, 97200, 24000)).toBe(true)
    expect(followsFromNotebook(m, 101200, 97200, 24000)).toBe(true)
    expect(followsFromNotebook(m, 101400, 97200, 24000)).toBe(false)
    expect(followsFromNotebook(m, 101100, 97200, 24000)).toBe(false)
  })

  it('refuses any molarity for a titre of 0 or less', () => {
    expect(followsFromNotebook(m, 94900, 97600, 0)).toBe(false)
    expect(followsFromNotebook(m, 0, 97600, 0)).toBe(false)
    expect(followsFromNotebook(m, 94900, 97600, -25700)).toBe(false)
    expect(followsFromNotebook(m, -94900, 97600, -25700)).toBe(false)
    // With an HCl molarity of 0.0000 recorded, both sides of the comparison are 0: the titre decides.
    expect(followsFromNotebook(m, 94900, 0, 0)).toBe(false)
    expect(followsFromNotebook(m, 0, 0, 0)).toBe(false)
  })

  it('accepts one molarity for every label and titre, and two only at an exact tie', { timeout: 60_000 }, () => {
    let inBand = 0
    const ties: string[] = []
    for (let hclE4 = m.hclRangeE4[0]; hclE4 <= m.hclRangeE4[1]; hclE4++) {
      for (let titreUl = 10; titreUl <= m.buretteCapacityUl; titreUl += 10) {
        const acid = hclE4 * 100 * m.pipetteNominalUl
        const below = Math.floor(acid / titreUl / 100) * 100
        const accepted = [-200, -100, 0, 100, 200, 300]
          .map((step) => below + step)
          .filter((molarityE6) => followsFromNotebook(m, molarityE6, hclE4 * 100, titreUl))
        // Halfway between two four-decimal values: acid / titre is an odd number of 50s.
        const tie = acid % (50 * titreUl) === 0 && (acid / (50 * titreUl)) % 2 === 1
        if (accepted.length !== (tie ? 2 : 1)) throw new Error(`${hclE4} and ${titreUl}: ${accepted.join()}`)
        // The pairs whose result lies in 0.0950 to 0.1050 M, where the NaOH can be.
        if (acid < m.naohRangeE5[0] * 10 * titreUl || acid > m.naohRangeE5[1] * 10 * titreUl) continue
        inBand++
        if (tie) ties.push(`${hclE4} ${titreUl}`)
      }
    }
    expect(inBand).toBe(47868)
    expect(ties).toEqual([
      '869 22000',
      '891 22000',
      '913 22000',
      '924 24000',
      '948 24000',
      '972 24000',
      '996 24000',
      '1001 26000',
      '1027 26000',
    ])
  })
})

describe('summarise', () => {
  it('rounds the mean to the fourth decimal and works the deviation from that rounded mean', () => {
    // Mean 94 866.7, rounded 94 900; distances 0, 100, 0, their mean 33.3; 33.3 / 94 900 x 1000 = 0.351.
    expect(summarise([94900, 94800, 94900])).toEqual({ meanE6: 94900, deviationTenths: 4 })
    // Mean 98 733.3, rounded 98 700; distances 0, 200, 100, their mean 100; 100 / 98 700 x 1000 = 1.013.
    expect(summarise([98700, 98900, 98600])).toEqual({ meanE6: 98700, deviationTenths: 10 })
    // 133.3 / 100 000 x 1000 = 1.333.
    expect(summarise([100000, 100200, 99800])).toEqual({ meanE6: 100000, deviationTenths: 13 })
  })

  it('gives no deviation for three equal values', () => {
    expect(summarise([95000, 95000, 95000])).toEqual({ meanE6: 95000, deviationTenths: 0 })
  })

  it('rounds a mean that is exactly halfway up', () => {
    expect(summarise([94900, 94800]).meanE6).toBe(94900)
  })

  it('does not depend on the order of the values', () => {
    const orders = [
      [98700, 98900, 98600],
      [98700, 98600, 98900],
      [98900, 98700, 98600],
      [98900, 98600, 98700],
      [98600, 98700, 98900],
      [98600, 98900, 98700],
    ]
    for (const order of orders) expect(summarise(order), order.join()).toEqual({ meanE6: 98700, deviationTenths: 10 })
  })
})
