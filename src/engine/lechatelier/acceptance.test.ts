import { describe, expect, it } from 'vitest'
import { DISTURBANCE_IDS, SYSTEM_IDS, WAYS, lechatelierData, type DisturbanceId, type SystemId } from '@/chem-data/lechatelier/data'
import { mulberry32 } from '../rng'
import { can, mismatch, reduce, type Action } from './actions'
import { answersFor, modelFrom } from './model'
import { PINNED_MODEL } from './pinnedModel'
import { LOOKS, type Observation } from './run'
import { doneSystems, runOutcome, runRecords, systemView } from './select'
import { createLab, currentRun, lechatelierStateSchema, systemModel, type LechatelierState, type Mode } from './state'
import { run, seen, wholeLab, wholeSystem, workDisturbance } from './testkit'

// Spec 18.7, the Le Chatelier's principle lab's acceptance list, on the engine and the stored record. Its last
// item, the description in words of every tube, is the wording module's (src/app/lab/lechatelier/messages.test.ts);
// that every rule and stored value has a source, and that the build checks the numbers at the lab's amounts and
// stops on a disagreement, is src/chem-data/lechatelier/build.test.ts and data.test.ts.

const m = modelFrom(lechatelierData)
const schema = lechatelierStateSchema(m)
const MODES: Mode[] = ['guided', 'challenge']
/** Through JSON and the schema, as a reload does. */
const reloaded = (state: LechatelierState): LechatelierState => schema.parse(JSON.parse(JSON.stringify(state)))

/**
 * What each disturbance shows when it is done, written out from the procedure (spec 18.2) and not from the engine:
 * lead chloride comes with the acid, goes when hot, comes back cold and goes with water; methyl violet goes yellow
 * with acid and violet again with base; cobalt goes pink with water, blue when hot and pink when cold; a drop of
 * sodium hydroxide brings each hydroxide down, acid dissolves both, and more base and ammonia dissolve zinc's and
 * not magnesium's.
 */
const PROCEDURE: Record<DisturbanceId, Observation> = {
  'lead-acid': { solid: 'white', liquid: 'colourless' },
  'lead-heat': { solid: 'none', liquid: 'colourless' },
  'lead-cool': { solid: 'white', liquid: 'colourless' },
  'lead-water': { solid: 'none', liquid: 'colourless' },
  'indicator-acid': { solid: 'none', liquid: 'yellow' },
  'indicator-base': { solid: 'none', liquid: 'violet' },
  'cobalt-water': { solid: 'none', liquid: 'pink' },
  'cobalt-heat': { solid: 'none', liquid: 'blue' },
  'cobalt-cool': { solid: 'none', liquid: 'pink' },
  'zinc-drop': { solid: 'white', liquid: 'colourless' },
  'zinc-acid': { solid: 'none', liquid: 'colourless' },
  'zinc-base': { solid: 'none', liquid: 'colourless' },
  'zinc-ammonia': { solid: 'none', liquid: 'colourless' },
  'magnesium-drop': { solid: 'white', liquid: 'colourless' },
  'magnesium-acid': { solid: 'none', liquid: 'colourless' },
  'magnesium-base': { solid: 'white', liquid: 'colourless' },
  'magnesium-ammonia': { solid: 'white', liquid: 'colourless' },
}
/** The right answers, written out: the way each equilibrium goes as it is written, or what took the metal ion away. */
const RIGHT: Record<DisturbanceId, string> = {
  'lead-acid': 'right',
  'lead-heat': 'left',
  'lead-cool': 'right',
  'lead-water': 'left',
  'indicator-acid': 'left',
  'indicator-base': 'right',
  'cobalt-water': 'left',
  'cobalt-heat': 'right',
  'cobalt-cool': 'left',
  'zinc-drop': 'right',
  'zinc-acid': 'left',
  'zinc-base': 'hydroxide',
  'zinc-ammonia': 'ammonia',
  'magnesium-drop': 'right',
  'magnesium-acid': 'left',
  'magnesium-base': 'nothing',
  'magnesium-ammonia': 'nothing',
}
const views = (state: LechatelierState, systemId: SystemId) => systemView(m, state, systemId).disturbances
const reasons = (state: LechatelierState, systemId: SystemId) => {
  const outcome = runOutcome(m, systemId, currentRun(state, systemId))
  return outcome.state === 'does-not-count' ? outcome.reasons : []
}

describe('the model the lab runs on', () => {
  it('is the pinned model: the stored record gives the values every expected value here is worked from', () => {
    expect(m).toEqual(PINNED_MODEL)
  })
})

