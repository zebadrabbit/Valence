// What the app is shown. The selectors and the state are imported through the index, as the app imports them;
// the hidden values the cases are checked against come from the files below it.
import { describe, expect, it } from 'vitest'
import { mulberry32, type Rng } from '../rng'
import { flaskOf } from './actions'
import { compareToEquivalence, equivalenceUl, isPink } from './flask'
import {
  buretteView,
  checklist,
  countingTrials,
  createLab,
  currentTrial,
  flaskView,
  hclLabel,
  percentError,
  slowDownHint,
  summaryView,
  titrationStateSchema,
  trialOutcome,
  trueNaoh,
  type Action,
  type TitrationState,
  type Trial,
} from './index'
import { PINNED_MODEL as m } from './pinnedModel'
import { labSetup } from './setup'
import { calculatedMolarityE6, learner, type Technique } from './testkit'

/** Every state these tests build, kept for the checks at the end of the file that hold over all of them. */
const built = new Set<TitrationState>()
const keep = (s: TitrationState) => (built.add(s), s)
const { run, readyTrial, prepared, titrateCarefully, carefulTrial } = learner(keep)

const deliver = (amount: 'stream' | 'drop' | 'half'): Action => ({ type: 'deliver', amount })
const hcl = (molarityE6: number): Action => ({ type: 'recordHclMolarity', molarityE6 })
const initial = (readingUl: number): Action => ({ type: 'recordInitialReading', readingUl })
const final = (readingUl: number): Action => ({ type: 'recordFinalReading', readingUl })
const molarity = (molarityE6: number): Action => ({ type: 'submitMolarity', molarityE6 })
const act = (type: Exclude<Action['type'], 'setMode' | 'recordHclMolarity' | 'recordInitialReading' | 'deliver' | 'recordFinalReading' | 'submitMolarity' | 'recordSummary'>) =>
  ({ type }) as Action

/** The next trial of a lab whose trial has ended, up to an openable stopcock. */
const nextTrial = (s: TitrationState, t?: Technique) => readyTrial(m, run(m, s, [act('startNextTrial')]), t)
const titrate = (s: TitrationState) => titrateCarefully(m, s).state
/** The careful run's additions, without the swirl and wait that confirms the endpoint. */
const toEndpoint = (s: TitrationState) => run(m, s, titrateCarefully(m, s).additions.map((a) => deliver(a.amount)))
/** Types a final reading and then the molarity that follows from the notebook. */
function finish(s: TitrationState, finalUl: number): TitrationState {
  s = run(m, s, [final(finalUl)])
  return run(m, s, [molarity(calculatedMolarityE6(m, s.hclRecordedE6!, finalUl - currentTrial(s).initialReadingUl!))])
}
/** Stream until the trial ends: past the endpoint, or to the last mark. */
function streamOut(s: TitrationState): TitrationState {
  while (currentTrial(s).end === 'open') s = run(m, s, [deliver('stream')])
  return s
}
const reloaded = (s: TitrationState) => keep(titrationStateSchema.parse(JSON.parse(JSON.stringify(s))))

/** A trial's outcome as the app is given it; a percent error in it is to three decimals, as the plan gives them. */
function outcome(s: TitrationState, trial: Trial = currentTrial(s)) {
  const o = trialOutcome(m, s, trial)
  return 'percentError' in o && o.percentError !== null ? { ...o, percentError: o.percentError.toFixed(3) } : o
}
/**
 * The signed percent error of a graded trial's molarity, to three decimals, worked with the function the outcome
 * uses. The outcome holds a passed trial's back until three trials count, so its value is pinned here.
 */
const error = (s: TitrationState, trial: Trial = currentTrial(s)) => percentError(trial.molarityE6!, labSetup(m, s.seed).naohE5).toFixed(3)
const steps = (s: TitrationState) => checklist(m, s).map(({ step, state }) => `${step}: ${state}`)
const stepState = (s: TitrationState, step: string) => checklist(m, s).find((c) => c.step === step)?.state

/** Three careful trials: the lab is completed (seed 1: 0.0949, 0.0948, 0.0949). */
function completed(seed = 1): TitrationState {
  let s = carefulTrial(m, prepared(m, seed))
  for (let i = 0; i < 2; i++) s = carefulTrial(m, nextTrial(s))
  return s
}
/** The route D1 closes (seed 1, the burette never conditioned): one honest failed trial, then three final readings typed to fit. */
function d1Route(): TitrationState {
  let s = carefulTrial(m, prepared(m, 1, { condition: false }))
  for (const typedUl of [26240, 27120, 27670]) s = finish(titrate(nextTrial(s)), typedUl)
  return s
}

describe('the label and the true molarity', () => {
  it('the HCl label can be read on a new lab', () => {
    expect(hclLabel(m, createLab(1, 'guided'))).toBe('0.0976')
    expect(hclLabel(m, createLab(11, 'challenge'))).toBe('0.0952')
  })

  it('the true NaOH molarity is not given after one trial that counts, and is given on completion', () => {
    let s = carefulTrial(m, prepared(m, 1))
    expect(countingTrials(m, s)).toHaveLength(1)
    expect(trueNaoh(m, s)).toBeNull()
    s = carefulTrial(m, nextTrial(s))
    expect(trueNaoh(m, s)).toBeNull()
    s = carefulTrial(m, nextTrial(s))
    expect(s.status).toBe('completed')
    expect(trueNaoh(m, s)).toBe('0.09502')
  })

  it('it is not given after three trials that pass and do not count (the D1 route)', () => {
    const s = d1Route()
    expect(s.trials.map((t) => outcome(s, t).state)).toEqual(['failed', 'passed', 'passed', 'passed'])
    expect(trueNaoh(m, s)).toBeNull()
    expect(summaryView(m, s)).toBeNull()
  })
})

