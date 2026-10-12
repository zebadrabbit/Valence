import { describe, expect, it } from 'vitest'
import { cationsData, ION_IDS, PART_IDS, STEP_IDS, type IonId, type PartId } from '@/chem-data/cations/data'
import { mulberry32 } from '../rng'
import { can, mismatch, reduce, warnings, type Action } from './actions'
import { modelFrom, RULE_IDS, SOLID_IDS } from './model'
import { PINNED_MODEL } from './pinnedModel'
import { STEP_TUBES, type Observation, type Reason } from './run'
import { chartMap, doneParts, partView, runOutcome, runRecords } from './select'
import { sampleOf, UNKNOWNS } from './setup'
import { cationsStateSchema, createLab, currentRun, type CationsState, type Mode } from './state'
import { deduced, run, seen, wholeRun, workStep, type Technique } from './testkit'

// Spec 17.7, the Group I cations lab's acceptance list, on the engine and the stored record. Its last item, the
// description in words of every tube, is the wording module's (src/app/lab/cations/messages.test.ts); that every
// stored value has a source and that the build's checks pass is src/chem-data/cations/build.test.ts.

const m = modelFrom(cationsData)
const schema = cationsStateSchema(m)
const MODES: Mode[] = ['guided', 'challenge']
/** Through JSON and the schema, as a reload does. */
const reloaded = (state: CationsState): CationsState => schema.parse(JSON.parse(JSON.stringify(state)))

/**
 * What each step shows for a sample, written out from the scheme (spec 17.2) and not from the engine: a white
 * solid at step 1 whatever is there; a white solid left at step 2 where there is silver or mercury(I); a yellow
 * solid at step 3 for lead, in a liquid the chromate colours either way; a grey to black solid at step 4 for
 * mercury(I); a white solid at step 5 for silver.
 */
function scheme(ions: readonly IonId[]): Observation[] {
  const has = (ion: IonId) => ions.includes(ion)
  return [
    { solid: 'white', liquid: 'colourless' },
    { solid: has('silver') || has('mercury-i') ? 'white' : 'none', liquid: 'colourless' },
    { solid: has('lead') ? 'yellow' : 'none', liquid: 'yellow to orange' },
    { solid: has('mercury-i') ? 'grey to black' : 'none', liquid: 'colourless' },
    { solid: has('silver') ? 'white' : 'none', liquid: 'colourless' },
  ]
}

/** A lab whose current unknown is the one named: seed 1 deals all seven, so the part is run again until it comes up. */
function labWith(ions: readonly IonId[], mode: Mode): CationsState {
  let state = createLab(1, mode)
  while (sampleOf(1, 'unknown', currentRun(state, 'unknown').index).join() !== ions.join()) {
    state = run(m, state, [{ type: 'add', part: 'unknown' }, { type: 'runAgain', part: 'unknown' }])
  }
  return state
}
const observed = (state: CationsState, part: PartId) => partView(m, state, part).steps.map((step) => step.observation)
const showed = (state: CationsState, part: PartId) => partView(m, state, part).steps.map((step) => seen(m, step.shows!))
const reasons = (state: CationsState, part: PartId): Reason[] => {
  const outcome = runOutcome(m, state, part, currentRun(state, part))
  return outcome.state === 'does-not-count' ? outcome.reasons : []
}

describe('the model the lab runs on', () => {
  it('is the pinned model: the stored record gives the values every expected value here is worked from', () => {
    expect(m).toEqual(PINNED_MODEL)
    expect(cationsData.steps.map((step) => step.tube)).toEqual(STEP_TUBES)
  })

  it('follows the rules the record stores, each of which has a source (spec 17.7, third item)', () => {
    expect(cationsData.rules.map((rule) => rule.id)).toEqual([...RULE_IDS])
    for (const rule of cationsData.rules) expect(rule.sourceId.length, rule.id).toBeGreaterThan(0)
    // Every solid a tube can hold is a substance of the record, with a look that has a source.
    for (const solid of SOLID_IDS) expect(cationsData.substances.find((s) => s.id === solid)?.look?.sourceId, solid).toBeTruthy()
  })
})

