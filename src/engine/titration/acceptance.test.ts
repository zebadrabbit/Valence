// The acceptance list of spec 7.4, run through the state machine. Checks 1, 5, 6, 10 and 11 are held by the tests of
// the files they belong to (ph, entries, actions), in cases named after them; what is here needs a whole run or a whole lab.
import { describe, expect, it } from 'vitest'
import { titrationData } from '@/chem-data/titration/data'
import { TITRATION_PRIMER } from '@/chem-data/titration/primer'
import { can, countingTrials, endpointConfirmed, flaskOf, type Action } from './actions'
import { percentError } from './entries'
import { equivalenceUl, flaskChemistry, isPink, type Flask } from './flask'
import type { TitrationModel } from './model'
import { PINNED_MODEL as m } from './pinnedModel'
import { flaskView, trialOutcome, trueNaoh } from './select'
import { labSetup } from './setup'
import { currentTrial, titrationStateSchema, type TitrationState, type Trial } from './state'
import { calculatedMolarityE6, honestReading, learner, type Technique } from './testkit'

const { run, readyTrial, prepared, titrateCarefully, finishHonestly, carefulTrial } = learner()

const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const DROPS = [2, 3]
const SEED_LOOP_TIMEOUT = 60_000

const STREAM: Action = { type: 'deliver', amount: 'stream' }
/** The next trial of a lab whose trial has ended, up to an openable stopcock. */
const nextTrial = (s: TitrationState, t?: Technique) => readyTrial(m, run(m, s, [{ type: 'startNextTrial' }]), t)
/** A graded trial's outcome; a trial that is not graded is a fault in the script. */
function graded(s: TitrationState, trial: Trial = currentTrial(s)) {
  const outcome = trialOutcome(m, s, trial)
  if (outcome.state !== 'passed' && outcome.state !== 'failed') throw new Error(`trial ${trial.index} is ${outcome.state}`)
  return outcome
}
/**
 * The signed percent error of a graded trial's molarity, worked with the function the outcome uses. The outcome
 * itself holds a passed trial's back until three trials count (spec 7.3), so wherever it does give one, it is this.
 */
function errorOf(s: TitrationState, trial: Trial = currentTrial(s)): number {
  const error = percentError(trial.molarityE6!, labSetup(m, s.seed).naohE5)
  const outcome = graded(s, trial)
  if (outcome.state === 'failed' || countingTrials(m, s).length >= m.passesToComplete) expect(outcome.percentError).toBe(error)
  else expect(outcome.percentError).toBeNull()
  return error
}
/** A graded trial as the plan gives it: pass or fail, the percent error to three decimals, the causes. */
const result = (s: TitrationState, trial?: Trial) => {
  const { state, causes } = graded(s, trial)
  return { state, percentError: errorOf(s, trial).toFixed(3), causes }
}
/**
 * The careful first trial of a seed, titrated to its confirmed endpoint. Most checks start from it, and a state is
 * never changed in place, so each is worked out once and shared.
 */
const carefulRuns = new Map<string, ReturnType<typeof titrateCarefully>>()
function carefulRun(seed: number, drops: number) {
  const key = `${seed}/${drops}`
  if (!carefulRuns.has(key)) carefulRuns.set(key, titrateCarefully(m, prepared(m, seed, { drops })))
  return carefulRuns.get(key)!
}
const range = (values: readonly number[], digits: number) => [Math.min(...values).toFixed(digits), Math.max(...values).toFixed(digits)]

/** Microlitres of titrant past equivalence at which the mixed flask reaches the threshold; the volume need not be whole. */
function excessToThreshold(flask: Flask, model: TitrationModel = m): number {
  const equivalence = equivalenceUl(flask)
  let lo = -100
  let hi = 100
  expect(isPink(model, { ...flask, deliveredUl: equivalence + lo })).toBe(false)
  expect(isPink(model, { ...flask, deliveredUl: equivalence + hi })).toBe(true)
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (isPink(model, { ...flask, deliveredUl: equivalence + mid })) hi = mid
    else lo = mid
  }
  return hi
}
/** The eight corners of the seeded ranges: HCl outermost, then NaOH, the pipette innermost; low before high in each. */
const corners = (rest: Pick<Flask, 'aliquotPercent' | 'titrantPercent' | 'indicatorDrops' | 'waterUl'>): Flask[] =>
  m.hclRangeE4.flatMap((hclE4) =>
    m.naohRangeE5.flatMap((naohE5) => [-m.pipetteOffsetUl, m.pipetteOffsetUl].map((offset) => ({ hclE4, naohE5, aliquotUl: m.pipetteNominalUl + offset, deliveredUl: 0, ...rest }))),
  )

