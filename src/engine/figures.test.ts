import { describe, expect, it } from 'vitest'
import { compare, cutFromAny, cutOffFrom, exact, formatFigures, formatSig3, fromAny, isSig3, parseFigures, parseSig3, point, products, quotients, reduced, roundsFrom, sizeOf, spanOf, superscript, taken, times, toNumber, toSig3, withinPercent, type Range, type Sig3 } from './figures'

// The numbers of three significant figures and the exact arithmetic that two labs' notebooks are judged with. The
// first five groups are the calorimetry lab's tests of them, which still run there against the names that lab
// hands on (src/engine/calorimetry/entries.test.ts); the rest are of what was lifted from its worksheet and of
// what the kinetics engine added.

const sig = (text: string): Sig3 => {
  const value = parseSig3(text)
  if (!value) throw new Error(`"${text}" is not three significant figures`)
  return value
}
/** A range that is one value, written as a decimal. */
const at = (text: string): Range => {
  const [whole, decimals = ''] = text.split('.')
  const value = exact(Number(whole + decimals), 10 ** decimals.length)
  return [value, value]
}
const same = (a: readonly [bigint, bigint], b: readonly [bigint, bigint]) => compare(a, b) === 0

describe('a number typed to three significant figures', () => {
  it.each([
    ['2760', 276, 1],
    ['836', 836, 0],
    ['55.8', 558, -1],
    ['-57.1', -571, -1],
    ['−57.1', -571, -1],
    ['+24.4', 244, -1],
    ['0.0500', 500, -4],
    ['.449', 449, -3],
    ['0.902', 902, -3],
    ['5.00', 500, -2],
    ['100', 100, 0],
    ['1000', 100, 1],
    ['27000', 270, 2],
    ['007.25', 725, -2],
  ])('reads "%s" as %i x 10^%i', (text, mantissa, exponent) => {
    expect(parseSig3(text)).toEqual({ mantissa, exponent })
  })

  it('is refused with fewer figures or more, and when it is not a plain number', () => {
    for (const text of ['56', '5.6', '0.05', '0.050', '2759', '2758.8', '55.80', '836.0', '836.', '0', '0.00', '', '.', '-', '1e3', '2,760', '55.8 kJ', 'about 56']) expect(parseSig3(text), text).toBeNull()
  })

  it('is written back as it was typed, without a plus sign or needless zeros in front', () => {
    for (const text of ['2760', '836', '55.8', '-57.1', '0.0500', '0.449', '5.00', '100', '27000']) expect(formatSig3(sig(text)), text).toBe(text)
    expect(formatSig3(sig('.449'))).toBe('0.449')
    expect(formatSig3(sig('+24.4'))).toBe('24.4')
  })

  it('is told from a value the parser could not have made', () => {
    expect(isSig3({ mantissa: 558, exponent: -1 })).toBe(true)
    for (const value of [null, 55.8, '55.8', { mantissa: 55, exponent: 0 }, { mantissa: 1000, exponent: 0 }, { mantissa: 558.5, exponent: -1 }, { mantissa: 558, exponent: 0.5 }, { mantissa: 558, exponent: 99 }, { mantissa: 558 }, { mantissa: 558, exponent: -1, extra: 1 }]) expect(isSig3(value), JSON.stringify(value)).toBe(false)
  })
})

describe('exact values', () => {
  it('are fractions of whole numbers that compare without rounding', () => {
    expect(compare(exact(1, 3), exact(2, 6))).toBe(0)
    expect(compare(exact(1, 3), exact(3333333, 10000000))).toBe(1)
    expect(compare(exact(-1, 2), exact(1, -3))).toBe(-1)
    expect(compare(times(exact(5403, 100), 418), exact(2258454, 100))).toBe(0)
    expect(compare(sizeOf(sig('-57.1')), exact(571, 10))).toBe(0)
    expect(compare(sizeOf(sig('0.0500')), exact(1, 20))).toBe(0)
    const [low, high] = spanOf(exact(3), exact(1, 2), exact(7, 2))
    expect([compare(low, exact(1, 2)), compare(high, exact(7, 2))]).toEqual([0, 0])
  })
})

