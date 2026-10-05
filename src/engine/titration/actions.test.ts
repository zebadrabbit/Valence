// The state machine: what can be done when, and what each action does. Cases that hold a check of spec 7.4 carry
// its number and its sentence in their names.
import { describe, expect, it } from 'vitest'
import { mulberry32, type Rng } from '../rng'
import { can, countingTrials, endpointConfirmed, flaskOf, reduce, warnings, type Action, type Blocked } from './actions'
import { followsFromNotebook, percentError, withinTolerance } from './entries'
import { compareToEquivalence, equivalenceUl, flaskChemistry, isPink } from './flask'
import type { TitrationModel } from './model'
import { PINNED_MODEL as m } from './pinnedModel'
import { labSetup, trialSetup } from './setup'
import { createLab, currentTrial, titrationStateSchema, type Mode, type TitrationState, type Trial } from './state'
import { calculatedMolarityE6, honestReading, learner, type Technique } from './testkit'

const { run, readyTrial, prepared, titrateCarefully, finishHonestly, carefulTrial } = learner()

const deliver = (amount: 'stream' | 'drop' | 'half'): Action => ({ type: 'deliver', amount })
const hcl = (molarityE6: number): Action => ({ type: 'recordHclMolarity', molarityE6 })
const initial = (readingUl: number): Action => ({ type: 'recordInitialReading', readingUl })
const final = (readingUl: number): Action => ({ type: 'recordFinalReading', readingUl })
const molarity = (molarityE6: number): Action => ({ type: 'submitMolarity', molarityE6 })
const summary = (meanE6: number, deviationE2: number): Action => ({ type: 'recordSummary', meanE6, deviationE2 })
const act = (type: Exclude<Action['type'], 'setMode' | 'recordHclMolarity' | 'recordInitialReading' | 'deliver' | 'recordFinalReading' | 'submitMolarity' | 'recordSummary'>) =>
  ({ type }) as Action
const setMode = (mode: Mode): Action => ({ type: 'setMode', mode })

/** What is done at the bench, and what is typed into a trial. */
const BENCH: Action[] = [
  act('conditionBurette'),
  act('fillBurette'),
  act('clearTipBubble'),
  act('rinsePipette'),
  act('pipetteAliquot'),
  act('addIndicatorDrop'),
  act('addWater'),
  deliver('half'),
  act('swirlAndWait'),
]
const ENTRIES: Action[] = [initial(2560), final(28260), molarity(94900)]

/** A blocked action gives its reason and leaves the state the very same object. */
function expectBlocked(s: TitrationState, action: Action, reason: Blocked) {
  expect(can(m, s, action), action.type).toBe(reason)
  expect(reduce(m, s, action), action.type).toBe(s)
}
const expectAllowed = (s: TitrationState, action: Action) => expect(can(m, s, action), action.type).toBeNull()

/** The next trial of a lab whose trial has ended, up to an openable stopcock. */
const nextTrial = (s: TitrationState, t?: Technique) => readyTrial(m, run(m, s, [act('startNextTrial')]), t)
const titrate = (s: TitrationState) => titrateCarefully(m, s).state
/** Types a final reading and then the molarity that follows from the notebook. */
function finish(s: TitrationState, finalUl: number): TitrationState {
  s = run(m, s, [final(finalUl)])
  const trial = currentTrial(s)
  return run(m, s, [molarity(calculatedMolarityE6(m, s.hclRecordedE6!, finalUl - trial.initialReadingUl!))])
}
/** How a graded trial is judged. `passes` is worked out here: the selectors that say it are a later file. */
function verdict(s: TitrationState, trial: Trial = currentTrial(s)) {
  const { naohE5 } = labSetup(m, s.seed)
  return {
    molarityE6: trial.molarityE6,
    percent: percentError(trial.molarityE6!, naohE5).toFixed(3),
    passes: withinTolerance(m, trial.molarityE6!, naohE5),
    counts: countingTrials(m, s).includes(trial),
  }
}
const pink = (s: TitrationState) => flaskChemistry(m, flaskOf(m, s)).pinkConcentration

describe('a new lab', () => {
  const lab = createLab(1, 'guided')

  it('is an open first trial on untouched glassware', () => {
    expect(lab).toEqual({
      seed: 1,
      mode: 'guided',
      status: 'in-progress',
      hclRecordedE6: null,
      pipetteRinsed: false,
      burette: { conditioned: false, filled: false, diluted: false, levelUl: 0, tipAirUl: 0 },
      trials: [
        {
          index: 0,
          aliquot: 'none',
          indicatorDrops: 0,
          waterUl: 0,
          titrantDiluted: false,
          startLevelUl: null,
          initialReadingUl: null,
          deliveredUl: 0,
          lastAdditionUl: 0,
          waitedS: 0,
          endLevelUl: null,
          finalReadingUl: null,
          hclUsedE6: null,
          molarityE6: null,
          end: 'open',
        },
      ],
      summary: null,
    })
    expect(currentTrial(lab)).toBe(lab.trials[0])
  })

  it('is unchanged by a round trip through JSON and the schema', () => {
    expect(titrationStateSchema.parse(JSON.parse(JSON.stringify(lab)))).toEqual(lab)
  })

  it.each<[Action, Blocked]>([
    [act('clearTipBubble'), 'burette-empty'],
    [initial(1960), 'burette-empty'],
    [deliver('drop'), 'burette-empty'],
    [act('addIndicatorDrop'), 'flask-empty'],
    [act('addWater'), 'flask-empty'],
    [act('swirlAndWait'), 'flask-empty'],
    [final(28260), 'endpoint-not-confirmed'],
    [molarity(94900), 'needs-final-reading'],
    [act('startNextTrial'), 'trial-open'],
    [summary(94900, 47), 'lab-not-completed'],
  ])('cannot yet %o: %s', (action, reason) => expectBlocked(lab, action, reason))

  it.each<Action>([setMode('challenge'), hcl(97600), act('conditionBurette'), act('fillBurette'), act('rinsePipette'), act('pipetteAliquot'), act('discardTrial')])(
    'can %o',
    (action) => {
      expectAllowed(lab, action)
      expect(reduce(m, lab, action)).not.toBe(lab)
    },
  )
})

