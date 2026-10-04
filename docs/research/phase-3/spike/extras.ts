// Supporting numbers: threshold comparison, plausibility of the threshold, pharmacopoeia sensitivity test.
import { BASE, PP_ONE_STEP_MERCK, PP_TWO_STEP, excessToThreshold, flask, fractions, indicatorMolarity, seededTrial, solvePH, judge, trajectory } from './model.ts'
import type { Scenario, Trial } from './model.ts'

const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const box: Trial[] = []
for (const cHCl of [0.085, 0.105]) for (const cNaOH of [0.095, 0.105]) for (const pipetteMl of [24.97, 25.03])
  box.push({ seed: 0, cHCl, cNaOH, pipetteMl, buretteStartMl: 0, aliquotFactor: 1, titrantFactor: 1 })
const trials = [...SEEDS.map((s) => seededTrial(s)), ...box]
const worst = (sc: Scenario, T: number) => Math.max(...trials.map((t) => excessToThreshold(t, sc, T)))

console.log('=== Worst e* (mL past V_eq to reach threshold), two-step model, CO2 1x; must be <= 0.025 ===')
console.log('threshold | strength | 1 drop | 2 drops | 3 drops | 4 drops')
for (const T of [5e-7, 1e-6, 2e-6, 3e-6, 4e-6, 5e-6]) {
  for (const pct of [0.1, 0.5, 1]) {
    const cells = [1, 2, 3, 4].map((d) => {
      const w = worst({ ...BASE, indicatorPercent: pct, drops: d }, T)
      return `${w.toFixed(4)}${w <= 0.025 ? '' : ' FAIL'}`
    })
    console.log(`${T.toExponential(0)} | ${pct}% | ${cells.join(' | ')}`)
  }
}

console.log('\n=== Endpoint colour at each threshold (two-step, 0.5%, CO2 1x, real grid, seeds 1-100) ===')
console.log('threshold | drops | landing past V_eq min..mean..max mL | pink at endpoint max (M) | pink at V_eq+0.10 min (M) | ratio max endpoint / min overshoot line')
for (const T of [1e-6, 2e-6, 3e-6]) {
  for (const drops of [2, 3]) {
    const sc = { ...BASE, drops }
    let lo = Infinity, hi = 0, sum = 0, pkMax = 0, ovMin = Infinity
    for (const s of SEEDS) {
      const t = seededTrial(s)
      const r = trajectory(t, sc, 250)
      const e = judge(r, T)
      lo = Math.min(lo, e.pastEqMl); hi = Math.max(hi, e.pastEqMl); sum += e.pastEqMl
      pkMax = Math.max(pkMax, e.pinkAtEnd)
      ovMin = Math.min(ovMin, flask(t, sc, r.vEqMl + 0.1).pinkConc)
    }
    console.log(`${T.toExponential(0)} | ${drops} | ${lo.toFixed(4)}..${(sum / 100).toFixed(4)}..${hi.toFixed(4)} | ${pkMax.toExponential(2)} | ${ovMin.toExponential(2)} | ${(pkMax / ovMin).toFixed(2)}`)
  }
}

console.log('\n=== Is 3e-6 M a believable "faint pink"? Beer-Lambert with Tamura\'s absorbance ===')
const eps = 0.375 / 1e-5 // Tamura 1996: absorbance 0.375 for 1e-5 M all in the red form, 1 cm cell, 552.8 nm
console.log(`molar absorptivity of the red form = ${eps.toFixed(0)} L/(mol cm) at 552.8 nm`)
console.log('pink conc (M) | absorbance through 2 cm | 4 cm | 7 cm of liquid')
for (const c of [3e-7, 1e-6, 2e-6, 3e-6, 5e-6, 1.5e-5, 3e-5]) console.log(`${c.toExponential(0)} | ${(eps * c * 2).toFixed(3)} | ${(eps * c * 4).toFixed(3)} | ${(eps * c * 7).toFixed(3)}`)

console.log('\n=== British Pharmacopoeia sensitivity test, run through the model ===')
console.log('0.1 mL of 0.1% indicator in 100 mL CO2-free water; not more than 0.2 mL of 0.02 M NaOH turns it pink.')
for (const [name, pKas] of [['two-step 9.05/9.50', PP_TWO_STEP], ['one-step 9.7', PP_ONE_STEP_MERCK]] as const) {
  const V = 0.1002 + 0.0001
  const ind = (0.1e-3 * indicatorMolarity(0.1)) / V
  const na = (0.2e-3 * 0.02) / V
  const pH = solvePH({ strongCharge: na, acids: [{ total: ind, pKas, chargeProtonated: 0 }] })
  const f = fractions(pKas, Math.pow(10, -pH))
  console.log(`${name}: pH ${pH.toFixed(2)}, pink fraction ${f[f.length - 1].toFixed(3)}, pink concentration ${(f[f.length - 1] * ind).toExponential(2)} M (total indicator ${ind.toExponential(2)} M)`)
}
console.log('So a pink that the pharmacopoeia calls visible is at or below that concentration: the threshold should not be far above it.')
