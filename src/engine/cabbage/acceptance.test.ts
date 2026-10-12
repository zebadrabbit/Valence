import { describe, expect, it } from 'vitest'
import { cabbageData, THING_IDS } from '@/chem-data/cabbage/data'
import * as door from './index'
import { CANNOT_SAY, modelFrom } from './model'
import { PINNED_MODEL as m } from './pinnedModel'
import { benchView, meterView, rackView, sampleView, unitView } from './select'
import { labSetup } from './setup'
import { cabbageStateSchema, createLab, type CabbageState } from './state'
import { byEye, classOf, run, wholeLab, wholeSample, wholeScale, wholeThings, wholeUnit, type Technique } from './testkit'

// The lines of spec 21.6 that the engine can show, one describe for each. That every tube's description in words
// is tested is the page's messages' to show (src/app/lab/cabbage/messages.test.ts).
const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const schema = cabbageStateSchema(m)
const through = (s: CabbageState) => schema.parse(JSON.parse(JSON.stringify(s)))

describe("for seeds 1 to 100, every household thing's pH is inside its sourced range, and a careful estimate by eye is within one unit of the meter", () => {
  it('draws every pH inside the range the record stores for the thing, and reaches both ends of a range over the seeds', () => {
    const seen = new Map(THING_IDS.map((id) => [id, new Set<number>()]))
    for (const seed of SEEDS) {
      const setup = labSetup(m, seed)
      for (const thing of cabbageData.things) {
        const tenths = setup[thing.id]
        expect(Number.isInteger(tenths), `${thing.id} ${seed}`).toBe(true)
        expect(tenths / 10, `${thing.id} ${seed}`).toBeGreaterThanOrEqual(thing.ph.low.value)
        expect(tenths / 10, `${thing.id} ${seed}`).toBeLessThanOrEqual(thing.ph.high.value)
        seen.get(thing.id)!.add(tenths)
      }
    }
    expect([...seen.get('vinegar')!].sort((a, b) => a - b)).toEqual([24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34])
    expect([...seen.get('lab-detergent')!]).toEqual([95])
  })

  it.each(['guided', 'challenge'] as const)('in %s, counts the careful estimate for every thing but bleach, whichever of two tubes of one colour is named', (mode) => {
    for (const seed of SEEDS) {
      const rack = wholeScale(m, createLab(mode, seed))
      for (const highest of [false, true]) {
        let state = rack
        for (const thing of THING_IDS) state = wholeSample(m, state, thing, { highest })
        for (const thing of THING_IDS) {
          const view = sampleView(m, state, thing)
          expect(view.outcome.state, `${thing} ${seed}`).toBe('counts')
          if (thing === 'bleach') expect(view.estimate).toBe(CANNOT_SAY)
          else expect(Math.abs((view.estimate as number) * 10 - view.reading!.tenths), `${thing} ${seed}`).toBeLessThanOrEqual(10)
        }
        expect(state.counted).toHaveLength(14)
      }
    }
  })

  it('has bleach show no colour that any tube of the scale has, in every seed: the indicator cannot say', () => {
    for (const seed of SEEDS) {
      const state = run(m, wholeScale(m, createLab('challenge', seed)), [{ type: 'addIndicator', thing: 'bleach' }, { type: 'look', thing: 'bleach' }])
      expect(byEye(rackView(m, state), sampleView(m, state, 'bleach'))).toBe(CANNOT_SAY)
    }
  })

  it('has the careful acid, neutral or basic, read off the tube named, right for every thing in every seed', () => {
    for (const seed of SEEDS) {
      const state = wholeScale(m, createLab('guided', seed))
      for (const thing of THING_IDS.filter((id) => id !== 'bleach')) {
        const looked = run(m, state, [{ type: 'addIndicator', thing }, { type: 'look', thing }])
        for (const highest of [false, true]) {
          const tube = byEye(rackView(m, looked), sampleView(m, looked, thing), highest) as number
          expect(door.can(m, run(m, looked, [{ type: 'estimate', thing, is: tube }]), { type: 'classify', thing, is: classOf(tube) }), `${thing} ${seed}`).toBeNull()
        }
      }
    }
  })
})

