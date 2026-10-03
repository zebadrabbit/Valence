import { describe, expect, it } from 'vitest'
import { registry } from '@/chem-data/registry'
import { ELECTRON_RADIUS, bohrLayout } from './bohrLayout'

const shellsOf = (symbol: string) => registry.elements.find((e) => e.symbol === symbol)!.shells.value

describe('bohrLayout', () => {
  it('draws one ring per shell with that shell\'s electrons on it', () => {
    for (const [symbol, counts] of [['H', [1]], ['C', [2, 4]], ['Cl', [2, 8, 7]], ['Xe', [2, 8, 18, 18, 8]]] as const) {
      expect(shellsOf(symbol)).toEqual(counts)
      expect(bohrLayout(shellsOf(symbol)).rings.map((ring) => ring.electrons.length)).toEqual(counts)
    }
  })

  it('puts every electron on its ring, the first at the top', () => {
    const { rings } = bohrLayout([2, 8, 7])
    for (const ring of rings) {
      for (const [x, y] of ring.electrons) expect(Math.hypot(x, y)).toBeCloseTo(ring.radius, 9)
      expect(ring.electrons[0]![0]).toBeCloseTo(0, 9)
      expect(ring.electrons[0]![1]).toBeCloseTo(-ring.radius, 9)
    }
  })

  it('keeps the rings outside the nucleus, in order, and inside the square', () => {
    const { size, nucleus, rings } = bohrLayout([2, 8, 18, 18, 8])
    const radii = rings.map((ring) => ring.radius)
    expect(radii[0]).toBeGreaterThan(nucleus + ELECTRON_RADIUS)
    expect([...radii].sort((a, b) => a - b)).toEqual(radii)
    expect(radii.at(-1)! + ELECTRON_RADIUS).toBeLessThan(size / 2)
  })

  it('leaves room between the 18 electrons of a full third shell', () => {
    const [first, second] = bohrLayout([2, 8, 18]).rings[2]!.electrons
    expect(Math.hypot(first![0] - second![0], first![1] - second![1])).toBeGreaterThan(3 * ELECTRON_RADIUS)
  })
})
