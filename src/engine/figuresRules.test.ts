import { describe, expect, it } from 'vitest'
import { cutOffToFigures, decimalsIn, decimalsOfSum, exact, exactOf, figuresIn, figuresOfProduct, formatDecimal, isFigures, judgeDecimals, judgeFigures, parseDecimal, parseSig3, point, roundsFrom, roundsToFigures, roundsToPlace, toDecimals, toFigures, toSig3, type Figures, type Range } from './figures'

// What the measurement and density lab added to the shared figures (spec 22.3): a number typed to any count of
// figures, and the two rounding rules. The tests of what the calorimetry and kinetics engines use are in
// figures.test.ts, which this file leaves as it was.

const typed = (text: string): Figures => {
  const value = parseDecimal(text)
  if (!value) throw new Error(`"${text}" is not a plain decimal`)
  return value
}
/** A range that is one value, written as a decimal or as a fraction "a/b" of two decimals. */
const at = (text: string): Range => {
  const [top, bottom = '1'] = text.split('/')
  return point(exact(exactOf(typed(top!)), exactOf(typed(bottom))))
}

describe('a number typed to any count of figures', () => {
  it.each([
    ['24.30', 2430, -2, 4, 2],
    ['78.4', 784, -1, 3, 1],
    ['0.804', 804, -3, 3, 3],
    ['.5', 5, -1, 1, 1],
    ['0.0500', 500, -4, 3, 4],
    ['-0.4', -4, -1, 1, 1],
    ['−0.4', -4, -1, 1, 1],
    ['+0.4', 4, -1, 1, 1],
    ['97', 97, 0, 2, 0],
    ['1200', 12, 2, 2, 0],
    ['100', 1, 2, 1, 0],
    ['100.0', 1000, -1, 4, 1],
    ['007.25', 725, -2, 3, 2],
    ['0', 0, 0, 0, 0],
    ['0.0', 0, -1, 0, 1],
    ['-0.0', 0, -1, 0, 1],
  ])('reads "%s" as %i x 10^%i, of %i figures and %i decimal places', (text, mantissa, exponent, figures, decimals) => {
    const value = typed(text)
    expect(value).toEqual({ mantissa, exponent })
    expect(Object.is(value.mantissa, -0)).toBe(false)
    expect([figuresIn(value), decimalsIn(value)]).toEqual([figures, decimals])
  })

  it('is refused when it is not a plain number, and when it has more than nine digits', () => {
    for (const text of ['', '.', '-', '5.', '1e3', '2,760', '24.30 g', 'about 24', '1 2', '1234567891', '0.1234567891']) expect(parseDecimal(text), text).toBeNull()
  })

  it('is written back as it was typed, without a plus sign or needless zeros in front', () => {
    for (const text of ['24.30', '78.4', '0.804', '0.0500', '-0.4', '97', '1200', '100.0', '0', '0.0', '0.05']) expect(formatDecimal(typed(text)), text).toBe(text)
    expect(formatDecimal(typed('.5'))).toBe('0.5')
    expect(formatDecimal(typed('+0.4'))).toBe('0.4')
    expect(formatDecimal(typed('007.25'))).toBe('7.25')
  })

  it('is told from a value the parser could not have made', () => {
    expect(isFigures({ mantissa: 2430, exponent: -2 })).toBe(true)
    expect(isFigures({ mantissa: 0, exponent: -1 })).toBe(true)
    for (const value of [null, 24.3, '24.30', { mantissa: 24.3, exponent: 0 }, { mantissa: 1e9, exponent: 0 }, { mantissa: -0, exponent: -1 }, { mantissa: 5, exponent: 0.5 }, { mantissa: 5, exponent: 13 }, { mantissa: 5 }, { mantissa: 5, exponent: 0, more: 1 }]) expect(isFigures(value), JSON.stringify(value)).toBe(false)
  })

  it('reads every number of three figures as the three-figure parser does, and rounds it by the same stretch', () => {
    for (const text of ['55.8', '0.0500', '.449', '-57.1', '5.00', '0.902', '1.00']) {
      expect(typed(text)).toEqual(parseSig3(text))
      for (const value of ['55.75', '55.85', '55.86', '0.04995', '0.05005', '0.4485', '0.9995', '0.9994', '1.005', '1.006', '57.05']) {
        const sig = parseSig3(text)!
        const size = { ...sig, mantissa: Math.abs(sig.mantissa) }
        expect(roundsToFigures(size, at(value)), `${text} from ${value}`).toBe(roundsFrom(size, at(value)))
      }
    }
  })
})