describe('the burette and the flask (seed 1)', () => {
  it('a new lab: an empty burette and an empty flask', () => {
    const s = createLab(1, 'guided')
    expect(buretteView(m, s)).toEqual({ filled: false, levelUl: 0, tipBubble: false, atBottom: false })
    expect(flaskView(m, s)).toEqual({ hasAliquot: false, indicatorDrops: 0, waterUl: 0, volumeUl: 0, pinkConcentration: 0, pink: false, overshot: false, plume: null, persistence: 'unchecked' })
  })

  it('a filled burette with air in its tip', () => {
    expect(buretteView(m, run(m, createLab(1, 'guided'), [act('fillBurette')]))).toEqual({ filled: true, levelUl: 1963, tipBubble: true, atBottom: false })
  })

  it('prepared, then one stream addition, then a swirl and wait', () => {
    let s = prepared(m, 1)
    expect(buretteView(m, s)).toEqual({ filled: true, levelUl: 2563, tipBubble: false, atBottom: false })
    expect(flaskView(m, s)).toMatchObject({ hasAliquot: true, indicatorDrops: 2, waterUl: 0, volumeUl: 25102, pink: false, overshot: false, plume: null, persistence: 'unchecked' })
    expect(flaskView(m, s).pinkConcentration).toBeLessThan(1e-15)
    s = run(m, s, [deliver('stream')])
    expect(flaskView(m, s).plume).toBe('fades-at-once')
    expect(flaskView(m, s).persistence).toBe('unchecked')
    s = run(m, s, [act('swirlAndWait')])
    expect(flaskView(m, s).persistence).toBe('faded')
  })

  it('the careful endpoint, the wait, and then drops to overshoot', () => {
    let s = toEndpoint(prepared(m, 1))
    const view = flaskView(m, s)
    expect(view).toMatchObject({ pink: true, volumeUl: 50802, overshot: false, plume: 'persists', persistence: 'unchecked' })
    expect(view.pinkConcentration.toExponential(2)).toBe('3.51e-6')
    s = run(m, s, [act('swirlAndWait')])
    expect(flaskView(m, s).persistence).toBe('persisted')
    while (currentTrial(s).end === 'open') s = run(m, s, [deliver('drop')])
    expect(flaskView(m, s).overshot).toBe(true)
  })

  it('a flask with water in it, and the burette at the last mark', () => {
    const washed = prepared(m, 1, { washes: 2 })
    expect(flaskView(m, washed)).toMatchObject({ waterUl: 20000, volumeUl: 45102 })
    const ranOut = streamOut(nextTrial(carefulTrial(m, prepared(m, 1)), { fill: false }))
    expect(currentTrial(ranOut).end).toBe('ran-out')
    expect(buretteView(m, ranOut)).toEqual({ filled: true, levelUl: 50000, tipBubble: false, atBottom: true })
  })
})

describe('a wash of distilled water (seed 6, a careful endpoint that the second wash thins to colourless)', () => {
  it('leaves no plume: water is not an addition of titrant, so nothing is said of the last addition until titrant runs again', () => {
    let s = titrateCarefully(m, prepared(m, 6)).state
    expect(flaskView(m, s)).toMatchObject({ pink: true, plume: 'persists', persistence: 'persisted' })
    s = run(m, s, [act('addWater')])
    expect(currentTrial(s)).toMatchObject({ lastAdditionUl: 0, waitedS: 0, deliveredUl: 25150 })
    expect(flaskView(m, s)).toMatchObject({ pink: true, plume: null, persistence: 'unchecked' })
    s = run(m, s, [act('addWater')])
    // The same titrant in more water: the flask is no longer pink, and the view does not call that a plume fading.
    expect(flaskView(m, s)).toMatchObject({ pink: false, pinkConcentration: 0, plume: null, persistence: 'unchecked' })
    s = run(m, s, [deliver('half')])
    expect(flaskView(m, s).plume).toBe('persists')
  })
})

describe('no answer leaves the engine through the flask (careful runs of seeds 1 to 10)', () => {
  it('until the flask is pink the view says of the chemistry only how the last plume faded, at once or slowly, and holds no number that follows the titrant still needed', { timeout: 60_000 }, () => {
    const said = new Map<string, unknown>()
    const stillNeeded = new Set<number>()
    for (let seed = 1; seed <= 10; seed++) {
      let s = prepared(m, seed)
      expect(flaskView(m, s)).toMatchObject({ pinkConcentration: 0, pink: false, plume: null })
      const { additions } = titrateCarefully(m, s)
      for (const a of additions) {
        s = run(m, s, [deliver(a.amount)])
        const { hasAliquot, indicatorDrops, waterUl, volumeUl, ...chemistry } = flaskView(m, s)
        // What went into the flask is the learner's own doing, and counting additions gives it: it tells nothing of what is still needed.
        expect([hasAliquot, indicatorDrops, waterUl, volumeUl]).toEqual([true, 2, 0, flaskOf(m, s).aliquotUl + 2 * m.indicatorDropUl + a.deliveredUl])
        expect(['fades-at-once', 'fades-slowly', 'persists']).toContain(chemistry.plume)
        if (a !== additions.at(-1)) {
          said.set(JSON.stringify(chemistry), chemistry)
          stillNeeded.add(equivalenceUl(flaskOf(m, s)) - a.deliveredUl)
        }
      }
      // The endpoint: the first pink that lasts, and only now a concentration to draw it with.
      expect(flaskView(m, s)).toMatchObject({ pink: true, plume: 'persists' })
      expect(flaskView(m, s).pinkConcentration).toBeGreaterThanOrEqual(m.faintPinkConcentration)
    }
    // More than a thousand flasks, each with its own volume still to run in, and the view tells two of them apart.
    expect(stillNeeded.size).toBeGreaterThan(1000)
    expect([...said.values()]).toEqual([
      { pinkConcentration: 0, pink: false, overshot: false, plume: 'fades-at-once', persistence: 'unchecked' },
      { pinkConcentration: 0, pink: false, overshot: false, plume: 'fades-slowly', persistence: 'unchecked' },
    ])
  })
})