describe('the stopcock', () => {
  it('stays shut until the burette is filled, the flask has its aliquot and 2 drops of indicator, and an initial reading is recorded', () => {
    let s = run(m, createLab(1, 'challenge'), [act('conditionBurette'), act('fillBurette'), act('clearTipBubble')])
    expectBlocked(s, deliver('drop'), 'flask-empty')
    s = run(m, s, [act('rinsePipette'), act('pipetteAliquot')])
    expectBlocked(s, deliver('drop'), 'needs-indicator')
    s = run(m, s, [act('addIndicatorDrop')])
    expectBlocked(s, deliver('drop'), 'needs-indicator')
    s = run(m, s, [act('addIndicatorDrop')])
    expectBlocked(s, deliver('drop'), 'needs-initial-reading')
    s = run(m, s, [initial(2560)])
    for (const amount of ['stream', 'drop', 'half'] as const) expectAllowed(s, deliver(amount))
    s = run(m, s, [act('addIndicatorDrop')])
    expectBlocked(s, act('addIndicatorDrop'), 'indicator-full')
    expectBlocked(s, act('pipetteAliquot'), 'flask-has-aliquot')
  })

  it('keeps burette preparation, indicator and the initial reading out of a titration that has started', () => {
    const s = run(m, prepared(m, 1), [deliver('drop')])
    for (const action of [act('conditionBurette'), act('fillBurette'), act('addIndicatorDrop'), initial(2560)]) expectBlocked(s, action, 'mid-titration')
    expectBlocked(s, act('clearTipBubble'), 'no-tip-bubble')
    expectBlocked(s, final(2610), 'endpoint-not-confirmed')
  })

  it('does not let the tip be cleared once titrant has run past the bubble', () => {
    const s = run(m, prepared(m, 1, { clearBubble: false }), [deliver('drop')])
    expect(s.burette.tipAirUl).toBe(594)
    expectBlocked(s, act('clearTipBubble'), 'mid-titration')
  })

  it('takes three washes of water and no more', () => {
    const s = prepared(m, 1, { washes: 3 })
    expect(currentTrial(s).waterUl).toBe(30000)
    expectBlocked(s, act('addWater'), 'water-full')
  })

  it('a rinsed pipette cannot be rinsed again', () => {
    expectBlocked(prepared(m, 1), act('rinsePipette'), 'already-done')
  })
})

describe('warnings before a skipped technique step', () => {
  it('a fill of an unconditioned burette, and its top-up', () => {
    let s = createLab(1, 'guided')
    expect(warnings(m, s, act('fillBurette'))).toEqual(['burette-not-conditioned'])
    s = run(m, s, [act('fillBurette')])
    expect(warnings(m, s, act('fillBurette'))).toEqual(['burette-not-conditioned'])
  })

  it('pipetting with a pipette still wet with water', () => {
    expect(warnings(m, createLab(1, 'guided'), act('pipetteAliquot'))).toEqual(['pipette-not-rinsed'])
  })

  it('a reading with the bubble in the tip; from a dilute burette as well, the burette first', () => {
    const conditioned = run(m, createLab(1, 'guided'), [act('conditionBurette'), act('fillBurette')])
    expect(warnings(m, conditioned, initial(1960))).toEqual(['tip-bubble'])
    const dilute = run(m, createLab(1, 'guided'), [act('fillBurette')])
    expect(warnings(m, dilute, initial(1960))).toEqual(['burette-not-conditioned', 'tip-bubble'])
    expect(warnings(m, run(m, dilute, [act('clearTipBubble')]), initial(2560))).toEqual(['burette-not-conditioned'])
  })

  it('none after conditioning, clearing and rinsing', () => {
    const s = run(m, createLab(1, 'guided'), [act('conditionBurette'), act('fillBurette'), act('clearTipBubble'), act('rinsePipette')])
    for (const action of [act('fillBurette'), initial(2560), act('pipetteAliquot')]) expect(warnings(m, s, action), action.type).toEqual([])
  })

  it('none for an action that is blocked', () => {
    const s = run(m, prepared(m, 1, { condition: false, clearBubble: false }), [deliver('drop')])
    expect(s.burette).toMatchObject({ diluted: true, tipAirUl: 594 })
    expect(warnings(m, s, act('fillBurette'))).toEqual([])
    expect(warnings(m, s, initial(1960))).toEqual([])
  })
})

describe('technique errors', () => {
  it('an unconditioned burette stays dilute through a refill, until it is conditioned', () => {
    let s = carefulTrial(m, prepared(m, 1, { condition: false }))
    expect(currentTrial(s).titrantDiluted).toBe(true)
    s = nextTrial(s)
    expect(s.burette.diluted).toBe(true)
    s = run(m, s, [act('conditionBurette')])
    expect(s.burette).toEqual({ conditioned: true, filled: false, diluted: false, levelUl: 0, tipAirUl: 0 })
    expect(currentTrial(s)).toMatchObject({ index: 1, startLevelUl: null, initialReadingUl: null })
    s = run(m, s, [act('fillBurette')])
    expect(s.burette).toEqual({ conditioned: true, filled: true, diluted: false, levelUl: 562, tipAirUl: 600 })
  })

  it('a wet pipette dilutes only the first aliquot drawn with it', () => {
    let s = prepared(m, 1, { rinse: false })
    expect(currentTrial(s).aliquot).toBe('diluted')
    expect(s.pipetteRinsed).toBe(true)
    s = nextTrial(carefulTrial(m, s))
    expect(currentTrial(s).aliquot).toBe('clean')
  })
})

describe('the tip bubble (seed 1)', () => {
  it('appears at a fill from empty and takes 0.60 mL of the meniscus when cleared', () => {
    let s = run(m, createLab(1, 'challenge'), [act('conditionBurette'), act('fillBurette')])
    expect(s.burette).toMatchObject({ levelUl: 1963, tipAirUl: 600 })
    s = run(m, s, [initial(1960), act('clearTipBubble')])
    expect(s.burette).toMatchObject({ levelUl: 2563, tipAirUl: 0 })
    expect(currentTrial(s)).toMatchObject({ startLevelUl: null, initialReadingUl: null }) // the level it described has changed
    expectBlocked(s, act('clearTipBubble'), 'no-tip-bubble')
  })

  it('left alone, leaves over the first 5 mL delivered: the meniscus falls 3 uL more for every 25 uL', () => {
    let s = prepared(m, 1, { clearBubble: false })
    const seen = () => [currentTrial(s).deliveredUl, s.burette.levelUl - 1963, s.burette.tipAirUl]
    s = run(m, s, [deliver('half')])
    expect(seen()).toEqual([25, 28, 597])
    s = run(m, s, [deliver('drop')])
    expect(seen()).toEqual([75, 84, 591])
    s = run(m, s, [deliver('stream')])
    expect(seen()).toEqual([325, 364, 561])
    while (currentTrial(s).deliveredUl < 4825) s = run(m, s, [deliver('stream')])
    expect(seen()).toEqual([4825, 5404, 21])
    s = run(m, s, [deliver('stream')])
    expect(seen()).toEqual([5075, 5675, 0])
    s = run(m, s, [deliver('stream')])
    expect(seen().slice(0, 2)).toEqual([5325, 5925])
  })

  it('leaves the same burette whatever additions delivered the volume', () => {
    const streamed = run(m, prepared(m, 1, { clearBubble: false }), Array.from({ length: 4 }, () => deliver('stream')))
    const halves = run(m, prepared(m, 1, { clearBubble: false }), Array.from({ length: 40 }, () => deliver('half')))
    expect(currentTrial(halves).deliveredUl).toBe(1000)
    expect(halves.burette).toEqual(streamed.burette)
  })

  it('does not come back at a refill', () => {
    let s = carefulTrial(m, prepared(m, 1, { clearBubble: false }))
    expect(s.burette.tipAirUl).toBe(0)
    s = run(m, s, [act('startNextTrial'), act('fillBurette')])
    expect(s.burette).toMatchObject({ levelUl: 562, tipAirUl: 0 })
  })
})

