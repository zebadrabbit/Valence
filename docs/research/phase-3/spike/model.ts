// Phase 3 endpoint feasibility spike. Pure TypeScript, no dependencies, no clock, no Math.random.
// Throwaway: this is the shape the engine could take, not the engine.
import { mulberry32, uniform } from './rng.ts'

// ---------------------------------------------------------------------------
// Cited constants (see report.md for sources). None of these is tuned.
// ---------------------------------------------------------------------------
export const PKW = 13.99 // IAPWS R11-24 Table 3, 25 C, 0.1 MPa
export const KW = Math.pow(10, -PKW)
export const CARBONIC_PKAS = [6.35, 10.33] // apparent first constant (CO2(aq) + H2CO3), Perrin/IUPAC
export const HENRY_CO2 = 0.034 // mol/(kg bar) at 298.15 K, NIST WebBook (Sander); kg treated as L
export const CO2_MOLE_FRACTION = 425.62e-6 // NOAA GML global annual mean 2025, dry air
export const PRESSURE_BAR = 1.01325
export const CO2_AQ = HENRY_CO2 * CO2_MOLE_FRACTION * PRESSURE_BAR // mol/L at air equilibrium
export const PHENOLPHTHALEIN_MOLAR_MASS = 318.3 // g/mol, PubChem CID 4764
export const DROP_ML = 0.05 // 20 drops per mL
export const PP_TWO_STEP = [9.05, 9.5] // Tamura et al. 1996: H2In -> HIn- -> In2-, only In2- is red
export const PP_ONE_STEP_MERCK = [9.7] // Merck Index via PubChem/HSDB
export const PP_ONE_STEP_950 = [9.5]

/** mol/L of an indicator solution of the given percent w/v. */
export function indicatorMolarity(percentWv: number): number {
  return (percentWv * 10) / PHENOLPHTHALEIN_MOLAR_MASS
}

// ---------------------------------------------------------------------------
// pH solver: one charge-balance equation, bisection on pH.
// ---------------------------------------------------------------------------
export type Acid = {
  /** analytical concentration, mol/L */
  total: number
  /** successive pKa values */
  pKas: readonly number[]
  /** charge of the fully protonated form (0 for HA, H2A, H3A; +1 for NH4+) */
  chargeProtonated: number
}

export type Solution = {
  /** sum of z*c over spectator ions (Na+ counts +, Cl- counts -), mol/L */
  strongCharge: number
  acids: readonly Acid[]
  kw?: number
}

/** Fraction of each protonation state, index k = number of protons lost. */
export function fractions(pKas: readonly number[], h: number): number[] {
  const terms = [1]
  for (const pKa of pKas) terms.push((terms[terms.length - 1] * Math.pow(10, -pKa)) / h)
  const sum = terms.reduce((a, b) => a + b, 0)
  return terms.map((t) => t / sum)
}

/** Net charge of the solution at a trial pH; zero at the true pH, strictly decreasing in pH. */
export function chargeImbalance(s: Solution, pH: number): number {
  const h = Math.pow(10, -pH)
  let q = h - (s.kw ?? KW) / h + s.strongCharge
  for (const acid of s.acids) {
    const f = fractions(acid.pKas, h)
    for (let k = 0; k < f.length; k++) q += acid.total * f[k] * (acid.chargeProtonated - k)
  }
  return q
}

