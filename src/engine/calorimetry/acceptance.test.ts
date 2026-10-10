import { describe, expect, it } from 'vitest'
import { calorimetryData, candidatesOf, PART_IDS, type PartId } from '@/chem-data/calorimetry/data'
import { mulberry32 } from '../rng'
import { can, reduce, warnings, type Action } from './actions'
import { parseSig3, type Sig3 } from './entries'
import { modelFrom, type CalorimetryModel } from './model'
import { PINNED_MODEL } from './pinnedModel'
import { doneParts, partView, runOutcome, runOutcomes } from './select'
import { labSetup, runSetup } from './setup'
import { calorimetryStateSchema, createLab, currentRun, judge, readingsOf, storedResult, type CalorimetryState, type Mode, type Reason } from './state'
import { entryActions, looks, run, wholeRun, workCup, worksheetValues, type Arithmetic, type Technique } from './testkit'
import { FIELDS, percentOff, type Field } from './worksheet'

// Spec 16.6, the calorimetry lab's acceptance list, on the engine and the stored record. Its last item, the
// descriptions in words of the cup and of the graph, is the wording module's (src/app/lab/calorimetry/messages.test.ts).

const m = modelFrom(calorimetryData)
const schema = calorimetryStateSchema(m)
const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const MODES: Mode[] = ['guided', 'challenge']
const sig = (text: string): Sig3 => parseSig3(text)!
/** Through JSON and the schema, as a reload does. */
const reloaded = (state: CalorimetryState): CalorimetryState => schema.parse(JSON.parse(JSON.stringify(state)))
const range = (values: number[]) => [Math.min(...values), Math.max(...values)].map((x) => Number(x.toFixed(2)))
const trueMetal = (seed: number) => m.candidates[labSetup(m, seed).metalIndex]!.id
/** How far the size of a run's result is from the stored size, in percent, whatever the run's outcome: for these tests only. */
const off = (state: CalorimetryState, part: PartId) => {
  const { entries } = currentRun(state, part)
  const { stored, scale } = storedResult(m, state.seed, part)
  return percentOff((part === 'metal' ? entries.specificHeat : entries.perMole)!, stored, scale)
}
const reasonsOf = (state: CalorimetryState, part: PartId): Reason[] => {
  const outcome = runOutcome(m, state, part, currentRun(state, part))
  return outcome.state === 'does-not-count' ? outcome.reasons : []
}

describe('the model the lab runs on', () => {
  it('is the pinned model: the stored record gives the numbers every expected value here is worked from', () => {
    expect(m).toEqual(PINNED_MODEL)
    expect(m.candidates.map((c) => c.id)).toEqual(candidatesOf(calorimetryData).map((c) => c.id))
  })
})