describe('working a system in order (spec 18.7, first item)', () => {
  it.each(SYSTEM_IDS)('%s shows at each disturbance what the stored rule gives and nothing else, and counts, in Guided and in Challenge', (systemId) => {
    for (const mode of MODES) {
      const state = wholeSystem(m, createLab(mode), systemId)
      // What a careful learner recorded at each disturbance is what the procedure says, and what the model stores as right is what the equilibrium gives.
      expect(views(state, systemId).map((d) => [d.id, d.observation])).toEqual(systemModel(m, systemId).disturbances.map((d) => [d.id, PROCEDURE[d.id]]))
      expect(views(state, systemId).map((d) => d.answer)).toEqual(systemModel(m, systemId).disturbances.map((d) => RIGHT[d.id]))
      expect(systemView(m, state, systemId)).toMatchObject({ outcome: { state: 'counts' }, done: true, disturbance: null })
      for (const d of views(state, systemId)) expect([d.status, d.wrongFields, d.answerRight, d.notesShown]).toEqual(['done', [], true, true])
    }
  })

  it('shows the tube at every press what the record stores for that portion, and before the first what the disturbance before left', () => {
    for (const system of m.systems) {
      let state = createLab('challenge')
      for (const disturbance of system.disturbances) {
        const record = lechatelierData.systems.find((s) => s.id === system.id)!.disturbances.find((d) => d.id === disturbance.id)!
        const current = () => views(state, system.id).find((d) => d.id === disturbance.id)!
        state = run(m, state, [{ type: 'predict', system: system.id, way: 'none' }])
        expect(seen(m, current().shows!), `${disturbance.id}, before`).toEqual({ solid: disturbance.before.solid, liquid: disturbance.before.liquid })
        record.stages.forEach((stage, press) => {
          state = run(m, state, [{ type: 'act', system: system.id }])
          expect(seen(m, current().shows!), `${disturbance.id}, press ${press + 1}`).toEqual({ solid: stage.solid, liquid: stage.liquid })
        })
        expect(seen(m, current().shows!)).toEqual(PROCEDURE[disturbance.id])
        state = run(m, state, [...LOOKS.map((at): Action => ({ type: 'look', system: system.id, at })), { type: 'observe', system: system.id, observation: PROCEDURE[disturbance.id] }, { type: 'answer', system: system.id, is: RIGHT[disturbance.id] }])
        // Done, the disturbance keeps the tube as it was left.
        expect(seen(m, current().shows!)).toEqual(PROCEDURE[disturbance.id])
      }
      expect(systemView(m, run(m, state, [{ type: 'checkSystem', system: system.id }]), system.id).outcome).toEqual({ state: 'counts' })
    }
  })

  it('shows on the way what the procedure passes through: no solid after the first portion of acid, and a colour between at the indicator and at cobalt', () => {
    const lead = m.systems[0]!.disturbances[0]!
    expect(lead.stages.map((s) => s.solid)).toEqual(['none', 'white', 'white'])
    expect(m.systems[1]!.disturbances.map((d) => d.stages.map((s) => s.liquid))).toEqual([['between blue and yellow', 'yellow'], ['between blue and yellow', 'violet']])
    expect(m.systems[2]!.disturbances[0]!.stages.map((s) => s.liquid)).toEqual(['violet', 'pink'])
  })

  it('stands the tube in its bath when it is heated or cooled', () => {
    const state = wholeSystem(m, createLab('guided'), 'lead-chloride')
    expect(views(state, 'lead-chloride').map((d) => d.temperature)).toEqual(['room', 'hot', 'cold', 'room'])
  })

  it('completes the lab when all four systems count, in any order, and not before', () => {
    for (const order of [SYSTEM_IDS, [...SYSTEM_IDS].reverse(), ['cobalt', 'lead-chloride', 'hydroxides', 'methyl-violet'] as const]) {
      let state = createLab('guided')
      order.forEach((systemId, done) => {
        expect(state.status).toBe('in-progress')
        expect(doneSystems(m, state).length).toBe(done)
        state = wholeSystem(m, state, systemId)
      })
      expect(state.status).toBe('completed')
      expect(doneSystems(m, state)).toEqual([...SYSTEM_IDS])
    }
    expect(wholeLab(m, createLab('challenge')).status).toBe('completed')
  })

  it('still takes actions when complete, so that a system can be worked again, and stays complete', () => {
    let state = wholeLab(m, createLab('challenge'))
    state = run(m, state, [{ type: 'workAgain', system: 'cobalt' }])
    expect(state.status).toBe('completed')
    state = wholeSystem(m, state, 'cobalt', { wrongAnswerAt: 'cobalt-heat' })
    expect(systemView(m, state, 'cobalt')).toMatchObject({ runs: 2, outcome: { state: 'does-not-count' }, done: true })
    expect(state.status).toBe('completed')
  })
})

