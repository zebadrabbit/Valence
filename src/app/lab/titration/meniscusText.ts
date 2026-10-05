import { BURETTE_CAPACITY_UL, GRADUATION_UL } from './buretteGeometry'

// The meniscus in words, for a learner who cannot use the drawing: the two graduations it lies between and which
// fifth of the gap it is in, never the reading itself. A fifth of a gap is 0.02 mL, which is what a reading is
// allowed to be out, so the words alone are enough to record one.

export const MENISCUS_POSITIONS = ['at-or-just-below', 'quarter', 'half', 'three-quarters', 'just-above'] as const

/** A graduation as the scale would number it: 24300 is "24.3". Whole-number arithmetic, so never 24.299999. */
export function markText(ul: number): string {
  return `${Math.floor(ul / 1000)}.${Math.floor((ul % 1000) / GRADUATION_UL)}`
}

/** The graduation at or just above the meniscus, the next one down, and which fifth of the gap the meniscus is in. For levels 0 to 49 999. */
export function meniscusBracket(levelUl: number): { upperUl: number; lowerUl: number; position: (typeof MENISCUS_POSITIONS)[number] } {
  const upperUl = Math.floor(levelUl / GRADUATION_UL) * GRADUATION_UL
  const fifth = Math.floor(((levelUl - upperUl) * MENISCUS_POSITIONS.length) / GRADUATION_UL)
  return { upperUl, lowerUl: upperUl + GRADUATION_UL, position: MENISCUS_POSITIONS[fifth]! }
}

const DOWNWARD = 'The numbers on a burette increase downward.'

/** For levels 0 to 50 000. */
export function meniscusText(levelUl: number): string {
  // There is no graduation below the last one to be between.
  if (levelUl >= BURETTE_CAPACITY_UL)
    return `The bottom of the meniscus is at the ${markText(BURETTE_CAPACITY_UL)} mL mark, the bottom of the scale. ${DOWNWARD}`
  const { upperUl, lowerUl, position } = meniscusBracket(levelUl)
  const upper = markText(upperUl)
  const lower = markText(lowerUl)
  const where = {
    'at-or-just-below': `at or just below the ${upper} mL mark`,
    quarter: `about a quarter of the way down from the ${upper} mL mark`,
    half: 'about halfway between them',
    'three-quarters': `about three quarters of the way down from the ${upper} mL mark`,
    'just-above': `just above the ${lower} mL mark`,
  }[position]
  return `The bottom of the meniscus is between the ${upper} mL and ${lower} mL marks, ${where}. ${DOWNWARD}`
}
