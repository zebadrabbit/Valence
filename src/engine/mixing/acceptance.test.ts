import { describe, expect, it } from 'vitest'
import { FAMILIES, LIQUID_IDS, mixingData, PAIR_IDS, QUESTION_IDS, SOLID_TUBE_IDS, type LiquidId, type TubeId } from '@/chem-data/mixing/data'
import sources from '@/chem-data/sources.json'
import { mulberry32 } from '../rng'
import { can, reduce, type Action } from './actions'
import * as door from './index'
import { liquidModel, modelFrom, pairModel, questionModel, solidTubeModel, STAGES, topOf } from './model'
import { PINNED_MODEL as m } from './pinnedModel'
import { benchView, pairView, ruleView, solidTubeView, tubeView } from './select'
import { createLab, LAYERS, mixingStateSchema, SOLID_SEEN, type MixingState } from './state'
import { run, wholeLab, wholePair, wholePairs, wholeRule, wholeSolids, wholeSolidTube, wholeTube } from './testkit'

// Spec 25.5, a group of tests for each of its lines that the engine can show. The line on the description in words
// of every tube is the page's sentences' to show (src/app/lab/mixing/messages.test.ts); what the engine shows of it
// is that no answer depends on seeing a colour.

const TUBES: readonly TubeId[] = [...PAIR_IDS, ...SOLID_TUBE_IDS]
const MODES = ['guided', 'challenge'] as const
const schema = mixingStateSchema(m)
const roundTrip = (state: MixingState): MixingState => schema.parse(JSON.parse(JSON.stringify(state)))

describe('every tube the bench offers shows what its stored record gives and nothing else; which liquid is on top agrees with the stored densities', () => {
  it('shows one layer for each pair the record says mixes, and two for each it says does not, whichever liquid there is more of', () => {
    for (const pair of mixingData.pairs) {
      for (const more of pair.liquidIds) {
        const shows = pairView(m, wholePair(m, createLab('challenge'), pair.id, { more }), pair.id).shows
        expect('above' in shows, `${pair.id}, more ${more}`).toBe(!pair.mix.value)
        expect(shows.solid).toBeNull()
        expect(shows.liquid!.cloudy).toBe(false)
      }
    }
  })

  it('puts on top, in every pair of two layers, the liquid whose stored density is the lower, and draws each layer as thick as the amount that went in', () => {
    const density = (id: LiquidId) => mixingData.liquids.find((liquid) => liquid.id === id)!.density.value
    for (const pair of mixingData.pairs.filter((p) => !p.mix.value)) {
      const [a, b] = pair.liquidIds
      const lighter = density(a) < density(b) ? a : b
      expect(topOf(modelFrom(mixingData), pair.id), pair.id).toBe(lighter)
      expect(Math.abs(density(a) - density(b)), pair.id).toBeGreaterThanOrEqual(mixingData.parameters.leastDensityGap.value)
      for (const more of pair.liquidIds) {
        const shows = pairView(m, wholePair(m, createLab('challenge'), pair.id, { more }), pair.id).shows
        const colourOf = (id: LiquidId) => mixingData.liquids.find((liquid) => liquid.id === id)!.looks.value
        expect(shows.above!.colour, pair.id).toBe(colourOf(lighter))
        expect(shows.liquid!.colour, pair.id).toBe(colourOf(lighter === a ? b : a))
        expect(shows.above!.microlitres, `${pair.id}, more ${more}`).toBe(more === lighter ? 3000 : 1500)
        expect(shows.liquid!.microlitres, `${pair.id}, more ${more}`).toBe(more === lighter ? 1500 : 3000)
      }
    }
  })

  it('shows the solid gone in each liquid the record says dissolves it, and at the bottom in each it says does not', () => {
    for (const tube of mixingData.solidInLiquid) {
      const shows = solidTubeView(m, wholeSolidTube(m, createLab('challenge'), tube.id), tube.id).shows
      expect(shows.solid, tube.id).toEqual(tube.dissolves.value ? null : { colour: 'white', settled: true })
    }
  })

  it('counts a tube when what is recorded is what it showed, and not otherwise', () => {
    for (const id of TUBES) {
      expect(tubeView(m, wholeTube(m, createLab('challenge'), id), id).outcome, id).toEqual({ state: 'counts' })
      const wrong = id.includes('+') ? wholePair(m, createLab('challenge'), id as (typeof PAIR_IDS)[number], { wrong: true }) : wholeSolidTube(m, createLab('challenge'), id as (typeof SOLID_TUBE_IDS)[number], { wrong: true })
      expect(tubeView(m, wrong, id).outcome, id).toEqual({ state: 'does-not-count' })
    }
    // The right number of layers with the other liquid named on top does not count either.
    for (const id of PAIR_IDS.filter((pair) => topOf(m, pair) !== null)) {
      const other = pairModel(m, id).liquids.find((liquid) => liquid !== topOf(m, id))!
      const s = run(m, wholePair(m, createLab('challenge'), id, { check: false }), [{ type: 'sayTop', tube: id, is: other }, { type: 'check', tube: id }])
      expect(pairView(m, s, id).reasons, id).toEqual(['top-wrong'])
    }
  })

  it('offers no tube for what is left off the bench', () => {
    expect(door.pairOf(m, 'rubbing-alcohol', 'mineral-oil')).toBeNull()
    expect([door.solidTubeOf(m, 'salt', 'rubbing-alcohol'), door.solidTubeOf(m, 'sugar', 'rubbing-alcohol')]).toEqual([null, null])
    expect(mixingData.offBench.map((left) => left.id)).toEqual(['rubbing-alcohol+mineral-oil', 'salt-in-rubbing-alcohol', 'sugar-in-rubbing-alcohol'])
  })
})

