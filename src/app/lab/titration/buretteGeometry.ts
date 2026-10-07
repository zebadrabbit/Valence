// Where a burette volume is drawn, in the units of each drawing's viewBox. Volumes are whole microlitres.
// A burette is numbered downward, 0 at the top and 50 at the bottom, so a larger volume is a larger y.

/** The last mark of the scale. The model's own capacity is held to it by a test. */
export const BURETTE_CAPACITY_UL = 50_000
/** One graduation: 0.1 mL. */
export const GRADUATION_UL = 100

/** The enlarged view of the scale at the meniscus: 48 units to a graduation, so 0.01 mL is 4.8 units. */
export const READING = {
  width: 260,
  height: 576,
  unitsPerMl: 480,
  /** From the top of the window to the graduation at or just above the meniscus: five graduations and half of one. */
  aboveUl: 550,
  /** The window: twelve graduations, and half a graduation of tube beyond the first and the last. */
  spanUl: 1200,
  tubeLeft: 30,
  tubeRight: 170,
  /**
   * How far up the glass the liquid is drawn above the bottom of the meniscus, as a volume on the scale. Chosen by
   * eye and not measured: it is far enough that reading the top of the curve is outside the 0.02 mL allowed.
   */
  meniscusRiseUl: 80,
} as const

/** The whole burette on its stand: 8.4 units to a mL, the 0 mark at y = 40 and the 50 mark at y = 460. */
export const STAND = { width: 300, height: 640, scaleTop: 40, unitsPerMl: 8.4 } as const

export interface Graduation {
  ul: number
  y: number
  /** In the reading view: a whole mL (numbered), a half mL (a longer line), or a tenth. On the stand: every 10 mL, every 5, or every 1. */
  kind: 'ml' | 'half' | 'tenth'
  /** The number printed beside the mark; null for a mark with none. */
  label: string | null
}

/** The volume at the top edge of the reading window. It moves in whole graduations, so every graduation is drawn at a whole unit. */
export function readingWindowTopUl(levelUl: number): number {
  return Math.floor(levelUl / GRADUATION_UL) * GRADUATION_UL - READING.aboveUl
}

/** The y of a volume in the reading view while the meniscus is at `levelUl`. */
export function readingY(volumeUl: number, levelUl: number): number {
  return ((volumeUl - readingWindowTopUl(levelUl)) * READING.unitsPerMl) / 1000
}

/** The graduations in the reading window, from the top down. None above the 0 mark or below the 50 mark: the tube is bare there. */
export function readingGraduations(levelUl: number): Graduation[] {
  const top = readingWindowTopUl(levelUl)
  const marks: Graduation[] = []
  for (let ul = top + GRADUATION_UL / 2; ul < top + READING.spanUl; ul += GRADUATION_UL) {
    if (ul < 0 || ul > BURETTE_CAPACITY_UL) continue
    const kind = ul % 1000 === 0 ? 'ml' : ul % 500 === 0 ? 'half' : 'tenth'
    marks.push({ ul, y: readingY(ul, levelUl), kind, label: kind === 'ml' ? String(ul / 1000) : null })
  }
  return marks
}

/** The y of a volume on the whole burette. */
export function standY(volumeUl: number): number {
  return STAND.scaleTop + (volumeUl * STAND.unitsPerMl) / 1000
}

/** The whole burette's marks: one at every mL, a longer one at every 5, a numbered one at every 10. */
export function standGraduations(): Graduation[] {
  const marks: Graduation[] = []
  for (let ul = 0; ul <= BURETTE_CAPACITY_UL; ul += 1000) {
    const kind = ul % 10000 === 0 ? 'ml' : ul % 5000 === 0 ? 'half' : 'tenth'
    marks.push({ ul, y: standY(ul), kind, label: kind === 'ml' ? String(ul / 1000) : null })
  }
  return marks
}