describe('a careful run (spec 16.6, first item)', () => {
  const CAREFUL: Record<PartId, [number, number]> = { neutralisation: [-1.57, -1.57], dissolving: [-2.89, -0.84], metal: [-3.08, -0.44] }

  it.each(PART_IDS)('of %s counts at every seed from 1 to 100, in Guided and in Challenge, within the tolerance of the stored value', (part) => {
    for (const mode of MODES) {
      const offs = SEEDS.map((seed) => {
        const state = wholeRun(m, createLab(seed, mode), part)
        const view = partView(m, state, part)
        expect(view.outcome.state, `${mode} ${seed}`).toBe('counts')
        expect(view.done, `${mode} ${seed}`).toBe(true)
        expect(view.worksheet.every((entry) => entry.verdict?.follows === true), `${mode} ${seed}`).toBe(true)
        const by = view.outcome.state === 'counts' ? view.outcome.percentOff : Number.NaN
        expect(Math.abs(by), `${mode} ${seed}`).toBeLessThanOrEqual(m.tolerancePercent)
        return by
      })
      // Always a little low: the cup has lost heat before its peak.
      expect(range(offs), mode).toEqual(CAREFUL[part])
    }
  }, 60_000)

  it.each(PART_IDS)('of %s counts as well when each entry is worked from the unrounded values, and when a level stretch is run before the change', (part) => {
    for (const how of [{ chain: 'unrounded' }, { before: 0 }, { before: 4, chain: 'unrounded' }] as (Technique & Arithmetic)[]) {
      for (const seed of SEEDS) expect(partView(m, wholeRun(m, createLab(seed, 'guided'), part, how), part).outcome.state, `${JSON.stringify(how)} ${seed}`).toBe('counts')
    }
  }, 60_000)

  it('of part 3 picks the right metal out of the four at every seed, and the part then says which it was', () => {
    for (const seed of SEEDS) {
      const state = wholeRun(m, createLab(seed, 'challenge'), 'metal')
      expect(currentRun(state, 'metal').entries.metal, String(seed)).toBe(trueMetal(seed))
      const metal = m.candidates.find((c) => c.id === trueMetal(seed))!
      expect(partView(m, state, 'metal').expected, String(seed)).toEqual({ kind: 'metal', metalId: metal.id, specificHeat: metal.specificHeatE3 / 1000 })
    }
    expect(new Set(SEEDS.map(trueMetal)).size).toBe(4)
  })

  it('of parts 1 and 2 hands over the stored enthalpy once it counts', () => {
    expect(partView(m, wholeRun(m, createLab(1, 'guided'), 'neutralisation'), 'neutralisation').expected).toEqual({ kind: 'enthalpy', kilojoulesPerMole: -57.706 })
    expect(partView(m, wholeRun(m, createLab(1, 'guided'), 'dissolving'), 'dissolving').expected).toEqual({ kind: 'enthalpy', kilojoulesPerMole: 24.405 })
  })

  it('shows its peak and the turn after it within a few presses of Run on', () => {
    for (const part of PART_IDS) {
      const steps = SEEDS.map((seed) => currentRun(workCup(m, createLab(seed, 'guided'), part, { before: 0 }), part).steps)
      // At most ten steps after the change: five presses.
      expect(Math.max(...steps), part).toBeLessThanOrEqual(10)
    }
  })
})

describe('each technique error alone (spec 16.6, second item)', () => {
  const ERRORS: [string, Technique, Reason, Record<PartId, [number, number]>][] = [
    ['the lid off', { lid: false }, 'lid-off', { neutralisation: [-8.85, -8.85], dissolving: [-10.67, -8.22], metal: [-11.64, -8.81] }],
    ['the stirrer still', { stir: false }, 'not-stirred', { neutralisation: [-10.23, -10.23], dissolving: [-11.9, -9.44], metal: [-13.19, -10.13] }],
  ]

  it.each(ERRORS)('with %s, makes a run not count at every seed from 1 to 100, names its cause, and puts the result outside the tolerance', (_name, technique, reason, expected) => {
    for (const part of PART_IDS) {
      const offs = SEEDS.map((seed) => {
        const state = wholeRun(m, createLab(seed, 'challenge'), part, technique)
        // The arithmetic is right: only the technique is named, and the result it gave.
        expect(reasonsOf(state, part), `${part} ${seed}`).toEqual([reason, 'outside-tolerance'])
        expect(partView(m, state, part).worksheet.every((entry) => entry.verdict?.follows === true), `${part} ${seed}`).toBe(true)
        expect(partView(m, state, part).done, `${part} ${seed}`).toBe(false)
        expect(Math.abs(off(state, part)), `${part} ${seed}`).toBeGreaterThan(m.tolerancePercent + 3)
        return off(state, part)
      })
      expect(range(offs), part).toEqual(expected[part])
    }
  }, 60_000)

  it('names both where both were skipped, and counts neither run in Guided, where the learner was warned and went on', () => {
    for (const part of PART_IDS) {
      for (const seed of SEEDS) {
        let state = createLab(seed, 'guided')
        state = run(m, state, [{ type: 'startLogger', part }])
        expect(warnings(m, state, { type: 'startChange', part })).toEqual(['lid-off', 'not-stirring'])
        state = wholeRun(m, createLab(seed, 'guided'), part, { lid: false, stir: false })
        expect(reasonsOf(state, part), `${part} ${seed}`).toEqual(['lid-off', 'not-stirred', 'outside-tolerance'])
      }
    }
  }, 60_000)

  it('counts a lid put on, or a stirrer started, only from before the change: one that comes late is named all the same', () => {
    for (const part of PART_IDS) {
      const late = (first: 'putLidOn' | 'stir', then: 'putLidOn' | 'stir') => {
        let state = run(m, createLab(3, 'challenge'), [{ type: first, part }, { type: 'startLogger', part }, { type: 'startChange', part }, { type: 'runOn', part }, { type: then, part }])
        while (!partView(m, state, part).graph.turned) state = run(m, state, [{ type: 'runOn', part }])
        state = run(m, state, looks(m, state, part))
        return run(m, state, [...entryActions(part, worksheetValues(m, state, part)), { type: 'check', part }])
      }
      expect(reasonsOf(late('stir', 'putLidOn'), part), part).toContain('lid-off')
      expect(reasonsOf(late('putLidOn', 'stir'), part), part).toContain('not-stirred')
    }
  })

  it('never leaves a learner waiting for a curve that does not turn: the slowest, with the stirrer still, turns within nine minutes of the change', () => {
    for (const part of PART_IDS) {
      for (const technique of [{ stir: false }, { lid: false, stir: false }]) {
        const after = SEEDS.map((seed) => currentRun(workCup(m, createLab(seed, 'challenge'), part, { ...technique, before: 0 }), part).steps)
        expect(Math.max(...after) * m.stepSeconds, part).toBeLessThanOrEqual(9 * 60)
        expect(Math.max(...after), part).toBeLessThan(m.maxSteps)
      }
    }
  })
})

