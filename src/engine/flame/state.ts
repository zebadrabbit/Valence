import { z } from 'zod'
import type { FlameData } from '@/chem-data/flame/data'
import { QUESTIONS, choicesFor, looksOf, looksOpening, wrongAnswers, type Observation } from './check'
import { HANDLING, isClean, type Loop } from './loop'

// The lab as plain data: the whole record saved for it. It holds what the learner did and recorded, as short
// strings, so a round trip through JSON gives back the same value. There is no seed: the lab is the same every
// time. What is judged (whether an observation counts, whether it is right, whether a station is done) is worked
// out on reading and stored nowhere, so a stored record cannot disagree with its own entries; the one stored
// judgement is the status, and the schema holds it to them.
//
// A change to this shape, or to anything a stored entry is judged against (a salt's flame colour, its features and
// their ranks, the answer ranges, the closing question), needs the flame entry's version raised
// (src/flame-version.test.ts).

const text = z.string().min(1)
const loopSchema = z.array(text)
const observationSchema = z.strictObject({ colour: text, range: text, kind: z.enum(['line', 'band']) })

const stationSchema = z.strictObject({
  /** What was on the loop when it was last held in the flame at this station; null before the first time. */
  held: loopSchema.nullable(),
  /** What has been looked at since then: the flame, and lines and bands by their ids, each once, in the order first looked at. */
  looked: z.array(text),
  /** The observation last recorded, with what was on the loop when it was made: it counts only if that was this station's salt alone. */
  observation: observationSchema.extend({ loop: loopSchema }).nullable(),
})

const stateSchema = z.strictObject({
  mode: z.enum(['guided', 'challenge']),
  status: z.enum(['in-progress', 'completed']),
  /** What the loop carries now. */
  loop: loopSchema,
  /** One for each salt, in the salts' order. */
  stations: z.array(stationSchema),
  /** The closing question's answer as last given. */
  closing: text.nullable(),
})

export type StationState = z.infer<typeof stationSchema>
export type FlameState = z.infer<typeof stateSchema>
export type Mode = FlameState['mode']

/** True for a loop the reducer could have left: salts of the record, each once, with the handling trace nowhere but first. */
const isLoop = (data: FlameData, loop: Loop): boolean => loop.every((entry, i) => loop.indexOf(entry) === i && (entry === HANDLING ? i === 0 : data.salts.some((salt) => salt.id === entry)))

/** True when an observation is one of each question's choices. */
export const isObservation = (data: FlameData, observation: Observation): boolean => QUESTIONS.every((question) => choicesFor(data, question).includes(observation[question]))

/** The questions that are open at a station: each once everything it asks about has been looked at. */
export const openQuestions = (data: FlameData, station: StationState) =>
  Object.fromEntries(QUESTIONS.map((question) => [question, station.held !== null && looksOpening(data, station.held, question).every((look) => station.looked.includes(look))])) as Record<(typeof QUESTIONS)[number], boolean>

/** A station is done when its observation was made with a clean loop and every answer is right (spec 15.2). */
export function stationDone(data: FlameData, saltId: string, station: StationState): boolean {
  const { observation } = station
  return observation !== null && isClean(observation.loop, saltId) && wrongAnswers(data, saltId, observation).length === 0
}

export const allStationsDone = (data: FlameData, stations: readonly StationState[]): boolean => data.salts.every((salt, i) => stations[i] !== undefined && stationDone(data, salt.id, stations[i]))

/** The status the entries give: completed when all six stations are done and the closing question is answered correctly. */
export const statusOf = (data: FlameData, state: Pick<FlameState, 'stations' | 'closing'>): FlameState['status'] =>
  allStationsDone(data, state.stations) && state.closing === data.closing.answer.value ? 'completed' : 'in-progress'

/**
 * The stored shape, held to the record it is read with: one entry for each salt; nothing stored that the reducer
 * would not have stored (a loop that holds something twice, a hold without the station's salt, a look at
 * something the hold does not show, an observation that is not of the choices or was made with a loop that could
 * not have been held there, a closing answer that is not a choice); and the status the entries give.
 */
export const flameStateSchema = (data: FlameData): z.ZodType<FlameState> =>
  stateSchema.superRefine((state, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    if (state.stations.length !== data.salts.length) return issue(['stations'], `expected ${data.salts.length} stations`)
    if (!isLoop(data, state.loop)) issue(['loop'], 'not a loop this lab could leave')
    state.stations.forEach((station, i) => {
      const { id } = data.salts[i]!
      const heldHere = (loop: Loop) => isLoop(data, loop) && loop.includes(id)
      if (station.held !== null && !heldHere(station.held)) issue(['stations', i, 'held'], "a loop held here carries the station's salt")
      const looks = station.held === null ? [] : looksOf(data, station.held)
      if (station.looked.some((look, at) => !looks.includes(look) || station.looked.indexOf(look) !== at)) issue(['stations', i, 'looked'], 'each is something the hold shows, once')
      if (station.observation !== null) {
        const { loop, ...observation } = station.observation
        if (station.held === null || !heldHere(loop) || !isObservation(data, observation)) issue(['stations', i, 'observation'], 'not an observation this station takes')
      }
    })
    if (state.closing !== null && !data.closing.choices.includes(state.closing)) issue(['closing'], 'not one of the choices')
    if (state.status !== statusOf(data, state)) issue(['status'], 'the status is not the one the entries give')
  })

/** A lab that has just been started: the loop as it was picked up, handled and not yet cleaned. */
export function createLab(data: FlameData, mode: Mode): FlameState {
  return { mode, status: 'in-progress', loop: [HANDLING], stations: data.salts.map(() => ({ held: null, looked: [], observation: null })), closing: null }
}
