import type { Mechanism, Step } from './schema'

// The two curves of the energy panel (spec 9.2): free energy, the main curve, and enthalpy alongside, each in
// kJ/mol from the start of step 1, against the track. Each is a run of stretches, one for each step, or one for
// two steps where the record has one enthalpy for both.

export type EnergyStretch = {
  /** The step the stretch is of, or the two it covers together. */
  stepIds: string[]
  /** Where on the track it begins and ends. */
  range: [number, number]
  /** The level it begins at and the level it ends at. */
  from: number
  to: number
  /** Whether the change is worked out directly from cited values or derived (spec 9.1). */
  basis: 'cited' | 'derived'
  /**
   * The barrier, where the step has one: where its top is on the track, how high above `from`, and where the
   * height is from. A schematic barrier is drawn at the record's drawing height and is not to scale.
   */
  barrier?: { range: [number, number]; top: number; height: number; basis: 'derived' | 'cited' | 'schematic' }
}

const steps = (mechanism: Mechanism): Step[] => mechanism.chapters.filter((c): c is Step => c.kind === 'step')
const ease = (u: number) => u * u * (3 - 2 * u)
const pairKey = (a: string, b: string) => (a < b ? `${a} ${b}` : `${b} ${a}`)

/** The stretch of a step's track in which its bonds change, where they do: a barrier is drawn over it. */
function reactingMove(mechanism: Mechanism, step: Step): [number, number] | null {
  const inside = mechanism.keyframes.filter((k) => k.t >= step.range[0] && k.t <= step.range[1])
  const bonds = (i: number) => inside[i]!.bonds.map((b) => `${pairKey(b.a, b.b)} ${b.order}`).sort().join()
  const index = inside.findIndex((_, i) => i > 0 && bonds(i) !== bonds(i - 1))
  return index < 0 ? null : [inside[index - 1]!.t, inside[index]!.t]
}

/** The two curves, as the stretches each is made of. */
export function energyCurves(mechanism: Mechanism): { g: EnergyStretch[]; h: EnergyStretch[] } {
  const all = steps(mechanism)
  const g: EnergyStretch[] = []
  const h: EnergyStretch[] = []
  let [levelG, levelH] = [0, 0]
  for (const step of all) {
    const stretch: EnergyStretch = { stepIds: [step.id], range: step.range, from: levelG, to: levelG + step.deltaG.value, basis: step.deltaG.basis }
    const { activationG } = step
    if (activationG !== undefined) {
      const move = reactingMove(mechanism, step) ?? step.range
      const [height, basis] = activationG === 'schematic' ? ([mechanism.thermo.parameters.schematicBarrier.value, 'schematic'] as const) : ([activationG.value, activationG.basis] as const)
      stretch.barrier = { range: move, top: (move[0] + move[1]) / 2, height, basis }
    }
    g.push(stretch)
    levelG = stretch.to
    if (step.deltaH) {
      const covered = step.deltaH.covers ?? [step.id]
      const start = all.find((s) => s.id === covered[0])!.range[0]
      h.push({ stepIds: covered, range: [start, step.range[1]], from: levelH, to: levelH + step.deltaH.value, basis: step.deltaH.basis })
      levelH += step.deltaH.value
    }
  }
  return { g, h }
}

/** A curve's value at `t`: flat before its first stretch and after its last, a smooth change within a stretch, and over a barrier a rise to its top and a fall from it. */
function valueAt(stretches: readonly EnergyStretch[], t: number): number {
  const last = stretches.at(-1)
  if (!last || t <= stretches[0]!.range[0]) return 0
  const stretch = stretches.find((s) => t < s.range[1])
  if (!stretch) return last.to
  const { from, to, barrier } = stretch
  if (!barrier) return from + (to - from) * ease((t - stretch.range[0]) / (stretch.range[1] - stretch.range[0]))
  if (t <= barrier.range[0]) return from
  if (t >= barrier.range[1]) return to
  const top = from + barrier.height
  return t < barrier.top ? from + (top - from) * ease((t - barrier.range[0]) / (barrier.top - barrier.range[0])) : top + (to - top) * ease((t - barrier.top) / (barrier.range[1] - barrier.top))
}

/** Where the energy panel's cursor is at scrub position `t`: both curves' values there. */
export function energyAt(mechanism: Mechanism, t: number): { g: number; h: number } {
  const { g, h } = energyCurves(mechanism)
  return { g: valueAt(g, t), h: valueAt(h, t) }
}

/** The whole change: the sum of the steps' enthalpies and of their free energies, in kJ/mol. */
export function overallEnergy(mechanism: Mechanism): { deltaH: number; deltaG: number } {
  const all = steps(mechanism)
  return { deltaH: all.reduce((sum, s) => sum + (s.deltaH?.value ?? 0), 0), deltaG: all.reduce((sum, s) => sum + s.deltaG.value, 0) }
}