describe('every stored outcome and density has a source; nothing unsourced is on the bench', () => {
  const listed = (id: string) => sources.some((source) => source.id === id)

  it('cites a listed source for every density, family, outcome and answer, with the reason it applies', () => {
    for (const liquid of mixingData.liquids) {
      expect(listed(liquid.density.sourceId), liquid.id).toBe(true)
      expect(listed(liquid.family.sourceId), liquid.id).toBe(true)
      expect(liquid.density.published, liquid.id).toBeDefined()
    }
    for (const outcome of [...mixingData.pairs.map((p) => p.mix), ...mixingData.solidInLiquid.map((t) => t.dissolves), ...mixingData.rule.questions.map((q) => q.answer)]) {
      expect(listed(outcome.sourceId), outcome.sourceId).toBe(true)
      expect(outcome.reason.length).toBeGreaterThan(40)
    }
  })

  it('has on the bench exactly the tubes of the record, each of which has one', () => {
    expect(m.pairs.map((pair) => pair.id)).toEqual(mixingData.pairs.map((pair) => pair.id))
    expect(m.solidTubes.map((tube) => tube.id)).toEqual(mixingData.solidInLiquid.map((tube) => tube.id))
    expect(Object.keys(createLab('guided').pairs)).toEqual([...PAIR_IDS])
    expect(Object.keys(createLab('guided').solids)).toEqual([...SOLID_TUBE_IDS])
  })

  it("marks as the lab's own what no source gives: two looks, the amounts, and how an unsettled tube and a mixture are drawn", () => {
    expect(mixingData.liquids.filter((liquid) => 'rationale' in liquid.looks).map((liquid) => liquid.id)).toEqual(['water', 'vinegar'])
    for (const parameter of Object.values(mixingData.parameters)) expect(parameter.rationale.length).toBeGreaterThan(40)
  })
})

