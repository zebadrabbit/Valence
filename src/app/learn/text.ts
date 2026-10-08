import { PREDICTION, chapterAnnouncement, chapterAt, chapterHeading, pendingPrediction, predictionResults, predictionsOf, stepsOf, type Mechanism, type MechanismProgress, type MechanismState, type Mode } from '@/mechanisms'

// Everything the mechanism timeline's page says that is not in the mechanism's record or in the wording written
// before the page (src/mechanisms/wording.ts): the names of its controls, its few helper lines, and why a control
// cannot be used now. No chemistry is worded here but the three labels on the drawn beaker, and no figure is given.

/** What each mode does on a timeline. The lab shell's own two sentences speak of a checklist and of trials. */
export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided: play the timeline or step through it, with nothing asked.',
  challenge: 'Challenge: before each step you are asked what happens next. Your first answer is the one kept.',
}

export const PAGE_TEXT = {
  setAside:
    'A saved run of this timeline could not be opened in this version of Valence. It has been kept, and "Export my progress" on the Settings page includes it. The timeline starts fresh here.',
  /** The name of the 3D picture. */
  scene: '3D scene of the reaction, atom by atom',
  /** The one helper line under the scene. */
  sceneHint:
    'Point at a molecule or an ion, or tap it, to see its name. Drag to turn the scene; it is framed again when the timeline moves. Every ball is drawn much smaller than the atom or ion it stands for, so that the bonds can be seen.',
  loading: 'Loading the 3D scene…',
  /** After the sentence that the 3D model could not start or be drawn. */
  noScene: 'The scene is described in words here instead.',
  paused: 'The browser paused the 3D scene. It usually comes back by itself; if it does not, reload the page.',
  inScene: 'In the scene',
  takingPart: 'Taking part',
  lookingOn: 'Looking on',
  description: 'The scene in words',
  more: 'More about this chapter',
  link: 'Link to this chapter',
  timeline: 'Timeline',
  chapters: 'Chapters',
  /** Under the track: how long the step the timeline is in really takes. The track is not linear in time. */
  realTime: (label: string) => `Real time: ${label}`,
  play: 'Play',
  pause: 'Pause',
  replay: 'Play again from the start',
  /** Previous in the first chapter and Next in the last, which have no chapter to name. */
  toStart: 'To the start',
  toEnd: 'To the end',
  noPlay: 'Reduced motion is on, so nothing plays by itself. Use Next, or move the timeline.',
  prediction: 'Your prediction',
} as const

/** Why a press did nothing. */
export const REFUSAL = {
  first: 'This is the start of the timeline.',
  last: 'This is the end of the timeline.',
  answerFirst: 'Answer the question first. The timeline can still be moved by hand.',
} as const

export const ENERGY_TEXT = {
  chart: 'Free energy and enthalpy along the timeline, as two curves',
  steps: 'Step',
  barrier: 'Barrier',
  noBarrier: 'None drawn',
  /** On the free-energy curve: over a barrier, and at the level a step ends at, with where its height or its level is from. */
  onBarrier: (tag: string) => `barrier: ${tag}`,
  onLevel: (tag: string) => `level: ${tag}`,
  /** The name of the closed table of all four steps: it says what opening it shows. */
  caption: 'What each of the four steps changes',
  /** The name of the closed notes on the two curves. */
  about: 'What the curves show',
  now: 'the timeline is here',
  /** Under the curves: what of them is worked out and what is only drawn. */
  drawn: 'Between two levels each curve is a drawing. Only the levels, and the height of a barrier that has a value, are worked out.',
  worked: 'How each value was worked out',
  unsourced: "Where the atoms are between and around the reacting molecules is Valence's own choreography, not a measured or computed path. The timescales of steps 1 and 4 are everyday observations with no source.",
} as const

/** The two drawn beakers: what each picture is, and the labels written on it. */
export const BEAKER_TEXT = {
  before: 'A beaker of hydrochloric acid, and a spatula of white powder about to be tipped into it.',
  after: 'The beaker afterwards: a clear liquid, with the last few bubbles thinning out until there are none.',
  acid: 'hydrochloric acid',
  powder: 'sodium hydrogen carbonate',
  saltWater: 'salt water',
} as const

