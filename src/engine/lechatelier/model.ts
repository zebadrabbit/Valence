import { CAUSES, WAYS, parameterOf, type Cause, type DisturbanceId, type LechatelierData, type SystemId, type TubeId, type Way } from '@/chem-data/lechatelier/data'
import type { TubeShows } from '../tubeShows'

// The plain values the Le Chatelier engine runs on (spec 18.4). The record says, for each disturbance, what is
// done, what the tube shows after each portion, what is asked and what is right; the engine reads those and works
// no chemistry out. What it adds is each tube's volume at each stage, in whole microlitres, from the record's
// counts of drops, so that a tube can be drawn to its level. That the stored stages are what the stored numbers
// give is the build's to check (scripts/lechatelier-lib.mjs), which works the same volumes out for itself: a test
// holds the two to each other.

/** Where a tube stands: in the rack at room temperature, in the bath of boiling water, or in the bath of ice water. */
export type Temperature = 'room' | 'hot' | 'cold'

/** A tube as it stands at one point: the colour of its liquid, the colour of its solid or 'none', its volume, and where it stands. */
export interface StageModel {
  liquid: string
  solid: string
  microlitres: number
  temperature: Temperature
}

export interface DisturbanceModel {
  id: DisturbanceId
  tube: TubeId
  /** What is done: something is added, a portion at each press, or the tube is stood in a bath. */
  kind: 'add' | 'heat' | 'cool'
  /** How many presses the action takes: the portions of an addition, or 1. */
  portions: number
  /** The tube before the disturbance, and after each press. */
  before: StageModel
  stages: readonly StageModel[]
  /** What is asked once the tube has been observed, and the right answer: a way the equilibrium went, or what took the metal ion away. */
  ask: 'direction' | 'cause'
  right: Way | Cause
}

export interface SystemModel {
  id: SystemId
  /** In the order they are done. */
  disturbances: readonly DisturbanceModel[]
}

export interface LechatelierModel {
  systems: readonly SystemModel[]
  /** What an observation is recorded from. The first choice of a solid is that there is none. */
  solidChoices: readonly string[]
  liquidChoices: readonly string[]
}

/** The choices a question of a disturbance is answered from. */
export const answersFor = (ask: DisturbanceModel['ask']): readonly string[] => (ask === 'direction' ? WAYS : CAUSES)

/** What is seen of a tube at a stage: a liquid that is clear, and a solid, where there is one, lying at the bottom. */
export function showsOf(m: LechatelierModel, stage: StageModel): TubeShows {
  return { liquid: { colour: stage.liquid, cloudy: false, microlitres: stage.microlitres }, solid: stage.solid === m.solidChoices[0] ? null : { colour: stage.solid, settled: true } }
}

/** The engine's values, from the stored record. */
export function modelFrom(data: LechatelierData): LechatelierModel {
  const microlitres = (drops: number) => drops * data.parameters.dropMicrolitres.value
  return {
    solidChoices: data.choices.solid,
    liquidChoices: data.choices.liquid,
    systems: data.systems.map((system): SystemModel => {
      // Each tube of the system as it stands, from the first thing done to it on.
      const standing = new Map<TubeId, StageModel>()
      const begin = (tubeId: TubeId): StageModel => {
        const tube = system.tubes.find((t) => t.id === tubeId)
        if (!tube) throw new Error(`the system "${system.id}" has no tube "${tubeId}"`)
        if ('shareOf' in tube) {
          const parent = standing.get(tube.shareOf)
          if (!parent) throw new Error(`the tube "${tube.id}" takes a share of a tube that nothing has been done to`)
          // A share of a stirred tube: what the tube shows, in the volume of a share.
          return { ...parent, microlitres: microlitres(data.parameters.shareDrops.value), temperature: 'room' }
        }
        // A solid that is weighed in adds nothing to the volume.
        const volume = tube.contents.reduce((sum, content) => sum + ('drops' in content ? microlitres(parameterOf(data, content.drops)) : 0), 0)
        return { liquid: tube.shows.liquid, solid: tube.shows.solid, microlitres: volume, temperature: 'room' }
      }
      return {
        id: system.id,
        disturbances: system.disturbances.map((disturbance): DisturbanceModel => {
          const before = standing.get(disturbance.tube) ?? begin(disturbance.tube)
          const { action } = disturbance
          const portions = action.kind === 'add' && action.portions !== undefined ? parameterOf(data, action.portions) : 1
          if (disturbance.stages.length !== portions) throw new Error(`the disturbance "${disturbance.id}" stores ${disturbance.stages.length} stages for ${portions} portions`)
          const stages = disturbance.stages.map((stage, at): StageModel => ({
            liquid: stage.liquid,
            solid: stage.solid,
            microlitres: before.microlitres + (action.kind === 'add' ? (at + 1) * microlitres(parameterOf(data, action.drops)) : 0),
            // A tube that something is added to is back in the rack.
            temperature: action.kind === 'heat' ? 'hot' : action.kind === 'cool' ? 'cold' : 'room',
          }))
          standing.set(disturbance.tube, stages[stages.length - 1]!)
          return { id: disturbance.id, tube: disturbance.tube, kind: action.kind, portions, before, stages, ask: disturbance.ask.kind, right: disturbance.ask.right }
        }),
      }
    }),
  }
}
