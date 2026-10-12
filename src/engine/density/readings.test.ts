import { describe, expect, it } from 'vitest'
import { PINNED_MODEL as m } from './pinnedModel'
import { formatReading, isReading, nearEnough, parseReading, scaleView, seenLevel, type Instrument, type Position } from './readings'

describe('a typed reading (spec 22.2)', () => {
  it.each<[Instrument, string, number]>([
    ['ruler-cm', '15.6', 156],
    ['ruler-cm', '6.0', 60],
    ['ruler-mm', '15.62', 1562],
    ['ruler-mm', '6.20', 620],
    ['cylinder', '25.3', 253],
    ['cylinder', '40.0', 400],
    ['thermometer', '0.4', 4],
    ['thermometer', '-0.4', -4],
    ['thermometer', '−0.4', -4],
    ['thermometer', '+0.4', 4],
    ['thermometer', '0.0', 0],
    ['balance', '24.30', 2430],
    ['balance', '112.43', 11243],
  ])('on the %s, "%s" is the reading %i', (instrument, text, value) => {
    expect(parseReading(m, instrument, text)).toEqual({ value })
    expect(parseReading(m, instrument, formatReading(m, instrument, value))).toEqual({ value })
  })

  it('is refused with too few figures: one figure beyond the finest mark is part of the reading, and every figure of the balance, a final zero included', () => {
    for (const [instrument, text] of [['ruler-cm', '15'], ['ruler-cm', '6'], ['ruler-mm', '15.6'], ['ruler-mm', '6.2'], ['cylinder', '25'], ['cylinder', '40'], ['thermometer', '0'], ['thermometer', '-1'], ['balance', '24.3'], ['balance', '24'], ['balance', '112.4']] as const) {
      expect(parseReading(m, instrument, text), `${instrument} ${text}`).toEqual({ problem: 'too-few-figures' })
    }
  })

  it('is refused with too many figures: no instrument gives more than one figure beyond its finest mark', () => {
    for (const [instrument, text] of [['ruler-cm', '15.62'], ['ruler-mm', '15.625'], ['cylinder', '25.30'], ['cylinder', '25.34'], ['thermometer', '0.40'], ['balance', '24.300']] as const) {
      expect(parseReading(m, instrument, text), `${instrument} ${text}`).toEqual({ problem: 'too-many-figures' })
    }
  })

  it('is refused when it is not a number, and when it is off the scale', () => {
    for (const text of ['', 'abc', '25.3 mL', '2,5', '25.', '1e1']) expect(parseReading(m, 'cylinder', text), text).toEqual({ problem: 'not-a-number' })
    for (const [instrument, text] of [['cylinder', '50.1'], ['cylinder', '-0.1'], ['ruler-cm', '20.1'], ['ruler-mm', '-0.01'], ['thermometer', '-10.1'], ['thermometer', '110.1'], ['balance', '-0.01'], ['balance', '1000.00']] as const) {
      expect(parseReading(m, instrument, text), `${instrument} ${text}`).toEqual({ problem: 'off-the-scale' })
    }
    expect(isReading(m, 'cylinder', 253.5)).toBe(false)
    expect(isReading(m, 'thermometer', -0)).toBe(false)
  })

  it('is written with every figure', () => {
    expect(formatReading(m, 'ruler-cm', 60)).toBe('6.0')
    expect(formatReading(m, 'ruler-mm', 5)).toBe('0.05')
    expect(formatReading(m, 'balance', 2430)).toBe('24.30')
    expect(formatReading(m, 'thermometer', -4)).toBe('-0.4')
    expect(formatReading(m, 'thermometer', 0)).toBe('0.0')
  })
})