describe('spec 7.4 check 11, modes: in Guided a reading more than 0.02 mL from the meniscus and an HCl molarity that is not the label\'s are refused and nothing is stored; in Challenge both are stored as typed', () => {
  const filled = (seed: number, mode: Mode) => run(m, createLab(seed, mode), [act('conditionBurette'), act('fillBurette'), act('clearTipBubble')])

  it('readings, seed 1, meniscus at 2563 uL: Guided asks for a re-read of 2.54 and 2.59 and accepts 2.55 to 2.58', () => {
    const s = filled(1, 'guided')
    expect(s.burette.levelUl).toBe(2563)
    expectBlocked(s, initial(2540), 'reread')
    expectBlocked(s, initial(2590), 'reread')
    for (const readingUl of [2550, 2560, 2570, 2580]) {
      expect(currentTrial(run(m, s, [initial(readingUl)]))).toMatchObject({ startLevelUl: 2563, initialReadingUl: readingUl })
    }
  })

  it('readings: Challenge stores 2.59 with the true meniscus beside it', () => {
    expect(currentTrial(run(m, filled(1, 'challenge'), [initial(2590)]))).toMatchObject({ startLevelUl: 2563, initialReadingUl: 2590 })
  })

  it('readings: both modes refuse one that is not on the 0.01 mL grid from 0.00 to 50.00', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      for (const readingUl of [2563, 2565, -10, 50010, 25.6]) expectBlocked(filled(1, mode), initial(readingUl), 'invalid-entry')
    }
  })

  it('readings, the edge exactly (seed 11, meniscus at 1780 uL): 0.02 mL off is accepted, 0.03 is not', () => {
    const s = filled(11, 'guided')
    expect(s.burette.levelUl).toBe(1780)
    expectAllowed(s, initial(1760))
    expectAllowed(s, initial(1800))
    expectBlocked(s, initial(1750), 'reread')
    expectBlocked(s, initial(1810), 'reread')
  })

  it('the final reading is held to the meniscus in Guided in the same way', () => {
    const s = titrate(prepared(m, 1, { mode: 'guided' }))
    expect(s.burette.levelUl).toBe(28263)
    expectBlocked(s, final(28290), 'reread')
    expectBlocked(s, final(28240), 'reread')
    expectAllowed(s, final(28280))
    expect(currentTrial(run(m, titrate(prepared(m, 1)), [final(28290)]))).toMatchObject({ endLevelUl: 28263, finalReadingUl: 28290 })
  })

  it('the label: Guided refuses 0.0967 and accepts 0.0976; Challenge accepts 0.0967; neither takes 97 650', () => {
    const guided = createLab(1, 'guided')
    expectBlocked(guided, hcl(96700), 'not-the-label')
    expect(run(m, guided, [hcl(97600)]).hclRecordedE6).toBe(97600)
    const challenge = createLab(1, 'challenge')
    expect(run(m, challenge, [hcl(96700)]).hclRecordedE6).toBe(96700)
    for (const lab of [guided, challenge]) {
      for (const bad of [97650, 1_000_000, -100, 0.0976]) expectBlocked(lab, hcl(bad), 'invalid-entry')
    }
  })

  it('the label, between trials: a miscopied molarity can be put right before the next trial, and the graded trial keeps the one it used', () => {
    let s = carefulTrial(m, run(m, prepared(m, 1), [hcl(96700)]))
    expect(currentTrial(s)).toMatchObject({ end: 'graded', hclUsedE6: 96700 })
    for (const action of [act('discardTrial'), ...BENCH, ...ENTRIES]) expectBlocked(s, action, 'trial-ended')
    expectAllowed(s, setMode('guided'))
    expectAllowed(s, act('startNextTrial'))
    s = run(m, s, [hcl(97600)])
    expect(s.trials[0]).toMatchObject({ end: 'graded', hclUsedE6: 96700 })
    expect(countingTrials(m, s)).toEqual([])
    s = carefulTrial(m, nextTrial(s))
    expect(currentTrial(s)).toMatchObject({ index: 1, end: 'graded', hclUsedE6: 97600 })
    expect(countingTrials(m, s)).toEqual([s.trials[1]])
  })
})

describe('spec 7.4 check 11, modes: the mode cannot be changed from a trial\'s aliquot or initial reading until the trial ends', () => {
  const to = setMode('guided')

  it('can be changed on a new lab, and not once the trial has an aliquot', () => {
    const lab = createLab(1, 'challenge')
    expect(run(m, lab, [to]).mode).toBe('guided')
    expectAllowed(run(m, lab, [act('fillBurette'), act('rinsePipette')]), to)
    expectBlocked(run(m, lab, [act('pipetteAliquot')]), to, 'trial-open')
  })

  it('cannot be changed once the trial has an initial reading and no aliquot', () => {
    expectBlocked(run(m, createLab(1, 'challenge'), [act('fillBurette'), initial(1960)]), to, 'trial-open')
  })

  it('can be changed as soon as the trial ends, however it ends, and in the next trial until that has an aliquot or an initial reading', () => {
    const graded = carefulTrial(m, prepared(m, 1))
    const overshot = run(m, prepared(m, 1), Array.from({ length: 104 }, () => deliver('stream')))
    const ranOut = titrate(nextTrial(graded, { fill: false }))
    const discarded = run(m, prepared(m, 1), [act('discardTrial')])
    expect([graded, overshot, ranOut, discarded].map((s) => currentTrial(s).end)).toEqual(['graded', 'overshot', 'ran-out', 'discarded'])
    for (const ended of [graded, overshot, ranOut, discarded]) {
      expectAllowed(ended, to)
      const next = run(m, ended, [act('startNextTrial')])
      expectAllowed(next, to)
      expectBlocked(run(m, next, [act('pipetteAliquot')]), to, 'trial-open')
      expectBlocked(run(m, next, [initial(honestReading(next.burette.levelUl))]), to, 'trial-open')
    }
  })

  it('can be changed after completion', () => {
    let s = carefulTrial(m, prepared(m, 1))
    for (let i = 0; i < 2; i++) s = carefulTrial(m, nextTrial(s))
    expect(s.status).toBe('completed')
    expect(run(m, s, [to]).mode).toBe('guided')
  })
})