describe('the hint to slow down', () => {
  it.each(['guided', 'challenge'] as const)('seed 1, %s: Guided shows it from 24 700 to 25 675 uL delivered, Challenge never', (mode) => {
    let s = prepared(m, 1, { mode }) // equivalence at 25 680.86 uL
    const additions = titrateCarefully(m, s).additions
    const shown: number[] = []
    for (const a of additions) {
      s = run(m, s, [deliver(a.amount)])
      if (slowDownHint(m, s)) shown.push(a.deliveredUl)
    }
    const expected = additions.map((a) => a.deliveredUl).filter((ul) => ul >= 24700 && ul <= 25675)
    expect([expected[0], expected.at(-1)]).toEqual([24700, 25675])
    expect(shown).toEqual(mode === 'guided' ? expected : [])
  })

  it("works from the flask's own equivalence volume (an unconditioned burette: 26 204.96 uL)", () => {
    let s = prepared(m, 1, { mode: 'guided', condition: false })
    while (currentTrial(s).deliveredUl < 25000) s = run(m, s, [deliver('stream')])
    expect(slowDownHint(m, s)).toBe(false)
    s = run(m, s, [deliver('stream')])
    expect([currentTrial(s).deliveredUl, slowDownHint(m, s)]).toEqual([25250, true])
  })

  it('is not shown for a trial that ran out within reach of its equivalence volume (seed 1384, Guided, water added last)', () => {
    let s = nextTrial(carefulTrial(m, prepared(m, 1384, { mode: 'guided' })), { fill: false })
    while (s.burette.levelUl < m.buretteCapacityUl) s = run(m, s, [deliver('stream')])
    // At the mark, 12.4 uL past equivalence and pink: nothing to slow down for.
    expect(currentTrial(s)).toMatchObject({ deliveredUl: 24388, end: 'open' })
    expect(slowDownHint(m, s)).toBe(false)
    s = run(m, s, [act('addWater'), act('addWater')])
    expect(currentTrial(s).end).toBe('ran-out')
    // Past equivalence and not pink: the hint's own conditions hold, and only the trial's end keeps it from showing.
    const flask = flaskOf(m, s)
    expect([compareToEquivalence(flask, -m.slowDownUl), isPink(m, flask)]).toEqual([1, false])
    expect(slowDownHint(m, s)).toBe(false)
  })
})

