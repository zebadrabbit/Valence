import { describe, expect, it } from 'vitest'
import { findInstitutionText } from '@/chem-data/denylist'
import { titrationData } from '@/chem-data/titration/data'
import { can, createLab, currentTrial, modelFrom, trialOutcome, warnings, type Action, type Blocked, type TitrationState, type TrialOutcome } from '@/engine/titration'
import { calculatedMolarityE6, honestReading, learner } from '@/engine/titration/testkit'
import spec from '../../../../docs/superpowers/specs/2026-10-03-valence-v1-design.md?raw'
import * as shellText from '../shellText'
import { percentErrorText, readingText } from './format'
import * as messages from './messages'
import {
  BLOCKED_TEXT,
  blockedText,
  CAUSE_TEXT,
  completedText,
  feedback,
  GUIDE_TRIAL_OVER,
  guideHeading,
  guideLine,
  hclRecordedText,
  INVALID_ENTRY_TEXT,
  NOTEBOOK_TEXT,
  OUTCOME_TEXT,
  outcomeLabel,
  readingRecordedText,
  rereadText,
  resultHeading,
  seedText,
  STEP_STATE_TEXT,
  STEP_TEXT,
  SUMMARY,
  tallyText,
  trialHeading,
  WARNING_BUTTONS,
  WARNING_TEXT,
  workedAverage,
  workedLines,
} from './messages'
import messagesFile from './messages.ts?raw'