describe('a careful run (spec 17.7, first item)', () => {
  it('of the known shows every positive result once, and counts, in Guided and in Challenge', () => {
    for (const mode of MODES) {
      const state = wholeRun(m, createLab(1, mode), 'known')
      expect(observed(state, 'known'), mode).toEqual(scheme(ION_IDS))
      expect(showed(state, 'known'), mode).toEqual(scheme(ION_IDS))
      const view = partView(m, state, 'known')
      expect(view, mode).toMatchObject({ outcome: { state: 'counts' }, done: true, holds: ['silver', 'lead', 'mercury-i'], step: null })
      expect(view.chart!.places.every((place) => place.right === true), mode).toBe(true)
      expect(view.steps.every((step) => step.checked && step.wrongFields?.length === 0), mode).toBe(true)
    }
  })

  it.each(UNKNOWNS.map((ions) => [ions.join(' + '), ions] as const))('of the unknown that holds %s shows at every step what its ions give and nothing else, and counts', (_name, ions) => {
    for (const mode of MODES) {
      let state = labWith(ions, mode)
      state = wholeRun(m, state, 'unknown')
      expect(observed(state, 'unknown'), mode).toEqual(scheme(ions))
      expect(showed(state, 'unknown'), mode).toEqual(scheme(ions))
      expect(deduced(m, state, 'unknown'), mode).toEqual(ions)
      // Naming its ions completes part 2, and the part then says what the sample held.
      expect(partView(m, state, 'unknown'), mode).toMatchObject({ outcome: { state: 'counts' }, done: true, holds: ions, naming: { open: false, named: ions } })
      expect(doneParts(m, state), mode).toEqual(['unknown'])
    }
  })

  it('of both parts completes the lab, in either order', () => {
    for (const mode of MODES) {
      for (const order of [PART_IDS, [...PART_IDS].reverse()]) {
        let state = createLab(7, mode)
        for (const part of order) {
          expect(state.status).toBe('in-progress')
          state = wholeRun(m, state, part)
        }
        expect(state.status, `${mode} ${order.join()}`).toBe('completed')
        expect(doneParts(m, state)).toEqual(['known', 'unknown'])
      }
    }
  })

  it('counts at every seed from 1 to 60 for the unknown the seed deals first', () => {
    const first = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) {
      const state = wholeRun(m, createLab(seed, seed % 2 === 0 ? 'guided' : 'challenge'), 'unknown')
      expect(partView(m, state, 'unknown').outcome.state, String(seed)).toBe('counts')
      first.add(partView(m, state, 'unknown').holds!.join())
    }
    expect(first.size).toBe(7)
  })
})