describe('an entry that does not follow (spec 16.6, third item)', () => {
  /** In Challenge: the cup worked with care, the worksheet filled with one slip, and checked. */
  const slipped = (seed: number, part: PartId, slip: Arithmetic['slip']) => wholeRun(m, createLab(seed, 'challenge'), part, { slip })
  const marked = (state: CalorimetryState, part: PartId) => partView(m, state, part).worksheet.filter((entry) => entry.verdict?.follows === false).map((entry) => [entry.field, entry.verdict!.slip])
  /** In Guided: the same worksheet, entry by entry, up to the first one refused. */
  const refusedAt = (seed: number, part: PartId, slip: Arithmetic['slip']): [Field, string] | null => {
    let state = workCup(m, createLab(seed, 'guided'), part)
    state = run(m, state, looks(m, state, part))
    for (const action of entryActions(part, worksheetValues(m, state, part, { slip }))) {
      const blocked = can(m, state, action)
      if (blocked) return [(action as { field: Field }).field, blocked]
      state = reduce(m, state, action)
    }
    return null
  }

  it('is marked in Challenge and refused in Guided when the result has the wrong sign, at every seed, and is named as that', () => {
    for (const seed of SEEDS) {
      const state = slipped(seed, 'neutralisation', 'no-sign')
      expect(marked(state, 'neutralisation'), String(seed)).toEqual([['perMole', 'wrong-sign']])
      expect(reasonsOf(state, 'neutralisation'), String(seed)).toEqual(['entries-do-not-follow'])
      expect(refusedAt(seed, 'neutralisation', 'no-sign'), String(seed)).toEqual(['perMole', 'wrong-sign'])
    }
  }, 60_000)

  it('is marked in Challenge and refused in Guided when the result is cut off where it should be rounded, wherever cutting off and rounding differ', () => {
    let differ = 0
    for (const part of PART_IDS) {
      const result = part === 'metal' ? 'specificHeat' : 'perMole'
      for (const seed of SEEDS) {
        const state = slipped(seed, part, 'cut-off')
        const careful = wholeRun(m, createLab(seed, 'challenge'), part)
        if (JSON.stringify(currentRun(state, part).entries[result]) === JSON.stringify(currentRun(careful, part).entries[result])) continue
        const verdict = partView(m, state, part).worksheet.find((entry) => entry.field === result)!.verdict!
        // Where the cut-off value is itself a correct rounding of another way of working the entry, it stands.
        if (verdict.follows) continue
        differ++
        expect(marked(state, part), `${part} ${seed}`).toEqual([[result, 'cut-off']])
        expect(refusedAt(seed, part, 'cut-off'), `${part} ${seed}`).toEqual([result, 'cut-off'])
        expect(reasonsOf(state, part), `${part} ${seed}`).toEqual(['entries-do-not-follow'])
      }
    }
    // Part 1's result has nothing to cut at these seeds: every run rises by 6.8 °C, and 2840 J over 0.0500 mol is 56.8 exactly.
    expect(differ).toBeGreaterThan(30)
  }, 60_000)

  it("is marked and refused when the salt's mass is left out of the mass that cooled, at every seed", () => {
    for (const seed of SEEDS) {
      const state = slipped(seed, 'dissolving', 'salt-left-out')
      // The heat is marked; the heat for each mole follows from it as typed, and is not marked a second time.
      expect(marked(state, 'dissolving'), String(seed)).toEqual([['heat', 'salt-left-out']])
      expect(reasonsOf(state, 'dissolving'), String(seed)).toEqual(['entries-do-not-follow'])
      expect(refusedAt(seed, 'dissolving', 'salt-left-out'), String(seed)).toEqual(['heat', 'salt-left-out'])
    }
  }, 60_000)

  it('is marked and refused when the wrong point is read for the highest or lowest, wherever that point is more than 0.1 °C from it', () => {
    let wrong = 0
    for (const part of PART_IDS) {
      for (const seed of SEEDS) {
        // Run on well past the turn, so that the last reading has drifted.
        let state = workCup(m, createLab(seed, 'challenge'), part)
        state = run(m, state, Array.from({ length: 6 }, (): Action => ({ type: 'runOn', part })))
        state = run(m, state, looks(m, state, part))
        const { graph } = partView(m, state, part)
        if (Math.abs(graph.readings.at(-1)! - graph.extreme!.tenths) <= m.readingToleranceTenths) continue
        wrong++
        const values = worksheetValues(m, state, part, { slip: 'wrong-point' })
        const checked = run(m, state, [...entryActions(part, values), { type: 'check', part }])
        // Every entry after it follows from it: only the temperature is named.
        expect(marked(checked, part), `${part} ${seed}`).toEqual([['extreme', null]])
        expect(reasonsOf(checked, part), `${part} ${seed}`).toEqual(['extreme-not-shown'])
        const guided = run(m, run(m, state, [{ type: 'setMode', mode: 'guided' }]), entryActions(part, values).slice(0, 1))
        expect(can(m, guided, { type: 'enter', part, field: 'extreme', value: values.extreme }), `${part} ${seed}`).toBe('not-the-logger')
      }
    }
    expect(wrong).toBeGreaterThan(250)
  }, 60_000)

  it('marks nothing and refuses nothing of a careful worksheet, whichever correct rounding it took', () => {
    for (const seed of SEEDS) for (const part of PART_IDS) expect(refusedAt(seed, part, undefined), `${part} ${seed}`).toBeNull()
  }, 60_000)

  it('does not hold a result to the stored value where an entry does not follow: the reasons say what is wrong, once', () => {
    const state = slipped(1, 'neutralisation', 'no-sign')
    expect(runOutcome(m, state, 'neutralisation', currentRun(state, 'neutralisation'))).toEqual({ state: 'does-not-count', reasons: ['entries-do-not-follow'], percentOff: null })
  })

  it('does not count a run whose entries all follow but whose result is not within the tolerance, and says so', () => {
    // Both temperatures typed 0.1 °C off, towards each other: each is one the logger shows, and on tin's small rise that is 5% of the change.
    let found = 0
    for (const seed of SEEDS.filter((s) => trueMetal(s) === 'tin-piece')) {
      let state = workCup(m, createLab(seed, 'challenge'), 'metal')
      state = run(m, state, looks(m, state, 'metal'))
      const { graph, bench } = partView(m, state, 'metal')
      const [start, extreme] = [graph.readings[graph.changedAt!]! + 1, graph.extreme!.tenths - 1]
      const heat = sig((50 * 4.18 * ((extreme - start) / 10)).toPrecision(3))
      const specificHeat = sig(((heat.mantissa * 10 ** heat.exponent) / ((bench.balanceCg! / 100) * ((bench.bathTenths! - extreme) / 10))).toPrecision(3))
      state = run(m, state, [...entryActions('metal', { ...worksheetValues(m, state, 'metal'), start, extreme, change: extreme - start, heat, specificHeat, metal: 'tin-piece' }), { type: 'check', part: 'metal' }])
      expect(partView(m, state, 'metal').worksheet.every((entry) => entry.verdict?.follows === true), String(seed)).toBe(true)
      if (reasonsOf(state, 'metal').length === 0) continue
      found++
      expect(reasonsOf(state, 'metal'), String(seed)).toEqual(['outside-tolerance'])
      expect(partView(m, state, 'metal')).toMatchObject({ done: false, expected: null })
    }
    expect(found).toBeGreaterThan(0)
  })
})