describe('the final reading', () => {
  const { additions } = titrateCarefully(m, prepared(m, 1))
  const atEndpoint = run(m, prepared(m, 1), additions.map((a) => deliver(a.amount))) // pink, and not yet waited on

  it('needs a swirl and wait that showed the pink to last', () => {
    expect(isPink(m, flaskOf(m, atEndpoint))).toBe(true)
    expect(endpointConfirmed(m, atEndpoint)).toBe(false)
    expectBlocked(atEndpoint, final(28260), 'endpoint-not-confirmed')
    const waited = run(m, atEndpoint, [act('swirlAndWait')])
    expect(endpointConfirmed(m, waited)).toBe(true)
    expectAllowed(waited, final(28260))
  })

  it('is not confirmed by a wait on a flask that is not pink', () => {
    const s = run(m, prepared(m, 1), [deliver('stream'), act('swirlAndWait')])
    expect(currentTrial(s).waitedS).toBe(30)
    expect(endpointConfirmed(m, s)).toBe(false)
    expectBlocked(s, final(2810), 'endpoint-not-confirmed')
  })

  it('must be past the initial reading', () => {
    const waited = run(m, atEndpoint, [act('swirlAndWait')])
    expectBlocked(waited, final(2560), 'final-not-after-initial')
    expectBlocked(waited, final(28263), 'invalid-entry')
  })

  it('is cleared, with the end level and the wait, by a further half-drop or a wash of water', () => {
    const read = run(m, atEndpoint, [act('swirlAndWait'), final(28260)])
    expect(currentTrial(read)).toMatchObject({ waitedS: 30, endLevelUl: 28263, finalReadingUl: 28260 })
    for (const action of [deliver('half'), act('addWater')]) {
      const after = run(m, read, [action])
      expect(currentTrial(after), action.type).toMatchObject({ waitedS: 0, endLevelUl: null, finalReadingUl: null, end: 'open' })
      expect(endpointConfirmed(m, after), action.type).toBe(false)
      expectBlocked(after, molarity(94900), 'needs-final-reading')
    }
  })
})

describe('spec 7.4 check 6, typed molarity: accepted only with exactly four decimal places, and only when it is the recorded HCl molarity x 25.00 mL / the recorded titre rounded to the fourth place', () => {
  it('seed 1, careful (initial 2.56, final 28.26, titre 25.70): 0.0949 is graded, a unit either side is refused, and a refusal marks nothing', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      let s = run(m, titrate(prepared(m, 1, { mode })), [final(28260)])
      expectBlocked(s, molarity(95000), 'calculation-mismatch')
      expectBlocked(s, molarity(94800), 'calculation-mismatch')
      expectBlocked(s, molarity(94942), 'invalid-entry')
      s = run(m, s, [molarity(94900)])
      expect(currentTrial(s)).toMatchObject({ end: 'graded', molarityE6: 94900, hclUsedE6: 97600 })
      expectBlocked(s, molarity(94900), 'trial-ended')
      expectBlocked(s, deliver('half'), 'trial-ended')
      expectAllowed(s, act('startNextTrial'))
    }
  })

  it('the cut-off value is refused: initial typed 2.58 and final 28.25, titre 25.67, 0.0950 is a mismatch and 0.0951 is graded', () => {
    let s = run(m, titrate(run(m, prepared(m, 1), [initial(2580)])), [final(28250)])
    expectBlocked(s, molarity(95000), 'calculation-mismatch')
    s = run(m, s, [molarity(95100)])
    expect(currentTrial(s)).toMatchObject({ end: 'graded', initialReadingUl: 2580, finalReadingUl: 28250, molarityE6: 95100 })
  })

  it('needs an HCl molarity in the notebook', () => {
    let s = run(m, createLab(1, 'challenge'), [act('conditionBurette')])
    s = run(m, titrate(readyTrial(m, s, { clearBubble: true, rinse: true })), [final(28260)])
    expectBlocked(s, molarity(94900), 'needs-hcl-molarity')
    expect(currentTrial(run(m, s, [hcl(97600), molarity(94900)])).end).toBe('graded')
  })
})

describe('the careful first trial of seed 1', () => {
  it('is stored exactly so', () => {
    expect(currentTrial(carefulTrial(m, prepared(m, 1)))).toEqual({
      index: 0,
      aliquot: 'clean',
      indicatorDrops: 2,
      waterUl: 0,
      titrantDiluted: false,
      startLevelUl: 2563,
      initialReadingUl: 2560,
      deliveredUl: 25700,
      lastAdditionUl: 25,
      waitedS: 30,
      endLevelUl: 28263,
      finalReadingUl: 28260,
      hclUsedE6: 97600,
      molarityE6: 94900,
      end: 'graded',
    })
  })
})