describe('each error of technique alone (spec 17.7, second item)', () => {
  // The slip, what makes it possible, and the cause the run then names.
  const SLIPS: [name: string, how: Technique, kind: Reason['kind'], step: (typeof STEP_IDS)[number]][] = [
    ['pouring off at step 1 without the centrifuge', { uncentrifugedAt: 0 }, 'poured-uncentrifuged', 'precipitate'],
    ['pouring off at step 2 without the centrifuge', { uncentrifugedAt: 1 }, 'poured-uncentrifuged', 'extract-lead'],
    ['pouring off at step 4 without the centrifuge', { uncentrifugedAt: 3 }, 'poured-uncentrifuged', 'separate'],
    ['pouring the water of step 2 off cold', { heat: false }, 'water-not-heated', 'extract-lead'],
    ['judging step 5 before the liquid is acid', { judgeEarly: true }, 'judged-before-acid', 'confirm-silver'],
  ]
  /** Whether the slip can be made at all: pouring off without a centrifuge needs a solid in the liquid to carry over. */
  const possible = (how: Technique, ions: readonly IonId[]) => {
    if (how.uncentrifugedAt === 1) return ions.includes('silver') || ions.includes('mercury-i')
    if (how.uncentrifugedAt === 3) return ions.includes('mercury-i')
    return true
  }

  it.each(SLIPS)('%s makes a run not count wherever it is made, and its cause is named', (_name, how, kind, step) => {
    let changed = 0
    for (const ions of UNKNOWNS) {
      for (const mode of MODES) {
        const state = wholeRun(m, labWith(ions, mode), 'unknown', how)
        const where = `${ions.join('+')} ${mode}`
        if (!possible(how, ions)) {
          // There is no solid in the liquid to go over with it, so nothing was done wrong and the run is the careful one.
          expect(partView(m, state, 'unknown').outcome, where).toEqual({ state: 'counts' })
          continue
        }
        expect(reasons(state, 'unknown').filter((reason) => reason.kind !== 'ions-wrong'), where).toEqual([{ kind, step }])
        expect(partView(m, state, 'unknown').done, where).toBe(false)
        // Each observation is still what its tube showed: the run fails on the technique, and says so.
        expect(partView(m, state, 'unknown').steps.every((s) => s.wrongFields?.length === 0), where).toBe(true)
        if (JSON.stringify(showed(state, 'unknown')) !== JSON.stringify(scheme(ions))) changed++
      }
    }
    // Wherever it changes what is seen, the run did not count (above); and it does change what is seen for some sample.
    expect(changed).toBeGreaterThan(0)
  })

  it('changes what is seen just where the chemistry says it does', () => {
    const differs = (how: Technique, ions: readonly IonId[]) => {
      const state = wholeRun(m, labWith(ions, 'challenge'), 'unknown', how)
      return showed(state, 'unknown').map((shown, at) => (JSON.stringify(shown) === JSON.stringify(scheme(ions)[at]) ? '' : `${at + 1}:${shown.solid}`)).filter(Boolean)
    }
    // Step 1 without the centrifuge: the solid is gone with the liquid, and every later step shows nothing.
    expect(differs({ uncentrifugedAt: 0 }, ION_IDS)).toEqual(['2:none', '3:none', '4:none', '5:none'])
    expect(differs({ uncentrifugedAt: 0 }, ['lead'])).toEqual(['3:none'])
    // Step 2 without the centrifuge: the solid goes into the second tube, which is cloudy, and the first has none for step 4.
    expect(differs({ uncentrifugedAt: 1 }, ION_IDS)).toEqual(['4:none', '5:none'])
    expect(differs({ uncentrifugedAt: 1 }, ['silver'])).toEqual(['3:white', '5:none'])
    // Step 4 without the centrifuge: the grey to black solid goes into the third tube.
    expect(differs({ uncentrifugedAt: 3 }, ION_IDS)).toEqual(['5:grey to black'])
    expect(differs({ uncentrifugedAt: 3 }, ['mercury-i'])).toEqual(['5:grey to black'])
    // The water poured off cold: lead chloride is still there, white, after the ammonia of step 4.
    expect(differs({ heat: false }, ['lead'])).toEqual(['2:white', '4:white'])
    expect(differs({ heat: false }, ['silver', 'lead'])).toEqual(['4:white'])
    // With mercury(I) there too the grey to black solid hides it, and nothing that is seen changes.
    expect(differs({ heat: false }, ION_IDS)).toEqual([])
    expect(differs({ heat: false }, ['silver'])).toEqual([])
    // Step 5 judged early: no solid forms though silver is there.
    expect(differs({ judgeEarly: true }, ION_IDS)).toEqual(['5:none'])
    expect(differs({ judgeEarly: true }, ['lead'])).toEqual([])
  })

  it('shows the tube poured into as cloudy when the solid goes over with the liquid', () => {
    let state = labWith(ION_IDS, 'challenge')
    state = workStep(m, workStep(m, state, 'unknown'), 'unknown', { uncentrifugedAt: 1 })
    const second = partView(m, state, 'unknown').steps[2]!
    expect(second).toMatchObject({ status: 'current', tube: 'b', shows: { liquid: { colour: 'colourless', cloudy: true }, solid: { colour: 'white', settled: false } } })
  })

  it('does not count a slip in part 1 either, where nothing that is seen need change', () => {
    for (const mode of MODES) {
      const state = wholeRun(m, createLab(1, mode), 'known', { heat: false })
      expect(showed(state, 'known'), mode).toEqual(scheme(ION_IDS))
      expect(partView(m, state, 'known'), mode).toMatchObject({ outcome: { state: 'does-not-count', reasons: [{ kind: 'water-not-heated', step: 'extract-lead' }] }, done: false })
      expect(state.status).toBe('in-progress')
      // The part is run again, and a careful run of it counts.
      const again = wholeRun(m, run(m, state, [{ type: 'runAgain', part: 'known' }]), 'known')
      expect(partView(m, again, 'known'), mode).toMatchObject({ runs: 2, outcome: { state: 'counts' }, done: true })
    }
  })

  it('is warned of first in Guided, at the very action that makes it, and not in Challenge', () => {
    const asked = (mode: Mode, how: Technique, ions: readonly IonId[]) => {
      const raised: string[] = []
      // Every action a scripted learner takes is asked about before it is taken.
      const original = { state: labWith(ions, mode) }
      const actions: Action[] = []
      wholeRun(m, original.state, 'unknown', how, (s) => s)
      // Replay the same run, collecting the warnings before each action.
      let state = original.state
      const record = (action: Action) => {
        for (const warning of warnings(m, state, action)) raised.push(`${partView(m, state, 'unknown').step}:${action.type}:${warning}`)
        state = reduce(m, state, action)
        actions.push(action)
      }
      const view = () => partView(m, state, 'unknown')
      for (let at = 0; at < 5; at++) {
        record({ type: 'add', part: 'unknown' })
        if (at === 1 && how.heat !== false) record({ type: 'heat', part: 'unknown' })
        if (at === 4 && !how.judgeEarly) {
          record({ type: 'testLitmus', part: 'unknown' })
          while (view().steps[4]!.litmus !== 'acid') {
            record({ type: 'add', part: 'unknown' })
            record({ type: 'testLitmus', part: 'unknown' })
          }
        }
        if (how.uncentrifugedAt !== at && can(m, state, { type: 'centrifuge', part: 'unknown' }) === null) record({ type: 'centrifuge', part: 'unknown' })
        record({ type: 'look', part: 'unknown', at: 'liquid' })
        record({ type: 'look', part: 'unknown', at: 'bottom' })
        record({ type: 'observe', part: 'unknown', observation: seen(m, view().steps[at]!.shows!) })
        if (!view().steps[at]!.checked) record({ type: 'checkStep', part: 'unknown' })
        if (can(m, state, { type: 'pourOff', part: 'unknown' }) === null) record({ type: 'pourOff', part: 'unknown' })
      }
      return raised
    }
    expect(asked('guided', {}, ION_IDS)).toEqual([])
    expect(asked('guided', { uncentrifugedAt: 0 }, ION_IDS)).toEqual(['precipitate:pourOff:not-centrifuged'])
    expect(asked('guided', { uncentrifugedAt: 1 }, ION_IDS)).toEqual(['extract-lead:pourOff:not-centrifuged'])
    expect(asked('guided', { uncentrifugedAt: 3 }, ION_IDS)).toEqual(['separate:pourOff:not-centrifuged'])
    expect(asked('guided', { heat: false }, ION_IDS)).toEqual(['extract-lead:pourOff:not-heated'])
    expect(asked('guided', { judgeEarly: true }, ION_IDS)).toEqual(['confirm-silver:observe:not-acid'])
    for (const how of [{ uncentrifugedAt: 0 }, { heat: false }, { judgeEarly: true }]) expect(asked('challenge', how, ION_IDS)).toEqual([])
  })

  it('is warned of whether or not the unknown holds the ion it matters for, so that a warning says nothing of the sample', () => {
    const before = (ions: readonly IonId[], through: number, actions: Action[]) => {
      let state = labWith(ions, 'guided')
      for (let at = 0; at < through; at++) state = workStep(m, state, 'unknown')
      return run(m, state, actions)
    }
    const looks: Action[] = [{ type: 'look', part: 'unknown', at: 'liquid' }, { type: 'look', part: 'unknown', at: 'bottom' }]
    for (const ions of UNKNOWNS) {
      // Step 2 with the water cold: the same warning with lead and without.
      const cold = before(ions, 1, [{ type: 'add', part: 'unknown' }, { type: 'centrifuge', part: 'unknown' }, ...looks, { type: 'observe', part: 'unknown', observation: { solid: 'white', liquid: 'colourless' } }])
      expect(warnings(m, cold, { type: 'pourOff', part: 'unknown' }), ions.join()).toEqual(['not-heated'])
      // Step 5 after one addition: the same warning with silver and without.
      const early = before(ions, 4, [{ type: 'add', part: 'unknown' }, ...looks])
      expect(warnings(m, early, { type: 'observe', part: 'unknown', observation: { solid: 'none', liquid: 'colourless' } }), ions.join()).toEqual(['not-acid'])
    }
  })
})