describe('a correct rounding to three significant figures', () => {
  it('is the nearest value of three figures, and no other', () => {
    expect(roundsFrom(sig('2760'), at('2758.8'))).toBe(true)
    expect(roundsFrom(sig('2750'), at('2758.8'))).toBe(false)
    expect(roundsFrom(sig('2770'), at('2758.8'))).toBe(false)
    expect(roundsFrom(sig('55.2'), at('55.176'))).toBe(true)
    expect(roundsFrom(sig('55.1'), at('55.176'))).toBe(false)
    expect(roundsFrom(sig('0.0503'), at('0.0503473'))).toBe(true)
  })

  it('takes either neighbour at an exact tie, and only there', () => {
    expect(roundsFrom(sig('2760'), at('2765'))).toBe(true)
    expect(roundsFrom(sig('2770'), at('2765'))).toBe(true)
    expect(roundsFrom(sig('2760'), at('2765.0001'))).toBe(false)
    expect(roundsFrom(sig('2770'), at('2764.9999'))).toBe(false)
    expect(roundsFrom(sig('0.449'), at('0.4495'))).toBe(true)
    expect(roundsFrom(sig('0.450'), at('0.4495'))).toBe(true)
  })

  it('knows that the step below 100 x 10^e is ten times as fine as the step above it', () => {
    // 999.6 rounds to 1000, and 1000 is written "1000".
    expect(roundsFrom(sig('1000'), at('999.6'))).toBe(true)
    expect(roundsFrom(sig('1000'), at('999.5'))).toBe(true)
    expect(roundsFrom(sig('999'), at('999.5'))).toBe(true)
    // 996 does not round to 1000: it is 996.
    expect(roundsFrom(sig('1000'), at('996'))).toBe(false)
    expect(roundsFrom(sig('1000'), at('1004.9'))).toBe(true)
    expect(roundsFrom(sig('1000'), at('1005'))).toBe(true)
    expect(roundsFrom(sig('1010'), at('1005'))).toBe(true)
    expect(roundsFrom(sig('1000'), at('1005.1'))).toBe(false)
  })

  it('takes any value whose stretch meets a range, and none whose stretch misses it', () => {
    const range: Range = [exact(13769, 10), exact(137766, 100)] // 1376.9 to 1377.66
    expect(roundsFrom(sig('1380'), range)).toBe(true)
    expect(roundsFrom(sig('1370'), range)).toBe(false)
    // A range that straddles a tie takes both sides of it.
    const straddling: Range = [exact(13749, 10), exact(13751, 10)]
    expect(roundsFrom(sig('1370'), straddling)).toBe(true)
    expect(roundsFrom(sig('1380'), straddling)).toBe(true)
    expect(roundsFrom(sig('1390'), straddling)).toBe(false)
  })
})

describe('a value cut off where it should be rounded', () => {
  it('is the figures of the value with the rest dropped', () => {
    expect(cutOffFrom(sig('2750'), at('2758.8'))).toBe(true)
    expect(cutOffFrom(sig('55.1'), at('55.176'))).toBe(true)
    expect(cutOffFrom(sig('2740'), at('2758.8'))).toBe(false)
    expect(cutOffFrom(sig('2760'), at('2758.8'))).toBe(false)
    // A value that needs no rounding is not cut off, and the one below it is not its cut-off form.
    expect(cutOffFrom(sig('2750'), at('2760'))).toBe(false)
  })
})

describe('how a value above may be taken (the rule lifted from the calorimetry worksheet)', () => {
  it('takes a typed entry that is a correct rounding as anything between it and the unrounded value', () => {
    const [range, ...rest] = taken(sig('1170'), at('1170.4'))
    expect(rest).toEqual([])
    expect([same(range![0], exact(1170)), same(range![1], exact(11704, 10))]).toEqual([true, true])
  })

  it('takes a typed entry that is not a correct rounding as itself or as the unrounded value, and nothing between', () => {
    const ways = taken(sig('1200'), at('1170.4'))
    expect(ways.length).toBe(2)
    expect([same(ways[0]![0], exact(1200)), same(ways[0]![1], exact(1200)), same(ways[1]![0], exact(11704, 10))]).toEqual([true, true, true])
  })

  it('gives the range of each quotient and of each product, scaled', () => {
    const [q] = quotients([[exact(10), exact(12)]], [[exact(2), exact(4)]], exact(1, 10))
    expect([same(q![0], exact(1, 4)), same(q![1], exact(3, 5))]).toEqual([true, true])
    const [p] = products([[exact(10), exact(12)]], [[exact(2), exact(4)]], exact(1, 10))
    expect([same(p![0], exact(2)), same(p![1], exact(24, 5))]).toEqual([true, true])
    expect(quotients([point(exact(1)), point(exact(2))], [point(exact(3)), point(exact(4))]).length).toBe(4)
  })

  it('asks whether a value rounds from, or is cut off from, any of several ranges', () => {
    expect(fromAny(sig('55.2'), [at('40'), at('55.176')])).toBe(true)
    expect(fromAny(sig('55.2'), [at('40'), at('56')])).toBe(false)
    expect(cutFromAny(sig('55.1'), [at('40'), at('55.176')])).toBe(true)
    expect(cutFromAny(sig('55.2'), [at('40'), at('55.176')])).toBe(false)
  })
})