describe('an unrinsed probe makes a reading not count, and its cause is named; Guided warns first', () => {
  it('holds in every seed, in both modes, for a thing read straight after another', () => {
    for (const seed of SEEDS) {
      for (const mode of ['guided', 'challenge'] as const) {
        let state = wholeSample(m, wholeScale(m, createLab(mode, seed)), 'lemon-juice')
        const thing = 'drain-cleaner'
        state = run(m, state, [{ type: 'addIndicator', thing }, { type: 'look', thing }, { type: 'estimate', thing, is: 13 }, { type: 'classify', thing, is: 'basic' }, { type: 'read', thing }])
        if (mode === 'guided') {
          expect(sampleView(m, state, thing)).toMatchObject({ warning: true, reading: null })
          state = run(m, state, [{ type: 'read', thing }])
          expect(sampleView(m, state, thing)).toMatchObject({ reading: { unrinsed: true }, outcome: { state: 'open' } })
        } else {
          expect(sampleView(m, state, thing)).toMatchObject({ warning: false, reading: { unrinsed: null } })
          state = run(m, state, [{ type: 'checkSample', thing }])
          expect(sampleView(m, state, thing)).toMatchObject({ outcome: { state: 'does-not-count' }, reasons: ['probe-unrinsed'] })
        }
        const setup = labSetup(m, seed)
        const read = sampleView(m, state, thing).reading!.tenths
        // Pulled toward the lemon juice, a fifth of the way: lower than its own pH, and well short of the other's.
        expect(read).toBeLessThan(setup[thing])
        expect(read).toBeGreaterThan(setup['lemon-juice'] + 60)
        expect(state.counted).toEqual(['lemon-juice'])
      }
    }
  })
})