describe('an entry that is not right', () => {
  it('in Challenge is taken, marked when its step is checked, and named when the run is over', () => {
    for (let at = 0; at < 5; at++) {
      const state = wholeRun(m, labWith(ION_IDS, 'challenge'), 'unknown', { wrongSolidAt: at })
      expect(partView(m, state, 'unknown').steps[at]!.wrongFields, String(at)).toEqual(['solid'])
      expect(reasons(state, 'unknown')[0], String(at)).toEqual({ kind: 'observation-wrong', step: STEP_IDS[at] })
      expect(partView(m, state, 'unknown').done).toBe(false)
    }
  })

  it('in Guided is refused where it is made, so a scripted learner who makes one cannot go on', () => {
    expect(() => wholeRun(m, labWith(ION_IDS, 'guided'), 'unknown', { wrongSolidAt: 2 })).toThrow(/observe: does-not-match/)
    expect(() => wholeRun(m, createLab(1, 'guided'), 'known', { wrongTileAt: 1 })).toThrow(/place: wrong-place/)
  })

  it('on the flow chart does not count a run of part 1 in Challenge', () => {
    const state = wholeRun(m, createLab(1, 'challenge'), 'known', { wrongTileAt: 3 })
    const view = partView(m, state, 'known')
    expect(view.outcome).toEqual({ state: 'does-not-count', reasons: [{ kind: 'chart-wrong' }] })
    expect(view.chart!.places.filter((place) => place.right === false).map((place) => place.id)).toEqual(['separate-solid'])
    expect(chartMap(m, state)).toBeNull()
  })

  it('in the naming of the ions does not count a run of part 2, in either mode, and the run then says what the sample held', () => {
    for (const mode of MODES) {
      const state = wholeRun(m, labWith(['silver', 'lead'], mode), 'unknown', { nameWrong: true })
      expect(partView(m, state, 'unknown'), mode).toMatchObject({ outcome: { state: 'does-not-count', reasons: [{ kind: 'ions-wrong' }] }, naming: { named: ['mercury-i'] }, holds: ['silver', 'lead'], done: false })
    }
  })
})