describe('spec 7.4 check 10, trial endings', () => {
  /** Seed 1 after a careful trial 1 and a trial 2 run on what was left: the burette at the 50.00 mark. */
  const ranOut = () => titrate(nextTrial(carefulTrial(m, prepared(m, 1)), { fill: false }))

  it('a trial is overshot as soon as the delivered volume is more than 0.10 mL past the flask\'s equivalence volume (seed 1: the line is 25 680.86 + 100)', () => {
    let s = prepared(m, 1)
    expect(equivalenceUl(flaskOf(m, s)).toFixed(2)).toBe('25680.86')
    while (currentTrial(s).deliveredUl < 25750) s = run(m, s, [deliver('stream')])
    expect(currentTrial(s)).toMatchObject({ deliveredUl: 25750, end: 'open' })
    s = run(m, s, [deliver('half')])
    expect(currentTrial(s)).toMatchObject({ deliveredUl: 25775, end: 'open' })
    s = run(m, s, [deliver('half')])
    expect(currentTrial(s)).toMatchObject({ deliveredUl: 25800, end: 'overshot', endLevelUl: 28363, finalReadingUl: null })
    expectBlocked(s, deliver('half'), 'trial-ended')
  })

  it('a trial into which titrant has run, whose burette is at the 50.00 mL mark with the flask not pink, is invalid (seed 1, a second trial with no refill)', () => {
    let s = nextTrial(carefulTrial(m, prepared(m, 1)), { fill: false })
    expect(equivalenceUl(flaskOf(m, s)).toFixed(1)).toBe('25708.6')
    while (s.burette.levelUl < 49763) s = run(m, s, [deliver('stream')])
    expect(currentTrial(s).end).toBe('open')
    s = run(m, s, [deliver('stream')]) // 237 uL is all that is left above the mark
    expect(s.burette.levelUl).toBe(50000)
    expect(currentTrial(s)).toMatchObject({ deliveredUl: 21737, lastAdditionUl: 237, end: 'ran-out', endLevelUl: 50000 })
    expect(currentTrial(ranOut())).toEqual(currentTrial(s))
  })

  it('...also when water was added last (seed 1384, 2 drops: pink at the mark, still pink after one wash, not after two)', () => {
    let s = carefulTrial(m, prepared(m, 1384))
    expect(s.burette.levelUl).toBe(25612)
    s = nextTrial(s, { fill: false })
    expect(equivalenceUl(flaskOf(m, s)).toFixed(2)).toBe('24375.64')
    while (can(m, s, deliver('stream')) === null) s = run(m, s, [deliver('stream')])
    expectBlocked(s, deliver('half'), 'burette-at-bottom')
    expect(currentTrial(s)).toMatchObject({ deliveredUl: 24388, lastAdditionUl: 138, end: 'open' })
    expect(pink(s).toExponential(2)).toBe('1.49e-6')
    s = run(m, s, [act('addWater')])
    expect(currentTrial(s).end).toBe('open')
    expect(pink(s).toExponential(2)).toBe('1.12e-6')
    s = run(m, s, [act('addWater')])
    expect(currentTrial(s)).toMatchObject({ waterUl: 20000, end: 'ran-out', endLevelUl: 50000 })
    expect(pink(s).toExponential(1)).toBe('8.7e-7')
    expectBlocked(s, act('addWater'), 'trial-ended')
  })

  it('...and with 3 drops of indicator the first wash ends it', () => {
    let s = nextTrial(carefulTrial(m, prepared(m, 1384)), { fill: false, drops: 3 })
    while (can(m, s, deliver('stream')) === null) s = run(m, s, [deliver('stream')])
    expect(currentTrial(s)).toMatchObject({ deliveredUl: 24388, end: 'open' })
    expect(pink(s).toExponential(2)).toBe('1.28e-6')
    s = run(m, s, [act('addWater')])
    expect(currentTrial(s).end).toBe('ran-out')
    expect(pink(s).toExponential(1)).toBe('9.9e-7')
  })

  it('a trial at the mark with the flask pink can still be finished', () => {
    let s = nextTrial(carefulTrial(m, prepared(m, 1384)), { fill: false })
    while (can(m, s, deliver('stream')) === null) s = run(m, s, [deliver('stream')])
    s = finishHonestly(m, run(m, s, [act('swirlAndWait')]))
    expect(currentTrial(s)).toMatchObject({ end: 'graded', finalReadingUl: 50000 })
  })

  it('a trial begun at the mark stays open and its burette can be filled', () => {
    let s = run(m, ranOut(), [act('startNextTrial')])
    expect(s.burette.levelUl).toBe(50000)
    expect(currentTrial(s)).toMatchObject({ index: 2, deliveredUl: 0, end: 'open' })
    expectAllowed(s, act('fillBurette'))
    for (const action of [act('pipetteAliquot'), act('addIndicatorDrop'), act('addIndicatorDrop'), act('addWater')]) {
      s = run(m, s, [action])
      expect(currentTrial(s).end, action.type).toBe('open')
      expectAllowed(s, act('fillBurette'))
    }
    s = run(m, s, [initial(50000)])
    expectBlocked(s, deliver('half'), 'burette-at-bottom')
    s = run(m, s, [act('fillBurette')])
    expect(s.burette.levelUl).toBe(1442)
    expectBlocked(s, deliver('half'), 'needs-initial-reading')
    expectAllowed(run(m, s, [initial(1440)]), deliver('half'))
  })

  it('a discarded trial is invalid and the next begins with the glassware as it was', () => {
    let s = run(m, createLab(1, 'challenge'), [hcl(97600), act('conditionBurette'), act('fillBurette'), act('pipetteAliquot')])
    expect(currentTrial(s).aliquot).toBe('diluted')
    const before = s
    s = run(m, s, [act('discardTrial')])
    expect(currentTrial(s)).toMatchObject({ index: 0, aliquot: 'diluted', end: 'discarded', endLevelUl: 1963 })
    expectAllowed(s, act('startNextTrial'))
    s = run(m, s, [act('startNextTrial')])
    expect(s.trials).toHaveLength(2)
    expect(currentTrial(s)).toEqual({ ...createLab(1, 'challenge').trials[0], index: 1 })
    expect(s.burette).toEqual(before.burette)
    expect(s.hclRecordedE6).toBe(97600)
    expect(currentTrial(run(m, s, [act('pipetteAliquot')])).aliquot).toBe('clean')
  })

  it('every open trial of a lab that is not completed can be discarded, and no ended one', () => {
    const ready = prepared(m, 1)
    const atEndpoint = titrate(ready)
    for (const open of [createLab(1, 'guided'), ready, run(m, ready, [deliver('stream')]), atEndpoint, run(m, atEndpoint, [final(28260)])]) {
      expect(currentTrial(run(m, open, [act('discardTrial')])).end).toBe('discarded')
    }
    const graded = carefulTrial(m, ready)
    const overshot = run(m, ready, Array.from({ length: 104 }, () => deliver('stream')))
    const discarded = run(m, ready, [act('discardTrial')])
    for (const ended of [graded, overshot, ranOut(), discarded]) expectBlocked(ended, act('discardTrial'), 'trial-ended')
    expectAllowed(run(m, graded, [act('startNextTrial')]), act('discardTrial'))
  })

  describe('no state a learner can reach leaves an open trial that cannot be ended', () => {
    const pick = <T>(rng: Rng, items: readonly T[]) => items[Math.floor(rng() * items.length)]!
    const SIMPLE = (['conditionBurette', 'fillBurette', 'clearTipBubble', 'rinsePipette', 'pipetteAliquot', 'addIndicatorDrop', 'addWater', 'swirlAndWait', 'discardTrial', 'startNextTrial'] as const).map(act)
    const notebookMolarity = (model: TitrationModel, s: TitrationState) => {
      const { initialReadingUl, finalReadingUl } = currentTrial(s)
      const titreUl = (finalReadingUl ?? 0) - (initialReadingUl ?? 0)
      return titreUl > 0 ? calculatedMolarityE6(model, s.hclRecordedE6 ?? 0, titreUl) : 94900
    }
    /** Any action at all, with what is typed drawn around the honest value and now and then far from it. */
    function anyAction(model: TitrationModel, rng: Rng, s: TitrationState): Action {
      const label = labSetup(model, s.seed).hclE4 * 100
      const reading = honestReading(s.burette.levelUl) + pick(rng, [0, 0, 0, 10, -10, 20, -20, 30, -40, 5, 0.5, -60000, 60000])
      return pick<() => Action>(rng, [
        () => pick(rng, SIMPLE),
        () => pick(rng, SIMPLE),
        () => deliver(pick(rng, ['stream', 'drop', 'half'] as const)),
        () => setMode(pick(rng, ['guided', 'challenge'] as const)),
        () => hcl(label + pick(rng, [0, 0, 100, -900, 50, -1e6])),
        () => initial(reading),
        () => final(reading),
        () => molarity(notebookMolarity(model, s) + pick(rng, [0, 0, 0, 100, -100, 42, 1e6])),
        () => summary(pick(rng, [94900, 94950, 1e6]), pick(rng, [0, 47, -1, 0.5])),
      ])()
    }
    /**
     * What a learner who never refills unasked would do next, so that the random actions fall on whole trials and
     * on a burette that runs out. On an odd seed the technique steps are taken, on an even one skipped; on every
     * other trial the flask wall is washed down once the pink should be showing.
     */
    function steadyAction(model: TitrationModel, s: TitrationState): Action {
      const trial = currentTrial(s)
      if (s.status === 'completed') return summary(94900, 0)
      if (trial.end !== 'open') return act('startNextTrial')
      if (s.hclRecordedE6 === null) return hcl(labSetup(model, s.seed).hclE4 * 100)
      if (s.seed % 2 === 1 && trial.deliveredUl === 0) {
        if (!s.burette.conditioned) return act('conditionBurette')
        if (s.burette.tipAirUl > 0) return act('clearTipBubble')
        if (!s.pipetteRinsed) return act('rinsePipette')
      }
      if (!s.burette.filled || (trial.deliveredUl === 0 && s.burette.levelUl >= model.buretteCapacityUl)) return act('fillBurette')
      if (trial.initialReadingUl === null) return initial(honestReading(s.burette.levelUl))
      if (trial.aliquot === 'none') return act('pipetteAliquot')
      if (trial.indicatorDrops < 2) return act('addIndicatorDrop')
      const flask = flaskOf(model, s)
      const short = (addUl: number, marginUl: number) => compareToEquivalence({ ...flask, deliveredUl: flask.deliveredUl + addUl }, -marginUl) <= 0
      // About where the pink shows. Whether it has is then found as at a bench: by a swirl and wait.
      if (compareToEquivalence(flask, 12) < 0 && can(model, s, deliver('half')) === null) return deliver(short(model.streamUl, 2000) ? 'stream' : short(model.dropUl, 200) ? 'drop' : 'half')
      if (trial.index % 2 === 0 && trial.waterUl < model.waterMaxUl && trial.finalReadingUl === null) return act('addWater')
      if (trial.waitedS < model.persistSeconds) return act('swirlAndWait')
      if (!endpointConfirmed(model, s)) return deliver('half')
      return trial.finalReadingUl === null ? final(honestReading(s.burette.levelUl)) : molarity(notebookMolarity(model, s))
    }

    /**
     * `steps` actions on each seed, and what the walk met. `steadyShare` of them are the steady learner's and the
     * rest any at all: actions drawn only at random seldom get through a titration, which is some 150 additions.
     */
    function walk(modelOf: (seed: number) => TitrationModel, seeds: readonly number[], steps: number, steadyShare: (seed: number) => number) {
      const seen = { blocked: 0, graded: 0, overshot: 0, 'ran-out': 0, discarded: 0, completed: 0, pinkAtTheMark: 0, fadedAtTheMark: 0 }
      for (const seed of seeds) {
        const model = modelOf(seed)
        const rng = mulberry32(seed)
        let s = createLab(seed, 'guided')
        for (let step = 0; step < steps; step++) {
          // A completed lab has nothing left to end, and a long one is slow to check: a new one is begun on the same seed.
          if ((s.status === 'completed' && rng() < 0.05) || s.trials.length > 8) s = createLab(seed, s.mode)
          const action = rng() < steadyShare(seed) ? steadyAction(model, s) : anyAction(model, rng, s)
          const where = `seed ${seed}, step ${step}, ${action.type}`
          const next = reduce(model, s, action)
          if (can(model, s, action) !== null) {
            seen.blocked++
            if (next !== s) throw new Error(`${where}: blocked, and the state changed`)
            continue
          }
          const before = currentTrial(s)
          s = next
          const trial = currentTrial(s)
          const stored = titrationStateSchema.safeParse(s)
          if (!stored.success) throw new Error(`${where}: ${stored.error.message}`)
          const atTheMark = trial.deliveredUl > 0 && s.burette.levelUl >= model.buretteCapacityUl
          if (trial.end === 'open') {
            if (atTheMark) {
              // The dead end: nothing more can be delivered, and without a pink that lasts there is no final reading.
              if (!isPink(model, flaskOf(model, s))) throw new Error(`${where}: open at the mark with the flask not pink`)
              seen.pinkAtTheMark++
            }
            if (can(model, s, act('discardTrial')) !== null) throw new Error(`${where}: an open trial cannot be discarded`)
          } else {
            if (s.status !== 'completed' && can(model, s, act('startNextTrial')) !== null) throw new Error(`${where}: no next trial after an ended one`)
            if (before.end === 'open' && before.index === trial.index) seen[trial.end]++
            if (trial.end === 'ran-out' && action.type === 'addWater') seen.fadedAtTheMark++
          }
          if (action.type === 'submitMolarity' && s.status === 'completed') seen.completed++
        }
      }
      return seen
    }

    it('20 000 actions on each of ten seeds: all drawn at random on the first, down to one in ten on the last', { timeout: 60_000 }, () => {
      const seen = walk(() => m, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 20000, (seed) => (seed - 1) / 10)
      // The walk is only a test if it gets about: blocked actions, every ending, whole labs.
      for (const what of ['blocked', 'graded', 'overshot', 'ran-out', 'discarded', 'completed'] as const) expect(seen[what], what).toBeGreaterThan(0)
    })

    // On the lab's own burette a walk seldom meets the mark with the flask pink: the titrant left has to run out
    // within 0.1 mL after the endpoint. So here the mark is moved to where the first trial's endpoint falls.
    it('...nor on a burette cut short to end just past the endpoint, where a wash of water takes the pink away at the mark', { timeout: 60_000 }, () => {
      const cutShort = (seed: number): TitrationModel => ({
        ...m,
        buretteCapacityUl: trialSetup(m, seed, 0).fillLevelUl + m.tipBubbleUl + Math.ceil(equivalenceUl(flaskOf(m, createLab(seed, 'guided')))) + 13,
      })
      const seen = walk(cutShort, [1, 2, 3, 4, 5], 4000, () => 0.85)
      expect(seen.pinkAtTheMark).toBeGreaterThan(0)
      expect(seen.fadedAtTheMark).toBeGreaterThan(0)
    })
  })
})

