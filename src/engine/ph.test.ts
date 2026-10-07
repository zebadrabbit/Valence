import { describe, expect, it } from 'vitest'
import { chargeImbalance, protonationFractions, solvePH, type Solution } from './ph'

// Constants pinned for this test (spec 7.4 check 1); the solver takes every one as an argument.
const KW = 1.0e-14
const acetic = (total: number) => ({ total, pKas: [4.756], chargeProtonated: 0 })
const phosphoric = { total: 0.1, pKas: [2.148, 7.198, 12.375], chargeProtonated: 0 }
const ammonium = { total: 0.1, pKas: [9.25], chargeProtonated: 1 }

const hcl = (molarity: number): Solution => ({ strongCharge: -molarity, acids: [] })
const aceticAcid: Solution = { strongCharge: 0, acids: [acetic(0.1)] }
// A weak acid with its salt is one species whose total is acid plus salt, with the salt's sodium as spectator charge.
const acetateBuffer: Solution = { strongCharge: 0.1, acids: [acetic(0.2)] }
const phosphoricAcid: Solution = { strongCharge: 0, acids: [phosphoric] }
const water: Solution = { strongCharge: 0, acids: [] }

describe('solvePH', () => {
  // Reference values from docs/research/phase-3/design/engine.md 5.2: each case solved on its own as a polynomial
  // in [H+], independently of this solver.
  it.each<[string, Solution, number]>([
    ['0.0100 M HCl', hcl(0.01), 2.0],
    ['1e-8 M HCl', hcl(1e-8), 6.978294],
    ['0.10 M acetic acid', aceticAcid, 2.880876],
    ['0.10 M acetic acid with 0.10 M sodium acetate', acetateBuffer, 4.756152],
    ['0.10 M H3PO4', phosphoricAcid, 1.631739],
    ['0.10 M NH4Cl', { strongCharge: -0.1, acids: [ammonium] }, 5.124978],
    ['0.10 M NH3', { strongCharge: 0, acids: [ammonium] }, 11.122104],
    ['pure water', water, 7.0],
  ])('%s', (_name, solution, expected) => {
    expect(Math.abs(solvePH(solution, KW) - expected)).toBeLessThan(1e-6)
  })

  it('gives the spec 7.4 values to two decimals', () => {
    const twoDecimals = [hcl(0.01), hcl(1e-8), aceticAcid, acetateBuffer, phosphoricAcid].map((s) => solvePH(s, KW).toFixed(2))
    expect(twoDecimals).toEqual(['2.00', '6.98', '2.88', '4.76', '1.63'])
  })

  it('takes Kw as an argument', () => {
    expect(solvePH(water, 1e-13).toFixed(4)).toBe('6.5000')
  })

  it('leaves no charge at the pH it returns, and the imbalance falls as pH rises', () => {
    const solution: Solution = { strongCharge: 0.03, acids: [acetic(0.1)] }
    const pH = solvePH(solution, KW)
    expect(Math.abs(chargeImbalance(solution, KW, pH))).toBeLessThan(1e-12)
    const around = [-2, -1, -0.01, 0.01, 1, 2].map((step) => chargeImbalance(solution, KW, pH + step))
    expect(around.slice(0, 3).every((q) => q > 0)).toBe(true)
    expect(around.slice(3).every((q) => q < 0)).toBe(true)
    expect([...around].sort((a, b) => b - a)).toEqual(around)
  })
})

describe('protonationFractions', () => {
  it('gives the share of each form, most protonated first, summing to 1', () => {
    const fractions = protonationFractions([9.05, 9.5], 1e-9)
    expect(fractions.map((x) => x.toFixed(4))).toEqual(['0.4602', '0.4101', '0.1297'])
    expect(fractions.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
  })

  it('is half and half for a one-step acid at pH = pKa', () => {
    const fractions = protonationFractions([4.756], Math.pow(10, -4.756))
    expect(fractions).toHaveLength(2)
    expect(fractions[0]).toBeCloseTo(0.5, 12)
    expect(fractions[1]).toBeCloseTo(0.5, 12)
  })
})