describe('the same seed and the same actions (spec 17.7, fourth item)', () => {
  it('give the same run, tube for tube and outcome for outcome', () => {
    for (const mode of MODES) {
      const twice = [1, 2].map(() => wholeRun(m, wholeRun(m, createLab(5, mode), 'known'), 'unknown', { heat: false }))
      expect(twice[0]).toEqual(twice[1])
      expect(partView(m, twice[0]!, 'unknown')).toEqual(partView(m, twice[1]!, 'unknown'))
    }
  })

  it('give a run that does not depend on what was done in the runs before it, or in the other part', () => {
    const fresh = wholeRun(m, run(m, createLab(1, 'challenge'), [{ type: 'add', part: 'unknown' }, { type: 'runAgain', part: 'unknown' }]), 'unknown')
    const after = wholeRun(m, run(m, wholeRun(m, wholeRun(m, createLab(1, 'challenge'), 'known', { heat: false }), 'unknown', { uncentrifugedAt: 0 }), [{ type: 'runAgain', part: 'unknown' }]), 'unknown')
    expect(currentRun(after, 'unknown')).toEqual(currentRun(fresh, 'unknown'))
    expect(partView(m, after, 'unknown').steps).toEqual(partView(m, fresh, 'unknown').steps)
  })
})

describe('the stored record', () => {
  it('round-trips: a lab reloaded from storage after every action ends where one never reloaded does', () => {
    for (const mode of MODES) {
      for (const how of [{}, { heat: false }, { uncentrifugedAt: 1 }, { judgeEarly: true }] as Technique[]) {
        let straight = createLab(3, mode)
        let stored = createLab(3, mode)
        for (const part of PART_IDS) {
          straight = wholeRun(m, straight, part, how)
          stored = wholeRun(m, stored, part, how, reloaded)
        }
        expect(stored, `${mode} ${JSON.stringify(how)}`).toEqual(straight)
        expect(reloaded(stored)).toEqual(stored)
      }
    }
  })
})