describe('a scale as it shows a value', () => {
  it('gives the two marks a level stands between, where it stands, and the stretch of the closer look', () => {
    expect(scaleView(m, 'cylinder', 25300)).toEqual({ instrument: 'cylinder', unit: 'mL', fromE3: 0, toE3: 50000, markE3: 1000, numberE3: 5000, atE3: 25300, lowerE3: 25000, upperE3: 26000, position: 'quarter', closeUp: { fromE3: 23000, toE3: 28000 } })
    expect(scaleView(m, 'ruler-mm', 15620)).toMatchObject({ lowerE3: 15600, upperE3: 15700, position: 'quarter', closeUp: { fromE3: 15400, toE3: 15900 } })
    expect(scaleView(m, 'ruler-cm', 15620)).toMatchObject({ lowerE3: 15000, upperE3: 16000, position: 'half' })
    expect(scaleView(m, 'thermometer', -400)).toMatchObject({ lowerE3: -1000, upperE3: 0, position: 'half' })
    expect(scaleView(m, 'thermometer', 700)).toMatchObject({ lowerE3: 0, upperE3: 1000, position: 'three-quarters' })
    expect(scaleView(m, 'cylinder', 500).closeUp).toEqual({ fromE3: 0, toE3: 3000 })
  })

  it.each<[number, Position]>([
    [0, 'on-lower'],
    [1, 'just-past'],
    [2, 'quarter'],
    [3, 'quarter'],
    [4, 'half'],
    [5, 'half'],
    [6, 'half'],
    [7, 'three-quarters'],
    [8, 'three-quarters'],
    [9, 'just-short'],
  ])('puts %i tenths of the way between two marks as "%s"', (tenths, position) => {
    expect(scaleView(m, 'cylinder', 25000 + tenths * 100).position).toBe(position)
    expect(scaleView(m, 'ruler-mm', 15600 + tenths * 10).position).toBe(position)
    expect(scaleView(m, 'thermometer', -1000 + tenths * 100).position).toBe(position)
  })

  it('puts an edge within a few hundredths of a centimetre mark on that mark, on the ruler marked in centimetres', () => {
    expect(scaleView(m, 'ruler-cm', 15970)).toMatchObject({ lowerE3: 15000, upperE3: 16000, position: 'on-upper' })
    expect(scaleView(m, 'ruler-cm', 15040)).toMatchObject({ lowerE3: 15000, position: 'on-lower' })
    expect(scaleView(m, 'ruler-cm', 15050).position).toBe('just-past')
  })
})

describe('the eye and the allowance', () => {
  it('shows a level higher on the scale from above and lower from below, by half a millilitre', () => {
    expect([seenLevel(m, 253, 'above'), seenLevel(m, 253, 'level'), seenLevel(m, 253, 'below')]).toEqual([258, 253, 248])
  })

  it('takes a reading within two of its last figure of what a scale shows, and a mass only as the balance shows it', () => {
    expect([251, 253, 255].map((value) => nearEnough(m, 'cylinder', value, 25300))).toEqual([true, true, true])
    expect([250, 256].map((value) => nearEnough(m, 'cylinder', value, 25300))).toEqual([false, false])
    // The edge is at 15.62 cm: a reading to a tenth may be anything from 15.42 to 15.82.
    expect([155, 156, 158, 154, 159].map((value) => nearEnough(m, 'ruler-cm', value, 15620))).toEqual([true, true, true, false, false])
    expect([1560, 1562, 1564, 1559, 1565].map((value) => nearEnough(m, 'ruler-mm', value, 15620))).toEqual([true, true, true, false, false])
    expect([-6, -4, -2, -1].map((value) => nearEnough(m, 'thermometer', value, -400))).toEqual([true, true, true, false])
    expect([2430, 2431, 2429].map((value) => nearEnough(m, 'balance', value, 2430))).toEqual([true, false, false])
  })

  it('never has a level read from above or below within the allowance of the true level', () => {
    for (let level = 150; level <= 480; level++) {
      for (const eye of ['above', 'below'] as const) {
        for (let off = -m.readingAllowance; off <= m.readingAllowance; off++) expect(nearEnough(m, 'cylinder', seenLevel(m, level, eye) + off, level * 100)).toBe(false)
      }
    }
  })
})