export function solvePH(s: Solution): number {
  let lo = -2
  let hi = 16
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (chargeImbalance(s, mid) > 0) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

// ---------------------------------------------------------------------------
// Flask model
// ---------------------------------------------------------------------------
export type Scenario = {
  /** indicator solution strength, percent w/v */
  indicatorPercent: number
  /** indicator pKa list; the pink form is the fully deprotonated one */
  indicatorPKas: readonly number[]
  drops: number
  /** dissolved CO2 in the aliquot as a multiple of air equilibrium (0 removes CO2 from the model) */
  co2Multiple: number
  /** carbonate carried by the titrant, as a fraction of its NaOH molarity (0 = carbonate-free NaOH) */
  titrantCarbonate: number
  /** distilled water added to the flask, mL, and whether it carries air-equilibrium CO2 */
  waterMl: number
  waterCarriesCo2: boolean
  kw?: number
}

export const BASE: Scenario = {
  indicatorPercent: 0.5,
  indicatorPKas: PP_TWO_STEP,
  drops: 2,
  co2Multiple: 1,
  titrantCarbonate: 0,
  waterMl: 0,
  waterCarriesCo2: false,
}

export type Trial = {
  seed: number
  /** HCl molarity (label, four decimals, also the true value) */
  cHCl: number
  /** true NaOH molarity as seeded */
  cNaOH: number
  /** mL actually delivered by the pipette */
  pipetteMl: number
  /** true burette level after filling, mL, 0.001 resolution */
  buretteStartMl: number
  /** acid moles multiplier (0.98 when the pipette was not rinsed) */
  aliquotFactor: number
  /** titrant concentration multiplier (0.98 when the burette was not conditioned) */
  titrantFactor: number
}

/** Draw order used by this spike: HCl, NaOH, then (pipette offset, burette level) per trial. */
export function seededTrial(seed: number, trialIndex = 0): Trial {
  const rng = mulberry32(seed)
  const cHCl = Math.round(uniform(rng, 0.085, 0.105) * 1e4) / 1e4
  const cNaOH = uniform(rng, 0.095, 0.105)
  let pipetteMl = 25
  let buretteStartMl = 0
  for (let t = 0; t <= trialIndex; t++) {
    pipetteMl = 25 + uniform(rng, -0.03, 0.03)
    buretteStartMl = Math.round(uniform(rng, 0, 2) * 1000) / 1000
  }
  return { seed, cHCl, cNaOH, pipetteMl, buretteStartMl, aliquotFactor: 1, titrantFactor: 1 }
}

/** True equivalence volume of this flask with this titrant, mL. */
export function equivalenceMl(t: Trial): number {
  return (t.cHCl * t.aliquotFactor * t.pipetteMl) / (t.cNaOH * t.titrantFactor)
}

export type FlaskReading = { pH: number; pinkFraction: number; pinkConc: number; indicatorConc: number; volumeMl: number }

/** State of the fully mixed flask after `titrantMl` of NaOH. */
export function flask(t: Trial, sc: Scenario, titrantMl: number): FlaskReading {
  const volumeMl = t.pipetteMl + sc.drops * DROP_ML + sc.waterMl + titrantMl
  const V = volumeMl / 1000
  const titrantM = t.cNaOH * t.titrantFactor
  const cl = (t.cHCl * t.aliquotFactor * t.pipetteMl) / 1000 / V
  const na = (titrantM * titrantMl) / 1000 / V
  const carbonMol =
    (CO2_AQ * sc.co2Multiple * t.pipetteMl) / 1000 +
    (sc.waterCarriesCo2 ? (CO2_AQ * sc.co2Multiple * sc.waterMl) / 1000 : 0) +
    (sc.titrantCarbonate * titrantM * titrantMl) / 1000
  const indicatorConc = (sc.drops * DROP_ML * indicatorMolarity(sc.indicatorPercent)) / 1000 / V
  const pH = solvePH({
    strongCharge: na - cl,
    kw: sc.kw,
    acids: [
      { total: carbonMol / V, pKas: CARBONIC_PKAS, chargeProtonated: 0 },
      { total: indicatorConc, pKas: sc.indicatorPKas, chargeProtonated: 0 },
    ],
  })
  const f = fractions(sc.indicatorPKas, Math.pow(10, -pH))
  const pinkFraction = f[f.length - 1]
  return { pH, pinkFraction, pinkConc: pinkFraction * indicatorConc, indicatorConc, volumeMl }
}

// ---------------------------------------------------------------------------
// Careful run (spec 7.4): stream to 2.00 mL before equivalence, dropwise to 0.20 mL before,
// then half-drops. Volumes are integer microlitres so the grid never drifts.
// ---------------------------------------------------------------------------
export type Addition = { ul: number; kind: 'stream' | 'drop' | 'half'; addedUl: number }

/**
 * streamUl: size of one stream addition. 0 means "one stream addition of exactly V_eq - 2.00 mL",
 * which puts the half-drop grid exactly on V_eq (the literal reading of the spec sentence).
 * Returns the cumulative volumes, continuing with half-drops to 1 mL past equivalence.
 */
export function carefulAdditions(vEqMl: number, streamUl: number): Addition[] {
  const vEq = vEqMl * 1000
  const out: Addition[] = []
  let v = 0
  if (streamUl === 0) {
    v = vEq - 2000
    out.push({ ul: v, kind: 'stream', addedUl: v })
  } else {
    while (v + streamUl <= vEq - 2000) {
      v += streamUl
      out.push({ ul: v, kind: 'stream', addedUl: streamUl })
    }
  }
  while (v + 50 <= vEq - 200 + 1e-6) {
    v += 50
    out.push({ ul: v, kind: 'drop', addedUl: 50 })
  }
  while (v < vEq + 1000) {
    v += 25
    out.push({ ul: v, kind: 'half', addedUl: 25 })
  }
  return out
}

export type RunResult = {
  vEqMl: number
  /** pink concentration after each addition, in order */
  pink: number[]
  additions: Addition[]
  /** largest pink concentration at an addition strictly before equivalence */
  maxPinkBeforeEq: number
}

export function trajectory(t: Trial, sc: Scenario, streamUl: number): RunResult {
  const vEqMl = equivalenceMl(t)
  const additions = carefulAdditions(vEqMl, streamUl)
  const pink = additions.map((a) => flask(t, sc, a.ul / 1000).pinkConc)
  let maxPinkBeforeEq = 0
  additions.forEach((a, i) => {
    if (a.ul < vEqMl * 1000 - 1e-6) maxPinkBeforeEq = Math.max(maxPinkBeforeEq, pink[i])
  })
  return { vEqMl, pink, additions, maxPinkBeforeEq }
}

export type Endpoint = {
  ok: boolean
  reason: string
  /** endpoint volume minus V_eq, mL (NaN when no endpoint) */
  pastEqMl: number
  endMl: number
  pinkAtEnd: number
}

/** Apply the 7.4 endpoint acceptance test to a trajectory for one threshold. */
export function judge(r: RunResult, threshold: number): Endpoint {
  const idx = r.pink.findIndex((p) => p >= threshold)
  if (idx < 0) return { ok: false, reason: 'no endpoint within 1 mL past', pastEqMl: NaN, endMl: NaN, pinkAtEnd: NaN }
  const endMl = r.additions[idx].ul / 1000
  const pastEqMl = endMl - r.vEqMl
  const pinkAtEnd = r.pink[idx]
  if (r.maxPinkBeforeEq >= threshold) return { ok: false, reason: 'pink before equivalence', pastEqMl, endMl, pinkAtEnd }
  if (pastEqMl < -1e-9) return { ok: false, reason: 'endpoint before equivalence', pastEqMl, endMl, pinkAtEnd }
  if (pastEqMl > 0.1 + 1e-9) return { ok: false, reason: 'overshoot', pastEqMl, endMl, pinkAtEnd }
  if (pastEqMl > 0.05 + 1e-9) return { ok: false, reason: 'later than 0.05 mL', pastEqMl, endMl, pinkAtEnd }
  return { ok: true, reason: 'ok', pastEqMl, endMl, pinkAtEnd }
}

/** Excess titrant past V_eq (mL) at which the mixed flask first reaches the threshold. */
export function excessToThreshold(t: Trial, sc: Scenario, threshold: number): number {
  const vEq = equivalenceMl(t)
  let lo = -0.5
  let hi = 5
  if (flask(t, sc, vEq + lo).pinkConc >= threshold) return lo
  if (flask(t, sc, vEq + hi).pinkConc < threshold) return Infinity
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (flask(t, sc, vEq + mid).pinkConc >= threshold) hi = mid
    else lo = mid
  }
  return hi
}