describe('a system counts when each observation and each answer is right, and only then (spec 18.7, first item)', () => {
  it.each(DISTURBANCE_IDS)('one wrong observation at %s alone, of the solid or of the liquid, and the system does not count', (id) => {
    const systemId = m.systems.find((s) => s.disturbances.some((d) => d.id === id))!.id
    for (const how of [{ wrongSolidAt: id }, { wrongLiquidAt: id }]) {
      const state = wholeSystem(m, createLab('challenge'), systemId, how)
      expect(reasons(state, systemId)).toEqual([{ kind: 'observation-wrong', disturbance: id }])
      expect(systemView(m, state, systemId).done).toBe(false)
      expect(state.status).toBe('in-progress')
    }
  })

  it.each(DISTURBANCE_IDS)('one wrong answer at %s alone, and the system does not count', (id) => {
    const systemId = m.systems.find((s) => s.disturbances.some((d) => d.id === id))!.id
    const state = wholeSystem(m, createLab('challenge'), systemId, { wrongAnswerAt: id })
    expect(reasons(state, systemId)).toEqual([{ kind: 'answer-wrong', disturbance: id }])
    expect(views(state, systemId).find((d) => d.id === id)).toMatchObject({ answerRight: false, wrongFields: [] })
    // Every other answer of the two that are not right is wrong too: only the right one counts.
    const disturbance = systemModel(m, systemId).disturbances.find((d) => d.id === id)!
    expect(answersFor(disturbance.ask).filter((answer) => answer !== RIGHT[id]).length).toBe(2)
  })

  it('a system that is not right is worked again, and then counts', () => {
    let state = wholeSystem(m, createLab('challenge'), 'hydroxides', { wrongAnswerAt: 'magnesium-ammonia' })
    expect(systemView(m, state, 'hydroxides').done).toBe(false)
    state = wholeSystem(m, run(m, state, [{ type: 'workAgain', system: 'hydroxides' }]), 'hydroxides')
    expect(systemView(m, state, 'hydroxides')).toMatchObject({ runs: 2, outcome: { state: 'counts' }, done: true })
  })

  it('in Guided an entry that is not right is refused where it is made, so a scripted learner who makes one cannot go on', () => {
    expect(() => wholeSystem(m, createLab('guided'), 'cobalt', { wrongLiquidAt: 'cobalt-heat' })).toThrow(/observe: does-not-match/)
    expect(() => wholeSystem(m, createLab('guided'), 'cobalt', { wrongAnswerAt: 'cobalt-heat' })).toThrow(/answer: not-right/)
  })
})

