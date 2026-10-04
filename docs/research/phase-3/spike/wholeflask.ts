// Alternative reading of "dissolved CO2 at air-equilibrium concentration": total carbon = CO2(aq) x the whole
// flask volume (as if the titrant brought the same dissolved carbon per mL as the aliquot).
import { BASE, CO2_AQ, excessToThreshold, seededTrial } from './model.ts'
import type { Trial } from './model.ts'
const box: Trial[] = []
for (const cHCl of [0.085, 0.105]) for (const cNaOH of [0.095, 0.105]) for (const pipetteMl of [24.97, 25.03])
  box.push({ seed: 0, cHCl, cNaOH, pipetteMl, buretteStartMl: 0, aliquotFactor: 1, titrantFactor: 1 })
const trials = [...Array.from({ length: 100 }, (_, i) => seededTrial(i + 1)), ...box]
console.log('threshold | worst e* 2 drops | worst e* 3 drops | result')
for (const T of [1e-6, 2e-6, 3e-6]) {
  const w = [2, 3].map((d) => Math.max(...trials.map((t) => excessToThreshold(t, { ...BASE, drops: d, titrantCarbonate: CO2_AQ / t.cNaOH }, T))))
  console.log(`${T.toExponential(0)} | ${w[0].toFixed(4)} | ${w[1].toFixed(4)} | ${w.every((x) => x <= 0.025) ? 'passes' : 'FAILS'}`)
}