describe('spec 7.4 check 2, titration curve (HCl and NaOH only, no indicator or CO2)', () => {
  const bare: TitrationModel = { ...m, dissolvedCo2: 0 }
  const HCL_E4 = [850, 950, 1050]
  const NAOH_E5 = [9500, 10000, 10500]
  const flask = (hclE4: number, naohE5: number, deliveredUl: number): Flask => ({
    hclE4,
    aliquotUl: 25000,
    aliquotPercent: 100,
    naohE5,
    titrantPercent: 100,
    indicatorDrops: 0,
    waterUl: 0,
    deliveredUl,
  })

  it('is within 0.01 pH of the closed-form strong acid/strong base solution at every point more than 0.5 mL from equivalence', { timeout: SEED_LOOP_TIMEOUT }, () => {
    let worst = 0
    let points = 0
    for (const hclE4 of HCL_E4) {
      for (const naohE5 of NAOH_E5) {
        const equivalence = equivalenceUl(flask(hclE4, naohE5, 0))
        for (let v = 0; v <= m.buretteCapacityUl; v += m.halfDropUl) {
          if (Math.abs(v - equivalence) <= 500) continue
          const excessAcid = ((hclE4 / 1e4) * 25000 - (naohE5 / 1e5) * v) / (25000 + v)
          // The larger root of x^2 - |excess| x - Kw = 0, so nothing is lost to cancellation: [H+] on the acid side, [OH-] on the basic side.
          const root = (Math.abs(excessAcid) + Math.sqrt(excessAcid * excessAcid + 4 * m.kw)) / 2
          const closedForm = excessAcid >= 0 ? -Math.log10(root) : Math.log10(root) - Math.log10(m.kw)
          worst = Math.max(worst, Math.abs(flaskChemistry(bare, flask(hclE4, naohE5, v)).pH - closedForm))
          points++
        }
      }
    }
    expect(points).toBe(17644) // nine pairs
    expect(worst).toBeLessThan(1e-12) // measured 1.8e-15; the spec asks for 0.01
  })

  it('the volume at which the computed pH crosses 7.00 is within 0.01 mL of the stoichiometric value', () => {
    for (const hclE4 of HCL_E4) {
      for (const naohE5 of NAOH_E5) {
        const equivalence = equivalenceUl(flask(hclE4, naohE5, 0))
        let lo = equivalence - 100
        let hi = equivalence + 100
        for (let i = 0; i < 60; i++) {
          const mid = (lo + hi) / 2
          if (flaskChemistry(bare, flask(hclE4, naohE5, mid)).pH < 7) lo = mid
          else hi = mid
        }
        expect(Math.abs(hi - equivalence)).toBeLessThan(1e-6) // microlitres; the spec asks for 10
      }
    }
  })
})

describe('spec 7.4 check 3, endpoint: a careful run through the state machine', () => {
  it.each([
    { drops: 2, past: ['11.21', '35.03'], firstOrSecond: [56, 44], largestPinkBefore: '2.54e-12' },
    { drops: 3, past: ['11.21', '36.33'], firstOrSecond: [54, 46], largestPinkBefore: '3.79e-12' },
  ])(
    'seeds 1-100 at $drops drops: below the threshold at every addition before equivalence, the persistent endpoint between V_eq and V_eq + 0.05 mL, the trial not flagged as overshoot',
    ({ drops, past, firstOrSecond, largestPinkBefore }) => {
      const pastUl: number[] = []
      const lengths: number[] = []
      const landedOn = [0, 0, 0] // the endpoint as the first, second or a later addition at or past equivalence
      let pinkBefore = 0
      for (const seed of SEEDS) {
        const { state, additions } = carefulRun(seed, drops)
        for (const a of additions.slice(0, -1)) expect(a.pinkConcentration).toBeLessThan(m.faintPinkConcentration)
        const before = additions.filter((a) => a.side < 0)
        pinkBefore = Math.max(pinkBefore, ...before.map((a) => a.pinkConcentration))
        landedOn[Math.min(additions.length - before.length, 3) - 1]! += 1
        lengths.push(additions.length)
        expect(currentTrial(state).end).toBe('open') // not overshot
        expect(endpointConfirmed(m, state)).toBe(true)
        const flask = flaskOf(m, state)
        expect(flask.deliveredUl).toBe(additions.at(-1)!.deliveredUl)
        pastUl.push(flask.deliveredUl - equivalenceUl(flask))
      }
      expect(Math.min(...pastUl)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...pastUl)).toBeLessThanOrEqual(50)
      expect(range(pastUl, 2)).toEqual(past)
      expect(landedOn).toEqual([...firstOrSecond, 0])
      expect(pinkBefore.toExponential(2)).toBe(largestPinkBefore)
      expect([Math.min(...lengths), Math.max(...lengths)]).toEqual([121, 148])
    },
    SEED_LOOP_TIMEOUT,
  )

  it('seed 1: 143 additions, pH 4.95 then 8.96, pink 3.51e-6 M', () => {
    const { additions } = carefulRun(1, 2)
    expect(additions).toHaveLength(143)
    expect(additions.slice(-2).map((a) => [a.amount, a.deliveredUl, a.side, a.pH.toFixed(2)])).toEqual([
      ['half', 25675, -1, '4.95'],
      ['half', 25700, 1, '8.96'],
    ])
    expect(additions.at(-1)!.pinkConcentration.toExponential(2)).toBe('3.51e-6')
  })
})