describe('the outcome of a trial (seed 1)', () => {
  it('an open trial', () => {
    expect(outcome(prepared(m, 1))).toEqual({ state: 'open' })
    expect(outcome(titrate(prepared(m, 1)))).toEqual({ state: 'open' })
  })

  it('the careful trial passes at -0.126 with no cause, and counts; its percent error is not given', () => {
    const s = carefulTrial(m, prepared(m, 1))
    expect(outcome(s)).toEqual({ state: 'passed', percentError: null, causes: [], counts: true })
    expect(error(s)).toBe('-0.126')
  })

  it('spec 7.3, a passing trial shows no percent error: it is held back until three trials count, then given for every graded trial', () => {
    // One passed trial's percent error would give the hidden molarity: 0.0949 at -0.126% is 0.09502.
    let s = carefulTrial(m, prepared(m, 1))
    s = carefulTrial(m, nextTrial(s))
    expect(s.trials.map((t) => outcome(s, t))).toEqual([
      { state: 'passed', percentError: null, causes: [], counts: true },
      { state: 'passed', percentError: null, causes: [], counts: true },
    ])
    expect(trueNaoh(m, s)).toBeNull()
    s = carefulTrial(m, nextTrial(s))
    expect(trueNaoh(m, s)).toBe('0.09502')
    expect(s.trials.map((t) => outcome(s, t))).toEqual([
      { state: 'passed', percentError: '-0.126', causes: [], counts: true },
      { state: 'passed', percentError: '-0.232', causes: [], counts: true },
      { state: 'passed', percentError: '-0.126', causes: [], counts: true },
    ])
    expect(s.trials.map((t) => error(s, t))).toEqual(['-0.126', '-0.232', '-0.126'])
  })

  it('a failed trial shows its percent error at once (D1), and a passed trial beside it still shows none', () => {
    let s = carefulTrial(m, prepared(m, 1, { rinse: false }))
    s = carefulTrial(m, nextTrial(s))
    expect(s.trials.map((t) => outcome(s, t))).toEqual([
      { state: 'failed', percentError: '1.873', causes: ['pipette-not-rinsed'], counts: false },
      { state: 'passed', percentError: null, causes: [], counts: true },
    ])
    expect(error(s)).toBe('-0.232')
  })

  it('all three technique errors together: failed, the three causes in order', () => {
    const s = carefulTrial(m, prepared(m, 1, { condition: false, clearBubble: false, rinse: false }))
    expect(outcome(s)).toMatchObject({ state: 'failed', causes: ['burette-not-conditioned', 'tip-bubble', 'pipette-not-rinsed'], counts: false })
  })

  it('Challenge, the initial reading typed 2.65 and the HCl typed 0.0967 (titre 25.61, molarity 0.0944): passed at -0.652, both named, does not count', () => {
    let s = run(m, createLab(1, 'challenge'), [hcl(96700), act('conditionBurette'), act('fillBurette'), act('clearTipBubble'), initial(2650)])
    s = titrate(run(m, s, [act('rinsePipette'), act('pipetteAliquot'), act('addIndicatorDrop'), act('addIndicatorDrop')]))
    s = run(m, s, [final(28260), molarity(94400)])
    expect(outcome(s)).toEqual({ state: 'passed', percentError: null, causes: ['initial-misread', 'hcl-label-misrecorded'], counts: false })
    expect(error(s)).toBe('-0.652')
  })

  it('the final reading typed 28.29, 27 uL off: passed at -0.232, the misread named, does not count', () => {
    const s = finish(titrate(prepared(m, 1)), 28290)
    expect(outcome(s)).toEqual({ state: 'passed', percentError: null, causes: ['final-misread'], counts: false })
    expect(error(s)).toBe('-0.232')
  })

  it('a reading 17 uL off is no cause, and the trial counts', () => {
    const s = finish(titrate(prepared(m, 1)), 28280)
    expect(outcome(s)).toEqual({ state: 'passed', percentError: null, causes: [], counts: true })
    expect(error(s)).toBe('-0.126')
  })

  it('a reading exactly 0.02 mL off is no cause, and one 0.03 mL off is (seed 11: meniscus at 1780 uL, then at 25 530)', () => {
    const graded = (initialUl: number, finalUl: number) => finish(titrate(run(m, prepared(m, 11), [initial(initialUl)])), finalUl)
    const typed = (initialUl: number, finalUl: number) => outcome(graded(initialUl, finalUl))
    expect(typed(1760, 25530)).toEqual({ state: 'passed', percentError: null, causes: [], counts: true })
    expect(typed(1750, 25530)).toEqual({ state: 'passed', percentError: null, causes: ['initial-misread'], counts: false })
    expect([error(graded(1760, 25530)), error(graded(1750, 25530))]).toEqual(['-0.199', '-0.199'])
    expect(typed(1780, 25550)).toMatchObject({ state: 'passed', causes: [], counts: true })
    expect(typed(1780, 25560)).toMatchObject({ state: 'passed', causes: ['final-misread'], counts: false })
  })

  it('a trial keeps the cause of the HCl molarity it was graded with, after the notebook has been put right', () => {
    let s = carefulTrial(m, run(m, prepared(m, 1), [hcl(96700)]))
    const expected = { state: 'passed', percentError: null, causes: ['hcl-label-misrecorded'], counts: false }
    expect(outcome(s)).toEqual(expected)
    expect(error(s)).toBe('-0.968')
    s = run(m, s, [hcl(97600)])
    expect(outcome(s)).toEqual(expected)
  })

  it("a technique error in a trial within 1.0% (the owner's decision of 2026-10-05): passed, the causes named, does not count", () => {
    // Unconditioned burette and unrinsed pipette: the two dilutions cancel, and the result is the careful trial's.
    const cancelled = carefulTrial(m, prepared(m, 1, { condition: false, rinse: false }))
    expect(outcome(cancelled)).toEqual({ state: 'passed', percentError: null, causes: ['burette-not-conditioned', 'pipette-not-rinsed'], counts: false })
    expect(error(cancelled)).toBe('-0.126')
    const withBubble = carefulTrial(m, prepared(m, 1, { clearBubble: false, rinse: false }))
    expect(outcome(withBubble)).toEqual({ state: 'passed', percentError: null, causes: ['tip-bubble', 'pipette-not-rinsed'], counts: false })
    expect(error(withBubble)).toBe('-0.442')
  })

  it('such a trial releases nothing: with two careful trials after it the lab is not done, no passed trial shows a percent error and the true molarity is not given; a third careful trial gives them all', () => {
    let s = carefulTrial(m, prepared(m, 1, { clearBubble: false, rinse: false }))
    for (let i = 0; i < 2; i++) s = carefulTrial(m, nextTrial(s))
    expect(s.status).toBe('in-progress')
    expect(countingTrials(m, s)).toEqual(s.trials.slice(1))
    expect(s.trials.map((t) => outcome(s, t))).toEqual([
      { state: 'passed', percentError: null, causes: ['tip-bubble', 'pipette-not-rinsed'], counts: false },
      { state: 'passed', percentError: null, causes: [], counts: true },
      { state: 'passed', percentError: null, causes: [], counts: true },
    ])
    expect(trueNaoh(m, s)).toBeNull()
    expect(summaryView(m, run(m, { ...s, status: 'completed' }, [{ type: 'recordSummary', meanE6: 94900, deviationE2: 0 }]))).toBeNull()
    s = carefulTrial(m, nextTrial(s))
    expect(s.status).toBe('completed')
    expect(trueNaoh(m, s)).toBe('0.09502')
    expect(s.trials.map((t) => outcome(s, t))).toEqual([
      { state: 'passed', percentError: '-0.442', causes: ['tip-bubble', 'pipette-not-rinsed'], counts: false },
      { state: 'passed', percentError: '-0.232', causes: [], counts: true },
      { state: 'passed', percentError: '-0.126', causes: [], counts: true },
      { state: 'passed', percentError: '-0.126', causes: [], counts: true },
    ])
    expect(s.trials.map((t) => error(s, t))).toEqual(['-0.442', '-0.232', '-0.126', '-0.126'])
  })

  it('an unconditioned burette: failed at -2.126, the burette named', () => {
    expect(outcome(carefulTrial(m, prepared(m, 1, { condition: false })))).toEqual({ state: 'failed', percentError: '-2.126', causes: ['burette-not-conditioned'], counts: false })
  })

  it('the D1 route: each final reading typed to fit passes at -0.021, with the burette and the misread named, and does not count', () => {
    const s = d1Route()
    expect(outcome(s, s.trials[0])).toEqual({ state: 'failed', percentError: '-2.126', causes: ['burette-not-conditioned'], counts: false })
    for (const trial of s.trials.slice(1)) {
      // Three trials that pass and none that counts: the lab is not done, so none of them shows a percent error.
      expect(outcome(s, trial)).toEqual({ state: 'passed', percentError: null, causes: ['burette-not-conditioned', 'final-misread'], counts: false })
      expect(error(s, trial)).toBe('-0.021')
    }
  })
})

