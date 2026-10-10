import { ION_IDS, STEP_IDS, type IonId, type PartId, type StepId, type TubeId } from '@/chem-data/cations/data'
import type { CationsModel, PlaceModel } from './model'
import { addAmmonia, addChromate, addHydrochloricAcid, addNitricAcid, addWater, centrifuge, EMPTY_TUBE, hasSolid, heat, litmusOf, pourOff, sampleTube, showsOf, type Litmus, type Tube, type TubeShows } from './tube'

// One run of a part: the five steps of the scheme (spec 17.2), worked one at a time on three tubes. A run is
// stored as the list of things done in it, in order, and everything else (what each tube holds, what was seen,
// which step it has reached, what went wrong) is worked out again from that list each time it is read. So a stored
// run cannot disagree with itself, and the same list gives the same run. Nothing here depends on the mode: Guided's
// refusals and warnings are in actions.ts.
//
// A step goes one way. Its reagent goes in; the tube may be heated, centrifuged or tested as the step allows;
// both parts of the tube are looked at; what is seen is recorded; in part 1 the step's places on the flow chart
// are filled; and the step is checked, after which nothing is recorded or added. Steps 1, 2 and 4 then end with a
// pouring off, and steps 3 and 5 with the check itself. Anything that changes what the tube holds or where it
// lies empties what was looked at; adding or heating also empties what was recorded and placed.

/** The two parts of a tube that are looked at, as they lie in it: the liquid, and the bottom, where a solid settles. */
export const LOOKS = ['liquid', 'bottom'] as const
export type Look = (typeof LOOKS)[number]

/** What an observation records: the colour of the solid in the tube, or that there is none, and the colour of the liquid. */
export const FIELDS = ['solid', 'liquid'] as const
export type Field = (typeof FIELDS)[number]
export type Observation = Record<Field, string>

/** The three errors of technique (spec 17.3). */
export type Slip = 'poured-uncentrifuged' | 'water-not-heated' | 'judged-before-acid'

/** One thing done in a run, as it is stored. */
export type RunEvent =
  /** The step's reagent goes in. At step 5 this is one addition of nitric acid, and there may be several. */
  | { t: 'add' }
  | { t: 'heat' }
  | { t: 'spin' }
  | { t: 'litmus' }
  | { t: 'look'; at: Look }
  | { t: 'observe'; solid: string; liquid: string }
  | { t: 'place'; place: string; tile: string }
  | { t: 'unplace'; place: string; tile: string }
  | { t: 'check' }
  | { t: 'pour' }
  | { t: 'name'; ions: IonId[] }

export interface StepState {
  /** How many times the step's reagent has gone in: 0 or 1, and up to the tube's fill at step 5. */
  added: number
  heated: boolean
  /** What litmus last showed, since the last thing that went in; and whether it has shown the liquid acid at all. */
  litmus: Litmus | null
  acidShown: boolean
  looked: readonly Look[]
  observation: Observation | null
  /** What the tube showed when the observation was recorded: what the observation is held to. */
  showed: Observation | null
  /** The observation was recorded before litmus had shown the liquid acid. It matters at step 5. */
  beforeAcid: boolean
  /** The tiles put in each place of this step, in the order they went in. */
  places: Readonly<Record<string, readonly string[]>>
  checked: boolean
  slips: readonly Slip[]
  /** What the step's tube showed when the step was checked. */
  left: TubeShows | null
}

export interface RunState {
  /** The step being worked, from 0; 5 once all five are done. */
  step: number
  tubes: Readonly<Record<TubeId, Tube>>
  steps: readonly StepState[]
  /** Part 2: the ions the learner named; null until then. */
  named: readonly IonId[] | null
}

/** The tube each step is worked in: the first holds the sample and then the solid, the second the water poured off it, the third the ammonia poured off it. A test holds this to the record. */
export const STEP_TUBES: readonly TubeId[] = ['a', 'a', 'b', 'a', 'c']
/** The steps that end with a pouring off, by their places. */
const POURED = [0, 1, 3]
const LAST_STEP = STEP_IDS.length - 1

const NEW_STEP: StepState = { added: 0, heated: false, litmus: null, acidShown: false, looked: [], observation: null, showed: null, beforeAcid: false, places: {}, checked: false, slips: [], left: null }

export const newRunState = (m: CationsModel, ions: readonly IonId[]): RunState => ({ step: 0, tubes: { a: sampleTube(m, ions), b: EMPTY_TUBE, c: EMPTY_TUBE }, steps: STEP_IDS.map(() => NEW_STEP), named: null })

/** A run is over when there is nothing left to do in it: part 1 at the check of its last step, part 2 when its ions are named. */
export const isOver = (part: PartId, run: RunState): boolean => (part === 'known' ? run.step > LAST_STEP : run.named !== null)