describe('a part is done at its count; the sorting of part 3 is checked against the stored families', () => {
  it('is done at six of the nine pairs and at six of the eight solids in liquids, whichever six, in both modes', () => {
    for (const mode of MODES) {
      const lastSix = PAIR_IDS.slice(3).reduce((s, id) => wholePair(m, s, id), createLab(mode))
      expect(benchView(m, lastSix)).toMatchObject({ pairsCounted: 6, pairsDone: true })
      expect(benchView(m, wholePairs(m, createLab(mode), 5)).pairsDone).toBe(false)
      const solids = SOLID_TUBE_IDS.slice(2).reduce((s, id) => wholeSolidTube(m, s, id), createLab(mode))
      expect(benchView(m, solids)).toMatchObject({ solidsCounted: 6, solidsDone: true })
      expect(benchView(m, wholeSolids(m, createLab(mode), 5)).solidsDone).toBe(false)
    }
  })

  it('takes each liquid only in the family the record stores for it, and each question only with the answer the record stores', () => {
    const open = wholeSolids(m, wholePairs(m, createLab('guided')))
    for (const liquid of mixingData.liquids) {
      for (const family of FAMILIES) expect(can(m, open, { type: 'sort', liquid: liquid.id, family }), `${liquid.id} as ${family}`).toBe(family === liquid.family.value ? null : 'not-right')
    }
    for (const question of mixingData.rule.questions) {
      for (const choice of question.choices) expect(can(m, open, { type: 'answer', question: question.id, is: choice }), `${question.id}: ${choice}`).toBe(choice === question.answer.value ? null : 'not-right')
    }
  })

  it('does not count part 3 in Challenge with any one liquid in the other family, or either answer wrong', () => {
    const open = wholeSolids(m, wholePairs(m, createLab('challenge')))
    const right: Action[] = [...LIQUID_IDS.map((liquid): Action => ({ type: 'sort', liquid, family: liquidModel(m, liquid).family })), ...QUESTION_IDS.map((question): Action => ({ type: 'answer', question, is: questionModel(m, question).answer }))]
    expect(ruleView(m, run(m, open, [...right, { type: 'checkRule' }])).outcome).toEqual({ state: 'counts' })
    for (const liquid of LIQUID_IDS) {
      const other = FAMILIES.find((family) => family !== liquidModel(m, liquid).family)!
      const s = run(m, open, [...right, { type: 'sort', liquid, family: other }, { type: 'checkRule' }])
      expect(ruleView(m, s).outcome, liquid).toEqual({ state: 'does-not-count' })
      expect(ruleView(m, s).sorted.filter((sorted) => sorted.right === false).map((sorted) => sorted.liquid)).toEqual([liquid])
      expect(s.status).toBe('in-progress')
    }
    for (const question of QUESTION_IDS) {
      const other = questionModel(m, question).choices.find((choice) => choice !== questionModel(m, question).answer)!
      expect(ruleView(m, run(m, open, [...right, { type: 'answer', question, is: other }, { type: 'checkRule' }])).outcome, question).toEqual({ state: 'does-not-count' })
    }
  })

  it('completes the lab when all three parts are done, and not before', () => {
    for (const mode of MODES) {
      expect(wholeSolids(m, wholePairs(m, createLab(mode))).status).toBe('in-progress')
      expect(wholeLab(m, createLab(mode)).status).toBe('completed')
      expect(benchView(m, wholeLab(m, createLab(mode)))).toMatchObject({ pairsDone: true, solidsDone: true, ruleDone: true })
    }
  })
})