describe('the prediction (spec 18.7, third item)', () => {
  it('is recorded before the action it is about: no press is taken without one', () => {
    for (const systemId of SYSTEM_IDS) {
      let state = createLab('guided')
      for (const disturbance of systemModel(m, systemId).disturbances) {
        expect(can(m, state, { type: 'act', system: systemId }), disturbance.id).toBe('predict-first')
        state = workDisturbance(m, state, systemId)
      }
    }
  })

  it('can be neither changed nor withdrawn once the action has begun, at any later point of the disturbance or of the run', () => {
    for (const mode of MODES) {
      let state = run(m, createLab(mode), [{ type: 'predict', system: 'cobalt', way: 'right' }, { type: 'act', system: 'cobalt' }])
      const refused = () => WAYS.map((way) => can(m, state, { type: 'predict', system: 'cobalt', way }))
      expect(refused()).toEqual(['prediction-fixed', 'prediction-fixed', 'prediction-fixed'])
      state = run(m, state, [{ type: 'act', system: 'cobalt' }, { type: 'look', system: 'cobalt', at: 'liquid' }, { type: 'look', system: 'cobalt', at: 'bottom' }])
      expect(refused()).toEqual(['prediction-fixed', 'prediction-fixed', 'prediction-fixed'])
      state = run(m, state, [{ type: 'observe', system: 'cobalt', observation: { solid: 'none', liquid: 'pink' } }])
      expect(refused()).toEqual(['prediction-fixed', 'prediction-fixed', 'prediction-fixed'])
      state = run(m, state, [{ type: 'answer', system: 'cobalt', is: 'left' }])
      // The next disturbance takes a prediction of its own; the first one's stays as it was said.
      state = run(m, state, [{ type: 'predict', system: 'cobalt', way: 'left' }])
      expect(views(state, 'cobalt').map((d) => [d.prediction, d.predictionFixed])).toEqual([['right', true], ['left', false], [null, false]])
      state = wholeSystem(m, state, 'cobalt')
      expect(views(state, 'cobalt')[0]!.prediction).toBe('right')
      expect(WAYS.map((way) => can(m, state, { type: 'predict', system: 'cobalt', way }))).toEqual(['system-checked', 'system-checked', 'system-checked'])
    }
  })

  it('is never judged: with every prediction, right or wrong, a careful run counts, in both modes, and a wrong run is no more wrong for it', () => {
    for (const mode of MODES) {
      for (const predict of WAYS) {
        for (const systemId of SYSTEM_IDS) {
          const state = wholeSystem(m, createLab(mode), systemId, { predict })
          expect(systemView(m, state, systemId).outcome, `${mode} ${predict} ${systemId}`).toEqual({ state: 'counts' })
          expect(views(state, systemId).every((d) => d.prediction === predict)).toBe(true)
        }
      }
    }
    for (const predict of WAYS) expect(reasons(wholeSystem(m, createLab('challenge'), 'lead-chloride', { predict, wrongAnswerAt: 'lead-water' }), 'lead-chloride')).toEqual([{ kind: 'answer-wrong', disturbance: 'lead-water' }])
  })

  it('is kept with the run, beside each disturbance, for the page and for the record', () => {
    const state = wholeSystem(m, createLab('challenge'), 'methyl-violet', { predict: 'right' })
    expect(runRecords(m, state, 'methyl-violet')[0]!.disturbances.map((d) => d.prediction)).toEqual(['right', 'right'])
  })
})

describe('the stored record (spec 18.7, fourth item)', () => {
  it('round-trips: a lab reloaded from storage after every action ends where one never reloaded does', () => {
    for (const mode of MODES) {
      const plain = wholeLab(m, createLab(mode))
      const reloadedAtEachStep = wholeLab(m, createLab(mode), reloaded)
      expect(reloadedAtEachStep).toEqual(plain)
      expect(reloaded(plain)).toEqual(plain)
      for (const systemId of SYSTEM_IDS) expect(systemView(m, reloadedAtEachStep, systemId)).toEqual(systemView(m, plain, systemId))
    }
    // A run that does not count, and a system worked twice, round-trip too.
    const twice = wholeSystem(m, run(m, wholeSystem(m, createLab('challenge'), 'cobalt', { wrongLiquidAt: 'cobalt-water' }), [{ type: 'workAgain', system: 'cobalt' }]), 'cobalt')
    expect(reloaded(twice)).toEqual(twice)
  })

  it('holds what was done and nothing that is worked out from it: no tube, no mark and no right answer', () => {
    const text = JSON.stringify(wholeLab(m, createLab('challenge')))
    expect(Object.keys(JSON.parse(text))).toEqual(['mode', 'status', 'systems'])
    for (const word of ['right":', 'wrongFields', 'shows', 'microlitres', 'counts', 'notes']) expect(text).not.toContain(word)
  })

  it('gives the same run for the same actions: nothing in this lab is drawn by chance', () => {
    const [a, b] = [wholeLab(m, createLab('guided')), wholeLab(m, createLab('guided'))]
    expect(a).toEqual(b)
    for (const systemId of SYSTEM_IDS) expect(systemView(m, a, systemId)).toEqual(systemView(m, b, systemId))
  })
})

