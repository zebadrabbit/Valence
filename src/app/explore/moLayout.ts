// Where the levels of a molecular orbital diagram go, in SVG units (1 unit is 1 px at full size).
// Energy runs up the page: the first stored level (the lowest) is at the bottom. The spacing is
// even, not to scale: the data holds the order of the levels, not their energies.

import { orbitalOccupancy } from '@/chem-data/mo'
import type { MoDiagram } from '@/chem-data/schema'

export type MoLevelLayout = {
  label: string
  type: MoDiagram['levels'][number]['type']
  /** The height of the level's line. */
  y: number
  /** One per orbital: the centre of its line and the electrons in it (0, 1 or 2). */
  orbitals: { x: number; electrons: number }[]
}

export type MoLayout = { width: number; height: number; levels: MoLevelLayout[] }

export const ORBITAL_WIDTH = 34
const ORBITAL_GAP = 14
const ROW_HEIGHT = 40
const LABEL_WIDTH = 64
const WIDTH = 230

export function moLayout(diagram: MoDiagram): MoLayout {
  const centre = LABEL_WIDTH + (WIDTH - LABEL_WIDTH) / 2
  const height = ROW_HEIGHT * diagram.levels.length + 8
  const levels = diagram.levels.map((level, i): MoLevelLayout => {
    const span = level.degeneracy * ORBITAL_WIDTH + (level.degeneracy - 1) * ORBITAL_GAP
    return {
      label: level.label,
      type: level.type,
      y: height - 12 - ROW_HEIGHT * i,
      orbitals: orbitalOccupancy(level.degeneracy, level.electrons).map((electrons, k) => ({
        x: centre - span / 2 + ORBITAL_WIDTH / 2 + k * (ORBITAL_WIDTH + ORBITAL_GAP),
        electrons,
      })),
    }
  })
  return { width: WIDTH, height, levels }
}