describe('a number typed with a power of ten', () => {
  it.each([
    ['3.22e-7', 322, -9],
    ['3.22E-7', 322, -9],
    ['3.22 x 10^-7', 322, -9],
    ['3.22 × 10^-7', 322, -9],
    ['3.22×10⁻⁷', 322, -9],
    ['3.22 × 10⁻⁷', 322, -9],
    ['3.22*10^-7', 322, -9],
    ['3.22x10-7', 322, -9],
    ['32.2e-8', 322, -9],
    ['0.322e-6', 322, -9],
    ['-6.01e3', -601, 1],
    ['−6.01 × 10³', -601, 1],
    ['6.01e+3', 601, 1],
    ['5.03e1', 503, -1],
    ['1.00e0', 100, -2],
  ])('reads "%s" as %i x 10^%i', (text, mantissa, exponent) => {
    expect(parseFigures(text)).toEqual({ mantissa, exponent })
  })

  it('reads a plain number as parseSig3 does', () => {
    for (const text of ['50.3', '0.00200', '-6010', '.449', '0.000000322', '2760']) expect(parseFigures(text), text).toEqual(parseSig3(text))
  })

  it('is refused without three figures in front, with a power that is no whole number, or with anything else in it', () => {
    for (const text of ['3.2e-7', '3.220e-7', '3e-7', 'e-7', '3.22e', '3.22e-7.5', '3.22e-123', '3.22 x 10^', '3.22 x 11^-7', '3.22e-7 M/s', '3.22 e -7 s', '', '10^-7', '3.22ee-7', '3.22e-40']) expect(parseFigures(text), text).toBeNull()
  })

  it('is written plainly where that is short, and with a power of ten where it would be a row of zeros', () => {
    expect(formatFigures(sig('50.3'))).toBe('50.3')
    expect(formatFigures(sig('0.00200'))).toBe('0.00200')
    expect(formatFigures(sig('0.0200'))).toBe('0.0200')
    expect(formatFigures(sig('-6010'))).toBe('-6010')
    expect(formatFigures(sig('27000'))).toBe('27000')
    expect(formatFigures({ mantissa: 322, exponent: -9 })).toBe('3.22 × 10⁻⁷')
    expect(formatFigures({ mantissa: 333, exponent: -7 })).toBe('3.33 × 10⁻⁵')
    expect(formatFigures({ mantissa: 100, exponent: -6 })).toBe('1.00 × 10⁻⁴')
    expect(formatFigures({ mantissa: -601, exponent: 3 })).toBe('-6.01 × 10⁵')
    expect([superscript(-7), superscript(12), superscript(0)]).toEqual(['⁻⁷', '¹²', '⁰'])
  })

  it('reads back what it writes', () => {
    for (const value of [{ mantissa: 322, exponent: -9 }, { mantissa: 503, exponent: -1 }, { mantissa: -601, exponent: 3 }, { mantissa: 200, exponent: -5 }, { mantissa: 999, exponent: 6 }]) expect(parseFigures(formatFigures(value)), JSON.stringify(value)).toEqual(value)
  })
})

describe('an exact value written to three figures', () => {
  it('is rounded exactly, a half going away from zero, at any size', () => {
    expect(toSig3(exact(1, 30000))).toEqual({ mantissa: 333, exponent: -7 })
    expect(toSig3(exact(5026, 100))).toEqual({ mantissa: 503, exponent: -1 })
    expect(toSig3(exact(2, 1000))).toEqual({ mantissa: 200, exponent: -5 })
    expect(toSig3(exact(27585, 10))).toEqual({ mantissa: 276, exponent: 1 })
    expect(toSig3(exact(2765, 1))).toEqual({ mantissa: 277, exponent: 1 })
    expect(toSig3(exact(-2765, 1))).toEqual({ mantissa: -277, exponent: 1 })
    expect(toSig3(exact(9996, 10))).toEqual({ mantissa: 100, exponent: 1 })
    expect(toSig3(exact(99949, 100))).toEqual({ mantissa: 999, exponent: 0 })
    expect(toSig3(exact(1036, 10))).toEqual({ mantissa: 104, exponent: 0 })
    expect(toSig3(exact(0))).toBeNull()
  })

  it('is always a correct rounding of the value it was made from', () => {
    for (const [n, d] of [[1, 3], [2, 3], [1036, 10], [123456789, 1000], [7, 1300000], [999500, 1000], [999499, 1000]] as const) expect(roundsFrom(toSig3(exact(n, d))!, [exact(n, d), exact(n, d)]), `${n}/${d}`).toBe(true)
  })

  it('goes into lowest terms and to a double', () => {
    expect(reduced([12n, 18n])).toEqual([2n, 3n])
    expect(reduced([-12n, 18n])).toEqual([-2n, 3n])
    expect(reduced([0n, 7n])).toEqual([0n, 1n])
    expect(toNumber(exact(5026, 100))).toBe(50.26)
    expect(toNumber(reduced(times(exact(1, 3), 3)))).toBe(1)
  })
})

describe('a result held to a stored value', () => {
  it('is within so many percent of it, the edge included, on either side and with either sign', () => {
    expect(withinPercent(sig('50.0'), 50000, 1000, 5)).toBe(true)
    expect(withinPercent(sig('52.5'), 50000, 1000, 5)).toBe(true)
    expect(withinPercent(sig('52.6'), 50000, 1000, 5)).toBe(false)
    expect(withinPercent(sig('47.5'), 50000, 1000, 5)).toBe(true)
    expect(withinPercent(sig('47.4'), 50000, 1000, 5)).toBe(false)
    expect(withinPercent(sig('-50.0'), 50000, 1000, 5)).toBe(false)
    expect(withinPercent(sig('-57.1'), -57706, 1000, 5)).toBe(true)
  })
})