describe('no state a learner can reach leaves them unable to go on (spec 18.7, fourth item)', () => {
  /** Every action a page could send at a system as it stands. */
  function offered(systemId: SystemId): Action[] {
    return [
      ...WAYS.map((way): Action => ({ type: 'predict', system: systemId, way })),
      { type: 'act', system: systemId },
      ...LOOKS.map((at): Action => ({ type: 'look', system: systemId, at })),
      ...m.solidChoices.flatMap((solid) => m.liquidChoices.map((liquid): Action => ({ type: 'observe', system: systemId, observation: { solid, liquid } }))),
      ...[...answersFor('direction'), ...answersFor('cause')].map((is): Action => ({ type: 'answer', system: systemId, is })),
      { type: 'checkSystem', system: systemId },
      { type: 'workAgain', system: systemId },
    ]
  }

  it('from four hundred actions taken as they come, in either mode, each system can still be finished and the lab completed', () => {
    for (const mode of MODES) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const random = mulberry32(seed)
        let state = createLab(mode)
        for (let step = 0; step < 400; step++) {
          const systemId = SYSTEM_IDS[Math.floor(random() * SYSTEM_IDS.length)]!
          const possible = offered(systemId).filter((action) => can(m, state, action) === null)
          expect(possible.length, `${mode}, seed ${seed}, step ${step}`).toBeGreaterThan(0)
          state = reduce(m, state, possible[Math.floor(random() * possible.length)]!)
          // Through storage every twentieth step: a reload works every run of every system out again, which at every step would make this the slowest test of the lab many times over.
          if (step % 20 === 19) state = reloaded(state)
        }
        state = reloaded(state)
        // From wherever that left it: work each system again where it is begun or over, then carefully through.
        for (const systemId of SYSTEM_IDS) {
          if (can(m, state, { type: 'workAgain', system: systemId }) === null) state = run(m, state, [{ type: 'workAgain', system: systemId }])
          state = wholeSystem(m, state, systemId)
        }
        expect(state.status, `${mode}, seed ${seed}`).toBe('completed')
      }
    }
  })

  it('offers a way on at every point of a careful run and of a careless one: the next thing to do, or working the system again', () => {
    for (const mode of MODES) {
      for (const how of [{}, { wrongAnswerAt: 'lead-heat' as const }]) {
        if (mode === 'guided' && 'wrongAnswerAt' in how) continue
        wholeSystem(m, createLab(mode), 'lead-chloride', how, (state) => {
          const view = systemView(m, state, 'lead-chloride')
          const on = offered('lead-chloride').filter((action) => action.type !== 'workAgain' && can(m, state, action) === null)
          if (view.outcome.state === 'counts') expect(view.done).toBe(true)
          else if (view.outcome.state === 'does-not-count') expect(can(m, state, { type: 'workAgain', system: 'lead-chloride' })).toBeNull()
          else expect(on.length).toBeGreaterThan(0)
          return state
        })
      }
    }
  })
})

describe('Challenge shows nothing of what is expected before the answers are recorded (spec 18.7, fifth item)', () => {
  it('at every action of a careful run, a disturbance that is not judged says nothing of whether its entries are right, and the page can try nothing against the tube', () => {
    for (const systemId of SYSTEM_IDS) {
      let checked = false
      wholeSystem(m, createLab('challenge'), systemId, {}, (state) => {
        checked = systemView(m, state, systemId).outcome.state === 'counts'
        for (const d of views(state, systemId)) {
          if (!checked) expect([d.wrongFields, d.answerRight], d.id).toEqual([null, null])
          // A waiting disturbance shows no tube at all.
          if (d.status === 'waiting') expect([d.shows, d.temperature, d.notesShown]).toEqual([null, null, false])
        }
        for (const solid of m.solidChoices) for (const liquid of m.liquidChoices) expect(mismatch(m, state, systemId, { solid, liquid })).toEqual([])
        return state
      })
      expect(checked).toBe(true)
    }
  })

  it('takes a wrong observation and a wrong answer exactly as it takes the right ones, at every disturbance', () => {
    for (const systemId of SYSTEM_IDS) {
      let state = createLab('challenge')
      for (const disturbance of systemModel(m, systemId).disturbances) {
        state = run(m, state, [{ type: 'predict', system: systemId, way: 'left' }, ...Array.from({ length: disturbance.portions }, (): Action => ({ type: 'act', system: systemId })), ...LOOKS.map((at): Action => ({ type: 'look', system: systemId, at }))])
        for (const solid of m.solidChoices) for (const liquid of m.liquidChoices) expect(can(m, state, { type: 'observe', system: systemId, observation: { solid, liquid } }), disturbance.id).toBeNull()
        state = run(m, state, [{ type: 'observe', system: systemId, observation: PROCEDURE[disturbance.id] }])
        for (const is of answersFor(disturbance.ask)) expect(can(m, state, { type: 'answer', system: systemId, is }), disturbance.id).toBeNull()
        state = run(m, state, [{ type: 'answer', system: systemId, is: RIGHT[disturbance.id] }])
      }
    }
  })

  it('shows the tube only as far as the presses made: what a later portion or a later disturbance will show is in no view', () => {
    // Two labs that differ only in what is still to come look the same: the views of the first disturbance, before
    // its last portion, are those of a model whose later stages show something else.
    const other = JSON.parse(JSON.stringify(m)) as typeof m
    const [acid, heat] = (other.systems[0] as unknown as { disturbances: { stages: { solid: string }[]; right: string }[] }).disturbances
    acid!.stages[2]!.solid = 'none'
    acid!.right = 'left'
    heat!.stages[0]!.solid = 'white'
    const script: Action[] = [{ type: 'predict', system: 'lead-chloride', way: 'none' }, { type: 'act', system: 'lead-chloride' }, { type: 'look', system: 'lead-chloride', at: 'liquid' }, { type: 'act', system: 'lead-chloride' }, { type: 'look', system: 'lead-chloride', at: 'bottom' }]
    let [a, b] = [createLab('challenge'), createLab('challenge')]
    for (const action of script) {
      a = reduce(m, a, action)
      b = reduce(other, b, action)
      expect(systemView(other, b, 'lead-chloride')).toEqual(systemView(m, a, 'lead-chloride'))
    }
  })
})