/** "hydronium ion, H₃O⁺": a species of the scene as its callout and the list beside the scene name it. */
export function speciesLabel(mechanism: Mechanism, one: MechanismState['species'][number]): string {
  const id = 'unit' in one ? one.unit : 'ion' in one ? one.ion : one.speciesId
  const species = mechanism.species.find((s) => s.id === id)
  if (!species) throw new Error(`no name for the species "${id}"`)
  return `${species.name}, ${species.formula}`
}

/**
 * The steps whose names Challenge keeps back: a step's title is the answer to its question, more or less, so it is
 * not shown on the track, on Next or anywhere else until the question is answered or the learner has gone into the
 * step. Nothing is kept back in Guided.
 */
export function withheld(mechanism: Mechanism, progress: MechanismProgress): ReadonlySet<string> {
  if (progress.mode !== 'challenge') return new Set()
  const answered = new Set(progress.answers.map((answer) => answer.questionId))
  return new Set(predictionsOf(mechanism).filter((p) => !answered.has(p.question.id) && progress.position <= p.at).map((p) => p.stepId))
}

/** A chapter as the page names it: its heading, or "Step 2 of 4" for a step whose name is kept back. */
export function chapterName(mechanism: Mechanism, chapterId: string, kept: ReadonlySet<string>): string {
  const steps = stepsOf(mechanism)
  return kept.has(chapterId) ? `Step ${steps.findIndex((step) => step.id === chapterId) + 1} of ${steps.length}` : chapterHeading(mechanism, chapterId)
}

/** A chapter as Previous and Next name it, in the room a button has: its title, or "Step 2" for a step whose name is kept back. */
export function chapterBrief(mechanism: Mechanism, chapterId: string, kept: ReadonlySet<string>): string {
  const chapter = mechanism.chapters.find((c) => c.id === chapterId)
  if (!chapter) throw new Error(`no chapter "${chapterId}"`)
  return kept.has(chapterId) ? `Step ${stepsOf(mechanism).findIndex((step) => step.id === chapterId) + 1}` : chapter.title
}

/** Where the timeline stands, as the slider says it: the chapter and how far through it. */
export function positionText(mechanism: Mechanism, t: number, kept: ReadonlySet<string>): string {
  const chapter = chapterAt(mechanism, t)
  const through = Math.round((100 * (t - chapter.range[0])) / (chapter.range[1] - chapter.range[0]))
  return `${chapterName(mechanism, chapter.id, kept)}, ${through <= 0 ? 'at its start' : through >= 100 ? 'at its end' : `${through}% of the way through`}`
}

/**
 * The scene in words as the page gives it. While a question waits it is the model's description less what would
 * answer the question: the step's name, and the sentence that says which species the step is about. At any other
 * time it is the model's description, whole.
 */
export function sceneWords(mechanism: Mechanism, progress: MechanismProgress, description: string): string {
  if (!pendingPrediction(mechanism, progress)) return description
  // ponytail: the sentence is found by the words it begins with, which are the model's (src/mechanisms/describe.ts).
  // If those change, the test of this function fails; the model handing over its sentences one by one would end that.
  const chapter = chapterAt(mechanism, progress.position)
  return description.replace(chapterHeading(mechanism, chapter.id), chapterName(mechanism, chapter.id, new Set([chapter.id]))).replace(/ Taking part: .*?\.(?= [A-Z]|$)/, '')
}

/** What is announced when the timeline enters a chapter (spec 9.1): the chapter, or the question where one waits. */
export function announcement(mechanism: Mechanism, progress: MechanismProgress): string {
  const question = pendingPrediction(mechanism, progress)
  return question ? `${PREDICTION.lead} ${question.prompt}` : chapterAnnouncement(mechanism, chapterAt(mechanism, progress.position).id)
}

/** Said once, when the end of the track is first reached: that it has been, and in Challenge how the predictions went. */
export function completedText(mechanism: Mechanism, progress: MechanismProgress): string {
  const results = progress.mode === 'challenge' ? predictionResults(mechanism, progress) : []
  const count = results.length === 0 ? '' : ` ${results.filter((result) => result.correct).length} of your ${results.length} ${results.length === 1 ? 'prediction was' : 'predictions were'} right.`
  return `You have reached the end of the timeline.${count}`
}