/** What a tube shows, as an observation records it. */
export function observationOf(shows: TubeShows, m: CationsModel): Observation {
  return { solid: shows.solid?.colour ?? m.solidChoices[0]!, liquid: shows.liquid?.colour ?? m.plainLook }
}

/** The places of the flow chart that belong to a step. */
export const placesOf = (m: CationsModel, step: number): PlaceModel[] => m.places.filter((place) => place.step === step)

/** Why a thing cannot be done in a run as it stands. */
export type Refused =
  | 'run-over'
  | 'steps-done'
  | 'steps-not-done'
  | 'not-this-part'
  | 'not-this-step'
  | 'step-checked'
  | 'already-added'
  | 'tube-full'
  | 'add-first'
  | 'already-heated'
  | 'nothing-to-spin'
  | 'look-first'
  | 'observe-first'
  | 'check-first'
  | 'invalid-entry'
  | 'no-such-place'
  | 'no-such-tile'
  | 'already-placed'
  | 'not-placed'
  | 'places-empty'

const ADD = [addHydrochloricAcid, addWater, addChromate, addAmmonia, addNitricAcid] as const

/**
 * The run after one more thing is done in it, or why that cannot be done. A look at a part already looked at
 * changes nothing and gives back the very same run.
 */
export function apply(m: CationsModel, part: PartId, run: RunState, event: RunEvent): RunState | Refused {
  if (isOver(part, run)) return 'run-over'
  if (event.t === 'name') {
    if (part !== 'unknown') return 'not-this-part'
    if (run.step <= LAST_STEP) return 'steps-not-done'
    const ions = event.ions
    if (!Array.isArray(ions) || ions.some((ion, i) => !ION_IDS.includes(ion) || ions.indexOf(ion) !== i)) return 'invalid-entry'
    return { ...run, named: ION_IDS.filter((ion) => ions.includes(ion)) }
  }
  if (run.step > LAST_STEP) return 'steps-done'
  const at = run.step
  const step = run.steps[at]!
  const tubeId = STEP_TUBES[at]!
  const tube = run.tubes[tubeId]
  const withStep = (patch: Partial<StepState>, changed: Tube = tube, next: number = at): RunState => ({
    ...run,
    step: next,
    tubes: changed === tube ? run.tubes : { ...run.tubes, [tubeId]: changed },
    steps: run.steps.map((other, i) => (i === at ? { ...other, ...patch } : other)),
  })
  // What a change to the tube's contents empties: it is looked at, recorded and placed again.
  const emptied = { looked: [], observation: null, showed: null, beforeAcid: false, places: {}, litmus: null } satisfies Partial<StepState>

  switch (event.t) {
    case 'add':
      if (step.checked) return 'step-checked'
      if (step.added >= (at === LAST_STEP ? m.nitricAcidAdditions : 1)) return at === LAST_STEP ? 'tube-full' : 'already-added'
      return withStep({ ...emptied, added: step.added + 1 }, ADD[at]!(m, tube))
    case 'heat':
      if (at !== 1) return 'not-this-step'
      if (step.checked) return 'step-checked'
      if (step.added === 0) return 'add-first'
      if (step.heated) return 'already-heated'
      return withStep({ ...emptied, heated: true }, heat(m, tube))
    case 'spin':
      if (!(tube.suspended && hasSolid(tube))) return 'nothing-to-spin'
      // The solid has moved, so the tube is looked at again; what was recorded of its colours still holds.
      return withStep(step.checked ? {} : { looked: [] }, centrifuge(tube))
    case 'litmus': {
      if (at !== LAST_STEP) return 'not-this-step'
      if (step.checked) return 'step-checked'
      if (step.added === 0) return 'add-first'
      const litmus = litmusOf(tube)
      return withStep({ litmus, acidShown: step.acidShown || litmus === 'acid' })
    }
    case 'look':
      if (step.checked) return 'step-checked'
      if (step.added === 0) return 'add-first'
      if (!LOOKS.includes(event.at)) return 'invalid-entry'
      return step.looked.includes(event.at) ? run : withStep({ looked: [...step.looked, event.at] })
    case 'observe': {
      if (step.checked) return 'step-checked'
      if (step.added === 0) return 'add-first'
      if (!LOOKS.every((look) => step.looked.includes(look))) return 'look-first'
      if (!m.solidChoices.includes(event.solid) || !m.liquidChoices.includes(event.liquid)) return 'invalid-entry'
      return withStep({ observation: { solid: event.solid, liquid: event.liquid }, showed: observationOf(showsOf(m, tube), m), beforeAcid: !step.acidShown })
    }
    case 'place':
    case 'unplace': {
      if (part !== 'known') return 'not-this-part'
      if (step.checked) return 'step-checked'
      if (step.observation === null) return 'observe-first'
      const place = m.places.find((p) => p.id === event.place)
      if (!place) return 'no-such-place'
      if (place.step !== at) return 'not-this-step'
      if (!m.tiles.includes(event.tile)) return 'no-such-tile'
      const held = step.places[place.id] ?? []
      if (event.t === 'place') return held.includes(event.tile) ? 'already-placed' : withStep({ places: { ...step.places, [place.id]: [...held, event.tile] } })
      return held.includes(event.tile) ? withStep({ places: { ...step.places, [place.id]: held.filter((tile) => tile !== event.tile) } }) : 'not-placed'
    }
    case 'check': {
      if (step.checked) return 'step-checked'
      if (step.observation === null) return 'observe-first'
      if (part === 'known' && placesOf(m, at).some((place) => (step.places[place.id] ?? []).length === 0)) return 'places-empty'
      const slips: Slip[] = at === LAST_STEP && step.beforeAcid ? ['judged-before-acid'] : []
      return withStep({ checked: true, slips, left: showsOf(m, tube) }, tube, POURED.includes(at) ? at : at + 1)
    }
    case 'pour': {
      if (!POURED.includes(at)) return 'not-this-step'
      if (!step.checked) return 'check-first'
      const slips: Slip[] = [...(tube.suspended && hasSolid(tube) ? (['poured-uncentrifuged'] as const) : []), ...(at === 1 && !step.heated ? (['water-not-heated'] as const) : [])]
      // The liquid of step 1 is thrown away; that of step 2 goes into the second tube, and that of step 4 into the third.
      const into: TubeId | null = at === 0 ? null : at === 1 ? 'b' : 'c'
      const [left, filled] = pourOff(tube, into === null ? EMPTY_TUBE : run.tubes[into])
      const poured = withStep({ slips: [...step.slips, ...slips] }, left, at + 1)
      return into === null ? poured : { ...poured, tubes: { ...poured.tubes, [into]: filled } }
    }
  }
}