describe('rounding to significant figures', () => {
  it('takes a number that is a correct rounding at the figures it was typed to, either neighbour at an exact tie', () => {
    expect(roundsToFigures(typed('0.804'), at('20.34/25.3'))).toBe(true)
    expect(roundsToFigures(typed('0.80'), at('20.34/25.3'))).toBe(true)
    expect(roundsToFigures(typed('0.8040'), at('20.34/25.3'))).toBe(true)
    expect(roundsToFigures(typed('0.803'), at('20.34/25.3'))).toBe(false)
    expect(roundsToFigures(typed('97'), at('96.72'))).toBe(true)
    expect(roundsToFigures(typed('96'), at('96.72'))).toBe(false)
    for (const tie of ['2.5', '2.6']) expect(roundsToFigures(typed(tie), at('2.55')), tie).toBe(true)
    expect(roundsToFigures(typed('2.7'), at('2.55'))).toBe(false)
  })

  it('reaches only a twentieth of a unit down from a power of ten, where the next number down is ten times as fine', () => {
    expect(roundsToFigures(typed('1.00'), at('0.9995'))).toBe(true)
    expect(roundsToFigures(typed('1.00'), at('0.9994'))).toBe(false)
    expect(roundsToFigures(typed('1.00'), at('1.005'))).toBe(true)
    expect(roundsToFigures(typed('1.0'), at('0.995'))).toBe(true)
    expect(roundsToFigures(typed('1.0'), at('0.994'))).toBe(false)
    // "10" is a number of one figure: everything from 9.5 to 15 rounds to it.
    expect(roundsToFigures(typed('10'), at('9.5'))).toBe(true)
    expect(roundsToFigures(typed('10'), at('15'))).toBe(true)
    expect(roundsToFigures(typed('10'), at('9.4'))).toBe(false)
  })

  it('keeps the sign: a negative number rounds from negative values', () => {
    expect(roundsToFigures(typed('-0.4'), at('-0.44'))).toBe(true)
    expect(roundsToFigures(typed('-0.4'), at('0.44'))).toBe(false)
    expect(roundsToFigures(typed('0.4'), at('-0.44'))).toBe(false)
  })

  it('has no rounding to zero, and tells a number cut off from one rounded', () => {
    expect(roundsToFigures(typed('0.0'), at('0.01'))).toBe(false)
    expect(cutOffToFigures(typed('96'), at('96.72'))).toBe(true)
    expect(cutOffToFigures(typed('95'), at('96.72'))).toBe(false)
    expect(cutOffToFigures(typed('-7.1'), at('-7.18'))).toBe(true)
  })

  it('writes an exact value to any count of figures, as the three-figure writer does for three', () => {
    expect(toFigures(exact(2034, 2530), 3)).toEqual({ mantissa: 804, exponent: -3 })
    expect(toFigures(exact(9672, 100), 2)).toEqual({ mantissa: 97, exponent: 0 })
    expect(toFigures(exact(9672, 100), 4)).toEqual({ mantissa: 9672, exponent: -2 })
    expect(toFigures(exact(9996, 1000), 3)).toEqual({ mantissa: 100, exponent: -1 })
    expect(toFigures(exact(-255, 100), 2)).toEqual({ mantissa: -26, exponent: -1 })
    expect(toFigures(exact(0), 3)).toBeNull()
    for (const value of [exact(2034, 2530), exact(1, 3), exact(123456, 7), exact(-9995, 10)]) expect(toFigures(value, 3)).toEqual(toSig3(value))
  })
})

