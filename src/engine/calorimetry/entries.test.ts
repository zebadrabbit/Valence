import { describe, expect, it } from 'vitest'
import { compare, cutOffFrom, exact, formatSig3, isSig3, parseChange, parseSig3, parseTemperature, roundsFrom, sizeOf, spanOf, times, type Range, type Sig3 } from './entries'

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

describe('a temperature typed', () => {
  it('is read to 0.1 °C from its characters, in tenths', () => {
    expect(parseTemperature('21.4')).toBe(214)
    expect(parseTemperature(' 100.0 ')).toBe(1000)
    expect(parseTemperature('0.5')).toBe(5)
  })

  it('is refused without exactly one decimal, with a sign, or with anything else in it', () => {
    for (const text of ['21', '21.', '21.40', '.4', '-21.4', '+21.4', '21,4', '2e1', '21.4 °C', '', 'warm', '1000.0']) expect(parseTemperature(text), text).toBeNull()
  })
})

describe('a change in temperature typed', () => {
  it('is read with or without a sign', () => {
    expect(parseChange('6.8')).toBe(68)
    expect(parseChange('+6.8')).toBe(68)
    expect(parseChange('-5.3')).toBe(-53)
    expect(parseChange('−5.3')).toBe(-53)
    expect(parseChange('0.0')).toBe(0)
  })

  it('is refused without exactly one decimal', () => {
    for (const text of ['6', '6.80', '--6.8', '6.8-', '', '- 6.8']) expect(parseChange(text), text).toBeNull()
  })
})

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
