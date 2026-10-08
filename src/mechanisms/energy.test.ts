import { describe, expect, it } from 'vitest'
import { hclNahco3 as mechanism } from './data'
import { energyAt, energyCurves, overallEnergy } from './energy'
import { state } from './state'

const { g, h } = energyCurves(mechanism)

describe('the two curves of the energy panel (spec 9.2)', () => {
  it('free energy has one stretch for each step, each beginning where the last ended, down to −42.4 kJ/mol', () => {
    expect(g.map((s) => [s.stepIds.join('+'), s.range, Number(s.from.toFixed(3)), Number(s.to.toFixed(3)), s.basis])).toEqual([
      ['dissolving', [0.16, 0.32], 0, 2.325, 'cited'],
      ['proton-transfer', [0.32, 0.52], 2.325, -17.595, 'cited'],
      ['decomposition', [0.52, 0.76], -17.595, -34.014, 'derived'],
      ['gas-escapes', [0.76, 0.94], -34.014, -42.393, 'cited'],
    ])
  })

  it('enthalpy shows steps 2 and 3 as one stretch, since no separate enthalpy of carbonic acid is cited, up to +31.4 kJ/mol', () => {
    expect(h.map((s) => [s.stepIds.join('+'), s.range, Number(s.from.toFixed(3)), Number(s.to.toFixed(3)), s.basis])).toEqual([
      ['dissolving', [0.16, 0.32], 0, 18.7, 'cited'],
      ['proton-transfer+decomposition', [0.32, 0.76], 18.7, 11.06, 'cited'],
      ['gas-escapes', [0.76, 0.94], 11.06, 31.351, 'cited'],
    ])
    expect(h.every((s) => s.barrier === undefined)).toBe(true)
  })

  it('marks the barrier of step 2 as schematic and that of step 3 as derived, each over the move in which the bonds change', () => {
    expect(g.map((s) => s.barrier ?? null)).toEqual([
      null,
      { range: [0.42, 0.52], top: 0.47, height: 10, basis: 'schematic' },
      { range: [0.62, 0.76], top: 0.69, height: 66, basis: 'derived' },
      null,
    ])
    expect(mechanism.thermo.parameters.schematicBarrier.value).toBe(10)
  })
})

describe('the energy cursor', () => {
  it('is at zero until step 1 begins and at the totals once step 4 has ended', () => {
    for (const t of [0, 0.06, 0.1, 0.16]) expect(energyAt(mechanism, t)).toEqual({ g: 0, h: 0 })
    for (const t of [0.94, 0.97, 1]) {
      expect(energyAt(mechanism, t).g).toBeCloseTo(overallEnergy(mechanism).deltaG, 9)
      expect(energyAt(mechanism, t).h).toBeCloseTo(overallEnergy(mechanism).deltaH, 9)
    }
  })

  it('is at each curve\'s level at every step boundary', () => {
    for (const stretch of g) {
      expect(energyAt(mechanism, stretch.range[0]).g).toBeCloseTo(stretch.from, 9)
      expect(energyAt(mechanism, stretch.range[1]).g).toBeCloseTo(stretch.to, 9)
    }
    for (const stretch of h) expect(energyAt(mechanism, stretch.range[1]).h).toBeCloseTo(stretch.to, 9)
  })

  it('climbs to the top of a barrier and comes down the other side: 66.0 kJ/mol above carbonic acid in step 3', () => {
    const [, , step3] = g
    expect(energyAt(mechanism, 0.69).g).toBeCloseTo(step3!.from + 66, 9)
    // Level while the water moves into place, before any bond changes.
    expect(energyAt(mechanism, 0.6).g).toBeCloseTo(step3!.from, 9)
    const values = Array.from({ length: 141 }, (_, i) => energyAt(mechanism, 0.62 + i / 1000).g)
    const top = values.indexOf(Math.max(...values))
    expect(top).toBe(70)
    expect(values.slice(0, top + 1)).toEqual([...values.slice(0, top + 1)].sort((a, b) => a - b))
    expect(values.slice(top)).toEqual([...values.slice(top)].sort((a, b) => b - a))
    expect(energyAt(mechanism, 0.47).g).toBeCloseTo(2.325 + 10, 9)
  })

  it('moves one way through a step with no barrier, and never jumps', () => {
    const along = (from: number, to: number, key: 'g' | 'h') => Array.from({ length: 51 }, (_, i) => energyAt(mechanism, from + ((to - from) * i) / 50)[key])
    expect(along(0.16, 0.32, 'g')).toEqual([...along(0.16, 0.32, 'g')].sort((a, b) => a - b))
    expect(along(0.76, 0.94, 'g')).toEqual([...along(0.76, 0.94, 'g')].sort((a, b) => b - a))
    expect(along(0.32, 0.76, 'h')).toEqual([...along(0.32, 0.76, 'h')].sort((a, b) => b - a))
    let previous = energyAt(mechanism, 0)
    for (let i = 1; i <= 5000; i++) {
      const now = energyAt(mechanism, i / 5000)
      expect(Math.abs(now.g - previous.g)).toBeLessThan(0.5)
      expect(Math.abs(now.h - previous.h)).toBeLessThan(0.5)
      previous = now
    }
  })

  it('is what the scene state carries', () => {
    for (const t of [0, 0.2, 0.47, 0.69, 0.9, 1]) expect(state(mechanism, t).energy).toEqual(energyAt(mechanism, t))
  })
})

describe('overallEnergy', () => {
  it('is the sum of the steps: +31.351 and −42.393 kJ/mol, the +31.4 and −42.4 of spec 9.2', () => {
    const { deltaH, deltaG } = overallEnergy(mechanism)
    expect(deltaH.toFixed(1)).toBe('31.4')
    expect(deltaG.toFixed(1)).toBe('-42.4')
  })
})