describe('a trial that is invalid (seed 1)', () => {
  it('a streamed trial is overshot, with no cause', () => {
    expect(outcome(streamOut(prepared(m, 1)))).toEqual({ state: 'invalid', reason: 'overshot', causes: [] })
  })

  it('an overshot trial drawn with a wet pipette names the pipette', () => {
    expect(outcome(streamOut(prepared(m, 1, { rinse: false })))).toEqual({ state: 'invalid', reason: 'overshot', causes: ['pipette-not-rinsed'] })
  })

  it('an overshot trial run with the bubble not cleared names the bubble, also after a reload with two later trials added', () => {
    let s = streamOut(prepared(m, 1, { clearBubble: false }))
    const expected = { state: 'invalid', reason: 'overshot', causes: ['tip-bubble'] }
    expect(outcome(s)).toEqual(expected)
    s = run(m, carefulTrial(m, nextTrial(s)), [act('startNextTrial')])
    s = reloaded(s)
    expect(s.trials).toHaveLength(3)
    expect(outcome(s, s.trials[0])).toEqual(expected)
    expect(outcome(s, s.trials[1])).toMatchObject({ state: 'passed', causes: [], counts: true })
  })

  it('carries the technique causes only: all three in order, and never a misread or the label', () => {
    expect(outcome(streamOut(prepared(m, 1, { condition: false, clearBubble: false, rinse: false })))).toEqual({
      state: 'invalid',
      reason: 'overshot',
      causes: ['burette-not-conditioned', 'tip-bubble', 'pipette-not-rinsed'],
    })
    const careless = run(m, prepared(m, 1), [hcl(96700), initial(2650)])
    expect(outcome(streamOut(careless))).toEqual({ state: 'invalid', reason: 'overshot', causes: [] })
  })

  it('a trial that ran out', () => {
    const s = streamOut(nextTrial(carefulTrial(m, prepared(m, 1)), { fill: false }))
    expect(outcome(s)).toEqual({ state: 'invalid', reason: 'ran-out', causes: [] })
  })

  it('a trial that a wash of water ended at the last mark is told apart from one the burette ran out on (seed 1384, a second trial with no refill)', () => {
    // The stream ends at the mark just past this flask's endpoint, the pink lasts the wait and the final reading is taken.
    let s = nextTrial(carefulTrial(m, prepared(m, 1384)), { fill: false })
    while (s.burette.levelUl < m.buretteCapacityUl) s = run(m, s, [deliver('stream')])
    s = run(m, s, [act('swirlAndWait'), final(m.buretteCapacityUl)])
    expect([flaskView(m, s).persistence, currentTrial(s).finalReadingUl]).toEqual(['persisted', 50000])
    // The second wash thins the pink away. Nothing more can be delivered, so the trial is over: the stored end is the same.
    s = run(m, s, [act('addWater'), act('addWater')])
    expect(currentTrial(s)).toMatchObject({ end: 'ran-out', lastAdditionUl: 0, waterUl: 20000 })
    expect(outcome(s)).toEqual({ state: 'invalid', reason: 'washed-out', causes: [] })
    // Water before the titrant, and the stream to the mark with the flask never pink: the burette ran out.
    const dry = streamOut(nextTrial(carefulTrial(m, prepared(m, 1)), { fill: false, washes: 2 }))
    expect(currentTrial(dry)).toMatchObject({ end: 'ran-out', waterUl: 20000 })
    expect(outcome(dry)).toEqual({ state: 'invalid', reason: 'ran-out', causes: [] })
  })

  it('a discarded trial, with what had gone wrong in it', () => {
    expect(outcome(run(m, createLab(1, 'challenge'), [act('discardTrial')]))).toEqual({ state: 'invalid', reason: 'discarded', causes: [] })
    expect(outcome(run(m, createLab(1, 'challenge'), [act('pipetteAliquot'), act('discardTrial')]))).toEqual({ state: 'invalid', reason: 'discarded', causes: ['pipette-not-rinsed'] })
    // A reading taken with the bubble in the tip harms nothing until titrant runs.
    const withBubble = prepared(m, 1, { clearBubble: false })
    expect(outcome(run(m, withBubble, [act('discardTrial')]))).toEqual({ state: 'invalid', reason: 'discarded', causes: [] })
    expect(outcome(run(m, withBubble, [deliver('stream'), act('discardTrial')]))).toEqual({ state: 'invalid', reason: 'discarded', causes: ['tip-bubble'] })
  })
})

describe('the summary (seed 1, three careful trials: 0.0949, 0.0948, 0.0949)', () => {
  it('is not given until the learner has entered their own, and then stands beside it', () => {
    let s = completed()
    expect(s.trials.map((t) => t.molarityE6)).toEqual([94900, 94800, 94900])
    expect(summaryView(m, s)).toBeNull()
    s = run(m, s, [{ type: 'recordSummary', meanE6: 94900, deviationE2: 47 }])
    expect(summaryView(m, s)).toEqual({ meanE6: 94900, deviationTenths: 4, learnerMeanE6: 94900, learnerDeviationE2: 47 })
  })

  it("leaves the learner's numbers as typed, whatever they are", () => {
    const s = run(m, completed(), [{ type: 'recordSummary', meanE6: 95000, deviationE2: 100 }])
    expect(summaryView(m, s)).toEqual({ meanE6: 94900, deviationTenths: 4, learnerMeanE6: 95000, learnerDeviationE2: 100 })
  })

  it('is worked from the trials that count only (a failed first trial, then three careful ones)', () => {
    let s = carefulTrial(m, prepared(m, 1, { rinse: false }))
    for (let i = 0; i < 3; i++) s = carefulTrial(m, nextTrial(s))
    expect(s.status).toBe('completed')
    expect(s.trials[0]!.molarityE6).toBe(96800)
    const counted = countingTrials(m, s).map((t) => t.molarityE6!)
    expect(counted).toHaveLength(3)
    expect(counted).not.toContain(96800)
    s = run(m, s, [{ type: 'recordSummary', meanE6: 94900, deviationE2: 0 }])
    expect(summaryView(m, s)!.meanE6).toBe(Math.round(counted.reduce((a, b) => a + b, 0) / 300) * 100)
  })
})

describe('records no lab could make', () => {
  it('completed, with a summary and no trial that counts: no summary and no true molarity', () => {
    const none = reloaded({ ...createLab(1, 'challenge'), status: 'completed', summary: { meanE6: 94900, deviationE2: 47 } })
    expect(summaryView(m, none)).toBeNull()
    expect(trueNaoh(m, none)).toBeNull()
    // Three trials that pass and do not count are no better.
    const notHonest = reloaded({ ...d1Route(), status: 'completed', summary: { meanE6: 95000, deviationE2: 0 } })
    expect(summaryView(m, notHonest)).toBeNull()
    expect(trueNaoh(m, notHonest)).toBeNull()
  })

  it('three trials that count, a summary, and a status that says in progress: both are given, whatever the status says', () => {
    const s = reloaded({ ...run(m, completed(), [{ type: 'recordSummary', meanE6: 94900, deviationE2: 47 }]), status: 'in-progress' })
    expect(trueNaoh(m, s)).toBe('0.09502')
    expect(summaryView(m, s)).toEqual({ meanE6: 94900, deviationTenths: 4, learnerMeanE6: 94900, learnerDeviationE2: 47 })
  })

  it('a flask with no aliquot is empty, whatever else the trial says went into it', () => {
    const lab = run(m, createLab(1, 'challenge'), [act('fillBurette')])
    const s = reloaded({ ...lab, trials: [{ ...lab.trials[0]!, indicatorDrops: 3, deliveredUl: 30000, lastAdditionUl: 250, waitedS: 30 }] })
    expect(isPink(m, flaskOf(m, s))).toBe(true)
    expect(flaskView(m, s)).toEqual({ hasAliquot: false, indicatorDrops: 3, waterUl: 0, volumeUl: 0, pinkConcentration: 0, pink: false, overshot: false, plume: null, persistence: 'faded' })
  })

  it('a graded trial with no molarity is open', () => {
    const lab = createLab(1, 'challenge')
    const s = reloaded({ ...lab, trials: [{ ...lab.trials[0]!, end: 'graded' }] })
    expect(trialOutcome(m, s, s.trials[0]!)).toEqual({ state: 'open' })
  })

  it('a graded trial with no readings names no misread and does not count', () => {
    const graded = carefulTrial(m, prepared(m, 1))
    const s = reloaded({ ...graded, trials: [{ ...graded.trials[0]!, startLevelUl: null, initialReadingUl: null, endLevelUl: null, finalReadingUl: null }] })
    expect(outcome(s)).toEqual({ state: 'passed', percentError: null, causes: [], counts: false })
    expect(error(s)).toBe('-0.126')
  })

  it('three trials that count and a status that says in progress: the percent errors are given with the true molarity, whatever the status says', () => {
    const s = reloaded({ ...completed(), status: 'in-progress' })
    expect(trueNaoh(m, s)).toBe('0.09502')
    expect(s.trials.map((t) => outcome(s, t))).toMatchObject([{ percentError: '-0.126' }, { percentError: '-0.232' }, { percentError: '-0.126' }])
  })
})