describe('spec 7.4 check 4, endpoint, whatever the grid offset: for every flask a learner can make', () => {
  const flasks = DROPS.flatMap((indicatorDrops) =>
    [0, 10000, 20000, 30000].flatMap((waterUl) =>
      [100, m.wetPipetteStrengthPercent].flatMap((aliquotPercent) =>
        [100, m.unconditionedStrengthPercent].flatMap((titrantPercent) => corners({ aliquotPercent, titrantPercent, indicatorDrops, waterUl })),
      ),
    ),
  )

  it('either dilution error, 2 or 3 drops, up to 30 mL of water: the threshold is reached more than 0 and at most 0.025 mL past equivalence', () => {
    const excess = flasks.map((flask) => excessToThreshold(flask))
    expect(excess).toHaveLength(256)
    expect(Math.min(...excess)).toBeGreaterThan(0)
    expect(Math.max(...excess)).toBeLessThanOrEqual(m.halfDropUl)
    expect(range(excess, 3)).toEqual(['9.599', '16.274'])
    // The largest: the most indicator and water to turn, a full-strength aliquot, and the weaker titrant to turn it with.
    expect(flasks[excess.indexOf(Math.max(...excess))]).toMatchObject({ indicatorDrops: 3, waterUl: 30000, aliquotPercent: 100, titrantPercent: 98 })
  })

  it("the other carbonic constants the source's page prints move the threshold by about 0.1 uL at most, as the record's note says", { timeout: SEED_LOOP_TIMEOUT }, () => {
    // The record's two constants come from a page whose body prints one other set for them (the note on the first says where).
    const stored = flasks.map((flask) => excessToThreshold(flask))
    const excess = flasks.map((flask) => excessToThreshold(flask, { ...m, carbonicPKas: [6.77, 9.93] }))
    expect(Math.min(...excess)).toBeGreaterThan(0)
    expect(Math.max(...excess)).toBeLessThanOrEqual(m.halfDropUl)
    const moved = Math.max(...excess.map((x, i) => Math.abs(x - stored[i]!)))
    expect([...range(excess, 3), moved.toFixed(3)]).toEqual(['9.653', '16.351', '0.113'])
    expect(titrationData.constants.carbonicPKas[0]!.note).toContain(`by about ${moved.toFixed(1)} µL at most`)
  })

  it('a correct endpoint is named "faint pink": the latest a half-drop can land, 24.999 uL past the threshold, is below the name limit at every corner', () => {
    // The limit is the record's, chosen by eye and free to move; the deepest correct endpoints are the model's.
    const limit = titrationData.parameters.faintPinkNameLimit.value
    const deepest = DROPS.map((indicatorDrops) => {
      const pink = corners({ aliquotPercent: 100, titrantPercent: 100, indicatorDrops, waterUl: 0 }).map(
        (flask) => flaskChemistry(m, { ...flask, deliveredUl: equivalenceUl(flask) + excessToThreshold(flask) + 24.999 }).pinkConcentration,
      )
      for (const concentration of pink) expect(concentration).toBeLessThan(limit)
      // HCl low, NaOH high, pipette low is the third corner.
      return [Math.max(...pink).toExponential(3), pink.indexOf(Math.max(...pink))]
    })
    expect(deepest).toEqual([
      ['1.371e-5', 2],
      ['1.474e-5', 2],
    ])
  })
})