describe('no state a learner can reach leaves them unable to go on', () => {
  const OBSERVATIONS: Observation[] = PINNED_MODEL.solidChoices.flatMap((solid) => PINNED_MODEL.liquidChoices.map((liquid) => ({ solid, liquid })))
  /** Every action there is to try from a state, in a fixed order. */
  const tries = (part: PartId): Action[] => [
    { type: 'add', part },
    { type: 'heat', part },
    { type: 'centrifuge', part },
    { type: 'testLitmus', part },
    { type: 'look', part, at: 'liquid' },
    { type: 'look', part, at: 'bottom' },
    ...OBSERVATIONS.map((observation): Action => ({ type: 'observe', part, observation })),
    ...m.places.flatMap((place) => m.tiles.flatMap((tile): Action[] => [{ type: 'place', part, place: place.id, tile }, { type: 'unplace', part, place: place.id, tile }])),
    { type: 'checkStep', part },
    { type: 'pourOff', part },
    ...UNKNOWNS.map((ions): Action => ({ type: 'nameIons', part, ions: [...ions] })),
    { type: 'runAgain', part },
  ]

  it('from four hundred actions taken as they come, in either mode, each part can still be finished and the lab completed', () => {
    for (const mode of MODES) {
      for (const seed of [1, 2]) {
        const rng = mulberry32(seed * 977)
        let state = createLab(seed, mode)
        for (let i = 0; i < 400; i++) {
          const part = PART_IDS[Math.floor(rng() * 2)]!
          // Everything that can be done now; of those, one is taken that changes something (a look already made does not).
          const open = tries(part).filter((action) => can(m, state, action) === null)
          let next = state
          while (next === state && open.length > 0) next = reduce(m, state, open.splice(Math.floor(rng() * open.length), 1)[0]!)
          // A run that is not over always has something that can be done in it; one that is over can be run again.
          expect(next, `${mode} ${seed} ${i}`).not.toBe(state)
          state = reloaded(next)
          expect(state).toEqual(next)
        }
        // From wherever the walk left each part, a careful run of it still counts.
        for (const part of PART_IDS) {
          if (currentRun(state, part).events.length > 0) state = run(m, state, [{ type: 'runAgain', part }])
          state = wholeRun(m, state, part)
          expect(partView(m, state, part).outcome.state, `${mode} ${seed} ${part}`).toBe('counts')
        }
        expect(state.status).toBe('completed')
      }
    }
  }, 60_000)

  it('offers a way on from every point of a careful run and of each careless one', () => {
    for (const mode of MODES) {
      for (const how of [{}, { uncentrifugedAt: 0 }, { uncentrifugedAt: 1 }, { heat: false }, { judgeEarly: true }] as Technique[]) {
        for (const part of PART_IDS) {
          wholeRun(m, createLab(4, mode), part, how, (state) => {
            const over = partView(m, state, part).outcome.state !== 'open'
            const way = tries(part).some((action) => (over ? action.type === 'runAgain' : action.type !== 'runAgain') && can(m, state, action) === null)
            expect(way, `${mode} ${part} ${JSON.stringify(how)}`).toBe(true)
            return state
          })
        }
      }
    }
  }, 60_000)
})