/** The run a list of events gives, or null where the list is not one a run could have: an event that cannot be done where it stands, or one that changes nothing. */
export function replay(m: CationsModel, part: PartId, ions: readonly IonId[], events: readonly RunEvent[]): RunState | null {
  let run = newRunState(m, ions)
  for (const event of events) {
    const next = apply(m, part, run, event)
    if (typeof next === 'string' || next === run) return null
    run = next
  }
  return run
}

/** The step's observation is what the tube showed when it was recorded. */
export const matches = (step: StepState): boolean => step.observation !== null && step.showed !== null && FIELDS.every((field) => step.observation![field] === step.showed![field])

/** The fields of an observation that are not what the tube showed. */
export const wrongFieldsOf = (observation: Observation, showed: Observation): Field[] => FIELDS.filter((field) => observation[field] !== showed[field])

/** A place holds the tiles that belong in it, all of them and no other. */
export const placeRight = (place: PlaceModel, held: readonly string[]): boolean => held.length === place.holds.length && place.holds.every((tile) => held.includes(tile))

/** Every place of a step holds what belongs in it. */
export const placesRight = (m: CationsModel, at: number, step: StepState): boolean => placesOf(m, at).every((place) => placeRight(place, step.places[place.id] ?? []))

/** Why a run does not count (spec 17.3). */
export type Reason =
  | { kind: Slip; step: StepId }
  /** An observation that is not what the tube showed. */
  | { kind: 'observation-wrong'; step: StepId }
  /** Part 1: a place of the flow chart that does not hold what belongs in it. */
  | { kind: 'chart-wrong' }
  /** Part 2: the ions named are not the ones the sample holds. */
  | { kind: 'ions-wrong' }

/**
 * A run judged (spec 17.3): it counts when the technique was right, each observation is what the tube showed
 * and, in part 1, every place of the flow chart holds what belongs in it or, in part 2, the ions named are the
 * ones the sample holds. The reasons it does not count, in the order of the steps; empty when it counts. Null for
 * a run that is not over. This reads the sample and is not part of the public surface.
 */
export function reasonsOf(m: CationsModel, part: PartId, ions: readonly IonId[], run: RunState): Reason[] | null {
  if (!isOver(part, run)) return null
  const reasons: Reason[] = run.steps.flatMap((step, at): Reason[] => [
    ...step.slips.map((kind): Reason => ({ kind, step: STEP_IDS[at]! })),
    ...(matches(step) ? [] : [{ kind: 'observation-wrong', step: STEP_IDS[at]! } as const]),
  ])
  if (part === 'known' && run.steps.some((step, at) => !placesRight(m, at, step))) reasons.push({ kind: 'chart-wrong' })
  if (part === 'unknown' && !(run.named!.length === ions.length && ions.every((ion) => run.named!.includes(ion)))) reasons.push({ kind: 'ions-wrong' })
  return reasons
}