describe('the checklist', () => {
  const recorded = () => run(m, createLab(1, 'guided'), [hcl(97600)])

  it('a new lab: eleven steps, the label next and ten to do', () => {
    expect(steps(createLab(1, 'guided'))).toEqual([
      'hcl: next',
      'condition: todo',
      'fill: todo',
      'tip-bubble: todo',
      'initial-reading: todo',
      'rinse-pipette: todo',
      'aliquot: todo',
      'indicator: todo',
      'titrate: todo',
      'final-reading: todo',
      'molarity: todo',
    ])
  })

  it('calls the label step done only for the molarity the label prints: one miscopied in Challenge is next again in Guided, until it is put right', () => {
    // Recorded as 0.1234 in Challenge, where any molarity is taken, and the mode changed before the first trial is begun.
    let s = run(m, createLab(1, 'challenge'), [hcl(123400), { type: 'setMode', mode: 'guided' }, act('conditionBurette'), act('fillBurette')])
    expect(steps(s).slice(0, 4)).toEqual(['hcl: next', 'condition: done', 'fill: done', 'tip-bubble: todo'])
    s = run(m, s, [hcl(97600)])
    expect(steps(s).slice(0, 4)).toEqual(['hcl: done', 'condition: done', 'fill: done', 'tip-bubble: next'])
  })

  it('after the label, conditioning and filling, the tip is next; cleared, the fill is still done at 2563 uL and the reading is next', () => {
    let s = run(m, recorded(), [act('conditionBurette'), act('fillBurette')])
    expect(steps(s).slice(0, 5)).toEqual(['hcl: done', 'condition: done', 'fill: done', 'tip-bubble: next', 'initial-reading: todo'])
    s = run(m, s, [act('clearTipBubble')])
    expect(s.burette.levelUl).toBe(2563)
    expect(s.burette.levelUl).toBeGreaterThan(m.fillLevelMaxUl)
    expect(steps(s).slice(0, 5)).toEqual(['hcl: done', 'condition: done', 'fill: done', 'tip-bubble: done', 'initial-reading: next'])
  })

  it('filled unconditioned: conditioning is skipped, and the tip is next', () => {
    const s = run(m, recorded(), [act('fillBurette')])
    expect(steps(s).slice(0, 4)).toEqual(['hcl: done', 'condition: skipped', 'fill: done', 'tip-bubble: next'])
    // Conditioning then puts it right: the burette is empty again, and the fill is next.
    expect(steps(run(m, s, [act('conditionBurette')])).slice(0, 4)).toEqual(['hcl: done', 'condition: done', 'fill: next', 'tip-bubble: todo'])
  })

  it('prepared carefully: eight done, titrate next, the final reading and the molarity to do', () => {
    const s = prepared(m, 1, { mode: 'guided' })
    expect(steps(s)).toEqual([
      'hcl: done',
      'condition: done',
      'fill: done',
      'tip-bubble: done',
      'initial-reading: done',
      'rinse-pipette: done',
      'aliquot: done',
      'indicator: done',
      'titrate: next',
      'final-reading: todo',
      'molarity: todo',
    ])
  })

  it('the indicator step is done at two drops, the fewest the stopcock opens for', () => {
    let s = run(m, recorded(), [act('pipetteAliquot'), act('addIndicatorDrop')])
    expect(stepState(s, 'indicator')).toBe('todo')
    s = run(m, s, [act('addIndicatorDrop')])
    expect(stepState(s, 'indicator')).toBe('done')
  })

  it('titrate is done once a swirl and wait has shown the pink to last, and not before', () => {
    let s = toEndpoint(prepared(m, 1))
    expect(steps(s).slice(8)).toEqual(['titrate: next', 'final-reading: todo', 'molarity: todo'])
    s = run(m, s, [act('swirlAndWait')])
    expect(steps(s).slice(8)).toEqual(['titrate: done', 'final-reading: next', 'molarity: todo'])
    s = run(m, s, [final(28260)])
    expect(steps(s).slice(8)).toEqual(['titrate: done', 'final-reading: done', 'molarity: next'])
    // A further half-drop takes the reading and the confirmation away.
    expect(steps(run(m, s, [deliver('half')])).slice(8)).toEqual(['titrate: next', 'final-reading: todo', 'molarity: todo'])
  })

  it('trial 2 after a careful trial 1, nothing done: eight steps, the label done and the fill next', () => {
    const s = run(m, carefulTrial(m, prepared(m, 1)), [act('startNextTrial')])
    expect(steps(s)).toEqual(['hcl: done', 'fill: next', 'initial-reading: todo', 'aliquot: todo', 'indicator: todo', 'titrate: todo', 'final-reading: todo', 'molarity: todo'])
  })

  it('trial 2 with an initial reading recorded and no refill: the fill is next and the reading done', () => {
    const s = run(m, carefulTrial(m, prepared(m, 1)), [act('startNextTrial'), initial(28260)])
    expect(steps(s).slice(0, 3)).toEqual(['hcl: done', 'fill: next', 'initial-reading: done'])
  })

  it('trial 2 after an unconditioned trial 1: conditioning is listed, skipped; once conditioned and filled it is gone and the tip is listed', () => {
    let s = run(m, carefulTrial(m, prepared(m, 1, { condition: false })), [act('startNextTrial')])
    expect(steps(s)).toEqual([
      'hcl: done',
      'condition: skipped',
      'fill: next',
      'initial-reading: todo',
      'aliquot: todo',
      'indicator: todo',
      'titrate: todo',
      'final-reading: todo',
      'molarity: todo',
    ])
    s = run(m, s, [act('conditionBurette'), act('fillBurette')])
    expect(steps(s)).toEqual([
      'hcl: done',
      'fill: done',
      'tip-bubble: next',
      'initial-reading: todo',
      'aliquot: todo',
      'indicator: todo',
      'titrate: todo',
      'final-reading: todo',
      'molarity: todo',
    ])
  })

  it('a later trial lists the pipette rinse while the pipette is wet with water, and conditioning while the burette is unconditioned', () => {
    const s = run(m, recorded(), [act('discardTrial'), act('startNextTrial')])
    expect(steps(s)).toEqual([
      'hcl: done',
      'condition: next',
      'fill: todo',
      'initial-reading: todo',
      'rinse-pipette: todo',
      'aliquot: todo',
      'indicator: todo',
      'titrate: todo',
      'final-reading: todo',
      'molarity: todo',
    ])
  })

  it('skipped wins over done: a reading taken with the bubble in the tip, still skipped after 5 mL when no air is left', () => {
    let s = prepared(m, 1, { clearBubble: false })
    expect(stepState(s, 'tip-bubble')).toBe('skipped')
    while (currentTrial(s).deliveredUl < 5250) s = run(m, s, [deliver('stream')])
    expect(s.burette.tipAirUl).toBe(0)
    expect(stepState(s, 'tip-bubble')).toBe('skipped')
    // Before the reading the step is only waiting; clearing the tip then does it.
    const filled = run(m, recorded(), [act('conditionBurette'), act('fillBurette')])
    expect(stepState(run(m, filled, [act('clearTipBubble'), initial(2560)]), 'tip-bubble')).toBe('done')
  })

  it('skipped wins over done: an aliquot drawn unrinsed, though the pipette is then wet with acid', () => {
    const s = prepared(m, 1, { rinse: false })
    expect(s.pipetteRinsed).toBe(true)
    expect(stepState(s, 'rinse-pipette')).toBe('skipped')
    expect(stepState(prepared(m, 1), 'rinse-pipette')).toBe('done')
  })

  it('a step skipped in a later trial stays in the list', () => {
    // Trial 2 on a pipette still wet with water: the aliquot wets it with acid, and the step is not dropped.
    let s = run(m, recorded(), [act('discardTrial'), act('startNextTrial'), act('pipetteAliquot')])
    expect(stepState(s, 'rinse-pipette')).toBe('skipped')
    // Trial 2 conditioned, so with a new bubble: read with it in the tip, and it escapes over the first 5 mL.
    s = nextTrial(carefulTrial(m, prepared(m, 1)), { condition: true })
    expect(stepState(s, 'tip-bubble')).toBe('skipped')
    while (currentTrial(s).deliveredUl < 5250) s = run(m, s, [deliver('stream')])
    expect(s.burette.tipAirUl).toBe(0)
    expect(stepState(s, 'tip-bubble')).toBe('skipped')
    // In the trial after it there is no air and nothing was skipped: the step is not listed.
    expect(stepState(run(m, streamOut(s), [act('startNextTrial')]), 'tip-bubble')).toBeUndefined()
  })

  it('a trial that has ended has no next step: what was done or skipped stays so, and the rest is to do', () => {
    const overshot = streamOut(prepared(m, 1, { rinse: false }))
    expect(steps(overshot)).toEqual([
      'hcl: done',
      'condition: done',
      'fill: done',
      'tip-bubble: done',
      'initial-reading: done',
      'rinse-pipette: skipped',
      'aliquot: done',
      'indicator: done',
      'titrate: todo',
      'final-reading: todo',
      'molarity: todo',
    ])
    const ranOut = streamOut(nextTrial(carefulTrial(m, prepared(m, 1)), { fill: false }))
    const discarded = run(m, recorded(), [act('conditionBurette'), act('discardTrial')])
    for (const s of [overshot, ranOut, discarded]) {
      expect(currentTrial(s).end).not.toBe('open')
      expect(steps(s).filter((line) => line.endsWith(': next'))).toEqual([])
    }
    expect(steps(ranOut)).toEqual(['hcl: done', 'fill: todo', 'initial-reading: done', 'aliquot: done', 'indicator: done', 'titrate: todo', 'final-reading: todo', 'molarity: todo'])
    expect(steps(discarded).slice(0, 3)).toEqual(['hcl: done', 'condition: done', 'fill: todo'])
    expect(new Set(steps(carefulTrial(m, prepared(m, 1))).map((line) => line.split(': ')[1]))).toEqual(new Set(['done']))
  })
})

