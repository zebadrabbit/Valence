// The acceptance list of spec 7.4, run through the state machine. Checks 1, 5, 6, 10 and 11 are held by the tests of
// the files they belong to (ph, entries, actions), in cases named after them; what is here needs a whole run or a whole lab.
import { describe, expect, it } from 'vitest'
import { titrationData } from '@/chem-data/titration/data'
import { can, countingTrials, endpointConfirmed, flaskOf, type Action } from './actions'
import { equivalenceUl, flaskChemistry, isPink, type Flask } from './flask'
import type { TitrationModel } from './model'
import { PINNED_MODEL as m } from './pinnedModel'
import { trialOutcome } from './select'
import { currentTrial, titrationStateSchema, type TitrationState, type Trial } from './state'
import { calculatedMolarityE6, learner, type Technique } from './testkit'

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
/** A graded trial as the plan gives it: pass or fail, the percent error to three decimals, the causes. */
const result = (s: TitrationState, trial?: Trial) => {
  const { state, percentError, causes } = graded(s, trial)
  return { state, percentError: percentError.toFixed(3), causes }
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
function excessToThreshold(flask: Flask): number {
  const equivalence = equivalenceUl(flask)
  let lo = -100
  let hi = 100
  expect(isPink(m, { ...flask, deliveredUl: equivalence + lo })).toBe(false)
  expect(isPink(m, { ...flask, deliveredUl: equivalence + hi })).toBe(true)
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (isPink(m, { ...flask, deliveredUl: equivalence + mid })) hi = mid
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

  it('is within 0.01 pH of the closed-form strong acid/strong base solution at every point more than 0.5 mL from equivalence', () => {
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
  it('either dilution error, 2 or 3 drops, up to 30 mL of water: the threshold is reached more than 0 and at most 0.025 mL past equivalence', () => {
    const flasks = DROPS.flatMap((indicatorDrops) =>
      [0, 10000, 20000, 30000].flatMap((waterUl) =>
        [100, m.wetPipetteStrengthPercent].flatMap((aliquotPercent) =>
          [100, m.unconditionedStrengthPercent].flatMap((titrantPercent) => corners({ aliquotPercent, titrantPercent, indicatorDrops, waterUl })),
        ),
      ),
    )
    const excess = flasks.map(excessToThreshold)
    expect(excess).toHaveLength(256)
    expect(Math.min(...excess)).toBeGreaterThan(0)
    expect(Math.max(...excess)).toBeLessThanOrEqual(m.halfDropUl)
    expect(range(excess, 3)).toEqual(['9.599', '16.274'])
    // The largest: the most indicator and water to turn, a full-strength aliquot, and the weaker titrant to turn it with.
    expect(flasks[excess.indexOf(Math.max(...excess))]).toMatchObject({ indicatorDrops: 3, waterUl: 30000, aliquotPercent: 100, titrantPercent: 98 })
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
          s = carefulTrial(m, nextTrial(s, { drops }))
          expect(s.status).toBe('completed')
          expect(s.trials).toHaveLength(3)
          for (const trial of s.trials) {
            const outcome = graded(s, trial)
            expect(outcome).toMatchObject({ state: 'passed', causes: [], counts: true })
            errors.push(outcome.percentError)
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
          const shift = graded(flawed).percentError - graded(careful).percentError
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
