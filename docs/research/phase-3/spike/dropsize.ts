// Sensitivity to the drop volume: a 50% ethanol drop is smaller than a water drop. Moles of indicator
// per drop scale with drop volume, so a 0.5% solution in 0.025 mL drops behaves like 0.25% in 0.05 mL drops.
import { BASE, excessToThreshold, seededTrial } from './model.ts'
import type { Trial } from './model.ts'
const box: Trial[] = []
for (const cHCl of [0.085, 0.105]) for (const cNaOH of [0.095, 0.105]) for (const pipetteMl of [24.97, 25.03])
  box.push({ seed: 0, cHCl, cNaOH, pipetteMl, buretteStartMl: 0, aliquotFactor: 1, titrantFactor: 1 })
const trials = [...Array.from({ length: 100 }, (_, i) => seededTrial(i + 1)), ...box]
console.log('effective strength (% w/v at 0.05 mL per drop) | threshold | worst e* 2 drops | worst e* 3 drops | result')
for (const pct of [0.2, 0.25, 0.3, 0.4, 0.5]) {
  for (const T of [1e-6, 3e-6]) {
    const w = [2, 3].map((d) => Math.max(...trials.map((t) => excessToThreshold(t, { ...BASE, indicatorPercent: pct, drops: d }, T))))
    console.log(`${pct}% | ${T.toExponential(0)} | ${w[0].toFixed(4)} | ${w[1].toFixed(4)} | ${w.every((x) => x <= 0.025) ? 'passes' : 'FAILS'}`)
  }
}