describe('over every state these tests built', () => {
  it('counts agrees with countingTrials for every trial, and a passing trial counts exactly when no cause is named in it: no technique error, no misread, and the label right', { timeout: 60_000 }, () => {
    const seen = { counting: 0, passedOnly: 0, passedWithTechniqueOnly: 0, failed: 0, invalid: 0, open: 0 }
    for (const s of built) {
      const counting = countingTrials(m, s)
      for (const trial of s.trials) {
        const o = trialOutcome(m, s, trial)
        const counts = 'counts' in o && o.counts
        expect(counts).toBe(counting.includes(trial))
        if (o.state === 'passed') {
          // The hand-made trial with no readings has nothing to name and does not count.
          if (trial.initialReadingUl !== null) expect(counts).toBe(o.causes.length === 0)
          seen[counts ? 'counting' : 'passedOnly']++
          // The trials the owner's decision of 2026-10-05 is about: honest readings, the label right, and a technique error.
          if (o.causes.length > 0 && o.causes.every((cause) => cause === 'burette-not-conditioned' || cause === 'tip-bubble' || cause === 'pipette-not-rinsed')) seen.passedWithTechniqueOnly++
        } else {
          expect(counts).toBe(false)
          seen[o.state]++
        }
      }
    }
    for (const [kind, count] of Object.entries(seen)) expect(count, kind).toBeGreaterThan(0)
  })

  it('the hint is false whenever the current trial has ended, in Guided too, a ran-out trial included', () => {
    const ends = new Set<string>()
    for (const s of built) {
      const { end } = currentTrial(s)
      if (end === 'open') continue
      ends.add(end)
      expect(slowDownHint(m, { ...s, mode: 'guided' })).toBe(false)
    }
    expect([...ends].sort()).toEqual(['discarded', 'graded', 'overshot', 'ran-out'])
  })
})