describe('spec 7.4 checks 7 and 8, a careful lab', () => {
  it(
    'seeds 1-100 at 2 and 3 drops: every lab completes in exactly three trials, and every trial passes and counts',
    () => {
      const errors: number[] = []
      for (const drops of DROPS) {
        for (const seed of SEEDS) {
          let s = finishHonestly(m, carefulRun(seed, drops).state)
          s = carefulTrial(m, nextTrial(s, { drops }))
          expect(s.status).toBe('in-progress')
          // Two trials count and the lab is not done: neither shows its percent error.
          expect(s.trials.map((trial) => graded(s, trial).percentError)).toEqual([null, null])
          s = carefulTrial(m, nextTrial(s, { drops }))
          expect(s.status).toBe('completed')
          expect(s.trials).toHaveLength(3)
          for (const trial of s.trials) {
            const outcome = graded(s, trial)
            expect(outcome).toMatchObject({ state: 'passed', causes: [], counts: true })
            // The completed lab gives each trial's percent error, the one worked from its typed molarity.
            expect(outcome.percentError).toBe(errorOf(s, trial))
            errors.push(outcome.percentError!)
          }
        }
      }
      expect(errors).toHaveLength(600)
      expect(range(errors, 3)).toEqual(['-0.316', '0.087'])
    },
    SEED_LOOP_TIMEOUT,
  )
})

describe('spec 7.4 check 8, technique errors: each alone moves the calculated molarity in the stated direction by more than 1.5%, fails, is named, and a careful run on that flask is not flagged as overshoot', () => {
  it.each([
    ['an unconditioned burette', { condition: false }, 'burette-not-conditioned', -1, ['-2.168', '-1.864']],
    ['a tip bubble not cleared', { clearBubble: false }, 'tip-bubble', -1, ['-2.871', '-2.148']],
    ['a pipette not rinsed', { rinse: false }, 'pipette-not-rinsed', 1, ['1.910', '2.216']],
  ] as const)(
    '%s, seeds 1-100 at 2 and 3 drops, first trial, Challenge, honest readings',
    (_name, technique, cause, sign, expected) => {
      const shifts: number[] = []
      for (const drops of DROPS) {
        for (const seed of SEEDS) {
          const careful = finishHonestly(m, carefulRun(seed, drops).state)
          const titrated = titrateCarefully(m, prepared(m, seed, { drops, ...technique })).state
          expect(titrated.mode).toBe('challenge')
          expect(currentTrial(titrated).end).toBe('open') // not overshot: judged on this flask's own equivalence volume
          const flawed = finishHonestly(m, titrated)
          expect(graded(flawed)).toMatchObject({ state: 'failed', causes: [cause], counts: false })
          const shift = errorOf(flawed) - errorOf(careful)
          expect(sign * shift).toBeGreaterThan(1.5)
          shifts.push(shift)
        }
      }
      expect(shifts).toHaveLength(200)
      expect(range(shifts, 3)).toEqual(expected)
    },
    SEED_LOOP_TIMEOUT,
  )

  it('an unconditioned burette still fails after a refill and passes once conditioned (seed 1)', () => {
    const stillDilute = { state: 'failed', percentError: '-2.126', causes: ['burette-not-conditioned'] }
    let s = carefulTrial(m, prepared(m, 1, { condition: false }))
    expect(result(s)).toEqual(stillDilute)
    for (let trial = 2; trial <= 3; trial++) {
      s = carefulTrial(m, nextTrial(s))
      expect(result(s)).toEqual(stillDilute)
    }
    // Conditioning empties the burette, so the fill after it puts a new bubble in the tip.
    s = carefulTrial(m, nextTrial(s, { condition: true, clearBubble: true }))
    expect(s.trials).toHaveLength(4)
    expect(currentTrial(s).startLevelUl).toBe(1990 + 600) // this trial's fill level, lowered by the bubble that was cleared
    expect(result(s)).toEqual({ state: 'passed', percentError: '-0.126', causes: [] })
  })

  it.each([
    ['a wet pipette', { rinse: false }],
    ['an escaped bubble', { clearBubble: false }],
  ])('%s leaves the next trial unaffected (seed 1)', (_name, technique) => {
    let s = carefulTrial(m, prepared(m, 1, technique))
    expect(graded(s).state).toBe('failed')
    s = carefulTrial(m, nextTrial(s))
    expect(result(s)).toEqual({ state: 'passed', percentError: '-0.232', causes: [] })
  })
})