describe('nothing of what is expected is shown before it is recorded (spec 17.7, fifth item)', () => {
  /** Everything the engine's public surface gives of a part, as one string. */
  const surface = (state: CationsState, part: PartId) => JSON.stringify([partView(m, state, part), runRecords(m, state, part), runOutcome(m, state, part, currentRun(state, part)), doneParts(m, state), chartMap(m, state)])

  it('in Challenge, at every action of a careful run, a step that is not checked says nothing of whether its observation is right, and the page can try nothing against the tube', () => {
    for (const part of PART_IDS) {
      wholeRun(m, createLab(1, 'challenge'), part, {}, (state) => {
        const view = partView(m, state, part)
        for (const step of view.steps) {
          if (!step.checked) expect(step.wrongFields, step.id).toBeNull()
          if (step.status === 'waiting') expect(step.shows, step.id).toBeNull()
        }
        for (const place of view.chart?.places ?? []) {
          expect(place.slots).toBeNull()
          if (!view.steps.find((step) => step.id === place.step)!.checked) expect(place.right, place.id).toBeNull()
        }
        // Whatever is offered, Challenge says the same of it: no fields to look at again, and no warning.
        for (const solid of m.solidChoices) expect(mismatch(m, state, part, { solid, liquid: 'colourless' })).toEqual([])
        for (const type of ['pourOff', 'checkStep'] as const) expect(warnings(m, state, { type, part })).toEqual([])
        return state
      })
    }
  })

  it('in Challenge takes a wrong observation exactly as it takes a right one, at every step', () => {
    let state = labWith(['silver'], 'challenge')
    for (let at = 0; at < 5; at++) {
      const ready = run(m, state, [{ type: 'add', part: 'unknown' }, ...(at === 1 ? [{ type: 'heat', part: 'unknown' } as Action] : []), { type: 'look', part: 'unknown', at: 'liquid' }, { type: 'look', part: 'unknown', at: 'bottom' }])
      for (const solid of m.solidChoices) for (const liquid of m.liquidChoices) expect(can(m, ready, { type: 'observe', part: 'unknown', observation: { solid, liquid } }), `${at} ${solid} ${liquid}`).toBeNull()
      state = workStep(m, state, 'unknown')
    }
  })

  it('says nothing of which ions an unknown holds before they are named: until then two unknowns that have shown the same things are the same to the page', () => {
    for (const mode of MODES) {
      // What each of the seven shows, action by action, with everything the page is given at that point.
      const real = UNKNOWNS.map((ions) => {
        const points: { seen: string; given: string; named: boolean }[] = []
        wholeRun(m, labWith(ions, mode), 'unknown', {}, (state) => {
          const view = partView(m, state, 'unknown')
          const current = currentRun(state, 'unknown')
          // Only the current run is compared: the runs before it are the empty ones that brought this unknown up.
          const alone: CationsState = { ...state, parts: { ...state.parts, unknown: [current] } }
          points.push({ seen: JSON.stringify([view.rack, view.steps.map((step) => [step.shows, step.litmus, step.observation])]), given: JSON.stringify([view.steps, view.rack, view.naming, view.outcome, view.holds, view.map, view.chart, alone.parts.unknown[0]!.events]), named: view.naming!.named !== null })
          return state
        })
        return { ions, points }
      })
      expect(real).toHaveLength(7)
      for (const a of real) {
        for (const b of real) {
          a.points.forEach((point, i) => {
            const other = b.points[i]
            if (other === undefined || point.named || other.named) return
            // The same things seen so far: then the same things given, to the last character.
            if (a.points.slice(0, i + 1).every((p, j) => p.seen === b.points[j]!.seen)) expect(point.given, `${mode} ${a.ions.join()} ${b.ions.join()} ${i}`).toBe(other.given)
          })
        }
      }
      // And before anything is added, all seven are one.
      expect(new Set(UNKNOWNS.map((ions) => JSON.stringify(partView(m, labWith(ions, mode), 'unknown').steps))).size).toBe(1)
    }
  })

  it('hands over what an unknown holds only once its ions are named, and names no ion and no substance before that', () => {
    for (const mode of MODES) {
      for (const ions of UNKNOWNS) {
        wholeRun(m, labWith(ions, mode), 'unknown', {}, (state) => {
          const view = partView(m, state, 'unknown')
          const named = view.naming!.named !== null
          expect(view.holds, ions.join()).toEqual(named ? ions : null)
          if (!named) {
            expect(view.outcome).toEqual({ state: 'open' })
            // The ids of the steps name lead and silver, since the scheme does; nothing else on the surface names an ion or a compound.
            const given = STEP_IDS.reduce((text, id) => text.replaceAll(`"${id}"`, '""'), surface(state, 'unknown'))
            expect(given).not.toMatch(/silver|lead|mercury|chlor|chromat|ammon|hydrox|Ag|Pb|Hg/)
          }
          return state
        })
      }
    }
  })

  it('gives part 2 the finished flow chart as a map only once part 1 is done', () => {
    let state = createLab(1, 'challenge')
    expect(partView(m, state, 'unknown').map).toBeNull()
    state = wholeRun(m, state, 'known', { heat: false })
    expect(partView(m, state, 'unknown').map).toBeNull()
    state = wholeRun(m, run(m, state, [{ type: 'runAgain', part: 'known' }]), 'known')
    const map = partView(m, state, 'unknown').map!
    expect(map.map((place) => `${place.step} ${place.layer}: ${place.tiles.join(', ')}`)).toEqual([
      'precipitate solid: silver-chloride, lead-chloride, mercury-i-chloride',
      'extract-lead solid: silver-chloride, mercury-i-chloride',
      'extract-lead liquid: lead-ion',
      'confirm-lead solid: lead-chromate',
      'separate solid: mercury-and-amidochloride',
      'separate liquid: silver-ammonia-ion',
      'confirm-silver solid: silver-chloride',
    ])
    // The map is the scheme, and is the same whatever the unknown holds.
    expect(partView(m, state, 'known').map).toBeNull()
  })
})