describe('the stored record round-trips; no state a learner can reach leaves them unable to go on', () => {
  /** Every action a learner could send, sensible or not. */
  const EVERY: Action[] = [
    { type: 'setMode', mode: 'guided' },
    { type: 'setMode', mode: 'challenge' },
    ...PAIR_IDS.flatMap((tube): Action[] => [
      ...pairModel(m, tube).liquids.flatMap((liquid): Action[] => [{ type: 'pour', tube, more: liquid }, { type: 'sayTop', tube, is: liquid }]),
      ...LAYERS.map((is): Action => ({ type: 'sayLayers', tube, is })),
    ]),
    ...SOLID_TUBE_IDS.flatMap((tube): Action[] => [{ type: 'add', tube }, ...SOLID_SEEN.map((is): Action => ({ type: 'saySolid', tube, is }))]),
    ...TUBES.flatMap((tube): Action[] => [{ type: 'shake', tube }, { type: 'stand', tube }, { type: 'look', tube }, { type: 'check', tube }, { type: 'again', tube }]),
    ...LIQUID_IDS.flatMap((liquid) => FAMILIES.map((family): Action => ({ type: 'sort', liquid, family }))),
    ...QUESTION_IDS.flatMap((question) => questionModel(m, question).choices.map((is): Action => ({ type: 'answer', question, is }))),
    { type: 'checkRule' },
    { type: 'againRule' },
  ]

  /** A careful learner taking the lab up from wherever it stands: each tube set up again if it can be, worked with care, and part 3 the same. */
  const carefulFrom = (state: MixingState): MixingState => {
    let s = TUBES.reduce((at, id) => wholeTube(m, reduce(m, at, { type: 'again', tube: id }), id), state)
    s = wholeRule(m, reduce(m, s, { type: 'againRule' }))
    return wholeRule(m, reduce(m, s, { type: 'againRule' }))
  }

  it('round-trips through JSON and the schema after every action of a careful lab, in both modes', () => {
    for (const mode of MODES) {
      let state = createLab(mode)
      expect(roundTrip(state)).toEqual(state)
      const steps: ((s: MixingState) => MixingState)[] = [...TUBES.map((id) => (s: MixingState) => wholeTube(m, s, id)), (s) => wholeRule(m, s)]
      for (const step of steps) {
        state = step(state)
        expect(roundTrip(state), mode).toEqual(state)
      }
      expect(state.status).toBe('completed')
    }
  })

  it('stores nothing of what a tube shows, no family but what the learner sorted, and no mark', () => {
    const stored = JSON.stringify(wholeSolids(m, wholePairs(m, createLab('challenge'))))
    expect(stored).not.toMatch(/mix|dissolves|density|counts|right|colour|microlitres|above/)
    expect(JSON.parse(stored).rule.sorted).toEqual({ water: null, 'rubbing-alcohol': null, vinegar: null, 'vegetable-oil': null, 'mineral-oil': null })
  })

  it('refuses a stored record the lab could not have made', () => {
    const base = wholePair(m, createLab('challenge'), 'water+vegetable-oil')
    const edit = (change: (s: MixingState) => void) => {
      const s: MixingState = JSON.parse(JSON.stringify(base))
      change(s)
      return schema.safeParse(s).success
    }
    expect(edit(() => undefined)).toBe(true)
    expect(edit((s) => (s.pairs['water+vinegar'].shaken = true))).toBe(false)
    expect(edit((s) => (s.pairs['water+vinegar'].more = 'mineral-oil'))).toBe(false)
    expect(edit((s) => (s.pairs['water+vegetable-oil'].stood = false))).toBe(false)
    expect(edit((s) => (s.pairs['water+vegetable-oil'].top = 'vinegar'))).toBe(false)
    expect(edit((s) => Object.assign(s.pairs['water+vegetable-oil'], { layers: 'one' }))).toBe(false)
    expect(edit((s) => (s.solids['salt-in-water'].solid = 'gone'))).toBe(false)
    expect(edit((s) => (s.solids['salt-in-water'].checked = true))).toBe(false)
    expect(edit((s) => (s.rule.sorted.water = 'water'))).toBe(false)
    expect(edit((s) => (s.rule.checked = true))).toBe(false)
    expect(edit((s) => (s.status = 'completed'))).toBe(false)
    expect(edit((s) => ((s as unknown as { seed: number }).seed = 1))).toBe(false)
    const open = wholeSolids(m, wholePairs(m, createLab('challenge')))
    expect(schema.safeParse({ ...open, rule: { ...open.rule, answers: { ...open.rule.answers, grease: 'floats' } } }).success).toBe(false)
  })

  it('leaves a way on after everything that can go wrong: every tube that does not count can be set up again, and the lab then completed', () => {
    for (const mode of MODES) {
      let state = createLab('challenge')
      for (const id of PAIR_IDS) state = wholePair(m, state, id, { wrong: true })
      for (const id of SOLID_TUBE_IDS) state = wholeSolidTube(m, state, id, { wrong: true })
      state = reduce(m, state, { type: 'setMode', mode })
      expect(benchView(m, state)).toMatchObject({ pairsCounted: 0, solidsCounted: 0 })
      for (const id of TUBES) expect(can(m, state, { type: 'again', tube: id }), id).toBeNull()
      const done = carefulFrom(state)
      expect(done.status, mode).toBe('completed')
      expect(roundTrip(done)).toEqual(done)
    }
  })

  it('can be completed with care from every state reached by 300 walks of 150 actions drawn at random, each state a record that round-trips', () => {
    for (let walk = 1; walk <= 300; walk++) {
      const rng = mulberry32(walk)
      // Half the walks start past the first two parts, so that part 3 is walked too.
      let state = walk % 2 === 0 ? wholeSolids(m, wholePairs(m, createLab(walk % 4 === 0 ? 'guided' : 'challenge'))) : createLab(walk % 4 === 1 ? 'guided' : 'challenge')
      for (let step = 0; step < 150; step++) {
        const action = EVERY[Math.floor(rng() * EVERY.length)]!
        const next = reduce(m, state, action)
        // An action that cannot be done changes nothing; one that can gives a record the schema takes.
        if (can(m, state, action) !== null) expect(next).toBe(state)
        state = next
      }
      expect(roundTrip(state), `walk ${walk}`).toEqual(state)
      expect(carefulFrom(state).status, `walk ${walk}`).toBe('completed')
    }
  })

  it('always has something to do in a tube that does not count yet, at every stage, in both modes', () => {
    for (const mode of MODES) {
      for (const id of TUBES) {
        let state = createLab(mode)
        const script: Action[] = id.includes('+')
          ? [{ type: 'pour', tube: id as (typeof PAIR_IDS)[number], more: pairModel(m, id as (typeof PAIR_IDS)[number]).liquids[1] }, { type: 'shake', tube: id }, { type: 'stand', tube: id }, { type: 'look', tube: id }]
          : [{ type: 'add', tube: id as (typeof SOLID_TUBE_IDS)[number] }, { type: 'shake', tube: id }, { type: 'stand', tube: id }, { type: 'look', tube: id }]
        for (const action of script) {
          expect(can(m, state, action), `${id}: ${action.type}`).toBeNull()
          state = reduce(m, state, action)
          expect(tubeView(m, state, id).outcome).toEqual({ state: 'open' })
        }
        expect(tubeView(m, state, id).formOpen).toBe(true)
      }
    }
  })
})