describe('the same seed and the same actions (spec 16.6, fourth item)', () => {
  it('give the same run, reading for reading and outcome for outcome', () => {
    for (const seed of [1, 2, 57, 4294967295]) {
      for (const part of PART_IDS) {
        const [a, b] = [wholeRun(m, createLab(seed, 'challenge'), part), wholeRun(m, createLab(seed, 'challenge'), part)]
        expect(a).toEqual(b)
        expect(partView(m, a, part)).toEqual(partView(m, b, part))
      }
    }
  })

  it("give a run numbers that do not depend on what was done in the runs before it, or in the other parts", () => {
    const straight = run(m, createLab(9, 'challenge'), [{ type: 'startLogger', part: 'metal' }, { type: 'runAgain', part: 'metal' }])
    const roundabout = run(m, wholeRun(m, wholeRun(m, createLab(9, 'challenge'), 'dissolving'), 'metal', { lid: false }), [{ type: 'runAgain', part: 'metal' }])
    expect(partView(m, roundabout, 'metal').bench).toEqual(partView(m, straight, 'metal').bench)
    expect(runSetup(m, 9, 'metal', 1)).toMatchObject({ metalCg: partView(m, straight, 'metal').bench.balanceCg, bathTenths: partView(m, straight, 'metal').bench.bathTenths })
  })

  it('give different seeds different numbers', () => {
    const benches = new Set(SEEDS.map((seed) => JSON.stringify([partView(m, createLab(seed, 'guided'), 'dissolving').bench, partView(m, createLab(seed, 'guided'), 'metal').bench])))
    expect(benches.size).toBeGreaterThan(95)
  })
})

