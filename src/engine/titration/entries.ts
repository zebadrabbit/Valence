import type { TitrationModel } from './model'

// What the learner types, and how it is judged. Text is read from its characters and never through a float, and
// every judgment is whole-number arithmetic.

/** A burette reading typed to 0.01 mL ("12.34"), in microlitres; null when it is not written that way. */
export function parseReading(text: string): number | null {
  const match = /^(\d{1,2})\.(\d{2})$/.exec(text.trim())
  return match ? Number(match[1]) * 1000 + Number(match[2]) * 10 : null
}

/** A molarity below 1 typed to exactly four decimal places ("0.0949" or ".0949"), x 1 000 000; null otherwise. */
export function parseMolarity(text: string): number | null {
  const match = /^0?\.(\d{4})$/.exec(text.trim())
  return match ? Number(match[1]) * 100 : null
}

/** A relative deviation in parts per thousand with up to two decimals ("1.3" or ".5"), in hundredths; null otherwise. */
export function parseDeviation(text: string): number | null {
  const match = /^(\d{0,3})(?:\.(\d{1,2}))?$/.exec(text.trim())
  if (!match || match[0] === '') return null
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
}

/** Signed percent error of a typed molarity against the true one. For display: nothing is decided on it. */
export const percentError = (molarityE6: number, naohE5: number) => ((molarityE6 - naohE5 * 10) / (naohE5 * 10)) * 100

/** Within the grading tolerance of the true molarity, the edge included. Exact. */
export const withinTolerance = (m: TitrationModel, molarityE6: number, naohE5: number) =>
  Math.abs(molarityE6 - naohE5 * 10) * 100 <= m.gradeTolerancePercent * naohE5 * 10

/** True when the typed molarity is the notebook's HCl molarity x 25.00 mL / titre rounded to the fourth decimal place; at an exact tie, either neighbour (Q1). Exact. */
export const followsFromNotebook = (m: TitrationModel, molarityE6: number, hclE6: number, titreUl: number) =>
  titreUl > 0 && Math.abs(molarityE6 * titreUl - hclE6 * m.pipetteNominalUl) <= m.molarityRoundingE6 * titreUl

/** The mean rounded to the fourth decimal (as E6, a tie rounding up), and the relative deviation worked from that rounded mean, in tenths of a part per thousand. */
export function summarise(molaritiesE6: readonly number[]): { meanE6: number; deviationTenths: number } {
  const n = molaritiesE6.length
  // Each rounding is of one quotient of two whole numbers, so a value exactly halfway is exactly halfway in
  // floating point too, and Math.round takes it up.
  const meanE6 = Math.round(molaritiesE6.reduce((a, b) => a + b, 0) / (100 * n)) * 100
  const distances = molaritiesE6.reduce((a, b) => a + Math.abs(b - meanE6), 0)
  // The mean distance over the mean, x 1000 for parts per thousand, x 10 for tenths.
  return { meanE6, deviationTenths: Math.round((distances * 10000) / (n * meanE6)) }
}