describe('spec 7.4 check 7, honest trial: a trial within 1.0% whose reading was typed more than 0.02 mL from the meniscus, or whose recorded HCl molarity is not the label\'s, is passed and does not count', () => {
  // Seed 1: label 0.0976 M, true NaOH 0.09502 M; the careful endpoint leaves the meniscus at 28 263 uL.
  const atEndpoint = titrate(prepared(m, 1))

  it('final typed 28.28, 17 uL off: titre 25.72, molarity 0.0949, passes and counts', () => {
    expect(verdict(finish(atEndpoint, 28280))).toEqual({ molarityE6: 94900, percent: '-0.126', passes: true, counts: true })
  })

  it('final typed 28.29, 27 uL off, or 28.24, 23 uL off: passes and does not count', () => {
    expect(verdict(finish(atEndpoint, 28290))).toEqual({ molarityE6: 94800, percent: '-0.232', passes: true, counts: false })
    expect(verdict(finish(atEndpoint, 28240))).toEqual({ molarityE6: 95000, percent: '-0.021', passes: true, counts: false })
  })

  it('HCl recorded as 0.0967 with honest readings: molarity 0.0941, passes and does not count', () => {
    const s = carefulTrial(m, run(m, prepared(m, 1), [hcl(96700)]))
    expect(verdict(s)).toEqual({ molarityE6: 94100, percent: '-0.968', passes: true, counts: false })
  })

  it('a reading exactly 0.02 mL off counts (seed 11: start 1780, careful endpoint at 23 750 delivered, meniscus 25 530)', () => {
    const ready = prepared(m, 11)
    expect(labSetup(m, 11)).toEqual({ hclE4: 952, naohE5: 10030 })
    const typed = (initialUl: number, finalUl: number) => {
      const s = titrate(run(m, ready, [initial(initialUl)]))
      expect(currentTrial(s)).toMatchObject({ startLevelUl: 1780, deliveredUl: 23750 })
      expect(s.burette.levelUl).toBe(25530)
      return verdict(finish(s, finalUl))
    }
    expect(typed(1760, 25530)).toEqual({ molarityE6: 100100, percent: '-0.199', passes: true, counts: true })
    expect(typed(1750, 25530)).toEqual({ molarityE6: 100100, percent: '-0.199', passes: true, counts: false })
    expect(typed(1780, 25550)).toMatchObject({ passes: true, counts: true })
    expect(typed(1780, 25560)).toMatchObject({ passes: true, counts: false })
  })

  it('a failed trial does not count', () => {
    const s = carefulTrial(m, prepared(m, 1, { rinse: false }))
    expect(verdict(s)).toEqual({ molarityE6: 96800, percent: '1.873', passes: false, counts: false })
  })

  it('trials that do not count never complete the lab (seed 1, the burette never conditioned: one honest failed trial, then three final readings typed to fit)', () => {
    let s = carefulTrial(m, prepared(m, 1, { condition: false }))
    expect(currentTrial(s)).toMatchObject({ initialReadingUl: 2560, endLevelUl: 28788, finalReadingUl: 28790 })
    expect(verdict(s)).toEqual({ molarityE6: 93000, percent: '-2.126', passes: false, counts: false })
    for (const [levelUl, typedUl] of [
      [26812, 26240],
      [27667, 27120],
      [28215, 27670],
    ] as const) {
      s = titrate(nextTrial(s))
      expect(s.burette.levelUl).toBe(levelUl)
      s = finish(s, typedUl)
      const trial = currentTrial(s)
      expect(trial.finalReadingUl! - trial.initialReadingUl!).toBe(25680)
      expect(verdict(s)).toEqual({ molarityE6: 95000, percent: '-0.021', passes: true, counts: false })
    }
    expect(s.trials).toHaveLength(4)
    expect(countingTrials(m, s)).toEqual([])
    expect(s.status).toBe('in-progress')
    expectAllowed(s, act('startNextTrial'))
  })
})