describe('the stored record', () => {
  it('round-trips: a lab reloaded from storage after every action ends where one never reloaded does', () => {
    for (const mode of MODES) {
      for (const seed of [1, 2, 3]) {
        const drive = (through?: (s: CalorimetryState) => CalorimetryState) => {
          let state = wholeRun(m, createLab(seed, mode), 'dissolving', { lid: false }, through)
          state = run(m, state, [{ type: 'runAgain', part: 'dissolving' }], through)
          for (const part of PART_IDS) state = wholeRun(m, state, part, {}, through)
          return state
        }
        const reloadedEveryStep = drive(reloaded)
        expect(reloadedEveryStep).toEqual(drive())
        expect(reloadedEveryStep.status).toBe('completed')
      }
    }
  })

  it('holds what the learner did and typed, and nothing that is worked out: no reading, no verdict, no metal but the one chosen', () => {
    const state = wholeRun(m, createLab(4, 'challenge'), 'metal')
    const stored = JSON.stringify({ ...state, parts: { ...state.parts, metal: state.parts.metal.map((r) => ({ ...r, entries: { ...r.entries, metal: null } })) } })
    for (const candidate of m.candidates) expect(stored).not.toContain(candidate.id)
    expect(Object.keys(state.parts.metal[0]!).sort()).toEqual(['changedAt', 'closed', 'entries', 'index', 'lidFrom', 'logger', 'looked', 'steps', 'stirFrom'])
  })
})

