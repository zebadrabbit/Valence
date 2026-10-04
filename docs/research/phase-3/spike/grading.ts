// Item 6: grading interplay. Calculated molarity uses the label and the nominal 25.00 mL.
import { BASE, equivalenceMl, judge, seededTrial, trajectory } from './model.ts'
import type { Scenario, Trial } from './model.ts'

const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const r2 = (x: number) => Math.round(x * 100 + 1e-9) / 100
const pct = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(3) + '%'

type Outcome = { deliveredMl: number; pastEqMl: number; overshoot: boolean }
function careful(t: Trial, sc: Scenario, T: number): Outcome {
  const r = trajectory(t, sc, 250)
  const e = judge(r, T)
  return { deliveredMl: e.endMl, pastEqMl: e.pastEqMl, overshoot: e.pastEqMl > 0.1 + 1e-9 }
}

/** percent error of the calculated NaOH molarity against the seeded value */
function errorPct(t: Trial, initialRead: number, finalRead: number): number {
  const m = (t.cHCl * 25.0) / (finalRead - initialRead)
  return (m / t.cNaOH - 1) * 100
}

/** honest readings (true meniscus rounded to 0.01) and the two extremes allowed by the 0.02 mL tolerance */
function readings(start: number, end: number) {
  const lowest = (x: number) => Math.ceil((x - 0.02) * 100 - 1e-9) / 100
  const highest = (x: number) => Math.floor((x + 0.02) * 100 + 1e-9) / 100
  return {
    honest: [r2(start), r2(end)] as const,
    titreHigh: [lowest(start), highest(end)] as const,
    titreLow: [highest(start), lowest(end)] as const,
  }
}

for (const T of [3e-6, 1e-6]) {
  console.log(`\n=== Careful run, no technique error, threshold ${T.toExponential(0)} M; seeds 1-100 x trials 1-3 x (2,3 drops) = 600 runs ===`)
  let lo = Infinity, hi = -Infinity, loW = Infinity, hiW = -Infinity, n = 0, late = 0, lateMax = 0, fails = 0, failsW = 0
  let worstSeed = ''
  for (const drops of [2, 3]) {
    for (const seed of SEEDS) {
      for (const ti of [0, 1, 2]) {
        const t = seededTrial(seed, ti)
        const o = careful(t, { ...BASE, drops }, T)
        const end = t.buretteStartMl + o.deliveredMl
        const rd = readings(t.buretteStartMl, end)
        const e = errorPct(t, ...rd.honest)
        const eLow = errorPct(t, ...rd.titreHigh)
        const eHigh = errorPct(t, ...rd.titreLow)
        n++
        late += o.pastEqMl
        lateMax = Math.max(lateMax, o.pastEqMl)
        lo = Math.min(lo, e); hi = Math.max(hi, e)
        if (eLow < loW) { loW = eLow; worstSeed = `seed ${seed} trial ${ti + 1} drops ${drops}` }
        hiW = Math.max(hiW, eHigh)
        if (Math.abs(e) > 1) fails++
        if (Math.abs(eLow) > 1 || Math.abs(eHigh) > 1) failsW++
      }
    }
  }
  console.log(`endpoint lateness: mean ${(late / n).toFixed(4)} mL, max ${lateMax.toFixed(4)} mL`)
  console.log(`honest readings (true meniscus rounded to 0.01 mL): error ${pct(lo)} to ${pct(hi)}; trials outside +-1.0%: ${fails}/${n}`)
  console.log(`readings at the edge of the 0.02 mL tolerance, both against the learner: error ${pct(loW)} to ${pct(hiW)}; outside +-1.0%: ${failsW}/${n} (worst: ${worstSeed})`)
}

// analytic bound over the whole seeded box, not only seeds 1-100
{
  const ratio = 0.105 / 0.085 // largest NaOH/HCl ratio turns a volume error into the largest relative error
  const worstLow = (25 / (25 + 0.03 + (0.05 + 0.04) * ratio) - 1) * 100
  const worstHigh = (25 / (25 - 0.03 - 0.04 * ratio) - 1) * 100
  console.log(`\nBound over the whole seeded box (pipette +-0.03, endpoint 0 to 0.05 late, titre misread by +-0.04): ${pct(worstLow)} to ${pct(worstHigh)}`)
}

console.log('\n=== Technique errors, each alone, threshold 3e-6 M, seeds 1-100, trial 1, 2 and 3 drops ===')
console.log('error | shift vs the same run without the error (min..max) | absolute error, honest readings (min..max) | absolute error with readings pushed 0.02 mL toward passing (closest to zero) | flagged overshoot against the flask\'s own equivalence | overshoot if judged against the nominal equivalence')
type Err = { name: string; apply: (t: Trial) => Trial; bubbleMl: number; sc?: Partial<Scenario> }
const errs: Err[] = [
  { name: 'unconditioned burette (titrant x0.98)', apply: (t) => ({ ...t, titrantFactor: 0.98 }), bubbleMl: 0 },
  { name: 'tip bubble (0.60 mL recorded, not delivered)', apply: (t) => t, bubbleMl: 0.6 },
  { name: 'pipette not rinsed (aliquot x0.98)', apply: (t) => ({ ...t, aliquotFactor: 0.98 }), bubbleMl: 0 },
  { name: 'distilled water, 10 mL (CO2-free)', apply: (t) => t, bubbleMl: 0, sc: { waterMl: 10 } },
  { name: 'distilled water, 25 mL (CO2-free)', apply: (t) => t, bubbleMl: 0, sc: { waterMl: 25 } },
]
for (const err of errs) {
  let sLo = Infinity, sHi = -Infinity, aLo = Infinity, aHi = -Infinity, closest = Infinity, over = 0, overNominal = 0, n = 0
  for (const drops of [2, 3]) {
    for (const seed of SEEDS) {
      const base = seededTrial(seed)
      const sc0 = { ...BASE, drops }
      const o0 = careful(base, sc0, 3e-6)
      const e0 = errorPct(base, ...readings(base.buretteStartMl, base.buretteStartMl + o0.deliveredMl).honest)
      const t = err.apply(base)
      const o = careful(t, { ...sc0, ...err.sc }, 3e-6)
      const rd = readings(t.buretteStartMl, t.buretteStartMl + o.deliveredMl + err.bubbleMl)
      // grade against the seeded NaOH concentration, not the diluted one
      const e = errorPct(base, ...rd.honest)
      const shift = e - e0
      sLo = Math.min(sLo, shift); sHi = Math.max(sHi, shift)
      aLo = Math.min(aLo, e); aHi = Math.max(aHi, e)
      for (const pair of [rd.titreHigh, rd.titreLow]) {
        const ee = errorPct(base, ...pair)
        if (Math.abs(ee) < Math.abs(closest)) closest = ee
      }
      if (o.overshoot) over++
      if (o.deliveredMl - equivalenceMl(base) > 0.1 + 1e-9) overNominal++
      n++
    }
  }
  console.log(`${err.name} | ${pct(sLo)}..${pct(sHi)} | ${pct(aLo)}..${pct(aHi)} | ${pct(closest)} | ${over}/${n} | ${overNominal}/${n}`)
}
console.log('\nGrading boundary: +0.9% ->', Math.abs(0.9) <= 1 ? 'pass' : 'fail', '; +1.1% ->', Math.abs(1.1) <= 1 ? 'pass' : 'fail')