/** A record the schema accepts, whether or not a lab could make it. */
function randomRecord(rng: Rng): TitrationState {
  const whole = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1))
  const chance = (p: number) => rng() < p
  const oneOf = <T>(values: readonly T[]): T => values[whole(0, values.length - 1)]!
  // A volume a lab could store, or the largest whole number the schema lets through.
  const count = () => (chance(0.9) ? whole(0, 60000) : Number.MAX_SAFE_INTEGER)
  const orNull = (value: number) => (chance(0.25) ? null : value)
  const seed = chance(0.5) ? 1 : whole(0, 4294967295)
  const { hclE4, naohE5 } = labSetup(m, seed)
  const trial = (index: number): Trial => {
    const startLevelUl = whole(0, 2600)
    const endLevelUl = startLevelUl + whole(20000, 28000)
    // Four in ten are trials as a careful learner leaves them, so that some records have three that count.
    if (chance(0.4)) {
      return {
        index,
        aliquot: 'clean',
        indicatorDrops: 2,
        waterUl: 0,
        titrantDiluted: false,
        startLevelUl,
        initialReadingUl: startLevelUl,
        deliveredUl: endLevelUl - startLevelUl,
        lastAdditionUl: 25,
        waitedS: 30,
        endLevelUl,
        finalReadingUl: endLevelUl,
        hclUsedE6: hclE4 * 100,
        molarityE6: Math.round(naohE5 / 10) * 100,
        end: 'graded',
      }
    }
    return {
      index,
      aliquot: oneOf(['none', 'clean', 'diluted'] as const),
      indicatorDrops: whole(0, 3),
      waterUl: whole(0, 30000),
      titrantDiluted: chance(0.5),
      startLevelUl: orNull(count()),
      initialReadingUl: orNull(count()),
      deliveredUl: count(),
      lastAdditionUl: count(),
      waitedS: oneOf([0, 30, count()]),
      endLevelUl: orNull(count()),
      finalReadingUl: orNull(count()),
      hclUsedE6: orNull(chance(0.5) ? hclE4 * 100 : count()),
      molarityE6: orNull(chance(0.5) ? naohE5 * 10 + whole(-2000, 2000) : count()),
      end: oneOf(['open', 'graded', 'overshot', 'ran-out', 'discarded'] as const),
    }
  }
  return {
    seed,
    mode: oneOf(['guided', 'challenge'] as const),
    status: oneOf(['in-progress', 'completed'] as const),
    hclRecordedE6: orNull(count()),
    pipetteRinsed: chance(0.5),
    burette: { conditioned: chance(0.5), filled: chance(0.5), diluted: chance(0.5), levelUl: whole(0, 50000), tipAirUl: chance(0.5) ? 0 : whole(0, 600) },
    trials: Array.from({ length: whole(1, 6) }, (_, index) => trial(index)),
    summary: chance(0.5) ? null : { meanE6: count(), deviationE2: count() },
  }
}

describe('no selector throws on a record that passes the schema', () => {
  it('2000 random records, most of them ones no lab could make', { timeout: 60_000 }, () => {
    const rng = mulberry32(7)
    const seen = new Set<string>()
    for (let i = 0; i < 2000; i++) {
      const s = titrationStateSchema.parse(JSON.parse(JSON.stringify(randomRecord(rng))))
      expect(hclLabel(m, s)).toMatch(/^0\.\d{4}$/)
      const burette = buretteView(m, s)
      expect(burette.levelUl).toBe(s.burette.levelUl)
      const flask = flaskView(m, s)
      expect([flask.volumeUl, flask.pinkConcentration].every(Number.isFinite)).toBe(true)
      seen.add(`flask ${flask.persistence}`)
      expect(typeof slowDownHint(m, s)).toBe('boolean')
      for (const t of s.trials) seen.add(`trial ${trialOutcome(m, s, t).state}`)
      const list = checklist(m, s)
      expect(list.filter((c) => c.state === 'next').length).toBeLessThanOrEqual(1)
      for (const c of list) seen.add(`step ${c.state}`)
      const naoh = trueNaoh(m, s)
      const view = summaryView(m, s)
      if (naoh !== null) seen.add('true molarity')
      if (view !== null) {
        expect(Object.values(view).every(Number.isFinite)).toBe(true)
        expect(naoh).not.toBeNull()
        seen.add('summary')
      }
    }
    // The sample reached every kind of answer, so the loop above was not asked only the easy ones.
    expect([...seen].sort()).toEqual([
      'flask faded',
      'flask persisted',
      'flask unchecked',
      'step done',
      'step next',
      'step skipped',
      'step todo',
      'summary',
      'trial failed',
      'trial invalid',
      'trial open',
      'trial passed',
      'true molarity',
    ])
  })
})

describe('the public surface', () => {
  it('gives the app these values and no other: nothing of flask.ts or setup.ts, and so no hidden value', async () => {
    expect(Object.keys(await import('./index')).sort()).toEqual([
      'buretteView',
      'can',
      'checklist',
      'countingTrials',
      'createLab',
      'currentTrial',
      'endpointConfirmed',
      'flaskView',
      'followsFromNotebook',
      'hclLabel',
      'modelFrom',
      'parseDeviation',
      'parseMolarity',
      'parseReading',
      'percentError',
      'reduce',
      'slowDownHint',
      'summarise',
      'summaryView',
      'titrationStateSchema',
      'trialOutcome',
      'trueNaoh',
      'warnings',
      'withinTolerance',
    ])
  })
})
