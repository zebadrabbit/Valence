// Scripted learners, for tests only: nothing in the app imports this file.
import { STEP_IDS, type IonId, type PartId } from '@/chem-data/cations/data'
import { scripted } from '../scripted'
import { can, reduce, type Action } from './actions'
import type { CationsModel } from './model'
import { LOOKS, type Observation } from './run'
import { partView, type TubeShows } from './select'
import type { CationsState } from './state'

/** Applies the actions in order; throws on one that cannot be done (see `scripted`). */
export const run = scripted<CationsModel, CationsState, Action>(can, reduce)

/** How a scripted learner works a run. Careful unless told otherwise; each slip is one of spec 17.3's, or a wrong entry. */
export interface Technique {
  /** The step (from 0) at which the liquid is poured off without a centrifuge: 0, 1 or 3. */
  uncentrifugedAt?: number
  /** False to pour the water of step 2 off cold. */
  heat?: boolean
  /** True to record what is seen at step 5 after one addition of acid, with no litmus. */
  judgeEarly?: boolean
  /** The step (from 0) at which the colour of the solid is recorded wrongly. */
  wrongSolidAt?: number
  /** Part 1: the step (from 0) at which a tile that does not belong is put in a place. */
  wrongTileAt?: number
  /** Part 2: name every ion but the ones the tubes showed; where they showed all three, the first alone, since a naming of none is not taken. */
  nameWrong?: boolean
}

/** What a learner records of a tube, from what is seen of it and nothing else. */
export const seen = (m: CationsModel, shows: TubeShows): Observation => ({ solid: shows.solid?.colour ?? m.solidChoices[0]!, liquid: shows.liquid?.colour ?? m.liquidChoices[0]! })

/** The ions a learner names, read off what the three confirming steps showed: a yellow solid at step 3, a grey to black one at step 4, a white one at step 5. */
export function deduced(m: CationsModel, state: CationsState, part: PartId): IonId[] {
  const solid = (at: number) => partView(m, state, part).steps[at]!.observation?.solid
  return [...(solid(4) === m.solidLook['silver-chloride'] ? (['silver'] as const) : []), ...(solid(2) === m.solidLook['lead-chromate'] ? (['lead'] as const) : []), ...(solid(3) === m.solidLook['mercury-and-amidochloride'] ? (['mercury-i'] as const) : [])]
}

/**
 * Works the step a part has reached, from its reagent to its end: the reagent, the bath at step 2, acid and litmus
 * until the paper shows acid at step 5, the centrifuge wherever a solid is spread through the liquid, both looks,
 * the observation, the step's places in part 1, the check where the mode has not made it, and the pouring off at
 * steps 1, 2 and 4. `through` is applied after every action.
 */
export function workStep(m: CationsModel, state: CationsState, part: PartId, how: Technique = {}, through: (s: CationsState) => CationsState = (s) => s): CationsState {
  const go = (actions: Action[]) => (state = run(m, state, actions, through))
  const view = () => partView(m, state, part)
  const at = STEP_IDS.indexOf(view().step!)
  const step = () => view().steps[at]!
  go([{ type: 'add', part }])
  if (at === 1 && how.heat !== false) go([{ type: 'heat', part }])
  if (at === 4 && !how.judgeEarly) {
    go([{ type: 'testLitmus', part }])
    while (step().litmus !== 'acid') go([{ type: 'add', part }, { type: 'testLitmus', part }])
  }
  if (how.uncentrifugedAt !== at && can(m, state, { type: 'centrifuge', part }) === null) go([{ type: 'centrifuge', part }])
  go(LOOKS.map((look): Action => ({ type: 'look', part, at: look })))
  const observation = seen(m, step().shows!)
  const wrong = m.solidChoices.find((choice) => choice !== observation.solid)!
  go([{ type: 'observe', part, observation: how.wrongSolidAt === at ? { ...observation, solid: wrong } : observation }])
  if (part === 'known') {
    const places = m.places.filter((place) => place.step === at)
    if (how.wrongTileAt === at) go([{ type: 'place', part, place: places[0]!.id, tile: m.tiles.find((tile) => !places[0]!.holds.includes(tile))! }])
    for (const place of places) for (const tile of place.holds) go([{ type: 'place', part, place: place.id, tile }])
  }
  if (!step().checked) go([{ type: 'checkStep', part }])
  if (can(m, state, { type: 'pourOff', part }) === null) go([{ type: 'pourOff', part }])
  return state
}

/**
 * One whole run of a part from untouched tubes: the five steps and, in part 2, the naming of the ions from what
 * the tubes showed, or of the first ion where they showed none. Careful unless told otherwise. A script that Guided
 * would refuse throws.
 */
export function wholeRun(m: CationsModel, state: CationsState, part: PartId, how: Technique = {}, through: (s: CationsState) => CationsState = (s) => s): CationsState {
  for (let at = 0; at < STEP_IDS.length; at++) state = workStep(m, state, part, how, through)
  if (part === 'known') return state
  const named = deduced(m, state, part)
  const others = (['silver', 'lead', 'mercury-i'] as const).filter((ion) => !named.includes(ion))
  // A naming of none is not taken. So a learner whose tubes showed none of the three, as they do after some slips, names the first; and so does one who is to name wrongly where all three were shown.
  const ions: IonId[] = how.nameWrong ? (others.length > 0 ? others : ['silver']) : named.length > 0 ? named : ['silver']
  return run(m, state, [{ type: 'nameIons', part, ions }], through)
}
