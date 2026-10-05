/** One acid-base system: every protonation state of one substance. */
export interface AcidSpecies {
  /** Total (analytical) concentration over all its protonation states, mol/L. */
  total: number
  /** Successive pKa values, most acidic first. A strong acid or base is not listed here: see `strongCharge`. */
  pKas: readonly number[]
  /** Charge of the fully protonated form: 0 for HA, H2A, H3A; +1 for NH4+. */
  chargeProtonated: number
}

export interface Solution {
  /** Sum of charge x concentration over ions that never take or give a proton (Na+ counts +, Cl- counts -), mol/L. */
  strongCharge: number
  acids: readonly AcidSpecies[]
}

const PH_MIN = -2
const PH_MAX = 16
const STEPS = 60

const acidConstants = (pKas: readonly number[]) => pKas.map((pKa) => Math.pow(10, -pKa))

/** Fraction of a species in each protonation state at hydrogen-ion concentration `h`; index k is the form that has lost k protons. */
export function protonationFractions(pKas: readonly number[], h: number): number[] {
  const terms = [1]
  let term = 1
  for (const ka of acidConstants(pKas)) terms.push((term = (term * ka) / h))
  const sum = terms.reduce((a, b) => a + b, 0)
  return terms.map((t) => t / sum)
}

// The solver's own form of an acid: its constants worked out once per solve, not at each of the 60 steps.
interface Prepared {
  total: number
  kas: readonly number[]
  chargeProtonated: number
}
const prepare = (acids: readonly AcidSpecies[]): Prepared[] =>
  acids.map((acid) => ({ total: acid.total, kas: acidConstants(acid.pKas), chargeProtonated: acid.chargeProtonated }))

function imbalance(strongCharge: number, acids: readonly Prepared[], kw: number, pH: number): number {
  const h = Math.pow(10, -pH)
  let charge = h - kw / h + strongCharge
  for (const acid of acids) {
    // The species' mean charge: each form's share times its charge, summed without building the list of shares.
    let term = 1
    let sum = 1
    let weighted = acid.chargeProtonated
    acid.kas.forEach((ka, k) => {
      term = (term * ka) / h
      sum += term
      weighted += term * (acid.chargeProtonated - k - 1)
    })
    charge += (acid.total * weighted) / sum
  }
  return charge
}

/** Net charge of the solution at a trial pH, mol/L: zero at the true pH, and falling as pH rises. */
export function chargeImbalance(solution: Solution, kw: number, pH: number): number {
  return imbalance(solution.strongCharge, prepare(solution.acids), kw, pH)
}

/** Ideal-solution pH (no activity corrections) by bisection on the charge balance: pH -2 to 16, 60 steps. */
export function solvePH(solution: Solution, kw: number): number {
  const acids = prepare(solution.acids)
  let lo = PH_MIN
  let hi = PH_MAX
  for (let i = 0; i < STEPS; i++) {
    const mid = (lo + hi) / 2
    if (imbalance(solution.strongCharge, acids, kw, mid) > 0) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