describe('spec 7.4 check 9, distilled water: adding 10, 20 or 30 mL leaves the equivalence volume unchanged, moves a careful endpoint by at most one half-drop, and never changes whether a careful trial passes', () => {
  it.each([
    [1, 10],
    [2, 24],
    [3, 36],
  ])(
    '%i washes of 10 mL, seeds 1-100 at 2 and 3 drops: the endpoint is one half-drop later in %i of 200 runs',
    (washes, movedRuns) => {
      let moved = 0
      for (const drops of DROPS) {
        for (const seed of SEEDS) {
          const dry = carefulRun(seed, drops).state
          const wet = titrateCarefully(m, prepared(m, seed, { drops, washes })).state
          expect(currentTrial(wet).waterUl).toBe(washes * m.waterStepUl)
          expect(equivalenceUl(flaskOf(m, wet))).toBe(equivalenceUl(flaskOf(m, dry)))
          const later = currentTrial(wet).deliveredUl - currentTrial(dry).deliveredUl
          expect([0, m.halfDropUl]).toContain(later)
          if (later > 0) moved++
          expect(currentTrial(wet).end).toBe('open') // not overshot
          for (const finished of [finishHonestly(m, dry), finishHonestly(m, wet)]) {
            expect(graded(finished)).toMatchObject({ state: 'passed', causes: [], counts: true })
          }
        }
      }
      expect(moved).toBe(movedRuns)
    },
    SEED_LOOP_TIMEOUT,
  )

  it('a fourth addition is refused', () => {
    expect(can(m, prepared(m, 1, { washes: 3 }), { type: 'addWater' })).toBe('water-full')
  })
})

describe('spec 7.4 check 7, honest trial: trials that do not count never complete the lab; the third that counts does', () => {
  it('a whole lab that is not honest (seed 1): one failed trial, three final readings typed to fit, then the burette conditioned and three honest trials', () => {
    // The route D1 closes: the burette never conditioned, an honest failed trial, then the titre typed that the
    // failed trial's percent error gives away (25.68 mL, for 0.0950 M).
    let s = carefulTrial(m, prepared(m, 1, { condition: false }))
    for (const typedUl of [26240, 27120, 27670]) {
      s = run(m, titrateCarefully(m, nextTrial(s)).state, [{ type: 'recordFinalReading', readingUl: typedUl }])
      s = run(m, s, [{ type: 'submitMolarity', molarityE6: calculatedMolarityE6(m, s.hclRecordedE6!, typedUl - currentTrial(s).initialReadingUl!) }])
      expect(graded(s)).toMatchObject({ state: 'passed', causes: ['burette-not-conditioned', 'final-misread'], counts: false })
    }
    expect(s.trials).toHaveLength(4)
    expect(s.status).toBe('in-progress')

    s = carefulTrial(m, nextTrial(s, { condition: true, clearBubble: true }))
    s = carefulTrial(m, nextTrial(s))
    expect(s.status).toBe('in-progress')
    expect(countingTrials(m, s)).toHaveLength(2)
    s = carefulTrial(m, nextTrial(s))
    expect(s.status).toBe('completed')
    expect(s.trials).toHaveLength(7)
    expect(countingTrials(m, s)).toEqual(s.trials.slice(4))
    expect(s.trials.map((trial) => [graded(s, trial).state, graded(s, trial).counts])).toEqual([
      ['failed', false],
      ['passed', false],
      ['passed', false],
      ['passed', false],
      ['passed', true],
      ['passed', true],
      ['passed', true],
    ])
    expect(can(m, s, { type: 'startNextTrial' })).toBe('lab-completed')
  })
})