describe("a disturbance's note is shown only once it is done (spec 18.7, fifth item)", () => {
  it('in both modes, at every action of a careful run: the notes of a disturbance are open exactly when its question has been answered', () => {
    for (const mode of MODES) {
      for (const systemId of SYSTEM_IDS) {
        wholeSystem(m, createLab(mode), systemId, {}, (state) => {
          for (const d of views(state, systemId)) {
            expect(d.notesShown, d.id).toBe(d.answer !== null)
            expect(d.notesShown, d.id).toBe(d.status === 'done')
          }
          return state
        })
      }
    }
  })

  it('in Challenge an answer, once given, ends the disturbance: nothing of it can be entered again after its notes are open', () => {
    let state = workDisturbance(m, createLab('challenge'), 'cobalt', { wrongAnswerAt: 'cobalt-water' })
    expect(views(state, 'cobalt')[0]).toMatchObject({ notesShown: true, answer: 'right', answerRight: null })
    // Whatever is sent now goes to the next disturbance, which has not been begun: the first keeps what it was given.
    state = run(m, state, [{ type: 'predict', system: 'cobalt', way: 'left' }])
    expect(can(m, state, { type: 'answer', system: 'cobalt', is: 'left' })).toBe('observe-first')
    expect(can(m, state, { type: 'observe', system: 'cobalt', observation: PROCEDURE['cobalt-water'] })).toBe('act-first')
    expect(views(state, 'cobalt')[0]).toMatchObject({ answer: 'right', observation: PROCEDURE['cobalt-water'] })
  })
})

describe('the record of the runs', () => {
  it('lists every run of a system with what was predicted, recorded and answered, and how it came out', () => {
    let state = wholeSystem(m, createLab('challenge'), 'cobalt', { predict: 'left', wrongAnswerAt: 'cobalt-heat' })
    state = wholeSystem(m, run(m, state, [{ type: 'workAgain', system: 'cobalt' }]), 'cobalt', { predict: 'right' })
    state = run(m, state, [{ type: 'workAgain', system: 'cobalt' }, { type: 'predict', system: 'cobalt', way: 'none' }])
    const records = runRecords(m, state, 'cobalt')
    expect(records.map((r) => r.outcome.state)).toEqual(['does-not-count', 'counts', 'open'])
    expect(records[0]!.disturbances.map((d) => [d.id, d.prediction, d.observation?.liquid, d.answer, d.answerRight])).toEqual([
      ['cobalt-water', 'left', 'pink', 'left', true],
      ['cobalt-heat', 'left', 'blue', 'left', false],
      ['cobalt-cool', 'left', 'pink', 'left', true],
    ])
    expect(records[1]!.disturbances.every((d) => d.answerRight === true && d.wrongFields?.length === 0)).toBe(true)
    expect(records[2]!.disturbances.map((d) => [d.prediction, d.observation, d.answer, d.wrongFields, d.answerRight])).toEqual([['none', null, null, null, null], [null, null, null, null, null], [null, null, null, null, null]])
  })

  it('marks nothing of a run that was left behind unchecked, in either mode', () => {
    let state = workDisturbance(m, createLab('guided'), 'lead-chloride')
    state = run(m, state, [{ type: 'workAgain', system: 'lead-chloride' }])
    expect(runRecords(m, state, 'lead-chloride')[0]!.disturbances[0]).toMatchObject({ answer: 'right', wrongFields: null, answerRight: null })
    expect(runRecords(m, state, 'lead-chloride')[0]!.outcome).toEqual({ state: 'open' })
  })
})