describe('completion', () => {
  const completed = () => {
    let s = carefulTrial(m, prepared(m, 1))
    for (let i = 0; i < 2; i++) s = carefulTrial(m, nextTrial(s))
    return s
  }

  it('spec 7.4 check 7: the third trial that counts completes the lab, and no trial can be started after it', () => {
    let s = carefulTrial(m, prepared(m, 1))
    s = carefulTrial(m, nextTrial(s))
    expect(s.status).toBe('in-progress')
    expect(countingTrials(m, s)).toHaveLength(2)
    s = carefulTrial(m, nextTrial(s))
    expect(s.status).toBe('completed')
    expect(countingTrials(m, s)).toEqual(s.trials)
    expect(s.trials.map((t) => t.molarityE6)).toEqual([94900, 94800, 94900])
    expectBlocked(s, act('startNextTrial'), 'lab-completed')
  })

  it('with a failed first trial the lab completes at the fourth', () => {
    let s = carefulTrial(m, prepared(m, 1, { rinse: false }))
    for (let i = 0; i < 2; i++) s = carefulTrial(m, nextTrial(s))
    expect(s.status).toBe('in-progress')
    s = carefulTrial(m, nextTrial(s))
    expect(s.status).toBe('completed')
    expect(countingTrials(m, s)).toEqual(s.trials.slice(1))
  })

  it('leaves only the mode and the summary to change', () => {
    const s = completed()
    for (const action of [...BENCH, ...ENTRIES, hcl(97600), act('discardTrial'), act('startNextTrial')]) expectBlocked(s, action, 'lab-completed')
    expectAllowed(s, setMode('guided'))
    expectAllowed(s, summary(94900, 0))
  })

  it('takes the learner\'s own average, to four decimal places, and relative deviation', () => {
    const s = completed()
    expectBlocked(s, summary(94950, 0), 'invalid-entry')
    expectBlocked(s, summary(1_000_000, 0), 'invalid-entry')
    expectBlocked(s, summary(94900, -1), 'invalid-entry')
    expectBlocked(s, summary(94900, 0.5), 'invalid-entry')
    expect(run(m, s, [summary(94900, 0)]).summary).toEqual({ meanE6: 94900, deviationE2: 0 })
    expect(run(m, s, [summary(94900, 47), summary(94800, 130)]).summary).toEqual({ meanE6: 94800, deviationE2: 130 })
  })
})