describe("every stored pH and every colour has a source or is marked as the model's own", () => {
  it('cites each end of each range, or works it out from cited figures and shows the working', () => {
    for (const thing of cabbageData.things) {
      const { ph } = thing
      if (ph.basis === 'document') expect([ph.low.sourceId, ph.high.sourceId, ph.low.published, ph.high.published].every((text) => typeof text === 'string' && text.length > 0), thing.id).toBe(true)
      else expect([ph.percent.low.sourceId, ph.percent.high.sourceId, ph.solute.formulaWeight.sourceId, ph.low.working, ph.high.working].every((text) => text.length > 0), thing.id).toBe(true)
    }
    for (const constant of Object.values(cabbageData.constants)) expect(constant.sourceId.length).toBeGreaterThan(0)
  })

  it("cites each colour of the indicator and what is seen where the dye is destroyed, and marks the edges and each thing's own look as the model's or the lab's own", () => {
    for (const colour of cabbageData.indicator.colours) expect(colour.sourceId.length, colour.id).toBeGreaterThan(0)
    expect(cabbageData.indicator.bleached.sourceId.length).toBeGreaterThan(0)
    expect(cabbageData.parameters.colourEdgesTenths.rationale).toMatch(/model's own/)
    for (const thing of cabbageData.things) expect(thing.before.rationale, thing.id).toMatch(/lab's own/)
    expect(cabbageData.parameters.unrinsedSharePercent.rationale).toMatch(/model's own/)
  })

  it('shows no colour in any tube that is not one of those', () => {
    const known = new Set([...cabbageData.indicator.colours.map((c) => c.colour), cabbageData.indicator.bleached.value, ...cabbageData.things.flatMap((t) => [t.before.value.liquid, ...(t.before.value.solid === null ? [] : [t.before.value.solid])])])
    const state = wholeLab(modelFrom(cabbageData), createLab('challenge', 3))
    for (const tube of rackView(m, state).tubes) expect(known.has(tube.shows.liquid!.colour)).toBe(true)
    for (const thing of THING_IDS) {
      const { shows } = sampleView(m, state, thing)
      expect(known.has(shows.liquid!.colour), thing).toBe(true)
      if (shows.solid) expect(known.has(shows.solid.colour), thing).toBe(true)
    }
  })
})

describe('the same seed and actions give the same lab; the stored record round-trips; no state a learner can reach leaves them unable to go on', () => {
  it('gives the same lab twice, and another lab for another seed', () => {
    expect(wholeLab(m, createLab('guided', 12))).toEqual(wholeLab(m, createLab('guided', 12)))
    expect(wholeLab(m, createLab('guided', 12)).counted).toEqual(wholeLab(m, createLab('guided', 13)).counted)
    expect(labSetup(m, 12)).not.toEqual(labSetup(m, 13))
  })

  it('round-trips through JSON and the schema after every action of a careful lab, in both modes, for ten seeds', () => {
    for (const seed of SEEDS.slice(0, 10)) for (const mode of ['guided', 'challenge'] as const) expect(wholeLab(m, createLab(mode, seed), through).status, `${mode} ${seed}`).toBe('completed')
  })

  it('leaves a way on after everything that can go wrong: every part and every sample that does not count can be set up again, and the lab then completed', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      let state = wholeScale(m, createLab('challenge', seed), { wrong: true }, through)
      expect(rackView(m, state).outcome.state).toBe('does-not-count')
      state = run(m, state, [{ type: 'againScale' }], through)
      state = run(m, state, [...answersOf(state), { type: 'checkScale' }], through)
      expect(benchView(m, state).scaleDone, String(seed)).toBe(true)
      // Every thing goes wrong once, each in one of three ways, and is then done again with care.
      THING_IDS.forEach((thing, i) => {
        const how: Technique = i % 3 === 0 ? { rinse: false } : i % 3 === 1 ? { estimate: thing === 'bleach' ? 5 : CANNOT_SAY } : { is: 'neutral', estimate: thing === 'bleach' ? 5 : sampleEstimateOff(seed, thing) }
        state = wholeSample(m, state, thing, how, through)
        if (sampleView(m, state, thing).outcome.state !== 'counts') {
          expect(door.can(m, state, { type: 'again', thing }), `${thing} ${seed}`).toBeNull()
          state = wholeSample(m, run(m, state, [{ type: 'again', thing }], through), thing, {}, through)
        }
        expect(sampleView(m, state, thing).outcome.state, `${thing} ${seed}`).toBe('counts')
      })
      state = wholeUnit(m, state, { wrong: true }, through)
      expect(unitView(m, state).outcome.state).toBe('does-not-count')
      state = wholeUnit(m, run(m, state, [{ type: 'againUnit' }], through), {}, through)
      expect(state.status, String(seed)).toBe('completed')
    }
  })

  it('never strands the probe: it can always be rinsed once it has been in a sample, and a rinsed probe reads any sample that is ready', () => {
    let state = wholeSample(m, wholeScale(m, createLab('guided', 5)), 'vinegar')
    expect(meterView(state).rinsed).toBe(false)
    expect(door.can(m, state, { type: 'rinse' })).toBeNull()
    state = run(m, state, [{ type: 'rinse' }])
    expect(meterView(state).rinsed).toBe(true)
  })
})

/** The rack's three answers, read off the rack: for a rack already made and looked along. */
function answersOf(state: CabbageState): door.Action[] {
  const rack = rackView(m, state)
  const colourOf = (ph: number) => rack.tubes.find((tube) => tube.ph === ph)!.shows.liquid!.colour
  const pair = rack.tubes.find((tube, i) => i > 0 && tube.shows.liquid!.colour === rack.tubes[i - 1]!.shows.liquid!.colour)!.ph - 1
  return rack.questions.map((question): door.Action => ({ type: 'answerScale', question: question.id, is: question.kind === 'colour-of-tube' ? colourOf(question.ph!) : pair }))
}

/** A tube more than a unit from a thing's pH. */
const sampleEstimateOff = (seed: number, thing: (typeof THING_IDS)[number]) => (labSetup(m, seed)[thing] > 70 ? 1 : 13)

describe('Challenge shows nothing of what is expected before the learner’s answers are recorded: a thing’s pH is not on the page before the meter is read', () => {
  it('hands a page no reading and no mark for a sample until the meter is read and the sample checked', () => {
    for (const seed of SEEDS.slice(0, 25)) {
      let state = wholeScale(m, createLab('challenge', seed), { check: false })
      expect(rackView(m, state).questions.map((q) => q.right)).toEqual([null, null, null])
      state = run(m, state, [{ type: 'checkScale' }])
      for (const thing of THING_IDS) {
        const setup = labSetup(m, seed)
        const before = run(m, state, [{ type: 'addIndicator', thing }, { type: 'look', thing }])
        const estimate = thing === 'bleach' ? CANNOT_SAY : byEye(rackView(m, before), sampleView(m, before, thing))
        const recorded = run(m, before, [{ type: 'estimate', thing, is: estimate }, ...(estimate === CANNOT_SAY ? [] : [{ type: 'classify' as const, thing, is: classOf(estimate as number) }])])
        for (const at of [state, before, recorded]) {
          const view = sampleView(m, at, thing)
          expect(view).toMatchObject({ reading: null, estimateRight: null, classRight: null, reasons: [], notesShown: false, warning: false })
          // Nothing in the view is the thing's pH: no number in it but the level of the liquid, the tube named and the tries.
          const numbers = JSON.stringify(view).match(/\d+/g)?.map(Number) ?? []
          expect(numbers.filter((n) => n === setup[thing] && n !== view.estimate && n !== view.tries), `${thing} ${seed}`).toEqual([])
        }
        // Challenge refuses no estimate and no acid, neutral or basic: nothing can be tried against the meter before it is read.
        for (const tube of m.phs) expect(door.can(m, before, { type: 'estimate', thing, is: tube })).toBeNull()
        const read = run(m, recorded, [{ type: 'rinse' }, { type: 'read', thing }].filter((a) => door.can(m, recorded, a as door.Action) === null || a.type === 'read') as door.Action[])
        expect(sampleView(m, read, thing)).toMatchObject({ reading: { tenths: setup[thing], unrinsed: null }, estimateRight: null, classRight: null, outcome: { state: 'to-check' } })
      }
    }
  })

  it('keeps the stored record free of every pH, and the public door free of the set-up and the judging', () => {
    const state = wholeThings(m, wholeScale(m, createLab('challenge', 9)))
    expect(Object.keys(state).sort()).toEqual(['counted', 'mode', 'probe', 'samples', 'scale', 'seed', 'status', 'unit'])
    // The only numbers a stored sample holds are how often it was tried and the tube the learner named.
    for (const sample of Object.values(state.samples)) expect(Object.entries(sample).filter(([, value]) => typeof value === 'number').map(([key]) => key)).toEqual(sample.estimate === null || sample.estimate === CANNOT_SAY ? ['tries'] : ['tries', 'estimate'])
    expect(Object.keys(door).sort()).toEqual(['CANNOT_SAY', 'CLASSES', 'MAX_TRIES', 'POWERS', 'benchView', 'cabbageStateSchema', 'can', 'createLab', 'meterView', 'modelFrom', 'rackView', 'reduce', 'sampleView', 'unitView'])
  })

  it('marks no closing answer in Challenge until the two are checked', () => {
    const state = wholeUnit(m, wholeThings(m, wholeScale(m, createLab('challenge', 9))), { check: false })
    expect(unitView(m, state).questions.map((q) => q.right)).toEqual([null, null])
    expect(unitView(m, state).notesShown).toBe(false)
  })
})

describe('every colour a learner must tell apart is also said in words', () => {
  it('gives each tube of the rack a word for its colour, a different word from its neighbour but for the one pair the sources give one colour', () => {
    const { tubes } = rackView(m, wholeScale(m, createLab('guided', 1)))
    const words = tubes.map((tube) => tube.shows.liquid!.colour)
    expect(words.every((word) => /^[a-z-]+( [a-z-]+)?$/.test(word))).toBe(true)
    expect(tubes.filter((_tube, i) => i > 0 && words[i] === words[i - 1]).map((tube) => tube.ph)).toEqual([12])
    expect(new Set(words).size).toBe(12)
  })

  it('gives every sample a word for its liquid before and after the indicator goes in, in every seed', () => {
    for (const seed of SEEDS) {
      const state = wholeScale(m, createLab('guided', seed))
      for (const thing of THING_IDS) {
        expect(sampleView(m, state, thing).shows.liquid!.colour).toMatch(/^(colourless|pale yellow|white)$/)
        const after = sampleView(m, run(m, state, [{ type: 'addIndicator', thing }]), thing).shows.liquid!.colour
        expect(thing === 'bleach' ? after === 'colourless' : m.colours.includes(after), `${thing} ${seed}`).toBe(true)
      }
    }
  })
})