describe('Challenge shows nothing of what is expected before the learner’s answers are recorded; the families of the liquids are not on the page before part 3 is done', () => {
  it('hands a page the same picture for every pair of the same colours until the tube has stood, so nothing can be read early', () => {
    for (const stage of ['in', 'shaken'] as const) {
      const pictures = new Set(
        PAIR_IDS.filter((id) => !id.includes('vegetable-oil')).map((id) => {
          const actions: Action[] = [{ type: 'pour', tube: id, more: pairModel(m, id).liquids[0] }, ...(stage === 'shaken' ? [{ type: 'shake', tube: id } as const] : [])]
          return JSON.stringify(pairView(m, run(m, createLab('challenge'), actions), id).shows)
        }),
      )
      expect(pictures.size, stage).toBe(1)
    }
    // And the same for the solids: at the bottom when just in, spread through when shaken, in every liquid of one colour.
    for (const steps of [1, 2]) {
      const pictures = new Set(
        SOLID_TUBE_IDS.filter((id) => !id.includes('vegetable-oil')).map((id) => JSON.stringify(solidTubeView(m, run(m, createLab('challenge'), ([{ type: 'add', tube: id }, { type: 'shake', tube: id }] as Action[]).slice(0, steps)), id).shows)),
      )
      expect(pictures.size).toBe(1)
    }
  })

  it('marks nothing in Challenge and shows no note until a tube is checked, whatever is recorded of it', () => {
    for (const wrong of [false, true]) {
      for (const id of PAIR_IDS) {
        const view = pairView(m, wholePair(m, createLab('challenge'), id, { wrong, check: false }), id)
        expect([view.layersRight, view.topRight, view.outcome.state, view.notesShown, view.reasons], id).toEqual([null, null, 'to-check', false, []])
      }
      for (const id of SOLID_TUBE_IDS) {
        const view = solidTubeView(m, wholeSolidTube(m, createLab('challenge'), id, { wrong, check: false }), id)
        expect([view.seenRight, view.outcome.state, view.notesShown, view.reasons], id).toEqual([null, 'to-check', false, []])
      }
    }
  })

  it('hands a page nothing of a tube that tells whether its liquids mix or its solid dissolves but the picture and, once judged, the marks', () => {
    for (const id of TUBES) {
      const before = tubeView(m, run(m, createLab('challenge'), id.includes('+') ? [{ type: 'pour', tube: id as (typeof PAIR_IDS)[number], more: pairModel(m, id as (typeof PAIR_IDS)[number]).liquids[0] }] : [{ type: 'add', tube: id as (typeof SOLID_TUBE_IDS)[number] }]), id)
      expect(Object.keys(before).sort(), id).toEqual((before.kind === 'pair' ? ['formOpen', 'id', 'kind', 'layers', 'layersRight', 'liquids', 'looked', 'more', 'notesShown', 'outcome', 'reasons', 'shows', 'stage', 'top', 'topAsked', 'topRight', 'tries'] : ['formOpen', 'id', 'kind', 'liquid', 'looked', 'notesShown', 'outcome', 'reasons', 'seen', 'seenRight', 'shows', 'solid', 'stage', 'tries']).sort())
    }
  })

  it('hands no view a family before part 3 is done but what the learner has sorted, and marks none in Challenge before the check', () => {
    const open = wholeSolids(m, wholePairs(m, createLab('challenge')))
    const views = JSON.stringify([benchView(m, open), ...TUBES.map((id) => tubeView(m, open, id))])
    // "water" is there as a liquid's id; the word for the other family, and the word family, are nowhere.
    expect(views).not.toMatch(/famil|"oil"/)
    expect(ruleView(m, open).sorted).toEqual(LIQUID_IDS.map((liquid) => ({ liquid, family: null, right: null })))
    expect(ruleView(m, open).families).toEqual(['water', 'oil'])
    const sorted = run(m, open, LIQUID_IDS.map((liquid): Action => ({ type: 'sort', liquid, family: 'oil' })))
    expect(ruleView(m, sorted).sorted.map((s) => [s.family, s.right])).toEqual(LIQUID_IDS.map(() => ['oil', null]))
    expect(ruleView(m, sorted).notesShown).toBe(false)
    expect(ruleView(m, sorted).questions.map((q) => [q.answer, q.right])).toEqual([[null, null], [null, null]])
  })

  it('keeps the public door free of the answers and the judging', () => {
    expect(Object.keys(door).sort()).toEqual(['LAYERS', 'MAX_TRIES', 'SOLID_SEEN', 'STAGES', 'benchView', 'can', 'createLab', 'mixingStateSchema', 'modelFrom', 'pairOf', 'pairView', 'reduce', 'ruleView', 'solidTubeOf', 'solidTubeView', 'tubeView'].sort())
    expect(STAGES).toEqual(['empty', 'in', 'shaken', 'stood'])
  })
})

