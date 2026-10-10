import { brightestOf, rangeId, rangeOf, type FlameData } from '@/chem-data/flame/data'
import { spectrumOf, type Loop } from './loop'

// What a learner records at a station, from fixed choices, and whether it is right (spec 15.2): the colour of the
// flame, where on the scale the brightest thing in the spectroscope is, and whether that is a line or a band.

export const QUESTIONS = ['colour', 'range', 'kind'] as const
export type Question = (typeof QUESTIONS)[number]
export type Kind = 'line' | 'band'
/** What was recorded: one of each question's choices. */
export type Observation = { colour: string; range: string; kind: Kind }

/** The look at the flame itself. Every other look is at a line or a band, by its id. */
export const FLAME = 'flame'

const saltOf = (data: FlameData, saltId: string) => data.salts.find((salt) => salt.id === saltId)!

/**
 * What a question is answered from. The colours are the six flames' names in the order of the alphabet and the
 * ranges run along the scale, so that no station's answer is given by its place among the choices.
 */
export function choicesFor(data: FlameData, question: Question): readonly string[] {
  switch (question) {
    case 'colour':
      return data.salts.map((salt) => salt.flame.value.name).sort()
    case 'range':
      return data.parameters.ranges.value.map(rangeId)
    case 'kind':
      return ['line', 'band']
  }
}

/** What a correct observation of a salt holds: its flame's colour, the range its brightest feature lies in, and what kind of thing that feature is. */
export function expectedObservation(data: FlameData, saltId: string): Observation {
  const salt = saltOf(data, saltId)
  const brightest = brightestOf(salt)
  return { colour: salt.flame.value.name, range: rangeId(rangeOf(data, brightest)!), kind: brightest.kind }
}

/** The questions answered wrongly; an observation is correct when there are none. */
export function wrongAnswers(data: FlameData, saltId: string, observation: Observation): Question[] {
  const expected = expectedObservation(data, saltId)
  return QUESTIONS.filter((question) => observation[question] !== expected[question])
}

/** Everything there is to look at with this on the loop: the flame, then each line and band along the scale. */
export const looksOf = (data: FlameData, loop: Loop): string[] => [FLAME, ...spectrumOf(data, loop).map((seen) => seen.feature.id)]

/**
 * What has to have been looked at before a question opens: the flame for its colour; for the other two every line
 * and band the spectroscope shows, since which is the brightest cannot be said before all of them have been seen.
 */
export const looksOpening = (data: FlameData, loop: Loop, question: Question): string[] => (question === 'colour' ? [FLAME] : looksOf(data, loop).slice(1))