// Optional, untracked: see registry.test.ts.
const local = import.meta.glob<string[]>('../../../chem-data/denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const m = modelFrom(titrationData)
const { run, readyTrial, prepared, titrateCarefully, carefulTrial } = learner()

/** A signed figure to two decimals with its percent sign. A bare percent sign is no percent error: the sentences say "within 1.0%". */
const PERCENT_ERROR = /[+−]\d+\.\d\d%/

// The outcomes the cases below are about.
const cleanPass: TrialOutcome = { state: 'passed', percentError: null, causes: [], counts: true }
const failedLow: TrialOutcome = { state: 'failed', percentError: -2.126, causes: ['burette-not-conditioned'], counts: false }
const failedAtTheEdge: TrialOutcome = { state: 'failed', percentError: 1.004, causes: [], counts: false }
// Within 1.0% with technique errors named in it: by the owner's decision of 2026-10-05 it does not count.
const closeWithErrors: TrialOutcome = { state: 'passed', percentError: null, causes: ['burette-not-conditioned', 'pipette-not-rinsed'], counts: false }
const notCounted: TrialOutcome = { state: 'passed', percentError: null, causes: ['final-misread'], counts: false }
const REASONS = ['overshot', 'ran-out', 'washed-out', 'discarded'] as const
const invalid = (reason: (typeof REASONS)[number]): TrialOutcome => ({ state: 'invalid', reason, causes: ['tip-bubble', 'pipette-not-rinsed'] })
const ended = [cleanPass, failedLow, failedAtTheEdge, closeWithErrors, notCounted, ...REASONS.map(invalid)]
/** The same outcome as it is given once three trials count. */
const afterCompletion = (outcome: TrialOutcome, percentError: number): TrialOutcome => (outcome.state === 'passed' ? { ...outcome, percentError } : outcome)

describe('feedback on a trial', () => {
  it('a clean pass that counts: one line with no percent error, the same before completion and after', () => {
    const lines = feedback(cleanPass, 0)
    expect(lines).toEqual([OUTCOME_TEXT.passed])
    expect(lines[0]).not.toMatch(PERCENT_ERROR)
    expect(feedback(afterCompletion(cleanPass, -0.126), 0)).toEqual(lines)
  })

  it('a failed trial at −2.126 with one technique cause: the figure and its direction, the cause, then that the lab makes such a mistake cost more', () => {
    const lines = feedback(failedLow, 0)
    expect(lines).toHaveLength(3)
    expect(lines[2]).toBe(OUTCOME_TEXT.largerHereAndShown)
    expect(lines[0]).toContain(percentErrorText(-2.126))
    expect(lines[0]).toContain('too low')
    expect(lines[0]).not.toContain('just outside')
    expect(lines[1]).toBe(CAUSE_TEXT['burette-not-conditioned'])
  })

  it('a failed trial at +1.004 reads +1.00%, and says it is just outside', () => {
    const lines = feedback(failedAtTheEdge, 0)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('+1.00%')
    expect(lines[0]).toContain('just outside')
    expect(lines[0]).toContain('too high')
  })

  it('a pass with two technique causes does not count: the sentence that says so, both causes in order, then the sentence on why a close result does not show sound technique; no percent error', () => {
    const lines = feedback(closeWithErrors, 0)
    expect(lines).toEqual([OUTCOME_TEXT.notCounted, CAUSE_TEXT['burette-not-conditioned'], CAUSE_TEXT['pipette-not-rinsed'], OUTCOME_TEXT.closeWithTechniqueError, OUTCOME_TEXT.largerHere])
    expect(lines.join(' ')).not.toMatch(PERCENT_ERROR)
    expect(feedback(afterCompletion(closeWithErrors, -0.021), 0)).toEqual(lines)
  })

  it('that sentence is said of a technique cause only: not under a misread alone, a failed trial or an invalid one', () => {
    for (const outcome of [notCounted, failedLow, ...REASONS.map(invalid)]) expect(feedback(outcome, 0)).not.toContain(OUTCOME_TEXT.closeWithTechniqueError)
    // One technique cause is enough, and a misread beside it changes nothing.
    const partBubble: TrialOutcome = { state: 'passed', percentError: null, causes: ['tip-bubble', 'final-misread'], counts: false }
    expect(feedback(partBubble, 0)).toEqual([OUTCOME_TEXT.notCounted, CAUSE_TEXT['tip-bubble'], CAUSE_TEXT['final-misread'], OUTCOME_TEXT.closeWithTechniqueError, OUTCOME_TEXT.largerHere])
  })

  it('it says that mistakes can cancel and that a small one may not show, without a word of luck, and the rule names the three technique steps beside the readings and the label', () => {
    expect(OUTCOME_TEXT.closeWithTechniqueError).toMatch(/opposite directions and cancel/)
    expect(OUTCOME_TEXT.closeWithTechniqueError).toMatch(/small/)
    expect(OUTCOME_TEXT.closeWithTechniqueError).toMatch(/does not show that the technique was sound/)
    expect(OUTCOME_TEXT.closeWithTechniqueError).not.toMatch(/luck|chance|fortun/i)
    for (const named of ['conditioned', 'air bubble', 'pipette', 'readings', 'label']) expect(OUTCOME_TEXT.notCounted).toContain(named)
    expect(Object.keys(OUTCOME_TEXT)).not.toContain('passedInSpite')
  })

  it('a pass with a misread final reading does not count: the sentence that says so, then the cause, and no percent error', () => {
    const lines = feedback(notCounted, 0)
    expect(lines).toEqual([OUTCOME_TEXT.notCounted, CAUSE_TEXT['final-misread']])
    expect(lines.join(' ')).not.toMatch(PERCENT_ERROR)
    expect(feedback(afterCompletion(notCounted, -0.232), 0)).toEqual(lines)
  })

  it.each(REASONS)('an invalid trial, %s: its sentence, then its technique causes, and no percent error', (reason) => {
    const lines = feedback(invalid(reason), 0)
    expect(lines).toEqual([OUTCOME_TEXT[reason], CAUSE_TEXT['tip-bubble'], CAUSE_TEXT['pipette-not-rinsed'], OUTCOME_TEXT.largerHere])
    expect(lines.join(' ')).not.toMatch(PERCENT_ERROR)
  })

  it("the overshot sentence gives the cue the primer's two answers, in order: the stream closed for single drops, then half-drops when a drop's pink is slow to fade", () => {
    const text = OUTCOME_TEXT.overshot
    const [stream, drops, halves] = [/close the stopcock when the pink is slow to fade/, /go on by single drops/, /change to half-drops when a drop's pink is slow to fade/].map((said) => text.search(said))
    expect(stream).toBeGreaterThan(-1)
    expect(drops).toBeGreaterThan(stream!)
    expect(halves).toBeGreaterThan(drops!)
    // Not half-drops as soon as any pink is slow to fade: the stream's is, a long way before a drop's.
    expect(text).not.toMatch(/half-drops once the pink is slow to fade/)
  })

  it("the ran-out sentence is the spec's, word for word", () => {
    expect(spec.includes(`message "${OUTCOME_TEXT['ran-out']}"`)).toBe(true)
  })

  it('a trial that a rinse ended at the last mark is not told that the burette ran out before the endpoint: it had one (seed 1384, a second trial with no refill)', () => {
    let lab = readyTrial(m, run(m, carefulTrial(m, prepared(m, 1384)), [{ type: 'startNextTrial' }]), { fill: false })
    while (can(m, lab, { type: 'deliver', amount: 'stream' }) === null) lab = run(m, lab, [{ type: 'deliver', amount: 'stream' }])
    lab = run(m, lab, [{ type: 'swirlAndWait' }, { type: 'recordFinalReading', readingUl: honestReading(lab.burette.levelUl) }, { type: 'addWater' }, { type: 'addWater' }])
    const trial = currentTrial(lab)
    expect([trial.end, lab.burette.levelUl]).toEqual(['ran-out', m.buretteCapacityUl])
    const outcome = trialOutcome(m, lab, trial)
    expect(outcomeLabel(outcome)).toBe('Invalid: pink rinsed away')
    expect(feedback(outcome, trial.waterUl)).toEqual([OUTCOME_TEXT['washed-out'], OUTCOME_TEXT.water])
    for (const said of [/^The rinse thinned the pink until it no longer shows\./, /50 mL mark/, /no more NaOH can be added to bring the pink back/, /no usable titre/, /Refill the burette before you start a trial\.$/]) {
      expect([String(said), said.test(OUTCOME_TEXT['washed-out'])]).toEqual([String(said), true])
    }
    expect(OUTCOME_TEXT['washed-out']).not.toMatch(/ran out|before the endpoint/)
  })

  it('water added: the note comes last, after every cause, whatever the outcome', () => {
    for (const outcome of ended) expect(feedback(outcome, 10000)).toEqual([...feedback(outcome, 0), OUTCOME_TEXT.water])
    expect(Object.values(CAUSE_TEXT)).not.toContain(OUTCOME_TEXT.water)
  })

  it('that the lab makes a technique mistake cost more than a real bench does is said once, after the causes, when a technique cause is named: in no cause\'s own sentence, and never without one', () => {
    const larger = /more than it does at a real bench/g
    for (const [cause, text] of Object.entries(CAUSE_TEXT)) expect([cause, text.match(larger)]).toEqual([cause, null])
    const threeCauses: TrialOutcome = { state: 'failed', percentError: -2.5, causes: ['burette-not-conditioned', 'tip-bubble', 'pipette-not-rinsed'], counts: false }
    for (const outcome of [failedLow, threeCauses, closeWithErrors, ...REASONS.map(invalid)]) expect(feedback(outcome, 10000).join(' ').match(larger)).toHaveLength(1)
    const misreadAndLabel: TrialOutcome = { state: 'failed', percentError: -2.5, causes: ['initial-misread', 'hcl-label-misrecorded'], counts: false }
    const noTechniqueCause: TrialOutcome[] = [cleanPass, failedAtTheEdge, notCounted, misreadAndLabel, { state: 'invalid', reason: 'overshot', causes: [] }]
    for (const outcome of noTechniqueCause) expect(feedback(outcome, 10000).join(' ').match(larger)).toBeNull()
    // After every cause, and before the note on water.
    expect(feedback(threeCauses, 10000).slice(-2)).toEqual([OUTCOME_TEXT.largerHereAndShown, OUTCOME_TEXT.water])
  })

  it('it says that the mistake shows in the result only under a failed trial: a trial that was close, or that has no result, is not told so', () => {
    const shown = /shows in the result/
    expect(OUTCOME_TEXT.largerHereAndShown).toMatch(shown)
    expect(OUTCOME_TEXT.largerHere).not.toMatch(shown)
    expect(feedback(failedLow, 0).join(' ')).toMatch(shown)
    for (const outcome of [closeWithErrors, ...REASONS.map(invalid)]) expect(feedback(outcome, 0).join(' ')).not.toMatch(shown)
  })

  it('under a failed trial it says so only when every cause named is a technique cause: beside a misread or a miscopied label the technique mistake may not be what shows (seed 1, Challenge)', () => {
    const last = (lab: TitrationState) => {
      const outcome = trialOutcome(m, lab, currentTrial(lab))
      return { outcome, lines: feedback(outcome, 0) }
    }
    // The burette not conditioned and the pipette not rinsed cancel exactly: read honestly this trial is within 1.0%.
    // With the final reading typed 0.60 mL high it fails, and the misread is what the result shows.
    let lab = titrateCarefully(m, prepared(m, 1, { condition: false, rinse: false })).state
    lab = run(m, lab, [{ type: 'recordFinalReading', readingUl: honestReading(lab.burette.levelUl) + 600 }])
    const { initialReadingUl, finalReadingUl } = currentTrial(lab)
    lab = run(m, lab, [{ type: 'submitMolarity', molarityE6: calculatedMolarityE6(m, lab.hclRecordedE6!, finalReadingUl! - initialReadingUl!) }])
    const misread = last(lab)
    expect(misread.outcome).toMatchObject({ state: 'failed', causes: ['burette-not-conditioned', 'pipette-not-rinsed', 'final-misread'] })
    expect(misread.lines[0]).toContain('−2.34%')
    expect(misread.lines.at(-1)).toBe(OUTCOME_TEXT.largerHere)
    // What is left of a bubble, 0.03 mL, pushes the molarity down; the label copied 0.0020 too high pushes it up and fails the trial.
    lab = run(m, prepared(m, 1, { clearBubble: false }), [...Array<Action>(19).fill({ type: 'deliver', amount: 'stream' }), { type: 'discardTrial' }, { type: 'startNextTrial' }])
    expect(lab.burette.tipAirUl).toBe(30)
    lab = carefulTrial(m, readyTrial(m, run(m, lab, [{ type: 'recordHclMolarity', molarityE6: lab.hclRecordedE6! + 2000 }])))
    const label = last(lab)
    expect(label.outcome).toMatchObject({ state: 'failed', causes: ['tip-bubble', 'hcl-label-misrecorded'] })
    expect(label.lines[0]).toContain('+1.77%')
    expect(label.lines[0]).toContain('too high')
    expect(label.lines[1]).toContain('the calculated molarity too low')
    expect(label.lines.at(-1)).toBe(OUTCOME_TEXT.largerHere)
    // With technique causes alone, readings honest and the label right, the technique is what failed the trial.
    const threeCauses: TrialOutcome = { state: 'failed', percentError: -2.5, causes: ['burette-not-conditioned', 'tip-bubble', 'pipette-not-rinsed'], counts: false }
    for (const outcome of [failedLow, threeCauses]) expect(feedback(outcome, 0).at(-1)).toBe(OUTCOME_TEXT.largerHereAndShown)
  })

  it('an open trial has none', () => {
    expect(feedback({ state: 'open' }, 10000)).toEqual([])
  })
})

describe('the Result cell', () => {
  it('reads in words for each of the eight cases', () => {
    expect([cleanPass, notCounted, failedLow, ...REASONS.map(invalid), { state: 'open' } as const].map(outcomeLabel)).toEqual([
      'Passed',
      'Passed, not counted',
      'Not passed, −2.13%',
      'Invalid: overshot',
      'Invalid: burette ran out',
      'Invalid: pink rinsed away',
      'Invalid: discarded',
      'In progress',
    ])
  })

  it('a passed trial reads the same before completion and after', () => {
    expect(outcomeLabel(afterCompletion(cleanPass, -0.126))).toBe('Passed')
    expect(outcomeLabel(afterCompletion(closeWithErrors, -0.021))).toBe('Passed, not counted')
    expect(outcomeLabel(afterCompletion(notCounted, -0.232))).toBe('Passed, not counted')
  })
})

describe("a trial with a technique error named in it, by the owner's decision of 2026-10-05", () => {
  it('seed 1, Challenge, the burette not conditioned and the pipette not rinsed: the two cancel, the trial is within 1.0% and does not count, and the feedback says why', () => {
    const lab = carefulTrial(m, prepared(m, 1, { condition: false, rinse: false }))
    const outcome = trialOutcome(m, lab, currentTrial(lab))
    expect(outcome).toMatchObject({ state: 'passed', counts: false, causes: ['burette-not-conditioned', 'pipette-not-rinsed'] })
    expect(outcomeLabel(outcome)).toBe('Passed, not counted')
    expect(feedback(outcome, 0)[0]).toBe(OUTCOME_TEXT.notCounted)
    expect(feedback(outcome, 0).slice(-2)).toEqual([OUTCOME_TEXT.closeWithTechniqueError, OUTCOME_TEXT.largerHere])
  })
})

describe('the technique causes a Challenge learner may never have met the words for', () => {
  it('the burette cause says what conditioning is, and the bubble cause how the tip is cleared and when: Challenge shows no warning, and only one primer card tells either', () => {
    expect(CAUSE_TEXT['burette-not-conditioned']).toMatch(/^The burette was not conditioned: it was not rinsed with a little of the NaOH solution before it was filled\./)
    expect(CAUSE_TEXT['tip-bubble']).toMatch(/Before an initial reading, run a little NaOH through the tip to push any bubble out\.$/)
    // The pipette cause already says what was not done.
    expect(CAUSE_TEXT['pipette-not-rinsed']).toMatch(/^The pipette was not rinsed with HCl\./)
    // Seed 7, Challenge, no technique step taken: the feedback itself tells both.
    const lab = carefulTrial(m, prepared(m, 7, { condition: false, clearBubble: false, rinse: false }))
    const outcome = trialOutcome(m, lab, currentTrial(lab))
    expect(outcome).toMatchObject({ state: 'failed', causes: ['burette-not-conditioned', 'tip-bubble', 'pipette-not-rinsed'] })
    const said = feedback(outcome, 0).join(' ')
    expect(said).toMatch(/rinsed with a little of the NaOH solution before it was filled/)
    expect(said).toMatch(/run a little NaOH through the tip/)
  })
})

describe('a reading that is refused', () => {
  it('the re-read sentence does not say which way the reading is off, and its only numbers are the typed reading, 0.02 and 0.00', () => {
    const text = rereadText(1300)
    for (const word of ['too high', 'too low', 'higher', 'lower', 'larger', 'smaller']) expect(text).not.toContain(word)
    expect(new Set(text.match(/\d+(\.\d+)?/g))).toEqual(new Set(['1.30', '0.02', '0.00']))
  })

  it('a final reading that can never follow the initial one: the sentence says the flask must be discarded, and it can be', () => {
    // Challenge, the initial reading typed 30.00 with the meniscus near 2.56: every honest final reading is below it.
    const lab = titrateCarefully(m, run(m, prepared(m, 1), [{ type: 'recordInitialReading', readingUl: 30000 }])).state
    expect(can(m, lab, { type: 'recordFinalReading', readingUl: honestReading(lab.burette.levelUl) })).toBe('final-not-after-initial')
    expect(can(m, lab, { type: 'recordInitialReading', readingUl: 2560 })).toBe('mid-titration')
    expect(can(m, lab, { type: 'discardTrial' })).toBeNull()
    expect(BLOCKED_TEXT['final-not-after-initial']).toContain('must be discarded')
    expect(BLOCKED_TEXT['final-not-after-initial']).toContain(NOTEBOOK_TEXT.discard)
  })
})

describe('the pipette rinse that is refused', () => {
  it('says why in a way that is true of a pipette that was rinsed and of one that an aliquot left wet with acid: it is wet with acid, and rinsing it changes nothing for this flask', () => {
    // Challenge: the aliquot is drawn with the pipette still wet with water, and the engine then refuses the rinse.
    const drawn = run(m, createLab(1, 'challenge'), [{ type: 'pipetteAliquot' }])
    expect(currentTrial(drawn).aliquot).toBe('diluted')
    expect(can(m, drawn, { type: 'rinsePipette' })).toBe('already-done')
    expect(can(m, run(m, createLab(1, 'challenge'), [{ type: 'rinsePipette' }]), { type: 'rinsePipette' })).toBe('already-done')
    expect(BLOCKED_TEXT['already-done']).toMatch(/already wet with acid/)
    expect(BLOCKED_TEXT['already-done']).toMatch(/changes nothing for this flask/)
    // It does not say that the pipette was rinsed, and gives nothing away about the aliquot.
    expect(BLOCKED_TEXT['already-done']).not.toMatch(/was rinsed|has been rinsed|dilut/)
  })
})

describe('the sentence for any reason the engine gives', () => {
  it('is the table’s, the entry’s, or the re-read sentence', () => {
    expect(blockedText('burette-empty')).toBe(BLOCKED_TEXT['burette-empty'])
    expect(blockedText('invalid-entry', 'molarity')).toBe(INVALID_ENTRY_TEXT.molarity)
    expect(blockedText('reread', 'reading', 1300)).toBe(rereadText(1300))
  })

  it('is a sentence for every reason, with or without what was typed', () => {
    const reasons: Blocked[] = [...(Object.keys(BLOCKED_TEXT) as Blocked[]), 'invalid-entry', 'reread']
    expect(reasons).toHaveLength(23)
    for (const reason of reasons) {
      expect([reason, blockedText(reason)]).toEqual([reason, expect.stringMatching(/^[A-Z].*[.]$/)])
      expect([reason, blockedText(reason, 'reading', 1300)]).toEqual([reason, expect.stringMatching(/^[A-Z0-9].*[.]$/)])
    }
  })
})

describe('count, not pass', () => {
  it('the sentences about completion and the summary say count', () => {
    for (const text of [BLOCKED_TEXT['lab-not-completed'], SUMMARY.heading, SUMMARY.waiting, SUMMARY.ask, SUMMARY.average, completedText('0.09502')]) {
      expect(text).toContain('count')
    }
  })
})

describe('the warnings', () => {
  it('have buttons for exactly the three actions that can raise one, and each does raise one in a Guided lab', () => {
    expect(Object.keys(WARNING_BUTTONS).sort()).toEqual(['fillBurette', 'pipetteAliquot', 'recordInitialReading'])
    const fresh = createLab(1, 'guided')
    expect(warnings(m, fresh, { type: 'fillBurette' })).toEqual(['burette-not-conditioned'])
    expect(warnings(m, fresh, { type: 'pipetteAliquot' })).toEqual(['pipette-not-rinsed'])
    const filled = run(m, fresh, [{ type: 'fillBurette' }])
    expect(warnings(m, filled, { type: 'recordInitialReading', readingUl: honestReading(filled.burette.levelUl) })).toEqual(['burette-not-conditioned', 'tip-bubble'])
  })

  it('the way on from a reading does not say to fill', () => {
    expect(WARNING_BUTTONS.recordInitialReading.on).not.toContain('Fill')
    expect(WARNING_BUTTONS.fillBurette.on).toContain('Fill')
  })

  it('each has a title and a body', () => {
    for (const { title, body } of Object.values(WARNING_TEXT)) {
      expect(title).not.toBe('')
      expect(body).toMatch(/[.]$/)
    }
  })
})

describe('the worked lines', () => {
  it("hold the learner's own numbers and stop before the answer", () => {
    const text = workedLines(97600, 2560, 28260).join('\n')
    for (const number of ['2.56', '28.26', '25.70', '0.0976', '25.00']) expect(text).toContain(number)
    expect(text.endsWith('= ?')).toBe(true)
    expect(text).not.toContain('0.0949')
    expect(text).not.toContain('0.0950')
  })

  it('the average is set out the same way', () => {
    const text = workedAverage([94900, 94800, 94900])
    expect(text).toContain('0.0949 + 0.0948 + 0.0949')
    expect(text.endsWith('= ?')).toBe(true)
  })
})

describe('the end of a trial and of the lab', () => {
  it('the completion line gives the true molarity as it was handed over, and says nothing of four', () => {
    expect(completedText('0.09502')).toContain('0.09502')
    expect(completedText('0.09502')).not.toContain('four')
  })

  it('the guide for a trial that is over does not say to start another: it is shown after completion too', () => {
    expect(GUIDE_TRIAL_OVER).not.toContain('next trial')
    expect(GUIDE_TRIAL_OVER).not.toContain('Start')
  })

  it('every step has a label for the first trial and for a later one, and every state a word', () => {
    expect(Object.keys(STEP_TEXT)).toHaveLength(11)
    for (const { first, later } of Object.values(STEP_TEXT)) expect([first, later]).not.toContain('')
    expect(STEP_TEXT.fill.later).toBe('Refill the burette with NaOH')
    expect(STEP_TEXT.aliquot.later).toBe('Pipette 25.00 mL of HCl into a clean flask')
    expect(STEP_STATE_TEXT).toEqual({ done: 'Done', next: 'Next', todo: 'To do', skipped: 'Skipped' })
  })
})

describe('the figures the sentences state', () => {
  it("are the model's", () => {
    expect(BLOCKED_TEXT['flask-has-aliquot']).toContain(readingText(m.pipetteNominalUl))
    expect(STEP_TEXT.aliquot.first).toContain(readingText(m.pipetteNominalUl))
    expect(BLOCKED_TEXT['calculation-mismatch']).toContain(readingText(m.pipetteNominalUl))
    expect(BLOCKED_TEXT['burette-at-bottom']).toContain(`${m.buretteCapacityUl / 1000} mL mark`)
    expect(OUTCOME_TEXT['washed-out']).toContain(`${m.buretteCapacityUl / 1000} mL mark`)
    expect(INVALID_ENTRY_TEXT.reading).toContain(readingText(m.buretteCapacityUl))
    expect(rereadText(1300)).toContain(readingText(m.readingToleranceUl))
    expect(OUTCOME_TEXT.notCounted).toContain(readingText(m.readingToleranceUl))
    for (const text of [OUTCOME_TEXT.passed, OUTCOME_TEXT.notCounted]) expect(text).toContain(`${m.gradeTolerancePercent.toFixed(1)}%`)
    expect(BLOCKED_TEXT['needs-indicator']).toContain(`${m.indicatorDrops[0]} or ${m.indicatorDrops[1]} drops`)
    expect(STEP_TEXT.indicator.first).toContain(`${m.indicatorDrops[0]} or ${m.indicatorDrops[1]} drops`)
    // In words: "three trials", "Three drops", "two drops".
    expect([m.passesToComplete, m.indicatorDrops[1], m.overshootUl / m.dropUl]).toEqual([3, 3, 2])
  })
})

describe('every sentence of the lab and of the shell', () => {
  const strings = (value: unknown): string[] =>
    typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : []
  const exported = [...strings(messages), ...strings(shellText)]
  // What the functions say for the cases above, each with the numbers it was given.
  const said: [text: string, given: string[]][] = [
    ...ended.flatMap((outcome): [string, string[]][] => {
      const given = outcome.state === 'failed' ? [Math.abs(outcome.percentError).toFixed(2)] : []
      return [...feedback(outcome, 10000), outcomeLabel(outcome)].map((text) => [text, given])
    }),
    [outcomeLabel({ state: 'open' }), []],
    [rereadText(1300), ['1.30']],
    [readingRecordedText('initial', 2040), ['2.04']],
    [readingRecordedText('final', 28260), ['28.26']],
    [hclRecordedText(97600), ['0.0976']],
    [seedText(1), []],
    [tallyText(2, 1, 3), []],
    [trialHeading(2), []],
    [resultHeading(2, outcomeLabel(invalid('overshot'))), []],
    [guideHeading(2), []],
    [guideLine(4, 11, STEP_TEXT['tip-bubble'].first), []],
    [blockedText('reread'), []],
    [workedLines(97600, 2560, 28260).join(' '), ['2.56', '28.26', '25.70', '0.0976']],
    [workedAverage([94900, 94800, 94900]), ['0.0949', '0.0948']],
    [completedText('0.09502'), ['0.09502']],
  ]

  it('there are more than 100 of them', () => {
    expect(exported.length + said.length).toBeGreaterThan(100)
  })

  it('none holds institution text', () => {
    for (const text of [...exported, ...said.map(([text]) => text)]) expect([text, findInstitutionText(text, institutionNames)]).toEqual([text, null])
  })

  it('the only numbers with two decimals are the fixed five and what was given, and with four or five the example 0.1234 and what was given', () => {
    const stray = (text: string, given: readonly string[] = []) =>
      (text.match(/\d+\.\d+/g) ?? []).filter((number) => {
        const decimals = number.split('.')[1]!.length
        if (decimals === 2) return ![...given, '0.00', '0.02', '24.30', '25.00', '50.00'].includes(number)
        return (decimals === 4 || decimals === 5) && ![...given, '0.1234'].includes(number)
      })
    for (const text of exported) expect([text, stray(text)]).toEqual([text, []])
    for (const [text, given] of said) expect([text, stray(text, given)]).toEqual([text, []])
  })

  it('"run out" is said only of a burette with nothing left to deliver, never of NaOH that has run from it into the flask', () => {
    const runOut = /\br[au]ns? out\b/
    const ofTheEmptyBurette = [OUTCOME_TEXT['ran-out'], outcomeLabel(invalid('ran-out'))]
    for (const text of [...exported, ...said.map(([text]) => text)]) expect([text, runOut.test(text)]).toEqual([text, ofTheEmptyBurette.includes(text)])
    // The two refusals that said it are met with the burette nowhere near empty.
    expect(BLOCKED_TEXT['needs-initial-reading']).toMatch(/Once NaOH has run from the burette, the starting level can no longer be read\./)
    expect(BLOCKED_TEXT['final-not-after-initial']).toMatch(/the reading grows as NaOH runs from the burette\./)
    expect(BLOCKED_TEXT['final-not-after-initial']).toMatch(/cannot be put right now that NaOH has run into the flask/)
  })

  it('none says that trials passed where it means that they count', () => {
    const passed = /three (passing )?trials (have )?passed|three passing trials|three passes/i
    for (const text of [...exported, ...said.map(([text]) => text)]) expect(text).not.toMatch(passed)
  })
})

describe('messages.ts', () => {
  it('takes neither the model nor the state, and only types from the engine', () => {
    expect(messagesFile).not.toMatch(/TitrationModel|TitrationState/)
    expect(messagesFile.match(/^import .*$/gm)?.filter((line) => line.includes('engine'))).toEqual([expect.stringMatching(/^import type \{/)])
  })
})