describe('no answer depends on seeing a colour', () => {
  it('gives the two layers of every pair different thicknesses, so that which liquid is which follows from the amounts alone', () => {
    for (const id of PAIR_IDS.filter((pair) => topOf(m, pair) !== null)) {
      for (const more of pairModel(m, id).liquids) {
        const view = pairView(m, wholePair(m, createLab('challenge'), id, { more }), id)
        const { liquid, above } = view.shows
        // The thicker layer is the liquid there is more of, which the view names; so the layer on top is `more` or the other.
        const thickerIsOnTop = above!.microlitres > liquid!.microlitres
        const onTop = thickerIsOnTop ? view.more : view.liquids.find((l) => l !== view.more)
        expect(onTop, `${id}, more ${more}`).toBe(topOf(m, id))
      }
    }
  })

  it('has two pairs of two layers in which neither layer has a colour, each still told apart by thickness', () => {
    const bare = PAIR_IDS.filter((id) => topOf(m, id) !== null && pairModel(m, id).liquids.every((liquid) => liquidModel(m, liquid).colour === 'colourless'))
    expect(bare).toEqual(['water+mineral-oil', 'vinegar+mineral-oil'])
    for (const id of bare) {
      const { liquid, above } = pairView(m, wholePair(m, createLab('challenge'), id), id).shows
      expect([liquid!.colour, above!.colour, liquid!.microlitres, above!.microlitres]).toEqual(['colourless', 'colourless', 3000, 1500])
    }
  })

  it('asks of a solid only whether it is gone, which the picture shows as a solid at the bottom or none', () => {
    for (const id of SOLID_TUBE_IDS) expect(solidTubeView(m, wholeSolidTube(m, createLab('challenge'), id), id).shows.solid === null, id).toBe(solidTubeModel(m, id).dissolves)
  })
})
