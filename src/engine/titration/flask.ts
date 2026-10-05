import { protonationFractions, solvePH } from '../ph'
import type { TitrationModel } from './model'

/** What is in the flask and the burette. Volumes are whole microlitres; concentrations are whole numbers of their unit. */
export interface Flask {
  hclE4: number
  aliquotUl: number
  /** 100, or less when the pipette was wet with water. */
  aliquotPercent: number
  naohE5: number
  /** 100, or less when the burette was not conditioned. */
  titrantPercent: number
  indicatorDrops: number
  waterUl: number
  deliveredUl: number
}

// Equivalence is judged in whole numbers, so no result near it depends on floating-point rounding.
// The unit is 1e-5 mol/L x percent x microlitre; the largest product is about 5e10, far inside exact integer range.
const acidUnits = (f: Flask) => 10 * f.hclE4 * f.aliquotPercent * f.aliquotUl
const baseUnitsPerUl = (f: Flask) => f.naohE5 * f.titrantPercent

/** The flask's own equivalence volume: the acid actually in it over the concentration actually in the burette. Not shown to the learner. */
export function equivalenceUl(f: Flask): number {
  return acidUnits(f) / baseUnitsPerUl(f)
}

/** -1 before `offsetUl` past equivalence, 0 exactly there, 1 beyond. Exact: whole-number arithmetic. */
export function compareToEquivalence(f: Flask, offsetUl = 0): number {
  return Math.sign((f.deliveredUl - offsetUl) * baseUnitsPerUl(f) - acidUnits(f))
}

export const isOvershot = (m: TitrationModel, f: Flask) => compareToEquivalence(f, m.overshootUl) > 0

export interface FlaskChemistry {
  pH: number
  /** mol/L of the pink (doubly deprotonated) form in the fully mixed flask. */
  pinkConcentration: number
  indicatorConcentration: number
  volumeUl: number
}

export function flaskChemistry(m: TitrationModel, f: Flask): FlaskChemistry {
  const volumeUl = f.aliquotUl + f.indicatorDrops * m.indicatorDropUl + f.waterUl + f.deliveredUl
  // Amounts are in micromoles (mol/L x microlitres), so an amount over the flask's microlitres is mol/L.
  const acid = (f.hclE4 / 1e4) * (f.aliquotPercent / 100) * f.aliquotUl
  const base = (f.naohE5 / 1e5) * (f.titrantPercent / 100) * f.deliveredUl
  // Closed flask: the carbon is what the aliquot carried, fixed when it was delivered and only diluted afterwards.
  const carbon = m.dissolvedCo2 * f.aliquotUl
  const indicatorConcentration = (m.indicatorMolarity * f.indicatorDrops * m.indicatorDropUl) / volumeUl
  const pH = solvePH(
    {
      strongCharge: (base - acid) / volumeUl,
      acids: [
        { total: carbon / volumeUl, pKas: m.carbonicPKas, chargeProtonated: 0 },
        { total: indicatorConcentration, pKas: m.indicatorPKas, chargeProtonated: 0 },
      ],
    },
    m.kw,
  )
  // Only the fully deprotonated form is pink.
  const pinkFraction = protonationFractions(m.indicatorPKas, Math.pow(10, -pH)).at(-1)!
  return { pH, pinkConcentration: pinkFraction * indicatorConcentration, indicatorConcentration, volumeUl }
}

/** True when the fully mixed flask is at least faintly pink. The one judgment in the lab made in floating point. */
export const isPink = (m: TitrationModel, f: Flask) =>
  f.indicatorDrops > 0 && flaskChemistry(m, f).pinkConcentration >= m.faintPinkConcentration

export type PlumeStatus = 'fades-at-once' | 'fades-slowly' | 'persists'
export interface Plume {
  /** The share of the acid still in the flask that the last addition neutralised: 0 to 1, and 1 at or past equivalence. */
  fraction: number
  status: PlumeStatus
  /** Simulated seconds of swirling until the plume is gone; null when the pink persists. */
  fadeSeconds: number | null
}

/** The plume of the last addition (`addedUl` of the flask's `deliveredUl`). */
export function plume(m: TitrationModel, f: Flask, addedUl: number): Plume {
  const perUl = baseUnitsPerUl(f)
  const acidLeft = acidUnits(f) - (f.deliveredUl - addedUl) * perUl
  const fraction = acidLeft > 0 ? Math.min(1, (addedUl * perUl) / acidLeft) : 1
  if (isPink(m, f)) return { fraction, status: 'persists', fadeSeconds: null }
  return { fraction, status: fraction >= m.plumeSlowFrom ? 'fades-slowly' : 'fades-at-once', fadeSeconds: fraction * m.plumeMixSeconds }
}
