import { describe, expect, it } from 'vitest'
import { findInstitutionText } from '@/chem-data/denylist'
import { registry } from '@/chem-data/registry'
import { PREDICTION, chapterAnnouncement, createProgress, describeMechanismState, hclNahco3 as mechanism, predictionsOf, reduce, state, type Action, type MechanismProgress } from '@/mechanisms'
import { SHELL_TEXT } from '@/app/lab/shellText'
import { BEAKER_TEXT, ENERGY_TEXT, MODE_TEXT, PAGE_TEXT, REFUSAL, announcement, chapterBrief, chapterName, completedText, positionText, sceneWords, speciesLabel, withheld } from './text'

const run = (from: MechanismProgress, ...actions: Action[]) => actions.reduce((progress, action) => reduce(mechanism, progress, action), from)
const strings = (texts: Record<string, unknown>) => Object.values(texts).filter((text): text is string => typeof text === 'string')
const [dissolving, protonTransfer] = predictionsOf(mechanism)
const right = (questionId: string) => predictionsOf(mechanism).find((p) => p.question.id === questionId)!.question.options.find((o) => o.correct)!.id
const wrongOne = (questionId: string) => predictionsOf(mechanism).find((p) => p.question.id === questionId)!.question.options.find((o) => !o.correct)!.id

describe("the mechanism page's own words", () => {
  it('say what each mode does on a timeline, and not in the words of a lab', () => {
    expect(MODE_TEXT.guided).toMatch(/^Guided: .*nothing asked\.$/)
    expect(MODE_TEXT.challenge).toMatch(/^Challenge: .*before each step.*what happens next.*first answer/)
    for (const mode of ['guided', 'challenge'] as const) expect(MODE_TEXT[mode]).not.toBe(SHELL_TEXT[mode])
  })

  it('name a species of the scene by its name and its formula, as its callout and the list beside the scene have it', () => {
    expect(state(mechanism, 0.3).species.map((one) => speciesLabel(mechanism, one))).toEqual(['sodium ion, Na⁺', 'hydrogen carbonate ion, HCO₃⁻', 'hydronium ion, H₃O⁺', 'water molecule, H₂O', 'chloride ion, Cl⁻'])
    // The solid is one thing, with one name, until it has come apart; and before it is added it is not there to name.
    expect(state(mechanism, 0.2).species.map((one) => speciesLabel(mechanism, one))).toEqual(['unit of solid sodium hydrogen carbonate, NaHCO₃', 'hydronium ion, H₃O⁺', 'water molecule, H₂O', 'chloride ion, Cl⁻'])
    expect(state(mechanism, 0.1).species.map((one) => speciesLabel(mechanism, one))).toEqual(['hydronium ion, H₃O⁺', 'water molecule, H₂O', 'chloride ion, Cl⁻'])
    expect(state(mechanism, 0.9).species.map((one) => speciesLabel(mechanism, one))).toEqual(['sodium ion, Na⁺', 'carbon dioxide molecule, CO₂', 'water molecule, H₂O', 'water molecule, H₂O', 'water molecule, H₂O', 'chloride ion, Cl⁻'])
    // At every position every species has a name: never an id.
    for (let i = 0; i <= 100; i++) for (const one of state(mechanism, i / 100).species) expect(speciesLabel(mechanism, one)).toMatch(/^([a-z ]+ (ion|molecule)|unit of solid [a-z ]+), \S+$/)
  })

  it('say where the timeline stands, for the slider: the chapter and how far through it', () => {
    expect(positionText(mechanism, 0, new Set())).toBe('In the beaker, at its start')
    expect(positionText(mechanism, 0.42, new Set())).toBe('Step 2 of 4: Proton transfer, 50% of the way through')
    expect(positionText(mechanism, 1, new Set())).toBe('Back in the beaker, at its end')
  })
})