describe('no state a learner can reach leaves them unable to go on', () => {
  /** Finishes the lab from wherever it stands: each part not yet done is run with care, after Run again where its cup has been touched. */
  function finish(state: CalorimetryState): CalorimetryState {
    state = run(m, state, [{ type: 'setMode', mode: 'guided' }])
    for (const part of PART_IDS) {
      if (doneParts(m, state).includes(part)) continue
      if (currentRun(state, part).logger) state = run(m, state, [{ type: 'runAgain', part }])
      state = wholeRun(m, state, part)
    }
    return state
  }

  it('from four hundred actions taken as they come, in either mode, the lab can still be completed', () => {
    const fields = [...new Set(PART_IDS.flatMap((part) => FIELDS[part]))]
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const rng = mulberry32(seed * 7919)
      const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)]!
      let state = createLab(seed, pick(MODES))
      for (let step = 0; step < 400 && state.status !== 'completed'; step++) {
        const part = pick(PART_IDS)
        const view = partView(m, state, part)
        const field = pick(fields)
        // What a careful learner would type where the curve allows it, and something else as often.
        const careful = view.graph.extreme ? worksheetValues(m, state, part)[field] : 200
        const value = pick([careful, careful, 200, -57, sig('2840'), sig('-56.8'), sig('0.0500'), 'out', 'in', pick(m.candidates).id])
        const action = pick<Action>([
          { type: 'setMode', mode: pick(MODES) },
          { type: 'putLidOn', part },
          { type: 'stir', part },
          { type: 'startLogger', part },
          { type: 'startChange', part },
          { type: 'runOn', part },
          { type: 'runOn', part },
          { type: 'look', part, step: Math.floor(rng() * (view.graph.readings.length + 1)) },
          { type: 'look', part, step: view.graph.extreme?.step ?? 0 },
          { type: 'enter', part, field, value },
          { type: 'enter', part, field: view.worksheet.find((entry) => entry.value === null)?.field ?? field, value: view.graph.extreme ? worksheetValues(m, state, part)[view.worksheet.find((entry) => entry.value === null)?.field ?? field] : 200 },
          { type: 'check', part },
          { type: 'runAgain', part },
        ])
        const next = reduce(m, state, action)
        expect(can(m, state, action) === null || next === state, action.type).toBe(true)
        state = reloaded(next)
      }
      const done = finish(state)
      expect(done.status, String(seed)).toBe('completed')
      expect(schema.safeParse(done).success, String(seed)).toBe(true)
    }
  }, 60_000)

  it('offers a way on from every point of a run: Run again once the logger is started, and before that the cup itself', () => {
    for (const part of PART_IDS) {
      let state = createLab(5, 'challenge')
      const waysOn = (s: CalorimetryState) => (['putLidOn', 'stir', 'startLogger', 'startChange', 'runOn', 'check', 'runAgain'] as const).filter((type) => can(m, s, { type, part }) === null)
      expect(waysOn(state)).toEqual(['putLidOn', 'stir', 'startLogger'])
      state = workCup(m, state, part, { lid: false, stir: false })
      expect(waysOn(state)).toContain('runAgain')
      state = run(m, state, looks(m, state, part))
      for (const action of entryActions(part, worksheetValues(m, state, part))) {
        state = run(m, state, [action])
        expect(waysOn(state)).toContain('runAgain')
      }
      state = run(m, state, [{ type: 'check', part }])
      expect(waysOn(state)).toEqual(['runAgain'])
    }
  })
})