describe("spec 7.4 check 7, honest trial: a trial within 1.0% with a technique error named in it is passed and does not count (the owner's decision of 2026-10-05)", () => {
  /** Nothing of the answer is released by trials that do not count: no true molarity, and no percent error of a passed trial. */
  function expectWithheld(s: TitrationState) {
    expect(s.status).toBe('in-progress')
    expect(countingTrials(m, s)).toEqual([])
    expect(trueNaoh(m, s)).toBeNull()
    for (const trial of s.trials) {
      const outcome = trialOutcome(m, s, trial)
      if (outcome.state === 'passed') expect(outcome.percentError).toBeNull()
    }
  }
  /**
   * No dead end: a learner who from here does the right thing reaches three trials that count. They condition a
   * burette that is not conditioned, clear whatever air is in the tip, and pipette with the pipette the last aliquot
   * left wet with acid. The lab completes on the third such trial, and none of the three has a cause named in it.
   */
  function expectCompletesWhenPutRight(s: TitrationState, drops: number) {
    const before = s.trials.length
    for (let i = 0; i < m.passesToComplete; i++) {
      expect(s.status).toBe('in-progress')
      s = carefulTrial(m, nextTrial(s, { drops, condition: !s.burette.conditioned || s.burette.diluted, clearBubble: true }))
      expect(graded(s)).toMatchObject({ state: 'passed', causes: [], counts: true })
    }
    expect(s.status).toBe('completed')
    expect(countingTrials(m, s)).toEqual(s.trials.slice(before))
  }

  // Two pairs of mistakes push the result opposite ways. With the burette, the two 2.0% dilutions cancel exactly:
  // the flask's equivalence volume is the careful one's. With the bubble, 0.60 mL more titre against 2.0% less acid.
  it.each([
    ['an unconditioned burette with an unrinsed pipette', { condition: false, rinse: false }, ['burette-not-conditioned', 'pipette-not-rinsed'], 200],
    ['a tip bubble with an unrinsed pipette', { clearBubble: false, rinse: false }, ['tip-bubble', 'pipette-not-rinsed'], 186],
  ] as const)(
    '%s, seeds 1-100 at 2 and 3 drops, honest readings: never counts, and the learner who then does the right thing completes the lab',
    (_name, technique, causes, passing) => {
      let passed = 0
      for (const drops of DROPS) {
        for (const seed of SEEDS) {
          const s = carefulTrial(m, prepared(m, seed, { drops, ...technique }))
          const outcome = graded(s)
          expect(outcome).toMatchObject({ causes, counts: false })
          if (outcome.state === 'passed') passed++
          expectWithheld(s)
          expectCompletesWhenPutRight(s, drops)
        }
      }
      // How many of the 200 are within 1.0%: these are the trials the decision is about.
      expect(passed).toBe(passing)
    },
    SEED_LOOP_TIMEOUT,
  )

  /** A trial read with the whole bubble in the tip, run for `pours` stream additions, and its flask discarded. */
  const partBubble = (seed: number, pours: number) =>
    run(m, prepared(m, seed, { clearBubble: false }), [...Array.from({ length: pours }, () => STREAM), { type: 'discardTrial' }])

  it(
    'a tip bubble partly run out into a discarded flask (16 stream additions, 4 mL) does not count in the next trial, seeds 1-100: 0.12 mL of air is left, the trial is within 1.0% and names the bubble',
    () => {
      for (const seed of SEEDS) {
        const discarded = partBubble(seed, 16)
        expect(discarded.burette.tipAirUl).toBe(600 - 16 * 30)
        const s = carefulTrial(m, nextTrial(discarded))
        expect(graded(s)).toMatchObject({ state: 'passed', percentError: null, causes: ['tip-bubble'], counts: false })
        expectWithheld(s)
        // The rest of the bubble left the tip in that trial.
        expect(s.burette.tipAirUl).toBe(0)
        expectCompletesWhenPutRight(s, 2)
      }
    },
    SEED_LOOP_TIMEOUT,
  )

  it(
    'what is left of a part-escaped bubble can still be cleared, after any number of stream additions (seeds 1-100): the next trial then counts',
    () => {
      for (const seed of SEEDS) {
        for (const pours of [1, 8, 12, 16, 19]) {
          const discarded = partBubble(seed, pours)
          const s = run(m, discarded, [{ type: 'startNextTrial' }, { type: 'fillBurette' }])
          expect(s.burette.tipAirUl).toBe(600 - pours * 30) // a refill neither brings the bubble back nor takes it away
          expect(can(m, s, { type: 'clearTipBubble' })).toBeNull()
          if (pours === 16 || seed <= 10) expectCompletesWhenPutRight(discarded, 2)
        }
      }
    },
    SEED_LOOP_TIMEOUT,
  )

  it(
    'no lab is completed on part bubbles: three trials each run after 18 stream additions into a discarded flask, the burette conditioned again before each, seeds 1-100',
    () => {
      for (const seed of SEEDS) {
        let s = partBubble(seed, 18)
        for (let k = 0; k < 3; k++) {
          // Conditioning empties the burette, so the fill after it makes a new bubble.
          if (k > 0) s = run(m, readyTrial(m, run(m, s, [{ type: 'startNextTrial' }]), { condition: true }), [...Array.from({ length: 18 }, () => STREAM), { type: 'discardTrial' }])
          s = carefulTrial(m, nextTrial(s))
          expect(graded(s)).toMatchObject({ state: 'passed', causes: ['tip-bubble'], counts: false })
        }
        expect(s.trials).toHaveLength(6)
        expectWithheld(s)
        expectCompletesWhenPutRight(s, 2)
      }
    },
    SEED_LOOP_TIMEOUT,
  )
})

