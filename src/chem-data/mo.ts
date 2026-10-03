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