describe('nothing of what is expected is shown before a run counts', () => {
  /** Everything the public surface hands a page about a lab. */
  const surface = (state: CalorimetryState) => JSON.stringify({ parts: PART_IDS.map((part) => [partView(m, state, part), runOutcomes(m, state, part)]), done: doneParts(m, state) })
  const HIDDEN = [String(m.neutralisationJ), String(-m.neutralisationJ / 1000), String(m.solutionJ), String(m.solutionJ / 1000), '"expected":{', '"kind"']

  it('in Challenge, at every action of a careful run up to the check, the surface holds no stored value, no metal, and no reading the logger has not taken', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      for (const part of PART_IDS) {
        let state = createLab(seed, 'challenge')
        const seen = (s: CalorimetryState) => {
          const text = surface(s)
          for (const hidden of HIDDEN) expect(text, `${part} ${seed}: ${hidden}`).not.toContain(hidden)
          // No candidate is named anywhere but in the learner's own choice.
          const chosen = currentRun(s, part).entries.metal
          for (const candidate of m.candidates) if (candidate.id !== chosen) expect(text, `${part} ${seed}`).not.toContain(candidate.id)
          const view = partView(m, s, part)
          expect(view.graph.readings, `${part} ${seed}`).toEqual(readingsOf(m, seed, part, currentRun(s, part)))
          expect(view.graph.readings.length, `${part} ${seed}`).toBe(view.cup.loggerStarted ? currentRun(s, part).steps + 1 : 0)
          expect(view.expected, `${part} ${seed}`).toBeNull()
          return s
        }
        state = workCup(m, seen(state), part, {}, seen)
        state = run(m, state, looks(m, state, part), seen)
        const entries = entryActions(part, worksheetValues(m, state, part))
        // The last entry of part 3 is the learner's choice of metal, and of parts 1 and 2 their own result: up to it, and with it made, nothing is handed over.
        state = run(m, state, entries, seen)
        expect(partView(m, state, part).worksheet.every((entry) => entry.verdict === null), `${part} ${seed}`).toBe(true)
      }
    }
  }, 60_000)

  it("shows nothing of the metal before the piece is in the cup: the view is the same whichever of the four the seed makes it", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      let state = run(m, createLab(seed, 'guided'), [{ type: 'putLidOn', part: 'metal' }, { type: 'stir', part: 'metal' }, { type: 'startLogger', part: 'metal' }, { type: 'runOn', part: 'metal' }])
      const views = [0, 1, 2, 3].map((shift) => {
        // The same seed with the candidates turned round names another metal as the piece.
        const turned: CalorimetryModel = { ...m, candidates: [...m.candidates.slice(shift), ...m.candidates.slice(0, shift)] }
        return JSON.stringify(partView(turned, state, 'metal'))
      })
      expect(new Set(views).size, String(seed)).toBe(1)
      // Once it is in, the readings are the metal's: that is what the learner measures.
      state = run(m, state, [{ type: 'startChange', part: 'metal' }, { type: 'runOn', part: 'metal' }])
      expect(partView(m, state, 'metal').graph.readings.at(-1)).toBeGreaterThan(partView(m, state, 'metal').graph.readings[0]!)
    }
  })

  it('hands nothing over for a run that does not count, in either mode: no stored value, no metal, and no figure for how far off the result was', () => {
    for (const mode of MODES) {
      for (const seed of SEEDS.slice(0, 30)) {
        for (const part of PART_IDS) {
          const state = wholeRun(m, createLab(seed, mode), part, { lid: false })
          const text = surface(state)
          for (const hidden of HIDDEN) expect(text, `${mode} ${part} ${seed}`).not.toContain(hidden)
          expect(partView(m, state, part).outcome, `${mode} ${part} ${seed}`).toEqual({ state: 'does-not-count', reasons: ['lid-off', 'outside-tolerance'], percentOff: null })
          // The careless learner's choice of metal is theirs; the piece's own name is not added to it.
          if (part === 'metal' && currentRun(state, part).entries.metal !== trueMetal(seed)) expect(text).not.toContain(trueMetal(seed))
        }
      }
    }
  }, 60_000)

  it('says how far off an earlier run was only once a run of the part counts', () => {
    let state = wholeRun(m, createLab(1, 'challenge'), 'neutralisation', { lid: false })
    expect(runOutcomes(m, state, 'neutralisation')).toEqual([{ state: 'does-not-count', reasons: ['lid-off', 'outside-tolerance'], percentOff: null }])
    state = wholeRun(m, run(m, state, [{ type: 'runAgain', part: 'neutralisation' }]), 'neutralisation')
    const [first, second] = runOutcomes(m, state, 'neutralisation')
    expect(first).toMatchObject({ state: 'does-not-count', reasons: ['lid-off', 'outside-tolerance'] })
    expect((first as { percentOff: number }).percentOff).toBeCloseTo(-8.85, 2)
    expect(second).toMatchObject({ state: 'counts' })
    expect(judge(m, 1, 'neutralisation', state.parts.neutralisation[0]!)!.reasons).toEqual(['lid-off', 'outside-tolerance'])
  })
})