describe("the primer's figure for the 5 mL pour (Gate A, N12)", () => {
  it(
    'a Challenge learner who runs in 5 mL whenever the burette shows more than 7 mL still to go to their estimate never reaches the endpoint by it: seeds 1-100, every combination of the three technique steps',
    () => {
      const card = TITRATION_PRIMER.find((s) => s.id === 'titrating')!.paragraphs.map((p) => p.text).join(' ')
      const [, figure] = /Run in 5 mL at once only while you are more than (\d+) mL short of your estimate/.exec(card) ?? []
      const shortUl = Number(figure) * 1000
      const pour = Array.from({ length: 5000 / m.streamUl }, () => STREAM)
      expect(pour).toHaveLength(20)
      let closest = Infinity
      let pours = 0
      for (const seed of SEEDS) {
        // The card's estimate: the label x 25.00 / 0.1, in uL.
        const estimateUl = labSetup(m, seed).hclE4 * 25
        for (const condition of [true, false]) {
          for (const clearBubble of [true, false]) {
            for (const rinse of [true, false]) {
              let s = prepared(m, seed, { condition, clearBubble, rinse })
              expect(s.mode).toBe('challenge') // Guided's hint would close the stopcock within 1 mL of the endpoint
              // The titre so far as the learner has it: the meniscus read now, less the initial reading in the notebook.
              const soFar = () => honestReading(s.burette.levelUl) - currentTrial(s).initialReadingUl!
              while (estimateUl - soFar() > shortUl) {
                s = run(m, s, pour)
                pours++
                const flask = flaskOf(m, s)
                expect(currentTrial(s).end).toBe('open')
                expect(isPink(m, flask)).toBe(false)
                closest = Math.min(closest, equivalenceUl(flask) - flask.deliveredUl)
              }
            }
          }
        }
      }
      // Every run has pours in it (the smallest estimate is 21.25 mL). By the arithmetic of primer.test.ts no pour can
      // end nearer than 0.22 mL to its flask's equivalence volume; over these 800 runs the nearest, as measured, is 1.02 mL.
      expect(pours).toBeGreaterThan(800 * 2)
      expect(closest).toBeGreaterThan(220)
      expect((closest / 1000).toFixed(2)).toBe('1.02')
    },
    SEED_LOOP_TIMEOUT,
  )
})

describe("the primer's advice by the cue alone (Gate A, the last check)", () => {
  it(
    'the stream closed at its first "fades slowly", single drops until one fades slowly, then half-drops: the first drop fades at once again, and the endpoint is reached and never overshot, seeds 1-100 at 2 and 3 drops',
    () => {
      const plumeOf = (s: TitrationState) => flaskView(m, s).plume
      /** Adds `amount` until `stop` says so. Returns the state and how many were added. */
      const add = (s: TitrationState, amount: 'stream' | 'drop' | 'half', stop: (s: TitrationState) => boolean): [TitrationState, number] => {
        let count = 0
        do {
          s = run(m, s, [{ type: 'deliver', amount }])
          count++
        } while (!stop(s))
        return [s, count]
      }
      const slowlyOrPink = (s: TitrationState) => plumeOf(s) !== 'fades-at-once'
      let mostDropsAtOnce = 0
      for (const drops of DROPS) {
        for (const seed of SEEDS) {
          let s = prepared(m, seed, { drops })
          expect(s.mode).toBe('challenge') // Guided's hint would close the stopcock for the learner
          ;[s] = add(s, 'stream', slowlyOrPink)
          expect([seed, plumeOf(s)]).toEqual([seed, 'fades-slowly'])
          // The cue is of the addition's size: the drop that follows the stream's "fades slowly" fades at once.
          const [afterDrops, dropCount] = add(s, 'drop', slowlyOrPink)
          expect([seed, dropCount]).toEqual([seed, expect.toSatisfy((n: number) => n > 1)])
          mostDropsAtOnce = Math.max(mostDropsAtOnce, dropCount - 1)
          s = afterDrops
          if (plumeOf(s) === 'fades-slowly') [s] = add(s, 'half', (after) => plumeOf(after) === 'persists')
          expect([seed, currentTrial(s).end, isPink(m, flaskOf(m, s))]).toEqual([seed, 'open', true])
          expect([seed, graded(finishHonestly(m, run(m, s, [{ type: 'swirlAndWait' }])))]).toEqual([seed, expect.objectContaining({ state: 'passed', counts: true })])
        }
      }
      // As many as this many single drops in a row read "fades at once" before one fades slowly.
      expect(mostDropsAtOnce).toBe(35)
    },
    SEED_LOOP_TIMEOUT,
  )
})