describe('Challenge keeps the name of a step back until its question is answered or the step is behind', () => {
  const challenge = createProgress('challenge')

  it('keeps back nothing in Guided', () => {
    expect([...withheld(mechanism, createProgress('guided'))]).toEqual([])
  })

  it('keeps back every step that is still ahead and not answered', () => {
    expect([...withheld(mechanism, challenge)]).toEqual(['dissolving', 'proton-transfer', 'decomposition', 'gas-escapes'])
    // Standing at the question of step 1, its name is still kept back.
    const asked = run(challenge, { type: 'advance', t: 0.3 })
    expect(asked.position).toBe(dissolving!.at)
    expect([...withheld(mechanism, asked)]).toContain('dissolving')
    const answered = run(asked, { type: 'answer', questionId: 'dissolving', optionId: wrongOne('dissolving') })
    expect([...withheld(mechanism, answered)]).toEqual(['proton-transfer', 'decomposition', 'gas-escapes'])
  })

  it('gives a step its name once the learner has scrubbed into it, answered or not', () => {
    const scrubbed = run(challenge, { type: 'seek', t: 0.4 })
    expect([...withheld(mechanism, scrubbed)]).toEqual(['decomposition', 'gas-escapes'])
  })

  it('names a step that is kept back by its number alone, and everything else by its heading', () => {
    const kept = withheld(mechanism, challenge)
    expect(chapterName(mechanism, 'proton-transfer', kept)).toBe('Step 2 of 4')
    expect(chapterName(mechanism, 'proton-transfer', new Set())).toBe('Step 2 of 4: Proton transfer')
    expect(chapterName(mechanism, 'prologue', kept)).toBe('Before mixing')
    expect(chapterName(mechanism, 'beaker-end', kept)).toBe('Back in the beaker')
    expect(positionText(mechanism, 0.32, kept)).toBe('Step 2 of 4, at its start')
    // On a button, where there is less room: the title alone, or the number alone.
    expect(chapterBrief(mechanism, 'proton-transfer', kept)).toBe('Step 2')
    expect(chapterBrief(mechanism, 'proton-transfer', new Set())).toBe('Proton transfer')
    expect(chapterBrief(mechanism, 'beaker-end', kept)).toBe('Back in the beaker')
  })

  it('announces the question where one waits, without the name of the step, and the chapter everywhere else', () => {
    const asked = run(challenge, { type: 'advance', t: 0.3 })
    expect(announcement(mechanism, asked)).toBe(`${PREDICTION.lead} ${dissolving!.question.prompt}`)
    expect(announcement(mechanism, asked)).not.toContain('Dissolving')
    const answered = run(asked, { type: 'answer', questionId: 'dissolving', optionId: right('dissolving') })
    expect(announcement(mechanism, answered)).toBe(chapterAnnouncement(mechanism, 'dissolving'))
    for (const chapter of mechanism.chapters) expect(announcement(mechanism, run(createProgress('guided'), { type: 'seek', t: chapter.range[0] }))).toBe(chapterAnnouncement(mechanism, chapter.id))
  })
})

describe('the scene in words, while a question waits', () => {
  const words = (progress: MechanismProgress) => sceneWords(mechanism, progress, describeMechanismState(mechanism, progress.position, registry.elements))

  it('leaves out the name of the step and which species the step is about, and keeps the rest', () => {
    for (const prediction of predictionsOf(mechanism)) {
      const asked = run(createProgress('challenge'), { type: 'seek', t: prediction.at })
      const whole = describeMechanismState(mechanism, prediction.at, registry.elements)
      expect(whole).toContain('Taking part:')
      expect(words(asked)).not.toMatch(/Taking part|Dissolving|Proton transfer|Decomposition|Gas escapes/)
      expect(words(asked)).toMatch(/^Step \d of 4\. At its start\. In the scene: /)
      // Every other sentence is there, in its order.
      expect(whole.replace(/Step (\d) of 4: [A-Za-z ]+\./, 'Step $1 of 4.').replace(/ Taking part: .*? (centre to centre|a water molecule)\./, '')).toBe(words(asked))
    }
    // Before step 1 the solid is one unit in these words too: its two ions are the answer to the question.
    expect(words(run(createProgress('challenge'), { type: 'seek', t: 0.16 }))).toBe(
      'Step 1 of 4. At its start. In the scene: a unit of solid sodium hydrogen carbonate, a hydronium ion, a water molecule and a chloride ion. Over the whole of this step, free energy changes by +2.3 kJ/mol and enthalpy by +18.7 kJ/mol.',
    )
  })

  it('is the model\'s description, whole, wherever no question waits', () => {
    for (const progress of [run(createProgress('guided'), { type: 'seek', t: 0.16 }), run(createProgress('challenge'), { type: 'seek', t: 0.2 }), run(createProgress('challenge'), { type: 'seek', t: 0.16 }, { type: 'answer', questionId: 'dissolving', optionId: 'ions' })]) {
      expect(words(progress)).toBe(describeMechanismState(mechanism, progress.position, registry.elements))
    }
  })
})