describe('whole labs, driven to completion through the reducer by scripted learners', () => {
  type Learner = [name: string, part: PartId, how: Technique & Arithmetic, reason: Reason]
  const LEARNERS: Learner[] = [
    ['one who leaves the lid off', 'neutralisation', { lid: false }, 'lid-off'],
    ['one who does not stir', 'metal', { stir: false }, 'not-stirred'],
    ['one who reads the wrong point', 'metal', { slip: 'wrong-point' }, 'extreme-not-shown'],
    ["one who forgets the salt's mass in the mass that cooled", 'dissolving', { slip: 'salt-left-out' }, 'entries-do-not-follow'],
    ['one who drops the sign', 'neutralisation', { slip: 'no-sign' }, 'entries-do-not-follow'],
  ]

  it.each(MODES)('in %s, a careful learner completes the lab in three runs, at every seed from 1 to 100', (mode) => {
    for (const seed of SEEDS) {
      const state = PART_IDS.reduce((s, part) => wholeRun(m, s, part, {}, reloaded), createLab(seed, mode))
      expect(state.status, String(seed)).toBe('completed')
      expect(doneParts(m, state)).toEqual([...PART_IDS])
      expect(PART_IDS.map((part) => state.parts[part].length)).toEqual([1, 1, 1])
    }
  }, 60_000)

  it.each(LEARNERS)('in Challenge, %s has a run that does not count, is told why, runs the part again with care, and completes the lab', (_name, part, how, reason) => {
    for (const seed of SEEDS.slice(0, 25)) {
      let state = createLab(seed, 'challenge')
      if (how.slip === 'wrong-point') {
        // Past the turn, so that the last reading is not the highest.
        state = workCup(m, state, part, {}, reloaded)
        state = run(m, state, Array.from({ length: 8 }, (): Action => ({ type: 'runOn', part })), reloaded)
        state = run(m, state, looks(m, state, part), reloaded)
        state = run(m, state, [...entryActions(part, worksheetValues(m, state, part, how)), { type: 'check', part }], reloaded)
      } else state = wholeRun(m, state, part, how, reloaded)
      expect(reasonsOf(state, part), String(seed)).toContain(reason)
      expect(state.status).toBe('in-progress')
      state = wholeRun(m, run(m, state, [{ type: 'runAgain', part }], reloaded), part, {}, reloaded)
      expect(partView(m, state, part)).toMatchObject({ done: true, runs: 2, outcome: { state: 'counts' } })
      for (const other of PART_IDS.filter((p) => p !== part)) state = wholeRun(m, state, other, {}, reloaded)
      expect(state.status, String(seed)).toBe('completed')
    }
  }, 60_000)

  it.each(LEARNERS.filter(([, , how]) => how.slip !== undefined))('in Guided, %s is stopped at the entry, puts it right, and the same run counts', (_name, part, how) => {
    for (const seed of SEEDS.slice(0, 25)) {
      let state = workCup(m, createLab(seed, 'guided'), part, {}, reloaded)
      if (how.slip === 'wrong-point') state = run(m, state, Array.from({ length: 8 }, (): Action => ({ type: 'runOn', part })), reloaded)
      state = run(m, state, looks(m, state, part), reloaded)
      const careful = worksheetValues(m, state, part)
      const slipped = worksheetValues(m, state, part, how)
      let refused = 0
      for (const field of FIELDS[part]) {
        if (can(m, state, { type: 'enter', part, field, value: slipped[field] }) !== null) refused++
        state = run(m, state, [{ type: 'enter', part, field, value: careful[field] }], reloaded)
      }
      expect(refused, String(seed)).toBeGreaterThan(0)
      expect(partView(m, state, part)).toMatchObject({ done: true, runs: 1, outcome: { state: 'counts' } })
    }
  }, 60_000)

  it.each(LEARNERS.filter(([, , how]) => how.slip === undefined))('in Guided, %s is warned first, goes on, has a run that does not count, and completes the lab after running the part again', (_name, part, how, reason) => {
    for (const seed of SEEDS.slice(0, 25)) {
      let state = wholeRun(m, createLab(seed, 'guided'), part, how, reloaded)
      expect(reasonsOf(state, part), String(seed)).toEqual([reason, 'outside-tolerance'])
      state = wholeRun(m, run(m, state, [{ type: 'runAgain', part }], reloaded), part, {}, reloaded)
      for (const other of PART_IDS.filter((p) => p !== part)) state = wholeRun(m, state, other, {}, reloaded)
      expect(state.status, String(seed)).toBe('completed')
    }
  }, 60_000)
})
