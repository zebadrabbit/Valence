import type { MoDiagram } from './schema'

/** (bonding electrons - antibonding electrons) / 2. */
export function bondOrder(diagram: MoDiagram): number {
  const signed = diagram.levels.reduce(
    (sum, level) => sum + (level.type === 'bonding' ? level.electrons : -level.electrons),
    0,
  )
  return signed / 2
}

/** Hund's rule: the orbitals of a level each take one electron before any takes a second. */
export function unpairedElectrons(diagram: MoDiagram): number {
  return diagram.levels.reduce(
    (sum, level) => sum + Math.min(level.electrons, 2 * level.degeneracy - level.electrons),
    0,
  )
}

/**
 * The electrons in each orbital of one level, filled by Hund's rule: one electron goes into
 * every orbital of the level before any orbital takes a second. A level of two orbitals
 * holding three electrons gives [2, 1].
 */
export function orbitalOccupancy(degeneracy: number, electrons: number): number[] {
  if (electrons < 0 || electrons > 2 * degeneracy) {
    throw new Error(`${electrons} electrons do not fit ${degeneracy} orbitals`)
  }
  return Array.from({ length: degeneracy }, (_, i) => (i < electrons ? 1 : 0) + (i < electrons - degeneracy ? 1 : 0))
}

/** The occupied levels in energy order with their electron counts, to write as (σ2s)² (σ*2s)² and so on. */
export function moConfiguration(diagram: MoDiagram): { label: string; electrons: number }[] {
  return diagram.levels.filter((level) => level.electrons > 0).map(({ label, electrons }) => ({ label, electrons }))
}