describe('reaching the end', () => {
  it('is said in one sentence, and in Challenge with how many predictions were right', () => {
    expect(completedText(mechanism, run(createProgress('guided'), { type: 'seek', t: 1 }))).toBe('You have reached the end of the timeline.')
    const answers = predictionsOf(mechanism).flatMap((p, i): Action[] => [
      { type: 'advance', t: p.at },
      { type: 'answer', questionId: p.question.id, optionId: i === 1 ? wrongOne(p.question.id) : right(p.question.id) },
    ])
    const done = run(createProgress('challenge'), ...answers, { type: 'advance', t: 1 })
    expect(done.status).toBe('completed')
    expect(completedText(mechanism, done)).toBe('You have reached the end of the timeline. 3 of your 4 predictions were right.')
    // A run scrubbed to the end with nothing asked has no count.
    expect(completedText(mechanism, run(createProgress('challenge'), { type: 'seek', t: 1 }))).toBe('You have reached the end of the timeline.')
    const one = run(createProgress('challenge'), { type: 'advance', t: protonTransfer!.at }, { type: 'answer', questionId: 'dissolving', optionId: right('dissolving') }, { type: 'seek', t: 1 })
    expect(completedText(mechanism, one)).toBe('You have reached the end of the timeline. 1 of your 1 predictions were right.'.replace('1 predictions were', '1 prediction was'))
  })
})

describe('every sentence the page adds', () => {
  const all = [...strings(PAGE_TEXT), ...strings(ENERGY_TEXT), ...strings(REFUSAL), ...strings(BEAKER_TEXT), ...Object.values(MODE_TEXT)]

  it('is plain and scolds nobody, and holds no institution text', () => {
    expect(all.length).toBeGreaterThan(30)
    for (const text of all) {
      expect(text, text).not.toMatch(/wrong|fail|must|cannot|error|invalid|!|please|simply|just /i)
      expect(findInstitutionText(text, []), text).toBeNull()
      expect(text.trim(), text).toBe(text)
    }
  })

  it('gives no energy as a figure: the numbers the page prints are the record\'s, through the wording written before it', () => {
    for (const text of all) expect(text, text).not.toMatch(/\d kJ|kJ\/mol/)
  })

  it('says why a control cannot be used now, in a sentence each', () => {
    expect(REFUSAL.first).toBe('This is the start of the timeline.')
    expect(REFUSAL.last).toBe('This is the end of the timeline.')
    expect(REFUSAL.answerFirst).toMatch(/^Answer the question first\./)
    // Scrubbing is never held back, and the sentence says so.
    expect(REFUSAL.answerFirst).toContain('by hand')
  })

  it('says of the drawn curves that only their levels are worked out, and of the choreography that it is Valence\'s own', () => {
    expect(ENERGY_TEXT.drawn).toMatch(/Between two levels.*drawing/)
    expect(ENERGY_TEXT.unsourced).toMatch(/Valence's own.*not a measured or computed path/)
  })

  it('labels the track with the real time of a step, and the curve with what is a barrier and what a level', () => {
    expect(PAGE_TEXT.realTime('seconds')).toBe('Real time: seconds')
    expect(ENERGY_TEXT.onBarrier('not to scale')).toBe('barrier: not to scale')
    expect(ENERGY_TEXT.onLevel('derived')).toBe('level: derived')
  })

  it('tells a learner under reduced motion why there is no Play', () => {
    expect(PAGE_TEXT.noPlay).toMatch(/Reduced motion is on.*nothing plays by itself/)
  })
})