describe("the primer's four cards to read first (Gate A, the last check)", () => {
  it(
    'a Challenge learner who takes none of the three technique steps, and is careful and honest otherwise, fails the first trial and the second after a refill, seeds 1-100: the card that tells the steps cannot wait',
    () => {
      for (const seed of SEEDS) {
        let s = carefulTrial(m, prepared(m, seed, { condition: false, clearBubble: false, rinse: false }))
        expect([seed, graded(s)]).toEqual([seed, expect.objectContaining({ state: 'failed', causes: ['burette-not-conditioned', 'tip-bubble', 'pipette-not-rinsed'] })])
        // The bubble has left and the pipette is wet with acid; the burette stays dilute through the refill.
        s = carefulTrial(m, nextTrial(s))
        expect([seed, graded(s)]).toEqual([seed, expect.objectContaining({ state: 'failed', causes: ['burette-not-conditioned'] })])
      }
    },
    SEED_LOOP_TIMEOUT,
  )
})

describe('spec 7.4 check 12, reproducibility', () => {
  it('the same seed and the same learner actions give identical readings and expected answer', () => {
    for (const seed of [1, 2, 99, 4294967295]) expect(carefulTrial(m, prepared(m, seed))).toEqual(carefulTrial(m, prepared(m, seed)))
    expect(carefulTrial(m, prepared(m, 1))).not.toEqual(carefulTrial(m, prepared(m, 2)))
  })

  it("a trial's seeded values do not depend on earlier trials: trial 2 after a careful trial 1, and after one overshot with 3 drops and 20 mL of water", () => {
    const afterCareful = nextTrial(carefulTrial(m, prepared(m, 1)))
    let overshot = prepared(m, 1, { drops: 3, washes: 2 })
    while (currentTrial(overshot).end === 'open') overshot = run(m, overshot, [STREAM])
    expect(currentTrial(overshot)).toMatchObject({ end: 'overshot', indicatorDrops: 3, waterUl: 20000 })
    const afterOvershot = nextTrial(overshot)
    expect(flaskOf(m, afterOvershot)).toEqual(flaskOf(m, afterCareful))
    expect(afterOvershot.burette).toEqual(afterCareful.burette)
    expect(afterCareful.burette.levelUl).toBe(562)
  })
})

describe('spec 7.4 check 13, resume: a lab reloaded from storage after every action, each stream addition included, ends in the same state as one never reloaded', () => {
  // What the app does on every save and load: JSON text, then the schema.
  const reload = (state: TitrationState) => titrationStateSchema.parse(JSON.parse(JSON.stringify(state)))
  const reloading = learner(reload)

  it.each([
    ['a careful technique', {}],
    ['every technique error', { condition: false, clearBubble: false, rinse: false, drops: 3, washes: 1 }],
  ])('%s, seeds 1, 7 and 99, three trials each', (_name, technique: Technique) => {
    for (const seed of [1, 7, 99]) {
      let live = carefulTrial(m, prepared(m, seed, technique))
      let resumed = reloading.carefulTrial(m, reloading.prepared(m, seed, technique))
      for (let trial = 2; trial <= 3; trial++) {
        live = carefulTrial(m, nextTrial(live))
        resumed = reloading.carefulTrial(m, reloading.readyTrial(m, reloading.run(m, resumed, [{ type: 'startNextTrial' }])))
      }
      expect(live.trials).toHaveLength(3)
      expect(resumed).toEqual(live)
      expect(JSON.stringify(resumed)).toBe(JSON.stringify(live))
    }
  })

  it('after 40 stream additions and a reload: 10 000 uL delivered, meniscus 12 563', () => {
    const resumed = reload(run(m, prepared(m, 1), Array<Action>(40).fill(STREAM)))
    expect(currentTrial(resumed).deliveredUl).toBe(10000)
    expect(resumed.burette.levelUl).toBe(12563)
  })

  it('a reload after any single stream addition of a run resumes at that delivered volume, and ends where the run never reloaded does', () => {
    const start = prepared(m, 1)
    const streamed = titrateCarefully(m, start).additions.filter((a) => a.amount === 'stream').length
    expect(streamed).toBe(94)
    const end = carefulTrial(m, start)
    let s = start
    for (let n = 1; n <= streamed; n++) {
      s = run(m, s, [STREAM])
      const resumed = reload(s)
      expect(resumed).not.toBe(s)
      expect(currentTrial(resumed).deliveredUl).toBe(n * m.streamUl)
      expect(carefulTrial(m, resumed)).toEqual(end)
    }
  })
})