describe('rounding to a decimal place', () => {
  it('takes a number within half a unit of its last place, both ends included, on either side of a power of ten', () => {
    expect(roundsToPlace(typed('34.28'), at('34.28'))).toBe(true)
    expect(roundsToPlace(typed('34.3'), at('34.28'))).toBe(true)
    expect(roundsToPlace(typed('34.2'), at('34.28'))).toBe(false)
    expect(roundsToPlace(typed('10.0'), at('9.95'))).toBe(true)
    expect(roundsToPlace(typed('10.0'), at('9.94'))).toBe(false)
    expect(roundsToPlace(typed('30'), at('30.4'))).toBe(true)
    expect(roundsToPlace(typed('0.0'), at('0.04'))).toBe(true)
    expect(roundsToPlace(typed('-0.4'), at('-0.4'))).toBe(true)
  })

  it('writes an exact value to any count of decimal places', () => {
    expect(toDecimals(exact(3428, 100), 2)).toEqual({ mantissa: 3428, exponent: -2 })
    expect(toDecimals(exact(3428, 100), 1)).toEqual({ mantissa: 343, exponent: -1 })
    expect(toDecimals(exact(-4, 100), 1)).toEqual({ mantissa: 0, exponent: -1 })
    expect(toDecimals(exact(-6, 10), 1)).toEqual({ mantissa: -6, exponent: -1 })
    expect(toDecimals(exact(159, 10), 0)).toEqual({ mantissa: 16, exponent: 0 })
    expect(isFigures(toDecimals(exact(159, 10), 0))).toBe(true)
  })
})

describe('the two rounding rules (spec 22.3)', () => {
  it('gives a sum or a difference the decimal places of its least exact term', () => {
    expect(decimalsOfSum(typed('112.43'), typed('78.15'))).toBe(2)
    expect(decimalsOfSum(typed('150.0'), typed('0.507'))).toBe(1)
    expect(decimalsOfSum(typed('41.3'), typed('25'))).toBe(0)
  })

  it('gives a product or a quotient the significant figures of its factor with the fewest', () => {
    expect(figuresOfProduct(typed('20.34'), typed('25.3'))).toBe(3)
    expect(figuresOfProduct(typed('15.6'), typed('6.2'))).toBe(2)
    expect(figuresOfProduct(typed('15.62'), typed('6.24'))).toBe(3)
  })

  it('says of a difference whether it is right, kept to too many decimal places or too few, or wrong', () => {
    const value = at('34.28')
    expect(judgeDecimals(typed('34.28'), value, 2)).toBe('right')
    expect(judgeDecimals(typed('34.280'), value, 2)).toBe('too-many')
    expect(judgeDecimals(typed('34.3'), value, 2)).toBe('too-few')
    expect(judgeDecimals(typed('34'), value, 2)).toBe('too-few')
    expect(judgeDecimals(typed('34.29'), value, 2)).toBe('wrong')
    expect(judgeDecimals(typed('34.4'), value, 2)).toBe('wrong')
    // 150.0 + 0.507 is given to one decimal place: 150.5.
    expect(judgeDecimals(typed('150.5'), at('150.507'), 1)).toBe('right')
    expect(judgeDecimals(typed('150.507'), at('150.507'), 1)).toBe('too-many')
    expect(judgeDecimals(typed('17.9'), at('17.96'), 1)).toBe('cut-off')
  })

  it('says of a quotient whether it is right, kept to too many figures or too few, cut off, or wrong', () => {
    const value = at('20.34/25.3') // 0.80395...
    expect(judgeFigures(typed('0.804'), value, 3)).toBe('right')
    expect(judgeFigures(typed('0.8040'), value, 3)).toBe('too-many')
    expect(judgeFigures(typed('0.80395'), value, 3)).toBe('too-many')
    expect(judgeFigures(typed('0.8039'), value, 3)).toBe('too-many')
    expect(judgeFigures(typed('0.80'), value, 3)).toBe('too-few')
    expect(judgeFigures(typed('0.8'), value, 3)).toBe('too-few')
    expect(judgeFigures(typed('0.803'), value, 3)).toBe('cut-off')
    expect(judgeFigures(typed('0.805'), value, 3)).toBe('wrong')
    expect(judgeFigures(typed('1.24'), value, 3)).toBe('wrong')
  })

  it('says of a product of a two-figure factor that three figures are too many, and of a round answer written without its zeros that it has too few', () => {
    expect(judgeFigures(typed('97'), at('96.72'), 2)).toBe('right')
    expect(judgeFigures(typed('96.7'), at('96.72'), 2)).toBe('too-many')
    expect(judgeFigures(typed('96.72'), at('96.72'), 2)).toBe('too-many')
    expect(judgeFigures(typed('100'), at('96.72'), 2)).toBe('too-few')
    expect(judgeFigures(typed('20.0'), at('40.00/2.00'), 3)).toBe('right')
    expect(judgeFigures(typed('20'), at('40.00/2.00'), 3)).toBe('too-few')
  })
})