// ---------------------------------------------------------------------------
// Plume (spec 7.2): one deterministic value per addition.
// ---------------------------------------------------------------------------
export type PlumeState = 'pink fades at once' | 'pink fades slowly' | 'pink persists'
export type Plume = {
  /** share of the flask's remaining excess acid that the last drop of this addition neutralises; 1 at or past equivalence */
  fraction: number
  state: PlumeState
  /** simulated seconds of swirling until the plume is gone; Infinity when it persists */
  fadeSeconds: number
  /** local pink concentration inside the plume, mol/L: all indicator there is in its pink form */
  intensity: number
}

export const PLUME_SLOW_FROM = 0.1 // model parameter
export const PLUME_MIX_SECONDS = 10 // model parameter: swirl time to mix the whole flask

export function plume(t: Trial, sc: Scenario, beforeMl: number, addedMl: number, threshold: number): Plume {
  const titrantM = t.cNaOH * t.titrantFactor
  // the plume is the last drop's worth of the addition (a stream slug leaves a drop-sized plume)
  const lastMl = Math.min(addedMl, DROP_ML)
  const beforeLastMl = beforeMl + addedMl - lastMl
  const acidLeft = (t.cHCl * t.aliquotFactor * t.pipetteMl - titrantM * beforeLastMl) / 1000 // mol of strong acid in excess
  const added = (titrantM * lastMl) / 1000
  const fraction = acidLeft > 0 ? Math.min(added / acidLeft, 1) : 1
  const after = flask(t, sc, beforeMl + addedMl)
  const intensity = after.indicatorConc
  if (after.pinkConc >= threshold) return { fraction, state: 'pink persists', fadeSeconds: Infinity, intensity }
  const state: PlumeState = fraction >= PLUME_SLOW_FROM ? 'pink fades slowly' : 'pink fades at once'
  return { fraction, state, fadeSeconds: fraction * PLUME_MIX_SECONDS, intensity }
}