describe('the rack', () => {
  it('shows what each of the three tubes holds now, whichever step is being worked', () => {
    let state = createLab(1, 'challenge')
    const empty = { liquid: null, solid: null }
    expect(partView(m, state, 'known').rack).toEqual({ a: { liquid: { colour: 'colourless', cloudy: false, microlitres: 1500 }, solid: null }, b: empty, c: empty })
    for (let at = 0; at < 4; at++) state = workStep(m, state, 'known')
    // After step 4: the grey to black solid is left in the first tube, the lead test stands in the second, and the third holds the liquid that step 5 tests.
    expect(partView(m, state, 'known').rack).toEqual({
      a: { liquid: null, solid: { colour: 'grey to black', settled: true } },
      b: { liquid: { colour: 'yellow to orange', cloudy: false, microlitres: 1000 }, solid: { colour: 'yellow', settled: true } },
      c: { liquid: { colour: 'colourless', cloudy: false, microlitres: 750 }, solid: null },
    })
  })
})

describe('the record of the runs', () => {
  it('lists every run of a part with what was recorded, how it came out and, once it is over, what its sample held', () => {
    let state = wholeRun(m, createLab(1, 'challenge'), 'unknown', { wrongSolidAt: 0 })
    state = run(m, state, [{ type: 'runAgain', part: 'unknown' }, { type: 'add', part: 'unknown' }])
    const records = runRecords(m, state, 'unknown')
    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({ named: ['lead'], holds: ['lead'], chartRight: null, outcome: { state: 'does-not-count', reasons: [{ kind: 'observation-wrong', step: 'precipitate' }] } })
    expect(records[0]!.steps[0]).toEqual({ id: 'precipitate', observation: { solid: 'none', liquid: 'colourless' }, checked: true, wrongFields: ['solid'] })
    // A run that is not over says nothing of its sample.
    expect(records[1]).toMatchObject({ named: null, holds: null, outcome: { state: 'open' } })
    expect(records[1]!.steps.every((step) => step.observation === null && step.wrongFields === null)).toBe(true)
    const known = runRecords(m, wholeRun(m, createLab(1, 'guided'), 'known'), 'known')
    expect(known[0]).toMatchObject({ chartRight: true, holds: ['silver', 'lead', 'mercury-i'], outcome: { state: 'counts' } })
  })
})