describe('the stored shape', () => {
  const lab = carefulTrial(m, prepared(m, 1))
  const withBurette = (patch: Partial<TitrationState['burette']>) => ({ ...lab, burette: { ...lab.burette, ...patch } })
  const withTrial = (patch: Partial<Trial>) => ({ ...lab, trials: [{ ...lab.trials[0]!, ...patch }] })
  const passes = (record: unknown) => titrationStateSchema.safeParse(record).success

  it('takes a lab as it is', () => {
    expect(titrationStateSchema.parse(JSON.parse(JSON.stringify(lab)))).toEqual(lab)
  })

  it("is bounded at the model's values: the burette's capacity, the tip bubble, three drops, 30 mL of water", () => {
    expect(passes(withBurette({ levelUl: m.buretteCapacityUl }))).toBe(true)
    expect(passes(withBurette({ levelUl: m.buretteCapacityUl + 1 }))).toBe(false)
    expect(m.buretteCapacityUl + 1).toBe(50001)
    expect(passes(withBurette({ tipAirUl: m.tipBubbleUl }))).toBe(true)
    expect(passes(withBurette({ tipAirUl: m.tipBubbleUl + 1 }))).toBe(false)
    expect(passes(withTrial({ indicatorDrops: m.indicatorDrops[1] }))).toBe(true)
    expect(passes(withTrial({ indicatorDrops: m.indicatorDrops[1] + 1 }))).toBe(false)
    expect(m.indicatorDrops[1] + 1).toBe(4)
    expect(passes(withTrial({ waterUl: m.waterMaxUl }))).toBe(true)
    expect(passes(withTrial({ waterUl: m.waterMaxUl + 1 }))).toBe(false)
    expect(m.waterMaxUl + 1).toBe(30001)
  })

  it('refuses a float level, a seed that is not 32 bits, an extra key and an empty trial list', () => {
    expect(passes(withBurette({ levelUl: 2563.5 }))).toBe(false)
    expect(passes({ ...lab, seed: 4294967295 })).toBe(true)
    expect(passes({ ...lab, seed: -1 })).toBe(false)
    expect(passes({ ...lab, seed: 4294967296 })).toBe(false)
    expect(passes({ ...lab, extra: 1 })).toBe(false)
    expect(passes({ ...lab, trials: [{ ...lab.trials[0]!, extra: 1 }] })).toBe(false)
    expect(passes({ ...lab, trials: [] })).toBe(false)
  })

  it('no entry is a negative zero, so every state an action can store comes back from JSON as it went in', () => {
    // -0 is a whole number, not below 0 and on every grid, and JSON writes it as 0: once stored it would not survive a reload.
    expect(JSON.parse(JSON.stringify({ readingUl: -0 }))).not.toEqual({ readingUl: -0 })
    const challenge = createLab(1, 'challenge')
    const filled = run(m, challenge, [hcl(97600), act('conditionBurette'), act('fillBurette'), act('clearTipBubble')])
    const confirmed = titrate(prepared(m, 1))
    let done = carefulTrial(m, prepared(m, 1))
    for (let i = 0; i < 2; i++) done = carefulTrial(m, nextTrial(done))
    expectBlocked(challenge, hcl(-0), 'invalid-entry')
    expectBlocked(filled, initial(-0), 'invalid-entry')
    expectBlocked(confirmed, final(-0), 'invalid-entry')
    expectBlocked(run(m, confirmed, [final(28260)]), molarity(-0), 'invalid-entry')
    expectBlocked(done, summary(-0, 0), 'invalid-entry')
    expectBlocked(done, summary(94900, -0), 'invalid-entry')
    // A plain zero is an entry still, and is stored as typed.
    for (const s of [run(m, challenge, [hcl(0)]), run(m, filled, [initial(0)]), run(m, done, [summary(0, 0)])]) {
      expect(titrationStateSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s)
    }
  })

  it('refuses a trial whose index is not its place in the list', () => {
    expect(passes(withTrial({ index: 1 }))).toBe(false)
    const two = run(m, lab, [act('startNextTrial')])
    expect(passes(two)).toBe(true)
    expect(passes({ ...two, trials: [two.trials[0]!, { ...two.trials[1]!, index: 5 }] })).toBe(false)
  })
})

describe('the test kit', () => {
  it('reads the meniscus to the nearest 0.01 mL', () => {
    expect([2563, 28263, 2565, 0, 50000].map(honestReading)).toEqual([2560, 28260, 2570, 0, 50000])
  })

  it('works the molarity out from the notebook, a half rounding up, and the notebook check accepts it', () => {
    expect(calculatedMolarityE6(m, 97600, 25700)).toBe(94900)
    expect(calculatedMolarityE6(m, 97600, 25670)).toBe(95100)
    expect(calculatedMolarityE6(m, 96000, 25600)).toBe(93800) // 0.09375 exactly
    expect(calculatedMolarityE6(m, 97200, 24000)).toBe(101300) // 0.10125 exactly
    for (let hclE4 = m.hclRangeE4[0]; hclE4 <= m.hclRangeE4[1]; hclE4 += 7) {
      for (let titreUl = 19000; titreUl <= 29000; titreUl += 10) {
        expect(followsFromNotebook(m, calculatedMolarityE6(m, hclE4 * 100, titreUl), hclE4 * 100, titreUl)).toBe(true)
      }
    }
  })

  it('throws on an action that cannot be done, so a script cannot skip a step unseen', () => {
    expect(() => run(m, createLab(1, 'guided'), [deliver('drop')])).toThrow('deliver: burette-empty')
  })

  it('passes the state through its argument after every action', () => {
    let calls = 0
    const counted = learner((s) => (calls++, s))
    const { state, additions } = counted.titrateCarefully(m, counted.prepared(m, 1))
    expect(additions).toHaveLength(143)
    expect(additions.slice(-3).map((a) => [a.amount, a.deliveredUl, a.side, a.pH.toFixed(2)])).toEqual([
      ['half', 25650, -1, '4.24'],
      ['half', 25675, -1, '4.95'],
      ['half', 25700, 1, '8.96'],
    ])
    expect(additions.at(-1)!.pinkConcentration.toExponential(2)).toBe('3.51e-6')
    // label, condition, fill, clear, reading, rinse, pipette, two drops; 143 additions; one swirl and wait.
    expect(calls).toBe(9 + 143 + 1)
    expect(endpointConfirmed(m, state)).toBe(true)
  })
})
